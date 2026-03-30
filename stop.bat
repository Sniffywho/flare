@echo off
echo Stopping Flare Chat App...

echo Stopping MongoDB...
taskkill /IM mongod.exe /F 2>nul

echo Releasing port 5000 (backend)...
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr ":5000 " ^| findstr LISTENING') DO (
  taskkill /PID %%P /F 2>nul
)

echo Releasing port 5173 (frontend)...
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr ":5173 " ^| findstr LISTENING') DO (
  taskkill /PID %%P /F 2>nul
)

echo.
echo Flare stopped.
pause
