from django.contrib.auth.models import AbstractUser
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
import uuid


class Department(models.Model):
    name = models.CharField(max_length=120, unique=True)
    code = models.CharField(max_length=20, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("name",)

    def __str__(self):
        return self.name


class User(AbstractUser):
    ROLE_ADMIN = "ADMIN"
    ROLE_PROPERTY_OFFICER = "PROPERTY_OFFICER"
    ROLE_DEPT_HEAD = "DEPT_HEAD"
    ROLE_SECURITY = "SECURITY"
    ROLE_IT_OFFICER = "IT_OFFICER"
    ROLE_STAFF = "STAFF"
    ROLE_STUDENT = "STUDENT"

    ROLE_CHOICES = (
        (ROLE_ADMIN, "Admin"),
        (ROLE_PROPERTY_OFFICER, "Property Officer"),
        (ROLE_DEPT_HEAD, "Department Head"),
        (ROLE_SECURITY, "Security Officer"),
        (ROLE_IT_OFFICER, "IT Officer"),
        (ROLE_STAFF, "Staff"),
        (ROLE_STUDENT, "Student"),
    )

    role = models.CharField(max_length=30, choices=ROLE_CHOICES, default=ROLE_STAFF)
    full_name = models.CharField(max_length=100)
    position = models.CharField(max_length=100, blank=True, default="")
    department = models.CharField(max_length=100, blank=True, default="")
    department_ref = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="users",
    )
    phone_number = models.CharField(max_length=30, blank=True, default="")
    
    # Profile information
    profile_picture = models.ImageField(
        upload_to='profile_pictures/',
        blank=True,
        null=True,
        help_text="Upload your profile picture"
    )
    university_id = models.CharField(
        max_length=50,
        blank=True,
        unique=True,
        null=True,
        help_text="University ID number"
    )
    failed_login_attempts = models.PositiveIntegerField(default=0)
    is_locked = models.BooleanField(default=False)
    locked_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    def save(self, *args, **kwargs):
        # Single-Admin constraint
        if self.role == self.ROLE_ADMIN:
            existing_admin = User.objects.filter(role=self.ROLE_ADMIN).exclude(pk=self.pk).exists()
            if existing_admin:
                raise ValidationError("Administrator limit reached. Only one ADMIN role is permitted.")
        
        if self.department_ref and not self.department:
            self.department = self.department_ref.name
        self.role = self.normalize_role(self.role)
        super().save(*args, **kwargs)

    def register_failed_login(self):
        self.failed_login_attempts += 1
        if self.failed_login_attempts >= 3:
            self.is_locked = True
            self.locked_at = timezone.now()
        self.save(update_fields=["failed_login_attempts", "is_locked", "locked_at", "updated_at"])

    def clear_login_failures(self):
        if self.failed_login_attempts or self.is_locked or self.locked_at:
            self.failed_login_attempts = 0
            self.is_locked = False
            self.locked_at = None
            self.save(update_fields=["failed_login_attempts", "is_locked", "locked_at", "updated_at"])

    @classmethod
    def normalize_role(cls, role):
        mapping = {
            "DEPARTMENT_HEAD": cls.ROLE_DEPT_HEAD,
            "SECURITY_OFFICER": cls.ROLE_SECURITY,
        }
        return mapping.get(role, role or cls.ROLE_STAFF)

    def __str__(self):
        return self.username


class GuestUser(models.Model):
    """Temporary user accounts for university events"""
    ACCESS_LEVEL_CHOICES = (
        ("VIEW_ONLY", "View Only"),
        ("LIMITED_ACCESS", "Limited Access"),
        ("FULL_ACCESS", "Full Access"),
    )
    
    guest_code = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField()
    phone_number = models.CharField(max_length=30, blank=True, default="")
    organization = models.CharField(max_length=200, blank=True, default="")
    purpose = models.TextField(help_text="Purpose of visit/property access")
    access_level = models.CharField(max_length=20, choices=ACCESS_LEVEL_CHOICES, default="VIEW_ONLY")
    
    # Event information
    event_name = models.CharField(max_length=200)
    event_start_date = models.DateTimeField()
    event_end_date = models.DateTimeField()
    
    # Access control
    is_active = models.BooleanField(default=True)
    access_granted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="granted_guest_access",
    )
    access_revoked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="revoked_guest_access",
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_access = models.DateTimeField(null=True, blank=True)
    access_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.event_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def is_expired(self):
        from django.utils import timezone
        return timezone.now() > self.event_end_date

    def increment_access_count(self):
        from django.utils import timezone
        self.access_count += 1
        self.last_access = timezone.now()
        self.save(update_fields=["access_count", "last_access"])


class GuestPropertyAccess(models.Model):
    """Track which properties guest users can access"""
    guest_user = models.ForeignKey(GuestUser, on_delete=models.CASCADE, related_name="property_access")
    property = models.ForeignKey(
        "properties.Property", 
        on_delete=models.CASCADE, 
        related_name="guest_access"
    )
    access_granted_at = models.DateTimeField(auto_now_add=True)
    granted_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="granted_property_access",
    )
    notes = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = ("guest_user", "property")
        ordering = ("-access_granted_at",)

    def __str__(self):
        return f"{self.guest_user.full_name} -> {self.property.title}"
