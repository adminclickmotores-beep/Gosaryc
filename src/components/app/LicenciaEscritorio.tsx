import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

// Solo se activa dentro de la app de escritorio (el envoltorio añade "GosarycEscritorio" al navegador).
const MARCA_ESCRITORIO = "GosarycEscritorio";
const CLAVE_CODIGO = "gosaryc_licencia_codigo";
const CLAVE_OK = "gosaryc_licencia_ok";
const DIAS_SIN_CONEXION = 7;

type Estado = "normal" | "revisando" | "ok" | "bloqueada";
type Resultado = { valida: boolean; motivo: string } | "sin_conexion";

const MENSAJES: Record<string, string> = {
  no_existe: "Ese código no existe. Revísalo o pídele uno nuevo al creador de Gosaryc.",
  suspendida: "Esta licencia está suspendida. Comunícate con el creador de Gosaryc.",
  vencida: "Tu prueba o licencia ya venció. Paga la renovación y pide tu código al creador de Gosaryc.",
  sin_conexion: "No hay conexión con el servidor. Conéctate a internet e intenta de nuevo.",
};

async function consultarLicencia(codigo: string): Promise<Resultado> {
  const { data, error } = await supabase.rpc("verificar_licencia", { p_codigo: codigo });
  if (error || !data) return "sin_conexion";
  const d = data as { valida?: boolean; motivo?: string };
  return { valida: d.valida === true, motivo: d.motivo ?? "no_existe" };
}

export function LicenciaEscritorio() {
  const [estado, setEstado] = useState<Estado>("normal");
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!navigator.userAgent.includes(MARCA_ESCRITORIO)) return;
    setEstado("revisando");
    const guardado = localStorage.getItem(CLAVE_CODIGO);
    if (!guardado) {
      setEstado("bloqueada");
      return;
    }
    let vivo = true;
    consultarLicencia(guardado).then((r) => {
      if (!vivo) return;
      if (r === "sin_conexion") {
        // Sin internet se permite seguir unos días si la última verificación fue reciente.
        const ultimo = Number(localStorage.getItem(CLAVE_OK) ?? 0);
        const reciente = Date.now() - ultimo < DIAS_SIN_CONEXION * 86400000;
        if (reciente) {
          setEstado("ok");
        } else {
          setError(MENSAJES.sin_conexion);
          setEstado("bloqueada");
        }
        return;
      }
      if (r.valida) {
        localStorage.setItem(CLAVE_OK, String(Date.now()));
        setEstado("ok");
      } else {
        setError(MENSAJES[r.motivo] ?? MENSAJES.no_existe);
        setEstado("bloqueada");
      }
    });
    return () => {
      vivo = false;
    };
  }, []);

  const activar = async () => {
    const c = codigo.trim().toUpperCase();
    if (!c) {
      setError("Escribe el código de licencia.");
      return;
    }
    setEnviando(true);
    setError(null);
    const r = await consultarLicencia(c);
    setEnviando(false);
    if (r === "sin_conexion") {
      setError(MENSAJES.sin_conexion);
      return;
    }
    if (!r.valida) {
      setError(MENSAJES[r.motivo] ?? MENSAJES.no_existe);
      return;
    }
    localStorage.setItem(CLAVE_CODIGO, c);
    localStorage.setItem(CLAVE_OK, String(Date.now()));
    setEstado("ok");
  };

  if (estado === "normal" || estado === "ok") return null;

  if (estado === "revisando") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background text-sm text-muted-foreground">
        Verificando licencia…
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background p-4">
      <GlassPanel className="w-full max-w-md space-y-4 p-6">
        <h1 className="flex items-center gap-2 font-display text-2xl text-foreground">
          <ShieldCheck className="h-6 w-6 shrink-0 text-primary" /> Activa Gosaryc
        </h1>
        <p className="text-sm text-muted-foreground">
          Escribe el código de licencia que te dio el creador de Gosaryc para seguir usando el programa.
        </p>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Código de licencia</span>
          <input
            className="w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 font-mono text-base uppercase text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="GOS-XXXX-XXXX-XXXX"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
        </label>
        {error && <p className="break-words text-sm text-destructive">{error}</p>}
        <button
          onClick={activar}
          disabled={enviando}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          <KeyRound className="h-4 w-4" /> {enviando ? "Verificando…" : "Activar"}
        </button>
      </GlassPanel>
    </div>
  );
}
