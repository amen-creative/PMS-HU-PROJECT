from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from django.core.mail import send_mail
from django.conf import settings as django_settings

from audits.services import log_activity
from notifications.services import notify_user
from users.permissions import IsDepartmentHead
from users.models import User

from .models import Assignment, TransferRequest
from .serializers import AssignmentSerializer, TransferRequestSerializer


def _can_manage_property(user):
    return user.is_superuser or user.role in {"ADMIN", "PROPERTY_OFFICER"}


def _same_department(user, department_name):
    return bool(user.department and department_name and user.department.lower() == department_name.lower())


class AssignmentListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = AssignmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Assignment.objects.select_related(
            "property",
            "assigned_to",
            "assigned_by",
            "approved_by",
        )

        if _can_manage_property(user) or user.role == "SECURITY":
            return queryset
        if user.role == "DEPT_HEAD" and user.department:
            return queryset.filter(property__department__iexact=user.department)
        return queryset.filter(Q(assigned_to=user) | Q(property__owner=user))

    def perform_create(self, serializer):
        user = self.request.user
        if not (user.is_superuser or user.role in {"ADMIN", "PROPERTY_OFFICER"}):
            raise PermissionDenied("You do not have permission to create assignments.")

        property_obj = serializer.validated_data["property"]
        target_department = (
            getattr(serializer, "initial_data", {}).get("assigned_department")
            or getattr(serializer.validated_data.get("assigned_to"), "department", "")
        )
        assignment = serializer.save(
            assigned_by=user,
            previous_owner=property_obj.owner,
            status=Assignment.STATUS_PENDING,
            history_log=f"Requested by {user.username} on {timezone.now().isoformat()}",
        )
        if target_department:
            property_obj.department = target_department
        property_obj.updated_by = user
        property_obj.save(update_fields=["department", "updated_by", "updated_at"])
        department_head = User.objects.filter(
            role="DEPT_HEAD",
            department__iexact=property_obj.department,
            is_active=True,
        ).first()

        if department_head:
            notify_user(
                department_head,
                "APPROVAL",
                "Assignment approval required",
                f"Assignment request pending for {property_obj.title}.",
                property_obj,
            )
        log_activity(
            actor=user,
            action="ASSIGNMENT_CREATED",
            message=f"Assignment request created for {property_obj.title} to {assignment.assigned_to.username}.",
            property_obj=property_obj,
            metadata={"assignment_id": assignment.id, "status": assignment.status},
        )


class AssignmentUpdateAPIView(generics.UpdateAPIView):
    serializer_class = AssignmentSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["patch"]
    queryset = Assignment.objects.select_related("property", "assigned_to")

    def patch(self, request, *args, **kwargs):
        assignment = self.get_object()
        user = request.user
        if not (_can_manage_property(user) or user.role == "DEPT_HEAD" or assignment.assigned_to_id == user.id):
            return Response({"detail": "You do not have permission to update this assignment."}, status=403)

        serializer = self.get_serializer(assignment, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        requested_status = serializer.validated_data.get("status")
        rejection_reason = (request.data.get("rejection_reason") or "").strip()

        if requested_status in {"APPROVED", "REJECTED"}:
            if not (user.is_superuser or user.role == "ADMIN" or (user.role == "DEPT_HEAD" and _same_department(user, assignment.property.department))):
                return Response({"detail": "Only the relevant Department Head can approve or reject assignments."}, status=403)
        if (
            requested_status == "APPROVED"
            and user.role == "DEPT_HEAD"
            and assignment.property.department
            and user.department.lower() != assignment.property.department.lower()
        ):
            return Response({"detail": "You can only approve assignments for your department."}, status=403)
        if requested_status == "RETURNED" and not (_can_manage_property(user) or assignment.assigned_to_id == user.id):
            return Response({"detail": "You do not have permission to return this assignment."}, status=403)
        updated_assignment = serializer.save()

        if updated_assignment.status == "APPROVED":
            updated_assignment.approved_by = user
            updated_assignment.property.owner = updated_assignment.assigned_to
            updated_assignment.property.current_assignee = updated_assignment.assigned_to
            updated_assignment.property.status = "ASSIGNED"
            updated_assignment.property.approval_status = "APPROVED"
            if updated_assignment.assigned_to.department:
                updated_assignment.property.department = updated_assignment.assigned_to.department
            updated_assignment.property.updated_by = user
            updated_assignment.property.save(
                update_fields=[
                    "owner",
                    "current_assignee",
                    "status",
                    "approval_status",
                    "department",
                    "updated_by",
                    "updated_at",
                ]
            )
            updated_assignment.save(update_fields=["approved_by", "updated_at"])
            notify_user(
                updated_assignment.assigned_to,
                "APPROVAL",
                "Property assignment approved",
                f"You have been assigned {updated_assignment.property.title}.",
                updated_assignment.property,
            )
            notify_user(
                updated_assignment.assigned_by,
                "APPROVAL",
                "Assignment approved",
                f"Assignment request for {updated_assignment.property.title} was approved by {user.username}.",
                updated_assignment.property,
            )
        elif updated_assignment.status == "REJECTED":
            updated_assignment.approved_by = user
            if rejection_reason:
                updated_assignment.notes = rejection_reason
            updated_assignment.save(update_fields=["approved_by", "notes", "updated_at"])
            notify_user(
                updated_assignment.assigned_by,
                "APPROVAL",
                "Assignment rejected",
                f"Assignment request for {updated_assignment.property.title} was rejected. Reason: {rejection_reason or 'No reason provided.'}",
                updated_assignment.property,
            )
        elif updated_assignment.status == "RETURNED":
            updated_assignment.property.current_assignee = None
            updated_assignment.property.status = "AVAILABLE"
            updated_assignment.property.updated_by = user
            updated_assignment.property.save(
                update_fields=["current_assignee", "status", "updated_by", "updated_at"]
            )

        log_activity(
            actor=user,
            action="ASSIGNMENT_UPDATED",
            message=f"Assignment #{updated_assignment.id} updated to {updated_assignment.status}.",
            property_obj=updated_assignment.property,
            metadata={"assignment_id": updated_assignment.id},
        )
        return Response(self.get_serializer(updated_assignment).data)


class TransferRequestListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = TransferRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = TransferRequest.objects.select_related(
            "property",
            "from_user",
            "to_user",
            "approved_by",
            "completed_by",
        )
        if _can_manage_property(user) or user.role == "SECURITY":
            return queryset
        if user.role == "DEPT_HEAD":
            return queryset.filter(
                Q(property__department__iexact=user.department) | Q(to_user__department__iexact=user.department)
            )
        return queryset.filter(Q(from_user=user) | Q(to_user=user))

    def perform_create(self, serializer):
        property_obj = serializer.validated_data["property"]
        current_owner = property_obj.current_assignee or property_obj.owner
        transfer = serializer.save(from_user=current_owner)
        department_head = User.objects.filter(
            role="DEPT_HEAD",
            department__iexact=property_obj.department,
            is_active=True,
        ).first()
        if department_head:
            notify_user(
                department_head,
                "APPROVAL",
                "Transfer approval required",
                f"Transfer request pending for {transfer.property.title}.",
                transfer.property,
            )
            # UC-04 Step 5: Send email notification to Department Head
            if department_head.email:
                try:
                    send_mail(
                        subject=f"Transfer Approval Required: {transfer.property.title}",
                        message=(
                            f"A transfer request (#{transfer.id}) has been submitted for "
                            f"'{transfer.property.title}' from {transfer.from_user.get_full_name() or transfer.from_user.username} "
                            f"to {transfer.to_user.get_full_name() or transfer.to_user.username}.\n\n"
                            f"Reason: {transfer.reason or 'No reason provided.'}\n\n"
                            f"Please review and take action at your earliest convenience."
                        ),
                        from_email=django_settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[department_head.email],
                        fail_silently=True,
                    )
                except Exception:
                    pass
        notify_user(
            transfer.to_user,
            "TRANSFER",
            "Transfer request received",
            f"{transfer.from_user.username} requested transfer of {transfer.property.title}.",
            transfer.property,
        )
        log_activity(
            actor=self.request.user,
            action="TRANSFER_CREATED",
            message=f"Transfer request #{transfer.id} created for {transfer.property.title}.",
            property_obj=transfer.property,
            metadata={"transfer_id": transfer.id},
        )


class TransferRequestApproveAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            transfer = TransferRequest.objects.select_related("property", "from_user", "to_user").get(pk=pk)
        except TransferRequest.DoesNotExist:
            return Response({"detail": "Transfer request not found."}, status=status.HTTP_404_NOT_FOUND)
        if not (request.user.is_superuser or request.user.role == "ADMIN" or (request.user.role == "DEPT_HEAD" and _same_department(request.user, transfer.property.department))):
            return Response({"detail": "Only the relevant Department Head can approve transfers."}, status=403)

        transfer.status = "COMPLETED"
        transfer.approved_by = request.user
        transfer.completed_by = request.user
        transfer.response_note = request.data.get("response_note", transfer.response_note)
        transfer.reviewed_at = timezone.now()
        transfer.completed_at = timezone.now()
        transfer.save(update_fields=["status", "approved_by", "completed_by", "response_note", "reviewed_at", "completed_at", "updated_at"])

        transfer.property.owner = transfer.to_user
        transfer.property.current_assignee = transfer.to_user
        transfer.property.status = "ASSIGNED"
        transfer.property.approval_status = "APPROVED"
        if transfer.to_user.department:
            transfer.property.department = transfer.to_user.department
        transfer.property.updated_by = request.user
        transfer.property.save(update_fields=["owner", "current_assignee", "status", "approval_status", "department", "updated_by", "updated_at"])

        notify_user(
            transfer.from_user,
            "APPROVAL",
            "Transfer approved",
            f"Transfer request for {transfer.property.title} was approved.",
            transfer.property,
        )
        notify_user(
            transfer.to_user,
            "TRANSFER",
            "Transfer completed",
            f"You are now the recorded owner of {transfer.property.title}.",
            transfer.property,
        )
        log_activity(
            actor=request.user,
            action="TRANSFER_APPROVED",
            message=f"Transfer #{transfer.id} approved and completed.",
            property_obj=transfer.property,
            metadata={"transfer_id": transfer.id},
        )
        return Response(TransferRequestSerializer(transfer, context={"request": request}).data)


class TransferRequestRejectAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            transfer = TransferRequest.objects.select_related("property", "from_user", "to_user").get(pk=pk)
        except TransferRequest.DoesNotExist:
            return Response({"detail": "Transfer request not found."}, status=status.HTTP_404_NOT_FOUND)
        if not (request.user.is_superuser or request.user.role == "ADMIN" or (request.user.role == "DEPT_HEAD" and _same_department(request.user, transfer.property.department))):
            return Response({"detail": "Only the relevant Department Head can reject transfers."}, status=403)

        transfer.status = "REJECTED"
        transfer.approved_by = request.user
        transfer.response_note = request.data.get("response_note", transfer.response_note)
        transfer.reviewed_at = timezone.now()
        transfer.save(update_fields=["status", "approved_by", "response_note", "reviewed_at", "updated_at"])

        rejection_reason = transfer.response_note or "No reason provided."
        notify_user(
            transfer.from_user,
            "APPROVAL",
            "Transfer rejected",
            f"Transfer request for {transfer.property.title} was rejected. Reason: {rejection_reason}",
            transfer.property,
        )
        log_activity(
            actor=request.user,
            action="TRANSFER_REJECTED",
            message=f"Transfer #{transfer.id} rejected. Reason: {rejection_reason}",
            property_obj=transfer.property,
            metadata={"transfer_id": transfer.id},
        )
        return Response(TransferRequestSerializer(transfer, context={"request": request}).data)


class TransferRequestCompleteAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            transfer = TransferRequest.objects.select_related("property", "from_user", "to_user").get(pk=pk)
        except TransferRequest.DoesNotExist:
            return Response({"detail": "Transfer request not found."}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        if not (_can_manage_property(user) or transfer.to_user_id == user.id or transfer.from_user_id == user.id):
            return Response({"detail": "You do not have permission to complete this transfer."}, status=403)
        if transfer.status != "APPROVED":
            return Response({"detail": "Only approved transfers can be completed."}, status=400)

        transfer.status = "COMPLETED"
        transfer.completed_by = user
        transfer.completed_at = timezone.now()
        transfer.save(update_fields=["status", "completed_by", "completed_at", "updated_at"])

        transfer.property.owner = transfer.to_user
        transfer.property.current_assignee = transfer.to_user
        transfer.property.status = "ASSIGNED"
        transfer.property.updated_by = user
        transfer.property.save(
            update_fields=["owner", "current_assignee", "status", "updated_by", "updated_at"]
        )

        notify_user(
            transfer.to_user,
            "TRANSFER",
            "Transfer completed",
            f"You are now the recorded owner of {transfer.property.title}.",
            transfer.property,
        )
        log_activity(
            actor=user,
            action="TRANSFER_COMPLETED",
            message=f"Transfer #{transfer.id} completed.",
            property_obj=transfer.property,
            metadata={"transfer_id": transfer.id},
        )
        return Response(TransferRequestSerializer(transfer, context={"request": request}).data)
