import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";
import { Etiqueta, Indicador, SelectorMetodo, msg } from "@/components/negocios/comunes";

type Orden = Tables<"tex_ordenes">;
type Insumo = Tables<"tex_insumos">;
type Consumo = Tables<"tex_consumos">;
type Entrega = Tables<"tex_entregas">;

const TALLAS = ["XS", "S", "M", "L", "XL", "XXL", "6", "8", "10", "12", "14", "16"];
const ESTADOS: { clave: string; texto: string }[] = [
  { clave: "corte", texto: "Corte" },
  { clave: "confeccion", texto: "Confección" },
  { clave: "terminada", texto: "Terminada" },
  { clave: "entregada", texto: "Entregada" },
];

const leerTallas = (t: Orden["tallas"]): Record<string, number> => {
  if (t && typeof t === "object" && !Array.isArray(t)) {
    const salida: Record<string, number> = {};
    for (const [k, v] of Object.entries(t)) if (typeof v === "number" && v > 0) salida[k] = v;
    return salida;
  }
  return {};
};

function TarjetaOrden({ orden, insumos, consumos, entregas, onCambio }: { orden: Orden; insumos: Insumo[]; consumos: Consumo[]; entregas: Entrega[]; onCambio: () => void }) {
  const [insumo, setInsumo] = useState("");
  const [porPrenda, setPorPrenda] = useState("");
  const [prendas, setPrendas] = useState(String(orden.cantidad));
  const [entregar, setEntregar] = useState(String(Math.max(orden.cantidad - orden.entregadas, 0)));
  const [metodo, setMetodo] = useState("efectivo");
  const [mano, setMano] = useState(String(orden.mano_obra));
  const [ocupado, setOcupado] = useState(false);

  const pendientes = orden.cantidad - orden.entregadas;
  const costoTotal = orden.costo_insumos + orden.mano_obra;
  const costoPrenda = orden.cantidad > 0 ? costoTotal / orden.cantidad : 0;
  const margenPrenda = orden.precio_unit - costoPrenda;
  const totalConsumo = num(porPrenda) * num(prendas);
  const tallas = leerTallas(orden.tallas);

  const cambiarEstado = async (estado: string) => {
    const { error } = await supabase.from("tex_ordenes").update({ estado }).eq("id", orden.id);
    if (error) return toast.error(msg(error.message, "No se pudo cambiar el estado."));
    onCambio();
  };
  const guardarMano = async () => {
    const { error } = await supabase.from("tex_ordenes").update({ mano_obra: Math.max(num(mano), 0) }).eq("id", orden.id);
    if (error) return toast.error(msg(error.message, "No se pudo guardar la mano de obra."));
    toast.success("Mano de obra del lote actualizada.");
    onCambio();
  };
  const consumir = async () => {
    if (!insumo) return toast.error("Elige la tela o insumo.");
    if (totalConsumo <= 0) return toast.error("Escribe el consumo por prenda.");
    setOcupado(true);
    const { data, error } = await supabase.rpc("tex_consumir", { p_orden: orden.id, p_insumo: insumo, p_cantidad: totalConsumo });
    setOcupado(false);
    if (error) return toast.error(msg(error.message, "No se pudo descontar el insumo."));
    const r = (data ?? {}) as { costo?: number };
    toast.success(`Insumo descontado del inventario: suma ${dinero(r.costo ?? 0)} al costo del lote.`);
    setPorPrenda("");
    onCambio();
  };
  const entregarPrendas = async () => {
    const n = Math.round(num(entregar));
    if (n <= 0) return toast.error("Escribe cuántas prendas entregas.");
    setOcupado(true);
    const { data, error } = await supabase.rpc("tex_entregar", { p_orden: orden.id, p_cantidad: n, p_metodo: metodo });
    setOcupado(false);
    if (error) return toast.error(msg(error.message, "No se pudo registrar la entrega."));
    const r = (data ?? {}) as { cobrado?: number; pendientes?: number };
    toast.success(`Entrega registrada: ${dinero(r.cobrado ?? 0)} a Caja. Quedan ${r.pendientes ?? 0} prendas.`);
    onCambio();
  };

  const mias = consumos.filter((c) => c.orden_id === orden.id);
  const misEntregas = entregas.filter((e) => e.orden_id === orden.id);

  return (
    <GlassPanel className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words font-display text-lg text-foreground">{orden.referencia}{orden.color ? ` · ${orden.color}` : ""}</h3>
          <p className="break-words text-xs text-muted-foreground">{orden.cliente ?? "Producción propia"} · {orden.cantidad} prendas · {dinero(orden.precio_unit)} c/u{orden.fecha_entrega ? ` · entrega ${orden.fecha_entrega}` : ""}</p>
        </div>
        <Etiqueta texto={ESTADOS.find((e) => e.clave === orden.estado)?.texto ?? orden.estado} tono={orden.estado === "entregada" ? "ok" : "info"} />
      </div>
      {Object.keys(tallas).length > 0 && (
        <div className="flex flex-wrap gap-1">{Object.entries(tallas).map(([t, n]) => <Etiqueta key={t} texto={`${t}: ${n}`} />)}</div>
      )}
      <div>
        <div className="h-2 overflow-hidden rounded-full bg-glass/60"><div className="h-full bg-primary" style={{ width: `${Math.min((orden.entregadas / orden.cantidad) * 100, 100)}%` }} /></div>
        <p className="mt-1 text-xs text-muted-foreground">Entregadas {orden.entregadas} de {orden.cantidad} · cobrado {dinero(orden.cobrado)}</p>
      </div>

      {orden.estado !== "entregada" && (
        <div className="flex flex-wrap gap-2">
          {orden.estado === "corte" && <button type="button" className={botonSec} onClick={() => void cambiarEstado("confeccion")}>Pasar a confección</button>}
          {orden.estado === "confeccion" && <button type="button" className={botonSec} onClick={() => void cambiarEstado("terminada")}>Marcar terminada</button>}
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador titulo="Insumos" valor={dinero(orden.costo_insumos)} />
        <Indicador titulo="Mano de obra" valor={dinero(orden.mano_obra)} />
        <Indicador titulo="Costo por prenda" valor={dinero(Math.round(costoPrenda))} />
        <Indicador titulo="Margen por prenda" valor={dinero(Math.round(margenPrenda))} alerta={margenPrenda < 0} nota={`Utilidad del lote ${dinero(Math.round(orden.precio_unit * orden.cantidad - costoTotal))}`} />
      </div>

      {orden.estado !== "entregada" && (
        <>
          <div className="space-y-2 rounded-xl border border-glass-border p-3">
            <p className="text-sm font-semibold text-foreground">Explosión de insumos (descuenta del inventario)</p>
            <div className="grid gap-2 sm:grid-cols-4">
              <select className={campo} value={insumo} onChange={(e) => setInsumo(e.target.value)} aria-label="Insumo">
                <option value="">Tela o insumo…</option>
                {insumos.filter((i) => i.activo).map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.stock} {i.unidad})</option>)}
              </select>
              <input className={campo} inputMode="decimal" placeholder="Consumo por prenda" value={porPrenda} onChange={(e) => setPorPrenda(e.target.value)} />
              <input className={campo} inputMode="numeric" placeholder="Prendas" value={prendas} onChange={(e) => setPrendas(e.target.value)} />
              <button type="button" className={boton} disabled={ocupado} onClick={() => void consumir()}>Descontar {totalConsumo > 0 ? totalConsumo.toFixed(2) : ""}</button>
            </div>
            {mias.length > 0 && <p className="text-xs text-muted-foreground">Consumido: {mias.map((c) => `${c.nombre} ${c.cantidad}`).join(" · ")}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <input className={`${campo} !w-40`} inputMode="decimal" aria-label="Mano de obra del lote" value={mano} onChange={(e) => setMano(e.target.value)} />
              <button type="button" className={botonSec} onClick={() => void guardarMano()}>Guardar mano de obra del lote</button>
            </div>
          </div>
          <div className="space-y-2 rounded-xl border border-glass-border p-3">
            <p className="text-sm font-semibold text-foreground">Entrega parcial o total (cobra a Caja)</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input className={campo} inputMode="numeric" aria-label="Prendas a entregar" value={entregar} onChange={(e) => setEntregar(e.target.value)} />
              <SelectorMetodo valor={metodo} onChange={setMetodo} />
              <button type="button" className={boton} disabled={ocupado || pendientes <= 0} onClick={() => void entregarPrendas()}>Entregar y cobrar {dinero(Math.round(num(entregar)) * orden.precio_unit)}</button>
            </div>
          </div>
        </>
      )}
      {misEntregas.length > 0 && <p className="text-xs text-muted-foreground">Entregas: {misEntregas.map((e) => `${new Date(e.created_at).toLocaleDateString("es-CO")} · ${e.cantidad} und`).join(" | ")}</p>}
    </GlassPanel>
  );
}

export function OrdenesConfeccion() {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [consumos, setConsumos] = useState<Consumo[]>([]);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("activas");
  const [referencia, setReferencia] = useState("");
  const [cliente, setCliente] = useState("");
  const [color, setColor] = useState("");
  const [tallas, setTallas] = useState<Record<string, string>>({});
  const [precio, setPrecio] = useState("");
  const [mano, setMano] = useState("");
  const [fecha, setFecha] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const [o, i, c, e] = await Promise.all([
      supabase.from("tex_ordenes").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("tex_insumos").select("*").order("nombre"),
      supabase.from("tex_consumos").select("*").order("created_at", { ascending: false }).limit(1000),
      supabase.from("tex_entregas").select("*").order("created_at", { ascending: false }).limit(1000),
    ]);
    setOrdenes(o.data ?? []);
    setInsumos(i.data ?? []);
    setConsumos(c.data ?? []);
    setEntregas(e.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const totalPrendas = Object.values(tallas).reduce((s, v) => s + Math.max(Math.round(num(v)), 0), 0);

  const crear = async () => {
    if (!referencia.trim()) return toast.error("Escribe la referencia de la prenda.");
    if (totalPrendas <= 0) return toast.error("Escribe las cantidades por talla.");
    const mapa: Record<string, number> = {};
    for (const [t, v] of Object.entries(tallas)) {
      const n = Math.max(Math.round(num(v)), 0);
      if (n > 0) mapa[t] = n;
    }
    setGuardando(true);
    const { error } = await supabase.from("tex_ordenes").insert({
      referencia: referencia.trim(), cliente: cliente.trim() || null, color: color.trim() || null, tallas: mapa, cantidad: totalPrendas,
      precio_unit: Math.max(num(precio), 0), mano_obra: Math.max(num(mano), 0), fecha_entrega: fecha || null, notas: notas.trim() || null,
    });
    setGuardando(false);
    if (error) return toast.error(msg(error.message, "No se pudo crear la orden."));
    toast.success("Orden de corte y producción creada.");
    setReferencia(""); setCliente(""); setColor(""); setTallas({}); setPrecio(""); setMano(""); setFecha(""); setNotas("");
    void cargar();
  };

  const lista = useMemo(() => ordenes.filter((o) => (filtro === "todas" ? true : filtro === "entregadas" ? o.estado === "entregada" : o.estado !== "entregada")), [ordenes, filtro]);

  if (cargando) return <Cargando />;
  const enProceso = ordenes.filter((o) => o.estado !== "entregada");
  return (
    <div className="space-y-6">
      <Encabezado titulo="Órdenes de corte y confección" texto="Lotes por referencia, talla y color. Descuenta telas e insumos del inventario, controla entregas parciales con cobro a Caja y muestra el costo y el margen por prenda." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador titulo="Lotes en proceso" valor={enProceso.length} />
        <Indicador titulo="Prendas por entregar" valor={enProceso.reduce((s, o) => s + o.cantidad - o.entregadas, 0)} />
        <Indicador titulo="Cobrado en entregas" valor={dinero(ordenes.reduce((s, o) => s + o.cobrado, 0))} />
      </div>

      <GlassPanel className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-foreground">Nueva orden</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Referencia *"><input className={campo} value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="Ej. Camisa polo REF-120" /></Campo>
          <Campo etiqueta="Cliente"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
          <Campo etiqueta="Color"><input className={campo} value={color} onChange={(e) => setColor(e.target.value)} /></Campo>
          <Campo etiqueta="Entrega pactada"><input type="date" className={campo} value={fecha} onChange={(e) => setFecha(e.target.value)} /></Campo>
          <Campo etiqueta="Precio por prenda"><input className={campo} inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Campo>
          <Campo etiqueta="Mano de obra del lote"><input className={campo} inputMode="decimal" value={mano} onChange={(e) => setMano(e.target.value)} /></Campo>
          <Campo etiqueta="Notas"><input className={campo} value={notas} onChange={(e) => setNotas(e.target.value)} /></Campo>
        </div>
        <div>
          <p className="mb-1 text-sm text-muted-foreground">Cantidades por talla (total {totalPrendas})</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
            {TALLAS.map((t) => (
              <label key={t} className="block text-center text-xs text-muted-foreground">
                {t}
                <input className={campo} inputMode="numeric" value={tallas[t] ?? ""} onChange={(e) => setTallas((x) => ({ ...x, [t]: e.target.value }))} />
              </label>
            ))}
          </div>
        </div>
        <button type="button" className={boton} disabled={guardando} onClick={() => void crear()}>{guardando ? "Guardando…" : "Crear orden"}</button>
      </GlassPanel>

      <Campo etiqueta="Mostrar">
        <select className={`${campo} !w-48`} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="activas">En proceso</option><option value="entregadas">Entregadas</option><option value="todas">Todas</option>
        </select>
      </Campo>
      {lista.length === 0 ? <p className="text-sm text-muted-foreground">No hay órdenes con este filtro.</p> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {lista.map((o) => <TarjetaOrden key={o.id} orden={o} insumos={insumos} consumos={consumos} entregas={entregas} onCambio={() => void cargar()} />)}
        </div>
      )}
    </div>
  );
}

export function InsumosTextil() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [unidad, setUnidad] = useState("m");
  const [stock, setStock] = useState("");
  const [costo, setCosto] = useState("");
  const [suma, setSuma] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("tex_insumos").select("*").order("nombre");
    setInsumos(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (nombre.trim().length < 2) return toast.error("Escribe el nombre del insumo.");
    const { error } = await supabase.from("tex_insumos").insert({ nombre: nombre.trim(), unidad, stock: Math.max(num(stock), 0), costo: Math.max(num(costo), 0) });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el insumo."));
    toast.success("Insumo guardado.");
    setNombre(""); setStock(""); setCosto("");
    void cargar();
  };
  const agregar = async (i: Insumo) => {
    const n = num(suma[i.id] ?? "");
    if (n <= 0) return toast.error("Escribe cuánto entra al inventario.");
    const { error } = await supabase.from("tex_insumos").update({ stock: i.stock + n }).eq("id", i.id);
    if (error) return toast.error(msg(error.message, "No se pudo sumar al inventario."));
    setSuma((x) => ({ ...x, [i.id]: "" }));
    void cargar();
  };

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Telas e insumos" texto="Inventario de telas, hilos, botones y cremalleras. Se descuenta al consumirlos en cada orden de confección y su costo suma al costo del lote." />
      <GlassPanel className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Nombre *"><input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Tela jersey azul" /></Campo>
          <Campo etiqueta="Unidad"><select className={campo} value={unidad} onChange={(e) => setUnidad(e.target.value)}>{["m", "und", "kg", "rollo", "cono"].map((u) => <option key={u} value={u}>{u}</option>)}</select></Campo>
          <Campo etiqueta="Existencia inicial"><input className={campo} inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} /></Campo>
          <Campo etiqueta="Costo por unidad"><input className={campo} inputMode="decimal" value={costo} onChange={(e) => setCosto(e.target.value)} /></Campo>
        </div>
        <button type="button" className={boton} onClick={() => void crear()}>Guardar insumo</button>
      </GlassPanel>
      <GlassPanel className="space-y-2 p-4">
        {insumos.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay insumos.</p> : insumos.map((i) => (
          <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
            <div className="min-w-0"><p className="break-words text-sm font-semibold text-foreground">{i.nombre}</p><p className="text-xs text-muted-foreground">{i.stock} {i.unidad} · {dinero(i.costo)} c/u · valor {dinero(Math.round(i.stock * i.costo))}</p></div>
            <div className="flex flex-wrap items-center gap-2">
              {i.stock <= 0 && <Etiqueta texto="Agotado" tono="alerta" />}
              <input className={`${campo} !w-28`} inputMode="decimal" placeholder="Entra" aria-label="Cantidad que entra" value={suma[i.id] ?? ""} onChange={(e) => setSuma((x) => ({ ...x, [i.id]: e.target.value }))} />
              <button type="button" className={botonSec} onClick={() => void agregar(i)}>Sumar</button>
            </div>
          </div>
        ))}
      </GlassPanel>
    </div>
  );
}
