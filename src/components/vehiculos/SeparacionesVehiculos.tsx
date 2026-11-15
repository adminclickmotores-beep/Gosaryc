import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Bike, Car, CheckCircle2, Tag, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { FotoPrivada } from "@/components/vehiculos/FotoPrivada";

type Vehiculo = Tables<"vehiculos_inventario">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

type Edicion = { cliente: string; telefono: string; abono: string; fecha: string; notas: string };

const desde = (v: Vehiculo): Edicion => ({
  cliente: v.separado_cliente ?? "",
  telefono: v.separado_telefono ?? "",
  abono: v.separado_abono !== null && v.separado_abono !== undefined ? String(v.separado_abono) : "",
  fecha: v.separado_fecha ?? "",
  notas: v.separado_notas ?? "",
});

export function SeparacionesVehiculos() {
  const [lista, setLista] = useState<Vehiculo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [datos, setDatos] = useState<Record<string, Edicion>>({});
  const [elegido, setElegido] = useState("");

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("vehiculos_inventario")
      .select("*")
      .in("estado", ["separado", "disponible"])
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("No se pudieron cargar los vehículos.");
    const todos = data ?? [];
    setLista(todos);
    setDatos((prev) => {
      const sig: Record<string, Edicion> = {};
      for (const v of todos) sig[v.id] = prev[v.id] ?? desde(v);
      return sig;
    });
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const separados = lista.filter((v) => v.estado === "separado");
  const disponibles = lista.filter((v) => v.estado === "disponible");
  const abonos = separados.reduce((t, v) => t + (v.separado_abono ?? 0), 0);
  const porCobrar = separados.reduce((t, v) => t + Math.max(0, v.precio - (v.separado_abono ?? 0)), 0);

  const cambiarCampo = (id: string, k: keyof Edicion, val: string) =>
    setDatos((d) => ({ ...d, [id]: { ...d[id], [k]: val } }));

  const separar = async () => {
    if (!elegido) return toast.error("Elige un vehículo del inventario.");
    const { error } = await supabase.from("vehiculos_inventario").update({ estado: "separado" }).eq("id", elegido);
    if (error) return toast.error("No se pudo separar el vehículo.");
    setElegido("");
    toast.success("Vehículo separado. Completa los datos del cliente.");
    cargar();
  };

  const guardar = async (v: Vehiculo) => {
    const d = datos[v.id];
    const abono = d.abono.trim() ? Number(d.abono) : null;
    if (abono !== null && (!Number.isFinite(abono) || abono < 0)) return toast.error("Escribe un abono válido.");
    const { error } = await supabase
      .from("vehiculos_inventario")
      .update({
        separado_cliente: d.cliente.trim() || null,
        separado_telefono: d.telefono.trim() || null,
        separado_abono: abono,
        separado_fecha: d.fecha || null,
        separado_notas: d.notas.trim() || null,
      })
      .eq("id", v.id);
    if (error) return toast.error("No se pudo guardar.");
    toast.success("Separación guardada.");
    cargar();
  };

  const liberar = async (v: Vehiculo) => {
    if (!window.confirm("¿Liberar este vehículo? Vuelve a quedar disponible y se borran los datos de la separación.")) return;
    const { error } = await supabase
      .from("vehiculos_inventario")
      .update({ estado: "disponible", separado_cliente: null, separado_telefono: null, separado_abono: null, separado_fecha: null, separado_notas: null })
      .eq("id", v.id);
    if (error) return toast.error("No se pudo liberar.");
    cargar();
  };

  const entregar = async (v: Vehiculo) => {
    if (!window.confirm("¿Marcar como vendido y entregado? Sale de las separaciones y queda como vendido en el inventario.")) return;
    const { error } = await supabase.from("vehiculos_inventario").update({ estado: "vendido" }).eq("id", v.id);
    if (error) return toast.error("No se pudo actualizar.");
    toast.success("Vehículo marcado como vendido.");
    cargar();
  };

  const fila = (k: string, x: string | number | null | undefined) =>
    x === null || x === undefined || x === "" ? null : (
      <div key={k} className="min-w-0">
        <span className="block text-[11px] text-muted-foreground">{k}</span>
        <span className="block break-words text-sm text-foreground">{x}</span>
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Tag className="h-7 w-7 text-primary" /> Separaciones de vehículos
        </h1>
        <p className="text-sm text-muted-foreground">
          Aquí aparece cada carro o moto que separas en el inventario, con todos sus datos, fotos y la información del cliente.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Separados</p><p className="text-lg font-medium text-foreground">{separados.length}</p></GlassPanel>
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Abonos recibidos</p><p className="truncate text-lg font-medium text-foreground">{dinero(abonos)}</p></GlassPanel>
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Por cobrar</p><p className="truncate text-lg font-medium text-foreground">{dinero(porCobrar)}</p></GlassPanel>
      </div>

      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Separar un vehículo del inventario</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select className={campo} value={elegido} onChange={(e) => setElegido(e.target.value)}>
            <option value="">{disponibles.length ? "Elige un vehículo disponible" : "No hay vehículos disponibles"}</option>
            {disponibles.map((v) => (
              <option key={v.id} value={v.id}>
                {[v.tipo === "moto" ? "Moto" : "Carro", v.marca, v.modelo, v.anio, v.placa].filter(Boolean).join(" ")}
              </option>
            ))}
          </select>
          <button onClick={separar} className="shrink-0 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Separar
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          También se separa desde el inventario cambiando su estado a “Separado”: aparece aquí automáticamente.
        </p>
      </GlassPanel>

      {cargando && <p className="text-sm text-muted-foreground">Cargando...</p>}
      {!cargando && separados.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay vehículos separados.</p>}

      <div className="grid gap-4 xl:grid-cols-2">
        {separados.map((v) => {
          const d = datos[v.id] ?? desde(v);
          const abono = Number(d.abono) || 0;
          const saldo = Math.max(0, v.precio - abono);
          const Icono = v.tipo === "moto" ? Bike : Car;
          return (
            <GlassPanel key={v.id} className="space-y-4 p-4">
              <div className="flex gap-3">
                {v.fotos?.[0] ? (
                  <FotoPrivada valor={v.fotos[0]} className="h-24 w-32 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-24 w-32 shrink-0 items-center justify-center rounded-lg bg-glass/40 text-muted-foreground">
                    <Icono className="h-8 w-8" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-wider text-primary">
                    {v.tipo === "moto" ? "Moto" : "Carro"} · {v.condicion === "nuevo" ? "Nuevo" : "Usado"}
                  </p>
                  <p className="break-words text-base font-medium text-foreground">{[v.marca, v.modelo, v.version].filter(Boolean).join(" ")}</p>
                  <p className="text-lg font-medium text-foreground">{dinero(v.precio)}</p>
                  {v.placa && <p className="text-xs text-muted-foreground">Placa {v.placa}</p>}
                </div>
              </div>

              {(v.fotos?.length ?? 0) > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {v.fotos.slice(1).map((u) => (
                    <FotoPrivada key={u} valor={u} className="h-14 w-20 shrink-0 rounded-md object-cover" />
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
                {[
                  fila("Año", v.anio),
                  fila("Kilometraje", v.kilometraje !== null ? `${v.kilometraje.toLocaleString("es-CO")} km` : null),
                  fila("Color", v.color),
                  fila("Combustible", v.combustible),
                  fila("Transmisión", v.transmision),
                  fila("Cilindraje", v.cilindraje),
                  fila("Carrocería", v.carroceria),
                  fila("Puertas", v.puertas),
                  fila("Tracción", v.traccion),
                  fila("Matriculado en", v.ciudad_matricula),
                  fila("Propietarios", v.num_propietarios),
                  fila("VIN", v.vin),
                  fila("N.º de motor", v.motor_numero),
                  fila("SOAT vence", v.soat_vence),
                  fila("Tecnomecánica vence", v.tecnomecanica_vence),
                ]}
              </div>
              {v.equipamiento && <p className="break-words text-xs text-muted-foreground"><b>Equipamiento:</b> {v.equipamiento}</p>}
              {v.observaciones && <p className="break-words text-xs text-muted-foreground">{v.observaciones}</p>}

              <div className="space-y-3 border-t border-glass-border pt-3">
                <h3 className="text-sm font-medium text-primary">Datos de la separación</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input className={campo} placeholder="Cliente" value={d.cliente} onChange={(e) => cambiarCampo(v.id, "cliente", e.target.value)} />
                  <input className={campo} placeholder="Teléfono" inputMode="tel" value={d.telefono} onChange={(e) => cambiarCampo(v.id, "telefono", e.target.value)} />
                  <input className={campo} placeholder="Abono recibido (COP)" inputMode="decimal" value={d.abono} onChange={(e) => cambiarCampo(v.id, "abono", e.target.value)} />
                  <label className="block space-y-1">
                    <span className="text-xs text-muted-foreground">Fecha de entrega</span>
                    <input className={campo} type="date" value={d.fecha} onChange={(e) => cambiarCampo(v.id, "fecha", e.target.value)} />
                  </label>
                </div>
                <textarea className={campo} rows={2} placeholder="Condiciones y notas" value={d.notas} onChange={(e) => cambiarCampo(v.id, "notas", e.target.value)} />
                <p className="text-sm text-foreground">Saldo por cobrar: <b>{dinero(saldo)}</b></p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => guardar(v)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
                    Guardar
                  </button>
                  <button onClick={() => entregar(v)} className="inline-flex items-center gap-1.5 rounded-lg border border-glass-border px-3 py-2 text-sm text-foreground hover:bg-glass/40">
                    <CheckCircle2 className="h-4 w-4" /> Entregado
                  </button>
                  <button onClick={() => liberar(v)} className="inline-flex items-center gap-1.5 rounded-lg border border-glass-border px-3 py-2 text-sm text-muted-foreground hover:bg-glass/40">
                    <Undo2 className="h-4 w-4" /> Liberar
                  </button>
                </div>
              </div>
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}
