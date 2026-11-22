import { useMemo, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { exportarExcel, imprimirReporte } from "@/lib/exportes";

const UVT = 54000;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full min-w-0 rounded-lg border border-glass-border bg-glass/40 px-3 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const num = (v: string): number => {
  const n = Number(v.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Art. 241 E.T.: tarifa para personas naturales residentes, en UVT. */
export function impuestoRentaPN(baseGravable: number): number {
  const u = baseGravable / UVT;
  let uvt = 0;
  if (u <= 1090) uvt = 0;
  else if (u <= 1700) uvt = (u - 1090) * 0.19;
  else if (u <= 4100) uvt = (u - 1700) * 0.28 + 116;
  else if (u <= 8670) uvt = (u - 4100) * 0.33 + 788;
  else if (u <= 18970) uvt = (u - 8670) * 0.35 + 2296;
  else if (u <= 31000) uvt = (u - 18970) * 0.37 + 5901;
  else uvt = (u - 31000) * 0.39 + 10352;
  return Math.round(uvt * UVT);
}

type Tipo = "PJ" | "PN";

export function BorradorRenta({
  ingresos,
  gastos,
  retenciones,
  nombre,
  nit,
}: {
  ingresos: number;
  gastos: number;
  retenciones: number;
  nombre: string;
  nit: string;
}) {
  const [tipo, setTipo] = useState<Tipo>("PJ");
  const [incrngo, setIncrngo] = useState("");
  const [deduc, setDeduc] = useState("");
  const [ganOc, setGanOc] = useState("");
  const [costoGO, setCostoGO] = useState("");
  const [anticipoPrev, setAnticipoPrev] = useState("");

  const r = useMemo(() => {
    const ing = Math.round(ingresos);
    const no = Math.max(0, num(incrngo));
    const cg = Math.round(gastos);
    const dd = Math.max(0, num(deduc));
    const ingresosNetos = Math.max(0, ing - no);
    const renta = Math.max(0, ingresosNetos - cg - dd);
    const perdida = Math.max(0, cg + dd - ingresosNetos);
    const impuestoRenta = tipo === "PJ" ? Math.round(renta * 0.35) : impuestoRentaPN(renta);
    const go = Math.max(0, num(ganOc) - Math.max(0, num(costoGO)));
    const impuestoGO = Math.round(go * 0.15);
    const impuestoTotal = impuestoRenta + impuestoGO;
    const ret = Math.max(0, Math.round(retenciones));
    const antPrev = Math.max(0, num(anticipoPrev));
    const anticipoSig = Math.max(0, Math.round(impuestoRenta * 0.75) - ret);
    const saldo = impuestoTotal + anticipoSig - ret - antPrev;
    return { ing, no, ingresosNetos, cg, dd, renta, perdida, impuestoRenta, go, impuestoGO, impuestoTotal, ret, antPrev, anticipoSig, saldo };
  }, [ingresos, gastos, retenciones, tipo, incrngo, deduc, ganOc, costoGO, anticipoPrev]);

  const form = tipo === "PJ" ? "110" : "210";
  const titulo = `Borrador Formulario ${form} - Renta ${tipo === "PJ" ? "Personas Jurídicas" : "Personas Naturales"}`;

  const filas: [string, number][] = [
    ["Ingresos brutos", r.ing],
    ["Ingresos no constitutivos de renta", r.no],
    ["Ingresos netos", r.ingresosNetos],
    ["Costos y gastos del período", r.cg],
    ["Deducciones adicionales procedentes", r.dd],
    ["Renta líquida gravable", r.renta],
    ["Pérdida fiscal del ejercicio", r.perdida],
    [tipo === "PJ" ? "Impuesto de renta (35%)" : "Impuesto de renta (Art. 241 E.T.)", r.impuestoRenta],
    ["Ganancia ocasional gravable", r.go],
    ["Impuesto de ganancia ocasional (15%)", r.impuestoGO],
    ["Impuesto total a cargo", r.impuestoTotal],
    ["Anticipo de renta para el año siguiente (75% menos retenciones)", r.anticipoSig],
    ["Retenciones en la fuente a favor", r.ret],
    ["Anticipo del año anterior", r.antPrev],
    [r.saldo >= 0 ? "SALDO A PAGAR" : "SALDO A FAVOR", Math.abs(r.saldo)],
  ];

  const aExcel = () =>
    exportarExcel(`borrador-formulario-${form}`, ["Concepto", "Valor (COP)"], [
      [`${nombre || "Negocio"} - NIT ${nit || "—"}`, ""],
      ...filas.map(([c, v]) => [c, v]),
      ["Valor de la UVT usada", UVT],
    ]);

  const aPdf = () =>
    imprimirReporte(
      titulo,
      `${nombre || "Negocio"} · NIT ${nit || "—"}`,
      ["Concepto", "Valor"],
      filas.map(([c, v]) => [c, dinero(v)]),
      [`${r.saldo >= 0 ? "Saldo a pagar" : "Saldo a favor"}: ${dinero(Math.abs(r.saldo))}`, "Borrador informativo: valídalo con tu contador antes de presentar en Muisca."],
    );

  return (
    <GlassPanel className="space-y-3 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
        <FileSpreadsheet className="h-4 w-4 text-primary" /> Borrador de declaración de renta (Formulario {form})
      </p>
      <div className="flex gap-2 text-sm">
        {(["PJ", "PN"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`rounded-full border px-4 py-1.5 ${tipo === t ? "border-primary text-primary" : "border-glass-border text-muted-foreground"}`}
          >
            {t === "PJ" ? "Persona jurídica (110)" : "Persona natural (210)"}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <input className={campo} inputMode="decimal" placeholder="Ingresos no constitutivos de renta" value={incrngo} onChange={(e) => setIncrngo(e.target.value)} />
        <input className={campo} inputMode="decimal" placeholder="Otras deducciones procedentes" value={deduc} onChange={(e) => setDeduc(e.target.value)} />
        <input className={campo} inputMode="decimal" placeholder="Ganancia ocasional (ingreso)" value={ganOc} onChange={(e) => setGanOc(e.target.value)} />
        <input className={campo} inputMode="decimal" placeholder="Costo de la ganancia ocasional" value={costoGO} onChange={(e) => setCostoGO(e.target.value)} />
        <input className={campo} inputMode="decimal" placeholder="Anticipo del año anterior" value={anticipoPrev} onChange={(e) => setAnticipoPrev(e.target.value)} />
      </div>
      <div className="space-y-1">
        {filas.map(([c, v]) => (
          <p key={c} className="flex justify-between gap-3 text-sm text-foreground">
            <span className="min-w-0 break-words">{c}</span>
            <strong className="shrink-0">{dinero(v)}</strong>
          </p>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <button onClick={aExcel} className="rounded-full border border-glass-border px-4 py-1.5 text-muted-foreground">Exportar a Excel</button>
        <button onClick={aPdf} className="rounded-full border border-glass-border px-4 py-1.5 text-muted-foreground">Exportar a PDF</button>
      </div>
      <p className="text-xs text-muted-foreground">
        Ingresos y costos salen de tus asientos del período. Tarifa persona natural según el Art. 241 del Estatuto Tributario (UVT {dinero(UVT)}); ganancia ocasional al 15%. Es un borrador: confírmalo con tu contador.
      </p>
    </GlassPanel>
  );
}
