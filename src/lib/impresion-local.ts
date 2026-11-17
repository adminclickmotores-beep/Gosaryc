/**
 * Impresión directa por API local de escritorio (http://127.0.0.1:8765).
 * - En Windows con la app instalada: imprime sin diálogos en la impresora
 *   elegida (caja para facturas, cocina para comandas) y guarda facturas
 *   en cola local cuando no hay internet.
 * - En celular o navegador sin el servicio: devuelve { disponible: false } y la
 *   app usa la impresión normal del navegador, sin mostrar error.
 */

const URL_BASE = "http://127.0.0.1:8765";
const CLAVE_SWITCH = "gosaryc:impresion-directa";
const CLAVE_CAJA = "gosaryc:impresora-caja";
const CLAVE_COCINA = "gosaryc:impresora-cocina";
const CLAVE_AUTO_COMANDA = "gosaryc:auto-comanda";

function leerClave(clave: string): string {
  try {
    return window.localStorage.getItem(clave) ?? "";
  } catch {
    return "";
  }
}

function guardarClave(clave: string, valor: string): void {
  try {
    window.localStorage.setItem(clave, valor);
  } catch { /* modo privado */ }
}

export function impresionDirectaActivada(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_SWITCH) === "1";
  } catch {
    return false;
  }
}

export function fijarImpresionDirecta(v: boolean): void {
  guardarClave(CLAVE_SWITCH, v ? "1" : "0");
}

/** Nombre de la impresora de caja (facturas). Vacío = predeterminada de Windows. */
export function leerImpresoraCaja(): string {
  return leerClave(CLAVE_CAJA);
}

export function fijarImpresoraCaja(nombre: string): void {
  guardarClave(CLAVE_CAJA, (nombre || "").slice(0, 200));
}

/** Nombre de la impresora de cocina (comandas). Vacío = predeterminada de Windows. */
export function leerImpresoraCocina(): string {
  return leerClave(CLAVE_COCINA);
}

export function fijarImpresoraCocina(nombre: string): void {
  guardarClave(CLAVE_COCINA, (nombre || "").slice(0, 200));
}

/** ¿Imprimir la comanda en cocina automáticamente al entrar un pedido? (por defecto sí). */
export function autoComandaActivada(): boolean {
  try {
    const v = window.localStorage.getItem(CLAVE_AUTO_COMANDA);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function fijarAutoComanda(v: boolean): void {
  guardarClave(CLAVE_AUTO_COMANDA, v ? "1" : "0");
}

async function conTiempo(ms: number, promesa: Promise<Response>): Promise<Response | null> {
  const ctrl = new AbortController();
  const t = window.setTimeout(() => ctrl.abort(), ms);
  try {
    // La señal se pasa recreando el fetch: el servicio local responde en <1s.
    const r = await promesa;
    return r;
  } catch {
    return null;
  } finally {
    window.clearTimeout(t);
    try { ctrl.abort(); } catch { /* noop */ }
  }
}

export type EstadoApiLocal = {
  disponible: boolean;
  impresoras: string[];
  predeterminada: string;
  impresoraCaja: string;
  impresoraCocina: string;
  pendientes: number;
};

const SIN_API: EstadoApiLocal = {
  disponible: false,
  impresoras: [],
  predeterminada: "",
  impresoraCaja: "",
  impresoraCocina: "",
  pendientes: 0,
};

/** ¿Está corriendo la API local? Nunca lanza error: si no está, disponible=false. */
export async function estadoApiLocal(): Promise<EstadoApiLocal> {
  try {
    const r = await fetch(`${URL_BASE}/api/estado`, { cache: "no-store" });
    if (!r.ok) return SIN_API;
    const j = (await r.json()) as {
      impresoras?: string[];
      predeterminada?: string;
      impresoraCaja?: string;
      impresoraCocina?: string;
      pendientes?: number;
    };
    return {
      disponible: true,
      impresoras: Array.isArray(j.impresoras) ? j.impresoras : [],
      predeterminada: typeof j.predeterminada === "string" ? j.predeterminada : "",
      impresoraCaja: typeof j.impresoraCaja === "string" ? j.impresoraCaja : "",
      impresoraCocina: typeof j.impresoraCocina === "string" ? j.impresoraCocina : "",
      pendientes: typeof j.pendientes === "number" ? j.pendientes : 0,
    };
  } catch {
    return SIN_API;
  }
}

/** Guarda en la API local qué impresora es de caja y cuál de cocina. No lanza error. */
export async function guardarConfigImpresoras(caja: string, cocina: string): Promise<boolean> {
  try {
    const r = await fetch(`${URL_BASE}/api/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ impresoraCaja: caja || "", impresoraCocina: cocina || "" }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export type TirillaLocal = {
  negocio?: string;
  nit?: string;
  direccion?: string;
  telefono?: string;
  resolucion?: string;
  numero?: string;
  fecha?: string;
  cliente?: string;
  clienteDoc?: string;
  items?: { descripcion?: string; nombre?: string; cantidad?: number; precio?: number }[];
  subtotal?: number;
  iva?: number;
  ivaPct?: number;
  total?: number;
  metodo?: string;
  formato?: "58mm" | "80mm";
  /** CUFE y QR oficial DIAN: salen al final de la tirilla de caja. */
  cufe?: string;
  qr?: string;
  /** Si se indica, imprime en esa impresora; si no, en la de caja o la predeterminada. */
  impresora?: string;
};

export type ComandaCocina = {
  negocio?: string;
  numero?: string;
  fecha?: string;
  cliente?: string;
  telefono?: string;
  modalidad?: string;
  mesa?: string;
  direccion?: string;
  barrio?: string;
  notas?: string;
  canal?: string;
  items?: { nombre?: string; descripcion?: string; cantidad?: number }[];
  formato?: "58mm" | "80mm";
  impresora?: string;
};

/** Envía la tirilla a una impresora concreta sin diálogos. true = se imprimió. */
export async function imprimirEnImpresora(d: TirillaLocal, impresora: string): Promise<boolean> {
  try {
    const r = await fetch(`${URL_BASE}/api/imprimir-tirilla`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, impresora: impresora || "" }),
    });
    if (!r.ok) return false;
    const j = (await r.json()) as { ok?: boolean };
    return j.ok === true;
  } catch {
    return false; // Sin servicio (celular/navegador): la app usa impresión normal.
  }
}

/** Envía la factura a la impresora de caja sin diálogos. true = se imprimió. */
export async function imprimirTirillaLocal(d: TirillaLocal): Promise<boolean> {
  const caja = d.impresora || leerImpresoraCaja();
  return imprimirEnImpresora(d, caja);
}

/**
 * Imprime la comanda en la impresora de cocina sin pedir confirmación.
 * Nunca muestra error: si no hay servicio local, devuelve false y la app sigue.
 */
export async function imprimirComandaCocina(d: ComandaCocina): Promise<boolean> {
  const cocina = d.impresora || leerImpresoraCocina();
  try {
    const r = await fetch(`${URL_BASE}/api/imprimir-comanda`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, tipo: "comanda", impresora: cocina || "" }),
    });
    if (!r.ok) return false;
    const j = (await r.json()) as { ok?: boolean };
    return j.ok === true;
  } catch {
    return false;
  }
}

/** Guarda la factura en la cola local para sincronizarla cuando vuelva internet. */
export async function guardarColaLocal(factura: unknown): Promise<boolean> {
  try {
    const r = await fetch(`${URL_BASE}/api/cola-offline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(factura ?? {}),
    });
    return r.ok;
  } catch {
    return false;
  }
}

export { URL_BASE as URL_API_LOCAL, conTiempo as _conTiempo };
