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

/** Deja solo caracteres normales de un nombre de impresora (sin comillas, $, ;, &, |, <, >, etc.). */
export function limpiarNombreImpresora(nombre: string): string {
  return (nombre || "").replace(/[^\p{L}\p{N} ._\-()[\]#\\/]/gu, "").slice(0, 200).trim();
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
  guardarClave(CLAVE_CAJA, limpiarNombreImpresora(nombre));
}

/** Nombre de la impresora de cocina (comandas). Vacío = predeterminada de Windows. */
export function leerImpresoraCocina(): string {
  return leerClave(CLAVE_COCINA);
}

export function fijarImpresoraCocina(nombre: string): void {
  guardarClave(CLAVE_COCINA, limpiarNombreImpresora(nombre));
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

export type AnchoPapel = "58mm" | "80mm" | "a4";
const CLAVE_ANCHO = "gosaryc:ancho-papel";

/** Ancho de papel preferido (por defecto 80mm). */
export function leerAnchoPapel(): AnchoPapel {
  const v = leerClave(CLAVE_ANCHO);
  return v === "58mm" || v === "a4" ? v : "80mm";
}

export function fijarAnchoPapel(v: AnchoPapel): void {
  guardarClave(CLAVE_ANCHO, v);
}

/**
 * Tirilla de prueba con la impresión nativa del navegador/sistema (funciona con cualquier
 * marca de impresora con driver instalado: Epson, Star, Bixolon, Xprinter, etc.).
 */
export function imprimirTirillaPruebaNavegador(ancho: AnchoPapel): boolean {
  const w = ancho === "a4" ? "210mm" : ancho;
  const caracteres = ancho === "58mm" ? 32 : 48;
  const linea = "-".repeat(caracteres);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Tirilla de prueba</title>
<style>@page{size:${w} auto;margin:0}html,body{margin:0;padding:0;background:#fff;color:#000}
body{width:${w};max-width:100%;padding:${ancho === "a4" ? "15mm" : "3mm"};box-sizing:border-box;font-family:"Courier New",monospace;font-size:${ancho === "58mm" ? "11px" : "12px"};line-height:1.35;font-weight:600}
pre{margin:0;white-space:pre-wrap;word-break:break-word;break-inside:avoid}</style></head><body><pre>
PRUEBA DE IMPRESION
${linea}
Ancho: ${ancho === "a4" ? "Carta / A4" : ancho}
Fuente monoespaciada negro puro
1234567890 ABCDEFGHIJKLMNOPQRSTUVWXYZ
${linea}
Cant  Producto            Total
1     Tirilla de prueba   $1.000
${linea}
TOTAL                     $1.000
${linea}
Si lees esto completo, tu
impresora esta lista.
</pre><script>window.onload=function(){setTimeout(function(){window.print()},150)}</script></body></html>`;
  try {
    const v = window.open("", "_blank", "width=420,height=640");
    if (!v) return false;
    v.document.open();
    v.document.write(html);
    v.document.close();
    return true;
  } catch {
    return false;
  }
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
      body: JSON.stringify({ impresoraCaja: limpiarNombreImpresora(caja), impresoraCocina: limpiarNombreImpresora(cocina) }),
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
      body: JSON.stringify({ ...d, impresora: limpiarNombreImpresora(impresora) }),
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
      body: JSON.stringify({ ...d, tipo: "comanda", impresora: limpiarNombreImpresora(cocina) }),
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
