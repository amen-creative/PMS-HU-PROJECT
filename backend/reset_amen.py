import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from django.contrib.auth import get_user_model
from django.core.cache import cache

User = get_user_model()

# Clear cache for amen
cache.delete('login_failed_attempts:amen')
print("Cleared cache for amen")

# Reset amen's password
amen = User.objects.get(username='amen')
amen.set_password('amen')
amen.save()
print("Reset amen's password to 'amen'")

# Test authentication
from django.contrib.auth import authenticate
test_user = authenticate(username='amen', password='amen')
if test_user:
    print("SUCCESS: amen can now authenticate")
else:
    print("FAILED: amen still cannot authenticate")
