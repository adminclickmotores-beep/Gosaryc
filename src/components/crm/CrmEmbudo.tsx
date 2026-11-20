import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle, Bot, CalendarPlus, CheckCircle2, ChevronDown, ChevronUp, FileText, Flame, Globe, Instagram,
  Facebook, LayoutGrid, ListOrdered, MessageCircle, Plus, RefreshCw, RotateCcw, Search, Settings2, Snowflake,
  Sparkles, Sun, Target, Trash2, TrendingUp, UserRound, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
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
type VistaCrm = "kanban" | "fifo" | "pqrs" | "ia";

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
  CALIENTE: { texto: "Caliente", borde: "#f97316", clase: "bg-orange-500/15 text-orange-500", Icono: Flame },
  TIBIO: { texto: "Tibio", borde: "#f59e0b", clase: "bg-amber-500/15 text-amber-500", Icono: Sun },
  FRIO: { texto: "Frío", borde: "#3b82f6", clase: "bg-blue-500/15 text-blue-500", Icono: Snowflake },
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
      return true;
    });
  }, [leads, busca, canal, temp, estado]);

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

  const mover = async (id: string, etapa: string) => {
    const previo = leads.find((l) => l.id === id);
    if (!previo || previo.etapa_embudo === etapa) return;
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, etapa_embudo: etapa } : l)));
    const { error } = await supabase.from("crm_leads").update({ etapa_embudo: etapa, atendido_por_humano: true }).eq("id", id);
    if (error) {
      toast.error("No se pudo mover el prospecto.");
      void cargar();
    }
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
    { id: "fifo", titulo: "Cola de Llegada", Icono: ListOrdered },
    { id: "pqrs", titulo: "Bandeja PQRS", Icono: AlertTriangle, badge: pqrsAbiertas },
    { id: "ia", titulo: "Inteligencia IA", Icono: Sparkles },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl">CRM y Embudo IA</h1>
          <p className="text-sm text-muted-foreground">
            Prospectos, PQRS e inteligencia comercial de {negocio?.nombre ?? "tu negocio"} ({tipo.panel}).
          </p>
        </div>
        {(vista === "kanban" || vista === "fifo") && (
          <button
            type="button"
            onClick={() => setNuevo(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Nuevo Prospecto
          </button>
        )}
      </div>

      {/* Navegación de 4 pestañas */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-glass-border bg-background/50 p-1.5 text-sm">
        {pestanas.map(({ id, titulo, Icono, badge }) => (
          <button
            key={id}
            type="button"
            onClick={() => setVista(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${
              vista === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
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
      {(vista === "kanban" || vista === "fifo") && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <GlassPanel className="p-4">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/15 text-blue-500">
                  <TrendingUp className="h-4 w-4" />
                </span>
                Leads activos
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums">{activos.length}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/15 text-orange-500">
                  <Flame className="h-4 w-4" />
                  {calientes.length > 0 && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 animate-pulse rounded-full bg-orange-500" />}
                </span>
                Leads calientes
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-orange-500">{calientes.length}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/15 text-green-500">
                  <Target className="h-4 w-4" />
                </span>
                Valor en embudo (COP)
              </p>
              <p className="mt-2 break-words text-xl font-bold tabular-nums sm:text-2xl">{dinero(valorEmbudo)}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-500">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
                Tasa de cierre
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums">{tasa}%</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-glass-strong">
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${tasa}%` }} />
              </div>
            </GlassPanel>
          </div>

          <GlassPanel className="space-y-3 p-3">
            <label className="flex items-center gap-2 rounded-lg border border-glass-border bg-background/60 px-3">
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
          </GlassPanel>

          {cargando ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Cargando prospectos…</p>
          ) : vista === "kanban" ? (
            <div className="flex gap-3 overflow-x-auto pb-3">
              {etapas.map((e) => {
                const items = filtrados.filter((l) => l.etapa_embudo === e.id);
                return (
                  <div
                    key={e.id}
                    className="flex w-72 shrink-0 flex-col rounded-xl border border-glass-border bg-background/40"
                    style={{ borderTop: `3px solid ${e.color}` }}
                    onDragOver={(ev) => ev.preventDefault()}
                    onDrop={() => {
                      if (arrastrando) void mover(arrastrando, e.id);
                      setArrastrando("");
                    }}
                  >
                    <div className="p-3">
                      <div className="flex items-center justify-between gap-2 text-sm font-medium">
                        <span className="truncate">{e.titulo}</span>
                        <span className="rounded-full bg-glass-strong px-2 text-xs tabular-nums">{items.length}</span>
                      </div>
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {dinero(items.reduce((s, l) => s + Number(l.valor_estimado || 0), 0))}
                      </p>
                    </div>
                    <div className="max-h-[60vh] min-h-24 space-y-2 overflow-y-auto px-2 pb-2">
                      {items.map((l) => (
                        <Tarjeta key={l.id} l={l} ahora={ahora} onAbrir={() => setAbierto(l)} onArrastrar={() => setArrastrando(l.id)} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <GlassPanel className="overflow-x-auto p-0">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-3">Turno</th>
                    <th>Llegada</th>
                    <th>Cliente</th>
                    <th>Canal</th>
                    <th>Temperatura</th>
                    <th>Etapa</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filtrados]
                    .sort((a, b) => a.numero_turno - b.numero_turno || a.fecha_llegada.localeCompare(b.fecha_llegada))
                    .map((l) => {
                      const c = iconoCanal(l.canal_origen);
                      const t = TEMP_UI[tempDe(l)];
                      return (
                        <tr key={l.id} onClick={() => setAbierto(l)} className="cursor-pointer border-t border-glass-border/60 hover:bg-primary/5">
                          <td className="p-3 font-mono font-semibold">#{String(l.numero_turno).padStart(3, "0")}</td>
                          <td className="whitespace-nowrap text-xs">
                            {new Date(l.fecha_llegada).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td>
                            <p className="font-medium">{l.nombre || "Sin nombre"}</p>
                            <p className="text-xs text-muted-foreground">{l.telefono}</p>
                          </td>
                          <td>
                            <span className={`inline-flex items-center gap-1 ${c.clase}`}>
                              <c.Icono className="h-4 w-4" /> <span className="text-foreground">{l.canal_origen}</span>
                            </span>
                          </td>
                          <td>
                            <span className={`rounded-full px-2 py-0.5 text-xs ${t.clase}`}>
                              {t.texto}
                              {l.puntaje != null ? ` ${l.puntaje}%` : ""}
                            </span>
                          </td>
                          <td className="text-xs">{etapas.find((e) => e.id === l.etapa_embudo)?.titulo ?? l.etapa_embudo}</td>
                          <td className="text-xs">{l.atendido_por_humano ? "En gestión" : "Sin atender"}</td>
                        </tr>
                      );
                    })}
                  {filtrados.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        Sin prospectos con estos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </GlassPanel>
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

function Tarjeta({ l, ahora, onAbrir, onArrastrar }: { l: Lead; ahora: number; onAbrir: () => void; onArrastrar: () => void }) {
  const t = TEMP_UI[tempDe(l)];
  const c = iconoCanal(l.canal_origen);
  return (
    <div
      draggable
      onDragStart={onArrastrar}
      onClick={onAbrir}
      className="cursor-grab rounded-lg border border-glass-border bg-card p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing"
      style={{ borderLeft: `4px solid ${t.borde}` }}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
          {iniciales(l)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{l.nombre || "Sin nombre"}</p>
          <p className="truncate text-xs text-muted-foreground">{l.telefono || "Sin teléfono"}</p>
        </div>
        <span className="font-mono text-xs text-muted-foreground">#{String(l.numero_turno).padStart(2, "0")}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className={`rounded-full px-2 py-0.5 ${t.clase}`}>
          {t.texto}
          {l.puntaje != null ? ` ${l.puntaje}%` : ""}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full bg-glass-strong px-2 py-0.5 ${c.clase}`}>
          <c.Icono className="h-3 w-3" />
          <span className="text-foreground">{l.canal_origen}</span>
        </span>
      </div>
      {l.interes && <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{l.interes}</p>}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="font-semibold tabular-nums text-green-500">
          {Number(l.valor_estimado) > 0 ? dinero(Number(l.valor_estimado)) : "—"}
        </span>
        <span className="text-muted-foreground">{ahora ? tiempo(l.fecha_llegada, ahora) : ""}</span>
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
  onCerrar,
  onCambio,
  onNavegar,
}: {
  lead: Lead;
  etapas: Etapa[];
  tipoClave: string;
  rutaAgente: string;
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
  const t = TEMP_UI[tempDe(lead)];
  const puntaje = Math.max(0, Math.min(100, lead.puntaje ?? 0));
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
  ].sort((a, b) => b.cuando.localeCompare(a.cuando));

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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={onCerrar}>
      <aside className="flex h-full w-full max-w-md flex-col border-l border-glass-border bg-background/95 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-glass-border p-4">
          <div className="relative h-14 w-14 shrink-0">
            <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke={t.borde} strokeWidth="3" strokeDasharray={`${puntaje} 100`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold tabular-nums">
              {lead.puntaje != null ? `${puntaje}%` : "—"}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg">{lead.nombre || "Sin nombre"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {lead.telefono || "Sin teléfono"} · {t.texto}
            </p>
          </div>
          <button type="button" onClick={onCerrar} aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-1 border-b border-glass-border px-3 pt-2 text-sm">
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
              {Object.entries(extra)
                .filter(([, v]) => typeof v === "string" && v.trim())
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
          {pestana === "tiempo" &&
            (linea.length === 0 ? (
              <p className="text-muted-foreground">Sin actividad todavía.</p>
            ) : (
              linea.map((e, i) => (
                <div key={i} className="border-l-2 border-primary/40 pl-3">
                  <p className="text-xs text-muted-foreground">
                    {e.quien} · {new Date(e.cuando).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                  </p>
                  <p className="break-words">{e.texto || "—"}</p>
                </div>
              ))
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
        <div className="grid grid-cols-2 gap-2 border-t border-glass-border p-3 text-sm">
          <button
            type="button"
            onClick={() => {
              void guardarCampo({ atendido_por_humano: true });
              onNavegar(rutaAgente, { vista: "agente" });
            }}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-glass-border px-2 py-2 hover:bg-primary/10"
          >
            <MessageCircle className="h-4 w-4" /> Abrir chat WhatsApp
          </button>
          <button
            type="button"
            onClick={cotizar}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-glass-border px-2 py-2 hover:bg-primary/10"
          >
            <FileText className="h-4 w-4" /> Crear cotización
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void agendar()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-glass-border px-2 py-2 hover:bg-primary/10 disabled:opacity-50"
          >
            <CalendarPlus className="h-4 w-4" /> Agendar cita
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => void convertir()}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-2 text-primary-foreground disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" /> Convertir a cliente
          </button>
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
