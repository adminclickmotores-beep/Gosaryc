@echo off
REM Doble clic para crear el instalador de "Gosaryc Licencias" (generador de licencias) para Windows.
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 goto sinnode

echo [1/2] Instalando dependencias (puede tardar unos minutos)...
call npm install
if errorlevel 1 goto error

if not exist "node_modules\electron\path.txt" (
  echo Descargando Electron...
  node node_modules\electron\install.js
)
if not exist "node_modules\electron\path.txt" (
  call npm rebuild electron --foreground-scripts
)
if not exist "node_modules\electron\path.txt" (
  set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
  node node_modules\electron\install.js
)
if not exist "node_modules\electron\path.txt" (
  echo No se pudo descargar Electron. Instala Node.js LTS ^(version 22 o 24^) desde https://nodejs.org, borra la carpeta node_modules y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)

echo [2/2] Creando el instalador de Windows...
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
