import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Briefcase, Calculator, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

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
    const { data, error } = await supabase
      .from("modulo_registros")
      .select("titulo, estado, monto")
      .eq("modulo", "equipo_turnos");
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
