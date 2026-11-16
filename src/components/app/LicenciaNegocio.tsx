import { useCallback, useEffect, useState } from "react";
import { CalendarPlus, Clock, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { BRAND } from "@/lib/brand";

type Suscripcion = Tables<"suscripciones_negocio">;
type Pago = Tables<"pagos_licencia">;

const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Licencia del negocio: estado, envío del comprobante de pago y solicitud única de días adicionales. */
export function LicenciaNegocio({ modo }: { modo: "bloqueo" | "aviso" }) {
  const { user } = useAuth();
  const [sub, setSub] = useState<Suscripcion | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [archivo, setArchivo] = useState<File | null>(null);
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
  const dias = Math.round(
    (new Date(`${sub.vence_el}T00:00:00`).getTime() - new Date(`${hoyIso()}T00:00:00`).getTime()) / 86400000,
  );
  if (modo === "aviso" && (!esTitular || dias > 7)) return null;

  const pagoPendiente = pagos.find((p) => p.tipo === "anual" && p.estado === "pendiente");
  const extraPendiente = pagos.find((p) => p.tipo === "dias_extra" && p.estado === "pendiente");
  const puedeExtra = !sub.dias_extra_usados && !extraPendiente && !pagos.some((p) => p.tipo === "dias_extra");

  const enviarComprobante = async () => {
    if (!archivo) return toast.error("Adjunta el comprobante de pago.");
    if (archivo.size > 5 * 1024 * 1024) return toast.error("El archivo debe pesar menos de 5 MB.");
    setEnviando(true);
    const nombre = archivo.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const ruta = `${user.id}/${Date.now()}-${nombre}`;
    const { error: e1 } = await supabase.storage.from("comprobantes_pago").upload(ruta, archivo);
    if (e1) {
      setEnviando(false);
      return toast.error("No se pudo subir el comprobante.");
    }
    const { error: e2 } = await supabase.from("pagos_licencia").insert({ tipo: "anual", monto: 100000, comprobante_url: ruta });
    setEnviando(false);
    if (e2) return toast.error("No se pudo registrar el pago.");
    setArchivo(null);
    toast.success("Comprobante enviado. Te enviaremos la licencia por correo y WhatsApp al aprobarlo.");
    cargar();
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
          <Clock className="h-4 w-4 text-primary" />
          {dias < 0
            ? "Tu licencia venció"
            : `Tu licencia ${sub.plan === "prueba" ? "de prueba " : ""}vence el ${sub.vence_el} (${dias} ${dias === 1 ? "día" : "días"})`}
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
            La licencia anual cuesta $100.000 COP e incluye soporte, instalación local y web. Paga y sube aquí el comprobante:
            sin pago no se activa. Al aprobarla recibirás la licencia por correo y WhatsApp. También puedes enviar el soporte de pago al WhatsApp {BRAND.supportWhatsappTexto} o a {BRAND.supportEmail}.
          </p>
          {pagoPendiente ? (
            <p className="text-sm text-foreground">Tu comprobante está en revisión. Te avisaremos cuando se apruebe.</p>
          ) : (
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
                className="block w-full text-base text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:text-primary-foreground"
              />
              <button
                onClick={enviarComprobante}
                disabled={enviando || !archivo}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                <Upload className="h-4 w-4" /> Enviar comprobante de pago
              </button>
            </div>
          )}
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
