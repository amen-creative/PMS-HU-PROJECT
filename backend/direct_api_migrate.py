import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
os.environ['USE_MYSQL'] = 'true'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.db.migrations.autodetector import MigrationAutodetector
from django.db.migrations.state import ProjectState
from django.contrib.auth import get_user_model

print("=== DATABASE INFO ===")
print(f"Engine: {connection.settings_dict['ENGINE']}")
print(f"Name: {connection.settings_dict['NAME']}")

print("\n=== MIGRATION STATUS ===")
executor = MigrationExecutor(connection)
print(f"Current migration: {executor.migration_graph.executor.current_migration}")

# Get unapplied migrations
unapplied = []
for key in executor.loader.disk_migrations:
    if key not in executor.loader.applied_migrations:
        unapplied.append(key)

print(f"Unapplied migrations: {len(unapplied)}")
if unapplied:
    print("Unapplied:")
    for app, name in sorted(unapplied):
        print(f"  {app}.{name}")

print("\n=== USERS ===")
User = get_user_model()
try:
    count = User.objects.count()
    print(f"User count: {count}")
    
    if count == 0:
        print("Creating admin user...")
        admin = User.objects.create_superuser('admin', 'admin@pms.hu', 'admin123')
        print("Created: admin / admin123")
    else:
        for user in User.objects.all()[:3]:
            print(f"  {user.username} (active: {user.is_active}, role: {user.role})")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()

print("\n=== DONE ===")
