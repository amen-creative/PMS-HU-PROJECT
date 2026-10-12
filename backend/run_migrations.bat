@echo off
cd /d "c:\Users\iDesire Computer\Desktop\PMS-HU-PROJECT\backend"
call venv\Scripts\activate.bat
set USE_MYSQL=true
echo Running makemigrations...
python manage.py makemigrations
echo.
echo Running migrate...
python manage.py migrate
echo.
echo Done.
pause
