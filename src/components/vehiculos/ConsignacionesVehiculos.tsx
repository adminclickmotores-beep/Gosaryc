import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, Pencil, ShieldCheck, Undo2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { usePermisosVehiculos } from "@/hooks/use-permisos-vehiculos";

type Consignacion = Tables<"consignaciones_vehiculos">;
type Eco = Tables<"consignaciones_economico">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const ESTADOS = [
  { clave: "vigente", texto: "Vigente" },
  { clave: "vendida", texto: "Vendida" },
  { clave: "liquidada", texto: "Liquidada" },
  { clave: "devuelta", texto: "Devuelta" },
];

type Form = {
  propietario_nombre: string; propietario_documento: string; propietario_telefono: string; propietario_email: string;
  tipo: string; marca: string; modelo: string; anio: string; placa: string; vin: string; color: string;
  kilometraje: string; fecha_inicio: string; fecha_vencimiento: string; observaciones: string;
};
type FormEco = { precio_acordado: string; comision_pct: string; gastos_autorizados: string; precio_venta_final: string };

const VACIO: Form = {
  propietario_nombre: "", propietario_documento: "", propietario_telefono: "", propietario_email: "",
  tipo: "carro", marca: "", modelo: "", anio: "", placa: "", vin: "", color: "", kilometraje: "",
  fecha_inicio: "", fecha_vencimiento: "", observaciones: "",
};
const ECO_VACIO: FormEco = { precio_acordado: "", comision_pct: "", gastos_autorizados: "", precio_venta_final: "" };

const num = (v: string): number | null => {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const txt = (v: string): string | null => (v.trim() ? v.trim() : null);
const str = (x: string | number | null | undefined): string => (x === null || x === undefined ? "" : String(x));
const mensaje = (e: { message?: string } | null, defecto: string): string =>
  e?.message && !/row-level security|violates|permission/i.test(e.message) ? e.message : defecto;

const hoy = (): string => new Date().toISOString().slice(0, 10);
const diasPara = (fecha: string | null): number | null => {
  if (!fecha) return null;
  return Math.ceil((new Date(fecha + "T00:00:00").getTime() - new Date(hoy() + "T00:00:00").getTime()) / 86400000);
};

export function ConsignacionesVehiculos() {
  const perm = usePermisosVehiculos();
  const [lista, setLista] = useState<Consignacion[]>([]);
  const [economico, setEconomico] = useState<Record<string, Eco>>({});
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<Form>(VACIO);
  const [formEco, setFormEco] = useState<FormEco>(ECO_VACIO);
  const [editando, setEditando] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("consignaciones_vehiculos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("No se pudo cargar la lista.");
    setLista(data ?? []);
    if (perm.comEconomico) {
      const { data: eco } = await supabase.from("consignaciones_economico").select("*");
      const mapa: Record<string, Eco> = {};
      for (const e of eco ?? []) mapa[e.consignacion_id] = e;
      setEconomico(mapa);
    } else {
      setEconomico({});
    }
    setCargando(false);
  }, [perm.comEconomico]);

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
    if (!form.propietario_nombre.trim()) return toast.error("Escribe el nombre del propietario.");
    if (!form.marca.trim() || !form.modelo.trim()) return toast.error("Escribe la marca y el modelo.");
    if (form.fecha_vencimiento && form.fecha_inicio && form.fecha_vencimiento < form.fecha_inicio)
      return toast.error("La fecha de vencimiento no puede ser anterior al inicio.");
    const comision = num(formEco.comision_pct);
    if (comision !== null && (comision < 0 || comision > 100)) return toast.error("La comisión debe estar entre 0 y 100 %.");
    const datos = {
      propietario_nombre: form.propietario_nombre.trim(), propietario_documento: txt(form.propietario_documento),
      propietario_telefono: txt(form.propietario_telefono), propietario_email: txt(form.propietario_email),
      tipo: form.tipo, marca: form.marca.trim(), modelo: form.modelo.trim(), anio: num(form.anio),
      placa: txt(form.placa)?.toUpperCase() ?? null, vin: txt(form.vin)?.toUpperCase() ?? null,
      color: txt(form.color), kilometraje: num(form.kilometraje),
      fecha_inicio: form.fecha_inicio || hoy(), fecha_vencimiento: form.fecha_vencimiento || null,
      observaciones: txt(form.observaciones),
    };
    setGuardando(true);
    let id = editando;
    if (editando) {
      const { error } = await supabase.from("consignaciones_vehiculos").update(datos).eq("id", editando);
      if (error) {
        setGuardando(false);
        return toast.error(mensaje(error, "No se pudo guardar la consignación."));
      }
    } else {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("consignaciones_vehiculos")
        .insert({ ...datos, creado_por: u.user?.id ?? null })
        .select("id")
        .single();
      if (error || !data) {
        setGuardando(false);
        return toast.error(mensaje(error, "No se pudo guardar la consignación."));
      }
      id = data.id;
    }
    if (perm.comEconomico && id) {
      const valores = {
        precio_acordado: num(formEco.precio_acordado), comision_pct: comision,
        gastos_autorizados: num(formEco.gastos_autorizados), precio_venta_final: num(formEco.precio_venta_final),
      };
      const hayValores = Object.values(valores).some((v) => v !== null);
      let errorEco: { message?: string } | null = null;
      if (economico[id]) {
        ({ error: errorEco } = await supabase
          .from("consignaciones_economico")
          .update({ ...valores, updated_at: new Date().toISOString() })
          .eq("consignacion_id", id));
      } else if (hayValores) {
        ({ error: errorEco } = await supabase.from("consignaciones_economico").insert({ consignacion_id: id, ...valores }));
      }
      if (errorEco) toast.error(mensaje(errorEco, "Se guardó el contrato, pero no los valores económicos."));
    }
    setGuardando(false);
    toast.success(editando ? "Consignación actualizada." : "Consignación registrada.");
    limpiar();
    cargar();
  };

  const editar = (c: Consignacion) => {
    setForm({
      propietario_nombre: c.propietario_nombre, propietario_documento: str(c.propietario_documento),
      propietario_telefono: str(c.propietario_telefono), propietario_email: str(c.propietario_email),
      tipo: c.tipo, marca: c.marca, modelo: c.modelo, anio: str(c.anio), placa: str(c.placa), vin: str(c.vin),
      color: str(c.color), kilometraje: str(c.kilometraje), fecha_inicio: str(c.fecha_inicio),
      fecha_vencimiento: str(c.fecha_vencimiento), observaciones: str(c.observaciones),
    });
    const e = economico[c.id];
    setFormEco(e
      ? { precio_acordado: str(e.precio_acordado), comision_pct: str(e.comision_pct), gastos_autorizados: str(e.gastos_autorizados), precio_venta_final: str(e.precio_venta_final) }
      : ECO_VACIO);
    setEditando(c.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cambiarEstado = async (c: Consignacion, estado: "vendida" | "devuelta") => {
    const pregunta = estado === "vendida"
      ? "¿Marcar este vehículo como vendido? Después registra el precio de venta final y liquida al propietario."
      : "¿Marcar como devuelto al propietario? Ya no se podrá modificar.";
    if (!window.confirm(pregunta)) return;
    const { error } = await supabase.from("consignaciones_vehiculos").update({ estado }).eq("id", c.id);
    if (error) return toast.error(mensaje(error, "No se pudo cambiar el estado."));
    toast.success(estado === "vendida" ? "Marcada como vendida." : "Marcada como devuelta.");
    cargar();
  };

  const liquidar = async (c: Consignacion) => {
    const e = economico[c.id];
    if (!e || e.precio_venta_final === null) return toast.error("Edita la consignación y registra el precio de venta final.");
    if (!window.confirm("¿Liquidar al propietario? Se calcula con el precio de venta final, la comisión y los gastos autorizados.")) return;
    const { data, error } = await supabase.rpc("consignacion_liquidar", { p_id: c.id });
    if (error) return toast.error(mensaje(error, "No se pudo liquidar."));
    toast.success(`Liquidación registrada: ${dinero(Number(data))} para el propietario.`);
    cargar();
  };

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return lista.filter((c) => {
      if (filtro === "por_vencer") {
        const d = diasPara(c.fecha_vencimiento);
        if (c.estado !== "vigente" || d === null || d > 15) return false;
      } else if (filtro !== "todos" && c.estado !== filtro) return false;
      if (!q) return true;
      return [c.marca, c.modelo, c.placa, c.vin, c.propietario_nombre].some((x) => (x ?? "").toLowerCase().includes(q));
    });
  }, [lista, filtro, busqueda]);

  const vigentes = lista.filter((c) => c.estado === "vigente").length;
  const porVencer = lista.filter((c) => {
    const d = diasPara(c.fecha_vencimiento);
    return c.estado === "vigente" && d !== null && d <= 15;
  }).length;
  const porLiquidar = lista.filter((c) => c.estado === "vendida").length;

  const chip = (activo: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm ${activo ? "border-primary bg-primary text-primary-foreground" : "border-glass-border text-muted-foreground"}`;

  if (!perm.cargando && !perm.comCrear && !perm.comVerPropias && !perm.comVerTodas) {
    return (
      <GlassPanel className="p-6">
        <p className="text-sm text-muted-foreground">No tienes permiso para usar Consignaciones. Pídele al administrador que te lo active en Ajustes &gt; Equipo.</p>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/dashboard" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <FileText className="h-7 w-7 text-primary" /> Consignaciones
        </h1>
        <p className="text-sm text-muted-foreground">
          Vehículos de terceros que vendes por contrato: vigencia, precio acordado, comisión, gastos autorizados y liquidación al propietario.
          {!perm.comEconomico && " Los valores económicos los gestiona el administrador."}
          {!perm.comVerTodas && " Aquí ves solo las consignaciones que tú creaste."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Vigentes</p><p className="text-lg font-medium text-foreground">{vigentes}</p></GlassPanel>
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Por vencer (15 días)</p><p className="text-lg font-medium text-foreground">{porVencer}</p></GlassPanel>
        <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Por liquidar</p><p className="text-lg font-medium text-foreground">{porLiquidar}</p></GlassPanel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        {(perm.comCrear || editando) && (
          <GlassPanel className="h-fit space-y-3 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-medium text-foreground">{editando ? "Editar consignación" : "Nueva consignación"}</h2>
              {editando && <button onClick={limpiar} className="text-xs text-primary">Cancelar edición</button>}
            </div>
            <p className="text-xs font-medium text-muted-foreground">Propietario</p>
            <div className="grid grid-cols-2 gap-3">
              <input className={campo} placeholder="Nombre *" value={form.propietario_nombre} onChange={(e) => set("propietario_nombre", e.target.value)} />
              <input className={campo} placeholder="Cédula / NIT" value={form.propietario_documento} onChange={(e) => set("propietario_documento", e.target.value)} />
              <input className={campo} placeholder="Teléfono" inputMode="tel" value={form.propietario_telefono} onChange={(e) => set("propietario_telefono", e.target.value)} />
              <input className={campo} placeholder="Correo" type="email" value={form.propietario_email} onChange={(e) => set("propietario_email", e.target.value)} />
            </div>
            <p className="pt-1 text-xs font-medium text-muted-foreground">Vehículo</p>
            <div className="grid grid-cols-2 gap-3">
              <select className={campo} value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
                <option value="carro">Carro</option><option value="moto">Moto</option>
              </select>
              <input className={campo} placeholder="Marca *" value={form.marca} onChange={(e) => set("marca", e.target.value)} />
              <input className={campo} placeholder="Modelo / línea *" value={form.modelo} onChange={(e) => set("modelo", e.target.value)} />
              <input className={campo} placeholder="Año" inputMode="numeric" value={form.anio} onChange={(e) => set("anio", e.target.value)} />
              <input className={campo} placeholder="Placa" value={form.placa} onChange={(e) => set("placa", e.target.value)} />
              <input className={campo} placeholder="VIN" value={form.vin} onChange={(e) => set("vin", e.target.value)} />
              <input className={campo} placeholder="Color" value={form.color} onChange={(e) => set("color", e.target.value)} />
              <input className={campo} placeholder="Kilometraje" inputMode="numeric" value={form.kilometraje} onChange={(e) => set("kilometraje", e.target.value)} />
            </div>
            <p className="pt-1 text-xs font-medium text-muted-foreground">Vigencia del contrato</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="space-y-1"><span className="text-xs text-muted-foreground">Inicio</span>
                <input className={campo} type="date" value={form.fecha_inicio} onChange={(e) => set("fecha_inicio", e.target.value)} /></label>
              <label className="space-y-1"><span className="text-xs text-muted-foreground">Vencimiento</span>
                <input className={campo} type="date" value={form.fecha_vencimiento} onChange={(e) => set("fecha_vencimiento", e.target.value)} /></label>
            </div>

            {perm.comEconomico && (
              <>
                <p className="flex items-center gap-1 pt-1 text-xs font-medium text-muted-foreground"><ShieldCheck className="h-3 w-3" /> Valores económicos (solo usuarios autorizados)</p>
                <div className="grid grid-cols-2 gap-3">
                  <input className={campo} placeholder="Precio acordado con el propietario" inputMode="decimal" value={formEco.precio_acordado} onChange={(e) => setE("precio_acordado", e.target.value)} />
                  <input className={campo} placeholder="Comisión (%)" inputMode="decimal" value={formEco.comision_pct} onChange={(e) => setE("comision_pct", e.target.value)} />
                  <input className={campo} placeholder="Gastos autorizados" inputMode="decimal" value={formEco.gastos_autorizados} onChange={(e) => setE("gastos_autorizados", e.target.value)} />
                  <input className={campo} placeholder="Precio de venta final" inputMode="decimal" value={formEco.precio_venta_final} onChange={(e) => setE("precio_venta_final", e.target.value)} />
                </div>
              </>
            )}

            <textarea className={campo} rows={2} placeholder="Observaciones del contrato" value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} />
            <button onClick={guardar} disabled={guardando} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50">
              {guardando ? "Guardando…" : editando ? "Guardar cambios" : "Registrar consignación"}
            </button>
          </GlassPanel>
        )}

        <div className={`min-w-0 space-y-3 ${perm.comCrear || editando ? "" : "lg:col-span-2"}`}>
          <input className={campo} placeholder="Buscar por marca, modelo, placa, VIN o propietario" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {[{ clave: "todos", texto: "Todas" }, { clave: "por_vencer", texto: "Por vencer" }, ...ESTADOS].map((x) => (
              <button key={x.clave} onClick={() => setFiltro(x.clave)} className={chip(filtro === x.clave)}>{x.texto}</button>
            ))}
          </div>

          {cargando && <p className="text-sm text-muted-foreground">Cargando…</p>}
          {!cargando && visibles.length === 0 && <p className="text-sm text-muted-foreground">No hay consignaciones para mostrar.</p>}

          {visibles.map((c) => {
            const eco = economico[c.id];
            const dias = diasPara(c.fecha_vencimiento);
            const vencida = c.estado === "vigente" && dias !== null && dias < 0;
            const proxima = c.estado === "vigente" && dias !== null && dias >= 0 && dias <= 15;
            const cerrada = c.estado === "liquidada" || c.estado === "devuelta";
            const comisionValor = eco && eco.precio_venta_final !== null ? (eco.precio_venta_final * (eco.comision_pct ?? 0)) / 100 : null;
            return (
              <GlassPanel key={c.id} className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-foreground">{c.marca} {c.modelo} {c.anio ?? ""}</p>
                    <p className="break-words text-xs text-muted-foreground">
                      {c.tipo === "moto" ? "Moto" : "Carro"}{c.placa ? ` · ${c.placa}` : ""}{c.kilometraje !== null ? ` · ${c.kilometraje.toLocaleString("es-CO")} km` : ""}
                    </p>
                    <p className="break-words text-xs text-muted-foreground">
                      Propietario: {[c.propietario_nombre, c.propietario_telefono].filter(Boolean).join(" · ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Desde {c.fecha_inicio}{c.fecha_vencimiento ? ` hasta ${c.fecha_vencimiento}` : " · sin fecha de vencimiento"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-glass-border px-2 py-0.5 text-xs text-foreground">
                    {ESTADOS.find((x) => x.clave === c.estado)?.texto ?? c.estado}
                  </span>
                </div>

                {(vencida || proxima) && (
                  <p className="inline-flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    {vencida ? `Contrato vencido hace ${Math.abs(dias ?? 0)} días` : `El contrato vence en ${dias} días`}
                  </p>
                )}

                {perm.comEconomico && eco && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {eco.precio_acordado !== null && <span className="text-muted-foreground">Acordado: <span className="font-medium text-foreground">{dinero(eco.precio_acordado)}</span></span>}
                    {eco.comision_pct !== null && <span className="text-muted-foreground">Comisión: <span className="text-foreground">{eco.comision_pct} %</span></span>}
                    {eco.gastos_autorizados !== null && <span className="text-muted-foreground">Gastos: <span className="text-foreground">{dinero(eco.gastos_autorizados)}</span></span>}
                    {eco.precio_venta_final !== null && <span className="text-muted-foreground">Vendido en: <span className="text-foreground">{dinero(eco.precio_venta_final)}</span></span>}
                    {comisionValor !== null && <span className="text-muted-foreground">Tu comisión: <span className="text-foreground">{dinero(comisionValor)}</span></span>}
                    {eco.monto_liquidado !== null && <span className="text-muted-foreground">Pagado al propietario: <span className="font-medium text-foreground">{dinero(eco.monto_liquidado)}</span></span>}
                  </div>
                )}
                {c.observaciones && <p className="break-words text-xs text-muted-foreground">{c.observaciones}</p>}
                {c.estado === "liquidada" && c.liquidada_en && (
                  <p className="inline-flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="h-3 w-3" /> Liquidada el {new Date(c.liquidada_en).toLocaleDateString("es-CO")}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {!cerrada && <button onClick={() => editar(c)} className="inline-flex items-center gap-1 text-xs text-primary"><Pencil className="h-3 w-3" /> Editar</button>}
                  {perm.comAprobar && c.estado === "vigente" && (
                    <button onClick={() => cambiarEstado(c, "vendida")} className="inline-flex items-center gap-1 text-xs text-primary"><CheckCircle2 className="h-3 w-3" /> Marcar vendida</button>
                  )}
                  {perm.comAprobar && c.estado === "vigente" && (
                    <button onClick={() => cambiarEstado(c, "devuelta")} className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Undo2 className="h-3 w-3" /> Devolver al propietario</button>
                  )}
                  {perm.comAprobar && perm.comEconomico && c.estado === "vendida" && (
                    <button onClick={() => liquidar(c)} className="inline-flex items-center gap-1 text-xs text-primary"><Wallet className="h-3 w-3" /> Liquidar al propietario</button>
                  )}
                </div>
              </GlassPanel>
            );
          })}
        </div>
      </div>
    </div>
  );
}
