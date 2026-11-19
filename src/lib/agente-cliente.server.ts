import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";
import { tarifasComoTexto } from "@/lib/tarifas-domicilio";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-2.5-flash";

export type MensajeCliente = { role: "user" | "assistant"; content: string };
export type RespuestaAgente = { texto: string; escalar: boolean };

export class ErrorAgente extends Error {
  estado: number;
  constructor(estado: number, mensaje: string) {
    super(mensaje);
    this.estado = estado;
  }
}

// Límite sencillo por clave: 40 respuestas por minuto.
const ventanas = new Map<string, number[]>();
function dentroDelLimite(clave: string): boolean {
  const ahora = Date.now();
  const lista = (ventanas.get(clave) ?? []).filter((t) => ahora - t < 60_000);
  if (lista.length >= 40) {
    ventanas.set(clave, lista);
    return false;
  }
  lista.push(ahora);
  ventanas.set(clave, lista);
  return true;
}

async function buscarAgente(clave: string) {
  if (!clave || clave.length < 20) throw new ErrorAgente(401, "Clave del agente inválida");
  if (!dentroDelLimite(clave)) throw new ErrorAgente(429, "Demasiados mensajes, intenta en un minuto");
  const { data: ag } = await supabaseAdmin
    .from("agente_whatsapp")
    .select("negocio_id,owner_id,activo,instrucciones,nombre_agente")
    .eq("clave", clave)
    .maybeSingle();
  if (!ag) throw new ErrorAgente(401, "Clave del agente inválida");
  if (!ag.activo) throw new ErrorAgente(403, "El agente está desactivado para este negocio");

  const { data: negocio, error: errorNegocio } = await supabaseAdmin
    .from("negocio_config")
    .select("id")
    .eq("id", ag.negocio_id)
    .eq("owner_id", ag.owner_id)
    .maybeSingle();

  if (errorNegocio || !negocio) {
    throw new ErrorAgente(403, "El agente no pertenece a un negocio autorizado");
  }

  return ag;
}

/** Llama a la IA (Gemini si hay llave, si no la IA integrada) y devuelve el texto. */
async function llamarIA(messages: Array<{ role: string; content: string }>): Promise<string> {
  const proveedores: Array<{ endpoint: string; key: string; model: string }> = [];
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) proveedores.push({ endpoint: GEMINI_ENDPOINT, key: geminiKey, model: GEMINI_MODEL });
  if (process.env.LOVABLE_API_KEY) proveedores.push({ endpoint: GATEWAY, key: process.env.LOVABLE_API_KEY, model: MODEL });
  if (proveedores.length === 0) throw new ErrorAgente(503, "El agente todavía no está configurado");
  for (const p of proveedores) {
    try {
      const r = await fetch(p.endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: p.model, messages }),
      });
      if (!r.ok) continue;
      const json = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const t = json.choices?.[0]?.message?.content?.trim() ?? "";
      if (t) return t;
    } catch {
      // se prueba el siguiente proveedor
    }
  }
  return "";
}

type DuenoMemoria = { negocio_id: string; owner_id: string };

async function guardarMemoria(ag: DuenoMemoria, tipo: "respuesta_dueno" | "patron", contenido: string): Promise<void> {
  const texto = contenido.trim().slice(0, 600);
  if (texto.length < 8) return;
  const { data: previo } = await supabaseAdmin
    .from("agente_memoria")
    .select("id,veces")
    .eq("negocio_id", ag.negocio_id)
    .eq("owner_id", ag.owner_id)
    .eq("tipo", tipo)
    .eq("contenido", texto)
    .maybeSingle();
  if (previo) {
    await supabaseAdmin
      .from("agente_memoria")
    .update({ veces: previo.veces + 1 })
    .eq("id", previo.id)
    .eq("negocio_id", ag.negocio_id)
    .eq("owner_id", ag.owner_id);
    return;
  }
  await supabaseAdmin.from("agente_memoria").insert({ negocio_id: ag.negocio_id, owner_id: ag.owner_id, tipo, contenido: texto });
  // Máximo 60 recuerdos por tipo: se olvidan los más viejos.
  const { data: sobrantes } = await supabaseAdmin
    .from("agente_memoria")
    .select("id")
    .eq("negocio_id", ag.negocio_id)
    .eq("owner_id", ag.owner_id)
    .eq("tipo", tipo)
    .order("veces", { ascending: false })
    .order("created_at", { ascending: false })
    .range(60, 200);
  const ids = (sobrantes ?? []).map((s) => s.id);
  if (ids.length > 0) {
    await supabaseAdmin
      .from("agente_memoria")
      .delete()
      .in("id", ids)
      .eq("negocio_id", ag.negocio_id)
      .eq("owner_id", ag.owner_id);
  }
}

/** El dueño respondió desde su celular: esa respuesta real se guarda como ejemplo de cómo atiende el negocio. */
export async function aprenderRespuestaDueno(clave: string, pregunta: string, respuesta: string): Promise<void> {
  const ag = await buscarAgente(clave);
  const p = String(pregunta || "").trim().slice(0, 250);
  const r = String(respuesta || "").trim().slice(0, 350);
  if (p.length < 3 || r.length < 3) return;
  await guardarMemoria(ag, "respuesta_dueno", `Cliente: ${p} → Dueño: ${r}`);
}

/** Saca de una conversación terminada pistas generales (dudas frecuentes, objeciones, lo que ayudó a cerrar). */
async function aprenderPatrones(ag: DuenoMemoria, historial: MensajeCliente[]): Promise<void> {
  const conversacion = historial
    .slice(-16)
    .map((m) => `${m.role === "user" ? "Cliente" : "Agente"}: ${m.content.slice(0, 300)}`)
    .join("\n");
  const salida = await llamarIA([
    {
      role: "system",
      content:
        "Analizas conversaciones de ventas por WhatsApp. Devuelve SOLO un arreglo JSON con 0 a 2 textos cortos en español (máx. 160 caracteres cada uno) con lecciones GENERALES y útiles para atender mejor la próxima vez: tipo de duda frecuente, objeción y cómo se resolvió, o qué ayudó a cerrar. Prohibido incluir nombres, teléfonos, direcciones, precios o datos personales. Si no hay nada útil devuelve [].",
    },
    { role: "user", content: conversacion },
  ]);
  const m = salida.match(/\[[\s\S]*\]/);
  if (!m) return;
  let lista: unknown;
  try {
    lista = JSON.parse(m[0]);
  } catch {
    return;
  }
  if (!Array.isArray(lista)) return;
  for (const item of lista.slice(0, 2)) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (t.length < 10 || t.length > 200 || /\d{6,}/.test(t)) continue;
    await guardarMemoria(ag, "patron", t);
  }
}

/** Responde a un cliente final de WhatsApp como agente de ventas, atención y asesoría del negocio. */
export async function responderComoAgente(clave: string, mensajes: MensajeCliente[]): Promise<RespuestaAgente> {
  const ag = await buscarAgente(clave);

  const { data: cfg } = await supabaseAdmin
    .from("negocio_config")
    .select("nombre,tipo_negocio,eslogan,descripcion,horarios,ciudad,cobertura,aviso_entrega,telefono_pedidos,whatsapp_cocina,instagram,sitio_web,moneda")
    .eq("id", ag.negocio_id)
    .eq("owner_id", ag.owner_id)
    .maybeSingle();

  const giro = resolverTipoNegocio(cfg?.tipo_negocio ?? null);
  const tipo = (cfg?.tipo_negocio || "general").trim().slice(0, 80);

  const { data: prods } = await supabaseAdmin
    .from("restaurante_productos")
    .select("nombre,precio,categoria_id,descripcion,tipo_negocio")
    .eq("owner_id", ag.owner_id)
    .eq("activo", true)
    .order("nombre")
    .limit(200);
  const productos = (prods ?? []).filter(
    (p) => !p.tipo_negocio || resolverTipoNegocio(p.tipo_negocio).clave === giro.clave,
  );
  const idsCat = Array.from(new Set(productos.map((p) => p.categoria_id).filter((x): x is string => !!x)));
  const nombreCat = new Map<string, string>();
  if (idsCat.length > 0) {
    const { data: cats } = await supabaseAdmin
      .from("restaurante_categorias")
      .select("id,nombre")
      .in("id", idsCat)
      .eq("owner_id", ag.owner_id);
    for (const c of cats ?? []) nombreCat.set(c.id, c.nombre);
  }
  const catalogo =
    productos.length > 0
      ? productos
          .map((p) => {
            const cat = p.categoria_id ? nombreCat.get(p.categoria_id) : undefined;
            const desc = p.descripcion ? ` — ${p.descripcion.slice(0, 120)}` : "";
            return `- ${p.nombre}${cat ? ` (${cat})` : ""}: ${Number(p.precio)}${desc}`;
          })
          .join("\n")
      : "No hay productos o servicios cargados. Si preguntan precios, di que una persona del equipo les confirma.";

  const dato = (etiqueta: string, v: string | null | undefined) =>
    `- ${etiqueta}: ${v && v.trim() ? v.trim().slice(0, 500) : "NO CONFIGURADO"}`;
  const perfil = [
    dato("Nombre del negocio", cfg?.nombre),
    dato("Tipo de negocio", tipo),
    dato("Eslogan", cfg?.eslogan),
    dato("Descripción", cfg?.descripcion),
    dato("Horarios de atención", cfg?.horarios),
    dato("Ciudad", cfg?.ciudad),
    dato("Cobertura / zonas de servicio", cfg?.cobertura),
    dato("Aviso de entrega", cfg?.aviso_entrega),
    dato("Teléfono", cfg?.telefono_pedidos),
    dato("WhatsApp", cfg?.whatsapp_cocina),
    dato("Instagram", cfg?.instagram),
    dato("Sitio web", cfg?.sitio_web),
    `- Moneda: ${cfg?.moneda ?? "COP"}`,
  ].join("\n");

  const usaTarifas = /restaur|comida|pizz|cafe|panader/i.test(tipo) || /yumbo/i.test(cfg?.ciudad ?? "");
  const domicilio = usaTarifas ? `Tarifas de domicilio por barrio o zona:\n${tarifasComoTexto()}` : "";

  const modulos = giro.modulos
    .map((m) => m.titulo)
    .filter((t, i, a) => t && a.indexOf(t) === i)
    .slice(0, 20)
    .join(", ");

  const nombreAgente = (ag.nombre_agente || "Asistente").slice(0, 40);
  const extra = ag.instrucciones?.trim() ? ag.instrucciones.trim().slice(0, 3000) : "";

  // Lo que el agente ha aprendido de este negocio (respuestas reales del dueño y patrones de conversaciones).
  const { data: memoria } = await supabaseAdmin
    .from("agente_memoria")
    .select("tipo,contenido,veces")
    .eq("negocio_id", ag.negocio_id)
    .eq("owner_id", ag.owner_id)
    .order("veces", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(40);
  const delDueno = (memoria ?? []).filter((x) => x.tipo === "respuesta_dueno").slice(0, 20).map((x) => `- ${x.contenido}`);
  const patrones = (memoria ?? []).filter((x) => x.tipo === "patron").slice(0, 15).map((x) => `- ${x.contenido}`);
  const aprendido =
    (delDueno.length
      ? `\nRespuestas REALES del dueño a clientes (son verdaderas; imita su tono, sus políticas y sus formas de responder cuando se parezca la pregunta):\n${delDueno.join("\n")}\n`
      : "") +
    (patrones.length
      ? `\nPatrones observados en conversaciones anteriores (son solo pistas para atender mejor; NO son datos del negocio ni sustituyen precios, horarios o políticas):\n${patrones.join("\n")}\n`
      : "");

  const system = `Eres ${nombreAgente}, la persona que atiende por WhatsApp a los CLIENTES de "${cfg?.nombre || "este negocio"}" (tipo de negocio: ${giro.panel}). Eres a la vez agente de servicio al cliente, asesor comercial y vendedor.
Escribes en español, con tono cálido, humano y profesional, mensajes cortos propios de WhatsApp (máximo 4 o 5 líneas, sin tablas ni títulos). Habla con el vocabulario profesional del tipo de negocio "${giro.panel}". Áreas del negocio: ${modulos || "atención general"}.

Cómo atender:
1. Saluda por el nombre del negocio la primera vez y pregunta en qué puedes ayudar.
2. Escucha la necesidad y haz UNA pregunta a la vez para entender qué busca, para quién, presupuesto o fecha si aplica.
3. Asesora: recomienda del catálogo lo que mejor encaje, explica en una frase por qué le conviene y sugiere un complemento o una opción superior cuando tenga sentido (venta cruzada), sin presionar.
4. Cierra la venta: cuando muestre interés, resume lo elegido con cantidades y total, confirma los datos que faltan (nombre, dirección o fecha/hora, forma de pago) y pregunta si lo confirmas. Si dudan, resuelve la objeción con datos reales del negocio y ofrece una alternativa.
5. Si el cliente desaparece o no decide, cierra amable dejando la puerta abierta.
6. Si el cliente tiene un reclamo, atiéndelo con empatía, pide los datos del caso y ofrece pasarlo con una persona.
7. Si piden hablar con una persona, tienen un caso que no puedes resolver, o ya confirmaron un pedido/cita/cotización que alguien debe gestionar, despídete avisando que una persona del equipo continúa y AÑADE al final de tu mensaje exactamente la marca [[ASESOR]] (el sistema la quita; el cliente no la ve).

Datos reales del negocio (única fuente de verdad):
${perfil}

Catálogo de productos y servicios con precios:
${catalogo}
${domicilio ? `\n${domicilio}\n` : ""}${aprendido}${extra ? `\nInstrucciones propias del dueño (tienen prioridad en el estilo y las políticas):\n${extra}\n` : ""}
Reglas:
- No inventes precios, horarios, direcciones, productos, promociones, descuentos ni disponibilidad. Si un dato dice NO CONFIGURADO o no está arriba, di que lo confirma una persona del equipo y usa [[ASESOR]] si es necesario para cerrar.
- No prometas lo que no puedas cumplir (tiempos exactos, garantías, descuentos) si no está en los datos.
- No pidas contraseñas ni datos de tarjeta; para pagos indica solo los medios que el negocio haya configurado o que una persona del equipo los comparte.
- Si escriben algo que nada tiene que ver con el negocio, responde con amabilidad en una línea y redirige a cómo puedes ayudarles.
- Nunca digas que eres una inteligencia artificial a menos que te lo pregunten directamente; en ese caso dilo con honestidad y ofrece pasar con una persona.
- Usa pocos emojis, solo si el cliente los usa.`;

  const historial = (Array.isArray(mensajes) ? mensajes : [])
    .slice(-24)
    .map((m) => ({
      role: (m?.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: typeof m?.content === "string" ? m.content.slice(0, 3000) : "",
    }))
    .filter((m) => m.content.trim().length > 0);
  if (historial.length === 0 || historial[historial.length - 1].role !== "user") {
    throw new ErrorAgente(400, "Falta el mensaje del cliente");
  }

  const texto = await llamarIA([{ role: "system", content: system }, ...historial]);
  if (!texto) throw new ErrorAgente(502, "El agente no pudo responder en este momento");

  const escalar = /\[\[ASESOR\]\]/i.test(texto);
  const limpio = texto.replace(/\[\[ASESOR\]\]/gi, "").trim();

  // Aprende de la conversación al terminar (pasa a una persona) o cada cierto número de mensajes.
  if (escalar || (historial.length >= 8 && historial.length % 8 < 2)) {
    try {
      await aprenderPatrones(ag, [...historial, { role: "assistant", content: limpio }]);
    } catch (e) {
      console.error("Agente: no se pudo aprender de la conversación", e);
    }
  }
  return { texto: limpio || "Un momento, una persona del equipo te atiende enseguida.", escalar };
}
