@echo off
echo ========================================
echo PMS-HU Migration Fix Script (SQLite)
echo ========================================
echo.

cd /d "c:\Users\iDesire Computer\Desktop\PMS-HU-PROJECT\backend"

echo Activating virtual environment...
call venv\Scripts\activate.bat

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
echo Step 3: Creating admin user...
python CREATE_ADMIN_USER.py

echo.
echo ========================================
echo Migration fix completed!
echo ========================================
echo.
pause
