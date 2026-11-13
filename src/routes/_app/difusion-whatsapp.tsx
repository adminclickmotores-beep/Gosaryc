import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Megaphone, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

export const Route = createFileRoute("/_app/difusion-whatsapp")({
  head: () => ({ meta: [{ title: "Difusión por WhatsApp" }] }),
  component: DifusionWhatsappPage,
});

type Registro = Tables<"modulo_registros">;

const ETIQUETAS: Record<string, string> = { pendiente: "Borrador", en_proceso: "Listo para enviar", hecho: "Enviado" };

function textoMensaje(r: Registro): string {
  return [r.titulo, r.detalle].filter(Boolean).join("\n\n");
}

function DifusionWhatsappPage() {
  const [mensajes, setMensajes] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from("modulo_registros")
      .select("*")
      .eq("modulo", "difusion")
      .order("created_at", { ascending: false });
    if (error) toast.error("No se pudieron cargar los mensajes.");
    setMensajes(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Megaphone className="h-7 w-7 text-primary" /> Difusión por WhatsApp
        </h1>
        <p className="text-sm text-muted-foreground">
          Promociones y recordatorios listos para compartir. Escribe el mensaje en{" "}
          <Link to="/modulos/$id" params={{ id: "difusion" }} className="text-primary">
            sus registros
          </Link>
          , y con el botón de WhatsApp lo abres en la app para enviarlo a tus contactos.
        </p>
      </div>

      {cargando && <p className="text-sm text-muted-foreground">Cargando mensajes…</p>}

      {!cargando && mensajes.length === 0 && (
        <p className="text-sm text-muted-foreground">Aún no tienes mensajes preparados.</p>
      )}

      {!cargando && (
        <div className="space-y-2">
          {mensajes.map((m) => (
            <GlassPanel key={m.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 break-words text-sm font-medium text-foreground">{m.titulo}</p>
                <span className="shrink-0 text-xs text-muted-foreground">{ETIQUETAS[m.estado] ?? m.estado}</span>
              </div>
              {m.detalle && <p className="whitespace-pre-line break-words text-xs text-muted-foreground">{m.detalle}</p>}
              <a
                href={`https://wa.me/?text=${encodeURIComponent(textoMensaje(m))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-glass-border px-3 py-2 text-sm text-foreground hover:bg-glass/40"
              >
                <MessageCircle className="h-4 w-4 text-primary" /> Enviar por WhatsApp
              </a>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}
