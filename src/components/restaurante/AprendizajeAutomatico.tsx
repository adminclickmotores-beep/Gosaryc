import { useCallback, useEffect, useMemo, useState } from "react";
import { Brain, Globe, Trash2, TrendingUp, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

type Regla = {
  id: string;
  tipo: string;
  pregunta: string;
  respuesta: string;
  origen: string;
  fuente: string | null;
  verificado_en: string;
};

const ORIGENES: Array<{ id: string; titulo: string; Icono: typeof Globe }> = [
  { id: "auto_internet", titulo: "De internet", Icono: Globe },
  { id: "dueno", titulo: "Del dueño", Icono: UserCheck },
  { id: "venta_cerrada", titulo: "De ventas cerradas", Icono: TrendingUp },
];

/** Visor pasivo: reglas que el agente aprendió solo. El dueño únicamente puede quitar las que no quiera. */
export function AprendizajeAutomatico() {
  const [reglas, setReglas] = useState<Regla[]>([]);
  const [filtro, setFiltro] = useState<string>("todas");

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("agente_conocimiento")
      .select("id,tipo,pregunta,respuesta,origen,fuente,verificado_en")
      .order("created_at", { ascending: false })
      .limit(200);
    setReglas((data ?? []) as Regla[]);
  }, []);

  useEffect(() => {
    void cargar();
    const t = window.setInterval(() => void cargar(), 30000);
    return () => window.clearInterval(t);
  }, [cargar]);

  const conteo = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of reglas) c[r.origen] = (c[r.origen] ?? 0) + 1;
    return c;
  }, [reglas]);

  const visibles = filtro === "todas" ? reglas : reglas.filter((r) => r.origen === filtro);

  async function quitar(id: string) {
    const { error } = await supabase.from("agente_conocimiento").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo quitar la regla.");
      return;
    }
    setReglas((x) => x.filter((r) => r.id !== id));
  }

  return (
    <GlassPanel className="space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span className="icon-chip h-10 w-10 shrink-0 rounded-xl">
          <Brain className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-lg">Aprendizaje automático</h3>
          <p className="text-sm text-muted-foreground">
            El agente aprende solo de internet, de tus respuestas a clientes y de las ventas cerradas. No tienes que hacer nada: aquí solo puedes quitar lo que no quieras.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button type="button" onClick={() => setFiltro("todas")} className={`rounded-xl border p-3 text-left ${filtro === "todas" ? "border-primary" : "border-border"}`}>
          <p className="font-display text-xl">{reglas.length}</p>
          <p className="text-xs text-muted-foreground">Reglas aprendidas</p>
        </button>
        {ORIGENES.map(({ id, titulo, Icono }) => (
          <button key={id} type="button" onClick={() => setFiltro(id)} className={`rounded-xl border p-3 text-left ${filtro === id ? "border-primary" : "border-border"}`}>
            <p className="flex items-center gap-1.5 font-display text-xl">
              <Icono className="h-4 w-4 text-primary" />
              {conteo[id] ?? 0}
            </p>
            <p className="text-xs text-muted-foreground">{titulo}</p>
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no hay reglas aprendidas. Aparecerán solas cuando el agente atienda clientes.</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto">
          {visibles.map((r) => (
            <li key={r.id} className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm">
              <div className="min-w-0 flex-1">
                {r.pregunta && <p className="break-words font-medium">{r.pregunta}</p>}
                <p className="break-words text-muted-foreground">{r.respuesta}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {ORIGENES.find((o) => o.id === r.origen)?.titulo ?? r.origen}
                  {r.fuente ? ` • ${r.fuente}` : ""} • verificado {new Date(r.verificado_en).toLocaleDateString("es-CO", { timeZone: "America/Bogota" })}
                </p>
              </div>
              <button type="button" aria-label="Quitar regla" onClick={() => void quitar(r.id)} className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </GlassPanel>
  );
}
