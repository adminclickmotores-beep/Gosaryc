/**
 * Inteligencia de precios: IPC/UVT en vivo, tasador de vehículos usados (Gemini + Google Search)
 * y ofertas del agente de WhatsApp. No toca tablas ni políticas existentes.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAiQuota } from "@/lib/ai-quota.server";

export type FuenteWebPrecio = { titulo: string; url: string };
export type Indicadores = { ipc_anual: number | null; uvt: number | null; fuente: string; fecha: string };
export type TendenciaMercado = "alza" | "estable" | "baja";
export type TasacionVehiculo = {
  bajo: number;
  promedio: number;
  alto: number;
  resumen: string;
  fuentes: FuenteWebPrecio[];
  fecha: string;
  tendencia: TendenciaMercado;
  /** Precio oficial 0 km en concesionario (solo modelos del año actual o siguiente). */
  precio_0km: number | null;
};

export type TarifasVehiculares = {
  anio: number;
  soat: {
    moto_menor_100: number; moto_100_200: number; moto_mayor_200: number;
    carro_menor_1500: number; carro_1500_2500: number; carro_mayor_2500: number;
  };
  tecno: { moto: number; carro: number };
  transito: { derechos_carro: number; derechos_moto: number; certificado: number; prenda: number };
  retefuente: { porcentaje: number; moto_exenta_cc_max: number };
};
export type TarifasRespuesta = { tarifas: TarifasVehiculares; alDia: boolean; verificado: string | null; fuente: string };

/** Tarifas oficiales 2026 (respaldo si la tabla aún no responde). */
export const TARIFAS_2026: TarifasVehiculares = {
  anio: 2026,
  soat: {
    moto_menor_100: 256200, moto_100_200: 343300, moto_mayor_200: 761400,
    carro_menor_1500: 520100, carro_1500_2500: 611050, carro_mayor_2500: 677400,
  },
  tecno: { moto: 233500, carro: 335000 },
  transito: { derechos_carro: 260400, derechos_moto: 145500, certificado: 58400, prenda: 206900 },
  retefuente: { porcentaje: 1, moto_exenta_cc_max: 185 },
};

export type ItemVitrina = { id: string; tipo: string; marca: string; linea: string; anio: number; cilindraje: string; km: number; precio: number };
export type ResultadoVitrina = { id: string; mercado: number; tendencia: TendenciaMercado };

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
    const anioActual = new Date().getFullYear();
    const esNuevo = anio >= anioActual;
    const h = await buscarEnInternet(
      `Busca los anuncios publicados HOY (${mes}) en Colombia en MercadoLibre, Tucarro, Autocosmos y Publimotos para: ${tipo} ${marca} ${linea}, modelo ${anio}${cil ? `, cilindraje ${cil}` : ""}, aproximadamente ${km} km. Considera solo avisos comparables y DESCARTA los valores atípicos (muy bajos por estafa o muy altos sin sustento). ${esNuevo ? `Como es modelo ${anio}, busca también el precio oficial 0 km en concesionario en Colombia.` : ""} Indica si el precio de este modelo está en alza, estable o a la baja frente al mes anterior. Responde SOLO un objeto JSON así: {"bajo": pesos_COP, "promedio": pesos_COP, "alto": pesos_COP, "tendencia": "alza" | "estable" | "baja", "precio_0km": pesos_COP o null, "resumen": "2 frases sobre el mercado de este vehículo, su rotación y los avisos comparables"}`,
      { llave, expertos: true, calculo: true, sistema: "Eres un tasador de vehículos usados en Colombia. Usa código para promedios, medianas y descuentos, así los cálculos son exactos. Responde únicamente JSON válido, con números enteros en pesos colombianos y datos reales encontrados en la búsqueda; no inventes." },
    );
    if (!h) throw new Error("No pude consultar el mercado ahora. Intenta de nuevo en un momento.");
    const j = extraerJson<{ bajo?: number; promedio?: number; alto?: number; resumen?: string; tendencia?: string; precio_0km?: number | null }>(h.texto, "object");
    const bajo = Number(j?.bajo);
    const promedio = Number(j?.promedio);
    const alto = Number(j?.alto);
    if (!j || ![bajo, promedio, alto].every((n) => Number.isFinite(n) && n > 100000) || bajo > alto) {
      throw new Error("No encontré suficientes avisos comparables para ese vehículo.");
    }
    // Ajuste de negociación real en vitrina: -5 % sobre los precios publicados.
    const f = 0.95;
    const cero = Number(j.precio_0km);
    const tendencia: TendenciaMercado = j.tendencia === "alza" || j.tendencia === "baja" ? j.tendencia : "estable";
    return {
      bajo: Math.round(bajo * f),
      promedio: Math.round(promedio * f),
      alto: Math.round(alto * f),
      resumen: limpiar(j.resumen, 400),
      fuentes: h.fuentes,
      fecha: new Date().toISOString(),
      tendencia,
      precio_0km: esNuevo && Number.isFinite(cero) && cero > 1000000 ? Math.round(cero) : null,
    };
  });

const aNumero = (v: unknown, def: number, min: number, max: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : def;
};

function leerTarifas(datos: unknown, anio: number): TarifasVehiculares {
  const d = (datos ?? {}) as Record<string, Record<string, unknown> | undefined>;
  const b = TARIFAS_2026;
  const s = d.soat ?? {};
  const t = d.tecno ?? {};
  const x = d.transito ?? {};
  const r = d.retefuente ?? {};
  return {
    anio,
    soat: {
      moto_menor_100: aNumero(s.moto_menor_100, b.soat.moto_menor_100, 50000, 5000000),
      moto_100_200: aNumero(s.moto_100_200, b.soat.moto_100_200, 50000, 5000000),
      moto_mayor_200: aNumero(s.moto_mayor_200, b.soat.moto_mayor_200, 50000, 5000000),
      carro_menor_1500: aNumero(s.carro_menor_1500, b.soat.carro_menor_1500, 100000, 6000000),
      carro_1500_2500: aNumero(s.carro_1500_2500, b.soat.carro_1500_2500, 100000, 6000000),
      carro_mayor_2500: aNumero(s.carro_mayor_2500, b.soat.carro_mayor_2500, 100000, 6000000),
    },
    tecno: {
      moto: aNumero(t.moto, b.tecno.moto, 50000, 2000000),
      carro: aNumero(t.carro, b.tecno.carro, 50000, 2000000),
    },
    transito: {
      derechos_carro: aNumero(x.derechos_carro, b.transito.derechos_carro, 50000, 3000000),
      derechos_moto: aNumero(x.derechos_moto, b.transito.derechos_moto, 30000, 3000000),
      certificado: aNumero(x.certificado, b.transito.certificado, 10000, 1000000),
      prenda: aNumero(x.prenda, b.transito.prenda, 10000, 2000000),
    },
    retefuente: {
      porcentaje: aNumero(r.porcentaje, 1, 0, 10),
      moto_exenta_cc_max: aNumero(r.moto_exenta_cc_max, 185, 0, 1000),
    },
  };
}

/**
 * Tarifas SOAT, Tecnomecánica, trámites y retefuente del año vigente.
 * Se actualizan solas con Gemini + Google Search al cambiar de año calendario o cada 30 días.
 */
export const obtenerTarifasVehiculares = createServerFn({ method: "POST" })
  .inputValidator((d: { forzar?: boolean }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<TarifasRespuesta> => {
    const anioActual = new Date().getFullYear();
    const { data: fila } = await context.supabase
      .from("tarifas_vehiculares_colombia")
      .select("anio, datos, fuente, verificado_en")
      .order("anio", { ascending: false })
      .limit(1)
      .maybeSingle();
    const hace30 = Date.now() - 30 * 86400000;
    const vencida =
      !fila || fila.anio < anioActual || new Date(fila.verificado_en).getTime() < hace30 || data.forzar === true;
    let tarifas = leerTarifas(fila?.datos, fila?.anio ?? 2026);
    let verificado = fila?.verificado_en ?? null;
    let fuente = fila?.fuente ?? "Tarifas oficiales 2026";

    if (vencida) {
      try {
        const llave = await llaveGemini(context.userId);
        if (llave) {
          await assertAiQuota(context.supabase, "tarifas-vehiculares", 20);
          const { buscarEnInternet, extraerJson } = await import("@/lib/ia-internet.server");
          const h = await buscarEnInternet(
            `Hoy es ${new Date().toISOString().slice(0, 10)}. Busca en fuentes oficiales de Colombia (Superintendencia Financiera, MinTransporte, RUNT, DIAN) las tarifas vigentes del año ${anioActual}: (1) prima del SOAT por categoría: moto menos de 100cc, moto 100 a 200cc, moto más de 200cc, carro menos de 1500cc, carro 1500 a 2500cc, carro más de 2500cc; (2) valor de la revisión técnico-mecánica para moto y vehículo liviano; (3) derechos de tránsito + MinTransporte + RUNT del traspaso de carro y de moto, certificado de tradición y levantamiento de prenda; (4) retención en la fuente por traspaso de vehículos (porcentaje, Estatuto Tributario art. 398) y cilindraje máximo de motos exentas. Responde SOLO un objeto JSON así: {"soat": {"moto_menor_100": n, "moto_100_200": n, "moto_mayor_200": n, "carro_menor_1500": n, "carro_1500_2500": n, "carro_mayor_2500": n}, "tecno": {"moto": n, "carro": n}, "transito": {"derechos_carro": n, "derechos_moto": n, "certificado": n, "prenda": n}, "retefuente": {"porcentaje": n, "moto_exenta_cc_max": n}} con valores en pesos COP; si no encuentras uno, omítelo.`,
            { llave, expertos: false, sistema: "Eres un analista de trámites vehiculares en Colombia. Responde únicamente JSON válido con datos reales y vigentes; no inventes." },
          );
          const j = h ? extraerJson<Record<string, unknown>>(h.texto, "object") : null;
          if (h && j) {
            // Lo que Gemini no devuelva se conserva del año anterior (mismo respaldo).
            const base = (fila?.datos ?? {}) as Record<string, Record<string, unknown> | undefined>;
            const mezcla: Record<string, unknown> = {};
            for (const k of ["soat", "tecno", "transito", "retefuente"]) {
              mezcla[k] = { ...(base[k] ?? {}), ...((j[k] as Record<string, unknown> | undefined) ?? {}) };
            }
            const nuevas = leerTarifas(mezcla, anioActual);
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            const fuenteNueva = limpiar(h.fuentes[0]?.titulo || "Internet (Gemini + Google Search)", 200);
            const { error } = await supabaseAdmin.from("tarifas_vehiculares_colombia").upsert(
              {
                anio: anioActual,
                datos: nuevas as unknown as import("@/integrations/supabase/types").Json,
                fuente: fuenteNueva,
                origen: "auto_internet",
                verificado_en: new Date().toISOString(),
              },
              { onConflict: "anio" },
            );
            if (!error) {
              tarifas = nuevas;
              verificado = new Date().toISOString();
              fuente = fuenteNueva;
            }
          }
        }
      } catch {
        // Si falla la consulta se siguen usando las últimas tarifas guardadas.
      }
    }
    return { tarifas, alDia: tarifas.anio === anioActual, verificado, fuente };
  });

/** Compara los precios de la vitrina contra el mercado del mes (una sola consulta por lote). */
export const revisarVitrina = createServerFn({ method: "POST" })
  .inputValidator((d: { items: ItemVitrina[] }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<ResultadoVitrina[]> => {
    const items = (data.items ?? []).slice(0, 8);
    if (items.length === 0) throw new Error("No hay vehículos disponibles para revisar.");
    const llave = await llaveGemini(context.userId);
    if (!llave) throw new Error("Falta la llave de Gemini para consultar precios en internet.");
    await assertAiQuota(context.supabase, "revisar-vitrina", 15);
    const { buscarEnInternet, extraerJson } = await import("@/lib/ia-internet.server");
    const lista = items
      .map((v, n) => `${n + 1}. ${v.tipo === "moto" ? "moto" : "carro"} ${limpiar(v.marca, 40)} ${limpiar(v.linea, 60)} modelo ${Math.round(Number(v.anio)) || ""}${v.cilindraje ? `, ${limpiar(v.cilindraje, 20)}` : ""}, ${Math.round(Number(v.km)) || 0} km`)
      .join("\n");
    const mes = new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" });
    const h = await buscarEnInternet(
      `Con los anuncios publicados en ${mes} en Colombia (MercadoLibre, Tucarro, Autocosmos, Publimotos), da el precio de mercado promedio actual de cada vehículo (descarta valores atípicos) y si su precio está en alza, estable o a la baja frente al mes anterior:\n${lista}\nResponde SOLO un arreglo JSON así: [{"n": 1, "mercado": pesos_COP, "tendencia": "alza" | "estable" | "baja"}]`,
      { llave, expertos: false, sistema: "Eres un tasador de vehículos en Colombia. Responde únicamente JSON válido con datos reales; no inventes." },
    );
    if (!h) throw new Error("No pude consultar el mercado ahora. Intenta de nuevo en un momento.");
    const arr = extraerJson<Array<{ n?: number; mercado?: number; tendencia?: string }>>(h.texto, "array") ?? [];
    const out: ResultadoVitrina[] = [];
    for (const a of arr) {
      const v = items[Number(a.n) - 1];
      const m = Number(a.mercado);
      if (!v || !Number.isFinite(m) || m < 500000) continue;
      out.push({
        id: v.id,
        mercado: Math.round(m * 0.95),
        tendencia: a.tendencia === "alza" || a.tendencia === "baja" ? a.tendencia : "estable",
      });
    }
    if (out.length === 0) throw new Error("No encontré suficientes avisos comparables para tu vitrina.");
    return out;
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
