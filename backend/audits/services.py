from .models import AuditLog


def log_activity(*, actor=None, action, message, property_obj=None, metadata=None):
    target_model = None
    target_id = None
    if property_obj is not None:
        target_model = property_obj.__class__.__name__
        target_id = getattr(property_obj, "pk", None)

    try:
        return AuditLog.objects.create(
            action=action,
            performed_by=actor,
            target_model=target_model,
            target_id=target_id,
            details={"message": message, **(metadata or {})},
        )
    except Exception:
        return None
