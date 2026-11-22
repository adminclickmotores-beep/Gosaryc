/**
 * sst-normativa-actualizar: verifica con IA el catálogo de normas SST de Colombia (2026)
 * y lo guarda en la base de conocimiento del negocio con sello de fecha y estado Vigente.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAiQuota } from "@/lib/ai-quota.server";
import { CATALOGO_SST_2026 } from "@/lib/sst-normativa";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-2.5-flash";

type Verificacion = { codigo: string; resumen?: string; nota?: string };

export const sstNormativaActualizar = createServerFn({ method: "POST" })
  .inputValidator((d: { anio?: number } | undefined) => ({ anio: typeof d?.anio === "number" ? d.anio : new Date().getFullYear() }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ total: number; verificadaIA: boolean }> => {
    const { data: ownerId } = await context.supabase.rpc("mi_negocio_id");
    if (!ownerId) throw new Error("No se encontró tu negocio.");

    // Normas sectoriales que el usuario ya agregó: también se verifican.
    const { data: extra } = await context.supabase
      .from("sst_normas")
      .select("codigo,titulo,tema,resumen,fuente")
      .eq("owner_id", ownerId)
      .neq("origen", "base");
    const lista = [...CATALOGO_SST_2026, ...(extra ?? [])];

    let verificaciones: Verificacion[] = [];
    let verificadaIA = false;
    const geminiKey = process.env.GEMINI_API_KEY;
    const llave = geminiKey || process.env.LOVABLE_API_KEY;
    if (llave) {
      try {
        await assertAiQuota(context.supabase, "sst-normativa");
        const res = await fetch(geminiKey ? GEMINI_ENDPOINT : GATEWAY, {
          method: "POST",
          headers: { Authorization: `Bearer ${llave}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: geminiKey ? GEMINI_MODEL : MODEL,
            messages: [
              { role: "system", content: "Eres un asesor experto en Seguridad y Salud en el Trabajo en Colombia. Devuelves SOLO datos estructurados con la función return_normas." },
              {
                role: "user",
                content: `Verifica estas normas SST para ${data.anio} en Colombia. Para cada una devuelve su código tal cual, un resumen actualizado de máximo 2 frases y una nota breve solo si fue modificada o complementada (de lo contrario déjala vacía).\n${lista.map((n) => `- ${n.codigo}: ${n.titulo}`).join("\n")}`,
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "return_normas",
                  parameters: {
                    type: "object",
                    properties: {
                      normas: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: { codigo: { type: "string" }, resumen: { type: "string" }, nota: { type: "string" } },
                          required: ["codigo", "resumen"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["normas"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "return_normas" } },
          }),
        });
        if (res.ok) {
          const json = (await res.json()) as { choices?: Array<{ message?: { tool_calls?: Array<{ function?: { arguments?: string } }> } }> };
          const args = json.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          if (args) {
            const parsed = JSON.parse(args) as { normas?: Verificacion[] };
            verificaciones = Array.isArray(parsed.normas) ? parsed.normas : [];
            verificadaIA = verificaciones.length > 0;
          }
        }
      } catch {
        // Si la IA no responde se guarda igual el catálogo base con la fecha de hoy.
      }
    }

    const ahora = new Date().toISOString();
    const filas = lista.map((n) => {
      const v = verificaciones.find((x) => x.codigo === n.codigo);
      const esBase = CATALOGO_SST_2026.some((b) => b.codigo === n.codigo);
      return {
        owner_id: ownerId,
        codigo: n.codigo,
        titulo: n.titulo.slice(0, 200),
        tema: n.tema,
        resumen: (v?.resumen?.trim() || n.resumen).slice(0, 1200),
        fuente: n.fuente,
        estado: "Vigente",
        origen: esBase ? "base" : "sectorial",
        nota: v?.nota?.trim() ? v.nota.trim().slice(0, 500) : null,
        ultima_actualizacion: ahora,
      };
    });
    const { error } = await context.supabase.from("sst_normas").upsert(filas, { onConflict: "owner_id,codigo" });
    if (error) throw new Error("No se pudo guardar la normativa.");
    return { total: filas.length, verificadaIA };
  });
