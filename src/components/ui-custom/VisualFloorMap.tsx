import { cn } from "@/lib/utils";

export type EstadoEspacio = "libre" | "ocupada" | "por_cobrar" | "reservada" | string;

export interface EspacioVisual {
  id: string;
  etiqueta: string;
  capacidad: number;
  estado: EstadoEspacio;
  /** Texto pequeño bajo el número (tiempo de ocupación, huésped, placa...). */
  detalle?: string;
  /** Total acumulado ya formateado (ej. "$ 45.000"). */
  total?: string;
}

const TONOS: Record<string, { mesa: string; borde: string; silla: string; texto: string; nombre: string }> = {
  libre: { mesa: "#10b98133", borde: "#10b981", silla: "#10b98188", texto: "#059669", nombre: "Libre" },
  ocupada: { mesa: "#f59e0b33", borde: "#f59e0b", silla: "#f59e0b99", texto: "#d97706", nombre: "Ocupada" },
  por_cobrar: { mesa: "#f43f5e33", borde: "#f43f5e", silla: "#f43f5e99", texto: "#e11d48", nombre: "Por cobrar" },
  reservada: { mesa: "#0ea5e933", borde: "#0ea5e9", silla: "#0ea5e999", texto: "#0284c7", nombre: "Reservada" },
};

export function tonoEspacio(estado: EstadoEspacio) {
  return TONOS[estado] ?? TONOS.libre;
}

/** Puntos de las sillas alrededor de una mesa de 120x120. */
function sillas(n: number, redonda: boolean): { x: number; y: number; r: number }[] {
  const total = Math.max(1, Math.min(n, 10));
  const out: { x: number; y: number; r: number }[] = [];
  if (redonda) {
    for (let i = 0; i < total; i++) {
      const a = (i / total) * Math.PI * 2 - Math.PI / 2;
      out.push({ x: 60 + Math.cos(a) * 46, y: 60 + Math.sin(a) * 46, r: (a * 180) / Math.PI + 90 });
    }
    return out;
  }
  const arriba = Math.ceil(total / 2);
  const abajo = total - arriba;
  for (let i = 0; i < arriba; i++) out.push({ x: 30 + ((i + 0.5) * 60) / arriba, y: 14, r: 0 });
  for (let i = 0; i < abajo; i++) out.push({ x: 30 + ((i + 0.5) * 60) / abajo, y: 106, r: 180 });
  return out;
}

function MesaSvg({ capacidad, estado }: { capacidad: number; estado: EstadoEspacio }) {
  const t = tonoEspacio(estado);
  const redonda = capacidad <= 4;
  return (
    <svg viewBox="0 0 120 120" className="h-24 w-24 sm:h-28 sm:w-28" aria-hidden="true">
      <defs>
        <filter id="sombra-mesa" x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000" floodOpacity="0.25" />
        </filter>
      </defs>
      {sillas(capacidad, redonda).map((s, i) => (
        <rect
          key={i}
          x={s.x - 9}
          y={s.y - 6}
          width="18"
          height="12"
          rx="5"
          fill={t.silla}
          transform={`rotate(${s.r} ${s.x} ${s.y})`}
        />
      ))}
      {redonda ? (
        <circle cx="60" cy="60" r="32" fill={t.mesa} stroke={t.borde} strokeWidth="2.5" filter="url(#sombra-mesa)" />
      ) : (
        <rect x="22" y="30" width="76" height="60" rx="12" fill={t.mesa} stroke={t.borde} strokeWidth="2.5" filter="url(#sombra-mesa)" />
      )}
    </svg>
  );
}

interface Props {
  espacios: EspacioVisual[];
  onSeleccionar?: (e: EspacioVisual) => void;
  vacio?: string;
  className?: string;
}

/** Plano visual de espacios (mesas con sillas) con estado por color. Solo capa visual. */
export function VisualFloorMap({ espacios, onSeleccionar, vacio, className }: Props) {
  if (espacios.length === 0) {
    return vacio ? <p className="text-sm text-muted-foreground">{vacio}</p> : null;
  }
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2 text-xs">
        {["libre", "ocupada", "por_cobrar", "reservada"].map((k) => (
          <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-glass-border px-2.5 py-1 text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: TONOS[k].borde }} />
            {TONOS[k].nombre}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {espacios.map((e) => {
          const t = tonoEspacio(e.estado);
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onSeleccionar?.(e)}
              className="relative flex min-w-0 flex-col items-center rounded-2xl border p-2 transition-all active:scale-95"
              style={{ borderColor: `${t.borde}66`, background: `linear-gradient(160deg, ${t.borde}1f, transparent 70%)` }}
              aria-label={`Mesa ${e.etiqueta}, ${t.nombre}`}
            >
              <div className="relative">
                <MesaSvg capacidad={e.capacidad} estado={e.estado} />
                <span
                  className="absolute inset-0 flex items-center justify-center text-2xl font-bold tabular-nums sm:text-3xl"
                  style={{ color: t.texto }}
                >
                  {e.etiqueta}
                </span>
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: t.texto }}>
                {t.nombre}
              </span>
              <span className="max-w-full truncate text-[11px] tabular-nums text-muted-foreground">
                {e.detalle ?? `${e.capacidad} ${e.capacidad === 1 ? "persona" : "personas"}`}
              </span>
              {e.total && <span className="text-sm font-semibold tabular-nums text-foreground">{e.total}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
