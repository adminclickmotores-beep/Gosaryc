import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bot, Loader2, Send, User } from "lucide-react";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { runAgenteVirtual, type AgenteMensaje } from "@/lib/agente-virtual.functions";

export const Route = createFileRoute("/_app/asistente-virtual")({
  head: () => ({
    meta: [
      { title: "Agente virtual" },
      { name: "description", content: "Chatea con el asistente virtual de tu negocio." },
    ],
  }),
  component: AsistenteVirtualPage,
});

type Msg = { de: "bot" | "tu"; texto: string };

const SALUDO =
  "Hola, soy tu agente virtual. Pregúntame lo que necesites sobre tu negocio: productos, precios, cómo responder a un cliente o qué pasos seguir.";

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

function AsistenteVirtualPage() {
  const { negocio } = useNegocio();
  const [mensajes, setMensajes] = useState<Msg[]>([{ de: "bot", texto: SALUDO }]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const finRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes]);

  const enviar = async (entradaRaw: string) => {
    const entrada = entradaRaw.trim();
    if (!entrada || enviando) return;
    const historial: AgenteMensaje[] = [...mensajes, { de: "tu" as const, texto: entrada }]
      .filter((m, i) => !(i === 0 && m.de === "bot"))
      .map((m) => ({ role: m.de === "tu" ? "user" : "assistant", content: m.texto }));

    setMensajes((m) => [...m, { de: "tu", texto: entrada }]);
    setTexto("");
    setEnviando(true);
    try {
      const { texto: respuesta } = await runAgenteVirtual({
        data: { messages: historial, tipoNegocio: negocio?.tipo_negocio ?? null },
      });
      setMensajes((m) => [...m, { de: "bot", texto: respuesta }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No pude responder. Intenta de nuevo.";
      setMensajes((m) => [...m, { de: "bot", texto: msg }]);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-8 pt-8">
      <header className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Bot className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-foreground">Agente virtual</h1>
          <p className="text-sm text-muted-foreground">Un asistente con IA para responder dudas y apoyar a tu equipo.</p>
        </div>
      </header>

      <GlassPanel className="flex min-h-[60dvh] flex-col gap-4 p-4">
        <div className="flex-1 space-y-4 overflow-y-auto">
          {mensajes.map((m, i) => (
            <div key={i} className={`flex gap-2 ${m.de === "tu" ? "justify-end" : "justify-start"}`}>
              {m.de === "bot" && <Bot className="mt-2 h-4 w-4 shrink-0 text-primary" />}
              <p
                className={`min-w-0 max-w-[85%] whitespace-pre-line break-words rounded-2xl px-4 py-2.5 text-sm ${
                  m.de === "tu" ? "bg-primary text-primary-foreground" : "bg-glass-strong text-foreground"
                }`}
              >
                {m.texto}
              </p>
              {m.de === "tu" && <User className="mt-2 h-4 w-4 shrink-0 text-muted-foreground" />}
            </div>
          ))}
          {enviando && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Escribiendo…
            </div>
          )}
          <div ref={finRef} />
        </div>

        <form
          className="flex items-center gap-2 border-t border-glass-border pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
        >
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Escribe tu pregunta"
            disabled={enviando}
            className={campo}
          />
          <button
            type="submit"
            aria-label="Enviar"
            disabled={!texto.trim() || enviando}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </GlassPanel>
    </div>
  );
}
