import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { GUIAS_NEGOCIO, PASOS_GENERALES } from "@/lib/guia-negocio";
import type { TipoNegocioClave } from "@/lib/modulos-negocio";

const CLAVE_VISTA = "gosaly:guia-vista";

/** Tutorial corto dentro del panel. Se abre solo la primera vez y se puede abrir cuando se quiera. */
export function GuiaRapida({ tipo }: { tipo: TipoNegocioClave }) {
  const [abierta, setAbierta] = useState(false);
  const guia = GUIAS_NEGOCIO[tipo];
  const pasos = [...guia.pasos, ...PASOS_GENERALES];

  useEffect(() => {
    if (window.localStorage.getItem(CLAVE_VISTA) !== "1") setAbierta(true);
  }, []);

  const alternar = () => {
    const siguiente = !abierta;
    setAbierta(siguiente);
    if (!siguiente) window.localStorage.setItem(CLAVE_VISTA, "1");
  };

  return (
    <GlassPanel className="p-4">
      <button
        type="button"
        onClick={alternar}
        className="flex w-full items-center justify-between gap-3 text-left"
        aria-expanded={abierta}
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
          <BookOpen className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">Aprende a usar tu panel en 2 minutos</span>
        </span>
        {abierta ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {abierta && (
        <div className="mt-4 space-y-4">
          <ol className="space-y-3">
            {pasos.map((p, i) => (
              <li key={p.titulo} className="flex gap-3 rounded-xl border border-border bg-background/80 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold text-foreground">{p.titulo}</p>
                  <p className="mt-0.5 break-words text-sm leading-relaxed text-foreground/80">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={alternar}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Entendido, cerrar guía
          </button>
        </div>
      )}
    </GlassPanel>
  );
}
