/**
 * Selector de potencia IA (Turbo / Experto) y prueba en vivo del motor Gemini.
 * El perfil y la llave propia se guardan en la memoria del agente del negocio (sin tablas nuevas).
 */
import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAiQuota } from "@/lib/ai-quota.server";
import { chatConRespaldo, normalizarPerfil, resolverModelo, type PerfilIA } from "@/lib/ia-motores";

export type EstadoMotorIA = { perfil: PerfilIA; llaveGuardada: boolean; llaveMascara: string };
export type ResultadoPruebaIA = {
  ok: boolean;
  modelo: string;
  modeloPedido: string;
  ms: number;
  origen: string;
  respuesta: string;
  mensaje: string;
};

const LLAVE_VALIDA = /^[A-Za-z0-9_\-]{20,120}$/;

function mascara(llave: string): string {
  return llave ? `${llave.slice(0, 4)}••••••••${llave.slice(-4)}` : "";
}

async function ubicarNegocio(supabase: SupabaseClient<Database>) {
  const { data: ownerId } = await supabase.rpc("mi_negocio_id");
  if (!ownerId) throw new Error("No se encontró tu negocio.");
  const { data: negocio } = await supabase.from("negocio_config").select("id").eq("owner_id", ownerId).maybeSingle();
  if (!negocio) throw new Error("No se encontró tu negocio.");
  return { ownerId: ownerId as string, negocioId: negocio.id };
}

export const obtenerMotorIA = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<EstadoMotorIA> => {
    const { negocioId } = await ubicarNegocio(context.supabase);
    const { data } = await context.supabase
      .from("agente_memoria")
      .select("tipo,contenido")
      .eq("negocio_id", negocioId)
      .in("tipo", ["motor_ia", "llave_gemini"])
      .limit(4);
    const llave = (data ?? []).find((x) => x.tipo === "llave_gemini")?.contenido?.trim() ?? "";
    return {
      perfil: normalizarPerfil((data ?? []).find((x) => x.tipo === "motor_ia")?.contenido?.trim()),
      llaveGuardada: llave.length > 0,
      llaveMascara: mascara(llave),
    };
  });

export const guardarMotorIA = createServerFn({ method: "POST" })
  .inputValidator((d: { perfil: PerfilIA; llave?: string; quitarLlave?: boolean }) => ({
    perfil: normalizarPerfil(d?.perfil),
    llave: typeof d?.llave === "string" ? d.llave.trim() : "",
    quitarLlave: d?.quitarLlave === true,
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<EstadoMotorIA> => {
    const { ownerId, negocioId } = await ubicarNegocio(context.supabase);
    if (data.llave && !LLAVE_VALIDA.test(data.llave)) throw new Error("La llave de Gemini no parece válida. Cópiala completa desde Google AI Studio.");

    const guardar = async (tipo: "motor_ia" | "llave_gemini", contenido: string) => {
      const { data: previo } = await context.supabase
        .from("agente_memoria")
        .select("id")
        .eq("negocio_id", negocioId)
        .eq("tipo", tipo)
        .limit(1)
        .maybeSingle();
      if (previo) {
        const { error } = await context.supabase.from("agente_memoria").update({ contenido }).eq("id", previo.id);
        if (error) throw new Error("No se pudo guardar la configuración de IA.");
      } else {
        const { error } = await context.supabase.from("agente_memoria").insert({ negocio_id: negocioId, owner_id: ownerId, tipo, contenido });
        if (error) throw new Error("No se pudo guardar la configuración de IA.");
      }
    };

    await guardar("motor_ia", data.perfil);
    if (data.llave) await guardar("llave_gemini", data.llave);
    if (data.quitarLlave && !data.llave) {
      await context.supabase.from("agente_memoria").delete().eq("negocio_id", negocioId).eq("tipo", "llave_gemini");
    }
    const { data: filas } = await context.supabase
      .from("agente_memoria")
      .select("tipo,contenido")
      .eq("negocio_id", negocioId)
      .eq("tipo", "llave_gemini")
      .limit(1);
    const llave = filas?.[0]?.contenido?.trim() ?? "";
    return { perfil: data.perfil, llaveGuardada: llave.length > 0, llaveMascara: mascara(llave) };
  });

/** "Probar Motor IA Ahora": una consulta real al motor del perfil elegido, midiendo el tiempo de respuesta. */
export const probarMotorIA = createServerFn({ method: "POST" })
  .inputValidator((d: { perfil: PerfilIA; llave?: string }) => ({
    perfil: normalizarPerfil(d?.perfil),
    llave: typeof d?.llave === "string" ? d.llave.trim() : "",
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<ResultadoPruebaIA> => {
    await assertAiQuota(context.supabase, "motor-ia-prueba");
    const modeloPedido = resolverModelo(data.perfil, "whatsapp");
    if (data.llave && !LLAVE_VALIDA.test(data.llave)) {
      return { ok: false, modelo: modeloPedido, modeloPedido, ms: 0, origen: "", respuesta: "", mensaje: "La llave pegada no parece válida. Cópiala completa desde Google AI Studio." };
    }

    let llave = data.llave;
    let origen = data.llave ? "Llave pegada ahora" : "";
    if (!llave) {
      const { negocioId } = await ubicarNegocio(context.supabase);
      const { data: filas } = await context.supabase
        .from("agente_memoria")
        .select("contenido")
        .eq("negocio_id", negocioId)
        .eq("tipo", "llave_gemini")
        .limit(1);
      llave = filas?.[0]?.contenido?.trim() ?? "";
      if (llave) origen = "Llave guardada de tu negocio";
    }
    if (!llave && process.env.GEMINI_API_KEY) {
      llave = process.env.GEMINI_API_KEY;
      origen = "Llave del proyecto";
    }
    const integrada = !llave ? process.env.LOVABLE_API_KEY : undefined;
    if (!llave && !integrada) {
      return { ok: false, modelo: modeloPedido, modeloPedido, ms: 0, origen: "", respuesta: "", mensaje: "Falta la llave de Gemini. Pégala arriba y vuelve a probar." };
    }
    if (integrada) origen = "IA integrada";

    try {
      const r = await chatConRespaldo({
        geminiKey: llave || undefined,
        lovableKey: integrada,
        perfil: data.perfil,
        uso: "whatsapp",
        body: { messages: [{ role: "user", content: "Responde solo con la palabra: listo" }] },
      });
      if (!r.res || !r.res.ok) {
        const estado = r.res?.status ?? 0;
        const mensaje =
          estado === 401 || estado === 403 || estado === 400
            ? "Google rechazó la llave. Revisa que esté completa y activa en AI Studio."
            : estado === 429
              ? "Todos los motores están en su límite por minuto. Intenta de nuevo en un momento."
              : "No se pudo conectar con el motor de IA.";
        return { ok: false, modelo: r.modelo, modeloPedido, ms: r.ms, origen, respuesta: "", mensaje };
      }
      const json = (await r.res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const respuesta = json.choices?.[0]?.message?.content?.trim().slice(0, 200) ?? "";
      const cambio = r.modelo !== modeloPedido ? ` (respaldo automático: ${modeloPedido} estaba ocupado)` : "";
      return { ok: true, modelo: r.modelo, modeloPedido, ms: r.ms, origen, respuesta, mensaje: `Motor activo${cambio}` };
    } catch {
      return { ok: false, modelo: modeloPedido, modeloPedido, ms: 0, origen, respuesta: "", mensaje: "No se pudo conectar con el motor de IA." };
    }
  });
