import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
os.environ['USE_MYSQL'] = 'true'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.db import connection
from django.contrib.auth import get_user_model

print(f"Database engine: {connection.settings_dict['ENGINE']}")
print(f"Database name: {connection.settings_dict['NAME']}")
print(f"Database host: {connection.settings_dict.get('HOST', 'N/A')}")
print(f"Database user: {connection.settings_dict.get('USER', 'N/A')}")

try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        print("Database connection: SUCCESS")
except Exception as e:
    print(f"Database connection: FAILED - {e}")

try:
    User = get_user_model()
    count = User.objects.count()
    print(f"User count: {count}")
    
    if count > 0:
        for user in User.objects.all()[:3]:
            print(f"  - {user.username} (active: {user.is_active})")
except Exception as e:
    print(f"Error checking users: {e}")
