@echo off
echo ========================================
echo PMS-HU Migration Fix Script
echo ========================================
echo.

cd /d "c:\Users\iDesire Computer\Desktop\PMS-HU-PROJECT\backend"

echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Setting USE_MYSQL=true...
set USE_MYSQL=true

echo.
echo Step 1: Running makemigrations...
python manage.py makemigrations
if %errorlevel% neq 0 (
    echo ERROR: makemigrations failed
    pause
    exit /b 1
)

echo.
echo Step 2: Running migrate...
python manage.py migrate
if %errorlevel% neq 0 (
    echo ERROR: migrate failed
    pause
    exit /b 1
)

echo.
echo Step 3: Checking users...
python -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings'); os.environ['USE_MYSQL']='true'; django.setup(); from django.contrib.auth import get_user_model; User = get_user_model(); count = User.objects.count(); print(f'User count: {count}'); [print(f'  - {u.username} (active: {u.is_active})') for u in User.objects.all()[:5]]"

echo.
echo ========================================
echo Migration fix completed!
echo ========================================
echo.
echo If you still get 401 errors, try:
echo   Username: admin
echo   Password: admin123
echo.
pause
