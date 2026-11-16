import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Repeat } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

export const Route = createFileRoute("/_app/pedidos-recurrentes")({
  head: () => ({ meta: [{ title: "Pedidos recurrentes" }] }),
  component: PedidosRecurrentesPage,
});

type Registro = Tables<"suscripciones_registros">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function PedidosRecurrentesPage() {
  const [suscripciones, setSuscripciones] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("suscripciones_registros")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error("No se pudieron cargar los pedidos recurrentes.");
    setSuscripciones(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const activos = suscripciones.filter((s) => s.estado === "hecho");
  const enNegociacion = suscripciones.filter((s) => s.estado !== "hecho" && s.estado !== "cancelado");
  const valorActivo = activos.reduce((s, r) => s + r.monto, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Repeat className="h-7 w-7 text-primary" /> Pedidos recurrentes
        </h1>
        <p className="text-sm text-muted-foreground">
          Clientes que piden cada semana, como almuerzos corporativos. Para agregar uno, usa{" "}
          <Link to="/modulos/$id" params={{ id: "suscripciones" }} className="text-primary">
            sus registros
          </Link>
          . Márcalo como "Cerrado" cuando empiece a pedir.
        </p>
      </div>

      {cargando && <p className="text-sm text-muted-foreground">Cargando…</p>}

      {!cargando && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Activos</p>
              <p className="font-display text-xl text-foreground">{activos.length}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">En negociación</p>
              <p className="font-display text-xl text-foreground">{enNegociacion.length}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Valor activo</p>
              <p className="truncate font-display text-xl text-primary">{dinero(valorActivo)}</p>
            </GlassPanel>
          </div>

          {suscripciones.length === 0 && (
            <p className="text-sm text-muted-foreground">Aún no tienes pedidos recurrentes.</p>
          )}

          <div className="space-y-2">
            {suscripciones.map((s) => (
              <GlassPanel key={s.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-foreground">{s.titulo}</p>
                  {s.contacto && <p className="break-words text-xs text-muted-foreground">{s.contacto}</p>}
                </div>
                <span className="shrink-0 text-sm text-foreground">{dinero(s.monto)}</span>
              </GlassPanel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
