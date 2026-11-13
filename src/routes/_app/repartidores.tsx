import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bike } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

export const Route = createFileRoute("/_app/repartidores")({
  head: () => ({ meta: [{ title: "Repartidores y liquidación" }] }),
  component: RepartidoresPage,
});

type Periodo = "hoy" | "mes";

type Fila = { titulo: string; estado: string; monto: number };

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function RepartidoresPage() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async (p: Periodo) => {
    setCargando(true);
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    if (p === "mes") inicio.setDate(1);
    const { data, error } = await supabase
      .from("modulo_registros")
      .select("titulo, estado, monto")
      .eq("modulo", "repartidores")
      .gte("created_at", inicio.toISOString());
    if (error) toast.error("No se pudo cargar la liquidación.");
    setFilas(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar(periodo);
  }, [cargar, periodo]);

  const porRepartidor = useMemo(() => {
    const mapa = new Map<string, { porPagar: number; pagado: number }>();
    for (const f of filas) {
      const actual = mapa.get(f.titulo) ?? { porPagar: 0, pagado: 0 };
      if (f.estado === "hecho") actual.pagado += f.monto;
      else actual.porPagar += f.monto;
      mapa.set(f.titulo, actual);
    }
    return Array.from(mapa.entries())
      .map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => b.porPagar - a.porPagar);
  }, [filas]);

  const totalPorPagar = porRepartidor.reduce((s, r) => s + r.porPagar, 0);
  const totalPagado = porRepartidor.reduce((s, r) => s + r.pagado, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Bike className="h-7 w-7 text-primary" /> Repartidores y liquidación
        </h1>
        <p className="text-sm text-muted-foreground">
          Lo que debes a cada domiciliario por sus entregas. Registra cada pago en{" "}
          <Link to="/modulos/$id" params={{ id: "repartidores" }} className="text-primary">
            sus registros
          </Link>{" "}
          y márcalo como "Pagado".
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

          {porRepartidor.length === 0 && (
            <p className="text-sm text-muted-foreground">Aún no hay liquidaciones en este periodo.</p>
          )}

          <div className="space-y-2">
            {porRepartidor.map((r) => (
              <GlassPanel key={r.nombre} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="min-w-0 break-words text-sm font-medium text-foreground">{r.nombre}</p>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Por pagar: <span className="text-foreground">{dinero(r.porPagar)}</span></p>
                  <p>Pagado: <span className="text-foreground">{dinero(r.pagado)}</span></p>
                </div>
              </GlassPanel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
