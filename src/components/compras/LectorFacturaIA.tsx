import { useState } from "react";
import { FileText, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { leerFacturaIA, type FacturaLeida } from "@/lib/factura-ia.functions";

export type DatosFacturaUsables = {
  proveedor: string;
  nit: string;
  total: number | null;
};

type Props = {
  /** Llena el formulario de compra con los datos que el usuario confirmó. */
  onUsar: (datos: DatosFacturaUsables) => void;
};

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const leerComoDataUrl = (archivo: File) =>
  new Promise<string>((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(typeof lector.result === "string" ? lector.result : "");
    lector.onerror = () => reject(new Error("No se pudo abrir la imagen."));
    lector.readAsDataURL(archivo);
  });

export function LectorFacturaIA({ onUsar }: Props) {
  const [leyendo, setLeyendo] = useState(false);
  const [factura, setFactura] = useState<FacturaLeida | null>(null);

  const cambiarCampo = (campoEditado: "proveedor" | "nit" | "numero" | "fecha", valor: string) => {
    setFactura((actual) => (actual ? { ...actual, [campoEditado]: valor } : actual));
  };

  const procesarArchivo = async (archivo: File | undefined) => {
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) {
      toast.error("Sube una foto o imagen de la factura (JPG, PNG o WEBP).");
      return;
    }
    setLeyendo(true);
    try {
      const imagen = await leerComoDataUrl(archivo);
      const resultado = await leerFacturaIA({ data: { imagen } });
      setFactura(resultado);
      toast.success("Factura leída. Revisa los datos antes de usarlos.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo leer la factura.");
    } finally {
      setLeyendo(false);
    }
  };

  return (
    <GlassPanel className="space-y-3 p-5">
      <div className="space-y-1">
        <h2 className="flex items-center gap-2 font-medium text-foreground">
          <FileText className="h-4 w-4 text-primary" /> Leer factura del proveedor
        </h2>
        <p className="text-xs text-muted-foreground">
          Sube una foto de la factura y la IA llena los datos. Tú revisas y confirmas antes de usarlos.
        </p>
      </div>

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-glass-border px-4 py-3 text-sm text-foreground hover:bg-glass/40">
        {leyendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {leyendo ? "Leyendo la factura…" : "Subir foto de la factura"}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          disabled={leyendo}
          onChange={(e) => {
            void procesarArchivo(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>

      {factura && (
        <div className="space-y-3 border-t border-glass-border pt-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={campo} placeholder="Proveedor" value={factura.proveedor} onChange={(e) => cambiarCampo("proveedor", e.target.value)} />
            <input className={campo} placeholder="NIT del proveedor" value={factura.nit} onChange={(e) => cambiarCampo("nit", e.target.value)} />
            <input className={campo} placeholder="Número de factura" value={factura.numero} onChange={(e) => cambiarCampo("numero", e.target.value)} />
            <input className={campo} type="date" value={factura.fecha ?? ""} onChange={(e) => cambiarCampo("fecha", e.target.value)} />
          </div>

          <div className="space-y-1 text-xs text-muted-foreground">
            <p>
              Total de la factura: <span className="text-foreground">{factura.total !== null ? dinero(factura.total) : "no se pudo leer"}</span>
              {factura.iva !== null && <> · IVA: <span className="text-foreground">{dinero(factura.iva)}</span></>}
            </p>
            {factura.items.length > 0 && (
              <ul className="max-h-40 space-y-1 overflow-y-auto">
                {factura.items.map((it, i) => (
                  <li key={i} className="break-words text-foreground">
                    {it.descripcion}
                    {it.cantidad !== null && <> · {it.cantidad}</>}
                    {it.valor_total !== null && <> · {dinero(it.valor_total)}</>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              onUsar({ proveedor: factura.proveedor, nit: factura.nit, total: factura.total });
              toast.success("Datos pasados al formulario de compra. Elige el insumo y confirma.");
            }}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 sm:w-auto"
          >
            Usar estos datos en la compra
          </button>
        </div>
      )}
    </GlassPanel>
  );
}
