# API local de WhatsApp (Gosaryc)

Corre en tu computador, conecta uno o varios números de WhatsApp (uno por negocio) y:
- **Atiende y vende:** el agente responde a tus clientes como servicio al cliente, asesor comercial y vendedor, con los datos y el catálogo reales de cada negocio.
- **Envía mensajes:** recordatorios y cobros desde el panel.

## Uso
1. Instala Node.js (https://nodejs.org) si no lo tienes.
2. Doble clic en `iniciar-whatsapp.bat`. La primera vez instala lo necesario.
3. En el panel, en **Mi negocio > Agente de WhatsApp**, pega la clave de acceso (está en `token.txt`), pulsa **Conectar este número** y escanea el QR con el WhatsApp de ese negocio.
4. Cada negocio tiene su propia clave de agente y su propio número. Repite el paso 3 en cada negocio.

## Cómo se comporta el agente
- Responde solo chats individuales (no grupos) y espera un momento por si el cliente escribe varios mensajes.
- Cuando el cliente pide una persona, está molesto o hay un pago con problema, avisa en la pantalla de avisos y se **pausa 6 horas en ese chat**.
- Si el cliente confirma un pedido o una cita, lo avisa para que lo registres en el programa.
- Si tú respondes desde el celular o desde la bandeja del panel, el agente se pausa en ese chat y anota tu respuesta para aprenderla (la apruebas en el panel).
- Puedes desactivarlo por negocio desde el panel, o cambiar de número con «Cambiar número / Vincular nuevo QR» sin perder tu configuración ni lo aprendido.
- Sin internet, los mensajes que envías quedan en **cola local** y salen solos al reconectar.

## Endpoints (solo desde este computador, con `Authorization: Bearer <clave>`)
- `GET  /estado` (sin clave): estado de la primera línea.
- `GET  /lineas`: líneas, estado y QR (imagen) para vincular.
- `POST /lineas` `{ "nombre": "Mi negocio", "clave": "<clave del agente>", "agente": true }`.
- `POST /lineas/revincular` `{ "id": "mi-negocio" }`: QR nuevo conservando respuestas y aprendizaje.
- `POST /lineas/quitar` `{ "id": "mi-negocio" }`.
- `GET  /chats?linea=<id>` / `POST /chats/responder` / `POST /chats/modo-humano`: bandeja en vivo.
- `GET  /avisos?linea=<id>` / `POST /avisos/leido`: pedidos detectados y clientes que esperan humano.
- `GET  /aprendizaje?linea=<id>` / `POST /aprendizaje/quitar`: respuestas del dueño por aprobar.
- `GET  /cola`: mensajes en espera por falta de internet.
- `POST /enviar` `{ "telefono": "3001234567", "mensaje": "Hola", "linea": "opcional" }` (sin conexión: queda en cola).
- `POST /enviar-lote` `{ "mensajes": [{ "telefono": "...", "mensaje": "..." }] }` (máx. 100, con pausa).

## Variables opcionales
`PUERTO`, `TOKEN`, `ORIGENES`, `AGENTE_URL`, `PAUSA_HORAS`, `DATOS` (carpeta donde guarda sesión y claves; úsala al empaquetar en un instalador).

## Importante
- Usa WhatsApp Web (no es la API oficial de Meta): evita enviar masivamente para no arriesgar el número.
- El computador debe estar encendido y con internet.
