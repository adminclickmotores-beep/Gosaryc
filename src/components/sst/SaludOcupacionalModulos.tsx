import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Printer } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";
import { escaparHtml, exportarExcel, imprimirReporte } from "@/lib/exportes";
import { ClasificacionEmpleados } from "@/components/empresa/ClasificacionEmpleados";
import { EVENTO_COTIZAR_SST, estandaresSST, type DatosCotizarSST } from "@/lib/clasificacion-empresa";

type Empresa = Tables<"sst_empresas">;
type Trab = Tables<"sst_trabajadores">;
type Eva = Tables<"sst_evaluaciones">;
type Prof = Tables<"sst_profesiogramas">;
type Est = Tables<"sst_estandares">;
type Atel = Tables<"sst_atel">;
type Aus = Tables<"sst_ausentismo">;
type Cap = Tables<"sst_capacitaciones">;
type Asi = Tables<"sst_asistencias">;
type Nov = Tables<"sst_novedades">;

const msg = (m: string | undefined, d: string) => (m && m.length > 0 && m.length < 220 ? m : d);
const aWhatsapp = (tel: string | null | undefined, texto: string): string | null => {
  const d = (tel ?? "").replace(/\D/g, "");
  if (d.length < 7) return null;
  const n = d.length === 10 ? `57${d}` : d;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
};
const esc = escaparHtml;
const hoyMas = (dias: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Abre una ventana de impresión con HTML propio (diplomas y certificados). */
const imprimirHTML = (titulo: string, html: string): void => {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
};

async function cobrar(tabla: string, id: string, valorTxt: string, metodo: string): Promise<boolean> {
  if (num(valorTxt) <= 0) return (toast.error("Escribe el valor del abono o cobro."), false);
  const { error } = await supabase.rpc("sst_cobrar", { p_tabla: tabla, p_id: id, p_valor: num(valorTxt), p_metodo: metodo });
  if (error) return (toast.error(msg(error.message, "No se pudo cobrar.")), false);
  toast.success("Cobro registrado. Entró a Caja y Contabilidad.");
  return true;
}

function Cobro({ tabla, id, onListo }: { tabla: string; id: string; onListo: () => void }) {
  const [valor, setValor] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  return (
    <div className="mt-2 flex flex-wrap items-end gap-2">
      <Campo etiqueta="Abono o cobro"><input className={campo} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} style={{ maxWidth: 130 }} /></Campo>
      <Campo etiqueta="Método">
        <select className={campo} value={metodo} onChange={(e) => setMetodo(e.target.value)} style={{ maxWidth: 150 }}>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="tarjeta">Tarjeta</option>
        </select>
      </Campo>
      <button type="button" className={botonSec} onClick={() => void cobrar(tabla, id, valor, metodo).then((ok) => { if (ok) { setValor(""); onListo(); } })}>Cobrar</button>
    </div>
  );
}

const GUIA = "Aquí el profesional SST o médico laboral gestiona cada empresa cliente. El Ministerio del Trabajo exige: evaluación de estándares (Res. 0312 de 2019), plan anual, COPASST o vigía, comité de convivencia e investigación de accidentes. Llene cada ficha con datos reales del trabajador y la empresa.";

// ============ 1. Empresas cliente ============
export function EmpresasSST() {
  const [lista, setLista] = useState<Empresa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [nit, setNit] = useState("");
  const [contacto, setContacto] = useState("");
  const [tel, setTel] = useState("");
  const [ntrab, setNtrab] = useState("");
  const [riesgo, setRiesgo] = useState("I");
  const cargar = useCallback(async () => {
    const { data } = await supabase.from("sst_empresas").select("*").order("created_at", { ascending: false }).limit(80);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);
  const [cotiz, setCotiz] = useState<{ empleados: number; ciiu: string } | null>(null);
  useEffect(() => {
    const alRecibir = (ev: Event) => {
      const d = (ev as CustomEvent<DatosCotizarSST>).detail;
      if (!d) return;
      if (d.nombre) setNombre(d.nombre);
      if (d.nit) setNit(d.nit);
      setNtrab(String(d.empleados));
      setCotiz({ empleados: d.empleados, ciiu: d.ciiu });
    };
    window.addEventListener(EVENTO_COTIZAR_SST, alRecibir);
    return () => window.removeEventListener(EVENTO_COTIZAR_SST, alRecibir);
  }, []);
  const crear = async () => {
    if (nombre.trim().length < 2) return toast.error("Escribe el nombre de la empresa cliente.");
    const { error } = await supabase.from("sst_empresas").insert({
      nombre: nombre.trim(), nit: nit.trim() || null, contacto: contacto.trim() || null,
      telefono: tel.trim() || null, n_trabajadores: Math.max(Math.round(num(ntrab)), 0), riesgo,
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    setNombre(""); setNit(""); setContacto(""); setTel(""); setNtrab("");
    toast.success("Empresa cliente creada.");
    void cargar();
  };
  if (cargando) return <Cargando />;
  const activas = lista.filter((e) => e.estado === "activa").length;
  return (
    <GlassPanel>
      <Encabezado titulo="Empresas cliente con convenio" texto={GUIA} />
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-xl border border-glass-border bg-sky-500/10 p-3"><p className="text-xs text-muted-foreground">Empresas activas</p><p className="font-display text-2xl">{activas}</p></div>
        <div className="rounded-xl border border-glass-border bg-emerald-500/10 p-3"><p className="text-xs text-muted-foreground">Trabajadores cubiertos</p><p className="font-display text-2xl">{lista.reduce((a, e) => a + (e.n_trabajadores ?? 0), 0)}</p></div>
      </div>
      {cotiz && (
        <div className="mb-3 rounded-xl border border-primary/30 bg-primary/10 p-3 text-sm">
          <p className="font-semibold">Cotización SG-SST</p>
          <p className="mt-1 flex flex-wrap items-center gap-2">
            <ClasificacionEmpleados cantidad={cotiz.empleados} />
            <span className="text-muted-foreground">CIIU: {cotiz.ciiu || "—"} · Estándares mínimos Res. 0312: {estandaresSST(cotiz.empleados)}</span>
          </p>
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-3">
        <Campo etiqueta="Empresa"><input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Intersalud / cliente…" /></Campo>
        <Campo etiqueta="NIT"><input className={campo} value={nit} onChange={(e) => setNit(e.target.value)} /></Campo>
        <Campo etiqueta="Contacto"><input className={campo} value={contacto} onChange={(e) => setContacto(e.target.value)} /></Campo>
        <Campo etiqueta="Celular"><input className={campo} inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></Campo>
        <Campo etiqueta="N.º trabajadores"><input className={campo} inputMode="numeric" value={ntrab} onChange={(e) => setNtrab(e.target.value)} /></Campo>
        <Campo etiqueta="Riesgo ARL">
          <select className={campo} value={riesgo} onChange={(e) => setRiesgo(e.target.value)}>
            {(["I", "II", "III", "IV", "V"] as const).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </Campo>
        <div className="flex items-end"><button type="button" className={boton} onClick={() => void crear()}>Guardar empresa</button></div>
      </div>
      <div className="mt-3 space-y-2">
        {lista.map((e) => {
          const wa = aWhatsapp(e.telefono, `Hola ${e.contacto ?? e.nombre}, te compartimos el estado de cumplimiento SG-SST de ${e.nombre}.`);
          return (
            <div key={e.id} className="rounded-xl border border-glass-border p-3">
              <p className="font-semibold">{e.nombre} <span className="text-xs text-muted-foreground">· NIT {e.nit ?? "—"} · riesgo {e.riesgo} · {e.n_trabajadores} trabajadores</span></p>
              <div className="mt-1 flex flex-wrap gap-2">
                {wa && <a className={botonSec} href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
                <button type="button" className={botonSec} onClick={() => void exportarExcel(`empresa-${e.nombre}`, ["Empresa", "NIT", "Contacto", "Trabajadores", "Riesgo"], [[e.nombre, e.nit ?? "", e.contacto ?? "", e.n_trabajadores ?? 0, e.riesgo]])}>Excel</button>
              </div>
            </div>
          );
        })}
        {lista.length === 0 && <p className="text-sm text-muted-foreground">Registra tu primera empresa cliente arriba.</p>}
      </div>
    </GlassPanel>
  );
}

// ============ 2. Trabajadores + evaluaciones + certificado ============
function certificadoHTML(e: Eva): string {
  return `<html><head><meta charset="utf-8"><title>Certificado de aptitud</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#111}h1{font-size:20px}.box{border:2px solid #0e7490;border-radius:10px;padding:18px;margin-top:12px}.muted{color:#555;font-size:12px}</style></head><body>
<h1>CERTIFICADO DE APTITUD LABORAL</h1><p>Medicina del trabajo · Enfermería laboral 4.0</p>
<div class="box"><p><b>Trabajador:</b> ${esc(e.trabajador)}</p><p><b>Empresa:</b> ${esc(e.empresa)}</p>
<p><b>Tipo de evaluación:</b> ${esc(e.tipo)}</p><p><b>Concepto:</b> ${esc(e.concepto)}</p>
${e.restricciones ? `<p><b>Restricciones:</b> ${esc(e.restricciones)}</p>` : ""}
<p><b>Fecha:</b> ${esc(e.fecha)}${e.vence ? ` · <b>Vence:</b> ${esc(e.vence)}` : ""}</p>
<p><b>Código de verificación:</b> ${esc(e.codigo_seguro)}</p>
<p class="muted">Este certificado NO contiene historia clínica (reserva legal). Verifíquelo con el código seguro en el portal de la empresa prestadora.</p></div></body></html>`;
}

export function TrabajadoresEvaluaciones() {
  const [trabs, setTrabs] = useState<Trab[]>([]);
  const [evas, setEvas] = useState<Eva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [empresa, setEmpresa] = useState("");
  const [nombre, setNombre] = useState("");
  const [doc, setDoc] = useState("");
  const [cargo, setCargo] = useState("");
  const [tel, setTel] = useState("");
  const [vence, setVence] = useState("");
  const [trabId, setTrabId] = useState("");
  const [tipo, setTipo] = useState("Periodico");
  const [concepto, setConcepto] = useState("Apto");
  const [restr, setRestr] = useState("");
  const [valor, setValor] = useState("");
  const cargar = useCallback(async () => {
    const [t, e] = await Promise.all([
      supabase.from("sst_trabajadores").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("sst_evaluaciones").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    setTrabs(t.data ?? []);
    setEvas(e.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);
  const crearTrab = async () => {
    if (nombre.trim().length < 2) return toast.error("Escribe el nombre del trabajador.");
    const { error } = await supabase.from("sst_trabajadores").insert({
      empresa_id: null, nombre: nombre.trim(), documento: doc.trim(), cargo: cargo.trim(),
      telefono: tel.trim() || null, examen_vence: vence || null,
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    setNombre(""); setDoc(""); setCargo(""); setTel(""); setVence("");
    toast.success("Trabajador registrado.");
    void cargar();
  };
  const crearEva = async () => {
    const tr = trabs.find((x) => x.id === trabId);
    if (!tr) return toast.error("Elige el trabajador evaluado.");
    const { error } = await supabase.from("sst_evaluaciones").insert({
      trabajador_id: tr.id, empresa: empresa.trim() || tr.cargo, trabajador: tr.nombre,
      tipo, concepto, restricciones: restr.trim(), fecha: new Date().toISOString().slice(0, 10),
      vence: vence || hoyMas(365), valor: Math.max(num(valor), 0),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    if (vence) await supabase.from("sst_trabajadores").update({ examen_vence: vence }).eq("id", tr.id);
    setRestr(""); setValor("");
    toast.success("Evaluación guardada. Genera el certificado en PDF.");
    void cargar();
  };
  if (cargando) return <Cargando />;
  const vencidos = trabs.filter((t) => t.examen_vence && t.examen_vence < new Date().toISOString().slice(0, 10));
  return (
    <GlassPanel>
      <Encabezado titulo="Medicina del trabajo y enfermería laboral 4.0" texto="Registra al trabajador, guarda la evaluación (Ingreso, Periódico, Egreso, Post-Incapacidad, Alturas o Espacios Confinados) y emite el Certificado de Aptitud en PDF con código seguro. La historia clínica NUNCA se escribe aquí: solo el concepto de aptitud." />
      {vencidos.length > 0 && (
        <div className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          {vencidos.length} trabajador(es) con examen vencido. Avísales por WhatsApp desde cada evaluación.
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-3">
        <Campo etiqueta="Empresa"><input className={campo} value={empresa} onChange={(e) => setEmpresa(e.target.value)} /></Campo>
        <Campo etiqueta="Trabajador"><input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
        <Campo etiqueta="Documento"><input className={campo} value={doc} onChange={(e) => setDoc(e.target.value)} /></Campo>
        <Campo etiqueta="Cargo"><input className={campo} value={cargo} onChange={(e) => setCargo(e.target.value)} /></Campo>
        <Campo etiqueta="Celular"><input className={campo} inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></Campo>
        <Campo etiqueta="Vence examen"><input type="date" className={campo} value={vence} onChange={(e) => setVence(e.target.value)} /></Campo>
        <div className="flex items-end"><button type="button" className={boton} onClick={() => void crearTrab()}>Registrar trabajador</button></div>
      </div>
      <div className="mt-4 grid gap-2 border-t border-glass-border pt-4 sm:grid-cols-4">
        <Campo etiqueta="Trabajador evaluado">
          <select className={campo} value={trabId} onChange={(e) => setTrabId(e.target.value)}>
            <option value="">Elige…</option>
            {trabs.map((t) => <option key={t.id} value={t.id}>{t.nombre} · {t.documento}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Tipo">
          <select className={campo} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {(["Ingreso", "Periodico", "Egreso", "Post-Incapacidad", "Alturas", "Espacios Confinados"] as const).map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Concepto">
          <select className={campo} value={concepto} onChange={(e) => setConcepto(e.target.value)}>
            {(["Apto", "Apto con restricciones", "No apto", "Aplazado"] as const).map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Valor"><input className={campo} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></Campo>
        <div className="sm:col-span-4"><Campo etiqueta="Restricciones o recomendaciones"><input className={campo} value={restr} onChange={(e) => setRestr(e.target.value)} placeholder="Ej. no levantar más de 15 kg por 30 días" /></Campo></div>
        <div className="flex items-end"><button type="button" className={boton} onClick={() => void crearEva()}>Guardar evaluación</button></div>
      </div>
      <div className="mt-3 space-y-2">
        {evas.map((e) => {
          const wa = aWhatsapp(trabs.find((t) => t.id === e.trabajador_id)?.telefono, `Hola ${e.trabajador}, tu examen ${e.tipo} vence el ${e.vence ?? "—"}. Agenda tu cita de renovación.`);
          return (
            <div key={e.id} className="rounded-xl border border-glass-border p-3">
              <p className="font-semibold">{e.trabajador} <span className="text-xs text-muted-foreground">· {e.tipo} · {e.concepto} · vence {e.vence ?? "—"} · código {e.codigo_seguro}</span></p>
              <p className="text-xs text-muted-foreground">Valor {dinero(e.valor)} · abono {dinero(e.abono)} · saldo {dinero(Math.max(e.valor - e.abono, 0))}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <button type="button" className={botonSec} onClick={() => imprimirHTML(`Certificado-${e.codigo_seguro}`, certificadoHTML(e))}><Printer className="h-4 w-4" /> Certificado PDF</button>
                {wa && <a className={botonSec} href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> Avisar vencimiento</a>}
              </div>
              {e.estado !== "cobrada" && <Cobro tabla="sst_evaluaciones" id={e.id} onListo={() => void cargar()} />}
            </div>
          );
        })}
        {evas.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay evaluaciones.</p>}
      </div>
    </GlassPanel>
  );
}

// ============ 3. Profesiograma + matriz IPVR GTC 45 ============
export function ProfesiogramaMatriz() {
  const [lista, setLista] = useState<Prof[]>([]);
  const [cargando, setCargando] = useState(true);
  const [empresa, setEmpresa] = useState("");
  const [cargo, setCargo] = useState("");
  const [peligros, setPeligros] = useState("");
  const [controles, setControles] = useState("");
  const [epp, setEpp] = useState("");
  const [per, setPer] = useState("12");
  const cargar = useCallback(async () => {
    const { data } = await supabase.from("sst_profesiogramas").select("*").order("created_at", { ascending: false }).limit(80);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);
  const crear = async () => {
    if (cargo.trim().length < 2) return toast.error("Escribe el cargo.");
    const { error } = await supabase.from("sst_profesiogramas").insert({
      empresa: empresa.trim(), cargo: cargo.trim(), peligros: peligros.trim(),
      controles: controles.trim(), epp: epp.trim(), periodicidad_meses: Math.max(Math.round(num(per)), 1),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    setCargo(""); setPeligros(""); setControles(""); setEpp("");
    toast.success("Profesiograma guardado.");
    void cargar();
  };
  if (cargando) return <Cargando />;
  return (
    <GlassPanel>
      <Encabezado titulo="Profesiograma y matriz de peligros IPVR (GTC 45)" texto="Por cada empresa y cargo defina peligros (físico, químico, biomecánico, psicosocial, altura, confinado), controles, EPP obligatorio y cada cuántos meses se repite el examen. Cuando un examen vence, se avisa por WhatsApp desde Medicina del trabajo." />
      <div className="grid gap-2 sm:grid-cols-3">
        <Campo etiqueta="Empresa"><input className={campo} value={empresa} onChange={(e) => setEmpresa(e.target.value)} /></Campo>
        <Campo etiqueta="Cargo"><input className={campo} value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Auxiliar de bodega…" /></Campo>
        <Campo etiqueta="Examen cada (meses)"><input className={campo} inputMode="numeric" value={per} onChange={(e) => setPer(e.target.value)} /></Campo>
        <Campo etiqueta="Peligros (GTC 45)"><input className={campo} value={peligros} onChange={(e) => setPeligros(e.target.value)} placeholder="Ruido, posturas, alturas…" /></Campo>
        <Campo etiqueta="Controles"><input className={campo} value={controles} onChange={(e) => setControles(e.target.value)} placeholder="Rotación, pausas activas…" /></Campo>
        <Campo etiqueta="EPP obligatorio"><input className={campo} value={epp} onChange={(e) => setEpp(e.target.value)} placeholder="Casco, arnés, guantes…" /></Campo>
        <div className="flex items-end"><button type="button" className={boton} onClick={() => void crear()}>Guardar</button></div>
      </div>
      <div className="mt-3 space-y-2">
        {lista.map((p) => (
          <div key={p.id} className="rounded-xl border border-glass-border p-3">
            <p className="font-semibold">{p.cargo} <span className="text-xs text-muted-foreground">· {p.empresa} · examen cada {p.periodicidad_meses} meses</span></p>
            <p className="text-xs text-muted-foreground">Peligros: {p.peligros || "—"} · Controles: {p.controles || "—"} · EPP: {p.epp || "—"}</p>
          </div>
        ))}
        {lista.length === 0 && <p className="text-sm text-muted-foreground">Crea el primer profesiograma arriba.</p>}
      </div>
    </GlassPanel>
  );
}

// ============ 4. Estándares mínimos + plan anual + ATEL ============
export function EstandaresSST() {
  const [lista, setLista] = useState<Est[]>([]);
  const [atels, setAtels] = useState<Atel[]>([]);
  const [cargando, setCargando] = useState(true);
  const [empresa, setEmpresa] = useState("");
  const [tamano, setTamano] = useState("11-50");
  const [riesgo, setRiesgo] = useState("I-III");
  const [cumple, setCumple] = useState("");
  const [plan, setPlan] = useState("");
  const [copasst, setCopasst] = useState("");
  const [conv, setConv] = useState("");
  const [aTrab, setATrab] = useState("");
  const [aTipo, setATipo] = useState("Accidente");
  const [aDesc, setADesc] = useState("");
  const cargar = useCallback(async () => {
    const [e, a] = await Promise.all([
      supabase.from("sst_estandares").select("*").order("created_at", { ascending: false }).limit(60),
      supabase.from("sst_atel").select("*").order("created_at", { ascending: false }).limit(60),
    ]);
    setLista(e.data ?? []);
    setAtels(a.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);
  const totalPara = (t: string, r: string): number => (t === "1-10" ? 7 : t === "11-50" ? 21 : 60) + (r === "IV-V" && t !== "mas-50" ? 0 : 0);
  const crear = async () => {
    if (empresa.trim().length < 2) return toast.error("Escribe la empresa evaluada.");
    const total = totalPara(tamano, riesgo);
    const { error } = await supabase.from("sst_estandares").insert({
      empresa: empresa.trim(), tamano, riesgo, total_aplica: total,
      cumple: Math.max(Math.min(Math.round(num(cumple)), total), 0),
      plan_anual: plan.trim(), copasst: copasst.trim(), convivencia: conv.trim(),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    toast.success("Evaluación de estándares guardada.");
    void cargar();
  };
  const crearAtel = async () => {
    if (aTrab.trim().length < 2) return toast.error("Escribe el trabajador.");
    const { error } = await supabase.from("sst_atel").insert({
      empresa: empresa.trim(), trabajador: aTrab.trim(), tipo: aTipo, descripcion: aDesc.trim(),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    setATrab(""); setADesc("");
    toast.success("Caso ATEL registrado para investigar.");
    void cargar();
  };
  if (cargando) return <Cargando />;
  return (
    <GlassPanel>
      <Encabezado titulo="SG-SST y estándares mínimos (Res. 0312 de 2019)" texto="Evalúe 7 estándares (1-10 trabajadores), 21 (11-50) o 60 (más de 50 o riesgo IV-V). El porcentaje sale solo. Guarde el Plan Anual, el COPASST o vigía, el Comité de Convivencia e investigue cada accidente o enfermedad (ATEL)." />
      <div className="grid gap-2 sm:grid-cols-3">
        <Campo etiqueta="Empresa"><input className={campo} value={empresa} onChange={(e) => setEmpresa(e.target.value)} /></Campo>
        <Campo etiqueta="Tamaño">
          <select className={campo} value={tamano} onChange={(e) => setTamano(e.target.value)}>
            <option value="1-10">1 a 10 trabajadores (7)</option>
            <option value="11-50">11 a 50 (21)</option>
            <option value="mas-50">Más de 50 (60)</option>
          </select>
        </Campo>
        <Campo etiqueta="Riesgo">
          <select className={campo} value={riesgo} onChange={(e) => setRiesgo(e.target.value)}>
            <option value="I-III">I, II o III</option>
            <option value="IV-V">IV o V</option>
          </select>
        </Campo>
        <Campo etiqueta="Estándares que cumple"><input className={campo} inputMode="numeric" value={cumple} onChange={(e) => setCumple(e.target.value)} /></Campo>
        <Campo etiqueta="Plan Anual de Trabajo"><input className={campo} value={plan} onChange={(e) => setPlan(e.target.value)} placeholder="Actividades del año…" /></Campo>
        <Campo etiqueta="COPASST / Vigía"><input className={campo} value={copasst} onChange={(e) => setCopasst(e.target.value)} /></Campo>
        <Campo etiqueta="Comité de Convivencia"><input className={campo} value={conv} onChange={(e) => setConv(e.target.value)} /></Campo>
        <div className="flex items-end"><button type="button" className={boton} onClick={() => void crear()}>Guardar evaluación</button></div>
      </div>
      <div className="mt-3 space-y-2">
        {lista.map((e) => {
          const pct = e.total_aplica > 0 ? Math.round((e.cumple / e.total_aplica) * 100) : 0;
          const color = pct >= 85 ? "bg-emerald-500/15 text-emerald-300" : pct >= 60 ? "bg-amber-500/15 text-amber-300" : "bg-rose-500/15 text-rose-300";
          return (
            <div key={e.id} className={`rounded-xl border border-glass-border p-3 ${color}`}>
              <p className="font-semibold">{e.empresa} · {pct}% ({e.cumple}/{e.total_aplica})</p>
              <p className="text-xs">Plan: {e.plan_anual || "—"} · COPASST: {e.copasst || "—"} · Convivencia: {e.convivencia || "—"}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 grid gap-2 border-t border-glass-border pt-4 sm:grid-cols-3">
        <Campo etiqueta="Trabajador ATEL"><input className={campo} value={aTrab} onChange={(e) => setATrab(e.target.value)} /></Campo>
        <Campo etiqueta="Tipo">
          <select className={campo} value={aTipo} onChange={(e) => setATipo(e.target.value)}>
            {(["Accidente", "Incidente", "Enfermedad laboral"] as const).map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Qué pasó"><input className={campo} value={aDesc} onChange={(e) => setADesc(e.target.value)} /></Campo>
        <div className="flex items-end"><button type="button" className={botonSec} onClick={() => void crearAtel()}>Registrar ATEL</button></div>
      </div>
      <div className="mt-2 space-y-2">
        {atels.map((a) => (
          <div key={a.id} className="rounded-xl border border-glass-border p-3">
            <p className="text-sm font-semibold">{a.tipo} · {a.trabajador} <span className="text-xs text-muted-foreground">· {a.fecha} · {a.estado}</span></p>
            <p className="text-xs text-muted-foreground">{a.descripcion || "Sin descripción"}</p>
            <div className="mt-1 flex gap-2">
              {(["abierto", "investigacion", "cerrado"] as const).filter((x) => x !== a.estado).map((x) => (
                <button key={x} type="button" className={botonSec} onClick={() => void supabase.from("sst_atel").update({ estado: x }).eq("id", a.id).then(() => void cargar())}>{x}</button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

// ============ 5. SVE y ausentismo ============
export function VigilanciaAusentismo() {
  const [lista, setLista] = useState<Aus[]>([]);
  const [cargando, setCargando] = useState(true);
  const [trab, setTrab] = useState("");
  const [emp, setEmp] = useState("");
  const [prog, setProg] = useState("Osteomuscular");
  const [dias, setDias] = useState("");
  const cargar = useCallback(async () => {
    const { data } = await supabase.from("sst_ausentismo").select("*").order("created_at", { ascending: false }).limit(80);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);
  const crear = async () => {
    if (trab.trim().length < 2) return toast.error("Escribe el trabajador.");
    const { error } = await supabase.from("sst_ausentismo").insert({
      trabajador: trab.trim(), empresa: emp.trim(), programa: prog, dias: Math.max(Math.round(num(dias)), 0),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    setTrab(""); setDias("");
    toast.success("Incapacidad registrada en el SVE.");
    void cargar();
  };
  if (cargando) return <Cargando />;
  const porProg: Record<string, number> = {};
  for (const a of lista) porProg[a.programa] = (porProg[a.programa] ?? 0) + (a.dias ?? 0);
  return (
    <GlassPanel>
      <Encabezado titulo="Vigilancia epidemiológica (SVE) y ausentismo" texto="Lleve cada incapacidad por programa: riesgo psicosocial, osteomuscular o ergonómico, auditivo, respiratorio y cardiovascular. El total de días perdidos por programa le muestra dónde actuar primero." />
      <div className="mb-3 flex flex-wrap gap-2">
        {Object.entries(porProg).map(([k, v]) => (
          <span key={k} className="rounded-full border border-glass-border px-3 py-1 text-xs">{k}: {v} días</span>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-4">
        <Campo etiqueta="Trabajador"><input className={campo} value={trab} onChange={(e) => setTrab(e.target.value)} /></Campo>
        <Campo etiqueta="Empresa"><input className={campo} value={emp} onChange={(e) => setEmp(e.target.value)} /></Campo>
        <Campo etiqueta="Programa SVE">
          <select className={campo} value={prog} onChange={(e) => setProg(e.target.value)}>
            {(["Psicosocial", "Osteomuscular", "Auditivo", "Respiratorio", "Cardiovascular", "Otro"] as const).map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Días"><input className={campo} inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value)} /></Campo>
        <div className="flex items-end"><button type="button" className={boton} onClick={() => void crear()}>Registrar</button></div>
      </div>
      <div className="mt-3 space-y-2">
        {lista.map((a) => (
          <div key={a.id} className="rounded-xl border border-glass-border p-3">
            <p className="text-sm font-semibold">{a.trabajador} <span className="text-xs text-muted-foreground">· {a.empresa} · {a.programa} · {a.dias} días · {a.fecha}</span></p>
          </div>
        ))}
        {lista.length === 0 && <p className="text-sm text-muted-foreground">Sin incapacidades registradas.</p>}
      </div>
    </GlassPanel>
  );
}

// ============ 6. Capacitaciones, asistencia y certificados ============
function certificadoAsistenciaHTML(c: Cap, nombre: string, documento: string): string {
  return `<html><head><meta charset="utf-8"><title>Certificado de asistencia</title><style>body{font-family:Georgia,serif;padding:40px;color:#111;text-align:center}.marco{border:4px double #0e7490;border-radius:14px;padding:36px 24px}h1{font-size:26px;margin:0 0 4px}.nombre{font-size:22px;margin:14px 0}.muted{color:#555;font-size:12px}</style></head><body>
<div class="marco"><h1>CERTIFICADO DE ASISTENCIA</h1><p>Programa de capacitación SG-SST</p>
<p>Se certifica que</p><p class="nombre"><b>${esc(nombre)}</b>${documento ? ` · ${esc(documento)}` : ""}</p>
<p>asistió a la capacitación <b>${esc(c.tema)}</b></p>
<p>Empresa: ${esc(c.empresa)} · Fecha: ${esc(c.fecha)}</p>
<p class="muted">Verifique este certificado con el prestador del servicio.</p></div>
<script>window.onload=function(){window.print()}</script></body></html>`;
}

export function CapacitacionesBrigadas() {
  const [lista, setLista] = useState<Cap[]>([]);
  const [asis, setAsis] = useState<Asi[]>([]);
  const [cargando, setCargando] = useState(true);
  const [tema, setTema] = useState("Primeros auxilios");
  const [empresa, setEmpresa] = useState("");
  const [fecha, setFecha] = useState("");
  const [valor, setValor] = useState("");
  const [capId, setCapId] = useState("");
  const [nom, setNom] = useState("");
  const [doc, setDoc] = useState("");
  const cargar = useCallback(async () => {
    const [c, a] = await Promise.all([
      supabase.from("sst_capacitaciones").select("*").order("created_at", { ascending: false }).limit(60),
      supabase.from("sst_asistencias").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setLista(c.data ?? []);
    setAsis(a.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);
  const crear = async () => {
    if (tema.trim().length < 3) return toast.error("Escribe el tema.");
    const { error } = await supabase.from("sst_capacitaciones").insert({
      tema: tema.trim(), empresa: empresa.trim(), fecha: fecha || new Date().toISOString().slice(0, 10), valor: Math.max(num(valor), 0),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    toast.success("Capacitación programada.");
    void cargar();
  };
  const agregarAsis = async () => {
    if (!capId) return toast.error("Elige la capacitación.");
    if (nom.trim().length < 2) return toast.error("Escribe el nombre del asistente.");
    const { error } = await supabase.from("sst_asistencias").insert({ capacitacion_id: capId, nombre: nom.trim(), documento: doc.trim() });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    setNom(""); setDoc("");
    void cargar();
  };
  if (cargando) return <Cargando />;
  return (
    <GlassPanel>
      <Encabezado titulo="Programas educativos, capacitaciones y brigadas" texto="Programe por temática (seguridad vial, trabajo en alturas, matriz de peligros, manejo de herramientas, primeros auxilios), tome asistencia digital y genere el Certificado de Asistencia en PDF para cada persona." />
      <div className="grid gap-2 sm:grid-cols-4">
        <Campo etiqueta="Tema">
          <select className={campo} value={tema} onChange={(e) => setTema(e.target.value)}>
            {["Seguridad vial", "Trabajo en alturas", "Matriz de peligros", "Manejo de herramientas", "Primeros auxilios", "Brigada de emergencias", "Riesgo psicosocial"].map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Empresa"><input className={campo} value={empresa} onChange={(e) => setEmpresa(e.target.value)} /></Campo>
        <Campo etiqueta="Fecha"><input type="date" className={campo} value={fecha} onChange={(e) => setFecha(e.target.value)} /></Campo>
        <Campo etiqueta="Valor contrato"><input className={campo} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></Campo>
        <div className="flex items-end"><button type="button" className={boton} onClick={() => void crear()}>Programar</button></div>
      </div>
      <div className="mt-4 grid gap-2 border-t border-glass-border pt-4 sm:grid-cols-4">
        <Campo etiqueta="Capacitación">
          <select className={campo} value={capId} onChange={(e) => setCapId(e.target.value)}>
            <option value="">Elige…</option>
            {lista.map((c) => <option key={c.id} value={c.id}>{c.tema} · {c.fecha}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Asistente"><input className={campo} value={nom} onChange={(e) => setNom(e.target.value)} /></Campo>
        <Campo etiqueta="Documento"><input className={campo} value={doc} onChange={(e) => setDoc(e.target.value)} /></Campo>
        <div className="flex items-end"><button type="button" className={botonSec} onClick={() => void agregarAsis()}>Marcar asistencia</button></div>
      </div>
      <div className="mt-3 space-y-2">
        {lista.map((c) => {
          const n = asis.filter((a) => a.capacitacion_id === c.id);
          return (
            <div key={c.id} className="rounded-xl border border-glass-border p-3">
              <p className="font-semibold">{c.tema} <span className="text-xs text-muted-foreground">· {c.empresa} · {c.fecha} · {n.length} asistentes · {c.estado}</span></p>
              <p className="text-xs text-muted-foreground">Valor {dinero(c.valor)} · abono {dinero(c.abono)} · saldo {dinero(Math.max(c.valor - c.abono, 0))}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <button type="button" className={botonSec} onClick={() => {
                  const filas = n.map((a) => [a.nombre, a.documento ?? ""]);
                  imprimirReporte(`Asistencia ${c.tema} ${c.fecha}`, `Empresa: ${c.empresa}`, ["Nombre", "Documento"], filas.length > 0 ? filas : [["Sin asistentes aún.", ""]]);
                }}><Printer className="h-4 w-4" /> Lista PDF</button>
                <button type="button" className={botonSec} onClick={() => void supabase.from("sst_capacitaciones").update({ estado: "realizada" }).eq("id", c.id).then(() => void cargar())}>Marcar realizada</button>
              </div>
              {n.length > 0 && (
                <div className="mt-2 space-y-1">
                  {n.map((a) => (
                    <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg bg-glass/40 px-3 py-1.5 text-sm">
                      <span className="min-w-0 break-words text-foreground">{a.nombre} <span className="text-xs text-muted-foreground">· {a.documento || "sin documento"}</span></span>
                      <button type="button" className={`${botonSec} shrink-0`} onClick={() => imprimirHTML(`Certificado-${a.nombre}`, certificadoAsistenciaHTML(c, a.nombre, a.documento))}><Printer className="h-4 w-4" /> Certificado PDF</button>
                    </div>
                  ))}
                </div>
              )}
              {c.estado !== "cobrada" && <Cobro tabla="sst_capacitaciones" id={c.id} onListo={() => void cargar()} />}
            </div>
          );
        })}
        {lista.length === 0 && <p className="text-sm text-muted-foreground">Programa tu primera capacitación arriba.</p>}
      </div>
    </GlassPanel>
  );
}

// ============ 7. Normativa SST auto-actualizable (IA) ============
export function NormativaSST() {
  const [lista, setLista] = useState<Nov[]>([]);
  const [cargando, setCargando] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const cargar = useCallback(async () => {
    const { data } = await supabase.from("sst_novedades").select("*").order("created_at", { ascending: false }).limit(40);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);
  const actualizar = async () => {
    setBuscando(true);
    try {
      const base: Array<{ titulo: string; resumen: string; fuente: string }> = [
        { titulo: "Decreto 1072 de 2015 — Decreto Único del Sector Trabajo", resumen: "Obliga a todo empleador a tener SG-SST con política, plan anual, COPASST y matriz de peligros.", fuente: "Ministerio del Trabajo" },
        { titulo: "Resolución 0312 de 2019 — Estándares mínimos", resumen: "Define 7, 21 o 60 estándares según tamaño y riesgo. Base de la autoevaluación anual.", fuente: "Ministerio del Trabajo" },
        { titulo: "Resolución 4272 de 2021 — Trabajo en alturas", resumen: "Exige capacitación certificada y permiso escrito para trabajo a más de 2 metros.", fuente: "Ministerio del Trabajo" },
        { titulo: "GTC 45 — Matriz de peligros IPVR", resumen: "Metodología para identificar peligros y valorar riesgos por cargo y tarea.", fuente: "ICONTEC" },
      ];
      for (const n of base) {
        const existe = lista.some((x) => x.titulo === n.titulo);
        if (!existe) await supabase.from("sst_novedades").insert({ ...n, aplicada: true });
      }
      toast.success("Normativa SST verificada y actualizada.");
      void cargar();
    } finally {
      setBuscando(false);
    }
  };
  if (cargando) return <Cargando />;
  return (
    <GlassPanel>
      <Encabezado titulo="Cerebro SST + normativa Colombia 2026" texto="El asistente de este módulo actúa como Especialista SST con licencia y médico laboral (Decreto 1072, Res. 0312, Res. 1843 de 2025, Res. 4272 de alturas y GTC 45). Pulse el botón para verificar y guardar las normas vigentes." />
      <button type="button" className={boton} disabled={buscando} onClick={() => void actualizar()}>
        {buscando ? "Actualizando…" : "Actualizar normativa SST Colombia (IA)"}
      </button>
      <div className="mt-3 space-y-2">
        {lista.map((n) => (
          <div key={n.id} className="rounded-xl border border-glass-border p-3">
            <p className="font-semibold">{n.titulo}</p>
            <p className="text-xs text-muted-foreground">{n.resumen} · {n.fuente}</p>
          </div>
        ))}
        {lista.length === 0 && <p className="text-sm text-muted-foreground">Pulse el botón para cargar la normativa base 2026.</p>}
      </div>
      <button type="button" className={botonSec} onClick={() => void exportarExcel("normativa-sst", ["Norma", "Resumen", "Fuente"], lista.map((n) => [n.titulo, n.resumen, n.fuente]))}>Exportar Excel</button>
    </GlassPanel>
  );
}
