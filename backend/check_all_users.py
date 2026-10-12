import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate

User = get_user_model()

print("=== All Users in Database ===")
users = User.objects.all()
print(f"Total users: {users.count()}\n")

for user in users:
    print(f"Username: {user.username}")
    print(f"  Email: {user.email or 'N/A'}")
    print(f"  Role: {user.role}")
    print(f"  Is Active: {user.is_active}")
    print(f"  Is Staff: {user.is_staff}")
    print(f"  Is Superuser: {user.is_superuser}")
    print(f"  Password Hash: {user.password[:60]}...")
    print()
