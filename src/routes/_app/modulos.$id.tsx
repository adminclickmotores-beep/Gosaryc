import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { buscarModulo } from "@/lib/modulos-negocio";
import { configModulo } from "@/lib/modulos-config";
import { InventarioVehiculos } from "@/components/vehiculos/InventarioVehiculos";
import { SeparacionesVehiculos } from "@/components/vehiculos/SeparacionesVehiculos";
import { SolicitudesCredito } from "@/components/vehiculos/SolicitudesCredito";

export const Route = createFileRoute("/_app/modulos/$id")({
  head: () => ({ meta: [{ title: "Módulo del negocio" }] }),
  component: ModuloPage,
});

type Registro = Tables<"modulo_registros">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

function ModuloPage() {
  const { id } = Route.useParams();
  if (id === "vehiculos") return <InventarioVehiculos />;
  if (id === "creditos_veh") return <SolicitudesCredito />;
  if (id === "separaciones_veh") return <SeparacionesVehiculos />;
  return <ModuloGenerico id={id} />;
}

function ModuloGenerico({ id }: { id: string }) {
  const modulo = buscarModulo(id);
  const cfg = configModulo(id);
  const [lista, setLista] = useState<Registro[]>([]);
  const [filtro, setFiltro] = useState("todos");
  const [titulo, setTitulo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [contacto, setContacto] = useState("");
  const [telefono, setTelefono] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("modulo_registros")
      .select("*")
      .eq("modulo", id)
      .order("created_at", { ascending: false })
      .limit(300);
    setLista(data ?? []);
  }, [id]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregar = async () => {
    const valor = monto.trim() ? Number(monto) : 0;
    if (!titulo.trim() || !Number.isFinite(valor) || valor < 0) return toast.error("Escribe un título y un valor válido.");
    if (cfg.exigeFecha && !fecha) return toast.error(`Indica la fecha: ${cfg.etiquetaFecha.toLowerCase()}.`);
    const { error } = await supabase.from("modulo_registros").insert({
      modulo: id,
      estado: cfg.estados[0].clave,
      titulo: titulo.trim(),
      detalle: detalle.trim() || null,
      contacto: contacto.trim() || null,
      telefono: telefono.trim() || null,
      monto: valor,
      fecha: fecha || null,
    });
    if (error) return toast.error("No se pudo guardar el registro.");
    setTitulo("");
    setDetalle("");
    setContacto("");
    setTelefono("");
    setMonto("");
    setFecha("");
    cargar();
  };

  const cambiarEstado = async (r: Registro, estado: string) => {
    const { error } = await supabase.from("modulo_registros").update({ estado }).eq("id", r.id);
    if (error) return toast.error("No se pudo actualizar.");
    cargar();
  };

  const borrar = async (r: Registro) => {
    const { error } = await supabase.from("modulo_registros").delete().eq("id", r.id);
    if (error) return toast.error("No se pudo eliminar.");
    cargar();
  };

  if (!modulo) {
    return (
      <GlassPanel className="space-y-3 p-6">
        <p className="text-foreground">Este módulo no existe.</p>
        <Link to="/restaurante" className="text-sm text-primary">Volver al panel</Link>
      </GlassPanel>
    );
  }

  const visibles = filtro === "todos" ? lista : lista.filter((r) => r.estado === filtro);
  const pendiente = lista.filter((r) => !cfg.cerrados.includes(r.estado)).reduce((s, r) => s + r.monto, 0);
  const total = lista.reduce((s, r) => s + r.monto, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <modulo.Icon className="h-7 w-7 text-primary" /> {modulo.titulo}
        </h1>
        <p className="text-sm text-muted-foreground">{modulo.descripcion}</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <GlassPanel className="p-4">
          <p className="text-xs text-muted-foreground">Registros</p>
          <p className="text-lg font-medium text-foreground">{lista.length}</p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-xs text-muted-foreground">{cfg.resumen}</p>
          <p className="truncate text-lg font-medium text-foreground">{dinero(pendiente)}</p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="truncate text-lg font-medium text-foreground">{dinero(total)}</p>
        </GlassPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <GlassPanel className="h-fit space-y-3 p-5">
          <h2 className="font-medium text-foreground">Nuevo registro</h2>
          <input className={campo} placeholder={cfg.placeholderTitulo} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <textarea className={campo} rows={2} placeholder={cfg.placeholderDetalle} value={detalle} onChange={(e) => setDetalle(e.target.value)} />
          <input className={campo} placeholder={cfg.etiquetaContacto} value={contacto} onChange={(e) => setContacto(e.target.value)} />
          <input className={campo} placeholder="Teléfono" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          <input className={campo} placeholder={cfg.etiquetaMonto} inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} />
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">{cfg.etiquetaFecha}{cfg.exigeFecha ? " *" : ""}</span>
            <input className={campo} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
          <button onClick={agregar} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Guardar registro
          </button>
        </GlassPanel>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-2 text-sm">
            {[{ clave: "todos", texto: "Todos" }, ...cfg.estados].map((e) => (
              <button
                key={e.clave}
                onClick={() => setFiltro(e.clave)}
                className={`rounded-full px-4 py-1.5 ${filtro === e.clave ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`}
              >
                {e.texto}
              </button>
            ))}
          </div>
          {visibles.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay registros.</p>}
          {visibles.map((r) => (
            <GlassPanel key={r.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 break-words text-sm font-medium text-foreground">{r.titulo}</p>
                <button onClick={() => borrar(r)} aria-label="Eliminar" className="shrink-0 text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              {r.detalle && <p className="break-words text-xs text-muted-foreground">{r.detalle}</p>}
              <p className="break-words text-xs text-muted-foreground">
                {[r.contacto, r.telefono, r.fecha].filter(Boolean).join(" · ")}
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-foreground">{dinero(r.monto)}</span>
                <select
                  className="rounded-lg border border-glass-border bg-glass/40 px-2 py-1.5 text-base text-foreground"
                  value={r.estado}
                  onChange={(e) => cambiarEstado(r, e.target.value)}
                >
                  {cfg.estados.map((e) => (
                    <option key={e.clave} value={e.clave}>{e.texto}</option>
                  ))}
                </select>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </div>
  );
}
