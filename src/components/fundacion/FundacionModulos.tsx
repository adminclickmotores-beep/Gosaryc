import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";
import { exportarExcel, imprimirReporte } from "@/lib/exportes";
import { Etiqueta, Indicador, Pestanas, SelectorMetodo, hoyISO, msg } from "@/components/negocios/comunes";

type Donante = Tables<"fun_donantes">;
type Donacion = Tables<"fun_donaciones">;
type Proyecto = Tables<"fun_proyectos">;
type Beneficiario = Tables<"fun_beneficiarios">;
type Gasto = Tables<"fun_gastos">;
type Voluntario = Tables<"fun_voluntarios">;
type Vista = "donantes" | "donaciones" | "proyectos" | "beneficiarios" | "voluntarios";

const TIPOS_DONANTE = [
  { clave: "persona", texto: "Persona" },
  { clave: "empresa", texto: "Empresa" },
  { clave: "patrocinador", texto: "Patrocinador" },
];

function certificadoDonacion(d: Donacion, entidad: string) {
  imprimirReporte(`Certificado de donación ${d.certificado}`, `${entidad || "La fundación"} certifica la recepción de una donación`,
    ["Dato", "Detalle"],
    [["Donante", d.donante], ["Documento", d.documento ?? "—"], ["Tipo de donación", d.tipo === "dinero" ? `Dinero${d.metodo ? ` (${d.metodo})` : ""}` : "En especie"],
     ["Descripción", d.descripcion ?? (d.tipo === "dinero" ? "Aporte en dinero" : "—")], ["Valor", dinero(d.valor)], ["Destino", d.proyecto ?? "Fondo general de la fundación"], ["Fecha", d.fecha]],
    [`Certificado No. ${d.certificado}`, "Gracias por su generosidad. Este certificado sirve como soporte de su donación.", "Firma y sello: ____________________"]);
}

function FilaProyecto({ p, recaudado, beneficiarios, gastos, onListo }: { p: Proyecto; recaudado: number; beneficiarios: number; gastos: Gasto[]; onListo: () => void }) {
  const [concepto, setConcepto] = useState("");
  const [valor, setValor] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [ocupado, setOcupado] = useState(false);
  const [abierto, setAbierto] = useState(false);
  const pct = p.presupuesto > 0 ? Math.min(Math.round((p.ejecutado / p.presupuesto) * 100), 100) : 0;
  const gastar = async () => {
    setOcupado(true);
    const { error } = await supabase.rpc("fun_gastar", { p_proyecto: p.id, p_concepto: concepto.trim(), p_valor: num(valor), p_metodo: metodo });
    setOcupado(false);
    if (error) return toast.error(msg(error.message, "No se pudo registrar el gasto."));
    toast.success("Gasto registrado: salió de Caja y quedó en Contabilidad.");
    setConcepto(""); setValor("");
    onListo();
  };
  const cerrar = async () => {
    const { error } = await supabase.from("fun_proyectos").update({ estado: p.estado === "activo" ? "cerrado" : "activo" }).eq("id", p.id);
    if (error) return toast.error(msg(error.message, "No se pudo cambiar el proyecto."));
    onListo();
  };
  return (
    <div className="space-y-3 rounded-xl border border-glass-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-foreground">{p.nombre}</p>
          <p className="break-words text-xs text-muted-foreground">{p.descripcion ?? "Sin descripción"} · {p.inicio}{p.fin ? ` a ${p.fin}` : ""}</p>
        </div>
        <Etiqueta texto={p.estado === "activo" ? "Activo" : "Cerrado"} tono={p.estado === "activo" ? "ok" : "neutro"} />
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-glass/60"><div className={`h-full ${pct >= 90 ? "bg-destructive" : "bg-primary"}`} style={{ width: `${pct}%` }} /></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Indicador titulo="Presupuesto" valor={dinero(p.presupuesto)} />
        <Indicador titulo="Ejecutado" valor={dinero(p.ejecutado)} nota={`${pct} %`} />
        <Indicador titulo="Disponible" valor={dinero(Math.max(p.presupuesto - p.ejecutado, 0))} />
        <Indicador titulo="Donado al proyecto" valor={dinero(recaudado)} />
        <Indicador titulo="Beneficiarios" valor={p.meta_beneficiarios > 0 ? `${beneficiarios}/${p.meta_beneficiarios}` : beneficiarios} />
      </div>
      {p.estado === "activo" && (
        <div className="flex flex-wrap items-end gap-2">
          <Campo etiqueta="Concepto del gasto"><input className={campo} value={concepto} onChange={(e) => setConcepto(e.target.value)} /></Campo>
          <Campo etiqueta="Valor"><input className={`${campo} !w-32`} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></Campo>
          <Campo etiqueta="Pagar con"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
          <button type="button" className={boton} disabled={ocupado} onClick={() => void gastar()}>Registrar gasto</button>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="button" className={botonSec} onClick={() => setAbierto((a) => !a)}>{abierto ? "Ocultar gastos" : `Ver gastos (${gastos.length})`}</button>
        <button type="button" className={botonSec} onClick={() => void cerrar()}>{p.estado === "activo" ? "Cerrar proyecto" : "Reabrir proyecto"}</button>
      </div>
      {abierto && (gastos.length === 0 ? <p className="text-xs text-muted-foreground">Sin gastos todavía.</p> : gastos.map((g) => (
        <p key={g.id} className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground"><span>{g.fecha} · {g.concepto}</span><span className="text-foreground">{dinero(g.valor)}</span></p>
      )))}
    </div>
  );
}

function PanelFundacion({ vistaInicial }: { vistaInicial: Vista }) {
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [donantes, setDonantes] = useState<Donante[]>([]);
  const [donaciones, setDonaciones] = useState<Donacion[]>([]);
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [beneficiarios, setBeneficiarios] = useState<Beneficiario[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [voluntarios, setVoluntarios] = useState<Voluntario[]>([]);
  const [entidad, setEntidad] = useState("");
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  // donante
  const [dNombre, setDNombre] = useState("");
  const [dDoc, setDDoc] = useState("");
  const [dTipo, setDTipo] = useState("persona");
  const [dTel, setDTel] = useState("");
  const [dCorreo, setDCorreo] = useState("");
  const [dCiudad, setDCiudad] = useState("");
  // donación
  const [nDonante, setNDonante] = useState("");
  const [nTipo, setNTipo] = useState("dinero");
  const [nDesc, setNDesc] = useState("");
  const [nValor, setNValor] = useState("");
  const [nProyecto, setNProyecto] = useState("");
  const [nMetodo, setNMetodo] = useState("efectivo");
  // proyecto
  const [pNombre, setPNombre] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pPresupuesto, setPPresupuesto] = useState("");
  const [pMeta, setPMeta] = useState("");
  const [pInicio, setPInicio] = useState("");
  const [pFin, setPFin] = useState("");
  // beneficiario
  const [bProyecto, setBProyecto] = useState("");
  const [bNombre, setBNombre] = useState("");
  const [bDoc, setBDoc] = useState("");
  const [bTel, setBTel] = useState("");
  const [bNecesidad, setBNecesidad] = useState("");
  const [bConsent, setBConsent] = useState(false);
  const [bFiltro, setBFiltro] = useState("");
  // voluntario
  const [vNombre, setVNombre] = useState("");
  const [vDoc, setVDoc] = useState("");
  const [vTel, setVTel] = useState("");
  const [vArea, setVArea] = useState("General");
  const [vHoras, setVHoras] = useState("");

  useEffect(() => {
    setPInicio(hoyISO());
  }, []);

  const cargar = useCallback(async () => {
    const [d, n, p, b, g, v, c] = await Promise.all([
      supabase.from("fun_donantes").select("*").order("nombre").limit(1000),
      supabase.from("fun_donaciones").select("*").order("created_at", { ascending: false }).limit(1500),
      supabase.from("fun_proyectos").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("fun_beneficiarios").select("*").order("nombre").limit(3000),
      supabase.from("fun_gastos").select("*").order("created_at", { ascending: false }).limit(2000),
      supabase.from("fun_voluntarios").select("*").order("nombre").limit(500),
      supabase.from("negocio_config").select("nombre").limit(1),
    ]);
    setDonantes(d.data ?? []);
    setDonaciones(n.data ?? []);
    setProyectos(p.data ?? []);
    setBeneficiarios(b.data ?? []);
    setGastos(g.data ?? []);
    setVoluntarios(v.data ?? []);
    setEntidad(c.data?.[0]?.nombre ?? "");
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const donantesActivos = useMemo(() => donantes.filter((d) => d.activo), [donantes]);

  const crearDonante = async () => {
    if (dNombre.trim().length < 2) return toast.error("Escribe el nombre del donante.");
    const { error } = await supabase.from("fun_donantes").insert({ nombre: dNombre.trim(), documento: dDoc.trim() || null, tipo: dTipo, telefono: dTel.trim() || null, correo: dCorreo.trim() || null, ciudad: dCiudad.trim() || null });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el donante."));
    toast.success("Donante registrado.");
    setDNombre(""); setDDoc(""); setDTel(""); setDCorreo(""); setDCiudad("");
    void cargar();
  };
  const alternar = async (tabla: "fun_donantes" | "fun_beneficiarios" | "fun_voluntarios", id: string, activo: boolean) => {
    const { error } =
      tabla === "fun_donantes" ? await supabase.from("fun_donantes").update({ activo: !activo }).eq("id", id)
      : tabla === "fun_beneficiarios" ? await supabase.from("fun_beneficiarios").update({ activo: !activo }).eq("id", id)
      : await supabase.from("fun_voluntarios").update({ activo: !activo }).eq("id", id);
    if (error) return toast.error(msg(error.message, "No se pudo cambiar."));
    void cargar();
  };

  const donar = async () => {
    if (!nDonante) return toast.error("Elige el donante.");
    setOcupado(true);
    const { data, error } = await supabase.rpc("fun_donar", { p_donante: nDonante, p_tipo: nTipo, p_descripcion: nDesc.trim(), p_valor: num(nValor), p_proyecto: nProyecto || null, p_metodo: nMetodo });
    setOcupado(false);
    if (error) return toast.error(msg(error.message, "No se pudo registrar la donación."));
    const r = (data ?? {}) as { id?: string; certificado?: string; valor?: number };
    toast.success(`Donación registrada. Certificado ${r.certificado ?? ""}. ${nTipo === "dinero" ? "El dinero entró a Caja." : "Quedó como inventario en especie."}`);
    setNDesc(""); setNValor("");
    await cargar();
    const { data: nueva } = await supabase.from("fun_donaciones").select("*").eq("id", r.id ?? "").maybeSingle();
    if (nueva) certificadoDonacion(nueva, entidad);
  };

  const crearProyecto = async () => {
    if (pNombre.trim().length < 2) return toast.error("Escribe el nombre del proyecto.");
    const { error } = await supabase.from("fun_proyectos").insert({ nombre: pNombre.trim(), descripcion: pDesc.trim() || null, presupuesto: Math.max(num(pPresupuesto), 0), meta_beneficiarios: Math.max(Math.round(num(pMeta)), 0), inicio: pInicio || hoyISO(), fin: pFin || null });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el proyecto."));
    toast.success("Proyecto creado.");
    setPNombre(""); setPDesc(""); setPPresupuesto(""); setPMeta(""); setPFin("");
    void cargar();
  };

  const crearBeneficiario = async () => {
    if (!bProyecto) return toast.error("Elige el proyecto.");
    if (bNombre.trim().length < 2) return toast.error("Escribe el nombre.");
    const { error } = await supabase.from("fun_beneficiarios").insert({ proyecto_id: bProyecto, nombre: bNombre.trim(), documento: bDoc.trim() || null, telefono: bTel.trim() || null, necesidad: bNecesidad.trim() || null, consentimiento: bConsent });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el beneficiario."));
    toast.success("Beneficiario registrado.");
    setBNombre(""); setBDoc(""); setBTel(""); setBNecesidad(""); setBConsent(false);
    void cargar();
  };

  const crearVoluntario = async () => {
    if (vNombre.trim().length < 2) return toast.error("Escribe el nombre.");
    const { error } = await supabase.from("fun_voluntarios").insert({ nombre: vNombre.trim(), documento: vDoc.trim() || null, telefono: vTel.trim() || null, area: vArea.trim() || "General", horas_mes: Math.max(num(vHoras), 0) });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el voluntario."));
    toast.success("Voluntario registrado.");
    setVNombre(""); setVDoc(""); setVTel(""); setVHoras("");
    void cargar();
  };
  const certificadoVoluntario = (v: Voluntario) =>
    imprimirReporte("Certificado de voluntariado", `${entidad || "La fundación"} certifica la labor voluntaria de ${v.nombre}`,
      ["Dato", "Detalle"], [["Voluntario", v.nombre], ["Documento", v.documento ?? "—"], ["Área", v.area], ["Desde", v.desde], ["Dedicación", `${v.horas_mes} horas al mes`]],
      ["Agradecemos su compromiso con nuestra misión.", "Firma y sello: ____________________"]);

  if (cargando) return <Cargando />;
  const totalDonado = donaciones.reduce((s, d) => s + d.valor, 0);
  const benFiltrados = beneficiarios.filter((b) => (bFiltro ? b.proyecto_id === bFiltro : true));

  return (
    <div className="space-y-6">
      <Encabezado titulo="Fundación" texto="Directorio de donantes, donaciones en dinero o especie con certificado imprimible, proyectos sociales con ejecución presupuestal, beneficiarios y voluntarios." />
      <Pestanas items={[{ clave: "donaciones", texto: "Donaciones y certificados" }, { clave: "donantes", texto: "Donantes y patrocinadores" }, { clave: "proyectos", texto: "Proyectos y presupuesto" }, { clave: "beneficiarios", texto: "Beneficiarios" }, { clave: "voluntarios", texto: "Voluntarios" }]} valor={vista} onChange={setVista} />

      <div className="grid gap-3 sm:grid-cols-4">
        <Indicador titulo="Total donado" valor={dinero(totalDonado)} />
        <Indicador titulo="Donantes" valor={donantesActivos.length} />
        <Indicador titulo="Proyectos activos" valor={proyectos.filter((p) => p.estado === "activo").length} />
        <Indicador titulo="Beneficiarios" valor={beneficiarios.filter((b) => b.activo).length} />
      </div>

      {vista === "donantes" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Nuevo donante o patrocinador</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Campo etiqueta="Nombre *"><input className={campo} value={dNombre} onChange={(e) => setDNombre(e.target.value)} /></Campo>
              <Campo etiqueta="Documento / NIT"><input className={campo} value={dDoc} onChange={(e) => setDDoc(e.target.value)} /></Campo>
              <Campo etiqueta="Tipo"><select className={campo} value={dTipo} onChange={(e) => setDTipo(e.target.value)}>{TIPOS_DONANTE.map((t) => <option key={t.clave} value={t.clave}>{t.texto}</option>)}</select></Campo>
              <Campo etiqueta="Teléfono"><input className={campo} inputMode="tel" value={dTel} onChange={(e) => setDTel(e.target.value)} /></Campo>
              <Campo etiqueta="Correo"><input className={campo} type="email" value={dCorreo} onChange={(e) => setDCorreo(e.target.value)} /></Campo>
              <Campo etiqueta="Ciudad"><input className={campo} value={dCiudad} onChange={(e) => setDCiudad(e.target.value)} /></Campo>
            </div>
            <button type="button" className={boton} onClick={() => void crearDonante()}>Guardar donante</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            {donantes.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay donantes.</p> : donantes.map((d) => {
              const total = donaciones.filter((x) => x.donante_id === d.id).reduce((s, x) => s + x.valor, 0);
              return (
                <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-foreground">{d.nombre} · {TIPOS_DONANTE.find((t) => t.clave === d.tipo)?.texto}</p>
                    <p className="break-words text-xs text-muted-foreground">{[d.documento, d.telefono, d.correo, d.ciudad].filter(Boolean).join(" · ") || "Sin datos de contacto"}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-foreground">Ha donado {dinero(total)}</span>
                    {!d.activo && <Etiqueta texto="Inactivo" tono="alerta" />}
                    <button type="button" className={botonSec} onClick={() => void alternar("fun_donantes", d.id, d.activo)}>{d.activo ? "Desactivar" : "Activar"}</button>
                  </div>
                </div>
              );
            })}
          </GlassPanel>
        </>
      )}

      {vista === "donaciones" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Registrar donación</h2>
            {donantesActivos.length === 0 && <p className="text-sm text-muted-foreground">Primero registra al donante en la pestaña Donantes y patrocinadores.</p>}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Campo etiqueta="Donante *"><select className={campo} value={nDonante} onChange={(e) => setNDonante(e.target.value)}><option value="">Elige…</option>{donantesActivos.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}</select></Campo>
              <Campo etiqueta="Tipo"><select className={campo} value={nTipo} onChange={(e) => setNTipo(e.target.value)}><option value="dinero">Dinero</option><option value="especie">En especie</option></select></Campo>
              <Campo etiqueta={nTipo === "dinero" ? "Valor *" : "Valor estimado *"}><input className={campo} inputMode="decimal" value={nValor} onChange={(e) => setNValor(e.target.value)} /></Campo>
              <Campo etiqueta={nTipo === "especie" ? "Qué se donó *" : "Detalle"}><input className={campo} value={nDesc} onChange={(e) => setNDesc(e.target.value)} placeholder="Ej. 50 mercados, 20 cobijas" /></Campo>
              <Campo etiqueta="Destino"><select className={campo} value={nProyecto} onChange={(e) => setNProyecto(e.target.value)}><option value="">Fondo general</option>{proyectos.filter((p) => p.estado === "activo").map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></Campo>
              {nTipo === "dinero" && <Campo etiqueta="Recibido por"><SelectorMetodo valor={nMetodo} onChange={setNMetodo} /></Campo>}
            </div>
            <button type="button" className={boton} disabled={ocupado} onClick={() => void donar()}>{ocupado ? "Registrando…" : "Registrar y generar certificado"}</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Donaciones recibidas</h2>
              <button type="button" className={botonSec} onClick={() => exportarExcel("donaciones", ["Fecha", "Certificado", "Donante", "Documento", "Tipo", "Valor", "Destino"], donaciones.map((d) => [d.fecha, d.certificado, d.donante, d.documento ?? "", d.tipo, d.valor, d.proyecto ?? "Fondo general"]))}>Descargar Excel</button>
            </div>
            {donaciones.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay donaciones.</p> : donaciones.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-foreground">{d.donante} · {d.tipo === "dinero" ? "Dinero" : "En especie"}</p>
                  <p className="break-words text-xs text-muted-foreground">{d.fecha} · {d.certificado} · {d.proyecto ?? "Fondo general"}{d.descripcion ? ` · ${d.descripcion}` : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-foreground">{dinero(d.valor)}</span>
                  <button type="button" className={botonSec} onClick={() => certificadoDonacion(d, entidad)}>Certificado</button>
                </div>
              </div>
            ))}
          </GlassPanel>
        </>
      )}

      {vista === "proyectos" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Nuevo proyecto social</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Campo etiqueta="Nombre *"><input className={campo} value={pNombre} onChange={(e) => setPNombre(e.target.value)} /></Campo>
              <Campo etiqueta="Descripción"><input className={campo} value={pDesc} onChange={(e) => setPDesc(e.target.value)} /></Campo>
              <Campo etiqueta="Presupuesto"><input className={campo} inputMode="decimal" value={pPresupuesto} onChange={(e) => setPPresupuesto(e.target.value)} /></Campo>
              <Campo etiqueta="Meta de beneficiarios"><input className={campo} inputMode="numeric" value={pMeta} onChange={(e) => setPMeta(e.target.value)} /></Campo>
              <Campo etiqueta="Inicio"><input type="date" className={campo} value={pInicio} onChange={(e) => setPInicio(e.target.value)} /></Campo>
              <Campo etiqueta="Fin previsto"><input type="date" className={campo} value={pFin} onChange={(e) => setPFin(e.target.value)} /></Campo>
            </div>
            <button type="button" className={boton} onClick={() => void crearProyecto()}>Guardar proyecto</button>
          </GlassPanel>
          {proyectos.length === 0 ? <GlassPanel className="p-4"><p className="text-sm text-muted-foreground">Aún no hay proyectos.</p></GlassPanel> : proyectos.map((p) => (
            <FilaProyecto key={p.id} p={p}
              recaudado={donaciones.filter((d) => d.proyecto_id === p.id).reduce((s, d) => s + d.valor, 0)}
              beneficiarios={beneficiarios.filter((b) => b.proyecto_id === p.id && b.activo).length}
              gastos={gastos.filter((g) => g.proyecto_id === p.id)} onListo={() => void cargar()} />
          ))}
        </>
      )}

      {vista === "beneficiarios" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Nuevo beneficiario</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Campo etiqueta="Proyecto *"><select className={campo} value={bProyecto} onChange={(e) => setBProyecto(e.target.value)}><option value="">Elige…</option>{proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></Campo>
              <Campo etiqueta="Nombre *"><input className={campo} value={bNombre} onChange={(e) => setBNombre(e.target.value)} /></Campo>
              <Campo etiqueta="Documento"><input className={campo} value={bDoc} onChange={(e) => setBDoc(e.target.value)} /></Campo>
              <Campo etiqueta="Teléfono / acudiente"><input className={campo} inputMode="tel" value={bTel} onChange={(e) => setBTel(e.target.value)} /></Campo>
              <Campo etiqueta="Necesidad atendida"><input className={campo} value={bNecesidad} onChange={(e) => setBNecesidad(e.target.value)} /></Campo>
              <label className="flex items-center gap-2 pt-6 text-sm text-foreground"><input type="checkbox" className="h-4 w-4" checked={bConsent} onChange={(e) => setBConsent(e.target.checked)} />Firmó el consentimiento</label>
            </div>
            <button type="button" className={boton} onClick={() => void crearBeneficiario()}>Guardar beneficiario</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <Campo etiqueta="Filtrar por proyecto"><select className={campo} value={bFiltro} onChange={(e) => setBFiltro(e.target.value)}><option value="">Todos</option>{proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></Campo>
              <button type="button" className={botonSec} onClick={() => exportarExcel("beneficiarios", ["Nombre", "Documento", "Proyecto", "Necesidad", "Consentimiento"], benFiltrados.map((b) => [b.nombre, b.documento ?? "", proyectos.find((p) => p.id === b.proyecto_id)?.nombre ?? "", b.necesidad ?? "", b.consentimiento ? "Sí" : "No"]))}>Descargar Excel</button>
            </div>
            {benFiltrados.length === 0 ? <p className="text-sm text-muted-foreground">No hay beneficiarios.</p> : benFiltrados.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
                <p className="min-w-0 break-words text-sm text-foreground">{b.nombre} · {proyectos.find((p) => p.id === b.proyecto_id)?.nombre}{b.necesidad ? ` · ${b.necesidad}` : ""}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {!b.consentimiento && <Etiqueta texto="Sin consentimiento" tono="alerta" />}
                  {!b.activo && <Etiqueta texto="Inactivo" tono="neutro" />}
                  <button type="button" className={botonSec} onClick={() => void alternar("fun_beneficiarios", b.id, b.activo)}>{b.activo ? "Dar de baja" : "Reactivar"}</button>
                </div>
              </div>
            ))}
          </GlassPanel>
        </>
      )}

      {vista === "voluntarios" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Nuevo voluntario</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Campo etiqueta="Nombre *"><input className={campo} value={vNombre} onChange={(e) => setVNombre(e.target.value)} /></Campo>
              <Campo etiqueta="Documento"><input className={campo} value={vDoc} onChange={(e) => setVDoc(e.target.value)} /></Campo>
              <Campo etiqueta="Teléfono"><input className={campo} inputMode="tel" value={vTel} onChange={(e) => setVTel(e.target.value)} /></Campo>
              <Campo etiqueta="Área"><input className={campo} value={vArea} onChange={(e) => setVArea(e.target.value)} /></Campo>
              <Campo etiqueta="Horas al mes"><input className={campo} inputMode="decimal" value={vHoras} onChange={(e) => setVHoras(e.target.value)} /></Campo>
            </div>
            <button type="button" className={boton} onClick={() => void crearVoluntario()}>Guardar voluntario</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            {voluntarios.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay voluntarios.</p> : voluntarios.map((v) => (
              <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
                <p className="min-w-0 break-words text-sm text-foreground">{v.nombre} · {v.area} · {v.horas_mes} h/mes · desde {v.desde}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {!v.activo && <Etiqueta texto="Inactivo" tono="neutro" />}
                  <button type="button" className={botonSec} onClick={() => certificadoVoluntario(v)}>Certificado</button>
                  <button type="button" className={botonSec} onClick={() => void alternar("fun_voluntarios", v.id, v.activo)}>{v.activo ? "Dar de baja" : "Reactivar"}</button>
                </div>
              </div>
            ))}
          </GlassPanel>
        </>
      )}
    </div>
  );
}

export function DonacionesFundacion() {
  return <PanelFundacion vistaInicial="donaciones" />;
}
export function ProyectosFundacion() {
  return <PanelFundacion vistaInicial="proyectos" />;
}
export function BeneficiariosFundacion() {
  return <PanelFundacion vistaInicial="beneficiarios" />;
}
export function VoluntariosFundacion() {
  return <PanelFundacion vistaInicial="voluntarios" />;
}
