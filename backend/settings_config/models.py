from django.db import models
from django.conf import settings
from django.utils import timezone


class SystemSettings(models.Model):
    settings_id = models.AutoField(primary_key=True)
    first_escalation_hours = models.IntegerField(default=48)
    admin_escalation_hours = models.IntegerField(default=96)
    email_templates = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='updated_settings'
    )

    class Meta:
        verbose_name_plural = 'System Settings'

    def save(self, *args, **kwargs):
        # Ensure only one settings record exists (singleton pattern)
        if not self.pk and SystemSettings.objects.exists():
            raise ValueError("Only one SystemSettings record is allowed")
        super().save(*args, **kwargs)

    def __str__(self):
        return f"System Settings (ID: {self.settings_id})"
