import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";
import { exportarExcel, imprimirReporte } from "@/lib/exportes";
import { Etiqueta, Indicador, Pestanas, SelectorMetodo, aWhatsapp, msg } from "@/components/negocios/comunes";
import { MiniFoto, SubirFotos } from "@/components/negocios/FotosPrivadas";

type Mecanico = Tables<"mot_mecanicos">;
type Repuesto = Tables<"mot_repuestos">;
type Orden = Tables<"mot_ordenes">;
type ItemOrden = Tables<"mot_orden_repuestos">;

const CHECKLIST = ["Luces y direccionales", "Frenos delantero y trasero", "Llantas y rines", "Cadena / kit de arrastre", "Nivel de aceite", "Batería", "Suspensión", "Espejos y manubrio", "Rayones o golpes previos", "Casco y accesorios entregados"];
const ESTADOS: Record<string, string> = { recibida: "Recibida", en_reparacion: "En reparación", lista: "Lista para entregar", entregada: "Entregada", cancelada: "Cancelada" };

const FORM_VACIO = { placa: "", marca: "", cilindraje: "", km: "", cliente: "", documento: "", telefono: "", falla: "", manoObra: "", mecanico: "" };

// ------------------------------------------------------------------
// Órdenes de trabajo
// ------------------------------------------------------------------
export function OrdenesMoto() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [mecanicos, setMecanicos] = useState<Mecanico[]>([]);
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<"abiertas" | "nueva" | "comisiones" | "historial">("abiertas");
  const [f, setF] = useState(FORM_VACIO);
  const [check, setCheck] = useState<Record<string, boolean>>({});
  const [fotos, setFotos] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [abierta, setAbierta] = useState("");
  const [items, setItems] = useState<ItemOrden[]>([]);
  const [repSel, setRepSel] = useState("");
  const [cantSel, setCantSel] = useState("1");
  const [manoEdit, setManoEdit] = useState<Record<string, string>>({});
  const [metodo, setMetodo] = useState("efectivo");
  const [ocupado, setOcupado] = useState("");
  const [mNombre, setMNombre] = useState("");
  const [mPct, setMPct] = useState("");

  const cargar = useCallback(async () => {
    const [o, m, r] = await Promise.all([
      supabase.from("mot_ordenes").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("mot_mecanicos").select("*").order("nombre").limit(200),
      supabase.from("mot_repuestos").select("*").order("nombre").limit(2000),
    ]);
    setOrdenes(o.data ?? []);
    setMecanicos(m.data ?? []);
    setRepuestos(r.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cargarItems = useCallback(async (ordenId: string) => {
    const { data } = await supabase.from("mot_orden_repuestos").select("*").eq("orden_id", ordenId).eq("anulado", false).order("created_at");
    setItems(data ?? []);
  }, []);

  const abrir = (id: string) => {
    const nuevo = abierta === id ? "" : id;
    setAbierta(nuevo);
    setItems([]);
    if (nuevo) void cargarItems(nuevo);
  };

  const recibir = async () => {
    if (f.placa.trim().length < 4) return toast.error("Escribe la placa.");
    if (f.cliente.trim().length < 2) return toast.error("Escribe el nombre del cliente.");
    if (f.falla.trim().length < 3) return toast.error("Describe la falla o el servicio pedido.");
    setGuardando(true);
    const mec = mecanicos.find((m) => m.id === f.mecanico);
    const { error } = await supabase.from("mot_ordenes").insert({
      placa: f.placa.trim().toUpperCase(), marca: f.marca.trim() || null, cilindraje: f.cilindraje.trim() ? Math.round(num(f.cilindraje)) : null, kilometraje: Math.max(Math.round(num(f.km)), 0),
      cliente: f.cliente.trim(), documento: f.documento.trim() || null, telefono: f.telefono.trim() || null, falla: f.falla.trim(),
      checklist: check, fotos, mecanico_id: mec?.id ?? null, mecanico: mec?.nombre ?? null, mano_obra: Math.max(num(f.manoObra), 0),
    });
    setGuardando(false);
    if (error) return toast.error(msg(error.message, "No se pudo registrar la orden."));
    toast.success("Orden de recepción registrada.");
    imprimirReporte(`Recepción de moto ${f.placa.toUpperCase()}`, `${f.cliente}${f.telefono ? ` · ${f.telefono}` : ""}`,
      ["Dato", "Detalle"],
      [["Marca / cilindraje", `${f.marca || "—"} ${f.cilindraje ? `${f.cilindraje} cc` : ""}`], ["Kilometraje", f.km || "0"], ["Falla reportada", f.falla], ...CHECKLIST.map((c) => [c, check[c] ? "Revisado / entregado" : "—"])],
      ["Firma del cliente: ______________________"]);
    setF(FORM_VACIO);
    setCheck({});
    setFotos([]);
    setVista("abiertas");
    void cargar();
  };

  const cambiarEstado = async (o: Orden, estado: string) => {
    const { error } = await supabase.from("mot_ordenes").update({ estado }).eq("id", o.id);
    if (error) return toast.error(msg(error.message, "No se pudo cambiar el estado."));
    if (estado === "lista") {
      const u = aWhatsapp(o.telefono, `Hola ${o.cliente}, tu moto ${o.placa} ya está lista. Puedes pasar a recogerla.`);
      if (u) window.open(u, "_blank", "noopener");
    }
    void cargar();
  };

  const guardarCampo = async (o: Orden, cambios: Partial<Orden>) => {
    const { error } = await supabase.from("mot_ordenes").update(cambios).eq("id", o.id);
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    setManoEdit((x) => {
      const { [o.id]: _omitido, ...resto } = x;
      return resto;
    });
    void cargar();
  };

  const agregarRepuesto = async (o: Orden) => {
    if (!repSel) return toast.error("Elige el repuesto.");
    const cant = num(cantSel);
    if (cant <= 0) return toast.error("Escribe la cantidad.");
    const { error } = await supabase.rpc("mot_agregar_repuesto", { p_orden: o.id, p_repuesto: repSel, p_cantidad: cant });
    if (error) return toast.error(msg(error.message, "No se pudo agregar el repuesto."));
    toast.success("Repuesto descontado del inventario.");
    setCantSel("1");
    void cargarItems(o.id);
    void cargar();
  };

  const quitarRepuesto = async (o: Orden, it: ItemOrden) => {
    const { error } = await supabase.rpc("mot_quitar_repuesto", { p_item: it.id });
    if (error) return toast.error(msg(error.message, "No se pudo quitar."));
    toast.success("Repuesto devuelto al inventario.");
    void cargarItems(o.id);
    void cargar();
  };

  const entregar = async (o: Orden) => {
    const total = o.mano_obra + o.repuestos_total;
    if (!window.confirm(`Entregar la moto ${o.placa} y cobrar ${dinero(total)} a Caja?`)) return;
    setOcupado(o.id);
    const { data, error } = await supabase.rpc("mot_entregar", { p_orden: o.id, p_metodo: metodo });
    setOcupado("");
    if (error) return toast.error(msg(error.message, "No se pudo entregar la orden."));
    const r = (data ?? {}) as { total?: number; comision?: number };
    toast.success(`Entregada y cobrada: ${dinero(r.total ?? total)}.${(r.comision ?? 0) > 0 ? ` Comisión del mecánico: ${dinero(r.comision ?? 0)}.` : ""}`);
    const { data: lineas } = await supabase.from("mot_orden_repuestos").select("*").eq("orden_id", o.id).eq("anulado", false);
    imprimirReporte(`Factura de taller ${o.numero}`, `${o.cliente} · ${o.placa}`, ["Concepto", "Cant.", "Valor"],
      [["Mano de obra", "1", dinero(o.mano_obra)], ...(lineas ?? []).map((l) => [l.nombre, String(l.cantidad), dinero(l.subtotal)])],
      [`Total: ${dinero(total)}`, "Gracias por confiar en nosotros."]);
    setAbierta("");
    void cargar();
  };

  const cancelar = async (o: Orden) => {
    if (!window.confirm(`Cancelar la orden ${o.numero}? Los repuestos vuelven al inventario.`)) return;
    const { error } = await supabase.rpc("mot_cancelar", { p_orden: o.id });
    if (error) return toast.error(msg(error.message, "No se pudo cancelar."));
    toast.success("Orden cancelada.");
    setAbierta("");
    void cargar();
  };

  const crearMecanico = async () => {
    if (mNombre.trim().length < 2) return toast.error("Escribe el nombre del mecánico.");
    const pct = num(mPct);
    if (pct < 0 || pct > 100) return toast.error("La comisión va de 0 a 100 %.");
    const { error } = await supabase.from("mot_mecanicos").insert({ nombre: mNombre.trim(), comision_pct: pct });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el mecánico."));
    toast.success("Mecánico guardado.");
    setMNombre(""); setMPct("");
    void cargar();
  };

  const pagarComisiones = async (m: Mecanico) => {
    const { data, error } = await supabase.rpc("mot_pagar_comisiones", { p_mecanico: m.id, p_metodo: metodo });
    if (error) return toast.error(msg(error.message, "No se pudo pagar."));
    const r = (data ?? {}) as { total?: number };
    toast.success(`Comisiones de ${m.nombre} pagadas desde Caja: ${dinero(r.total ?? 0)}.`);
    void cargar();
  };

  if (cargando) return <Cargando />;
  const abiertas = ordenes.filter((o) => o.estado !== "entregada" && o.estado !== "cancelada");
  const entregadas = ordenes.filter((o) => o.estado === "entregada");
  const hoyTxt = new Date().toISOString().slice(0, 7);
  const ingresosMes = entregadas.filter((o) => (o.entregada_en ?? "").slice(0, 7) === hoyTxt).reduce((s, o) => s + o.total, 0);
  const pendienteMecanico = (id: string) => entregadas.filter((o) => o.mecanico_id === id && !o.comision_pagada).reduce((s, o) => s + o.comision, 0);

  return (
    <div className="space-y-6">
      <Encabezado titulo="Órdenes de trabajo del taller" texto="Recibe la moto con placa, cilindraje, kilometraje, checklist y fotos; asigna mecánico, descuenta repuestos del inventario y entrega cobrando a Caja con su comisión." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador titulo="Motos en taller" valor={abiertas.length} />
        <Indicador titulo="Listas para entregar" valor={abiertas.filter((o) => o.estado === "lista").length} />
        <Indicador titulo="Cobrado este mes" valor={dinero(ingresosMes)} />
        <Indicador titulo="Comisiones por pagar" valor={dinero(mecanicos.reduce((s, m) => s + pendienteMecanico(m.id), 0))} />
      </div>
      <Pestanas items={[{ clave: "abiertas", texto: "En taller" }, { clave: "nueva", texto: "Nueva recepción" }, { clave: "comisiones", texto: "Mecánicos y comisiones" }, { clave: "historial", texto: "Entregadas" }]} valor={vista} onChange={setVista} />

      {vista === "nueva" && (
        <GlassPanel className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo etiqueta="Placa *"><input className={campo} maxLength={10} value={f.placa} onChange={(e) => setF({ ...f, placa: e.target.value })} /></Campo>
            <Campo etiqueta="Marca / modelo"><input className={campo} maxLength={60} value={f.marca} onChange={(e) => setF({ ...f, marca: e.target.value })} /></Campo>
            <Campo etiqueta="Cilindraje (cc)"><input className={campo} inputMode="numeric" value={f.cilindraje} onChange={(e) => setF({ ...f, cilindraje: e.target.value })} /></Campo>
            <Campo etiqueta="Kilometraje"><input className={campo} inputMode="numeric" value={f.km} onChange={(e) => setF({ ...f, km: e.target.value })} /></Campo>
            <Campo etiqueta="Cliente *"><input className={campo} maxLength={120} value={f.cliente} onChange={(e) => setF({ ...f, cliente: e.target.value })} /></Campo>
            <Campo etiqueta="Documento"><input className={campo} maxLength={30} value={f.documento} onChange={(e) => setF({ ...f, documento: e.target.value })} /></Campo>
            <Campo etiqueta="Teléfono"><input className={campo} inputMode="tel" maxLength={20} value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></Campo>
            <Campo etiqueta="Mecánico">
              <select className={campo} value={f.mecanico} onChange={(e) => setF({ ...f, mecanico: e.target.value })}>
                <option value="">Sin asignar</option>
                {mecanicos.filter((m) => m.activo).map((m) => <option key={m.id} value={m.id}>{m.nombre} ({m.comision_pct} %)</option>)}
              </select>
            </Campo>
            <Campo etiqueta="Mano de obra estimada"><input className={campo} inputMode="decimal" value={f.manoObra} onChange={(e) => setF({ ...f, manoObra: e.target.value })} /></Campo>
          </div>
          <Campo etiqueta="Falla reportada o servicio pedido *"><textarea className={campo} rows={2} maxLength={500} value={f.falla} onChange={(e) => setF({ ...f, falla: e.target.value })} /></Campo>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Checklist de recepción (marca lo que revisaste o recibiste)</p>
            <div className="grid gap-1 sm:grid-cols-2">
              {CHECKLIST.map((c) => (
                <label key={c} className="flex items-center gap-2 text-sm text-foreground">
                  <input type="checkbox" checked={!!check[c]} onChange={(e) => setCheck((x) => ({ ...x, [c]: e.target.checked }))} /> {c}
                </label>
              ))}
            </div>
          </div>
          <SubirFotos carpeta="taller-motos" rutas={fotos} onChange={setFotos} />
          <button type="button" className={boton} disabled={guardando} onClick={() => void recibir()}>{guardando ? "Guardando..." : "Registrar recepción"}</button>
        </GlassPanel>
      )}

      {vista === "comisiones" && (
        <GlassPanel className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Campo etiqueta="Nombre del mecánico"><input className={campo} maxLength={80} value={mNombre} onChange={(e) => setMNombre(e.target.value)} /></Campo>
            <Campo etiqueta="Comisión sobre mano de obra (%)"><input className={campo} inputMode="decimal" value={mPct} onChange={(e) => setMPct(e.target.value)} /></Campo>
            <div className="flex items-end"><button type="button" className={boton} onClick={() => void crearMecanico()}>Guardar mecánico</button></div>
          </div>
          <Campo etiqueta="Pagar comisiones con"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
          {mecanicos.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay mecánicos.</p> : mecanicos.map((m) => {
            const pend = pendienteMecanico(m.id);
            const hechas = entregadas.filter((o) => o.mecanico_id === m.id).length;
            return (
              <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{m.nombre} · {m.comision_pct} %</p>
                  <p className="text-xs text-muted-foreground">{hechas} orden(es) entregada(s) · Pendiente por pagar {dinero(pend)}</p>
                </div>
                <button type="button" className={boton} disabled={pend <= 0} onClick={() => void pagarComisiones(m)}>Pagar {dinero(pend)}</button>
              </div>
            );
          })}
        </GlassPanel>
      )}

      {vista === "abiertas" && (
        <GlassPanel className="space-y-2 p-4">
          <Campo etiqueta="Cobrar la entrega con"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
          {abiertas.length === 0 ? <p className="text-sm text-muted-foreground">No hay motos en el taller.</p> : abiertas.map((o) => {
            const total = o.mano_obra + o.repuestos_total;
            return (
              <div key={o.id} className="space-y-3 rounded-xl border border-glass-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button type="button" className="min-w-0 text-left" onClick={() => abrir(o.id)}>
                    <p className="break-words text-sm font-semibold text-foreground">{o.placa} · {o.marca ?? "Moto"}{o.cilindraje ? ` ${o.cilindraje} cc` : ""} · {o.cliente}</p>
                    <p className="text-xs text-muted-foreground">{o.numero} · {o.kilometraje} km · {o.mecanico ?? "Sin mecánico"} · {o.falla}</p>
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    <Etiqueta texto={ESTADOS[o.estado] ?? o.estado} tono={o.estado === "lista" ? "ok" : "info"} />
                    <span className="text-sm font-medium text-foreground">{dinero(total)}</span>
                    <button type="button" className={botonSec} onClick={() => abrir(o.id)}>{abierta === o.id ? "Cerrar" : "Gestionar"}</button>
                  </div>
                </div>
                {abierta === o.id && (
                  <div className="space-y-3 border-t border-glass-border pt-3">
                    {o.fotos.length > 0 && <div className="flex flex-wrap gap-2">{o.fotos.map((r) => <MiniFoto key={r} ruta={r} />)}</div>}
                    <div className="flex flex-wrap items-end gap-3">
                      <Campo etiqueta="Mecánico">
                        <select className={campo} value={o.mecanico_id ?? ""} onChange={(e) => { const m = mecanicos.find((x) => x.id === e.target.value); void guardarCampo(o, { mecanico_id: m?.id ?? null, mecanico: m?.nombre ?? null }); }}>
                          <option value="">Sin asignar</option>
                          {mecanicos.filter((m) => m.activo).map((m) => <option key={m.id} value={m.id}>{m.nombre} ({m.comision_pct} %)</option>)}
                        </select>
                      </Campo>
                      <Campo etiqueta="Mano de obra"><input className={`${campo} !w-36`} inputMode="decimal" value={manoEdit[o.id] ?? String(o.mano_obra)} onChange={(e) => setManoEdit((x) => ({ ...x, [o.id]: e.target.value }))} /></Campo>
                      {manoEdit[o.id] !== undefined && <button type="button" className={botonSec} onClick={() => void guardarCampo(o, { mano_obra: Math.max(num(manoEdit[o.id]), 0) })}>Guardar</button>}
                      <Campo etiqueta="Próximo mantenimiento"><input className={campo} type="date" value={o.prox_mantenimiento ?? ""} onChange={(e) => void guardarCampo(o, { prox_mantenimiento: e.target.value || null })} /></Campo>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Repuestos usados (se descuentan del inventario)</p>
                      <div className="flex flex-wrap items-end gap-2">
                        <select className={`${campo} sm:!w-72`} aria-label="Repuesto" value={repSel} onChange={(e) => setRepSel(e.target.value)}>
                          <option value="">Elige un repuesto...</option>
                          {repuestos.filter((r) => r.activo && r.stock > 0).map((r) => <option key={r.id} value={r.id}>{r.nombre} · stock {r.stock} · {dinero(r.precio)}</option>)}
                        </select>
                        <input className={`${campo} !w-24`} aria-label="Cantidad" inputMode="decimal" value={cantSel} onChange={(e) => setCantSel(e.target.value)} />
                        <button type="button" className={botonSec} onClick={() => void agregarRepuesto(o)}>Agregar</button>
                      </div>
                      {items.map((it) => (
                        <div key={it.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="break-words text-foreground">{it.cantidad} x {it.nombre}</span>
                          <span className="flex items-center gap-2"><strong>{dinero(it.subtotal)}</strong><button type="button" className={botonSec} onClick={() => void quitarRepuesto(o, it)}>Quitar</button></span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {o.estado === "recibida" && <button type="button" className={botonSec} onClick={() => void cambiarEstado(o, "en_reparacion")}>Iniciar reparación</button>}
                      {(o.estado === "recibida" || o.estado === "en_reparacion") && <button type="button" className={botonSec} onClick={() => void cambiarEstado(o, "lista")}>Marcar lista y avisar</button>}
                      <button type="button" className={boton} disabled={ocupado === o.id || total <= 0} onClick={() => void entregar(o)}>Entregar y cobrar {dinero(total)}</button>
                      <button type="button" className={botonSec} onClick={() => void cancelar(o)}>Cancelar orden</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </GlassPanel>
      )}

      {vista === "historial" && (
        <GlassPanel className="space-y-2 p-4">
          <div className="flex justify-end">
            <button type="button" className={botonSec} onClick={() => exportarExcel("ordenes-taller-motos", ["Orden", "Placa", "Cliente", "Mecánico", "Mano de obra", "Repuestos", "Total", "Comisión", "Entregada"], entregadas.map((o) => [o.numero, o.placa, o.cliente, o.mecanico ?? "", o.mano_obra, o.repuestos_total, o.total, o.comision, (o.entregada_en ?? "").slice(0, 10)]))}>Descargar Excel</button>
          </div>
          {entregadas.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay órdenes entregadas.</p> : entregadas.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
              <p className="break-words text-sm text-foreground">{o.numero} · {o.placa} · {o.cliente} · {(o.entregada_en ?? "").slice(0, 10)}</p>
              <span className="text-sm font-medium text-foreground">{dinero(o.total)}</span>
            </div>
          ))}
        </GlassPanel>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// Repuestos y accesorios
// ------------------------------------------------------------------
export function RepuestosMoto() {
  const [lista, setLista] = useState<Repuesto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [f, setF] = useState({ nombre: "", referencia: "", proveedor: "", minimo: "", costo: "", precio: "" });
  const [ing, setIng] = useState<Record<string, { cant: string; costo: string }>>({});
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [metodo, setMetodo] = useState("efectivo");

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("mot_repuestos").select("*").order("nombre").limit(2000);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (f.nombre.trim().length < 2) return toast.error("Escribe el nombre del repuesto.");
    const { error } = await supabase.from("mot_repuestos").insert({ nombre: f.nombre.trim(), referencia: f.referencia.trim() || null, proveedor: f.proveedor.trim() || null, stock_minimo: Math.max(num(f.minimo), 0), costo: Math.max(num(f.costo), 0), precio: Math.max(num(f.precio), 0) });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el repuesto."));
    toast.success("Repuesto guardado. Ingresa su stock.");
    setF({ nombre: "", referencia: "", proveedor: "", minimo: "", costo: "", precio: "" });
    void cargar();
  };

  const ingresar = async (r: Repuesto) => {
    const v = ing[r.id];
    const cant = num(v?.cant ?? "");
    if (cant <= 0) return toast.error("Escribe la cantidad que ingresa.");
    const { error } = await supabase.rpc("mot_ingresar_stock", { p_repuesto: r.id, p_cantidad: cant, p_costo: num(v?.costo ?? "") || r.costo, p_metodo: metodo });
    if (error) return toast.error(msg(error.message, "No se pudo ingresar el stock."));
    toast.success("Stock ingresado.");
    setIng((x) => ({ ...x, [r.id]: { cant: "", costo: "" } }));
    void cargar();
  };

  const guardarPrecio = async (r: Repuesto) => {
    const v = precios[r.id];
    if (v === undefined) return;
    const { error } = await supabase.from("mot_repuestos").update({ precio: Math.max(num(v), 0) }).eq("id", r.id);
    if (error) return toast.error(msg(error.message, "No se pudo guardar el precio."));
    setPrecios((x) => {
      const { [r.id]: _omitido, ...resto } = x;
      return resto;
    });
    void cargar();
  };

  if (cargando) return <Cargando />;
  const bajos = lista.filter((r) => r.activo && r.stock <= r.stock_minimo);
  const valor = lista.reduce((s, r) => s + r.stock * r.costo, 0);

  return (
    <div className="space-y-6">
      <Encabezado titulo="Repuestos y accesorios" texto="Inventario con stock mínimo, proveedor y precio de venta. Lo que usas en una orden se descuenta solo; las compras salen de Caja o quedan con el proveedor." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador titulo="Referencias" valor={lista.length} />
        <Indicador titulo="Valor del inventario" valor={dinero(valor)} />
        <Indicador titulo="Con stock bajo" valor={bajos.length} alerta={bajos.length > 0} />
      </div>
      <GlassPanel className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-foreground">Nuevo repuesto</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Campo etiqueta="Nombre *"><input className={campo} maxLength={120} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Campo>
          <Campo etiqueta="Referencia"><input className={campo} maxLength={60} value={f.referencia} onChange={(e) => setF({ ...f, referencia: e.target.value })} /></Campo>
          <Campo etiqueta="Proveedor"><input className={campo} maxLength={80} value={f.proveedor} onChange={(e) => setF({ ...f, proveedor: e.target.value })} /></Campo>
          <Campo etiqueta="Stock mínimo"><input className={campo} inputMode="decimal" value={f.minimo} onChange={(e) => setF({ ...f, minimo: e.target.value })} /></Campo>
          <Campo etiqueta="Costo"><input className={campo} inputMode="decimal" value={f.costo} onChange={(e) => setF({ ...f, costo: e.target.value })} /></Campo>
          <Campo etiqueta="Precio de venta"><input className={campo} inputMode="decimal" value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })} /></Campo>
        </div>
        <button type="button" className={boton} onClick={() => void crear()}>Guardar repuesto</button>
      </GlassPanel>
      <GlassPanel className="space-y-2 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Campo etiqueta="Pagar las compras con">
            <select className={campo} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="credito">A crédito con el proveedor</option>
            </select>
          </Campo>
          <button type="button" className={botonSec} onClick={() => exportarExcel("repuestos-taller-motos", ["Repuesto", "Referencia", "Proveedor", "Stock", "Mínimo", "Costo", "Precio"], lista.map((r) => [r.nombre, r.referencia ?? "", r.proveedor ?? "", r.stock, r.stock_minimo, r.costo, r.precio]))}>Descargar Excel</button>
        </div>
        {lista.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay repuestos.</p> : lista.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-glass-border p-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-foreground">{r.nombre}{r.referencia ? ` · ${r.referencia}` : ""}</p>
              <p className="text-xs text-muted-foreground">Stock {r.stock} (mínimo {r.stock_minimo}) · Costo {dinero(r.costo)}{r.proveedor ? ` · ${r.proveedor}` : ""}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {r.stock <= r.stock_minimo && <Etiqueta texto="Stock bajo" tono="alerta" />}
              <input className={`${campo} !w-28`} aria-label="Precio de venta" inputMode="decimal" value={precios[r.id] ?? String(r.precio)} onChange={(e) => setPrecios((x) => ({ ...x, [r.id]: e.target.value }))} />
              {precios[r.id] !== undefined && <button type="button" className={botonSec} onClick={() => void guardarPrecio(r)}>Guardar</button>}
              <input className={`${campo} !w-24`} aria-label="Cantidad que ingresa" placeholder="Ingresa" inputMode="decimal" value={ing[r.id]?.cant ?? ""} onChange={(e) => setIng((x) => ({ ...x, [r.id]: { cant: e.target.value, costo: x[r.id]?.costo ?? "" } }))} />
              <input className={`${campo} !w-28`} aria-label="Costo unitario" placeholder="Costo" inputMode="decimal" value={ing[r.id]?.costo ?? ""} onChange={(e) => setIng((x) => ({ ...x, [r.id]: { cant: x[r.id]?.cant ?? "", costo: e.target.value } }))} />
              <button type="button" className={boton} onClick={() => void ingresar(r)}>Ingresar</button>
            </div>
          </div>
        ))}
      </GlassPanel>
    </div>
  );
}
