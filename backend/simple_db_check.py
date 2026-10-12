import sqlite3
import os

db_path = r'c:\Users\iDesire Computer\Desktop\PMS-HU-PROJECT\backend\db.sqlite3'

result = []

result.append(f"Database path: {db_path}")
result.append(f"Database exists: {os.path.exists(db_path)}")

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # List tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = cursor.fetchall()
    result.append(f"\nTotal tables: {len(tables)}")
    result.append("Tables:")
    for table in tables:
        result.append(f"  - {table[0]}")
    
    # Check django_migrations
    result.append("\n=== Django Migrations ===")
    try:
        cursor.execute("SELECT app, name FROM django_migrations WHERE app IN ('assignments', 'audits', 'notifications', 'properties', 'users') ORDER BY app, name")
        migrations = cursor.fetchall()
        result.append(f"Migrations for target apps: {len(migrations)}")
        for app, name in migrations:
            result.append(f"  {app}.{name}")
    except Exception as e:
        result.append(f"Error: {e}")
    
    # Check users
    result.append("\n=== Users ===")
    try:
        cursor.execute("SELECT COUNT(*) FROM users_user")
        count = cursor.fetchone()[0]
        result.append(f"User count: {count}")
        
        if count > 0:
            cursor.execute("SELECT username, is_active, role FROM users_user LIMIT 5")
            users = cursor.fetchall()
            for username, is_active, role in users:
                result.append(f"  {username} (active: {is_active}, role: {role})")
        else:
            result.append("No users found - 401 error likely due to no users")
    except Exception as e:
        result.append(f"Error querying users: {e}")
    
    conn.close()

# Write to file
output_path = r'c:\Users\iDesire Computer\Desktop\PMS-HU-PROJECT\backend\simple_result.txt'
with open(output_path, 'w') as f:
    f.write('\n'.join(result))

print('Done')
