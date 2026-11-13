import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

export const Route = createFileRoute("/_app/resenas-pqrs")({
  head: () => ({ meta: [{ title: "Reseñas y PQRS" }] }),
  component: ResenasPqrsPage,
});

type Registro = Tables<"modulo_registros">;

const ETIQUETAS: Record<string, string> = { pendiente: "Pendiente", en_proceso: "En proceso", hecho: "Resuelto" };

function ResenasPqrsPage() {
  const [items, setItems] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("modulo_registros")
      .select("*")
      .eq("modulo", "resenas")
      .order("created_at", { ascending: false });
    if (error) toast.error("No se pudieron cargar las reseñas.");
    setItems(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const abiertos = items.filter((i) => i.estado !== "hecho");
  const resueltos = items.filter((i) => i.estado === "hecho");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Star className="h-7 w-7 text-primary" /> Reseñas y PQRS
        </h1>
        <p className="text-sm text-muted-foreground">
          Quejas, reclamos y opiniones con seguimiento. Para registrar una, usa{" "}
          <Link to="/modulos/$id" params={{ id: "resenas" }} className="text-primary">
            sus registros
          </Link>
          . Cambia el estado a "Resuelto" cuando el caso quede cerrado.
        </p>
      </div>

      {cargando && <p className="text-sm text-muted-foreground">Cargando…</p>}

      {!cargando && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Casos abiertos</p>
              <p className="font-display text-xl text-foreground">{abiertos.length}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Resueltos</p>
              <p className="font-display text-xl text-primary">{resueltos.length}</p>
            </GlassPanel>
          </div>

          {items.length === 0 && <p className="text-sm text-muted-foreground">Aún no tienes reseñas ni PQRS.</p>}

          <div className="space-y-2">
            {items.map((i) => (
              <GlassPanel key={i.id} className="space-y-1 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="min-w-0 break-words text-sm font-medium text-foreground">{i.titulo}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{ETIQUETAS[i.estado] ?? i.estado}</span>
                </div>
                {i.detalle && <p className="break-words text-xs text-muted-foreground">{i.detalle}</p>}
                {i.contacto && <p className="break-words text-xs text-muted-foreground">{i.contacto}</p>}
              </GlassPanel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
