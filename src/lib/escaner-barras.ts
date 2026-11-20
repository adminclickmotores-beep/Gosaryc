import type { KeyboardEvent } from "react";

/**
 * Genera un código EAN-13 válido con prefijo interno GS1 (200) y dígito de control real.
 */
export function generarEAN13(): string {
  let base = "200";
  for (let i = 0; i < 9; i++) {
    base += String(Math.floor(Math.random() * 10));
  }
  let suma = 0;
  for (let i = 0; i < 12; i++) {
    const digito = Number(base[i]);
    suma += i % 2 === 0 ? digito : digito * 3;
  }
  const control = (10 - (suma % 10)) % 10;
  return `${base}${control}`;
}

/**
 * Evita que el Enter automático de la pistola de código de barras envíe un formulario por accidente.
 */
export function evitarSubmitConEnter(e: KeyboardEvent<HTMLInputElement>): void {
  if (e.key === "Enter") {
    e.preventDefault();
  }
}

let audioCtx: AudioContext | null = null;

/**
 * Reproduce un beep corto de confirmación o alerta usando Web Audio API (sin archivos externos).
 */
export function reproducirBeep(tipo: "ok" | "error" = "ok"): void {
  if (typeof window === "undefined") return;
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    if (audioCtx.state === "suspended") {
      void audioCtx.resume();
    }
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = tipo === "ok" ? "sine" : "sawtooth";
    osc.frequency.setValueAtTime(tipo === "ok" ? 1046.5 : 240, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(tipo === "ok" ? 0.14 : 0.12, audioCtx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioCtx.currentTime + (tipo === "ok" ? 0.095 : 0.18),
    );
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + (tipo === "ok" ? 0.1 : 0.19));
  } catch {
    // Si el navegador bloquea el audio, continúa sin interrumpir la venta.
  }
}

// ============================================================
// Control local de descuentos de stock en Modo Offline
// ============================================================
type TablaStock = "com_productos" | "restaurante_productos";
const CLAVE_STOCK_OFFLINE = "gosaryc:stock-offline-deltas";

function leerMapaOffline(): Record<string, Record<string, number>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CLAVE_STOCK_OFFLINE);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, Record<string, number>>)
      : {};
  } catch {
    return {};
  }
}

function guardarMapaOffline(mapa: Record<string, Record<string, number>>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLAVE_STOCK_OFFLINE, JSON.stringify(mapa));
  } catch {
    // Sin espacio disponible en localStorage.
  }
}

/**
 * Registra localmente el descuento de inventario mientras la venta espera sincronización offline.
 */
export function descontarStockOffline(
  tabla: TablaStock,
  items: { productoId: string; cantidad: number }[],
): void {
  if (items.length === 0) return;
  const mapa = leerMapaOffline();
  const actual = { ...(mapa[tabla] ?? {}) };
  for (const item of items) {
    if (!item.productoId || !Number.isFinite(item.cantidad) || item.cantidad <= 0) continue;
    actual[item.productoId] = (actual[item.productoId] ?? 0) + item.cantidad;
  }
  mapa[tabla] = actual;
  guardarMapaOffline(mapa);
}

/**
 * Limpia los descuentos offline locales cuando la cola ya se sincronizó con Supabase.
 */
export function limpiarStockOffline(tabla?: TablaStock): void {
  if (!tabla) {
    guardarMapaOffline({});
    return;
  }
  const mapa = leerMapaOffline();
  delete mapa[tabla];
  guardarMapaOffline(mapa);
}

/**
 * Devuelve el stock efectivo considerando las ventas hechas en Modo Offline aún pendientes de subir.
 */
export function stockEfectivoOffline(
  tabla: TablaStock,
  productoId: string,
  stockBase: number,
  permitirNegativo = false,
): number {
  const mapa = leerMapaOffline();
  const descontado = mapa[tabla]?.[productoId] ?? 0;
  const resultado = stockBase - descontado;
  return permitirNegativo ? resultado : Math.max(0, resultado);
}
