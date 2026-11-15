import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Target } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

export const Route = createFileRoute("/_app/metas")({
  head: () => ({ meta: [{ title: "Metas y objetivos" }] }),
  component: MetasPage,
});

type Registro = Tables<"modulo_registros">;

const ETIQUETAS: Record<string, string> = { pendiente: "Pendiente", en_proceso: "En curso", hecho: "Cumplida" };

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function MetasPage() {
  const [metas, setMetas] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("modulo_registros")
      .select("*")
      .eq("modulo", "metas")
      .order("fecha", { ascending: true });
    if (error) toast.error("No se pudieron cargar las metas.");
    setMetas(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cumplidas = metas.filter((m) => m.estado === "hecho");
  const enCurso = metas.filter((m) => m.estado !== "hecho");
  const valorTotal = metas.reduce((s, m) => s + m.monto, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Target className="h-7 w-7 text-primary" /> Metas y objetivos
        </h1>
        <p className="text-sm text-muted-foreground">
          Tus metas de ventas y su seguimiento. Para agregar o actualizar una, usa{" "}
          <Link to="/modulos/$id" params={{ id: "metas" }} className="text-primary">
            sus registros
          </Link>
          . Márcala como "Cumplida" cuando la alcances.
        </p>
      </div>

      {cargando && <p className="text-sm text-muted-foreground">Cargando metas…</p>}

      {!cargando && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">En curso</p>
              <p className="font-display text-xl text-foreground">{enCurso.length}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Cumplidas</p>
              <p className="font-display text-xl text-primary">{cumplidas.length}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Valor de metas</p>
              <p className="truncate font-display text-xl text-foreground">{dinero(valorTotal)}</p>
            </GlassPanel>
          </div>

          {metas.length === 0 && <p className="text-sm text-muted-foreground">Aún no tienes metas registradas.</p>}

          <div className="space-y-2">
            {metas.map((m) => (
              <GlassPanel key={m.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-foreground">{m.titulo}</p>
                  {m.fecha && <p className="text-xs text-muted-foreground">Fecha: {m.fecha}</p>}
                </div>
                <div className="shrink-0 text-right text-xs text-muted-foreground">
                  <p className="text-sm text-foreground">{dinero(m.monto)}</p>
                  <p>{ETIQUETAS[m.estado] ?? m.estado}</p>
                </div>
              </GlassPanel>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
