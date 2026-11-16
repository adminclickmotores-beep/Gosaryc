import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Percent } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

export const Route = createFileRoute("/_app/combos")({
  head: () => ({ meta: [{ title: "Combos y promociones" }] }),
  component: CombosPage,
});

type Registro = Tables<"combos_registros">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function CombosPage() {
  const [combos, setCombos] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("combos_registros")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("No se pudieron cargar los combos.");
    setCombos(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const disponibles = combos.filter((c) => c.estado !== "agotado");
  const agotados = combos.filter((c) => c.estado === "agotado");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Percent className="h-7 w-7 text-primary" /> Combos y promociones
        </h1>
        <p className="text-sm text-muted-foreground">
          Combos del día, 2x1 y descuentos. Para crear o editar uno, usa{" "}
          <Link to="/modulos/$id" params={{ id: "combos" }} className="text-primary">
            sus registros
          </Link>
          . Márcalo como "Agotado" cuando ya no esté activo.
        </p>
      </div>

      {cargando && <p className="text-sm text-muted-foreground">Cargando combos…</p>}

      {!cargando && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Combos activos</p>
              <p className="font-display text-xl text-foreground">{disponibles.length}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Agotados o pausados</p>
              <p className="font-display text-xl text-foreground">{agotados.length}</p>
            </GlassPanel>
          </div>

          {combos.length === 0 && (
            <p className="text-sm text-muted-foreground">Aún no tienes combos. Crea el primero desde sus registros.</p>
          )}

          <div className="space-y-2">
            {disponibles.map((c) => (
              <GlassPanel key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-foreground">{c.titulo}</p>
                  {c.detalle && <p className="break-words text-xs text-muted-foreground">{c.detalle}</p>}
                </div>
                <span className="shrink-0 text-sm text-foreground">{dinero(c.monto)}</span>
              </GlassPanel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
