import { FileSpreadsheet, FileText } from "lucide-react";
import { toast } from "sonner";
import { useNegocio } from "@/hooks/use-negocio";
import {
  exportarAExcel,
  exportarAPDF,
  type CeldaReporte,
  type ColumnaReporte,
} from "@/lib/exportar-reportes";

type Props = {
  /** Nombre del reporte: sale en el título del PDF y en el nombre del archivo. */
  titulo: string;
  subtitulo?: string;
  columnas: ColumnaReporte[];
  filas: CeldaReporte[][];
  /** Fila final de totales para Excel. */
  filaTotales?: CeldaReporte[];
  /** Cuadro de totales para el PDF. */
  resumenTotales?: { etiqueta: string; valor: CeldaReporte; moneda?: boolean }[];
  className?: string;
};

/** Barra compacta con los botones "Excel (.xlsx)" y "PDF" para cualquier módulo o reporte. */
export function BarraExportar({ titulo, subtitulo, columnas, filas, filaTotales, resumenTotales, className }: Props) {
  const { negocio } = useNegocio();
  const vacio = filas.length === 0;

  const excel = async () => {
    try {
      await exportarAExcel({ nombreArchivo: titulo, nombreHoja: titulo, columnas, filas, filaTotales });
    } catch {
      toast.error("No se pudo generar el Excel. Inténtalo de nuevo.");
    }
  };

  const pdf = () =>
    exportarAPDF({
      tituloReporte: titulo,
      subtituloPeriodo: subtitulo,
      empresa: {
        nombre: negocio?.nombre,
        razonSocial: negocio?.razon_social,
        nit: negocio?.nit ? `${negocio.nit}${negocio.digito_verificacion ? `-${negocio.digito_verificacion}` : ""}` : null,
        direccion: negocio?.direccion_fiscal,
        telefono: negocio?.telefono_pedidos,
        logoUrl: negocio?.logo_url,
      },
      columnas,
      filas,
      resumenTotales,
    });

  return (
    <div className={className ?? "flex flex-wrap items-center gap-2"}>
      <button
        type="button"
        onClick={excel}
        disabled={vacio}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" /> Excel (.xlsx)
      </button>
      <button
        type="button"
        onClick={pdf}
        disabled={vacio}
        className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
      >
        <FileText className="h-3.5 w-3.5" /> PDF
      </button>
    </div>
  );
}
