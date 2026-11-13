import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

type Mesa = Tables<"restaurante_mesas">;

const ESTADOS: { clave: string; texto: string }[] = [
  { clave: "libre", texto: "Libre" },
  { clave: "ocupada", texto: "Ocupada" },
  { clave: "reservada", texto: "Reservada" },
  { clave: "por_cobrar", texto: "Por cobrar" },
];

const SIGUIENTE_ESTADO: Record<string, string> = {
  libre: "ocupada",
  ocupada: "por_cobrar",
  por_cobrar: "libre",
  reservada: "ocupada",
};

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

export function MesasPanel() {
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [numero, setNumero] = useState("");
  const [capacidad, setCapacidad] = useState("4");

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("restaurante_mesas")
      .select("*")
      .order("numero");
    if (error) toast.error("No se pudieron cargar las mesas.");
    setMesas(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregar = async () => {
    const cap = Number(capacidad);
    if (!numero.trim() || !Number.isInteger(cap) || cap < 1) return toast.error("Escribe número y capacidad válidos.");
    const { error } = await supabase.from("restaurante_mesas").insert({ numero: numero.trim(), capacidad: cap });
    if (error) return toast.error("No se pudo guardar la mesa.");
    setNumero("");
    setCapacidad("4");
    cargar();
  };

  const cambiarEstado = async (m: Mesa, estado: string) => {
    const { error } = await supabase.from("restaurante_mesas").update({ estado }).eq("id", m.id);
    if (error) return toast.error("No se pudo cambiar el estado de la mesa.");
    cargar();
  };

  const eliminar = async (m: Mesa) => {
    const { error } = await supabase.from("restaurante_mesas").delete().eq("id", m.id);
    if (error) return toast.error("No se pudo quitar la mesa.");
    cargar();
  };

  const textoEstado = (clave: string) => ESTADOS.find((e) => e.clave === clave)?.texto ?? clave;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Nueva mesa</h2>
        <input className={campo} placeholder="Número o nombre (ej. 1, Terraza 2)" value={numero} onChange={(e) => setNumero(e.target.value)} />
        <input className={campo} placeholder="Capacidad (personas)" inputMode="numeric" value={capacidad} onChange={(e) => setCapacidad(e.target.value)} />
        <button onClick={agregar} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
          Agregar mesa
        </button>
      </GlassPanel>

      <div className="space-y-2">
        {cargando && <p className="text-sm text-muted-foreground">Cargando mesas…</p>}
        {!cargando && mesas.length === 0 && (
          <p className="text-sm text-muted-foreground">Aún no tienes mesas. Agrega la primera con el formulario.</p>
        )}
        {mesas.map((m) => (
          <GlassPanel key={m.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">Mesa {m.numero}</p>
              <p className="text-xs text-muted-foreground">
                {m.capacidad} {m.capacidad === 1 ? "persona" : "personas"} · {textoEstado(m.estado)}
              </p>
            </div>
            <button
              onClick={() => cambiarEstado(m, SIGUIENTE_ESTADO[m.estado] ?? "libre")}
              className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              Cambiar estado
            </button>
            <button
              onClick={() => eliminar(m)}
              className="shrink-0 rounded-full border border-glass-border px-3 py-1.5 text-xs text-muted-foreground"
            >
              Quitar
            </button>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
