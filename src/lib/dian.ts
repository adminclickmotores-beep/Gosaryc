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

/** Arma el JSON fiscal estándar (Colombia DIAN) listo para proveedor tecnológico o webhook. */
export function construirJsonFiscal(args: {
  prefijo: string | null;
  numero: number;
  resolucion: string | null;
  negocio: string;
  nit: string;
  regimen?: string | null;
  responsabilidad?: string | null;
  softwareId?: string | null;
  pin?: string | null;
  cliente: string;
  clienteDoc?: string;
  clienteCorreo?: string;
  clienteTipoPersona?: "Natural" | "Jurídica";
  metodoPago?: string;
  items: ItemFiscal[];
  ivaPct: number;
  incPct?: number;
  retefuentePct?: number;
  reteivaPct?: number;
  reteicaPorMil?: number;
  ambiente: string;
}): Record<string, unknown> {
  const subtotal = Math.round(args.items.reduce((s, i) => s + i.cantidad * i.precio, 0) * 100) / 100;
  const iva = Math.round(subtotal * (args.ivaPct / 100));
  const inc = Math.round(subtotal * ((args.incPct ?? 0) / 100));
  return {
    estandar: "DIAN-UBL-2.1-CO",
    ambiente: args.ambiente === "Producción" ? "produccion" : "pruebas",
    fecha_emision: new Date().toISOString(),
    prefijo: args.prefijo ?? "",
    numero: args.numero,
    resolucion: args.resolucion ?? "",
    software: {
      id: args.softwareId ?? "",
      pin: args.pin ?? "",
    },
    emisor: {
      nombre: args.negocio,
      nit: args.nit,
      regimen: args.regimen ?? "",
      responsabilidad_fiscal: args.responsabilidad ?? "",
    },
    cliente: {
      nombre: args.cliente,
      documento: args.clienteDoc ?? "",
      correo: args.clienteCorreo ?? "",
      tipo_persona: args.clienteTipoPersona ?? "Natural",
    },
    metodo_pago: args.metodoPago ?? "Efectivo",
    items: args.items.map((i) => ({
      descripcion: i.descripcion,
      cantidad: i.cantidad,
      precio: i.precio,
      total: Math.round(i.cantidad * i.precio * 100) / 100,
    })),
    subtotal,
    iva_pct: args.ivaPct,
    iva,
    inc_pct: args.incPct ?? 0,
    inc,
    total: subtotal + iva + inc,
    retenciones: calcularRetenciones(subtotal, iva, args.retefuentePct ?? 0, args.reteivaPct ?? 0, args.reteicaPorMil ?? 0),
  };
}

/** Retenciones que practica el cliente: Retefuente (% del subtotal), ReteIVA (% del IVA) y ReteICA (por mil del subtotal). */
export function calcularRetenciones(subtotal: number, iva: number, retefuentePct: number, reteivaPct: number, reteicaPorMil: number) {
  const retefuente = Math.round(subtotal * (retefuentePct / 100));
  const reteiva = Math.round(iva * (reteivaPct / 100));
  const reteica = Math.round(subtotal * (reteicaPorMil / 1000));
  return { retefuente_pct: retefuentePct, retefuente, reteiva_pct: reteivaPct, reteiva, reteica_por_mil: reteicaPorMil, reteica, total_retenciones: retefuente + reteiva + reteica };
}

/** Calcula un CUFE determinístico SHA-384 (estándar DIAN Colombia) para pruebas/habilitación y genera el QR verificable. */
export async function calcularCufeSimulado(args: {
  prefijo: string;
  numero: number;
  nitEmisor: string;
  docCliente: string;
  subtotal: number;
  iva: number;
  inc?: number;
  total: number;
  pin?: string;
  ambiente?: string;
}): Promise<{ cufe: string; qr: string }> {
  const ahora = new Date();
  const fecha = ahora.toISOString().slice(0, 10);
  const hora = `${ahora.toTimeString().slice(0, 8)}-05:00`;
  const tipoAmb = args.ambiente === "Producción" ? "1" : "2";
  const cadena = [
    `${args.prefijo}${args.numero}`,
    fecha,
    hora,
    args.subtotal.toFixed(2),
    "01",
    args.iva.toFixed(2),
    "04",
    (args.inc ?? 0).toFixed(2),
    "03",
    "0.00",
    args.total.toFixed(2),
    args.nitEmisor.replace(/\D/g, "") || "0",
    args.docCliente.replace(/\D/g, "") || "222222222222",
    args.pin || "75315",
    tipoAmb,
  ].join("");

  let cufe = "";
  if (typeof crypto !== "undefined" && crypto.subtle) {
    try {
      const buf = await crypto.subtle.digest("SHA-384", new TextEncoder().encode(cadena));
      cufe = Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } catch {
      cufe = "";
    }
  }
  if (!cufe) {
    cufe = `${args.prefijo || "FE"}${args.numero}${Date.now().toString(16)}`.padEnd(96, "a").slice(0, 96);
  }
  const baseQr =
    args.ambiente === "Producción"
      ? "https://catalogo-vpfe.dian.gov.co/document/searchqr?documentkey="
      : "https://catalogo-vpfe-hab.dian.gov.co/document/searchqr?documentkey=";
  return { cufe, qr: `${baseQr}${cufe}` };
}

/** Genera el XML UBL 2.1 resumido listo para descarga o envío a proveedor tecnológico DIAN. */
export function construirXmlDian(args: {
  prefijo: string;
  numero: number;
  fechaIso: string;
  negocio: string;
  nit: string;
  cliente: string;
  clienteDoc: string;
  clienteCorreo?: string;
  subtotal: number;
  iva: number;
  inc?: number;
  total: number;
  cufe?: string | null;
  ambiente?: string;
  items: ItemFiscal[];
}): string {
  const esc = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c] ?? c);
  const lineas = args.items
    .map(
      (it, idx) => `  <cac:InvoiceLine>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:InvoicedQuantity>${it.cantidad}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="COP">${(it.cantidad * it.precio).toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Description>${esc(it.descripcion)}</cbc:Description></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="COP">${it.precio.toFixed(2)}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:ProfileExecutionID>${args.ambiente === "Producción" ? "1" : "2"}</cbc:ProfileExecutionID>
  <cbc:ID>${esc(args.prefijo)}${args.numero}</cbc:ID>
  <cbc:UUID schemeName="CUFE-SHA384">${esc(args.cufe ?? "")}</cbc:UUID>
  <cbc:IssueDate>${args.fechaIso.slice(0, 10)}</cbc:IssueDate>
  <cac:AccountingSupplierParty><cac:Party><cac:PartyName><cbc:Name>${esc(args.negocio)}</cbc:Name></cac:PartyName><cbc:CompanyID>${esc(args.nit)}</cbc:CompanyID></cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party><cac:PartyName><cbc:Name>${esc(args.cliente)}</cbc:Name></cac:PartyName><cbc:CompanyID>${esc(args.clienteDoc || "222222222222")}</cbc:CompanyID>${args.clienteCorreo ? `<cbc:ElectronicMail>${esc(args.clienteCorreo)}</cbc:ElectronicMail>` : ""}</cac:Party></cac:AccountingCustomerParty>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="COP">${args.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxInclusiveAmount currencyID="COP">${args.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="COP">${args.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${lineas}
</Invoice>`;
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

/** Valida los datos fiscales antes de emitir: NIT, DV, régimen, resolución, prefijo y rangos. */
export function validarDatosFiscales(args: {
  nit?: string | null;
  dv?: string | null;
  regimen?: string | null;
  responsabilidad?: string | null;
  resolucion?: string | null;
  prefijo?: string | null;
  rangoDesde?: number | null;
  rangoHasta?: number | null;
  numero?: number | null;
}): string[] {
  const errores: string[] = [];
  if (!args.nit?.trim()) errores.push("Falta el NIT de la empresa (Mi negocio).");
  if (args.dv && !/^[0-9]$/.test(args.dv.trim())) errores.push("El dígito de verificación debe ser un número de 0 a 9.");
  if (!args.regimen?.trim()) errores.push("Falta el régimen (Mi negocio).");
  if (!args.resolucion?.trim()) errores.push("Falta la resolución DIAN (la activa el Superadmin).");
  if (args.rangoDesde == null || args.rangoHasta == null) errores.push("Falta el rango autorizado desde/hasta.");
  else if (args.rangoDesde > args.rangoHasta) errores.push("El rango desde no puede ser mayor que el hasta.");
  if (args.numero != null && args.rangoDesde != null && args.rangoHasta != null) {
    if (args.numero < args.rangoDesde || args.numero > args.rangoHasta)
      errores.push(`El consecutivo ${args.numero} está fuera del rango ${args.rangoDesde}-${args.rangoHasta}.`);
  }
  return errores;
}

/** Marca la factura como pendiente de envío DIAN (la venta nunca se bloquea). */
export async function marcarDianPendiente(facturaId: string, detalle: unknown): Promise<void> {
  await supabase
    .from("fac_emitidas")
    .update({ dian_estado: "pendiente", dian_respuesta: detalle as never })
    .eq("id", facturaId);
}
