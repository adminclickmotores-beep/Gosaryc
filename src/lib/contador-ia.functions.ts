/**
 * Cerebro Contador IA: actualizador normativo (2026+) y asesor tributarista.
 * Usa la llave gratuita de Gemini si existe; si no, la IA integrada de Lovable.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAiQuota } from "@/lib/ai-quota.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-2.5-flash";

type Novedad = { titulo: string; resumen: string; fuente: string; vigencia: string | null };

const destino = () => {
  const geminiKey = process.env.GEMINI_API_KEY;
  return {
    endpoint: geminiKey ? GEMINI_ENDPOINT : GATEWAY,
    modelo: geminiKey ? GEMINI_MODEL : MODEL,
    llave: geminiKey || process.env.LOVABLE_API_KEY,
  };
};

/** Consulta cambios recientes (UVT, decretos, topes, resoluciones DIAN) y los guarda. */
export const actualizarNormativa = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { anio?: number }) => d)
  .handler(async ({ data, context }): Promise<{ uvt: number | null; total: number; novedades: Novedad[] }> => {
    await assertAiQuota(context.supabase, "contador-normativa");
    const { endpoint, modelo, llave } = destino();
    if (!llave) throw new Error("La IA todavía no está configurada.");

    const anio = data.anio ?? new Date().getFullYear();
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${llave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelo,
        messages: [
          {
            role: "system",
            content:
              "Eres un investigador tributario colombiano. Devuelves SOLO datos estructurados con la función return_normativa, sin texto adicional.",
          },
          {
            role: "user",
            content: `Dame el valor de la UVT vigente en Colombia para ${anio} y hasta 6 novedades tributarias reales y recientes (decretos, resoluciones DIAN, topes de exógena, cambios de calendario o tarifas) que afecten a negocios pequeños en Colombia. Cada novedad con título corto, resumen claro de máximo 2 frases, fuente (DIAN, Ministerio de Hacienda, decreto o resolución con número si lo sabes) y fecha de vigencia. Devuélvelo con la función return_normativa.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_normativa",
              parameters: {
                type: "object",
                properties: {
                  uvt: { type: "number" },
                  novedades: {
                    type: "array",
                    maxItems: 6,
                    items: {
                      type: "object",
                      properties: {
                        titulo: { type: "string" },
                        resumen: { type: "string" },
                        fuente: { type: "string" },
                        vigencia: { type: "string" },
                      },
                      required: ["titulo", "resumen", "fuente"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["novedades"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_normativa" } },
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Hay muchas solicitudes. Intenta de nuevo en un momento.");
      if (res.status === 402) throw new Error("Se agotó el saldo de IA. Intenta más tarde.");
      throw new Error(`Error del servicio de IA (${res.status})`);
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }>;
    };
    const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) throw new Error("La IA no devolvió novedades.");
    const parsed = JSON.parse(args) as { uvt?: number; novedades: Novedad[] };

    let total = 0;
    for (const n of parsed.novedades ?? []) {
      if (!n.titulo || n.titulo.trim().length < 4) continue;
      const { error } = await context.supabase.from("novedades_normativas").insert({
        titulo: n.titulo.trim().slice(0, 140),
        resumen: (n.resumen ?? "").trim().slice(0, 900),
        fuente: (n.fuente ?? "IA Gosaryc").trim().slice(0, 140),
        vigencia_desde: n.vigencia && /^\d{4}-\d{2}-\d{2}/.test(n.vigencia) ? n.vigencia.slice(0, 10) : null,
        aplicada: false,
      });
      if (!error) total += 1;
    }
    return { uvt: typeof parsed.uvt === "number" ? parsed.uvt : null, total, novedades: parsed.novedades ?? [] };
  });

export type MensajeContador = { role: "user" | "assistant"; content: string };

/** Asesor contable: responde como tributarista colombiano con las cifras reales del negocio. */
export const asesorContable = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messages: MensajeContador[]; cifras: string }) => d)
  .handler(async ({ data, context }): Promise<{ respuesta: string }> => {
    await assertAiQuota(context.supabase, "contador-asesor");
    const { endpoint, modelo, llave } = destino();
    if (!llave) throw new Error("La IA todavía no está configurada.");

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${llave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelo,
        messages: [
          {
            role: "system",
            content: `Eres un Contador Público y tributarista colombiano actualizado a 2026. Hablas claro y en español sencillo para dueños de negocio que no son contadores.
Reglas:
• Analizas las cifras reales del negocio que te doy y adviertes riesgos de sanción (extemporaneidad, intereses, retefuente sin pago).
• Recuerdas los criterios que el usuario te enseñe en esta conversación y los aplicas en tus respuestas.
• Siempre cierras recordando que confirmen con su contador antes de declarar.
• Respuestas cortas (máximo 150 palabras), sin tecnicismos innecesarios.`,
          },
          { role: "user", content: `Cifras reales del negocio:\n${data.cifras}` },
          ...(Array.isArray(data.messages) ? data.messages : [])
            .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
            .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
            .slice(-10),
        ],
      }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("Hay muchas solicitudes. Intenta de nuevo en un momento.");
      if (res.status === 402) throw new Error("Se agotó el saldo de IA. Intenta más tarde.");
      throw new Error(`Error del servicio de IA (${res.status})`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const respuesta = json.choices?.[0]?.message?.content?.trim();
    if (!respuesta) throw new Error("La IA no devolvió respuesta.");
    return { respuesta };
  });
