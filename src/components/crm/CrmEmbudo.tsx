import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle, Bot, CalendarPlus, CheckCircle2, ChevronDown, ChevronUp, FileText, Flame, Globe, Instagram,
  Facebook, LayoutGrid, ListOrdered, MessageCircle, Plus, RefreshCw, RotateCcw, Search, Settings2, Snowflake,
  Sparkles, Sun, Target, Trash2, TrendingUp, UserRound, X, Check, CalendarDays, Clock, Handshake, Phone, Copy, Send,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { useAuth } from "@/contexts/AuthContext";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";
import { limpiarTexto, limpiarTelefono } from "@/lib/validacion-publica";
import {
  asegurarConfiguracionAutomaticaAgente,
  generarConfiguracionAutomaticaSector,
  type AgenteAutoRow,
} from "@/lib/agente-autoconfig";
import { entrenarSectorAgente } from "@/lib/agente-entrenamiento.functions";

type Lead = Tables<"crm_leads">;
type Pqrs = Tables<"crm_pqrs">;
type MemoriaFila = { id: string; tipo: string; contenido: string; created_at: string };
type Etapa = { id: string; titulo: string; color: string };
type VistaCrm = "kanban" | "fifo" | "agenda" | "pqrs" | "ia";
const RAPIDOS = ["Todos", "Calientes", "Hoy", "Vencidos"] as const;
type Rapido = (typeof RAPIDOS)[number];

/** Probabilidad de cierre por etapa (para el valor ponderado / forecast). */
const PROB_ETAPA: Record<string, number> = {
  nuevo: 0.1, calificacion: 0.25, cotizado: 0.5, cita: 0.6, separado: 0.8, ganado: 1, perdido: 0,
};

type Actividad = { tipo: string; texto: string; cuando: string };

function extraDe(l: Lead): Record<string, unknown> {
  const e = l.datos_extra;
  return e && typeof e === "object" && !Array.isArray(e) ? (e as Record<string, unknown>) : {};
}
function actividadesDe(l: Lead): Actividad[] {
  const a = extraDe(l).actividades;
  return Array.isArray(a) ? (a as Actividad[]) : [];
}
function nuevoExtra(l: Lead, cambios: Record<string, unknown>, act?: Actividad): Json {
  const base: Record<string, unknown> = { ...extraDe(l), ...cambios };
  if (act) base.actividades = [act, ...actividadesDe(l)].slice(0, 100);
  return base as Json;
}
const fechaLocal = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Lead scoring 0-100 según temperatura, presupuesto y etapa. */
function scoreDe(l: Lead): number {
  const t = tempDe(l);
  const temp = t === "CALIENTE" ? 40 : t === "TIBIO" ? 25 : t === "FRIO" ? 10 : 5;
  const v = Number(l.valor_estimado || 0);
  const pres = v >= 50000000 ? 25 : v >= 10000000 ? 20 : v >= 1000000 ? 14 : v > 0 ? 8 : 0;
  const etapa = Math.round((PROB_ETAPA[l.etapa_embudo] ?? 0.2) * 35);
  return Math.min(100, temp + pres + etapa);
}
function nivelScore(p: number): { texto: string; barra: string; clase: string } {
  if (p >= 70) return { texto: "Alta probabilidad", barra: "bg-emerald-500", clase: "text-emerald-600" };
  if (p >= 40) return { texto: "Probabilidad media", barra: "bg-amber-500", clase: "text-amber-600" };
  return { texto: "Baja probabilidad", barra: "bg-slate-400", clase: "text-muted-foreground" };
}
function ScoreBar({ l }: { l: Lead }) {
  const p = scoreDe(l);
  const n = nivelScore(p);
  return (
    <div className="mt-2">
      <div className="h-1.5 overflow-hidden rounded-full bg-glass-strong">
        <div className={`h-full rounded-full transition-all duration-500 ${n.barra}`} style={{ width: `${p}%` }} />
      </div>
      <p className={`mt-1 text-[11px] font-semibold tabular-nums ${n.clase}`}>
        {p} pts • {n.texto}
      </p>
    </div>
  );
}

/** Alerta de estancamiento: más de 24 h sin gestión. */
function sla(l: Lead, ahora: number): { texto: string; critico: boolean } | null {
  if (!ahora || l.etapa_embudo === "ganado" || l.etapa_embudo === "perdido") return null;
  const h = (ahora - new Date(l.ultima_interaccion).getTime()) / 3600000;
  if (h < 24) return null;
  const d = Math.floor(h / 24);
  return { texto: `Sin gestión hace ${d}d`, critico: d >= 3 };
}

function esVencido(l: Lead): boolean {
  if (l.etapa_embudo === "ganado" || l.etapa_embudo === "perdido") return false;
  return Date.now() - new Date(l.ultima_interaccion).getTime() > 24 * 3600000;
}

function Tendencia({ pct }: { pct: number | null }) {
  if (pct === null) return null;
  const sube = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
        sube ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600"
      }`}
    >
      <TrendingUp className={`h-3 w-3 ${sube ? "" : "rotate-180"}`} />
      {sube ? "+" : ""}
      {pct}% este mes
    </span>
  );
}

const ETAPAS_BASE: Etapa[] = [
  { id: "nuevo", titulo: "Nuevo Ingreso", color: "#3b82f6" },
  { id: "calificacion", titulo: "En Calificación IA", color: "#8b5cf6" },
  { id: "cotizado", titulo: "Cotizado / Propuesta", color: "#f59e0b" },
  { id: "cita", titulo: "Cita / Visita Agendada", color: "#06b6d4" },
  { id: "ganado", titulo: "Cerrado Ganado", color: "#10b981" },
  { id: "perdido", titulo: "Perdido", color: "#ef4444" },
];

function etapasPara(clave: string): Etapa[] {
  const renombrar = (cambios: Record<string, string>): Etapa[] => ETAPAS_BASE.map((e) => ({ ...e, titulo: cambios[e.id] ?? e.titulo }));
  if (clave === "concesionario") {
    const base = renombrar({ nuevo: "Nuevo Lead", calificacion: "Calificación IA", cotizado: "Cotizado / Crédito", cita: "Test-Drive / Visita" });
    const i = base.findIndex((e) => e.id === "ganado");
    return [...base.slice(0, i), { id: "separado", titulo: "Separado / Traspaso", color: "#14b8a6" }, ...base.slice(i)];
  }
  if (clave === "inmobiliaria" || clave === "construccion") return renombrar({ nuevo: "Nuevo Interesado", cotizado: "Propuesta / Subsidio", cita: "Visita al Proyecto", ganado: "Cierre / Escrituración" });
  if (clave === "salud" || clave === "belleza" || clave === "mascotas" || clave === "gimnasio") return renombrar({ cotizado: "Presupuesto", cita: "Cita Agendada", ganado: "Atendido / Cliente" });
  if (clave === "taller") return renombrar({ cotizado: "Cotizado / Diagnóstico", cita: "Cita en Taller", ganado: "Orden Cerrada" });
  return ETAPAS_BASE;
}

const dinero = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

function tiempo(desde: string, ahora: number): string {
  const min = Math.max(0, Math.floor((ahora - new Date(desde).getTime()) / 60000));
  if (min < 1) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  if (min < 1440) return `Hace ${Math.floor(min / 60)} h`;
  return `Hace ${Math.floor(min / 1440)} d`;
}

function tempDe(l: Lead): "CALIENTE" | "TIBIO" | "FRIO" | "" {
  const t = (l.temperatura ?? "").toUpperCase();
  if (t.startsWith("CAL")) return "CALIENTE";
  if (t.startsWith("TIB")) return "TIBIO";
  if (t.startsWith("FRI")) return "FRIO";
  return "";
}

const TEMP_UI = {
  CALIENTE: { texto: "Caliente", borde: "#f43f5e", clase: "bg-rose-500/10 text-rose-600", Icono: Flame },
  TIBIO: { texto: "Tibio", borde: "#f59e0b", clase: "bg-amber-500/10 text-amber-600", Icono: Sun },
  FRIO: { texto: "Frío", borde: "#0ea5e9", clase: "bg-sky-500/10 text-sky-600", Icono: Snowflake },
  "": { texto: "Sin calificar", borde: "#94a3b8", clase: "bg-muted text-muted-foreground", Icono: Snowflake },
} as const;

function iconoCanal(c: string) {
  if (c === "Facebook") return { Icono: Facebook, clase: "text-blue-500" };
  if (c === "Instagram") return { Icono: Instagram, clase: "text-purple-500" };
  if (c === "Página Web") return { Icono: Globe, clase: "text-sky-500" };
  if (c === "Google / Otro") return { Icono: Search, clase: "text-amber-500" };
  return { Icono: MessageCircle, clase: "text-green-500" };
}

const iniciales = (l: Lead) => {
  const base = (l.nombre || l.telefono || "?").trim();
  const p = base.split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "?") + (p[1]?.[0] ?? "")).toUpperCase();
};

const CANALES = ["Todos", "Facebook", "Instagram", "Página Web", "WhatsApp Directo"];
const ESTADOS_PQRS = ["Abierta", "En gestión", "Resuelta"] as const;

function normalizarEstadoPqrs(estado: string | null | undefined): "Abierta" | "En gestión" | "Resuelta" {
  const e = (estado ?? "").toLowerCase();
  if (e.includes("resuel") || e.includes("cerrad")) return "Resuelta";
  if (e.includes("gest") || e.includes("proce") || e.includes("curso")) return "En gestión";
  return "Abierta";
}

export function CrmEmbudo() {
  const { user } = useAuth();
  const { negocio } = useNegocio();
  const navigate = useNavigate();
  const tipoNegocioRaw = (negocio as unknown as { tipo_negocio?: string | null } | null)?.tipo_negocio ?? null;
  const tipo = resolverTipoNegocio(tipoNegocioRaw);
  const etapas = useMemo(() => etapasPara(tipo.clave), [tipo.clave]);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [pqrsLista, setPqrsLista] = useState<Pqrs[]>([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<VistaCrm>("kanban");
  const [busca, setBusca] = useState("");
  const [canal, setCanal] = useState("Todos");
  const [temp, setTemp] = useState("Todas");
  const [estado, setEstado] = useState("Todos");
  const [rapido, setRapido] = useState<Rapido>("Todos");
  const [filtroPqrs, setFiltroPqrs] = useState<"Todas" | "Abierta" | "En gestión" | "Resuelta">("Todas");
  const [abierto, setAbierto] = useState<Lead | null>(null);
  const [nuevo, setNuevo] = useState(false);
  const [ahora, setAhora] = useState(0);
  const [arrastrando, setArrastrando] = useState("");

  useEffect(() => {
    setAhora(Date.now());
    const t = setInterval(() => setAhora(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  const cargar = useCallback(async () => {
    if (!negocio?.id) return;
    const [resLeads, resPqrs] = await Promise.all([
      supabase
        .from("crm_leads")
        .select("*")
        .eq("negocio_id", negocio.id)
        .order("numero_turno", { ascending: true })
        .limit(500),
      supabase
        .from("crm_pqrs")
        .select("*")
        .eq("negocio_id", negocio.id)
        .order("created_at", { ascending: false })
        .limit(300),
    ]);
    if (resLeads.error) toast.error("No se pudieron cargar los prospectos.");
    setLeads(resLeads.data ?? []);
    setPqrsLista(resPqrs.data ?? []);
    setCargando(false);
  }, [negocio?.id]);

  useEffect(() => {
    void cargar();
    const t = setInterval(() => void cargar(), 20000);
    return () => clearInterval(t);
  }, [cargar]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return leads.filter((l) => {
      if (q && !`${l.nombre ?? ""} ${l.telefono}`.toLowerCase().includes(q)) return false;
      if (canal !== "Todos" && l.canal_origen !== canal) return false;
      if (temp !== "Todas" && tempDe(l) !== temp) return false;
      if (estado === "Sin atender" && l.atendido_por_humano) return false;
      if (estado === "En gestión" && !l.atendido_por_humano) return false;
      if (rapido === "Calientes" && tempDe(l) !== "CALIENTE") return false;
      if (rapido === "Hoy" && new Date(l.fecha_llegada).toDateString() !== new Date().toDateString()) return false;
      if (rapido === "Vencidos" && !esVencido(l)) return false;
      return true;
    });
  }, [leads, busca, canal, temp, estado, rapido]);

  const pqrsFiltradas = useMemo(() => {
    if (filtroPqrs === "Todas") return pqrsLista;
    return pqrsLista.filter((p) => normalizarEstadoPqrs(p.estado) === filtroPqrs);
  }, [pqrsLista, filtroPqrs]);

  const pqrsAbiertas = useMemo(
    () => pqrsLista.filter((p) => normalizarEstadoPqrs(p.estado) !== "Resuelta").length,
    [pqrsLista],
  );

  const activos = leads.filter((l) => l.etapa_embudo !== "ganado" && l.etapa_embudo !== "perdido");
  const calientes = activos.filter((l) => tempDe(l) === "CALIENTE");
  const valorEmbudo = activos.reduce((s, l) => s + Number(l.valor_estimado || 0), 0);
  const ganados = leads.filter((l) => l.etapa_embudo === "ganado").length;
  const cerrados = ganados + leads.filter((l) => l.etapa_embudo === "perdido").length;
  const tasa = cerrados > 0 ? Math.round((ganados / cerrados) * 100) : 0;
  const contar = (f: (l: Lead) => boolean) => leads.filter(f).length;
  const claveMes = (iso: string): number => {
    const f = new Date(iso);
    return f.getFullYear() * 12 + f.getMonth();
  };
  const mesActual = ahora ? claveMes(new Date(ahora).toISOString()) : -1;
  const tendencia = (valor: (l: Lead) => number): number | null => {
    if (!ahora) return null;
    const suma = (m: number) => leads.filter((l) => claveMes(l.fecha_llegada) === m).reduce((s, l) => s + valor(l), 0);
    const a = suma(mesActual);
    const p = suma(mesActual - 1);
    if (p === 0) return a > 0 ? 100 : null;
    return Math.round(((a - p) / p) * 100);
  };

  const forecast = activos.reduce((s, l) => s + Number(l.valor_estimado || 0) * (PROB_ETAPA[l.etapa_embudo] ?? 0.2), 0);
  const listaGanados = leads.filter((l) => l.etapa_embudo === "ganado");
  const ticket =
    listaGanados.length > 0
      ? listaGanados.reduce((s, l) => s + Number(l.valor_estimado || 0), 0) / listaGanados.length
      : activos.length > 0
        ? valorEmbudo / activos.length
        : 0;
  const alertas = activos.filter((l) => tempDe(l) === "CALIENTE" || esVencido(l)).length;

  const parchar = async (l: Lead, cambios: Partial<Lead>) => {
    const completo: Partial<Lead> = { ...cambios, ultima_interaccion: new Date().toISOString(), atendido_por_humano: true };
    const nuevoL: Lead = { ...l, ...completo };
    setLeads((ls) => ls.map((x) => (x.id === l.id ? nuevoL : x)));
    setAbierto((a) => (a && a.id === l.id ? nuevoL : a));
    const { error } = await supabase.from("crm_leads").update(completo).eq("id", l.id);
    if (error) {
      toast.error("No se pudo guardar el cambio.");
      void cargar();
    }
  };

  const mover = async (id: string, etapa: string) => {
    const previo = leads.find((l) => l.id === id);
    if (!previo || previo.etapa_embudo === etapa) return;
    const titulo = etapas.find((e) => e.id === etapa)?.titulo ?? etapa;
    await parchar(previo, {
      etapa_embudo: etapa,
      datos_extra: nuevoExtra(previo, {}, { tipo: "Etapa", texto: `Pasó a ${titulo}`, cuando: new Date().toISOString() }),
    });
  };

  const completarTarea = (l: Lead) => {
    const txt = String(extraDe(l).proxima_accion ?? "").trim() || "Seguimiento";
    void parchar(l, {
      datos_extra: nuevoExtra(l, { proxima_accion: "", proxima_fecha: "" }, { tipo: "Tarea", texto: `Completada: ${txt}`, cuando: new Date().toISOString() }),
    });
    toast.success("Tarea completada y registrada en la línea de tiempo.");
  };

  const cambiarEstadoPqrs = async (id: string, nuevoEstado: "Abierta" | "En gestión" | "Resuelta") => {
    setPqrsLista((lista) => lista.map((p) => (p.id === id ? { ...p, estado: nuevoEstado } : p)));
    const { error } = await supabase.from("crm_pqrs").update({ estado: nuevoEstado }).eq("id", id);
    if (error) {
      toast.error("No se pudo actualizar el estado de la PQRS.");
      void cargar();
    }
  };

  const abrirFichaDesdePqrs = async (p: Pqrs) => {
    const encontrado =
      leads.find((l) => (p.lead_id && l.id === p.lead_id) || (p.telefono && l.telefono === p.telefono)) ?? null;
    if (encontrado) {
      setAbierto(encontrado);
      return;
    }
    if (!negocio?.id || !user) return;
    const { data: creado, error } = await supabase
      .from("crm_leads")
      .insert({
        negocio_id: negocio.id,
        owner_id: negocio.owner_id ?? user.id,
        nombre: p.telefono ? `Cliente ${p.telefono}` : "Cliente PQRS",
        telefono: p.telefono || "",
        canal_origen: "WhatsApp Directo",
        interes: `${p.tipo}: ${p.resumen ?? ""}`.slice(0, 300),
        etapa_embudo: "nuevo",
        atendido_por_humano: true,
      })
      .select("*")
      .maybeSingle();
    if (error || !creado) {
      toast.error("No se pudo abrir la ficha 360° de este cliente.");
      return;
    }
    setLeads((ls) => [...ls, creado]);
    setAbierto(creado);
  };

  const actualizar = (l: Lead) => {
    setLeads((ls) => ls.map((x) => (x.id === l.id ? l : x)));
    setAbierto(l);
  };

  const pestanas: Array<{ id: VistaCrm; titulo: string; Icono: typeof LayoutGrid; badge?: number }> = [
    { id: "kanban", titulo: "Tablero Kanban", Icono: LayoutGrid },
    { id: "fifo", titulo: "Lista", Icono: ListOrdered },
    { id: "agenda", titulo: "Agenda", Icono: CalendarDays },
    { id: "pqrs", titulo: "Bandeja PQRS", Icono: AlertTriangle, badge: pqrsAbiertas },
    { id: "ia", titulo: "Inteligencia IA", Icono: Sparkles },
  ];

  return (
    <div className="crm-raiz space-y-4 rounded-2xl p-1 sm:p-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">CRM y Embudo IA</h1>
          <p className="text-sm text-muted-foreground">
            Prospectos, PQRS e inteligencia comercial de {negocio?.nombre ?? "tu negocio"} ({tipo.panel}).
          </p>
        </div>
        {(vista === "kanban" || vista === "fifo" || vista === "agenda") && (
          <button
            type="button"
            onClick={() => setNuevo(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:shadow-md"
          >
            <Plus className="h-4 w-4" /> Nuevo Prospecto
          </button>
        )}
      </div>

      {/* Navegación de 4 pestañas */}
      <div className="crm-segmentado flex flex-wrap gap-1 rounded-2xl p-1.5 text-sm">
        {pestanas.map(({ id, titulo, Icono, badge }) => (
          <button
            key={id}
            type="button"
            onClick={() => setVista(id)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all duration-200 sm:text-sm ${
              vista === id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
            }`}
          >
            <Icono className="h-4 w-4 shrink-0" />
            <span>{titulo}</span>
            {badge != null && badge > 0 && (
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                  vista === id ? "bg-primary-foreground/20 text-primary-foreground" : "bg-amber-500/20 text-amber-500"
                }`}
              >
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Pestañas Kanban y Cola de Llegada */}
      {(vista === "kanban" || vista === "fifo" || vista === "agenda") && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="crm-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/25 to-blue-500/5 text-blue-600">
                  <TrendingUp className="h-5 w-5" />
                </span>
                <Tendencia pct={tendencia((l) => Number(l.valor_estimado || 0))} />
              </div>
              <p className="mt-3 text-xs font-medium text-muted-foreground">Pipeline total (COP)</p>
              <p className="break-words text-2xl font-extrabold tracking-tight tabular-nums">{dinero(valorEmbudo)}</p>
              <p className="text-[11px] text-muted-foreground">{activos.length} leads en negociación</p>
            </div>
            <div className="crm-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/25 to-orange-500/5 text-orange-600">
                  <Flame className="h-5 w-5" />
                  {calientes.length > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-orange-500" />}
                </span>
              </div>
              <p className="mt-3 text-xs font-medium text-muted-foreground">Proyección ponderada (forecast)</p>
              <p className="break-words text-2xl font-extrabold tracking-tight tabular-nums text-orange-600">{dinero(forecast)}</p>
              <p className="text-[11px] text-muted-foreground">Valor × probabilidad de cada etapa</p>
            </div>
            <div className="crm-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-green-500/25 to-green-500/5 text-green-600">
                  <Target className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-xs font-medium text-muted-foreground">Conversión y ticket promedio</p>
              <p className="break-words text-2xl font-extrabold tracking-tight tabular-nums">
                {tasa}% <span className="text-sm font-semibold text-muted-foreground">· {dinero(ticket)}</span>
              </p>
            </div>
            <div className="crm-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/25 to-emerald-500/5 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-3 text-xs font-medium text-muted-foreground">Alertas de atención</p>
              <p className="text-3xl font-extrabold tracking-tight tabular-nums">{alertas}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-glass-strong">
                <div className="h-full rounded-full bg-rose-500 transition-all duration-500" style={{ width: `${activos.length ? Math.round((alertas / activos.length) * 100) : 0}%` }} />
              </div>
            </div>
          </div>

          <div className="crm-card space-y-3 p-3">
            <div className="flex flex-wrap gap-2">
              {RAPIDOS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRapido(r)}
                  className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
                    rapido === r ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-glass-border text-muted-foreground hover:bg-primary/10"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-full border border-glass-border bg-background/60 px-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                className="min-w-0 flex-1 bg-transparent py-2 text-base outline-none"
                placeholder="Buscar por nombre o teléfono"
                value={busca}
                maxLength={60}
                onChange={(e) => setBusca(limpiarTexto(e.target.value, 60))}
              />
            </label>
            <div className="flex flex-wrap gap-2 text-xs">
              {CANALES.map((c) => (
                <Pildora key={c} activa={canal === c} onClick={() => setCanal(c)} n={c === "Todos" ? leads.length : contar((l) => l.canal_origen === c)}>
                  {c}
                </Pildora>
              ))}
              <span className="mx-1 hidden w-px bg-glass-border sm:block" />
              {([["CALIENTE", "Caliente"], ["TIBIO", "Tibio"], ["FRIO", "Frío"]] as const).map(([k, t]) => (
                <Pildora key={k} activa={temp === k} onClick={() => setTemp(temp === k ? "Todas" : k)} n={contar((l) => tempDe(l) === k)}>
                  {t}
                </Pildora>
              ))}
              <span className="mx-1 hidden w-px bg-glass-border sm:block" />
              {(["Sin atender", "En gestión"] as const).map((e) => (
                <Pildora
                  key={e}
                  activa={estado === e}
                  onClick={() => setEstado(estado === e ? "Todos" : e)}
                  n={contar((l) => (e === "En gestión" ? l.atendido_por_humano : !l.atendido_por_humano))}
                >
                  {e}
                </Pildora>
              ))}
            </div>
          </div>

          {cargando ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Cargando prospectos…</p>
          ) : vista === "kanban" ? (
            <div className="flex gap-3 overflow-x-auto pb-3">
              {etapas.map((e) => {
                const items = filtrados.filter((l) => l.etapa_embudo === e.id).sort((a, b) => scoreDe(b) - scoreDe(a));
                return (
                  <div
                    key={e.id}
                    className="crm-columna flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-glass-border"
                    style={{ borderTop: `3px solid ${e.color}` }}
                    onDragOver={(ev) => ev.preventDefault()}
                    onDrop={() => {
                      if (arrastrando) void mover(arrastrando, e.id);
                      setArrastrando("");
                    }}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2 text-sm font-bold">
                        <span className="truncate">{e.titulo}</span>
                        <span
                          className="flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums text-white"
                          style={{ backgroundColor: e.color }}
                        >
                          {items.length}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm font-extrabold tracking-tight tabular-nums text-foreground">
                        {dinero(items.reduce((s, l) => s + Number(l.valor_estimado || 0), 0))}
                      </p>
                      <p className="text-[11px] tabular-nums text-muted-foreground">
                        Ponderado {dinero(items.reduce((s, l) => s + Number(l.valor_estimado || 0) * (PROB_ETAPA[e.id] ?? 0.2), 0))}
                      </p>
                    </div>
                    <div className="max-h-[60vh] min-h-24 space-y-2 overflow-y-auto px-2 pb-2">
                      {items.map((l) => (
                        <Tarjeta key={l.id} l={l} ahora={ahora} etapas={etapas} onMover={(et: string) => void mover(l.id, et)} onAbrir={() => setAbierto(l)} onArrastrar={() => setArrastrando(l.id)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : vista === "agenda" ? (
            <AgendaTareas leads={filtrados} ahora={ahora} onAbrir={(l: Lead) => setAbierto(l)} onCompletar={completarTarea} />
          ) : (
            <div className="crm-card overflow-x-auto p-0">
              <table className="w-full min-w-[960px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">Prospecto</th>
                    <th className="px-2">Score</th>
                    <th className="px-2">Etapa</th>
                    <th className="px-2">Temperatura</th>
                    <th className="px-2">Valor (COP)</th>
                    <th className="px-2">Próxima acción</th>
                    <th className="px-2">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filtrados]
                    .sort((a, b) => scoreDe(b) - scoreDe(a))
                    .map((l) => (
                      <FilaGrid
                        key={`${l.id}-${l.valor_estimado}-${String(extraDe(l).proxima_accion ?? "")}`}
                        l={l}
                        etapas={etapas}
                        ahora={ahora}
                        onAbrir={() => setAbierto(l)}
                        onParchar={parchar}
                      />
                    ))}
                  {filtrados.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        Sin prospectos con estos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Pestaña 3: Bandeja PQRS */}
      {vista === "pqrs" && (
        <GlassPanel className="space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg">Bandeja PQRS radicadas por el bot</h2>
              <p className="text-xs text-muted-foreground">
                Peticiones, quejas, reclamos y sugerencias detectadas automáticamente en WhatsApp.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 text-xs">
              {(["Todas", ...ESTADOS_PQRS] as const).map((est) => {
                const n =
                  est === "Todas"
                    ? pqrsLista.length
                    : pqrsLista.filter((p) => normalizarEstadoPqrs(p.estado) === est).length;
                return (
                  <Pildora key={est} activa={filtroPqrs === est} onClick={() => setFiltroPqrs(est)} n={n}>
                    {est}
                  </Pildora>
                );
              })}
            </div>
          </div>

          {pqrsFiltradas.length === 0 ? (
            <p className="rounded-xl border border-glass-border/60 bg-background/40 p-6 text-center text-sm text-muted-foreground">
              No hay PQRS en este estado todavía.
            </p>
          ) : (
            <div className="space-y-2.5">
              {pqrsFiltradas.map((p) => {
                const estNorm = normalizarEstadoPqrs(p.estado);
                const urg = (p.urgencia ?? "Media").toLowerCase();
                const claseUrg = urg.includes("alta")
                  ? "bg-red-500/15 text-red-500"
                  : urg.includes("baja")
                    ? "bg-sky-500/15 text-sky-500"
                    : "bg-amber-500/15 text-amber-500";
                return (
                  <div
                    key={p.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-glass-border bg-background/40 p-3.5"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-primary/15 px-2.5 py-0.5 font-medium text-primary">{p.tipo}</span>
                        <span className={`rounded-full px-2.5 py-0.5 font-medium ${claseUrg}`}>
                          Urgencia {p.urgencia || "Media"}
                        </span>
                        <span className="text-muted-foreground">{p.telefono || "Sin teléfono"}</span>
                        <span className="text-muted-foreground">
                          · {new Date(p.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      </div>
                      <p className="break-words text-sm text-foreground">{p.resumen || "Sin descripción detallada."}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label="Estado de PQRS"
                        className="rounded-lg border border-glass-border bg-background/60 px-2.5 py-1.5 text-base sm:text-xs"
                        value={estNorm}
                        onChange={(e) => void cambiarEstadoPqrs(p.id, e.target.value as "Abierta" | "En gestión" | "Resuelta")}
                      >
                        {ESTADOS_PQRS.map((est) => (
                          <option key={est} value={est}>
                            {est}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => void abrirFichaDesdePqrs(p)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                      >
                        <UserRound className="h-3.5 w-3.5" /> Ficha 360°
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassPanel>
      )}

      {/* Pestaña 4: Inteligencia IA (Automática) */}
      {vista === "ia" && negocio?.id && user && (
        <InteligenciaIAAutomatica
          negocioId={negocio.id}
          ownerId={negocio.owner_id ?? user.id}
          nombreNegocio={negocio.nombre}
          tipoNegocio={tipoNegocioRaw}
          ciudad={negocio.ciudad}
          horarios={negocio.horarios}
        />
      )}

      {nuevo && negocio?.id && user && (
        <NuevoProspecto
          onCerrar={() => setNuevo(false)}
          onCreado={() => {
            setNuevo(false);
            void cargar();
          }}
          negocioId={negocio.id}
          ownerId={negocio.owner_id ?? user.id}
        />
      )}
      {abierto && (
        <Panel360
          lead={abierto}
          etapas={etapas}
          tipoClave={tipo.clave}
          rutaAgente={tipo.clave === "restaurante" ? "/restaurante" : `/negocio/${tipo.clave}`}
          nombreNegocio={negocio?.nombre ?? "nuestro negocio"}
          onParchar={parchar}
          onCerrar={() => setAbierto(null)}
          onCambio={actualizar}
          onNavegar={(to: string, search?: Record<string, string>) => void navigate({ to: to as never, search: search as never })}
        />
      )}
    </div>
  );
}

/** Pestaña 4 del CRM: muestra la configuración automática del sector y oculta ajustes avanzados en un acordeón opcional. */
function InteligenciaIAAutomatica({
  negocioId,
  ownerId,
  nombreNegocio,
  tipoNegocio,
  ciudad,
  horarios,
}: {
  negocioId: string;
  ownerId: string;
  nombreNegocio: string;
  tipoNegocio: string | null;
  ciudad: string | null;
  horarios: string | null;
}) {
  const auto = useMemo(
    () => generarConfiguracionAutomaticaSector(tipoNegocio, nombreNegocio),
    [tipoNegocio, nombreNegocio],
  );
  const [agente, setAgente] = useState<AgenteAutoRow | null>(null);
  const [memoria, setMemoria] = useState<MemoriaFila[]>([]);
  const [conteoCatalogo, setConteoCatalogo] = useState({ productos: 0, comercio: 0, vehiculos: 0 });
  const [avanzadoAbierto, setAvanzadoAbierto] = useState(false);

  const [nombreAgente, setNombreAgente] = useState(auto.nombre_agente);
  const [personalidad, setPersonalidad] = useState(auto.personalidad);
  const [objetivoCierre, setObjetivoCierre] = useState(auto.objetivo_cierre);
  const [cierreAutonomo, setCierreAutonomo] = useState(true);
  const [instrucciones, setInstrucciones] = useState(auto.instrucciones);
  const [nuevaRegla, setNuevaRegla] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [entrenando, setEntrenando] = useState(false);

  const cargarTodo = useCallback(async () => {
    const res = await asegurarConfiguracionAutomaticaAgente({
      negocioId,
      ownerId,
      tipoNegocio,
      nombreNegocio,
    });
    if (res.agente) {
      setAgente(res.agente);
      setNombreAgente(res.agente.nombre_agente || auto.nombre_agente);
      setPersonalidad(res.agente.personalidad || auto.personalidad);
      setObjetivoCierre(res.agente.objetivo_cierre || auto.objetivo_cierre);
      setCierreAutonomo(res.agente.cierre_autonomo !== false);
      setInstrucciones(res.agente.instrucciones ?? auto.instrucciones);
    }

    const [memRes, prodRes, comRes, vehRes] = await Promise.all([
      supabase
        .from("agente_memoria")
        .select("id,tipo,contenido,created_at")
        .eq("negocio_id", negocioId)
        .in("tipo", ["sector", "regla_dueno"])
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("restaurante_productos")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", ownerId)
        .eq("activo", true),
      supabase
        .from("com_productos")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", ownerId),
      supabase
        .from("vehiculos_inventario")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", ownerId),
    ]);

    setMemoria((memRes.data ?? []) as MemoriaFila[]);
    setConteoCatalogo({
      productos: prodRes.count ?? 0,
      comercio: comRes.count ?? 0,
      vehiculos: vehRes.count ?? 0,
    });
  }, [negocioId, ownerId, tipoNegocio, nombreNegocio, auto]);

  useEffect(() => {
    void cargarTodo();
  }, [cargarTodo]);

  const guardarAvanzado = async () => {
    if (!agente) return;
    setGuardando(true);
    const { data, error } = await supabase
      .from("agente_whatsapp")
      .update({
        nombre_agente: nombreAgente.trim() || auto.nombre_agente,
        personalidad: personalidad.trim() || auto.personalidad,
        objetivo_cierre: objetivoCierre.trim() || auto.objetivo_cierre,
        cierre_autonomo: cierreAutonomo,
        instrucciones: instrucciones.trim() || null,
      })
      .eq("id", agente.id)
      .select("id,negocio_id,owner_id,clave,activo,nombre_agente,instrucciones,ia_activa,personalidad,objetivo_cierre,cierre_autonomo")
      .maybeSingle();
    setGuardando(false);
    if (error || !data) {
      toast.error("No se pudieron guardar los ajustes avanzados.");
      return;
    }
    setAgente(data as AgenteAutoRow);
    toast.success("Reglas avanzadas guardadas");
  };

  const restaurarAutomatico = async () => {
    setGuardando(true);
    const res = await asegurarConfiguracionAutomaticaAgente({
      negocioId,
      ownerId,
      tipoNegocio,
      nombreNegocio,
      forzar: true,
    });
    setGuardando(false);
    if (res.error) {
      toast.error("No se pudo restaurar la configuración automática.");
      return;
    }
    toast.success(`Configuración automática restaurada para ${auto.etiqueta_sector}`);
    void cargarTodo();
  };

  const actualizarSectorIA = async () => {
    setEntrenando(true);
    try {
      await entrenarSectorAgente({ data: { negocioId, tipoNegocio: tipoNegocio ?? "", ciudad: ciudad ?? "" } });
      toast.success("Conocimiento del sector actualizado");
      void cargarTodo();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar el conocimiento del sector.");
    } finally {
      setEntrenando(false);
    }
  };

  const agregarRegla = async () => {
    const t = nuevaRegla.trim().slice(0, 400);
    if (t.length < 5) return;
    const { error } = await supabase.from("agente_memoria").insert({
      negocio_id: negocioId,
      owner_id: ownerId,
      tipo: "regla_dueno",
      contenido: t,
    });
    if (error) {
      toast.error("No se pudo guardar la regla.");
      return;
    }
    setNuevaRegla("");
    void cargarTodo();
  };

  const quitarMemoria = async (id: string) => {
    await supabase.from("agente_memoria").delete().eq("id", id);
    void cargarTodo();
  };

  const totalItemsCatalogo = conteoCatalogo.productos + conteoCatalogo.comercio + conteoCatalogo.vehiculos;
  const reglasGuardadas = memoria.filter((m) => m.tipo === "regla_dueno");
  const conocimientoSector = memoria.filter((m) => m.tipo === "sector");

  return (
    <div className="space-y-4">
      <GlassPanel className="space-y-4 p-5">
        <div className="flex flex-wrap items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
            <Bot className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-lg text-foreground">
              ✅ Tu agente ya está entrenado y configurado automáticamente para {auto.etiqueta_sector}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              No necesitas configurar nada manualmente: el agente lee en tiempo real tu catálogo, precios, stock y datos del negocio en Gosaryc.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-glass-border bg-background/40 p-3.5">
            <p className="text-xs font-medium text-muted-foreground">Personalidad y tono activo</p>
            <p className="mt-1 text-sm font-medium text-foreground">{personalidad}</p>
          </div>
          <div className="rounded-xl border border-glass-border bg-background/40 p-3.5">
            <p className="text-xs font-medium text-muted-foreground">Objetivo de cierre automático</p>
            <p className="mt-1 text-sm font-medium text-foreground">{objetivoCierre}</p>
          </div>
          <div className="rounded-xl border border-glass-border bg-background/40 p-3.5">
            <p className="text-xs font-medium text-muted-foreground">Datos conectados de tu negocio</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {totalItemsCatalogo > 0
                ? `${totalItemsCatalogo} productos/unidades sincronizados con precios y stock`
                : "Catálogo conectado automáticamente (agrega productos y el bot los leerá al instante)"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {ciudad ? `Ciudad: ${ciudad}` : "Ciudad pendiente"} · {horarios ? "Horarios cargados" : "Horarios en Datos del negocio"}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-glass-border/70 bg-background/40 p-3.5">
          <p className="text-xs font-medium text-muted-foreground">Reglas base activas del negocio ({reglasGuardadas.length})</p>
          <ul className="mt-2 space-y-1 text-xs text-foreground/90">
            {(reglasGuardadas.length > 0 ? reglasGuardadas.map((r) => r.contenido) : auto.reglas_base).slice(0, 6).map((txt, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                <span className="break-words">{txt}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Acordeón colapsado para ajustes avanzados opcionales */}
        <div className="border-t border-glass-border/60 pt-3">
          <button
            type="button"
            onClick={() => setAvanzadoAbierto((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-glass-border bg-background/50 px-4 py-3 text-left text-sm font-medium hover:bg-background/70"
          >
            <span className="inline-flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              ⚙️ Personalizar reglas avanzadas (Opcional)
            </span>
            {avanzadoAbierto ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          {avanzadoAbierto && (
            <div className="mt-4 space-y-4 rounded-xl border border-glass-border bg-background/40 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block text-xs text-muted-foreground">Nombre del asistente</span>
                  <input
                    className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
                    value={nombreAgente}
                    maxLength={40}
                    onChange={(e) => setNombreAgente(e.target.value)}
                  />
                </label>
                <label className="flex cursor-pointer items-center gap-2 self-end rounded-lg border border-glass-border bg-background/60 px-3 py-2.5 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={cierreAutonomo}
                    onChange={(e) => setCierreAutonomo(e.target.checked)}
                  />
                  Cierre autónomo de ventas
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block text-xs text-muted-foreground">Personalidad y tono</span>
                  <input
                    className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
                    value={personalidad}
                    maxLength={160}
                    onChange={(e) => setPersonalidad(e.target.value)}
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block text-xs text-muted-foreground">Objetivo de cierre</span>
                  <input
                    className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
                    value={objetivoCierre}
                    maxLength={180}
                    onChange={(e) => setObjetivoCierre(e.target.value)}
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="mb-1 block text-xs text-muted-foreground">Reglas e instrucciones extra</span>
                  <textarea
                    className="min-h-24 w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
                    value={instrucciones}
                    maxLength={1000}
                    onChange={(e) => setInstrucciones(e.target.value)}
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => void guardarAvanzado()}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {guardando ? "Guardando…" : "Guardar ajustes"}
                </button>
                <button
                  type="button"
                  disabled={guardando}
                  onClick={() => void restaurarAutomatico()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-glass-border px-3.5 py-2 text-sm hover:bg-background/70 disabled:opacity-60"
                >
                  <RotateCcw className="h-4 w-4" /> Restaurar automático del sector
                </button>
                <button
                  type="button"
                  disabled={entrenando}
                  onClick={() => void actualizarSectorIA()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-glass-border px-3.5 py-2 text-sm hover:bg-background/70 disabled:opacity-60"
                >
                  <RefreshCw className={`h-4 w-4 ${entrenando ? "animate-spin" : ""}`} />
                  {entrenando ? "Actualizando…" : "Enriquecer conocimiento del sector con IA"}
                </button>
              </div>

              {/* Reglas adicionales en agente_memoria */}
              <div className="space-y-2 border-t border-glass-border/60 pt-3">
                <span className="block text-xs font-medium text-muted-foreground">Reglas puntuales del negocio</span>
                {reglasGuardadas.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-glass-border/60 bg-background/60 px-3 py-2 text-sm"
                  >
                    <span className="min-w-0 break-words">{m.contenido}</span>
                    <button
                      type="button"
                      onClick={() => void quitarMemoria(m.id)}
                      aria-label="Quitar regla"
                      className="shrink-0 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
                    placeholder="Ej: Nunca ofrezcas descuentos mayores al 5 %"
                    maxLength={400}
                    value={nuevaRegla}
                    onChange={(e) => setNuevaRegla(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => void agregarRegla()}
                    disabled={nuevaRegla.trim().length < 5}
                    className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60"
                  >
                    <Plus className="h-4 w-4" /> Agregar
                  </button>
                </div>
              </div>

              {conocimientoSector.length > 0 && (
                <div className="space-y-2 border-t border-glass-border/60 pt-3">
                  <span className="block text-xs font-medium text-muted-foreground">Conocimiento cargado del sector</span>
                  {conocimientoSector.map((m) => (
                    <details key={m.id} className="rounded-lg border border-glass-border/60 bg-background/60 px-3 py-2 text-sm">
                      <summary className="cursor-pointer font-medium">{m.contenido.split(":")[0]}</summary>
                      <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
                        {m.contenido.slice(m.contenido.indexOf(":") + 1).trim()}
                      </p>
                      <button
                        type="button"
                        onClick={() => void quitarMemoria(m.id)}
                        className="mt-2 inline-flex items-center gap-1 text-xs text-destructive"
                      >
                        <Trash2 className="h-3 w-3" /> Quitar
                      </button>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}

const CAMPO_GRID = "w-full rounded-lg border border-glass-border bg-background/60 px-2 py-1 text-base sm:text-xs";

function FilaGrid({
  l, etapas, ahora, onAbrir, onParchar,
}: {
  l: Lead;
  etapas: Etapa[];
  ahora: number;
  onAbrir: () => void;
  onParchar: (l: Lead, c: Partial<Lead>) => Promise<void>;
}) {
  const extra = extraDe(l);
  const [valor, setValor] = useState(String(Number(l.valor_estimado) || ""));
  const [accion, setAccion] = useState(String(extra.proxima_accion ?? ""));
  const fecha = String(extra.proxima_fecha ?? "");
  const alerta = sla(l, ahora);
  const pts = scoreDe(l);
  const n = nivelScore(pts);
  return (
    <tr className="border-t border-glass-border/60 align-middle hover:bg-primary/5">
      <td className="p-3">
        <button type="button" onClick={onAbrir} className="text-left">
          <span className="block font-semibold">{l.nombre || "Sin nombre"}</span>
          <span className="block text-xs text-muted-foreground">{l.telefono}</span>
          {alerta && (
            <span className={`text-[11px] font-semibold ${alerta.critico ? "text-rose-600" : "text-amber-600"}`}>{alerta.texto}</span>
          )}
        </button>
      </td>
      <td className="px-2">
        <span className={`text-xs font-bold tabular-nums ${n.clase}`}>{pts} pts</span>
        <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-glass-strong">
          <div className={`h-full rounded-full ${n.barra}`} style={{ width: `${pts}%` }} />
        </div>
      </td>
      <td className="px-2">
        <select
          aria-label="Etapa"
          className={CAMPO_GRID}
          value={l.etapa_embudo}
          onChange={(e) => {
            const titulo = etapas.find((x) => x.id === e.target.value)?.titulo ?? e.target.value;
            void onParchar(l, {
              etapa_embudo: e.target.value,
              datos_extra: nuevoExtra(l, {}, { tipo: "Etapa", texto: `Pasó a ${titulo}`, cuando: new Date().toISOString() }),
            });
          }}
        >
          {etapas.map((e) => (
            <option key={e.id} value={e.id}>
              {e.titulo}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2">
        <select
          aria-label="Temperatura"
          className={CAMPO_GRID}
          value={tempDe(l)}
          onChange={(e) => void onParchar(l, { temperatura: e.target.value || null })}
        >
          <option value="">Sin calificar</option>
          <option value="CALIENTE">Caliente</option>
          <option value="TIBIO">Tibio</option>
          <option value="FRIO">Frío</option>
        </select>
      </td>
      <td className="px-2">
        <input
          aria-label="Valor estimado"
          className={`${CAMPO_GRID} tabular-nums`}
          inputMode="numeric"
          maxLength={12}
          value={valor}
          onChange={(e) => setValor(e.target.value.replace(/[^0-9]/g, ""))}
          onBlur={() => {
            if ((Number(valor) || 0) !== Number(l.valor_estimado || 0)) void onParchar(l, { valor_estimado: Number(valor) || 0 });
          }}
        />
      </td>
      <td className="px-2">
        <input
          aria-label="Próxima acción"
          className={CAMPO_GRID}
          maxLength={120}
          placeholder="Ej. Llamar para cerrar"
          value={accion}
          onChange={(e) => setAccion(limpiarTexto(e.target.value, 120))}
          onBlur={() => {
            if (accion.trim() !== String(extra.proxima_accion ?? "")) void onParchar(l, { datos_extra: nuevoExtra(l, { proxima_accion: accion.trim() }) });
          }}
        />
      </td>
      <td className="px-2">
        <input
          type="date"
          aria-label="Fecha de la próxima acción"
          className={CAMPO_GRID}
          value={fecha}
          onChange={(e) => void onParchar(l, { datos_extra: nuevoExtra(l, { proxima_fecha: e.target.value }) })}
        />
      </td>
    </tr>
  );
}

function AgendaTareas({
  leads, ahora, onAbrir, onCompletar,
}: {
  leads: Lead[];
  ahora: number;
  onAbrir: (l: Lead) => void;
  onCompletar: (l: Lead) => void;
}) {
  if (!ahora) return <p className="py-10 text-center text-sm text-muted-foreground">Cargando agenda…</p>;
  const hoy = fechaLocal(new Date(ahora));
  const tareas = leads
    .filter((l) => l.etapa_embudo !== "ganado" && l.etapa_embudo !== "perdido")
    .map((l) => {
      const ex = extraDe(l);
      return { l, fecha: String(ex.proxima_fecha ?? ""), accion: String(ex.proxima_accion ?? "").trim() };
    })
    .filter((t) => t.fecha || t.accion || esVencido(t.l));
  const grupoDe = (t: { l: Lead; fecha: string }): "v" | "h" | "p" =>
    t.fecha ? (t.fecha < hoy ? "v" : t.fecha === hoy ? "h" : "p") : esVencido(t.l) ? "v" : "p";
  const grupos: Array<{ id: "v" | "h" | "p"; titulo: string; clase: string }> = [
    { id: "v", titulo: "Vencidas", clase: "text-rose-600" },
    { id: "h", titulo: "Para hoy", clase: "text-amber-600" },
    { id: "p", titulo: "Próximas", clase: "text-sky-600" },
  ];
  return (
    <div className="space-y-5">
      {grupos.map((g) => {
        const items = tareas.filter((t) => grupoDe(t) === g.id).sort((a, b) => (a.fecha || "9").localeCompare(b.fecha || "9"));
        return (
          <section key={g.id} className="space-y-2">
            <h3 className={`flex items-center gap-2 text-sm font-bold ${g.clase}`}>
              {g.titulo}
              <span className="rounded-full bg-glass-strong px-2 text-xs tabular-nums text-foreground">{items.length}</span>
            </h3>
            {items.length === 0 ? (
              <p className="crm-card p-4 text-center text-xs text-muted-foreground">Nada en esta sección.</p>
            ) : (
              items.map(({ l, fecha, accion }) => {
                const alerta = sla(l, ahora);
                return (
                  <div key={l.id} className="crm-card flex items-center gap-3 p-3">
                    <button
                      type="button"
                      onClick={() => onCompletar(l)}
                      aria-label="Completar tarea"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-glass-border text-emerald-600 transition-colors hover:bg-emerald-500/15"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button type="button" onClick={() => onAbrir(l)} className="min-w-0 flex-1 text-left">
                      <span className="block truncate text-sm font-semibold">{l.nombre || "Sin nombre"}</span>
                      <span className="block truncate text-xs text-muted-foreground">{accion || "Dar seguimiento"}</span>
                    </button>
                    <span className="shrink-0 text-right text-[11px] text-muted-foreground">
                      {fecha ? new Date(`${fecha}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" }) : ""}
                      {alerta && <span className={`block font-semibold ${alerta.critico ? "text-rose-600" : "text-amber-600"}`}>{alerta.texto}</span>}
                    </span>
                  </div>
                );
              })
            )}
          </section>
        );
      })}
    </div>
  );
}

function Pildora({ activa, onClick, n, children }: { activa: boolean; onClick: () => void; n: number; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${
        activa ? "border-primary bg-primary/15 text-primary" : "border-glass-border text-muted-foreground hover:bg-primary/5"
      }`}
    >
      {children} <span className="rounded-full bg-glass-strong px-1.5 tabular-nums">{n}</span>
    </button>
  );
}

function Tarjeta({
  l, ahora, etapas, onMover, onAbrir, onArrastrar,
}: { l: Lead; ahora: number; etapas: Etapa[]; onMover: (etapa: string) => void; onAbrir: () => void; onArrastrar: () => void }) {
  const t = TEMP_UI[tempDe(l)];
  const alerta = sla(l, ahora);
  const c = iconoCanal(l.canal_origen);
  return (
    <div
      draggable
      onDragStart={onArrastrar}
      onClick={onAbrir}
      className="crm-card cursor-grab p-3 active:cursor-grabbing"
    >
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/30 to-primary/5 text-xs font-bold text-primary">
          {iniciales(l)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{l.nombre || "Sin nombre"}</p>
          <p className="truncate text-xs text-muted-foreground">{l.telefono || "Sin teléfono"}</p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">#{String(l.numero_turno).padStart(2, "0")}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-semibold ${t.clase}`}>
          {tempDe(l) === "CALIENTE" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-500" />}
          {t.texto}
          {l.puntaje != null ? ` ${l.puntaje}%` : ""}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full bg-glass-strong px-2 py-0.5 ${c.clase}`}>
          <c.Icono className="h-3 w-3" />
          <span className="text-foreground">{l.canal_origen}</span>
        </span>
      </div>
      {l.interes && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{l.interes}</p>}
      <ScoreBar l={l} />
      {alerta && (
        <span
          className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            alerta.critico ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"
          }`}
        >
          <Clock className="h-3 w-3" /> {alerta.texto}
        </span>
      )}
      <select
        aria-label="Mover a etapa"
        className="mt-2 w-full rounded-lg border border-glass-border bg-background/60 px-2 py-1 text-base sm:text-xs"
        value={l.etapa_embudo}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onMover(e.target.value)}
      >
        {etapas.map((e) => (
          <option key={e.id} value={e.id}>
            {e.titulo}
          </option>
        ))}
      </select>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-dashed border-glass-border pt-2.5 text-xs">
        <span className="text-sm font-extrabold tracking-tight tabular-nums">
          {Number(l.valor_estimado) > 0 ? dinero(Number(l.valor_estimado)) : "—"}
        </span>
        <span className="flex items-center gap-2">
          <span className="text-muted-foreground">{ahora ? tiempo(l.fecha_llegada, ahora) : ""}</span>
          {l.telefono && (
            <a
              href={`https://wa.me/${l.telefono.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="Escribir por WhatsApp"
              className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 transition-colors hover:bg-emerald-500/25"
            >
              <MessageCircle className="h-3.5 w-3.5" />
            </a>
          )}
        </span>
      </div>
    </div>
  );
}

function NuevoProspecto({
  onCerrar,
  onCreado,
  negocioId,
  ownerId,
}: {
  onCerrar: () => void;
  onCreado: () => void;
  negocioId: string;
  ownerId: string;
}) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [interes, setInteres] = useState("");
  const [valor, setValor] = useState("");
  const [guardando, setGuardando] = useState(false);
  const guardar = async () => {
    if (!nombre.trim()) return toast.error("Escribe el nombre del prospecto.");
    setGuardando(true);
    const { error } = await supabase.from("crm_leads").insert({
      negocio_id: negocioId,
      owner_id: ownerId,
      nombre: limpiarTexto(nombre, 80),
      telefono: limpiarTelefono(telefono),
      interes: limpiarTexto(interes, 300) || null,
      valor_estimado: Math.max(0, Number(valor) || 0),
      atendido_por_humano: true,
    });
    setGuardando(false);
    if (error)
      return toast.error(
        error.message.includes("crm_leads_telefono_uidx")
          ? "Ya existe un prospecto con ese teléfono."
          : "No se pudo crear el prospecto.",
      );
    toast.success("Prospecto creado");
    onCreado();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onCerrar}>
      <GlassPanel className="max-h-[90dvh] w-full max-w-md space-y-3 overflow-y-auto p-5">
        <div onClick={(e) => e.stopPropagation()} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg">Nuevo prospecto</h3>
            <button type="button" onClick={onCerrar} aria-label="Cerrar">
              <X className="h-5 w-5" />
            </button>
          </div>
          {[
            ["Nombre", nombre, setNombre, 80],
            ["Teléfono / WhatsApp", telefono, setTelefono, 20],
            ["Interés", interes, setInteres, 300],
            ["Valor estimado (COP)", valor, setValor, 12],
          ].map(([et, v, set, max]) => (
            <label key={et as string} className="block text-sm">
              <span className="mb-1 block text-muted-foreground">{et as string}</span>
              <input
                className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
                value={v as string}
                maxLength={max as number}
                inputMode={et === "Valor estimado (COP)" || et === "Teléfono / WhatsApp" ? "numeric" : "text"}
                onChange={(e) => (set as (x: string) => void)(e.target.value)}
              />
            </label>
          ))}
          <button
            type="button"
            disabled={guardando}
            onClick={() => void guardar()}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Guardar prospecto
          </button>
        </div>
      </GlassPanel>
    </div>
  );
}

type Evento = { quien: string; texto: string; cuando: string };

function Panel360({
  lead,
  etapas,
  tipoClave,
  rutaAgente,
  nombreNegocio,
  onParchar,
  onCerrar,
  onCambio,
  onNavegar,
}: {
  lead: Lead;
  etapas: Etapa[];
  tipoClave: string;
  rutaAgente: string;
  nombreNegocio: string;
  onParchar: (l: Lead, c: Partial<Lead>) => Promise<void>;
  onCerrar: () => void;
  onCambio: (l: Lead) => void;
  onNavegar: (to: string, search?: Record<string, string>) => void;
}) {
  const [pestana, setPestana] = useState<"perfil" | "chat" | "tiempo" | "pqrs">("perfil");
  const [chat, setChat] = useState<Array<{ id: string; rol: string; contenido: string; created_at: string }>>([]);
  const [pqrs, setPqrs] = useState<Pqrs[]>([]);
  const [mensajes, setMensajes] = useState<Evento[]>([]);
  const [valor, setValor] = useState(String(Number(lead.valor_estimado) || ""));
  const [ocupado, setOcupado] = useState(false);
  const [mensajeIA, setMensajeIA] = useState("");
  const [nota, setNota] = useState("");
  const [tipoNota, setTipoNota] = useState("Nota");
  const [accion, setAccion] = useState(String(extraDe(lead).proxima_accion ?? ""));
  const [fechaAccion, setFechaAccion] = useState(String(extraDe(lead).proxima_fecha ?? ""));
  const t = TEMP_UI[tempDe(lead)];
  const puntaje = scoreDe(lead);
  const extra = (lead.datos_extra && typeof lead.datos_extra === "object" && !Array.isArray(lead.datos_extra) ? lead.datos_extra : {}) as Record<string, unknown>;

  useEffect(() => {
    void (async () => {
      const q = supabase.from("crm_pqrs").select("*").eq("negocio_id", lead.negocio_id).order("created_at", { ascending: false }).limit(50);
      const { data } = await (lead.telefono ? q.or(`lead_id.eq.${lead.id},telefono.eq.${lead.telefono}`) : q.eq("lead_id", lead.id));
      setPqrs(data ?? []);
      const { data: msgs } = await supabase
        .from("crm_mensajes")
        .select("id,rol,contenido,created_at")
        .eq("negocio_id", lead.negocio_id)
        .eq("lead_id", lead.id)
        .order("created_at", { ascending: true })
        .limit(500);
      setChat(msgs ?? []);
      if (lead.telefono) {
        const { data: av } = await supabase.from("whatsapp_avisos").select("detalle,created_at,chat_id").order("created_at", { ascending: false }).limit(40);
        setMensajes(
          (av ?? [])
            .filter((a) => (a.chat_id ?? "").includes(lead.telefono))
            .map((a) => ({ quien: "Aviso del agente", texto: a.detalle ?? "", cuando: a.created_at })),
        );
      }
    })();
  }, [lead.id, lead.negocio_id, lead.telefono]);

  const guardarCampo = async (cambios: Partial<Lead>) => {
    const { error } = await supabase.from("crm_leads").update(cambios).eq("id", lead.id);
    if (error) return toast.error("No se pudo guardar.");
    onCambio({ ...lead, ...cambios });
  };

  const linea: Evento[] = [
    { quien: "Llegada", texto: `Ingresó por ${lead.canal_origen} (turno #${String(lead.numero_turno).padStart(3, "0")})`, cuando: lead.fecha_llegada },
    ...(lead.temperatura ? [{ quien: "Calificación IA", texto: `${t.texto} · ${puntaje}% · ${lead.interes ?? ""}`, cuando: lead.ultima_interaccion }] : []),
    ...pqrs.map((p) => ({ quien: "PQRS", texto: `${p.tipo}: ${p.resumen ?? ""}`, cuando: p.created_at })),
    ...mensajes,
    ...actividadesDe(lead).map((a) => ({ quien: a.tipo, texto: a.texto, cuando: a.cuando })),
  ].sort((a, b) => b.cuando.localeCompare(a.cuando));

  const generarMensaje = () => {
    const nombre = (lead.nombre || "").trim().split(/\s+/)[0] ?? "";
    const saludo = nombre ? `Hola ${nombre}` : "Hola";
    const interes = lead.interes?.trim() ? lead.interes.trim() : "lo que estabas buscando";
    const prox = accion.trim() ? ` Lo siguiente que tenemos pendiente es: ${accion.trim()}${fechaAccion ? ` (${fechaAccion})` : ""}.` : "";
    const cuerpo =
      lead.etapa_embudo === "cotizado"
        ? `te escribo de ${nombreNegocio} para saber si pudiste revisar la propuesta sobre ${interes}.`
        : lead.etapa_embudo === "cita"
          ? `te recuerdo tu cita con ${nombreNegocio} sobre ${interes}.`
          : `te escribe ${nombreNegocio}. Vi que te interesa ${interes} y quiero ayudarte a avanzar.`;
    setMensajeIA(`${saludo}, ${cuerpo}${prox} Tenemos disponibilidad esta semana y puedo resolverte cualquier duda hoy mismo. ¿Te parece si lo coordinamos?`);
  };
  const copiarMensaje = () => {
    void navigator.clipboard
      .writeText(mensajeIA)
      .then(() => toast.success("Mensaje copiado"))
      .catch(() => toast.error("No se pudo copiar el mensaje."));
  };
  const enviarMensaje = () => {
    const tel = lead.telefono.replace(/\D/g, "");
    if (!tel) return toast.error("Este prospecto no tiene teléfono.");
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(mensajeIA)}`, "_blank", "noopener,noreferrer");
    void onParchar(lead, { datos_extra: nuevoExtra(lead, {}, { tipo: "WhatsApp", texto: mensajeIA.slice(0, 200), cuando: new Date().toISOString() }) });
  };
  const guardarAccion = () => {
    const txt = accion.trim();
    void onParchar(lead, {
      datos_extra: nuevoExtra(
        lead,
        { proxima_accion: txt, proxima_fecha: fechaAccion },
        txt ? { tipo: "Tarea", texto: `Próxima acción: ${txt}${fechaAccion ? ` · ${fechaAccion}` : ""}`, cuando: new Date().toISOString() } : undefined,
      ),
    });
    toast.success("Próxima acción guardada");
  };
  const registrarNota = () => {
    const txt = limpiarTexto(nota, 400);
    if (!txt) return toast.error("Escribe la nota.");
    void onParchar(lead, { datos_extra: nuevoExtra(lead, {}, { tipo: tipoNota, texto: txt, cuando: new Date().toISOString() }) });
    setNota("");
  };

  const cotizar = () => {
    window.sessionStorage.setItem(
      "crm:cotizar",
      JSON.stringify({ cliente: lead.nombre ?? "", telefono: lead.telefono, nota: lead.interes ?? "", valor: Number(lead.valor_estimado) || 0 }),
    );
    void guardarCampo({ etapa_embudo: lead.etapa_embudo === "nuevo" || lead.etapa_embudo === "calificacion" ? "cotizado" : lead.etapa_embudo, atendido_por_humano: true });
    onNavegar(tipoClave === "concesionario" ? "/modulos/cotizaciones_veh" : "/cotizaciones");
  };

  const agendar = async () => {
    const manana = new Date(Date.now() + 86400000);
    const fecha = `${manana.getFullYear()}-${String(manana.getMonth() + 1).padStart(2, "0")}-${String(manana.getDate()).padStart(2, "0")}`;
    setOcupado(true);
    const { error } = await supabase.from("agenda_citas").insert({
      titulo: `Cita con ${lead.nombre || lead.telefono || "prospecto"}`,
      tipo: "cita",
      cliente: lead.nombre,
      telefono: lead.telefono || null,
      fecha,
      notas: lead.interes,
    });
    setOcupado(false);
    if (error) return toast.error("No se pudo crear la cita.");
    toast.success(`Cita creada para mañana (${fecha}). Ajusta la hora en la Agenda.`);
    void guardarCampo({ etapa_embudo: "cita", atendido_por_humano: true });
  };

  const convertir = async () => {
    if (!lead.telefono) return toast.error("Agrega un teléfono al prospecto para convertirlo en cliente.");
    setOcupado(true);
    const { data: ya } = await supabase.from("restaurante_clientes").select("id").eq("telefono", lead.telefono).limit(1).maybeSingle();
    if (!ya) {
      const { error } = await supabase.from("restaurante_clientes").insert({ nombre: lead.nombre || "Cliente CRM", telefono: lead.telefono, notas: lead.interes });
      if (error) {
        setOcupado(false);
        return toast.error("No se pudo crear el cliente.");
      }
    }
    setOcupado(false);
    await guardarCampo({ etapa_embudo: "ganado", atendido_por_humano: true });
    toast.success("Prospecto convertido en cliente. Ahora puedes facturarle.");
    onNavegar(tipoClave === "restaurante" ? "/restaurante" : "/modulos/facturas");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-md" onClick={onCerrar}>
      <aside className="flex h-full w-full max-w-xl flex-col border-l border-glass-border bg-background shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-glass-border p-4">
          <div className="relative h-14 w-14 shrink-0">
            <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke={t.borde} strokeWidth="3" strokeDasharray={`${puntaje} 100`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums">
              {puntaje}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg">{lead.nombre || "Sin nombre"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {lead.telefono || "Sin teléfono"} · {t.texto} · {puntaje} pts • {nivelScore(puntaje).texto}
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="border-b border-glass-border px-4 py-3">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Etapa del embudo</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {etapas.map((e, i) => {
              const actual = etapas.findIndex((x) => x.id === lead.etapa_embudo);
              const hecha = i < actual;
              const esActual = i === actual;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() =>
                    void onParchar(lead, {
                      etapa_embudo: e.id,
                      datos_extra: nuevoExtra(lead, {}, { tipo: "Etapa", texto: `Pasó a ${e.titulo}`, cuando: new Date().toISOString() }),
                    })
                  }
                  className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
                    esActual
                      ? "border-transparent text-white shadow-sm"
                      : hecha
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-glass-border text-muted-foreground hover:bg-primary/5"
                  }`}
                  style={esActual ? { backgroundColor: e.color } : undefined}
                >
                  {hecha && <Check className="h-3 w-3" />}
                  {e.titulo}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto border-b border-glass-border px-3 pt-2 text-sm">
          {([["perfil", "Perfil IA"], ["chat", "Conversación"], ["tiempo", "Línea de tiempo"], ["pqrs", `PQRS (${pqrs.length})`]] as const).map(([id, txt]) => (
            <button
              key={id}
              type="button"
              onClick={() => setPestana(id)}
              className={`rounded-t-lg px-3 py-2 ${pestana === id ? "border-b-2 border-primary font-medium text-primary" : "text-muted-foreground"}`}
            >
              {txt}
            </button>
          ))}
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
          {pestana === "perfil" && (
            <>
              <Dato k="Interés" v={lead.interes} />
              <Dato k="Capacidad de pago / cuota inicial" v={lead.capacidad_pago} />
              <Dato k="Urgencia" v={lead.urgencia} />
              <div className="space-y-2 rounded-xl border border-glass-border p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Próxima acción</p>
                <input
                  className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
                  placeholder="Ej. Llamar para confirmar la visita"
                  maxLength={120}
                  value={accion}
                  onChange={(e) => setAccion(limpiarTexto(e.target.value, 120))}
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    aria-label="Fecha de la próxima acción"
                    className="min-w-0 flex-1 rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
                    value={fechaAccion}
                    onChange={(e) => setFechaAccion(e.target.value)}
                  />
                  <button type="button" onClick={guardarAccion} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                    Guardar
                  </button>
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                  <Sparkles className="h-3.5 w-3.5" /> Copiloto IA de seguimiento
                </p>
                <button
                  type="button"
                  onClick={generarMensaje}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
                >
                  <Sparkles className="h-4 w-4" /> Generar Mensaje IA para WhatsApp
                </button>
                {mensajeIA && (
                  <>
                    <textarea
                      className="min-h-28 w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
                      value={mensajeIA}
                      maxLength={800}
                      onChange={(e) => setMensajeIA(e.target.value)}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={copiarMensaje} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-glass-border px-2 py-2 hover:bg-primary/10">
                        <Copy className="h-4 w-4" /> Copiar
                      </button>
                      <button type="button" onClick={enviarMensaje} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-2 py-2 font-semibold text-white">
                        <Send className="h-4 w-4" /> Enviar por WhatsApp
                      </button>
                    </div>
                  </>
                )}
              </div>
              {Object.entries(extra)
                .filter(([k, v]) => typeof v === "string" && v.trim() && !k.startsWith("proxima_"))
                .map(([k, v]) => (
                  <Dato key={k} k={k === "datos_confirmados" ? "Datos confirmados en la conversación" : k.replace(/_/g, " ")} v={String(v)} />
                ))}
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Valor estimado (COP)</span>
                <input
                  className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
                  inputMode="numeric"
                  value={valor}
                  maxLength={12}
                  onChange={(e) => setValor(e.target.value.replace(/[^0-9]/g, ""))}
                  onBlur={() => void guardarCampo({ valor_estimado: Number(valor) || 0 })}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">Etapa del embudo</span>
                <select
                  className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
                  value={lead.etapa_embudo}
                  onChange={(e) => void guardarCampo({ etapa_embudo: e.target.value, atendido_por_humano: true })}
                >
                  {etapas.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.titulo}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          {pestana === "chat" &&
            (chat.length === 0 ? (
              <p className="text-muted-foreground">Todavía no hay mensajes guardados de esta conversación.</p>
            ) : (
              chat.map((m) => (
                <div key={m.id} className={`flex ${m.rol === "cliente" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 ${m.rol === "cliente" ? "bg-muted" : "bg-primary/15"}`}>
                    <p className="whitespace-pre-wrap break-words">{m.contenido}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {m.rol === "cliente" ? "Cliente" : "Agente IA"} · {new Date(m.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
              ))
            ))}
          {pestana === "tiempo" && (
            <div className="space-y-2 rounded-xl border border-glass-border p-3">
              <div className="flex gap-2">
                <select
                  aria-label="Tipo de actividad"
                  className="rounded-lg border border-glass-border bg-background/60 px-2 py-2 text-base"
                  value={tipoNota}
                  onChange={(e) => setTipoNota(e.target.value)}
                >
                  {["Nota", "Llamada", "Cotización", "Visita"].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
                <input
                  className="min-w-0 flex-1 rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
                  placeholder="Registrar una nota rápida"
                  maxLength={400}
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") registrarNota();
                  }}
                />
                <button type="button" onClick={registrarNota} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground">
                  Agregar
                </button>
              </div>
            </div>
          )}
          {pestana === "tiempo" &&
            (linea.length === 0 ? (
              <p className="text-muted-foreground">Sin actividad todavía.</p>
            ) : (
              <div className="relative space-y-4 pl-1">
                <span className="absolute bottom-2 left-[17px] top-2 w-px bg-glass-border" aria-hidden="true" />
                {linea.map((e, i) => {
                  const Ic =
                    e.quien === "Llegada" ? UserRound
                    : e.quien === "Calificación IA" ? Sparkles
                    : e.quien === "PQRS" ? AlertTriangle
                    : e.quien === "Llamada" ? Phone
                    : e.quien === "Nota" || e.quien === "Cotización" ? FileText
                    : e.quien === "Etapa" ? Target
                    : e.quien === "Tarea" ? CheckCircle2
                    : e.quien === "Visita" ? CalendarDays
                    : MessageCircle;
                  return (
                    <div key={i} className="relative flex gap-3">
                      <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-glass-border bg-card text-primary shadow-sm">
                        <Ic className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground">{e.quien}</span> ·{" "}
                          {new Date(e.cuando).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                        <p className="break-words">{e.texto || "—"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          {pestana === "pqrs" &&
            (pqrs.length === 0 ? (
              <p className="text-muted-foreground">Este cliente no tiene PQRS.</p>
            ) : (
              pqrs.map((p) => (
                <div key={p.id} className="rounded-lg border border-glass-border p-3">
                  <p className="font-medium">
                    {p.tipo} · urgencia {p.urgencia}
                  </p>
                  <p className="break-words text-muted-foreground">{p.resumen}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {p.estado} · {new Date(p.created_at).toLocaleDateString("es-CO")}
                  </p>
                </div>
              ))
            ))}
        </div>
        <div className="space-y-2 border-t border-glass-border bg-background p-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                void guardarCampo({ atendido_por_humano: true });
                onNavegar(rutaAgente, { vista: "agente" });
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-glass-border px-2 py-2 transition-colors hover:bg-primary/10"
            >
              <MessageCircle className="h-4 w-4" /> Abrir chat WhatsApp
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void agendar()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-glass-border px-2 py-2 transition-colors hover:bg-primary/10 disabled:opacity-50"
            >
              <CalendarPlus className="h-4 w-4" /> Agendar cita
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={cotizar}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-2 py-2.5 font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <FileText className="h-4 w-4" /> Generar Cotización
            </button>
            <button
              type="button"
              disabled={ocupado}
              onClick={() => void convertir()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-2 py-2.5 font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md disabled:opacity-50"
            >
              <Handshake className="h-4 w-4" /> Cerrar Venta
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Dato({ k, v }: { k: string; v: string | null }) {
  return (
    <div>
      <p className="text-xs capitalize text-muted-foreground">{k}</p>
      <p className="break-words">{v && v.trim() ? v : "—"}</p>
    </div>
  );
}
