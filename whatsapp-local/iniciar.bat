@echo off
cd /d "%~dp0"
echo Iniciando la API de WhatsApp local...
if not exist node_modules (
  echo Instalando lo necesario, solo la primera vez...
  call npm install
)
node server.js
pause
