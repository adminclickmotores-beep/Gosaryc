# API local de WhatsApp (Gosaryc)

Envía mensajes con el WhatsApp de tu negocio desde tu propio computador. No usa claves de la base de datos.

## Uso
1. Instala Node.js (https://nodejs.org) si no lo tienes.
2. Doble clic en `iniciar-whatsapp.bat`. La primera vez instala lo necesario (tarda unos minutos).
3. Escanea el código QR que aparece con WhatsApp: Dispositivos vinculados > Vincular un dispositivo. La sesión queda guardada.
4. La ventana muestra tu **clave de acceso** (también queda en `token.txt`). Déjala abierta mientras quieras enviar.

## Endpoints (solo desde este computador)
- `GET  http://localhost:3001/estado`: `iniciando | esperando_qr | listo | desconectado`.
- `POST http://localhost:3001/enviar` con `Authorization: Bearer <clave>` y cuerpo `{ "telefono": "3001234567", "mensaje": "Hola" }`.
- `POST http://localhost:3001/enviar-lote` con `{ "mensajes": [{ "telefono": "...", "mensaje": "..." }] }` (máx. 100, con pausa entre cada uno).

## Importante
- Usa WhatsApp Web (no es la API oficial de Meta). Envía a clientes que ya te conocen y con pocos mensajes por día para evitar bloqueos del número.
- El computador debe estar encendido y con internet para que envíe.
- Si abres el panel desde otro dominio, agrégalo en la variable `ORIGENES` antes de iniciar.
