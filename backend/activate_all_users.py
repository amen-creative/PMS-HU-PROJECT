import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.contrib.auth import get_user_model
from django.core.cache import cache

User = get_user_model()

print("=== Activating All Inactive Users ===\n")

users = User.objects.filter(is_active=False)
print(f"Found {users.count()} inactive users")

for user in users:
    user.is_active = True
    user.save()
    print(f"Activated: {user.username}")
    
    # Clear any failed login attempts from cache
    cache.delete(f'login_failed_attempts:{user.username}')

print("\n=== Summary ===")
print(f"Total activated: {users.count()}")

# Test amen authentication
from django.contrib.auth import authenticate
amen_auth = authenticate(username='amen', password='amen')
print(f"\nAmen authentication test: {'SUCCESS' if amen_auth else 'FAILED'}")
