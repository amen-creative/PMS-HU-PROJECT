@echo off
title PMS-HU - Start Both Servers
echo ============================================================
echo   PMS-HU Property Management System
echo   Starting Backend + Frontend
echo ============================================================
echo.

set "PROJECT=C:\Users\iDesire Computer\Desktop\PMS-HU-PROJECT"

if not exist "%PROJECT%\backend\manage.py" (
    echo [ERROR] Project not found. Run SETUP_PROJECT.bat first!
    pause
    exit /b 1
)

:: Check if venv is valid (moved venvs break due to hardcoded paths)
if not exist "%PROJECT%\backend\venv\Scripts\python.exe" (
    echo [FIX] Recreating virtual environment...
    cd /d "%PROJECT%\backend"
    rmdir /s /q venv 2>nul
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
    echo       venv recreated and dependencies installed.
    echo.
)

:: Use MySQL via PyMySQL shim (data is in phpMyAdmin)
set USE_MYSQL=true

:: Start Django backend in a new window
echo [1/2] Starting Django backend on http://127.0.0.1:8000 ...
start "PMS-HU Backend (Django)" cmd /k "set USE_MYSQL=true && cd /d %PROJECT%\backend && call venv\Scripts\activate.bat && python manage.py migrate && python manage.py runserver 127.0.0.1:8000"

:: Wait a moment for backend to start
timeout /t 3 /nobreak >nul

:: Start React frontend in a new window
echo [2/2] Starting React frontend on http://localhost:3000 ...
start "PMS-HU Frontend (React)" cmd /k "cd /d %PROJECT%\frontend && npm start"

echo.
echo ============================================================
echo   Both servers are starting!
echo.
echo   Backend:  http://127.0.0.1:8000
echo   Frontend: http://localhost:3000
echo.
echo   Close the server windows to stop them.
echo ============================================================
echo.
timeout /t 5 /nobreak >nul
