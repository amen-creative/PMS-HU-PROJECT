import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.core.management import call_command

# Redirect stdout to a file
with open('migration_check_output.txt', 'w') as f:
    original_stdout = sys.stdout
    sys.stdout = f
    
    try:
        print("=== Checking for new migrations ===")
        call_command('makemigrations', verbosity=2, dry_run=True)
        
        print("\n=== Migration Status ===")
        call_command('showmigrations', verbosity=1)
        
        print("\n=== Database Users ===")
        from django.contrib.auth import get_user_model
        User = get_user_model()
        print(f"Total users: {User.objects.count()}")
        for user in User.objects.all()[:5]:
            print(f"  - {user.username} (active: {user.is_active}, role: {user.role})")
    finally:
        sys.stdout = original_stdout

print("Output written to migration_check_output.txt")
