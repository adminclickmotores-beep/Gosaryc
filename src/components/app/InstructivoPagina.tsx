import { useState } from "react";
import { useLocation } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, HelpCircle, Lightbulb } from "lucide-react";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { instructivoPara } from "@/lib/instructivos";

/** Instructivo fácil de la pantalla actual. Aparece plegado arriba de cada módulo o página. */
export function InstructivoPagina() {
  const { pathname } = useLocation();
  const guia = instructivoPara(pathname);
  if (!guia) return null;
  return <Cuerpo key={pathname} guia={guia} />;
}

function Cuerpo({ guia }: { guia: NonNullable<ReturnType<typeof instructivoPara>> }) {
  const [abierto, setAbierto] = useState(false);
  return (
    <GlassPanel className="mb-4 p-3">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-expanded={abierto}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground">
          <HelpCircle className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">¿Cómo se usa “{guia.titulo}”?</span>
        </span>
        {abierto ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
      </button>
      {abierto && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Para qué sirve: </span>
            {guia.paraQue}
          </p>
          <ol className="space-y-2">
            {guia.pasos.map((p, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                  {i + 1}
                </span>
                <p className="min-w-0 break-words text-sm text-foreground">{p}</p>
              </li>
            ))}
          </ol>
          {guia.consejo && (
            <p className="flex items-start gap-2 rounded-lg bg-primary/10 p-3 text-sm text-foreground">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span className="min-w-0 break-words">{guia.consejo}</span>
            </p>
          )}
        </div>
      )}
    </GlassPanel>
  );
}
