import os
import sys
import django

# Setup Django with both possible database configurations
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Try with USE_MYSQL=true first
os.environ['USE_MYSQL'] = 'true'

try:
    django.setup()
except Exception as e:
    print(f"Error with USE_MYSQL=true: {e}")
    # Try without USE_MYSQL
    if 'USE_MYSQL' in os.environ:
        del os.environ['USE_MYSQL']
    django.setup()

from django.db import connection
from django.contrib.auth import get_user_model
from django.core.management import call_command

# Output file
output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'comprehensive_result.txt')

with open(output_path, 'w') as f:
    f.write("=== DATABASE CONFIGURATION ===\n")
    f.write(f"Engine: {connection.settings_dict['ENGINE']}\n")
    f.write(f"Name: {connection.settings_dict['NAME']}\n")
    f.write(f"Host: {connection.settings_dict.get('HOST', 'N/A')}\n")
    f.write(f"User: {connection.settings_dict.get('USER', 'N/A')}\n")
    f.write("\n")
    
    # Test connection
    f.write("=== DATABASE CONNECTION ===\n")
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            f.write("Connection: SUCCESS\n")
    except Exception as e:
        f.write(f"Connection: FAILED - {e}\n")
        f.write("\n")
        f.close()
        sys.exit(1)
    
    f.write("\n")
    
    # Check users
    f.write("=== USERS ===\n")
    try:
        User = get_user_model()
        count = User.objects.count()
        f.write(f"Total users: {count}\n")
        
        if count > 0:
            for user in User.objects.all()[:5]:
                f.write(f"  - {user.username} (active: {user.is_active}, role: {user.role})\n")
        else:
            f.write("No users found - creating admin user...\n")
            try:
                admin = User.objects.create_superuser('admin', 'admin@pms.hu', 'admin123')
                f.write("Created superuser: admin / admin123\n")
            except Exception as e:
                f.write(f"Error creating superuser: {e}\n")
    except Exception as e:
        f.write(f"Error checking users: {e}\n")
    
    f.write("\n")
    
    # Apply migrations
    f.write("=== APPLYING MIGRATIONS ===\n")
    try:
        f.write("Running makemigrations...\n")
        call_command('makemigrations', verbosity=0, stdout=f, stderr=f)
        f.write("makemigrations: DONE\n")
    except Exception as e:
        f.write(f"makemigrations: ERROR - {e}\n")
    
    try:
        f.write("Running migrate...\n")
        call_command('migrate', verbosity=0, stdout=f, stderr=f)
        f.write("migrate: DONE\n")
    except Exception as e:
        f.write(f"migrate: ERROR - {e}\n")

print(f"Results written to: {output_path}")
