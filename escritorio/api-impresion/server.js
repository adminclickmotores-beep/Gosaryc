// Gosaryc · API local de impresión silenciosa y cola offline (Windows).
// Arranca en segundo plano junto a la app de escritorio: http://127.0.0.1:8765
// Sin dependencias externas: solo módulos incluidos en Node.
// Endpoints:
//   GET  /api/estado         -> { activo, version, impresoras[], predeterminada, pendientes }
//   POST /api/imprimir-tirilla -> { negocio, resolucion, cliente, items[], totales, formato } imprime en la predeterminada sin diálogo.
//   POST /api/cola-offline    -> guarda facturas localmente cuando no hay internet y las marca para sincronizar.
//   GET  /api/cola-offline    -> lista pendientes.  POST /api/cola-offline/sincronizar -> intenta vaciar la cola.
const http = require("http");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync, exec } = require("child_process");

const PUERTO = Number(process.env.GOSARYC_PRINT_PORT || 8765);
const VERSION = "1.0.0";
const carpetaDatos = () => {
  const base = process.env.DATOS || path.join(os.homedir(), ".gosaryc-impresion");
  fs.mkdirSync(base, { recursive: true });
  return base;
};
const archivoCola = () => path.join(carpetaDatos(), "cola-offline.json");

function leerCola() {
  try {
    const raw = fs.readFileSync(archivoCola(), "utf8");
    const d = JSON.parse(raw);
    return Array.isArray(d) ? d : [];
  } catch {
    return [];
  }
}
function guardarCola(cola) {
  try {
    fs.writeFileSync(archivoCola(), JSON.stringify(cola, null, 2), "utf8");
  } catch { /* disco lleno: se conserva lo anterior */ }
}

// ---- Impresoras instaladas en Windows ----
function listarImpresoras() {
  // PowerShell es lo más fiable en Windows 10/11; en otros sistemas devuelve lista vacía.
  try {
    if (process.platform !== "win32") return { impresoras: [], predeterminada: "" };
    const out = execFileSync(
      "powershell",
      ["-NoProfile", "-Command", "Get-Printer | Select-Object Name,Default | ConvertTo-Json"],
      { encoding: "utf8", windowsHide: true, timeout: 8000 },
    ).trim();
    if (!out) return { impresoras: [], predeterminada: "" };
    let arr;
    try {
      const j = JSON.parse(out);
      arr = Array.isArray(j) ? j : [j];
    } catch { return { impresoras: [], predeterminada: "" }; }
    const impresoras = arr.map((p) => String(p.Name || "")).filter(Boolean);
    const def = arr.find((p) => p.Default === true);
    return { impresoras, predeterminada: def ? String(def.Name || "") : impresoras[0] || "" };
  } catch {
    return { impresoras: [], predeterminada: "" };
  }
}

// ---- Formato térmico 58/80 mm (texto plano ESC/POS compatible) ----
const anchoPor = (formato) => (formato === "58mm" ? 32 : 42);
const linea = (n, formato) => "-".repeat(anchoPor(formato)).slice(0, n || anchoPor(formato));
const dosCol = (izq, der, formato) => {
  const w = anchoPor(formato);
  const d = String(der);
  const i = String(izq).slice(0, Math.max(0, w - d.length - 1));
  return (i + " ".repeat(Math.max(1, w - i.length - d.length)) + d).slice(0, w);
};
const centrar = (t, formato) => {
  const w = anchoPor(formato);
  const s = String(t).slice(0, w);
  const p = Math.floor((w - s.length) / 2);
  return " ".repeat(Math.max(0, p)) + s;
};
const cop = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n) || 0);

function formatearTirilla(d) {
  const formato = d.formato === "58mm" ? "58mm" : "80mm";
  const L = [];
  L.push(centrar(d.negocio || "Mi negocio", formato));
  if (d.nit) L.push(centrar(`NIT ${d.nit}`, formato));
  if (d.direccion) L.push(centrar(d.direccion, formato));
  if (d.telefono) L.push(centrar(`Tel. ${d.telefono}`, formato));
  if (d.resolucion) L.push(centrar(`Res. DIAN ${d.resolucion}`, formato));
  L.push(linea(0, formato));
  L.push(centrar(`Factura ${d.numero || ""}`, formato));
  L.push(`Fecha: ${d.fecha || new Date().toLocaleString("es-CO")}`);
  L.push(`Cliente: ${d.cliente || "Mostrador"}`);
  if (d.clienteDoc) L.push(`Doc: ${d.clienteDoc}`);
  L.push(linea(0, formato));
  (d.items || []).forEach((it) => {
    const nombre = String(it.descripcion || it.nombre || "Item").slice(0, anchoPor(formato));
    L.push(`${it.cantidad || 1} x ${nombre}`);
    L.push(dosCol(`   ${cop(it.precio || 0)} c/u`, cop((it.cantidad || 1) * (it.precio || 0)), formato));
  });
  L.push(linea(0, formato));
  if (d.subtotal != null) L.push(dosCol("Subtotal", cop(d.subtotal), formato));
  if (d.iva != null) L.push(dosCol(`IVA${d.ivaPct ? ` (${d.ivaPct}%)` : ""}`, cop(d.iva), formato));
  L.push(dosCol("TOTAL", cop(d.total || 0), formato));
  if (d.metodo) L.push(`Pago: ${d.metodo}`);
  if (d.cufe) L.push(`CUFE: ${String(d.cufe).slice(0, anchoPor(formato))}`);
  if (d.qr) L.push(`QR: ${String(d.qr).slice(0, anchoPor(formato))}`);
  L.push(linea(0, formato));
  L.push(centrar("Gracias por su compra", formato));
  L.push(centrar("Gosaryc", formato));
  L.push("\n\n\n");
  return { texto: L.join("\r\n"), formato };
}

function imprimirSilencioso(texto) {
  return new Promise((resolve) => {
    if (process.platform !== "win32") {
      // Fuera de Windows: se guarda el ticket para revisarlo.
      try {
        const f = path.join(carpetaDatos(), `tirilla-${Date.now()}.txt`);
        fs.writeFileSync(f, texto, "utf8");
        resolve({ ok: true, destino: f });
      } catch (e) { resolve({ ok: false, error: String(e && e.message || e) }); }
      return;
    }
    const f = path.join(carpetaDatos(), `tirilla-${Date.now()}.txt`);
    try {
      fs.writeFileSync(f, texto, "utf8");
    } catch (e) { resolve({ ok: false, error: "No se pudo escribir el ticket" }); return; }
    // notepad /p imprime directo en la predeterminada sin abrir diálogos.
    exec(`notepad /p ${JSON.stringify(f)}`, { windowsHide: true, timeout: 30000 }, (err) => {
      if (err) resolve({ ok: false, error: "No se pudo enviar a la impresora. Revisa que haya una predeterminada." });
      else resolve({ ok: true, destino: "predeterminada" });
    });
  });
}

function leerCuerpo(req) {
  return new Promise((resolve) => {
    let b = "";
    req.on("data", (c) => { b += c; if (b.length > 2_000_000) req.destroy(); });
    req.on("end", () => { try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); } });
  });
}

const server = http.createServer(async (req, res) => {
  // Solo la máquina local puede usar esta API.
  const remoto = req.socket.remoteAddress || "";
  const esLocal = remoto === "127.0.0.1" || remoto === "::1" || remoto === "::ffff:127.0.0.1";
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (!esLocal) { res.writeHead(403, { "Content-Type": "application/json" }); res.end(JSON.stringify({ ok: false, error: "Solo local" })); return; }

  const url = new URL(req.url || "/", "http://127.0.0.1");
  try {
    if (req.method === "GET" && url.pathname === "/api/estado") {
      const { impresoras, predeterminada } = listarImpresoras();
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, activo: true, version: VERSION, impresoras, predeterminada, pendientes: leerCola().length }));
      return;
    }
    if (req.method === "GET" && url.pathname === "/api/cola-offline") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, pendientes: leerCola() }));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/imprimir-tirilla") {
      const d = await leerCuerpo(req);
      const { texto, formato } = formatearTirilla(d || {});
      const r = await imprimirSilencioso(texto);
      res.writeHead(r.ok ? 200 : 500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: r.ok, formato, ...(r.ok ? { destino: r.destino } : { error: r.error }) }));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/cola-offline") {
      const d = await leerCuerpo(req);
      const cola = leerCola();
      cola.push({ id: `loc-${Date.now()}`, fecha: new Date().toISOString(), factura: d });
      guardarCola(cola);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, pendientes: cola.length }));
      return;
    }
    if (req.method === "POST" && url.pathname === "/api/cola-offline/sincronizar") {
      // La web reintenta el envío a Supabase/DIAN; aquí solo se reporta lo pendiente.
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, pendientes: leerCola().length, nota: "La sincronización la hace la web al volver internet." }));
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "Ruta no encontrada" }));
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: false, error: "Error interno" }));
  }
});

server.listen(PUERTO, "127.0.0.1", () => {
  // Listo: la app de escritorio lo arranca sola, no hay que abrir nada a mano.
});
