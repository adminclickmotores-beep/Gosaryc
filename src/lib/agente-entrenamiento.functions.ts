/**
 * Auto-entrenamiento del agente de WhatsApp: descarga el conocimiento del sector
 * (FAQ, objeciones, preguntas filtro, garantías y PQRS) y lo guarda en agente_memoria.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAiQuota } from "@/lib/ai-quota.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-2.5-flash";

type Seccion = { clave: string; titulo: string; texto: string };

export const entrenarSectorAgente = createServerFn({ method: "POST" })
  .inputValidator((d: { negocioId: string; tipoNegocio?: string; ciudad?: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<{ secciones: number }> => {
    await assertAiQuota(context.supabase, "agente-entrenamiento");
    const geminiKey = process.env.GEMINI_API_KEY;
    const endpoint = geminiKey ? GEMINI_ENDPOINT : GATEWAY;
    const modelo = geminiKey ? GEMINI_MODEL : MODEL;
    const llave = geminiKey || process.env.LOVABLE_API_KEY;
    if (!llave) throw new Error("La IA todavía no está configurada.");

    const { data: negocio } = await context.supabase
      .from("negocio_config")
      .select("id,owner_id,tipo_negocio,ciudad")
      .eq("id", data.negocioId)
      .maybeSingle();
    if (!negocio || !negocio.owner_id) throw new Error("No se encontró tu negocio.");

    // Solo el dueño o administrador del negocio con licencia activa puede modificar el entrenamiento del agente.
    const [{ data: esAdmin }, { data: licenciaActiva }] = await Promise.all([
      context.supabase.rpc("es_dueno_o_admin_negocio", { p_owner_id: negocio.owner_id }),
      context.supabase.rpc("licencia_activa_para", { p_owner: negocio.owner_id }),
    ]);
    if (esAdmin !== true) {
      throw new Error("Solo el dueño o administrador del negocio puede modificar las instrucciones del asistente.");
    }
    if (licenciaActiva === false) {
      throw new Error("Tu licencia está vencida o suspendida.");
    }

    const tipo = String(negocio.tipo_negocio || "comercio general").slice(0, 80);
    const ciudad = String(negocio.ciudad || "Colombia").slice(0, 80);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${llave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelo,
        messages: [
          {
            role: "system",
            content:
              "Eres un consultor comercial experto en ventas por WhatsApp en Colombia. Respondes SOLO con un objeto JSON válido, en español, sin texto adicional ni bloques de código.",
          },
          {
            role: "user",
            content: `Negocio del gremio "${tipo}" en ${ciudad}, Colombia. Devuelve un JSON con estas 4 claves, cada una con texto plano claro y breve (sin inventar precios ni datos del negocio):
"faq": las 10 preguntas más frecuentes de este gremio en Colombia, cada una con su mejor respuesta comercial (formato "P: ... R: ...").
"objeciones": los 5 dolores u objeciones principales de los clientes y cómo rebatirlos para cerrar la venta.
"filtro": las 5 preguntas filtro obligatorias para calificar si un comprador es viable.
"garantias_pqrs": protocolo estándar de garantías y PQRS (peticiones, quejas, reclamos, sugerencias) para este rubro: qué datos pedir, cómo resolver y cuándo escalar.`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error("La IA no pudo generar el conocimiento. Intenta de nuevo.");
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const bruto = json.choices?.[0]?.message?.content ?? "";
    const m = bruto.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("La IA devolvió una respuesta inesperada.");
    let obj: Record<string, unknown>;
    try {
      obj = JSON.parse(m[0]) as Record<string, unknown>;
    } catch {
      throw new Error("La IA devolvió una respuesta inesperada.");
    }
    const aTexto = (v: unknown): string =>
      Array.isArray(v) ? v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join("\n") : typeof v === "string" ? v : v ? JSON.stringify(v) : "";

    const secciones: Seccion[] = [
      { clave: "faq", titulo: "PREGUNTAS FRECUENTES", texto: aTexto(obj.faq) },
      { clave: "objeciones", titulo: "OBJECIONES Y CÓMO REBATIRLAS", texto: aTexto(obj.objeciones) },
      { clave: "filtro", titulo: "PREGUNTAS FILTRO PARA CALIFICAR", texto: aTexto(obj.filtro) },
      { clave: "garantias_pqrs", titulo: "GARANTÍAS Y PQRS", texto: aTexto(obj.garantias_pqrs) },
    ].filter((s) => s.texto.trim().length > 10);
    if (secciones.length === 0) throw new Error("La IA no generó contenido útil.");

    const duenoId = negocio.owner_id;
    if (!duenoId) throw new Error("No se encontró el dueño del negocio.");

    // Reemplaza el conocimiento de sector anterior (RLS: solo el dueño borra e inserta lo suyo).
    await context.supabase.from("agente_memoria").delete().eq("negocio_id", negocio.id).eq("tipo", "sector");
    const { error } = await context.supabase.from("agente_memoria").insert(
      secciones.map((s) => ({
        negocio_id: negocio.id,
        owner_id: duenoId,
        tipo: "sector",
        contenido: `${s.titulo}:\n${s.texto.trim().slice(0, 2400)}`,
      })),
    );
    if (error) throw new Error("No se pudo guardar el conocimiento.");
    return { secciones: secciones.length };
  });
