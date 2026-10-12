@echo off
cd /d "c:\Users\iDesire Computer\Desktop\PMS-HU-PROJECT\backend"
call venv\Scripts\activate.bat
venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
