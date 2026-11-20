/**
 * Token firmado localmente para validación de licencias en Modo Offline.
 * Permite que un negocio con licencia vigente (o en periodo de gracia) siga trabajando
 * aunque se quede sin internet, y bloquea de forma amigable si la licencia ya venció.
 */

const CLAVE_TOKEN = "gosaryc:licencia-token-v1";
const CLAVE_DISPOSITIVO = "gosaryc:dispositivo-id-v1";
const SEMILLA_FIRMA = "gosaryc-colombia-lic-2026-v1";

/** Sin internet el token sirve como máximo 7 días desde la última validación en línea. */
const VIDA_MAX_OFFLINE_MS = 7 * 86400000;
/** Ninguna licencia real vence más de ~2 años después de validarse. */
const VENCE_MAX_MS = 800 * 86400000;

export type TokenLicenciaOffline = {
  owner_id: string;
  negocio_id: string;
  dispositivo_id: string;
  plan: string;
  estado: string;
  vence_en: string;
  dias_gracia: number;
  validado_en: string;
  firma: string;
};

export function obtenerIdDispositivo(): string {
  if (typeof window === "undefined") return "servidor";
  try {
    const existente = window.localStorage.getItem(CLAVE_DISPOSITIVO);
    if (existente) return existente;
    const nuevo =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? `GSR-${crypto.randomUUID().slice(0, 12).toUpperCase()}`
        : `GSR-${Date.now().toString(36).toUpperCase()}`;
    window.localStorage.setItem(CLAVE_DISPOSITIVO, nuevo);
    return nuevo;
  } catch {
    return "GSR-LOCAL";
  }
}

async function firmarCarga(carga: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const data = new TextEncoder().encode(`${SEMILLA_FIRMA}|${carga}`);
      const hash = await crypto.subtle.digest("SHA-256", data);
      return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      // Fallback determinístico si subtle no está disponible (p. ej. HTTP no localhost)
    }
  }
  let h = 2166136261;
  const texto = `${SEMILLA_FIRMA}|${carga}`;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function construirCarga(t: Omit<TokenLicenciaOffline, "firma">): string {
  return [
    t.owner_id,
    t.negocio_id,
    t.dispositivo_id,
    t.plan,
    t.estado,
    t.vence_en,
    String(t.dias_gracia),
    t.validado_en,
  ].join("|");
}

/** Guarda un token firmado localmente tras validar la licencia en línea con Supabase. */
export async function guardarTokenLicenciaOffline(datos: {
  owner_id: string;
  negocio_id: string;
  plan: string;
  estado: string;
  vence_en: string;
  dias_gracia?: number | null;
}): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const base: Omit<TokenLicenciaOffline, "firma"> = {
      owner_id: datos.owner_id,
      negocio_id: datos.negocio_id,
      dispositivo_id: obtenerIdDispositivo(),
      plan: datos.plan,
      estado: datos.estado,
      vence_en: datos.vence_en,
      dias_gracia: Math.max(0, Math.min(30, Number(datos.dias_gracia ?? 3) || 0)),
      validado_en: new Date().toISOString(),
    };
    const firma = await firmarCarga(construirCarga(base));
    const token: TokenLicenciaOffline = { ...base, firma };
    window.localStorage.setItem(CLAVE_TOKEN, JSON.stringify(token));
  } catch {
    // Almacenamiento no disponible.
  }
}

/** Lee y verifica la firma del token local de licencia para operar en Modo Offline. */
export async function leerTokenLicenciaOffline(ownerId?: string): Promise<TokenLicenciaOffline | null> {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CLAVE_TOKEN);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TokenLicenciaOffline>;
    if (!parsed || typeof parsed !== "object" || !parsed.owner_id || !parsed.vence_en || !parsed.firma) {
      return null;
    }
    if (ownerId && parsed.owner_id !== ownerId) return null;
    const base: Omit<TokenLicenciaOffline, "firma"> = {
      owner_id: String(parsed.owner_id),
      negocio_id: String(parsed.negocio_id ?? ""),
      dispositivo_id: String(parsed.dispositivo_id ?? ""),
      plan: String(parsed.plan ?? "prueba"),
      estado: String(parsed.estado ?? "activo"),
      vence_en: String(parsed.vence_en),
      dias_gracia: Math.max(0, Math.min(30, Number(parsed.dias_gracia ?? 3) || 0)),
      validado_en: String(parsed.validado_en ?? ""),
    };
    const esperada = await firmarCarga(construirCarga(base));
    if (esperada !== parsed.firma) return null;
    // Límites que un token fabricado a mano no puede saltarse:
    const validadoMs = new Date(base.validado_en).getTime();
    const venceMs = new Date(base.vence_en).getTime();
    if (!Number.isFinite(validadoMs) || !Number.isFinite(venceMs)) return null;
    if (validadoMs > Date.now() + 5 * 60 * 1000) return null; // validado "en el futuro"
    if (Date.now() - validadoMs > VIDA_MAX_OFFLINE_MS) return null; // hay que reconectar a internet
    if (venceMs - validadoMs > VENCE_MAX_MS) return null; // vencimiento imposible de largo
    if (base.dispositivo_id !== obtenerIdDispositivo()) return null; // token copiado de otro equipo
    return { ...base, firma: parsed.firma };
  } catch {
    return null;
  }
}

/** Evalúa el estado real de vigencia considerando el periodo de gracia configurable. */
export function evaluarVigenciaLicencia(
  estado: string,
  venceEnIso: string,
  diasGracia = 3,
): {
  bloqueo: "suspendido" | "vencido" | null;
  enGracia: boolean;
  diasRestantes: number;
  diasGraciaRestantes: number;
} {
  if (estado === "suspendido") {
    return { bloqueo: "suspendido", enGracia: false, diasRestantes: 0, diasGraciaRestantes: 0 };
  }
  const ahora = Date.now();
  const venceMs = new Date(venceEnIso).getTime();
  if (!Number.isFinite(venceMs)) {
    return { bloqueo: null, enGracia: false, diasRestantes: 30, diasGraciaRestantes: 0 };
  }
  const diffMs = venceMs - ahora;
  const diasRestantes = Math.ceil(diffMs / 86400000);
  if (diffMs > 0) {
    return { bloqueo: null, enGracia: false, diasRestantes, diasGraciaRestantes: 0 };
  }
  const graciaMs = Math.max(0, diasGracia) * 86400000;
  const limiteGraciaMs = venceMs + graciaMs;
  if (ahora <= limiteGraciaMs && graciaMs > 0) {
    return {
      bloqueo: null,
      enGracia: true,
      diasRestantes: 0,
      diasGraciaRestantes: Math.max(1, Math.ceil((limiteGraciaMs - ahora) / 86400000)),
    };
  }
  return { bloqueo: "vencido", enGracia: false, diasRestantes, diasGraciaRestantes: 0 };
}
