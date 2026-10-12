import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.core.management import call_command
from django.db import connection
from django.db.migrations.executor import MigrationExecutor

print("=== Checking Migration Status ===")
executor = MigrationExecutor(connection)
print(f"Current migration: {executor.migration_graph.executor.current_migration}")

# Get unapplied migrations
unapplied = executor.migration_graph.executor.migration_plan(executor.loader.applied_migrations)
print(f"Unapplied migrations: {len(unapplied)}")

if unapplied:
    print("\nApplying migrations...")
    for migration in unapplied:
        print(f"  - {migration[0]}.{migration[1]}")
    
    print("\nRunning makemigrations...")
    call_command('makemigrations', verbosity=2)
    
    print("\nRunning migrate...")
    call_command('migrate', verbosity=2)
else:
    print("No unapplied migrations found.")

# Check users
print("\n=== Checking Users ===")
from django.contrib.auth import get_user_model
User = get_user_model()
user_count = User.objects.count()
print(f"Total users: {user_count}")

if user_count > 0:
    for user in User.objects.all()[:5]:
        print(f"  - {user.username} (active: {user.is_active}, role: {user.role})")
else:
    print("No users in database. Creating superuser...")
    try:
        User.objects.create_superuser('admin', 'admin@pms.hu', 'admin123')
        print("Superuser created: admin / admin123")
    except Exception as e:
        print(f"Error creating superuser: {e}")
