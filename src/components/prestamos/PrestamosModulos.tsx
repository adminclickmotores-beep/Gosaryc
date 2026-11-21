import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";
import { exportarExcel } from "@/lib/exportes";
import { Etiqueta, Indicador, Pestanas, SelectorMetodo, aWhatsapp, diasEntre, hoyISO, msg } from "@/components/negocios/comunes";

type Credito = Tables<"pre_creditos">;
type Cuota = Tables<"pre_cuotas">;
type Abono = Tables<"pre_abonos">;
type Cierre = Tables<"pre_cierres">;
type Vista = "nuevo" | "creditos" | "cobranza" | "cierre";

const FRECUENCIAS = [
  { clave: "diario", texto: "Diario", factor: 1 / 30 },
  { clave: "semanal", texto: "Semanal", factor: 7 / 30 },
  { clave: "quincenal", texto: "Quincenal", factor: 0.5 },
  { clave: "mensual", texto: "Mensual", factor: 1 },
] as const;

const sumarDias = (iso: string, d: number): string => {
  const p = iso.split("-").map(Number);
  const f = new Date(Date.UTC(p[0], p[1] - 1, p[2] + d));
  return f.toISOString().slice(0, 10);
};
const sumarMeses = (iso: string, m: number): string => {
  const p = iso.split("-").map(Number);
  const objetivo = new Date(Date.UTC(p[0], p[1] - 1 + m, 1));
  const ultimo = new Date(Date.UTC(objetivo.getUTCFullYear(), objetivo.getUTCMonth() + 1, 0)).getUTCDate();
  objetivo.setUTCDate(Math.min(p[2], ultimo));
  return objetivo.toISOString().slice(0, 10);
};

type FilaAmort = { numero: number; vence: string; capital: number; interes: number; valor: number; saldo: number };

/** Misma amortización (cuota fija) que calcula la base de datos al desembolsar. */
export function amortizar(monto: number, tasaMensual: number, frec: string, plazo: number, inicio: string): FilaAmort[] {
  if (!(monto > 0) || !(plazo >= 1) || !inicio) return [];
  const factor = FRECUENCIAS.find((f) => f.clave === frec)?.factor ?? 1;
  const i = (tasaMensual / 100) * factor;
  const cuota = i === 0 ? Math.round(monto / plazo) : Math.round((monto * i) / (1 - Math.pow(1 + i, -plazo)));
  let saldo = Math.round(monto);
  const filas: FilaAmort[] = [];
  for (let k = 1; k <= plazo; k++) {
    const interes = Math.round(saldo * i);
    const capital = k === plazo ? saldo : Math.max(Math.min(cuota - interes, saldo), 0);
    saldo -= capital;
    const vence = frec === "diario" ? sumarDias(inicio, k) : frec === "semanal" ? sumarDias(inicio, 7 * k) : frec === "quincenal" ? sumarDias(inicio, 15 * k) : sumarMeses(inicio, k);
    filas.push({ numero: k, vence, capital, interes, valor: capital + interes, saldo });
  }
  return filas;
}

/** Misma fórmula que la base de datos: saldo de la cuota × tasa moratoria mensual × días de atraso / 30, menos la mora ya cobrada. */
export const moraDeCuota = (cuota: Cuota, tasaMora: number, hoy: string): number => {
  if (!hoy || tasaMora <= 0 || cuota.estado === "pagada" || cuota.vence >= hoy) return 0;
  const pendiente = cuota.valor - cuota.capital_pagado - cuota.interes_pagado;
  return Math.max(Math.round((pendiente * tasaMora * diasEntre(cuota.vence, hoy)) / 100 / 30) - cuota.mora_cobrada, 0);
};

function FilaAbono({ cuota, titulo, metodo, hoy, tasaMora, onListo }: { cuota: Cuota; titulo: string; metodo: string; hoy: string; tasaMora: number; onListo: () => void }) {
  const pendiente = cuota.valor - cuota.capital_pagado - cuota.interes_pagado;
  const mora = moraDeCuota(cuota, tasaMora, hoy);
  const [monto, setMonto] = useState(String(pendiente + mora));
  const [ocupado, setOcupado] = useState(false);
  const vencida = !!hoy && cuota.vence < hoy;
  const abonar = async () => {
    setOcupado(true);
    const { data, error } = await supabase.rpc("pre_abonar", { p_cuota: cuota.id, p_monto: num(monto), p_metodo: metodo });
    setOcupado(false);
    if (error) return toast.error(msg(error.message, "No se pudo registrar el abono."));
    const r = (data ?? {}) as { capital?: number; interes?: number; mora?: number };
    toast.success(`Abono registrado: capital ${dinero(r.capital ?? 0)} + interés ${dinero(r.interes ?? 0)} + mora ${dinero(r.mora ?? 0)}. Entró a Caja.`);
    onListo();
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
      <div className="min-w-0">
        <p className="break-words text-sm font-semibold text-foreground">{titulo}</p>
        <p className="text-xs text-muted-foreground">Cuota {cuota.numero} · vence {cuota.vence} · saldo {dinero(pendiente)} (capital {dinero(cuota.capital - cuota.capital_pagado)} + interés {dinero(cuota.interes - cuota.interes_pagado)}){mora > 0 ? ` + mora ${dinero(mora)}` : ""}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {vencida && <Etiqueta texto={`${diasEntre(cuota.vence, hoy)} días vencida`} tono="alerta" />}
        {mora > 0 && <Etiqueta texto={`Mora ${dinero(mora)}`} tono="alerta" />}
        {cuota.estado === "parcial" && <Etiqueta texto="Parcial" tono="info" />}
        <input className={`${campo} !w-32`} inputMode="decimal" aria-label="Valor del abono" value={monto} onChange={(e) => setMonto(e.target.value)} />
        <button type="button" className={boton} disabled={ocupado} onClick={() => void abonar()}>Abonar</button>
      </div>
    </div>
  );
}

function PanelPrestamos({ vistaInicial }: { vistaInicial: Vista }) {
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [creditos, setCreditos] = useState<Credito[]>([]);
  const [pendientes, setPendientes] = useState<Cuota[]>([]);
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [cuotasSel, setCuotasSel] = useState<Cuota[]>([]);
  const [sel, setSel] = useState("");
  const [cargando, setCargando] = useState(true);
  const [hoy, setHoy] = useState("");
  const [cliente, setCliente] = useState("");
  const [tel, setTel] = useState("");
  const [doc, setDoc] = useState("");
  const [cobrador, setCobrador] = useState("");
  const [monto, setMonto] = useState("");
  const [tasa, setTasa] = useState("");
  const [tasaMoraNueva, setTasaMoraNueva] = useState("2");
  const [moraEdit, setMoraEdit] = useState("");
  const [frec, setFrec] = useState("mensual");
  const [plazo, setPlazo] = useState("12");
  const [inicio, setInicio] = useState("");
  const [notas, setNotas] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [guardando, setGuardando] = useState(false);
  const [filtroCob, setFiltroCob] = useState("todos");
  const [soloVencidas, setSoloVencidas] = useState(true);
  const [cobCierre, setCobCierre] = useState("");
  const [fechaCierre, setFechaCierre] = useState("");
  const [entregado, setEntregado] = useState("");

  useEffect(() => {
    const h = hoyISO();
    setHoy(h);
    setInicio(h);
    setFechaCierre(h);
  }, []);

  const cargar = useCallback(async () => {
    const [c, p, a, ci] = await Promise.all([
      supabase.from("pre_creditos").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("pre_cuotas").select("*").neq("estado", "pagada").order("vence").limit(2000),
      supabase.from("pre_abonos").select("*").order("created_at", { ascending: false }).limit(1500),
      supabase.from("pre_cierres").select("*").order("fecha", { ascending: false }).limit(60),
    ]);
    setCreditos(c.data ?? []);
    setPendientes(p.data ?? []);
    setAbonos(a.data ?? []);
    setCierres(ci.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cargarSel = useCallback(async (id: string) => {
    setSel(id);
    if (!id) return setCuotasSel([]);
    const { data } = await supabase.from("pre_cuotas").select("*").eq("credito_id", id).order("numero");
    setCuotasSel(data ?? []);
  }, []);
  const recargar = () => {
    void cargar();
    if (sel) void cargarSel(sel);
  };

  const montoN = Math.round(num(monto));
  const filas = useMemo(() => amortizar(montoN, num(tasa), frec, Math.round(num(plazo)), inicio), [montoN, tasa, frec, plazo, inicio]);
  const totalInteres = filas.reduce((s, f) => s + f.interes, 0);

  const desembolsar = async () => {
    if (cliente.trim().length < 2) return toast.error("Escribe el cliente.");
    if (montoN <= 0) return toast.error("Escribe el monto a prestar.");
    if (num(tasa) < 0 || num(tasa) > 30) return toast.error("La tasa mensual debe estar entre 0 y 30 %.");
    const n = Math.round(num(plazo));
    if (n < 1 || n > 360) return toast.error("El plazo debe estar entre 1 y 360 cuotas.");
    setGuardando(true);
    const { data, error } = await supabase.rpc("pre_crear", {
      p_cliente: cliente.trim(), p_telefono: tel.trim(), p_documento: doc.trim(), p_cobrador: cobrador.trim(), p_monto: montoN,
      p_tasa: num(tasa), p_frecuencia: frec, p_plazo: n, p_inicio: inicio, p_metodo: metodo, p_notas: notas.trim(),
    });
    setGuardando(false);
    if (error) return toast.error(msg(error.message, "No se pudo crear el préstamo."));
    const r = (data ?? {}) as { id?: string; cuota?: number };
    if (r.id && num(tasaMoraNueva) > 0) {
      const { error: errMora } = await supabase.rpc("pre_fijar_mora", { p_credito: r.id, p_tasa: Math.min(num(tasaMoraNueva), 10) });
      if (errMora) toast.error(msg(errMora.message, "El préstamo se creó, pero no se pudo guardar la tasa de mora."));
    }
    toast.success(`Préstamo creado: cuota de ${dinero(r.cuota ?? 0)}. El desembolso salió de Caja y quedó en Contabilidad.`);
    setCliente(""); setTel(""); setDoc(""); setMonto(""); setNotas("");
    await cargar();
    setVista("creditos");
    if (r.id) void cargarSel(r.id);
  };

  const cobradores = useMemo(() => Array.from(new Set(creditos.map((c) => c.cobrador ?? "Sin cobrador"))).sort(), [creditos]);
  const nombreCredito = useCallback((id: string) => creditos.find((c) => c.id === id), [creditos]);

  const porCobrar = useMemo(() => pendientes.filter((c) => {
    if (!hoy) return false;
    const cr = nombreCredito(c.credito_id);
    if (!cr) return false;
    if (filtroCob !== "todos" && (cr.cobrador ?? "Sin cobrador") !== filtroCob) return false;
    return soloVencidas ? c.vence <= hoy : c.vence <= sumarDias(hoy, 7);
  }), [pendientes, hoy, filtroCob, soloVencidas, nombreCredito]);

  const abonosCierre = useMemo(() => abonos.filter((a) => a.fecha === fechaCierre && (cobCierre ? a.cobrador === cobCierre : true)), [abonos, fechaCierre, cobCierre]);
  const efectivoEsperado = abonosCierre.filter((a) => a.metodo === "efectivo").reduce((s, a) => s + a.monto, 0);
  const otrosMetodos = abonosCierre.filter((a) => a.metodo !== "efectivo").reduce((s, a) => s + a.monto, 0);

  const cerrarDia = async () => {
    if (!cobCierre) return toast.error("Elige el cobrador.");
    const { data, error } = await supabase.rpc("pre_cerrar_dia", { p_cobrador: cobCierre, p_fecha: fechaCierre, p_entregado: num(entregado) });
    if (error) return toast.error(msg(error.message, "No se pudo cerrar el día."));
    const r = (data ?? {}) as { diferencia?: number };
    toast.success(`Día cerrado. Diferencia: ${dinero(r.diferencia ?? 0)}.`);
    setEntregado("");
    void cargar();
  };

  if (cargando) return <Cargando />;
  const saldoCapital = creditos.filter((c) => c.estado === "activo").reduce((s, c) => s + c.saldo_capital, 0);
  const vencidasTotal = pendientes.filter((c) => hoy && c.vence < hoy);
  const valorVencido = vencidasTotal.reduce((s, c) => s + (c.valor - c.capital_pagado - c.interes_pagado), 0);
  const credSel = creditos.find((c) => c.id === sel);
  const moraTotal = vencidasTotal.reduce((s, q) => s + moraDeCuota(q, nombreCredito(q.credito_id)?.tasa_mora_pct ?? 0, hoy), 0);
  const guardarMora = async () => {
    if (!credSel) return;
    const t = num(moraEdit);
    if (t < 0 || t > 10) return toast.error("La mora mensual debe estar entre 0 y 10 %.");
    const { error } = await supabase.rpc("pre_fijar_mora", { p_credito: credSel.id, p_tasa: t });
    if (error) return toast.error(msg(error.message, "No se pudo guardar la tasa de mora."));
    toast.success("Tasa de mora actualizada.");
    setMoraEdit("");
    recargar();
  };

  return (
    <div className="space-y-6">
      <Encabezado titulo="Préstamos y cobranza" texto="Simulador con tabla de amortización, desembolso desde Caja, cuotas vencidas, abonos que separan capital e interés y cierre diario de cada cobrador." />
      <Pestanas items={[{ clave: "nuevo", texto: "Simulador y desembolso" }, { clave: "creditos", texto: "Créditos y cronograma" }, { clave: "cobranza", texto: "Cobranza del día" }, { clave: "cierre", texto: "Cierre de cobradores" }]} valor={vista} onChange={setVista} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador titulo="Capital por cobrar" valor={dinero(saldoCapital)} />
        <Indicador titulo="Cuotas vencidas" valor={vencidasTotal.length} nota={dinero(valorVencido)} alerta={vencidasTotal.length > 0} />
        <Indicador titulo="Mora acumulada hoy" valor={dinero(moraTotal)} nota="Según días de atraso y tasa moratoria" alerta={moraTotal > 0} />
        <Indicador titulo="Créditos activos" valor={creditos.filter((c) => c.estado === "activo").length} />
      </div>

      {vista === "nuevo" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Datos del préstamo</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etiqueta="Cliente *"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
              <Campo etiqueta="Documento"><input className={campo} value={doc} onChange={(e) => setDoc(e.target.value)} /></Campo>
              <Campo etiqueta="Teléfono"><input className={campo} inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></Campo>
              <Campo etiqueta="Cobrador">
                <input className={campo} list="lista-cobradores" value={cobrador} onChange={(e) => setCobrador(e.target.value)} />
                <datalist id="lista-cobradores">{cobradores.map((c) => <option key={c} value={c} />)}</datalist>
              </Campo>
              <Campo etiqueta="Monto a prestar *"><input className={campo} inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} /></Campo>
              <Campo etiqueta="Tasa mensual % *"><input className={campo} inputMode="decimal" value={tasa} onChange={(e) => setTasa(e.target.value)} placeholder="Ej. 2.5" /></Campo>
              <Campo etiqueta="Frecuencia de pago">
                <select className={campo} value={frec} onChange={(e) => setFrec(e.target.value)}>{FRECUENCIAS.map((f) => <option key={f.clave} value={f.clave}>{f.texto}</option>)}</select>
              </Campo>
              <Campo etiqueta="Número de cuotas"><input className={campo} inputMode="numeric" value={plazo} onChange={(e) => setPlazo(e.target.value)} /></Campo>
              <Campo etiqueta="Tasa de mora mensual % (0 a 10)"><input className={campo} inputMode="decimal" value={tasaMoraNueva} onChange={(e) => setTasaMoraNueva(e.target.value)} placeholder="Ej. 2" /></Campo>
              <Campo etiqueta="Fecha del desembolso"><input type="date" className={campo} value={inicio} onChange={(e) => setInicio(e.target.value)} /></Campo>
              <Campo etiqueta="Desembolsar desde"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
              <Campo etiqueta="Notas / garantía"><input className={campo} value={notas} onChange={(e) => setNotas(e.target.value)} /></Campo>
            </div>
            {filas.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-3">
                <Indicador titulo="Cuota" valor={dinero(filas[0].valor)} />
                <Indicador titulo="Total de intereses" valor={dinero(totalInteres)} />
                <Indicador titulo="Total a pagar" valor={dinero(montoN + totalInteres)} />
              </div>
            )}
            <button type="button" className={boton} disabled={guardando} onClick={() => void desembolsar()}>{guardando ? "Desembolsando…" : "Desembolsar y crear cronograma"}</button>
          </GlassPanel>
          {filas.length > 0 && (
            <GlassPanel className="space-y-2 p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">Tabla de amortización (simulación)</h2>
                <button type="button" className={botonSec} onClick={() => exportarExcel("amortizacion", ["Cuota", "Vence", "Capital", "Interés", "Valor", "Saldo"], filas.map((f) => [f.numero, f.vence, f.capital, f.interes, f.valor, f.saldo]))}>Descargar Excel</button>
              </div>
              <div className="max-h-96 overflow-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="text-xs text-muted-foreground"><tr><th className="py-1">#</th><th>Vence</th><th>Capital</th><th>Interés</th><th>Cuota</th><th>Saldo</th></tr></thead>
                  <tbody>{filas.map((f) => <tr key={f.numero} className="border-t border-glass-border"><td className="py-1">{f.numero}</td><td>{f.vence}</td><td>{dinero(f.capital)}</td><td>{dinero(f.interes)}</td><td>{dinero(f.valor)}</td><td>{dinero(f.saldo)}</td></tr>)}</tbody>
                </table>
              </div>
            </GlassPanel>
          )}
        </>
      )}

      {vista === "creditos" && (
        <div className="space-y-4">
          <GlassPanel className="space-y-2 p-4">
            {creditos.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay préstamos.</p> : creditos.map((c) => {
              const atrasadas = pendientes.filter((q) => q.credito_id === c.id && hoy && q.vence < hoy).length;
              return (
                <button key={c.id} type="button" onClick={() => void cargarSel(c.id === sel ? "" : c.id)} className={`flex w-full flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-left ${c.id === sel ? "border-primary" : "border-glass-border"}`}>
                  <span className="min-w-0"><span className="block break-words text-sm font-semibold text-foreground">{c.cliente}</span><span className="block text-xs text-muted-foreground">{dinero(c.monto)} · {c.plazo} cuotas {c.frecuencia}s · {c.tasa_pct} % mensual · mora {c.tasa_mora_pct} % · cobrador {c.cobrador ?? "—"}</span></span>
                  <span className="flex flex-wrap items-center gap-2"><span className="text-sm text-foreground">Saldo {dinero(c.saldo_capital)}</span>{atrasadas > 0 && <Etiqueta texto={`${atrasadas} vencida(s)`} tono="alerta" />}{c.estado === "pagado" && <Etiqueta texto="Pagado" tono="ok" />}</span>
                </button>
              );
            })}
          </GlassPanel>
          {credSel && (
            <GlassPanel className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-foreground">Cronograma de {credSel.cliente}</h2>
                <div className="flex flex-wrap gap-2">
                  <SelectorMetodo valor={metodo} onChange={setMetodo} />
                  <button type="button" className={botonSec} onClick={() => { const u = aWhatsapp(credSel.telefono, `Hola ${credSel.cliente}, te recordamos tu cuota de ${dinero(credSel.cuota)}.`); if (u) window.open(u, "_blank", "noopener"); else toast.error("Sin teléfono."); }}>Recordar por WhatsApp</button>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <Campo etiqueta={`Tasa de mora mensual % (actual ${credSel.tasa_mora_pct} %)`}><input className={`${campo} !w-32`} inputMode="decimal" value={moraEdit} onChange={(e) => setMoraEdit(e.target.value)} /></Campo>
                <button type="button" className={botonSec} disabled={moraEdit === ""} onClick={() => void guardarMora()}>Guardar tasa de mora</button>
              </div>
              {cuotasSel.map((q) => q.estado === "pagada"
                ? <p key={q.id} className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground"><span>Cuota {q.numero} · {q.vence}</span><span>Pagada · {dinero(q.valor)}</span></p>
                : <FilaAbono key={q.id} cuota={q} titulo={credSel.cliente} metodo={metodo} hoy={hoy} tasaMora={credSel.tasa_mora_pct} onListo={recargar} />)}
            </GlassPanel>
          )}
        </div>
      )}

      {vista === "cobranza" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <Campo etiqueta="Cobrador"><select className={campo} value={filtroCob} onChange={(e) => setFiltroCob(e.target.value)}><option value="todos">Todos</option>{cobradores.map((c) => <option key={c} value={c}>{c}</option>)}</select></Campo>
            <Campo etiqueta="Mostrar"><select className={campo} value={soloVencidas ? "v" : "s"} onChange={(e) => setSoloVencidas(e.target.value === "v")}><option value="v">Vencidas y de hoy</option><option value="s">Hasta los próximos 7 días</option></select></Campo>
            <Campo etiqueta="Recibir con"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
          </div>
          <GlassPanel className="space-y-2 p-4">
            {porCobrar.length === 0 ? <p className="text-sm text-muted-foreground">No hay cuotas por cobrar con este filtro.</p> : porCobrar.map((q) => (
              <FilaAbono key={q.id} cuota={q} titulo={`${nombreCredito(q.credito_id)?.cliente ?? "Cliente"} · ${nombreCredito(q.credito_id)?.cobrador ?? "Sin cobrador"}`} metodo={metodo} hoy={hoy} tasaMora={nombreCredito(q.credito_id)?.tasa_mora_pct ?? 0} onListo={recargar} />
            ))}
          </GlassPanel>
        </div>
      )}

      {vista === "cierre" && (
        <div className="space-y-4">
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Arqueo y cierre diario del cobrador</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo etiqueta="Cobrador"><select className={campo} value={cobCierre} onChange={(e) => setCobCierre(e.target.value)}><option value="">Elige…</option>{cobradores.map((c) => <option key={c} value={c}>{c}</option>)}</select></Campo>
              <Campo etiqueta="Fecha"><input type="date" className={campo} value={fechaCierre} onChange={(e) => setFechaCierre(e.target.value)} /></Campo>
              <Campo etiqueta="Efectivo entregado"><input className={campo} inputMode="decimal" value={entregado} onChange={(e) => setEntregado(e.target.value)} /></Campo>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Indicador titulo="Efectivo esperado" valor={dinero(efectivoEsperado)} />
              <Indicador titulo="Transferencias y tarjeta" valor={dinero(otrosMetodos)} nota="No se suman al efectivo" />
              <Indicador titulo="Diferencia" valor={dinero(Math.round(num(entregado)) - efectivoEsperado)} alerta={Math.round(num(entregado)) !== efectivoEsperado && entregado !== ""} />
            </div>
            <p className="text-xs text-muted-foreground">Abonos del día: {abonosCierre.length} · capital {dinero(abonosCierre.reduce((s, a) => s + a.capital, 0))} · interés {dinero(abonosCierre.reduce((s, a) => s + a.interes, 0))} · mora {dinero(abonosCierre.reduce((s, a) => s + a.mora, 0))}</p>
            <button type="button" className={boton} onClick={() => void cerrarDia()}>Cerrar día del cobrador</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            <h2 className="text-sm font-semibold text-foreground">Cierres anteriores</h2>
            {cierres.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay cierres.</p> : cierres.map((c) => (
              <p key={c.id} className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
                <span>{c.fecha} · {c.cobrador}</span>
                <span className={c.diferencia === 0 ? "text-foreground" : "text-destructive"}>Esperado {dinero(c.esperado)} · entregó {dinero(c.entregado)} · dif. {dinero(c.diferencia)}</span>
              </p>
            ))}
          </GlassPanel>
        </div>
      )}
    </div>
  );
}

export function PrestamosCreditos() {
  return <PanelPrestamos vistaInicial="nuevo" />;
}
export function PrestamosCronograma() {
  return <PanelPrestamos vistaInicial="creditos" />;
}
export function PrestamosCobranza() {
  return <PanelPrestamos vistaInicial="cobranza" />;
}
