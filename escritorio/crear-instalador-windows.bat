@echo off
REM Gosaryc Windows clientes: este archivo es el mismo boton que 1-CREAR-Windows-clientes.bat
REM Si estas dentro de la carpeta escritorio, haz doble clic aqui. Si estas en la principal, usa el 1-CREAR.
cd /d "%~dp0.."
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
explorer "%~dp0instaladores"
pause
