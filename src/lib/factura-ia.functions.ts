/**
 * Lector IA de facturas de proveedor: extrae proveedor, NIT, fecha, número y totales
 * de una foto de factura. El usuario revisa y confirma antes de guardar nada.
 * Usa la llave gratuita de Gemini si existe; si no, la IA integrada de Lovable.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAiQuota } from "@/lib/ai-quota.server";
import { generarJsonEstricto } from "@/lib/gemini-nativo.server";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-2.5-flash";

/** Tamaño máximo de la imagen en texto base64 (aprox. 6 MB reales). */
const MAX_BASE64 = 8_000_000;

export type FacturaLeida = {
  proveedor: string;
  nit: string;
  numero: string;
  fecha: string | null;
  total: number | null;
  iva: number | null;
  items: Array<{ descripcion: string; cantidad: number | null; valor_total: number | null }>;
};

const destino = () => {
  const geminiKey = process.env.GEMINI_API_KEY;
  return {
    endpoint: geminiKey ? GEMINI_ENDPOINT : GATEWAY,
    modelo: geminiKey ? GEMINI_MODEL : MODEL,
    llave: geminiKey || process.env.LOVABLE_API_KEY,
  };
};

const numeroONulo = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const limpio = Number(v.replace(/[^0-9.-]/g, ""));
    return Number.isFinite(limpio) && v.trim() !== "" ? limpio : null;
  }
  return null;
};

const textoSeguro = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

export const leerFacturaIA = createServerFn({ method: "POST" })
  .inputValidator((d: { imagen: string }) => d)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }): Promise<FacturaLeida> => {
    const imagen = typeof data.imagen === "string" ? data.imagen : "";
    if (!imagen.startsWith("data:image/")) throw new Error("Sube una foto o imagen de la factura.");
    if (imagen.length > MAX_BASE64) throw new Error("La imagen es muy pesada. Usa una foto más pequeña.");

    await assertAiQuota(context.supabase, "factura-lector");

    // 1) Salida estructurada nativa de Gemini (responseSchema estricto).
    const mime = imagen.slice(5, imagen.indexOf(";")) || "image/jpeg";
    const base64 = imagen.slice(imagen.indexOf(",") + 1);
    const estricto = await generarJsonEstricto<Record<string, unknown>>({
      sistema:
        "Eres un auxiliar contable colombiano. Lees facturas de proveedores y devuelves SOLO el JSON del esquema. Si un dato no se ve claro, déjalo vacío o en null; nunca inventes cifras.",
      partes: [
        {
          text: "Extrae de esta factura: nombre del proveedor, NIT, número de factura, fecha (AAAA-MM-DD), IVA, total a pagar y los ítems con descripción, cantidad y valor total de la línea. Cifras en pesos colombianos sin separadores.",
        },
        { inlineData: { mimeType: mime, data: base64 } },
      ],
      esquema: {
        type: "OBJECT",
        properties: {
          proveedor: { type: "STRING" },
          nit: { type: "STRING" },
          numero: { type: "STRING" },
          fecha: { type: "STRING", nullable: true },
          iva: { type: "NUMBER", nullable: true },
          total: { type: "NUMBER", nullable: true },
          items: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                descripcion: { type: "STRING" },
                cantidad: { type: "NUMBER", nullable: true },
                valor_total: { type: "NUMBER", nullable: true },
              },
              required: ["descripcion"],
            },
          },
        },
        required: ["proveedor", "total"],
      },
    });
    if (estricto) return normalizarFactura(estricto);

    // 2) Respaldo: función con la API compatible o la IA integrada.
    const { endpoint, modelo, llave } = destino();
    if (!llave) throw new Error("La IA todavía no está configurada.");

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${llave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelo,
        messages: [
          {
            role: "system",
            content:
              "Eres un auxiliar contable colombiano. Lees facturas de proveedores y devuelves SOLO los datos con la función return_factura. Si un dato no se ve claro, déjalo vacío o en null; nunca inventes cifras.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extrae de esta factura: nombre del proveedor, NIT, número de factura, fecha (AAAA-MM-DD), IVA, total a pagar y los ítems con descripción, cantidad y valor total de la línea. Cifras en pesos colombianos sin separadores.",
              },
              { type: "image_url", image_url: { url: imagen } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_factura",
              parameters: {
                type: "object",
                properties: {
                  proveedor: { type: "string" },
                  nit: { type: "string" },
                  numero: { type: "string" },
                  fecha: { type: "string" },
                  iva: { type: "number" },
                  total: { type: "number" },
                  items: {
                    type: "array",
                    maxItems: 60,
                    items: {
                      type: "object",
                      properties: {
                        descripcion: { type: "string" },
                        cantidad: { type: "number" },
                        valor_total: { type: "number" },
                      },
                      required: ["descripcion"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["proveedor", "total"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_factura" } },
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
    if (!args) throw new Error("No pude leer la factura. Intenta con una foto más clara.");
    return normalizarFactura(JSON.parse(args) as Record<string, unknown>);
  });

function normalizarFactura(parsed: Record<string, unknown>): FacturaLeida {
  const fechaTexto = textoSeguro(parsed.fecha, 10);
  const items = Array.isArray(parsed.items) ? (parsed.items as unknown[]) : [];
  return {
    proveedor: textoSeguro(parsed.proveedor, 120),
    nit: textoSeguro(parsed.nit, 30),
    numero: textoSeguro(parsed.numero, 40),
    fecha: /^\d{4}-\d{2}-\d{2}$/.test(fechaTexto) ? fechaTexto : null,
    total: numeroONulo(parsed.total),
    iva: numeroONulo(parsed.iva),
    items: items.slice(0, 60).map((it: unknown) => {
      const r = (it ?? {}) as Record<string, unknown>;
      return {
        descripcion: textoSeguro(r.descripcion, 160),
        cantidad: numeroONulo(r.cantidad),
        valor_total: numeroONulo(r.valor_total),
      };
    }),
  };
}
