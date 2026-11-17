@echo off
REM 5) Paquete Tienda Windows 11 (.appx, opcional).
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas instalar Node.js primero: https://nodejs.org (version LTS^)
  pause
  exit /b 1
)
node crear-instaladores.cjs tienda
if errorlevel 1 (
  pause
  exit /b 1
)
explorer "%~dp0escritorio\instaladores"
pause
