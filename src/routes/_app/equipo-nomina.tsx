import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Briefcase, Calculator, CalendarClock, Send, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { exportarExcel, imprimirReporte } from "@/lib/exportes";
import { useNegocio } from "@/hooks/use-negocio";
import { actualizarParametrosNomina } from "@/lib/nomina-ia.functions";
import { esSuperadminServidor } from "@/lib/cuenta-maestra";

export const Route = createFileRoute("/_app/equipo-nomina")({
  head: () => ({ meta: [{ title: "Equipo, turnos y nómina" }] }),
  component: EquipoNominaPage,
});

type Fila = { titulo: string; estado: string; monto: number };

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function EquipoNominaPage() {
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    // Límite fijo + orden: la nómina nunca trae el historial completo de una vez.
    const { data, error } = await supabase
      .from("equipo_pagos")
      .select("titulo, estado, monto")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error("No se pudo cargar la nómina.");
    setFilas(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const porPersona = useMemo(() => {
    const mapa = new Map<string, { porPagar: number; pagado: number }>();
    for (const f of filas) {
      const actual = mapa.get(f.titulo) ?? { porPagar: 0, pagado: 0 };
      if (f.estado === "hecho") actual.pagado += f.monto;
      else actual.porPagar += f.monto;
      mapa.set(f.titulo, actual);
    }
    return Array.from(mapa.entries())
      .map(([nombre, v]) => ({ nombre, ...v }))
      .sort((a, b) => b.porPagar - a.porPagar);
  }, [filas]);

  const totalPorPagar = porPersona.reduce((s, p) => s + p.porPagar, 0);
  const totalPagado = porPersona.reduce((s, p) => s + p.pagado, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Briefcase className="h-7 w-7 text-primary" /> Equipo, turnos y nómina
        </h1>
        <p className="text-sm text-muted-foreground">
          Lo que le debes a cada persona del equipo. Registra cada pago o novedad en{" "}
          <Link to="/modulos/$id" params={{ id: "equipo_turnos" }} className="text-primary">
            sus registros
          </Link>{" "}
          y márcalo como "Pagado" cuando lo entregues.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <button
            onClick={() => exportarExcel("liquidacion-nomina", ["Persona", "Por pagar", "Pagado"],
              porPersona.map((p) => [p.nombre, p.porPagar, p.pagado]))}
            className="rounded-full border border-glass-border px-4 py-1.5 text-sm text-muted-foreground"
          >
            Exportar a Excel
          </button>
          <button
            onClick={() => imprimirReporte("Liquidación de nómina", "Por persona", ["Persona", "Por pagar", "Pagado"],
              porPersona.map((p) => [p.nombre, dinero(p.porPagar), dinero(p.pagado)]),
              [`Total por pagar: ${dinero(totalPorPagar)} · Total pagado: ${dinero(totalPagado)}`])}
            className="rounded-full border border-glass-border px-4 py-1.5 text-sm text-muted-foreground"
          >
            Exportar a PDF
          </button>
        </div>
      </div>

      {cargando && <p className="text-sm text-muted-foreground">Cargando equipo…</p>}

      {!cargando && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Por pagar</p>
              <p className="truncate font-display text-xl text-foreground">{dinero(totalPorPagar)}</p>
            </GlassPanel>
            <GlassPanel className="p-4">
              <p className="text-xs text-muted-foreground">Ya pagado</p>
              <p className="truncate font-display text-xl text-primary">{dinero(totalPagado)}</p>
            </GlassPanel>
          </div>

          {porPersona.length === 0 && <p className="text-sm text-muted-foreground">Aún no tienes registros de nómina.</p>}

          <div className="space-y-2">
            {porPersona.map((p) => (
              <GlassPanel key={p.nombre} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <p className="min-w-0 break-words text-sm font-medium text-foreground">{p.nombre}</p>
                <div className="text-right text-xs text-muted-foreground">
                  <p>Por pagar: <span className="text-foreground">{dinero(p.porPagar)}</span></p>
                  <p>Pagado: <span className="text-foreground">{dinero(p.pagado)}</span></p>
                </div>
              </GlassPanel>
            ))}
          </div>
        </>
      )}

      <MotorNominaDinamica />
      <LiquidadorNomina />
      <CalendarioLaboral />
    </div>
  );
}

const num = (v: string): number => {
  const n = Number(v.replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const campoNomina =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

/** Liquidador de nómina mensual con las reglas laborales de Colombia (valores editables cada año). */
function LiquidadorNomina() {
  const [smmlv, setSmmlv] = useState("1750905");
  const [auxTransp, setAuxTransp] = useState("249095");
  const [salario, setSalario] = useState("");
  const [dias, setDias] = useState("30");
  const [arl, setArl] = useState("0.522");
  const [exonerado, setExonerado] = useState(true);
  const [heDiurna, setHeDiurna] = useState("");
  const [heNocturna, setHeNocturna] = useState("");
  const [recNocturno, setRecNocturno] = useState("");
  const [recDominical, setRecDominical] = useState("");
  const [otrosDev, setOtrosDev] = useState("");
  const [otrosDesc, setOtrosDesc] = useState("");

  const r = useMemo(() => {
    const sm = num(smmlv);
    const aux = num(auxTransp);
    const base = num(salario);
    const d = Math.min(Math.max(num(dias), 0), 30);
    // Horas mensuales: jornada de 42 h semanales (vigente desde el 15 de julio de 2026) => 210 h al mes.
    const valorHora = base / 210;
    const sueldo = (base / 30) * d;
    const extras =
      valorHora * 1.25 * num(heDiurna) +
      valorHora * 1.75 * num(heNocturna) +
      valorHora * 0.35 * num(recNocturno) +
      valorHora * 0.9 * num(recDominical);
    const auxPaga = base > 0 && base <= 2 * sm ? (aux / 30) * d : 0;
    const devengadoSS = sueldo + extras + num(otrosDev);
    const ibc = Math.max(devengadoSS, 0);
    const saludEmp = ibc * 0.04;
    const pensionEmp = ibc * 0.04;
    const fsp = base >= 4 * sm ? ibc * 0.01 : 0;
    const descuentos = saludEmp + pensionEmp + fsp + num(otrosDesc);
    const totalDev = devengadoSS + auxPaga;
    const neto = totalDev - descuentos;
    // Aportes del empleador
    const saludPat = exonerado && base < 10 * sm ? 0 : ibc * 0.085;
    const pensionPat = ibc * 0.12;
    const arlPat = ibc * (num(arl) / 100);
    const caja = ibc * 0.04;
    const sena = exonerado && base < 10 * sm ? 0 : ibc * 0.02;
    const icbf = exonerado && base < 10 * sm ? 0 : ibc * 0.03;
    const aportes = saludPat + pensionPat + arlPat + caja + sena + icbf;
    // Provisiones de prestaciones (la base incluye auxilio de transporte)
    const basePrest = devengadoSS + auxPaga;
    const cesantias = basePrest * 0.0833;
    const intereses = cesantias * 0.12;
    const prima = basePrest * 0.0833;
    const vacaciones = devengadoSS * 0.0417;
    const provisiones = cesantias + intereses + prima + vacaciones;
    const costoTotal = totalDev + aportes + provisiones;
    return {
      valorHora, sueldo, extras, auxPaga, totalDev, saludEmp, pensionEmp, fsp, descuentos, neto,
      saludPat, pensionPat, arlPat, caja, sena, icbf, aportes, cesantias, intereses, prima, vacaciones,
      provisiones, costoTotal, minimoOk: base >= sm || base === 0,
    };
  }, [smmlv, auxTransp, salario, dias, arl, exonerado, heDiurna, heNocturna, recNocturno, recDominical, otrosDev, otrosDesc]);

  const fila = (t: string, v: number, fuerte = false) => (
    <div className={`flex items-center justify-between gap-3 text-sm ${fuerte ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
      <span className="min-w-0">{t}</span>
      <span className="shrink-0 text-foreground">{dinero(Math.round(v))}</span>
    </div>
  );

  const entrada = (t: string, v: string, set: (x: string) => void, ph = "") => (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{t}</span>
      <input className={campoNomina} inputMode="decimal" value={v} placeholder={ph} onChange={(e) => set(e.target.value)} />
    </label>
  );

  return (
    <GlassPanel className="space-y-5 p-5">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl text-foreground">
          <Calculator className="h-5 w-5 text-primary" /> Liquidador de nómina (Colombia)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Calcula el pago neto del empleado, los aportes que paga el empleador y lo que debes provisionar cada mes. Los valores
          del salario mínimo y del auxilio de transporte se pueden editar cuando el Gobierno los actualice cada año.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {entrada("Salario mínimo (SMMLV)", smmlv, setSmmlv)}
        {entrada("Auxilio de transporte mensual", auxTransp, setAuxTransp)}
        {entrada("Salario mensual del empleado", salario, setSalario, "Ej. 1750905")}
        {entrada("Días trabajados (máx. 30)", dias, setDias)}
        {entrada("Horas extra diurnas (+25 %)", heDiurna, setHeDiurna)}
        {entrada("Horas extra nocturnas (+75 %)", heNocturna, setHeNocturna)}
        {entrada("Horas con recargo nocturno (+35 %)", recNocturno, setRecNocturno)}
        {entrada("Horas dominical o festivo (+90 %)", recDominical, setRecDominical)}
        {entrada("Otros devengos salariales (COP)", otrosDev, setOtrosDev, "Comisiones, bonos")}
        {entrada("Otros descuentos (COP)", otrosDesc, setOtrosDesc, "Préstamos, embargos, libranzas")}
        {entrada("Tarifa ARL (%)", arl, setArl)}
        <label className="flex items-end gap-2 pb-2 text-sm text-foreground">
          <input type="checkbox" checked={exonerado} onChange={(e) => setExonerado(e.target.checked)} className="h-5 w-5" />
          Exonerado de salud, SENA e ICBF (art. 114-1 E.T.)
        </label>
      </div>

      {!r.minimoOk && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          Ese salario es menor al mínimo legal. Revísalo antes de liquidar.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2 rounded-xl border border-glass-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Lo que recibe el empleado</h3>
          {fila("Sueldo por días trabajados", r.sueldo)}
          {fila("Horas extra y recargos", r.extras)}
          {fila("Auxilio de transporte", r.auxPaga)}
          {fila("Total devengado", r.totalDev, true)}
          {fila("Salud (4 %)", -r.saludEmp)}
          {fila("Pensión (4 %)", -r.pensionEmp)}
          {fila("Fondo de solidaridad (1 %)", -r.fsp)}
          {fila("Neto a pagar", r.neto, true)}
        </div>
        <div className="space-y-2 rounded-xl border border-glass-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Aportes del empleador (PILA)</h3>
          {fila("Salud (8,5 %)", r.saludPat)}
          {fila("Pensión (12 %)", r.pensionPat)}
          {fila("ARL", r.arlPat)}
          {fila("Caja de compensación (4 %)", r.caja)}
          {fila("SENA (2 %)", r.sena)}
          {fila("ICBF (3 %)", r.icbf)}
          {fila("Total aportes", r.aportes, true)}
        </div>
        <div className="space-y-2 rounded-xl border border-glass-border p-4">
          <h3 className="text-sm font-semibold text-foreground">Provisiones del mes</h3>
          {fila("Cesantías (8,33 %)", r.cesantias)}
          {fila("Intereses a cesantías (12 % anual)", r.intereses)}
          {fila("Prima de servicios (8,33 %)", r.prima)}
          {fila("Vacaciones (4,17 %)", r.vacaciones)}
          {fila("Total provisiones", r.provisiones, true)}
          <div className="border-t border-glass-border pt-2">{fila("Costo total del empleado para ti", r.costoTotal, true)}</div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Valor de la hora ordinaria: {dinero(Math.round(r.valorHora))} (jornada de 42 horas semanales, 210 horas al mes). Es una
        guía de cálculo: confirma los porcentajes y las bases vigentes con tu contador antes de pagar o presentar la PILA.
      </p>
    </GlassPanel>
  );
}

/** Obligaciones laborales y fechas que un empleador en Colombia debe tener presentes. */
function CalendarioLaboral() {
  const items: { cuando: string; titulo: string; texto: string }[] = [
    { cuando: "Cada mes", titulo: "Pago de la PILA", texto: "Seguridad social y parafiscales, en las fechas que fija el calendario oficial según el último dígito del NIT o la cédula." },
    { cuando: "Cada mes", titulo: "Retención en la fuente y nómina electrónica", texto: "Declara y paga la retención del mes y transmite la nómina electrónica a la DIAN en el plazo del mes siguiente." },
    { cuando: "31 de enero", titulo: "Intereses a las cesantías", texto: "Págalos directamente al empleado (12 % anual sobre las cesantías)." },
    { cuando: "14 de febrero", titulo: "Consignación de cesantías", texto: "Consigna las cesantías del año anterior en el fondo de cada empleado." },
    { cuando: "30 de junio", titulo: "Prima de servicios (1.er semestre)", texto: "Un mes de salario por año trabajado, proporcional al semestre." },
    { cuando: "20 de diciembre", titulo: "Prima de servicios (2.º semestre)", texto: "Pago de la segunda prima del año." },
    { cuando: "Cada año", titulo: "Actualizar salario mínimo y auxilio", texto: "Ajusta los salarios al nuevo mínimo y revisa el auxilio de transporte desde enero." },
    { cuando: "Cada año", titulo: "Vacaciones", texto: "15 días hábiles por año trabajado. Programa y registra cuándo las toma cada persona." },
    { cuando: "Cada año", titulo: "SG-SST", texto: "Mantén al día el Sistema de Gestión de Seguridad y Salud en el Trabajo, la dotación (3 veces al año a quien gane hasta 2 SMMLV) y los exámenes médicos." },
  ];
  return (
    <GlassPanel className="space-y-4 p-5">
      <h2 className="flex items-center gap-2 font-display text-xl text-foreground">
        <CalendarClock className="h-5 w-5 text-primary" /> Calendario de obligaciones laborales
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((i) => (
          <div key={i.titulo} className="rounded-xl border border-glass-border p-4">
            <p className="text-xs font-medium text-primary">{i.cuando}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{i.titulo}</p>
            <p className="mt-1 text-xs text-muted-foreground">{i.texto}</p>
          </div>
        ))}
      </div>
    </GlassPanel>
  );
}

type Parametro = Tables<"parametros_nomina_colombia">;
type Empleado = Tables<"nomina_empleados">;
type Liquidacion = Tables<"nomina_liquidaciones">;

const hoyISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const inicioMes = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
};

/** Vigencia que cubre una fecha; si no hay exacta, la anterior más cercana. */
function paramPara(params: Parametro[], fecha: string): Parametro | null {
  if (params.length === 0) return null;
  const f = fecha || hoyISO();
  const cubren = params.filter((p) => p.vigencia_desde <= f && (p.vigencia_hasta === null || f <= p.vigencia_hasta));
  const orden = (a: Parametro, b: Parametro): number => (a.vigencia_desde < b.vigencia_desde ? 1 : -1);
  if (cubren.length > 0) return cubren.sort(orden)[0];
  const anteriores = params.filter((p) => p.vigencia_desde <= f).sort(orden);
  if (anteriores.length > 0) return anteriores[0];
  return params.slice().sort(orden)[0];
}

type HorasNom = { heD: number; heN: number; recN: number; recD: number; otrosDev: number; otrosDesc: number; incap: number };

/** Fondo de Solidaridad Pensional según el ingreso en SMMLV (escala de ley). */
function porcentajeFsp(ibc: number, smmlv: number): number {
  if (!(smmlv > 0)) return 0;
  const n = ibc / smmlv;
  if (n >= 20) return 0.02;
  if (n >= 19) return 0.018;
  if (n >= 18) return 0.016;
  if (n >= 17) return 0.014;
  if (n >= 16) return 0.012;
  if (n >= 4) return 0.01;
  return 0;
}

/** Liquidación con los porcentajes de la vigencia (nunca valores fijos en el código). */
function calcularNomina(p: Parametro, base: number, dias: number, arlPct: number, exonerado: boolean, h: HorasNom) {
  const d = Math.min(Math.max(dias, 0), 30);
  const horasMes = p.horas_mes > 0 ? p.horas_mes : 210;
  const valorHora = horasMes > 0 ? base / horasMes : 0;
  // Incapacidad (enfermedad general): días 1-2 los paga el empleador al 100 %; desde el día 3 paga la EPS al 66,67 %
  // sin bajar del salario mínimo diario. Esos días no llevan auxilio de transporte.
  const valorDia = base / 30;
  const dInc = Math.min(Math.max(h.incap, 0), d);
  const dTrab = d - dInc;
  const diasEmpleador = Math.min(dInc, 2);
  const diasEps = dInc - diasEmpleador;
  const pagoDiaEps = Math.min(valorDia, Math.max(valorDia * 0.6667, p.smmlv / 30));
  const incapacidad = valorDia * diasEmpleador + pagoDiaEps * diasEps;
  const sueldo = valorDia * dTrab;
  const extras =
    valorHora * (1 + p.extra_diurna) * h.heD +
    valorHora * (1 + p.extra_nocturna) * h.heN +
    valorHora * p.rec_nocturno * h.recN +
    valorHora * p.rec_dominical * h.recD;
  // IBC: mínimo 1 SMMLV proporcional a los días y máximo 25 SMMLV; el auxilio de transporte no hace parte.
  const ibcBruto = Math.max(sueldo + extras + h.otrosDev + incapacidad, 0);
  const ibc = Math.min(Math.max(ibcBruto, (p.smmlv / 30) * d), 25 * p.smmlv);
  const auxPaga = base > 0 && base <= p.tope_aux_smmlv * p.smmlv ? (p.aux_transporte / 30) * dTrab : 0;
  const saludEmp = ibc * p.salud_trab;
  const pensionEmp = ibc * p.pension_trab;
  const fsp = ibc * porcentajeFsp(ibc, p.smmlv);
  const descuentos = saludEmp + pensionEmp + fsp + h.otrosDesc;
  const totalDev = sueldo + extras + h.otrosDev + incapacidad + auxPaga;
  const neto = totalDev - descuentos;
  const exento = exonerado && base < p.exoneracion_tope_smmlv * p.smmlv;
  const saludPat = exento ? 0 : ibc * p.salud_emp;
  const pensionPat = ibc * p.pension_emp;
  const arlPat = ibc * (arlPct / 100);
  const caja = ibc * p.caja_compensacion;
  const sena = exento ? 0 : ibc * p.sena;
  const icbf = exento ? 0 : ibc * p.icbf;
  const aportes = saludPat + pensionPat + arlPat + caja + sena + icbf;
  const basePrest = sueldo + extras + h.otrosDev + incapacidad + auxPaga;
  const cesantias = basePrest * p.prov_cesantias;
  const intereses = cesantias * p.prov_intereses;
  const prima = basePrest * p.prov_prima;
  const vacaciones = (sueldo + extras + h.otrosDev + incapacidad) * p.prov_vacaciones;
  const provisiones = cesantias + intereses + prima + vacaciones;
  return {
    valorHora, sueldo, extras, incapacidad, ibc, auxPaga, totalDev, saludEmp, pensionEmp, fsp, descuentos, neto,
    saludPat, pensionPat, arlPat, caja, sena, icbf, aportes, cesantias, intereses, prima, vacaciones,
    provisiones, costoTotal: totalDev + aportes + provisiones,
  };
}

const textoDesprendible = (nombre: string, ini: string, fin: string, r: ReturnType<typeof calcularNomina>): string =>
  `Desprendible de nómina ${nombre} (${ini} al ${fin}): devengado ${dinero(Math.round(r.totalDev))}, neto a pagar ${dinero(Math.round(r.neto))}.`;

/** Motor de Nómina Dinámica: empleados con anclaje al SMMLV, liquidación por vigencia e IA. */
function MotorNominaDinamica() {
  const { negocio } = useNegocio();
  const [params, setParams] = useState<Parametro[]>([]);
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [liqs, setLiqs] = useState<Liquidacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [iaMsg, setIaMsg] = useState("");
  const [actualizando, setActualizando] = useState(false);
  // Los valores de ley son globales: solo el Superadministrador los crea o edita (la base de datos también lo exige).
  const [esSuper, setEsSuper] = useState(false);
  useEffect(() => {
    let vivo = true;
    void esSuperadminServidor().then((v) => {
      if (vivo) setEsSuper(v);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const [fNombre, setFNombre] = useState("");
  const [fDoc, setFDoc] = useState("");
  const [fTel, setFTel] = useState("");
  const [fCargo, setFCargo] = useState("");
  const [fSalario, setFSalario] = useState("");
  const [fAnclado, setFAnclado] = useState(false);
  const [fNumSmmlv, setFNumSmmlv] = useState("1");
  const [fArl, setFArl] = useState("0.522");
  const [fExonerado, setFExonerado] = useState(true);
  const [fEps, setFEps] = useState("");
  const [fFondo, setFFondo] = useState("");
  const [fIngreso, setFIngreso] = useState("");

  const [selEmp, setSelEmp] = useState("");
  const [pIni, setPIni] = useState(inicioMes);
  const [pFin, setPFin] = useState(hoyISO);
  const [dias, setDias] = useState("30");
  const [heD, setHeD] = useState("");
  const [heN, setHeN] = useState("");
  const [recN, setRecN] = useState("");
  const [recD, setRecD] = useState("");
  const [otrosDev, setOtrosDev] = useState("");
  const [otrosDesc, setOtrosDesc] = useState("");
  const [incap, setIncap] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  // Edición de la vigencia (cuando sale un decreto nuevo).
  const [verParams, setVerParams] = useState(false);
  const [nuevoParam, setNuevoParam] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    const [pa, em, li] = await Promise.all([
      supabase.from("parametros_nomina_colombia").select("*").order("vigencia_desde", { ascending: false }).limit(10),
      supabase.from("nomina_empleados").select("*").order("nombre").limit(500),
      supabase.from("nomina_liquidaciones").select("*").order("periodo_fin", { ascending: false }).limit(50),
    ]);
    if (pa.data) setParams(pa.data);
    if (em.data) setEmpleados(em.data);
    if (li.data) setLiqs(li.data);
    setCargando(false);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const vigencia = useMemo(() => paramPara(params, pFin || hoyISO()), [params, pFin]);
  const empleado = useMemo(() => empleados.find((e) => e.id === selEmp) ?? null, [empleados, selEmp]);
  const telDigitos = (empleado?.telefono ?? "").replace(/\D/g, "");
  const telWa = telDigitos.length === 10 ? `57${telDigitos}` : telDigitos;

  const baseVigente = useMemo(() => {
    if (!empleado || !vigencia) return 0;
    return empleado.anclado_smmlv ? Math.round(empleado.num_smmlv * vigencia.smmlv) : empleado.salario_base;
  }, [empleado, vigencia]);

  const r = useMemo(
    () =>
      vigencia
        ? calcularNomina(vigencia, baseVigente, num(dias), empleado ? empleado.tarifa_arl : 0.522, empleado ? empleado.exonerado : true, {
            heD: num(heD), heN: num(heN), recN: num(recN), recD: num(recD), otrosDev: num(otrosDev), otrosDesc: num(otrosDesc), incap: num(incap),
          })
        : null,
    [vigencia, baseVigente, dias, empleado, heD, heN, recN, recD, otrosDev, otrosDesc, incap],
  );

  const guardarEmpleado = async () => {
    if (fNombre.trim().length < 2) return toast.error("Escribe el nombre del empleado.");
    const ref = params[0]?.smmlv ?? 1750905;
    const nSmmlv = Number((fNumSmmlv || "1").replace(",", ".")) || 1;
    const base = fAnclado ? Math.round(nSmmlv * ref) : num(fSalario);
    if (!(base > 0)) return toast.error("Indica el salario base o los SMMLV.");
    const { error } = await supabase.from("nomina_empleados").insert({
      tipo_negocio: negocio?.tipo_negocio ?? null,
      nombre: fNombre.trim(),
      documento: fDoc.trim() || null,
      telefono: fTel.trim() || null,
      cargo: fCargo.trim() || null,
      salario_base: base,
      anclado_smmlv: fAnclado,
      num_smmlv: fAnclado ? nSmmlv : 1,
      tarifa_arl: num(fArl) || 0.522,
      exonerado: fExonerado,
      eps: fEps.trim() || null,
      fondo_pension: fFondo.trim() || null,
      fecha_ingreso: fIngreso || null,
    });
    if (error) return toast.error("No se pudo guardar el empleado.");
    setFNombre(""); setFDoc(""); setFTel(""); setFCargo(""); setFSalario(""); setFAnclado(false); setFNumSmmlv("1");
    toast.success(fAnclado ? "Empleado creado con salario anclado al SMMLV." : "Empleado creado.");
    void cargar();
  };

  const cambiarActivo = async (e: Empleado, activo: boolean) => {
    const { error } = await supabase.from("nomina_empleados").update({ activo }).eq("id", e.id);
    if (error) return toast.error("No se pudo actualizar.");
    void cargar();
  };

  const guardarLiquidacion = async (): Promise<Liquidacion | null> => {
    if (!empleado || !vigencia || !r) {
      toast.error("Elige el empleado y la vigencia.");
      return null;
    }
    if (!pIni || !pFin || pIni > pFin) {
      toast.error("Revisa las fechas del periodo.");
      return null;
    }
    if (!(baseVigente > 0)) {
      toast.error("El empleado no tiene salario base.");
      return null;
    }
    const { data, error } = await supabase
      .from("nomina_liquidaciones")
      .insert({
        tipo_negocio: negocio?.tipo_negocio ?? null,
        empleado_id: empleado.id,
        empleado_nombre: empleado.nombre,
        periodo_inicio: pIni,
        periodo_fin: pFin,
        dias: Math.min(Math.max(num(dias), 0), 30),
        salario_base: Math.round(baseVigente),
        auxilio: Math.round(r.auxPaga),
        extras: Math.round(r.extras),
        devengado: Math.round(r.totalDev),
        descuentos: Math.round(r.descuentos),
        neto: Math.round(r.neto),
        aportes: Math.round(r.aportes),
        provisiones: Math.round(r.provisiones),
        costo_total: Math.round(r.costoTotal),
        detalle: {
          vigencia_desde: vigencia.vigencia_desde, smmlv: vigencia.smmlv, auxilio_vigente: vigencia.aux_transporte,
          anclado: empleado.anclado_smmlv, num_smmlv: empleado.num_smmlv,
          heD: num(heD), heN: num(heN), recN: num(recN), recD: num(recD), incap: num(incap),
          incapacidad: Math.round(r.incapacidad),
          cesantias: Math.round(r.cesantias), intereses: Math.round(r.intereses),
          prima: Math.round(r.prima), vacaciones: Math.round(r.vacaciones),
        },
      })
      .select("*")
      .maybeSingle();
    if (error || !data) {
      toast.error("No se pudo guardar la liquidación.");
      return null;
    }
    toast.success("Liquidación guardada en el histórico.");
    void cargar();
    return data;
  };

  const asegurarCuenta = async (codigo: string, nombre: string, tipo: string): Promise<string | null> => {
    const { data } = await supabase.from("cuentas_contables").select("id").eq("codigo", codigo).limit(1).maybeSingle();
    if (data) return data.id;
    const { data: creada } = await supabase.from("cuentas_contables").insert({ codigo, nombre, tipo }).select("id").maybeSingle();
    return creada?.id ?? null;
  };

  const contabilizar = async (liq: Liquidacion) => {
    if (liq.estado !== "liquidada") return toast.error("Esta nómina ya fue contabilizada.");
    const det = (liq.detalle && typeof liq.detalle === "object" && !Array.isArray(liq.detalle) ? liq.detalle : {}) as Record<string, unknown>;
    const nd = (k: string): number => Math.round(Number(det[k]) || 0);
    const costo = Math.round(liq.costo_total);
    const aportes = Math.round(liq.aportes);
    const descuentos = Math.round(liq.descuentos);
    const prov = [
      { codigo: "2510", nombre: "Cesantías consolidadas", monto: nd("cesantias") },
      { codigo: "2515", nombre: "Intereses sobre cesantías", monto: nd("intereses") },
      { codigo: "2520", nombre: "Prima de servicios", monto: nd("prima") },
      { codigo: "2525", nombre: "Vacaciones consolidadas", monto: nd("vacaciones") },
    ];
    const provDetallada = prov.reduce((s, x) => s + x.monto, 0);
    // Si la liquidación es antigua y no trae el desglose, las provisiones quedan dentro de la nómina por pagar.
    const usaDesglose = provDetallada > 0 && Math.abs(provDetallada - Math.round(liq.provisiones)) <= 3;
    const creditos: { codigo: string; nombre: string; tipo: string; monto: number }[] = [
      { codigo: "2370", nombre: "Retenciones y aportes de nómina", tipo: "pasivo", monto: descuentos + aportes },
      ...(usaDesglose ? prov.map((x) => ({ ...x, tipo: "pasivo" })) : []),
    ].filter((x) => x.monto > 0);
    // La nómina por pagar absorbe el neto y cualquier diferencia de redondeo: el asiento siempre cuadra.
    const sumaOtros = creditos.reduce((s, x) => s + x.monto, 0);
    const porPagar = costo - sumaOtros;
    if (!(costo > 0) || porPagar < 0) return toast.error("Los valores de la liquidación no permiten contabilizarla.");
    const gastoId = await asegurarCuenta("5105", "Nómina", "gasto");
    const pasivoId = await asegurarCuenta("2505", "Nómina por pagar", "pasivo");
    if (!gastoId || !pasivoId) return toast.error("No se pudieron abrir las cuentas de nómina.");
    const idsCred: { id: string; monto: number }[] = [];
    for (const c of creditos) {
      const id = await asegurarCuenta(c.codigo, c.nombre, c.tipo);
      if (!id) return toast.error("No se pudieron abrir las cuentas de nómina.");
      idsCred.push({ id, monto: c.monto });
    }
    const asientoId = crypto.randomUUID();
    const concepto = `Nómina ${liq.empleado_nombre} ${liq.periodo_inicio} al ${liq.periodo_fin} (neto ${dinero(liq.neto)}, aportes ${dinero(liq.aportes)}, provisiones ${dinero(liq.provisiones)})`;
    const base = { asiento_id: asientoId, fecha: liq.periodo_fin, concepto, origen_tipo: "nomina", origen_id: liq.id };
    const { error } = await supabase.from("asientos_contables").insert([
      { ...base, cuenta_id: gastoId, debe: costo, haber: 0 },
      { ...base, cuenta_id: pasivoId, debe: 0, haber: porPagar },
      ...idsCred.map((c) => ({ ...base, cuenta_id: c.id, debe: 0, haber: c.monto })),
    ]);
    if (error) return toast.error("No se pudo contabilizar.");
    await supabase.from("nomina_liquidaciones").update({ estado: "contabilizada" }).eq("id", liq.id);
    toast.success("Contabilizado: gasto y pasivo de nómina en Contabilidad.");
    void cargar();
  };

  const pagar = async (liq: Liquidacion) => {
    const { error } = await supabase.rpc("nomina_pagar", { p_liquidacion: liq.id, p_metodo: metodoPago });
    if (error) return toast.error(error.message.length < 160 ? error.message : "No se pudo registrar el pago.");
    toast.success("Pago registrado: asiento cuadrado y egreso en caja.");
    void cargar();
  };

  const CAMPOS_PARAM: { k: keyof Parametro; t: string }[] = [
    { k: "smmlv", t: "Salario mínimo (COP)" }, { k: "aux_transporte", t: "Auxilio de transporte (COP)" },
    { k: "salud_trab", t: "Salud trabajador" }, { k: "salud_emp", t: "Salud empleador" },
    { k: "pension_trab", t: "Pensión trabajador" }, { k: "pension_emp", t: "Pensión empleador" },
    { k: "caja_compensacion", t: "Caja de compensación" }, { k: "sena", t: "SENA" }, { k: "icbf", t: "ICBF" },
    { k: "prov_prima", t: "Prima" }, { k: "prov_cesantias", t: "Cesantías" },
    { k: "prov_intereses", t: "Intereses de cesantías" }, { k: "prov_vacaciones", t: "Vacaciones" },
    { k: "rec_nocturno", t: "Recargo nocturno" }, { k: "rec_dominical", t: "Recargo dominical/festivo" },
    { k: "extra_diurna", t: "Extra diurna" }, { k: "extra_nocturna", t: "Extra nocturna" },
    { k: "horas_mes", t: "Horas al mes" }, { k: "tope_aux_smmlv", t: "Tope del auxilio (SMMLV)" },
  ];

  const guardarVigencia = async () => {
    if (!esSuper) return toast.error("Solo el Superadministrador puede cambiar los valores de ley.");
    const desde = nuevoParam.vigencia_desde;
    if (!desde) return toast.error("Indica desde qué fecha rige el nuevo decreto.");
    const ref = vigencia;
    if (!ref) return toast.error("No hay una vigencia de referencia.");
    const fila: Record<string, number> = {};
    for (const c of CAMPOS_PARAM) {
      const crudo = nuevoParam[c.k as string];
      const v = crudo !== undefined && crudo !== "" ? Number(crudo.replace(",", ".")) : Number(ref[c.k]);
      if (!Number.isFinite(v) || v < 0) return toast.error(`Revisa el valor de «${c.t}».`);
      fila[c.k as string] = v;
    }
    if (!(fila.smmlv > 0) || !(fila.aux_transporte >= 0)) return toast.error("El salario mínimo debe ser mayor a cero.");
    // La vigencia anterior termina el día antes.
    const dia = new Date(`${desde}T00:00:00`);
    dia.setDate(dia.getDate() - 1);
    const fin = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, "0")}-${String(dia.getDate()).padStart(2, "0")}`;
    for (const p of params) {
      if (p.vigencia_desde < desde && (p.vigencia_hasta === null || p.vigencia_hasta >= desde)) {
        await supabase.from("parametros_nomina_colombia").update({ vigencia_hasta: fin }).eq("id", p.id);
      }
    }
    const { error } = await supabase.from("parametros_nomina_colombia").insert({
      vigencia_desde: desde,
      vigencia_hasta: null,
      jornada_semanal: ref.jornada_semanal,
      exoneracion_tope_smmlv: ref.exoneracion_tope_smmlv,
      fuente_legal: (nuevoParam.fuente_legal ?? "").trim() || "Actualizado por el negocio según decreto",
      smmlv: fila.smmlv, aux_transporte: fila.aux_transporte, salud_trab: fila.salud_trab, salud_emp: fila.salud_emp,
      pension_trab: fila.pension_trab, pension_emp: fila.pension_emp, caja_compensacion: fila.caja_compensacion,
      sena: fila.sena, icbf: fila.icbf, prov_prima: fila.prov_prima, prov_cesantias: fila.prov_cesantias,
      prov_intereses: fila.prov_intereses, prov_vacaciones: fila.prov_vacaciones, rec_nocturno: fila.rec_nocturno,
      rec_dominical: fila.rec_dominical, extra_diurna: fila.extra_diurna, extra_nocturna: fila.extra_nocturna,
      horas_mes: fila.horas_mes, tope_aux_smmlv: fila.tope_aux_smmlv,
    });
    if (error) return toast.error("No se pudo guardar la nueva vigencia.");
    toast.success("Vigencia guardada. Los empleados anclados al salario mínimo se ajustaron solos.");
    setNuevoParam({});
    setVerParams(false);
    void cargar();
  };

  const actualizarConIA = async () => {
    if (!esSuper) return toast.error("Solo el Superadministrador puede actualizar los valores de ley.");
    setActualizando(true);
    setIaMsg("");
    try {
      const res = await actualizarParametrosNomina({ data: {} });
      setIaMsg(res.mensaje);
      toast.success("Valores de ley actualizados.");
      await cargar();
    } catch (e) {
      setIaMsg(e instanceof Error ? e.message : "No se pudo consultar la IA.");
    } finally {
      setActualizando(false);
    }
  };

  const linea = (t: string, v: number, fuerte = false) => (
    <div className={`flex items-center justify-between gap-3 text-sm ${fuerte ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
      <span className="min-w-0">{t}</span>
      <span className="shrink-0 text-foreground">{dinero(Math.round(v))}</span>
    </div>
  );

  const entrada = (t: string, v: string, set: (x: string) => void, ph = "") => (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{t}</span>
      <input className={campoNomina} inputMode="decimal" value={v} placeholder={ph} onChange={(e) => set(e.target.value)} />
    </label>
  );

  if (cargando) return <p className="text-sm text-muted-foreground">Cargando motor de nómina…</p>;

  return (
    <GlassPanel className="space-y-5 p-5">
      <div>
        <h2 className="flex items-center gap-2 font-display text-xl text-foreground">
          <Users className="h-5 w-5 text-primary" /> Motor de nómina dinámica (Colombia)
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Los porcentajes salen de la vigencia oficial, no están fijos en el código. Los empleados anclados al SMMLV se ajustan solos cuando entra un decreto nuevo.
        </p>
      </div>

      <div className="rounded-xl border border-glass-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-foreground">
            {vigencia
              ? `Vigencia ${vigencia.vigencia_desde} al ${vigencia.vigencia_hasta ?? "actualidad"} · SMMLV ${dinero(vigencia.smmlv)} · Auxilio ${dinero(vigencia.aux_transporte)}`
              : "Sin vigencia paramétrica cargada."}
          </p>
          {esSuper && (
            <button
              type="button"
              onClick={() => void actualizarConIA()}
              disabled={actualizando}
              className="inline-flex items-center gap-1 rounded-full border border-glass-border px-4 py-1.5 text-sm text-foreground disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" /> {actualizando ? "Consultando…" : "Consultar y actualizar valores de ley (IA)"}
            </button>
          )}
        </div>
        {vigencia && (
          <p className="mt-1 text-xs text-muted-foreground">
            Jornada {vigencia.jornada_semanal} h/semana ({vigencia.horas_mes} h/mes) · Nocturno +{Math.round(vigencia.rec_nocturno * 100)} % (7 p. m.–6 a. m.) · Dominical +{Math.round(vigencia.rec_dominical * 100)} % · Extra diurna +{Math.round(vigencia.extra_diurna * 100)} % · Extra nocturna +{Math.round(vigencia.extra_nocturna * 100)} % · Auxilio hasta {vigencia.tope_aux_smmlv} SMMLV · Respaldo: {vigencia.fuente_legal ?? "—"}
          </p>
        )}
        {iaMsg && <p className="mt-2 text-xs text-muted-foreground">{iaMsg}</p>}
        {esSuper ? (
          <button type="button" onClick={() => setVerParams((v) => !v)} className="mt-2 rounded-full border border-glass-border px-4 py-1.5 text-sm text-foreground">
            {verParams ? "Cerrar editor de valores de ley" : "Crear / editar vigencia de ley de nómina"}
          </button>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">Los valores de ley son de solo lectura: los actualiza el Superadministrador cuando sale un decreto.</p>
        )}
        {esSuper && verParams && vigencia && (
          <div className="mt-3 space-y-3">
            <p className="text-xs text-muted-foreground">Cambia solo lo que haya variado; lo demás se copia de la vigencia actual. Los porcentajes van en decimales (0.04 = 4 %).</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">Rige desde *</span>
                <input type="date" className={campoNomina} value={nuevoParam.vigencia_desde ?? ""} onChange={(e) => setNuevoParam((p) => ({ ...p, vigencia_desde: e.target.value }))} />
              </label>
              {CAMPOS_PARAM.map((c) => (
                <label key={c.k} className="block space-y-1">
                  <span className="text-xs text-muted-foreground">{c.t}</span>
                  <input className={campoNomina} inputMode="decimal" placeholder={String(vigencia[c.k] ?? "")} value={nuevoParam[c.k as string] ?? ""} onChange={(e) => setNuevoParam((p) => ({ ...p, [c.k as string]: e.target.value }))} />
                </label>
              ))}
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-xs text-muted-foreground">Decreto o fuente</span>
                <input className={campoNomina} value={nuevoParam.fuente_legal ?? ""} onChange={(e) => setNuevoParam((p) => ({ ...p, fuente_legal: e.target.value }))} />
              </label>
            </div>
            <button type="button" onClick={() => void guardarVigencia()} className="rounded-full border border-glass-border px-4 py-2 text-sm text-foreground">
              Guardar nueva vigencia
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Empleados</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {entrada("Nombre *", fNombre, setFNombre, "Ej. María Pérez")}
          {entrada("Documento", fDoc, setFDoc)}
          {entrada("Teléfono (WhatsApp)", fTel, setFTel)}
          {entrada("Cargo", fCargo, setFCargo)}
          {fAnclado
            ? entrada("Salarios mínimos", fNumSmmlv, setFNumSmmlv, "Ej. 1 o 1.5")
            : entrada("Salario base mensual", fSalario, setFSalario, "Ej. 1750905")}
          {entrada("Tarifa ARL (%)", fArl, setFArl)}
          {entrada("EPS", fEps, setFEps)}
          {entrada("Fondo de pensión", fFondo, setFFondo)}
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Fecha de ingreso</span>
            <input type="date" className={campoNomina} value={fIngreso} onChange={(e) => setFIngreso(e.target.value)} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={fAnclado} onChange={(e) => setFAnclado(e.target.checked)} className="h-5 w-5" />
            Salario anclado al SMMLV vigente
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={fExonerado} onChange={(e) => setFExonerado(e.target.checked)} className="h-5 w-5" />
            Exonerado salud, SENA e ICBF
          </label>
          <button type="button" onClick={() => void guardarEmpleado()} className="rounded-full border border-glass-border px-4 py-1.5 text-sm text-foreground">
            Guardar empleado
          </button>
        </div>
        <div className="space-y-2">
          {empleados.filter((e) => e.activo).map((e) => (
            <div key={e.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-glass-border p-3">
              <p className="min-w-0 break-words text-sm text-foreground">
                <span className="font-medium">{e.nombre}</span>
                <span className="text-muted-foreground"> · {e.cargo || "sin cargo"} · {dinero(e.salario_base)}{e.anclado_smmlv ? ` (anclado: ${e.num_smmlv} SMMLV)` : ""}</span>
              </p>
              <button type="button" onClick={() => void cambiarActivo(e, false)} className="rounded-full border border-glass-border px-3 py-1 text-xs text-muted-foreground">
                Retirar
              </button>
            </div>
          ))}
          {empleados.filter((e) => e.activo).length === 0 && <p className="text-xs text-muted-foreground">Aún no hay empleados. Crea el primero arriba.</p>}
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Liquidar periodo</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Empleado</span>
            <select className={campoNomina} value={selEmp} onChange={(e) => setSelEmp(e.target.value)}>
              <option value="">Elige…</option>
              {empleados.filter((e) => e.activo).map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Desde</span>
            <input type="date" className={campoNomina} value={pIni} onChange={(e) => setPIni(e.target.value)} />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Hasta</span>
            <input type="date" className={campoNomina} value={pFin} onChange={(e) => setPFin(e.target.value)} />
          </label>
          {entrada("Días trabajados (máx. 30)", dias, setDias)}
          {entrada("Horas extra diurnas", heD, setHeD)}
          {entrada("Horas extra nocturnas", heN, setHeN)}
          {entrada("Horas recargo nocturno", recN, setRecN)}
          {entrada("Horas dominical/festivo", recD, setRecD)}
          {entrada("Días de incapacidad (dentro de los días del periodo)", incap, setIncap, "Enfermedad general")}
          {entrada("Otros devengos (COP)", otrosDev, setOtrosDev, "Comisiones, bonos")}
          {entrada("Otros descuentos (COP)", otrosDesc, setOtrosDesc, "Préstamos, embargos")}
        </div>
        {empleado && vigencia && r && (
          <div className="grid gap-3 lg:grid-cols-3">
            <div className="space-y-2 rounded-xl border border-glass-border p-4">
              <p className="text-xs text-muted-foreground">Base liquidada: {dinero(Math.round(baseVigente))}{empleado.anclado_smmlv ? " (anclada al SMMLV)" : ""} · Hora: {dinero(Math.round(r.valorHora))}</p>
              {linea("Sueldo por días", r.sueldo)}
              {linea("Extras y recargos", r.extras)}
              {r.incapacidad > 0 && linea("Incapacidad pagada", r.incapacidad)}
              {linea("Auxilio de transporte", r.auxPaga)}
              {linea("Descuentos (salud, pensión, solidaridad y otros)", r.descuentos)}
              {linea("Neto a pagar", r.neto, true)}
            </div>
            <div className="space-y-2 rounded-xl border border-glass-border p-4">
              {linea("Aportes empleador (PILA)", r.aportes)}
              {linea("Provisiones del mes", r.provisiones)}
              {linea("Costo total", r.costoTotal, true)}
            </div>
            <div className="flex flex-col justify-center gap-2">
              <button type="button" onClick={() => void guardarLiquidacion().then((l) => { if (l) void contabilizar(l); })} className="rounded-full border border-glass-border px-4 py-2 text-sm text-foreground">
                Guardar y contabilizar
              </button>
              <button type="button" onClick={() => void guardarLiquidacion()} className="rounded-full border border-glass-border px-4 py-2 text-sm text-muted-foreground">
                Solo guardar
              </button>
              {telWa.length >= 7 && (
                <a
                  className="inline-flex items-center justify-center gap-1 rounded-full border border-glass-border px-4 py-2 text-sm text-muted-foreground"
                  href={`https://wa.me/${telWa}?text=${encodeURIComponent(textoDesprendible(empleado.nombre, pIni, pFin, r))}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Send className="h-4 w-4" /> Desprendible por WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {liqs.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">Histórico de liquidaciones</h3>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => exportarExcel("nomina-liquidaciones", ["Empleado", "Periodo", "Neto", "Costo total", "Estado"], liqs.map((l) => [l.empleado_nombre, `${l.periodo_inicio} al ${l.periodo_fin}`, l.neto, l.costo_total, l.estado]))}
                className="rounded-full border border-glass-border px-4 py-1.5 text-sm text-muted-foreground"
              >
                Excel
              </button>
              <button
                type="button"
                onClick={() => imprimirReporte("Liquidaciones de nómina", "Histórico", ["Empleado", "Periodo", "Neto", "Costo total"], liqs.map((l) => [l.empleado_nombre, `${l.periodo_inicio} al ${l.periodo_fin}`, dinero(l.neto), dinero(l.costo_total)]), [])}
                className="rounded-full border border-glass-border px-4 py-1.5 text-sm text-muted-foreground"
              >
                PDF
              </button>
            </div>
          </div>
          {liqs.slice(0, 20).map((l) => (
            <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-glass-border p-3">
              <p className="min-w-0 break-words text-sm text-foreground">
                <span className="font-medium">{l.empleado_nombre}</span>
                <span className="text-muted-foreground"> · {l.periodo_inicio} al {l.periodo_fin} · neto {dinero(l.neto)} · {l.estado}</span>
              </p>
              {l.estado === "liquidada" && (
                <button type="button" onClick={() => void contabilizar(l)} className="rounded-full border border-glass-border px-3 py-1 text-xs text-foreground">
                  Contabilizar
                </button>
              )}
              {l.estado === "contabilizada" && (
                <div className="flex items-center gap-2">
                  <select className="rounded-lg border border-glass-border bg-transparent px-2 py-1 text-base text-foreground" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                    <option value="efectivo">Efectivo (caja)</option>
                    <option value="transferencia">Transferencia (bancos)</option>
                    <option value="tarjeta">Tarjeta</option>
                  </select>
                  <button type="button" onClick={() => void pagar(l)} className="rounded-full border border-glass-border px-3 py-1 text-xs text-foreground">
                    Pagar nómina
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}
