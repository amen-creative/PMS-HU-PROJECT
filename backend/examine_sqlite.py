import sqlite3
import os

db_path = r'c:\Users\iDesire Computer\Desktop\PMS-HU-PROJECT\backend\db.sqlite3'

print(f"Database path: {db_path}")
print(f"Exists: {os.path.exists(db_path)}")

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # List all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = cursor.fetchall()
    print(f"\nTables ({len(tables)}):")
    for table in tables:
        print(f"  {table[0]}")
    
    # Check django_migrations
    print("\n=== Django Migrations ===")
    cursor.execute("SELECT app, name FROM django_migrations ORDER BY app, name LIMIT 20")
    migrations = cursor.fetchall()
    print(f"Total migrations: {len(migrations)}")
    for app, name in migrations:
        print(f"  {app}.{name}")
    
    # Check users
    print("\n=== Users Table ===")
    try:
        cursor.execute("SELECT COUNT(*) FROM users_user")
        count = cursor.fetchone()[0]
        print(f"User count: {count}")
        
        if count > 0:
            cursor.execute("SELECT username, is_active, role FROM users_user LIMIT 5")
            users = cursor.fetchall()
            for username, is_active, role in users:
                print(f"  {username} (active: {is_active}, role: {role})")
        else:
            print("NO USERS - This is likely causing 401 errors")
            
            # Try to insert admin user directly
            print("\nAttempting to create admin user directly...")
            try:
                cursor.execute("""
                    INSERT INTO users_user (username, password, email, is_staff, is_superuser, is_active, role, full_name, date_joined)
                    VALUES ('admin', 'pbkdf2_sha256$260000$random_hash_for_admin123', 'admin@pms.hu', 1, 1, 1, 'ADMIN', 'Administrator', datetime('now'))
                """)
                conn.commit()
                print("Admin user inserted (password will need to be reset)")
            except Exception as e:
                print(f"Failed to insert user: {e}")
    except sqlite3.OperationalError as e:
        print(f"Error: {e} - users table may not exist")
    
    conn.close()
else:
    print("Database does not exist - need to run migrations first")
