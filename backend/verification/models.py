from django.db import models
from django.conf import settings
from django.utils import timezone
import json


class VerificationLog(models.Model):
    RESULT_CHOICES = (
        ('Authorized', 'Authorized'),
        ('Unauthorized', 'Unauthorized'),
        ('QR_Invalid', 'QR_Invalid'),
        ('Flagged', 'Flagged'),
        ('Personal_Device', 'Personal_Device'),
    )

    log_id = models.AutoField(primary_key=True)
    property = models.ForeignKey(
        'properties.Property',
        on_delete=models.CASCADE,
        related_name='verification_logs'
    )
    scanned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='verification_logs'
    )
    scan_time = models.DateTimeField(auto_now_add=True)
    result = models.CharField(max_length=20, choices=RESULT_CHOICES)
    details = models.TextField()  # JSON snapshot

    class Meta:
        ordering = ('-scan_time',)

    def __str__(self):
        return f'{self.property.title} - {self.result} at {self.scan_time}'
