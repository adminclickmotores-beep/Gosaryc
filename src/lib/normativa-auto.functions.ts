/**
 * Verificación automática de normativa Colombia desde la app (badge de Nómina, Contabilidad y SST).
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAiQuota } from "@/lib/ai-quota.server";

export type ResultadoNormativa = { actualizada: boolean; total: number; ultima: string | null; mensaje: string };

export const verificarNormativaAhora = createServerFn({ method: "POST" })
  .inputValidator((d: { forzar?: boolean }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<ResultadoNormativa> => {
    const { ultimaVerificacion, estaVencida, verificarNormativa } = await import("@/lib/normativa-auto.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const antes = await ultimaVerificacion();
    if (!data.forzar && !estaVencida(antes)) {
      return { actualizada: false, total: 0, ultima: antes, mensaje: "La normativa ya está verificada." };
    }
    // Llave de Gemini del proyecto o, si no hay, la que el dueño guardó para su agente.
    let llave = process.env.GEMINI_API_KEY ?? "";
    if (!llave) {
      const { data: m } = await supabaseAdmin
        .from("agente_memoria")
        .select("contenido")
        .eq("owner_id", context.userId)
        .eq("tipo", "llave_gemini")
        .limit(1)
        .maybeSingle();
      llave = m?.contenido?.trim() ?? "";
    }
    if (!llave) {
      return { actualizada: false, total: 0, ultima: antes, mensaje: "Falta la llave de Gemini para verificar en internet." };
    }
    await assertAiQuota(context.supabase, "normativa-auto", 20);
    const total = await verificarNormativa(llave);
    const ultima = await ultimaVerificacion();
    return {
      actualizada: total > 0,
      total,
      ultima,
      mensaje: total > 0 ? `Se verificaron ${total} parámetros en internet.` : "No se pudo verificar ahora. Intenta más tarde.",
    };
  });
