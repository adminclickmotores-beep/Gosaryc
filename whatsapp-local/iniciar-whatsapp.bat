@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas instalar Node.js primero: https://nodejs.org
  pause
  exit /b
)
if not exist node_modules (
  echo Instalando por primera vez, espera unos minutos...
  call npm install
)
node server.js
pause
