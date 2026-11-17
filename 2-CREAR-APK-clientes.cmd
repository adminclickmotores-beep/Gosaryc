@echo off
REM 2) APK clientes Android. Requiere Node.js + Java 17 + Android Studio (abierto una vez).
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas instalar Node.js primero: https://nodejs.org (version LTS^)
  pause
  exit /b 1
)
node crear-instaladores.cjs apk
if errorlevel 1 (
  pause
  exit /b 1
)
explorer "%~dp0"
pause
