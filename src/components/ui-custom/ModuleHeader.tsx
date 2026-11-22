import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Briefcase, Car, HeartPulse, Landmark, Store, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

type Tono = "azul" | "ambar" | "esmeralda" | "indigo" | "comercio";

const TONOS: Record<Tono, { fondo: string; caja: string; barra: string; Icon: LucideIcon }> = {
  azul: {
    fondo: "from-blue-600/15 via-cyan-500/10 to-transparent",
    caja: "from-blue-600 to-cyan-500 shadow-blue-500/30",
    barra: "from-blue-600 to-cyan-500",
    Icon: Car,
  },
  ambar: {
    fondo: "from-amber-500/15 via-orange-500/10 to-transparent",
    caja: "from-amber-500 to-orange-500 shadow-orange-500/30",
    barra: "from-amber-500 to-orange-500",
    Icon: UtensilsCrossed,
  },
  esmeralda: {
    fondo: "from-emerald-500/15 via-teal-500/10 to-transparent",
    caja: "from-emerald-500 to-teal-500 shadow-emerald-500/30",
    barra: "from-emerald-500 to-teal-500",
    Icon: HeartPulse,
  },
  indigo: {
    fondo: "from-indigo-600/15 via-purple-500/10 to-transparent",
    caja: "from-indigo-600 to-purple-500 shadow-indigo-500/30",
    barra: "from-indigo-600 to-purple-500",
    Icon: Briefcase,
  },
  comercio: {
    fondo: "from-sky-500/15 via-emerald-500/10 to-transparent",
    caja: "from-sky-500 to-emerald-500 shadow-sky-500/30",
    barra: "from-sky-500 to-emerald-500",
    Icon: Store,
  },
};

/** Convierte la familia del negocio (identidadRubro) en un tono de color. */
export function tonoDeFamilia(familia?: string | null): Tono {
  const f = (familia ?? "").toLowerCase();
  if (f.includes("automotriz") || f.includes("transporte") || f.includes("tecnolog")) return "azul";
  if (f.includes("comida") || f.includes("aliment") || f.includes("hotel")) return "ambar";
  if (f.includes("salud") || f.includes("belleza") || f.includes("deporte") || f.includes("agro") || f.includes("veterin")) return "esmeralda";
  if (f.includes("construc") || f.includes("inmob") || f.includes("educa") || f.includes("servicio")) return "indigo";
  return "comercio";
}

export { Landmark as IconoFinanzas };

export function ModuleHeader({
  titulo,
  descripcion,
  familia,
  Icon,
  acciones,
  className,
}: {
  titulo: string;
  descripcion?: string;
  familia?: string | null;
  Icon?: LucideIcon;
  acciones?: ReactNode;
  className?: string;
}) {
  const t = TONOS[tonoDeFamilia(familia)];
  const Ico = Icon ?? t.Icon;
  return (
    <div
      className={cn(
        "relative mb-5 overflow-hidden rounded-2xl border border-glass-border bg-gradient-to-br p-4 shadow-sm transition-all duration-200 hover:shadow-lg sm:p-5",
        t.fondo,
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg", t.caja)}>
          <Ico className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1 basis-48">
          <h1 className="break-words text-2xl font-extrabold tracking-tight text-foreground">{titulo}</h1>
          {descripcion && <p className="mt-0.5 text-sm text-muted-foreground">{descripcion}</p>}
        </div>
        {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
      </div>
      <div className={cn("mt-3 h-1 w-20 rounded-full bg-gradient-to-r", t.barra)} />
    </div>
  );
}
