from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.db import OperationalError, ProgrammingError, connection
from django.db.models import Count, Q, Sum
from properties.models import Property
from assignments.models import Assignment, Transfer
from incidents.models import Incident
from guests.models import Guest
from students.models import StudentDevice
from notifications.models import Notification
from audits.models import AuditLog
from incidents.models import EscalationLog


def _table_exists(model):
    try:
        return model._meta.db_table in connection.introspection.table_names()
    except (ProgrammingError, OperationalError):
        return False


def _safe_queryset(model):
    return model.objects.all() if _table_exists(model) else model.objects.none()


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def dashboard_stats(request):
    """Role-based dashboard statistics"""
    user = request.user
    data = {}
    assignments = _safe_queryset(Assignment)
    transfers = _safe_queryset(Transfer)
    incidents = _safe_queryset(Incident)
    guests = _safe_queryset(Guest)
    student_devices = _safe_queryset(StudentDevice)
    notifications = _safe_queryset(Notification)
    
    if user.role == 'ADMIN':
        # Admin dashboard - full system overview
        data['total_properties'] = Property.objects.count()
        data['total_users'] = user.__class__.objects.count()
        data['active_assignments'] = assignments.filter(status='APPROVED').count()
        data['pending_transfers'] = transfers.filter(status='PENDING').count()
        data['open_incidents'] = incidents.filter(status='Open').count()
        data['active_guests'] = guests.filter(status='Active').count()
        data['pending_verifications'] = student_devices.filter(verification_status='Pending').count()
        data['unread_notifications'] = notifications.filter(recipient=user, is_read=False).count()
        
        # Property status breakdown
        data['property_status'] = dict(Property.objects.values('status').annotate(count=Count('id')).values_list('status', 'count'))
        
        # Department breakdown
        data['departments'] = list(
            Property.objects.exclude(department__exact="")
            .values('department')
            .annotate(property_count=Count('id'))
            .order_by('department')
        )
        
    elif user.role == 'PROPERTY_OFFICER':
        # Property Officer dashboard
        data['registered_properties'] = Property.objects.filter(created_by=user).count()
        data['pending_assignments'] = assignments.filter(status='PENDING').count()
        data['pending_transfers'] = transfers.filter(status='PENDING').count()
        data['open_incidents'] = incidents.filter(status='Open').count()
        data['unread_notifications'] = notifications.filter(recipient=user, is_read=False).count()
        
        # Recent properties
        data['recent_properties'] = list(Property.objects.filter(created_by=user).order_by('-created_at')[:5].values('title', 'status', 'created_at'))
        
    elif user.role == 'DEPT_HEAD':
        # Department Head dashboard
        dept = user.department_ref
        if dept:
            data['department_properties'] = Property.objects.filter(department=dept.name).count()
            dept_name = dept.name
            data['department_assignments'] = assignments.filter(property__department=dept_name, status='APPROVED').count()
            data['pending_transfers'] = transfers.filter(to_user__department_ref=dept, status='PENDING').count()
            data['open_incidents'] = incidents.filter(property__department=dept_name, status='Open').count()
            data['unread_notifications'] = notifications.filter(recipient=user, is_read=False).count()
            
            # Recent transfers to department
            data['recent_transfers'] = list(Transfer.objects.filter(to_user__department_ref=dept).order_by('-created_at')[:5].values('property__title', 'from_user__full_name', 'status', 'created_at'))
        else:
            data['message'] = 'No department assigned'
            
    elif user.role == 'SECURITY':
        # Security Officer dashboard
        data['active_guests'] = guests.filter(status='Active').count()
        data['open_incidents'] = incidents.filter(status='Open').count()
        data['assigned_incidents'] = incidents.filter(assigned_officer=user).count()
        data['pending_verifications'] = student_devices.filter(verification_status='Pending').count()
        data['unread_notifications'] = notifications.filter(recipient=user, is_read=False).count()
        
        # Recent guests
        data['recent_guests'] = list(guests.filter(status='Active').order_by('-entry_date')[:5].values('full_name', 'entry_date', 'exit_date'))
        
        # Recent incidents
        data['recent_incidents'] = list(incidents.filter(assigned_officer=user).order_by('-created_at')[:5].values('tracking_number', 'property__title', 'status', 'incident_type'))
        
    elif user.role == 'IT_OFFICER':
        # IT Officer dashboard
        data['pending_verifications'] = student_devices.filter(verification_status='Pending').count()
        data['verified_devices'] = student_devices.filter(verification_status='Verified').count()
        data['rejected_devices'] = student_devices.filter(verification_status='Rejected').count()
        data['unread_notifications'] = notifications.filter(recipient=user, is_read=False).count()
        
        # Pending verification queue
        data['pending_queue'] = list(student_devices.filter(verification_status='Pending').order_by('-submitted_at')[:5].values('student__full_name', 'serial_number_submitted', 'submitted_at'))
        
    elif user.role == 'STAFF':
        # Staff dashboard
        data['my_assignments'] = assignments.filter(assigned_to=user, status='APPROVED').count()
        data['my_transfers'] = transfers.filter(from_user=user, status='PENDING').count()
        data['unread_notifications'] = notifications.filter(recipient=user, is_read=False).count()
        
        # My properties
        data['my_properties'] = list(Property.objects.filter(current_assignee=user).values('title', 'serial_number', 'status'))
        
    elif user.role == 'STUDENT':
        # Student dashboard
        data['my_devices'] = student_devices.filter(student=user).count()
        data['pending_verification'] = student_devices.filter(student=user, verification_status='Pending').count()
        data['unread_notifications'] = notifications.filter(recipient=user, is_read=False).count()
        
        # My devices
        data['devices'] = list(student_devices.filter(student=user).values('serial_number_submitted', 'verification_status', 'submitted_at'))
    
    return Response(data)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def recent_activity(request):
    """Recent activity for the user"""
    user = request.user
    limit = int(request.query_params.get('limit', 10))
    
    activities = []
    
    # Get recent notifications
    notifications = Notification.objects.filter(recipient=user).order_by('-created_at')[:limit]
    for notif in notifications:
        activities.append({
            'type': 'notification',
            'message': notif.message,
            'notification_type': notif.notification_type,
            'created_at': notif.created_at,
            'is_read': notif.is_read
        })
    
    # Get recent audit logs for admin/it_officer
    if user.role in ['ADMIN', 'IT_OFFICER']:
        audit_logs = AuditLog.objects.order_by('-timestamp')[:limit]
        for log in audit_logs:
            activities.append({
                'type': 'audit',
                'action': log.action,
                'performed_by': log.performed_by.full_name if log.performed_by else 'System',
                'timestamp': log.timestamp
            })
    
    # Sort by date
    activities.sort(key=lambda x: x.get('created_at') or x.get('timestamp'), reverse=True)
    
    return Response(activities[:limit])


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def escalation_summary(request):
    """Escalation summary for admin"""
    if request.user.role != 'ADMIN':
        return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
    
    from settings_config.models import SystemSettings
    settings = SystemSettings.objects.first()
    
    data = {
        'first_escalation_hours': settings.first_escalation_hours if settings else 48,
        'admin_escalation_hours': settings.admin_escalation_hours if settings else 96,
        'pending_assignments': Assignment.objects.filter(status='Pending').count(),
        'pending_transfers': Transfer.objects.filter(status='Pending').count(),
        'open_incidents': Incident.objects.filter(status='Open').count(),
        'total_escalations': EscalationLog.objects.count(),
        'resolved_escalations': EscalationLog.objects.filter(resolved=True).count(),
        'unresolved_escalations': EscalationLog.objects.filter(resolved=False).count()
    }
    
    return Response(data)
