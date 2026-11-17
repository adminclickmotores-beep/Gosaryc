/**
 * Impresión directa por API local de escritorio (http://127.0.0.1:8765).
 * - En Windows con la app instalada: imprime la tirilla sin diálogos y guarda
 *   facturas en cola local cuando no hay internet.
 * - En celular o navegador sin el servicio: devuelve { disponible: false } y la
 *   app usa la impresión normal del navegador, sin mostrar error.
 */

const URL_BASE = "http://127.0.0.1:8765";
const CLAVE_SWITCH = "gosaryc:impresion-directa";

export function impresionDirectaActivada(): boolean {
  try {
    return window.localStorage.getItem(CLAVE_SWITCH) === "1";
  } catch {
    return false;
  }
}

export function fijarImpresionDirecta(v: boolean): void {
  try {
    window.localStorage.setItem(CLAVE_SWITCH, v ? "1" : "0");
  } catch { /* modo privado */ }
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
  pendientes: number;
};

/** ¿Está corriendo la API local? Nunca lanza error: si no está, disponible=false. */
export async function estadoApiLocal(): Promise<EstadoApiLocal> {
  try {
    const r = await fetch(`${URL_BASE}/api/estado`, { cache: "no-store" });
    if (!r.ok) return { disponible: false, impresoras: [], predeterminada: "", pendientes: 0 };
    const j = (await r.json()) as { impresoras?: string[]; predeterminada?: string; pendientes?: number };
    return {
      disponible: true,
      impresoras: Array.isArray(j.impresoras) ? j.impresoras : [],
      predeterminada: typeof j.predeterminada === "string" ? j.predeterminada : "",
      pendientes: typeof j.pendientes === "number" ? j.pendientes : 0,
    };
  } catch {
    return { disponible: false, impresoras: [], predeterminada: "", pendientes: 0 };
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
};

/** Envía la tirilla a la impresora predeterminada sin diálogos. true = se imprimió. */
export async function imprimirTirillaLocal(d: TirillaLocal): Promise<boolean> {
  try {
    const r = await fetch(`${URL_BASE}/api/imprimir-tirilla`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(d),
    });
    if (!r.ok) return false;
    const j = (await r.json()) as { ok?: boolean };
    return j.ok === true;
  } catch {
    return false; // Sin servicio (celular/navegador): la app usa impresión normal.
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
