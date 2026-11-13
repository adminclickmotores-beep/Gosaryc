import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Briefcase } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

export const Route = createFileRoute("/_app/equipo-nomina")({
  head: () => ({ meta: [{ title: "Equipo, turnos y nómina" }] }),
  component: EquipoNominaPage,
});

type Fila = { titulo: string; estado: string; monto: number };

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function EquipoNominaPage() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("modulo_registros")
      .select("titulo, estado, monto")
      .eq("modulo", "equipo_turnos");
    if (error) toast.error("No se pudo cargar la nómina.");
    setFilas(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const porPersona = useMemo(() => {
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

  const totalPorPagar = porPersona.reduce((s, p) => s + p.porPagar, 0);
  const totalPagado = porPersona.reduce((s, p) => s + p.pagado, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Briefcase className="h-7 w-7 text-primary" /> Equipo, turnos y nómina
        </h1>
        <p className="text-sm text-muted-foreground">
          Lo que le debes a cada persona del equipo. Registra cada pago o novedad en{" "}
          <Link to="/modulos/$id" params={{ id: "equipo_turnos" }} className="text-primary">
            sus registros
          </Link>{" "}
          y márcalo como "Pagado" cuando lo entregues.
        </p>
      </div>

      {cargando && <p className="text-sm text-muted-foreground">Cargando equipo…</p>}

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

          {porPersona.length === 0 && <p className="text-sm text-muted-foreground">Aún no tienes registros de nómina.</p>}

          <div className="space-y-2">
            {porPersona.map((p) => (
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
