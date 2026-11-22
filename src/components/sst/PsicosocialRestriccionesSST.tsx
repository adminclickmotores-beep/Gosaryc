import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, num } from "@/components/comercio/ComercioModulos";
import { exportarExcel } from "@/lib/exportes";
import {
  CATEGORIAS_RESTRICCION, DOMINIOS_PSICOSOCIAL, claseNivel, evaluarPsicosocial, inferirCategoria, planPsicosocial, planRestriccion, textoNivel,
} from "@/lib/sst-psicosocial";

type Psico = Tables<"sst_psicosocial">;
type Restr = Tables<"sst_restricciones">;
type Eva = Tables<"sst_evaluaciones">;

const msg = (m: string | undefined, d: string) => (m && m.length > 0 && m.length < 220 ? m : d);
const hoyISO = (): string => new Date().toISOString().slice(0, 10);
const enMeses = (n: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
};
const limite = (v: string): string => String(Math.min(Math.max(num(v), 0), 100));

// ============ Batería de riesgo psicosocial ============
export function BateriaPsicosocial() {
  const [lista, setLista] = useState<Psico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [f, setF] = useState({ empresa: "", trabajador: "", cargo: "", aplicacion: "interna", evaluador: "", forma: "A", liderazgo: "", control: "", demandas: "", recompensas: "", extralaboral: "", estres: "" });
  const cargar = useCallback(async () => {
    const { data } = await supabase.from("sst_psicosocial").select("*").order("created_at", { ascending: false }).limit(200);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const puntajes = {
    liderazgo: num(f.liderazgo), control: num(f.control), demandas: num(f.demandas),
    recompensas: num(f.recompensas), extralaboral: num(f.extralaboral), estres: num(f.estres),
  };
  const vista = useMemo(() => evaluarPsicosocial(puntajes), [f]); // eslint-disable-line react-hooks/exhaustive-deps
  const planVista = useMemo(() => planPsicosocial(vista), [vista]);

  const guardar = async () => {
    if (f.trabajador.trim().length < 2) return toast.error("Escribe el trabajador o el grupo evaluado.");
    const plan = `${planVista.plazo}\n- ${planVista.acciones.join("\n- ")}`;
    const { error } = await supabase.from("sst_psicosocial").insert({
      empresa: f.empresa.trim(), trabajador: f.trabajador.trim(), cargo: f.cargo.trim(), aplicacion: f.aplicacion,
      evaluador: f.evaluador.trim(), forma: f.forma, fecha: hoyISO(), ...puntajes,
      nivel_intralaboral: vista.nivelIntra, nivel_extralaboral: vista.nivelExtra, nivel_estres: vista.nivelEstres, nivel_global: vista.nivelGlobal,
      plan, estado: vista.nivelGlobal === "sin_riesgo" || vista.nivelGlobal === "bajo" ? "cerrado" : "abierto",
      seguimiento: vista.nivelGlobal === "muy_alto" ? enMeses(1) : vista.nivelGlobal === "alto" ? enMeses(2) : enMeses(12),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    toast.success("Batería guardada con su plan de intervención.");
    setF({ ...f, trabajador: "", cargo: "", liderazgo: "", control: "", demandas: "", recompensas: "", extralaboral: "", estres: "" });
    void cargar();
  };
  const cambiarEstado = async (id: string, estado: string) => {
    const { error } = await supabase.from("sst_psicosocial").update({ estado }).eq("id", id);
    if (error) return toast.error(msg(error.message, "No se pudo actualizar."));
    void cargar();
  };
  if (cargando) return <Cargando />;
  const abiertos = lista.filter((x) => x.estado !== "cerrado" && (x.nivel_global === "alto" || x.nivel_global === "muy_alto"));
  const setN = (k: keyof typeof f, v: string) => setF({ ...f, [k]: v });

  return (
    <GlassPanel>
      <Encabezado titulo="Batería de riesgo psicosocial" texto="Registre los puntajes transformados (0 a 100) que entrega la batería del Ministerio (Res. 2646 de 2008 y 2404 de 2019). Se aplica de forma interna (psicólogo de la empresa) o externa (profesional con licencia SST). El sistema clasifica el nivel y sugiere el plan de intervención." />
      {abiertos.length > 0 && (
        <div className="mb-3 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
          {abiertos.length} evaluación(es) con riesgo alto o muy alto sin cerrar. Requieren intervención.
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-3">
        <Campo etiqueta="Empresa"><input className={campo} maxLength={160} value={f.empresa} onChange={(e) => setN("empresa", e.target.value)} /></Campo>
        <Campo etiqueta="Trabajador o grupo"><input className={campo} maxLength={160} value={f.trabajador} onChange={(e) => setN("trabajador", e.target.value)} /></Campo>
        <Campo etiqueta="Cargo"><input className={campo} maxLength={120} value={f.cargo} onChange={(e) => setN("cargo", e.target.value)} /></Campo>
        <Campo etiqueta="Aplicación">
          <select className={campo} value={f.aplicacion} onChange={(e) => setN("aplicacion", e.target.value)}>
            <option value="interna">Interna (psicólogo de la empresa)</option>
            <option value="externa">Externa (profesional contratado)</option>
          </select>
        </Campo>
        <Campo etiqueta="Evaluador (nombre y licencia SST)"><input className={campo} maxLength={160} value={f.evaluador} onChange={(e) => setN("evaluador", e.target.value)} /></Campo>
        <Campo etiqueta="Forma">
          <select className={campo} value={f.forma} onChange={(e) => setN("forma", e.target.value)}>
            <option value="A">Forma A (jefes, profesionales)</option>
            <option value="B">Forma B (auxiliares, operarios)</option>
          </select>
        </Campo>
      </div>
      <p className="mt-3 text-xs font-semibold">Intralaboral (0 a 100)</p>
      <div className="mt-1 grid gap-2 sm:grid-cols-4">
        {DOMINIOS_PSICOSOCIAL.map((d) => (
          <Campo key={d.clave} etiqueta={d.t}><input className={campo} inputMode="decimal" value={f[d.clave]} onChange={(e) => setN(d.clave, e.target.value.length > 0 ? limite(e.target.value) : "")} /></Campo>
        ))}
      </div>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Campo etiqueta="Extralaboral (0 a 100)"><input className={campo} inputMode="decimal" value={f.extralaboral} onChange={(e) => setN("extralaboral", e.target.value.length > 0 ? limite(e.target.value) : "")} /></Campo>
        <Campo etiqueta="Estrés (0 a 100)"><input className={campo} inputMode="decimal" value={f.estres} onChange={(e) => setN("estres", e.target.value.length > 0 ? limite(e.target.value) : "")} /></Campo>
      </div>
      <div className="mt-3 rounded-xl border border-glass-border p-3 text-sm">
        <p className="font-semibold">Resultado: <span className={claseNivel(vista.nivelGlobal)}>{textoNivel(vista.nivelGlobal)}</span></p>
        <p className="text-xs text-muted-foreground">Intralaboral {vista.intralaboral} ({textoNivel(vista.nivelIntra)}) · Extralaboral ({textoNivel(vista.nivelExtra)}) · Estrés ({textoNivel(vista.nivelEstres)}) · Dominio más crítico: {vista.dominioCritico}</p>
        <p className="mt-2 text-xs font-semibold">Plan de intervención sugerido — {planVista.plazo}</p>
        <ul className="list-disc pl-5 text-xs">{planVista.acciones.map((a) => <li key={a}>{a}</li>)}</ul>
      </div>
      <button type="button" className={`${boton} mt-3`} onClick={() => void guardar()}>Guardar batería y plan</button>

      <div className="mt-4 space-y-2">
        {lista.length > 0 && (
          <button type="button" className={botonSec} onClick={() => exportarExcel("bateria-psicosocial", ["Fecha", "Empresa", "Trabajador", "Cargo", "Aplicación", "Evaluador", "Nivel global", "Estado", "Plan"], lista.map((x) => [x.fecha, x.empresa, x.trabajador, x.cargo, x.aplicacion, x.evaluador, textoNivel(x.nivel_global), x.estado, x.plan]))}>Exportar a Excel</button>
        )}
        {lista.map((x) => (
          <div key={x.id} className="rounded-xl border border-glass-border p-3">
            <p className="break-words text-sm font-semibold">{x.trabajador} <span className="text-xs text-muted-foreground">· {x.empresa || "—"} · {x.cargo || "—"} · {x.aplicacion === "externa" ? "Externa" : "Interna"} · {x.fecha}</span></p>
            <p className="text-xs">Global: <b className={claseNivel(x.nivel_global)}>{textoNivel(x.nivel_global)}</b> · Intralaboral {textoNivel(x.nivel_intralaboral)} · Extralaboral {textoNivel(x.nivel_extralaboral)} · Estrés {textoNivel(x.nivel_estres)}</p>
            <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{x.plan}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select className={campo} style={{ maxWidth: 200 }} value={x.estado} onChange={(e) => void cambiarEstado(x.id, e.target.value)}>
                <option value="abierto">Abierto</option>
                <option value="en_intervencion">En intervención</option>
                <option value="cerrado">Cerrado</option>
              </select>
              <span className="text-xs text-muted-foreground">Seguimiento: {x.seguimiento ?? "—"}</span>
            </div>
          </div>
        ))}
        {lista.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay baterías registradas.</p>}
      </div>
    </GlassPanel>
  );
}

// ============ Restricciones laborales y plan de control ============
export function RestriccionesPlanSST() {
  const [restr, setRestr] = useState<Restr[]>([]);
  const [evas, setEvas] = useState<Eva[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [cat, setCat] = useState<Record<string, string>>({});
  const [dur, setDur] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    const [r, e] = await Promise.all([
      supabase.from("sst_restricciones").select("*").order("created_at", { ascending: false }).limit(300),
      supabase.from("sst_evaluaciones").select("*").order("created_at", { ascending: false }).limit(300),
    ]);
    setRestr(r.data ?? []);
    setEvas(e.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const clasificadas = useMemo(() => new Set(restr.map((r) => r.evaluacion_id).filter((x): x is string => !!x)), [restr]);
  // Evaluaciones con concepto distinto de "Apto" o con restricciones escritas, aún sin clasificar.
  const pendientes = evas.filter((e) => !clasificadas.has(e.id) && (e.concepto !== "Apto" || e.restricciones.trim().length > 0));

  const clasificar = async (e: Eva) => {
    const categoria = cat[e.id] ?? inferirCategoria(e.restricciones);
    const permanente = (dur[e.id] ?? "temporal") === "permanente";
    const plan = planRestriccion(categoria, permanente, e.concepto);
    const { error } = await supabase.from("sst_restricciones").insert({
      evaluacion_id: e.id, empresa: e.empresa, trabajador: e.trabajador, categoria, descripcion: e.restricciones,
      duracion: permanente ? "permanente" : "temporal", concepto: e.concepto,
      vence: permanente ? null : e.vence, seguimiento: enMeses(plan.seguimientoMeses),
      plan: `${plan.medidas.join("\n")}\nNormativa: ${plan.norma}`,
    });
    if (error) return toast.error(msg(error.message, "No se pudo clasificar."));
    toast.success("Restricción clasificada con su plan recomendado.");
    void cargar();
  };
  const cambiarEstado = async (id: string, estado: string) => {
    const { error } = await supabase.from("sst_restricciones").update({ estado }).eq("id", id);
    if (error) return toast.error(msg(error.message, "No se pudo actualizar."));
    void cargar();
  };

  if (cargando) return <Cargando />;
  const hoy = hoyISO();
  const lista = restr.filter((r) => {
    if (filtro === "vigentes") return r.estado === "vigente";
    if (filtro === "permanentes") return r.duracion === "permanente";
    if (filtro === "control") return r.estado === "vigente" && !!r.seguimiento && r.seguimiento <= enMeses(1);
    return true;
  });

  return (
    <div className="space-y-6">
      <GlassPanel>
        <Encabezado titulo="Restricciones laborales y plan de control" texto="Aparte del concepto de aptitud, aquí clasifica quién tiene restricciones, de qué tipo y por cuánto tiempo, y recibe el plan recomendado según la normativa (Res. 2346 de 2007, Res. 1918 de 2009, Ley 776 de 2002 y Decreto 1072 de 2015). Útil para los exámenes de control." />
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-glass-border px-3 py-1">Con restricción vigente: <b>{restr.filter((r) => r.estado === "vigente").length}</b></span>
          <span className="rounded-full border border-glass-border px-3 py-1">Permanentes: <b>{restr.filter((r) => r.duracion === "permanente").length}</b></span>
          <span className="rounded-full border border-glass-border px-3 py-1">Por clasificar: <b>{pendientes.length}</b></span>
        </div>
        {pendientes.length > 0 && <p className="mb-2 text-sm font-semibold">Pacientes por clasificar (desde sus exámenes)</p>}
        <div className="space-y-2">
          {pendientes.map((e) => {
            const sugerida = cat[e.id] ?? inferirCategoria(e.restricciones);
            const plan = planRestriccion(sugerida, (dur[e.id] ?? "temporal") === "permanente", e.concepto);
            return (
              <div key={e.id} className="rounded-xl border border-glass-border p-3">
                <p className="break-words text-sm font-semibold">{e.trabajador} <span className="text-xs text-muted-foreground">· {e.empresa || "—"} · {e.tipo} · {e.concepto} · {e.fecha}</span></p>
                <p className="text-xs">{e.restricciones || "Sin restricciones escritas."}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <select className={campo} value={sugerida} onChange={(x) => setCat({ ...cat, [e.id]: x.target.value })}>
                    {CATEGORIAS_RESTRICCION.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select className={campo} value={dur[e.id] ?? "temporal"} onChange={(x) => setDur({ ...dur, [e.id]: x.target.value })}>
                    <option value="temporal">Temporal</option>
                    <option value="permanente">Permanente</option>
                  </select>
                  <button type="button" className={boton} onClick={() => void clasificar(e)}>Clasificar y generar plan</button>
                </div>
                <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">{plan.medidas.map((m) => <li key={m}>{m}</li>)}</ul>
                <p className="text-xs text-muted-foreground">Normativa: {plan.norma}</p>
              </div>
            );
          })}
        </div>
      </GlassPanel>

      <GlassPanel>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select className={campo} style={{ maxWidth: 260 }} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="todos">Todas las restricciones</option>
            <option value="vigentes">Solo vigentes</option>
            <option value="permanentes">Solo permanentes</option>
            <option value="control">Examen de control en el próximo mes</option>
          </select>
          {lista.length > 0 && (
            <button type="button" className={botonSec} onClick={() => exportarExcel("restricciones-laborales", ["Trabajador", "Empresa", "Categoría", "Duración", "Concepto", "Descripción", "Seguimiento", "Estado", "Plan"], lista.map((r) => [r.trabajador, r.empresa, r.categoria, r.duracion, r.concepto, r.descripcion, r.seguimiento ?? "", r.estado, r.plan]))}>Exportar a Excel</button>
          )}
        </div>
        <div className="space-y-2">
          {lista.map((r) => (
            <div key={r.id} className="rounded-xl border border-glass-border p-3">
              <p className="break-words text-sm font-semibold">{r.trabajador} <span className="text-xs text-muted-foreground">· {r.empresa || "—"} · {r.categoria} · {r.duracion} · {r.concepto}</span></p>
              {r.descripcion && <p className="text-xs">{r.descripcion}</p>}
              <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{r.plan}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select className={campo} style={{ maxWidth: 180 }} value={r.estado} onChange={(e) => void cambiarEstado(r.id, e.target.value)}>
                  <option value="vigente">Vigente</option>
                  <option value="cumplida">Cumplida</option>
                  <option value="cerrada">Cerrada</option>
                </select>
                <span className={`text-xs ${r.seguimiento && r.seguimiento < hoy && r.estado === "vigente" ? "font-semibold text-red-500" : "text-muted-foreground"}`}>
                  Examen de control: {r.seguimiento ?? "—"}{r.vence ? ` · vence ${r.vence}` : ""}
                </span>
              </div>
            </div>
          ))}
          {lista.length === 0 && <p className="text-sm text-muted-foreground">No hay restricciones en esta vista.</p>}
        </div>
      </GlassPanel>
    </div>
  );
}
