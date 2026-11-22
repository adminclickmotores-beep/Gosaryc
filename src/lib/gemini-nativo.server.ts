/**
 * Herramientas nativas de Gemini (solo servidor): salida JSON con esquema estricto,
 * ejecución de código para cálculos exactos y entradas multimodales (imagen/audio).
 * Usa la misma GEMINI_API_KEY. Devuelve null si no hay llave o fallan todos los modelos,
 * para que quien llama use su respaldo.
 */
import { MODELO_FLASH, MODELO_LITE, MODELO_PRO, esErrorReintentable } from "@/lib/ia-motores";

export type ParteNativa = { text: string } | { inlineData: { mimeType: string; data: string } };
export type TurnoNativo = { role: "user" | "model"; parts: ParteNativa[] };

type RespuestaNativa = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

async function llamar(
  cuerpo: Record<string, unknown>,
  modelos: string[],
  timeoutMs: number,
): Promise<string | null> {
  const llave = process.env.GEMINI_API_KEY;
  if (!llave) return null;
  for (const modelo of modelos) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": llave, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(timeoutMs),
        body: JSON.stringify(cuerpo),
      });
      if (!res.ok) {
        if (esErrorReintentable(res.status)) continue;
        return null;
      }
      const json = (await res.json()) as RespuestaNativa;
      const texto = (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
      if (texto) return texto;
    } catch {
      // se prueba el siguiente modelo
    }
  }
  return null;
}

/** JSON estricto: responseMimeType application/json + responseSchema. Devuelve el objeto ya interpretado. */
export async function generarJsonEstricto<T>(o: {
  sistema: string;
  partes: ParteNativa[];
  esquema: Record<string, unknown>;
  modelos?: string[];
  timeoutMs?: number;
}): Promise<T | null> {
  const texto = await llamar(
    {
      systemInstruction: { parts: [{ text: o.sistema }] },
      contents: [{ role: "user", parts: o.partes }],
      generationConfig: { responseMimeType: "application/json", responseSchema: o.esquema, temperature: 0 },
    },
    o.modelos ?? [MODELO_FLASH, MODELO_LITE],
    o.timeoutMs ?? 45000,
  );
  if (!texto) return null;
  try {
    return JSON.parse(texto) as T;
  } catch {
    return null;
  }
}

/** Respuesta de texto con ejecución de código (codeExecution) para cálculos sin margen de error. */
export async function responderConCodigo(o: {
  sistema: string;
  turnos: TurnoNativo[];
  expertos?: boolean;
  timeoutMs?: number;
}): Promise<string | null> {
  return llamar(
    {
      systemInstruction: { parts: [{ text: o.sistema }] },
      contents: o.turnos,
      tools: [{ codeExecution: {} }],
    },
    o.expertos === false ? [MODELO_FLASH, MODELO_LITE] : [MODELO_PRO, MODELO_FLASH, MODELO_LITE],
    o.timeoutMs ?? 50000,
  );
}
