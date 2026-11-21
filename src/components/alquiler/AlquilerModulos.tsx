import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { urlLocalPrivada } from "@/lib/archivo-privado";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";
import { exportarExcel, imprimirReporte } from "@/lib/exportes";
import { Etiqueta, Indicador, Pestanas, SelectorMetodo, msg } from "@/components/negocios/comunes";

type Vehiculo = Tables<"alq_vehiculos">;
type Contrato = Tables<"alq_contratos">;
type Multa = Tables<"alq_multas">;
type Vista = "flota" | "nuevo" | "contratos" | "entregas" | "multas";

const BUCKET = "creditos_docs";

function FotoVehiculo({ ruta }: { ruta: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    void urlLocalPrivada(BUCKET, ruta).then((u) => {
      if (vivo) setUrl(u);
    });
    return () => {
      vivo = false;
    };
  }, [ruta]);
  return url ? <img src={url} alt="Foto del vehículo" className="h-36 w-full rounded-lg object-cover" /> : <div className="flex h-36 items-center justify-center rounded-lg bg-glass/40 text-xs text-muted-foreground">Cargando foto…</div>;
}

const tonoEstado = (e: string): "ok" | "alerta" | "info" => (e === "disponible" ? "ok" : e === "alquilado" ? "info" : "alerta");

/** Mismos cálculos que la base de datos al liquidar. */
function calcularLiquidacion(c: Contrato, v: Vehiculo | undefined, km: number, comb: number, dano: number, ahoraMs: number) {
  const recorrido = Math.max(km - c.km_salida, 0);
  const diasC = c.modalidad === "dias" ? c.cantidad : Math.max(Math.ceil(c.cantidad / 24), 1);
  const extraKm = Math.max(recorrido - (v?.km_incluidos_dia ?? 0) * diasC, 0);
  const rKm = Math.round(extraKm * (v?.valor_km_extra ?? 0));
  const rComb = comb < c.combustible_salida ? Math.round(((c.combustible_salida - comb) / 100) * (v?.valor_tanque ?? 0)) : 0;
  const real = Math.max(Math.ceil((ahoraMs - new Date(c.salida).getTime()) / (c.modalidad === "dias" ? 86400000 : 3600000)), 1);
  const rDem = real > c.cantidad ? Math.round((real - c.cantidad) * c.tarifa) : 0;
  const base = Math.round(c.tarifa * c.cantidad);
  const total = base + rKm + rComb + rDem + dano;
  return { recorrido, rKm, rComb, rDem, base, total, saldo: total - c.deposito };
}

function imprimirContrato(c: { placa: string; descripcion: string; cliente: string; documento: string | null; modalidad: string; cantidad: number; tarifa: number; deposito: number; km_salida: number; combustible_salida: number; salida: string }) {
  imprimirReporte(`Contrato de alquiler ${c.placa}`, `${c.descripcion} · Cliente: ${c.cliente}${c.documento ? ` (${c.documento})` : ""}`,
    ["Concepto", "Detalle"],
    [["Salida", c.salida.slice(0, 16).replace("T", " ")], ["Duración", `${c.cantidad} ${c.modalidad === "dias" ? "día(s)" : "hora(s)"}`], ["Tarifa", dinero(c.tarifa)],
     ["Depósito en garantía", dinero(c.deposito)], ["Kilometraje de salida", String(c.km_salida)], ["Combustible de salida", `${c.combustible_salida} %`]],
    [`Valor estimado: ${dinero(c.tarifa * c.cantidad)}`, "Firma del cliente: ____________________"]);
}

function FilaEntrega({ c, v, onListo }: { c: Contrato; v: Vehiculo | undefined; onListo: () => void }) {
  const [km, setKm] = useState(String(c.km_salida));
  const [comb, setComb] = useState(String(c.combustible_salida));
  const [dano, setDano] = useState("0");
  const [metodo, setMetodo] = useState("efectivo");
  const [ahora, setAhora] = useState(0);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    setAhora(Date.now());
  }, []);
  const liq = calcularLiquidacion(c, v, num(km), Math.min(Math.max(num(comb), 0), 100), Math.max(Math.round(num(dano)), 0), ahora || new Date(c.salida).getTime());
  const liquidar = async () => {
    setOcupado(true);
    const { data, error } = await supabase.rpc("alq_cerrar", { p_contrato: c.id, p_km_entrega: num(km), p_combustible: Math.round(num(comb)), p_dano: Math.max(Math.round(num(dano)), 0), p_metodo: metodo });
    setOcupado(false);
    if (error) return toast.error(msg(error.message, "No se pudo liquidar el contrato."));
    const r = (data ?? {}) as { base?: number; recargo_km?: number; recargo_combustible?: number; recargo_demora?: number; recargo_dano?: number; total?: number; deposito?: number; saldo?: number };
    toast.success(`Contrato liquidado: total ${dinero(r.total ?? 0)}. ${(r.saldo ?? 0) >= 0 ? "Cobro" : "Devolución de depósito"} de ${dinero(Math.abs(r.saldo ?? 0))} en Caja.`);
    imprimirReporte(`Liquidación de alquiler ${c.placa}`, `${c.descripcion} · Cliente: ${c.cliente}`,
      ["Concepto", "Valor"],
      [["Alquiler base", dinero(r.base ?? 0)], ["Recargo por kilometraje", dinero(r.recargo_km ?? 0)], ["Recargo por combustible", dinero(r.recargo_combustible ?? 0)],
       ["Recargo por demora", dinero(r.recargo_demora ?? 0)], ["Daños", dinero(r.recargo_dano ?? 0)], ["Depósito aplicado", `-${dinero(r.deposito ?? 0)}`]],
      [`Total del alquiler: ${dinero(r.total ?? 0)}`, `${(r.saldo ?? 0) >= 0 ? "Saldo cobrado" : "Depósito devuelto"}: ${dinero(Math.abs(r.saldo ?? 0))}`]);
    onListo();
  };
  return (
    <div className="space-y-3 rounded-xl border border-glass-border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-foreground">{c.placa} · {c.cliente}</p>
          <p className="text-xs text-muted-foreground">Salió {c.salida.slice(0, 16).replace("T", " ")} · {c.cantidad} {c.modalidad === "dias" ? "día(s)" : "hora(s)"} a {dinero(c.tarifa)} · depósito {dinero(c.deposito)} · km salida {c.km_salida} · combustible {c.combustible_salida} %</p>
        </div>
        {c.prevista && ahora > 0 && new Date(c.prevista).getTime() < ahora && <Etiqueta texto="Pasó la hora de entrega" tono="alerta" />}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Campo etiqueta="Kilometraje de entrega"><input className={campo} inputMode="decimal" value={km} onChange={(e) => setKm(e.target.value)} /></Campo>
        <Campo etiqueta="Combustible al entregar %"><input className={campo} inputMode="numeric" value={comb} onChange={(e) => setComb(e.target.value)} /></Campo>
        <Campo etiqueta="Daños a cobrar"><input className={campo} inputMode="decimal" value={dano} onChange={(e) => setDano(e.target.value)} /></Campo>
        <Campo etiqueta="Pago / devolución por"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Indicador titulo="Base" valor={dinero(liq.base)} />
        <Indicador titulo="Recargo km" valor={dinero(liq.rKm)} nota={`${liq.recorrido} km recorridos`} />
        <Indicador titulo="Recargo combustible" valor={dinero(liq.rComb)} />
        <Indicador titulo="Demora" valor={dinero(liq.rDem)} />
        <Indicador titulo="Total" valor={dinero(liq.total)} />
        <Indicador titulo={liq.saldo >= 0 ? "A cobrar" : "Devolver depósito"} valor={dinero(Math.abs(liq.saldo))} />
      </div>
      <button type="button" className={boton} disabled={ocupado} onClick={() => void liquidar()}>{ocupado ? "Liquidando…" : "Recibir vehículo y liquidar en Caja"}</button>
    </div>
  );
}

function PanelAlquiler({ vistaInicial }: { vistaInicial: Vista }) {
  const [vista, setVista] = useState<Vista>(vistaInicial);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [multas, setMultas] = useState<Multa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  // vehículo nuevo
  const [placa, setPlaca] = useState("");
  const [desc, setDesc] = useState("");
  const [tDia, setTDia] = useState("");
  const [tHora, setTHora] = useState("");
  const [kmIni, setKmIni] = useState("0");
  const [kmIncl, setKmIncl] = useState("200");
  const [kmExtra, setKmExtra] = useState("");
  const [tanque, setTanque] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  // contrato
  const [vehSel, setVehSel] = useState("");
  const [cliente, setCliente] = useState("");
  const [doc, setDoc] = useState("");
  const [tel, setTel] = useState("");
  const [modalidad, setModalidad] = useState("dias");
  const [cantidad, setCantidad] = useState("1");
  const [tarifa, setTarifa] = useState("");
  const [deposito, setDeposito] = useState("");
  const [kmSal, setKmSal] = useState("");
  const [combSal, setCombSal] = useState("100");
  const [metodo, setMetodo] = useState("efectivo");
  const [notas, setNotas] = useState("");
  // multas
  const [mContrato, setMContrato] = useState("");
  const [mConcepto, setMConcepto] = useState("multa");
  const [mValor, setMValor] = useState("");
  const [mDetalle, setMDetalle] = useState("");
  const [mMetodo, setMMetodo] = useState("efectivo");

  const cargar = useCallback(async () => {
    const [v, c, m] = await Promise.all([
      supabase.from("alq_vehiculos").select("*").order("placa").limit(500),
      supabase.from("alq_contratos").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("alq_multas").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    setVehiculos(v.data ?? []);
    setContratos(c.data ?? []);
    setMultas(m.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const disponibles = useMemo(() => vehiculos.filter((v) => v.activo && v.estado === "disponible"), [vehiculos]);
  const abiertos = useMemo(() => contratos.filter((c) => c.estado === "abierto"), [contratos]);
  const veh = vehiculos.find((v) => v.id === vehSel);

  const elegirVehiculo = (id: string) => {
    setVehSel(id);
    const v = vehiculos.find((x) => x.id === id);
    if (v) {
      setKmSal(String(v.km_actual));
      setTarifa(String(modalidad === "dias" ? v.tarifa_dia : v.tarifa_hora));
    }
  };
  const cambiarModalidad = (m: string) => {
    setModalidad(m);
    if (veh) setTarifa(String(m === "dias" ? veh.tarifa_dia : veh.tarifa_hora));
  };

  const guardarVehiculo = async () => {
    if (placa.trim().length < 4) return toast.error("Escribe la placa.");
    if (desc.trim().length < 2) return toast.error("Describe el vehículo (marca, modelo y año).");
    setGuardando(true);
    let ruta: string | null = null;
    if (foto) {
      const { data: owner } = await supabase.rpc("mi_negocio_id");
      const ext = (foto.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const destino = `${owner}/alquiler/${crypto.randomUUID()}.${ext || "jpg"}`;
      const { error: errSubida } = await supabase.storage.from(BUCKET).upload(destino, foto, { contentType: foto.type || undefined });
      if (errSubida) {
        setGuardando(false);
        return toast.error("No se pudo subir la foto. Revisa el archivo e inténtalo de nuevo.");
      }
      ruta = destino;
    }
    const { error } = await supabase.from("alq_vehiculos").insert({
      placa: placa.trim().toUpperCase(), descripcion: desc.trim(), foto_ruta: ruta, tarifa_dia: Math.max(num(tDia), 0), tarifa_hora: Math.max(num(tHora), 0),
      km_actual: Math.max(num(kmIni), 0), km_incluidos_dia: Math.max(num(kmIncl), 0), valor_km_extra: Math.max(num(kmExtra), 0), valor_tanque: Math.max(num(tanque), 0),
    });
    setGuardando(false);
    if (error) return toast.error(error.code === "23505" ? "Esa placa ya está en la flota." : msg(error.message, "No se pudo guardar el vehículo."));
    toast.success("Vehículo agregado a la flota.");
    setPlaca(""); setDesc(""); setTDia(""); setTHora(""); setKmIni("0"); setKmExtra(""); setTanque(""); setFoto(null);
    void cargar();
  };
  const cambiarEstado = async (v: Vehiculo, estado: string) => {
    const { error } = await supabase.from("alq_vehiculos").update({ estado }).eq("id", v.id);
    if (error) return toast.error(msg(error.message, "No se pudo cambiar el estado."));
    void cargar();
  };

  const abrir = async () => {
    if (!vehSel) return toast.error("Elige el vehículo.");
    if (cliente.trim().length < 2) return toast.error("Escribe el cliente.");
    setGuardando(true);
    const { data, error } = await supabase.rpc("alq_abrir", {
      p_vehiculo: vehSel, p_cliente: cliente.trim(), p_documento: doc.trim(), p_telefono: tel.trim(), p_modalidad: modalidad, p_cantidad: Math.round(num(cantidad)),
      p_tarifa: num(tarifa), p_deposito: Math.max(num(deposito), 0), p_km_salida: num(kmSal), p_combustible: Math.round(num(combSal)), p_metodo: metodo, p_notas: notas.trim(),
    });
    setGuardando(false);
    if (error) return toast.error(msg(error.message, "No se pudo crear el contrato."));
    const r = (data ?? {}) as { tarifa?: number; estimado?: number };
    toast.success(`Contrato creado. Valor estimado ${dinero(r.estimado ?? 0)}${num(deposito) > 0 ? "; el depósito entró a Caja" : ""}.`);
    if (veh) imprimirContrato({ placa: veh.placa, descripcion: veh.descripcion, cliente: cliente.trim(), documento: doc.trim() || null, modalidad, cantidad: Math.round(num(cantidad)), tarifa: r.tarifa ?? num(tarifa), deposito: Math.max(num(deposito), 0), km_salida: num(kmSal), combustible_salida: Math.round(num(combSal)), salida: new Date().toISOString() });
    setVehSel(""); setCliente(""); setDoc(""); setTel(""); setCantidad("1"); setTarifa(""); setDeposito(""); setKmSal(""); setNotas("");
    await cargar();
    setVista("entregas");
  };

  const registrarMulta = async () => {
    const c = contratos.find((x) => x.id === mContrato);
    if (!c) return toast.error("Elige el contrato al que se traslada.");
    if (num(mValor) <= 0) return toast.error("Escribe el valor.");
    const { error } = await supabase.from("alq_multas").insert({ contrato_id: c.id, placa: c.placa, cliente: c.cliente, concepto: mConcepto, detalle: mDetalle.trim() || null, valor: Math.round(num(mValor)) });
    if (error) return toast.error(msg(error.message, "No se pudo registrar."));
    toast.success("Registrado: ya se puede cobrar al cliente.");
    setMValor(""); setMDetalle("");
    void cargar();
  };
  const cobrarMulta = async (m: Multa) => {
    const { error } = await supabase.rpc("alq_cobrar_multa", { p_multa: m.id, p_metodo: mMetodo });
    if (error) return toast.error(msg(error.message, "No se pudo cobrar."));
    toast.success(`Cobrado ${dinero(m.valor)} a ${m.cliente}. Entró a Caja.`);
    void cargar();
  };

  if (cargando) return <Cargando />;
  const estimado = Math.round(num(tarifa) * Math.round(num(cantidad)));

  return (
    <div className="space-y-6">
      <Encabezado titulo="Alquiler de vehículos" texto="Flota con estado, contratos por días u horas con depósito en garantía, kilometraje y combustible de salida y entrega, recargos automáticos y liquidación final en Caja." />
      <Pestanas items={[{ clave: "flota", texto: "Flota" }, { clave: "nuevo", texto: "Nuevo contrato / reserva" }, { clave: "entregas", texto: `Entregas y devoluciones (${abiertos.length})` }, { clave: "contratos", texto: "Contratos" }, { clave: "multas", texto: "Multas y peajes" }]} valor={vista} onChange={setVista} />

      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador titulo="Disponibles" valor={vehiculos.filter((v) => v.estado === "disponible" && v.activo).length} />
        <Indicador titulo="Alquilados" valor={vehiculos.filter((v) => v.estado === "alquilado").length} />
        <Indicador titulo="En mantenimiento" valor={vehiculos.filter((v) => v.estado === "mantenimiento").length} alerta={vehiculos.some((v) => v.estado === "mantenimiento")} />
      </div>

      {vista === "flota" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Agregar vehículo</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etiqueta="Placa *"><input className={campo} value={placa} onChange={(e) => setPlaca(e.target.value)} /></Campo>
              <Campo etiqueta="Vehículo *"><input className={campo} value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ej. Renault Duster 2022" /></Campo>
              <Campo etiqueta="Tarifa por día"><input className={campo} inputMode="decimal" value={tDia} onChange={(e) => setTDia(e.target.value)} /></Campo>
              <Campo etiqueta="Tarifa por hora"><input className={campo} inputMode="decimal" value={tHora} onChange={(e) => setTHora(e.target.value)} /></Campo>
              <Campo etiqueta="Kilometraje actual"><input className={campo} inputMode="decimal" value={kmIni} onChange={(e) => setKmIni(e.target.value)} /></Campo>
              <Campo etiqueta="Km incluidos por día"><input className={campo} inputMode="decimal" value={kmIncl} onChange={(e) => setKmIncl(e.target.value)} /></Campo>
              <Campo etiqueta="Valor de cada km extra"><input className={campo} inputMode="decimal" value={kmExtra} onChange={(e) => setKmExtra(e.target.value)} /></Campo>
              <Campo etiqueta="Valor de un tanque lleno"><input className={campo} inputMode="decimal" value={tanque} onChange={(e) => setTanque(e.target.value)} /></Campo>
              <Campo etiqueta="Foto"><input className={campo} type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} /></Campo>
            </div>
            <button type="button" className={boton} disabled={guardando} onClick={() => void guardarVehiculo()}>{guardando ? "Guardando…" : "Guardar vehículo"}</button>
          </GlassPanel>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vehiculos.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay vehículos en la flota.</p> : vehiculos.map((v) => (
              <GlassPanel key={v.id} className="space-y-2 p-3">
                {v.foto_ruta ? <FotoVehiculo ruta={v.foto_ruta} /> : <div className="flex h-36 items-center justify-center rounded-lg bg-glass/40 text-xs text-muted-foreground">Sin foto</div>}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="break-words text-sm font-semibold text-foreground">{v.placa} · {v.descripcion}</p>
                  <Etiqueta texto={v.estado === "disponible" ? "Disponible" : v.estado === "alquilado" ? "Alquilado" : "Mantenimiento"} tono={tonoEstado(v.estado)} />
                </div>
                <p className="text-xs text-muted-foreground">{dinero(v.tarifa_dia)} por día · {dinero(v.tarifa_hora)} por hora · {v.km_actual} km · {v.km_incluidos_dia} km/día incluidos</p>
                {v.estado !== "alquilado" && (
                  <button type="button" className={botonSec} onClick={() => void cambiarEstado(v, v.estado === "disponible" ? "mantenimiento" : "disponible")}>
                    {v.estado === "disponible" ? "Enviar a mantenimiento" : "Marcar disponible"}
                  </button>
                )}
              </GlassPanel>
            ))}
          </div>
        </>
      )}

      {vista === "nuevo" && (
        <GlassPanel className="space-y-3 p-4">
          <h2 className="text-sm font-semibold text-foreground">Contrato de alquiler</h2>
          {disponibles.length === 0 && <p className="text-sm text-muted-foreground">No hay vehículos disponibles. Agrégalos en Flota o recíbelos en Entregas.</p>}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo etiqueta="Vehículo *">
              <select className={campo} value={vehSel} onChange={(e) => elegirVehiculo(e.target.value)}>
                <option value="">Elige…</option>
                {disponibles.map((v) => <option key={v.id} value={v.id}>{v.placa} · {v.descripcion}</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Cliente *"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
            <Campo etiqueta="Documento / licencia"><input className={campo} value={doc} onChange={(e) => setDoc(e.target.value)} /></Campo>
            <Campo etiqueta="Teléfono"><input className={campo} inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></Campo>
            <Campo etiqueta="Alquiler por">
              <select className={campo} value={modalidad} onChange={(e) => cambiarModalidad(e.target.value)}><option value="dias">Días</option><option value="horas">Horas</option></select>
            </Campo>
            <Campo etiqueta={modalidad === "dias" ? "Cantidad de días" : "Cantidad de horas"}><input className={campo} inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></Campo>
            <Campo etiqueta="Tarifa"><input className={campo} inputMode="decimal" value={tarifa} onChange={(e) => setTarifa(e.target.value)} /></Campo>
            <Campo etiqueta="Depósito en garantía"><input className={campo} inputMode="decimal" value={deposito} onChange={(e) => setDeposito(e.target.value)} /></Campo>
            <Campo etiqueta="Kilometraje de salida"><input className={campo} inputMode="decimal" value={kmSal} onChange={(e) => setKmSal(e.target.value)} /></Campo>
            <Campo etiqueta="Combustible de salida %"><input className={campo} inputMode="numeric" value={combSal} onChange={(e) => setCombSal(e.target.value)} /></Campo>
            <Campo etiqueta="Depósito recibido por"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
            <Campo etiqueta="Notas / estado del vehículo"><input className={campo} value={notas} onChange={(e) => setNotas(e.target.value)} /></Campo>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Indicador titulo="Valor estimado del alquiler" valor={dinero(estimado)} />
            <Indicador titulo="Depósito a recibir" valor={dinero(Math.max(num(deposito), 0))} nota="Queda como saldo a favor del cliente hasta la entrega" />
          </div>
          <button type="button" className={boton} disabled={guardando} onClick={() => void abrir()}>{guardando ? "Creando…" : "Crear contrato y entregar el vehículo"}</button>
        </GlassPanel>
      )}

      {vista === "entregas" && (
        <div className="space-y-3">
          {abiertos.length === 0 ? <GlassPanel className="p-4"><p className="text-sm text-muted-foreground">No hay vehículos alquilados en este momento.</p></GlassPanel> : abiertos.map((c) => (
            <FilaEntrega key={c.id} c={c} v={vehiculos.find((x) => x.id === c.vehiculo_id)} onListo={() => void cargar()} />
          ))}
        </div>
      )}

      {vista === "contratos" && (
        <GlassPanel className="space-y-2 p-4">
          <div className="flex flex-wrap justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Historial de contratos</h2>
            <button type="button" className={botonSec} onClick={() => exportarExcel("contratos-alquiler", ["Placa", "Cliente", "Salida", "Estado", "Cantidad", "Modalidad", "Total", "Depósito"], contratos.map((c) => [c.placa, c.cliente, c.salida.slice(0, 10), c.estado, c.cantidad, c.modalidad, c.total, c.deposito]))}>Descargar Excel</button>
          </div>
          {contratos.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay contratos.</p> : contratos.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-foreground">{c.placa} · {c.cliente}</p>
                <p className="text-xs text-muted-foreground">{c.salida.slice(0, 10)} · {c.cantidad} {c.modalidad === "dias" ? "día(s)" : "hora(s)"} · {c.estado === "cerrado" ? `total ${dinero(c.total)} · ${c.km_entrega !== null ? c.km_entrega - c.km_salida : 0} km` : "en curso"}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Etiqueta texto={c.estado === "abierto" ? "Abierto" : "Liquidado"} tono={c.estado === "abierto" ? "info" : "ok"} />
                <button type="button" className={botonSec} onClick={() => imprimirContrato(c)}>Imprimir</button>
              </div>
            </div>
          ))}
        </GlassPanel>
      )}

      {vista === "multas" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Trasladar multa o peaje al cliente</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etiqueta="Contrato *">
                <select className={campo} value={mContrato} onChange={(e) => setMContrato(e.target.value)}>
                  <option value="">Elige…</option>
                  {contratos.map((c) => <option key={c.id} value={c.id}>{c.placa} · {c.cliente} · {c.salida.slice(0, 10)}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Concepto"><select className={campo} value={mConcepto} onChange={(e) => setMConcepto(e.target.value)}><option value="multa">Multa / comparendo</option><option value="peaje">Peaje</option><option value="otro">Otro</option></select></Campo>
              <Campo etiqueta="Valor *"><input className={campo} inputMode="decimal" value={mValor} onChange={(e) => setMValor(e.target.value)} /></Campo>
              <Campo etiqueta="Detalle"><input className={campo} value={mDetalle} onChange={(e) => setMDetalle(e.target.value)} /></Campo>
            </div>
            <button type="button" className={boton} onClick={() => void registrarMulta()}>Registrar</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-foreground">Pendientes y cobradas</h2>
              <SelectorMetodo valor={mMetodo} onChange={setMMetodo} />
            </div>
            {multas.length === 0 ? <p className="text-sm text-muted-foreground">No hay registros.</p> : multas.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-foreground">{m.placa} · {m.cliente} · {m.concepto}</p>
                  <p className="text-xs text-muted-foreground">{m.fecha}{m.detalle ? ` · ${m.detalle}` : ""}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-foreground">{dinero(m.valor)}</span>
                  {m.estado === "cobrada" ? <Etiqueta texto="Cobrada" tono="ok" /> : <button type="button" className={boton} onClick={() => void cobrarMulta(m)}>Cobrar a Caja</button>}
                </div>
              </div>
            ))}
          </GlassPanel>
        </>
      )}
    </div>
  );
}

export function FlotaAlquiler() {
  return <PanelAlquiler vistaInicial="flota" />;
}
export function ReservasAlquiler() {
  return <PanelAlquiler vistaInicial="nuevo" />;
}
export function ContratosAlquiler() {
  return <PanelAlquiler vistaInicial="contratos" />;
}
export function EntregasAlquiler() {
  return <PanelAlquiler vistaInicial="entregas" />;
}
export function MultasAlquiler() {
  return <PanelAlquiler vistaInicial="multas" />;
}
