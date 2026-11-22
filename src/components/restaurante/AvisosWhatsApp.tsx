import { useState } from "react";
import { toast } from "sonner";
import { BellRing, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { usePermisos } from "@/hooks/use-permisos";

const PLANTILLAS = [
  { id: "cobro", nombre: "Recordatorio de pago", texto: "Hola, te recordamos que tienes un saldo pendiente con nosotros. Si ya pagaste, ignora este mensaje. ¡Gracias!" },
  { id: "listo", nombre: "Pedido listo", texto: "Hola, tu pedido ya está listo. Puedes pasar a recogerlo o esperar la entrega. ¡Gracias por tu compra!" },
  { id: "cita", nombre: "Recordatorio de cita", texto: "Hola, te recordamos tu cita de mañana. Si necesitas cambiarla, responde a este mensaje. ¡Te esperamos!" },
] as const;

const campo =
  "w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base text-foreground placeholder:text-muted-foreground/70";

/**
 * Avisos por WhatsApp: encola recordatorios (pagos, pedidos listos, citas).
 * El PC local con el agente los envía por WhatsApp desde la cola whatsapp_outbox.
 */
export function AvisosWhatsApp() {
  const { negocio } = useNegocio();
  const { esAdmin } = usePermisos();
  const [telefono, setTelefono] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!negocio || !esAdmin) return null;

  const encolar = async () => {
    const tel = telefono.replace(/[^\d+]/g, "").trim();
    const msg = mensaje.trim();
    if (tel.length < 7) return toast.error("Escribe el número de WhatsApp del cliente.");
    if (msg.length < 2) return toast.error("Escribe o elige el mensaje del aviso.");
    setEnviando(true);
    const { error } = await supabase.from("whatsapp_outbox").insert({
      business_id: negocio.id,
      telefono: tel,
      mensaje: msg,
      estado: "pendiente",
    });
    setEnviando(false);
    if (error) return toast.error("No se pudo programar el aviso.");
    setMensaje("");
    toast.success("Aviso programado: se enviará por WhatsApp desde tu PC local.");
  };

  return (
    <GlassPanel className="space-y-4 p-5 text-foreground">
      <div className="flex items-center gap-2">
        <BellRing className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Avisos automáticos por WhatsApp</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Elige una plantilla o escribe tu aviso. Se envía desde el WhatsApp de tu negocio a través del PC local.
      </p>
      <div className="flex flex-wrap gap-2">
        {PLANTILLAS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setMensaje(p.texto)}
            className="rounded-full border border-glass-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:bg-muted"
          >
            {p.nombre}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-12">
        <input
          type="tel"
          inputMode="tel"
          placeholder="WhatsApp del cliente (ej. 3001234567)"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          className={`${campo} sm:col-span-4`}
        />
        <input
          type="text"
          placeholder="Mensaje del aviso"
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          className={`${campo} sm:col-span-6`}
        />
        <button
          type="button"
          disabled={enviando}
          onClick={() => void encolar()}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60 sm:col-span-2"
        >
          <Send className="h-4 w-4" />
          {enviando ? "Programando…" : "Enviar aviso"}
        </button>
      </div>
    </GlassPanel>
  );
}
