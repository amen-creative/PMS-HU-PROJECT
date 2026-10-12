import builtins
import base64
import hashlib
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from django.conf import settings
from django.db import models
import os


class Guest(models.Model):
    STATUS_ACTIVE = "ACTIVE"
    STATUS_ARCHIVED = "ARCHIVED"
    STATUS_EXPIRED = "EXPIRED"

    STATUS_CHOICES = (
        (STATUS_ACTIVE, "Active"),
        (STATUS_ARCHIVED, "Archived"),
        (STATUS_EXPIRED, "Expired"),
    )

    guest_id = models.AutoField(primary_key=True)
    full_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, default="")
    contact_number = models.CharField(max_length=20, blank=True, default="")
    purpose_of_visit = models.TextField(blank=True, default="")
    property = models.ForeignKey(
        "properties.Property",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="guest_registrations",
    )
    guest_image = models.ImageField(upload_to="guest_images/", blank=True, null=True)
    entry_date = models.DateField(auto_now_add=True)
    exit_date = models.DateField()
    national_id_number = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    registered_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="registered_guests",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.full_name} - {self.entry_date}"

    @builtins.property
    def is_expired(self):
        from django.utils import timezone
        return self.exit_date < timezone.now().date()

    @builtins.property
    def days_remaining(self):
        from django.utils import timezone
        today = timezone.now().date()
        if self.exit_date >= today:
            return (self.exit_date - today).days
        return 0

    @classmethod
    def _aes256_key(cls):
        raw_key = os.getenv("AES_KEY") or settings.SECRET_KEY
        if isinstance(raw_key, str):
            raw_key = raw_key.encode()
        return hashlib.sha256(raw_key).digest()

    @classmethod
    def encrypt_nid(cls, nid):
        aesgcm = AESGCM(cls._aes256_key())
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, nid.encode(), None)
        return base64.urlsafe_b64encode(nonce + ciphertext).decode()

    @classmethod
    def decrypt_nid(cls, encrypted_nid):
        try:
            payload = base64.urlsafe_b64decode(encrypted_nid.encode())
            nonce, ciphertext = payload[:12], payload[12:]
            aesgcm = AESGCM(cls._aes256_key())
            return aesgcm.decrypt(nonce, ciphertext, None).decode()
        except Exception:
            key = os.getenv("AES_KEY")
            if not key:
                raise ValueError("AES_KEY not configured")
            if isinstance(key, str):
                key = key.encode()
            fernet = Fernet(key)
            return fernet.decrypt(encrypted_nid.encode()).decode()

    def save(self, *args, **kwargs):
        if self.national_id_number and not self._state.adding:
            try:
                self.decrypt_nid(self.national_id_number)
            except Exception:
                self.national_id_number = self.encrypt_nid(self.national_id_number)
        elif self.national_id_number and self._state.adding:
            self.national_id_number = self.encrypt_nid(self.national_id_number)
        super().save(*args, **kwargs)
