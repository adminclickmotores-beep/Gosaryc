import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Mic, MicOff, Send, Volume2, VolumeX, X } from "lucide-react";
import { interpretarVoz, type VozModulo, type VozLlamada } from "@/lib/voz-copiloto.functions";
import { limpiarTexto } from "@/lib/validacion-publica";
import { interpretarLocal, prepararLlamada, type VozContexto, type VozPlan } from "@/lib/voz-herramientas";

type ReconocedorWeb = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type NativoVoz = {
  available?: () => Promise<{ available: boolean }>;
  requestPermissions?: () => Promise<unknown>;
  start: (o: { language: string; partialResults: boolean; popup: boolean }) => Promise<{ matches?: string[] } | void>;
  stop: () => Promise<void>;
  addListener?: (ev: string, fn: (d: { matches?: string[] }) => void) => Promise<{ remove: () => void }> | { remove: () => void };
};

const CLAVE_VOZ = "gosaryc:voz-habla";

function crearReconocedor(): ReconocedorWeb | null {
  const w = window as unknown as { SpeechRecognition?: new () => ReconocedorWeb; webkitSpeechRecognition?: new () => ReconocedorWeb };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return C ? new C() : null;
}
/** Puente nativo de Android (Capacitor): se usa si la app APK trae el complemento de reconocimiento de voz. */
function nativoAndroid(): NativoVoz | null {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean; Plugins?: Record<string, NativoVoz> } }).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  return cap.Plugins?.SpeechRecognition ?? null;
}

const SI = /^(si|sí|confirmo|confirmar|confirma|dale|adelante|ok|claro)\b/i;
const NO = /^(no|cancela|cancelar|detente|olvidalo|olvídalo)\b/i;

type Props = {
  esAdmin: boolean;
  puede: (modulo: string) => boolean;
  modulos: VozModulo[];
  tipoNegocio: string;
  rutaPanel: string;
  irA: (ruta: string, vista?: string) => void;
};

/** Copiloto de voz: botón flotante (Ctrl+Espacio), dictado en vivo en es-CO, respuesta hablada opcional y tarjeta de confirmación. */
export function VoiceCopilotProvider({ esAdmin, puede, modulos, tipoNegocio, rutaPanel, irA }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const [dictado, setDictado] = useState("");
  const [texto, setTexto] = useState("");
  const [pensando, setPensando] = useState(false);
  const [respuesta, setRespuesta] = useState("");
  const [error, setError] = useState("");
  const [pendiente, setPendiente] = useState<VozPlan | null>(null);
  const [enlace, setEnlace] = useState<VozPlan["enlace"] | null>(null);
  const [habla, setHabla] = useState(false);
  const rec = useRef<ReconocedorWeb | null>(null);
  const escuchaNativa = useRef<{ remove: () => void } | null>(null);
  const ultimoTexto = useRef("");
  const ctxRef = useRef<VozContexto | null>(null);
  const pendienteRef = useRef<VozPlan | null>(null);

  ctxRef.current = { esAdmin, puede, modulos, rutaPanel, irA };
  pendienteRef.current = pendiente;

  useEffect(() => {
    setHabla(window.localStorage.getItem(CLAVE_VOZ) === "1");
  }, []);

  const hablar = useCallback(
    (t: string) => {
      if (!habla || !t || typeof window.speechSynthesis === "undefined") return;
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = "es-CO";
      window.speechSynthesis.speak(u);
    },
    [habla],
  );

  const decir = useCallback(
    (t: string) => {
      setRespuesta(t);
      hablar(t);
    },
    [hablar],
  );

  const ejecutarPlan = useCallback(
    async (plan: VozPlan) => {
      setPendiente(null);
      if (!plan.ejecutar) return;
      try {
        decir(await plan.ejecutar());
      } catch (e) {
        const m = e instanceof Error ? e.message : "No pude completar la acción.";
        setError(m);
        hablar(m);
      }
    },
    [decir, hablar],
  );

  const procesar = useCallback(
    async (crudo: string) => {
      const t = limpiarTexto(crudo, 600);
      const ctx = ctxRef.current;
      if (!t || !ctx) return;
      setError("");
      setEnlace(null);
      setDictado(t);

      // Confirmación por voz o por texto de lo que está pendiente.
      const pend = pendienteRef.current;
      if (pend) {
        if (SI.test(t)) return void (await ejecutarPlan(pend));
        if (NO.test(t)) {
          setPendiente(null);
          return decir("Cancelado. No cambié nada.");
        }
      }

      setPendiente(null);
      setPensando(true);
      try {
        let llamadas: VozLlamada[] = [];
        let charla = "";
        const sinRed = typeof navigator !== "undefined" && navigator.onLine === false;
        if (sinRed) {
          llamadas = interpretarLocal(t, ctx);
          if (llamadas.length === 0) charla = "Sin internet solo puedo abrir módulos. Di, por ejemplo: abre inventario.";
        } else {
          const r = await interpretarVoz({ data: { texto: t, tipoNegocio, modulos: ctx.modulos, esAdmin: ctx.esAdmin } });
          llamadas = r.llamadas;
          charla = r.respuesta;
        }

        const partes: string[] = [];
        for (const l of llamadas) {
          const plan = await prepararLlamada(l, ctx);
          if (plan.confirmar) {
            setPendiente(plan);
            partes.push("Necesito tu confirmación antes de continuar.");
            break;
          }
          if (plan.enlace) setEnlace(plan.enlace);
          if (plan.ejecutar) {
            try {
              partes.push(await plan.ejecutar());
            } catch (e) {
              partes.push(e instanceof Error ? e.message : "No pude completar la acción.");
              break;
            }
          } else {
            partes.push(plan.texto);
          }
        }
        decir(partes.length > 0 ? partes.join(" ") : charla || "No entendí la orden. Intenta decirlo de otra forma.");
      } catch (e) {
        const m = e instanceof Error ? e.message : "El copiloto no pudo responder.";
        setError(m);
        hablar(m);
      } finally {
        setPensando(false);
      }
    },
    [decir, ejecutarPlan, hablar, tipoNegocio],
  );

  const detener = useCallback(() => {
    try {
      rec.current?.stop();
    } catch {
      /* ya detenido */
    }
    const nat = nativoAndroid();
    if (nat) void nat.stop().catch(() => undefined);
    escuchaNativa.current?.remove();
    escuchaNativa.current = null;
    setEscuchando(false);
  }, []);

  const escuchar = useCallback(async () => {
    setAbierto(true);
    setError("");
    setDictado("");
    ultimoTexto.current = "";
    if (typeof window.speechSynthesis !== "undefined") window.speechSynthesis.cancel();

    const nat = nativoAndroid();
    if (nat) {
      try {
        await nat.requestPermissions?.();
        if (nat.addListener) {
          const h = await nat.addListener("partialResults", (d) => {
            const p = d.matches?.[0] ?? "";
            ultimoTexto.current = p;
            setDictado(p);
          });
          escuchaNativa.current = h;
        }
        setEscuchando(true);
        const fin = await nat.start({ language: "es-CO", partialResults: true, popup: false });
        const t = (fin && "matches" in fin ? fin.matches?.[0] : undefined) ?? ultimoTexto.current;
        detener();
        if (t) void procesar(t);
      } catch {
        detener();
        setError("No pude usar el micrófono. Escribe tu orden abajo.");
      }
      return;
    }

    const r = crearReconocedor();
    if (!r) {
      setError("Este dispositivo no soporta dictado por voz. Escribe tu orden abajo.");
      return;
    }
    r.lang = "es-CO";
    r.continuous = false;
    r.interimResults = true;
    r.onresult = (e) => {
      let acumulado = "";
      let final = false;
      for (let i = 0; i < e.results.length; i++) {
        acumulado += e.results[i][0].transcript;
        if (e.results[i].isFinal) final = true;
      }
      ultimoTexto.current = acumulado;
      setDictado(acumulado);
      if (final) {
        detener();
        void procesar(acumulado);
      }
    };
    r.onerror = (e) => {
      setEscuchando(false);
      setError(e.error === "not-allowed" ? "Permite el micrófono en el navegador para usar la voz." : "No te escuché bien. Intenta de nuevo o escribe tu orden.");
    };
    r.onend = () => setEscuchando(false);
    rec.current = r;
    try {
      r.start();
      setEscuchando(true);
    } catch {
      setEscuchando(false);
    }
  }, [detener, procesar]);

  const alternar = useCallback(() => {
    if (escuchando) detener();
    else void escuchar();
  }, [detener, escuchando, escuchar]);

  // Atajo Ctrl+Espacio (PC / Electron).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        alternar();
      } else if (e.key === "Escape") {
        detener();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [alternar, detener]);

  useEffect(() => () => detener(), [detener]);

  const cambiarHabla = () => {
    const nuevo = !habla;
    setHabla(nuevo);
    window.localStorage.setItem(CLAVE_VOZ, nuevo ? "1" : "0");
    if (!nuevo && typeof window.speechSynthesis !== "undefined") window.speechSynthesis.cancel();
  };

  return (
    <>
      <button
        type="button"
        onClick={alternar}
        aria-label={escuchando ? "Detener el copiloto de voz" : "Hablar con el copiloto de voz (Ctrl+Espacio)"}
        title="Copiloto de voz (Ctrl+Espacio)"
        className={`fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-[max(0.75rem,env(safe-area-inset-right))] z-40 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md ring-1 ring-glass-border transition hover:scale-105 hover:opacity-100 active:scale-95 md:bottom-6 md:right-6 md:h-12 md:w-12 ${escuchando ? "animate-pulse opacity-100" : abierto ? "opacity-100" : "opacity-70"}`}
      >
        {escuchando ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-label="Copiloto de voz"
          className="fixed inset-x-3 bottom-[calc(8rem+env(safe-area-inset-bottom))] z-50 mx-auto max-h-[min(60dvh,28rem)] w-auto max-w-lg overflow-y-auto overscroll-contain rounded-2xl border border-glass-border bg-background/95 p-3 shadow-2xl backdrop-blur-xl md:bottom-24 md:left-auto md:right-6 md:mx-0 md:w-96 md:p-4"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-medium text-foreground">
              <span className={`h-2 w-2 rounded-full ${escuchando ? "animate-pulse bg-destructive" : "bg-muted-foreground"}`} />
              {escuchando ? "Te escucho…" : pensando ? "Pensando…" : "Copiloto de voz"}
            </p>
            <div className="flex items-center gap-1">
              <button type="button" onClick={cambiarHabla} aria-label={habla ? "Silenciar respuestas habladas" : "Activar respuestas habladas"} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-glass/60 hover:text-foreground">
                {habla ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button type="button" onClick={() => { detener(); setAbierto(false); setPendiente(null); }} aria-label="Cerrar" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-glass/60 hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <p className="mt-3 min-h-6 break-words text-base text-foreground">{dictado || <span className="text-muted-foreground">Di, por ejemplo: «agrega dos hamburguesas y cobra en Nequi».</span>}</p>

          {respuesta && <p className="mt-3 break-words rounded-lg border border-glass-border bg-glass/40 p-3 text-sm text-foreground">{respuesta}</p>}
          {error && <p className="mt-3 break-words rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

          {pendiente?.confirmar && (
            <div className="mt-3 space-y-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
              <p className="text-sm font-medium text-foreground">Confirma esta acción</p>
              <p className="break-words text-sm text-foreground">{pendiente.confirmar}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => void ejecutarPlan(pendiente)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
                  <Check className="h-4 w-4" /> Sí, confirmar
                </button>
                <button type="button" onClick={() => { setPendiente(null); decir("Cancelado. No cambié nada."); }} className="inline-flex items-center gap-1.5 rounded-lg border border-glass-border px-3 py-2 text-sm text-foreground">
                  <X className="h-4 w-4" /> Cancelar
                </button>
              </div>
              <p className="text-xs text-muted-foreground">También puedes decir «sí, confirmar» o «cancelar».</p>
            </div>
          )}

          {enlace && (
            <a href={enlace.url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground">
              <Send className="h-4 w-4" /> {enlace.etiqueta}
            </a>
          )}

          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const t = texto;
              setTexto("");
              void procesar(t);
            }}
          >
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={300}
              placeholder="O escribe tu orden…"
              className="min-w-0 flex-1 rounded-lg border border-glass-border bg-glass/40 px-3 py-2 text-base text-foreground outline-none focus:border-primary/50"
            />
            <button type="submit" disabled={pensando || !texto.trim()} aria-label="Enviar orden" className="inline-flex shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-primary-foreground disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
