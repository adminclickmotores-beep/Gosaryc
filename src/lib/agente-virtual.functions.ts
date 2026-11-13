import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAiQuota } from "@/lib/ai-quota.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

export type AgenteMensaje = { role: "user" | "assistant"; content: string };

// Asistente virtual general: sirve para cualquier tipo de negocio.
export const runAgenteVirtual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messages: AgenteMensaje[]; tipoNegocio?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertAiQuota(context.supabase, "agente-virtual");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("El asistente todavía no está configurado.");

    const tipo = typeof data.tipoNegocio === "string" && data.tipoNegocio.trim()
      ? data.tipoNegocio.trim().slice(0, 80)
      : "general";

    const system = `Eres el asistente virtual de un negocio (tipo: ${tipo}). Atiendes a clientes y al equipo por chat.
Responde en español de México, con tono amable y directo, en frases cortas.
Ayuda a: responder dudas sobre productos o servicios, explicar precios y formas de pago si se te indican, orientar al cliente para agendar, pedir o cotizar, y redactar mensajes de respuesta.
Reglas:
- No inventes precios, horarios, direcciones ni disponibilidad. Si no tienes el dato, dilo y sugiere hablar con una persona del equipo.
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

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: MODEL, messages }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("El asistente está ocupado. Intenta de nuevo en un momento.");
      if (res.status === 402) throw new Error("Se agotaron los créditos de IA del proyecto.");
      throw new Error("El asistente no respondió. Intenta de nuevo.");
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const texto = json.choices?.[0]?.message?.content?.trim() ?? "";
    return { texto: texto || "No pude responder en este momento. Intenta de nuevo." };
  });
