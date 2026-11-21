/**
 * Sugerencia de receta para el recetario del restaurante.
 *
 * Con el nombre del platillo, las porciones y el acompañamiento, la IA propone
 * los ingredientes (en las unidades del inventario) y la preparación paso a paso.
 * El usuario revisa todo antes de guardar.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAiQuota } from "@/lib/ai-quota.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type RecetaSugerida = {
  preparacion: string;
  ingredientes: { nombre: string; cantidad: number; unidad: string }[];
};

export const sugerirReceta = createServerFn({ method: "POST" })
  .inputValidator(
    (d: {
      platillo: string;
      porciones: number;
      acompanamiento: string;
      insumos: { nombre: string; unidad: string }[];
    }) => d,
  )
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<RecetaSugerida> => {
    await assertAiQuota(context.supabase, "recetas");
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const system = `Eres un chef de cocina y consultor de restaurantes en Colombia.
Dado un platillo, su número de porciones y su acompañamiento, propones:
  1) los ingredientes con la cantidad exacta para ESAS porciones
  2) la preparación paso a paso, corta y práctica para la cocina
Reglas:
  • Usa preferentemente los insumos del inventario que te doy (mismo nombre y misma unidad). Si necesitas algo que no está, puedes incluirlo con su nombre y unidad real.
  • Las cantidades deben ser realistas por porción (gramos, mililitros o unidades) y escaladas al número de porciones.
  • Incluye el acompañamiento como parte de la receta si lo indican.
  • Sé conciso: entre 4 y 8 pasos.`;

    const inventario =
      data.insumos.length > 0
        ? data.insumos.map((i) => `- ${i.nombre} (${i.unidad})`).join("\n")
        : "(sin inventario cargado)";

    const user = `Platillo: ${data.platillo}
Porciones: ${data.porciones}
Acompañamiento: ${data.acompanamiento || "ninguno"}

Inventario disponible:
${inventario}

Devuelve la receta con la función return_receta.`;

    const res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_receta",
              parameters: {
                type: "object",
                properties: {
                  preparacion: { type: "string", minLength: 30 },
                  ingredientes: {
                    type: "array",
                    minItems: 1,
                    maxItems: 25,
                    items: {
                      type: "object",
                      properties: {
                        nombre: { type: "string" },
                        cantidad: { type: "number" },
                        unidad: { type: "string", enum: ["g", "ml", "und"] },
                      },
                      required: ["nombre", "cantidad", "unidad"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["preparacion", "ingredientes"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_receta" } },
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
    if (!args) throw new Error("La IA no devolvió una receta");
    return JSON.parse(args) as RecetaSugerida;
  });
