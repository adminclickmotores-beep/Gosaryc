import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, FileText, PackageCheck, ShoppingBag, Trash2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { usePermisosVehiculos } from "@/hooks/use-permisos-vehiculos";
import { BUCKET_FOTOS } from "@/lib/fotos-vehiculos";

type Compra = Tables<"compras_vehiculos">;
type Eco = Tables<"compras_vehiculos_economico">;
type Gasto = Tables<"compras_vehiculos_gastos">;
type Pago = Tables<"compras_vehiculos_pagos">;
type Aprobacion = Tables<"compras_vehiculos_aprobaciones">;
type Historial = Tables<"compras_vehiculos_historial">;
type Documento = Tables<"compras_vehiculos_documentos">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";
const boton =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-glass-border bg-glass/40 px-3 py-2 text-sm font-medium text-foreground transition hover:border-primary/50 disabled:opacity-50";
const botonPrimario =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50";

const ESTADOS: Record<string, string> = {
  negociacion: "En negociación",
  aprobada: "Aprobada",
  recibida: "Recibida",
  cancelada: "Cancelada",
};

const TIPOS_DOC = [
  { clave: "tarjeta_propiedad", texto: "Tarjeta de propiedad" },
  { clave: "cedula_vendedor", texto: "Documento del vendedor" },
  { clave: "contrato", texto: "Contrato de compraventa" },
  { clave: "foto", texto: "Fotografía" },
  { clave: "otro", texto: "Otro documento" },
];

type Form = {
  vendedor_tipo: string; vendedor_nombre: string; vendedor_documento: string; vendedor_telefono: string;
  propietario_nombre: string; propietario_documento: string; tipo: string; marca: string; linea: string;
  modelo: string; anio: string; placa: string; vin: string; chasis: string; motor_numero: string;
  color: string; kilometraje: string; observaciones: string;
};
const VACIO: Form = {
  vendedor_tipo: "particular", vendedor_nombre: "", vendedor_documento: "", vendedor_telefono: "",
  propietario_nombre: "", propietario_documento: "", tipo: "carro", marca: "", linea: "", modelo: "", anio: "",
  placa: "", vin: "", chasis: "", motor_numero: "", color: "", kilometraje: "", observaciones: "",
};

const num = (t: string): number | null => {
  if (!t.trim()) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};
const txt = (t: string): string | null => (t.trim() ? t.trim() : null);

const errorLegible = (msg: string | undefined, defecto: string): string => {
  const m = msg ?? "";
  if (m.includes("COMPRA_CERRADA")) return "La compra ya está cerrada y no se puede modificar.";
  if (m.includes("CAMPO_PROTEGIDO")) return "Ese dato solo cambia aprobando, recibiendo o cancelando la compra.";
  if (m.includes("PAGO_EXCEDE_SALDO")) return "El pago supera el saldo pendiente.";
  if (m.includes("PAGO_SIN_PRECIO")) return "Primero registra el precio acordado.";
  if (m.includes("SIN_PERMISO")) return "No tienes permiso para esta acción.";
  if (m.includes("PLACA_DUPLICADA") || m.includes("vehiculos_placa_unica_idx")) return "Ya existe un vehículo con esa placa.";
  if (m.includes("VIN_DUPLICADO") || m.includes("vehiculos_vin_unico_idx")) return "Ya existe un vehículo con ese VIN.";
  if (m && !/row-level security|violates|permission/i.test(m)) return m;
  return defecto;
};

export function ComprasVehiculos() {
  const perm = usePermisosVehiculos();
  const [lista, setLista] = useState<Compra[]>([]);
  const [cargando, setCargando] = useState(true);
  const [form, setForm] = useState<Form>(VACIO);
  const [formEco, setFormEco] = useState({ oferta_inicial: "", precio_acordado: "", forma_pago: "", condiciones_pago: "" });
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState("todos");
  const [abierta, setAbierta] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("compras_vehiculos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) toast.error("No se pudo cargar la lista de compras.");
    setLista(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    if (perm.cargando) return;
    void cargar();
  }, [cargar, perm.cargando]);

  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const crear = async () => {
    if (!form.vendedor_nombre.trim()) return toast.error("Escribe el nombre del vendedor.");
    if (!form.marca.trim() || !form.modelo.trim()) return toast.error("Escribe la marca y el modelo.");
    setGuardando(true);
    const { data: uid } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("compras_vehiculos")
      .insert({
        vendedor_tipo: form.vendedor_tipo,
        vendedor_nombre: form.vendedor_nombre.trim(),
        vendedor_documento: txt(form.vendedor_documento),
        vendedor_telefono: txt(form.vendedor_telefono),
        propietario_nombre: txt(form.propietario_nombre),
        propietario_documento: txt(form.propietario_documento),
        tipo: form.tipo,
        marca: form.marca.trim(),
        linea: txt(form.linea),
        modelo: form.modelo.trim(),
        anio: num(form.anio),
        placa: txt(form.placa)?.toUpperCase() ?? null,
        vin: txt(form.vin)?.toUpperCase() ?? null,
        chasis: txt(form.chasis),
        motor_numero: txt(form.motor_numero),
        color: txt(form.color),
        kilometraje: num(form.kilometraje),
        observaciones: txt(form.observaciones),
        creado_por: uid.user?.id ?? null,
      })
      .select("id")
      .single();
    if (error || !data) {
      setGuardando(false);
      return toast.error(errorLegible(error?.message, "No se pudo registrar la compra."));
    }
    if (perm.comEconomico && (formEco.precio_acordado || formEco.oferta_inicial || formEco.forma_pago)) {
      const { error: e2 } = await supabase.from("compras_vehiculos_economico").insert({
        compra_id: data.id,
        oferta_inicial: num(formEco.oferta_inicial),
        precio_acordado: num(formEco.precio_acordado),
        forma_pago: txt(formEco.forma_pago),
        condiciones_pago: txt(formEco.condiciones_pago),
      });
      if (e2) toast.error(errorLegible(e2.message, "La compra se creó, pero no se guardó la negociación."));
    }
    setGuardando(false);
    toast.success("Compra registrada.");
    setForm(VACIO);
    setFormEco({ oferta_inicial: "", precio_acordado: "", forma_pago: "", condiciones_pago: "" });
    await cargar();
    setAbierta(data.id);
  };

  const visibles = lista.filter((c) => filtro === "todos" || c.estado === filtro);

  if (perm.cargando || cargando) return <p className="p-6 text-sm text-muted-foreground">Cargando compras…</p>;
  if (!perm.comCrear && !perm.comVerPropias && !perm.comVerTodas) {
    return <GlassPanel className="p-6 text-sm text-muted-foreground">No tienes acceso al módulo de compras.</GlassPanel>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingBag className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Compras de vehículos</h1>
          <p className="text-sm text-muted-foreground">
            Cada compra tiene su historial. Al recibir el vehículo se crea en el inventario sin duplicar placa ni VIN.
          </p>
        </div>
      </div>

      {perm.comCrear && (
        <GlassPanel className="space-y-4 p-4 sm:p-5">
          <h2 className="font-semibold text-foreground">Nueva compra</h2>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vendedor y propietario</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <select className={campo} value={form.vendedor_tipo} onChange={(e) => set("vendedor_tipo", e.target.value)}>
              <option value="particular">Vendedor particular</option>
              <option value="proveedor">Proveedor</option>
            </select>
            <input className={campo} placeholder="Nombre del vendedor *" value={form.vendedor_nombre} onChange={(e) => set("vendedor_nombre", e.target.value)} />
            <input className={campo} placeholder="Documento del vendedor" value={form.vendedor_documento} onChange={(e) => set("vendedor_documento", e.target.value)} />
            <input className={campo} placeholder="Teléfono" inputMode="tel" value={form.vendedor_telefono} onChange={(e) => set("vendedor_telefono", e.target.value)} />
            <input className={campo} placeholder="Propietario (si es distinto al vendedor)" value={form.propietario_nombre} onChange={(e) => set("propietario_nombre", e.target.value)} />
            <input className={campo} placeholder="Documento del propietario" value={form.propietario_documento} onChange={(e) => set("propietario_documento", e.target.value)} />
          </div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vehículo</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <select className={campo} value={form.tipo} onChange={(e) => set("tipo", e.target.value)}>
              <option value="carro">Carro</option>
              <option value="moto">Moto</option>
              <option value="camioneta">Camioneta</option>
              <option value="otro">Otro</option>
            </select>
            <input className={campo} placeholder="Marca *" value={form.marca} onChange={(e) => set("marca", e.target.value)} />
            <input className={campo} placeholder="Línea" value={form.linea} onChange={(e) => set("linea", e.target.value)} />
            <input className={campo} placeholder="Modelo *" value={form.modelo} onChange={(e) => set("modelo", e.target.value)} />
            <input className={campo} placeholder="Año" inputMode="numeric" value={form.anio} onChange={(e) => set("anio", e.target.value)} />
            <input className={campo} placeholder="Placa" value={form.placa} onChange={(e) => set("placa", e.target.value)} />
            <input className={campo} placeholder="VIN" value={form.vin} onChange={(e) => set("vin", e.target.value)} />
            <input className={campo} placeholder="Chasis" value={form.chasis} onChange={(e) => set("chasis", e.target.value)} />
            <input className={campo} placeholder="Número de motor" value={form.motor_numero} onChange={(e) => set("motor_numero", e.target.value)} />
            <input className={campo} placeholder="Color" value={form.color} onChange={(e) => set("color", e.target.value)} />
            <input className={campo} placeholder="Kilometraje" inputMode="numeric" value={form.kilometraje} onChange={(e) => set("kilometraje", e.target.value)} />
          </div>
          <textarea className={campo} rows={2} placeholder="Observaciones" value={form.observaciones} onChange={(e) => set("observaciones", e.target.value)} />
          {perm.comEconomico && (
            <>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Negociación (solo quien tiene permiso económico)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <input className={campo} placeholder="Oferta inicial" inputMode="decimal" value={formEco.oferta_inicial} onChange={(e) => setFormEco({ ...formEco, oferta_inicial: e.target.value })} />
                <input className={campo} placeholder="Precio acordado" inputMode="decimal" value={formEco.precio_acordado} onChange={(e) => setFormEco({ ...formEco, precio_acordado: e.target.value })} />
                <input className={campo} placeholder="Forma de pago (transferencia, efectivo, cheque…)" value={formEco.forma_pago} onChange={(e) => setFormEco({ ...formEco, forma_pago: e.target.value })} />
                <input className={campo} placeholder="Condiciones de pago" value={formEco.condiciones_pago} onChange={(e) => setFormEco({ ...formEco, condiciones_pago: e.target.value })} />
              </div>
            </>
          )}
          <button type="button" className={botonPrimario} disabled={guardando} onClick={() => void crear()}>
            {guardando ? "Guardando…" : "Registrar compra"}
          </button>
        </GlassPanel>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {["todos", "negociacion", "aprobada", "recibida", "cancelada"].map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => setFiltro(e)}
            className={`${boton} ${filtro === e ? "border-primary/60 text-primary" : ""}`}
          >
            {e === "todos" ? "Todas" : ESTADOS[e]}
          </button>
        ))}
      </div>

      {visibles.length === 0 ? (
        <GlassPanel className="p-6 text-sm text-muted-foreground">No hay compras para mostrar.</GlassPanel>
      ) : (
        <div className="space-y-3">
          {visibles.map((c) => (
            <GlassPanel key={c.id} className="p-4">
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 text-left"
                onClick={() => setAbierta(abierta === c.id ? null : c.id)}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-foreground">
                    {c.marca} {c.linea ?? ""} {c.modelo} {c.anio ?? ""}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {c.placa ?? "Sin placa"} · Vendedor: {c.vendedor_nombre} · {ESTADOS[c.estado] ?? c.estado}
                  </span>
                </span>
                {abierta === c.id ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
              </button>
              {abierta === c.id && <DetalleCompra compra={c} onCambio={cargar} />}
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}

function DetalleCompra({ compra, onCambio }: { compra: Compra; onCambio: () => Promise<void> }) {
  const perm = usePermisosVehiculos();
  const [eco, setEco] = useState<Eco | null>(null);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [aprobaciones, setAprobaciones] = useState<Aprobacion[]>([]);
  const [historial, setHistorial] = useState<Historial[]>([]);
  const [docs, setDocs] = useState<Documento[]>([]);
  const [fEco, setFEco] = useState({ oferta_inicial: "", precio_acordado: "", forma_pago: "", condiciones_pago: "" });
  const [fGasto, setFGasto] = useState({ concepto: "", monto: "" });
  const [fPago, setFPago] = useState({ tipo: "anticipo", monto: "", metodo: "", nota: "" });
  const [tipoDoc, setTipoDoc] = useState("tarjeta_propiedad");
  const [notasRecepcion, setNotasRecepcion] = useState("");
  const [motivo, setMotivo] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const abierta = compra.estado === "negociacion" || compra.estado === "aprobada";

  const cargar = useCallback(async () => {
    const [h, d] = await Promise.all([
      supabase.from("compras_vehiculos_historial").select("*").eq("compra_id", compra.id).order("created_at", { ascending: false }),
      supabase.from("compras_vehiculos_documentos").select("*").eq("compra_id", compra.id).order("created_at", { ascending: false }),
    ]);
    setHistorial(h.data ?? []);
    setDocs(d.data ?? []);
    if (perm.comEconomico) {
      const [e, g, p, a] = await Promise.all([
        supabase.from("compras_vehiculos_economico").select("*").eq("compra_id", compra.id).maybeSingle(),
        supabase.from("compras_vehiculos_gastos").select("*").eq("compra_id", compra.id).order("created_at"),
        supabase.from("compras_vehiculos_pagos").select("*").eq("compra_id", compra.id).order("created_at"),
        supabase.from("compras_vehiculos_aprobaciones").select("*").eq("compra_id", compra.id).order("created_at", { ascending: false }),
      ]);
      setEco(e.data ?? null);
      setGastos(g.data ?? []);
      setPagos(p.data ?? []);
      setAprobaciones(a.data ?? []);
      setFEco({
        oferta_inicial: e.data?.oferta_inicial?.toString() ?? "",
        precio_acordado: e.data?.precio_acordado?.toString() ?? "",
        forma_pago: e.data?.forma_pago ?? "",
        condiciones_pago: e.data?.condiciones_pago ?? "",
      });
    }
  }, [compra.id, perm.comEconomico]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const refrescar = async () => {
    await cargar();
    await onCambio();
  };

  const ejecutar = async (accion: () => PromiseLike<{ error: { message: string } | null }>, ok: string, defecto: string) => {
    setOcupado(true);
    const { error } = await accion();
    setOcupado(false);
    if (error) return toast.error(errorLegible(error.message, defecto));
    toast.success(ok);
    await refrescar();
  };

  const guardarEco = () =>
    ejecutar(
      () =>
        supabase.from("compras_vehiculos_economico").upsert({
          compra_id: compra.id,
          oferta_inicial: num(fEco.oferta_inicial),
          precio_acordado: num(fEco.precio_acordado),
          forma_pago: txt(fEco.forma_pago),
          condiciones_pago: txt(fEco.condiciones_pago),
        }),
      "Negociación guardada.",
      "No se pudo guardar la negociación.",
    );

  const agregarGasto = async () => {
    const monto = num(fGasto.monto);
    if (!fGasto.concepto.trim() || monto === null || monto < 0) return toast.error("Escribe el concepto y un monto válido.");
    await ejecutar(
      () => supabase.from("compras_vehiculos_gastos").insert({ compra_id: compra.id, concepto: fGasto.concepto.trim(), monto }),
      "Gasto agregado.",
      "No se pudo agregar el gasto.",
    );
    setFGasto({ concepto: "", monto: "" });
  };

  const agregarPago = async () => {
    const monto = num(fPago.monto);
    if (monto === null || monto <= 0) return toast.error("Escribe un monto válido.");
    const { data: u } = await supabase.auth.getUser();
    await ejecutar(
      () =>
        supabase.from("compras_vehiculos_pagos").insert({
          compra_id: compra.id,
          tipo: fPago.tipo,
          monto,
          metodo: txt(fPago.metodo),
          nota: txt(fPago.nota),
          registrado_por: u.user?.id ?? null,
        }),
      "Pago registrado.",
      "No se pudo registrar el pago.",
    );
    setFPago({ tipo: "abono", monto: "", metodo: "", nota: "" });
  };

  const subirDoc = async (archivo: File | undefined) => {
    if (!archivo) return;
    if (!compra.owner_id) return toast.error("La compra no tiene negocio asociado.");
    if (archivo.size > 15 * 1024 * 1024) return toast.error("El archivo supera 15 MB.");
    setOcupado(true);
    const limpio = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ruta = `${compra.owner_id}/compras/${compra.id}/${Date.now()}-${limpio}`;
    const { error: e1 } = await supabase.storage.from(BUCKET_FOTOS).upload(ruta, archivo);
    if (e1) {
      setOcupado(false);
      return toast.error("No se pudo subir el archivo.");
    }
    const { data: u } = await supabase.auth.getUser();
    const { error: e2 } = await supabase.from("compras_vehiculos_documentos").insert({
      compra_id: compra.id,
      owner_id: compra.owner_id,
      tipo: tipoDoc,
      nombre: archivo.name,
      ruta,
      creado_por: u.user?.id ?? null,
    });
    setOcupado(false);
    if (e2) return toast.error(errorLegible(e2.message, "No se pudo guardar el documento."));
    toast.success("Documento adjuntado.");
    await cargar();
  };

  const abrirDoc = async (d: Documento) => {
    const { data, error } = await supabase.storage.from(BUCKET_FOTOS).createSignedUrl(d.ruta, 120);
    if (error || !data) return toast.error("No se pudo abrir el archivo.");
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const quitarDoc = async (d: Documento) => {
    const { error } = await supabase.from("compras_vehiculos_documentos").delete().eq("id", d.id);
    if (error) return toast.error(errorLegible(error.message, "No tienes permiso para quitar documentos."));
    await supabase.storage.from(BUCKET_FOTOS).remove([d.ruta]);
    await cargar();
  };

  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0);
  const totalPagado = pagos.reduce((s, p) => s + p.monto, 0);
  const precio = eco?.precio_acordado ?? 0;
  const saldo = precio - totalPagado;
  const vigente = aprobaciones.find((a) => a.vigente);

  return (
    <div className="mt-4 space-y-5 border-t border-glass-border pt-4">
      <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
        <p>Vendedor: <span className="text-foreground">{compra.vendedor_nombre}</span> ({compra.vendedor_tipo})</p>
        <p>Documento: <span className="text-foreground">{compra.vendedor_documento ?? "—"}</span> · Tel.: {compra.vendedor_telefono ?? "—"}</p>
        <p>Propietario: <span className="text-foreground">{compra.propietario_nombre ?? "Igual al vendedor"}</span></p>
        <p>VIN: <span className="text-foreground">{compra.vin ?? "—"}</span> · Chasis: {compra.chasis ?? "—"} · Motor: {compra.motor_numero ?? "—"}</p>
        <p>Color: {compra.color ?? "—"} · Kilometraje: {compra.kilometraje ?? "—"}</p>
        {compra.recibida_en && <p>Recibida el {new Date(compra.recibida_en).toLocaleDateString("es-CO")}{compra.recepcion_notas ? ` · ${compra.recepcion_notas}` : ""}</p>}
      </div>

      {perm.comEconomico && (
        <div className="space-y-4 rounded-xl border border-glass-border p-3">
          <h3 className="font-semibold text-foreground">Negociación y pagos</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={campo} placeholder="Oferta inicial" inputMode="decimal" disabled={!abierta} value={fEco.oferta_inicial} onChange={(e) => setFEco({ ...fEco, oferta_inicial: e.target.value })} />
            <input className={campo} placeholder="Precio acordado" inputMode="decimal" disabled={!abierta} value={fEco.precio_acordado} onChange={(e) => setFEco({ ...fEco, precio_acordado: e.target.value })} />
            <input className={campo} placeholder="Forma de pago" disabled={!abierta} value={fEco.forma_pago} onChange={(e) => setFEco({ ...fEco, forma_pago: e.target.value })} />
            <input className={campo} placeholder="Condiciones de pago" disabled={!abierta} value={fEco.condiciones_pago} onChange={(e) => setFEco({ ...fEco, condiciones_pago: e.target.value })} />
          </div>
          {abierta && (
            <button type="button" className={boton} disabled={ocupado} onClick={() => void guardarEco()}>
              Guardar negociación
            </button>
          )}
          {compra.estado === "aprobada" && (
            <p className="text-xs text-muted-foreground">Si cambias el precio, las condiciones o los gastos, la aprobación se anula y hay que aprobar de nuevo.</p>
          )}

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">Gastos adicionales de adquisición · {dinero(totalGastos)}</p>
            <ul className="mb-2 space-y-1 text-sm">
              {gastos.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate">{g.concepto} · {dinero(g.monto)}</span>
                  {abierta && (
                    <button type="button" aria-label="Quitar gasto" className="text-muted-foreground hover:text-destructive"
                      onClick={() => void ejecutar(() => supabase.from("compras_vehiculos_gastos").delete().eq("id", g.id), "Gasto quitado.", "No se pudo quitar el gasto.")}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {abierta && (
              <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
                <input className={campo} placeholder="Concepto (traspaso, grúa, comisión…)" value={fGasto.concepto} onChange={(e) => setFGasto({ ...fGasto, concepto: e.target.value })} />
                <input className={campo} placeholder="Monto" inputMode="decimal" value={fGasto.monto} onChange={(e) => setFGasto({ ...fGasto, monto: e.target.value })} />
                <button type="button" className={boton} disabled={ocupado} onClick={() => void agregarGasto()}>Agregar</button>
              </div>
            )}
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              Pagos al vendedor · Pagado {dinero(totalPagado)} · Saldo pendiente {dinero(Math.max(saldo, 0))}
            </p>
            <ul className="mb-2 space-y-1 text-sm">
              {pagos.map((p) => (
                <li key={p.id}>{new Date(p.fecha + "T00:00:00").toLocaleDateString("es-CO")} · {p.tipo} · {dinero(p.monto)}{p.metodo ? ` · ${p.metodo}` : ""}{p.nota ? ` · ${p.nota}` : ""}</li>
              ))}
            </ul>
            {compra.estado !== "cancelada" && (
              <div className="grid gap-2 sm:grid-cols-[130px_150px_1fr_auto]">
                <select className={campo} value={fPago.tipo} onChange={(e) => setFPago({ ...fPago, tipo: e.target.value })}>
                  <option value="anticipo">Anticipo</option>
                  <option value="abono">Abono</option>
                  <option value="saldo">Saldo</option>
                </select>
                <input className={campo} placeholder="Monto" inputMode="decimal" value={fPago.monto} onChange={(e) => setFPago({ ...fPago, monto: e.target.value })} />
                <input className={campo} placeholder="Método / referencia" value={fPago.metodo} onChange={(e) => setFPago({ ...fPago, metodo: e.target.value })} />
                <button type="button" className={boton} disabled={ocupado} onClick={() => void agregarPago()}>Registrar pago</button>
              </div>
            )}
            <p className="mt-1 text-xs text-muted-foreground">Los pagos quedan registrados en la compra. Aún no se descuentan solos de la caja ni se contabilizan.</p>
          </div>

          {aprobaciones.length > 0 && (
            <div>
              <p className="mb-1 text-sm font-medium text-foreground">Aprobaciones</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                {aprobaciones.map((a) => (
                  <li key={a.id}>
                    {a.vigente ? "Vigente" : "Sin efecto"} · {a.usuario_email} · {new Date(a.created_at).toLocaleString("es-CO")} · valor {dinero(a.precio_aprobado)} · gastos {dinero(a.gastos_aprobados)}
                    {a.motivo_invalidacion ? ` · ${a.motivo_invalidacion}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Documentos y fotografías</p>
        <ul className="mb-2 space-y-1 text-sm">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-2">
              <button type="button" className="flex min-w-0 items-center gap-1.5 truncate text-left text-primary hover:underline" onClick={() => void abrirDoc(d)}>
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">{TIPOS_DOC.find((t) => t.clave === d.tipo)?.texto ?? d.tipo}: {d.nombre}</span>
              </button>
              {perm.comVerTodas && (
                <button type="button" aria-label="Quitar documento" className="text-muted-foreground hover:text-destructive" onClick={() => void quitarDoc(d)}>
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
          {docs.length === 0 && <li className="text-muted-foreground">Sin documentos todavía.</li>}
        </ul>
        {abierta && (
          <div className="flex flex-wrap items-center gap-2">
            <select className={`${campo} sm:w-64`} value={tipoDoc} onChange={(e) => setTipoDoc(e.target.value)}>
              {TIPOS_DOC.map((t) => <option key={t.clave} value={t.clave}>{t.texto}</option>)}
            </select>
            <label className={`${boton} cursor-pointer`}>
              <Upload className="h-4 w-4" /> Adjuntar archivo
              <input type="file" className="hidden" accept="image/*,application/pdf" disabled={ocupado}
                onChange={(e) => { void subirDoc(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
          </div>
        )}
      </div>

      {(perm.comAprobar || perm.comRecibir) && abierta && (
        <div className="space-y-3 rounded-xl border border-glass-border p-3">
          {compra.estado === "negociacion" && perm.comAprobar && (
            <button type="button" className={botonPrimario} disabled={ocupado}
              onClick={() => void ejecutar(() => supabase.rpc("compra_aprobar", { p_compra: compra.id }), "Compra aprobada.", "No se pudo aprobar la compra.")}>
              <CheckCircle2 className="h-4 w-4" /> Aprobar compra
            </button>
          )}
          {compra.estado === "aprobada" && perm.comRecibir && (
            <div className="space-y-2">
              {perm.comEconomico && vigente && <p className="text-xs text-muted-foreground">Aprobada por {vigente.usuario_email}.</p>}
              <input className={campo} placeholder="Notas de la recepción (estado físico, llaves, accesorios…)" value={notasRecepcion} onChange={(e) => setNotasRecepcion(e.target.value)} />
              <button type="button" className={botonPrimario} disabled={ocupado}
                onClick={() => void ejecutar(() => supabase.rpc("compra_recibir", { p_compra: compra.id, p_notas: notasRecepcion || undefined }), "Vehículo recibido e ingresado al inventario.", "No se pudo registrar la recepción.")}>
                <PackageCheck className="h-4 w-4" /> Registrar recepción e ingresar al inventario
              </button>
            </div>
          )}
          {perm.comAprobar && (
            <div className="flex flex-wrap gap-2">
              <input className={`${campo} flex-1`} placeholder="Motivo para cancelar" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
              <button type="button" className={boton} disabled={ocupado}
                onClick={() => void ejecutar(() => supabase.rpc("compra_cancelar", { p_compra: compra.id, p_motivo: motivo }), "Compra cancelada.", "No se pudo cancelar la compra.")}>
                <XCircle className="h-4 w-4" /> Cancelar compra
              </button>
            </div>
          )}
        </div>
      )}

      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Historial</p>
        <ul className="space-y-1 text-xs text-muted-foreground">
          {historial.map((h) => (
            <li key={h.id}>{new Date(h.created_at).toLocaleString("es-CO")} · {h.usuario_email || "sistema"} · {h.detalle}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
