/**
 * API local de WhatsApp para Gosaryc.
 * Corre en TU computador (http://localhost:3001). Maneja VARIOS números (uno por negocio):
 *  - Envía mensajes (recordatorios, cobros) con el WhatsApp del negocio.
 *  - Atiende a los clientes con las RESPUESTAS CONFIGURADAS de cada negocio (respuestas-<id>.json),
 *    sin inteligencia artificial y sin depender de internet para decidir qué contestar.
 *  - La IA (Gemini) queda solo para el tutorial / asistente virtual del panel.
 * No guarda claves de la base de datos.
 */
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const qrcodeTerminal = require("qrcode-terminal");
const QRCode = require("qrcode");
const { Client, LocalAuth } = require("whatsapp-web.js");

// Carpeta de datos: junto al programa, o la que indique DATOS (instalador / Android).
const CARPETA = process.env.DATOS || __dirname;
fs.mkdirSync(CARPETA, { recursive: true });
const PUERTO = Number(process.env.PUERTO || 3001);
const ARCHIVO_TOKEN = path.join(CARPETA, "token.txt");
const ARCHIVO_LINEAS = path.join(CARPETA, "lineas.json");
const PAUSA_HUMANO_MS = Number(process.env.PAUSA_HORAS || 6) * 3600 * 1000;

let TOKEN = process.env.TOKEN || "";
if (!TOKEN) {
  if (fs.existsSync(ARCHIVO_TOKEN)) TOKEN = fs.readFileSync(ARCHIVO_TOKEN, "utf8").trim();
  else {
    TOKEN = crypto.randomBytes(16).toString("hex");
    fs.writeFileSync(ARCHIVO_TOKEN, TOKEN);
  }
}

const ORIGENES = (process.env.ORIGENES || "https://gosaryc.lovable.app,http://localhost:8080,http://localhost:5173,http://localhost")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const numeroWa = (t) => {
  const d = String(t || "").replace(/\D/g, "");
  return d.length === 10 ? `57${d}` : d;
};

// ---------- Líneas (un número de WhatsApp por negocio) ----------
const lineas = new Map(); // id -> { id, nombre, clave, estado, qr, cliente, chats }

function guardarLineas() {
  const lista = [...lineas.values()].map((l) => ({ id: l.id, nombre: l.nombre, clave: l.clave, agente: l.agente }));
  fs.writeFileSync(ARCHIVO_LINEAS, JSON.stringify(lista, null, 2));
}

// ---------- Agente local: responde con las respuestas configuradas (sin IA, sin internet) ----------
const RESPUESTAS_BASE = {
  saludo: "¡Hola! Bienvenido a {negocio}. ¿En qué te puedo ayudar?",
  sinRespuesta: "Gracias por escribirnos a {negocio}. Una persona del equipo te responde en breve.",
  reglas: [
    { palabras: ["hola", "buenas", "buenos dias", "buenas tardes", "buenas noches"], respuesta: "¡Hola! Bienvenido a {negocio}. ¿Qué producto o servicio te interesa?", asesor: false },
    { palabras: ["horario", "hora", "abren", "abierto", "cierran"], respuesta: "Con gusto te informamos nuestro horario. Una persona del equipo te lo confirma enseguida.", asesor: true },
    { palabras: ["direccion", "ubicacion", "donde estan", "donde queda", "como llego"], respuesta: "Con gusto te compartimos la ubicación. Una persona del equipo te la envía enseguida.", asesor: true },
    { palabras: ["precio", "precios", "cuanto cuesta", "cuanto vale", "valor", "catalogo", "menu", "carta"], respuesta: "Con gusto te contamos precios y opciones. Dime qué producto o servicio buscas y una persona del equipo te confirma el valor.", asesor: true },
    { palabras: ["domicilio", "envio", "envios", "entregan"], respuesta: "Sí, consúltanos por entregas. Dime tu barrio o zona y una persona del equipo te confirma cobertura y costo.", asesor: true },
    { palabras: ["pago", "pagos", "nequi", "daviplata", "transferencia", "tarjeta", "efectivo"], respuesta: "Te confirmamos los medios de pago disponibles. Una persona del equipo te los indica enseguida.", asesor: true },
    { palabras: ["pedido", "pedir", "comprar", "quiero", "reservar", "cita", "cotizacion", "cotizar"], respuesta: "¡Perfecto! Cuéntame qué necesitas, la cantidad y, si es entrega, tu dirección. Una persona del equipo confirma tu pedido.", asesor: true },
    { palabras: ["asesor", "persona", "humano", "hablar con alguien", "reclamo", "queja"], respuesta: "Claro, una persona del equipo continúa contigo enseguida.", asesor: true },
    { palabras: ["gracias", "muchas gracias", "listo", "ok", "vale"], respuesta: "¡Con gusto! Cualquier cosa, escríbenos.", asesor: false },
  ],
};

const archivoRespuestas = (id) => path.join(CARPETA, `respuestas-${id}.json`);

function cargarRespuestas(id) {
  try {
    const f = archivoRespuestas(id);
    if (fs.existsSync(f)) {
      const c = JSON.parse(fs.readFileSync(f, "utf8"));
      if (c && Array.isArray(c.reglas)) return c;
    }
  } catch (_) {}
  return JSON.parse(JSON.stringify(RESPUESTAS_BASE));
}

function limpiarRespuestas(c) {
  const texto = (v, max) => String(v || "").trim().slice(0, max);
  const reglas = (Array.isArray(c && c.reglas) ? c.reglas : []).slice(0, 60).map((r) => ({
    palabras: (Array.isArray(r.palabras) ? r.palabras : []).map((p) => texto(p, 40)).filter(Boolean).slice(0, 20),
    respuesta: texto(r.respuesta, 1000),
    asesor: !!r.asesor,
  })).filter((r) => r.palabras.length && r.respuesta);
  return { saludo: texto(c && c.saludo, 600), sinRespuesta: texto(c && c.sinRespuesta, 600), reglas };
}

const normalizar = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9ñ ]/g, " ").replace(/\s+/g, " ").trim();

function coincide(textoNorm, palabra) {
  const p = normalizar(palabra);
  if (!p) return false;
  return (" " + textoNorm + " ").includes(" " + p + " ") || (p.length > 4 && textoNorm.includes(p));
}

function responderLocal(linea, chat) {
  const cfg = cargarRespuestas(linea.id);
  const poner = (t) => String(t || "").replace(/\{negocio\}/gi, linea.nombre);
  // Mensajes del cliente desde la última respuesta del agente.
  const nuevos = [];
  for (let i = chat.historial.length - 1; i >= 0 && chat.historial[i].role === "user"; i--) nuevos.unshift(chat.historial[i].content);
  const texto = normalizar(nuevos.join(" "));
  const primera = !chat.historial.some((m) => m.role === "assistant");
  const regla = cfg.reglas.find((r) => r.palabras.some((p) => coincide(texto, p)));
  const esSaludo = regla && /hola|buenas/.test(normalizar(regla.palabras.join(" "))) && regla.palabras.some((p) => /hola|buenas/.test(normalizar(p)));
  if (primera && cfg.saludo && (!regla || esSaludo)) return { texto: poner(cfg.saludo), escalar: false };
  if (regla) {
    const cuerpo = poner(regla.respuesta);
    return { texto: primera && cfg.saludo ? `${poner(cfg.saludo)}\n\n${cuerpo}` : cuerpo, escalar: !!regla.asesor };
  }
  return { texto: poner(cfg.sinRespuesta || RESPUESTAS_BASE.sinRespuesta), escalar: true };
}

async function atender(linea, jid, chat) {
  if (chat.ocupado) return;
  chat.ocupado = true;
  try {
    const wa = await linea.cliente.getChatById(jid);
    try { await wa.sendSeen(); } catch (_) {}
    try { await wa.sendStateTyping(); } catch (_) {}
    const { texto, escalar } = responderLocal(linea, chat);
    await esperar(Math.min(4000, 800 + texto.length * 15)); // se ve natural, como si escribiera una persona
    const enviado = await linea.cliente.sendMessage(jid, texto);
    if (enviado?.id?._serialized) linea.propios.add(enviado.id._serialized);
    chat.historial.push({ role: "assistant", content: texto });
    if (escalar) {
      chat.pausadoHasta = Date.now() + PAUSA_HUMANO_MS;
      console.log(`[${linea.nombre}] ${jid}: pasa a una persona del equipo (el agente se pausa ${PAUSA_HUMANO_MS / 3600000} h).`);
    }
  } catch (e) {
    console.log(`[${linea.nombre}] El agente no pudo responder: ${e.message}`);
    if (e.estado === 403 || e.estado === 401) linea.avisoClave = e.message;
  } finally {
    chat.ocupado = false;
    try { const wa = await linea.cliente.getChatById(jid); await wa.clearState(); } catch (_) {}
  }
}

function alMensaje(linea, msg) {
  if (!linea.agente) return;
  if (msg.fromMe || msg.isStatus || msg.from === "status@broadcast" || msg.from.endsWith("@g.us")) return;
  const jid = msg.from;
  const chat = linea.chats.get(jid) || { historial: [], pausadoHasta: 0, ocupado: false, timer: null, avisoMedia: 0 };
  linea.chats.set(jid, chat);
  if (msg.type === "chat" && msg.body) chat.ultimaPregunta = msg.body.slice(0, 300);
  if (Date.now() < chat.pausadoHasta) return; // una persona del equipo atiende este chat

  if (msg.type === "chat" && msg.body) {
    chat.historial.push({ role: "user", content: msg.body });
  } else {
    chat.historial.push({ role: "user", content: "[El cliente envió un audio, imagen o archivo que no puedes ver. Pídele amablemente que lo escriba en texto.]" });
  }
  if (chat.historial.length > 40) chat.historial.splice(0, chat.historial.length - 40);

  // Espera un momento por si el cliente escribe varios mensajes seguidos.
  clearTimeout(chat.timer);
  chat.timer = setTimeout(() => atender(linea, jid, chat), 2500);
}

function alEscribirYo(linea, msg) {
  // Si el dueño responde desde su celular, el agente se pausa en ese chat.
  if (!msg.fromMe || msg.to.endsWith("@g.us")) return;
  const id = msg.id?._serialized;
  if (id && linea.propios.has(id)) return;
  let chat = linea.chats.get(msg.to);
  if (chat) chat.pausadoHasta = Date.now() + PAUSA_HUMANO_MS;
  else {
    chat = { historial: [], pausadoHasta: Date.now() + PAUSA_HUMANO_MS, ocupado: false, timer: null, avisoMedia: 0 };
    linea.chats.set(msg.to, chat);
  }
}

function crearLinea({ id, nombre, clave, agente }) {
  const linea = {
    id,
    nombre: nombre || id,
    clave: clave || "",
    agente: agente !== false,
    estado: "iniciando",
    qr: "",
    chats: new Map(),
    propios: new Set(),
    avisoClave: "",
    cliente: null,
  };
  linea.cliente = new Client({
    authStrategy: new LocalAuth({ clientId: id, dataPath: path.join(CARPETA, ".sesion") }),
    puppeteer: {
      headless: true,
      // Con el instalador de escritorio se usa el Edge o Chrome ya instalado (CHROME_PATH).
      executablePath: process.env.CHROME_PATH || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });
  linea.cliente.on("qr", async (qr) => {
    linea.estado = "esperando_qr";
    try { linea.qr = await QRCode.toDataURL(qr, { margin: 1, width: 280 }); } catch (_) {}
    console.log(`\n[${linea.nombre}] Escanea este código con el WhatsApp de ESE negocio (Dispositivos vinculados > Vincular un dispositivo). También lo puedes escanear desde el panel:\n`);
    qrcodeTerminal.generate(qr, { small: true });
  });
  linea.cliente.on("ready", () => {
    linea.estado = "listo";
    linea.qr = "";
    console.log(`[${linea.nombre}] WhatsApp conectado.${linea.clave ? " Agente de ventas y atención activo." : ""}`);
  });
  linea.cliente.on("disconnected", (motivo) => {
    linea.estado = "desconectado";
    console.log(`[${linea.nombre}] WhatsApp desconectado:`, motivo);
  });
  linea.cliente.on("message", (msg) => alMensaje(linea, msg));
  linea.cliente.on("message_create", (msg) => alEscribirYo(linea, msg));
  lineas.set(id, linea);
  linea.cliente.initialize().catch((e) => {
    linea.estado = "desconectado";
    console.log(`[${linea.nombre}] No se pudo iniciar:`, e.message);
  });
  return linea;
}

function cargarLineas() {
  let lista = [];
  if (fs.existsSync(ARCHIVO_LINEAS)) {
    try { lista = JSON.parse(fs.readFileSync(ARCHIVO_LINEAS, "utf8")); } catch (_) {}
  }
  if (!Array.isArray(lista) || lista.length === 0) lista = [{ id: "principal", nombre: "Principal", clave: "", agente: true }];
  lista.forEach(crearLinea);
}

const resumen = (l) => ({
  id: l.id,
  nombre: l.nombre,
  estado: l.estado,
  agente: l.agente,
  conClave: !!l.clave,
  qr: l.qr,
  aviso: l.avisoClave,
});

function elegirLinea(id) {
  if (id && lineas.has(id)) return lineas.get(id);
  return [...lineas.values()].find((l) => l.estado === "listo") || null;
}

// ---------- API HTTP ----------
function cabeceras(origen) {
  const h = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Private-Network": "true",
  };
  if (origen && ORIGENES.includes(origen)) h["Access-Control-Allow-Origin"] = origen;
  return h;
}

function leerCuerpo(req) {
  return new Promise((resolve, reject) => {
    let datos = "";
    req.on("data", (c) => {
      datos += c;
      if (datos.length > 1e6) req.destroy();
    });
    req.on("end", () => {
      try { resolve(datos ? JSON.parse(datos) : {}); } catch (e) { reject(e); }
    });
  });
}

const servidor = http.createServer(async (req, res) => {
  const origen = req.headers.origin;
  const h = cabeceras(origen);
  const responder = (codigo, obj) => {
    res.writeHead(codigo, h);
    res.end(JSON.stringify(obj));
  };

  if (req.method === "OPTIONS") return responder(204, {});
  if (origen && !ORIGENES.includes(origen)) return responder(403, { error: "Origen no permitido" });

  const url = new URL(req.url, "http://localhost");
  const ruta = url.pathname;

  // Compatibilidad: estado de la primera línea.
  if (ruta === "/estado" && req.method === "GET") {
    const l = [...lineas.values()].find((x) => x.estado === "listo") || [...lineas.values()][0];
    return responder(200, { estado: l ? l.estado : "iniciando" });
  }

  if ((req.headers.authorization || "") !== `Bearer ${TOKEN}`) return responder(401, { error: "Clave incorrecta" });

  try {
    if (ruta === "/lineas" && req.method === "GET") return responder(200, { lineas: [...lineas.values()].map(resumen) });

    // GET /respuestas?linea=id  -> respuestas configuradas del agente local
    if (ruta === "/respuestas" && req.method === "GET") {
      const id = url.searchParams.get("linea") || "";
      if (!lineas.has(id)) return responder(404, { error: "No existe esa línea" });
      return responder(200, { respuestas: cargarRespuestas(id) });
    }

    // POST /respuestas { linea, respuestas } -> guarda las respuestas del agente local
    if (ruta === "/respuestas" && req.method === "POST") {
      const { linea: id, respuestas } = await leerCuerpo(req);
      if (!lineas.has(id)) return responder(404, { error: "No existe esa línea" });
      const limpio = limpiarRespuestas(respuestas);
      fs.writeFileSync(archivoRespuestas(id), JSON.stringify(limpio, null, 2));
      return responder(200, { respuestas: limpio });
    }

    // POST /lineas { nombre, clave }  -> agrega un número (negocio) nuevo o actualiza su clave del agente
    if (ruta === "/lineas" && req.method === "POST") {
      const { id, nombre, clave, agente } = await leerCuerpo(req);
      const idLimpio = String(id || nombre || "").toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
      if (!idLimpio) return responder(400, { error: "Falta el nombre del negocio" });
      const existente = lineas.get(idLimpio);
      if (existente) {
        if (typeof clave === "string") existente.clave = clave.trim();
        if (typeof agente === "boolean") existente.agente = agente;
        existente.avisoClave = "";
        guardarLineas();
        return responder(200, { linea: resumen(existente) });
      }
      const nueva = crearLinea({ id: idLimpio, nombre: String(nombre || idLimpio), clave: String(clave || "").trim(), agente: agente !== false });
      guardarLineas();
      return responder(200, { linea: resumen(nueva) });
    }

    // POST /lineas/quitar { id }
    if (ruta === "/lineas/quitar" && req.method === "POST") {
      const { id } = await leerCuerpo(req);
      const l = lineas.get(id);
      if (!l) return responder(404, { error: "No existe esa línea" });
      try { await l.cliente.destroy(); } catch (_) {}
      lineas.delete(id);
      guardarLineas();
      return responder(200, { ok: true });
    }

    // POST /enviar  { "telefono": "3001234567", "mensaje": "Hola", "linea": "opcional" }
    if (ruta === "/enviar" && req.method === "POST") {
      const { telefono, mensaje, linea: idLinea } = await leerCuerpo(req);
      const l = elegirLinea(idLinea);
      if (!l || l.estado !== "listo") return responder(409, { error: `WhatsApp no está listo (${l ? l.estado : "sin líneas"})` });
      const num = numeroWa(telefono);
      if (num.length < 10 || !mensaje) return responder(400, { error: "Falta teléfono o mensaje" });
      const enviado = await l.cliente.sendMessage(`${num}@c.us`, String(mensaje));
      if (enviado?.id?._serialized) l.propios.add(enviado.id._serialized);
      return responder(200, { ok: true });
    }

    // POST /enviar-lote { "mensajes": [ { "telefono": "...", "mensaje": "..." } ], "linea": "opcional" }
    if (ruta === "/enviar-lote" && req.method === "POST") {
      const { mensajes, linea: idLinea } = await leerCuerpo(req);
      const l = elegirLinea(idLinea);
      if (!l || l.estado !== "listo") return responder(409, { error: `WhatsApp no está listo (${l ? l.estado : "sin líneas"})` });
      if (!Array.isArray(mensajes)) return responder(400, { error: "Falta la lista de mensajes" });
      const resultados = [];
      for (const m of mensajes.slice(0, 100)) {
        const num = numeroWa(m.telefono);
        try {
          if (num.length < 10 || !m.mensaje) throw new Error("Datos incompletos");
          const enviado = await l.cliente.sendMessage(`${num}@c.us`, String(m.mensaje));
          if (enviado?.id?._serialized) l.propios.add(enviado.id._serialized);
          resultados.push({ telefono: m.telefono, ok: true });
        } catch (e) {
          resultados.push({ telefono: m.telefono, ok: false, error: String(e.message || e) });
        }
        await esperar(4000 + Math.random() * 4000);
      }
      return responder(200, { resultados });
    }
    return responder(404, { error: "No existe" });
  } catch (e) {
    return responder(500, { error: String(e.message || e) });
  }
});

cargarLineas();
servidor.listen(PUERTO, "127.0.0.1", () => {
  console.log(`API local de WhatsApp en http://localhost:${PUERTO}`);
  console.log(`Tu clave de acceso (guárdala en el panel): ${TOKEN}`);
});
