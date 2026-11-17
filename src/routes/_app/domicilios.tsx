import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Bike, MapPin, Phone, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { VigilanteCocina } from "@/components/restaurante/VigilanteCocina";

export const Route = createFileRoute("/_app/domicilios")({
  head: () => ({ meta: [{ title: "Domicilios y clientes" }] }),
  component: DomiciliosPage,
});

type Pedido = Tables<"restaurante_pedidos">;
type Cliente = Tables<"restaurante_clientes">;
type Repartidor = Tables<"restaurante_repartidores">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const ETIQUETA: Record<string, string> = {
  nuevo: "Nuevo",
  preparando: "En cocina",
  listo: "Listo para salir",
  en_camino: "En camino",
};

function DomiciliosPage() {
  const [vista, setVista] = useState<"domicilios" | "clientes" | "repartidores">("domicilios");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [repartidores, setRepartidores] = useState<Repartidor[]>([]);

  const cargar = useCallback(async () => {
    const [p, c, r] = await Promise.all([
      supabase
        .from("restaurante_pedidos")
        .select("*")
        .eq("modalidad", "domicilio")
        .in("estado", ["nuevo", "preparando", "listo", "en_camino"])
        .order("created_at"),
      supabase.from("restaurante_clientes").select("*").order("ultimo_pedido", { ascending: false, nullsFirst: false }),
      supabase.from("restaurante_repartidores").select("*").order("nombre"),
    ]);
    setPedidos(p.data ?? []);
    setClientes(c.data ?? []);
    setRepartidores(r.data ?? []);
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 15000);
    return () => clearInterval(t);
  }, [cargar]);

  const actualizar = async (id: string, cambios: Partial<Pedido>) => {
    const { error } = await supabase.from("restaurante_pedidos").update(cambios).eq("id", id);
    if (error) return toast.error("No se pudo actualizar el domicilio.");
    cargar();
  };

  return (
    <div className="space-y-6">
      <VigilanteCocina />
      <div>
        <h1 className="font-display text-3xl text-foreground">Domicilios y clientes</h1>
        <p className="text-sm text-muted-foreground">
          {pedidos.length} domicilios activos · {clientes.length} clientes registrados
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["domicilios", "clientes", "repartidores"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVista(v)}
            className={`rounded-full px-5 py-2 text-sm capitalize ${vista === v ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`}
          >
            {v}
          </button>
        ))}
      </div>

      {vista === "domicilios" && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pedidos.length === 0 && <p className="text-sm text-muted-foreground">No hay domicilios activos.</p>}
          {pedidos.map((p) => (
            <GlassPanel key={p.id} className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-sm text-foreground">#{p.id.slice(0, 6).toUpperCase()}</span>
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs text-foreground">{ETIQUETA[p.estado] ?? p.estado}</span>
              </div>
              <div className="space-y-1 text-sm">
                <p className="break-words text-foreground">{p.cliente_nombre}</p>
                <p className="flex items-center gap-1.5 text-muted-foreground"><Phone className="h-3.5 w-3.5" />{p.cliente_telefono}</p>
                <p className="flex items-start gap-1.5 break-words text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{p.direccion}</p>
                {p.barrio && <p className="break-words text-xs text-muted-foreground">Barrio: {p.barrio}</p>}
                {p.notas && <p className="break-words text-xs text-muted-foreground">Indicaciones: {p.notas}</p>}
              </div>
              <p className="text-sm font-medium text-foreground">{dinero(p.total)}</p>
              <select
                className={campo}
                value={p.repartidor_id ?? ""}
                onChange={(e) => actualizar(p.id, { repartidor_id: e.target.value || null })}
              >
                <option value="">Sin repartidor</option>
                {repartidores.filter((r) => r.activo || r.id === p.repartidor_id).map((r) => (
                  <option key={r.id} value={r.id}>
                    {[r.nombre, r.vehiculo && r.vehiculo.replace("_", " "), r.placa].filter(Boolean).join(" · ")}
                  </option>
                ))}
              </select>
              <div className="flex gap-2">
                {(p.estado === "listo" || p.estado === "preparando" || p.estado === "nuevo") && (
                  <button
                    disabled={!p.repartidor_id || p.estado !== "listo"}
                    onClick={() => actualizar(p.id, { estado: "en_camino" })}
                    className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
                  >
                    <Bike className="mr-1 inline h-3.5 w-3.5" />
                    {p.estado === "listo" ? (p.repartidor_id ? "Sale a domicilio" : "Asigna repartidor") : "Esperando cocina"}
                  </button>
                )}
                {p.estado === "en_camino" && (
                  <button onClick={() => actualizar(p.id, { estado: "entregado" })} className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90">
                    Marcar entregado
                  </button>
                )}
              </div>
            </GlassPanel>
          ))}
        </div>
      )}

      {vista === "clientes" && <ListaClientes clientes={clientes} />}
      {vista === "repartidores" && <Repartidores repartidores={repartidores} recargar={cargar} />}
    </div>
  );
}

function ListaClientes({ clientes }: { clientes: Cliente[] }) {
  const [q, setQ] = useState("");
  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? clientes.filter((c) => c.nombre.toLowerCase().includes(t) || c.telefono.includes(t)) : clientes;
  }, [clientes, q]);
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
        <input className={`${campo} pl-9`} placeholder="Buscar por nombre o teléfono" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {filtrados.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay clientes. Se registran solos con cada pedido.</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {filtrados.map((c) => (
          <GlassPanel key={c.id} className="space-y-1 p-4">
            <p className="break-words font-medium text-foreground">{c.nombre}</p>
            <p className="text-sm text-muted-foreground">{c.telefono}</p>
            {c.direccion && <p className="break-words text-xs text-muted-foreground">{c.direccion}</p>}
            <p className="pt-1 text-xs text-muted-foreground">
              {c.total_pedidos} pedidos · {dinero(c.total_gastado)}
              {c.ultimo_pedido && ` · último ${new Date(c.ultimo_pedido).toLocaleDateString("es-CO")}`}
            </p>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

function Repartidores({ repartidores, recargar }: { repartidores: Repartidor[]; recargar: () => void }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [documento, setDocumento] = useState("");
  const [vehiculo, setVehiculo] = useState("moto");
  const [placa, setPlaca] = useState("");

  const agregar = async () => {
    if (!nombre.trim()) return toast.error("Escribe el nombre del repartidor.");
    const { error } = await supabase
      .from("restaurante_repartidores")
      .insert({
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        documento: documento.trim() || null,
        vehiculo,
        placa: placa.trim().toUpperCase() || null,
      });
    if (error) return toast.error("No se pudo guardar.");
    setNombre("");
    setTelefono("");
    setDocumento("");
    setVehiculo("moto");
    setPlaca("");
    recargar();
  };

  const alternar = async (r: Repartidor) => {
    await supabase.from("restaurante_repartidores").update({ activo: !r.activo }).eq("id", r.id);
    recargar();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Nuevo repartidor</h2>
        <input className={campo} placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        <input className={campo} placeholder="Teléfono" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        <input className={campo} placeholder="Documento de identidad (opcional)" value={documento} onChange={(e) => setDocumento(e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <select className={campo} value={vehiculo} onChange={(e) => setVehiculo(e.target.value)} aria-label="Tipo de vehículo">
            <option value="moto">Moto</option>
            <option value="bicicleta">Bicicleta</option>
            <option value="carro">Carro</option>
            <option value="a_pie">A pie</option>
          </select>
          <input className={campo} placeholder="Placa (si tiene vehículo)" value={placa} onChange={(e) => setPlaca(e.target.value)} />
        </div>
        <button onClick={agregar} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
          Agregar repartidor
        </button>
      </GlassPanel>
      <div className="space-y-2">
        {repartidores.length === 0 && <p className="text-sm text-muted-foreground">Agrega tu primer repartidor.</p>}
        {repartidores.map((r) => (
          <GlassPanel key={r.id} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-medium ${r.activo ? "text-foreground" : "text-muted-foreground line-through"}`}>{r.nombre}</p>
              {r.telefono && <p className="text-xs text-muted-foreground">{r.telefono}</p>}
              {(r.vehiculo || r.placa || r.documento) && (
                <p className="break-words text-xs text-muted-foreground">
                  {[r.documento && `Doc. ${r.documento}`, r.vehiculo && r.vehiculo.replace("_", " "), r.placa].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
            <button onClick={() => alternar(r)} className="shrink-0 rounded-full border border-glass-border px-3 py-1.5 text-xs text-foreground">
              {r.activo ? "Desactivar" : "Activar"}
            </button>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
