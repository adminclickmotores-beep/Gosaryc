# Gosaryc de escritorio

Esta carpeta genera los instaladores de Gosaryc para Windows, Mac y Linux.
Es independiente de la web: no afecta a la app publicada.

## Generar instaladores (en tu computadora)

```
cd escritorio
npm install
npm run iniciar              # probar la ventana
npm run instalador:windows   # .exe  (hazlo en Windows)
npm run instalador:mac       # .dmg  (hazlo en una Mac)
npm run instalador:linux     # .AppImage y .deb (hazlo en Linux)
```

Los archivos salen en `escritorio/instaladores/`.
Antes, publica la web (botón "Publish") o define `GOSARYC_URL` con tu dirección.

## Crear el .exe paso a paso (Windows)

1. Instala Node.js desde https://nodejs.org (versión LTS).
2. Abre la carpeta `escritorio` y haz doble clic en `crear-instalador-windows.bat`.
3. Al terminar se abre la carpeta `instaladores` con `Gosaryc Setup 1.0.0.exe`.

La app abre https://gosaryc.lovable.app. Cada vez que publiques cambios en la web,
los usuarios los ven al abrir el programa, sin reinstalar. Si no hay internet muestra un aviso con botón "Reintentar".
Al abrirse por primera vez pide el código de licencia (se crean en la pantalla de Licencias).

## Tu firma (código firmado)

Sin firma el instalador funciona, pero Windows y Mac muestran "editor desconocido".
Para que salga a nombre de Gosaryc, compra el certificado y pásalo con variables de entorno
al generar el instalador:

- Windows: `CSC_LINK` (ruta al .pfx) y `CSC_KEY_PASSWORD`.
- Mac: cuenta Apple Developer (99 USD/año), `CSC_LINK`, `CSC_KEY_PASSWORD`,
  `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.
- Linux: no requiere firma.

El nombre del editor ya está configurado como "Gosaryc".
Para cambiar el icono, agrega `build/icon.ico` (Windows), `build/icon.icns` (Mac)
y `build/icon.png` (Linux, 512x512).
