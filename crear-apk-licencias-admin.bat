@echo off
REM Genera Gosaryc-Licencias-Admin.apk (Android, SOLO superadmin) sin tienda.
REM Requiere: Node.js LTS, Java JDK 17 y Android SDK (Android Studio).
cd /d "%~dp0android-licencias"
where node >nul 2>nul
if errorlevel 1 goto sinnode
where java >nul 2>nul
if errorlevel 1 goto sinjava
if not exist "%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe" (
  echo.
  echo No encuentro el Android SDK. Instala Android Studio ^(https://developer.android.com/studio^),
  echo abrelo una vez para que descargue el SDK y vuelve a ejecutar este archivo.
  pause
  exit /b 1
)
set ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
set PATH=%ANDROID_HOME%\platform-tools;%PATH%

echo [1/5] Instalando dependencias Android...
call npm install
if errorlevel 1 goto error

echo [2/5] Creando el proyecto Android...
if not exist "android" call npx cap add android
if errorlevel 1 goto error

echo [3/5] Generando iconos (logo oficial con distintivo ADMIN)...
call npx capacitor-assets generate --iconBackgroundColor "#0b0b14" --splashBackgroundColor "#0b0b14"
if errorlevel 1 goto error

echo [4/5] Activando notificaciones...
node scripts\configurar-manifest.cjs
if errorlevel 1 goto error
call npx cap sync android
if errorlevel 1 goto error

echo [5/5] Compilando el APK (puede tardar varios minutos)...
cd android
call gradlew assembleDebug
if errorlevel 1 goto error
cd ..
copy /Y "android\app\build\outputs\apk\debug\app-debug.apk" "..\Gosaryc-Licencias-Admin.apk" >nul

echo.
echo Listo. El APK esta en la raiz del proyecto: Gosaryc-Licencias-Admin.apk
echo Instalalo SOLO en tu celular de administrador e inicia sesion con tu cuenta superadmin.
pause
exit /b 0
:sinnode
echo Necesitas instalar Node.js primero: https://nodejs.org (version LTS)
pause
exit /b 1
:sinjava
echo Necesitas Java JDK 17 primero: https://adoptium.net (Temurin 17 LTS)
pause
exit /b 1
:error
echo.
echo Ocurrio un error. Revisa los mensajes de arriba.
pause
exit /b 1
