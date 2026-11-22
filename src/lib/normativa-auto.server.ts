/**
 * Actualizador automático de normas, decretos y parámetros de Colombia (solo servidor).
 * Consulta internet con Google Search Grounding y guarda en normativa_colombia_vigente.
 */
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buscarEnInternet, extraerJson } from "@/lib/ia-internet.server";

export const DIAS_ENTRE_VERIFICACIONES = 7;

type Area = "tributario" | "laboral" | "sectores";

const TEMAS: Record<Area, { claves: string; pedido: string }> = {
  tributario: {
    claves: "uvt, retefuente_compras, retefuente_servicios, iva_general, impoconsumo, topes_exogena, calendario_tributario",
    pedido:
      "Tributario y contable (DIAN): valor de la UVT vigente, calendario tributario del año, tarifas de retención en la fuente, tarifa general de IVA, Impoconsumo y topes de información exógena.",
  },
  laboral: {
    claves: "smmlv, auxilio_transporte, recargo_nocturno, recargo_dominical, aportes_pila",
    pedido:
      "Laboral y nómina (Ministerio del Trabajo): salario mínimo (SMMLV), auxilio de transporte, recargos nocturnos y dominicales/festivos y porcentajes de aportes PILA vigentes.",
  },
  sectores: {
    claves: "decreto_1072_sst, res_0312_sst, res_1843_salud, res_4272_alturas, ley_675_ph, transito_simit",
    pedido:
      "Sectores regulados: vigencia del Decreto 1072 de 2015 (SG-SST), Resolución 0312 de 2019, Resolución 1843 (exámenes ocupacionales), Resolución 4272 de 2021 (trabajo en alturas), Ley 675 de 2001 (propiedad horizontal) y normas de tránsito/SIMIT.",
  },
};

type Item = { clave?: string; titulo?: string; valor?: string; resumen?: string; fuente?: string; vigencia?: string };

async function consultarArea(area: Area, llave?: string): Promise<number> {
  const hoy = new Date().toISOString().slice(0, 10);
  const t = TEMAS[area];
  const h = await buscarEnInternet(
    `Hoy es ${hoy}. Busca en internet SOLO fuentes oficiales colombianas (DIAN, MinTrabajo, MinSalud, Función Pública, Superintendencias) y verifica lo vigente de: ${t.pedido}\n` +
      `Responde ÚNICAMENTE con un arreglo JSON (sin texto extra) de objetos {"clave","titulo","valor","resumen","fuente","vigencia"} usando exactamente estas claves cuando apliquen: ${t.claves}. ` +
      `"valor" es la cifra o estado corto (ej. "$49.799" o "Vigente"), "resumen" máximo 2 frases, "fuente" el nombre y número de la norma o entidad, "vigencia" fecha AAAA-MM-DD si la sabes. No inventes: omite lo que no puedas verificar.`,
    { llave, sistema: "Eres un investigador normativo colombiano riguroso. Solo reportas datos verificados con fuente oficial." },
  );
  if (!h) return 0;
  const items = extraerJson<Item[]>(h.texto, "array");
  if (!Array.isArray(items)) return 0;
  const ahora = new Date().toISOString();
  let total = 0;
  for (const it of items.slice(0, 12)) {
    const clave = String(it.clave ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 60);
    const titulo = String(it.titulo ?? "").trim().slice(0, 160);
    if (!clave || titulo.length < 3) continue;
    const fuente = (String(it.fuente ?? "").trim() || h.fuentes[0]?.titulo || "Internet").slice(0, 200);
    const { error } = await supabaseAdmin.from("normativa_colombia_vigente").upsert(
      {
        area,
        clave,
        titulo,
        valor: it.valor ? String(it.valor).slice(0, 120) : null,
        resumen: String(it.resumen ?? "").trim().slice(0, 900),
        fuente,
        vigencia_desde: it.vigencia && /^\d{4}-\d{2}-\d{2}/.test(it.vigencia) ? it.vigencia.slice(0, 10) : null,
        origen: "auto_internet",
        verificado_en: ahora,
      },
      { onConflict: "clave" },
    );
    if (!error) total += 1;
  }
  return total;
}

export async function ultimaVerificacion(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("normativa_colombia_vigente")
    .select("verificado_en")
    .order("verificado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.verificado_en ?? null;
}

export function estaVencida(ultima: string | null): boolean {
  if (!ultima) return true;
  return Date.now() - new Date(ultima).getTime() > DIAS_ENTRE_VERIFICACIONES * 86400000;
}

/** Verifica las tres áreas en paralelo y devuelve cuántos parámetros quedaron actualizados. */
export async function verificarNormativa(llave?: string): Promise<number> {
  const r = await Promise.all((Object.keys(TEMAS) as Area[]).map((a) => consultarArea(a, llave).catch(() => 0)));
  return r.reduce((s, n) => s + n, 0);
}
