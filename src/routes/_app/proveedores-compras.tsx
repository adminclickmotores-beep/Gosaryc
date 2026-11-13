import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Truck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

export const Route = createFileRoute("/_app/proveedores-compras")({
  head: () => ({ meta: [{ title: "Proveedores y compras" }] }),
  component: ProveedoresComprasPage,
});

type Fila = { titulo: string; contacto: string | null; estado: string; monto: number };

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function ProveedoresComprasPage() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("modulo_registros")
      .select("titulo, contacto, estado, monto")
      .eq("modulo", "proveedores");
    if (error) toast.error("No se pudieron cargar los proveedores.");
    setFilas(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const porProveedor = useMemo(() => {
    const mapa = new Map<string, { porPagar: number; pagado: number }>();
    for (const f of filas) {
      const nombre = (f.contacto ?? f.titulo).trim() || f.titulo;
      const actual = mapa.get(nombre) ?? { porPagar: 0, pagado: 0 };
      if (f.estado === "hecho") actual.pagado += f.monto;
      else actual.porPagar += f.monto;
      mapa.set(nombre, actual);
    }
    return Array.from(mapa.entries())
      .map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => b.porPagar - a.porPagar);
  }, [filas]);

  const totalPorPagar = porProveedor.reduce((s, p) => s + p.porPagar, 0);
  const totalPagado = porProveedor.reduce((s, p) => s + p.pagado, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Truck className="h-7 w-7 text-primary" /> Proveedores y compras
        </h1>
        <p className="text-sm text-muted-foreground">
          Lo que debes a cada proveedor por sus compras. Registra cada compra en{" "}
          <Link to="/modulos/$id" params={{ id: "proveedores" }} className="text-primary">
            sus registros
          </Link>{" "}
          y márcala como "Pagado" cuando la canceles.
        </p>
      </div>

      {cargando && <p className="text-sm text-muted-foreground">Cargando proveedores…</p>}

      {!cargando && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Por pagar</p>
              <p className="truncate font-display text-xl text-foreground">{dinero(totalPorPagar)}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Ya pagado</p>
              <p className="truncate font-display text-xl text-primary">{dinero(totalPagado)}</p>
            </GlassPanel>
          </div>

          {porProveedor.length === 0 && <p className="text-sm text-muted-foreground">Aún no tienes compras registradas.</p>}

          <div className="space-y-2">
            {porProveedor.map((p) => (
              <GlassPanel key={p.nombre} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="min-w-0 break-words text-sm font-medium text-foreground">{p.nombre}</p>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Por pagar: <span className="text-foreground">{dinero(p.porPagar)}</span></p>
                  <p>Pagado: <span className="text-foreground">{dinero(p.pagado)}</span></p>
                </div>
              </GlassPanel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
