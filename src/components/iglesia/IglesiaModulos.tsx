import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";
import { exportarExcel, imprimirReporte } from "@/lib/exportes";
import { Etiqueta, Indicador, Pestanas, SelectorMetodo, hoyISO, msg } from "@/components/negocios/comunes";

type Miembro = Tables<"igl_miembros">;
type Grupo = Tables<"igl_grupos">;
type Ingreso = Tables<"igl_ingresos">;
type Egreso = Tables<"igl_egresos">;
type Cierre = Tables<"igl_cierres">;
type Evento = Tables<"igl_eventos">;
type Visita = Tables<"igl_visitas">;
type Vista = "miembros" | "grupos" | "ingresos" | "egresos" | "cierre" | "eventos" | "visitas";

const CONCEPTOS = [
  { clave: "diezmo", texto: "Diezmo" },
  { clave: "ofrenda", texto: "Ofrenda" },
  { clave: "primicia", texto: "Primicia" },
  { clave: "evento", texto: "Evento" },
];
const FONDOS_BASE = ["General", "Obra social", "Construcción", "Misiones"];
const TIPOS_VISITA = [
  { clave: "nuevo", texto: "Nuevo en la iglesia" },
  { clave: "hospital", texto: "Visita al hospital" },
  { clave: "consejeria", texto: "Consejería" },
  { clave: "hogar", texto: "Visita al hogar" },
];

function PanelIglesia({ vistaInicial }: { vistaInicial: Vista }) {
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [miembros, setMiembros] = useState<Miembro[]>([]);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [ingresos, setIngresos] = useState<Ingreso[]>([]);
  const [egresos, setEgresos] = useState<Egreso[]>([]);
  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [entidad, setEntidad] = useState("");
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [hoy, setHoy] = useState("");
  // miembros
  const [mNombre, setMNombre] = useState("");
  const [mDoc, setMDoc] = useState("");
  const [mTel, setMTel] = useState("");
  const [mFamilia, setMFamilia] = useState("");
  const [mMinisterio, setMMinisterio] = useState("");
  const [mBautizo, setMBautizo] = useState("");
  const [mFiltro, setMFiltro] = useState("");
  // grupos
  const [gNombre, setGNombre] = useState("");
  const [gTipo, setGTipo] = useState("ministerio");
  const [gLider, setGLider] = useState("");
  const [gDia, setGDia] = useState("");
  // ingresos
  const [iMiembro, setIMiembro] = useState("");
  const [iNombre, setINombre] = useState("");
  const [iConcepto, setIConcepto] = useState("diezmo");
  const [iFondo, setIFondo] = useState("General");
  const [iValor, setIValor] = useState("");
  const [iMetodo, setIMetodo] = useState("efectivo");
  const [iCulto, setICulto] = useState("");
  const [iFecha, setIFecha] = useState("");
  const [iEvento, setIEvento] = useState("");
  // egresos
  const [eFondo, setEFondo] = useState("General");
  const [eConcepto, setEConcepto] = useState("");
  const [eObra, setEObra] = useState(false);
  const [eValor, setEValor] = useState("");
  const [eMetodo, setEMetodo] = useState("efectivo");
  const [eCulto, setECulto] = useState("");
  const [eFecha, setEFecha] = useState("");
  const [eEvento, setEEvento] = useState("");
  // cierre
  const [cCulto, setCCulto] = useState("");
  const [cDesde, setCDesde] = useState("");
  const [cHasta, setCHasta] = useState("");
  // eventos
  const [vNombre, setVNombre] = useState("");
  const [vFecha, setVFecha] = useState("");
  const [vLugar, setVLugar] = useState("");
  const [vPresupuesto, setVPresupuesto] = useState("");
  // visitas
  const [sPersona, setSPersona] = useState("");
  const [sTipo, setSTipo] = useState("nuevo");
  const [sFecha, setSFecha] = useState("");
  const [sResp, setSResp] = useState("");
  const [sNotas, setSNotas] = useState("");

  useEffect(() => {
    const h = hoyISO();
    setHoy(h);
    setIFecha(h); setEFecha(h); setVFecha(h); setSFecha(h);
    setCDesde(`${h.slice(0, 8)}01`);
    setCHasta(h);
  }, []);

  const cargar = useCallback(async () => {
    const [m, g, i, e, c, ev, v, cfg] = await Promise.all([
      supabase.from("igl_miembros").select("*").order("nombre").limit(3000),
      supabase.from("igl_grupos").select("*").order("nombre").limit(300),
      supabase.from("igl_ingresos").select("*").order("fecha", { ascending: false }).order("created_at", { ascending: false }).limit(4000),
      supabase.from("igl_egresos").select("*").order("fecha", { ascending: false }).limit(2000),
      supabase.from("igl_cierres").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("igl_eventos").select("*").order("fecha", { ascending: false }).limit(300),
      supabase.from("igl_visitas").select("*").order("fecha", { ascending: false }).limit(500),
      supabase.from("negocio_config").select("nombre").limit(1),
    ]);
    setMiembros(m.data ?? []);
    setGrupos(g.data ?? []);
    setIngresos(i.data ?? []);
    setEgresos(e.data ?? []);
    setCierres(c.data ?? []);
    setEventos(ev.data ?? []);
    setVisitas(v.data ?? []);
    setEntidad(cfg.data?.[0]?.nombre ?? "");
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const fondos = useMemo(() => Array.from(new Set([...FONDOS_BASE, ...ingresos.map((x) => x.fondo), ...egresos.map((x) => x.fondo)])).sort(), [ingresos, egresos]);
  const saldoFondo = useCallback((f: string) => ingresos.filter((x) => x.fondo === f).reduce((s, x) => s + x.valor, 0) - egresos.filter((x) => x.fondo === f).reduce((s, x) => s + x.valor, 0), [ingresos, egresos]);
  const miembrosActivos = useMemo(() => miembros.filter((m) => m.activo), [miembros]);

  const crearMiembro = async () => {
    if (mNombre.trim().length < 2) return toast.error("Escribe el nombre.");
    const { error } = await supabase.from("igl_miembros").insert({ nombre: mNombre.trim(), documento: mDoc.trim() || null, telefono: mTel.trim() || null, familia: mFamilia.trim() || null, ministerio: mMinisterio.trim() || null, fecha_bautizo: mBautizo || null });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el miembro."));
    toast.success("Miembro registrado.");
    setMNombre(""); setMDoc(""); setMTel(""); setMBautizo("");
    void cargar();
  };
  const alternarMiembro = async (m: Miembro) => {
    const { error } = await supabase.from("igl_miembros").update({ activo: !m.activo }).eq("id", m.id);
    if (error) return toast.error(msg(error.message, "No se pudo cambiar."));
    void cargar();
  };

  const crearGrupo = async () => {
    if (gNombre.trim().length < 2) return toast.error("Escribe el nombre del grupo o ministerio.");
    const { error } = await supabase.from("igl_grupos").insert({ nombre: gNombre.trim(), tipo: gTipo, lider: gLider.trim() || null, dia_reunion: gDia.trim() || null });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el grupo."));
    toast.success("Grupo registrado.");
    setGNombre(""); setGLider(""); setGDia("");
    void cargar();
  };

  const ingresar = async () => {
    if (num(iValor) <= 0) return toast.error("Escribe el valor.");
    if (!iMiembro && iNombre.trim().length < 2 && iConcepto !== "ofrenda") return toast.error("Elige el miembro o escribe el nombre de quien aporta.");
    setOcupado(true);
    const { data, error } = await supabase.rpc("igl_ingresar", {
      p_miembro: iMiembro || null, p_nombre: iNombre.trim(), p_concepto: iConcepto, p_fondo: iFondo.trim(), p_valor: num(iValor), p_metodo: iMetodo,
      p_culto: iCulto.trim(), p_fecha: iFecha, p_evento: iConcepto === "evento" ? iEvento : "",
    });
    setOcupado(false);
    if (error) return toast.error(msg(error.message, "No se pudo registrar el ingreso."));
    const r = (data ?? {}) as { recibo?: string };
    toast.success(`Ingreso registrado (${r.recibo ?? ""}). Entró a Caja y a Contabilidad.`);
    const quien = miembros.find((m) => m.id === iMiembro)?.nombre ?? (iNombre.trim() || "Anónimo");
    imprimirReporte(`Recibo ${r.recibo ?? ""}`, `${entidad || "Iglesia"} · ${quien}`, ["Concepto", "Fondo", "Valor"], [[CONCEPTOS.find((c) => c.clave === iConcepto)?.texto ?? iConcepto, iFondo, dinero(num(iValor))]], [`Fecha: ${iFecha}`, "Gracias por su aporte."]);
    setIValor(""); setINombre(""); setIMiembro("");
    void cargar();
  };

  const egresar = async () => {
    if (num(eValor) <= 0) return toast.error("Escribe el valor.");
    setOcupado(true);
    const { error } = await supabase.rpc("igl_egresar", { p_fondo: eFondo.trim(), p_concepto: eConcepto.trim(), p_obra_social: eObra, p_valor: num(eValor), p_metodo: eMetodo, p_culto: eCulto.trim(), p_fecha: eFecha, p_evento: eEvento });
    setOcupado(false);
    if (error) return toast.error(msg(error.message, "No se pudo registrar el egreso."));
    toast.success("Egreso registrado: salió de Caja y del fondo elegido.");
    setEConcepto(""); setEValor("");
    void cargar();
  };

  const filtrarPeriodo = <T extends { fecha: string; culto: string }>(filas: T[]): T[] => filas.filter((x) => x.fecha >= cDesde && x.fecha <= cHasta && (cCulto.trim() === "" || x.culto === cCulto.trim()));
  const ingPeriodo = filtrarPeriodo(ingresos);
  const egrPeriodo = filtrarPeriodo(egresos);
  const sumaConcepto = (c: string) => ingPeriodo.filter((x) => x.concepto === c).reduce((s, x) => s + x.valor, 0);
  const totIng = ingPeriodo.reduce((s, x) => s + x.valor, 0);
  const totEgr = egrPeriodo.reduce((s, x) => s + x.valor, 0);

  const cerrar = async () => {
    setOcupado(true);
    const { error } = await supabase.rpc("igl_cerrar", { p_culto: cCulto.trim(), p_desde: cDesde, p_hasta: cHasta });
    setOcupado(false);
    if (error) return toast.error(msg(error.message, "No se pudo hacer el cierre."));
    toast.success("Cierre contable guardado. Ese culto o periodo ya no admite más movimientos.");
    void cargar();
  };
  const imprimirCierre = (c: Cierre) => {
    const filasFondo = Array.isArray(c.por_fondo) ? (c.por_fondo as Array<{ fondo?: string; ingresos?: number; egresos?: number }>) : [];
    imprimirReporte(`Cierre ${c.culto || "general"} ${c.desde} a ${c.hasta}`, entidad || "Iglesia",
      ["Concepto", "Valor"],
      [["Diezmos", dinero(c.diezmos)], ["Ofrendas", dinero(c.ofrendas)], ["Primicias", dinero(c.primicias)], ["Eventos", dinero(c.eventos)], ["Egresos", `-${dinero(c.egresos)}`],
       ...filasFondo.map((f): string[] => [`Fondo ${f.fondo ?? ""}`, `Ingresos ${dinero(f.ingresos ?? 0)} · Egresos ${dinero(f.egresos ?? 0)}`])],
      [`Neto del cierre: ${dinero(c.neto)}`, "Tesorero: ____________________   Pastor: ____________________"]);
  };

  const crearEvento = async () => {
    if (vNombre.trim().length < 2) return toast.error("Escribe el nombre del evento.");
    const { error } = await supabase.from("igl_eventos").insert({ nombre: vNombre.trim(), fecha: vFecha, lugar: vLugar.trim() || null, presupuesto: Math.max(num(vPresupuesto), 0) });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el evento."));
    toast.success("Evento programado.");
    setVNombre(""); setVLugar(""); setVPresupuesto("");
    void cargar();
  };
  const estadoEvento = async (e: Evento, estado: string) => {
    const { error } = await supabase.from("igl_eventos").update({ estado }).eq("id", e.id);
    if (error) return toast.error(msg(error.message, "No se pudo cambiar el evento."));
    void cargar();
  };

  const crearVisita = async () => {
    if (sPersona.trim().length < 2) return toast.error("Escribe a quién se visita.");
    const { error } = await supabase.from("igl_visitas").insert({ persona: sPersona.trim(), tipo: sTipo, fecha: sFecha, responsable: sResp.trim() || null, notas: sNotas.trim() || null });
    if (error) return toast.error(msg(error.message, "No se pudo guardar la visita."));
    toast.success("Visita registrada.");
    setSPersona(""); setSNotas("");
    void cargar();
  };
  const marcarVisita = async (v: Visita) => {
    const { error } = await supabase.from("igl_visitas").update({ seguimiento: v.seguimiento === "hecho" ? "pendiente" : "hecho" }).eq("id", v.id);
    if (error) return toast.error(msg(error.message, "No se pudo actualizar."));
    void cargar();
  };

  if (cargando) return <Cargando />;
  const familias = new Set(miembrosActivos.map((m) => m.familia).filter((f): f is string => !!f)).size;
  const miembrosVer = miembros.filter((m) => (mFiltro ? m.ministerio === mFiltro || m.grupo === mFiltro : true));
  const mesActual = hoy.slice(0, 7);
  const ingMes = ingresos.filter((x) => x.fecha.slice(0, 7) === mesActual).reduce((s, x) => s + x.valor, 0);

  return (
    <div className="space-y-6">
      <Encabezado titulo="Administración de la iglesia" texto="Miembros, familias y ministerios; diezmos, ofrendas, primicias y eventos separados por fondo; egresos de obra social y cierre contable por culto o periodo." />
      <Pestanas items={[{ clave: "miembros", texto: "Miembros y familias" }, { clave: "grupos", texto: "Ministerios y grupos" }, { clave: "ingresos", texto: "Diezmos, ofrendas y aportes" }, { clave: "egresos", texto: "Egresos y obra social" }, { clave: "cierre", texto: "Cierre por culto o periodo" }, { clave: "eventos", texto: "Eventos" }, { clave: "visitas", texto: "Visitas pastorales" }]} valor={vista} onChange={setVista} />

      <div className="grid gap-3 sm:grid-cols-4">
        <Indicador titulo="Miembros activos" valor={miembrosActivos.length} nota={`${familias} familias`} />
        <Indicador titulo="Ingresos del mes" valor={dinero(ingMes)} />
        {fondos.slice(0, 2).map((f) => <Indicador key={f} titulo={`Fondo ${f}`} valor={dinero(saldoFondo(f))} />)}
      </div>

      {vista === "miembros" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Nuevo miembro</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Campo etiqueta="Nombre *"><input className={campo} value={mNombre} onChange={(e) => setMNombre(e.target.value)} /></Campo>
              <Campo etiqueta="Documento"><input className={campo} value={mDoc} onChange={(e) => setMDoc(e.target.value)} /></Campo>
              <Campo etiqueta="Teléfono"><input className={campo} inputMode="tel" value={mTel} onChange={(e) => setMTel(e.target.value)} /></Campo>
              <Campo etiqueta="Familia"><input className={campo} list="lista-familias" value={mFamilia} onChange={(e) => setMFamilia(e.target.value)} placeholder="Ej. Familia Pérez" /></Campo>
              <Campo etiqueta="Ministerio / grupo"><input className={campo} list="lista-grupos" value={mMinisterio} onChange={(e) => setMMinisterio(e.target.value)} /></Campo>
              <Campo etiqueta="Fecha de bautizo"><input type="date" className={campo} value={mBautizo} onChange={(e) => setMBautizo(e.target.value)} /></Campo>
            </div>
            <datalist id="lista-familias">{Array.from(new Set(miembros.map((m) => m.familia).filter((f): f is string => !!f))).map((f) => <option key={f} value={f} />)}</datalist>
            <datalist id="lista-grupos">{grupos.map((g) => <option key={g.id} value={g.nombre} />)}</datalist>
            <button type="button" className={boton} onClick={() => void crearMiembro()}>Guardar miembro</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <Campo etiqueta="Filtrar por ministerio o grupo"><select className={campo} value={mFiltro} onChange={(e) => setMFiltro(e.target.value)}><option value="">Todos</option>{grupos.map((g) => <option key={g.id} value={g.nombre}>{g.nombre}</option>)}</select></Campo>
              <button type="button" className={botonSec} onClick={() => exportarExcel("miembros", ["Nombre", "Documento", "Teléfono", "Familia", "Ministerio", "Bautizo"], miembrosVer.map((m) => [m.nombre, m.documento ?? "", m.telefono ?? "", m.familia ?? "", m.ministerio ?? "", m.fecha_bautizo ?? ""]))}>Descargar Excel</button>
            </div>
            {miembrosVer.length === 0 ? <p className="text-sm text-muted-foreground">No hay miembros.</p> : miembrosVer.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
                <p className="min-w-0 break-words text-sm text-foreground">{m.nombre}{m.familia ? ` · ${m.familia}` : ""}{m.ministerio ? ` · ${m.ministerio}` : ""}{m.telefono ? ` · ${m.telefono}` : ""}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {!m.activo && <Etiqueta texto="Inactivo" tono="neutro" />}
                  <button type="button" className={botonSec} onClick={() => void alternarMiembro(m)}>{m.activo ? "Dar de baja" : "Reactivar"}</button>
                </div>
              </div>
            ))}
          </GlassPanel>
        </>
      )}

      {vista === "grupos" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Nuevo ministerio, célula o grupo</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etiqueta="Nombre *"><input className={campo} value={gNombre} onChange={(e) => setGNombre(e.target.value)} /></Campo>
              <Campo etiqueta="Tipo"><select className={campo} value={gTipo} onChange={(e) => setGTipo(e.target.value)}><option value="ministerio">Ministerio</option><option value="celula">Célula</option><option value="grupo">Grupo</option></select></Campo>
              <Campo etiqueta="Líder"><input className={campo} value={gLider} onChange={(e) => setGLider(e.target.value)} /></Campo>
              <Campo etiqueta="Día de reunión"><input className={campo} value={gDia} onChange={(e) => setGDia(e.target.value)} placeholder="Ej. Miércoles 7 pm" /></Campo>
            </div>
            <button type="button" className={boton} onClick={() => void crearGrupo()}>Guardar grupo</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            {grupos.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay grupos.</p> : grupos.map((g) => (
              <p key={g.id} className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
                <span className="min-w-0 break-words text-foreground">{g.nombre} · {g.tipo} · líder {g.lider ?? "—"}{g.dia_reunion ? ` · ${g.dia_reunion}` : ""}</span>
                <span>{miembrosActivos.filter((m) => m.ministerio === g.nombre || m.grupo === g.nombre).length} integrante(s)</span>
              </p>
            ))}
          </GlassPanel>
        </>
      )}

      {vista === "ingresos" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Registrar ingreso</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etiqueta="Concepto"><select className={campo} value={iConcepto} onChange={(e) => setIConcepto(e.target.value)}>{CONCEPTOS.map((c) => <option key={c.clave} value={c.clave}>{c.texto}</option>)}</select></Campo>
              <Campo etiqueta="Miembro"><select className={campo} value={iMiembro} onChange={(e) => setIMiembro(e.target.value)}><option value="">Otra persona / anónimo</option>{miembrosActivos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select></Campo>
              {!iMiembro && <Campo etiqueta="Nombre (opcional en ofrenda)"><input className={campo} value={iNombre} onChange={(e) => setINombre(e.target.value)} /></Campo>}
              <Campo etiqueta="Fondo o destinación"><input className={campo} list="lista-fondos" value={iFondo} onChange={(e) => setIFondo(e.target.value)} /></Campo>
              <Campo etiqueta="Valor *"><input className={campo} inputMode="decimal" value={iValor} onChange={(e) => setIValor(e.target.value)} /></Campo>
              <Campo etiqueta="Recibido por"><SelectorMetodo valor={iMetodo} onChange={setIMetodo} /></Campo>
              <Campo etiqueta="Culto"><input className={campo} list="lista-cultos" value={iCulto} onChange={(e) => setICulto(e.target.value)} placeholder="Ej. Culto dominical" /></Campo>
              <Campo etiqueta="Fecha"><input type="date" className={campo} value={iFecha} onChange={(e) => setIFecha(e.target.value)} /></Campo>
              {iConcepto === "evento" && <Campo etiqueta="Evento"><select className={campo} value={iEvento} onChange={(e) => setIEvento(e.target.value)}><option value="">Elige…</option>{eventos.map((v) => <option key={v.id} value={v.nombre}>{v.nombre}</option>)}</select></Campo>}
            </div>
            <datalist id="lista-fondos">{fondos.map((f) => <option key={f} value={f} />)}</datalist>
            <datalist id="lista-cultos">{Array.from(new Set(["Culto dominical", "Culto de oración", ...ingresos.map((x) => x.culto).filter(Boolean)])).map((c) => <option key={c} value={c} />)}</datalist>
            <button type="button" className={boton} disabled={ocupado} onClick={() => void ingresar()}>{ocupado ? "Registrando…" : "Registrar y generar recibo"}</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Ingresos recientes</h2>
              <button type="button" className={botonSec} onClick={() => exportarExcel("ingresos-iglesia", ["Fecha", "Recibo", "Concepto", "Fondo", "Culto", "Aportante", "Valor"], ingresos.map((x) => [x.fecha, x.recibo, x.concepto, x.fondo, x.culto, x.miembro ?? "", x.valor]))}>Descargar Excel</button>
            </div>
            {ingresos.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay ingresos.</p> : ingresos.slice(0, 100).map((x) => (
              <p key={x.id} className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
                <span className="min-w-0 break-words">{x.fecha} · {CONCEPTOS.find((c) => c.clave === x.concepto)?.texto} · {x.fondo}{x.culto ? ` · ${x.culto}` : ""}{x.miembro ? ` · ${x.miembro}` : ""}</span>
                <span className="text-foreground">{dinero(x.valor)}</span>
              </p>
            ))}
          </GlassPanel>
        </>
      )}

      {vista === "egresos" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Registrar egreso</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etiqueta="Sale del fondo"><select className={campo} value={eFondo} onChange={(e) => setEFondo(e.target.value)}>{fondos.map((f) => <option key={f} value={f}>{f} (hay {dinero(saldoFondo(f))})</option>)}</select></Campo>
              <Campo etiqueta="Concepto *"><input className={campo} value={eConcepto} onChange={(e) => setEConcepto(e.target.value)} /></Campo>
              <Campo etiqueta="Valor *"><input className={campo} inputMode="decimal" value={eValor} onChange={(e) => setEValor(e.target.value)} /></Campo>
              <Campo etiqueta="Pagar con"><SelectorMetodo valor={eMetodo} onChange={setEMetodo} /></Campo>
              <Campo etiqueta="Culto"><input className={campo} value={eCulto} onChange={(e) => setECulto(e.target.value)} /></Campo>
              <Campo etiqueta="Fecha"><input type="date" className={campo} value={eFecha} onChange={(e) => setEFecha(e.target.value)} /></Campo>
              <Campo etiqueta="Evento"><select className={campo} value={eEvento} onChange={(e) => setEEvento(e.target.value)}><option value="">Ninguno</option>{eventos.map((v) => <option key={v.id} value={v.nombre}>{v.nombre}</option>)}</select></Campo>
              <label className="flex items-center gap-2 pt-6 text-sm text-foreground"><input type="checkbox" className="h-4 w-4" checked={eObra} onChange={(e) => setEObra(e.target.checked)} />Es obra social</label>
            </div>
            <button type="button" className={boton} disabled={ocupado} onClick={() => void egresar()}>Registrar egreso</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            {egresos.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay egresos.</p> : egresos.slice(0, 100).map((x) => (
              <p key={x.id} className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
                <span className="min-w-0 break-words">{x.fecha} · {x.fondo} · {x.concepto}{x.obra_social ? " · obra social" : ""}</span>
                <span className="text-foreground">{dinero(x.valor)}</span>
              </p>
            ))}
          </GlassPanel>
        </>
      )}

      {vista === "cierre" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Cierre contable</h2>
            <p className="text-xs text-muted-foreground">Deja el culto vacío para cerrar todo el periodo. Después del cierre ya no se aceptan ingresos ni egresos en esas fechas.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo etiqueta="Culto (opcional)"><input className={campo} value={cCulto} onChange={(e) => setCCulto(e.target.value)} /></Campo>
              <Campo etiqueta="Desde"><input type="date" className={campo} value={cDesde} onChange={(e) => setCDesde(e.target.value)} /></Campo>
              <Campo etiqueta="Hasta"><input type="date" className={campo} value={cHasta} onChange={(e) => setCHasta(e.target.value)} /></Campo>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {CONCEPTOS.map((c) => <Indicador key={c.clave} titulo={c.texto} valor={dinero(sumaConcepto(c.clave))} />)}
              <Indicador titulo="Egresos" valor={dinero(totEgr)} />
              <Indicador titulo="Neto" valor={dinero(totIng - totEgr)} alerta={totIng - totEgr < 0} />
            </div>
            <button type="button" className={boton} disabled={ocupado} onClick={() => void cerrar()}>Cerrar culto o periodo</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            <h2 className="text-sm font-semibold text-foreground">Cierres realizados</h2>
            {cierres.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay cierres.</p> : cierres.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
                <p className="min-w-0 break-words text-sm text-foreground">{c.culto || "Todos los cultos"} · {c.desde} a {c.hasta} · neto {dinero(c.neto)}</p>
                <button type="button" className={botonSec} onClick={() => imprimirCierre(c)}>Imprimir</button>
              </div>
            ))}
          </GlassPanel>
        </>
      )}

      {vista === "eventos" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Nuevo evento</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etiqueta="Nombre *"><input className={campo} value={vNombre} onChange={(e) => setVNombre(e.target.value)} placeholder="Ej. Retiro de jóvenes" /></Campo>
              <Campo etiqueta="Fecha"><input type="date" className={campo} value={vFecha} onChange={(e) => setVFecha(e.target.value)} /></Campo>
              <Campo etiqueta="Lugar"><input className={campo} value={vLugar} onChange={(e) => setVLugar(e.target.value)} /></Campo>
              <Campo etiqueta="Presupuesto"><input className={campo} inputMode="decimal" value={vPresupuesto} onChange={(e) => setVPresupuesto(e.target.value)} /></Campo>
            </div>
            <button type="button" className={boton} onClick={() => void crearEvento()}>Guardar evento</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            {eventos.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay eventos.</p> : eventos.map((v) => {
              const ing = ingresos.filter((x) => x.evento === v.nombre).reduce((s, x) => s + x.valor, 0);
              const egr = egresos.filter((x) => x.evento === v.nombre).reduce((s, x) => s + x.valor, 0);
              return (
                <div key={v.id} className="space-y-1 rounded-xl border border-glass-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="break-words text-sm font-semibold text-foreground">{v.nombre} · {v.fecha}{v.lugar ? ` · ${v.lugar}` : ""}</p>
                    <Etiqueta texto={v.estado === "programado" ? "Programado" : v.estado === "realizado" ? "Realizado" : "Cancelado"} tono={v.estado === "cancelado" ? "alerta" : v.estado === "realizado" ? "ok" : "info"} />
                  </div>
                  <p className="text-xs text-muted-foreground">Presupuesto {dinero(v.presupuesto)} · recaudado {dinero(ing)} · gastado {dinero(egr)} · resultado {dinero(ing - egr)}</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className={botonSec} onClick={() => void estadoEvento(v, "realizado")}>Marcar realizado</button>
                    <button type="button" className={botonSec} onClick={() => void estadoEvento(v, "cancelado")}>Cancelar</button>
                  </div>
                </div>
              );
            })}
          </GlassPanel>
        </>
      )}

      {vista === "visitas" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Nueva visita pastoral</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Campo etiqueta="Persona *"><input className={campo} list="lista-miembros" value={sPersona} onChange={(e) => setSPersona(e.target.value)} /></Campo>
              <Campo etiqueta="Tipo"><select className={campo} value={sTipo} onChange={(e) => setSTipo(e.target.value)}>{TIPOS_VISITA.map((t) => <option key={t.clave} value={t.clave}>{t.texto}</option>)}</select></Campo>
              <Campo etiqueta="Fecha"><input type="date" className={campo} value={sFecha} onChange={(e) => setSFecha(e.target.value)} /></Campo>
              <Campo etiqueta="Responsable"><input className={campo} value={sResp} onChange={(e) => setSResp(e.target.value)} /></Campo>
              <Campo etiqueta="Notas"><input className={campo} value={sNotas} onChange={(e) => setSNotas(e.target.value)} /></Campo>
            </div>
            <datalist id="lista-miembros">{miembrosActivos.map((m) => <option key={m.id} value={m.nombre} />)}</datalist>
            <button type="button" className={boton} onClick={() => void crearVisita()}>Guardar visita</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            {visitas.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay visitas.</p> : visitas.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
                <p className="min-w-0 break-words text-sm text-foreground">{v.fecha} · {v.persona} · {TIPOS_VISITA.find((t) => t.clave === v.tipo)?.texto}{v.responsable ? ` · ${v.responsable}` : ""}{v.notas ? ` · ${v.notas}` : ""}</p>
                <button type="button" className={botonSec} onClick={() => void marcarVisita(v)}>{v.seguimiento === "hecho" ? "Seguimiento hecho" : "Marcar seguimiento"}</button>
              </div>
            ))}
          </GlassPanel>
        </>
      )}
    </div>
  );
}

export function MiembrosIglesia() {
  return <PanelIglesia vistaInicial="miembros" />;
}
export function AportesIglesia() {
  return <PanelIglesia vistaInicial="ingresos" />;
}
export function EventosIglesia() {
  return <PanelIglesia vistaInicial="eventos" />;
}
export function GruposIglesia() {
  return <PanelIglesia vistaInicial="grupos" />;
}
export function VisitasIglesia() {
  return <PanelIglesia vistaInicial="visitas" />;
}
