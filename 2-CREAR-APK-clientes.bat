@echo off
REM 2) APK clientes Android. Requiere Node.js + Java 17 + Android Studio (abierto una vez).
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas instalar Node.js primero: https://nodejs.org (version LTS^)
  pause
  exit /b 1
)
REM Detecta el Android SDK automaticamente (ANDROID_HOME o carpeta por defecto)
if not defined ANDROID_HOME (
  if exist "%LOCALAPPDATA%\Android\Sdk" set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
)
if defined ANDROID_HOME echo Android SDK: %ANDROID_HOME%
REM Escribe android\local.properties antes de compilar (si la carpeta ya existe)
if defined ANDROID_HOME if exist "android-app\android" (
  set "SDK_ESC=%ANDROID_HOME:\=\\%"
  setlocal enabledelayedexpansion
  >"android-app\android\local.properties" echo sdk.dir=!SDK_ESC::=\:!
  endlocal
)
node crear-instaladores.cjs apk
if errorlevel 1 (
  pause
  exit /b 1
)
explorer "%~dp0"
pause
