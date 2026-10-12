import builtins

from django.conf import settings
from django.db import models

from properties.models import Property


class Assignment(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_APPROVED = "APPROVED"
    STATUS_REJECTED = "REJECTED"
    STATUS_RETURNED = "RETURNED"
    STATUS_SUPERSEDED = "SUPERSEDED"

    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending Approval"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_RETURNED, "Returned"),
        (STATUS_SUPERSEDED, "Superseded"),
    )

    id = models.BigAutoField(primary_key=True)
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="assignments")
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="assignments",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_assignments",
    )
    assigned_date = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    history_log = models.TextField(blank=True, default="")
    previous_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="previous_assignments",
    )
    assigned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_assignments",
    )
    notes = models.TextField(blank=True, default="")
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-assigned_date",)

    @builtins.property
    def assignment_id(self):
        return self.id

    @builtins.property
    def department(self):
        return self.property.department

    @builtins.property
    def assignment_note(self):
        return self.notes

    @assignment_note.setter
    def assignment_note(self, value):
        self.notes = value

    @builtins.property
    def requested_at(self):
        return self.assigned_date

    @builtins.property
    def approved_at(self):
        return self.updated_at if self.status == self.STATUS_APPROVED else None

    def __str__(self):
        return f"{self.property.title} -> {self.assigned_to.username} ({self.status})"


class TransferRequest(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_APPROVED = "APPROVED"
    STATUS_REJECTED = "REJECTED"
    STATUS_COMPLETED = "COMPLETED"

    STATUS_CHOICES = (
        (STATUS_PENDING, "Pending"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_REJECTED, "Rejected"),
        (STATUS_COMPLETED, "Completed"),
    )

    id = models.BigAutoField(primary_key=True)
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="transfer_requests")
    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="outgoing_transfers",
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="incoming_transfers",
    )
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_transfers",
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_PENDING)
    reason = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    completed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="completed_transfers",
    )
    response_note = models.TextField(blank=True, default="")
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)
        db_table = "assignments_transferrequest"

    @builtins.property
    def transfer_id(self):
        return self.id

    @builtins.property
    def to_department(self):
        return getattr(self.to_user, "department_ref", None)

    @builtins.property
    def requested_by(self):
        return self.from_user

    @builtins.property
    def requested_at(self):
        return self.created_at

    @builtins.property
    def rejection_reason(self):
        return self.response_note

    def __str__(self):
        return f"{self.property.title} {self.from_user.username} -> {self.to_user.username} ({self.status})"


Transfer = TransferRequest
