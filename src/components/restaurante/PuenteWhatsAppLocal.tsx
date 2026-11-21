import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Laptop,
  MessageSquare,
  RefreshCw,
  Send,
  ShieldAlert,
  Sparkles,
  Wifi,
  WifiOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";

type PuenteRow = Tables<"whatsapp_bridge">;
type OutboxRow = Tables<"whatsapp_outbox">;
type UrgenciaRow = Pick<Tables<"crm_pqrs">, "id" | "telefono" | "tipo" | "resumen" | "urgencia" | "estado" | "created_at">;

const ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generarCodigoEmparejamiento(): string {
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += ALFABETO_CODIGO[Math.floor(Math.random() * ALFABETO_CODIGO.length)];
  }
  return out;
}

function formatearHoraCorta(iso: string | null): string {
  if (!iso) return "Aún sin sincronizar";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "Aún sin sincronizar";
  const diffMin = Math.floor((Date.now() - fecha.getTime()) / 60000);
  if (diffMin < 1) return "Hace unos segundos";
  if (diffMin < 60) return `Hace ${diffMin} min`;
  return fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function estaEnLinea(puente: PuenteRow | null): boolean {
  if (!puente || puente.status !== "conectado" || !puente.last_heartbeat) return false;
  const diffMs = Date.now() - new Date(puente.last_heartbeat).getTime();
  return diffMs < 90_000;
}

type Props = {
  apiBase?: string;
  claveLocal?: string;
};

/**
 * Panel Web de Conexión y Control Remoto (Cloud + Desktop Bridge):
 * - Vinculación Rápida en 1 Paso (código único de 6 caracteres)
 * - Monitor de Salud en Vivo (PC Local + Piloto Automático 200% + última sincronización + mensajes hoy)
 * - Sincronización Automática de Catálogo y Reglas (config_version)
 * - Toma de Control Remota para urgencias vía whatsapp_outbox
 */
export function PuenteWhatsAppLocal({ apiBase = "http://localhost:3001", claveLocal = "" }: Props) {
  const { negocio } = useNegocio();
  const [puente, setPuente] = useState<PuenteRow | null>(null);
  const [outbox, setOutbox] = useState<OutboxRow[]>([]);
  const [urgencias, setUrgencias] = useState<UrgenciaRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [actualizando, setActualizando] = useState(false);
  const [vinculandoPc, setVinculandoPc] = useState(false);

  // Toma de control remota (urgencias)
  const [telefonoUrgencia, setTelefonoUrgencia] = useState("");
  const [mensajeUrgencia, setMensajeUrgencia] = useState("");
  const [enviandoOutbox, setEnviandoOutbox] = useState(false);

  const cargarTodo = useCallback(async () => {
    if (!negocio?.id) return;
    const { data: existente } = await supabase
      .from("whatsapp_bridge")
      .select("*")
      .eq("business_id", negocio.id)
      .maybeSingle();

    let fila = existente;
    if (!fila) {
      // Crea el puente automáticamente con un código único de 6 caracteres
      for (let intento = 0; intento < 3 && !fila; intento++) {
        const codigo = generarCodigoEmparejamiento();
        const { data: creada } = await supabase
          .from("whatsapp_bridge")
          .insert({
            business_id: negocio.id,
            pairing_code: codigo,
            status: "desconectado",
            auto_pilot_200: true,
            config_version: 1,
          })
          .select("*")
          .maybeSingle();
        if (creada) fila = creada;
      }
    }
    if (fila) setPuente(fila);

    const [{ data: cola }, { data: alertas }] = await Promise.all([
      supabase
        .from("whatsapp_outbox")
        .select("*")
        .eq("business_id", negocio.id)
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("crm_pqrs")
        .select("id,telefono,tipo,resumen,urgencia,estado,created_at")
        .eq("negocio_id", negocio.id)
        .or("urgencia.eq.Alta,tipo.eq.Urgencia")
        .neq("estado", "resuelto")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

    setOutbox(cola ?? []);
    setUrgencias((alertas ?? []) as UrgenciaRow[]);
    setCargando(false);
  }, [negocio?.id]);

  useEffect(() => {
    void cargarTodo();
  }, [cargarTodo]);

  // Suscripción en tiempo real + respaldo periódico cada 12 s
  useEffect(() => {
    if (!negocio?.id) return;
    const canal = supabase
      .channel(`wa-bridge-${negocio.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_bridge", filter: `business_id=eq.${negocio.id}` },
        (payload) => {
          if (payload.new && typeof payload.new === "object" && "id" in payload.new) {
            setPuente(payload.new as PuenteRow);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_outbox", filter: `business_id=eq.${negocio.id}` },
        () => {
          void cargarTodo();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "crm_pqrs", filter: `negocio_id=eq.${negocio.id}` },
        () => {
          void cargarTodo();
        },
      )
      .subscribe();

    const timer = window.setInterval(() => {
      void cargarTodo();
    }, 12_000);

    return () => {
      window.clearInterval(timer);
      void supabase.removeChannel(canal);
    };
  }, [negocio?.id, cargarTodo]);

  const copiarCodigo = async () => {
    if (!puente?.pairing_code) return;
    try {
      await navigator.clipboard.writeText(puente.pairing_code);
      toast.success("Código de vinculación copiado");
    } catch {
      toast.error("No se pudo copiar el código");
    }
  };

  const regenerarCodigo = async () => {
    if (!puente || !negocio?.id) return;
    setActualizando(true);
    const nuevoCodigo = generarCodigoEmparejamiento();
    const { data, error } = await supabase
      .from("whatsapp_bridge")
      .update({
        pairing_code: nuevoCodigo,
        status: "desconectado",
        updated_at: new Date().toISOString(),
      })
      .eq("id", puente.id)
      .eq("business_id", negocio.id)
      .select("*")
      .maybeSingle();
    setActualizando(false);
    if (error || !data) {
      toast.error("No se pudo generar un código nuevo");
      return;
    }
    setPuente(data);
    toast.success("Código nuevo generado. Pégalo en tu app local de Windows.");
  };

  const alternarPiloto200 = async () => {
    if (!puente || !negocio?.id) return;
    setActualizando(true);
    const nuevoValor = !puente.auto_pilot_200;
    const { data, error } = await supabase
      .from("whatsapp_bridge")
      .update({
        auto_pilot_200: nuevoValor,
        config_version: puente.config_version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", puente.id)
      .eq("business_id", negocio.id)
      .select("*")
      .maybeSingle();
    setActualizando(false);
    if (error || !data) {
      toast.error("No se pudo actualizar el Piloto Automático");
      return;
    }
    setPuente(data);
    toast.success(nuevoValor ? "Piloto Automático 200% activado" : "Piloto Automático pausado");
  };

  const forzarSincronizacion = async () => {
    if (!puente || !negocio?.id) return;
    setActualizando(true);
    const { data, error } = await supabase
      .from("whatsapp_bridge")
      .update({
        config_version: puente.config_version + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", puente.id)
      .eq("business_id", negocio.id)
      .select("*")
      .maybeSingle();
    setActualizando(false);
    if (error || !data) {
      toast.error("No se pudo solicitar la sincronización");
      return;
    }
    setPuente(data);
    toast.success(`Sincronización v${data.config_version} enviada al PC local`);
  };

  const vincularEstePc = async () => {
    if (!puente?.pairing_code || !claveLocal.trim()) return;
    setVinculandoPc(true);
    try {
      const r = await fetch(`${apiBase}/bridge/vincular`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${claveLocal.trim()}`,
        },
        body: JSON.stringify({ pairing_code: puente.pairing_code }),
      });
      if (!r.ok) throw new Error("No respondió el puente local");
      toast.success("PC Local vinculado en tiempo real con tu plataforma web");
      void cargarTodo();
    } catch {
      toast.error("No se detectó la app local en este PC. Abre Gosaryc en Windows y pega el código.");
    } finally {
      setVinculandoPc(false);
    }
  };

  const enviarRespuestaRemota = async () => {
    if (!negocio?.id) return;
    const tel = telefonoUrgencia.replace(/[^\d+]/g, "").trim();
    const msg = mensajeUrgencia.trim();
    if (tel.length < 7 || msg.length < 2) {
      toast.error("Escribe el teléfono del cliente y el mensaje de urgencia");
      return;
    }
    setEnviandoOutbox(true);
    const { error } = await supabase.from("whatsapp_outbox").insert({
      business_id: negocio.id,
      telefono: tel,
      mensaje: msg,
      estado: "pendiente",
    });
    setEnviandoOutbox(false);
    if (error) {
      toast.error("No se pudo encolar el mensaje remoto");
      return;
    }
    setMensajeUrgencia("");
    toast.success("Mensaje encolado: tu PC local lo enviará por WhatsApp al instante");
    void cargarTodo();
  };

  const marcarUrgenciaResuelta = async (id: string) => {
    if (!negocio?.id) return;
    await supabase.from("crm_pqrs").update({ estado: "resuelto" }).eq("id", id).eq("negocio_id", negocio.id);
    setUrgencias((prev) => prev.filter((u) => u.id !== id));
    toast.success("Urgencia marcada como atendida");
  };

  if (!negocio) return null;

  const online = estaEnLinea(puente);
  const sinInternet = puente?.status === "sin_internet";
  const hoyIso = new Date().toISOString().slice(0, 10);
  const mensajesHoy = puente && puente.mensajes_hoy_fecha === hoyIso ? puente.mensajes_hoy : 0;

  return (
    <GlassPanel className="space-y-5 p-5 text-foreground">
      {/* Encabezado + Monitor de Salud en Vivo */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
            <Laptop className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-base font-semibold text-foreground sm:text-lg">
              Conexión Híbrida y Control Remoto (PC Local ↔ Web)
            </h3>
            <p className="text-xs text-muted-foreground">
              Sincroniza tu inventario, CRM, reglas y pedidos en tiempo real con la app local de WhatsApp IA en Windows.
            </p>
          </div>
        </div>

        {/* Indicador visual verde / rojo en vivo */}
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
            online
              ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/20 dark:text-emerald-300"
              : sinInternet
                ? "border-amber-500/30 bg-amber-500/15 text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/20 dark:text-amber-300"
                : "border-rose-500/30 bg-rose-500/15 text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/20 dark:text-rose-300"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              online ? "animate-pulse bg-emerald-500" : sinInternet ? "bg-amber-500" : "bg-rose-500"
            }`}
          />
          {online ? (
            <>
              <Wifi className="h-3.5 w-3.5 shrink-0" />
              {puente?.auto_pilot_200
                ? "Conectado en PC Local • Piloto Automático 200% Activo"
                : "Conectado en PC Local • Piloto Pausado"}
            </>
          ) : sinInternet ? (
            <>
              <WifiOff className="h-3.5 w-3.5 shrink-0" />
              PC Local sin internet (en espera)
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 shrink-0" />
              PC Local desconectado
            </>
          )}
        </span>
      </div>

      {cargando ? (
        <p className="text-sm text-muted-foreground">Preparando puente de sincronización…</p>
      ) : (
        <>
          {/* 1. Vinculación Rápida en 1 Paso */}
          <div className="grid gap-4 lg:grid-cols-12">
            <div className="space-y-3 rounded-xl border border-glass-border bg-background/50 p-4 lg:col-span-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">
                  Vinculación Rápida en 1 Paso
                </p>
                <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                  Catálogo v{puente?.config_version ?? 1}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Abre tu app local de WhatsApp IA en Windows y pega este código para vincular tu inventario, CRM y pedidos en tiempo real.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 rounded-xl border border-emerald-500/35 bg-card px-4 py-2.5 font-mono text-xl font-bold tracking-[0.28em] text-emerald-600 shadow-xs dark:border-emerald-400/30 dark:text-emerald-300">
                  {puente?.pairing_code ?? "------"}
                </div>
                <button
                  type="button"
                  onClick={() => void copiarCodigo()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copiar código
                </button>
                <button
                  type="button"
                  disabled={actualizando}
                  onClick={() => void regenerarCodigo()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-glass-border bg-card px-3 py-2.5 text-xs font-medium text-foreground transition hover:bg-muted disabled:opacity-60"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Nuevo código
                </button>
                {claveLocal.trim() && (
                  <button
                    type="button"
                    disabled={vinculandoPc}
                    onClick={() => void vincularEstePc()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                  >
                    <Laptop className="h-3.5 w-3.5" />
                    {vinculandoPc ? "Vinculando…" : "Vincular este PC ahora"}
                  </button>
                )}
              </div>
            </div>

            {/* 2. Métricas de Salud en Vivo + Sincronización Automática */}
            <div className="grid grid-cols-2 gap-3 lg:col-span-5">
              <div className="flex flex-col justify-between rounded-xl border border-glass-border bg-background/50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5 text-emerald-500" />
                  Última sincronización
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatearHoraCorta(puente?.last_sync_at ?? puente?.updated_at ?? null)}
                </p>
                <button
                  type="button"
                  disabled={actualizando}
                  onClick={() => void forzarSincronizacion()}
                  className="mt-2 inline-flex items-center gap-1 text-left text-[11px] font-medium text-primary hover:underline disabled:opacity-60"
                >
                  <RefreshCw className="h-3 w-3" /> Sincronizar catálogo ahora
                </button>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-glass-border bg-background/50 p-3.5">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5 text-sky-500" />
                  Resueltos hoy
                </div>
                <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
                  {mensajesHoy}
                </p>
                <button
                  type="button"
                  disabled={actualizando}
                  onClick={() => void alternarPiloto200()}
                  className="mt-1 inline-flex items-center gap-1 text-left text-[11px] font-medium text-emerald-600 hover:underline disabled:opacity-60 dark:text-emerald-400"
                >
                  <Sparkles className="h-3 w-3" />
                  {puente?.auto_pilot_200 ? "Piloto 200% ON" : "Activar Piloto 200%"}
                </button>
              </div>
            </div>
          </div>

          <p className="flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs text-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
            <span>
              <strong>Sincronización automática activa:</strong> cada vez que editas precios, platos, vehículos o preguntas frecuentes en la web, la versión de catálogo (v{puente?.config_version ?? 1}) sube sola y tu PC local descarga los cambios al instante.
            </span>
          </p>

          {/* 3. Toma de Control Remota (Solo Urgencias) */}
          <div className="space-y-3 border-t border-glass-border/70 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-500" />
                <h4 className="text-sm font-semibold text-foreground">
                  Toma de Control Remota (Solo Urgencias)
                </h4>
              </div>
              <span className="text-[11px] text-muted-foreground">
                Despacho instantáneo vía PC Local
              </span>
            </div>

            {urgencias.length > 0 && (
              <div className="space-y-2">
                {urgencias.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                        {u.tipo} · {u.telefono || "Sin teléfono"}
                      </p>
                      <p className="break-words text-foreground/90">
                        {u.resumen || "El agente solicitó intervención humana urgente."}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {u.telefono && (
                        <button
                          type="button"
                          onClick={() => setTelefonoUrgencia(u.telefono ?? "")}
                          className="rounded-lg bg-amber-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                        >
                          Responder
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void marcarUrgenciaResuelta(u.id)}
                        className="rounded-lg border border-glass-border bg-card px-2.5 py-1.5 text-xs text-foreground hover:bg-muted"
                      >
                        Resolver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-2 sm:grid-cols-12">
              <input
                type="tel"
                inputMode="tel"
                placeholder="WhatsApp cliente (ej. 3001234567)"
                value={telefonoUrgencia}
                onChange={(e) => setTelefonoUrgencia(e.target.value)}
                className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base text-foreground placeholder:text-muted-foreground/70 sm:col-span-4"
              />
              <input
                type="text"
                placeholder="Escribe tu respuesta urgente para que el PC local la envíe al instante…"
                value={mensajeUrgencia}
                onChange={(e) => setMensajeUrgencia(e.target.value)}
                className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base text-foreground placeholder:text-muted-foreground/70 sm:col-span-6"
              />
              <button
                type="button"
                disabled={enviandoOutbox}
                onClick={() => void enviarRespuestaRemota()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60 sm:col-span-2"
              >
                <Send className="h-4 w-4" />
                {enviandoOutbox ? "Enviando…" : "Enviar"}
              </button>
            </div>

            {outbox.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Últimos envíos remotos
                </p>
                <ul className="space-y-1.5">
                  {outbox.slice(0, 5).map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-glass-border bg-background/50 px-3 py-2 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-mono font-medium text-foreground">
                          {item.telefono}
                        </span>
                        <span className="mx-1.5 text-muted-foreground">·</span>
                        <span className="break-words text-muted-foreground">{item.mensaje}</span>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          item.estado === "enviado"
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                        }`}
                      >
                        {item.estado === "enviado" ? "Enviado" : "En cola PC"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </GlassPanel>
  );
}
