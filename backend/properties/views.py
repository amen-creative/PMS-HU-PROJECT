import csv
import hashlib
import json

from django.db import OperationalError, ProgrammingError, connection
from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from assignments.models import Assignment, TransferRequest
from audits.models import AuditLog as ActivityLog
from audits.serializers import AuditLogSerializer as ActivityLogSerializer
from incidents.models import Incident
from incidents.serializers import IncidentSerializer
from verification.models import VerificationLog
from verification.serializers import VerificationLogSerializer
from audits.services import log_activity
from notifications.models import Notification
from notifications.services import notify_user
from users.permissions import IsAdmin, IsPropertyCreator
from users.models import User

from .models import Property
from .serializers import PropertySerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_properties_csv(request):
    """Export properties to CSV format"""
    user = request.user
    
    if not _can_view_all_properties(user):
        return Response({"detail": "You don't have permission to export properties."}, status=403)
    
    queryset = Property.objects.select_related(
        "created_by",
        "updated_by",
        "owner",
        "current_assignee",
    ).order_by("-created_at")
    
    if user.role == "DEPT_HEAD" and user.department:
        queryset = queryset.filter(department__iexact=user.department)
    
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="properties_export.csv"'
    
    writer = csv.writer(response)
    
    # Write header
    writer.writerow([
        'ID', 'Title', 'Serial Number', 'Category', 'Department',
        'Status', 'Owner', 'Current Assignee', 'Created By',
        'Created At', 'Updated At', 'Approval Status'
    ])
    
    # Write data rows
    for property_obj in queryset:
        writer.writerow([
            property_obj.id,
            property_obj.title,
            property_obj.serial_number,
            property_obj.category,
            property_obj.department,
            property_obj.status,
            property_obj.owner.username if property_obj.owner else 'N/A',
            property_obj.current_assignee.username if property_obj.current_assignee else 'N/A',
            property_obj.created_by.username if property_obj.created_by else 'N/A',
            property_obj.created_at.strftime('%Y-%m-%d %H:%M:%S') if property_obj.created_at else 'N/A',
            property_obj.updated_at.strftime('%Y-%m-%d %H:%M:%S') if property_obj.updated_at else 'N/A',
            property_obj.approval_status,
        ])
    
    log_activity(
        actor=user,
        action="CSV_EXPORT",
        message=f"Properties exported to CSV by {user.username}",
        metadata={"count": queryset.count()}
    )
    
    return response


def _can_view_all_properties(user):
    return user.is_superuser or user.role in {"ADMIN", "PROPERTY_OFFICER", "SECURITY", "DEPT_HEAD"}


def _table_exists(model):
    try:
        return model._meta.db_table in connection.introspection.table_names()
    except (ProgrammingError, OperationalError):
        return False


def _available_queryset(model, *select_related_fields):
    if not _table_exists(model):
        return model.objects.none()
    queryset = model.objects.all()
    if select_related_fields:
        queryset = queryset.select_related(*select_related_fields)
    return queryset


def _calculate_expected_hash(property_obj):
    hash_source = property_obj.serial_number or property_obj.title
    raw_string = str(property_obj.property_code) + hash_source
    return hashlib.sha256(raw_string.encode()).hexdigest()


class PropertyListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = PropertySerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def get_queryset(self):
        user = self.request.user
        queryset = Property.objects.select_related(
            "created_by",
            "updated_by",
            "owner",
            "current_assignee",
        ).order_by("-created_at")

        if _can_view_all_properties(user):
            return queryset
        if user.role == "DEPT_HEAD" and user.department:
            return queryset.filter(department__iexact=user.department)
        if user.role == "STUDENT":
            # Students can only see their assigned properties (PCs, etc.)
            return queryset.filter(
                Q(created_by=user)
            ).distinct()
        return queryset.filter(
            Q(created_by=user)
        ).distinct()

    def get_serializer(self, *args, **kwargs):
        data = kwargs.get("data")
        if data is not None:
            if hasattr(data, "lists"):
                # Avoid QueryDict.copy() on multipart uploads because it deep-copies
                # file handles and crashes on BufferedRandom-backed uploads.
                mutable_data = {}
                for key, values in data.lists():
                    if not values:
                        mutable_data[key] = ""
                    elif len(values) == 1:
                        mutable_data[key] = values[0]
                    else:
                        mutable_data[key] = values
            elif hasattr(data, "copy"):
                mutable_data = data.copy()
            else:
                mutable_data = dict(data)
            if not mutable_data.get("title") and mutable_data.get("name"):
                mutable_data["title"] = mutable_data.get("name")
            if not mutable_data.get("name") and mutable_data.get("title"):
                mutable_data["name"] = mutable_data.get("title")
            if not mutable_data.get("image") and mutable_data.get("photo"):
                mutable_data["image"] = mutable_data.get("photo")
            kwargs["data"] = mutable_data
        return super().get_serializer(*args, **kwargs)

    def perform_create(self, serializer):
        user = self.request.user
        if not IsPropertyCreator().has_permission(self.request, self):
            raise PermissionDenied("Only admin or property officer can create properties.")

        approval_status = "APPROVED" if user.is_superuser or user.role == "ADMIN" else "PENDING"
        property_obj = serializer.save(
            created_by=user,
            owner=user,
            approval_status=approval_status,
            status=serializer.validated_data.get("status") or Property.STATUS_REGISTERED,
        )
        admin_user = User.objects.filter(role="ADMIN", is_active=True).first()
        if admin_user and admin_user != user:
            notify_user(
                admin_user,
                "APPROVAL",
                "New property registered",
                f"Property {property_obj.title} was registered by {user.username}.",
                property_obj,
            )
        log_activity(
            actor=user,
            action="PROPERTY_CREATED",
            message=f"Property {property_obj.title} created.",
            property_obj=property_obj,
            metadata={"property_id": property_obj.property_id},
        )


class PendingPropertyListAPIView(generics.ListAPIView):
    serializer_class = PropertySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if not (user.is_superuser or user.role in {"ADMIN", "PROPERTY_OFFICER"}):
            return Property.objects.none()
        queryset = Property.objects.select_related("created_by", "owner", "current_assignee", "updated_by")
        queryset = queryset.filter(approval_status="PENDING").order_by("-created_at")
        if user.role == "PROPERTY_OFFICER":
            queryset = queryset.filter(created_by=user)
        return queryset


class PropertyApprovalAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        user = request.user
        if not (user.is_superuser or user.role == "ADMIN"):
            return Response({"detail": "Only admins can approve or reject properties."}, status=403)

        try:
            property_obj = Property.objects.get(pk=pk)
        except Property.DoesNotExist:
            return Response({"detail": "Property not found."}, status=404)

        action_type = (request.data.get("action") or "").strip().lower()
        if action_type not in {"approve", "reject"}:
            return Response({"detail": "Action must be 'approve' or 'reject'."}, status=400)

        property_obj.approval_status = "APPROVED" if action_type == "approve" else "REJECTED"
        property_obj.updated_by = user
        property_obj.save(update_fields=["approval_status", "updated_by", "updated_at"])

        if property_obj.created_by:
            notify_user(
                property_obj.created_by,
                "APPROVAL",
                f"Property {action_type}d",
                f"Property {property_obj.title} was {action_type}d by {user.username}.",
                property_obj,
            )

        log_activity(
            actor=user,
            action=f"PROPERTY_{action_type.upper()}D",
            message=f"Property {property_obj.title} was {action_type}d.",
            property_obj=property_obj,
            metadata={"property_id": property_obj.id},
        )
        return Response(PropertySerializer(property_obj, context={"request": request}).data)


class PropertyUpdateAPIView(generics.UpdateAPIView):
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["patch", "put"]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def update(self, request, *args, **kwargs):
        property_obj = self.get_object()
        user = request.user
        if not (
            user.is_superuser
            or user.role in {"ADMIN", "PROPERTY_OFFICER"}
            or getattr(property_obj, "created_by_id", None) == user.id
        ):
            return Response({"detail": "You do not have permission to update this property."}, status=403)

        serializer = self.get_serializer(property_obj, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_property = serializer.save()
        log_activity(
            actor=user,
            action="PROPERTY_UPDATED",
            message=f"Property {updated_property.title} updated.",
            property_obj=updated_property,
            metadata={"property_id": updated_property.property_id},
        )
        return Response(self.get_serializer(updated_property).data)


class PropertyDeleteAPIView(generics.DestroyAPIView):
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def destroy(self, request, *args, **kwargs):
        property_obj = self.get_object()
        log_activity(
            actor=request.user,
            action="PROPERTY_DELETED",
            message=f"Property {property_obj.title} deleted.",
            property_obj=property_obj,
            metadata={"property_id": property_obj.id},
        )
        return super().destroy(request, *args, **kwargs)


class VerificationAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        property_identifier = request.data.get("property_id") or request.data.get("property_code")
        serial_number = request.data.get("serial_number")
        scanned_hash = (request.data.get("hash_value") or request.data.get("secure_hash") or "").strip()

        queryset = Property.objects.select_related("created_by", "owner", "current_assignee")
        property_obj = None

        if property_identifier:
            # Check if property_identifier is a UUID (property_code) or integer (id)
            try:
                # Try to parse as integer for id lookup
                property_id = int(property_identifier)
                property_obj = queryset.filter(id=property_id).first()
            except ValueError:
                # Not an integer, treat as property_code (UUID)
                property_obj = queryset.filter(property_code=property_identifier).first()
        if property_obj is None and serial_number:
            property_obj = queryset.filter(serial_number__iexact=serial_number).first()
        if property_obj is None:
            from students.models import StudentDevice

            student_device = StudentDevice.objects.select_related("student", "department").filter(
                serial_number_submitted__iexact=serial_number or "",
                verification_status="Verified",
            ).first()
            if student_device:
                return Response(
                    {
                        "status": "PERSONAL_DEVICE",
                        "alert_type": "BLUE",
                        "message": "Verified student personal device.",
                        "student": {
                            "id": student_device.student_id,
                            "full_name": student_device.student.get_full_name() or student_device.student.username,
                            "username": student_device.student.username,
                            "student_id_number": student_device.student_id_number,
                            "department": student_device.department.name if student_device.department else student_device.student.department,
                            "year_of_study": student_device.year_of_study,
                            "profile_picture_url": request.build_absolute_uri(student_device.photo_url.url) if student_device.photo_url else None,
                            "device_image_url": request.build_absolute_uri(student_device.pc_image_url.url) if student_device.pc_image_url else None,
                        },
                        "device": {
                            "serial_number": student_device.serial_number_submitted,
                            "verification_status": student_device.verification_status,
                        },
                    }
                )
            return Response({"status": "INVALID", "detail": "Property not found."}, status=404)

        expected_hash = _calculate_expected_hash(property_obj)
        is_valid = scanned_hash == expected_hash if scanned_hash else True
        verification_status = "VALID" if is_valid else "INVALID"
        notes = "QR verification successful." if is_valid else "Hash mismatch."
        alert_type = "GREEN" if is_valid else "RED"
        message = "Property verification successful - Access granted" if is_valid else "Security alert - Property verification failed"

        if property_obj.status in {"LOST", "DAMAGED", "UNDER_INVESTIGATION"}:
            verification_status = "FLAGGED"
            alert_type = "RED"
            notes = f"Property is flagged: {property_obj.status}."
            message = f"Property is flagged: {property_obj.status}"
        elif is_valid and not property_obj.current_assignee and property_obj.status not in {"AVAILABLE", "REGISTERED"}:
            verification_status = "UNAUTHORIZED"
            alert_type = "RED"
            notes = "Property movement is not currently authorized."
            message = "Unauthorized Movement"

        log_result = "Authorized" if verification_status == "VALID" else "Flagged" if verification_status == "FLAGGED" else "Unauthorized" if verification_status == "UNAUTHORIZED" else "QR_Invalid"
        log = VerificationLog.objects.create(
            property=property_obj,
            scanned_by=request.user,
            result=log_result,
            details=json.dumps(
                {
                    "verification_status": verification_status,
                    "scanned_hash": scanned_hash,
                    "expected_hash": expected_hash,
                    "serial_number": property_obj.serial_number or serial_number or "",
                    "notes": notes,
                    "ip_address": request.META.get("REMOTE_ADDR"),
                }
            ),
        )
        log_activity(
            actor=request.user,
            action="PROPERTY_VERIFIED",
            message=f"Property {property_obj.title} verification result: {verification_status}.",
            property_obj=property_obj,
            metadata={"verification_log_id": log.log_id},
        )

        if not is_valid:
            admin_user = User.objects.filter(role="ADMIN", is_active=True).first()
            notify_user(
                admin_user,
                "SECURITY_ALERT",
                "QR Invalid Possible Forgery",
                f"QR verification failed for {property_obj.title}. Possible forgery detected.",
                property_obj,
            )
        elif verification_status == "FLAGGED":
            property_officer = User.objects.filter(role="PROPERTY_OFFICER", is_active=True).first()
            notify_user(
                property_officer,
                "SECURITY_ALERT",
                "Flagged property detected",
                f"{property_obj.title} was flagged during verification. Reason: {notes}",
                property_obj,
            )

        # Prepare response with security-focused information
        response_data = {
            "status": verification_status,
            "alert_type": alert_type,
            "message": message,
            "property": {
                "id": property_obj.id,
                "property_code": str(property_obj.property_code),
                "title": property_obj.title,
                "name": property_obj.name,
                "category": property_obj.category,
                "model": property_obj.model,
                "serial_number": property_obj.serial_number,
                "description": property_obj.description,
                "status": property_obj.status,
                "condition": property_obj.condition,
                "location": property_obj.location,
                "owner_name": property_obj.owner.username if property_obj.owner else "Unassigned",
                "department": property_obj.department,
                "approval_status": property_obj.approval_status,
                "assigned_to": property_obj.current_assignee.username if property_obj.current_assignee else None,
                "image": request.build_absolute_uri(property_obj.image.url) if property_obj.image else None,
                "photo": request.build_absolute_uri(property_obj.image.url) if property_obj.image else None,
                "qr_code": request.build_absolute_uri(property_obj.qr_code.url) if property_obj.qr_code else None,
            },
            "verification": {
                "id": log.log_id,
                "verified_by": request.user.username,
                "verified_at": log.scan_time,
                "verification_status": verification_status,
                "notes": notes,
                "ip_address": request.META.get("REMOTE_ADDR"),
            },
            "security_info": {
                "hash_matched": scanned_hash == expected_hash if scanned_hash else True,
                "expected_hash": expected_hash[:16] + "..." if expected_hash else None,
                "scanned_hash": scanned_hash[:16] + "..." if scanned_hash else None,
                "property_code": str(property_obj.property_code),
            }
        }

        # Add transfer records if verification is valid
        if verification_status == "VALID":
            transfer_history = list(
                TransferRequest.objects.filter(property=property_obj)
                .select_related("from_user", "to_user", "approved_by")
                .values(
                    "from_user__username", "to_user__username", "status", 
                    "created_at", "completed_at", "reason"
                )
                .order_by("-created_at")[:5]
            )
            response_data["transfer_records"] = transfer_history

        return Response(response_data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def verify_qr(request, uuid, hash_value):
    property_obj = Property.objects.filter(property_code=uuid).select_related("created_by").first()
    if property_obj is None:
        return Response({"status": "INVALID", "detail": "Property not found."}, status=404)

    expected_hash = _calculate_expected_hash(property_obj)
    verification_status = "VALID" if expected_hash == hash_value else "INVALID"
    VerificationLog.objects.create(
        property=property_obj,
        verified_by=request.user,
        verification_status=verification_status,
        scanned_hash=hash_value,
        expected_hash=expected_hash,
        serial_number=property_obj.serial_number or "",
        notes="QR verification endpoint used.",
        ip_address=request.META.get("REMOTE_ADDR"),
    )
    return Response(
        {
            "status": verification_status,
            "property": PropertySerializer(property_obj, context={"request": request}).data,
        }
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def property_categories(request):
    user = request.user
    queryset = Property.objects.exclude(category__isnull=True).exclude(category__exact="")

    if not _can_view_all_properties(user):
        if user.role == "DEPT_HEAD" and user.department:
            queryset = queryset.filter(department__iexact=user.department)
        else:
            queryset = queryset.filter(
                Q(created_by=user)
            ).distinct()

    categories = sorted(set(queryset.values_list("category", flat=True)))
    return Response(categories)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def property_departments(request):
    user = request.user
    queryset = Property.objects.exclude(department__isnull=True).exclude(department__exact="")

    if not _can_view_all_properties(user):
        if user.role == "DEPT_HEAD" and user.department:
            queryset = queryset.filter(department__iexact=user.department)
        else:
            queryset = queryset.filter(
                Q(created_by=user)
            ).distinct()

    departments = sorted(set(queryset.values_list("department", flat=True)))
    return Response(departments)


class DashboardOverviewAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        queryset = Property.objects.all()
        assignments = Assignment.objects.all()
        transfers = TransferRequest.objects.all()
        incidents = _available_queryset(Incident)
        notifications = _available_queryset(Notification).filter(recipient=user)

        if not _can_view_all_properties(user):
            if user.role == "DEPT_HEAD":
                queryset = queryset.filter(department__iexact=user.department)
                assignments = assignments.filter(property__department__iexact=user.department)
                transfers = transfers.filter(property__department__iexact=user.department)
                incidents = incidents.filter(property__department__iexact=user.department)
            else:
                queryset = queryset.filter(Q(owner=user) | Q(current_assignee=user) | Q(created_by=user)).distinct()
                assignments = assignments.filter(Q(assigned_to=user) | Q(property__owner=user))
                transfers = transfers.filter(Q(from_user=user) | Q(to_user=user))
                incidents = incidents.filter(Q(reported_by=user) | Q(property__owner=user))

        return Response(
            {
                "total_properties": queryset.count(),
                "assigned_properties": queryset.filter(status="ASSIGNED").count(),
                "available_properties": queryset.filter(status="AVAILABLE").count(),
                "damaged_properties": queryset.filter(status="DAMAGED").count(),
                "lost_properties": queryset.filter(status="LOST").count(),
                "pending_assignments": assignments.filter(status="PENDING").count(),
                "pending_transfers": transfers.filter(status="PENDING").count(),
                "open_incidents": incidents.filter(status__in=["Open", "Under Investigation"]).count(),
                "unread_notifications": notifications.filter(is_read=False).count(),
                "property_categories": list(
                    queryset.values("category").annotate(total=Count("id")).order_by("-total")
                ),
                "monthly_registrations": [
                    {"month": item["month"].strftime("%Y-%m"), "total": item["total"]}
                    for item in queryset.annotate(month=TruncMonth("created_at"))
                    .values("month")
                    .annotate(total=Count("id"))
                    .order_by("month")
                    if item["month"] is not None
                ],
            }
        )


class DashboardActivityAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        queryset = ActivityLog.objects.all()

        if not _can_view_all_properties(user):
            if user.role == "DEPT_HEAD":
                queryset = queryset.filter(target_model="Property")
            else:
                queryset = queryset.filter(performed_by=user)

        serializer = ActivityLogSerializer(queryset[:20], many=True)
        return Response(serializer.data)


class DashboardAlertsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        incidents = _available_queryset(Incident, "property").filter(status__in=["Open", "Under Investigation"])
        transfers = TransferRequest.objects.select_related("property", "from_user", "to_user").filter(status="PENDING")
        verifications = _available_queryset(VerificationLog, "property").filter(verification_status="INVALID")

        if not _can_view_all_properties(user):
            if user.role == "DEPT_HEAD":
                incidents = incidents.filter(property__department__iexact=user.department)
                transfers = transfers.filter(property__department__iexact=user.department)
                verifications = verifications.filter(property__department__iexact=user.department)
            else:
                incidents = incidents.filter(Q(reported_by=user) | Q(property__owner=user))
                transfers = transfers.filter(Q(from_user=user) | Q(to_user=user))
                verifications = verifications.filter(Q(verified_by=user) | Q(property__owner=user))

        return Response(
            {
                "incident_alerts": [
                    {
                        "id": incident.id,
                        "property": incident.property.title,
                        "title": incident.title,
                        "type": incident.type,
                        "severity": incident.severity,
                        "status": incident.status,
                        "created_at": incident.created_at,
                    }
                    for incident in incidents[:10]
                ],
                "transfer_alerts": [
                    {
                        "id": transfer.id,
                        "property": transfer.property.title,
                        "from_user": transfer.from_user.username,
                        "to_user": transfer.to_user.username,
                        "status": transfer.status,
                        "created_at": transfer.created_at,
                    }
                    for transfer in transfers[:10]
                ],
                "verification_alerts": [
                    {
                        "id": verification.id,
                        "property": verification.property.title if verification.property else None,
                        "status": verification.verification_status,
                        "notes": verification.notes,
                        "verified_at": verification.verified_at,
                    }
                    for verification in verifications[:10]
                ],
            }
        )


class PropertySearchAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        queryset = Property.objects.select_related(
            "created_by", "owner", "current_assignee"
        ).order_by("-created_at")

        # Apply role-based filtering
        if not _can_view_all_properties(user):
            if user.role == "DEPT_HEAD" and user.department:
                queryset = queryset.filter(department__iexact=user.department)
            else:
                queryset = queryset.filter(
                    Q(created_by=user)
                ).distinct()

        # Search parameters
        search_query = request.GET.get("q", "").strip()
        qr_code = request.GET.get("qr_code", "").strip()
        serial_number = request.GET.get("serial_number", "").strip()
        model = request.GET.get("model", "").strip()
        department = request.GET.get("department", "").strip()
        assigned_user = request.GET.get("assigned_user", "").strip()
        status_filter = request.GET.get("status", "").strip()
        condition_filter = request.GET.get("condition", "").strip()
        category_filter = request.GET.get("category", "").strip()

        # Apply filters
        if search_query:
            queryset = queryset.filter(
                Q(title__icontains=search_query) |
                Q(name__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(serial_number__icontains=search_query)
            )

        if qr_code:
            # Search by property code (UUID) or secure hash
            queryset = queryset.filter(
                Q(property_code__icontains=qr_code) |
                Q(secure_hash__icontains=qr_code)
            )

        if serial_number:
            queryset = queryset.filter(serial_number__icontains=serial_number)

        if model:
            queryset = queryset.filter(model__icontains=model)

        if department:
            queryset = queryset.filter(department__icontains=department)

        if assigned_user:
            queryset = queryset.filter(
                Q(owner__username__icontains=assigned_user) |
                Q(current_assignee__username__icontains=assigned_user)
            )

        if status_filter:
            queryset = queryset.filter(status__iexact=status_filter)

        if condition_filter:
            queryset = queryset.filter(condition__iexact=condition_filter)

        if category_filter:
            queryset = queryset.filter(category__icontains=category_filter)

        # Pagination
        page_size = int(request.GET.get("page_size", 20))
        page = int(request.GET.get("page", 1))
        start = (page - 1) * page_size
        end = start + page_size

        total_count = queryset.count()
        properties = queryset[start:end]

        serializer = PropertySerializer(properties, many=True, context={"request": request})

        return Response({
            "results": serializer.data,
            "count": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": (total_count + page_size - 1) // page_size,
            "filters_applied": {
                "q": search_query,
                "qr_code": qr_code,
                "serial_number": serial_number,
                "model": model,
                "department": department,
                "assigned_user": assigned_user,
                "status": status_filter,
                "condition": condition_filter,
                "category": category_filter,
            }
        })


class RoleBasedDashboardAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        base_queryset = Property.objects.select_related("created_by", "owner", "current_assignee")
        assignments = Assignment.objects.select_related("property", "assigned_to", "assigned_by")
        transfers = TransferRequest.objects.select_related("property", "from_user", "to_user")
        incidents = _available_queryset(Incident, "property", "reported_by")

        # Apply role-based filtering
        if not _can_view_all_properties(user):
            if user.role == "DEPT_HEAD" and user.department:
                base_queryset = base_queryset.filter(department__iexact=user.department)
                assignments = assignments.filter(property__department__iexact=user.department)
                transfers = transfers.filter(property__department__iexact=user.department)
                incidents = incidents.filter(property__department__iexact=user.department)
            else:
                base_queryset = base_queryset.filter(
                    Q(created_by=user)
                ).distinct()
                assignments = assignments.filter(Q(assigned_to=user) | Q(property__created_by=user))
                transfers = transfers.filter(Q(from_user=user) | Q(to_user=user))
                incidents = incidents.filter(Q(reported_by=user) | Q(property__created_by=user))

        # Role-specific dashboard data
        dashboard_data = {
            "user_role": user.role,
            "user_department": user.department,
        }

        if user.role in {"ADMIN", "PROPERTY_OFFICER"}:
            recent_activity = []
            if _table_exists(ActivityLog):
                try:
                    recent_activity = list(
                        ActivityLog.objects.filter(
                            Q(target_model="Property", target_id__in=base_queryset.values_list("id", flat=True))
                            | Q(performed_by=user)
                        )[:10]
                    )
                except Exception:
                    recent_activity = []
            # Manager Dashboard
            dashboard_data.update({
                "total_registered_assets": base_queryset.count(),
                "missing_items": base_queryset.filter(status="LOST").count(),
                "damaged_items": base_queryset.filter(status="DAMAGED").count(),
                "pending_approvals": assignments.filter(status="PENDING").count(),
                "pending_transfers": transfers.filter(status="PENDING").count(),
                "department_comparisons": list(
                    base_queryset.values("department")
                    .annotate(
                        total=Count("id"),
                        assigned=Count("id", filter=Q(status="ASSIGNED")),
                        available=Count("id", filter=Q(status="AVAILABLE")),
                        damaged=Count("id", filter=Q(status="DAMAGED")),
                        lost=Count("id", filter=Q(status="LOST")),
                    )
                    .order_by("-total")
                ),
                "recent_activity": [
                    {
                        "id": activity.id,
                        "action": activity.action,
                        "description": str(activity.details),
                        "timestamp": activity.timestamp,
                        "actor_username": activity.performed_by.username if activity.performed_by else None,
                        "property_name": f"Property ID: {activity.target_id}" if activity.target_model == "Property" else None,
                    }
                    for activity in recent_activity
                ],
            })

        elif user.role == "DEPT_HEAD":
            # Department Dashboard
            dashboard_data.update({
                "department_items": base_queryset.count(),
                "staff_usage": list(
                    base_queryset.filter(current_assignee__isnull=False)
                    .values("current_assignee__username")
                    .annotate(count=Count("id"))
                    .order_by("-count")
                ),
                "transfer_requests": transfers.filter(status="PENDING").count(),
                "incident_logs": incidents.filter(status__in=["Open", "Under Investigation"]).count(),
            })

        elif user.role == "SECURITY":
            # Security Dashboard
            recent_verifications = _available_queryset(VerificationLog, "property", "scanned_by").filter(
                scanned_by=user
            )
            security_incidents = incidents.filter(incident_type="Stolen", status__in=["Open", "Under Investigation"])
            
            dashboard_data.update({
                "verification_interface": "active",
                "real_time_alerts": {
                    "invalid_verifications": recent_verifications.filter(result="QR_Invalid").count(),
                    "suspicious_movements": incidents.filter(incident_type="Stolen").count(),
                },
                "recent_verifications": VerificationLogSerializer(
                    recent_verifications[:20], many=True
                ).data,
                "security_incidents": IncidentSerializer(
                    security_incidents[:20], many=True
                ).data,
            })

        elif user.role == "STUDENT":
            # Student Dashboard - focused on PC management
            student_properties = base_queryset.filter(Q(owner=user) | Q(current_assignee=user))
            dashboard_data.update({
                "assigned_items": student_properties.count(),
                "my_devices": PropertySerializer(
                    student_properties.filter(category__in=["PC", "LAPTOP", "COMPUTER"])[:10], 
                    many=True, 
                    context={"request": request}
                ).data,
                "verification_status": "pending" if student_properties.filter(status="PENDING_VERIFICATION").exists() else "verified",
                "gate_verification_required": student_properties.filter(
                    category__in=["PC", "LAPTOP", "COMPUTER"],
                    status__in=["PENDING_VERIFICATION", "ASSIGNED"]
                ).count(),
                "incident_reports": incidents.filter(reported_by=user).count(),
                "recent_activity": [
                    {
                        "id": activity.id,
                        "action": activity.action,
                        "description": str(activity.details),
                        "timestamp": activity.timestamp,
                        "actor_username": activity.performed_by.username if activity.performed_by else None,
                        "property_name": f"Property ID: {activity.target_id}" if activity.target_model == "Property" else None,
                    }
                    for activity in ActivityLog.objects.filter(
                        Q(performed_by=user) | Q(target_model="Property", target_id__in=student_properties.values_list("id", flat=True))
                    ).order_by("-timestamp")[:10]
                ]
            })
        else:
            # User/Staff Dashboard
            user_properties = base_queryset.filter(Q(owner=user) | Q(current_assignee=user))
            dashboard_data.update({
                "assigned_items": user_properties.count(),
                "transfer_requests": transfers.filter(from_user=user, status="PENDING").count(),
                "incident_reports": incidents.filter(reported_by=user).count(),
                "my_properties": PropertySerializer(user_properties[:10], many=True, context={"request": request}).data,
                "available_for_transfer": user_properties.filter(status="ASSIGNED").count()
            })

        return Response(dashboard_data)


class ReportsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        report_type = request.GET.get("type", "inventory")
        
        base_queryset = Property.objects.select_related("created_by", "owner", "current_assignee")
        
        # Apply role-based filtering
        if not _can_view_all_properties(user):
            if user.role == "DEPT_HEAD" and user.department:
                base_queryset = base_queryset.filter(department__iexact=user.department)
            else:
                base_queryset = base_queryset.filter(
                    Q(created_by=user)
                ).distinct()

        if report_type == "inventory":
            # Inventory Report
            data = {
                "report_type": "inventory",
                "generated_at": timezone.now(),
                "data": {
                    "total_properties": base_queryset.count(),
                    "by_status": list(
                        base_queryset.values("status")
                        .annotate(count=Count("id"))
                        .order_by("-count")
                    ),
                    "by_condition": list(
                        base_queryset.values("condition")
                        .annotate(count=Count("id"))
                        .order_by("-count")
                    ),
                    "by_category": list(
                        base_queryset.values("category")
                        .annotate(count=Count("id"))
                        .order_by("-count")
                    ),
                    "by_department": list(
                        base_queryset.values("department")
                        .annotate(count=Count("id"))
                        .order_by("-count")
                    ),
                    "properties": PropertySerializer(base_queryset[:100], many=True, context={"request": request}).data,
                }
            }

        elif report_type == "missing_damaged":
            # Missing/Damaged Items Report
            data = {
                "report_type": "missing_damaged",
                "generated_at": timezone.now(),
                "data": {
                    "missing_items": PropertySerializer(
                        base_queryset.filter(status="LOST"), many=True, context={"request": request}
                    ).data,
                    "damaged_items": PropertySerializer(
                        base_queryset.filter(status="DAMAGED"), many=True, context={"request": request}
                    ).data,
                    "incidents": list(
                        Incident.objects.filter(property__in=base_queryset, status__in=["Open", "Under Investigation"])
                        .values("incident_type", "status")
                        .annotate(count=Count("id"))
                    )
                }
            }

        elif report_type == "ownership":
            # Ownership Logs Report
            assignments = Assignment.objects.select_related("property", "assigned_to", "assigned_by")
            transfers = TransferRequest.objects.select_related("property", "from_user", "to_user")
            
            if not _can_view_all_properties(user):
                if user.role == "DEPT_HEAD" and user.department:
                    assignments = assignments.filter(property__department__iexact=user.department)
                    transfers = transfers.filter(property__department__iexact=user.department)
                else:
                    assignments = assignments.filter(Q(assigned_to=user) | Q(property__owner=user))
                    transfers = transfers.filter(Q(from_user=user) | Q(to_user=user))

            data = {
                "report_type": "ownership",
                "generated_at": timezone.now(),
                "data": {
                    "current_assignments": list(assignments.filter(status="APPROVED").values(
                        "property__title", "assigned_to__username", "assigned_date", "property__department"
                    )),
                    "transfer_history": list(transfers.values(
                        "property__title", "from_user__username", "to_user__username", 
                        "status", "created_at", "completed_at"
                    )),
                    "ownership_changes": list(assignments.values(
                        "property__title", "assigned_to__username", "status", "assigned_date"
                    ))
                }
            }

        elif report_type == "transfers":
            # Transfer History Report
            transfers = TransferRequest.objects.select_related("property", "from_user", "to_user", "approved_by")
            
            if not _can_view_all_properties(user):
                if user.role == "DEPT_HEAD" and user.department:
                    transfers = transfers.filter(property__department__iexact=user.department)
                else:
                    transfers = transfers.filter(Q(from_user=user) | Q(to_user=user))

            data = {
                "report_type": "transfers",
                "generated_at": timezone.now(),
                "data": {
                    "all_transfers": list(transfers.values(
                        "property__title", "from_user__username", "to_user__username",
                        "status", "reason", "created_at", "reviewed_at", "completed_at"
                    )),
                    "pending_transfers": list(transfers.filter(status="PENDING").values(
                        "id", "property__title", "from_user__username", "to_user__username", "created_at"
                    )),
                    "completed_transfers": list(transfers.filter(status="COMPLETED").values(
                        "property__title", "from_user__username", "to_user__username", "completed_at"
                    ))
                }
            }

        else:
            return Response({"error": "Invalid report type"}, status=400)

        return Response(data)
