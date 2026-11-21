import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Clock, KeyRound, Mail, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { BRAND, enlaceWhatsappSoporte } from "@/lib/brand";
import { esCuentaMaestra, esSuperadminServidor } from "@/lib/cuenta-maestra";
import { evaluarVigenciaLicencia, leerTokenLicenciaOffline } from "@/lib/licencia-offline";

type Suscripcion = Tables<"suscripciones_negocio">;
type Pago = Tables<"pagos_licencia">;

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" });

/** Licencia del negocio: indicador discreto de vigencia (online y offline), activación con clave y renovación. */
export function LicenciaNegocio({ modo }: { modo: "bloqueo" | "aviso" }) {
  const { user } = useAuth();
  const [sub, setSub] = useState<Suscripcion | null>(null);
  const [offlineInfo, setOfflineInfo] = useState<{ plan: string; estado: string; vence_en: string; dias_gracia: number } | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [clave, setClave] = useState("");
  const [modalidad, setModalidad] = useState<"anual" | "diario">("anual");
  const [diasPase, setDiasPase] = useState("1");
  const [enviando, setEnviando] = useState(false);
  const [abierto, setAbierto] = useState(modo === "bloqueo");

  const [maestra, setMaestra] = useState(false);
  useEffect(() => {
    if (!user) return;
    if (esCuentaMaestra(user.email)) {
      setMaestra(true);
      return;
    }
    void esSuperadminServidor().then(setMaestra);
  }, [user]);

  const cargar = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase.from("suscripciones_negocio").select("*").maybeSingle();
      if (data) {
        setSub(data);
        setOfflineInfo(null);
      } else {
        const local = await leerTokenLicenciaOffline(user.id);
        if (local) setOfflineInfo({ plan: local.plan, estado: local.estado, vence_en: local.vence_en, dias_gracia: local.dias_gracia });
      }
      const { data: p } = await supabase.from("pagos_licencia").select("*").order("created_at", { ascending: false });
      setPagos(p ?? []);
    } catch {
      const local = await leerTokenLicenciaOffline(user.id);
      if (local) setOfflineInfo({ plan: local.plan, estado: local.estado, vence_en: local.vence_en, dias_gracia: local.dias_gracia });
    }
  }, [user]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  if (!user || maestra || (!sub && !offlineInfo)) return null;

  const esTitular = sub ? sub.owner_id === user.id : true;
  const planActual = sub?.plan ?? offlineInfo?.plan ?? "prueba";
  const estadoActual = sub?.estado ?? offlineInfo?.estado ?? "activo";
  const venceEn = sub?.vence_en ?? offlineInfo?.vence_en ?? new Date().toISOString();
  const diasGracia = (sub as { dias_gracia?: number | null } | null)?.dias_gracia ?? offlineInfo?.dias_gracia ?? 3;
  const vig = evaluarVigenciaLicencia(estadoActual, venceEn, diasGracia);

  if (modo === "aviso" && !esTitular) return null;

  const extraPendiente = pagos.find((p) => p.tipo === "dias_extra" && p.estado === "pendiente");
  const pasePendiente = pagos.find((p) => p.tipo === "diario" && p.estado === "pendiente");
  const puedeExtra = sub ? !sub.dias_extra_usados && !extraPendiente && !pagos.some((p) => p.tipo === "dias_extra") : false;
  const diasSolicitados = Math.min(Math.max(parseInt(diasPase, 10) || 1, 1), 365);
  const mensajeAnual = `Hola, quiero renovar mi licencia anual de Gosaryc ($100.000 COP por 1 año). Negocio titular: ${user.email ?? ""}. Te envío el soporte de pago.`;
  const mensajePase = `Hola, quiero solicitar un pase temporal de Gosaryc por ${diasSolicitados} ${diasSolicitados === 1 ? "día" : "días"}. Negocio titular: ${user.email ?? ""}. Te envío el soporte de pago.`;
  const mensaje = modalidad === "diario" ? mensajePase : mensajeAnual;

  const activar = async () => {
    if (!clave.trim()) return toast.error("Pega la clave de activación.");
    setEnviando(true);
    const { error } = await supabase.rpc("activar_licencia", { p_clave: clave.trim() });
    setEnviando(false);
    if (error) return toast.error(error.message || "No se pudo activar la licencia.");
    toast.success("Licencia activada.");
    setClave("");
    window.location.reload();
  };

  const pedirExtra = async () => {
    setEnviando(true);
    const { error } = await supabase.from("pagos_licencia").insert({ tipo: "dias_extra", monto: 0 });
    setEnviando(false);
    if (error) return toast.error(error.message || "No se pudo enviar la solicitud.");
    toast.success("Solicitud de 15 días adicionales de cortesía enviada.");
    void cargar();
  };

  const pedirPaseDias = async () => {
    setEnviando(true);
    const { error } = await supabase.from("pagos_licencia").insert({
      owner_id: user.id,
      correo: user.email ?? null,
      tipo: "diario",
      monto: 0,
      dias: diasSolicitados,
    });
    setEnviando(false);
    if (error) return toast.error(error.message || "No se pudo enviar la solicitud del pase por días.");
    toast.success(`Solicitud de pase por ${diasSolicitados} ${diasSolicitados === 1 ? "día" : "días"} enviada.`);
    void cargar();
  };

  if (!esTitular) {
    return modo === "bloqueo" ? (
      <p className="mt-4 text-sm text-muted-foreground">
        La licencia pertenece al administrador del negocio. Pídele que la renueve.
      </p>
    ) : null;
  }

  const etiquetaEstado = vig.bloqueo === "vencido"
    ? `Licencia vencida el ${fechaHora(venceEn)}`
    : vig.enGracia
      ? `Periodo de gracia: ${vig.diasGraciaRestantes} ${vig.diasGraciaRestantes === 1 ? "día restante" : "días restantes"}`
      : planActual === "prueba"
        ? `Periodo de prueba (30 días) · ${vig.diasRestantes} ${vig.diasRestantes === 1 ? "día restante" : "días restantes"}`
        : planActual === "diario"
          ? `Pase temporal activo · ${vig.diasRestantes} ${vig.diasRestantes === 1 ? "día restante" : "días restantes"}`
          : `Licencia activa · ${vig.diasRestantes} ${vig.diasRestantes === 1 ? "día restante" : "días restantes"}`;

  return (
    <div className={`${modo === "bloqueo" ? "mt-5 text-left" : "mb-4"} space-y-3 rounded-xl border ${vig.enGracia || vig.diasRestantes <= 7 ? "border-amber-500/40 bg-amber-500/5" : "border-glass-border bg-glass/30"} p-3.5`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-xs font-medium text-foreground sm:text-sm">
          {vig.enGracia || vig.diasRestantes <= 7 ? (
            <Clock className="h-4 w-4 shrink-0 text-amber-400" />
          ) : (
            <ShieldCheck className="h-4 w-4 shrink-0 text-primary" />
          )}
          <span>{etiquetaEstado}</span>
          {offlineInfo && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] text-primary">Validada sin conexión</span>}
        </p>
        {modo === "aviso" && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAbierto(!abierto)}
              className="inline-flex items-center gap-1 rounded-lg border border-glass-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-glass/50"
            >
              <KeyRound className="h-3.5 w-3.5 text-primary" /> {abierto ? "Ocultar" : "Activar clave de licencia"}
            </button>
            <a
              href={enlaceWhatsappSoporte(mensaje)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
            >
              <MessageCircle className="h-3.5 w-3.5" /> Renovar por WhatsApp
            </a>
          </div>
        )}
      </div>
      {abierto && (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setModalidad("anual")}
              className={`rounded-xl border p-3 text-left transition ${
                modalidad === "anual"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-glass-border bg-glass/20 text-muted-foreground hover:text-foreground"
              }`}
            >
              <p className="text-sm font-medium text-foreground">Licencia anual · $100.000 COP</p>
              <p className="mt-0.5 text-xs text-muted-foreground">1 año completo (365 días), soporte, web y escritorio.</p>
            </button>
            <button
              type="button"
              onClick={() => setModalidad("diario")}
              className={`rounded-xl border p-3 text-left transition ${
                modalidad === "diario"
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-glass-border bg-glass/20 text-muted-foreground hover:text-foreground"
              }`}
            >
              <p className="text-sm font-medium text-foreground">Pase por días (temporal)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Elige 1 día o los días exactos que necesites usar Gosaryc.</p>
            </button>
          </div>

          {modalidad === "diario" ? (
            <div className="space-y-2.5 rounded-xl border border-glass-border bg-glass/20 p-3">
              <p className="text-xs text-muted-foreground">Selecciona la duración de tu pase temporal:</p>
              <div className="flex flex-wrap gap-1.5">
                {[1, 3, 7, 15, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDiasPase(String(d))}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                      diasSolicitados === d
                        ? "bg-primary text-primary-foreground"
                        : "border border-glass-border text-foreground hover:bg-glass/50"
                    }`}
                  >
                    {d} {d === 1 ? "día" : "días"}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs text-muted-foreground" htmlFor="dias-pase">Días exactos (1 a 365):</label>
                <input
                  id="dias-pase"
                  type="number"
                  min={1}
                  max={365}
                  inputMode="numeric"
                  value={diasPase}
                  onChange={(e) => setDiasPase(e.target.value)}
                  className="w-24 rounded-lg border border-glass-border bg-glass/40 px-3 py-2 text-base text-foreground outline-none focus:border-primary/50"
                />
              </div>
              {pasePendiente ? (
                <p className="text-xs text-muted-foreground">
                  Tu solicitud de pase por {pasePendiente.dias ?? 1} {(pasePendiente.dias ?? 1) === 1 ? "día" : "días"} está en revisión.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={pedirPaseDias}
                  disabled={enviando}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-primary/50 bg-primary/15 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-primary/25 disabled:opacity-50"
                >
                  <CalendarPlus className="h-4 w-4 text-primary" /> Solicitar pase de {diasSolicitados} {diasSolicitados === 1 ? "día" : "días"}
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Tu cuenta incluye 30 días de prueba sin compromiso al registrarte. La licencia anual cuesta $100.000 COP e incluye soporte,
              instalación local y web: 1) Envía tu soporte de pago. 2) Recibes tu clave de activación. 3) Pégala aquí y pulsa Activar.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <a
              href={enlaceWhatsappSoporte(mensaje)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-glass-border px-3 py-2.5 text-xs text-foreground"
            >
              <MessageCircle className="h-4 w-4 text-primary" />
              {modalidad === "diario"
                ? `Solicitar pase por WhatsApp (${BRAND.supportWhatsappTexto})`
                : `Renovar por WhatsApp (${BRAND.supportWhatsappTexto})`}
            </a>
            <a
              href={`mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(modalidad === "diario" ? "Pase temporal de licencia" : "Renovación de licencia anual")}&body=${encodeURIComponent(mensaje)}`}
              className="inline-flex items-center gap-2 rounded-lg border border-glass-border px-3 py-2.5 text-xs text-foreground"
            >
              <Mail className="h-4 w-4 text-primary" /> {BRAND.supportEmail}
            </a>
          </div>
          <div className="space-y-2">
            <label className="block text-xs text-muted-foreground" htmlFor="clave-act">Clave de activación</label>
            <input
              id="clave-act"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              placeholder="GSR-XXXXX-XXXXX-XXXXX-XXXXX"
              autoComplete="off"
              className="w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 font-mono text-base text-foreground outline-none focus:border-primary/50"
            />
            <button
              onClick={activar}
              disabled={enviando || !clave.trim()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              <KeyRound className="h-4 w-4" /> Activar clave de licencia
            </button>
          </div>
          {extraPendiente ? (
            <p className="text-xs text-muted-foreground">Tu solicitud de 15 días adicionales de cortesía está en revisión.</p>
          ) : puedeExtra ? (
            <button
              onClick={pedirExtra}
              disabled={enviando}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-glass-border px-4 py-3 text-sm text-foreground disabled:opacity-50"
            >
              <CalendarPlus className="h-4 w-4" /> Solicitar 15 días adicionales de cortesía (una sola vez)
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
