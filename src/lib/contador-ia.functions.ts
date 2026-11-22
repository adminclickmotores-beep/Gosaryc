/**
 * Cerebro Contador IA: actualizador normativo (2026+) y asesor tributarista.
 * Usa la llave gratuita de Gemini si existe; si no, la IA integrada de Lovable.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAiQuota } from "@/lib/ai-quota.server";

import { chatConRespaldo } from "@/lib/ia-motores";
import { responderConCodigo } from "@/lib/gemini-nativo.server";

const SISTEMA_ASESOR = `Eres un Contador Público y tributarista colombiano actualizado a 2026. Hablas claro y en español sencillo para dueños de negocio que no son contadores.
Reglas:
• Analizas las cifras reales del negocio que te doy y adviertes riesgos de sanción (extemporaneidad, intereses, retefuente sin pago).
• Recuerdas los criterios que el usuario te enseñe en esta conversación y los aplicas en tus respuestas.
• Siempre cierras recordando que confirmen con su contador antes de declarar.
• Respuestas cortas (máximo 150 palabras), sin tecnicismos innecesarios.`;

type Novedad = { titulo: string; resumen: string; fuente: string; vigencia: string | null };

// Contador Pro: razonamiento experto (Gemini 2.5 Pro) con respaldo automático.
const llamarContador = (body: Record<string, unknown>) =>
  chatConRespaldo({ geminiKey: process.env.GEMINI_API_KEY, lovableKey: process.env.LOVABLE_API_KEY, uso: "contador", body });
const hayLlave = () => Boolean(process.env.GEMINI_API_KEY || process.env.LOVABLE_API_KEY);

/** Consulta cambios recientes (UVT, decretos, topes, resoluciones DIAN) y los guarda. */
export const actualizarNormativa = createServerFn({ method: "POST" })
  .inputValidator((d: { anio?: number }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ uvt: number | null; total: number; novedades: Novedad[] }> => {
    await assertAiQuota(context.supabase, "contador-normativa");
    if (!hayLlave()) throw new Error("La IA todavía no está configurada.");

    const anio = data.anio ?? new Date().getFullYear();
    const { res: resp } = await llamarContador({
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
    });
    if (!resp) throw new Error("No se pudo conectar con el servicio de IA.");
    const res = resp;
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
  .inputValidator((d: { messages: MensajeContador[]; cifras: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ respuesta: string }> => {
    await assertAiQuota(context.supabase, "contador-asesor");
    if (!hayLlave()) throw new Error("La IA todavía no está configurada.");

    const historial = (Array.isArray(data.messages) ? data.messages : [])
      .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
      .map((m) => (m.role === "assistant" ? "[Respuesta anterior mostrada en pantalla, no verificada] " : "") + m.content.slice(0, 2000))
      .slice(-10);
    // Primero con ejecución de código nativa: liquidaciones y proyecciones exactas.
    const conCodigo = await responderConCodigo({
      sistema: `${SISTEMA_ASESOR}\n• Para cualquier cálculo (impuestos, retenciones, intereses, proyecciones) ejecuta código y usa ese resultado exacto.`,
      turnos: [
        { role: "user", parts: [{ text: `Cifras reales del negocio:\n${data.cifras}` }] },
        ...historial.map((t) => ({ role: "user" as const, parts: [{ text: t }] })),
      ],
    });
    if (conCodigo) return { respuesta: conCodigo };

    const { res: resp } = await llamarContador({
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
            // El historial viene del navegador: se trata siempre como texto del usuario, nunca como palabra del contador.
            .map((m) => ({
              role: "user" as const,
              content: (m.role === "assistant" ? "[Respuesta anterior mostrada en pantalla, no verificada] " : "") + m.content.slice(0, 2000),
            }))
            .slice(-10),
        ],
    });
    if (!resp) throw new Error("No se pudo conectar con el servicio de IA.");
    const res = resp;
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
