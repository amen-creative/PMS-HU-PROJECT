import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate

User = get_user_model()

print("=== Verifying Admin User ===")
admin = User.objects.get(username='admin')
print(f"Username: {admin.username}")
print(f"Is Active: {admin.is_active}")
print(f"Is Staff: {admin.is_staff}")
print(f"Is Superuser: {admin.is_superuser}")
print(f"Role: {admin.role}")
print(f"Password Hash: {admin.password[:50]}...")

print("\n=== Testing Authentication ===")
# Test with the password we set
test_user = authenticate(username='admin', password='admin123')
if test_user:
    print("SUCCESS: Authentication with 'admin123' successful")
else:
    print("FAILED: Authentication with 'admin123' failed")
    
# Try to reset the password to ensure it's correct
print("\n=== Resetting Password ===")
admin.set_password('admin123')
admin.save()
print("Password reset to 'admin123'")

# Test again
test_user = authenticate(username='admin', password='admin123')
if test_user:
    print("SUCCESS: Authentication after reset successful")
else:
    print("FAILED: Authentication after reset still failed")
