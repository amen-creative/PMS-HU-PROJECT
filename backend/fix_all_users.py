import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate

User = get_user_model()

print("=== Testing Authentication for All Users ===\n")

# Common default passwords to try
default_passwords = ['password', '123456', 'admin123']

users = User.objects.all()
fixed_count = 0
tested_count = 0

for user in users:
    tested_count += 1
    print(f"Testing user: {user.username} (Role: {user.role})")
    
    # Try to authenticate with common passwords
    auth_success = False
    passwords_to_try = default_passwords + [user.username]
    
    for pwd in passwords_to_try:
        test_user = authenticate(username=user.username, password=pwd)
        if test_user:
            print(f"  SUCCESS: Can authenticate with password '{pwd}'")
            auth_success = True
            break
    
    if not auth_success:
        print(f"  FAILED: Cannot authenticate with common passwords")
        print(f"  Setting password to username for user...")
        user.set_password(user.username)
        user.save()
        print(f"  Password reset to: {user.username}")
        fixed_count += 1
    print()

print(f"\n=== Summary ===")
print(f"Total users tested: {tested_count}")
print(f"Users fixed: {fixed_count}")
print(f"Users already working: {tested_count - fixed_count}")
