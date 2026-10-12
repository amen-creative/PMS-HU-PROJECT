from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Assignment


@receiver(post_save, sender=Assignment)
def assignment_post_save(sender, instance, created, **kwargs):
    # Assignment side effects are handled explicitly in the API views.
    return None
