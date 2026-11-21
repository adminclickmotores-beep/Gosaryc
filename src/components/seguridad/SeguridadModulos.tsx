import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";
import { exportarExcel, imprimirReporte } from "@/lib/exportes";
import { Etiqueta, Indicador, Pestanas, SelectorMetodo, hoyISO, msg } from "@/components/negocios/comunes";

type Puesto = Tables<"seg_puestos">;
type Turno = Tables<"seg_turnos">;
type Novedad = Tables<"seg_novedades">;
type Insumo = Tables<"seg_insumos">;
type Entrega = Tables<"seg_entregas">;
type Factura = Tables<"seg_facturas">;
type Vista = "puestos" | "facturacion" | "turnos" | "novedades" | "dotacion";

const TURNOS = [
  { clave: "diurno", texto: "Diurno" },
  { clave: "nocturno", texto: "Nocturno" },
  { clave: "24h", texto: "24 horas" },
];
const TIPOS_NOV = [
  { clave: "ronda", texto: "Ronda realizada" },
  { clave: "incidente", texto: "Incidente" },
  { clave: "queja", texto: "Queja del cliente" },
  { clave: "falta", texto: "Falta o ausencia" },
  { clave: "otro", texto: "Otro" },
];

function PanelSeguridad({ vistaInicial }: { vistaInicial: Vista }) {
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [puestos, setPuestos] = useState<Puesto[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [cargando, setCargando] = useState(true);
  const [hoy, setHoy] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  // puesto
  const [cliente, setCliente] = useState("");
  const [sede, setSede] = useState("");
  const [servicio, setServicio] = useState("Vigilancia");
  const [personal, setPersonal] = useState("1");
  const [turnoPuesto, setTurnoPuesto] = useState("12 horas");
  const [supervisor, setSupervisor] = useState("");
  const [telPuesto, setTelPuesto] = useState("");
  const [valorMes, setValorMes] = useState("");
  // facturación
  const [periodo, setPeriodo] = useState("");
  const [vence, setVence] = useState("");
  const [filtroFact, setFiltroFact] = useState<"pendientes" | "pagadas" | "todas">("pendientes");
  // turnos
  const [tPuesto, setTPuesto] = useState("");
  const [tEmpleado, setTEmpleado] = useState("");
  const [tFecha, setTFecha] = useState("");
  const [tTurno, setTTurno] = useState("diurno");
  const [fechaVer, setFechaVer] = useState("");
  const [reemplazos, setReemplazos] = useState<Record<string, string>>({});
  // novedades
  const [nPuesto, setNPuesto] = useState("");
  const [nTipo, setNTipo] = useState("ronda");
  const [nDetalle, setNDetalle] = useState("");
  const [nAccion, setNAccion] = useState("");
  const [nEmpleado, setNEmpleado] = useState("");
  // dotación
  const [iElemento, setIElemento] = useState("");
  const [iUnidad, setIUnidad] = useState("und");
  const [iStock, setIStock] = useState("");
  const [iCosto, setICosto] = useState("");
  const [iMeses, setIMeses] = useState("4");
  const [eInsumo, setEInsumo] = useState("");
  const [eEmpleado, setEEmpleado] = useState("");
  const [ePuesto, setEPuesto] = useState("");
  const [eCantidad, setECantidad] = useState("1");
  const [eProxima, setEProxima] = useState("");
  const [stockEdit, setStockEdit] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState("");

  useEffect(() => {
    const h = hoyISO();
    setHoy(h);
    setPeriodo(h.slice(0, 7));
    setVence(`${h.slice(0, 8)}10`);
    setTFecha(h);
    setFechaVer(h);
  }, []);

  const cargar = useCallback(async () => {
    const [p, t, n, i, e, f] = await Promise.all([
      supabase.from("seg_puestos").select("*").order("cliente").limit(500),
      supabase.from("seg_turnos").select("*").order("fecha", { ascending: false }).limit(1500),
      supabase.from("seg_novedades").select("*").order("fecha", { ascending: false }).limit(300),
      supabase.from("seg_insumos").select("*").order("elemento").limit(500),
      supabase.from("seg_entregas").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("seg_facturas").select("*").order("periodo", { ascending: false }).order("cliente").limit(1000),
    ]);
    setPuestos(p.data ?? []);
    setTurnos(t.data ?? []);
    setNovedades(n.data ?? []);
    setInsumos(i.data ?? []);
    setEntregas(e.data ?? []);
    setFacturas(f.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const nombrePuesto = useCallback((id: string) => {
    const p = puestos.find((x) => x.id === id);
    return p ? `${p.cliente} · ${p.sede}` : "Puesto";
  }, [puestos]);
  const activos = useMemo(() => puestos.filter((p) => p.activo), [puestos]);

  const crearPuesto = async () => {
    if (cliente.trim().length < 2) return toast.error("Escribe el cliente.");
    if (!sede.trim()) return toast.error("Escribe la sede o el puesto.");
    const { error } = await supabase.from("seg_puestos").insert({
      cliente: cliente.trim(), sede: sede.trim(), servicio, personal_requerido: Math.max(Math.round(num(personal)), 1), turno: turnoPuesto,
      supervisor: supervisor.trim() || null, telefono: telPuesto.trim() || null, valor_mensual: Math.max(num(valorMes), 0),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el puesto."));
    toast.success("Puesto y contrato registrados.");
    setCliente(""); setSede(""); setSupervisor(""); setTelPuesto(""); setValorMes(""); setPersonal("1");
    void cargar();
  };
  const alternarPuesto = async (p: Puesto) => {
    const { error } = await supabase.from("seg_puestos").update({ activo: !p.activo }).eq("id", p.id);
    if (error) return toast.error(msg(error.message, "No se pudo cambiar el puesto."));
    void cargar();
  };

  const facturar = async () => {
    setOcupado("facturar");
    const { data, error } = await supabase.rpc("seg_facturar_mes", { p_periodo: periodo, p_vence: vence });
    setOcupado("");
    if (error) return toast.error(msg(error.message, "No se pudo facturar el mes."));
    const r = (data ?? {}) as { facturas?: number; total?: number };
    toast.success(`Se generaron ${r.facturas ?? 0} cuentas de cobro por ${dinero(r.total ?? 0)}. Quedaron en cartera y en Contabilidad.`);
    void cargar();
  };
  const cobrar = async (f: Factura) => {
    setOcupado(f.id);
    const { error } = await supabase.rpc("seg_cobrar_factura", { p_factura: f.id, p_metodo: metodo });
    setOcupado("");
    if (error) return toast.error(msg(error.message, "No se pudo registrar el recaudo."));
    toast.success(`Recaudo de ${dinero(f.valor)} a Caja.`);
    void cargar();
  };
  const imprimirCuenta = (f: Factura) =>
    imprimirReporte(`Cuenta de cobro ${f.periodo}`, `${f.cliente} · ${f.sede}`, ["Concepto", "Valor"], [[`Servicio de vigilancia / aseo ${f.periodo}`, dinero(f.valor)]], [`Total: ${dinero(f.valor)}`, `Vence: ${f.vence}`]);

  const programar = async () => {
    if (!tPuesto) return toast.error("Elige el puesto.");
    if (tEmpleado.trim().length < 2) return toast.error("Escribe el nombre del vigilante o auxiliar.");
    const { error } = await supabase.from("seg_turnos").insert({ puesto_id: tPuesto, empleado: tEmpleado.trim(), fecha: tFecha, turno: tTurno });
    if (error) return toast.error(error.code === "23505" ? "Esa persona ya tiene ese turno ese día." : msg(error.message, "No se pudo programar el turno."));
    toast.success("Turno programado.");
    setTEmpleado("");
    void cargar();
  };
  const cambiarTurno = async (t: Turno, estado: string) => {
    const reemplazo = estado === "reemplazo" ? (reemplazos[t.id] ?? "").trim() : "";
    if (estado === "reemplazo" && reemplazo.length < 2) return toast.error("Escribe quién cubre el reemplazo.");
    const { error } = await supabase.from("seg_turnos").update({ estado, reemplazo: reemplazo || null }).eq("id", t.id);
    if (error) return toast.error(msg(error.message, "No se pudo actualizar el turno."));
    void cargar();
  };

  const registrarNovedad = async () => {
    if (!nPuesto) return toast.error("Elige el puesto.");
    if (nDetalle.trim().length < 2) return toast.error("Describe la novedad.");
    const { error } = await supabase.from("seg_novedades").insert({ puesto_id: nPuesto, tipo: nTipo, detalle: nDetalle.trim(), accion: nAccion.trim() || null, empleado: nEmpleado.trim() || null });
    if (error) return toast.error(msg(error.message, "No se pudo registrar la novedad."));
    toast.success("Novedad registrada en la bitácora.");
    setNDetalle(""); setNAccion(""); setNEmpleado("");
    void cargar();
  };

  const crearInsumo = async () => {
    if (iElemento.trim().length < 2) return toast.error("Escribe el elemento (uniforme, botas, insumo de aseo…).");
    const { error } = await supabase.from("seg_insumos").insert({ elemento: iElemento.trim(), unidad: iUnidad.trim() || "und", stock: Math.max(num(iStock), 0), costo: Math.max(num(iCosto), 0), meses_reposicion: Math.max(Math.round(num(iMeses)), 0) });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el elemento."));
    toast.success("Elemento agregado al inventario de dotación.");
    setIElemento(""); setIStock(""); setICosto("");
    void cargar();
  };
  const guardarStock = async (i: Insumo) => {
    const v = stockEdit[i.id];
    if (v === undefined) return;
    const { error } = await supabase.from("seg_insumos").update({ stock: Math.max(num(v), 0) }).eq("id", i.id);
    if (error) return toast.error(msg(error.message, "No se pudo actualizar el inventario."));
    setStockEdit((e) => {
      const { [i.id]: _omitido, ...resto } = e;
      return resto;
    });
    void cargar();
  };
  const entregar = async () => {
    if (!eInsumo) return toast.error("Elige el elemento.");
    setOcupado("entregar");
    const { data, error } = await supabase.rpc("seg_entregar", { p_insumo: eInsumo, p_empleado: eEmpleado.trim(), p_puesto: ePuesto.trim(), p_cantidad: num(eCantidad), p_proxima: eProxima || null });
    setOcupado("");
    if (error) return toast.error(msg(error.message, "No se pudo registrar la entrega."));
    toast.success(`Entrega registrada. Salió del inventario y quedó como gasto por ${dinero(Number(data ?? 0))}.`);
    setEEmpleado(""); setECantidad("1"); setEProxima("");
    void cargar();
  };

  if (cargando) return <Cargando />;
  const factMes = facturas.filter((f) => f.periodo === periodo);
  const pendienteTotal = facturas.filter((f) => f.estado === "pendiente").reduce((s, f) => s + f.valor, 0);
  const listaFact = facturas.filter((f) => (filtroFact === "todas" ? true : filtroFact === "pagadas" ? f.estado === "pagada" : f.estado === "pendiente"));
  const turnosDia = turnos.filter((t) => t.fecha === fechaVer);
  const bajoStock = insumos.filter((i) => i.activo && i.stock <= 0).length;

  return (
    <div className="space-y-6">
      <Encabezado titulo="Seguridad y servicios generales" texto="Puestos y contratos recurrentes, turnos del personal con cobertura, bitácora de novedades y rondas, dotación entregada desde el inventario y facturación mensual a Caja y Contabilidad." />
      <Pestanas items={[{ clave: "puestos", texto: "Puestos y contratos" }, { clave: "facturacion", texto: "Facturación mensual" }, { clave: "turnos", texto: "Turnos y reemplazos" }, { clave: "novedades", texto: "Bitácora de novedades" }, { clave: "dotacion", texto: "Dotación e insumos" }]} valor={vista} onChange={setVista} />

      {vista === "puestos" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Indicador titulo="Puestos activos" valor={activos.length} />
            <Indicador titulo="Personal requerido" valor={activos.reduce((s, p) => s + p.personal_requerido, 0)} />
            <Indicador titulo="Facturación mensual" valor={dinero(activos.reduce((s, p) => s + p.valor_mensual, 0))} />
          </div>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Nuevo puesto o contrato</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etiqueta="Cliente *"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
              <Campo etiqueta="Sede / puesto *"><input className={campo} value={sede} onChange={(e) => setSede(e.target.value)} placeholder="Ej. Portería principal" /></Campo>
              <Campo etiqueta="Servicio"><select className={campo} value={servicio} onChange={(e) => setServicio(e.target.value)}><option>Vigilancia</option><option>Aseo</option><option>Servicios generales</option><option>Escolta / transporte</option></select></Campo>
              <Campo etiqueta="Personal requerido"><input className={campo} inputMode="numeric" value={personal} onChange={(e) => setPersonal(e.target.value)} /></Campo>
              <Campo etiqueta="Jornada"><select className={campo} value={turnoPuesto} onChange={(e) => setTurnoPuesto(e.target.value)}><option>12 horas</option><option>8 horas</option><option>24 horas</option><option>Lunes a viernes</option></select></Campo>
              <Campo etiqueta="Supervisor"><input className={campo} value={supervisor} onChange={(e) => setSupervisor(e.target.value)} /></Campo>
              <Campo etiqueta="Teléfono del cliente"><input className={campo} inputMode="tel" value={telPuesto} onChange={(e) => setTelPuesto(e.target.value)} /></Campo>
              <Campo etiqueta="Valor mensual del contrato"><input className={campo} inputMode="decimal" value={valorMes} onChange={(e) => setValorMes(e.target.value)} /></Campo>
            </div>
            <button type="button" className={boton} onClick={() => void crearPuesto()}>Guardar puesto</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            {puestos.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay puestos.</p> : puestos.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-foreground">{p.cliente} · {p.sede}</p>
                  <p className="break-words text-xs text-muted-foreground">{p.servicio} · {p.personal_requerido} persona(s) · {p.turno} · supervisor {p.supervisor ?? "—"} · {dinero(p.valor_mensual)} al mes</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!p.activo && <Etiqueta texto="Inactivo" tono="alerta" />}
                  <button type="button" className={botonSec} onClick={() => void alternarPuesto(p)}>{p.activo ? "Terminar contrato" : "Reactivar"}</button>
                </div>
              </div>
            ))}
          </GlassPanel>
        </>
      )}

      {vista === "facturacion" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Indicador titulo={`Facturado ${periodo}`} valor={dinero(factMes.reduce((s, f) => s + f.valor, 0))} />
            <Indicador titulo="Cartera pendiente" valor={dinero(pendienteTotal)} alerta={pendienteTotal > 0} />
            <Indicador titulo="Puestos activos" valor={activos.length} />
          </div>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Facturación mensual automática</h2>
            <p className="text-xs text-muted-foreground">Genera una cuenta de cobro por cada puesto activo con valor mensual. No duplica y registra la cartera en Contabilidad.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Campo etiqueta="Periodo"><input type="month" className={campo} value={periodo} onChange={(e) => setPeriodo(e.target.value)} /></Campo>
              <Campo etiqueta="Vence el"><input type="date" className={campo} value={vence} onChange={(e) => setVence(e.target.value)} /></Campo>
            </div>
            <button type="button" className={boton} disabled={ocupado === "facturar"} onClick={() => void facturar()}>{ocupado === "facturar" ? "Generando…" : "Generar facturación del mes"}</button>
          </GlassPanel>
          <div className="flex flex-wrap items-end gap-3">
            <Campo etiqueta="Mostrar"><select className={campo} value={filtroFact} onChange={(e) => setFiltroFact(e.target.value as "pendientes" | "pagadas" | "todas")}><option value="pendientes">Pendientes</option><option value="pagadas">Pagadas</option><option value="todas">Todas</option></select></Campo>
            <Campo etiqueta="Recibir con"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
            <button type="button" className={botonSec} onClick={() => exportarExcel("facturacion-seguridad", ["Periodo", "Cliente", "Sede", "Valor", "Vence", "Estado"], listaFact.map((f) => [f.periodo, f.cliente, f.sede, f.valor, f.vence, f.estado]))}>Descargar Excel</button>
          </div>
          <GlassPanel className="space-y-2 p-4">
            {listaFact.length === 0 ? <p className="text-sm text-muted-foreground">No hay cuentas de cobro para mostrar.</p> : listaFact.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-foreground">{f.cliente} · {f.sede}</p>
                  <p className="text-xs text-muted-foreground">Periodo {f.periodo} · vence {f.vence}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-foreground">{dinero(f.valor)}</span>
                  {f.estado === "pendiente" && !!hoy && f.vence < hoy && <Etiqueta texto="Vencida" tono="alerta" />}
                  <button type="button" className={botonSec} onClick={() => imprimirCuenta(f)}>Imprimir</button>
                  {f.estado === "pagada" ? <Etiqueta texto="Pagada" tono="ok" /> : <button type="button" className={boton} disabled={ocupado === f.id} onClick={() => void cobrar(f)}>Recaudar a Caja</button>}
                </div>
              </div>
            ))}
          </GlassPanel>
        </>
      )}

      {vista === "turnos" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Programar turno</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etiqueta="Puesto *"><select className={campo} value={tPuesto} onChange={(e) => setTPuesto(e.target.value)}><option value="">Elige…</option>{activos.map((p) => <option key={p.id} value={p.id}>{p.cliente} · {p.sede}</option>)}</select></Campo>
              <Campo etiqueta="Persona *"><input className={campo} value={tEmpleado} onChange={(e) => setTEmpleado(e.target.value)} /></Campo>
              <Campo etiqueta="Fecha"><input type="date" className={campo} value={tFecha} onChange={(e) => setTFecha(e.target.value)} /></Campo>
              <Campo etiqueta="Turno"><select className={campo} value={tTurno} onChange={(e) => setTTurno(e.target.value)}>{TURNOS.map((t) => <option key={t.clave} value={t.clave}>{t.texto}</option>)}</select></Campo>
            </div>
            <button type="button" className={boton} onClick={() => void programar()}>Programar</button>
          </GlassPanel>
          <Campo etiqueta="Ver programación del día"><input type="date" className={`${campo} !w-48`} value={fechaVer} onChange={(e) => setFechaVer(e.target.value)} /></Campo>
          <GlassPanel className="space-y-3 p-4">
            {activos.length === 0 ? <p className="text-sm text-muted-foreground">Primero registra los puestos.</p> : activos.map((p) => {
              const delPuesto = turnosDia.filter((t) => t.puesto_id === p.id);
              const cubiertos = delPuesto.filter((t) => t.estado !== "falta").length;
              const falta = cubiertos < p.personal_requerido;
              return (
                <div key={p.id} className="space-y-2 rounded-xl border border-glass-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="break-words text-sm font-semibold text-foreground">{p.cliente} · {p.sede}</p>
                    <Etiqueta texto={`Cobertura ${cubiertos}/${p.personal_requerido}`} tono={falta ? "alerta" : "ok"} />
                  </div>
                  {delPuesto.length === 0 ? <p className="text-xs text-muted-foreground">Sin turnos programados este día.</p> : delPuesto.map((t) => (
                    <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 break-words text-foreground">{t.empleado} · {TURNOS.find((x) => x.clave === t.turno)?.texto}{t.reemplazo ? ` (cubre ${t.reemplazo})` : ""}</span>
                      <span className="flex flex-wrap items-center gap-2">
                        <Etiqueta texto={t.estado === "programado" ? "Programado" : t.estado === "cubierto" ? "Cubierto" : t.estado === "reemplazo" ? "Reemplazo" : "Falta"} tono={t.estado === "falta" ? "alerta" : t.estado === "programado" ? "neutro" : "ok"} />
                        <button type="button" className={botonSec} onClick={() => void cambiarTurno(t, "cubierto")}>Cubierto</button>
                        <button type="button" className={botonSec} onClick={() => void cambiarTurno(t, "falta")}>Faltó</button>
                        <input className={`${campo} !w-36`} aria-label="Quién cubre" placeholder="Quién reemplaza" value={reemplazos[t.id] ?? ""} onChange={(e) => setReemplazos((r) => ({ ...r, [t.id]: e.target.value }))} />
                        <button type="button" className={botonSec} onClick={() => void cambiarTurno(t, "reemplazo")}>Reemplazar</button>
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </GlassPanel>
        </>
      )}

      {vista === "novedades" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Registrar novedad o ronda</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etiqueta="Puesto *"><select className={campo} value={nPuesto} onChange={(e) => setNPuesto(e.target.value)}><option value="">Elige…</option>{activos.map((p) => <option key={p.id} value={p.id}>{p.cliente} · {p.sede}</option>)}</select></Campo>
              <Campo etiqueta="Tipo"><select className={campo} value={nTipo} onChange={(e) => setNTipo(e.target.value)}>{TIPOS_NOV.map((t) => <option key={t.clave} value={t.clave}>{t.texto}</option>)}</select></Campo>
              <Campo etiqueta="Reportó"><input className={campo} value={nEmpleado} onChange={(e) => setNEmpleado(e.target.value)} /></Campo>
              <Campo etiqueta="Detalle *"><input className={campo} value={nDetalle} onChange={(e) => setNDetalle(e.target.value)} /></Campo>
              <Campo etiqueta="Acción tomada"><input className={campo} value={nAccion} onChange={(e) => setNAccion(e.target.value)} /></Campo>
            </div>
            <button type="button" className={boton} onClick={() => void registrarNovedad()}>Guardar en la bitácora</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Bitácora</h2>
              <button type="button" className={botonSec} onClick={() => exportarExcel("bitacora-seguridad", ["Fecha", "Puesto", "Tipo", "Detalle", "Acción", "Reportó"], novedades.map((n) => [n.fecha.slice(0, 16).replace("T", " "), nombrePuesto(n.puesto_id), n.tipo, n.detalle, n.accion ?? "", n.empleado ?? ""]))}>Descargar Excel</button>
            </div>
            {novedades.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay novedades.</p> : novedades.map((n) => (
              <div key={n.id} className="rounded-xl border border-glass-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="break-words text-sm font-semibold text-foreground">{nombrePuesto(n.puesto_id)}</p>
                  <Etiqueta texto={TIPOS_NOV.find((t) => t.clave === n.tipo)?.texto ?? n.tipo} tono={n.tipo === "incidente" || n.tipo === "queja" || n.tipo === "falta" ? "alerta" : "neutro"} />
                </div>
                <p className="break-words text-sm text-foreground">{n.detalle}</p>
                <p className="text-xs text-muted-foreground">{n.fecha.slice(0, 16).replace("T", " ")}{n.empleado ? ` · ${n.empleado}` : ""}{n.accion ? ` · Acción: ${n.accion}` : ""}</p>
              </div>
            ))}
          </GlassPanel>
        </>
      )}

      {vista === "dotacion" && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Indicador titulo="Elementos" valor={insumos.filter((i) => i.activo).length} />
            <Indicador titulo="Agotados" valor={bajoStock} alerta={bajoStock > 0} />
            <Indicador titulo="Entregas registradas" valor={entregas.length} />
          </div>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Inventario de dotación e insumos</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Campo etiqueta="Elemento *"><input className={campo} value={iElemento} onChange={(e) => setIElemento(e.target.value)} placeholder="Ej. Botas, uniforme, escoba" /></Campo>
              <Campo etiqueta="Unidad"><input className={campo} value={iUnidad} onChange={(e) => setIUnidad(e.target.value)} /></Campo>
              <Campo etiqueta="Existencias"><input className={campo} inputMode="decimal" value={iStock} onChange={(e) => setIStock(e.target.value)} /></Campo>
              <Campo etiqueta="Costo unitario"><input className={campo} inputMode="decimal" value={iCosto} onChange={(e) => setICosto(e.target.value)} /></Campo>
              <Campo etiqueta="Reposición cada (meses)"><input className={campo} inputMode="numeric" value={iMeses} onChange={(e) => setIMeses(e.target.value)} /></Campo>
            </div>
            <button type="button" className={boton} onClick={() => void crearInsumo()}>Agregar elemento</button>
            {insumos.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
                <p className="min-w-0 break-words text-sm text-foreground">{i.elemento} · {dinero(i.costo)} por {i.unidad}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {i.stock <= 0 && <Etiqueta texto="Agotado" tono="alerta" />}
                  <input className={`${campo} !w-28`} aria-label="Existencias" inputMode="decimal" value={stockEdit[i.id] ?? String(i.stock)} onChange={(e) => setStockEdit((x) => ({ ...x, [i.id]: e.target.value }))} />
                  {stockEdit[i.id] !== undefined && <button type="button" className={botonSec} onClick={() => void guardarStock(i)}>Guardar</button>}
                </div>
              </div>
            ))}
          </GlassPanel>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Entregar dotación</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Campo etiqueta="Elemento *"><select className={campo} value={eInsumo} onChange={(e) => setEInsumo(e.target.value)}><option value="">Elige…</option>{insumos.filter((i) => i.activo).map((i) => <option key={i.id} value={i.id}>{i.elemento} (hay {i.stock})</option>)}</select></Campo>
              <Campo etiqueta="Recibe *"><input className={campo} value={eEmpleado} onChange={(e) => setEEmpleado(e.target.value)} /></Campo>
              <Campo etiqueta="Puesto"><input className={campo} value={ePuesto} onChange={(e) => setEPuesto(e.target.value)} /></Campo>
              <Campo etiqueta="Cantidad"><input className={campo} inputMode="decimal" value={eCantidad} onChange={(e) => setECantidad(e.target.value)} /></Campo>
              <Campo etiqueta="Próxima entrega"><input type="date" className={campo} value={eProxima} onChange={(e) => setEProxima(e.target.value)} /></Campo>
            </div>
            <button type="button" className={boton} disabled={ocupado === "entregar"} onClick={() => void entregar()}>Registrar entrega</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Entregas y próximas reposiciones</h2>
              <button type="button" className={botonSec} onClick={() => exportarExcel("dotacion-entregada", ["Fecha", "Elemento", "Recibe", "Puesto", "Cantidad", "Costo", "Próxima entrega"], entregas.map((e) => [e.fecha, e.elemento, e.empleado, e.puesto ?? "", e.cantidad, e.costo_total, e.proxima_entrega ?? ""]))}>Descargar Excel</button>
            </div>
            {entregas.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay entregas.</p> : entregas.map((e) => (
              <p key={e.id} className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
                <span className="min-w-0 break-words">{e.fecha} · {e.elemento} x{e.cantidad} → {e.empleado}{e.puesto ? ` (${e.puesto})` : ""}</span>
                <span className={e.proxima_entrega && hoy && e.proxima_entrega < hoy ? "text-destructive" : "text-foreground"}>Próxima: {e.proxima_entrega ?? "—"}</span>
              </p>
            ))}
          </GlassPanel>
        </>
      )}
    </div>
  );
}

export function PuestosSeguridad() {
  return <PanelSeguridad vistaInicial="puestos" />;
}
export function TurnosSeguridad() {
  return <PanelSeguridad vistaInicial="turnos" />;
}
export function DotacionSeguridad() {
  return <PanelSeguridad vistaInicial="dotacion" />;
}
export function NovedadesSeguridad() {
  return <PanelSeguridad vistaInicial="novedades" />;
}
