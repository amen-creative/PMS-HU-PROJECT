import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
os.environ['USE_MYSQL'] = 'true'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.core.management import call_command
from django.db.migrations.executor import MigrationExecutor
from django.db import connection
from django.contrib.auth import get_user_model

output = []

# Check migration status
output.append("=== MIGRATION STATUS ===")
executor = MigrationExecutor(connection)
applied_count = len(executor.loader.applied_migrations)
output.append(f"Applied migrations: {applied_count}")

# Get unapplied migrations
unapplied = []
for key in executor.loader.disk_migrations:
    if key not in executor.loader.applied_migrations:
        unapplied.append(key)

output.append(f"Unapplied migrations: {len(unapplied)}")
if unapplied:
    output.append("Unapplied migrations:")
    for app, name in sorted(unapplied):
        output.append(f"  - {app}.{name}")

# Check users
output.append("\n=== USERS ===")
User = get_user_model()
try:
    user_count = User.objects.count()
    output.append(f"Total users: {user_count}")
    if user_count > 0:
        for user in User.objects.all()[:5]:
            output.append(f"  - {user.username} (active: {user.is_active}, role: {user.role})")
    else:
        output.append("No users found - creating admin user...")
        try:
            admin = User.objects.create_superuser('admin', 'admin@pms.hu', 'admin123')
            output.append("Created superuser: admin / admin123")
        except Exception as e:
            output.append(f"Error creating superuser: {e}")
except Exception as e:
    output.append(f"Error checking users: {e}")

# Apply migrations if needed
if unapplied:
    output.append("\n=== APPLYING MIGRATIONS ===")
    try:
        call_command('makemigrations', verbosity=0)
        output.append("makemigrations completed")
        call_command('migrate', verbosity=0)
        output.append("migrate completed")
    except Exception as e:
        output.append(f"Error applying migrations: {e}")
else:
    output.append("\nNo migrations to apply")

# Write output to file
output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fix_result.txt')
with open(output_path, 'w') as f:
    f.write('\n'.join(output))

print("Script completed. Results written to fix_result.txt")
