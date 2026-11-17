@echo off
REM Doble clic: crea el instalador de Licencias Admin (solo administrador, 64 y 32 bits).
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas instalar Node.js primero: https://nodejs.org ^(version LTS^)
  pause
  exit /b 1
)
node crear-instaladores.cjs licencias
if errorlevel 1 (
  pause
  exit /b 1
)
explorer "%~dp0generador-licencias\instaladores"
pause
