import builtins

from django.conf import settings
from django.db import models


class Notification(models.Model):
    TYPE_ASSIGNMENT = "ASSIGNMENT"
    TYPE_TRANSFER = "TRANSFER"
    TYPE_INCIDENT = "INCIDENT"
    TYPE_ESCALATION = "ESCALATION"
    TYPE_VERIFICATION = "VERIFICATION"
    TYPE_SECURITY_ALERT = "SECURITY_ALERT"
    TYPE_SYSTEM = "SYSTEM"
    TYPE_APPROVAL = "APPROVAL"

    NOTIFICATION_TYPE_CHOICES = (
        (TYPE_ASSIGNMENT, "Assignment"),
        (TYPE_TRANSFER, "Transfer"),
        (TYPE_INCIDENT, "Incident"),
        (TYPE_ESCALATION, "Escalation"),
        (TYPE_VERIFICATION, "Verification"),
        (TYPE_SECURITY_ALERT, "Security Alert"),
        (TYPE_SYSTEM, "System"),
        (TYPE_APPROVAL, "Approval"),
    )

    id = models.BigAutoField(primary_key=True)
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    type = models.CharField(max_length=30, choices=NOTIFICATION_TYPE_CHOICES)
    title = models.CharField(max_length=255, default="")
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    property = models.ForeignKey(
        "properties.Property",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-created_at",)
        db_table = "notifications_notification"

    @builtins.property
    def notification_id(self):
        return self.id

    @builtins.property
    def notification_type(self):
        return self.type

    @notification_type.setter
    def notification_type(self, value):
        self.type = value

    @builtins.property
    def related_object_type(self):
        return "Property" if self.property_id else None

    @builtins.property
    def related_object_id(self):
        return self.property_id

    def __str__(self):
        return f"{self.recipient.username} - {self.type}"
