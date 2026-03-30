@echo off
SET PROJECT_DIR=%~dp0
SET BACKEND_DIR=%PROJECT_DIR%backend
SET FRONTEND_DIR=%PROJECT_DIR%frontend

echo Starting Flare Chat App...

echo [1/3] Starting MongoDB...
start "MongoDB" mongod --dbpath "C:/data/db"
timeout /t 2 /nobreak >nul

echo [2/3] Starting Backend (port 5000)...
start "Backend" cmd /k "cd /d "%BACKEND_DIR%" && node server.js"
timeout /t 2 /nobreak >nul

echo [3/3] Starting Frontend (port 5173)...
start "Frontend" cmd /k "cd /d "%FRONTEND_DIR%" && npm run dev"

echo.
echo Flare is running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:5000
echo.
echo Run stop.bat to shut everything down.
