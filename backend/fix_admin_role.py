import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

admin = User.objects.get(username='admin')
admin.role = 'ADMIN'
admin.is_staff = True
admin.is_superuser = True
admin.save()

print(f"Updated admin user:")
print(f"  Username: {admin.username}")
print(f"  Role: {admin.role}")
print(f"  Is Staff: {admin.is_staff}")
print(f"  Is Superuser: {admin.is_superuser}")
