import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from notifications.models import Notification
from users.models import User

# Create some test notifications
users = User.objects.all()
if users.exists():
    admin_user = users.filter(role='ADMIN').first() or users.first()
    
    # Create test notifications
    notifications_data = [
        {
            'recipient': admin_user,
            'type': 'SYSTEM',
            'title': 'Welcome to PMS',
            'message': 'Your Property Management System is now active.',
            'is_read': False
        },
        {
            'recipient': admin_user,
            'type': 'APPROVAL',
            'title': 'Pending Approvals',
            'message': 'You have 3 transfer requests waiting for approval.',
            'is_read': False
        },
        {
            'recipient': admin_user,
            'type': 'SECURITY_ALERT',
            'title': 'Security Alert',
            'message': 'Unusual login attempt detected from unknown IP.',
            'is_read': True
        }
    ]
    
    for data in notifications_data:
        Notification.objects.get_or_create(
            recipient=data['recipient'],
            type=data['type'],
            title=data['title'],
            defaults=data
        )
    
    print("Test notifications created successfully!")
else:
    print("No users found in database.")