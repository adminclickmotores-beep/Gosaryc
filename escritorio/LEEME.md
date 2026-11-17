# Instalador de escritorio de Gosaryc (Electron)

Crea un instalador de Windows (`Gosaryc Setup x.x.x.exe`). La app instalada:
- Abre el panel de Gosaryc en su propia ventana, con acceso directo en el escritorio y en el menú Inicio.
- Trae la API local de WhatsApp con el agente IA multi-especialista (habla como el experto de tu giro: panadero, mecánico, vendedor de autos, veterinario, etc.): arranca sola en segundo plano, queda en la bandeja del sistema al cerrar o minimizar (no se apaga), inicia con Windows y reconecta sola si se cae el internet, con sesión permanente. Le pasa la clave al panel (no hay que copiarla). Incluye bandeja de chats en vivo, avisos de pedidos y de clientes que esperan humano (con alerta en el panel), aprendizaje de tus respuestas, cambio de número con QR nuevo sin perder nada y cola de mensajes sin internet.
- Trae la API local de impresión silenciosa (http://127.0.0.1:8765): imprime tirillas de 58/80 mm directo en la impresora predeterminada, sin diálogos del navegador, y guarda en cola local las facturas emitidas sin internet para sincronizarlas al volver la conexión.
- Usa el Microsoft Edge o Google Chrome que ya tiene el computador para conectar WhatsApp.
- Sin internet muestra una pantalla con el botón "Reintentar".
- Mantiene el código interno del equipo para las licencias.

## Qué necesitas descargar (una sola vez, en el computador donde armas el instalador)
1. **Node.js LTS**: https://nodejs.org (instálalo con "Siguiente" en todo y reinicia el computador).
2. **Electron no se descarga a mano**: se instala solo con el paso de abajo.

## Armar el instalador (la forma fácil)
1. Descomprime la carpeta completa del proyecto (deben quedar juntas `escritorio` y `whatsapp-local`).
2. Entra a la carpeta `escritorio` y haz doble clic en `crear-instalador-windows.bat`.
3. Espera varios minutos. Al terminar se abre la carpeta `instaladores` con `Gosaryc Setup 1.2.3.exe`.
4. Ese `.exe` es el que le entregas a tus clientes: doble clic, "Instalar" y listo.

## Sin instalar nada: crear el instalador en la nube
1. En GitHub, abre el repositorio del proyecto > pestaña **Actions** > **Instalador de Windows** > **Run workflow**.
2. Espera unos minutos y descarga el archivo **Gosaryc-instalador-windows** (contiene el `.exe`).
Úsalo si en tu computador falla la descarga de Electron.

## Con comandos (opcional)
Dentro de `whatsapp-local`:
```
set PUPPETEER_SKIP_DOWNLOAD=true
npm install --omit=dev
```
Dentro de `escritorio`:
```
npm install
npm run iniciar              (prueba la app sin instalar)
npm run instalador:windows   (crea el instalador en "instaladores")
```

## Usar el agente en la app instalada
1. Inicia sesión en la app.
2. Entra a **Mi negocio > Agente de WhatsApp**, pulsa **Crear agente** y luego **Conectar este número**.
3. Escanea el código QR con el WhatsApp de ese negocio. Repite en cada negocio con su propio número.
4. Mantén la app minimizada o ciérrala sin miedo: queda en la bandeja del sistema (al lado del reloj) atendiendo 24/7. Para salir del todo usa clic derecho en el icono > Salir. Para cambiar de celular usa «Cambiar número / Vincular nuevo QR»: no se borra nada.

## Cambiar la dirección del panel
Por defecto abre `https://gosaryc.lovable.app`. Con otro dominio, define `GOSARYC_URL` antes de abrir la app y agrega ese dominio en la variable `ORIGENES` de la API local.

## Aviso de Windows
El instalador no está firmado con un certificado de pago: Windows puede mostrar "Windows protegió su PC". Pulsa **Más información > Ejecutar de todas formas**.

## Instaladores, APK y app de licencias (todo con el logo oficial)

- **Windows clientes (64 y 32 bits):** `escritorio/crear-instalador-windows.bat` genera `Gosaryc-Setup-x64.exe` y `Gosaryc-Setup-ia32.exe` en `escritorio/instaladores` (Windows no permite un único .exe universal, por eso salen los dos; casi todos los computadores de hoy son de 64 bits).
- **Android clientes (sin Play Store):** `crear-apk-clientes.bat` (en la raíz) genera `Gosaryc.apk` (ID `com.gosaryc.erp`) con cámara, notificaciones y descarga de PDF/Excel. Se pasa al celular por WhatsApp o USB.
- **Licencias Admin Windows (solo tú):** `crear-instalador-licencias-win.bat` genera `Gosaryc-Licencias-Admin-x64.exe` e `-ia32.exe`. Abre solo el panel de licencias con tu cuenta superadmin (crear, renovar, suspender y enviar la clave por WhatsApp). No la compartas con clientes.
- **Licencias Admin Android (solo tú):** `crear-apk-licencias-admin.bat` genera `Gosaryc-Licencias-Admin.apk` (ID `com.gosaryc.licencias`, logo rojo con cinta ADMIN).
- Guía paso a paso de los 4: `COMO-GENERAR-INSTALADORES.txt` en la raíz.

## Más adelante
- Icono propio: guarda un `icono.ico` (256x256) en una carpeta `build` dentro de `escritorio`.
- Mac: `npm run instalador:mac` (se arma desde un Mac).
