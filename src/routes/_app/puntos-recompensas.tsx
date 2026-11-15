import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Gift } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

export const Route = createFileRoute("/_app/puntos-recompensas")({
  head: () => ({ meta: [{ title: "Puntos y recompensas" }] }),
  component: PuntosRecompensasPage,
});

type Registro = Tables<"modulo_registros">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function PuntosRecompensasPage() {
  const [clientes, setClientes] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("modulo_registros")
      .select("*")
      .eq("modulo", "fidelizacion")
      .order("monto", { ascending: false });
    if (error) toast.error("No se pudieron cargar los puntos.");
    setClientes(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const canjeados = clientes.filter((c) => c.estado === "hecho");
  const puntosTotales = clientes.reduce((s, c) => s + c.monto, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Gift className="h-7 w-7 text-primary" /> Puntos y recompensas
        </h1>
        <p className="text-sm text-muted-foreground">
          Tus clientes frecuentes y sus puntos. Para sumar puntos o agregar un cliente, usa{" "}
          <Link to="/modulos/$id" params={{ id: "fidelizacion" }} className="text-primary">
            sus registros
          </Link>
          . Escribe los puntos en el campo de valor y márcalo como "Canjeado" cuando use su recompensa.
        </p>
      </div>

      {cargando && <p className="text-sm text-muted-foreground">Cargando clientes…</p>}

      {!cargando && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Clientes</p>
              <p className="font-display text-xl text-foreground">{clientes.length}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Canjeados</p>
              <p className="font-display text-xl text-foreground">{canjeados.length}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Puntos totales</p>
              <p className="truncate font-display text-xl text-primary">{puntosTotales.toLocaleString("es-CO")}</p>
            </GlassPanel>
          </div>

          {clientes.length === 0 && <p className="text-sm text-muted-foreground">Aún no tienes clientes con puntos.</p>}

          <div className="space-y-2">
            {clientes.map((c) => (
              <GlassPanel key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-foreground">{c.titulo}</p>
                  {c.contacto && <p className="break-words text-xs text-muted-foreground">{c.contacto}</p>}
                </div>
                <span className="shrink-0 text-sm text-foreground">{c.monto.toLocaleString("es-CO")} pts</span>
              </GlassPanel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
