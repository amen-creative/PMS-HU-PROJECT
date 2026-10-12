import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Set USE_MYSQL if needed
os.environ['USE_MYSQL'] = 'true'

django.setup()

from django.core.management import call_command
from io import StringIO

# Create a file to capture all output
log_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'migration_log.txt')

with open(log_file, 'w') as f:
    # Redirect stdout
    original_stdout = sys.stdout
    sys.stdout = f
    
    try:
        print("=" * 60)
        print("MAKEMIGRATIONS")
        print("=" * 60)
        call_command('makemigrations', verbosity=3)
        
        print("\n" + "=" * 60)
        print("MIGRATE")
        print("=" * 60)
        call_command('migrate', verbosity=3)
        
        print("\n" + "=" * 60)
        print("SHOWMIGRATIONS")
        print("=" * 60)
        call_command('showmigrations', verbosity=2)
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
    finally:
        sys.stdout = original_stdout

print(f"Migration log written to: {log_file}")

# Also print the file content
with open(log_file, 'r') as f:
    content = f.read()
    print("\n" + "=" * 60)
    print("MIGRATION LOG CONTENT:")
    print("=" * 60)
    print(content)
