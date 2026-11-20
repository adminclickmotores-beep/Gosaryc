/**
 * Reportes comerciales exportables: Excel (CSV con BOM, abre directo en Excel)
 * y PDF (ventana de impresión con formato profesional). Sin dependencias nuevas.
 */

export type ColumnaExport = { titulo: string; valor: (fila: never) => string | number };

const fechaHoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const escaparCelda = (v: string | number): string => {
  let s = String(v ?? "");
  // Evita fórmulas en Excel/CSV: texto que empieza por = + - @ se guarda como texto.
  // También cuando antes del símbolo hay espacios o caracteres de control (Excel igualmente los interpreta).
  if (typeof v === "string" && (/^[\t\r]/.test(s) || /^[\s\u0000-\u001f ​-‏⁠﻿]*[=+\-@|%]/.test(s))) {
    s = `'${s.replace(/^[\s\u0000-\u001f ​-‏⁠﻿]+/, "")}`;
  }
  return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Descarga los datos como .xls (hoja compatible con Excel) con el nombre dado. */
export function exportarExcel(nombre: string, columnas: string[], filas: (string | number)[][]): void {
  const linea = (cs: (string | number)[]): string => cs.map(escaparCelda).join(";");
  const contenido = `﻿${linea(columnas)}\n${filas.map(linea).join("\n")}`;
  const blob = new Blob([contenido], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nombre}-${fechaHoy()}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Convierte cualquier texto escrito por usuarios en texto plano seguro para HTML (nunca se ejecuta como código). */
export const escaparHtml = (v: unknown): string =>
  String(v ?? "").replace(/[&<>"'`]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", "`": "&#96;" })[c] ?? c,
  );

/** Solo deja pasar direcciones http(s) o imágenes embebidas; cualquier otra cosa (javascript:, etc.) se descarta. */
export const urlSegura = (u: string | null | undefined): string | null => {
  const s = (u ?? "").trim();
  if (/^https?:\/\//i.test(s) || /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=\s]+$/i.test(s)) return escaparHtml(s);
  return null;
};

const estilosImpresion = `
  <style>
    * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; color: #111; }
    body { margin: 24px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .sub { font-size: 12px; color: #555; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #999; padding: 6px 8px; text-align: left; }
    th { background: #eee; }
    td.num, th.num { text-align: right; }
    .totales { margin-top: 12px; font-size: 13px; }
    .dian { margin-top: 12px; font-size: 11px; word-break: break-all; border-top: 1px dashed #999; padding-top: 8px; }
    .firma { margin-top: 48px; display: flex; gap: 48px; font-size: 12px; }
    .firma div { border-top: 1px solid #111; padding-top: 4px; min-width: 180px; }
    @media print { body { margin: 0; } }
  </style>`;

/** Abre el diálogo de impresión (Guardar como PDF) con el reporte formateado. */
export function imprimirReporte(titulo: string, subtitulo: string, encabezados: string[], filas: string[][], totales?: string[]): void {
  // Solo web/celular (sin .exe): usa el diálogo limpio del navegador; si bloquea la ventana, descarga el archivo.
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  const e = escaparHtml;
  const filasHtml = filas
    .map((f) => `<tr>${f.map((c, i) => `<td class="${i > 0 && /[$\d]/.test(String(c)) ? "num" : ""}">${e(c)}</td>`).join("")}</tr>`)
    .join("");
  w.document.write(`<html><head><title>${e(titulo)}</title>${estilosImpresion}</head><body>
    <h1>${e(titulo)}</h1><p class="sub">${e(subtitulo)} · Generado el ${fechaHoy()} · Gosaryc</p>
    <table><thead><tr>${encabezados.map((h) => `<th>${e(h)}</th>`).join("")}</tr></thead><tbody>${filasHtml}</tbody></table>
    ${totales?.length ? `<div class="totales">${totales.map(e).join("<br>")}</div>` : ""}
    <div class="firma"><div>Elaborado por</div><div>Revisado / Contador</div></div>
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

export type ItemFactura = { descripcion: string; cantidad: number; precio: number };

export type DatosFactura = {
  negocio: string;
  nit: string;
  direccion?: string;
  telefono?: string;
  resolucion?: string;
  prefijo?: string;
  /** Logo del negocio (URL o data URL): sale impreso arriba de la factura. */
  logoUrl?: string;
  /** Régimen y responsabilidad fiscal: sale debajo del NIT. */
  regimen?: string;
  /** Texto libre al pie de la factura (garantía, devoluciones, gracias por su compra). */
  piePagina?: string;
  numero: string;
  fechaHora?: string;
  metodoPago?: string;
  cliente: string;
  clienteNit?: string;
  clienteCorreo?: string;
  items: ItemFactura[];
  ivaPct?: number;
  incPct?: number;
  dianCufe?: string | null;
  dianQr?: string | null;
  dianEstado?: string | null;
};

export type FormatoFactura = "58mm" | "80mm" | "tirilla" | "carta";

/**
 * Formato de factura profesional (tirilla térmica 58 mm, 80 mm y carta) listo para
 * conectarse por API a un proveedor tecnológico DIAN con CUFE y QR verificable.
 */
export function facturaHTML(d: DatosFactura, formato: FormatoFactura): string {
  const subtotal = d.items.reduce((s, i) => s + i.cantidad * i.precio, 0);
  const iva = Math.round(subtotal * ((d.ivaPct ?? 0) / 100));
  const inc = Math.round(subtotal * ((d.incPct ?? 0) / 100));
  const total = subtotal + iva + inc;
  const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
  const e = escaparHtml;
  const es58 = formato === "58mm";
  const esTirilla = es58 || formato === "80mm" || formato === "tirilla";
  const fechaMostrar = d.fechaHora || new Date().toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
  const numeroCompleto = d.prefijo ? `${d.prefijo}-${d.numero}` : d.numero;
  const filas = d.items
    .map((i) => `<tr><td>${e(i.descripcion)}</td><td class="num">${e(i.cantidad)}</td><td class="num">${cop(i.precio)}</td><td class="num">${cop(i.cantidad * i.precio)}</td></tr>`)
    .join("");
  const qrUrl = urlSegura(d.dianQr);
  const esImgQr = Boolean(qrUrl && d.dianQr && (/^data:image/i.test(d.dianQr) || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(d.dianQr)));
  const qrImagenSrc = esImgQr && qrUrl
    ? qrUrl
    : qrUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(d.dianQr ?? "")}`
      : null;
  const bloqueDian = d.dianCufe || d.dianQr
    ? `<div class="dian"><strong>Factura electrónica DIAN${d.dianEstado ? ` · ${e(d.dianEstado)}` : ""}</strong><br>CUFE: ${e(d.dianCufe ?? "en trámite")}${qrImagenSrc ? `<div class="c" style="margin-top:6px;"><img src="${qrImagenSrc}" alt="QR DIAN" style="width:${es58 ? "105px" : "130px"};height:${es58 ? "105px" : "130px"};" /></div>` : ""}${qrUrl && !esImgQr ? `<div style="font-size:9px;margin-top:4px;"><a href="${qrUrl}">Verificar en DIAN</a></div>` : ""}</div>`
    : "";
  const ancho = es58 ? "215px" : esTirilla ? "300px" : "100%";
  const pageRule = es58 ? "@page { size: 58mm auto; margin: 2mm; }" : esTirilla ? "@page { size: 80mm auto; margin: 3mm; }" : "@page { size: letter; margin: 12mm; }";
  const logoUrl = urlSegura(d.logoUrl);
  const logo = logoUrl
    ? `<div class="c"><img src="${logoUrl}" alt="Logo" style="max-width:${es58 ? "90px" : esTirilla ? "120px" : "180px"};max-height:76px;object-fit:contain;" /></div>`
    : "";
  return `<html><head><meta charset="utf-8"><title>Factura ${e(numeroCompleto)}</title>${estilosImpresion}
    <style>${pageRule} body { max-width: ${ancho}; margin: ${esTirilla ? "0 auto" : "24px"}; font-size: ${es58 ? "10px" : esTirilla ? "11px" : "12px"}; } table { font-size: ${es58 ? "10px" : esTirilla ? "11px" : "12px"}; } th, td { padding: ${es58 ? "3px 4px" : "5px 6px"}; } .c { text-align: center; }</style>
    </head><body>
    <div style="height:5px;border-radius:99px;background:linear-gradient(90deg,#4F46E5,#10B981);margin-bottom:10px;"></div>
    ${logo}
    <h1 class="c" style="font-size:${es58 ? "14px" : esTirilla ? "16px" : "20px"};">${e(d.negocio)}</h1>
    <p class="c sub">NIT ${e(d.nit)}${d.regimen ? ` · ${e(d.regimen)}` : ""}${d.direccion ? `<br>${e(d.direccion)}` : ""}${d.telefono ? ` · Tel. ${e(d.telefono)}` : ""}${d.resolucion ? `<br>Res. DIAN ${e(d.resolucion)}` : ""}</p>
    <p><strong>Factura de venta ${e(numeroCompleto)}</strong><br>Fecha/Hora: ${e(fechaMostrar)}<br>Cliente: ${e(d.cliente)}${d.clienteNit ? ` · ${e(d.clienteNit)}` : ""}${d.clienteCorreo ? `<br>Correo: ${e(d.clienteCorreo)}` : ""}${d.metodoPago ? `<br>Medio de pago: ${e(d.metodoPago)}` : ""}</p>
    <table><thead><tr><th>Descripción</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Total</th></tr></thead><tbody>${filas}</tbody></table>
    <div class="totales">Subtotal: ${cop(subtotal)}<br>IVA${d.ivaPct ? ` (${d.ivaPct}%)` : ""}: ${cop(iva)}${inc > 0 ? `<br>INC (${d.incPct}%): ${cop(inc)}` : ""}<br><strong>Total: ${cop(total)}</strong></div>
    ${bloqueDian}
    <p class="sub c">${d.piePagina ? e(d.piePagina) : "Documento generado por Gosaryc · listo para facturación electrónica DIAN."}</p>
  </body></html>`;
}

/** Imprime la factura (58mm, 80mm o carta) o descarga respaldo HTML si se bloquea la ventana. */
export function imprimirFactura(d: DatosFactura, formato: FormatoFactura): void {
  const w = window.open("", "_blank", "width=440,height=720");
  if (!w) {
    descargarHtml(`Factura-${d.numero}.html`, facturaHTML(d, formato));
    return;
  }
  w.document.write(facturaHTML(d, formato));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

export type DatosComandaTermica = {
  negocio: string;
  numero: string;
  fechaHora?: string;
  modalidad: string;
  mesa?: string;
  cliente: string;
  notas?: string;
  items: { nombre: string; cantidad: number }[];
};

/** Genera una comanda térmica de cocina/producción SIN precios (58mm u 80mm). */
export function comandaCocinaHTML(d: DatosComandaTermica, formato: "58mm" | "80mm" = "80mm"): string {
  const e = escaparHtml;
  const es58 = formato === "58mm";
  const ancho = es58 ? "52mm" : "72mm";
  const fechaMostrar = d.fechaHora || new Date().toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });
  const donde = d.modalidad === "mesa" ? (d.mesa ? `MESA ${d.mesa}` : "MESA") : d.modalidad === "recoger" ? "PARA LLEVAR" : "DOMICILIO";
  const filas = d.items
    .map((i) => `<tr><td style="font-size:${es58 ? "13px" : "15px"};font-weight:bold;padding:4px 0;">${e(i.cantidad)} × ${e(i.nombre)}</td></tr>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>Comanda #${e(d.numero)}</title>
<style>@page{size:${formato} auto;margin:2mm}body{font-family:monospace;font-size:${es58 ? "11px" : "13px"};width:${ancho};margin:0 auto;color:#000}h1{font-size:${es58 ? "14px" : "16px"};text-align:center;margin:0 0 4px}hr{border:0;border-top:1px dashed #000;margin:6px 0}table{width:100%;border-collapse:collapse}.c{text-align:center}</style></head><body>
<h1>COMANDA COCINA</h1>
<p class="c"><strong>${e(d.negocio)}</strong><br>#${e(d.numero)} · ${e(fechaMostrar)}<br><strong>${e(donde)}</strong></p><hr>
<p>Cliente: ${e(d.cliente)}</p><hr>
<table>${filas}</table><hr>
${d.notas ? `<p><strong>NOTAS:</strong> ${e(d.notas)}</p><hr>` : ""}
<p class="c">*** SIN PRECIOS · SOLO PRODUCCIÓN ***</p>
<script>window.onload=function(){window.print()}</script></body></html>`;
}

/** Abre la vista previa térmica de comanda de cocina (58mm u 80mm, sin precios). */
export function imprimirComandaTermica(d: DatosComandaTermica, formato: "58mm" | "80mm" = "80mm"): void {
  const w = window.open("", "_blank", "width=380,height=620");
  if (!w) {
    descargarHtml(`Comanda-${d.numero}.html`, comandaCocinaHTML(d, formato));
    return;
  }
  w.document.write(comandaCocinaHTML(d, formato));
  w.document.close();
}

/** Descarga un HTML (respaldo cuando el navegador bloquea la ventana de impresión). */
export function descargarHtml(nombre: string, html: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const soloDigitosWa = (t: string): string => (t ?? "").replace(/\D/g, "");

/** Arma un enlace wa.me con texto listo (facturas, pedidos y recordatorios). */
export function enlaceWhatsapp(telefono: string, mensaje: string): string | null {
  let d = soloDigitosWa(telefono);
  if (d.length === 10) d = `57${d}`;
  if (d.length < 7 || !mensaje.trim()) return null;
  return `https://wa.me/${d}?text=${encodeURIComponent(mensaje)}`;
}

/** Texto corto para enviar una factura o cuenta por WhatsApp. */
export function textoFacturaWhatsapp(d: DatosFactura): string {
  const total = d.items.reduce((s, i) => s + i.cantidad * i.precio, 0);
  const cop = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
  const lineas = [
    `*${d.negocio}*`,
    `Factura ${d.numero} · ${cop(total)}`,
    ...d.items.slice(0, 8).map((i) => `· ${i.cantidad} x ${i.descripcion} — ${cop(i.cantidad * i.precio)}`),
    d.items.length > 8 ? `· …y ${d.items.length - 8} más` : "",
    `Gracias por tu compra.`,
  ].filter((l) => l !== "");
  return lineas.join("\n");
}
