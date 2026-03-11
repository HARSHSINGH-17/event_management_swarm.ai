@echo off
echo ================================================
echo  Event Swarm AI - Frontend Startup
echo ================================================
echo.

cd /d "%~dp0"

if not exist node_modules (
    echo [..] Installing dependencies...
    call npm install
)

echo [OK] Dependencies ready
echo [..] Starting Vite dev server on http://localhost:5173
echo.
echo Press Ctrl+C to stop.
echo.

npm run dev
