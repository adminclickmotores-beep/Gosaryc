import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Coins } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

export const Route = createFileRoute("/_app/propinas")({
  head: () => ({ meta: [{ title: "Propinas y reparto" }] }),
  component: PropinasPage,
});

type Periodo = "hoy" | "mes";

type Fila = { titulo: string; estado: string; monto: number };

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function PropinasPage() {
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async (p: Periodo) => {
    setCargando(true);
    const inicio = new Date();
    inicio.setHours(0, 0, 0, 0);
    if (p === "mes") inicio.setDate(1);
    const { data, error } = await supabase
      .from("propinas_registros")
      .select("titulo, estado, monto")
      .gte("created_at", inicio.toISOString());
    if (error) toast.error("No se pudieron cargar las propinas.");
    setFilas(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar(periodo);
  }, [cargar, periodo]);

  const porPersona = useMemo(() => {
    const mapa = new Map<string, { porRepartir: number; repartido: number }>();
    for (const f of filas) {
      const actual = mapa.get(f.titulo) ?? { porRepartir: 0, repartido: 0 };
      if (f.estado === "hecho") actual.repartido += f.monto;
      else actual.porRepartir += f.monto;
      mapa.set(f.titulo, actual);
    }
    return Array.from(mapa.entries())
      .map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => b.porRepartir - a.porRepartir);
  }, [filas]);

  const totalPorRepartir = porPersona.reduce((s, r) => s + r.porRepartir, 0);
  const totalRepartido = porPersona.reduce((s, r) => s + r.repartido, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Coins className="h-7 w-7 text-primary" /> Propinas y reparto
        </h1>
        <p className="text-sm text-muted-foreground">
          Lo que el equipo recibió en propinas. Registra cada propina en{" "}
          <Link to="/modulos/$id" params={{ id: "propinas" }} className="text-primary">
            sus registros
          </Link>{" "}
          y márcala como "Pagado" cuando ya la repartiste.
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
              <p className="text-xs text-muted-foreground">Por repartir</p>
              <p className="truncate font-display text-xl text-foreground">{dinero(totalPorRepartir)}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Ya repartido</p>
              <p className="truncate font-display text-xl text-primary">{dinero(totalRepartido)}</p>
            </GlassPanel>
          </div>

          {porPersona.length === 0 && (
            <p className="text-sm text-muted-foreground">Aún no hay propinas en este periodo.</p>
          )}

          <div className="space-y-2">
            {porPersona.map((r) => (
              <GlassPanel key={r.nombre} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="min-w-0 break-words text-sm font-medium text-foreground">{r.nombre}</p>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Por repartir: <span className="text-foreground">{dinero(r.porRepartir)}</span></p>
                  <p>Repartido: <span className="text-foreground">{dinero(r.repartido)}</span></p>
                </div>
              </GlassPanel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
