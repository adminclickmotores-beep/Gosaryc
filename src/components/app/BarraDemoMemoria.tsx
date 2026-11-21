import { useState } from "react";
import { RotateCcw, LogOut } from "lucide-react";
import { restaurarDemoMemoria, salirDemoMemoria, sectorDemoActivo } from "@/lib/demo-memoria";

/** Franja fija que avisa que se está en la demostración en memoria y permite restaurarla. */
export function BarraDemoMemoria() {
  const [sector] = useState(() => sectorDemoActivo());
  if (!sector) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] flex flex-wrap items-center justify-center gap-2 bg-foreground px-3 py-2 text-xs text-background">
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
