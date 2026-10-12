import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
os.environ['USE_MYSQL'] = 'true'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

print("Checking for existing admin user...")
admin_exists = User.objects.filter(username='admin').exists()

if admin_exists:
    print("Admin user already exists.")
    admin = User.objects.get(username='admin')
    print(f"Username: {admin.username}")
    print(f"Active: {admin.is_active}")
    print(f"Role: {admin.role}")
else:
    print("Creating admin user...")
    try:
        admin = User.objects.create_superuser('admin', 'admin@pms.hu', 'admin123')
        print("Admin user created successfully!")
        print("Username: admin")
        print("Password: admin123")
    except Exception as e:
        print(f"Error creating admin: {e}")
        # Try with regular user
        try:
            admin = User.objects.create_user('admin', 'admin@pms.hu', 'admin123')
            admin.is_staff = True
            admin.is_superuser = True
            admin.role = 'ADMIN'
            admin.save()
            print("Admin user created as regular user with superuser privileges!")
            print("Username: admin")
            print("Password: admin123")
        except Exception as e2:
            print(f"Error creating admin as regular user: {e2}")

print("\nAll users in database:")
for user in User.objects.all():
    print(f"  - {user.username} (active: {user.is_active}, role: {user.role})")
