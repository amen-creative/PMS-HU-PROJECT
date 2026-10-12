from django.db import models
from django.utils import timezone


class Department(models.Model):
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=120, unique=True)
    code = models.CharField(max_length=20, unique=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("name",)
        db_table = "users_department"
        managed = False

    @property
    def department_id(self):
        return self.id

    @property
    def description(self):
        return ""

    def __str__(self):
        return self.name
