@echo off
REM 4) APK Licencias Admin (SOLO superadmin). Requiere Node.js + Java 17 + Android Studio.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas instalar Node.js primero: https://nodejs.org (version LTS^)
  pause
  exit /b 1
)
node crear-instaladores.cjs apk-licencias
if errorlevel 1 (
  pause
  exit /b 1
)
explorer "%~dp0"
pause
