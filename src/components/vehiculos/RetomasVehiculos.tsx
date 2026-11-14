import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Handshake, Pencil, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

type Retoma = Tables<"retomas_vehiculos">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const OPERACIONES = [
  { clave: "retoma", texto: "Retoma" },
  { clave: "compra", texto: "Compra" },
  { clave: "consignacion", texto: "Consignación" },
];

const RESULTADOS = [
  { clave: "en_evaluacion", texto: "En evaluación" },
  { clave: "retomado", texto: "Retomado" },
  { clave: "no_retomado", texto: "No se retomó" },
  { clave: "cliente_desistio", texto: "El cliente desistió" },
];

type Form = {
  operacion: string; tipo: string; marca: string; modelo: string; version: string; anio: string;
  placa: string; color: string; kilometraje: string; vendedor_nombre: string; vendedor_telefono: string;
  vendedor_documento: string; precio_pedido: string; precio_retoma: string; precio_venta: string;
  peritaje_fecha: string; peritaje_notas: string; motivo_resultado: string; observaciones: string;
};

const VACIO: Form = {
  operacion: "retoma", tipo: "carro", marca: "", modelo: "", version: "", anio: "", placa: "", color: "",
  kilometraje: "", vendedor_nombre: "", vendedor_telefono: "", vendedor_documento: "", precio_pedido: "",
  precio_retoma: "", precio_venta: "", peritaje_fecha: "", peritaje_notas: "", motivo_resultado: "", observaciones: "",
};

const num = (s: string): number | null => {
  if (!s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const txt = (s: string): string | null => (s.trim() ? s.trim() : null);
const s = (x: string | number | null | undefined): string => (x === null || x === undefined ? "" : String(x));

export function RetomasVehiculos() {
  const [lista, setLista] = useState<Retoma[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<Form>(VACIO);
  const [editando, setEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [fResultado, setFResultado] = useState("todos");

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("retomas_vehiculos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("No se pudo cargar la lista.");
    setLista(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const limpiar = () => {
    setForm(VACIO);
    setEditando(null);
  };

  const guardar = async () => {
    if (!form.marca.trim() || !form.modelo.trim()) return toast.error("Escribe la marca y el modelo.");
    const datos = {
      operacion: form.operacion, tipo: form.tipo, marca: form.marca.trim(), modelo: form.modelo.trim(),
      version: txt(form.version), anio: num(form.anio), placa: txt(form.placa)?.toUpperCase() ?? null,
      color: txt(form.color), kilometraje: num(form.kilometraje),
      vendedor_nombre: txt(form.vendedor_nombre), vendedor_telefono: txt(form.vendedor_telefono),
      vendedor_documento: txt(form.vendedor_documento),
      precio_pedido: num(form.precio_pedido), precio_retoma: num(form.precio_retoma), precio_venta: num(form.precio_venta),
      peritaje_fecha: form.peritaje_fecha || null, peritaje_notas: txt(form.peritaje_notas),
      motivo_resultado: txt(form.motivo_resultado), observaciones: txt(form.observaciones),
    };
    setGuardando(true);
    const { error } = editando
      ? await supabase.from("retomas_vehiculos").update(datos).eq("id", editando)
      : await supabase.from("retomas_vehiculos").insert(datos);
    setGuardando(false);
    if (error) return toast.error("No se pudo guardar el registro.");
    toast.success(editando ? "Registro actualizado." : "Registro guardado.");
    limpiar();
    cargar();
  };

  const editar = (r: Retoma) => {
    setForm({
      operacion: r.operacion, tipo: r.tipo, marca: r.marca, modelo: r.modelo, version: s(r.version), anio: s(r.anio),
      placa: s(r.placa), color: s(r.color), kilometraje: s(r.kilometraje), vendedor_nombre: s(r.vendedor_nombre),
      vendedor_telefono: s(r.vendedor_telefono), vendedor_documento: s(r.vendedor_documento),
      precio_pedido: s(r.precio_pedido), precio_retoma: s(r.precio_retoma), precio_venta: s(r.precio_venta),
      peritaje_fecha: s(r.peritaje_fecha), peritaje_notas: s(r.peritaje_notas),
      motivo_resultado: s(r.motivo_resultado), observaciones: s(r.observaciones),
    });
    setEditando(r.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cambiarResultado = async (r: Retoma, resultado: string) => {
    if (resultado === r.resultado) return;
    if (resultado === "retomado") return retomar(r);
    const { error } = await supabase.from("retomas_vehiculos").update({ resultado }).eq("id", r.id);
    if (error) return toast.error("No se pudo actualizar.");
    cargar();
  };

  // Al retomar, el vehículo pasa al inventario como disponible.
  const retomar = async (r: Retoma) => {
    if (r.vehiculo_id) {
      const { error } = await supabase.from("retomas_vehiculos").update({ resultado: "retomado" }).eq("id", r.id);
      if (error) return toast.error("No se pudo actualizar.");
      return cargar();
    }
    const precioVenta = r.precio_venta ?? r.precio_retoma ?? r.precio_pedido;
    if (precioVenta === null) {
      return toast.error("Antes de retomarlo escribe el precio de retoma o el precio de venta (editar).");
    }
    const nota = [
      r.operacion === "consignacion" ? "Recibido en consignación." : r.operacion === "compra" ? "Comprado." : "Recibido en retoma.",
      r.vendedor_nombre ? `Dueño anterior: ${r.vendedor_nombre}.` : null,
      r.peritaje_notas,
    ].filter(Boolean).join(" ");
    const { data, error } = await supabase
      .from("vehiculos_inventario")
      .insert({
        tipo: r.tipo, condicion: "usado", estado: "disponible", marca: r.marca, modelo: r.modelo,
        version: r.version, anio: r.anio, placa: r.placa, color: r.color, kilometraje: r.kilometraje,
        precio: precioVenta, precio_compra: r.operacion === "consignacion" ? null : r.precio_retoma,
        observaciones: nota || null, fotos: [],
      })
      .select("id")
      .single();
    if (error || !data) return toast.error("No se pudo pasar el vehículo al inventario.");
    const { error: e2 } = await supabase
      .from("retomas_vehiculos")
      .update({ resultado: "retomado", vehiculo_id: data.id })
      .eq("id", r.id);
    if (e2) return toast.error("El vehículo entró al inventario, pero no se pudo actualizar el registro.");
    toast.success("Vehículo retomado y agregado al inventario.");
    cargar();
  };

  const borrar = async (r: Retoma) => {
    if (!window.confirm(`¿Eliminar ${r.marca} ${r.modelo}?`)) return;
    const { error } = await supabase.from("retomas_vehiculos").delete().eq("id", r.id);
    if (error) return toast.error("No se pudo eliminar.");
    cargar();
  };

  const visibles = useMemo(
    () => (fResultado === "todos" ? lista : lista.filter((r) => r.resultado === fResultado)),
    [lista, fResultado],
  );
  const enEvaluacion = lista.filter((r) => r.resultado === "en_evaluacion").length;
  const retomados = lista.filter((r) => r.resultado === "retomado").length;

  const chip = (activo: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm ${activo ? "border-primary bg-primary text-primary-foreground" : "border-glass-border text-muted-foreground"}`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Handshake className="h-7 w-7 text-primary" /> Retomas, compras y consignación
        </h1>
        <p className="text-sm text-muted-foreground">
          Registra el usado que llega (carro o moto), el precio de retoma tras el peritaje y qué pasó con él. Si lo retomas, entra solo al inventario.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Registros</p><p className="text-lg font-medium text-foreground">{lista.length}</p></GlassPanel>
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">En evaluación</p><p className="text-lg font-medium text-foreground">{enEvaluacion}</p></GlassPanel>
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Retomados</p><p className="text-lg font-medium text-foreground">{retomados}</p></GlassPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <GlassPanel className="h-fit space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-foreground">{editando ? "Editar registro" : "Nuevo vehículo usado"}</h2>
            {editando && <button onClick={limpiar} className="text-xs text-primary">Cancelar edición</button>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Operación</span>
              <select className={campo} value={form.operacion} onChange={(e) => set("operacion", e.target.value)}>
                {OPERACIONES.map((o) => <option key={o.clave} value={o.clave}>{o.texto}</option>)}
              </select></label>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Tipo</span>
              <select className={campo} value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
                <option value="carro">Carro</option><option value="moto">Moto</option>
              </select></label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className={campo} placeholder="Marca *" value={form.marca} onChange={(e) => set("marca", e.target.value)} />
            <input className={campo} placeholder="Modelo / línea *" value={form.modelo} onChange={(e) => set("modelo", e.target.value)} />
            <input className={campo} placeholder="Versión" value={form.version} onChange={(e) => set("version", e.target.value)} />
            <input className={campo} placeholder="Año" inputMode="numeric" value={form.anio} onChange={(e) => set("anio", e.target.value)} />
            <input className={campo} placeholder="Placa" value={form.placa} onChange={(e) => set("placa", e.target.value)} />
            <input className={campo} placeholder="Color" value={form.color} onChange={(e) => set("color", e.target.value)} />
            <input className={campo} placeholder="Kilometraje" inputMode="numeric" value={form.kilometraje} onChange={(e) => set("kilometraje", e.target.value)} />
          </div>

          <p className="pt-1 text-xs font-medium text-muted-foreground">Dueño actual</p>
          <div className="grid grid-cols-2 gap-3">
            <input className={campo} placeholder="Nombre" value={form.vendedor_nombre} onChange={(e) => set("vendedor_nombre", e.target.value)} />
            <input className={campo} placeholder="Teléfono" inputMode="tel" value={form.vendedor_telefono} onChange={(e) => set("vendedor_telefono", e.target.value)} />
            <input className={campo} placeholder="Cédula / NIT" value={form.vendedor_documento} onChange={(e) => set("vendedor_documento", e.target.value)} />
          </div>

          <p className="pt-1 text-xs font-medium text-muted-foreground">Peritaje y precios</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Fecha del peritaje</span>
              <input className={campo} type="date" value={form.peritaje_fecha} onChange={(e) => set("peritaje_fecha", e.target.value)} /></label>
            <input className={`${campo} self-end`} placeholder="Precio que pide el dueño" inputMode="decimal" value={form.precio_pedido} onChange={(e) => set("precio_pedido", e.target.value)} />
            <input className={campo} placeholder={form.operacion === "consignacion" ? "Precio acordado" : "Precio de retoma (tras peritaje)"} inputMode="decimal" value={form.precio_retoma} onChange={(e) => set("precio_retoma", e.target.value)} />
            <input className={campo} placeholder="Precio de venta previsto" inputMode="decimal" value={form.precio_venta} onChange={(e) => set("precio_venta", e.target.value)} />
          </div>
          <textarea className={campo} rows={3} placeholder="Resultado del peritaje (estado, daños, reparaciones necesarias…)" value={form.peritaje_notas} onChange={(e) => set("peritaje_notas", e.target.value)} />
          <textarea className={campo} rows={2} placeholder="Qué pasó con el vehículo (motivo si no se retomó…)" value={form.motivo_resultado} onChange={(e) => set("motivo_resultado", e.target.value)} />
          <textarea className={campo} rows={2} placeholder="Observaciones" value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} />

          <button onClick={guardar} disabled={guardando} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Guardar registro"}
          </button>
        </GlassPanel>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-2">
            {[{ clave: "todos", texto: "Todos" }, ...RESULTADOS].map((x) => (
              <button key={x.clave} onClick={() => setFResultado(x.clave)} className={chip(fResultado === x.clave)}>{x.texto}</button>
            ))}
          </div>

          {cargando && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {!cargando && visibles.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay registros.</p>}

          {visibles.map((r) => (
            <GlassPanel key={r.id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-medium text-foreground">{r.marca} {r.modelo} {r.version ?? ""} {r.anio ?? ""}</p>
                  <p className="break-words text-xs text-muted-foreground">
                    {OPERACIONES.find((o) => o.clave === r.operacion)?.texto ?? r.operacion} · {r.tipo === "moto" ? "Moto" : "Carro"}
                    {r.placa ? ` · ${r.placa}` : ""}{r.kilometraje !== null ? ` · ${r.kilometraje.toLocaleString("es-CO")} km` : ""}
                  </p>
                  {(r.vendedor_nombre || r.vendedor_telefono) && (
                    <p className="break-words text-xs text-muted-foreground">{[r.vendedor_nombre, r.vendedor_telefono].filter(Boolean).join(" · ")}</p>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {r.precio_pedido !== null && <span className="text-muted-foreground">Pide: <span className="text-foreground">{dinero(r.precio_pedido)}</span></span>}
                {r.precio_retoma !== null && <span className="text-muted-foreground">Retoma: <span className="font-medium text-foreground">{dinero(r.precio_retoma)}</span></span>}
                {r.precio_venta !== null && <span className="text-muted-foreground">Venta: <span className="text-foreground">{dinero(r.precio_venta)}</span></span>}
              </div>
              {r.peritaje_notas && <p className="break-words text-xs text-muted-foreground">Peritaje{r.peritaje_fecha ? ` (${r.peritaje_fecha})` : ""}: {r.peritaje_notas}</p>}
              {r.motivo_resultado && <p className="break-words text-xs text-muted-foreground">{r.motivo_resultado}</p>}
              {r.resultado === "retomado" && r.vehiculo_id && (
                <p className="inline-flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="h-3 w-3" /> Ya está en el inventario</p>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <select className="rounded-lg border border-glass-border bg-glass/40 px-2 py-1 text-base text-foreground" value={r.resultado} onChange={(e) => cambiarResultado(r, e.target.value)}>
                  {RESULTADOS.map((x) => <option key={x.clave} value={x.clave}>{x.texto}</option>)}
                </select>
                {r.resultado === "en_evaluacion" && (
                  <>
                    <button onClick={() => retomar(r)} className="inline-flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="h-3 w-3" /> Retomar</button>
                    <button onClick={() => cambiarResultado(r, "no_retomado")} className="inline-flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="h-3 w-3" /> No retomar</button>
                  </>
                )}
                <button onClick={() => editar(r)} className="inline-flex items-center gap-1 text-xs text-primary"><Pencil className="h-3 w-3" /> Editar</button>
                <button onClick={() => borrar(r)} className="inline-flex items-center gap-1 text-xs text-destructive"><Trash2 className="h-3 w-3" /> Eliminar</button>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </div>
  );
}
