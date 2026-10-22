@echo off
echo Starting Intelligent DBMS Studio (Backend + Frontend)...
start "DBMS Backend" cmd /k "cd /d %~dp0backend && npm run dev"
timeout /t 2 /nobreak >nul
start "DBMS Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo Backend running on http://localhost:5000
echo Frontend running on http://localhost:5173
