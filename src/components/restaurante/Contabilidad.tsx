import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Trash2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { exportarExcel, imprimirReporte } from "@/lib/exportes";
import { CargaModulo } from "@/components/carga/CargaModulo";
import { LIMITE_CONSULTA } from "@/lib/rendimiento";

// Contador Pro es el panel más pesado: se difiere hasta que hay plan de cuentas.
const ContadorPro = lazy(() =>
  import("@/components/fiscal/ContadorPro").then((m) => ({ default: m.ContadorPro })),
);

type Cuenta = Tables<"cuentas_contables">;
type Asiento = Tables<"asientos_contables">;
type TipoCuenta = "activo" | "pasivo" | "ingreso" | "gasto";
type Vista = "diario" | "mayor" | "balance" | "cuentas";

const TIPOS: { clave: TipoCuenta; texto: string }[] = [
  { clave: "activo", texto: "Activo" },
  { clave: "pasivo", texto: "Pasivo" },
  { clave: "ingreso", texto: "Ingreso" },
  { clave: "gasto", texto: "Gasto" },
];

const PLAN_BASICO: { codigo: string; nombre: string; tipo: TipoCuenta }[] = [
  { codigo: "1105", nombre: "Caja", tipo: "activo" },
  { codigo: "1110", nombre: "Bancos", tipo: "activo" },
  { codigo: "1305", nombre: "Cuentas por cobrar", tipo: "activo" },
  { codigo: "1435", nombre: "Inventario de insumos", tipo: "activo" },
  { codigo: "2205", nombre: "Proveedores por pagar", tipo: "pasivo" },
  { codigo: "2505", nombre: "Nómina por pagar", tipo: "pasivo" },
  { codigo: "4135", nombre: "Ventas", tipo: "ingreso" },
  { codigo: "4210", nombre: "Otros ingresos", tipo: "ingreso" },
  { codigo: "5105", nombre: "Nómina", tipo: "gasto" },
  { codigo: "5120", nombre: "Arriendo", tipo: "gasto" },
  { codigo: "5135", nombre: "Servicios públicos", tipo: "gasto" },
  { codigo: "6135", nombre: "Compras de insumos", tipo: "gasto" },
  { codigo: "5195", nombre: "Otros gastos", tipo: "gasto" },
];

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full min-w-0 rounded-lg border border-glass-border bg-glass/40 px-3 py-2 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const hoy = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const esDeudora = (t: string) => t === "activo" || t === "gasto";

type Linea = { cuenta_id: string; debe: string; haber: string };
const lineaVacia = (): Linea => ({ cuenta_id: "", debe: "", haber: "" });
const num = (s: string) => {
  const v = Number(s.replace(",", "."));
  return Number.isFinite(v) && v > 0 ? v : 0;
};

export function Contabilidad() {
  const [cuentas, setCuentas] = useState<Cuenta[]>([]);
  const [filas, setFilas] = useState<Asiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<Vista>("diario");

  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [fCuenta, setFCuenta] = useState("");
  const [fTipo, setFTipo] = useState<"" | TipoCuenta>("");

  const [abierto, setAbierto] = useState(false);
  const [fecha, setFecha] = useState(hoy());
  const [concepto, setConcepto] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([lineaVacia(), lineaVacia()]);
  const [guardando, setGuardando] = useState(false);

  const [nCodigo, setNCodigo] = useState("");
  const [nNombre, setNNombre] = useState("");
  const [nTipo, setNTipo] = useState<TipoCuenta>("activo");

  const cargar = useCallback(async () => {
    // Paginación real: el diario muestra lo reciente; el resto se filtra por fecha.
    const [c, a] = await Promise.all([
      supabase.from("cuentas_contables").select("*").order("codigo").limit(LIMITE_CONSULTA),
      supabase
        .from("asientos_contables")
        .select("*")
        .eq("anulado", false)
        .order("fecha", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(LIMITE_CONSULTA),
    ]);
    if (c.error || a.error) toast.error("No se pudo cargar la contabilidad.");
    setCuentas(c.data ?? []);
    setFilas(a.data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cuentaPorId = useMemo(() => new Map(cuentas.map((c) => [c.id, c])), [cuentas]);

  // Saldo acumulado por cuenta sobre TODO el historial (no cambia al filtrar).
  const conSaldo = useMemo(() => {
    const acum = new Map<string, number>();
    return filas.map((f) => {
      const cuenta = cuentaPorId.get(f.cuenta_id);
      const mov = cuenta && !esDeudora(cuenta.tipo) ? f.haber - f.debe : f.debe - f.haber;
      const saldo = (acum.get(f.cuenta_id) ?? 0) + mov;
      acum.set(f.cuenta_id, saldo);
      return { fila: f, cuenta, saldo };
    });
  }, [filas, cuentaPorId]);

  const filtradas = useMemo(
    () =>
      conSaldo.filter(({ fila, cuenta }) => {
        if (desde && fila.fecha < desde) return false;
        if (hasta && fila.fecha > hasta) return false;
        if (fCuenta && fila.cuenta_id !== fCuenta) return false;
        if (fTipo && cuenta?.tipo !== fTipo) return false;
        return true;
      }),
    [conSaldo, desde, hasta, fCuenta, fTipo],
  );

  const totales = useMemo(() => {
    let ingresos = 0;
    let gastos = 0;
    for (const { fila, cuenta } of filtradas) {
      if (cuenta?.tipo === "ingreso") ingresos += fila.haber - fila.debe;
      if (cuenta?.tipo === "gasto") gastos += fila.debe - fila.haber;
    }
    return { ingresos, gastos, resultado: ingresos - gastos };
  }, [filtradas]);

  // Balance de sumas y saldos (con los filtros de fecha).
  const balance = useMemo(() => {
    const m = new Map<string, { debe: number; haber: number }>();
    for (const { fila } of conSaldo) {
      if (desde && fila.fecha < desde) continue;
      if (hasta && fila.fecha > hasta) continue;
      const x = m.get(fila.cuenta_id) ?? { debe: 0, haber: 0 };
      x.debe += fila.debe;
      x.haber += fila.haber;
      m.set(fila.cuenta_id, x);
    }
    const lista = cuentas
      .filter((c) => m.has(c.id))
      .map((c) => {
        const x = m.get(c.id) ?? { debe: 0, haber: 0 };
        return { cuenta: c, debe: x.debe, haber: x.haber };
      });
    const td = lista.reduce((s, x) => s + x.debe, 0);
    const th = lista.reduce((s, x) => s + x.haber, 0);
    return { lista, td, th };
  }, [conSaldo, cuentas, desde, hasta]);

  const sumaDebe = lineas.reduce((s, l) => s + num(l.debe), 0);
  const sumaHaber = lineas.reduce((s, l) => s + num(l.haber), 0);
  const cuadra = sumaDebe > 0 && Math.abs(sumaDebe - sumaHaber) < 0.005;

  const cambiarLinea = (i: number, parche: Partial<Linea>) =>
    setLineas((ls) => ls.map((l, k) => (k === i ? { ...l, ...parche } : l)));

  const guardarAsiento = async () => {
    if (!concepto.trim()) return toast.error("Escribe el concepto del asiento.");
    const validas = lineas.filter((l) => l.cuenta_id || num(l.debe) || num(l.haber));
    if (validas.length < 2) return toast.error("Un asiento necesita al menos dos líneas.");
    if (validas.some((l) => !l.cuenta_id)) return toast.error("Elige la cuenta en cada línea.");
    if (validas.some((l) => num(l.debe) > 0 && num(l.haber) > 0))
      return toast.error("Cada línea va en el debe o en el haber, no en ambos.");
    if (validas.some((l) => !num(l.debe) && !num(l.haber))) return toast.error("Cada línea necesita un valor.");
    if (!cuadra) return toast.error("El asiento no cuadra: el debe y el haber deben sumar lo mismo.");
    setGuardando(true);
    const asientoId = crypto.randomUUID();
    const { error } = await supabase.from("asientos_contables").insert(
      validas.map((l) => ({
        asiento_id: asientoId,
        fecha,
        cuenta_id: l.cuenta_id,
        concepto: concepto.trim(),
        debe: num(l.debe),
        haber: num(l.haber),
      })),
    );
    setGuardando(false);
    if (error) return toast.error("No se pudo guardar el asiento.");
    toast.success("Asiento guardado.");
    setConcepto("");
    setLineas([lineaVacia(), lineaVacia()]);
    setAbierto(false);
    void cargar();
  };

  const borrarAsiento = async (asientoId: string) => {
    // Los asientos no se borran: se anulan con motivo y queda registrada la auditoría (solo el dueño).
    const motivo = window.prompt("Motivo de la anulación del asiento (obligatorio):")?.trim();
    if (!motivo) return toast.error("Sin motivo no se puede anular.");
    const { error } = await supabase
      .from("asientos_contables")
      .update({ anulado: true, motivo_anulacion: motivo })
      .eq("asiento_id", asientoId);
    if (error) return toast.error("No se pudo anular el asiento. Solo el dueño del negocio puede hacerlo.");
    toast.success("Asiento anulado.");
    void cargar();
  };

  const crearCuenta = async () => {
    if (!nCodigo.trim() || !nNombre.trim()) return toast.error("Escribe código y nombre.");
    const { error } = await supabase
      .from("cuentas_contables")
      .insert({ codigo: nCodigo.trim(), nombre: nNombre.trim(), tipo: nTipo });
    if (error) return toast.error("No se pudo crear la cuenta.");
    setNCodigo("");
    setNNombre("");
    void cargar();
  };

  const borrarCuenta = async (c: Cuenta) => {
    if (filas.some((f) => f.cuenta_id === c.id)) return toast.error("Esa cuenta ya tiene movimientos.");
    const { error } = await supabase.from("cuentas_contables").delete().eq("id", c.id);
    if (error) return toast.error("No se pudo eliminar la cuenta.");
    void cargar();
  };

  const cargarPlanBasico = async () => {
    const faltantes = PLAN_BASICO.filter((p) => !cuentas.some((c) => c.codigo === p.codigo));
    if (faltantes.length === 0) return toast.success("Tu plan de cuentas ya está completo.");
    const { error } = await supabase.from("cuentas_contables").insert(faltantes);
    if (error) return toast.error("No se pudo crear el plan de cuentas.");
    toast.success("Plan de cuentas básico creado.");
    void cargar();
  };

  const nombreCuenta = (c: Cuenta | undefined) => (c ? `${c.codigo} · ${c.nombre}` : "—");

  const vistas: { clave: Vista; texto: string }[] = [
    { clave: "diario", texto: "Libro diario" },
    { clave: "mayor", texto: "Libro mayor" },
    { clave: "balance", texto: "Balance" },
    { clave: "cuentas", texto: "Cuentas" },
  ];

  const mayor = useMemo(() => {
    const grupos = new Map<string, typeof filtradas>();
    for (const x of filtradas) {
      const g = grupos.get(x.fila.cuenta_id) ?? [];
      g.push(x);
      grupos.set(x.fila.cuenta_id, g);
    }
    return cuentas.filter((c) => grupos.has(c.id)).map((c) => ({ cuenta: c, movs: grupos.get(c.id) ?? [] }));
  }, [filtradas, cuentas]);

  const tituloVista = vistas.find((v) => v.clave === vista)?.texto ?? "Reporte";
  const rangoTxt = `Del ${desde || "inicio"} al ${hasta || "hoy"}`;

  const exportarVistaExcel = () => {
    if (vista === "diario")
      exportarExcel("libro-diario", ["Fecha", "Cuenta", "Concepto", "Debe", "Haber", "Saldo"],
        filtradas.map(({ fila, cuenta, saldo }) => [fila.fecha, nombreCuenta(cuenta), fila.concepto ?? "", fila.debe, fila.haber, Math.round(saldo * 100) / 100]));
    else if (vista === "mayor")
      exportarExcel("libro-mayor", ["Cuenta", "Fecha", "Concepto", "Debe", "Haber"],
        mayor.flatMap(({ cuenta, movs }) => movs.map(({ fila }) => [`${cuenta.codigo} ${cuenta.nombre}`, fila.fecha, fila.concepto ?? "", fila.debe, fila.haber])));
    else if (vista === "balance")
      exportarExcel("balance", ["Código", "Cuenta", "Tipo", "Debe", "Haber"],
        [...balance.lista.map(({ cuenta, debe, haber }) => [cuenta.codigo, cuenta.nombre, cuenta.tipo, debe, haber] as (string | number)[]),
          ["TOTAL", "", "", balance.td, balance.th]]);
    else
      exportarExcel("plan-cuentas", ["Código", "Nombre", "Tipo"], cuentas.map((c) => [c.codigo, c.nombre, c.tipo]));
  };

  const exportarVistaPdf = () => {
    if (vista === "diario")
      imprimirReporte("Libro diario", rangoTxt, ["Fecha", "Cuenta", "Concepto", "Debe", "Haber"],
        filtradas.map(({ fila, cuenta }) => [fila.fecha, nombreCuenta(cuenta), fila.concepto ?? "", dinero(fila.debe), dinero(fila.haber)]),
        [`Resultado del periodo: ${dinero(totales.resultado)} (ingresos ${dinero(totales.ingresos)} - gastos ${dinero(totales.gastos)})`]);
    else if (vista === "mayor")
      imprimirReporte("Libro mayor", rangoTxt, ["Cuenta", "Fecha", "Concepto", "Debe", "Haber"],
        mayor.flatMap(({ cuenta, movs }) => movs.map(({ fila }) => [`${cuenta.codigo} ${cuenta.nombre}`, fila.fecha, fila.concepto ?? "", dinero(fila.debe), dinero(fila.haber)])));
    else if (vista === "balance")
      imprimirReporte("Balance de sumas y saldos", rangoTxt, ["Código", "Cuenta", "Tipo", "Debe", "Haber"],
        balance.lista.map(({ cuenta, debe, haber }) => [cuenta.codigo, cuenta.nombre, cuenta.tipo, dinero(debe), dinero(haber)]),
        [`Total debe: ${dinero(balance.td)} · Total haber: ${dinero(balance.th)}`]);
    else
      imprimirReporte("Plan de cuentas", "Catálogo contable del negocio", ["Código", "Nombre", "Tipo"],
        cuentas.map((c) => [c.codigo, c.nombre, c.tipo]));
    void tituloVista;
  };

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 font-display text-2xl text-foreground">
        <BookOpen className="h-6 w-6 text-primary" /> Registro contable
      </h2>

      {/* Filtros */}
      <GlassPanel className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
        <label className="space-y-1 text-xs text-muted-foreground">
          Desde
          <input type="date" className={campo} value={desde} onChange={(e) => setDesde(e.target.value)} />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Hasta
          <input type="date" className={campo} value={hasta} onChange={(e) => setHasta(e.target.value)} />
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Cuenta
          <select className={campo} value={fCuenta} onChange={(e) => setFCuenta(e.target.value)}>
            <option value="">Todas</option>
            {cuentas.map((c) => (
              <option key={c.id} value={c.id}>
                {nombreCuenta(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-xs text-muted-foreground">
          Tipo
          <select className={campo} value={fTipo} onChange={(e) => setFTipo(e.target.value as "" | TipoCuenta)}>
            <option value="">Todos</option>
            {TIPOS.map((t) => (
              <option key={t.clave} value={t.clave}>
                {t.texto}
              </option>
            ))}
          </select>
        </label>
      </GlassPanel>

      {/* Totales */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <GlassPanel className="p-4">
          <p className="text-xs text-muted-foreground">Ingresos</p>
          <p className="truncate font-display text-xl text-foreground">{dinero(totales.ingresos)}</p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-xs text-muted-foreground">Gastos</p>
          <p className="truncate font-display text-xl text-foreground">{dinero(totales.gastos)}</p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-xs text-muted-foreground">Resultado</p>
          <p className={`truncate font-display text-xl ${totales.resultado < 0 ? "text-destructive" : "text-primary"}`}>
            {dinero(totales.resultado)}
          </p>
        </GlassPanel>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        {vistas.map((v) => (
          <button
            key={v.clave}
            onClick={() => setVista(v.clave)}
            className={`rounded-full px-4 py-1.5 ${vista === v.clave ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`}
          >
            {v.texto}
          </button>
        ))}
      </div>

      {/* Exportar la vista actual */}
      <div className="flex flex-wrap gap-2 text-sm">
        <button onClick={exportarVistaExcel} className="rounded-full border border-glass-border px-4 py-1.5 text-muted-foreground">
          Exportar a Excel
        </button>
        <button onClick={exportarVistaPdf} className="rounded-full border border-glass-border px-4 py-1.5 text-muted-foreground">
          Exportar a PDF
        </button>
      </div>

      {cargando && <p className="text-sm text-muted-foreground">Cargando…</p>}

      {!cargando && cuentas.length === 0 && vista !== "cuentas" && (
        <GlassPanel className="space-y-3 p-4 text-sm">
          <p className="text-muted-foreground">Aún no tienes plan de cuentas. Puedes empezar con uno básico y editarlo.</p>
          <button onClick={cargarPlanBasico} className="rounded-full bg-primary px-4 py-2 text-primary-foreground">
            Crear plan de cuentas básico
          </button>
        </GlassPanel>
      )}

      {/* Libro diario */}
      {!cargando && vista === "diario" && cuentas.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setAbierto((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground"
          >
            <Plus className="h-4 w-4" /> Nuevo asiento
          </button>

          {abierto && (
            <GlassPanel className="space-y-3 p-4">
              <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                <input type="date" className={campo} value={fecha} onChange={(e) => setFecha(e.target.value)} />
                <input
                  className={campo}
                  placeholder="Concepto (ej. Pago de arriendo)"
                  value={concepto}
                  onChange={(e) => setConcepto(e.target.value)}
                />
              </div>
              {lineas.map((l, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 border-t border-glass-border pt-3 sm:grid-cols-[1fr_8rem_8rem_auto]">
                  <select
                    className={`${campo} col-span-2 sm:col-span-1`}
                    value={l.cuenta_id}
                    onChange={(e) => cambiarLinea(i, { cuenta_id: e.target.value })}
                  >
                    <option value="">Cuenta…</option>
                    {cuentas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {nombreCuenta(c)}
                      </option>
                    ))}
                  </select>
                  <input
                    className={campo}
                    inputMode="decimal"
                    placeholder="Debe"
                    value={l.debe}
                    onChange={(e) => cambiarLinea(i, { debe: e.target.value })}
                  />
                  <input
                    className={campo}
                    inputMode="decimal"
                    placeholder="Haber"
                    value={l.haber}
                    onChange={(e) => cambiarLinea(i, { haber: e.target.value })}
                  />
                  <button
                    type="button"
                    aria-label="Quitar línea"
                    disabled={lineas.length <= 2}
                    onClick={() => setLineas((ls) => ls.filter((_, k) => k !== i))}
                    className="col-span-2 flex items-center justify-center rounded-lg border border-glass-border px-3 text-muted-foreground disabled:opacity-40 sm:col-span-1"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setLineas((ls) => [...ls, lineaVacia()])}
                className="text-sm text-primary hover:underline"
              >
                + Agregar línea
              </button>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-glass-border pt-3 text-sm">
                <span className={cuadra ? "text-primary" : "text-destructive"}>
                  Debe {dinero(sumaDebe)} · Haber {dinero(sumaHaber)} {cuadra ? "· Cuadra" : "· No cuadra"}
                </span>
                <button
                  onClick={guardarAsiento}
                  disabled={guardando || !cuadra}
                  className="rounded-full bg-primary px-5 py-2 text-primary-foreground disabled:opacity-50"
                >
                  {guardando ? "Guardando…" : "Guardar asiento"}
                </button>
              </div>
            </GlassPanel>
          )}

          <GlassPanel className="overflow-x-auto p-0">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">Fecha</th>
                  <th className="p-3">Cuenta</th>
                  <th className="p-3">Concepto</th>
                  <th className="p-3">Tipo</th>
                  <th className="p-3 text-right">Debe</th>
                  <th className="p-3 text-right">Haber</th>
                  <th className="p-3 text-right">Saldo</th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {filtradas.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-4 text-center text-muted-foreground">
                      Sin asientos en este filtro.
                    </td>
                  </tr>
                )}
                {[...filtradas].reverse().map(({ fila, cuenta, saldo }) => (
                  <tr key={fila.id} className="border-t border-glass-border text-foreground">
                    <td className="whitespace-nowrap p-3">{fila.fecha}</td>
                    <td className="p-3">{nombreCuenta(cuenta)}</td>
                    <td className="p-3">{fila.concepto}</td>
                    <td className="p-3 capitalize text-muted-foreground">{cuenta?.tipo ?? "—"}</td>
                    <td className="p-3 text-right">{fila.debe ? dinero(fila.debe) : ""}</td>
                    <td className="p-3 text-right">{fila.haber ? dinero(fila.haber) : ""}</td>
                    <td className="p-3 text-right">{dinero(saldo)}</td>
                    <td className="p-3 text-right">
                      <button
                        aria-label="Eliminar asiento"
                        onClick={() => borrarAsiento(fila.asiento_id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassPanel>
        </div>
      )}

      {/* Libro mayor */}
      {!cargando && vista === "mayor" && cuentas.length > 0 && (
        <div className="space-y-3">
          {mayor.length === 0 && <p className="text-sm text-muted-foreground">Sin movimientos en este filtro.</p>}
          {mayor.map(({ cuenta, movs }) => (
            <GlassPanel key={cuenta.id} className="overflow-x-auto p-0">
              <p className="p-3 font-medium text-foreground">
                {nombreCuenta(cuenta)} <span className="text-xs capitalize text-muted-foreground">({cuenta.tipo})</span>
              </p>
              <table className="w-full min-w-[560px] text-sm">
                <tbody>
                  {movs.map(({ fila, saldo }) => (
                    <tr key={fila.id} className="border-t border-glass-border text-foreground">
                      <td className="whitespace-nowrap p-3">{fila.fecha}</td>
                      <td className="p-3">{fila.concepto}</td>
                      <td className="p-3 text-right">{fila.debe ? dinero(fila.debe) : ""}</td>
                      <td className="p-3 text-right">{fila.haber ? dinero(fila.haber) : ""}</td>
                      <td className="p-3 text-right">{dinero(saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </GlassPanel>
          ))}
        </div>
      )}

      {/* Balance de comprobación */}
      {!cargando && vista === "balance" && cuentas.length > 0 && (
        <GlassPanel className="overflow-x-auto p-0">
          <table className="w-full min-w-[480px] text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Cuenta</th>
                <th className="p-3 text-right">Debe</th>
                <th className="p-3 text-right">Haber</th>
              </tr>
            </thead>
            <tbody>
              {balance.lista.map((x) => (
                <tr key={x.cuenta.id} className="border-t border-glass-border text-foreground">
                  <td className="p-3">{nombreCuenta(x.cuenta)}</td>
                  <td className="p-3 text-right">{dinero(x.debe)}</td>
                  <td className="p-3 text-right">{dinero(x.haber)}</td>
                </tr>
              ))}
              <tr className="border-t border-glass-border font-medium text-foreground">
                <td className="p-3">
                  Sumas{" "}
                  <span className={Math.abs(balance.td - balance.th) < 0.005 ? "text-primary" : "text-destructive"}>
                    {Math.abs(balance.td - balance.th) < 0.005 ? "(comprobado)" : "(descuadrado)"}
                  </span>
                </td>
                <td className="p-3 text-right">{dinero(balance.td)}</td>
                <td className="p-3 text-right">{dinero(balance.th)}</td>
              </tr>
            </tbody>
          </table>
        </GlassPanel>
      )}

      {/* Plan de cuentas */}
      {!cargando && vista === "cuentas" && (
        <div className="space-y-3">
          <GlassPanel className="grid gap-2 p-4 sm:grid-cols-[7rem_1fr_9rem_auto]">
            <input className={campo} placeholder="Código" value={nCodigo} onChange={(e) => setNCodigo(e.target.value)} />
            <input className={campo} placeholder="Nombre" value={nNombre} onChange={(e) => setNNombre(e.target.value)} />
            <select className={campo} value={nTipo} onChange={(e) => setNTipo(e.target.value as TipoCuenta)}>
              {TIPOS.map((t) => (
                <option key={t.clave} value={t.clave}>
                  {t.texto}
                </option>
              ))}
            </select>
            <button onClick={crearCuenta} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">
              Agregar
            </button>
          </GlassPanel>
          {cuentas.length === 0 && (
            <button onClick={cargarPlanBasico} className="rounded-full border border-glass-border px-4 py-2 text-sm text-foreground">
              Crear plan de cuentas básico
            </button>
          )}
          <div className="space-y-2">
            {cuentas.map((c) => (
              <GlassPanel key={c.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <span className="min-w-0 break-words text-foreground">{nombreCuenta(c)}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className="capitalize text-muted-foreground">{c.tipo}</span>
                  <button
                    aria-label="Eliminar cuenta"
                    onClick={() => borrarCuenta(c)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </span>
              </GlassPanel>
            ))}
          </div>
        </div>
      )}

      {/* Contador Pro Colombia: vencimientos, impuestos, exógena y normativa */}
      {!cargando && cuentas.length > 0 && (
        <Suspense fallback={<CargaModulo texto="Cargando Contador Pro…" />}>
          <ContadorPro cuentas={cuentas} filas={filas} />
        </Suspense>
      )}
    </section>
  );
}
