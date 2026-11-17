@echo off
REM 1) Windows clientes (64 y 32 bits). Doble clic y listo.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas instalar Node.js primero: https://nodejs.org (version LTS^)
  echo Instalalo con Siguiente en todo, reinicia y vuelve a hacer doble clic aqui.
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
