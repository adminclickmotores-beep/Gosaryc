/**
 * API local de WhatsApp para Gosaryc (agente multi-especialista 24/7).
 * Corre en TU computador (http://localhost:3001). Maneja VARIOS números (uno por negocio):
 *  - Envía mensajes (recordatorios, cobros) con el WhatsApp del negocio.
 *  - Atiende a los clientes con las RESPUESTAS CONFIGURADAS de cada negocio (respuestas-<id>.json)
 *    más el PERFIL ESPECIALISTA de su tipo de negocio (panadero, mecánico, vendedor de autos, veterinario...),
 *    sin depender de internet para decidir qué contestar. Sirve con WhatsApp normal y Business.
 *  - Sesión permanente: reconexión automática con espera progresiva y sesión guardada en disco;
 *    "Cambiar número / Nuevo QR" genera un código nuevo SIN borrar respuestas ni aprendizaje.
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
const ARCHIVO_COLA = path.join(CARPETA, "cola-mensajes.json");
const ARCHIVO_AVISOS = path.join(CARPETA, "avisos.json");
const ARCHIVO_APREND = path.join(CARPETA, "aprendizaje-pendiente.json");

function leerJson(f, respaldo) {
  try {
    if (fs.existsSync(f)) {
      const d = JSON.parse(fs.readFileSync(f, "utf8"));
      return d === undefined || d === null ? respaldo : d;
    }
  } catch (_) {}
  return respaldo;
}
function escribirJson(f, d) {
  try { fs.writeFileSync(f, JSON.stringify(d, null, 2)); } catch (_) {}
}

// Aviso interno para el panel (el dueño lo ve y lo convierte en pedido, cita o ticket).
function registrarAviso(lineaId, nombre, tipo, titulo, detalle, chatId) {
  const lista = leerJson(ARCHIVO_AVISOS, []);
  lista.push({
    id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    linea: lineaId, nombre, tipo, titulo,
    detalle: String(detalle || "").slice(0, 1000),
    chat: chatId || "", fecha: new Date().toISOString(),
  });
  escribirJson(ARCHIVO_AVISOS, lista.slice(-200));
}

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
  const lista = [...lineas.values()].map((l) => ({ id: l.id, nombre: l.nombre, clave: l.clave, agente: l.agente, perfil: l.perfil || "", instrucciones: l.instrucciones || "" }));
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

// ---------- Cerebro multi-especialista: habla como el experto del giro de cada negocio ----------
// El panel envía el tipo de negocio (perfil) y las instrucciones del dueño en POST /lineas.
// Cada entrada: palabras que identifican el giro + pregunta experta que cierra el pedido/cita.
const PERFILES_EXPERTO = [
  { claves: ["panader", "pastel", "reposter", "torta", "ponque"], nombre: "panadero", guia: "Asesora sabores, porciones y tortas por encargo (tamaño en libras o porciones, pisos, relleno, fecha de entrega y anticipo).", cierra: "¿Para cuántas personas es y para qué fecha la necesitas?" },
  { claves: ["taller", "mecan", "moto", "llanta", "freno", "aceite"], nombre: "mecánico", guia: "Pregunta placa y síntomas del vehículo, cotiza mantenimiento y repuestos, y agenda la recepción en el taller.", cierra: "¿Me confirmas la placa y qué síntomas presenta el vehículo?" },
  { claves: ["concesionario", "vehiculo", "carro", "auto", "camioneta", "motocicleta"], nombre: "vendedor de autos", guia: "Asesora modelos, versiones y financiación, y agenda el test-drive en la vitrina.", cierra: "¿Qué modelo te interesa? Te cuento la financiación y te agendo el test-drive." },
  { claves: ["veterinaria", "mascota", "peluqueria canina", "pet"], nombre: "veterinario", guia: "Pregunta síntomas y desde cuándo, diferencia urgencia de cita normal y agenda la consulta.", cierra: "Cuéntame los síntomas y desde cuándo los notas, para agendarte la cita." },
  { claves: ["ferreter", "constru", "obra", "material"], nombre: "ferretero", guia: "Cotiza por medidas y unidades con stock real y sugiere el material equivalente si algo se agota.", cierra: "¿Qué medidas y cuántas unidades necesitas? Te confirmo el stock." },
  { claves: ["farmacia", "droguer", "optica", "lente", "laboratorio", "clinica", "odont", "salud", "medic"], nombre: "auxiliar de salud", guia: "Orienta con cercanía, pide la fórmula o los datos del examen cuando aplique y agenda la cita o confirma disponibilidad. Nunca diagnostica ni cambia dosis.", cierra: "¿Tienes la fórmula o el nombre exacto del producto para confirmarte?" },
  { claves: ["restaurante", "comida", "pizza", "hamburguesa", "asadero", "cafeteria", "helader"], nombre: "mesero experto", guia: "Toma el pedido completo (platos, cantidades, dirección o mesa) y confirma tiempos de entrega.", cierra: "¿Qué platos quieres y cuántos? Si es a domicilio, dime tu dirección." },
  { claves: ["belleza", "peluquer", "barber", "spa", "unas", "maquillaje"], nombre: "asesor de belleza", guia: "Recomienda servicios según la ocasión y agenda la cita con profesional y hora.", cierra: "¿Qué servicio te interesa y para qué día y hora te agendo?" },
  { claves: ["hotel", "hostal", "alojamiento", "cabana"], nombre: "recepcionista", guia: "Cotiza habitaciones por fechas y número de huéspedes, y confirma la reserva con abono.", cierra: "¿Para qué fechas y cuántas personas es la reserva?" },
  { claves: ["educacion", "colegio", "curso", "academia", "instituto", "jardin"], nombre: "asesor académico", guia: "Explica programas, horarios y matrículas, y agenda la visita o la inscripción.", cierra: "¿Para quién es el cupo y en qué horario te sirve?" },
  { claves: ["ropa", "moda", "boutique", "calzado", "zapater"], nombre: "asesor de moda", guia: "Pregunta talla, color y ocasión, y confirma disponibilidad antes de prometer.", cierra: "¿Qué talla y color buscas? Te confirmo disponibilidad." },
  { claves: ["licor", "bar", "trago"], nombre: "licorero", guia: "Vende por unidades y combos verificando mayoría de edad y confirma domicilio.", cierra: "¿Qué licor y cuántas unidades quieres? Confírmame que eres mayor de edad y tu dirección." },
  { claves: ["parqueadero", "parqueo", "parking"], nombre: "operador de parqueadero", guia: "Registra placa, hora de entrada y tarifa por horas o mensualidad.", cierra: "¿Me confirmas la placa para registrar tu ingreso?" },
  { claves: ["lavander", "tintorer"], nombre: "operador de lavandería", guia: "Recibe prendas por tipo y servicio (lavado, planchado, domicilio) y confirma fecha de entrega.", cierra: "¿Qué prendas son y las necesitas solo lavadas o también planchadas?" },
  { claves: ["inmobiliar", "arriendo", "venta de casas", "finca raiz"], nombre: "asesor inmobiliario", guia: "Filtra por presupuesto, zona y tipo de inmueble, y agenda la visita.", cierra: "¿Cuál es tu presupuesto y en qué zona buscas?" },
  { claves: ["transporte", "mudanza", "acarreo", "domicilio"], nombre: "despachador", guia: "Cotiza por origen, destino y carga, y confirma fecha y hora del servicio.", cierra: "¿Cuál es el origen, el destino y qué hay que llevar?" },
  { claves: ["sst", "sg-sst", "salud ocupacional", "medicina laboral", "seguridad y salud"], nombre: "especialista SST", guia: "Atiende empresas cliente: cotiza exámenes ocupacionales, outsourcing SG-SST y capacitaciones, y agenda evaluaciones médicas por empresa y cargo. Nunca revela historia clínica.", cierra: "¿De qué empresa nos escribes y cuántos trabajadores necesitan el examen o la asesoría?" },
];

function buscarPerfil(tipo) {
  const t = String(tipo || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (!t) return null;
  return PERFILES_EXPERTO.find((p) => p.claves.some((c) => t.includes(c))) || null;
}

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
  const perfil = buscarPerfil(linea.perfil);
  // Mensajes del cliente desde la última respuesta del agente.
  const nuevos = [];
  for (let i = chat.historial.length - 1; i >= 0 && chat.historial[i].role === "user"; i--) nuevos.unshift(chat.historial[i].content);
  const texto = normalizar(nuevos.join(" "));
  const primera = !chat.historial.some((m) => m.role === "assistant");
  const regla = cfg.reglas.find((r) => r.palabras.some((p) => coincide(texto, p)));
  // Pregunta experta de cierre: solo cuando el cliente muestra intención (pedido, precio, cita).
  const cierra = perfil && regla && /pedido|pedir|comprar|quiero|reservar|cita|cotiz|precio|cuanto|valor|catalogo|menu|domicilio|modelo|torta|placa/i.test(nuevos.join(" "))
    ? ` ${perfil.cierra}`
    : "";
  const conCierre = (t) => (cierra && !t.includes(perfil.cierra) ? `${t}${cierra}` : t);
  const esSaludo = regla && /hola|buenas/.test(normalizar(regla.palabras.join(" "))) && regla.palabras.some((p) => /hola|buenas/.test(normalizar(p)));
  if (primera && cfg.saludo && (!regla || esSaludo)) {
    const base = cfg.saludo === RESPUESTAS_BASE.saludo && perfil
      ? `¡Hola! Soy el asistente de ${linea.nombre}. ${perfil.guia} Aquí también llevan nómina con las reglas de Colombia, facturación con logo y datos DIAN, y reservas o pedidos por este chat. ¿En qué te puedo ayudar?`
      : poner(cfg.saludo);
    return { texto: base, escalar: false };
  }
  if (regla) {
    const cuerpo = poner(regla.respuesta);
    const completo = conCierre(primera && cfg.saludo ? `${poner(cfg.saludo)}\n\n${cuerpo}` : cuerpo);
    return { texto: completo, escalar: !!regla.asesor };
  }
  return { texto: conCierre(poner(cfg.sinRespuesta || RESPUESTAS_BASE.sinRespuesta)), escalar: true };
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
    chat.noLeidos = 0;
    // Escalado a humano: cliente molesto, pago con problema o el agente no supo responder.
    const ultimos = chat.historial.filter((m) => m.role === "user").slice(-3).map((m) => normalizar(m.content)).join(" ");
    const todo = chat.historial.map((m) => normalizar(m.content)).join(" ");
    const molesto = /molest|enojad|estafa|ladr|demanda|abogado|superintendencia|\bsic\b|pesim|nadie responde|pago fall|no pas[óo] el pago|me cobraron|devuelv|reembolso/.test(ultimos);
    const confirma = /confirmo|confirmado|si acepto|acepto el pedido|listo el pedido|agendar/.test(ultimos) && /pedido|cita|reserva|turno|domicilio|llevar|consulta/.test(todo);
    const tel = String(jid || "").replace(/@c\.us$/, "");
    const extracto = chat.historial.slice(-4).map((m) => `${m.role === "user" ? "Cliente" : "Agente"}: ${m.content}`).join("\n").slice(0, 800);
    if (molesto || escalar) {
      chat.pausadoHasta = Date.now() + PAUSA_HUMANO_MS;
      console.log(`[${linea.nombre}] ${jid}: pasa a una persona del equipo (el agente se pausa ${PAUSA_HUMANO_MS / 3600000} h).`);
      registrarAviso(linea.id, linea.nombre, "espera_humano", `Cliente espera a una persona (${tel})`, extracto, tel);
    } else if (confirma) {
      registrarAviso(linea.id, linea.nombre, "nuevo_pedido", `Posible pedido o cita por confirmar (${tel})`, extracto, tel);
    } else if (escalar) {
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
  const chat = linea.chats.get(jid) || { historial: [], pausadoHasta: 0, ocupado: false, timer: null, avisoMedia: 0, nombre: String(jid).replace(/@c\.us$/, ""), noLeidos: 0, visto: "" };
  linea.chats.set(jid, chat);
  chat.noLeidos = (chat.noLeidos || 0) + 1;
  try {
    const alias = msg._data && msg._data.notifyName ? String(msg._data.notifyName).slice(0, 60) : "";
    if (alias) chat.nombre = alias;
  } catch (_) {}
  if (msg.type === "chat" && msg.body) chat.visto = String(msg.body).slice(0, 120);
  if (msg.type === "chat" && msg.body) chat.ultimaPregunta = msg.body.slice(0, 300);
  if (Date.now() < chat.pausadoHasta) return; // una persona del equipo atiende este chat

  if (msg.type === "chat" && msg.body) {
    chat.historial.push({ role: "user", content: msg.body });
  } else {
    chat.historial.push({ role: "user", content: "[El cliente envió un audio, imagen o archivo que no puedes ver. Pídele amablemente que lo escriba en texto.]" });
  }
  if (chat.historial.length > 40) chat.historial.splice(0, chat.historial.length - 40);

  // Espera 3 segundos por si el cliente escribe varios mensajes seguidos: se agrupan
  // y se responde una sola vez, de forma completa (cero respuestas pendientes).
  clearTimeout(chat.timer);
  chat.timer = setTimeout(() => atender(linea, jid, chat), 3000);
}

function alEscribirYo(linea, msg) {
  // Si el dueño responde desde su celular, el agente se pausa en ese chat.
  if (!msg.fromMe || msg.to.endsWith("@g.us")) return;
  const id = msg.id?._serialized;
  if (id && linea.propios.has(id)) return;
  let chat = linea.chats.get(msg.to);
  if (chat) chat.pausadoHasta = Date.now() + PAUSA_HUMANO_MS;
  else {
    chat = { historial: [], pausadoHasta: Date.now() + PAUSA_HUMANO_MS, ocupado: false, timer: null, avisoMedia: 0, noLeidos: 0 };
    linea.chats.set(msg.to, chat);
  }
  // Aprendizaje: lo que el dueño responde a mano queda pendiente de aprobar en el panel.
  try {
    const cuerpo = String(msg.body || "").slice(0, 500);
    const preg = chat.ultimaPregunta ? String(chat.ultimaPregunta).slice(0, 300) : "";
    if (cuerpo.length > 1 && preg) {
      const pend = leerJson(ARCHIVO_APREND, []);
      const dup = pend.some((p) => p.linea === linea.id && p.pregunta === preg);
      if (!dup) {
        pend.push({ id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, linea: linea.id, pregunta: preg, respuesta: cuerpo, fecha: new Date().toISOString() });
        escribirJson(ARCHIVO_APREND, pend.slice(-200));
      }
    }
  } catch (_) {}
}

// Envía lo que quedó en cola sin internet apenas vuelve la conexión.
async function vaciarCola(linea) {
  const cola = leerJson(ARCHIVO_COLA, []).filter((m) => !m.linea || m.linea === linea.id);
  if (cola.length === 0) return;
  for (const m of cola) {
    try {
      const enviado = await linea.cliente.sendMessage(`${numeroWa(m.telefono)}@c.us`, String(m.mensaje));
      if (enviado?.id?._serialized) linea.propios.add(enviado.id._serialized);
      escribirJson(ARCHIVO_COLA, leerJson(ARCHIVO_COLA, []).filter((x) => x.id !== m.id));
      await esperar(3000);
    } catch (_) { break; }
  }
}

function crearLinea({ id, nombre, clave, agente, perfil, instrucciones }) {
  const linea = {
    id,
    nombre: nombre || id,
    clave: clave || "",
    agente: agente !== false,
    perfil: String(perfil || ""),
    instrucciones: String(instrucciones || "").slice(0, 1000),
    reintentos: 0,
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
    linea.reintentos = 0;
    console.log(`[${linea.nombre}] WhatsApp conectado.${linea.clave ? " Agente de ventas y atención activo." : ""}`);
    void vaciarCola(linea);
  });
  linea.cliente.on("auth_failure", (m) => {
    linea.estado = "desconectado";
    linea.avisoClave = "La sesión se cerró desde el celular. Usa «Cambiar número / Nuevo QR» en el panel.";
    console.log(`[${linea.nombre}] Sesión no válida:`, m);
  });
  linea.cliente.on("disconnected", (motivo) => {
    // Sesión inmortal: reintenta sola con espera progresiva (5 s, 10 s, 20 s... hasta 5 min).
    linea.estado = "desconectado";
    linea.reintentos = (linea.reintentos || 0) + 1;
    const espera = Math.min(300000, 5000 * Math.pow(2, linea.reintentos - 1));
    console.log(`[${linea.nombre}] WhatsApp desconectado:`, motivo, `| reintento en ${Math.round(espera / 1000)} s`);
    setTimeout(() => {
      if (linea.estado === "desconectado" && lineas.get(linea.id) === linea) {
        linea.cliente.initialize().catch((e) => console.log(`[${linea.nombre}] Reintento falló:`, e.message));
      }
    }, espera);
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
  perfil: l.perfil || "",
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

    // POST /lineas/revincular { id } -> genera un QR nuevo sin borrar respuestas ni aprendizaje
    if (ruta === "/lineas/revincular" && req.method === "POST") {
      const { id } = await leerCuerpo(req);
      const l = lineas.get(id);
      if (!l) return responder(404, { error: "No existe esa línea" });
      try { await l.cliente.logout(); } catch (_) {}
      try { await l.cliente.destroy(); } catch (_) {}
      const datos = { id: l.id, nombre: l.nombre, clave: l.clave, agente: l.agente, perfil: l.perfil, instrucciones: l.instrucciones };
      lineas.delete(id);
      const nueva = crearLinea(datos);
      guardarLineas();
      return responder(200, { linea: resumen(nueva) });
    }

    // GET /chats?linea=id[&ver=jid] -> bandeja de chats en vivo para intervenir como humano
    if (ruta === "/chats" && req.method === "GET") {
      const id = url.searchParams.get("linea") || "";
      const l = lineas.get(id);
      if (!l) return responder(404, { error: "No existe esa línea" });
      const ver = url.searchParams.get("ver") || "";
      if (ver && l.chats.get(ver)) l.chats.get(ver).noLeidos = 0;
      const chats = [...l.chats.entries()].map(([jid, c]) => ({
        jid,
        telefono: String(jid).replace(/@c\.us$/, ""),
        nombre: c.nombre || String(jid).replace(/@c\.us$/, ""),
        visto: c.visto || "",
        noLeidos: c.noLeidos || 0,
        humano: Date.now() < (c.pausadoHasta || 0),
        historial: (c.historial || []).slice(-20),
      })).sort((a, b) => (b.noLeidos - a.noLeidos));
      return responder(200, { chats });
    }

    // POST /chats/responder { linea, chat, mensaje } -> responde como humano y pausa la IA
    if (ruta === "/chats/responder" && req.method === "POST") {
      const { linea: id, chat: jid, mensaje } = await leerCuerpo(req);
      const l = lineas.get(id);
      if (!l || l.estado !== "listo") return responder(409, { error: "WhatsApp no está listo" });
      if (!jid || !mensaje) return responder(400, { error: "Falta chat o mensaje" });
      const enviado = await l.cliente.sendMessage(jid, String(mensaje));
      if (enviado?.id?._serialized) l.propios.add(enviado.id._serialized);
      let c = l.chats.get(jid);
      if (!c) {
        c = { historial: [], pausadoHasta: 0, ocupado: false, timer: null, avisoMedia: 0, noLeidos: 0 };
        l.chats.set(jid, c);
      }
      c.historial.push({ role: "assistant", content: String(mensaje) });
      c.pausadoHasta = Date.now() + PAUSA_HUMANO_MS;
      c.noLeidos = 0;
      return responder(200, { ok: true });
    }

    // POST /chats/modo-humano { linea, chat, humano } -> pausar o reactivar la IA en un chat
    if (ruta === "/chats/modo-humano" && req.method === "POST") {
      const { linea: id, chat: jid, humano } = await leerCuerpo(req);
      const l = lineas.get(id);
      const c = l && l.chats.get(jid);
      if (!c) return responder(404, { error: "No existe ese chat" });
      c.pausadoHasta = humano ? Date.now() + PAUSA_HUMANO_MS : 0;
      return responder(200, { ok: true, humano: !!humano });
    }

    // GET /avisos?linea=id -> notificaciones internas (pedidos, espera de humano)
    if (ruta === "/avisos" && req.method === "GET") {
      const id = url.searchParams.get("linea") || "";
      const lista = leerJson(ARCHIVO_AVISOS, []).filter((a) => !id || a.linea === id).slice(-50);
      return responder(200, { avisos: lista });
    }

    // POST /avisos/leido { id } -> descarta un aviso local (ya quedó en el panel)
    if (ruta === "/avisos/leido" && req.method === "POST") {
      const { id } = await leerCuerpo(req);
      escribirJson(ARCHIVO_AVISOS, leerJson(ARCHIVO_AVISOS, []).filter((a) => a.id !== id));
      return responder(200, { ok: true });
    }

    // GET /aprendizaje?linea=id -> respuestas del dueño pendientes de aprobar
    if (ruta === "/aprendizaje" && req.method === "GET") {
      const id = url.searchParams.get("linea") || "";
      const lista = leerJson(ARCHIVO_APREND, []).filter((a) => !id || a.linea === id).slice(-50);
      return responder(200, { pendientes: lista });
    }

    // POST /aprendizaje/quitar { id }
    if (ruta === "/aprendizaje/quitar" && req.method === "POST") {
      const { id } = await leerCuerpo(req);
      escribirJson(ARCHIVO_APREND, leerJson(ARCHIVO_APREND, []).filter((a) => a.id !== id));
      return responder(200, { ok: true });
    }

    // GET /cola -> mensajes en espera por falta de internet
    if (ruta === "/cola" && req.method === "GET") {
      return responder(200, { cola: leerJson(ARCHIVO_COLA, []) });
    }

    // POST /lineas { id, nombre, clave, agente, perfil, instrucciones } -> agrega o actualiza un número
    if (ruta === "/lineas" && req.method === "POST") {
      const { id, nombre, clave, agente, perfil, instrucciones } = await leerCuerpo(req);
      const idLimpio = String(id || nombre || "").toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
      if (!idLimpio) return responder(400, { error: "Falta el nombre del negocio" });
      const existente = lineas.get(idLimpio);
      if (existente) {
        if (typeof clave === "string") existente.clave = clave.trim();
        if (typeof agente === "boolean") existente.agente = agente;
        if (typeof perfil === "string") existente.perfil = perfil.slice(0, 80);
        if (typeof instrucciones === "string") existente.instrucciones = instrucciones.slice(0, 1000);
        existente.avisoClave = "";
        guardarLineas();
        return responder(200, { linea: resumen(existente) });
      }
      const nueva = crearLinea({ id: idLimpio, nombre: String(nombre || idLimpio), clave: String(clave || "").trim(), agente: agente !== false, perfil: String(perfil || "").slice(0, 80), instrucciones: String(instrucciones || "").slice(0, 1000) });
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
      const num = numeroWa(telefono);
      if (num.length < 10 || !mensaje) return responder(400, { error: "Falta teléfono o mensaje" });
      if (!l || l.estado !== "listo") {
        // Sin internet o sin sesión: queda en cola local y sale solo al reconectar.
        const cola = leerJson(ARCHIVO_COLA, []);
        cola.push({ id: `${Date.now()}-${Math.floor(Math.random() * 1e6)}`, linea: (l && l.id) || idLinea || "", telefono: num, mensaje: String(mensaje), fecha: new Date().toISOString() });
        escribirJson(ARCHIVO_COLA, cola.slice(-500));
        return responder(200, { ok: true, encolado: true, pendientes: cola.length });
      }
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
