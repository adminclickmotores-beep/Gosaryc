@echo off
REM Doble clic: crea los instaladores de Windows (64 y 32 bits). Requiere Node.js LTS.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas instalar Node.js primero: https://nodejs.org ^(version LTS^)
  pause
  exit /b 1
)
node crear-instaladores.cjs windows
if errorlevel 1 (
  pause
  exit /b 1
)
explorer "%~dp0escritorio\instaladores"
pause
