// Actualizador automático de normas, decretos y parámetros de Colombia (Google Search Grounding).
// Se puede programar con un cron (cabecera x-cron-secret = secreto CRON_SECRET) o lo puede lanzar un Superadmin.
// Escribe en normativa_colombia_vigente con la llave de servicio. No toca ninguna otra tabla.
import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const MODELOS = ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite"];

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const TEMAS: Record<string, { claves: string; pedido: string }> = {
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

async function buscar(prompt: string): Promise<{ texto: string; fuente: string } | null> {
  for (const modelo of MODELOS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": GEMINI_KEY, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(45000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: "Eres un investigador normativo colombiano riguroso. Solo reportas datos verificados con fuente oficial." }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          tools: [{ googleSearch: {} }],
        }),
      });
      if (!res.ok) {
        if (res.status === 429 || res.status === 404 || res.status >= 500) continue;
        return null;
      }
      const j = await res.json();
      const cand = j?.candidates?.[0];
      const texto = (cand?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("").trim();
      if (!texto) continue;
      const fuente = cand?.groundingMetadata?.groundingChunks?.[0]?.web?.title ?? "Internet";
      return { texto, fuente: String(fuente) };
    } catch {
      // siguiente modelo
    }
  }
  return null;
}

async function actualizarArea(area: string): Promise<number> {
  const t = TEMAS[area];
  const hoy = new Date().toISOString().slice(0, 10);
  const r = await buscar(
    `Hoy es ${hoy}. Busca en internet SOLO fuentes oficiales colombianas y verifica lo vigente de: ${t.pedido}\n` +
      `Responde ÚNICAMENTE con un arreglo JSON de objetos {"clave","titulo","valor","resumen","fuente","vigencia"} con estas claves cuando apliquen: ${t.claves}. No inventes: omite lo que no puedas verificar.`,
  );
  if (!r) return 0;
  const m = r.texto.match(/\[[\s\S]*\]/);
  if (!m) return 0;
  let items: Item[] = [];
  try {
    items = JSON.parse(m[0]);
  } catch {
    return 0;
  }
  const ahora = new Date().toISOString();
  let total = 0;
  for (const it of (Array.isArray(items) ? items : []).slice(0, 12)) {
    const clave = String(it.clave ?? "").trim().toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 60);
    const titulo = String(it.titulo ?? "").trim().slice(0, 160);
    if (!clave || titulo.length < 3) continue;
    const { error } = await db.from("normativa_colombia_vigente").upsert(
      {
        area,
        clave,
        titulo,
        valor: it.valor ? String(it.valor).slice(0, 120) : null,
        resumen: String(it.resumen ?? "").trim().slice(0, 900),
        fuente: (String(it.fuente ?? "").trim() || r.fuente).slice(0, 200),
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

async function autorizado(req: Request): Promise<boolean> {
  const secreto = req.headers.get("x-cron-secret") ?? "";
  if (CRON_SECRET && secreto === CRON_SECRET) return true;
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return false;
  const usuario = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await usuario.rpc("es_superadmin");
  return !error && data === true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (!(await autorizado(req))) {
    return new Response(JSON.stringify({ error: "No autorizado" }), { status: 401, headers: { ...CORS, "Content-Type": "application/json" } });
  }
  if (!GEMINI_KEY) {
    return new Response(JSON.stringify({ error: "Falta el secreto GEMINI_API_KEY" }), { status: 503, headers: { ...CORS, "Content-Type": "application/json" } });
  }
  const parciales = await Promise.all(Object.keys(TEMAS).map((a) => actualizarArea(a).catch(() => 0)));
  const total = parciales.reduce((s, n) => s + n, 0);
  return new Response(JSON.stringify({ ok: true, total, verificado_en: new Date().toISOString() }), {
    headers: { ...CORS, "Content-Type": "application/json" },
  });
});
