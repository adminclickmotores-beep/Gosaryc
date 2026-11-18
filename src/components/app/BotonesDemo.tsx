import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Car, Loader2, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { entrarDemo, type TipoDemo } from "@/lib/demo-real";

/** Dos botones de acceso en un clic a las cuentas demo reales. */
export function BotonesDemo({ className = "" }: { className?: string }) {
  const nav = useNavigate();
  const [cargando, setCargando] = useState<TipoDemo | null>(null);

  const entrar = async (tipo: TipoDemo) => {
    setCargando(tipo);
    try {
      await entrarDemo(tipo);
      nav({ to: "/restaurante", replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo abrir la demo.");
    } finally {
      setCargando(null);
    }
  };

  const base =
    "inline-flex w-full items-center justify-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-emerald-500/20 disabled:opacity-60";

  return (
    <div className={`flex flex-col gap-2.5 ${className}`}>
      <button type="button" disabled={cargando !== null} onClick={() => entrar("vehiculos")} className={base}>
        {cargando === "vehiculos" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Car className="h-4 w-4" />}
        ▶ Ver Demo en Vivo: Concesionario y Taller
      </button>
      <button type="button" disabled={cargando !== null} onClick={() => entrar("restaurante")} className={base}>
        {cargando === "restaurante" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UtensilsCrossed className="h-4 w-4" />}
        ▶ Ver Demo en Vivo: Restaurante y Comidas
      </button>
    </div>
  );
}
