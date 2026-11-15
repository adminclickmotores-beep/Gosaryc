/**
 * API local de WhatsApp para Gosaryc.
 * Corre en TU computador (http://localhost:3001) y envía mensajes con el WhatsApp del negocio.
 * No guarda claves de la base de datos: el panel (abierto en este mismo computador) le manda cada mensaje.
 */
const http = require("http");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");

const PUERTO = Number(process.env.PUERTO || 3001);
const ARCHIVO_TOKEN = path.join(__dirname, "token.txt");

// Clave de acceso: se crea la primera vez y se guarda en token.txt (cópiala en el panel).
let TOKEN = process.env.TOKEN || "";
if (!TOKEN) {
  if (fs.existsSync(ARCHIVO_TOKEN)) TOKEN = fs.readFileSync(ARCHIVO_TOKEN, "utf8").trim();
  else {
    TOKEN = crypto.randomBytes(16).toString("hex");
    fs.writeFileSync(ARCHIVO_TOKEN, TOKEN);
  }
}

// Solo se aceptan peticiones del panel de Gosaryc (y de pruebas locales).
const ORIGENES = (process.env.ORIGENES || "https://gosaryc.lovable.app,http://localhost:8080,http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

let estado = "iniciando"; // iniciando | esperando_qr | listo | desconectado
const cliente = new Client({
  authStrategy: new LocalAuth({ dataPath: path.join(__dirname, ".sesion") }),
  puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] },
});

cliente.on("qr", (qr) => {
  estado = "esperando_qr";
  console.log("\nEscanea este código con WhatsApp (Dispositivos vinculados > Vincular un dispositivo):\n");
  qrcode.generate(qr, { small: true });
});
cliente.on("ready", () => {
  estado = "listo";
  console.log("WhatsApp conectado. Ya puedes enviar mensajes desde el panel.");
});
cliente.on("disconnected", (motivo) => {
  estado = "desconectado";
  console.log("WhatsApp desconectado:", motivo);
});
cliente.initialize();

// Deja el número listo: solo dígitos; si trae 10 (Colombia) le agrega 57.
const numeroWa = (t) => {
  const d = String(t || "").replace(/\D/g, "");
  return d.length === 10 ? `57${d}` : d;
};

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

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
      try {
        resolve(datos ? JSON.parse(datos) : {});
      } catch (e) {
        reject(e);
      }
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

  if (req.url === "/estado" && req.method === "GET") return responder(200, { estado });

  const autorizado = (req.headers.authorization || "") === `Bearer ${TOKEN}`;
  if (!autorizado) return responder(401, { error: "Clave incorrecta" });

  try {
    // POST /enviar  { "telefono": "3001234567", "mensaje": "Hola" }
    // POST /enviar-lote { "mensajes": [ { "telefono": "...", "mensaje": "..." } ] }
    if (req.url === "/enviar" && req.method === "POST") {
      if (estado !== "listo") return responder(409, { error: `WhatsApp no está listo (${estado})` });
      const { telefono, mensaje } = await leerCuerpo(req);
      const num = numeroWa(telefono);
      if (num.length < 10 || !mensaje) return responder(400, { error: "Falta teléfono o mensaje" });
      await cliente.sendMessage(`${num}@c.us`, String(mensaje));
      return responder(200, { ok: true });
    }
    if (req.url === "/enviar-lote" && req.method === "POST") {
      if (estado !== "listo") return responder(409, { error: `WhatsApp no está listo (${estado})` });
      const { mensajes } = await leerCuerpo(req);
      if (!Array.isArray(mensajes)) return responder(400, { error: "Falta la lista de mensajes" });
      const resultados = [];
      for (const m of mensajes.slice(0, 100)) {
        const num = numeroWa(m.telefono);
        try {
          if (num.length < 10 || !m.mensaje) throw new Error("Datos incompletos");
          await cliente.sendMessage(`${num}@c.us`, String(m.mensaje));
          resultados.push({ telefono: m.telefono, ok: true });
        } catch (e) {
          resultados.push({ telefono: m.telefono, ok: false, error: String(e.message || e) });
        }
        await esperar(4000 + Math.random() * 4000); // pausa entre mensajes para cuidar tu número
      }
      return responder(200, { resultados });
    }
    return responder(404, { error: "No existe" });
  } catch (e) {
    return responder(500, { error: String(e.message || e) });
  }
});

servidor.listen(PUERTO, "127.0.0.1", () => {
  console.log(`API local de WhatsApp en http://localhost:${PUERTO}`);
  console.log(`Tu clave de acceso (guárdala en el panel): ${TOKEN}`);
});
