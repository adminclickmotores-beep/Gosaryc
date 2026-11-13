@echo off
REM Haz doble clic en este archivo para crear el instalador de Mesari para Windows.
REM Funciona sin importar desde que carpeta lo abras.
cd /d "%~dp0"
echo Instalando dependencias (puede tardar unos minutos)...
call npm install
if errorlevel 1 goto error
echo Creando el instalador de Windows...
call npm run instalador:windows
if errorlevel 1 goto error
echo.
echo Listo. El instalador esta en la carpeta "instaladores".
explorer "%~dp0instaladores"
pause
exit /b 0
:error
echo.
echo Ocurrio un error. Revisa que Node.js este instalado (https://nodejs.org).
pause
exit /b 1
