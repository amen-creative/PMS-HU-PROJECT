import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.contrib.auth import get_user_model
from django.contrib.auth import authenticate
from django.contrib.auth.hashers import check_password, make_password

User = get_user_model()

amen = User.objects.get(username='amen')
print(f"=== AMEN USER DEBUG ===")
print(f"Username: {amen.username}")
print(f"Is Active: {amen.is_active}")
print(f"Password Hash: {amen.password}")
print(f"Password Hash Length: {len(amen.password)}")

# Test with make_password
test_hash = make_password('amen')
print(f"\nNew hash for 'amen': {test_hash}")
print(f"New hash length: {len(test_hash)}")

# Check if current password matches
match = check_password('amen', amen.password)
print(f"\nDoes 'amen' match current hash: {match}")

# Update with new hash
amen.password = test_hash
amen.save()
print("\nUpdated amen's password with new hash")

# Test again
test_user = authenticate(username='amen', password='amen')
print(f"Authentication after manual hash update: {'SUCCESS' if test_user else 'FAILED'}")

# Try creating a test user
print("\n=== CREATING TEST USER ===")
try:
    test_user = User.objects.create_user('testuser', 'test@test.com', 'testuser')
    test_user.role = 'STAFF'
    test_user.save()
    print("Created testuser with password 'testuser'")
    
    # Test authentication
    auth_test = authenticate(username='testuser', password='testuser')
    print(f"Test user authentication: {'SUCCESS' if auth_test else 'FAILED'}")
except Exception as e:
    print(f"Error creating test user: {e}")
