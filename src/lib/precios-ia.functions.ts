/**
 * Inteligencia de precios: IPC/UVT en vivo, tasador de vehículos usados (Gemini + Google Search)
 * y ofertas del agente de WhatsApp. No toca tablas ni políticas existentes.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAiQuota } from "@/lib/ai-quota.server";

export type FuenteWebPrecio = { titulo: string; url: string };
export type Indicadores = { ipc_anual: number | null; uvt: number | null; fuente: string; fecha: string };
export type TasacionVehiculo = {
  bajo: number;
  promedio: number;
  alto: number;
  resumen: string;
  fuentes: FuenteWebPrecio[];
  fecha: string;
};

async function llaveGemini(userId: string): Promise<string> {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("agente_memoria")
    .select("contenido")
    .eq("owner_id", userId)
    .eq("tipo", "llave_gemini")
    .limit(1)
    .maybeSingle();
  return data?.contenido?.trim() ?? "";
}

const limpiar = (s: unknown, max: number) =>
  String(s ?? "")
    .replace(/[\r\n\u0000-\u001f]+/g, " ")
    .trim()
    .slice(0, max);

/** IPC anual y UVT vigentes en Colombia, buscados en internet. */
export const consultarIndicadores = createServerFn({ method: "POST" })
  .inputValidator((d: { forzar?: boolean }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Indicadores | null> => {
    const llave = await llaveGemini(context.userId);
    if (!llave) return null;
    await assertAiQuota(context.supabase, "precios-indicadores", 30);
    const { buscarEnInternet, extraerJson } = await import("@/lib/ia-internet.server");
    const h = await buscarEnInternet(
      `Hoy es ${new Date().toISOString().slice(0, 10)}. Busca en fuentes oficiales de Colombia (DANE, Banco de la República, DIAN) la variación anual del IPC (inflación anual, último dato publicado) y el valor de la UVT vigente este año. Responde SOLO un objeto JSON así: {"ipc_anual": numero_en_porcentaje, "uvt": numero_en_pesos, "fuente": "texto corto con la fuente y el mes del dato"}`,
      { llave, expertos: false, sistema: "Eres un analista económico colombiano. Responde únicamente JSON válido con datos reales y recientes." },
    );
    if (!h) return null;
    const j = extraerJson<{ ipc_anual?: number; uvt?: number; fuente?: string }>(h.texto, "object");
    if (!j) return null;
    const ipc = typeof j.ipc_anual === "number" && j.ipc_anual >= 0 && j.ipc_anual < 60 ? j.ipc_anual : null;
    const uvt = typeof j.uvt === "number" && j.uvt > 10000 && j.uvt < 200000 ? j.uvt : null;
    if (ipc === null && uvt === null) return null;
    return {
      ipc_anual: ipc,
      uvt,
      fuente: limpiar(j.fuente || h.fuentes[0]?.titulo || "Internet", 160),
      fecha: new Date().toISOString(),
    };
  });

/** Precio de mercado de un vehículo usado en Colombia (Gemini con Google Search Grounding). */
export const tasarVehiculo = createServerFn({ method: "POST" })
  .inputValidator((d: { tipo: string; marca: string; linea: string; anio: number; cilindraje: string; km: number }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<TasacionVehiculo> => {
    const marca = limpiar(data.marca, 40);
    const linea = limpiar(data.linea, 60);
    const cil = limpiar(data.cilindraje, 20);
    const tipo = data.tipo === "moto" ? "moto" : "carro";
    const anio = Math.round(Number(data.anio));
    const km = Math.max(0, Math.round(Number(data.km) || 0));
    if (!marca || !linea || !(anio >= 1980 && anio <= new Date().getFullYear() + 1)) {
      throw new Error("Escribe marca, línea y un año válido.");
    }
    const llave = await llaveGemini(context.userId);
    if (!llave) throw new Error("Falta la llave de Gemini para consultar precios en internet.");
    await assertAiQuota(context.supabase, "tasador-vehiculos", 40);
    const { buscarEnInternet, extraerJson } = await import("@/lib/ia-internet.server");
    const mes = new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" });
    const h = await buscarEnInternet(
      `Busca precios VIGENTES de ${mes} en portales de vehículos usados de Colombia (TuCarro, Mercado Libre, Carroya, OLX, Kavak) para: ${tipo} ${marca} ${linea}, modelo ${anio}${cil ? `, cilindraje ${cil}` : ""}, aproximadamente ${km} km. Considera solo avisos comparables (mismo modelo y kilometraje similar). Responde SOLO un objeto JSON así: {"bajo": pesos_COP, "promedio": pesos_COP, "alto": pesos_COP, "resumen": "2 frases sobre el mercado de este vehículo, su rotación y los avisos comparables"}`,
      { llave, expertos: true, sistema: "Eres un tasador de vehículos usados en Colombia. Responde únicamente JSON válido, con números enteros en pesos colombianos y datos reales encontrados en la búsqueda; no inventes." },
    );
    if (!h) throw new Error("No pude consultar el mercado ahora. Intenta de nuevo en un momento.");
    const j = extraerJson<{ bajo?: number; promedio?: number; alto?: number; resumen?: string }>(h.texto, "object");
    const bajo = Number(j?.bajo);
    const promedio = Number(j?.promedio);
    const alto = Number(j?.alto);
    if (!j || ![bajo, promedio, alto].every((n) => Number.isFinite(n) && n > 100000) || bajo > alto) {
      throw new Error("No encontré suficientes avisos comparables para ese vehículo.");
    }
    return {
      bajo: Math.round(bajo),
      promedio: Math.round(promedio),
      alto: Math.round(alto),
      resumen: limpiar(j.resumen, 400),
      fuentes: h.fuentes,
      fecha: new Date().toISOString(),
    };
  });

/** Pone (o quita) la promoción en la memoria del agente de WhatsApp para que la ofrezca en los chats. */
export const publicarOfertaAgente = createServerFn({ method: "POST" })
  .inputValidator((d: { productoId: string; texto: string; activa: boolean }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ ok: boolean }> => {
    // El producto debe ser del negocio de quien llama (RLS).
    const { data: prod } = await context.supabase.from("com_productos").select("id, nombre").eq("id", data.productoId).maybeSingle();
    if (!prod) throw new Error("Producto no encontrado.");
    const { data: ownerId } = await context.supabase.rpc("mi_negocio_id");
    if (!ownerId) throw new Error("No se encontró tu negocio.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: neg } = await supabaseAdmin.from("negocio_config").select("id").eq("owner_id", ownerId).limit(1).maybeSingle();
    if (!neg) throw new Error("No se encontró tu negocio.");
    const pregunta = `Promoción vigente: ${limpiar(prod.nombre, 120)}`;
    await supabaseAdmin
      .from("agente_conocimiento")
      .delete()
      .eq("owner_id", ownerId)
      .eq("negocio_id", neg.id)
      .eq("tipo", "promocion")
      .eq("pregunta", pregunta);
    if (data.activa) {
      const { error } = await supabaseAdmin.from("agente_conocimiento").insert({
        negocio_id: neg.id,
        owner_id: ownerId,
        tipo: "promocion",
        pregunta,
        respuesta: limpiar(data.texto, 900),
        origen: "dueno",
        estado: "aprendida",
        fuente: "Oferta activada por el dueño",
        veces: 50,
      });
      if (error) throw new Error("No se pudo enviar la oferta al agente.");
    }
    return { ok: true };
  });
