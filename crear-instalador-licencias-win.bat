@echo off
REM Crea el instalador de Gosaryc Licencias Admin para Windows (64 y 32 bits, SOLO superadmin).
REM Funciona sin importar desde que carpeta lo abras.
cd /d "%~dp0generador-licencias"
where node >nul 2>nul
if errorlevel 1 goto sinnode

echo [1/3] Copiando el logo oficial...
if not exist "build" mkdir build
copy /Y "..\escritorio\build\icon.png" "build\icon.png" >nul
if errorlevel 1 (
  echo No encontre el logo en escritorio\build\icon.png.
  echo Ejecuta primero crear-instalador-windows.bat (genera el icono) y vuelve aqui.
  pause
  exit /b 1
)

echo [2/3] Instalando dependencias (puede tardar unos minutos)...
call npm install
if errorlevel 1 goto error

if not exist "node_modules\electron\path.txt" (
  echo Descargando Electron...
  node node_modules\electron\install.js
)
if not exist "node_modules\electron\path.txt" (
  echo No se pudo descargar Electron. Instala Node.js LTS ^(version 22 o 24^) desde https://nodejs.org,
  echo revisa tu conexion a internet, antivirus o firewall (la descarga viene de github.com).
  pause
  exit /b 1
)

echo [3/3] Creando los instaladores (64 y 32 bits)...
call npm run instalador:windows
if errorlevel 1 goto error

echo.
echo Listo. Los instaladores estan en "generador-licencias\instaladores":
echo   Gosaryc-Licencias-Admin-x64.exe (64 bits) y Gosaryc-Licencias-Admin-ia32.exe (32 bits).
echo Esta app es SOLO para el administrador: no la compartas con clientes.
explorer "%~dp0generador-licencias\instaladores"
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
