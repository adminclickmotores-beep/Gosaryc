import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Brain, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, Save, Timer, Zap } from "lucide-react";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { obtenerMotorIA, guardarMotorIA, probarMotorIA, type EstadoMotorIA, type ResultadoPruebaIA } from "@/lib/ia-motor.functions";
import { PERFILES_IA, type PerfilIA } from "@/lib/ia-motores";

/** Selector de potencia IA (Turbo / Experto), llave de Google AI Studio y prueba en vivo del motor. */
export function SelectorMotorIA() {
  const [perfil, setPerfil] = useState<PerfilIA>("turbo");
  const [estado, setEstado] = useState<EstadoMotorIA | null>(null);
  const [llave, setLlave] = useState("");
  const [verLlave, setVerLlave] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [probando, setProbando] = useState(false);
  const [resultado, setResultado] = useState<ResultadoPruebaIA | null>(null);

  const cargar = useCallback(async () => {
    try {
      const e = await obtenerMotorIA();
      setEstado(e);
      setPerfil(e.perfil);
    } catch {
      /* sin configuración guardada: se queda en Turbo */
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = async (quitarLlave = false) => {
    setGuardando(true);
    try {
      const e = await guardarMotorIA({ data: { perfil, llave: llave.trim(), quitarLlave } });
      setEstado(e);
      setLlave("");
      toast.success(quitarLlave ? "Llave eliminada" : "Motor de IA guardado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setGuardando(false);
    }
  };

  const probar = async () => {
    setProbando(true);
    setResultado(null);
    try {
      setResultado(await probarMotorIA({ data: { perfil, llave: llave.trim() } }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo probar el motor");
    } finally {
      setProbando(false);
    }
  };

  return (
    <GlassPanel className="space-y-4 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Brain className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0">
          <h3 className="text-base font-semibold">Potencia de la Inteligencia Artificial</h3>
          <p className="text-sm text-muted-foreground">
            Elige cómo trabaja el agente de WhatsApp. El Contador Pro, Salud y SST, SECOP y el cerebro administrativo siempre usan el motor experto, y si un motor llega a su límite por minuto, el sistema pasa solo al siguiente para que nunca se quede sin responder.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PERFILES_IA.map((p) => {
          const activo = perfil === p.id;
          const Icono = p.id === "turbo" ? Zap : Brain;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPerfil(p.id)}
              aria-pressed={activo}
              className={`rounded-2xl border p-4 text-left transition-colors ${activo ? "border-primary bg-primary/10" : "border-glass-border bg-glass/40 hover:bg-glass/60"}`}
            >
              <div className="flex items-center gap-2 font-semibold">
                <Icono className="h-4 w-4 text-primary" />
                {p.titulo}
                {activo && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{p.descripcion}</p>
              <p className="mt-2 text-xs font-mono text-muted-foreground">{p.modelo}</p>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium" htmlFor="llave-gemini">
          <KeyRound className="h-4 w-4 text-primary" />
          GEMINI_API_KEY de Google AI Studio
        </label>
        <div className="flex gap-2">
          <input
            id="llave-gemini"
            type={verLlave ? "text" : "password"}
            value={llave}
            onChange={(e) => setLlave(e.target.value)}
            placeholder={estado?.llaveGuardada ? `Guardada: ${estado.llaveMascara} (pega otra para cambiarla)` : "Pega aquí tu llave (AIza...)"}
            autoComplete="off"
            maxLength={120}
            className="min-w-0 flex-1 rounded-xl border border-glass-border bg-glass/40 px-3 py-2 text-base outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={() => setVerLlave((v) => !v)}
            aria-label={verLlave ? "Ocultar llave" : "Mostrar llave"}
            className="rounded-xl border border-glass-border px-3"
          >
            {verLlave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          Se obtiene gratis en aistudio.google.com. Se guarda solo para tu negocio y nunca se vuelve a mostrar completa.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void guardar(false)}
          disabled={guardando}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {guardando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar
        </button>
        <button
          type="button"
          onClick={() => void probar()}
          disabled={probando}
          className="inline-flex items-center gap-2 rounded-xl border border-primary px-4 py-2 text-sm font-semibold text-primary disabled:opacity-60"
        >
          {probando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          Probar Motor IA Ahora
        </button>
        {estado?.llaveGuardada && (
          <button
            type="button"
            onClick={() => void guardar(true)}
            disabled={guardando}
            className="rounded-xl border border-glass-border px-4 py-2 text-sm text-muted-foreground disabled:opacity-60"
          >
            Quitar llave guardada
          </button>
        )}
      </div>

      {resultado && (
        <div className={`rounded-xl border p-3 text-sm ${resultado.ok ? "border-primary/40 bg-primary/10" : "border-destructive/40 bg-destructive/10"}`}>
          <p className="font-semibold">{resultado.ok ? "Motor funcionando" : "El motor no respondió"}</p>
          <p className="mt-1 text-muted-foreground">{resultado.mensaje}</p>
          {resultado.ok && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>
                Modelo activo: <span className="font-mono">{resultado.modelo}</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <Timer className="h-4 w-4" />
                {resultado.ms.toLocaleString("es-MX")} ms
              </span>
              {resultado.origen && <span className="text-muted-foreground">{resultado.origen}</span>}
            </div>
          )}
        </div>
      )}
    </GlassPanel>
  );
}
