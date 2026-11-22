import type { ReactNode } from "react";
import { campo } from "@/components/comercio/ComercioModulos";

/** Mensaje de error de la base solo si es corto y legible; si no, el texto de respaldo. */
export const msg = (m: string | undefined, d: string): string => (m && m.length > 0 && m.length < 220 ? m : d);

/** Fecha local AAAA-MM-DD (solo se usa dentro de eventos o tras cargar datos, nunca en el primer render). */
export const hoyISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Días entre dos fechas AAAA-MM-DD (b - a). */
export const diasEntre = (a: string, b: string): number => {
  const pa = a.slice(0, 10).split("-").map(Number);
  const pb = b.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
};

export const METODOS = [
  { clave: "efectivo", texto: "Efectivo" },
  { clave: "transferencia", texto: "Transferencia / Nequi" },
  { clave: "tarjeta", texto: "Tarjeta / datáfono" },
] as const;

export function SelectorMetodo({ valor, onChange }: { valor: string; onChange: (v: string) => void }) {
  return (
    <select className={campo} value={valor} onChange={(e) => onChange(e.target.value)} aria-label="Método de pago">
      {METODOS.map((m) => (
        <option key={m.clave} value={m.clave}>{m.texto}</option>
      ))}
    </select>
  );
}

export function Pestanas<T extends string>({ items, valor, onChange }: { items: { clave: T; texto: string }[]; valor: T; onChange: (v: T) => void }) {
  return (
    <div className="mb-5 inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-glass-border bg-glass/30 p-1">
      {items.map((i) => (
        <button
          key={i.clave}
          type="button"
          onClick={() => onChange(i.clave)}
          className={`rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${valor === i.clave ? "bg-gradient-to-r from-indigo-600 to-emerald-500 text-white shadow-md" : "text-foreground hover:bg-glass/60"}`}
        >
          {i.texto}
        </button>
      ))}
    </div>
  );
}

export function Indicador({ titulo, valor, nota, alerta }: { titulo: string; valor: ReactNode; nota?: string; alerta?: boolean }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl border p-4 transition-all duration-200 hover:shadow-lg ${alerta ? "border-destructive/50 bg-destructive/5" : "border-glass-border bg-gradient-to-br from-emerald-500/10 via-sky-500/5 to-transparent"}`}>
      <span className={`absolute left-0 top-0 h-full w-1 ${alerta ? "bg-destructive" : "bg-gradient-to-b from-emerald-500 to-sky-500"}`} />
      <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
      <p className={`mt-1 text-xl font-extrabold tabular-nums ${alerta ? "text-destructive" : "text-foreground"}`}>{valor}</p>
      {nota && <p className="mt-1 inline-block rounded-full bg-glass/60 px-2 py-0.5 text-xs text-muted-foreground">{nota}</p>}
    </div>
  );
}

export function Etiqueta({ texto, tono = "neutro" }: { texto: string; tono?: "neutro" | "ok" | "alerta" | "info" }) {
  const clase =
    tono === "ok" ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : tono === "alerta" ? "bg-destructive/15 text-destructive" : tono === "info" ? "bg-sky-500/15 text-sky-600 dark:text-sky-400" : "bg-glass/60 text-muted-foreground";
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${clase}`}>{texto}</span>;
}

export const aWhatsapp = (tel: string | null | undefined, texto: string): string | null => {
  const d = (tel ?? "").replace(/\D/g, "");
  if (d.length < 7) return null;
  const n = d.length === 10 ? `57${d}` : d;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
};
