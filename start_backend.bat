@echo off
echo ================================================
echo  Event Swarm AI - Backend Startup
echo ================================================
echo.

cd /d "%~dp0backend"

REM Check if venv exists
if not exist venv\Scripts\python.exe (
    echo [ERROR] Virtual environment not found. Run: python -m venv venv
    echo         Then: venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

echo [OK] Virtual environment found
echo [..] Starting FastAPI server on http://localhost:8000
echo.
echo  Endpoints:
echo    API Docs:  http://localhost:8000/docs
echo    Swarm Run: POST http://localhost:8000/api/swarm/run
echo    Auth:      POST http://localhost:8000/api/auth/login
echo.
echo  Demo Login: demo@eventswarm.ai / demo123
echo.
echo Press Ctrl+C to stop the server.
echo.

venv\Scripts\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
