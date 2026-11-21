/**
 * Actualizador normativo de Nómina (Colombia): consulta con IA los decretos
 * vigentes de SMMLV, auxilio de transporte, UVT o reforma laboral y crea la
 * vigencia nueva en parametros_nomina_colombia. El trigger de la base ajusta
 * solos los salarios anclados al SMMLV.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAiQuota } from "@/lib/ai-quota.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-2.5-flash";

const destino = () => {
  const geminiKey = process.env.GEMINI_API_KEY;
  return {
    endpoint: geminiKey ? GEMINI_ENDPOINT : GATEWAY,
    modelo: geminiKey ? GEMINI_MODEL : MODEL,
    llave: geminiKey || process.env.LOVABLE_API_KEY,
  };
};

type ParametrosIA = {
  smmlv: number;
  aux_transporte: number;
  jornada_semanal?: number;
  horas_mes?: number;
  rec_nocturno?: number;
  rec_dominical?: number;
  extra_diurna?: number;
  extra_nocturna?: number;
  vigencia_desde?: string;
  fuente_legal?: string;
};

export const actualizarParametrosNomina = createServerFn({ method: "POST" })
  .inputValidator((d: { forzar?: boolean }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ creada: boolean; mensaje: string; params: ParametrosIA | null }> => {
    await assertAiQuota(context.supabase, "nomina-normativa");
    const { endpoint, modelo, llave } = destino();
    if (!llave) throw new Error("La IA todavía no está configurada.");

    const anio = new Date().getFullYear();
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${llave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelo,
        messages: [
          {
            role: "system",
            content:
              "Eres un investigador laboral colombiano. Devuelves SOLO datos estructurados con la función return_nomina, sin texto adicional. Si no conoces un decreto del año pedido, devuelve los últimos valores oficiales que conozcas.",
          },
          {
            role: "user",
            content: `Dame los valores laborales oficiales vigentes en Colombia para ${anio}: SMMLV en pesos, auxilio de transporte mensual en pesos, jornada semanal en horas, horas al mes para el valor hora, recargo nocturno (fracción, ej. 0.35), recargo dominical/festivo (fracción, ej. 0.90), extra diurna (fracción) y extra nocturna (fracción). Incluye la fecha desde la que rigen (AAAA-MM-DD) y el respaldo legal (decreto o ley con número). Devuélvelo con la función return_nomina.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_nomina",
              parameters: {
                type: "object",
                properties: {
                  smmlv: { type: "number" },
                  aux_transporte: { type: "number" },
                  jornada_semanal: { type: "number" },
                  horas_mes: { type: "number" },
                  rec_nocturno: { type: "number" },
                  rec_dominical: { type: "number" },
                  extra_diurna: { type: "number" },
                  extra_nocturna: { type: "number" },
                  vigencia_desde: { type: "string" },
                  fuente_legal: { type: "string" },
                },
                required: ["smmlv", "aux_transporte"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_nomina" } },
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
    if (!args) throw new Error("La IA no devolvió valores.");
    const p = JSON.parse(args) as ParametrosIA;
    if (!p.smmlv || p.smmlv <= 0 || !p.aux_transporte || p.aux_transporte < 0) {
      throw new Error("La IA devolvió valores incompletos. Intenta de nuevo.");
    }

    const desde = /^\d{4}-\d{2}-\d{2}/.test(p.vigencia_desde ?? "") ? (p.vigencia_desde as string).slice(0, 10) : `${anio}-01-01`;

    const { data: vigentes } = await context.supabase
      .from("parametros_nomina_colombia")
      .select("id, vigencia_desde, vigencia_hasta, smmlv, aux_transporte")
      .order("vigencia_desde", { ascending: false })
      .limit(1);
    const actual = vigentes?.[0];
    if (actual && Number(actual.smmlv) === Math.round(p.smmlv) && Number(actual.aux_transporte) === Math.round(p.aux_transporte)) {
      return { creada: false, mensaje: `Ya estás al día: SMMLV $${Math.round(p.smmlv).toLocaleString("es-CO")} vigente desde ${actual.vigencia_desde}.`, params: p };
    }

    if (actual) {
      await context.supabase
        .from("parametros_nomina_colombia")
        .update({ vigencia_hasta: desde })
        .eq("id", actual.id);
    }

    const { error } = await context.supabase.from("parametros_nomina_colombia").insert({
      vigencia_desde: desde,
      vigencia_hasta: null,
      smmlv: Math.round(p.smmlv),
      aux_transporte: Math.round(p.aux_transporte),
      jornada_semanal: p.jornada_semanal && p.jornada_semanal > 0 ? p.jornada_semanal : 42,
      horas_mes: p.horas_mes && p.horas_mes > 0 ? p.horas_mes : 210,
      rec_nocturno: p.rec_nocturno ?? 0.35,
      rec_dominical: p.rec_dominical ?? 0.9,
      extra_diurna: p.extra_diurna ?? 0.25,
      extra_nocturna: p.extra_nocturna ?? 0.75,
      fuente_legal: (p.fuente_legal ?? "Actualización con IA Gosaryc").slice(0, 300),
    });
    if (error) throw new Error("No se pudo guardar la vigencia nueva.");
    return {
      creada: true,
      mensaje: `Vigencia nueva desde ${desde}: SMMLV $${Math.round(p.smmlv).toLocaleString("es-CO")} y auxilio $${Math.round(p.aux_transporte).toLocaleString("es-CO")}. Los salarios anclados se ajustaron solos.`,
      params: p,
    };
  });
