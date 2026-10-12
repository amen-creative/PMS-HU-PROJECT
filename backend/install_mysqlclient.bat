@echo off
cd /d "c:\Users\iDesire Computer\Desktop\PMS-HU-PROJECT\backend"
call venv\Scripts\activate.bat
echo Installing mysqlclient...
pip install mysqlclient
echo.
echo mysqlclient installed successfully!
pause
