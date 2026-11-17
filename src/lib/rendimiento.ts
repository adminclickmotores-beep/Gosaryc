/**
 * Utilidades de rendimiento: paginación, límites y caché en memoria.
 * Evita traer miles de filas de una vez y evita reconsultas innecesarias.
 */

/** Tamaño de página estándar para listados grandes. */
export const TAMANO_PAGINA = 50;
/** Límite máximo de seguridad por consulta (nunca traer "todo" sin límite). */
export const LIMITE_CONSULTA = 500;

/** Calcula el rango [desde, hasta] para .range() de Supabase (página base 0). */
export function rangoPagina(pagina: number, tamano: number = TAMANO_PAGINA): { desde: number; hasta: number } {
  const p = Math.max(0, Math.floor(pagina));
  const t = Math.min(Math.max(1, tamano), LIMITE_CONSULTA);
  return { desde: p * t, hasta: p * t + t - 1 };
}

type EntradaCache<T> = { valor: T; vence: number };
const CACHE = new Map<string, EntradaCache<unknown>>();
const TTL_MS = 30_000;

/** Caché simple en memoria (30 s) para consultas que se repiten al navegar. */
export function leerCache<T>(clave: string): T | null {
  const e = CACHE.get(clave) as EntradaCache<T> | undefined;
  if (!e) return null;
  if (Date.now() > e.vence) {
    CACHE.delete(clave);
    return null;
  }
  return e.valor;
}

export function guardarCache<T>(clave: string, valor: T, ttlMs: number = TTL_MS): void {
  if (CACHE.size > 200) CACHE.clear();
  CACHE.set(clave, { valor, vence: Date.now() + ttlMs });
}

export function limpiarCache(claveEmpieza?: string): void {
  if (!claveEmpieza) {
    CACHE.clear();
    return;
  }
  for (const k of Array.from(CACHE.keys())) {
    if (k.startsWith(claveEmpieza)) CACHE.delete(k);
  }
}
