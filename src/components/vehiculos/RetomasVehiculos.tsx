import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, FileText, Handshake, Pencil, ShieldCheck, Trash2, Upload, X, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { abrirArchivoPrivado } from "@/lib/archivo-privado";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { usePermisosVehiculos } from "@/hooks/use-permisos-vehiculos";

// La lista nunca pide las columnas de precio: los valores económicos viven en tablas aparte con permiso propio.
type Retoma = Omit<Tables<"retomas_vehiculos">, "precio_pedido" | "precio_retoma" | "precio_venta">;
type Eco = Tables<"retomas_economico">;
type Inspeccion = Tables<"retomas_inspecciones">;
type Avaluo = Tables<"retomas_avaluos">;
type Historial = Tables<"retomas_historial">;

const COLUMNAS =
  "id, owner_id, operacion, tipo, marca, modelo, version, anio, placa, color, kilometraje, vendedor_nombre, vendedor_telefono, vendedor_documento, peritaje_fecha, peritaje_notas, peritaje_archivos, resultado, motivo_resultado, vehiculo_id, observaciones, created_at, creado_por, estado_aprobacion, aprobado_por, aprobado_en, aprobacion_notas";

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

const APROBACION: Record<string, string> = {
  pendiente: "Pendiente de aprobación",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

type Form = {
  operacion: string; tipo: string; marca: string; modelo: string; version: string; anio: string;
  placa: string; color: string; kilometraje: string; vendedor_nombre: string; vendedor_telefono: string;
  vendedor_documento: string; peritaje_fecha: string; peritaje_notas: string; motivo_resultado: string; observaciones: string;
};
type FormEco = { precio_pedido: string; precio_retoma: string; precio_venta: string; costos_estimados: string };

const VACIO: Form = {
  operacion: "retoma", tipo: "carro", marca: "", modelo: "", version: "", anio: "", placa: "", color: "",
  kilometraje: "", vendedor_nombre: "", vendedor_telefono: "", vendedor_documento: "", peritaje_fecha: "",
  peritaje_notas: "", motivo_resultado: "", observaciones: "",
};
const ECO_VACIO: FormEco = { precio_pedido: "", precio_retoma: "", precio_venta: "", costos_estimados: "" };

const num = (s: string): number | null => {
  if (!s.trim()) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const txt = (s: string): string | null => (s.trim() ? s.trim() : null);
const s = (x: string | number | null | undefined): string => (x === null || x === undefined ? "" : String(x));
const mensaje = (e: { message?: string } | null, defecto: string): string =>
  e?.message && !/row-level security|violates|permission/i.test(e.message) ? e.message : defecto;

export function RetomasVehiculos() {
  const perm = usePermisosVehiculos();
  const [lista, setLista] = useState<Retoma[]>([]);
  const [economico, setEconomico] = useState<Record<string, Eco>>({});
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<Form>(VACIO);
  const [formEco, setFormEco] = useState<FormEco>(ECO_VACIO);
  const [editando, setEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [fResultado, setFResultado] = useState("todos");
  const [subiendoId, setSubiendoId] = useState<string | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);

  const puedeInspeccionar = perm.retInspeccionar || perm.retAprobar;
  const verAvaluos = perm.retAvaluo || perm.retEconomico;

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("retomas_vehiculos")
      .select(COLUMNAS)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("No se pudo cargar la lista.");
    setLista((data ?? []) as unknown as Retoma[]);
    if (perm.retEconomico) {
      const { data: eco } = await supabase.from("retomas_economico").select("*");
      const mapa: Record<string, Eco> = {};
      for (const e of eco ?? []) mapa[e.retoma_id] = e;
      setEconomico(mapa);
    } else {
      setEconomico({});
    }
    setCargando(false);
  }, [perm.retEconomico]);

  useEffect(() => {
    if (perm.cargando) return;
    cargar();
  }, [cargar, perm.cargando]);

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setE = (k: keyof FormEco, v: string) => setFormEco((f) => ({ ...f, [k]: v }));

  const limpiar = () => {
    setForm(VACIO);
    setFormEco(ECO_VACIO);
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
      motivo_resultado: txt(form.motivo_resultado), observaciones: txt(form.observaciones),
      // El resultado del peritaje solo lo escribe quien inspecciona.
      ...(puedeInspeccionar ? { peritaje_fecha: form.peritaje_fecha || null, peritaje_notas: txt(form.peritaje_notas) } : {}),
    };
    setGuardando(true);
    let id = editando;
    if (editando) {
      const { error } = await supabase.from("retomas_vehiculos").update(datos).eq("id", editando);
      if (error) {
        setGuardando(false);
        return toast.error(mensaje(error, "No se pudo guardar el registro."));
      }
    } else {
      const { data, error } = await supabase.from("retomas_vehiculos").insert(datos).select("id").single();
      if (error || !data) {
        setGuardando(false);
        return toast.error(mensaje(error, "No se pudo guardar el registro."));
      }
      id = data.id;
    }
    if (perm.retEconomico && id) {
      const valores = {
        precio_pedido: num(formEco.precio_pedido), precio_retoma: num(formEco.precio_retoma),
        precio_venta: num(formEco.precio_venta), costos_estimados: num(formEco.costos_estimados),
      };
      const hayValores = Object.values(valores).some((v) => v !== null);
      let errorEco: { message?: string } | null = null;
      if (economico[id]) {
        ({ error: errorEco } = await supabase.from("retomas_economico").update(valores).eq("retoma_id", id));
      } else if (hayValores) {
        ({ error: errorEco } = await supabase.from("retomas_economico").insert({ retoma_id: id, ...valores }));
      }
      if (errorEco) toast.error(mensaje(errorEco, "El registro se guardó, pero no se pudieron guardar los valores económicos."));
    }
    setGuardando(false);
    toast.success(editando ? "Registro actualizado." : "Solicitud registrada.");
    limpiar();
    cargar();
  };

  const editar = (r: Retoma) => {
    setForm({
      operacion: r.operacion, tipo: r.tipo, marca: r.marca, modelo: r.modelo, version: s(r.version), anio: s(r.anio),
      placa: s(r.placa), color: s(r.color), kilometraje: s(r.kilometraje), vendedor_nombre: s(r.vendedor_nombre),
      vendedor_telefono: s(r.vendedor_telefono), vendedor_documento: s(r.vendedor_documento),
      peritaje_fecha: s(r.peritaje_fecha), peritaje_notas: s(r.peritaje_notas),
      motivo_resultado: s(r.motivo_resultado), observaciones: s(r.observaciones),
    });
    const e = economico[r.id];
    setFormEco(e
      ? { precio_pedido: s(e.precio_pedido), precio_retoma: s(e.precio_retoma), precio_venta: s(e.precio_venta), costos_estimados: s(e.costos_estimados) }
      : ECO_VACIO);
    setEditando(r.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cambiarResultado = async (r: Retoma, resultado: string) => {
    if (resultado === r.resultado) return;
    if (resultado === "retomado") return toast.error("Para retomar, primero aprueba la solicitud y luego pásala al inventario.");
    const { error } = await supabase.from("retomas_vehiculos").update({ resultado }).eq("id", r.id);
    if (error) return toast.error(mensaje(error, "No se pudo actualizar."));
    cargar();
  };

  const decidir = async (r: Retoma, decision: "aprobada" | "rechazada") => {
    const notas = window.prompt(decision === "aprobada" ? "Notas de la aprobación (opcional):" : "Motivo del rechazo:");
    if (notas === null) return;
    const { error } = await supabase.rpc("retoma_decidir", { p_id: r.id, p_decision: decision, p_notas: notas });
    if (error) return toast.error(mensaje(error, "No se pudo registrar la decisión."));
    toast.success(decision === "aprobada" ? "Retoma aprobada y registrada en el historial." : "Retoma rechazada.");
    cargar();
  };

  // Al retomar, el vehículo pasa al inventario como disponible (el precio de adquisición va a la tabla protegida de costos).
  const pasarAInventario = async (r: Retoma) => {
    const { error } = await supabase.rpc("retoma_a_inventario", { p_id: r.id });
    if (error) return toast.error(mensaje(error, "No se pudo pasar el vehículo al inventario."));
    toast.success("Vehículo retomado y agregado al inventario.");
    cargar();
  };

  const subirPeritaje = async (r: Retoma, archivos: FileList | null) => {
    if (!archivos || archivos.length === 0) return;
    setSubiendoId(r.id);
    const { data: negocioId, error: errId } = await supabase.rpc("mi_negocio_id");
    if (errId || !negocioId) {
      setSubiendoId(null);
      return toast.error("No se pudo identificar tu negocio.");
    }
    const nuevas: string[] = [];
    for (const archivo of Array.from(archivos)) {
      if (!(archivo.type.startsWith("image/") || archivo.type === "application/pdf")) { toast.error("Sube solo imágenes o PDF."); continue; }
      if (archivo.size > 10 * 1024 * 1024) { toast.error(`${archivo.name} pesa más de 10 MB.`); continue; }
      const ext = (archivo.name.split(".").pop() ?? "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
      const ruta = `${negocioId}/peritaje-${r.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("creditos_docs").upload(ruta, archivo);
      if (error) { toast.error(`No se pudo subir ${archivo.name}.`); continue; }
      nuevas.push(ruta);
    }
    if (nuevas.length) {
      const { error } = await supabase
        .from("retomas_vehiculos")
        .update({ peritaje_archivos: [...(r.peritaje_archivos ?? []), ...nuevas] })
        .eq("id", r.id);
      if (error) {
        await supabase.storage.from("creditos_docs").remove(nuevas);
        toast.error("No se pudo guardar el archivo.");
      } else {
        toast.success("Archivo guardado en la nube.");
      }
    }
    setSubiendoId(null);
    cargar();
  };

  const abrirPeritaje = async (ruta: string) => {
    if (!(await abrirArchivoPrivado("creditos_docs", ruta))) toast.error("No se pudo abrir el archivo.");
  };

  const quitarPeritaje = async (r: Retoma, ruta: string) => {
    if (!window.confirm("¿Quitar este archivo?")) return;
    const { error } = await supabase
      .from("retomas_vehiculos")
      .update({ peritaje_archivos: (r.peritaje_archivos ?? []).filter((x) => x !== ruta) })
      .eq("id", r.id);
    if (error) return toast.error("No se pudo quitar.");
    await supabase.storage.from("creditos_docs").remove([ruta]);
    cargar();
  };

  const borrar = async (r: Retoma) => {
    if (!window.confirm(`¿Eliminar ${r.marca} ${r.modelo}?`)) return;
    const { error } = await supabase.from("retomas_vehiculos").delete().eq("id", r.id);
    if (error) return toast.error(mensaje(error, "No se pudo eliminar."));
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

  if (!perm.cargando && !perm.retCrear && !perm.retVerPropias && !perm.retVerTodas) {
    return (
      <GlassPanel className="p-6">
        <p className="text-sm text-muted-foreground">No tienes permiso para usar Retomas. Pídele al administrador que te lo active en Ajustes &gt; Equipo.</p>
      </GlassPanel>
    );
  }

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
          Registra el usado que llega (carro o moto), súbele fotos y documentos y sigue el estado de la solicitud.
          {perm.retEconomico ? " Tú puedes ver y modificar los valores económicos." : " Los valores económicos los gestiona el administrador."}
          {!perm.retVerTodas && " Aquí ves solo las solicitudes que tú creaste."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Registros</p><p className="text-lg font-medium text-foreground">{lista.length}</p></GlassPanel>
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">En evaluación</p><p className="text-lg font-medium text-foreground">{enEvaluacion}</p></GlassPanel>
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Retomados</p><p className="text-lg font-medium text-foreground">{retomados}</p></GlassPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {(perm.retCrear || editando) && (
          <GlassPanel className="h-fit space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-foreground">{editando ? "Editar registro" : "Nueva solicitud de retoma"}</h2>
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

            {puedeInspeccionar && (
              <>
                <p className="pt-1 text-xs font-medium text-muted-foreground">Peritaje</p>
                <label className="space-y-1"><span className="text-xs text-muted-foreground">Fecha del peritaje</span>
                  <input className={campo} type="date" value={form.peritaje_fecha} onChange={(e) => set("peritaje_fecha", e.target.value)} /></label>
                <textarea className={campo} rows={3} placeholder="Resultado del peritaje (estado, daños, reparaciones necesarias…)" value={form.peritaje_notas} onChange={(e) => set("peritaje_notas", e.target.value)} />
              </>
            )}

            {perm.retEconomico && (
              <>
                <p className="flex items-center gap-1 pt-1 text-xs font-medium text-muted-foreground"><ShieldCheck className="h-3 w-3" /> Valores económicos (solo usuarios autorizados)</p>
                <div className="grid grid-cols-2 gap-3">
                  <input className={campo} placeholder="Precio que pide el dueño" inputMode="decimal" value={formEco.precio_pedido} onChange={(e) => setE("precio_pedido", e.target.value)} />
                  <input className={campo} placeholder={form.operacion === "consignacion" ? "Precio acordado" : "Precio de retoma"} inputMode="decimal" value={formEco.precio_retoma} onChange={(e) => setE("precio_retoma", e.target.value)} />
                  <input className={campo} placeholder="Precio de venta previsto" inputMode="decimal" value={formEco.precio_venta} onChange={(e) => setE("precio_venta", e.target.value)} />
                  <input className={campo} placeholder="Costos estimados" inputMode="decimal" value={formEco.costos_estimados} onChange={(e) => setE("costos_estimados", e.target.value)} />
                </div>
                {editando && <p className="text-xs text-muted-foreground">Si cambias los valores de una retoma ya aprobada, tendrá que aprobarse de nuevo.</p>}
              </>
            )}

            <textarea className={campo} rows={2} placeholder="Qué pasó con el vehículo (motivo si no se retomó…)" value={form.motivo_resultado} onChange={(e) => set("motivo_resultado", e.target.value)} />
            <textarea className={campo} rows={2} placeholder="Observaciones" value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} />
            {!editando && <p className="text-xs text-muted-foreground">Después de guardar podrás adjuntar fotos y documentos desde la tarjeta de la solicitud.</p>}

            <button onClick={guardar} disabled={guardando} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Enviar solicitud"}
            </button>
          </GlassPanel>
        )}

        <div className={`min-w-0 space-y-3 ${perm.retCrear || editando ? "" : "lg:col-span-2"}`}>
          <div className="flex flex-wrap gap-2">
            {[{ clave: "todos", texto: "Todos" }, ...RESULTADOS].map((x) => (
              <button key={x.clave} onClick={() => setFResultado(x.clave)} className={chip(fResultado === x.clave)}>{x.texto}</button>
            ))}
          </div>

          {cargando && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {!cargando && visibles.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay registros.</p>}

          {visibles.map((r) => {
            const eco = economico[r.id];
            const utilidad = eco && eco.precio_venta !== null && eco.precio_retoma !== null
              ? eco.precio_venta - eco.precio_retoma - (eco.costos_estimados ?? 0)
              : null;
            const puedeEditar = perm.retVerTodas || r.resultado === "en_evaluacion";
            return (
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
                  <div className="flex shrink-0 flex-col items-end gap-1 text-xs">
                    <span className="rounded-full border border-glass-border px-2 py-0.5 text-foreground">{RESULTADOS.find((x) => x.clave === r.resultado)?.texto ?? r.resultado}</span>
                    <span className="text-muted-foreground">{APROBACION[r.estado_aprobacion] ?? r.estado_aprobacion}</span>
                  </div>
                </div>

                {perm.retEconomico && eco && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {eco.precio_pedido !== null && <span className="text-muted-foreground">Pide: <span className="text-foreground">{dinero(eco.precio_pedido)}</span></span>}
                    {eco.precio_retoma !== null && <span className="text-muted-foreground">Retoma: <span className="font-medium text-foreground">{dinero(eco.precio_retoma)}</span></span>}
                    {eco.precio_venta !== null && <span className="text-muted-foreground">Venta: <span className="text-foreground">{dinero(eco.precio_venta)}</span></span>}
                    {eco.costos_estimados !== null && <span className="text-muted-foreground">Costos: <span className="text-foreground">{dinero(eco.costos_estimados)}</span></span>}
                    {utilidad !== null && <span className="text-muted-foreground">Utilidad estimada: <span className="font-medium text-foreground">{dinero(utilidad)}</span></span>}
                  </div>
                )}
                {r.peritaje_notas && <p className="break-words text-xs text-muted-foreground">Peritaje{r.peritaje_fecha ? ` (${r.peritaje_fecha})` : ""}: {r.peritaje_notas}</p>}
                {r.aprobacion_notas && <p className="break-words text-xs text-muted-foreground">Decisión: {r.aprobacion_notas}</p>}
                <div className="flex flex-wrap items-center gap-2">
                  {(r.peritaje_archivos ?? []).map((ruta, i) => (
                    <span key={ruta} className="inline-flex items-center gap-1 rounded-full border border-glass-border px-2 py-1 text-xs">
                      <button onClick={() => abrirPeritaje(ruta)} className="inline-flex items-center gap-1 text-primary"><FileText className="h-3 w-3" /> Archivo {i + 1}</button>
                      {puedeEditar && <button onClick={() => quitarPeritaje(r, ruta)} aria-label="Quitar archivo" className="text-muted-foreground"><X className="h-3 w-3" /></button>}
                    </span>
                  ))}
                  {puedeEditar && (
                    <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-primary">
                      <Upload className="h-3 w-3" /> {subiendoId === r.id ? "Subiendo…" : "Subir fotos o documentos"}
                      <input type="file" accept="image/*,application/pdf" multiple className="hidden" disabled={subiendoId === r.id}
                        onChange={(e) => { subirPeritaje(r, e.target.files); e.target.value = ""; }} />
                    </label>
                  )}
                </div>
                {r.motivo_resultado && <p className="break-words text-xs text-muted-foreground">{r.motivo_resultado}</p>}
                {r.resultado === "retomado" && r.vehiculo_id && (
                  <p className="inline-flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="h-3 w-3" /> Ya está en el inventario</p>
                )}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {puedeInspeccionar && r.resultado !== "retomado" && (
                    <select className="rounded-lg border border-glass-border bg-glass/40 px-2 py-1 text-base text-foreground" value={r.resultado} onChange={(e) => cambiarResultado(r, e.target.value)}>
                      {RESULTADOS.filter((x) => x.clave !== "retomado").map((x) => <option key={x.clave} value={x.clave}>{x.texto}</option>)}
                    </select>
                  )}
                  {perm.retAprobar && !r.vehiculo_id && r.estado_aprobacion !== "aprobada" && (
                    <button onClick={() => decidir(r, "aprobada")} className="inline-flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="h-3 w-3" /> Aprobar</button>
                  )}
                  {perm.retAprobar && !r.vehiculo_id && r.estado_aprobacion === "pendiente" && (
                    <button onClick={() => decidir(r, "rechazada")} className="inline-flex items-center gap-1 text-xs text-muted-foreground"><XCircle className="h-3 w-3" /> Rechazar</button>
                  )}
                  {perm.retAprobar && !r.vehiculo_id && r.estado_aprobacion === "aprobada" && (
                    <button onClick={() => pasarAInventario(r)} className="inline-flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="h-3 w-3" /> Pasar al inventario</button>
                  )}
                  {puedeEditar && <button onClick={() => editar(r)} className="inline-flex items-center gap-1 text-xs text-primary"><Pencil className="h-3 w-3" /> Editar</button>}
                  {perm.retAprobar && <button onClick={() => borrar(r)} className="inline-flex items-center gap-1 text-xs text-destructive"><Trash2 className="h-3 w-3" /> Eliminar</button>}
                  <button onClick={() => setAbierto(abierto === r.id ? null : r.id)} className="ml-auto inline-flex items-center gap-1 text-xs text-muted-foreground">
                    {abierto === r.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />} Seguimiento
                  </button>
                </div>
                {abierto === r.id && (
                  <Seguimiento
                    retomaId={r.id}
                    puedeInspeccionar={perm.retInspeccionar}
                    puedeAvaluar={perm.retAvaluo}
                    verAvaluos={verAvaluos}
                    verEconomico={perm.retEconomico}
                  />
                )}
              </GlassPanel>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Seguimiento({
  retomaId, puedeInspeccionar, puedeAvaluar, verAvaluos, verEconomico,
}: { retomaId: string; puedeInspeccionar: boolean; puedeAvaluar: boolean; verAvaluos: boolean; verEconomico: boolean }) {
  const [inspecciones, setInspecciones] = useState<Inspeccion[]>([]);
  const [avaluos, setAvaluos] = useState<Avaluo[]>([]);
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [obs, setObs] = useState("");
  const [estadoGeneral, setEstadoGeneral] = useState("");
  const [valor, setValor] = useState("");
  const [notasAvaluo, setNotasAvaluo] = useState("");

  const cargar = useCallback(async () => {
    const [i, h] = await Promise.all([
      supabase.from("retomas_inspecciones").select("*").eq("retoma_id", retomaId).order("created_at", { ascending: false }),
      supabase.from("retomas_historial").select("*").eq("retoma_id", retomaId).order("created_at", { ascending: false }),
    ]);
    setInspecciones(i.data ?? []);
    setHistorial(h.data ?? []);
    if (verAvaluos) {
      const a = await supabase.from("retomas_avaluos").select("*").eq("retoma_id", retomaId).order("created_at", { ascending: false });
      setAvaluos(a.data ?? []);
    }
  }, [retomaId, verAvaluos]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const agregarInspeccion = async () => {
    if (!obs.trim()) return toast.error("Escribe las observaciones de la inspección.");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("retomas_inspecciones").insert({
      retoma_id: retomaId, observaciones: obs.trim(), estado_general: txt(estadoGeneral), creado_por: u.user?.id ?? null,
    });
    if (error) return toast.error("No se pudo guardar la inspección.");
    setObs(""); setEstadoGeneral("");
    cargar();
  };

  const agregarAvaluo = async () => {
    const v = num(valor);
    if (v === null) return toast.error("Escribe el valor del avalúo.");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("retomas_avaluos").insert({
      retoma_id: retomaId, valor: v, notas: txt(notasAvaluo), creado_por: u.user?.id ?? null,
    });
    if (error) return toast.error("No se pudo guardar el avalúo.");
    setValor(""); setNotasAvaluo("");
    cargar();
  };

  const fecha = (t: string) => new Date(t).toLocaleString("es-CO");

  return (
    <div className="space-y-3 rounded-lg border border-glass-border p-3 text-xs">
      <div className="space-y-1">
        <p className="font-medium text-foreground">Inspecciones y observaciones</p>
        {inspecciones.length === 0 && <p className="text-muted-foreground">Sin inspecciones.</p>}
        {inspecciones.map((i) => (
          <p key={i.id} className="break-words text-muted-foreground">
            {i.fecha}{i.estado_general ? ` · ${i.estado_general}` : ""}: {i.observaciones}
          </p>
        ))}
        {puedeInspeccionar && (
          <div className="space-y-2 pt-1">
            <input className={campo} placeholder="Estado general (bueno, regular, malo…)" value={estadoGeneral} onChange={(e) => setEstadoGeneral(e.target.value)} />
            <textarea className={campo} rows={2} placeholder="Observaciones de la inspección" value={obs} onChange={(e) => setObs(e.target.value)} />
            <button onClick={agregarInspeccion} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">Registrar inspección</button>
          </div>
        )}
      </div>

      {verAvaluos && (
        <div className="space-y-1">
          <p className="font-medium text-foreground">Avalúos técnicos</p>
          {avaluos.length === 0 && <p className="text-muted-foreground">Sin avalúos.</p>}
          {avaluos.map((a) => (
            <p key={a.id} className="break-words text-muted-foreground">
              {fecha(a.created_at)}: <span className="text-foreground">{dinero(a.valor)}</span>{a.notas ? ` · ${a.notas}` : ""}
            </p>
          ))}
          {puedeAvaluar && (
            <div className="space-y-2 pt-1">
              <input className={campo} placeholder="Valor del avalúo técnico" inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} />
              <input className={campo} placeholder="Notas del avalúo" value={notasAvaluo} onChange={(e) => setNotasAvaluo(e.target.value)} />
              <button onClick={agregarAvaluo} className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">Registrar avalúo</button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1">
        <p className="font-medium text-foreground">Historial{verEconomico ? " (incluye valores)" : ""}</p>
        {historial.length === 0 && <p className="text-muted-foreground">Sin movimientos.</p>}
        {historial.map((h) => (
          <p key={h.id} className="break-words text-muted-foreground">
            {fecha(h.created_at)} · {h.usuario_email ?? "sistema"}: {h.detalle ?? h.accion}
          </p>
        ))}
      </div>
    </div>
  );
}
