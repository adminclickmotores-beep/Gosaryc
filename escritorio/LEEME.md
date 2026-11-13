# Gosaly de escritorio

Esta carpeta genera los instaladores de Gosaly para Windows, Mac y Linux.
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
Antes, publica la web (botón "Publish") o define `GOSALY_URL` con tu dirección.

## Tu firma (código firmado)

Sin firma el instalador funciona, pero Windows y Mac muestran "editor desconocido".
Para que salga a nombre de Gosaly, compra el certificado y pásalo con variables de entorno
al generar el instalador:

- Windows: `CSC_LINK` (ruta al .pfx) y `CSC_KEY_PASSWORD`.
- Mac: cuenta Apple Developer (99 USD/año), `CSC_LINK`, `CSC_KEY_PASSWORD`,
  `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`.
- Linux: no requiere firma.

El nombre del editor ya está configurado como "Gosaly".
Para cambiar el icono, agrega `build/icon.ico` (Windows), `build/icon.icns` (Mac)
y `build/icon.png` (Linux, 512x512).
