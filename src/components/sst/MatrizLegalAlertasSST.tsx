import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellRing, CheckCircle2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Cargando, Encabezado, botonSec, campo } from "@/components/comercio/ComercioModulos";
import { exportarExcel } from "@/lib/exportes";
import { CATALOGO_SST_2026, SECTORIALES_SST, type NormaSST } from "@/lib/sst-normativa";
import { nivelAusentismo, reincidentes } from "@/lib/sst-conocimiento";

type Fila = Tables<"sst_matriz_legal">;

const EXTRAS: NormaSST[] = [
  { codigo: "RES-2400-1979", titulo: "Resolución 2400 de 1979 — Estatuto de seguridad industrial", tema: "Seguridad industrial", resumen: "Disposiciones sobre higiene y seguridad en los establecimientos de trabajo: locales, orden y aseo, iluminación, ruido, EPP.", fuente: "Ministerio del Trabajo" },
  { codigo: "RES-2674-2013", titulo: "Resolución 2674 de 2013 — Manipulación de alimentos", tema: "Alimentos", resumen: "Buenas prácticas de manufactura y capacitación obligatoria de manipuladores de alimentos.", fuente: "Ministerio de Salud" },
  { codigo: "DEC-1530-1996", titulo: "Decreto 1530 de 1996 — Reporte de accidente grave o mortal", tema: "Reporte ATEL", resumen: "Obliga a reportar a la ARL y a la dirección territorial del Trabajo los accidentes graves o mortales y a investigarlos.", fuente: "Ministerio del Trabajo" },
  { codigo: "LEY-1503-2011", titulo: "Ley 1503 de 2011 — Seguridad vial en las empresas", tema: "Seguridad vial", resumen: "Obliga a las empresas con flota o conductores a capacitar y a diseñar acciones de seguridad vial.", fuente: "Congreso de la República" },
];

const TODAS: NormaSST[] = (() => {
  const vistos = new Set<string>();
  const salida: NormaSST[] = [];
  for (const n of [...CATALOGO_SST_2026, ...SECTORIALES_SST, ...EXTRAS]) {
    if (vistos.has(n.codigo)) continue;
    vistos.add(n.codigo);
    salida.push(n);
  }
  return salida;
})();

const ESTADOS: { v: string; t: string; clase: string }[] = [
  { v: "pendiente", t: "Pendiente", clase: "text-muted-foreground" },
  { v: "cumple", t: "Cumple", clase: "text-emerald-500" },
  { v: "parcial", t: "Cumple parcial", clase: "text-amber-500" },
  { v: "no_cumple", t: "No cumple", clase: "text-red-500" },
  { v: "no_aplica", t: "No aplica", clase: "text-muted-foreground" },
];

const msg = (m: string | undefined, d: string) => (m && m.length > 0 && m.length < 220 ? m : d);
const hoyISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const aWhatsapp = (tel: string | null | undefined, texto: string): string | null => {
  const d = (tel ?? "").replace(/\D/g, "");
  if (d.length < 7) return null;
  return `https://wa.me/${d.length === 10 ? `57${d}` : d}?text=${encodeURIComponent(texto)}`;
};

// ============ Matriz legal ============
export function MatrizLegalSST() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [buscar, setBuscar] = useState("");
  const cargar = useCallback(async () => {
    const { data } = await supabase.from("sst_matriz_legal").select("*").limit(300);
    setFilas(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  const porCodigo = useMemo(() => new Map(filas.map((f) => [f.codigo, f])), [filas]);

  const guardar = async (codigo: string, cambio: { estado?: string; responsable?: string; evidencia?: string; proxima_revision?: string | null }) => {
    const previa = porCodigo.get(codigo);
    const { error } = previa
      ? await supabase.from("sst_matriz_legal").update(cambio).eq("id", previa.id)
      : await supabase.from("sst_matriz_legal").insert({ codigo, ...cambio });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    void cargar();
  };

  if (cargando) return <Cargando />;
  const estadoDe = (c: string): string => porCodigo.get(c)?.estado ?? "pendiente";
  const aplican = TODAS.filter((n) => estadoDe(n.codigo) !== "no_aplica");
  const cumplen = aplican.filter((n) => estadoDe(n.codigo) === "cumple").length;
  const pct = aplican.length ? Math.round((cumplen / aplican.length) * 100) : 0;
  const lista = TODAS.filter((n) => `${n.codigo} ${n.titulo} ${n.tema}`.toLowerCase().includes(buscar.trim().toLowerCase()));

  const exportar = () =>
    exportarExcel("matriz-legal-sst", ["Norma", "Tema", "Requisito", "Estado", "Responsable", "Evidencia", "Próxima revisión"], TODAS.map((n) => {
      const f = porCodigo.get(n.codigo);
      return [n.titulo, n.tema, n.resumen, ESTADOS.find((e) => e.v === estadoDe(n.codigo))?.t ?? "", f?.responsable ?? "", f?.evidencia ?? "", f?.proxima_revision ?? ""];
    }));

  return (
    <GlassPanel>
      <Encabezado titulo="Matriz legal SST" texto="Cada norma que aplica al SG-SST con su estado de cumplimiento, responsable, evidencia y fecha de revisión. Marque «No aplica» las que no corresponden a la empresa." />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-glass-border px-3 py-1 text-xs">Cumplimiento legal: <b>{pct}%</b> ({cumplen} de {aplican.length})</span>
        <input className={campo} style={{ maxWidth: 260 }} placeholder="Buscar norma o tema…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
        <button type="button" className={botonSec} onClick={exportar}>Exportar a Excel</button>
      </div>
      <div className="space-y-2">
        {lista.map((n) => {
          const f = porCodigo.get(n.codigo);
          const est = ESTADOS.find((e) => e.v === estadoDe(n.codigo));
          return (
            <div key={n.codigo} className="rounded-xl border border-glass-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold">{n.titulo}</p>
                  <p className="text-xs text-muted-foreground">{n.tema} · {n.fuente}</p>
                  <p className="mt-1 text-xs">{n.resumen}</p>
                </div>
                <span className={`text-xs font-semibold ${est?.clase ?? ""}`}>{est?.t}</span>
              </div>
              <div className="mt-2 grid gap-2 sm:grid-cols-4">
                <select className={campo} value={estadoDe(n.codigo)} onChange={(e) => void guardar(n.codigo, { estado: e.target.value })}>
                  {ESTADOS.map((e) => <option key={e.v} value={e.v}>{e.t}</option>)}
                </select>
                <input className={campo} placeholder="Responsable" maxLength={120} defaultValue={f?.responsable ?? ""} onBlur={(e) => { if (e.target.value !== (f?.responsable ?? "")) void guardar(n.codigo, { responsable: e.target.value.trim() }); }} />
                <input className={campo} placeholder="Evidencia (documento, acta…)" maxLength={500} defaultValue={f?.evidencia ?? ""} onBlur={(e) => { if (e.target.value !== (f?.evidencia ?? "")) void guardar(n.codigo, { evidencia: e.target.value.trim() }); }} />
                <input className={campo} type="date" defaultValue={f?.proxima_revision ?? ""} onBlur={(e) => { if (e.target.value !== (f?.proxima_revision ?? "")) void guardar(n.codigo, { proxima_revision: e.target.value || null }); }} />
              </div>
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}

// ============ Alertas SST ============
type Alerta = { nivel: "alta" | "media" | "info"; titulo: string; detalle: string; wa?: string | null };

export function AlertasSST() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const hoy = hoyISO();
    const en30 = new Date();
    en30.setDate(en30.getDate() + 30);
    const limite = `${en30.getFullYear()}-${String(en30.getMonth() + 1).padStart(2, "0")}-${String(en30.getDate()).padStart(2, "0")}`;
    const hace180 = new Date();
    hace180.setDate(hace180.getDate() - 180);
    const desde = `${hace180.getFullYear()}-${String(hace180.getMonth() + 1).padStart(2, "0")}-${String(hace180.getDate()).padStart(2, "0")}`;

    const [t, c, a, e, au, ml, emp] = await Promise.all([
      supabase.from("sst_trabajadores").select("nombre,cargo,telefono,examen_vence").not("examen_vence", "is", null).lte("examen_vence", limite).limit(100),
      supabase.from("sst_capacitaciones").select("tema,empresa,fecha").eq("estado", "programada").lt("fecha", hoy).limit(50),
      supabase.from("sst_atel").select("trabajador,empresa,estado,fecha").neq("estado", "cerrado").limit(50),
      supabase.from("sst_estandares").select("empresa,cumple,total_aplica,plan_anual,copasst,convivencia,created_at").order("created_at", { ascending: false }).limit(30),
      supabase.from("sst_ausentismo").select("trabajador,empresa,programa,dias,fecha").gte("fecha", desde).limit(500),
      supabase.from("sst_matriz_legal").select("codigo,estado,proxima_revision").limit(300),
      supabase.from("sst_empresas").select("nombre,n_trabajadores").limit(100),
    ]);

    const lista: Alerta[] = [];
    for (const x of t.data ?? []) {
      const vencido = (x.examen_vence ?? "") < hoy;
      lista.push({
        nivel: vencido ? "alta" : "media",
        titulo: `${vencido ? "Examen médico vencido" : "Examen médico por vencer"}: ${x.nombre}`,
        detalle: `${x.cargo || "Sin cargo"} · vence el ${x.examen_vence}`,
        wa: aWhatsapp(x.telefono, `Hola ${x.nombre}, tu examen médico ocupacional ${vencido ? "venció" : "vence"} el ${x.examen_vence}. Por favor agenda tu cita.`),
      });
    }
    for (const x of c.data ?? []) lista.push({ nivel: "media", titulo: `Capacitación sin realizar: ${x.tema}`, detalle: `${x.empresa || "Sin empresa"} · estaba programada para el ${x.fecha}` });
    for (const x of a.data ?? []) lista.push({ nivel: x.estado === "abierto" ? "alta" : "media", titulo: `Accidente o enfermedad ${x.estado === "abierto" ? "sin investigar" : "en investigación"}: ${x.trabajador}`, detalle: `${x.empresa || "Sin empresa"} · ${x.fecha}. La investigación debe cerrarse (Res. 1401 de 2007).` });

    const vistas = new Set<string>();
    for (const x of e.data ?? []) {
      const k = x.empresa.trim().toLowerCase();
      if (vistas.has(k)) continue;
      vistas.add(k);
      const pct = x.total_aplica > 0 ? Math.round((x.cumple / x.total_aplica) * 100) : 0;
      const nom = x.empresa || "Empresa sin nombre";
      if (pct < 60) lista.push({ nivel: "alta", titulo: `Estándares mínimos críticos: ${nom} (${pct}%)`, detalle: "Menos del 60 % es calificación crítica: plan de mejoramiento inmediato y reporte a la ARL (Res. 0312 de 2019)." });
      else if (pct < 85) lista.push({ nivel: "media", titulo: `Estándares mínimos moderados: ${nom} (${pct}%)`, detalle: "Entre 60 % y 85 %: plan de mejoramiento y seguimiento a la ARL." });
      if (!x.plan_anual.trim()) lista.push({ nivel: "media", titulo: `Falta el plan anual de trabajo: ${nom}`, detalle: "El Decreto 1072 de 2015 exige plan anual con metas, responsables y recursos." });
      if (!x.copasst.trim()) lista.push({ nivel: "media", titulo: `Falta COPASST o Vigía: ${nom}`, detalle: "Resolución 2013 de 1986." });
      if (!x.convivencia.trim()) lista.push({ nivel: "media", titulo: `Falta Comité de Convivencia: ${nom}`, detalle: "Resolución 652 de 2012 y Ley 1010 de 2006." });
    }

    const aus = au.data ?? [];
    for (const r of reincidentes(aus, new Date())) lista.push({ nivel: "alta", titulo: `Ausentismo recurrente: ${r.trabajador}`, detalle: `${r.veces} incapacidades y ${r.dias} días en 6 meses. Cite a valoración con el médico laboral.` });
    for (const x of aus.filter((z) => z.dias >= 30)) lista.push({ nivel: "alta", titulo: `Incapacidad prolongada: ${x.trabajador}`, detalle: `${x.dias} días (${x.programa}). Haga seguimiento con EPS y ARL.` });

    const trabajadoresTotal = (emp.data ?? []).reduce((s, z) => s + (z.n_trabajadores ?? 0), 0);
    if (trabajadoresTotal > 0) {
      const dias30 = aus.filter((z) => z.fecha >= new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)).reduce((s, z) => s + z.dias, 0);
      const pct = (dias30 / (trabajadoresTotal * 30)) * 100;
      const n = nivelAusentismo(pct);
      if (n.nivel !== "Bajo") lista.push({ nivel: n.nivel === "Moderado" ? "media" : "alta", titulo: `Ausentismo ${n.nivel.toLowerCase()} últimos 30 días (${pct.toFixed(1)}%)`, detalle: n.texto });
    }

    for (const x of ml.data ?? []) {
      if (x.estado === "no_cumple") lista.push({ nivel: "alta", titulo: `Norma sin cumplir: ${x.codigo}`, detalle: "Marcada como «No cumple» en la matriz legal." });
      else if (x.estado !== "no_aplica" && x.proxima_revision && x.proxima_revision < hoy) lista.push({ nivel: "media", titulo: `Revisión legal vencida: ${x.codigo}`, detalle: `Debía revisarse el ${x.proxima_revision}.` });
    }
    lista.sort((p, q) => (p.nivel === q.nivel ? 0 : p.nivel === "alta" ? -1 : q.nivel === "alta" ? 1 : p.nivel === "media" ? -1 : 1));
    setAlertas(lista);
    setCargando(false);
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  if (cargando) return <Cargando />;
  const altas = alertas.filter((x) => x.nivel === "alta").length;
  return (
    <GlassPanel>
      <Encabezado titulo="Alertas SST" texto="El sistema revisa sus datos y le avisa lo que está vencido o en riesgo: exámenes médicos, capacitaciones, investigaciones ATEL, estándares mínimos, comités, ausentismo y matriz legal." />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-glass-border px-3 py-1 text-xs"><b>{alertas.length}</b> alertas · <b>{altas}</b> urgentes</span>
        <button type="button" className={botonSec} onClick={() => void cargar()}>Actualizar</button>
      </div>
      <div className="space-y-2">
        {alertas.map((x, i) => (
          <div key={`${x.titulo}-${i}`} className="flex flex-wrap items-start gap-3 rounded-xl border border-glass-border p-3">
            {x.nivel === "alta" ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" /> : <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-semibold">{x.titulo}</p>
              <p className="text-xs text-muted-foreground">{x.detalle}</p>
            </div>
            {x.wa && <a href={x.wa} target="_blank" rel="noreferrer" className={botonSec}><MessageCircle className="mr-1 inline h-3.5 w-3.5" />Avisar</a>}
          </div>
        ))}
        {alertas.length === 0 && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Todo al día: no hay alertas pendientes.</p>
        )}
      </div>
    </GlassPanel>
  );
}
