import { createFileRoute, Link } from "@tanstack/react-router";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { ArrowLeft, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";
import { CargaModulo } from "@/components/carga/CargaModulo";
import { BadgeNormativa } from "@/components/fiscal/BadgeNormativa";
import { LIMITE_CONSULTA } from "@/lib/rendimiento";

// Contabilidad pesa (libros + Contador Pro): se carga solo cuando se ve.
const Contabilidad = lazy(() =>
  import("@/components/restaurante/Contabilidad").then((m) => ({ default: m.Contabilidad })),
);

export const Route = createFileRoute("/_app/finanzas")({
  head: () => ({ meta: [{ title: "Finanzas y rentabilidad" }] }),
  component: FinanzasPage,
});

type Periodo = "hoy" | "mes";

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function FinanzasPage() {
  const { negocio } = useNegocio();
  const usaPedidos = resolverTipoNegocio(negocio?.tipo_negocio).usaPedidos;
  const [periodo, setPeriodo] = useState<Periodo>("hoy");
  const [ventas, setVentas] = useState(0);
  const [pedidos, setPedidos] = useState(0);
  const [ingresos, setIngresos] = useState(0);
  const [gastos, setGastos] = useState(0);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async (p: Periodo) => {
    setCargando(true);
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    if (p === "mes") inicio.setDate(1);
    const desde = inicio.toISOString();
    // Límites fijos: el resumen solo necesita los totales recientes, nunca miles de filas.
    const [pedidosRes, movimientosRes] = await Promise.all([
      supabase.from("restaurante_pedidos").select("total").eq("estado", "entregado").gte("created_at", desde).order("created_at", { ascending: false }).limit(LIMITE_CONSULTA),
      supabase.from("restaurante_movimientos_caja").select("tipo, monto").gte("created_at", desde).order("created_at", { ascending: false }).limit(LIMITE_CONSULTA),
    ]);
    if (pedidosRes.error || movimientosRes.error) toast.error("No se pudieron cargar las finanzas.");
    const listaPedidos = pedidosRes.data ?? [];
    const listaMovimientos = movimientosRes.data ?? [];
    setPedidos(listaPedidos.length);
    setVentas(listaPedidos.reduce((s, x) => s + x.total, 0));
    setIngresos(listaMovimientos.filter((m) => m.tipo === "ingreso").reduce((s, m) => s + m.monto, 0));
    setGastos(listaMovimientos.filter((m) => m.tipo === "gasto").reduce((s, m) => s + m.monto, 0));
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar(periodo);
  }, [cargar, periodo]);

  const ingresosTotales = ventas + ingresos;
  const utilidad = ingresosTotales - gastos;
  const margen = ingresosTotales > 0 ? Math.round((utilidad / ingresosTotales) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Wallet className="h-7 w-7 text-primary" /> Finanzas y rentabilidad
        </h1>
        <p className="text-sm text-muted-foreground">Ventas entregadas, ingresos extra, gastos y utilidad.</p>
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
        <div className={`grid grid-cols-2 gap-3 ${usaPedidos ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
          {usaPedidos && (
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Ventas entregadas</p>
              <p className="truncate font-display text-xl text-foreground">{dinero(ventas)}</p>
              <p className="text-xs text-muted-foreground">{pedidos} pedidos</p>
            </GlassPanel>
          )}
          <GlassPanel className="p-4">
            <p className="text-xs text-muted-foreground">{usaPedidos ? "Otros ingresos" : "Ingresos"}</p>
            <p className="truncate font-display text-xl text-foreground">{dinero(ingresos)}</p>
          </GlassPanel>
          <GlassPanel className="p-4">
            <p className="text-xs text-muted-foreground">Gastos</p>
            <p className="truncate font-display text-xl text-foreground">{dinero(gastos)}</p>
          </GlassPanel>
          <GlassPanel className={`p-4 ${usaPedidos ? "" : "col-span-2 lg:col-span-1"}`}>
            <p className="text-xs text-muted-foreground">Utilidad neta ({margen}%)</p>
            <p className={`truncate font-display text-xl ${utilidad < 0 ? "text-destructive" : "text-primary"}`}>{dinero(utilidad)}</p>
          </GlassPanel>
        </div>
      )}

      <BadgeNormativa />

      <Suspense fallback={<CargaModulo texto="Cargando contabilidad…" />}>
        <Contabilidad />
      </Suspense>
    </div>
  );
}
