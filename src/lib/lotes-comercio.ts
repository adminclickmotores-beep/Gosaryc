// Ayudas para los lotes con vencimiento (Tienda, Supermercado, Fruver y Carnicería).

export type NivelVence = "vencido" | "7" | "15" | "30" | "ok" | "sin";

/** Días que faltan para vencer (negativo = ya venció). null si el lote no tiene fecha. */
export function diasPara(vence: string | null): number | null {
  if (!vence) return null;
  const [a, m, d] = vence.split("-").map(Number);
  if (!a || !m || !d) return null;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(a, m - 1, d).getTime() - hoy.getTime()) / 86400000);
}

export function nivelVence(dias: number | null): NivelVence {
  if (dias === null) return "sin";
  if (dias < 0) return "vencido";
  if (dias <= 7) return "7";
  if (dias <= 15) return "15";
  if (dias <= 30) return "30";
  return "ok";
}

export function textoVence(dias: number | null): string {
  if (dias === null) return "Sin vencimiento";
  if (dias < 0) return `Vencido hace ${-dias} día${dias === -1 ? "" : "s"}`;
  if (dias === 0) return "Vence hoy";
  return `Vence en ${dias} día${dias === 1 ? "" : "s"}`;
}

export const CLASE_NIVEL: Record<NivelVence, string> = {
  vencido: "border-destructive/60 bg-destructive/10 text-destructive",
  "7": "border-destructive/40 text-destructive",
  "15": "border-primary/60 text-primary",
  "30": "border-glass-border text-foreground",
  ok: "border-glass-border text-muted-foreground",
  sin: "border-glass-border text-muted-foreground",
};

export const TITULO_NIVEL: Record<NivelVence, string> = {
  vencido: "Vencidos",
  "7": "Vencen en 7 días o menos",
  "15": "Vencen en 8 a 15 días",
  "30": "Vencen en 16 a 30 días",
  ok: "Más de 30 días",
  sin: "Sin fecha",
};
