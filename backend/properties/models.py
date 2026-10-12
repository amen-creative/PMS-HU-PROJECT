import hashlib
import json
import uuid
from decimal import Decimal

from django.conf import settings
from django.core.validators import MaxValueValidator, MinLengthValidator, MinValueValidator
from django.db import models

from .utils import generate_qr


class Property(models.Model):
    STATUS_REGISTERED = "REGISTERED"
    STATUS_AVAILABLE = "AVAILABLE"
    STATUS_ASSIGNED = "ASSIGNED"
    STATUS_UNDER_INVESTIGATION = "UNDER_INVESTIGATION"
    STATUS_DAMAGED = "DAMAGED"
    STATUS_LOST = "LOST"

    STATUS_CHOICES = (
        (STATUS_REGISTERED, "Registered"),
        (STATUS_AVAILABLE, "Available"),
        (STATUS_ASSIGNED, "Assigned"),
        (STATUS_UNDER_INVESTIGATION, "Under Investigation"),
        (STATUS_DAMAGED, "Damaged"),
        (STATUS_LOST, "Lost"),
    )

    CONDITION_NEW = "NEW"
    CONDITION_GOOD = "GOOD"
    CONDITION_FAIR = "FAIR"
    CONDITION_POOR = "POOR"

    CONDITION_CHOICES = (
        (CONDITION_NEW, "New"),
        (CONDITION_GOOD, "Good"),
        (CONDITION_FAIR, "Fair"),
        (CONDITION_POOR, "Poor"),
    )

    id = models.BigAutoField(primary_key=True)
    property_code = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    name = models.CharField(max_length=200, blank=True, default="", validators=[MinLengthValidator(2)])
    category = models.CharField(max_length=100, blank=True, default="", validators=[MinLengthValidator(2)])
    serial_number = models.CharField(
        max_length=200,
        unique=True,
        blank=True,
        null=True,
        validators=[MinLengthValidator(3)],
    )
    acquisition_date = models.DateField(blank=True, null=True)
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default=STATUS_REGISTERED)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_properties",
    )
    secure_hash = models.CharField(max_length=64, blank=True)
    qr_code = models.ImageField(upload_to="qr_codes/", blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    description = models.TextField(default="")
    image = models.ImageField(upload_to="properties/", blank=True, null=True)
    location = models.CharField(max_length=255, default="")
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="owned_properties",
    )
    price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    title = models.CharField(max_length=255, default="")
    approval_status = models.CharField(max_length=20, default="PENDING")
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default=CONDITION_GOOD)
    department = models.CharField(max_length=120, default="")
    model = models.CharField(max_length=120, default="")
    purchase_year = models.PositiveIntegerField(
        default=2026,
        validators=[MinValueValidator(1900), MaxValueValidator(2100)],
    )
    value = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    current_assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_properties",
    )
    updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="updated_properties",
    )

    class Meta:
        ordering = ("-created_at",)

    @property
    def property_id(self):
        return self.id

    @property
    def registered_by(self):
        return self.created_by

    @registered_by.setter
    def registered_by(self, value):
        self.created_by = value

    @property
    def registered_by_id(self):
        return self.created_by_id

    @property
    def monetary_value(self):
        return self.value

    @monetary_value.setter
    def monetary_value(self, value):
        self.value = value

    @property
    def property_image(self):
        return self.image

    @property_image.setter
    def property_image(self, value):
        self.image = value

    @property
    def qr_code_image(self):
        return self.qr_code

    @property
    def qr_hash(self):
        return self.secure_hash

    @qr_hash.setter
    def qr_hash(self, value):
        self.secure_hash = value

    def save(self, *args, **kwargs):
        update_fields = kwargs.get("update_fields")
        title = (self.title or self.name or "").strip()
        if title:
            self.title = title
            if not self.name:
                self.name = title
        elif self.name:
            self.title = self.name

        if not self.secure_hash:
            hash_source = self.serial_number or self.title or str(self.property_code)
            self.secure_hash = hashlib.sha256(f"{self.property_code}{hash_source}".encode()).hexdigest()

        super().save(*args, **kwargs)

        should_refresh_qr = update_fields is None or "qr_code" not in set(update_fields)
        if should_refresh_qr:
            try:
                generate_qr(self)
                super().save(update_fields=["qr_code"])
            except Exception:
                pass

    def _user_snapshot(self, user):
        if not user:
            return None
        return {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name or user.get_full_name() or user.username,
            "role": user.role,
            "department": user.department,
            "email": user.email,
        }

    def _decimal_to_string(self, value):
        if value in (None, ""):
            return ""
        if isinstance(value, Decimal):
            return format(value, "f")
        return str(value)

    def get_qr_payload(self):
        owner_snapshot = self._user_snapshot(self.owner)
        assignee_snapshot = self._user_snapshot(self.current_assignee)
        registrar_snapshot = self._user_snapshot(self.created_by)
        payload = {
            "qr_version": 2,
            "property_id": self.id,
            "property_code": str(self.property_code),
            "title": self.title,
            "name": self.name,
            "category": self.category,
            "model": self.model,
            "serial_number": self.serial_number,
            "description": self.description,
            "status": self.status,
            "condition": self.condition,
            "approval_status": self.approval_status,
            "location": self.location,
            "department": self.department,
            "purchase_year": self.purchase_year,
            "value": self._decimal_to_string(self.value),
            "price": self._decimal_to_string(self.price),
            "owner_name": owner_snapshot["full_name"] if owner_snapshot else "",
            "current_assignee_name": assignee_snapshot["full_name"] if assignee_snapshot else "",
            "registered_by_name": registrar_snapshot["full_name"] if registrar_snapshot else "",
            "owner": owner_snapshot,
            "current_assignee": assignee_snapshot,
            "registered_by": registrar_snapshot,
            "scan_summary": (
                f"Property: {self.title or self.name or 'Unnamed Property'} | "
                f"Owner: {(owner_snapshot or {}).get('full_name') or 'Unassigned'} | "
                f"Serial: {self.serial_number or 'N/A'} | "
                f"Status: {self.status or 'N/A'}"
            ),
            "secure_hash": self.secure_hash,
        }
        return json.dumps(payload)

    def __str__(self):
        return self.title or self.name or f"Property {self.id}"
