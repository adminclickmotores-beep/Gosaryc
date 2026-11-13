import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

export const Route = createFileRoute("/_app/pagos-digitales")({
  head: () => ({ meta: [{ title: "Nequi, Daviplata y Bre-B" }] }),
  component: PagosDigitalesPage,
});

type Periodo = "hoy" | "mes";

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function PagosDigitalesPage() {
  const [periodo, setPeriodo] = useState<Periodo>("hoy");
  const [ventas, setVentas] = useState(0);
  const [conciliado, setConciliado] = useState(0);
  const [porConciliar, setPorConciliar] = useState(0);
  const [cantidad, setCantidad] = useState(0);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async (p: Periodo) => {
    setCargando(true);
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    if (p === "mes") inicio.setDate(1);
    const desde = inicio.toISOString();
    const [pedidosRes, pagosRes] = await Promise.all([
      supabase.from("restaurante_pedidos").select("total").eq("estado", "entregado").gte("created_at", desde),
      supabase.from("modulo_registros").select("monto, estado").eq("modulo", "pagos_digitales").gte("created_at", desde),
    ]);
    if (pedidosRes.error || pagosRes.error) toast.error("No se pudo cargar la conciliación.");
    const listaPedidos = pedidosRes.data ?? [];
    const listaPagos = pagosRes.data ?? [];
    setVentas(listaPedidos.reduce((s, x) => s + x.total, 0));
    setCantidad(listaPagos.length);
    setConciliado(listaPagos.filter((x) => x.estado === "hecho").reduce((s, x) => s + x.monto, 0));
    setPorConciliar(listaPagos.filter((x) => x.estado !== "hecho").reduce((s, x) => s + x.monto, 0));
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar(periodo);
  }, [cargar, periodo]);

  const diferencia = ventas - conciliado;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Smartphone className="h-7 w-7 text-primary" /> Nequi, Daviplata y Bre-B
        </h1>
        <p className="text-sm text-muted-foreground">
          Compara los pagos por transferencia contra las ventas entregadas. Marca cada pago como "Conciliado" en{" "}
          <Link to="/modulos/$id" params={{ id: "pagos_digitales" }} className="text-primary">
            sus registros
          </Link>.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {(
          [
            { clave: "hoy", texto: "Hoy" },
            { clave: "mes", texto: "Este mes" },
          ] as { clave: Periodo; texto: string }[]
        ).map((o) => (
          <button
            key={o.clave}
            onClick={() => setPeriodo(o.clave)}
            className={`rounded-full px-4 py-1.5 ${periodo === o.clave ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`}
          >
            {o.texto}
          </button>
        ))}
      </div>

      {cargando && <p className="text-sm text-muted-foreground">Calculando…</p>}

      {!cargando && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <GlassPanel className="p-4">
            <p className="text-xs text-muted-foreground">Ventas entregadas</p>
            <p className="truncate font-display text-xl text-foreground">{dinero(ventas)}</p>
          </GlassPanel>
          <GlassPanel className="p-4">
            <p className="text-xs text-muted-foreground">Pagos conciliados</p>
            <p className="truncate font-display text-xl text-foreground">{dinero(conciliado)}</p>
          </GlassPanel>
          <GlassPanel className="p-4">
            <p className="text-xs text-muted-foreground">Pagos por conciliar</p>
            <p className="truncate font-display text-xl text-foreground">{dinero(porConciliar)}</p>
          </GlassPanel>
          <GlassPanel className="p-4">
            <p className="text-xs text-muted-foreground">Ventas sin conciliar</p>
            <p className={`truncate font-display text-xl ${diferencia > 0 ? "text-destructive" : "text-primary"}`}>
              {dinero(diferencia)}
            </p>
            <p className="text-xs text-muted-foreground">{cantidad} pagos registrados</p>
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
