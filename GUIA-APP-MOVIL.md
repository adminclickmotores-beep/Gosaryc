# Crear la app para Android (APK) y iPhone

La app móvil es un envoltorio (Capacitor) que abre https://gosaryc.lovable.app. Así, cada
cambio que se publica en la web se ve en la app sin volver a generarla. La configuración ya
está en `capacitor.config.json`.

## Android (APK) - en tu computador con Windows, Mac o Linux

1. Instala Node.js y Android Studio.
2. Descarga este proyecto y, dentro de la carpeta, ejecuta:
   ```
   mkdir www
   echo "<!doctype html><title>Gosaryc</title>" > www/index.html
   npm install @capacitor/core @capacitor/cli @capacitor/android
   npx cap add android
   npx cap sync android
   npx cap open android
   ```
3. En Android Studio: Build > Build Bundle(s) / APK(s) > Build APK(s).
4. El archivo queda en `android/app/build/outputs/apk/debug/app-debug.apk`. Pásalo al
   celular e instálalo (permite "instalar apps de orígenes desconocidos").
5. Para publicar en Play Store necesitas firmar un "App Bundle" (Build > Generate Signed Bundle) y una cuenta de Google Play (pago único de 25 USD).

## iPhone (IPA)

Apple solo permite compilar desde un Mac con Xcode y una cuenta Apple Developer (99 USD al año).

```
npm install @capacitor/ios
npx cap add ios
npx cap sync ios
npx cap open ios
```
Luego en Xcode: elige tu equipo de desarrollo, conecta el iPhone y pulsa Run, o usa
Product > Archive para subirla a TestFlight / App Store.

## Sin pagar nada

La web ya se instala como app desde el navegador (pantalla /instalar): en Android con
Chrome > "Instalar aplicación" y en iPhone con Safari > Compartir > "Agregar a pantalla de inicio".
