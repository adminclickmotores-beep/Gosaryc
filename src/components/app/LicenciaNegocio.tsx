import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Clock, KeyRound, Mail, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { BRAND, enlaceWhatsappSoporte } from "@/lib/brand";

type Suscripcion = Tables<"suscripciones_negocio">;
type Pago = Tables<"pagos_licencia">;

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" });

/** Licencia del negocio: vigencia exacta, solicitud de renovación y activación con la clave que entrega Gosaryc. */
export function LicenciaNegocio({ modo }: { modo: "bloqueo" | "aviso" }) {
  const { user } = useAuth();
  const [sub, setSub] = useState<Suscripcion | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [clave, setClave] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [abierto, setAbierto] = useState(modo === "bloqueo");

  const cargar = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("suscripciones_negocio").select("*").maybeSingle();
    setSub(data);
    const { data: p } = await supabase.from("pagos_licencia").select("*").order("created_at", { ascending: false });
    setPagos(p ?? []);
  }, [user]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!user || !sub) return null;

  const esTitular = sub.owner_id === user.id;
  const ms = new Date(sub.vence_en).getTime() - Date.now();
  const dias = Math.ceil(ms / 86400000);
  if (modo === "aviso" && (!esTitular || dias > 7)) return null;

  const extraPendiente = pagos.find((p) => p.tipo === "dias_extra" && p.estado === "pendiente");
  const puedeExtra = !sub.dias_extra_usados && !extraPendiente && !pagos.some((p) => p.tipo === "dias_extra");
  const mensaje = `Hola, quiero renovar mi licencia anual de Gosaryc ($100.000). Negocio titular: ${user.email ?? ""}. Te envío el soporte de pago.`;

  const activar = async () => {
    if (!clave.trim()) return toast.error("Pega la clave de activación.");
    setEnviando(true);
    const { error } = await supabase.rpc("activar_licencia", { p_clave: clave.trim() });
    setEnviando(false);
    if (error) return toast.error(error.message || "No se pudo activar la licencia.");
    toast.success("Licencia activada por 1 año.");
    setClave("");
    window.location.reload();
  };

  const pedirExtra = async () => {
    setEnviando(true);
    const { error } = await supabase.from("pagos_licencia").insert({ tipo: "dias_extra", monto: 0 });
    setEnviando(false);
    if (error) return toast.error(error.message || "No se pudo enviar la solicitud.");
    toast.success("Solicitud de días adicionales enviada.");
    cargar();
  };

  if (!esTitular) {
    return modo === "bloqueo" ? (
      <p className="mt-4 text-sm text-muted-foreground">
        La licencia pertenece al administrador del negocio. Pídele que la renueve.
      </p>
    ) : null;
  }

  return (
    <div className={`${modo === "bloqueo" ? "mt-5 text-left" : "mb-4"} space-y-3 rounded-xl border border-glass-border bg-glass/30 p-4`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Clock className="h-4 w-4 shrink-0 text-primary" />
          {ms <= 0
            ? `Tu licencia venció el ${fechaHora(sub.vence_en)}`
            : `Tu licencia ${sub.plan === "prueba" ? "de prueba " : ""}vence el ${fechaHora(sub.vence_en)}`}
        </p>
        {modo === "aviso" && (
          <button onClick={() => setAbierto(!abierto)} className="text-xs text-primary">
            {abierto ? "Ocultar" : "Renovar"}
          </button>
        )}
      </div>
      {abierto && (
        <>
          <p className="text-sm text-muted-foreground">
            Cada negocio tiene una sola licencia. La renovación anual cuesta $100.000 COP e incluye soporte, instalación local y web.
            1) Envía tu soporte de pago. 2) Gosaryc te entrega una clave de activación. 3) Pégala aquí y pulsa Activar: tu licencia
            queda vigente por 1 año exacto.
          </p>
          <div className="flex flex-wrap gap-2">
            <a
              href={enlaceWhatsappSoporte(mensaje)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-glass-border px-3 py-2.5 text-xs text-foreground"
            >
              <MessageCircle className="h-4 w-4 text-primary" /> WhatsApp {BRAND.supportWhatsappTexto}
            </a>
            <a
              href={`mailto:${BRAND.supportEmail}?subject=${encodeURIComponent("Renovación de licencia")}&body=${encodeURIComponent(mensaje)}`}
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
              <KeyRound className="h-4 w-4" /> Activar licencia
            </button>
          </div>
          {extraPendiente ? (
            <p className="text-xs text-muted-foreground">Tu solicitud de días adicionales está en revisión.</p>
          ) : puedeExtra ? (
            <button
              onClick={pedirExtra}
              disabled={enviando}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-glass-border px-4 py-3 text-sm text-foreground disabled:opacity-50"
            >
              <CalendarPlus className="h-4 w-4" /> Solicitar días adicionales (una sola vez)
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
