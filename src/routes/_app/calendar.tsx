import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Check, ChevronLeft, ChevronRight, MessageCircle, Plus, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { cobrarCitaAgenda } from "@/lib/cobros-unificados";

export const Route = createFileRoute("/_app/calendar")({
  component: AgendaPage,
});

type Cita = Tables<"agenda_citas">;

const TIPOS: { valor: string; etiqueta: string }[] = [
  { valor: "cita", etiqueta: "Cita" },
  { valor: "entrega", etiqueta: "Entrega" },
  { valor: "reserva", etiqueta: "Reserva" },
  { valor: "recordatorio", etiqueta: "Recordatorio" },
  { valor: "evento", etiqueta: "Evento" },
];

const ESTADOS: Record<string, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  cumplida: "Cumplida",
  cancelada: "Cancelada",
};

const DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function ymd(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function etiquetaTipo(t: string): string {
  return TIPOS.find((x) => x.valor === t)?.etiqueta ?? t;
}

function AgendaPage() {
  const [mes, setMes] = useState<Date>(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [seleccion, setSeleccion] = useState<string>(() => ymd(new Date()));
  const [citas, setCitas] = useState<Cita[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("cita");
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [hora, setHora] = useState("");
  const [notas, setNotas] = useState("");
  const [cobrando, setCobrando] = useState<string | null>(null);
  const [valorCobro, setValorCobro] = useState("");
  const [metodoCobro, setMetodoCobro] = useState("efectivo");
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const desde = ymd(new Date(mes.getFullYear(), mes.getMonth() - 1, 1));
    const hasta = ymd(new Date(mes.getFullYear(), mes.getMonth() + 2, 0));
    const { data, error: err } = await supabase
      .from("agenda_citas")
      .select("*")
      .gte("fecha", desde)
      .lte("fecha", hasta)
      .order("fecha", { ascending: true })
      .order("hora", { ascending: true });
    if (err) {
      setError(err.message);
    } else {
      setError(null);
      setCitas(data ?? []);
    }
    setCargando(false);
  }, [mes]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const porDia = useMemo(() => {
    const m = new Map<string, Cita[]>();
    for (const c of citas) {
      const arr = m.get(c.fecha) ?? [];
      arr.push(c);
      m.set(c.fecha, arr);
    }
    return m;
  }, [citas]);

  // Celdas del mes (semana inicia el lunes)
  const celdas = useMemo(() => {
    const primero = new Date(mes.getFullYear(), mes.getMonth(), 1);
    const offset = (primero.getDay() + 6) % 7;
    const total = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) out.push(null);
    for (let d = 1; d <= total; d++) out.push(new Date(mes.getFullYear(), mes.getMonth(), d));
    while (out.length % 7 !== 0) out.push(null);
    return out;
  }, [mes]);

  const hoy = ymd(new Date());
  const delDia = porDia.get(seleccion) ?? [];
  const proximas = useMemo(
    () => citas.filter((c) => c.fecha >= hoy && c.estado !== "cancelada" && c.estado !== "cumplida").slice(0, 6),
    [citas, hoy],
  );

  const etiquetaMes = mes.toLocaleDateString("es-CO", { month: "long", year: "numeric" });

  async function agregar() {
    if (!titulo.trim()) return;
    setGuardando(true);
    const { error: err } = await supabase.from("agenda_citas").insert({
      titulo: titulo.trim(),
      tipo,
      cliente: cliente.trim() || null,
      telefono: telefono.trim() || null,
      fecha: seleccion,
      hora: hora || null,
      notas: notas.trim() || null,
    });
    setGuardando(false);
    if (err) {
      setError(err.message);
      return;
    }
    setTitulo("");
    setCliente("");
    setTelefono("");
    setHora("");
    setNotas("");
    setTipo("cita");
    setMostrarForm(false);
    cargar();
  }

  async function cambiarEstado(c: Cita, estado: string) {
    const { error: err } = await supabase.from("agenda_citas").update({ estado }).eq("id", c.id);
    if (err) setError(err.message);
    else cargar();
  }

  async function borrar(c: Cita) {
    if (!window.confirm(`¿Cancelar "${c.titulo}"? Queda en el historial como cancelada, no se borra.`)) return;
    const { error: err } = await supabase.from("agenda_citas").update({ estado: "cancelada" }).eq("id", c.id);
    if (err) setError(err.message);
    else cargar();
  }

  async function cobrar(c: Cita) {
    setOcupado(true);
    const r = await cobrarCitaAgenda({ id: c.id, titulo: c.titulo, cliente: c.cliente }, valorCobro, metodoCobro);
    setOcupado(false);
    if (!r.ok) {
      toast.error(r.mensaje);
      return;
    }
    toast.success(r.mensaje);
    setCobrando(null);
    setValorCobro("");
    cargar();
  }

  function enlaceWhatsApp(c: Cita): string | null {
    const tel = (c.telefono ?? "").replace(/\D/g, "");
    if (!tel) return null;
    const numero = tel.length === 10 ? `57${tel}` : tel;
    const cuando = `${c.fecha}${c.hora ? ` a las ${c.hora.slice(0, 5)}` : ""}`;
    const texto = `Hola${c.cliente ? ` ${c.cliente}` : ""}, te recordamos tu ${etiquetaTipo(c.tipo).toLowerCase()}: ${c.titulo} (${cuando}).`;
    return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`;
  }

  const campo =
    "w-full rounded-xl border border-glass-border bg-glass px-3 py-2.5 text-base text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none";

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <CalendarDays size={22} />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-3xl tracking-tight">Agenda</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Citas, entregas, reservas y recordatorios de tu negocio, día por día.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-foreground">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <GlassPanel className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-display text-xl capitalize">{etiquetaMes}</div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  const h = new Date();
                  setMes(new Date(h.getFullYear(), h.getMonth(), 1));
                  setSeleccion(ymd(h));
                }}
                className="rounded-md px-3 py-1 text-xs text-muted-foreground hover:bg-glass-strong hover:text-foreground"
              >
                Hoy
              </button>
              <button
                type="button"
                aria-label="Mes anterior"
                onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-glass-strong hover:text-foreground"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Mes siguiente"
                onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}
                className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-glass-strong hover:text-foreground"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] uppercase tracking-wider text-muted-foreground">
            {DIAS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {celdas.map((d, i) => {
              if (!d) return <div key={`v${i}`} className="aspect-square" />;
              const clave = ymd(d);
              const n = (porDia.get(clave) ?? []).filter((c) => c.estado !== "cancelada").length;
              const activo = clave === seleccion;
              return (
                <button
                  key={clave}
                  type="button"
                  onClick={() => setSeleccion(clave)}
                  className={cn(
                    "relative flex aspect-square flex-col items-center justify-center rounded-xl border text-sm transition",
                    activo
                      ? "border-primary bg-primary/20 text-foreground"
                      : "border-glass-border bg-glass text-foreground/90 hover:bg-glass-strong",
                    clave === hoy && !activo && "border-primary/60",
                  )}
                >
                  <span>{d.getDate()}</span>
                  {n > 0 && (
                    <span className="mt-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {cargando && <div className="mt-3 text-xs text-muted-foreground">Cargando…</div>}
        </GlassPanel>

        <div className="space-y-6">
          <GlassPanel className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">Día seleccionado</div>
                <div className="font-display text-lg capitalize">
                  {new Date(`${seleccion}T12:00:00`).toLocaleDateString("es-CO", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMostrarForm((v) => !v)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                {mostrarForm ? <X size={14} /> : <Plus size={14} />}
                {mostrarForm ? "Cerrar" : "Nueva"}
              </button>
            </div>

            {mostrarForm && (
              <div className="mb-4 space-y-2 rounded-xl border border-glass-border bg-glass p-3">
                <input
                  className={campo}
                  placeholder="Título (ej. Entrega de torta, Cita de corte)"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
                <div className="grid grid-cols-2 gap-2">
                  <select className={campo} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                    {TIPOS.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.etiqueta}
                      </option>
                    ))}
                  </select>
                  <input className={campo} type="time" value={hora} onChange={(e) => setHora(e.target.value)} />
                </div>
                <input
                  className={campo}
                  placeholder="Cliente (opcional)"
                  value={cliente}
                  onChange={(e) => setCliente(e.target.value)}
                />
                <input
                  className={campo}
                  inputMode="tel"
                  placeholder="WhatsApp del cliente (opcional)"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
                <textarea
                  className={campo}
                  rows={2}
                  placeholder="Notas (opcional)"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                />
                <button
                  type="button"
                  disabled={guardando || !titulo.trim()}
                  onClick={agregar}
                  className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {guardando ? "Guardando…" : "Agregar a la agenda"}
                </button>
              </div>
            )}

            {delDia.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No hay nada agendado este día.</p>
            ) : (
              <ul className="space-y-2">
                {delDia.map((c) => {
                  const wa = enlaceWhatsApp(c);
                  return (
                    <li key={c.id} className="rounded-xl border border-glass-border bg-glass p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div
                            className={cn(
                              "font-medium text-foreground",
                              c.estado === "cancelada" && "line-through opacity-60",
                            )}
                          >
                            {c.hora ? `${c.hora.slice(0, 5)} · ` : ""}
                            {c.titulo}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {etiquetaTipo(c.tipo)}
                            {c.cliente ? ` · ${c.cliente}` : ""}
                          </div>
                          {c.notas && <div className="mt-1 text-xs text-foreground/80">{c.notas}</div>}
                        </div>
                        <button
                          type="button"
                          aria-label="Cancelar cita (queda en el historial)"
                          title="Cancelar (queda en el historial)"
                          onClick={() => borrar(c)}
                          className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-glass-strong hover:text-destructive"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <select
                          value={c.estado}
                          onChange={(e) => cambiarEstado(c, e.target.value)}
                          className="rounded-lg border border-glass-border bg-glass px-2 py-1.5 text-base text-foreground focus:outline-none"
                        >
                          {Object.entries(ESTADOS).map(([v, l]) => (
                            <option key={v} value={v}>
                              {l}
                            </option>
                          ))}
                        </select>
                        {c.estado !== "cumplida" && (
                          <button
                            type="button"
                            onClick={() => cambiarEstado(c, "cumplida")}
                            className="inline-flex items-center gap-1 rounded-lg border border-glass-border px-2.5 py-1.5 text-xs text-foreground hover:bg-glass-strong"
                          >
                            <Check size={13} /> Cumplida
                          </button>
                        )}
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg border border-glass-border px-2.5 py-1.5 text-xs text-foreground hover:bg-glass-strong"
                          >
                            <MessageCircle size={13} /> Recordar
                          </a>
                        )}
                        {(c.estado === "pendiente" || c.estado === "confirmada") && (
                          cobrando === c.id ? (
                            <span className="flex flex-wrap items-center gap-1.5">
                              <input
                                className="w-28 rounded-lg border border-glass-border bg-glass px-2 py-1.5 text-base text-foreground"
                                inputMode="decimal"
                                placeholder="Valor $"
                                value={valorCobro}
                                onChange={(e) => setValorCobro(e.target.value)}
                              />
                              <select
                                className="rounded-lg border border-glass-border bg-glass px-2 py-1.5 text-base text-foreground"
                                value={metodoCobro}
                                onChange={(e) => setMetodoCobro(e.target.value)}
                                aria-label="Medio de pago"
                              >
                                <option value="efectivo">Efectivo</option>
                                <option value="transferencia">Transferencia</option>
                                <option value="tarjeta">Tarjeta</option>
                              </select>
                              <button
                                type="button"
                                disabled={ocupado}
                                onClick={() => cobrar(c)}
                                className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                              >
                                Confirmar
                              </button>
                              <button
                                type="button"
                                onClick={() => setCobrando(null)}
                                className="rounded-lg border border-glass-border px-2.5 py-1.5 text-xs text-muted-foreground"
                              >
                                <X size={13} />
                              </button>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setCobrando(c.id);
                                setValorCobro("");
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
                            >
                              Cobrar
                            </button>
                          )
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassPanel>

          <GlassPanel className="p-4 sm:p-5">
            <div className="mb-2 font-display text-lg">Próximas</div>
            {proximas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin compromisos próximos.</p>
            ) : (
              <ul className="divide-y divide-glass-border">
                {proximas.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSeleccion(c.fecha);
                        setMes(new Date(`${c.fecha}T12:00:00`.slice(0, 7) + "-01T12:00:00"));
                      }}
                      className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm text-foreground hover:text-primary"
                    >
                      <span className="min-w-0 truncate">{c.titulo}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {c.fecha.slice(5)}
                        {c.hora ? ` ${c.hora.slice(0, 5)}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
