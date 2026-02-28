@echo off
REM HAVOC — Start both backend and frontend servers
REM Usage: start.bat

setlocal enabledelayedexpansion

set PROJECT_ROOT=%~dp0
cd /d "%PROJECT_ROOT%"

echo.
echo ==================================================================================
echo   HAVOC - Starting Backend ^& Frontend
echo ==================================================================================
echo.

REM Start backend
echo [1/2] Starting Backend (FastAPI on http://127.0.0.1:8000)...
start "HAVOC Backend" python -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
if errorlevel 1 (
    echo Error starting backend
    exit /b 1
)
echo   ✓ Backend started
timeout /t 2 /nobreak

REM Start frontend
echo.
echo [2/2] Starting Frontend (Vite on http://localhost:3002)...
cd /d "%PROJECT_ROOT%phrolva"
start "HAVOC Frontend" npm run dev
if errorlevel 1 (
    echo Error starting frontend
    cd /d "%PROJECT_ROOT%"
    exit /b 1
)
echo   ✓ Frontend started

echo.
echo ==================================================================================
echo   HAVOC is running!
echo.
echo   Backend:  http://127.0.0.1:8000/api/health
echo   Frontend: http://localhost:3002
echo.
echo   Close the command windows to stop the servers
echo ==================================================================================
echo.

cd /d "%PROJECT_ROOT%"
pause
