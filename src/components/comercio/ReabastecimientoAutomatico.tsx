import { useMemo, useState } from "react";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { imprimirReporte, enlaceWhatsapp } from "@/lib/exportes";
import type { Producto } from "@/components/comercio/ComercioModulos";

const num = (v: string) => {
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const dinero = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

export function ReabastecimientoAutomatico({ productos }: { productos: Producto[] }) {
  const [proveedor, setProveedor] = useState("");
  const [telefono, setTelefono] = useState("");
  const [extra, setExtra] = useState<Record<string, string>>({});

  // Productos activos en o por debajo del mínimo (o con menos de 1,25 veces el mínimo)
  const filas = useMemo(
    () =>
      productos
        .filter((p) => p.activo && p.stock_minimo > 0 && p.stock <= p.stock_minimo * 1.25)
        .map((p) => {
          const sugerida = Math.max(Math.ceil(p.stock_minimo * 2 - p.stock), 1);
          return { p, sugerida };
        }),
    [productos],
  );

  if (filas.length === 0) {
    return (
      <GlassPanel className="space-y-1 p-5">
        <h2 className="font-medium text-foreground">Reabastecimiento automático</h2>
        <p className="text-sm text-muted-foreground">
          Ningún producto está en su stock mínimo. Cuando alguno llegue al mínimo aparecerá aquí con la cantidad sugerida.
        </p>
      </GlassPanel>
    );
  }

  const cantidad = (id: string, sugerida: number) => (extra[id] !== undefined ? num(extra[id]) : sugerida);
  const lineas = filas.map(({ p, sugerida }) => ({ p, cant: cantidad(p.id, sugerida) })).filter((l) => l.cant > 0);
  const total = lineas.reduce((s, l) => s + l.cant * l.p.costo, 0);
  const titulo = `Orden de compra${proveedor.trim() ? ` - ${proveedor.trim()}` : ""}`;

  const pdf = () =>
    imprimirReporte(
      titulo,
      `${lineas.length} productos`,
      ["Producto", "Código", "Stock", "Cantidad a pedir", "Costo unit.", "Subtotal"],
      lineas.map((l) => [l.p.nombre, l.p.codigo_barras ?? l.p.sku ?? "", String(l.p.stock), String(l.cant), dinero(l.p.costo), dinero(l.cant * l.p.costo)]),
      [`Total estimado: ${dinero(total)}`],
    );

  const whatsapp = () => {
    const texto =
      `*${titulo}*\n` +
      lineas.map((l) => `- ${l.p.nombre}: ${l.cant} ${l.p.unidad_base}`).join("\n") +
      `\nTotal estimado: ${dinero(total)}`;
    const url = enlaceWhatsapp(telefono, texto);
    if (url) window.open(url, "_blank", "noopener");
  };

  return (
    <GlassPanel className="space-y-3 p-5">
      <div>
        <h2 className="font-medium text-foreground">Reabastecimiento automático</h2>
        <p className="text-sm text-muted-foreground">
          {filas.length} producto(s) en stock mínimo o por agotarse. Ajusta las cantidades y envía o descarga la orden de compra.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={proveedor} onChange={(e) => setProveedor(e.target.value)} placeholder="Proveedor" className="w-full rounded-lg border border-glass-border bg-transparent px-3 py-2 text-base" />
        <input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="WhatsApp del proveedor" inputMode="tel" className="w-full rounded-lg border border-glass-border bg-transparent px-3 py-2 text-base" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 pr-2">Producto</th>
              <th className="py-1 pr-2">Stock</th>
              <th className="py-1 pr-2">Mínimo</th>
              <th className="py-1 pr-2">Pedir</th>
              <th className="py-1">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ p, sugerida }) => (
              <tr key={p.id} className="border-t border-glass-border">
                <td className="py-1 pr-2 text-foreground">{p.nombre}</td>
                <td className="py-1 pr-2">{p.stock}</td>
                <td className="py-1 pr-2">{p.stock_minimo}</td>
                <td className="py-1 pr-2">
                  <input
                    value={extra[p.id] ?? String(sugerida)}
                    onChange={(e) => setExtra((x) => ({ ...x, [p.id]: e.target.value }))}
                    inputMode="decimal"
                    className="w-20 rounded-lg border border-glass-border bg-transparent px-2 py-1 text-base"
                  />
                </td>
                <td className="py-1">{dinero(cantidad(p.id, sugerida) * p.costo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-foreground">Total estimado: {dinero(total)}</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={whatsapp} disabled={lineas.length === 0 || !telefono.trim()} className="rounded-full bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50">
          Enviar por WhatsApp
        </button>
        <button onClick={pdf} disabled={lineas.length === 0} className="rounded-full border border-glass-border px-4 py-1.5 text-sm text-muted-foreground disabled:opacity-50">
          Descargar PDF
        </button>
      </div>
    </GlassPanel>
  );
}
