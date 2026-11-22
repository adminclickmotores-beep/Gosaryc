// Modo Comandos Operativos por WhatsApp (solo servidor).
// Números autorizados -> Gemini extrae la acción -> vista previa -> "SÍ" -> se guarda en el negocio.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { llamarIA } from "@/lib/agente-cliente.server";

export type ArchivoComando = { mime: string; base64: string };
export type EntradaComando = {
  negocioId: string;
  telefono: string;
  nombreContacto?: string;
  texto: string;
  imagenes: ArchivoComando[];
  audios: ArchivoComando[];
};
export type SalidaComando = { modo: "cliente" | "comando"; respuesta: string };

type Autorizado = {
  id: string;
  telefono: string;
  nombre: string;
  puede_inventario: boolean;
  puede_facturar: boolean;
  puede_pedidos: boolean;
  puede_reportes: boolean;
};

type Linea = { nombre?: string; cantidad?: number | string; precio?: number | string };
type Entidades = {
  accion?: string;
  consulta?: string;
  nombre?: string;
  cantidad?: number | string;
  costo?: number | string;
  precio?: number | string;
  descripcion?: string;
  marca?: string;
  modelo?: string;
  version?: string;
  anio?: number | string;
  kilometraje?: number | string;
  placa?: string;
  color?: string;
  cliente_nombre?: string;
  cliente_telefono?: string;
  direccion?: string;
  barrio?: string;
  notas?: string;
  metodo_pago?: string;
  modalidad?: string;
  items?: Linea[];
};

type LineaResuelta = { producto_id: string; nombre: string; cantidad: number; precio: number; stock: number | null };
type Pendiente = {
  accion: "crear_inventario" | "crear_vehiculo" | "pedido" | "factura";
  datos: Entidades;
  lineas: LineaResuelta[];
  fotos: string[];
  total: number;
};

const BUCKET_FOTOS = "vehiculos_fotos";
const MIN_VIGENCIA_MS = 30 * 60 * 1000;
const SI = /^(si|sí|s|ok|okay|dale|confirmo|confirmado|listo|de una|correcto|yes)$/;
const NO = /^(no|cancelar|cancela|cancelado|nel|descartar)$/;

const normalizar = (t: string): string =>
  t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const digitos = (t: string): string => t.replace(/\D/g, "");

function num(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v !== "string") return 0;
  const limpio = v.replace(/[^\d,.-]/g, "");
  if (!limpio) return 0;
  // 11.500.000 o 11,500,000 -> miles; 12,5 -> decimal.
  const conMiles = limpio.replace(/[.,](?=\d{3}(\D|$))/g, "");
  const n = Number(conMiles.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

const dinero = (n: number): string => `$${Math.round(n).toLocaleString("es-CO")}`;

function fechaBogota(d = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
}

function inicioDiaBogota(fecha: string): string {
  return new Date(`${fecha}T00:00:00-05:00`).toISOString();
}

function leerJson(texto: string): Entidades | null {
  const limpio = texto.replace(/```json|```/gi, "").trim();
  const ini = limpio.indexOf("{");
  const fin = limpio.lastIndexOf("}");
  if (ini < 0 || fin <= ini) return null;
  try {
    const o = JSON.parse(limpio.slice(ini, fin + 1)) as unknown;
    return o && typeof o === "object" ? (o as Entidades) : null;
  } catch {
    return null;
  }
}

/** Transcribe una nota de voz con Gemini (solo si hay llave de Gemini). */
export async function transcribirAudio(audio: ArchivoComando): Promise<string> {
  return transcribir(audio);
}

async function transcribir(audio: ArchivoComando): Promise<string> {
  const llave = process.env.GEMINI_API_KEY;
  if (!llave) return "";
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": llave },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: "Transcribe literalmente este audio en español. Responde solo con la transcripción." },
              { inline_data: { mime_type: audio.mime.split(";")[0] || "audio/ogg", data: audio.base64 } },
            ],
          },
        ],
      }),
    });
    if (!r.ok) return "";
    const j = (await r.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return (j.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim().slice(0, 2000);
  } catch {
    return "";
  }
}

async function extraer(texto: string, tipoNegocio: string): Promise<Entidades | null> {
  const hoy = fechaBogota();
  const sistema = `Eres el extractor de comandos operativos de un negocio (${tipoNegocio || "comercio"}). Hoy es ${hoy}. El mensaje viene del dueño o de un encargado por WhatsApp.
Responde SOLO un JSON válido, sin texto extra, con esta forma:
{"accion":"crear_inventario|crear_vehiculo|pedido|factura|consulta|ninguna",
 "consulta":"ventas_hoy|ventas_semana|agotados|cartera_vencida|pedidos_pendientes|ninguna",
 "nombre":"","cantidad":0,"costo":0,"precio":0,"descripcion":"",
 "marca":"","modelo":"","version":"","anio":0,"kilometraje":0,"placa":"","color":"",
 "cliente_nombre":"","cliente_telefono":"","direccion":"","barrio":"","notas":"","metodo_pago":"efectivo|nequi|daviplata|bre-b|tarjeta","modalidad":"mesa|recoger|domicilio",
 "items":[{"nombre":"","cantidad":1,"precio":0}]}
Reglas: crear_inventario = agregar productos/mercancía (nombre, cantidad, costo, precio de venta). crear_vehiculo = subir un vehículo o moto (marca, modelo, año, kilometraje, placa, precio). pedido = montar un pedido/comanda de un cliente. factura = facturar o registrar una venta ya pagada. consulta = preguntas sobre ventas, agotados o cartera. Si el mensaje es una conversación normal de cliente, un saludo o no es una orden operativa, usa "ninguna". Los precios están en pesos colombianos sin decimales (11.500.000 = 11500000). Notas de pedido (sin cebolla, acompañantes) van en "notas".`;
  const salida = await llamarIA([
    { role: "system", content: sistema },
    { role: "user", content: texto.slice(0, 3000) },
  ]);
  return salida ? leerJson(salida) : null;
}

async function buscarAutorizado(ownerId: string, telefono: string): Promise<Autorizado | null> {
  const { data } = await supabaseAdmin
    .from("whatsapp_comandos_autorizados")
    .select("id,telefono,nombre,puede_inventario,puede_facturar,puede_pedidos,puede_reportes")
    .eq("owner_id", ownerId)
    .eq("activo", true);
  const buscado = digitos(telefono).slice(-10);
  if (buscado.length < 7) return null;
  return (data ?? []).find((a) => digitos(a.telefono).slice(-10) === buscado) ?? null;
}

type ProductoFila = { id: string; nombre: string; precio: number; stock_actual: number | null };

function buscarProducto(lista: ProductoFila[], pedido: string): ProductoFila | null {
  const q = normalizar(pedido);
  if (!q) return null;
  const exacto = lista.find((p) => normalizar(p.nombre) === q);
  if (exacto) return exacto;
  const palabras = q.split(" ").filter((w) => w.length >= 3);
  let mejor: ProductoFila | null = null;
  let puntos = 0;
  for (const p of lista) {
    const n = normalizar(p.nombre);
    let s = 0;
    if (n.includes(q) || q.includes(n)) s += 3;
    for (const w of palabras) if (n.includes(w)) s += 1;
    if (s > puntos) {
      puntos = s;
      mejor = p;
    }
  }
  return puntos >= Math.max(1, Math.min(2, palabras.length)) ? mejor : null;
}

async function subirFotos(ownerId: string, imagenes: ArchivoComando[]): Promise<string[]> {
  const rutas: string[] = [];
  for (const img of imagenes.slice(0, 6)) {
    const ext = (img.mime.split("/")[1] ?? "jpg").split(";")[0].replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
    const ruta = `${ownerId}/whatsapp/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const bytes = Uint8Array.from(atob(img.base64), (c) => c.charCodeAt(0));
    const { error } = await supabaseAdmin.storage.from(BUCKET_FOTOS).upload(ruta, bytes, { contentType: img.mime.split(";")[0] || "image/jpeg" });
    if (!error) rutas.push(ruta);
  }
  return rutas;
}

async function registrar(
  ownerId: string,
  quien: { telefono: string; nombre: string },
  campos: { accion: string; texto: string; entidades: Json; vista: string; estado: string; resultado?: string },
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("whatsapp_comandos_ejecutados")
    .insert({
      owner_id: ownerId,
      telefono: quien.telefono,
      nombre: quien.nombre,
      accion: campos.accion,
      texto_original: campos.texto.slice(0, 4000),
      entidades: campos.entidades,
      vista_previa: campos.vista.slice(0, 3000),
      estado: campos.estado,
      resultado: (campos.resultado ?? "").slice(0, 2000),
      ejecutado_en: campos.estado === "consulta" ? new Date().toISOString() : null,
    })
    .select("id")
    .maybeSingle();
  return data?.id ?? null;
}

// ---------- Consultas ejecutivas ----------
async function responderConsulta(ownerId: string, tipo: string): Promise<string> {
  const hoy = fechaBogota();
  if (tipo === "ventas_hoy" || tipo === "ventas_semana") {
    const desde = tipo === "ventas_hoy" ? inicioDiaBogota(hoy) : inicioDiaBogota(fechaBogota(new Date(Date.now() - 6 * 86400000)));
    const { data } = await supabaseAdmin
      .from("restaurante_pedidos")
      .select("total,estado,pago_estado")
      .eq("owner_id", ownerId)
      .gte("created_at", desde)
      .neq("estado", "cancelado")
      .limit(5000);
    const lista = data ?? [];
    const pagadas = lista.filter((p) => p.pago_estado === "pagado" || p.estado === "entregado");
    const total = pagadas.reduce((s, p) => s + Number(p.total ?? 0), 0);
    const pendientes = lista.length - pagadas.length;
    return `${tipo === "ventas_hoy" ? "Ventas de hoy" : "Ventas de los últimos 7 días"}: ${dinero(total)} en ${pagadas.length} ${pagadas.length === 1 ? "venta" : "ventas"}.${pendientes > 0 ? ` Además hay ${pendientes} por cobrar o en proceso.` : ""}`;
  }
  if (tipo === "agotados") {
    const { data } = await supabaseAdmin
      .from("restaurante_productos")
      .select("nombre,stock_actual")
      .eq("owner_id", ownerId)
      .eq("activo", true)
      .not("stock_actual", "is", null)
      .lte("stock_actual", 0)
      .order("nombre")
      .limit(40);
    const lista = data ?? [];
    if (lista.length === 0) return "No hay productos agotados. Todo tiene existencias.";
    return `Productos agotados (${lista.length}):\n${lista.map((p) => `• ${p.nombre}`).join("\n")}`;
  }
  if (tipo === "cartera_vencida") {
    const { data } = await supabaseAdmin
      .from("fiados")
      .select("titulo,contacto,monto,abonado,fecha,estado,anulado")
      .eq("owner_id", ownerId)
      .eq("anulado", false)
      .limit(1000);
    const abiertas = (data ?? [])
      .map((f) => ({ ...f, saldo: Number(f.monto ?? 0) - Number(f.abonado ?? 0) }))
      .filter((f) => f.saldo > 0 && f.estado !== "pagado" && f.estado !== "pagada");
    if (abiertas.length === 0) return "No hay cuentas por cobrar pendientes.";
    const vencidas = abiertas.filter((f) => f.fecha && f.fecha < hoy);
    const base = vencidas.length > 0 ? vencidas : abiertas;
    const total = base.reduce((s, f) => s + f.saldo, 0);
    const top = base.sort((a, b) => b.saldo - a.saldo).slice(0, 8);
    return `${vencidas.length > 0 ? "Cartera vencida" : "Cuentas por cobrar"}: ${dinero(total)} en ${base.length} ${base.length === 1 ? "cuenta" : "cuentas"}.\n${top.map((f) => `• ${f.contacto || f.titulo}: ${dinero(f.saldo)}`).join("\n")}`;
  }
  if (tipo === "pedidos_pendientes") {
    const { data } = await supabaseAdmin
      .from("restaurante_pedidos")
      .select("cliente_nombre,total,estado")
      .eq("owner_id", ownerId)
      .in("estado", ["nuevo", "preparando", "listo", "en_camino"])
      .order("created_at", { ascending: false })
      .limit(15);
    const lista = data ?? [];
    if (lista.length === 0) return "No hay pedidos pendientes.";
    return `Pedidos pendientes (${lista.length}):\n${lista.map((p) => `• ${p.cliente_nombre} · ${dinero(Number(p.total ?? 0))} · ${p.estado}`).join("\n")}`;
  }
  return "No entendí qué quieres consultar. Prueba con: «¿Cuánto hemos vendido hoy?», «¿Qué productos están agotados?» o «Resumen de cartera vencida».";
}

// ---------- Armado de la vista previa ----------
async function armarPendiente(
  ownerId: string,
  ent: Entidades,
  fotos: string[],
  tipoNegocio: string,
): Promise<{ pendiente: Pendiente | null; vista: string }> {
  const accion = String(ent.accion ?? "");
  if (accion === "crear_vehiculo") {
    const marca = String(ent.marca ?? "").trim();
    const modelo = String(ent.modelo ?? "").trim();
    const precio = num(ent.precio);
    if (!marca || !modelo || precio <= 0) {
      return { pendiente: null, vista: "Para subir el vehículo necesito al menos marca, modelo y precio. Envíamelo de nuevo, por ejemplo: «Subir Suzuki GSX-S150 2027, 6.500 km, placa ABC-12D, $11.500.000»." };
    }
    const datos: Entidades = { ...ent, marca, modelo, precio, anio: num(ent.anio), kilometraje: num(ent.kilometraje) };
    const vista = `Entendí que quieres subir este vehículo:\n• ${marca} ${modelo}${ent.version ? ` ${ent.version}` : ""}${num(ent.anio) ? ` ${num(ent.anio)}` : ""}\n• Kilometraje: ${num(ent.kilometraje).toLocaleString("es-CO")} km\n• Placa: ${String(ent.placa ?? "—").toUpperCase() || "—"}\n• Precio: ${dinero(precio)}\n• Fotos: ${fotos.length}\nSe publicará como disponible de inmediato.`;
    return { pendiente: { accion: "crear_vehiculo", datos, lineas: [], fotos, total: precio }, vista };
  }
  if (accion === "crear_inventario") {
    const nombre = String(ent.nombre ?? "").trim();
    const precio = num(ent.precio);
    if (!nombre || precio <= 0) {
      return { pendiente: null, vista: "Para crear el producto necesito el nombre y el precio de venta. Ejemplo: «Agregar 50 bultos cemento costo 28.000 venta 33.500»." };
    }
    const cantidad = Math.max(0, num(ent.cantidad));
    const datos: Entidades = { ...ent, nombre, precio, cantidad, costo: num(ent.costo) };
    const vista = `Entendí que quieres crear este producto:\n• ${nombre}\n• Cantidad: ${cantidad}\n${num(ent.costo) > 0 ? `• Costo: ${dinero(num(ent.costo))}\n` : ""}• Precio de venta: ${dinero(precio)}\n• Fotos: ${fotos.length}\nQuedará activo en el inventario.`;
    return { pendiente: { accion: "crear_inventario", datos, lineas: [], fotos, total: precio * cantidad }, vista };
  }
  if (accion === "pedido" || accion === "factura") {
    const items = (Array.isArray(ent.items) ? ent.items : []).filter((i) => String(i?.nombre ?? "").trim());
    if (items.length === 0) return { pendiente: null, vista: "No entendí qué productos lleva. Dime, por ejemplo: «Pedido para Juan, 2 hamburguesas y 1 gaseosa, Calle 5 #3-20, paga en efectivo»." };
    const { data: prods } = await supabaseAdmin
      .from("restaurante_productos")
      .select("id,nombre,precio,stock_actual")
      .eq("owner_id", ownerId)
      .eq("activo", true)
      .limit(2000);
    const lista: ProductoFila[] = (prods ?? []).map((p) => ({ id: p.id, nombre: p.nombre, precio: Number(p.precio ?? 0), stock_actual: p.stock_actual === null ? null : Number(p.stock_actual) }));
    const lineas: LineaResuelta[] = [];
    const faltan: string[] = [];
    const sinStock: string[] = [];
    for (const it of items) {
      const prod = buscarProducto(lista, String(it.nombre));
      const cantidad = Math.max(1, Math.round(num(it.cantidad) || 1));
      if (!prod) {
        faltan.push(String(it.nombre));
        continue;
      }
      if (accion === "factura" && prod.stock_actual !== null && prod.stock_actual < cantidad) sinStock.push(`${prod.nombre} (hay ${prod.stock_actual})`);
      lineas.push({ producto_id: prod.id, nombre: prod.nombre, cantidad, precio: prod.precio, stock: prod.stock_actual });
    }
    if (faltan.length > 0) return { pendiente: null, vista: `No encontré en tu inventario: ${faltan.join(", ")}. Revisa el nombre o créalo primero («Agregar ...»).` };
    if (sinStock.length > 0) return { pendiente: null, vista: `No alcanza el inventario para facturar: ${sinStock.join(", ")}.` };
    const total = lineas.reduce((s, l) => s + l.precio * l.cantidad, 0);
    const modalidad = ["mesa", "recoger", "domicilio"].includes(String(ent.modalidad)) ? String(ent.modalidad) : String(ent.direccion ?? "").trim() ? "domicilio" : "recoger";
    const metodo = ["efectivo", "nequi", "daviplata", "bre-b", "tarjeta", "transferencia"].includes(String(ent.metodo_pago)) ? String(ent.metodo_pago) : "efectivo";
    const datos: Entidades = { ...ent, modalidad, metodo_pago: metodo };
    const cliente = String(ent.cliente_nombre ?? "").trim() || "Cliente WhatsApp";
    const vista = `Entendí ${accion === "factura" ? "esta venta para facturar" : "este pedido"}:\n• Cliente: ${cliente}\n${String(ent.direccion ?? "").trim() ? `• Dirección: ${String(ent.direccion).trim()}\n` : ""}${lineas.map((l) => `• ${l.cantidad} x ${l.nombre} — ${dinero(l.precio * l.cantidad)}`).join("\n")}\n${String(ent.notas ?? "").trim() ? `• Notas: ${String(ent.notas).trim()}\n` : ""}• Pago: ${metodo}\n• Total: ${dinero(total)}\n${accion === "factura" ? "Se registrará en Caja y Contabilidad." : "Irá a Pedidos y Cocina."}`;
    void tipoNegocio;
    return { pendiente: { accion: accion as "pedido" | "factura", datos, lineas, fotos, total }, vista };
  }
  return { pendiente: null, vista: "" };
}

// ---------- Ejecución tras el "SÍ" ----------
async function ejecutar(ownerId: string, tipoNegocio: string, quien: Autorizado, p: Pendiente): Promise<string> {
  const d = p.datos;
  if (p.accion === "crear_vehiculo") {
    const { data, error } = await supabaseAdmin
      .from("vehiculos_inventario")
      .insert({
        owner_id: ownerId,
        marca: String(d.marca ?? ""),
        modelo: String(d.modelo ?? ""),
        version: String(d.version ?? "").trim() || null,
        anio: num(d.anio) || null,
        kilometraje: num(d.kilometraje) || null,
        placa: String(d.placa ?? "").trim().toUpperCase() || null,
        color: String(d.color ?? "").trim() || null,
        precio: num(d.precio),
        observaciones: String(d.descripcion ?? "").trim() || "Creado por WhatsApp",
        fotos: p.fotos,
        estado: "disponible",
        fecha_ingreso: fechaBogota(),
      })
      .select("id")
      .maybeSingle();
    if (error || !data) throw new Error(error?.message ?? "No se pudo crear el vehículo");
    return `Vehículo publicado: ${d.marca} ${d.modelo} por ${dinero(num(d.precio))}, con ${p.fotos.length} ${p.fotos.length === 1 ? "foto" : "fotos"}.`;
  }
  if (p.accion === "crear_inventario") {
    const nombre = String(d.nombre ?? "");
    const cantidad = Math.max(0, num(d.cantidad));
    const costo = num(d.costo);
    const descripcion = [String(d.descripcion ?? "").trim(), costo > 0 ? `Costo: ${dinero(costo)}` : ""].filter(Boolean).join(" · ");
    const { data: existente } = await supabaseAdmin
      .from("restaurante_productos")
      .select("id,stock_actual")
      .eq("owner_id", ownerId)
      .ilike("nombre", nombre)
      .maybeSingle();
    if (existente) {
      const nuevo = Number(existente.stock_actual ?? 0) + cantidad;
      const { error } = await supabaseAdmin
        .from("restaurante_productos")
        .update({ stock_actual: nuevo, precio: num(d.precio), activo: true })
        .eq("id", existente.id)
        .eq("owner_id", ownerId);
      if (error) throw new Error(error.message);
      if (cantidad > 0) {
        await supabaseAdmin.from("restaurante_productos_kardex").insert({
          owner_id: ownerId, producto_id: existente.id, tipo: "entrada", delta: cantidad, stock_resultante: nuevo, motivo: "Entrada por WhatsApp",
        });
      }
      return `${nombre} ya existía: ahora tiene ${nuevo} unidades a ${dinero(num(d.precio))}.`;
    }
    const { data, error } = await supabaseAdmin
      .from("restaurante_productos")
      .insert({
        owner_id: ownerId,
        nombre,
        precio: num(d.precio),
        stock_actual: cantidad,
        descripcion: descripcion || null,
        imagen_url: null,
        activo: true,
        tipo_negocio: tipoNegocio || null,
      })
      .select("id")
      .maybeSingle();
    if (error || !data) throw new Error(error?.message ?? "No se pudo crear el producto");
    if (p.fotos.length > 0) {
      const { data: firmada } = await supabaseAdmin.storage.from(BUCKET_FOTOS).createSignedUrl(p.fotos[0], 60 * 60 * 24 * 365);
      if (firmada?.signedUrl) await supabaseAdmin.from("restaurante_productos").update({ imagen_url: firmada.signedUrl }).eq("id", data.id).eq("owner_id", ownerId);
    }
    if (cantidad > 0) {
      await supabaseAdmin.from("restaurante_productos_kardex").insert({
        owner_id: ownerId, producto_id: data.id, tipo: "entrada", delta: cantidad, stock_resultante: cantidad, motivo: "Entrada inicial por WhatsApp",
      });
    }
    return `Producto creado y activo: ${nombre}, ${cantidad} unidades a ${dinero(num(d.precio))}.`;
  }

  // pedido / factura
  const esFactura = p.accion === "factura";
  const telCliente = digitos(String(d.cliente_telefono ?? "")) || digitos(quien.telefono);
  const { data: pedido, error: errPedido } = await supabaseAdmin
    .from("restaurante_pedidos")
    .insert({
      owner_id: ownerId,
      cliente_nombre: String(d.cliente_nombre ?? "").trim() || "Cliente WhatsApp",
      cliente_telefono: telCliente.length >= 7 ? telCliente : "3000000000",
      direccion: String(d.direccion ?? "").trim() || null,
      barrio: String(d.barrio ?? "").trim() || null,
      notas: String(d.notas ?? "").trim() || null,
      canal: "whatsapp",
      modalidad: String(d.modalidad ?? "recoger"),
      metodo_pago: String(d.metodo_pago ?? "efectivo"),
      total: p.total,
    })
    .select("id,numero_factura")
    .maybeSingle();
  if (errPedido || !pedido) throw new Error(errPedido?.message ?? "No se pudo crear el pedido");
  const { error: errItems } = await supabaseAdmin.from("restaurante_pedido_items").insert(
    p.lineas.map((l) => ({ pedido_id: pedido.id, producto_id: l.producto_id, nombre: l.nombre, cantidad: l.cantidad, precio_unitario: l.precio })),
  );
  if (errItems) throw new Error(errItems.message);
  const corto = pedido.id.slice(0, 6).toUpperCase();
  if (!esFactura) {
    return `Pedido #${corto} enviado a Pedidos y Cocina. Total ${dinero(p.total)}.`;
  }
  await supabaseAdmin.from("restaurante_pedidos").update({ estado: "entregado", pago_estado: "pagado" }).eq("id", pedido.id).eq("owner_id", ownerId);
  for (const l of p.lineas) {
    if (l.stock === null) continue;
    const nuevo = Math.max(0, l.stock - l.cantidad);
    await supabaseAdmin.from("restaurante_productos").update({ stock_actual: nuevo }).eq("id", l.producto_id).eq("owner_id", ownerId);
    await supabaseAdmin.from("restaurante_productos_kardex").insert({
      owner_id: ownerId, producto_id: l.producto_id, pedido_id: pedido.id, tipo: "salida", delta: -l.cantidad, stock_resultante: nuevo, motivo: `Venta WhatsApp #${corto}`,
    });
  }
  const { error: errCaja } = await supabaseAdmin.from("restaurante_movimientos_caja").insert({
    owner_id: ownerId,
    tipo_negocio: tipoNegocio || null,
    tipo: "ingreso",
    concepto: `Venta #${corto} (${String(d.metodo_pago ?? "efectivo")}) por WhatsApp`,
    monto: p.total,
  } as never);
  if (errCaja) throw new Error(`La venta quedó creada pero no se registró en Caja: ${errCaja.message}`);
  const numero = pedido.numero_factura ? ` · factura Nº ${pedido.numero_factura}` : "";
  return `Venta #${corto}${numero} registrada y cobrada: ${dinero(p.total)}.\n${p.lineas.map((l) => `• ${l.cantidad} x ${l.nombre}`).join("\n")}\nQuedó en Caja y Contabilidad.`;
}

function permitido(a: Autorizado, accion: string): boolean {
  if (accion === "crear_inventario" || accion === "crear_vehiculo") return a.puede_inventario;
  if (accion === "factura") return a.puede_facturar;
  if (accion === "pedido") return a.puede_pedidos;
  if (accion === "consulta") return a.puede_reportes;
  return false;
}

const ETIQUETA_PERMISO: Record<string, string> = {
  crear_inventario: "Crear Inventario",
  crear_vehiculo: "Crear Inventario",
  factura: "Facturar",
  pedido: "Montar Pedidos",
  consulta: "Consultar Reportes",
};

export async function procesarComando(entrada: EntradaComando): Promise<SalidaComando> {
  const { data: neg } = await supabaseAdmin
    .from("negocio_config")
    .select("id,owner_id,tipo_negocio")
    .eq("id", entrada.negocioId)
    .maybeSingle();
  const ownerId = neg?.owner_id ?? null;
  if (!neg || !ownerId) return { modo: "cliente", respuesta: "" };
  const tipoNegocio = neg.tipo_negocio ?? "";

  const autorizado = await buscarAutorizado(ownerId, entrada.telefono);
  if (!autorizado) return { modo: "cliente", respuesta: "" };
  const quien = { telefono: autorizado.telefono, nombre: autorizado.nombre || entrada.nombreContacto || "" };

  // Notas de voz -> texto
  let texto = entrada.texto.trim();
  for (const audio of entrada.audios.slice(0, 2)) {
    const t = await transcribir(audio);
    if (t) texto = `${texto}\n${t}`.trim();
  }
  if (!texto && entrada.imagenes.length === 0) return { modo: "cliente", respuesta: "" };

  // ¿Hay algo pendiente de confirmar?
  const desde = new Date(Date.now() - MIN_VIGENCIA_MS).toISOString();
  const { data: pend } = await supabaseAdmin
    .from("whatsapp_comandos_ejecutados")
    .select("id,accion,entidades,created_at")
    .eq("owner_id", ownerId)
    .eq("telefono", quien.telefono)
    .eq("estado", "pendiente")
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const limpio = normalizar(texto);
  if (pend && entrada.imagenes.length === 0) {
    if (SI.test(limpio)) {
      const guardado = pend.entidades as unknown as Pendiente;
      try {
        const resultado = await ejecutar(ownerId, tipoNegocio, autorizado, guardado);
        await supabaseAdmin.from("whatsapp_comandos_ejecutados").update({ estado: "ejecutado", resultado, ejecutado_en: new Date().toISOString() }).eq("id", pend.id).eq("owner_id", ownerId);
        return { modo: "comando", respuesta: `✅ ${resultado}` };
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Error desconocido";
        await supabaseAdmin.from("whatsapp_comandos_ejecutados").update({ estado: "error", resultado: msg.slice(0, 500) }).eq("id", pend.id).eq("owner_id", ownerId);
        return { modo: "comando", respuesta: `No pude guardarlo: ${msg}. Revisa los datos y envíalo de nuevo.` };
      }
    }
    if (NO.test(limpio)) {
      await supabaseAdmin.from("whatsapp_comandos_ejecutados").update({ estado: "cancelado", resultado: "Cancelado por el usuario" }).eq("id", pend.id).eq("owner_id", ownerId);
      return { modo: "comando", respuesta: "Listo, cancelé el comando. No se guardó nada." };
    }
  }

  const ent = await extraer(texto || "Fotos del producto o vehículo a publicar", tipoNegocio);
  if (!ent || !ent.accion || ent.accion === "ninguna") {
    // Solo fotos sin descripción: avisamos en vez de tratarlo como cliente.
    if (entrada.imagenes.length > 0) {
      return { modo: "comando", respuesta: "Recibí las fotos. Envíame ahora la descripción, por ejemplo: «Subir Suzuki GSX-S150 2027, 6.500 km, placa ABC-12D, $11.500.000»." };
    }
    return { modo: "cliente", respuesta: "" };
  }
  const accion = String(ent.accion);
  if (!permitido(autorizado, accion)) {
    const txt = `No tienes permiso para esta acción (${ETIQUETA_PERMISO[accion] ?? accion}). Pídele al dueño que te lo active en WhatsApp IA → Números Autorizados.`;
    await registrar(ownerId, quien, { accion, texto, entidades: {}, vista: txt, estado: "error", resultado: "Sin permiso" });
    return { modo: "comando", respuesta: txt };
  }

  if (accion === "consulta") {
    const respuesta = await responderConsulta(ownerId, String(ent.consulta ?? "ninguna"));
    await registrar(ownerId, quien, { accion: `consulta:${ent.consulta ?? ""}`, texto, entidades: {}, vista: respuesta, estado: "consulta", resultado: respuesta });
    return { modo: "comando", respuesta };
  }

  const fotos = accion === "crear_inventario" || accion === "crear_vehiculo" ? await subirFotos(ownerId, entrada.imagenes) : [];
  const { pendiente, vista } = await armarPendiente(ownerId, ent, fotos, tipoNegocio);
  if (!pendiente) return { modo: "comando", respuesta: vista || "No entendí el comando. Intenta de nuevo con más detalle." };

  // Un comando nuevo reemplaza al pendiente anterior.
  if (pend) await supabaseAdmin.from("whatsapp_comandos_ejecutados").update({ estado: "cancelado", resultado: "Reemplazado por otro comando" }).eq("id", pend.id).eq("owner_id", ownerId);
  await registrar(ownerId, quien, { accion: pendiente.accion, texto, entidades: pendiente as unknown as Json, vista, estado: "pendiente" });
  return { modo: "comando", respuesta: `${vista}\n\nResponde *SÍ* (o *OK*) para confirmar y guardar, o *NO* para cancelar.` };
}
