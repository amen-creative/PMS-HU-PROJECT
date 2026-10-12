from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from django.core.mail import send_mail
from django.conf import settings
from assignments.models import Assignment, Transfer
from incidents.models import Incident
from incidents.models import EscalationLog
from guests.models import Guest
from settings_config.models import SystemSettings
from notifications.services import notify_user
from users.models import User


def _already_escalated(model_type, related_id, escalation_type):
    return EscalationLog.objects.filter(
        related_model=model_type,
        related_id=related_id,
        escalation_type=escalation_type,
    ).exists()


@shared_task
def check_escalations():
    """Check for pending items that need escalation"""
    settings_obj = SystemSettings.objects.first()
    if not settings_obj:
        return "No system settings found"
    
    first_threshold = settings_obj.first_escalation_hours
    admin_threshold = settings_obj.admin_escalation_hours
    
    now = timezone.now()
    
    # Check pending assignments
    pending_assignments = Assignment.objects.filter(status='PENDING')
    for assignment in pending_assignments:
        hours_pending = (now - assignment.requested_at).total_seconds() / 3600
        
        # First level escalation
        if hours_pending >= first_threshold and not _already_escalated('Assignment', assignment.pk, 'First_Level'):
            send_first_escalation(assignment, 'Assignment')
        
        # Admin escalation
        elif hours_pending >= admin_threshold and not _already_escalated('Assignment', assignment.pk, 'Admin_Level'):
            send_admin_escalation(assignment, 'Assignment')
    
    # Check pending transfers
    pending_transfers = Transfer.objects.filter(status='PENDING')
    for transfer in pending_transfers:
        hours_pending = (now - transfer.requested_at).total_seconds() / 3600
        
        # First level escalation
        if hours_pending >= first_threshold and not _already_escalated('Transfer', transfer.pk, 'First_Level'):
            send_first_escalation(transfer, 'Transfer')
        
        # Admin escalation
        elif hours_pending >= admin_threshold and not _already_escalated('Transfer', transfer.pk, 'Admin_Level'):
            send_admin_escalation(transfer, 'Transfer')
    
    # Check open incidents
    open_incidents = Incident.objects.filter(status__in=['Open', 'Under Investigation'])
    for incident in open_incidents:
        base_datetime = incident.created_at or now
        hours_pending = (now - base_datetime).total_seconds() / 3600
        
        # First level escalation
        if hours_pending >= first_threshold and not _already_escalated('Incident', incident.pk, 'First_Level'):
            send_first_escalation(incident, 'Incident')
        
        # Admin escalation
        elif hours_pending >= admin_threshold and not _already_escalated('Incident', incident.pk, 'Admin_Level'):
            send_admin_escalation(incident, 'Incident')
    
    return f"Escalation check completed at {now}"


def send_first_escalation(obj, model_type):
    """Send first level escalation notification"""
    recipient_email = None
    recipient_user = None
    
    if model_type == 'Assignment':
        recipient_user = User.objects.filter(
            role='DEPT_HEAD',
            department__iexact=getattr(obj.property, 'department', ''),
            is_active=True,
        ).first() or obj.assigned_by
        recipient_email = recipient_user.email if recipient_user else None
    elif model_type == 'Transfer':
        recipient_user = User.objects.filter(
            role='DEPT_HEAD',
            department__iexact=getattr(obj.property, 'department', ''),
            is_active=True,
        ).first()
        recipient_email = recipient_user.email if recipient_user else None
    elif model_type == 'Incident':
        recipient_user = obj.assigned_officer or User.objects.filter(role='PROPERTY_OFFICER', is_active=True).first()
        recipient_email = recipient_user.email if recipient_user else None
    
    if not recipient_email:
        return "No recipient email found"
    
    # Create escalation log
    EscalationLog.objects.create(
        escalation_type='First_Level',
        related_model=model_type,
        related_id=obj.pk,
        recipient_email=recipient_email
    )
    
    # Send email
    subject = f"Escalation: Pending {model_type} requires attention"
    message = f"A pending {model_type.lower()} has been waiting for approval for over 48 hours. Please review and take action."
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [recipient_email],
            fail_silently=False
        )
    except Exception as e:
        print(f"Failed to send escalation email: {e}")
    
    # Create in-system notification
    if recipient_user:
        notify_user(
            recipient_user,
            "ESCALATION",
            "Escalation alert",
            f"Escalation: Your pending {model_type.lower()} requires attention",
            getattr(obj, "property", None),
        )


def send_admin_escalation(obj, model_type):
    """Send admin level escalation notification"""
    admin = User.objects.filter(role='ADMIN').first()
    if not admin:
        return "No admin user found"
    
    # Create escalation log
    EscalationLog.objects.create(
        escalation_type='Admin_Level',
        related_model=model_type,
        related_id=obj.pk,
        recipient_email=admin.email
    )
    
    # Send email
    subject = f"ADMIN ESCALATION: {model_type} pending for over 96 hours"
    message = f"A {model_type.lower()} has been pending for over 96 hours and requires immediate admin attention."
    
    try:
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [admin.email],
            fail_silently=False
        )
    except Exception as e:
        print(f"Failed to send admin escalation email: {e}")
    
    # Create in-system notification
    notify_user(
        admin,
        "ESCALATION",
        "Admin escalation",
        f"ADMIN ESCALATION: {model_type} pending for over 96 hours",
        getattr(obj, "property", None),
    )


@shared_task
def archive_guests():
    """Auto-archive guests whose exit date has passed"""
    today = timezone.now().date()
    expired_guests = Guest.objects.filter(exit_date__lt=today, status=Guest.STATUS_ACTIVE)
    count = expired_guests.update(status=Guest.STATUS_ARCHIVED)
    return f"Archived {count} guest records"


def cleanup_old_audit_logs():
    """Clean up audit logs older than 1 year (optional maintenance task)"""
    from audits.models import AuditLog
    from django.utils import timezone
    
    one_year_ago = timezone.now() - timedelta(days=365)
    old_logs = AuditLog.objects.filter(timestamp__lt=one_year_ago)
    
    count = old_logs.count()
    old_logs.delete()
    
    return f"Deleted {count} old audit logs"
