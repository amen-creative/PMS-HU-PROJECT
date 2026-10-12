from notifications.models import Notification


def notify_user(recipient, type_code, title, message, property_obj=None):
    if recipient is None:
        return None
    return Notification.objects.create(
        recipient=recipient,
        type=type_code,
        title=title,
        message=message,
        property=property_obj,
    )
