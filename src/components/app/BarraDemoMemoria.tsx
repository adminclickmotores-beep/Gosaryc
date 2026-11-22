import { useEffect, useRef, useState } from "react";
import { RotateCcw, LogOut } from "lucide-react";
import { restaurarDemoMemoria, salirDemoMemoria, sectorDemoActivo } from "@/lib/demo-memoria";

/** Franja fija que avisa que se está en la demostración en memoria y permite restaurarla.
 *  Publica su altura en --barra-demo para que el menú inferior, el micrófono y los avisos se
 *  coloquen encima y nunca queden tapados ni montados sobre ella. */
export function BarraDemoMemoria() {
  const [sector] = useState(() => sectorDemoActivo());
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!sector || !el) return;
    const raiz = document.documentElement;
    const medir = () => raiz.style.setProperty("--barra-demo", `${el.offsetHeight}px`);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => {
      ro.disconnect();
      raiz.style.removeProperty("--barra-demo");
    };
  }, [sector]);
  if (!sector) return null;
  return (
    <div
      ref={ref}
      className="fixed inset-x-0 bottom-0 z-[60] flex flex-wrap items-center justify-center gap-2 bg-foreground px-3 py-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] text-xs text-background"
    >
      <span className="font-semibold">Demostración interactiva: nada se guarda en la base de datos.</span>
      <button
        type="button"
        onClick={() => restaurarDemoMemoria()}
        className="inline-flex items-center gap-1 rounded-md bg-background px-2.5 py-1 font-semibold text-foreground"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Restaurar estado inicial
      </button>
      <button
        type="button"
        onClick={() => {
          salirDemoMemoria();
          try {
            sessionStorage.removeItem("gosaryc_demo_sector");
            sessionStorage.removeItem("gosaryc_demo_tab");
          } catch {
            /* sin acceso a sessionStorage */
          }
          window.location.href = "/";
        }}
        className="inline-flex items-center gap-1 rounded-md border border-background/40 px-2.5 py-1"
      >
        <LogOut className="h-3.5 w-3.5" /> Salir de la demo
      </button>
    </div>
  );
}
