from django.db import models
from django.conf import settings
from django.utils import timezone


class StudentDevice(models.Model):
    VERIFICATION_STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Verified', 'Verified'),
        ('Rejected', 'Rejected'),
    )

    student_device_id = models.AutoField(primary_key=True)
    student = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='student_devices',
        limit_choices_to={'role': 'STUDENT'}
    )
    student_id_number = models.CharField(max_length=50)
    department = models.ForeignKey(
        'departments.Department',
        on_delete=models.SET_NULL,
        null=True,
        related_name='student_devices'
    )
    year_of_study = models.IntegerField()
    photo_url = models.ImageField(upload_to='student_photos/')
    pc_image_url = models.ImageField(upload_to='student_pc_images/')
    serial_number_submitted = models.CharField(max_length=100)
    verification_status = models.CharField(
        max_length=20,
        choices=VERIFICATION_STATUS_CHOICES,
        default='Pending'
    )
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_devices'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)
    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ('-submitted_at',)

    def __str__(self):
        return f'{self.student.username} - {self.serial_number_submitted}'
