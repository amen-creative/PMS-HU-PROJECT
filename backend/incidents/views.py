from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.mail import send_mail
from django.conf import settings as django_settings
from django.db import connection, OperationalError, ProgrammingError
from .models import Incident, EscalationLog
from .serializers import IncidentSerializer, IncidentCreateSerializer, EscalationLogSerializer
from notifications.services import notify_user
from audits.services import log_activity
from users.models import User


def _table_exists(model):
    try:
        return model._meta.db_table in connection.introspection.table_names()
    except (ProgrammingError, OperationalError):
        return False


class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.select_related('property', 'reported_by', 'assigned_officer')
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return IncidentCreateSerializer
        return IncidentSerializer

    def get_queryset(self):
        if not _table_exists(Incident):
            return Incident.objects.none()
        user = self.request.user
        queryset = super().get_queryset()
        
        # Role-based filtering
        if user.role in ['ADMIN', 'PROPERTY_OFFICER']:
            return queryset
        elif user.role == 'DEPT_HEAD':
            return queryset.filter(property__department__iexact=user.department)
        elif user.role in ['STAFF', 'STUDENT']:
            return queryset.filter(reported_by=user)
        elif user.role == 'SECURITY':
            return queryset
        return queryset.none()

    def create(self, request):
        if not _table_exists(Incident):
            return Response(
                {"error": "Incident storage is not initialized yet. Run database sync first."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        if request.user.role not in ["STAFF", "STUDENT", "ADMIN"]:
            return Response(
                {"error": "Only staff and students can report incidents through this workflow."},
                status=status.HTTP_403_FORBIDDEN,
            )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Set reported_by to current user
        incident = serializer.save(reported_by=request.user)
        
        # Update property status to Under Investigation
        incident.property.status = 'UNDER_INVESTIGATION'
        incident.property.updated_by = request.user
        incident.property.save(update_fields=["status", "updated_by", "updated_at"])

        property_officer = User.objects.filter(role="PROPERTY_OFFICER", is_active=True).first()
        department_head = User.objects.filter(
            role="DEPT_HEAD",
            department__iexact=incident.property.department,
            is_active=True,
        ).first()
        for recipient in [property_officer, department_head]:
            if recipient:
                notify_user(
                    recipient,
                    "INCIDENT",
                    "Incident reported",
                    f"Incident reported for property {incident.property.title}. Tracking: {incident.tracking_number}",
                    incident.property,
                )
                # UC-06 Step 10: Send email notification
                if recipient.email:
                    try:
                        send_mail(
                            subject=f"Incident Reported: {incident.property.title} ({incident.tracking_number})",
                            message=(
                                f"An incident has been reported for property '{incident.property.title}'.\n\n"
                                f"Tracking Number: {incident.tracking_number}\n"
                                f"Incident Type: {incident.incident_type}\n"
                                f"Reported By: {incident.reported_by.get_full_name() or incident.reported_by.username}\n"
                                f"Incident Date: {incident.incident_date}\n"
                                f"Location: {incident.location}\n"
                                f"Description: {incident.description}\n\n"
                                f"Property status has been updated to 'Under Investigation'.\n"
                                f"Please review and take action at your earliest convenience."
                            ),
                            from_email=django_settings.DEFAULT_FROM_EMAIL,
                            recipient_list=[recipient.email],
                            fail_silently=True,
                        )
                    except Exception:
                        pass
        log_activity(
            actor=request.user,
            action="INCIDENT_REPORTED",
            message=f"Incident {incident.tracking_number} reported for {incident.property.title}.",
            property_obj=incident.property,
            metadata={"incident_id": incident.incident_id, "tracking_number": incident.tracking_number},
        )
        
        return Response(IncidentSerializer(incident).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['patch'])
    def status(self, request, pk=None):
        incident = self.get_object()
        new_status = request.data.get('status')
        
        if new_status not in ['Open', 'Under Investigation', 'Resolved', 'Closed']:
            return Response({'error': 'Invalid status'}, status=status.HTTP_400_BAD_REQUEST)
        
        incident.status = new_status
        incident.save()
        
        return Response(IncidentSerializer(incident).data)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        incident = self.get_object()
        incident.status = 'Resolved'
        incident.assigned_officer = request.user
        incident.save()
        
        # Update property status based on resolution
        if incident.incident_type == 'Lost':
            incident.property.status = 'LOST'
        elif incident.incident_type == 'Damaged':
            incident.property.status = 'DAMAGED'
        else:
            incident.property.status = 'AVAILABLE'
        incident.property.updated_by = request.user
        incident.property.save(update_fields=["status", "updated_by", "updated_at"])
        log_activity(
            actor=request.user,
            action="INCIDENT_RESOLVED",
            message=f"Incident {incident.tracking_number} resolved.",
            property_obj=incident.property,
            metadata={"incident_id": incident.incident_id},
        )
        
        return Response(IncidentSerializer(incident).data)

    @action(detail=False, methods=['get'])
    def my(self, request):
        queryset = self.get_queryset().filter(reported_by=request.user)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class EscalationLogViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = EscalationLog.objects.select_related('resolved_by')
    serializer_class = EscalationLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if not _table_exists(EscalationLog):
            return EscalationLog.objects.none()
        user = self.request.user
        if user.role == 'ADMIN':
            return super().get_queryset()
        return super().get_queryset().filter(resolved_by=user)
