import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from properties.models import Property
from rest_framework.test import APIClient
from users.models import User

# Get first property and user
prop = Property.objects.first()
user = User.objects.filter(role='ADMIN').first()
print(f'Testing property: {prop.title}, Code: {prop.property_code}')
print(f'User: {user.username}')

# Create test client
client = APIClient()
client.force_authenticate(user=user)

# Test verification
response = client.post('/api/properties/verify/', {'property_code': str(prop.property_code)}, format='json')
print(f'Status: {response.status_code}')
print(f'Response keys: {list(response.data.keys()) if hasattr(response, "data") else "No data"}')
if hasattr(response, 'data') and 'property' in response.data:
    print(f'Property title: {response.data["property"]["title"]}')
    print(f'Status: {response.data.get("status")}')
    print('API test successful!')
else:
    print('API test failed - no property data in response')
    print(f'Full response: {response.data}')