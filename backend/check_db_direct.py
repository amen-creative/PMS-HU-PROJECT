import sqlite3
import os

db_path = r'c:\Users\iDesire Computer\Desktop\PMS-HU-PROJECT\backend\db.sqlite3'

print(f"Database exists: {os.path.exists(db_path)}")
print(f"Database path: {db_path}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check django_migrations table
print("\n=== Django Migrations Table ===")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='django_migrations'")
result = cursor.fetchone()
if result:
    print("django_migrations table exists")
    cursor.execute("SELECT app, name FROM django_migrations WHERE app IN ('assignments', 'audits', 'notifications', 'properties', 'users') ORDER BY app, name")
    migrations = cursor.fetchall()
    print(f"\nApplied migrations for target apps:")
    for app, name in migrations:
        print(f"  {app}.{name}")
else:
    print("django_migrations table does not exist")

# Check users table
print("\n=== Users Table ===")
try:
    cursor.execute("SELECT COUNT(*) FROM users_user")
    count = cursor.fetchone()[0]
    print(f"Total users: {count}")
    
    if count > 0:
        cursor.execute("SELECT username, is_active, role FROM users_user LIMIT 5")
        users = cursor.fetchall()
        print("\nSample users:")
        for username, is_active, role in users:
            print(f"  {username} (active: {is_active}, role: {role})")
    else:
        print("No users found - this might be causing 401 errors")
except sqlite3.OperationalError as e:
    print(f"Error querying users table: {e}")
    print("Users table might not exist yet")

# List all tables
print("\n=== All Tables ===")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = cursor.fetchall()
for table in tables:
    print(f"  {table[0]}")

conn.close()
