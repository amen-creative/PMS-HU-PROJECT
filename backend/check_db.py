import sqlite3
import os

db_path = r'c:\Users\iDesire Computer\Desktop\PMS-HU-PROJECT\backend\db.sqlite3'

print(f"Database path: {db_path}")
print(f"Database exists: {os.path.exists(db_path)}")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check migration status
print("\n=== Migration Status ===")
cursor.execute("SELECT app, name FROM django_migrations WHERE app IN ('assignments', 'audits', 'notifications', 'properties', 'users') ORDER BY app, name")
migrations = cursor.fetchall()
for app, name in migrations:
    print(f"{app}.{name}")

# Check users table
print("\n=== Users ===")
try:
    cursor.execute("SELECT username, is_active, role FROM users_user LIMIT 10")
    users = cursor.fetchall()
    print(f"Total users: {len(users)}")
    for user in users:
        print(f"  - {user[0]} (active: {user[1]}, role: {user[2]})")
except Exception as e:
    print(f"Error querying users: {e}")

# Check tables
print("\n=== Tables ===")
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
tables = cursor.fetchall()
for table in tables:
    print(f"  - {table[0]}")

conn.close()
