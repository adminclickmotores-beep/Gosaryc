import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";
import { exportarExcel, imprimirReporte } from "@/lib/exportes";
import { Etiqueta, Indicador, Pestanas, SelectorMetodo, aWhatsapp, msg } from "@/components/negocios/comunes";

type DisCliente = Tables<"dis_clientes">;
type DisProducto = Tables<"dis_productos">;
type DisPrecio = Tables<"dis_precios">;
type DisRuta = Tables<"dis_rutas">;
type DisPedido = Tables<"dis_pedidos">;

const CANALES = [
  { clave: "mayorista", texto: "Mayorista" },
  { clave: "distribuidor", texto: "Distribuidor" },
  { clave: "tienda", texto: "Tienda" },
] as const;
const PRESENTACIONES = ["caja", "paca", "bulto", "unidad"] as const;

type Datos = { clientes: DisCliente[]; productos: DisProducto[]; precios: DisPrecio[]; rutas: DisRuta[]; pedidos: DisPedido[] };
const VACIO: Datos = { clientes: [], productos: [], precios: [], rutas: [], pedidos: [] };

function useDatos() {
  const [datos, setDatos] = useState<Datos>(VACIO);
  const [cargando, setCargando] = useState(true);
  const recargar = useCallback(async () => {
    const [c, p, pr, r, pe] = await Promise.all([
      supabase.from("dis_clientes").select("*").order("nombre").limit(1000),
      supabase.from("dis_productos").select("*").order("nombre").limit(1000),
      supabase.from("dis_precios").select("*").order("desde_unidades").limit(3000),
      supabase.from("dis_rutas").select("*").order("nombre").limit(300),
      supabase.from("dis_pedidos").select("*").order("created_at", { ascending: false }).limit(500),
    ]);
    setDatos({ clientes: c.data ?? [], productos: p.data ?? [], precios: pr.data ?? [], rutas: r.data ?? [], pedidos: pe.data ?? [] });
    setCargando(false);
  }, []);
  useEffect(() => {
    void recargar();
  }, [recargar]);
  return { datos, cargando, recargar };
}

/** Precio por unidad según el escalón de volumen del canal del cliente (igual que en la base de datos). */
function precioUnidad(prod: DisProducto, canal: string, unidades: number, precios: DisPrecio[]): number {
  const escalones = precios.filter((p) => p.producto_id === prod.id && p.canal === canal && p.desde_unidades <= unidades).sort((a, b) => b.desde_unidades - a.desde_unidades);
  return escalones[0]?.precio_unidad ?? prod.precio_unidad;
}

const textoStock = (p: DisProducto): string => {
  const pres = Math.floor(p.stock_unidades / p.unidades_por_presentacion);
  const resto = p.stock_unidades - pres * p.unidades_por_presentacion;
  return p.presentacion === "unidad" ? `${p.stock_unidades} und` : `${pres} ${p.presentacion}(s)${resto > 0 ? ` + ${resto} und` : ""}`;
};

// ------------------------------------------------------------------
// Pedidos de clientes (preventa)
// ------------------------------------------------------------------
export function PedidosDistribuidora() {
  const { datos, cargando, recargar } = useDatos();
  const [clienteId, setClienteId] = useState("");
  const [rutaId, setRutaId] = useState("");
  const [entrega, setEntrega] = useState("");
  const [condicion, setCondicion] = useState("contado");
  const [lineas, setLineas] = useState<{ producto_id: string; cantidad: number }[]>([]);
  const [prodSel, setProdSel] = useState("");
  const [cantSel, setCantSel] = useState("1");
  const [guardando, setGuardando] = useState(false);

  if (cargando) return <Cargando />;
  const cliente = datos.clientes.find((c) => c.id === clienteId);
  const canal = cliente?.canal ?? "tienda";

  const calculo = lineas.map((l) => {
    const p = datos.productos.find((x) => x.id === l.producto_id);
    if (!p) return { ...l, nombre: "—", unidades: 0, precio: 0, subtotal: 0, presentacion: "" };
    const unidades = l.cantidad * p.unidades_por_presentacion;
    const precio = precioUnidad(p, canal, unidades, datos.precios);
    return { ...l, nombre: p.nombre, unidades, precio, subtotal: Math.round(unidades * precio), presentacion: p.presentacion };
  });
  const total = calculo.reduce((s, l) => s + l.subtotal, 0);
  const pendientesCredito = cliente ? datos.pedidos.filter((p) => p.cliente_id === cliente.id && p.condicion === "credito" && p.estado === "preventa").reduce((s, p) => s + p.total, 0) : 0;
  const cupoLibre = cliente ? cliente.cupo_credito - cliente.saldo - pendientesCredito : 0;

  const agregar = () => {
    const cant = Math.round(num(cantSel));
    if (!prodSel) return toast.error("Elige un producto.");
    if (cant <= 0) return toast.error("Escribe una cantidad entera.");
    setLineas((l) => {
      const ya = l.find((x) => x.producto_id === prodSel);
      return ya ? l.map((x) => (x.producto_id === prodSel ? { ...x, cantidad: x.cantidad + cant } : x)) : [...l, { producto_id: prodSel, cantidad: cant }];
    });
    setCantSel("1");
  };

  const crear = async () => {
    if (!clienteId) return toast.error("Elige el cliente.");
    if (lineas.length === 0) return toast.error("Agrega al menos un producto.");
    setGuardando(true);
    const { data, error } = await supabase.rpc("dis_crear_pedido", { p_cliente: clienteId, p_ruta: rutaId || null, p_entrega: entrega || null, p_condicion: condicion, p_items: lineas });
    setGuardando(false);
    if (error) return toast.error(msg(error.message, "No se pudo crear el pedido."));
    const r = (data ?? {}) as { numero?: string; total?: number };
    toast.success(`Pedido ${r.numero ?? ""} creado por ${dinero(r.total ?? total)}. Despáchalo desde Rutas y despachos.`);
    setLineas([]);
    void recargar();
  };

  const remision = async (p: DisPedido) => {
    const { data } = await supabase.from("dis_pedido_items").select("*").eq("pedido_id", p.id);
    const items = data ?? [];
    imprimirReporte(`Pedido ${p.numero}`, `${p.cliente} · ${p.ruta ?? "Sin ruta"} · Entrega ${p.fecha_entrega ?? "por definir"}`,
      ["Producto", "Presentación", "Cant.", "Unidades", "Precio und.", "Subtotal"],
      items.map((i) => [i.nombre, i.presentacion, String(i.cantidad), String(i.unidades), dinero(i.precio_unidad), dinero(i.subtotal)]),
      [`Total: ${dinero(p.total)} · ${p.condicion === "credito" ? "A crédito" : "De contado"}`]);
  };

  const cancelar = async (p: DisPedido) => {
    const { error } = await supabase.rpc("dis_cancelar", { p_pedido: p.id });
    if (error) return toast.error(msg(error.message, "No se pudo cancelar."));
    toast.success("Pedido cancelado.");
    void recargar();
  };

  return (
    <div className="space-y-6">
      <Encabezado titulo="Pedidos de clientes" texto="Toma pedidos por caja, paca o bulto. El precio se calcula solo según el canal del cliente y el volumen, y el pedido a crédito respeta el cupo." />
      <GlassPanel className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Cliente *">
            <select className={campo} value={clienteId} onChange={(e) => { setClienteId(e.target.value); const c = datos.clientes.find((x) => x.id === e.target.value); setRutaId(c?.ruta_id ?? ""); }}>
              <option value="">Elige...</option>
              {datos.clientes.filter((c) => c.activo).map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.canal})</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Ruta">
            <select className={campo} value={rutaId} onChange={(e) => setRutaId(e.target.value)}>
              <option value="">Sin ruta</option>
              {datos.rutas.filter((r) => r.activo).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Fecha de entrega"><input className={campo} type="date" value={entrega} onChange={(e) => setEntrega(e.target.value)} /></Campo>
          <Campo etiqueta="Condición">
            <select className={campo} value={condicion} onChange={(e) => setCondicion(e.target.value)}>
              <option value="contado">De contado</option>
              <option value="credito">A crédito</option>
            </select>
          </Campo>
        </div>
        {condicion === "credito" && cliente && <p className="text-xs text-muted-foreground">Cupo disponible de {cliente.nombre}: {dinero(cupoLibre)} (cupo {dinero(cliente.cupo_credito)}, deuda {dinero(cliente.saldo)}).</p>}
        <div className="flex flex-wrap items-end gap-3">
          <Campo etiqueta="Producto">
            <select className={campo} value={prodSel} onChange={(e) => setProdSel(e.target.value)}>
              <option value="">Elige...</option>
              {datos.productos.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.presentacion} x{p.unidades_por_presentacion} · stock {textoStock(p)}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Cantidad (presentaciones)"><input className={`${campo} !w-32`} inputMode="numeric" value={cantSel} onChange={(e) => setCantSel(e.target.value)} /></Campo>
          <button type="button" className={botonSec} onClick={agregar}>Agregar</button>
        </div>
        {calculo.length > 0 && (
          <div className="space-y-1">
            {calculo.map((l) => (
              <div key={l.producto_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-glass-border p-2 text-sm">
                <span className="break-words text-foreground">{l.cantidad} {l.presentacion}(s) de {l.nombre} · {l.unidades} und a {dinero(l.precio)}</span>
                <span className="flex items-center gap-2"><strong>{dinero(l.subtotal)}</strong><button type="button" className={botonSec} onClick={() => setLineas((x) => x.filter((y) => y.producto_id !== l.producto_id))}>Quitar</button></span>
              </div>
            ))}
            <p className="text-right text-sm font-semibold text-foreground">Total estimado: {dinero(total)}</p>
          </div>
        )}
        <button type="button" className={boton} disabled={guardando} onClick={() => void crear()}>{guardando ? "Guardando..." : "Crear pedido"}</button>
      </GlassPanel>

      <GlassPanel className="space-y-2 p-4">
        <h2 className="text-sm font-semibold text-foreground">Pedidos recientes</h2>
        {datos.pedidos.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay pedidos.</p> : datos.pedidos.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-foreground">{p.numero} · {p.cliente}</p>
              <p className="text-xs text-muted-foreground">{p.fecha} · {p.ruta ?? "Sin ruta"} · {p.condicion === "credito" ? "Crédito" : "Contado"} · {dinero(p.total)}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Etiqueta texto={p.estado === "preventa" ? "Preventa" : p.estado === "despachado" ? "Despachado" : "Cancelado"} tono={p.estado === "preventa" ? "info" : p.estado === "despachado" ? "ok" : "neutro"} />
              <button type="button" className={botonSec} onClick={() => void remision(p)}>Imprimir</button>
              {p.estado === "preventa" && <button type="button" className={botonSec} onClick={() => void cancelar(p)}>Cancelar</button>}
            </div>
          </div>
        ))}
      </GlassPanel>
    </div>
  );
}

// ------------------------------------------------------------------
// Rutas y despachos
// ------------------------------------------------------------------
export function RutasDistribuidora() {
  const { datos, cargando, recargar } = useDatos();
  const [nombre, setNombre] = useState("");
  const [vendedor, setVendedor] = useState("");
  const [vehiculo, setVehiculo] = useState("");
  const [zona, setZona] = useState("");
  const [dias, setDias] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [ocupado, setOcupado] = useState("");

  const crear = async () => {
    if (nombre.trim().length < 2) return toast.error("Escribe el nombre de la ruta.");
    const { error } = await supabase.from("dis_rutas").insert({ nombre: nombre.trim(), vendedor: vendedor.trim() || null, vehiculo: vehiculo.trim() || null, zona: zona.trim() || null, dias: dias.trim() || null });
    if (error) return toast.error(msg(error.message, "No se pudo guardar la ruta."));
    toast.success("Ruta guardada.");
    setNombre(""); setVendedor(""); setVehiculo(""); setZona(""); setDias("");
    void recargar();
  };

  const alternar = async (r: DisRuta) => {
    const { error } = await supabase.from("dis_rutas").update({ activo: !r.activo }).eq("id", r.id);
    if (error) return toast.error(msg(error.message, "No se pudo cambiar."));
    void recargar();
  };

  const despachar = async (p: DisPedido) => {
    setOcupado(p.id);
    const { error } = await supabase.rpc("dis_despachar", { p_pedido: p.id, p_metodo: metodo });
    setOcupado("");
    if (error) return toast.error(msg(error.message, "No se pudo despachar."));
    toast.success(p.condicion === "credito" ? `Despachado ${p.numero}: ${dinero(p.total)} quedaron en la cartera del cliente.` : `Despachado ${p.numero}: ${dinero(p.total)} cobrados a Caja.`);
    void recargar();
  };

  if (cargando) return <Cargando />;
  const preventa = datos.pedidos.filter((p) => p.estado === "preventa");
  const grupos: { clave: string; titulo: string; ruta: DisRuta | null; pedidos: DisPedido[] }[] = [
    ...datos.rutas.map((r) => ({ clave: r.id, titulo: r.nombre, ruta: r as DisRuta | null, pedidos: preventa.filter((p) => p.ruta_id === r.id) })),
    { clave: "sin", titulo: "Sin ruta", ruta: null, pedidos: preventa.filter((p) => !p.ruta_id) },
  ];

  return (
    <div className="space-y-6">
      <Encabezado titulo="Rutas y despachos" texto="Define tus rutas de preventa y despacha cada pedido: baja el inventario, cobra a Caja (contado) o suma a la cartera del cliente (crédito), con su asiento contable." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador titulo="Rutas activas" valor={datos.rutas.filter((r) => r.activo).length} />
        <Indicador titulo="Pedidos por despachar" valor={preventa.length} />
        <Indicador titulo="Valor por despachar" valor={dinero(preventa.reduce((s, p) => s + p.total, 0))} />
      </div>
      <GlassPanel className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-foreground">Nueva ruta</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Campo etiqueta="Nombre *"><input className={campo} maxLength={80} value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
          <Campo etiqueta="Vendedor"><input className={campo} maxLength={80} value={vendedor} onChange={(e) => setVendedor(e.target.value)} /></Campo>
          <Campo etiqueta="Vehículo"><input className={campo} maxLength={40} value={vehiculo} onChange={(e) => setVehiculo(e.target.value)} /></Campo>
          <Campo etiqueta="Zona"><input className={campo} maxLength={80} value={zona} onChange={(e) => setZona(e.target.value)} /></Campo>
          <Campo etiqueta="Días de visita"><input className={campo} maxLength={60} value={dias} onChange={(e) => setDias(e.target.value)} placeholder="Lun, Mié, Vie" /></Campo>
        </div>
        <button type="button" className={boton} onClick={() => void crear()}>Guardar ruta</button>
      </GlassPanel>
      <GlassPanel className="space-y-3 p-4">
        <Campo etiqueta="Cobrar los pedidos de contado con"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
        {grupos.map((g) => (
          <div key={g.clave} className="space-y-2 rounded-xl border border-glass-border p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-foreground">{g.titulo}{g.ruta ? ` · ${[g.ruta.vendedor, g.ruta.vehiculo, g.ruta.zona, g.ruta.dias].filter(Boolean).join(" · ")}` : ""}</p>
              {g.ruta && <button type="button" className={botonSec} onClick={() => void alternar(g.ruta as DisRuta)}>{g.ruta.activo ? "Desactivar" : "Activar"}</button>}
            </div>
            {g.pedidos.length === 0 ? <p className="text-xs text-muted-foreground">Sin pedidos por despachar.</p> : g.pedidos.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="break-words text-foreground">{p.numero} · {p.cliente} · {p.fecha_entrega ?? "sin fecha"} · {dinero(p.total)} · {p.condicion === "credito" ? "Crédito" : "Contado"}</span>
                <button type="button" className={boton} disabled={ocupado === p.id} onClick={() => void despachar(p)}>Despachar</button>
              </div>
            ))}
          </div>
        ))}
      </GlassPanel>
    </div>
  );
}

// ------------------------------------------------------------------
// Listas de precios por canal y volumen (con productos y stock)
// ------------------------------------------------------------------
export function ListasPreciosDistribuidora() {
  const { datos, cargando, recargar } = useDatos();
  const [p, setP] = useState({ nombre: "", sku: "", presentacion: "caja", unidades: "12", costo: "", precio: "" });
  const [esc, setEsc] = useState({ producto: "", canal: "mayorista", desde: "", precio: "" });
  const [ing, setIng] = useState<Record<string, { cant: string; costo: string }>>({});
  const [metodo, setMetodo] = useState("efectivo");

  const crearProducto = async () => {
    if (p.nombre.trim().length < 2) return toast.error("Escribe el nombre del producto.");
    const { error } = await supabase.from("dis_productos").insert({
      nombre: p.nombre.trim(), sku: p.sku.trim() || null, presentacion: p.presentacion, unidades_por_presentacion: Math.max(Math.round(num(p.unidades)), 1),
      costo_unidad: Math.max(num(p.costo), 0), precio_unidad: Math.max(num(p.precio), 0),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el producto."));
    toast.success("Producto guardado. Ahora ingresa su stock.");
    setP({ nombre: "", sku: "", presentacion: "caja", unidades: "12", costo: "", precio: "" });
    void recargar();
  };

  const crearEscalon = async () => {
    if (!esc.producto) return toast.error("Elige el producto.");
    const desde = Math.round(num(esc.desde));
    if (desde < 1) return toast.error("Escribe desde cuántas unidades aplica el precio.");
    if (num(esc.precio) < 0 || esc.precio.trim() === "") return toast.error("Escribe el precio por unidad.");
    const { error } = await supabase.from("dis_precios").insert({ producto_id: esc.producto, canal: esc.canal, desde_unidades: desde, precio_unidad: num(esc.precio) });
    if (error) return toast.error(error.code === "23505" ? "Ya existe un precio para ese canal y esa cantidad." : msg(error.message, "No se pudo guardar el precio."));
    toast.success("Precio por volumen guardado.");
    setEsc({ ...esc, desde: "", precio: "" });
    void recargar();
  };

  const ingresar = async (prod: DisProducto) => {
    const v = ing[prod.id];
    const cant = Math.round(num(v?.cant ?? ""));
    if (cant <= 0) return toast.error("Escribe cuántas presentaciones ingresan.");
    const { error } = await supabase.rpc("dis_ingresar_stock", { p_producto: prod.id, p_cantidad: cant, p_costo_unidad: num(v?.costo ?? "") || prod.costo_unidad, p_metodo: metodo });
    if (error) return toast.error(msg(error.message, "No se pudo ingresar el stock."));
    toast.success("Mercancía ingresada al inventario.");
    setIng((x) => ({ ...x, [prod.id]: { cant: "", costo: "" } }));
    void recargar();
  };

  const alternar = async (prod: DisProducto) => {
    const { error } = await supabase.from("dis_productos").update({ activo: !prod.activo }).eq("id", prod.id);
    if (error) return toast.error(msg(error.message, "No se pudo cambiar."));
    void recargar();
  };

  if (cargando) return <Cargando />;
  const valorInventario = datos.productos.reduce((s, x) => s + x.stock_unidades * x.costo_unidad, 0);

  return (
    <div className="space-y-6">
      <Encabezado titulo="Listas de precios por canal y volumen" texto="Registra productos por caja, paca o bulto, ingresa mercancía (sale de Caja o queda con el proveedor) y define precios escalonados para mayorista, distribuidor y tienda." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador titulo="Productos" valor={datos.productos.length} />
        <Indicador titulo="Valor del inventario" valor={dinero(valorInventario)} />
        <Indicador titulo="Precios por volumen" valor={datos.precios.length} />
      </div>
      <GlassPanel className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-foreground">Nuevo producto</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Campo etiqueta="Nombre *"><input className={campo} maxLength={120} value={p.nombre} onChange={(e) => setP({ ...p, nombre: e.target.value })} /></Campo>
          <Campo etiqueta="Código"><input className={campo} maxLength={40} value={p.sku} onChange={(e) => setP({ ...p, sku: e.target.value })} /></Campo>
          <Campo etiqueta="Se vende por">
            <select className={campo} value={p.presentacion} onChange={(e) => setP({ ...p, presentacion: e.target.value })}>{PRESENTACIONES.map((x) => <option key={x} value={x}>{x}</option>)}</select>
          </Campo>
          <Campo etiqueta="Unidades por presentación"><input className={campo} inputMode="numeric" value={p.unidades} onChange={(e) => setP({ ...p, unidades: e.target.value })} /></Campo>
          <Campo etiqueta="Costo por unidad"><input className={campo} inputMode="decimal" value={p.costo} onChange={(e) => setP({ ...p, costo: e.target.value })} /></Campo>
          <Campo etiqueta="Precio base por unidad"><input className={campo} inputMode="decimal" value={p.precio} onChange={(e) => setP({ ...p, precio: e.target.value })} /></Campo>
        </div>
        <button type="button" className={boton} onClick={() => void crearProducto()}>Guardar producto</button>
      </GlassPanel>

      <GlassPanel className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-foreground">Precio por volumen y canal</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Producto">
            <select className={campo} value={esc.producto} onChange={(e) => setEsc({ ...esc, producto: e.target.value })}>
              <option value="">Elige...</option>
              {datos.productos.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Canal">
            <select className={campo} value={esc.canal} onChange={(e) => setEsc({ ...esc, canal: e.target.value })}>{CANALES.map((c) => <option key={c.clave} value={c.clave}>{c.texto}</option>)}</select>
          </Campo>
          <Campo etiqueta="Desde (unidades)"><input className={campo} inputMode="numeric" value={esc.desde} onChange={(e) => setEsc({ ...esc, desde: e.target.value })} /></Campo>
          <Campo etiqueta="Precio por unidad"><input className={campo} inputMode="decimal" value={esc.precio} onChange={(e) => setEsc({ ...esc, precio: e.target.value })} /></Campo>
        </div>
        <button type="button" className={botonSec} onClick={() => void crearEscalon()}>Guardar precio</button>
      </GlassPanel>

      <GlassPanel className="space-y-2 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Campo etiqueta="Pagar la mercancía con">
            <select className={campo} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="credito">A crédito con el proveedor</option>
            </select>
          </Campo>
          <button type="button" className={botonSec} onClick={() => exportarExcel("lista-precios-distribuidora", ["Producto", "Canal", "Desde (und)", "Precio por unidad"], datos.precios.map((x) => [datos.productos.find((y) => y.id === x.producto_id)?.nombre ?? "", x.canal, x.desde_unidades, x.precio_unidad]))}>Descargar Excel</button>
        </div>
        {datos.productos.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay productos.</p> : datos.productos.map((x) => {
          const escalones = datos.precios.filter((y) => y.producto_id === x.id);
          return (
            <div key={x.id} className="space-y-2 rounded-xl border border-glass-border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-foreground">{x.nombre}{x.sku ? ` · ${x.sku}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{x.presentacion} x{x.unidades_por_presentacion} · Stock {textoStock(x)} · Costo {dinero(x.costo_unidad)} · Base {dinero(x.precio_unidad)}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input className={`${campo} !w-28`} aria-label="Presentaciones que ingresan" placeholder={`# ${x.presentacion}`} inputMode="numeric" value={ing[x.id]?.cant ?? ""} onChange={(e) => setIng((s) => ({ ...s, [x.id]: { cant: e.target.value, costo: s[x.id]?.costo ?? "" } }))} />
                  <input className={`${campo} !w-32`} aria-label="Costo por unidad" placeholder="Costo und." inputMode="decimal" value={ing[x.id]?.costo ?? ""} onChange={(e) => setIng((s) => ({ ...s, [x.id]: { cant: s[x.id]?.cant ?? "", costo: e.target.value } }))} />
                  <button type="button" className={boton} onClick={() => void ingresar(x)}>Ingresar</button>
                  <button type="button" className={botonSec} onClick={() => void alternar(x)}>{x.activo ? "Desactivar" : "Activar"}</button>
                </div>
              </div>
              {escalones.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {escalones.map((y) => <Etiqueta key={y.id} texto={`${y.canal} desde ${y.desde_unidades} und: ${dinero(y.precio_unidad)}`} tono="info" />)}
                </div>
              )}
            </div>
          );
        })}
      </GlassPanel>
    </div>
  );
}

// ------------------------------------------------------------------
// Clientes, cupo de crédito y cartera
// ------------------------------------------------------------------
export function CarteraDistribuidora() {
  const { datos, cargando, recargar } = useDatos();
  const [vista, setVista] = useState<"cartera" | "nuevo">("cartera");
  const [c, setC] = useState({ nombre: "", documento: "", telefono: "", direccion: "", canal: "tienda", cupo: "", ruta: "" });
  const [cupos, setCupos] = useState<Record<string, string>>({});
  const [abonos, setAbonos] = useState<Record<string, string>>({});
  const [metodo, setMetodo] = useState("efectivo");

  const crear = async () => {
    if (c.nombre.trim().length < 2) return toast.error("Escribe el nombre del cliente.");
    const { error } = await supabase.from("dis_clientes").insert({
      nombre: c.nombre.trim(), documento: c.documento.trim() || null, telefono: c.telefono.trim() || null, direccion: c.direccion.trim() || null,
      canal: c.canal, cupo_credito: Math.max(num(c.cupo), 0), ruta_id: c.ruta || null,
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el cliente."));
    toast.success("Cliente guardado.");
    setC({ nombre: "", documento: "", telefono: "", direccion: "", canal: "tienda", cupo: "", ruta: "" });
    setVista("cartera");
    void recargar();
  };

  const guardarCupo = async (cl: DisCliente) => {
    const v = cupos[cl.id];
    if (v === undefined) return;
    const { error } = await supabase.from("dis_clientes").update({ cupo_credito: Math.max(num(v), 0) }).eq("id", cl.id);
    if (error) return toast.error(msg(error.message, "No se pudo guardar el cupo."));
    setCupos((x) => {
      const { [cl.id]: _omitido, ...resto } = x;
      return resto;
    });
    void recargar();
  };

  const abonar = async (cl: DisCliente) => {
    const monto = num(abonos[cl.id] ?? "");
    if (monto <= 0) return toast.error("Escribe el valor del abono.");
    const { data, error } = await supabase.rpc("dis_abonar", { p_cliente: cl.id, p_monto: monto, p_metodo: metodo });
    if (error) return toast.error(msg(error.message, "No se pudo registrar el abono."));
    const r = (data ?? {}) as { recibo?: string; saldo?: number };
    toast.success(`Abono de ${dinero(monto)} cobrado a Caja.`);
    imprimirReporte(`Recibo ${r.recibo ?? ""}`, cl.nombre, ["Concepto", "Valor"], [["Abono a cartera", dinero(monto)], ["Saldo pendiente", dinero(r.saldo ?? 0)]], ["Gracias por su pago."]);
    setAbonos((x) => ({ ...x, [cl.id]: "" }));
    void recargar();
  };

  if (cargando) return <Cargando />;
  const conDeuda = datos.clientes.filter((x) => x.saldo > 0);
  const carteraTotal = datos.clientes.reduce((s, x) => s + x.saldo, 0);
  const excedidos = datos.clientes.filter((x) => x.saldo > x.cupo_credito);

  return (
    <div className="space-y-6">
      <Encabezado titulo="Clientes, cupo y cartera" texto="Cada cliente tiene su canal, su cupo de crédito y su deuda. Los abonos entran a Caja con recibo y asiento contable." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador titulo="Cartera total" valor={dinero(carteraTotal)} />
        <Indicador titulo="Clientes con deuda" valor={conDeuda.length} />
        <Indicador titulo="Sobre el cupo" valor={excedidos.length} alerta={excedidos.length > 0} />
      </div>
      <Pestanas items={[{ clave: "cartera", texto: "Cartera por cliente" }, { clave: "nuevo", texto: "Nuevo cliente" }]} valor={vista} onChange={setVista} />
      {vista === "nuevo" ? (
        <GlassPanel className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo etiqueta="Nombre *"><input className={campo} maxLength={120} value={c.nombre} onChange={(e) => setC({ ...c, nombre: e.target.value })} /></Campo>
            <Campo etiqueta="NIT / documento"><input className={campo} maxLength={30} value={c.documento} onChange={(e) => setC({ ...c, documento: e.target.value })} /></Campo>
            <Campo etiqueta="Teléfono"><input className={campo} inputMode="tel" maxLength={20} value={c.telefono} onChange={(e) => setC({ ...c, telefono: e.target.value })} /></Campo>
            <Campo etiqueta="Dirección"><input className={campo} maxLength={160} value={c.direccion} onChange={(e) => setC({ ...c, direccion: e.target.value })} /></Campo>
            <Campo etiqueta="Canal">
              <select className={campo} value={c.canal} onChange={(e) => setC({ ...c, canal: e.target.value })}>{CANALES.map((x) => <option key={x.clave} value={x.clave}>{x.texto}</option>)}</select>
            </Campo>
            <Campo etiqueta="Cupo de crédito"><input className={campo} inputMode="decimal" value={c.cupo} onChange={(e) => setC({ ...c, cupo: e.target.value })} /></Campo>
            <Campo etiqueta="Ruta">
              <select className={campo} value={c.ruta} onChange={(e) => setC({ ...c, ruta: e.target.value })}>
                <option value="">Sin ruta</option>
                {datos.rutas.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </Campo>
          </div>
          <button type="button" className={boton} onClick={() => void crear()}>Guardar cliente</button>
        </GlassPanel>
      ) : (
        <GlassPanel className="space-y-2 p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <Campo etiqueta="Recibir abonos con"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
            <button type="button" className={botonSec} onClick={() => exportarExcel("cartera-distribuidora", ["Cliente", "Canal", "Teléfono", "Cupo", "Deuda", "Disponible"], datos.clientes.map((x) => [x.nombre, x.canal, x.telefono ?? "", x.cupo_credito, x.saldo, x.cupo_credito - x.saldo]))}>Descargar Excel</button>
          </div>
          {datos.clientes.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay clientes.</p> : datos.clientes.map((x) => (
            <div key={x.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-glass-border p-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-foreground">{x.nombre} <span className="text-xs font-normal text-muted-foreground">({x.canal})</span></p>
                <p className="text-xs text-muted-foreground">Deuda {dinero(x.saldo)} · Disponible {dinero(x.cupo_credito - x.saldo)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {x.saldo > x.cupo_credito && <Etiqueta texto="Sobre el cupo" tono="alerta" />}
                <input className={`${campo} !w-32`} aria-label="Cupo de crédito" inputMode="decimal" value={cupos[x.id] ?? String(x.cupo_credito)} onChange={(e) => setCupos((s) => ({ ...s, [x.id]: e.target.value }))} />
                {cupos[x.id] !== undefined && <button type="button" className={botonSec} onClick={() => void guardarCupo(x)}>Guardar cupo</button>}
                {x.saldo > 0 && (
                  <>
                    <input className={`${campo} !w-32`} aria-label="Abono" placeholder="Abono" inputMode="decimal" value={abonos[x.id] ?? ""} onChange={(e) => setAbonos((s) => ({ ...s, [x.id]: e.target.value }))} />
                    <button type="button" className={boton} onClick={() => void abonar(x)}>Abonar</button>
                    <button type="button" className={botonSec} onClick={() => { const u = aWhatsapp(x.telefono, `Hola ${x.nombre}, tienes un saldo pendiente de ${dinero(x.saldo)} con nosotros. Gracias por tu pago.`); if (u) window.open(u, "_blank", "noopener"); else toast.error("Sin teléfono."); }}>Cobrar</button>
                  </>
                )}
              </div>
            </div>
          ))}
        </GlassPanel>
      )}
    </div>
  );
}
