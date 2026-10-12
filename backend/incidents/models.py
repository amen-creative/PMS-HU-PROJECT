from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


class Incident(models.Model):
    INCIDENT_TYPE_CHOICES = (
        ('Lost', 'Lost'),
        ('Stolen', 'Stolen'),
        ('Damaged', 'Damaged'),
    )
    
    STATUS_CHOICES = (
        ('Open', 'Open'),
        ('Under Investigation', 'Under Investigation'),
        ('Resolved', 'Resolved'),
        ('Closed', 'Closed'),
    )

    incident_id = models.AutoField(primary_key=True)
    property = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        related_name='incidents'
    )
    incident_type = models.CharField(max_length=20, choices=INCIDENT_TYPE_CHOICES)
    reported_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reported_incidents'
    )
    report_date = models.DateField(auto_now_add=True)
    incident_date = models.DateField()
    location = models.CharField(max_length=200)
    description = models.TextField()
    attachment = models.FileField(upload_to='incident_attachments/', blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open')
    tracking_number = models.CharField(max_length=20, unique=True, editable=False)
    assigned_officer = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_incidents'
    )
    escalation_sent_at = models.DateTimeField(null=True, blank=True)
    admin_escalation_sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ('-created_at',)

    def save(self, *args, **kwargs):
        if not self.tracking_number:
            date_str = timezone.now().strftime('%Y%m%d')
            random_suffix = str(uuid.uuid4().hex[:4]).upper()
            self.tracking_number = f'INC-{date_str}-{random_suffix}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.tracking_number} - {self.property.title}'


class EscalationLog(models.Model):
    ESCALATION_TYPE_CHOICES = (
        ('First_Level', 'First Level'),
        ('Admin_Level', 'Admin Level'),
    )

    escalation_id = models.AutoField(primary_key=True)
    escalation_type = models.CharField(max_length=30, choices=ESCALATION_TYPE_CHOICES)
    related_model = models.CharField(max_length=50)  # "Assignment" | "Transfer" | "Incident"
    related_id = models.IntegerField()
    recipient_email = models.EmailField()
    sent_at = models.DateTimeField(auto_now_add=True)
    resolved = models.BooleanField(default=False)
    resolution_note = models.TextField(blank=True, null=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_escalations'
    )

    class Meta:
        ordering = ('-sent_at',)

    def __str__(self):
        return f'{self.escalation_type} - {self.related_model} #{self.related_id}'
