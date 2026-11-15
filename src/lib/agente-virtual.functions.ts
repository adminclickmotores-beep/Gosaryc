import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAiQuota } from "@/lib/ai-quota.server";
import { tarifasComoTexto } from "@/lib/tarifas-domicilio";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-2.5-flash";

export type AgenteMensaje = { role: "user" | "assistant"; content: string };

// Asistente virtual general: sirve para cualquier tipo de negocio.
export const runAgenteVirtual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messages: AgenteMensaje[]; tipoNegocio?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertAiQuota(context.supabase, "agente-virtual");

    // Si hay llave gratuita de Google Gemini, se usa esa; si no, la IA integrada de Lovable.
    const geminiKey = process.env.GEMINI_API_KEY;
    const apiKey = geminiKey || process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("El asistente todavía no está configurado.");
    const endpoint = geminiKey ? GEMINI_ENDPOINT : GATEWAY;
    const modelo = geminiKey ? GEMINI_MODEL : MODEL;

    // Catálogo real del negocio (RLS aplica: solo lo que este usuario puede ver).
    const [{ data: productos }, { data: categorias }] = await Promise.all([
      context.supabase
        .from("restaurante_productos")
        .select("nombre,precio,categoria_id")
        .eq("activo", true)
        .order("nombre")
        .limit(150),
      context.supabase.from("restaurante_categorias").select("id,nombre").eq("activa", true).order("orden"),
    ]);
    const nombreCat = new Map<string, string>(
      (categorias ?? []).map((c) => [c.id, c.nombre] as [string, string]),
    );
    const listaProductos = productos ?? [];
    const catalogo =
      listaProductos.length > 0
        ? "Catálogo actual (usa solo estos nombres y precios):\n" +
          listaProductos
            .map((p) => {
              const cat = p.categoria_id ? nombreCat.get(p.categoria_id) : undefined;
              return `- ${p.nombre}${cat ? ` (${cat})` : ""}: ${Number(p.precio)}`;
            })
            .join("\n")
        : "No hay productos cargados en el catálogo. Si preguntan por precios o productos, di que consulten con una persona del equipo.";

    const tipo = typeof data.tipoNegocio === "string" && data.tipoNegocio.trim()
      ? data.tipoNegocio.trim().slice(0, 80)
      : "general";

    const system = `Eres el asistente virtual de un negocio (tipo: ${tipo}). Atiendes a clientes y al equipo por chat.
Responde en español de México, con tono amable y directo, en frases cortas.
Ayuda a: responder dudas sobre productos o servicios, explicar precios y formas de pago si se te indican, orientar al cliente para agendar, pedir o cotizar, y redactar mensajes de respuesta.
${catalogo}

Costo del domicilio según el barrio o zona de entrega (tarifas unificadas Yumbo 2026, zona centro; servicio de 8am a 11pm todos los días). Si el pedido es a domicilio, pregunta el barrio, di cuánto cuesta el envío y súmalo al total:
${tarifasComoTexto()}
- Las carreras 25 a 27 cuestan $10.000, 27 a 31 $12.000, 32 a 34 $13.000, 35 a 37 $14.000 y 38 a 39 $15.000.
- Si el barrio no está en la lista, di que el costo lo confirma una persona del equipo.

Reglas:
- No inventes precios, horarios, direcciones ni disponibilidad. Los precios solo salen del catálogo y de las tarifas de domicilio de arriba. Si no tienes el dato, dilo y sugiere hablar con una persona del equipo.
- Para pedidos o citas, pide solo lo necesario: qué necesita, fecha u hora si aplica, nombre y teléfono.
- No pidas ni guardes datos sensibles como contraseñas o números de tarjeta.
- No uses emojis salvo que el usuario los use primero.`;

    const messages = [
      { role: "system", content: system },
      ...(Array.isArray(data.messages) ? data.messages : [])
        .slice(-30)
        .map((m) => ({
          role: (m?.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
          content: typeof m?.content === "string" ? m.content.slice(0, 4000) : "",
        })),
    ];

    // Proveedores en orden: si la llave de Gemini falla (llave inválida, modelo no disponible),
    // se prueba la IA integrada de Lovable antes de rendirse.
    const proveedores: Array<{ endpoint: string; key: string; model: string }> = [];
    if (geminiKey) proveedores.push({ endpoint: GEMINI_ENDPOINT, key: geminiKey, model: GEMINI_MODEL });
    if (process.env.LOVABLE_API_KEY) proveedores.push({ endpoint: GATEWAY, key: process.env.LOVABLE_API_KEY, model: MODEL });
    if (proveedores.length === 0) proveedores.push({ endpoint, key: apiKey, model: modelo });

    let res: Response | null = null;
    let ultimoEstado = 0;
    for (const p of proveedores) {
      try {
        const r = await fetch(p.endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: p.model, messages }),
        });
        if (r.ok) {
          res = r;
          break;
        }
        ultimoEstado = r.status;
        console.error("Asistente virtual: proveedor falló", p.model, r.status, (await r.text()).slice(0, 300));
      } catch (e) {
        console.error("Asistente virtual: error de red", e);
      }
    }
    if (!res) {
      if (ultimoEstado === 429) throw new Error("El asistente está ocupado o llegó al límite gratuito de hoy. Intenta de nuevo en un momento.");
      if (ultimoEstado === 402) throw new Error("Se agotaron los créditos de IA del proyecto.");
      throw new Error("El asistente no respondió. Intenta de nuevo.");
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const texto = json.choices?.[0]?.message?.content?.trim() ?? "";
    return { texto: texto || "No pude responder en este momento. Intenta de nuevo." };
  });
