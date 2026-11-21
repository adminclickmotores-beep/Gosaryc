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
    <div className="mb-5 flex flex-wrap gap-2">
      {items.map((i) => (
        <button
          key={i.clave}
          type="button"
          onClick={() => onChange(i.clave)}
          className={`rounded-full border px-4 py-1.5 text-sm ${valor === i.clave ? "border-primary bg-primary text-primary-foreground" : "border-glass-border text-foreground hover:bg-glass/40"}`}
        >
          {i.texto}
        </button>
      ))}
    </div>
  );
}

export function Indicador({ titulo, valor, nota, alerta }: { titulo: string; valor: ReactNode; nota?: string; alerta?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${alerta ? "border-destructive/50" : "border-glass-border"}`}>
      <p className="text-xs text-muted-foreground">{titulo}</p>
      <p className={`mt-1 font-display text-xl ${alerta ? "text-destructive" : "text-foreground"}`}>{valor}</p>
      {nota && <p className="mt-0.5 text-xs text-muted-foreground">{nota}</p>}
    </div>
  );
}

export function Etiqueta({ texto, tono = "neutro" }: { texto: string; tono?: "neutro" | "ok" | "alerta" | "info" }) {
  const clase =
    tono === "ok" ? "bg-primary/15 text-primary" : tono === "alerta" ? "bg-destructive/15 text-destructive" : tono === "info" ? "bg-accent/30 text-foreground" : "bg-glass/60 text-muted-foreground";
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs ${clase}`}>{texto}</span>;
}

export const aWhatsapp = (tel: string | null | undefined, texto: string): string | null => {
  const d = (tel ?? "").replace(/\D/g, "");
  if (d.length < 7) return null;
  const n = d.length === 10 ? `57${d}` : d;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
};
