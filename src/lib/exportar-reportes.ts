/**
 * Motor universal de exportación: Excel real (.xlsx) y PDF corporativo (ventana de impresión aislada).
 * No toca tablas ni fórmulas: solo recibe columnas y filas ya calculadas por cada módulo.
 */
import { escaparCelda, escaparHtml, urlSegura } from "@/lib/exportes";

export type TipoColumna = "texto" | "numero" | "moneda";

export type ColumnaReporte = {
  /** Encabezado visible. */
  titulo: string;
  tipo?: TipoColumna;
};

export type CeldaReporte = string | number | null | undefined;

export type EmpresaReporte = {
  nombre?: string | null;
  razonSocial?: string | null;
  nit?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  logoUrl?: string | null;
};

const fechaHoy = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const nombreSeguro = (s: string): string =>
  (s || "Reporte")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "Reporte";

const formatoMoneda = (n: number): string =>
  `$${Math.round(n).toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;

const textoCelda = (v: CeldaReporte, tipo: TipoColumna | undefined): string => {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "number") return tipo === "moneda" ? formatoMoneda(v) : v.toLocaleString("es-CO");
  return String(v);
};

type OpcionesExcel = {
  nombreArchivo: string;
  nombreHoja?: string;
  columnas: ColumnaReporte[];
  filas: CeldaReporte[][];
  /** Fila final de totales (misma cantidad de columnas; deja "" donde no aplique). */
  filaTotales?: CeldaReporte[];
};

/** Genera y descarga un .xlsx real. Nombre: Reporte_Gosaryc_AAAA-MM-DD.xlsx */
export async function exportarAExcel({ nombreArchivo, nombreHoja, columnas, filas, filaTotales }: OpcionesExcel): Promise<void> {
  const XLSX = await import("xlsx");
  const limpiar = (v: CeldaReporte, c: ColumnaReporte | undefined): string | number => {
    if (typeof v === "number") return v;
    if (v === null || v === undefined) return "";
    // En texto se neutralizan fórmulas (=, +, -, @) que Excel ejecutaría.
    return c?.tipo === "numero" || c?.tipo === "moneda" ? String(v) : escaparCelda(String(v)).replace(/^"|"$/g, "").replace(/""/g, '"');
  };
  const cuerpo = filas.map((f) => columnas.map((c, i) => limpiar(f[i], c)));
  const datos: (string | number)[][] = [columnas.map((c) => c.titulo), ...cuerpo];
  if (filaTotales) datos.push(columnas.map((c, i) => limpiar(filaTotales[i], c)));

  const hoja = XLSX.utils.aoa_to_sheet(datos);
  hoja["!cols"] = columnas.map((c, i) => {
    const mayor = datos.reduce((m, f) => Math.max(m, String(f[i] ?? "").length), c.titulo.length);
    return { wch: Math.min(60, Math.max(10, mayor + 2)) };
  });
  // Formato numérico / moneda limpio.
  const ultima = datos.length - 1;
  columnas.forEach((c, ci) => {
    if (c.tipo !== "numero" && c.tipo !== "moneda") return;
    for (let r = 1; r <= ultima; r++) {
      const ref = XLSX.utils.encode_cell({ r, c: ci });
      const celda = hoja[ref];
      if (celda && typeof celda.v === "number") celda.z = c.tipo === "moneda" ? '"$"#,##0' : "#,##0.##";
    }
  });
  hoja["!freeze"] = { xSplit: 0, ySplit: 1 };
  const libro = XLSX.utils.book_new();
  const nombreH = (nombreHoja || nombreArchivo || "Reporte").replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Reporte";
  XLSX.utils.book_append_sheet(libro, hoja, nombreH);
  XLSX.writeFile(libro, `${nombreSeguro(nombreArchivo)}_Gosaryc_${fechaHoy()}.xlsx`);
}

export type OpcionesPDF = {
  tituloReporte: string;
  subtituloPeriodo?: string;
  empresa?: EmpresaReporte;
  columnas: ColumnaReporte[];
  filas: CeldaReporte[][];
  /** Líneas del cuadro de totales, por ejemplo [{ etiqueta: "Total ventas", valor: 1500000 }]. */
  resumenTotales?: { etiqueta: string; valor: CeldaReporte; moneda?: boolean }[];
};

/** Abre un documento corporativo listo para imprimir o guardar como PDF (membrete, tabla paginada, totales, pie numerado). */
export function exportarAPDF(op: OpcionesPDF): void {
  const w = window.open("", "_blank", "width=1000,height=760");
  if (!w) return;
  escribirPDF(w, op);
}

/** Datos del negocio activo para el membrete (si no hay sesión o falla la consulta, devuelve vacío). */
export async function empresaActiva(): Promise<EmpresaReporte> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: ses } = await supabase.auth.getSession();
    if (!ses.session) return {};
    const { data } = await supabase.from("negocio_config").select("*").order("created_at").limit(1).maybeSingle();
    if (!data) return {};
    return {
      nombre: data.nombre,
      razonSocial: data.razon_social,
      nit: data.nit ? `${data.nit}${data.digito_verificacion ? `-${data.digito_verificacion}` : ""}` : null,
      direccion: data.direccion_fiscal,
      telefono: data.telefono_pedidos,
      logoUrl: data.logo_url,
    };
  } catch {
    return {};
  }
}

/** Escribe el documento corporativo en una ventana ya abierta. */
export function escribirPDF(w: Window, { tituloReporte, subtituloPeriodo, empresa, columnas, filas, resumenTotales }: OpcionesPDF): void {
  const e = escaparHtml;
  const logo = urlSegura(empresa?.logoUrl);
  const razon = empresa?.razonSocial || empresa?.nombre || "";
  const ahora = new Date();
  const generado = `${fechaHoy()} ${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
  const cab = columnas.map((c) => `<th class="${c.tipo && c.tipo !== "texto" ? "num" : ""}">${e(c.titulo)}</th>`).join("");
  const cuerpo = filas
    .map(
      (f) =>
        `<tr>${columnas
          .map((c, i) => `<td class="${c.tipo && c.tipo !== "texto" ? "num" : ""}">${e(textoCelda(f[i], c.tipo))}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const totales = (resumenTotales ?? [])
    .map((t) => `<tr><td>${e(t.etiqueta)}</td><td class="num">${e(typeof t.valor === "number" && t.moneda ? formatoMoneda(t.valor) : textoCelda(t.valor, undefined))}</td></tr>`)
    .join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${e(tituloReporte)}</title>
  <style>
    @page { size: A4; margin: 16mm 12mm 18mm; }
    * { box-sizing: border-box; font-family: Arial, Helvetica, sans-serif; color: #111; }
    body { margin: 0; font-size: 11px; }
    .membrete { display: flex; gap: 14px; align-items: center; border-bottom: 3px solid #059669; padding-bottom: 10px; margin-bottom: 12px; }
    .membrete img { max-height: 56px; max-width: 120px; object-fit: contain; }
    .membrete h2 { margin: 0; font-size: 16px; }
    .membrete p { margin: 2px 0 0; font-size: 11px; color: #444; }
    h1 { font-size: 18px; margin: 0 0 2px; }
    .sub { color: #555; margin: 0 0 12px; font-size: 11px; }
    table.datos { width: 100%; border-collapse: collapse; }
    table.datos th, table.datos td { border: 1px solid #aaa; padding: 5px 6px; text-align: left; word-break: break-word; }
    table.datos th { background: #ecfdf5; }
    table.datos thead { display: table-header-group; }
    table.datos tr { page-break-inside: avoid; break-inside: avoid; }
    td.num, th.num { text-align: right; white-space: nowrap; }
    .totales { margin: 14px 0 0 auto; border-collapse: collapse; min-width: 260px; page-break-inside: avoid; }
    .totales td { border: 1px solid #aaa; padding: 5px 8px; font-weight: bold; }
    .totales td:first-child { background: #f3f4f6; }
    .pie { position: fixed; bottom: 0; left: 0; right: 0; font-size: 10px; color: #555; display: flex; justify-content: space-between; border-top: 1px solid #ccc; padding-top: 4px; }
    .pagina::after { content: "Página " counter(page); }
    body { counter-reset: page; }
    @media print { .nover { display: none; } }
  </style></head><body>
    <div class="membrete">
      ${logo ? `<img src="${logo}" alt="">` : ""}
      <div>
        <h2>${e(razon)}</h2>
        <p>${empresa?.nit ? `NIT: ${e(empresa.nit)}` : ""}${empresa?.direccion ? ` · ${e(empresa.direccion)}` : ""}${empresa?.telefono ? ` · Tel: ${e(empresa.telefono)}` : ""}</p>
      </div>
    </div>
    <h1>${e(tituloReporte)}</h1>
    <p class="sub">${subtituloPeriodo ? `${e(subtituloPeriodo)} · ` : ""}Generado el ${e(generado)}</p>
    <table class="datos"><thead><tr>${cab}</tr></thead><tbody>${cuerpo}</tbody></table>
    ${totales ? `<table class="totales"><tbody>${totales}</tbody></table>` : ""}
    <div class="pie"><span>${e(razon)} · Gosaryc · ${e(generado)}</span><span class="pagina"></span></div>
  </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}
