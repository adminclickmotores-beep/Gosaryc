/**
 * Rastreo en internet con Google Search Grounding (herramienta nativa googleSearch de Gemini).
 * Solo servidor. Usa la API nativa generateContent porque la compatible con OpenAI no admite googleSearch.
 */
import { MODELO_FLASH, MODELO_LITE, MODELO_PRO, esErrorReintentable } from "@/lib/ia-motores";

export type FuenteWeb = { titulo: string; url: string };
export type Hallazgo = { texto: string; fuentes: FuenteWeb[]; modelo: string };

type RespuestaNativa = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> };
  }>;
};

/** Consulta internet con googleSearch. Respaldo automático Pro → Flash → Lite. Devuelve null si no hay llave o falla todo. */
export async function buscarEnInternet(
  pregunta: string,
  o: { llave?: string; sistema?: string; expertos?: boolean; timeoutMs?: number; calculo?: boolean } = {},
): Promise<Hallazgo | null> {
  const llave = o.llave || process.env.GEMINI_API_KEY;
  if (!llave) return null;
  const modelos = o.expertos === false ? [MODELO_FLASH, MODELO_LITE] : [MODELO_PRO, MODELO_FLASH, MODELO_LITE];
  for (const modelo of modelos) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": llave, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(o.timeoutMs ?? 40000),
        body: JSON.stringify({
          systemInstruction: o.sistema ? { parts: [{ text: o.sistema }] } : undefined,
          contents: [{ role: "user", parts: [{ text: pregunta }] }],
          // calculo: además de buscar, el modelo puede ejecutar código para cifras exactas.
          tools: o.calculo ? [{ googleSearch: {} }, { codeExecution: {} }] : [{ googleSearch: {} }],
        }),
      });
      if (!res.ok) {
        if (esErrorReintentable(res.status)) continue;
        return null;
      }
      const json = (await res.json()) as RespuestaNativa;
      const cand = json.candidates?.[0];
      const texto = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
      if (!texto) continue;
      const vistas = new Set<string>();
      const fuentes: FuenteWeb[] = [];
      for (const c of cand?.groundingMetadata?.groundingChunks ?? []) {
        const url = c.web?.uri;
        if (!url || vistas.has(url)) continue;
        vistas.add(url);
        fuentes.push({ titulo: (c.web?.title ?? url).slice(0, 120), url });
      }
      return { texto, fuentes: fuentes.slice(0, 5), modelo };
    } catch {
      // se prueba el siguiente modelo
    }
  }
  return null;
}

/** Saca el primer arreglo o objeto JSON de un texto (el modelo con búsqueda no admite esquema fijo). */
export function extraerJson<T>(texto: string, tipo: "array" | "object"): T | null {
  const m = texto.match(tipo === "array" ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}
