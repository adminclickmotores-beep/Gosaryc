@echo off
REM Haz doble clic en este archivo para crear el instalador de Gosaryc para Windows.
REM Funciona sin importar desde que carpeta lo abras.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto sinnode

echo [1/3] Preparando la API local de WhatsApp (agente)...
set PUPPETEER_SKIP_DOWNLOAD=true
set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
pushd ..\whatsapp-local
call npm install --omit=dev
if errorlevel 1 ( popd & goto error )
popd

echo [2/3] Instalando dependencias de escritorio (puede tardar unos minutos)...
call npm install
if errorlevel 1 goto error

REM Algunas versiones nuevas de npm bloquean el script que descarga Electron. Lo ejecutamos a mano.
if not exist "node_modules\electron\path.txt" (
  echo Descargando Electron...
  node node_modules\electron\install.js
  echo Codigo de salida: %errorlevel%
)
if not exist "node_modules\electron\path.txt" (
  echo Reintentando la descarga de Electron...
  call npm rebuild electron --foreground-scripts
)
if not exist "node_modules\electron\path.txt" (
  echo.
  echo No se pudo descargar Electron. Version de Node instalada:
  node -v
  echo Instala Node.js LTS ^(version 22 o 24^) desde https://nodejs.org, borra la carpeta node_modules y vuelve a ejecutar este archivo.
  echo Revisa tambien tu conexion a internet, antivirus o firewall: la descarga viene de github.com.
  pause
  exit /b 1
)

echo [3/3] Creando el instalador de Windows...
call npm run instalador:windows
if errorlevel 1 goto error

echo.
echo Listo. El instalador esta en la carpeta "instaladores".
explorer "%~dp0instaladores"
pause
exit /b 0
:sinnode
echo Necesitas instalar Node.js primero: https://nodejs.org (version LTS)
pause
exit /b 1
:error
echo.
echo Ocurrio un error. Revisa que Node.js este instalado (https://nodejs.org).
pause
exit /b 1
