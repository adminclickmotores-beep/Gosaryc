/**
 * Motores de IA de Gosaryc (Google Gemini) y respaldo automático entre modelos.
 * Sin dependencias de servidor ni de navegador: sirve en ambos lados.
 */
export const MODELO_FLASH = "gemini-2.5-flash";
export const MODELO_PRO = "gemini-2.5-pro";
export const MODELO_LITE = "gemini-2.5-flash-lite";

export const ENDPOINT_GEMINI = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
export const ENDPOINT_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export type PerfilIA = "turbo" | "experto";
export const PERFIL_POR_DEFECTO: PerfilIA = "turbo";

/** Para qué se usa la IA: define el motor principal. */
export type UsoIA = "whatsapp" | "comandos" | "voz" | "imagen" | "admin" | "contador" | "sst" | "secop" | "estrategia";

/** Usos que requieren razonamiento experto profundo (siempre Pro). */
const USOS_EXPERTOS: UsoIA[] = ["admin", "contador", "sst", "secop", "estrategia"];

export const PERFILES_IA: Array<{ id: PerfilIA; titulo: string; modelo: string; descripcion: string }> = [
  {
    id: "turbo",
    titulo: "Modo Turbo 24/7",
    modelo: MODELO_FLASH,
    descripcion: "Ideal para WhatsApp masivo, toma rápida de pedidos y comandos remotos. Responde en segundos.",
  },
  {
    id: "experto",
    titulo: "Modo Experto Pro",
    modelo: MODELO_PRO,
    descripcion: "Máxima capacidad de análisis, cierre de ventas de alto valor y asesoría contable, tributaria y SST.",
  },
];

export function normalizarPerfil(v: unknown): PerfilIA {
  return v === "experto" ? "experto" : "turbo";
}

/** Motor principal según el perfil elegido y el uso. */
export function resolverModelo(perfil: PerfilIA, uso: UsoIA): string {
  if (USOS_EXPERTOS.includes(uso)) return MODELO_PRO;
  return perfil === "experto" ? MODELO_PRO : MODELO_FLASH;
}

/** Cadena de modelos: el principal y, si se agota el límite por minuto, los de respaldo. */
export function cadenaModelos(perfil: PerfilIA, uso: UsoIA): string[] {
  const principal = resolverModelo(perfil, uso);
  const cadena = principal === MODELO_PRO ? [MODELO_PRO, MODELO_FLASH, MODELO_LITE] : [MODELO_FLASH, MODELO_PRO, MODELO_LITE];
  return cadena;
}

/** Errores que justifican probar el siguiente modelo (límite de peticiones, saturación, modelo no disponible). */
export function esErrorReintentable(estado: number): boolean {
  return estado === 429 || estado === 404 || estado === 408 || estado >= 500;
}

/** Ejecuta la llamada con cada modelo de la cadena hasta que uno responda. */
export async function conRespaldoDeModelos(
  modelos: string[],
  llamar: (modelo: string) => Promise<Response>,
): Promise<{ res: Response | null; modelo: string; intentos: string[] }> {
  const intentos: string[] = [];
  let ultima: Response | null = null;
  let ultimoModelo = modelos[0] ?? MODELO_FLASH;
  for (const modelo of modelos) {
    intentos.push(modelo);
    ultimoModelo = modelo;
    try {
      const res = await llamar(modelo);
      if (res.ok) return { res, modelo, intentos };
      ultima = res;
      if (!esErrorReintentable(res.status)) break;
    } catch {
      // se prueba el siguiente modelo
    }
  }
  return { res: ultima, modelo: ultimoModelo, intentos };
}

export type OpcionesChat = {
  geminiKey?: string;
  lovableKey?: string;
  perfil?: PerfilIA;
  uso: UsoIA;
  /** Cuerpo de la petición sin el campo "model" (messages, tools, tool_choice...). */
  body: Record<string, unknown>;
};

/**
 * Chat con respaldo automático: primero la llave de Gemini con la cadena de modelos,
 * y si no alcanza, la IA integrada. Devuelve la primera respuesta válida o la última con error.
 */
export async function chatConRespaldo(
  o: OpcionesChat,
): Promise<{ res: Response | null; modelo: string; ms: number; proveedor: "gemini" | "integrada" | "" }> {
  const inicio = Date.now();
  const modelos = cadenaModelos(o.perfil ?? PERFIL_POR_DEFECTO, o.uso);
  let ultima: Response | null = null;
  let ultimoModelo = modelos[0];
  if (o.geminiKey) {
    const r = await conRespaldoDeModelos(modelos, (modelo) =>
      fetch(ENDPOINT_GEMINI, {
        method: "POST",
        headers: { Authorization: `Bearer ${o.geminiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...o.body, model: modelo }),
      }),
    );
    if (r.res?.ok) return { res: r.res, modelo: r.modelo, ms: Date.now() - inicio, proveedor: "gemini" };
    ultima = r.res;
    ultimoModelo = r.modelo;
  }
  if (o.lovableKey) {
    const r = await conRespaldoDeModelos(modelos, (modelo) =>
      fetch(ENDPOINT_GATEWAY, {
        method: "POST",
        headers: { Authorization: `Bearer ${o.lovableKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...o.body, model: `google/${modelo}` }),
      }),
    );
    if (r.res?.ok) return { res: r.res, modelo: r.modelo, ms: Date.now() - inicio, proveedor: "integrada" };
    ultima = r.res ?? ultima;
    ultimoModelo = r.modelo;
  }
  return { res: ultima, modelo: ultimoModelo, ms: Date.now() - inicio, proveedor: "" };
}
