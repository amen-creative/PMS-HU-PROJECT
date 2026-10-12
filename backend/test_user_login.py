import urllib.request
import json

# Test a few users
test_users = [
    {'username': 'amen', 'password': 'amen'},
    {'username': 'ezra', 'password': 'ezra'},
    {'username': 'ebisa', 'password': 'ebisa'}
]

url = "http://127.0.0.1:8000/api/auth/login/"

print("=== Testing Login for Fixed Users ===\n")

for user in test_users:
    try:
        json_data = json.dumps(user).encode('utf-8')
        req = urllib.request.Request(url, data=json_data, headers={'Content-Type': 'application/json'})
        
        with urllib.request.urlopen(req) as response:
            status_code = response.getcode()
            response_text = response.read().decode('utf-8')
            
            print(f"User: {user['username']}")
            print(f"  Status Code: {status_code}")
            
            if status_code == 200:
                result = json.loads(response_text)
                print(f"  SUCCESS: Login successful")
                print(f"  Role: {result.get('role')}")
            else:
                print(f"  FAILED: Login failed")
            print()
    except Exception as e:
        print(f"User: {user['username']}")
        print(f"  Error: {e}")
        print()
