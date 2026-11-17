/**
 * Reportes comerciales exportables: Excel (CSV con BOM, abre directo en Excel)
 * y PDF (ventana de impresión con formato profesional). Sin dependencias nuevas.
 */

export type ColumnaExport = { titulo: string; valor: (fila: never) => string | number };

const fechaHoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const escaparCelda = (v: string | number): string => {
  const s = String(v ?? "");
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
  const filasHtml = filas
    .map((f) => `<tr>${f.map((c, i) => `<td class="${i > 0 && /[$\d]/.test(c) ? "num" : ""}">${c}</td>`).join("")}</tr>`)
    .join("");
  w.document.write(`<html><head><title>${titulo}</title>${estilosImpresion}</head><body>
    <h1>${titulo}</h1><p class="sub">${subtitulo} · Generado el ${fechaHoy()} · Gosaryc</p>
    <table><thead><tr>${encabezados.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${filasHtml}</tbody></table>
    ${totales?.length ? `<div class="totales">${totales.join("<br>")}</div>` : ""}
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
  /** Logo del negocio (URL o data URL): sale impreso arriba de la factura. */
  logoUrl?: string;
  /** Régimen y responsabilidad fiscal: sale debajo del NIT. */
  regimen?: string;
  /** Texto libre al pie de la factura (garantía, devoluciones, gracias por su compra). */
  piePagina?: string;
  numero: string;
  cliente: string;
  clienteNit?: string;
  items: ItemFactura[];
  ivaPct?: number;
  dianCufe?: string | null;
  dianQr?: string | null;
  dianEstado?: string | null;
};

/**
 * Formato de factura profesional (tirilla de 80 mm y carta) listo para
 * conectarse por API a un proveedor tecnológico DIAN: los datos salen
 * tal cual para el JSON del proveedor.
 */
export function facturaHTML(d: DatosFactura, formato: "tirilla" | "carta"): string {
  const subtotal = d.items.reduce((s, i) => s + i.cantidad * i.precio, 0);
  const iva = Math.round(subtotal * ((d.ivaPct ?? 0) / 100));
  const total = subtotal + iva;
  const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
  const filas = d.items
    .map((i) => `<tr><td>${i.descripcion}</td><td class="num">${i.cantidad}</td><td class="num">${cop(i.precio)}</td><td class="num">${cop(i.cantidad * i.precio)}</td></tr>`)
    .join("");
  const esImgQr = Boolean(d.dianQr && (/^data:image/i.test(d.dianQr) || /\.(png|jpe?g|gif|webp)(\?|$)/i.test(d.dianQr)));
  const bloqueDian = d.dianCufe || d.dianQr
    ? `<div class="dian"><strong>Factura electrónica DIAN${d.dianEstado ? ` · ${d.dianEstado}` : ""}</strong><br>CUFE: ${d.dianCufe ?? "en trámite"}${d.dianQr && !esImgQr ? `<br>QR oficial: ${d.dianQr.startsWith("http") ? `<a href="${d.dianQr}">${d.dianQr}</a>` : d.dianQr}` : ""}${esImgQr ? `<br><img src="${d.dianQr}" alt="QR DIAN" style="width:140px;height:140px;margin-top:6px;" />` : ""}</div>`
    : "";
  const ancho = formato === "tirilla" ? "300px" : "100%";
  const logo = d.logoUrl
    ? `<div class="c"><img src="${d.logoUrl}" alt="Logo" style="max-width:${formato === "tirilla" ? "120px" : "180px"};max-height:90px;object-fit:contain;" /></div>`
    : "";
  return `<html><head><title>Factura ${d.numero}</title>${estilosImpresion}
    <style>body { max-width: ${ancho}; margin: ${formato === "tirilla" ? "0 auto" : "24px"}; } .c { text-align: center; }</style>
    </head><body>
    <div style="height:6px;border-radius:99px;background:linear-gradient(90deg,#4F46E5,#10B981);margin-bottom:12px;"></div>
    ${logo}
    <h1 class="c">${d.negocio}</h1>
    <p class="c sub">NIT ${d.nit}${d.regimen ? ` · ${d.regimen}` : ""}${d.direccion ? ` · ${d.direccion}` : ""}${d.telefono ? ` · Tel. ${d.telefono}` : ""}${d.resolucion ? `<br>Res. DIAN ${d.resolucion}` : ""}</p>
    <p><strong>Factura de venta ${d.numero}</strong><br>Fecha: ${fechaHoy()}<br>Cliente: ${d.cliente}${d.clienteNit ? ` · ${d.clienteNit}` : ""}</p>
    <table><thead><tr><th>Descripción</th><th class="num">Cant.</th><th class="num">Precio</th><th class="num">Total</th></tr></thead><tbody>${filas}</tbody></table>
    <div class="totales">Subtotal: ${cop(subtotal)}<br>IVA${d.ivaPct ? ` (${d.ivaPct}%)` : ""}: ${cop(iva)}<br><strong>Total: ${cop(total)}</strong></div>
    ${bloqueDian}
    <p class="sub c">${d.piePagina || "Documento generado por Gosaryc · listo para facturación electrónica DIAN vía proveedor tecnológico."}</p>
  </body></html>`;
}

/** Imprime la factura (el usuario elige Guardar como PDF o la impresora de tirilla). */
export function imprimirFactura(d: DatosFactura, formato: "tirilla" | "carta"): void {
  // Web y celular sin programa instalado: diálogo nativo (58/80 mm o carta). Nunca muestra error.
  const w = window.open("", "_blank", "width=420,height=700");
  if (!w) {
    descargarHtml(`Factura-${d.numero}.html`, facturaHTML(d, formato));
    return;
  }
  w.document.write(facturaHTML(d, formato));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
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
