import { useState } from "react";
import { Sparkles, Send } from "lucide-react";
import { toast } from "sonner";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { asesorContable, type MensajeContador } from "@/lib/contador-ia.functions";

type Props = {
  /** Nombre del tipo de negocio, para dar contexto al asesor. */
  tipoNegocio?: string;
};

const SUGERENCIAS: string[] = [
  "¿Qué obligaciones tributarias tengo este mes?",
  "¿Cómo puedo mejorar la utilidad de mi negocio?",
  "¿Qué debo revisar antes de cerrar el mes?",
];

export function AsesorIADashboard({ tipoNegocio = "" }: Props) {
  const [mensajes, setMensajes] = useState<MensajeContador[]>([]);
  const [pregunta, setPregunta] = useState("");
  const [pensando, setPensando] = useState(false);

  const enviar = async (texto: string) => {
    const limpio = texto.trim().slice(0, 500);
    if (!limpio || pensando) return;
    const nuevos: MensajeContador[] = [...mensajes, { role: "user", content: limpio }];
    setMensajes(nuevos);
    setPregunta("");
    setPensando(true);
    try {
      const r = await asesorContable({ data: { messages: nuevos, cifras: tipoNegocio ? `Tipo de negocio: ${tipoNegocio}` : "" } });
      setMensajes([...nuevos, { role: "assistant", content: r.respuesta }]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo consultar al asesor.");
    } finally {
      setPensando(false);
    }
  };

  return (
    <GlassPanel className="mb-4">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Asesor IA de tu negocio</h3>
      </div>
      {mensajes.length === 0 ? (
        <div className="mb-2 flex flex-wrap gap-2">
          {SUGERENCIAS.map((s: string) => (
            <button
              key={s}
              type="button"
              onClick={() => void enviar(s)}
              className="rounded-full border border-glass-border bg-glass/40 px-3 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              {s}
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-2 max-h-64 space-y-2 overflow-y-auto">
          {mensajes.map((m: MensajeContador, i: number) => (
            <p
              key={i}
              className={`whitespace-pre-wrap break-words rounded-lg px-3 py-2 text-sm ${m.role === "user" ? "bg-primary/10" : "bg-glass/40"}`}
            >
              {m.content}
            </p>
          ))}
          {pensando && <p className="text-xs text-muted-foreground">Pensando…</p>}
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void enviar(pregunta);
        }}
      >
        <input
          className="min-w-0 flex-1 rounded-lg border border-glass-border bg-glass/40 px-3 py-2 text-base outline-none focus:border-primary/40"
          value={pregunta}
          maxLength={500}
          onChange={(e) => setPregunta(e.target.value)}
          placeholder="Pregúntale algo a tu asesor…"
        />
        <button
          type="submit"
          disabled={pensando}
          aria-label="Enviar pregunta"
          className="inline-flex items-center gap-1.5 rounded-lg border border-glass-border bg-glass/60 px-3 py-2 text-sm hover:bg-glass"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </GlassPanel>
  );
}
