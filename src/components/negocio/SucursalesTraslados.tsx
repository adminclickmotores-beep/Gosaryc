import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { fijarSucursalActual, leerSucursalActual } from "@/lib/sucursales";
import { imprimirReporte } from "@/lib/exportes";

type Sucursal = Tables<"negocio_sucursales">;
type Traslado = Tables<"negocio_traslados">;

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

/** Selector de sede para filtrar reportes (consolidado o una sola sucursal). */
export function SelectorSucursal({ alCambiar }: { alCambiar?: (id: string | null) => void }) {
  const [sedes, setSedes] = useState<Sucursal[]>([]);
  const [actual, setActual] = useState<string | null>(() => leerSucursalActual());

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("negocio_sucursales").select("*").eq("activa", true).order("nombre");
      setSedes(data ?? []);
    })();
  }, []);

  if (sedes.length === 0) return null;
  return (
    <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      Sede
      <select
        className="rounded-lg border border-glass-border bg-glass/40 px-3 py-2 text-base text-foreground"
        value={actual ?? ""}
        onChange={(e) => {
          const v = e.target.value || null;
          setActual(v);
          fijarSucursalActual(v);
          alCambiar?.(v);
          window.dispatchEvent(new Event("gosaryc:sucursal"));
        }}
      >
        <option value="">Consolidado (todas)</option>
        {sedes.map((s) => (
          <option key={s.id} value={s.id}>{s.nombre}</option>
        ))}
      </select>
    </label>
  );
}

/** Sucursales del negocio y traslados de mercancía con acta de envío/recepción. */
export function SucursalesTraslados() {
  const [sedes, setSedes] = useState<Sucursal[]>([]);
  const [traslados, setTraslados] = useState<Traslado[]>([]);
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [producto, setProducto] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    const [s, t] = await Promise.all([
      supabase.from("negocio_sucursales").select("*").order("nombre"),
      supabase.from("negocio_traslados").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setSedes(s.data ?? []);
    setTraslados(t.data ?? []);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crearSede = async () => {
    if (!nombre.trim()) return toast.error("Escribe el nombre de la sede.");
    setOcupado(true);
    const { error } = await supabase.from("negocio_sucursales").insert({
      nombre: nombre.trim(), direccion: direccion.trim() || null, telefono: telefono.trim() || null,
    });
    setOcupado(false);
    if (error) return toast.error("No se pudo crear la sede. Solo el dueño puede crearlas.");
    toast.success("Sede creada.");
    setNombre(""); setDireccion(""); setTelefono("");
    void cargar();
  };

  const crearTraslado = async () => {
    const cant = Number(cantidad.replace(",", "."));
    if (!producto.trim()) return toast.error("Escribe qué mercancía trasladas.");
    if (!Number.isFinite(cant) || cant <= 0) return toast.error("Escribe una cantidad válida.");
    if (!hasta.trim()) return toast.error("Escribe la sede destino.");
    setOcupado(true);
    const codigo = `TR-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const { error } = await supabase.from("negocio_traslados").insert({
      producto_nombre: producto.trim(),
      cantidad: cant,
      desde_sede: desde.trim() || "Bodega principal",
      hasta_sede: hasta.trim(),
      estado: "enviado",
      acta_codigo: codigo,
    });
    setOcupado(false);
    if (error) return toast.error("No se pudo registrar el traslado.");
    toast.success(`Traslado ${codigo} registrado.`);
    setProducto(""); setCantidad(""); setHasta("");
    void cargar();
  };

  const marcar = async (t: Traslado, estado: "recibido" | "cancelado") => {
    if (estado === "recibido" && !window.confirm(`¿Confirmas la recepción del acta ${t.acta_codigo}?`)) return;
    const { error } = await supabase.from("negocio_traslados").update({ estado }).eq("id", t.id);
    if (error) return toast.error("No se pudo actualizar.");
    void cargar();
  };

  const imprimirActa = (t: Traslado) => {
    imprimirReporte(
      `Acta de traslado ${t.acta_codigo}`,
      `De ${t.desde_sede} hacia ${t.hasta_sede} · Estado: ${t.estado}`,
      ["Dato", "Detalle"],
      [
        ["Acta", t.acta_codigo],
        ["Mercancía", t.producto_nombre],
        ["Cantidad", String(t.cantidad)],
        ["Envía", t.desde_sede],
        ["Recibe", t.hasta_sede],
        ["Fecha", new Date(t.created_at).toLocaleString("es-CO")],
        ["Estado", t.estado],
      ],
      ["Firma quien envía: ____________________", "Firma quien recibe: ____________________"],
    );
  };

  return (
    <div className="space-y-4">
      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Sucursales y puntos de venta</h2>
        <p className="text-sm text-muted-foreground">Crea cada sede una vez. Los reportes se pueden ver por sede o consolidados.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <input className={campo} placeholder="Nombre de la sede *" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <input className={campo} placeholder="Dirección" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
          <input className={campo} placeholder="Teléfono" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </div>
        <button onClick={crearSede} disabled={ocupado} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
          Agregar sede
        </button>
        {sedes.length > 0 && (
          <ul className="space-y-1 text-sm">
            {sedes.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-glass-border pb-1 last:border-0">
                <span className="text-foreground">{s.nombre}{s.direccion ? ` · ${s.direccion}` : ""}</span>
                <button
                  className="text-xs text-destructive"
                  onClick={async () => {
                    if (!window.confirm(`¿Desactivar ${s.nombre}? No se borra el historial.`)) return;
                    await supabase.from("negocio_sucursales").update({ activa: false }).eq("id", s.id);
                    void cargar();
                  }}
                >
                  Desactivar
                </button>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>

      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Traslado de mercancía entre sedes</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input className={campo} placeholder="Mercancía *" value={producto} onChange={(e) => setProducto(e.target.value)} />
          <input className={campo} placeholder="Cantidad *" inputMode="decimal" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          <input className={campo} placeholder="Sede que envía" value={desde} onChange={(e) => setDesde(e.target.value)} />
          <input className={campo} placeholder="Sede destino *" value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </div>
        <button onClick={crearTraslado} disabled={ocupado} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
          Registrar envío
        </button>
        {traslados.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-glass-border pb-2 text-sm last:border-0">
            <div className="min-w-0">
              <p className="break-words text-foreground">{t.acta_codigo} · {t.producto_nombre} × {t.cantidad}</p>
              <p className="text-xs text-muted-foreground">{t.desde_sede} → {t.hasta_sede} · {t.estado}</p>
            </div>
            <div className="flex gap-2 text-xs">
              <button className="text-primary" onClick={() => imprimirActa(t)}>Acta</button>
              {t.estado === "enviado" && <button className="text-primary" onClick={() => marcar(t, "recibido")}>Recibir</button>}
              {t.estado === "enviado" && <button className="text-destructive" onClick={() => marcar(t, "cancelado")}>Cancelar</button>}
            </div>
          </div>
        ))}
      </GlassPanel>
    </div>
  );
}
