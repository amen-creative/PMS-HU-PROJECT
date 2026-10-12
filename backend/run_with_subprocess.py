import subprocess
import sys
import os

os.chdir(r'c:\Users\iDesire Computer\Desktop\PMS-HU-PROJECT\backend')
venv_python = r'c:\Users\iDesire Computer\Desktop\PMS-HU-PROJECT\backend\venv\Scripts\python.exe'

output_file = r'c:\Users\iDesire Computer\Desktop\PMS-HU-PROJECT\backend\subprocess_output.txt'

with open(output_file, 'w') as f:
    f.write("=" * 60 + "\n")
    f.write("MAKEMIGRATIONS\n")
    f.write("=" * 60 + "\n")
    
    env = os.environ.copy()
    env['USE_MYSQL'] = 'true'
    
    result = subprocess.run(
        [venv_python, 'manage.py', 'makemigrations'],
        capture_output=True,
        text=True,
        env=env
    )
    f.write(result.stdout)
    if result.stderr:
        f.write("STDERR:\n")
        f.write(result.stderr)
    f.write(f"\nReturn code: {result.returncode}\n")
    
    f.write("\n" + "=" * 60 + "\n")
    f.write("MIGRATE\n")
    f.write("=" * 60 + "\n")
    
    result = subprocess.run(
        [venv_python, 'manage.py', 'migrate'],
        capture_output=True,
        text=True,
        env=env
    )
    f.write(result.stdout)
    if result.stderr:
        f.write("STDERR:\n")
        f.write(result.stderr)
    f.write(f"\nReturn code: {result.returncode}\n")

print(f"Output written to: {output_file}")
