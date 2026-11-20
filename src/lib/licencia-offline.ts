/**
 * Caché local solo para consulta sin conexión (Modo Offline).
 * La validación real de licencias y el bloqueo de ventas/facturas se aplican siempre
 * en el servidor (PostgreSQL RLS). No contiene secretos ni bypass en el navegador.
 */

const CLAVE_TOKEN = "gosaryc:licencia-cache-v2";
const CLAVE_DISPOSITIVO = "gosaryc:dispositivo-id-v1";

/** Sin internet la caché local sirve como máximo 7 días desde la última validación en línea. */
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

/** Guarda el último estado validado por Supabase para mostrarlo únicamente si se cae internet. */
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
    const registro: TokenLicenciaOffline = {
      owner_id: datos.owner_id,
      negocio_id: datos.negocio_id,
      dispositivo_id: obtenerIdDispositivo(),
      plan: datos.plan,
      estado: datos.estado,
      vence_en: datos.vence_en,
      dias_gracia: Math.max(0, Math.min(30, Number(datos.dias_gracia ?? 3) || 0)),
      validado_en: new Date().toISOString(),
    };
    window.localStorage.setItem(CLAVE_TOKEN, JSON.stringify(registro));
  } catch {
    // Almacenamiento no disponible.
  }
}

/**
 * Lee la última caché de licencia ÚNICAMENTE cuando el dispositivo está sin conexión.
 * En línea siempre devuelve null para obligar la validación contra el servidor.
 */
export async function leerTokenLicenciaOffline(ownerId?: string): Promise<TokenLicenciaOffline | null> {
  if (typeof window === "undefined") return null;
  if (typeof navigator !== "undefined" && navigator.onLine) return null;
  try {
    const raw = window.localStorage.getItem(CLAVE_TOKEN);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<TokenLicenciaOffline>;
    if (!parsed || typeof parsed !== "object" || !parsed.owner_id || !parsed.vence_en) {
      return null;
    }
    if (ownerId && parsed.owner_id !== ownerId) return null;
    const base: TokenLicenciaOffline = {
      owner_id: String(parsed.owner_id),
      negocio_id: String(parsed.negocio_id ?? ""),
      dispositivo_id: String(parsed.dispositivo_id ?? ""),
      plan: String(parsed.plan ?? "prueba"),
      estado: String(parsed.estado ?? "activo"),
      vence_en: String(parsed.vence_en),
      dias_gracia: Math.max(0, Math.min(30, Number(parsed.dias_gracia ?? 3) || 0)),
      validado_en: String(parsed.validado_en ?? ""),
    };
    const validadoMs = new Date(base.validado_en).getTime();
    const venceMs = new Date(base.vence_en).getTime();
    if (!Number.isFinite(validadoMs) || !Number.isFinite(venceMs)) return null;
    if (validadoMs > Date.now() + 5 * 60 * 1000) return null;
    if (Date.now() - validadoMs > VIDA_MAX_OFFLINE_MS) return null;
    if (venceMs - validadoMs > VENCE_MAX_MS) return null;
    if (base.dispositivo_id !== obtenerIdDispositivo()) return null;
    return base;
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
