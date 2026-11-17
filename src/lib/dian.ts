import { supabase } from "@/integrations/supabase/client";
import { BRAND, enlaceWhatsappSoporte } from "@/lib/brand";

/** Config técnica del proveedor DIAN (solo la lee el Superadmin). */
export type ConfigDian = {
  activa: boolean;
  proveedor_url: string | null;
  token_api: string | null;
  prefijo: string | null;
  resolucion: string | null;
  rango_desde: number | null;
  rango_hasta: number | null;
  ambiente: string;
};

/** Mensaje prellenado para pedir la activación por WhatsApp. */
export function mensajeSolicitudDian(nombreNegocio: string, nit: string): string {
  const nitTxt = nit ? ` (NIT ${nit})` : "";
  return `Hola, soy del negocio ${nombreNegocio}${nitTxt} y quiero activar la Facturación Electrónica DIAN en mi cuenta de ${BRAND.name}. ¿Me ayudas con la activación?`;
}

/** Enlace de WhatsApp al soporte con el mensaje ya listo. */
export function enlaceSolicitudDian(nombreNegocio: string, nit: string): string {
  return enlaceWhatsappSoporte(mensajeSolicitudDian(nombreNegocio, nit));
}

export type ItemFiscal = { descripcion: string; cantidad: number; precio: number };

/** Arma el JSON fiscal que se envía al proveedor tecnológico colombiano. */
export function construirJsonFiscal(args: {
  prefijo: string | null;
  numero: number;
  resolucion: string | null;
  negocio: string;
  nit: string;
  cliente: string;
  clienteDoc?: string;
  items: ItemFiscal[];
  ivaPct: number;
  ambiente: string;
}): Record<string, unknown> {
  const subtotal = args.items.reduce((s, i) => s + i.cantidad * i.precio, 0);
  const iva = Math.round(subtotal * (args.ivaPct / 100));
  return {
    ambiente: args.ambiente === "Producción" ? "produccion" : "pruebas",
    prefijo: args.prefijo ?? "",
    numero: args.numero,
    resolucion: args.resolucion ?? "",
    emisor: { nombre: args.negocio, nit: args.nit },
    cliente: { nombre: args.cliente, documento: args.clienteDoc ?? "" },
    items: args.items.map((i) => ({
      descripcion: i.descripcion,
      cantidad: i.cantidad,
      precio: i.precio,
      total: Math.round(i.cantidad * i.precio * 100) / 100,
    })),
    subtotal: Math.round(subtotal * 100) / 100,
    iva,
    total: subtotal + iva,
  };
}

export type RespuestaDian =
  | { ok: true; cufe: string | null; qr: string | null; estado: string; respuesta: unknown }
  | { ok: false; error: string };

/**
 * Envía el JSON fiscal al endpoint del proveedor. Cada proveedor devuelve el
 * CUFE y el QR oficial con nombres distintos, así que se buscan varias formas.
 * Si el proveedor aún no responde, se guarda como pendiente sin romper la venta.
 */
export async function enviarFacturaDian(
  proveedorUrl: string,
  token: string,
  payload: Record<string, unknown>,
): Promise<RespuestaDian> {
  const url = proveedorUrl.trim();
  if (!url) return { ok: false, error: "Sin URL del proveedor." };
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 25000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    const texto = await res.text();
    let data: Record<string, unknown> = {};
    try {
      data = (JSON.parse(texto) as Record<string, unknown>) ?? {};
    } catch {
      data = { crudo: texto.slice(0, 2000) };
    }
    if (!res.ok) {
      const msg =
        (data["mensaje"] as string) || (data["message"] as string) || (data["error"] as string) || `El proveedor respondió ${res.status}.`;
      return { ok: false, error: String(msg).slice(0, 300) };
    }
    const cufe =
      (data["cufe"] as string) || (data["CUFE"] as string) || (data["uuid"] as string) || (data["cude"] as string) || null;
    const qr =
      (data["qr"] as string) ||
      (data["QR"] as string) ||
      (data["qrUrl"] as string) ||
      (data["qr_url"] as string) ||
      (data["codigoQR"] as string) ||
      null;
    const estado = (data["estado"] as string) || (cufe ? "aceptada" : "enviada");
    return { ok: true, cufe, qr, estado, respuesta: data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "No se pudo conectar con el proveedor." };
  }
}

/** Guarda el CUFE y el QR oficial devueltos por la API en la factura. */
export async function guardarCufeQr(
  facturaId: string,
  r: { cufe: string | null; qr: string | null; estado: string; respuesta: unknown },
): Promise<void> {
  await supabase
    .from("fac_emitidas")
    .update({ dian_cufe: r.cufe, dian_qr: r.qr, dian_estado: r.estado, dian_respuesta: r.respuesta as never })
    .eq("id", facturaId);
}

/** Marca la factura como pendiente de envío DIAN (la venta nunca se bloquea). */
export async function marcarDianPendiente(facturaId: string, detalle: unknown): Promise<void> {
  await supabase
    .from("fac_emitidas")
    .update({ dian_estado: "pendiente", dian_respuesta: detalle as never })
    .eq("id", facturaId);
}
