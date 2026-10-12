import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    django.setup()
    from django.core.management import call_command
    from django.contrib.auth import get_user_model
    from django.db import connection

    # Open file for writing
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'debug_output.txt')
    with open(output_path, 'w') as f:
        # Write migration info
        f.write("=== MIGRATION STATUS ===\n")
        
        # Check if there are unapplied migrations
        from django.db.migrations.loader import MigrationLoader
        loader = MigrationLoader(connection)
        
        # Get applied migrations
        applied = loader.applied_migrations
        f.write(f"Applied migrations count: {len(applied)}\n")
        
        # Check for unapplied migrations
        unapplied = set(loader.disk_migrations.keys()) - applied
        f.write(f"Unapplied migrations count: {len(unapplied)}\n")
        
        if unapplied:
            f.write("\nUnapplied migrations:\n")
            for app, name in sorted(unapplied):
                f.write(f"  - {app}.{name}\n")
        else:
            f.write("\nNo unapplied migrations found.\n")
        
        # Check users
        f.write("\n=== USERS ===\n")
        User = get_user_model()
        user_count = User.objects.count()
        f.write(f"Total users: {user_count}\n")
        
        if user_count > 0:
            for user in User.objects.all()[:10]:
                f.write(f"  - Username: {user.username}, Active: {user.is_active}, Role: {user.role}\n")
        else:
            f.write("No users found in database.\n")
        
        f.write("\n=== DATABASE INFO ===\n")
        f.write(f"Database engine: {connection.settings_dict['ENGINE']}\n")
        f.write(f"Database name: {connection.settings_dict['NAME']}\n")

    print("Script completed. Check debug_output.txt")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
