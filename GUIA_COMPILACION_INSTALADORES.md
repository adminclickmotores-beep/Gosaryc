# Guía de compilación de instaladores de Gosaryc

Requisito común: Node.js LTS 22 o 24 e internet. Todos los comandos se ejecutan en la carpeta principal del proyecto.

## 1. Escritorio (Electron)

| Instalador | Comando | Resultado |
|---|---|---|
| Windows 8, 10 y 11 (64 y 32 bits, NSIS) | `node crear-instaladores.cjs windows` | `escritorio/instaladores/Gosaryc-Setup-x64.exe` y `Gosaryc-Setup-ia32.exe` |
| Windows 11 (Tienda, .appx) | `node crear-instaladores.cjs tienda` | `escritorio/instaladores` |
| Linux (AppImage y .deb, x64) | `node crear-instaladores.cjs linux` | `escritorio/instaladores` |
| Licencias Admin (Gosaryc-Licencias-Admin, solo administrador) | `node crear-instaladores.cjs licencias` | `generador-licencias/instaladores` |

- Windows: también puedes hacer doble clic en los `.bat` numerados de la carpeta principal.
- Linux: `chmod +x crear-instalador-linux.sh && ./crear-instalador-linux.sh`.
- El programa queda en la bandeja del sistema al cerrar la ventana, para que el agente de WhatsApp local siga activo.
- El instalador de Licencias Admin abre directo en el panel de licencias.

## 2. Android (Capacitor, Android 14 / API 34 en adelante)

Configuración aplicada automáticamente: `minSdkVersion = 24`, `targetSdkVersion = 34`, permisos de internet/red, cámara (escáner de códigos de barras) y almacenamiento.

| App | APK directo | Abrir en Android Studio |
|---|---|---|
| Gosaryc POS (clientes) | `node crear-instaladores.cjs apk` → `Gosaryc.apk` | `node crear-instaladores.cjs android-studio` |
| Gosaryc Licencias Admin | `node crear-instaladores.cjs apk-licencias` → `Gosaryc-Licencias-Admin.apk` | `node crear-instaladores.cjs android-studio-licencias` |

Requiere Android Studio instalado y abierto al menos una vez (descarga el SDK). En Android Studio: Build → Build Bundle(s) / APK(s) → Build APK(s).

## 3. Compilación en la nube

El flujo `.github/workflows/compilar-todo.yml` genera Windows, Linux y Android desde GitHub (pestaña Actions → Run workflow).

## 4. Actualizaciones automáticas con aviso

1. Para publicar una mejora, sube el número en `public/version.json` (campo `version`) y en `escritorio/package.json`.
2. Web, PWA y APK: detectan la versión nueva y muestran «Nueva actualización disponible de Gosaryc (vX.X) con mejoras. Haz clic aquí para instalar»; el botón limpia la caché y recarga. Si pones un enlace `https` en `apk_url` de `version.json`, el APK abre la descarga del APK nuevo.
3. Escritorio: `electron-updater` descarga la versión nueva desde GitHub Releases (`npm run instalador:windows -- --publish always` con `GH_TOKEN`) y el mismo aviso instala al hacer clic.
