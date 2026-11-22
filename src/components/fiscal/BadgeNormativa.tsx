import { useCallback, useEffect, useRef, useState } from "react";
import { Globe, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { verificarNormativaAhora } from "@/lib/normativa-auto.functions";

const DIAS = 7;

function fechaCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Bogota" });
}

/** Insignia discreta: normativa de Colombia verificada en internet. Se revisa sola si pasaron más de 7 días. */
export function BadgeNormativa() {
  const [ultima, setUltima] = useState<string | null>(null);
  const [listo, setListo] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const yaIntento = useRef(false);

  const leer = useCallback(async (): Promise<string | null> => {
    const { data } = await supabase
      .from("normativa_colombia_vigente")
      .select("verificado_en")
      .order("verificado_en", { ascending: false })
      .limit(1)
      .maybeSingle();
    const v = data?.verificado_en ?? null;
    setUltima(v);
    setListo(true);
    return v;
  }, []);

  const verificar = useCallback(
    async (forzar: boolean) => {
      setVerificando(true);
      try {
        const r = await verificarNormativaAhora({ data: { forzar } });
        if (forzar) toast[r.actualizada ? "success" : "info"](r.mensaje);
        await leer();
      } catch (e) {
        if (forzar) toast.error(e instanceof Error ? e.message : "No se pudo verificar ahora.");
      } finally {
        setVerificando(false);
      }
    },
    [leer],
  );

  useEffect(() => {
    void (async () => {
      const v = await leer();
      const vencida = !v || Date.now() - new Date(v).getTime() > DIAS * 86400000;
      if (vencida && !yaIntento.current) {
        yaIntento.current = true;
        void verificar(false);
      }
    })();
  }, [leer, verificar]);

  if (!listo) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Globe className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span className="min-w-0 break-words">
        Normativa Colombia verificada en internet • Última actualización: {ultima ? fechaCorta(ultima) : "pendiente"}
      </span>
      <button
        type="button"
        disabled={verificando}
        onClick={() => void verificar(true)}
        className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 hover:bg-muted disabled:opacity-60"
      >
        {verificando ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
        Verificar ahora
      </button>
    </div>
  );
}
