import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDownCircle, ArrowLeft, ArrowUpCircle, Banknote, Ban, Lock, Printer, Unlock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { usePermisos } from "@/hooks/use-permisos";
import { ResumenCierreWhatsApp } from "@/components/restaurante/Reportes";
import { leerSucursalActual } from "@/lib/sucursales";
import { escaparHtml } from "@/lib/exportes";

type Turno = Tables<"turnos_caja">;
type Mov = Tables<"movimientos_turno">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const TIPOS = [
  { clave: "venta", texto: "Venta", entra: true },
  { clave: "ingreso", texto: "Otro ingreso", entra: true },
  { clave: "gasto", texto: "Gasto", entra: false },
  { clave: "retiro", texto: "Retiro a caja fuerte", entra: false },
];
const METODOS = [
  { clave: "efectivo", texto: "Efectivo" },
  { clave: "transferencia", texto: "Transferencia (Nequi, Daviplata, Bre-B)" },
  { clave: "tarjeta", texto: "Tarjeta" },
];
const CATEGORIAS_GASTO = ["Arriendo", "Servicios", "Nómina", "Proveedores", "Transporte", "Mantenimiento", "Otros"];

const esc = escaparHtml;
const entra = (tipo: string) => TIPOS.find((t) => t.clave === tipo)?.entra ?? false;

function resumen(turno: Turno, movs: Mov[]) {
  const vivos = movs.filter((m) => !m.anulado);
  const suma = (f: (m: Mov) => boolean) => vivos.filter(f).reduce((s, m) => s + m.monto, 0);
  const ingEf = suma((m) => entra(m.tipo) && m.metodo === "efectivo");
  const egrEf = suma((m) => !entra(m.tipo) && m.metodo === "efectivo");
  return {
    ingEf,
    egrEf,
    transf: suma((m) => entra(m.tipo) && m.metodo === "transferencia"),
    tarjeta: suma((m) => entra(m.tipo) && m.metodo === "tarjeta"),
    nEf: vivos.filter((m) => entra(m.tipo) && m.metodo === "efectivo").length,
    nTransf: vivos.filter((m) => entra(m.tipo) && m.metodo === "transferencia").length,
    nTarj: vivos.filter((m) => entra(m.tipo) && m.metodo === "tarjeta").length,
    ventas: suma((m) => m.tipo === "venta"),
    gastos: suma((m) => m.tipo === "gasto"),
    retiros: suma((m) => m.tipo === "retiro"),
    // Efectivo esperado = base inicial + ventas y abonos en efectivo − gastos/retiros/devoluciones en efectivo (sin Nequi ni datáfono).
    esperado: Math.round((turno.fondo_inicial + ingEf - egrEf) * 100) / 100,
  };
}

export function CajaTurnos() {
  const { negocio } = useNegocio();
  const { esAdmin } = usePermisos();
  // Arqueo ciego: quien no administra el negocio cuenta el efectivo sin ver cuánto debería haber.
  const ciego = !esAdmin;
  const [turno, setTurno] = useState<Turno | null>(null);
  const [movs, setMovs] = useState<Mov[]>([]);
  const [historial, setHistorial] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [usuario, setUsuario] = useState("");
  const [fondo, setFondo] = useState("");
  const [tipo, setTipo] = useState("venta");
  const [metodo, setMetodo] = useState("efectivo");
  const [concepto, setConcepto] = useState("");
  const [categoria, setCategoria] = useState("");
  const [monto, setMonto] = useState("");
  const [referencia, setReferencia] = useState("");
  const [contado, setContado] = useState("");
  const [notas, setNotas] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const cargar = useCallback(async () => {
    const { data: abiertos } = await supabase
      .from("turnos_caja").select("*").eq("estado", "abierto").order("abierto_en", { ascending: false }).limit(1);
    const actual = abiertos?.[0] ?? null;
    setTurno(actual);
    if (actual) {
      const { data } = await supabase
        .from("movimientos_turno").select("*").eq("turno_id", actual.id).order("created_at", { ascending: false }).limit(1000);
      setMovs(data ?? []);
    } else {
      setMovs([]);
    }
    const { data: cerrados } = await supabase
      .from("turnos_caja").select("*").eq("estado", "cerrado").order("cerrado_en", { ascending: false }).limit(15);
    setHistorial(cerrados ?? []);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
    supabase.auth.getUser().then(({ data }) => setUsuario(data.user?.email ?? ""));
  }, [cargar]);

  const r = useMemo(() => (turno ? resumen(turno, movs) : null), [turno, movs]);

  const abrir = async () => {
    const f = fondo.trim() ? Number(fondo) : 0;
    if (!Number.isFinite(f) || f < 0) return toast.error("Escribe un fondo inicial válido.");
    setOcupado(true);
    const { error } = await supabase.from("turnos_caja").insert({ fondo_inicial: f, cajero: usuario || null, sucursal_id: leerSucursalActual() });
    setOcupado(false);
    if (error) return toast.error("No se pudo abrir la caja.");
    toast.success("Caja abierta. Ya puedes registrar movimientos.");
    setFondo("");
    cargar();
  };

  const registrar = async () => {
    if (!turno) return;
    const v = Number(monto);
    if (!concepto.trim()) return toast.error("Escribe el concepto.");
    if (!Number.isFinite(v) || v <= 0) return toast.error("Escribe un valor mayor a cero.");
    const esDigital = metodo === "transferencia" || metodo === "tarjeta";
    if (esDigital && tipo !== "gasto" && !referencia.trim()) return toast.error("Escribe la referencia o comprobante del pago digital.");
    if ((tipo === "gasto" || tipo === "retiro") && metodo === "efectivo" && r && v > r.esperado) {
      return toast.error(ciego ? "No hay tanto efectivo en caja para este movimiento." : `No hay tanto efectivo en caja (hay ${dinero(r.esperado)}).`);
    }
    if (tipo === "retiro" && metodo !== "efectivo") return toast.error("Un retiro siempre es en efectivo.");
    setOcupado(true);
    const conceptoFinal = esDigital && referencia.trim() ? `${concepto.trim()} — Ref: ${referencia.trim()}` : concepto.trim();
    const { error } = await supabase.from("movimientos_turno").insert({
      turno_id: turno.id, tipo, metodo: tipo === "retiro" ? "efectivo" : metodo, concepto: conceptoFinal,
      categoria: tipo === "gasto" ? categoria || "Otros" : null, monto: v, registrado_por: usuario || null,
      referencia_pago: esDigital ? referencia.trim() || null : null,
      sucursal_id: leerSucursalActual(),
    });
    setOcupado(false);
    if (error) return toast.error("No se pudo registrar el movimiento.");
    setConcepto(""); setMonto(""); setCategoria(""); setReferencia("");
    cargar();
  };

  const anular = async (m: Mov) => {
    const motivo = window.prompt("Motivo de la anulación (obligatorio):")?.trim();
    if (!motivo) return toast.error("Sin motivo no se puede anular.");
    const { error } = await supabase.from("movimientos_turno").update({ anulado: true, motivo_anulacion: motivo }).eq("id", m.id);
    if (error) return toast.error("No se pudo anular.");
    cargar();
  };

  const imprimir = (t: Turno, lista: Mov[]) => {
    const x = resumen(t, lista);
    const cerrado = t.estado === "cerrado";
    const w = window.open("", "_blank", "width=380,height=700");
    if (!w) return toast.error("Permite las ventanas emergentes para imprimir.");
    const fila = (a: string, b: number, fuerte = false) =>
      `<tr><td>${fuerte ? "<b>" : ""}${esc(a)}${fuerte ? "</b>" : ""}</td><td style="text-align:right">${fuerte ? "<b>" : ""}${dinero(b)}${fuerte ? "</b>" : ""}</td></tr>`;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Cierre de caja</title>
<style>@page{size:80mm auto;margin:4mm}body{font-family:monospace;font-size:13px;width:72mm;margin:0}h1{font-size:16px;text-align:center;margin:0}
table{width:100%;border-collapse:collapse}td{padding:2px 0}hr{border:0;border-top:1px dashed #000;margin:6px 0}.c{text-align:center}</style></head><body>
<h1>${esc(negocio?.nombre ?? "Mi negocio")}</h1><p class="c">${cerrado ? "CIERRE DE CAJA (Z)" : "CORTE PARCIAL (X)"}<br>Cajero: ${esc(t.cajero ?? "-")}<br>
Abierto: ${new Date(t.abierto_en).toLocaleString("es-CO")}<br>${t.cerrado_en ? `Cerrado: ${new Date(t.cerrado_en).toLocaleString("es-CO")}` : `Impreso: ${new Date().toLocaleString("es-CO")}`}</p><hr>
<table>${fila("Fondo inicial", t.fondo_inicial)}${fila("Ventas", x.ventas)}${fila("Ingresos en efectivo", x.ingEf)}${fila("Gastos", x.gastos)}${fila("Retiros", x.retiros)}</table><hr>
<table>${fila("Ventas en transferencia", x.transf)}${fila("Ventas en tarjeta", x.tarjeta)}</table><hr>
<table>${fila("Efectivo esperado", cerrado ? t.esperado_efectivo ?? x.esperado : x.esperado, true)}${cerrado ? fila("Efectivo contado", t.efectivo_contado ?? 0) + fila("Diferencia", t.diferencia ?? 0, true) : ""}</table>
${t.notas_cierre ? `<hr><p>Notas: ${esc(t.notas_cierre)}</p>` : ""}<br><br><p class="c">______________________<br>Firma del cajero</p>
<script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
  };

  const cerrar = async () => {
    if (!turno || !r) return;
    const c = Number(contado);
    if (!contado.trim() || !Number.isFinite(c) || c < 0) return toast.error("Cuenta el efectivo y escribe cuánto hay.");
    const dif = Math.round((c - r.esperado) * 100) / 100;
    if (!ciego && dif !== 0 && !notas.trim()) return toast.error("Hay diferencia: explica el motivo en las notas del cierre.");
    const pregunta = ciego
      ? `Vas a cerrar la caja con ${dinero(c)} contados. ¿Confirmas?`
      : dif === 0 ? "La caja cuadra. ¿Cerrar el turno?" : `Hay una diferencia de ${dinero(dif)}. ¿Cerrar de todos modos?`;
    if (!window.confirm(pregunta)) return;
    setOcupado(true);
    // El servidor calcula el esperado y la diferencia; el cajero solo envía lo que contó.
    const { data: cerrado, error } = await supabase
      .from("turnos_caja")
      .update({ estado: "cerrado", cerrado_en: new Date().toISOString(), efectivo_contado: c, notas_cierre: notas.trim() || null })
      .eq("id", turno.id)
      .select("*")
      .single();
    setOcupado(false);
    if (error || !cerrado) {
      const msg = error?.message ?? "";
      return toast.error(/sobrante|faltante|contaste/i.test(msg) ? msg : "No se pudo cerrar la caja.");
    }
    const d = cerrado.diferencia ?? 0;
    toast.success(d === 0 ? "Caja cerrada: cuadra." : d > 0 ? `Caja cerrada con sobrante de ${dinero(d)}.` : `Caja cerrada con faltante de ${dinero(-d)}.`);
    imprimir(cerrado, movs);
    setContado(""); setNotas("");
    cargar();
  };

  if (cargando) return <p className="text-sm text-muted-foreground">Cargando caja…</p>;

  const esGasto = tipo === "gasto";
  const diferencia = !ciego && r && contado.trim() && Number.isFinite(Number(contado)) ? Math.round((Number(contado) - r.esperado) * 100) / 100 : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver al panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <Banknote className="h-7 w-7 text-primary" /> Caja y gastos diarios
        </h1>
        <p className="text-sm text-muted-foreground">Abre el turno con el fondo, registra ventas, gastos y retiros, y cierra contando el efectivo.</p>
      </div>

      {!turno && (
        <GlassPanel className="max-w-md space-y-3 p-5">
          <h2 className="flex items-center gap-2 font-medium text-foreground"><Lock className="h-4 w-4" /> Caja cerrada</h2>
          <p className="text-sm text-muted-foreground">Para registrar movimientos abre un turno con el efectivo con el que empiezas.</p>
          <input className={campo} placeholder="Fondo inicial en efectivo (COP)" inputMode="decimal" value={fondo} onChange={(e) => setFondo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && abrir()} />
          <button onClick={abrir} disabled={ocupado} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
            <Unlock className="h-4 w-4" /> Abrir caja
          </button>
        </GlassPanel>
      )}

      {turno && r && (
        <>
          {ciego && (
            <GlassPanel className="space-y-1 p-4 text-sm text-muted-foreground">
              <p>Arqueo ciego: el sistema no muestra cuánto efectivo debería haber. Registra los movimientos y, al cerrar, cuenta lo que hay en la caja.</p>
              {r && <p>Efectivo: {r.nEf} pagos · Transferencias: {r.nTransf} · Tarjetas: {r.nTarj}. Los pagos digitales siempre piden referencia.</p>}
            </GlassPanel>
          )}
          {!ciego && <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Efectivo esperado ({r.nEf})</p><p className="truncate text-lg font-medium text-foreground">{dinero(r.esperado)}</p></GlassPanel>
            <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Transferencias ({r.nTransf})</p><p className="truncate text-lg font-medium text-foreground">{dinero(r.transf)}</p></GlassPanel>
            <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Tarjetas / datafono ({r.nTarj})</p><p className="truncate text-lg font-medium text-foreground">{dinero(r.tarjeta)}</p></GlassPanel>
            <GlassPanel className="p-4"><p className="text-xs text-muted-foreground">Ventas del turno</p><p className="truncate text-lg font-medium text-foreground">{dinero(r.ventas)}</p></GlassPanel>
          </div>}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
            <div className="space-y-4">
              <GlassPanel className="space-y-3 p-5">
                <h2 className="font-medium text-foreground">Registrar movimiento</h2>
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS.map((t) => (
                    <button key={t.clave} onClick={() => setTipo(t.clave)}
                      className={`rounded-lg px-2 py-2 text-sm ${tipo === t.clave ? "bg-primary text-primary-foreground" : "border border-glass-border text-foreground/80"}`}>
                      {t.texto}
                    </button>
                  ))}
                </div>
                {tipo !== "retiro" && (
                  <select className={campo} value={metodo} onChange={(e) => setMetodo(e.target.value)} aria-label="Medio de pago">
                    {METODOS.map((m) => <option key={m.clave} value={m.clave}>{m.texto}</option>)}
                  </select>
                )}
                {esGasto && (
                  <select className={campo} value={categoria} onChange={(e) => setCategoria(e.target.value)} aria-label="Categoría del gasto">
                    <option value="">Categoría del gasto</option>
                    {CATEGORIAS_GASTO.map((c) => <option key={c}>{c}</option>)}
                  </select>
                )}
                <input className={campo} placeholder="Concepto *" value={concepto} onChange={(e) => setConcepto(e.target.value)} />
                <input className={campo} placeholder="Valor (COP) *" inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && registrar()} />
                {(metodo === "transferencia" || metodo === "tarjeta") && tipo !== "retiro" && (
                  <input className={campo} placeholder="Referencia o comprobante * (Nequi, Daviplata, datafono)" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
                )}
                <button onClick={registrar} disabled={ocupado} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
                  Registrar
                </button>
              </GlassPanel>

              <GlassPanel className="space-y-3 p-5">
                <h2 className="flex items-center gap-2 font-medium text-foreground"><Lock className="h-4 w-4" /> Arqueo y cierre</h2>
                <p className="text-sm text-muted-foreground">
                  {ciego
                    ? "Cuenta los billetes y monedas y escribe cuánto hay. El sistema calcula el sobrante o faltante al cerrar."
                    : `Cuenta los billetes y monedas. Debe haber ${dinero(r.esperado)}.`}
                </p>
                <input className={campo} placeholder="Efectivo contado (COP)" inputMode="decimal" value={contado} onChange={(e) => setContado(e.target.value)} />
                {diferencia !== null && (
                  <p className={`text-sm font-medium ${diferencia === 0 ? "text-foreground" : "text-destructive"}`}>
                    {diferencia === 0 ? "La caja cuadra." : diferencia > 0 ? `Sobrante: ${dinero(diferencia)}` : `Faltante: ${dinero(-diferencia)}`}
                  </p>
                )}
                <textarea className={campo} rows={2} placeholder={ciego ? "Notas del cierre (si hay diferencia, el sistema te pedirá el motivo)" : "Notas del cierre (obligatorias si hay diferencia)"} value={notas} onChange={(e) => setNotas(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  {!ciego ? (
                    <button onClick={() => imprimir(turno, movs)} className="inline-flex items-center justify-center gap-2 rounded-lg border border-glass-border px-3 py-2.5 text-sm text-foreground">
                      <Printer className="h-4 w-4" /> Corte parcial
                    </button>
                  ) : <span />}
                  <button onClick={cerrar} disabled={ocupado} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
                    <Lock className="h-4 w-4" /> Cerrar caja
                  </button>
                </div>
              </GlassPanel>

              <ResumenCierreWhatsApp ventas={r.ventas} gastos={r.gastos + r.retiros} />
            </div>

            <div className="min-w-0 space-y-2">
              <h2 className="font-medium text-foreground">Movimientos del turno</h2>
              {movs.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay movimientos. Fondo inicial: {dinero(turno.fondo_inicial)}.</p>}
              {movs.map((m) => (
                <GlassPanel key={m.id} className={`flex items-center gap-3 p-3 ${m.anulado ? "opacity-50" : ""}`}>
                  {entra(m.tipo) ? <ArrowDownCircle className="h-5 w-5 shrink-0 text-primary" /> : <ArrowUpCircle className="h-5 w-5 shrink-0 text-destructive" />}
                  <div className="min-w-0 flex-1">
                    <p className={`break-words text-sm text-foreground ${m.anulado ? "line-through" : ""}`}>{m.concepto}</p>
                    <p className="break-words text-xs text-muted-foreground">
                      {TIPOS.find((t) => t.clave === m.tipo)?.texto} · {(METODOS.find((x) => x.clave === m.metodo)?.texto ?? m.metodo).split(" (")[0]} {m.categoria ? `· ${m.categoria}` : ""} · {new Date(m.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                      {m.anulado && m.motivo_anulacion ? ` · Anulado: ${m.motivo_anulacion}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-medium text-foreground">{entra(m.tipo) ? "+" : "−"}{dinero(m.monto)}</span>
                  {!m.anulado && (
                    <button onClick={() => anular(m)} aria-label="Anular" className="shrink-0 text-muted-foreground hover:text-destructive"><Ban className="h-4 w-4" /></button>
                  )}
                </GlassPanel>
              ))}
            </div>
          </div>
        </>
      )}

      {historial.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-medium text-foreground">Cierres anteriores</h2>
          {historial.map((t) => (
            <GlassPanel key={t.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span className="text-foreground">{t.cerrado_en ? new Date(t.cerrado_en).toLocaleString("es-CO") : ""} · {t.cajero ?? "-"}</span>
              <span className="text-muted-foreground">Esperado {dinero(t.esperado_efectivo ?? 0)} · Contado {dinero(t.efectivo_contado ?? 0)}</span>
              <span className={(t.diferencia ?? 0) === 0 ? "text-foreground" : "text-destructive"}>
                {(t.diferencia ?? 0) === 0 ? "Cuadró" : `Dif. ${dinero(t.diferencia ?? 0)}`}
              </span>
              <button
                onClick={async () => {
                  const { data } = await supabase.from("movimientos_turno").select("*").eq("turno_id", t.id).limit(2000);
                  imprimir(t, data ?? []);
                }}
                className="inline-flex items-center gap-1 text-xs text-primary"
              ><Printer className="h-3 w-3" /> Reimprimir</button>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}
