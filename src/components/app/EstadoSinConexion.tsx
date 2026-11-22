import { useEffect, useState } from "react";
import { CloudUpload, RefreshCw, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { sincronizarAhora, useEstadoConexion } from "@/lib/sin-conexion";

/** Aviso flotante: sin internet / cambios pendientes de subir. */
export function EstadoSinConexion() {
  const { enLinea, pendientes, sincronizando } = useEstadoConexion();
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
    const alSincronizar = (e: Event) => {
      const d = (e as CustomEvent<{ subidos: number; descartados: number }>).detail;
      if (d.subidos > 0) {
        toast.success(`Se subieron ${d.subidos} ${d.subidos === 1 ? "cambio" : "cambios"} guardados sin internet.`, {
          action: { label: "Actualizar pantalla", onClick: () => window.location.reload() },
        });
      }
      if (d.descartados > 0) {
        toast.error(`${d.descartados} ${d.descartados === 1 ? "cambio no pudo" : "cambios no pudieron"} subirse; revisa tus registros.`);
      }
    };
    window.addEventListener("sin-conexion:sincronizado", alSincronizar);
    return () => window.removeEventListener("sin-conexion:sincronizado", alSincronizar);
  }, []);

  if (!montado || (enLinea && pendientes === 0)) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.5rem+var(--barra-demo,0px))] z-50 flex justify-center px-3 md:bottom-[calc(1rem+var(--barra-demo,0px))]">
      <div className="pointer-events-auto flex max-w-full items-center gap-2 rounded-full border border-glass-border bg-background/90 px-4 py-2 text-xs text-foreground shadow-lg backdrop-blur-xl">
        {enLinea ? (
          <CloudUpload className="h-4 w-4 shrink-0 text-primary" />
        ) : (
          <WifiOff className="h-4 w-4 shrink-0 text-destructive" />
        )}
        <span className="min-w-0 break-words">
          {!enLinea
            ? `Sin internet: sigues trabajando${pendientes > 0 ? ` · ${pendientes} por subir` : ""}`
            : sincronizando
              ? `Subiendo ${pendientes} ${pendientes === 1 ? "cambio" : "cambios"}…`
              : `${pendientes} ${pendientes === 1 ? "cambio pendiente" : "cambios pendientes"} de subir`}
        </span>
        {enLinea && !sincronizando && pendientes > 0 && (
          <button onClick={sincronizarAhora} className="inline-flex items-center gap-1 text-primary">
            <RefreshCw className="h-3.5 w-3.5" /> Subir ahora
          </button>
        )}
      </div>
    </div>
  );
}
