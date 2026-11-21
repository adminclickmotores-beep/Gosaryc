import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";
import { exportarExcel, imprimirReporte } from "@/lib/exportes";
import { Etiqueta, Indicador, SelectorMetodo, aWhatsapp, diasEntre, hoyISO, msg } from "@/components/negocios/comunes";

type Abonado = Tables<"parq_abonados">;
type Pago = Tables<"parq_pagos">;

export function AbonadosParqueadero() {
  const [abonados, setAbonados] = useState<Abonado[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [cargando, setCargando] = useState(true);
  const [hoy, setHoy] = useState("");
  const [placa, setPlaca] = useState("");
  const [nombre, setNombre] = useState("");
  const [tel, setTel] = useState("");
  const [tarifa, setTarifa] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [ocupado, setOcupado] = useState("");
  const [edicion, setEdicion] = useState<Record<string, string>>({});

  useEffect(() => {
    setHoy(hoyISO());
  }, []);

  const cargar = useCallback(async () => {
    const [a, p] = await Promise.all([
      supabase.from("parq_abonados").select("*").order("nombre").limit(1000),
      supabase.from("parq_pagos").select("*").order("created_at", { ascending: false }).limit(1000),
    ]);
    setAbonados(a.data ?? []);
    setPagos(p.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (placa.trim().length < 3) return toast.error("Escribe la placa.");
    if (nombre.trim().length < 2) return toast.error("Escribe el nombre del abonado.");
    const { error } = await supabase.from("parq_abonados").insert({ placa: placa.trim().toUpperCase(), nombre: nombre.trim(), telefono: tel.trim() || null, tarifa_mensual: Math.max(num(tarifa), 0), vence: hoy || hoyISO() });
    if (error) return toast.error(error.code === "23505" ? "Esa placa ya es abonada." : msg(error.message, "No se pudo guardar el abonado."));
    toast.success("Abonado registrado. Cobra la primera mensualidad para activarlo.");
    setPlaca(""); setNombre(""); setTel(""); setTarifa("");
    void cargar();
  };
  const guardarTarifa = async (a: Abonado) => {
    const v = edicion[a.id];
    if (v === undefined) return;
    const { error } = await supabase.from("parq_abonados").update({ tarifa_mensual: Math.max(num(v), 0) }).eq("id", a.id);
    if (error) return toast.error(msg(error.message, "No se pudo actualizar la tarifa."));
    setEdicion((e) => {
      const { [a.id]: _omitido, ...resto } = e;
      return resto;
    });
    void cargar();
  };
  const alternar = async (a: Abonado) => {
    const { error } = await supabase.from("parq_abonados").update({ activo: !a.activo }).eq("id", a.id);
    if (error) return toast.error(msg(error.message, "No se pudo cambiar."));
    void cargar();
  };
  const cobrar = async (a: Abonado) => {
    setOcupado(a.id);
    const { data, error } = await supabase.rpc("parq_cobrar_abono", { p_abonado: a.id, p_metodo: metodo });
    setOcupado("");
    if (error) return toast.error(msg(error.message, "No se pudo cobrar."));
    const r = (data ?? {}) as { recibo?: string; valor?: number; desde?: string; hasta?: string };
    toast.success(`Mensualidad de ${dinero(r.valor ?? a.tarifa_mensual)} a Caja. Vigente hasta ${r.hasta ?? ""}.`);
    imprimirReporte(`Recibo ${r.recibo ?? ""}`, `Parqueadero · ${a.nombre} · ${a.placa}`, ["Concepto", "Valor"], [[`Mensualidad ${r.desde ?? ""} a ${r.hasta ?? ""}`, dinero(r.valor ?? a.tarifa_mensual)]], ["Gracias por su pago."]);
    void cargar();
  };

  if (cargando) return <Cargando />;
  const activos = abonados.filter((a) => a.activo);
  const vencidos = activos.filter((a) => !!hoy && a.vence < hoy);
  const mes = hoy.slice(0, 7);
  const recaudoMes = pagos.filter((p) => p.fecha.slice(0, 7) === mes).reduce((s, p) => s + p.valor, 0);

  return (
    <div className="space-y-6">
      <Encabezado titulo="Abonados y mensualidades" texto="Vehículos con mensualidad: vigencia, aviso de vencimiento por WhatsApp y cobro a Caja con recibo y asiento contable." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador titulo="Abonados activos" valor={activos.length} />
        <Indicador titulo="Mensualidad vencida" valor={vencidos.length} alerta={vencidos.length > 0} />
        <Indicador titulo="Recaudo del mes" valor={dinero(recaudoMes)} />
      </div>
      <GlassPanel className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-foreground">Nuevo abonado</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Placa *"><input className={campo} value={placa} onChange={(e) => setPlaca(e.target.value)} /></Campo>
          <Campo etiqueta="Nombre *"><input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
          <Campo etiqueta="Teléfono"><input className={campo} inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></Campo>
          <Campo etiqueta="Mensualidad"><input className={campo} inputMode="decimal" value={tarifa} onChange={(e) => setTarifa(e.target.value)} /></Campo>
        </div>
        <button type="button" className={boton} onClick={() => void crear()}>Guardar abonado</button>
      </GlassPanel>
      <GlassPanel className="space-y-2 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Campo etiqueta="Recibir con"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
          <button type="button" className={botonSec} onClick={() => exportarExcel("abonados-parqueadero", ["Placa", "Nombre", "Teléfono", "Mensualidad", "Vence", "Estado"], abonados.map((a) => [a.placa, a.nombre, a.telefono ?? "", a.tarifa_mensual, a.vence, a.activo ? "Activo" : "Inactivo"]))}>Descargar Excel</button>
        </div>
        {abonados.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay abonados.</p> : abonados.map((a) => {
          const vencido = !!hoy && a.vence < hoy;
          const dias = hoy ? diasEntre(hoy, a.vence) : 0;
          return (
            <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-foreground">{a.placa} · {a.nombre}</p>
                <p className="text-xs text-muted-foreground">Vigente hasta {a.vence}{a.telefono ? ` · ${a.telefono}` : ""}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!a.activo ? <Etiqueta texto="Inactivo" tono="neutro" /> : vencido ? <Etiqueta texto={`Vencido hace ${Math.abs(dias)} día(s)`} tono="alerta" /> : dias <= 5 ? <Etiqueta texto={`Vence en ${dias} día(s)`} tono="info" /> : <Etiqueta texto="Al día" tono="ok" />}
                <input className={`${campo} !w-32`} aria-label="Mensualidad" inputMode="decimal" value={edicion[a.id] ?? String(a.tarifa_mensual)} onChange={(e) => setEdicion((x) => ({ ...x, [a.id]: e.target.value }))} />
                {edicion[a.id] !== undefined && <button type="button" className={botonSec} onClick={() => void guardarTarifa(a)}>Guardar</button>}
                {a.activo && vencido && (
                  <button type="button" className={botonSec} onClick={() => { const u = aWhatsapp(a.telefono, `Hola ${a.nombre}, tu mensualidad del parqueadero para ${a.placa} venció el ${a.vence}.`); if (u) window.open(u, "_blank", "noopener"); else toast.error("Sin teléfono."); }}>Avisar</button>
                )}
                {a.activo && <button type="button" className={boton} disabled={ocupado === a.id} onClick={() => void cobrar(a)}>Cobrar {dinero(a.tarifa_mensual)}</button>}
                <button type="button" className={botonSec} onClick={() => void alternar(a)}>{a.activo ? "Desactivar" : "Activar"}</button>
              </div>
            </div>
          );
        })}
      </GlassPanel>
    </div>
  );
}
