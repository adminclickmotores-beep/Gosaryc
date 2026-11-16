import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, MessageCircle, Plus, Printer, ShoppingCart, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { usePermisos } from "@/hooks/use-permisos";
import {
  Campo, Cargando, Encabezado, FAMILIA, NOMBRE_UNIDAD, boton, botonSec, campo, convertir, dinero, esc, num,
  precioDe, ubicacion, unidadesDe, usarProductos, type Linea, type Producto,
} from "@/components/comercio/ComercioModulos";
import { CLASE_NIVEL, TITULO_NIVEL, diasPara, nivelVence, textoVence, type NivelVence } from "@/lib/lotes-comercio";

type Lote = Tables<"com_lotes">;
type Cotizacion = Tables<"com_cotizaciones">;
type ItemCot = Tables<"com_cotizacion_items">;
type Desposte = Tables<"com_despostes">;
type ItemDesposte = Tables<"com_desposte_items">;

const mensajeError = (m: string | undefined, defecto: string) => (m && m.length > 0 && m.length < 200 ? m : defecto);

// ============================================================
// Lotes, vencimientos y rotación FIFO
// ============================================================
export function LotesComercial() {
  const { productos, cargando, recargar } = usarProductos();
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [productoId, setProductoId] = useState("");
  const [numero, setNumero] = useState("");
  const [vence, setVence] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [unidad, setUnidad] = useState("");
  const [costo, setCosto] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargarLotes = useCallback(async () => {
    const { data } = await supabase.from("com_lotes").select("*").gt("cantidad_actual", 0).order("vence", { ascending: true, nullsFirst: false });
    setLotes(data ?? []);
  }, []);
  useEffect(() => {
    void cargarLotes();
  }, [cargarLotes]);

  const elegido = productos.find((p) => p.id === productoId);
  const nombreDe = (id: string) => productos.find((p) => p.id === id)?.nombre ?? "Producto";
  const baseDe = (id: string) => productos.find((p) => p.id === id)?.unidad_base ?? "";

  const guardar = async () => {
    if (!elegido) return toast.error("Elige el producto.");
    if (!numero.trim()) return toast.error("Escribe el número de lote.");
    if (num(cantidad) <= 0) return toast.error("La cantidad debe ser mayor a cero.");
    setGuardando(true);
    const { error } = await supabase.rpc("com_ingresar_lote", {
      p_producto: elegido.id,
      p_lote: numero.trim(),
      p_vence: vence || null,
      p_cantidad: num(cantidad),
      p_unidad: unidad || elegido.unidad_base,
      p_costo: num(costo),
    });
    setGuardando(false);
    if (error) return toast.error(mensajeError(error.message, "No se pudo registrar el lote."));
    toast.success("Lote registrado. El stock del producto subió.");
    setNumero(""); setVence(""); setCantidad(""); setCosto("");
    void cargarLotes();
    void recargar();
  };

  const grupos = useMemo(() => {
    const g: Record<NivelVence, Lote[]> = { vencido: [], "7": [], "15": [], "30": [], ok: [], sin: [] };
    for (const l of lotes) g[nivelVence(diasPara(l.vence))].push(l);
    return g;
  }, [lotes]);

  if (cargando) return <Cargando />;
  const orden: NivelVence[] = ["vencido", "7", "15", "30", "ok", "sin"];
  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Lotes y vencimientos"
        texto="Registra el número de lote y la fecha de vencimiento al recibir mercancía. El POS vende primero el lote que vence antes (FIFO)."
      />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["vencido", "7", "15", "30"] as NivelVence[]).map((n) => (
          <div key={n} className={`rounded-xl border p-3 ${CLASE_NIVEL[n]}`}>
            <p className="text-2xl font-medium">{grupos[n].length}</p>
            <p className="text-xs">{TITULO_NIVEL[n]}</p>
          </div>
        ))}
      </div>

      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Ingresar mercancía con lote</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Producto *">
            <select className={campo} value={productoId} onChange={(e) => { setProductoId(e.target.value); setUnidad(""); }}>
              <option value="">Elige un producto</option>
              {productos.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Número de lote *"><input className={campo} value={numero} onChange={(e) => setNumero(e.target.value)} /></Campo>
          <Campo etiqueta="Fecha de vencimiento"><input type="date" className={campo} value={vence} onChange={(e) => setVence(e.target.value)} /></Campo>
          <Campo etiqueta="Cantidad que entra *"><input className={campo} inputMode="decimal" value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></Campo>
          <Campo etiqueta="Unidad">
            <select className={campo} value={unidad || elegido?.unidad_base || ""} onChange={(e) => setUnidad(e.target.value)} disabled={!elegido}>
              {(elegido ? unidadesDe(elegido) : []).map((u) => <option key={u} value={u}>{NOMBRE_UNIDAD[u]}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Costo por unidad del inventario (opcional)"><input className={campo} inputMode="decimal" value={costo} onChange={(e) => setCosto(e.target.value)} /></Campo>
        </div>
        <button className={boton} disabled={guardando} onClick={guardar}><Plus className="h-4 w-4" /> Registrar lote</button>
      </GlassPanel>

      <div className="space-y-4">
        {lotes.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay lotes con existencias.</p>}
        {orden.filter((n) => grupos[n].length > 0).map((n) => (
          <div key={n} className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">{TITULO_NIVEL[n]}</h3>
            {grupos[n].map((l) => {
              const dias = diasPara(l.vence);
              return (
                <GlassPanel key={l.id} className={`flex flex-wrap items-center justify-between gap-3 border p-3 ${CLASE_NIVEL[n]}`}>
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium text-foreground">{nombreDe(l.producto_id)} · Lote {l.numero_lote}</p>
                    <p className="text-xs">{textoVence(dias)}{l.vence ? ` (${l.vence})` : ""}</p>
                  </div>
                  <span className="text-sm text-foreground">
                    Quedan {Math.round(l.cantidad_actual * 1000) / 1000} de {Math.round(l.cantidad_inicial * 1000) / 1000} {baseDe(l.producto_id)}
                  </span>
                </GlassPanel>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Cotizador rápido de materiales (ferretería)
// ============================================================
function calcLinea(l: Linea, tipo: string, desc: number): { base: number; impuesto: number; total: number } {
  const cant = num(l.cantidad);
  const cb = convertir(cant, l.unidad, l.p.unidad_base, l.p.unidades_por_caja);
  if (cant <= 0 || cb === null) return { base: 0, impuesto: 0, total: 0 };
  const pct = l.p.tipo_impuesto === "exento" ? 0 : l.p.impuesto_pct;
  const precio = desc > 0 ? Math.round(precioDe(l.p, tipo) * (1 - desc / 100) * 10000) / 10000 : precioDe(l.p, tipo);
  if (l.p.precio_incluye_impuesto) {
    const total = Math.round(cb * precio * 100) / 100;
    const base = Math.round((total / (1 + pct / 100)) * 100) / 100;
    return { base, impuesto: total - base, total };
  }
  const base = Math.round(cb * precio * 100) / 100;
  const impuesto = Math.round(((base * pct) / 100) * 100) / 100;
  return { base, impuesto, total: base + impuesto };
}

const ESTADO_COT: Record<string, string> = {
  borrador: "Borrador", enviada: "Enviada", aprobada: "Aprobada (pedido)", rechazada: "Rechazada", convertida: "Convertida en venta",
};

function textoCotizacion(c: Cotizacion, items: ItemCot[], negocio: string): string {
  const lineas = items.map((i) => `• ${i.cantidad} ${i.unidad} ${i.nombre}: ${dinero(i.total)}`).join("\n");
  return `*${negocio}*\nCotización ${c.numero}\nCliente: ${c.cliente}\n\n${lineas}\n\n` +
    `${c.descuento > 0 ? `Descuento (${c.descuento_pct}%): -${dinero(c.descuento)}\n` : ""}` +
    `${c.iva > 0 ? `IVA: ${dinero(c.iva)}\n` : ""}${c.impoconsumo > 0 ? `Impoconsumo: ${dinero(c.impoconsumo)}\n` : ""}` +
    `*TOTAL: ${dinero(c.total)}*\n${c.vigencia ? `Válida hasta ${c.vigencia}.` : ""}${c.notas ? `\n${c.notas}` : ""}`;
}

function imprimirCotizacion(c: Cotizacion, items: ItemCot[], negocio: string) {
  const w = window.open("", "_blank", "width=820,height=900");
  if (!w) return toast.error("Permite las ventanas emergentes para imprimir.");
  const filas = items
    .map((i) => `<tr><td>${esc(i.nombre)}</td><td style="text-align:right">${i.cantidad} ${esc(i.unidad)}</td><td style="text-align:right">${dinero(i.precio_unitario)}</td><td style="text-align:right">${dinero(i.total)}</td></tr>`)
    .join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Cotización ${esc(c.numero)}</title>
<style>body{font-family:Arial,sans-serif;font-size:14px;margin:24px;color:#111}h1{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:12px}
th,td{padding:6px 8px;border-bottom:1px solid #ccc;text-align:left}th:nth-child(n+2){text-align:right}.t{text-align:right;margin-top:10px}</style></head><body>
<h1>${esc(negocio)}</h1><p>Cotización <b>${esc(c.numero)}</b> · ${new Date(c.created_at).toLocaleDateString("es-CO")}<br>Cliente: ${esc(c.cliente)}${c.telefono ? ` · ${esc(c.telefono)}` : ""}</p>
<table><tr><th>Material</th><th>Cantidad</th><th>Precio unit.</th><th>Total</th></tr>${filas}</table>
<div class="t">${c.descuento > 0 ? `Descuento (${c.descuento_pct}%): -${dinero(c.descuento)}<br>` : ""}Base: ${dinero(c.base)}<br>${c.iva > 0 ? `IVA: ${dinero(c.iva)}<br>` : ""}${c.impoconsumo > 0 ? `Impoconsumo: ${dinero(c.impoconsumo)}<br>` : ""}<b style="font-size:18px">TOTAL: ${dinero(c.total)}</b></div>
<p>${c.vigencia ? `Válida hasta ${esc(c.vigencia)}.` : ""} ${c.notas ? esc(c.notas) : ""}</p>
<script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
}

export function CotizadorFerreteria() {
  const { negocio } = useNegocio();
  const { esAdmin } = usePermisos();
  const { productos, cargando } = usarProductos();
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [tipoPrecio, setTipoPrecio] = useState("mayorista");
  const [descuento, setDescuento] = useState("0");
  const [vigencia, setVigencia] = useState("15");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [metodo, setMetodo] = useState("efectivo");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [itemsAbiertos, setItemsAbiertos] = useState<ItemCot[]>([]);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("com_cotizaciones").select("*").order("created_at", { ascending: false }).limit(60);
    setCotizaciones(data ?? []);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const sugeridos = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (q.length < 2) return [];
    return productos.filter((p) => p.activo && (p.nombre.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q) || (p.codigo_barras ?? "").includes(q))).slice(0, 8);
  }, [busqueda, productos]);

  const agregar = (p: Producto) => {
    setLineas((ls) => (ls.some((l) => l.p.id === p.id) ? ls : [...ls, { p, cantidad: "1", unidad: p.unidad_base }]));
    setBusqueda("");
  };
  const cambiar = (id: string, c: Partial<Pick<Linea, "cantidad" | "unidad">>) =>
    setLineas((ls) => ls.map((l) => (l.p.id === id ? { ...l, ...c } : l)));

  const desc = Math.min(Math.max(num(descuento), 0), 100);
  const calculos = lineas.map((l) => ({ l, c: calcLinea(l, tipoPrecio, desc) }));
  const base = calculos.reduce((s, x) => s + x.c.base, 0);
  const impuestos = calculos.reduce((s, x) => s + x.c.impuesto, 0);
  const total = calculos.reduce((s, x) => s + x.c.total, 0);

  const guardar = async () => {
    if (!cliente.trim()) return toast.error("Escribe el nombre del cliente o de la obra.");
    if (lineas.length === 0) return toast.error("Agrega al menos un material.");
    setGuardando(true);
    const { error } = await supabase.rpc("com_crear_cotizacion", {
      p_items: lineas.map((l) => ({ producto_id: l.p.id, cantidad: num(l.cantidad), unidad: l.unidad })),
      p_cliente: cliente.trim(),
      p_telefono: telefono.trim(),
      p_tipo_precio: tipoPrecio,
      p_descuento_pct: desc,
      p_vigencia_dias: Math.max(Math.round(num(vigencia)), 1),
      p_notas: notas.trim(),
    });
    setGuardando(false);
    if (error) return toast.error(mensajeError(error.message, "No se pudo guardar la cotización."));
    toast.success("Cotización guardada.");
    setLineas([]); setCliente(""); setTelefono(""); setNotas(""); setDescuento("0");
    void cargar();
  };

  const traerItems = async (id: string): Promise<ItemCot[]> => {
    const { data } = await supabase.from("com_cotizacion_items").select("*").eq("cotizacion_id", id).order("created_at");
    return data ?? [];
  };

  const alternar = async (c: Cotizacion) => {
    if (abierta === c.id) return setAbierta(null);
    setItemsAbiertos(await traerItems(c.id));
    setAbierta(c.id);
  };

  const cambiarEstado = async (c: Cotizacion, estado: "enviada" | "aprobada" | "rechazada") => {
    const { error } = await supabase.rpc("com_estado_cotizacion", { p_id: c.id, p_estado: estado });
    if (error) return toast.error(mensajeError(error.message, "No se pudo cambiar el estado."));
    void cargar();
  };

  const whatsapp = async (c: Cotizacion) => {
    const items = await traerItems(c.id);
    const digitos = (c.telefono ?? "").replace(/\D/g, "");
    const tel = digitos.length === 10 ? `57${digitos}` : digitos;
    const texto = encodeURIComponent(textoCotizacion(c, items, negocio?.nombre ?? "Mi negocio"));
    window.open(tel ? `https://wa.me/${tel}?text=${texto}` : `https://wa.me/?text=${texto}`, "_blank");
    if (c.estado === "borrador") void cambiarEstado(c, "enviada");
  };

  const pdf = async (c: Cotizacion) => imprimirCotizacion(c, await traerItems(c.id), negocio?.nombre ?? "Mi negocio");

  const convertirEnVenta = async (c: Cotizacion, autorizar: boolean, motivo: string): Promise<void> => {
    const { error } = await supabase.rpc("com_convertir_cotizacion", { p_id: c.id, p_metodo: metodo, p_autorizar: autorizar, p_motivo: motivo });
    if (error) {
      if (error.message.includes("CREDITO_BLOQUEADO")) {
        const razon = error.message.split("CREDITO_BLOQUEADO:")[1]?.trim() ?? "Crédito bloqueado.";
        if (esAdmin) {
          const m = window.prompt(`${razon}\nEscribe el motivo para autorizar el fiado:`);
          if (m && m.trim().length >= 3) return convertirEnVenta(c, true, m.trim());
          return;
        }
        toast.error(`${razon} Pide autorización al dueño.`);
        return;
      }
      toast.error(mensajeError(error.message, "No se pudo convertir en venta."));
      return;
    }
    toast.success("Venta registrada desde la cotización. Ya descontó el inventario.");
    void cargar();
  };

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Cotizador de materiales"
        texto="Arma la lista de una obra con precio mayorista, descuento e impuestos. Envíala por WhatsApp o como PDF y conviértela en venta con un clic."
      />
      <GlassPanel className="space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Cliente u obra *"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
          <Campo etiqueta="Celular (WhatsApp)"><input className={campo} inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></Campo>
          <Campo etiqueta="Lista de precios">
            <select className={campo} value={tipoPrecio} onChange={(e) => setTipoPrecio(e.target.value)}>
              <option value="mayorista">Mayorista / ferretero</option>
              <option value="detal">Detal</option>
              <option value="especial">Especial</option>
            </select>
          </Campo>
          <Campo etiqueta="Descuento (%)"><input className={campo} inputMode="decimal" value={descuento} onChange={(e) => setDescuento(e.target.value)} /></Campo>
          <Campo etiqueta="Válida por (días)"><input className={campo} inputMode="numeric" value={vigencia} onChange={(e) => setVigencia(e.target.value)} /></Campo>
          <Campo etiqueta="Notas (flete, entrega)"><input className={campo} value={notas} onChange={(e) => setNotas(e.target.value)} /></Campo>
        </div>
        <input className={campo} placeholder="Busca un material por nombre, SKU o código de barras" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        {sugeridos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {sugeridos.map((p) => (
              <button key={p.id} className={`${botonSec} flex-col items-start gap-0.5 text-left`} onClick={() => agregar(p)}>
                <span>{p.nombre} · {dinero(precioDe(p, tipoPrecio))}/{p.unidad_base}</span>
                {ubicacion(p) && <span className="text-xs text-primary">{ubicacion(p)}</span>}
              </button>
            ))}
          </div>
        )}
        {calculos.map(({ l, c }) => (
          <div key={l.p.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-glass-border p-2">
            <p className="min-w-0 flex-1 break-words text-sm text-foreground">{l.p.nombre}</p>
            <input className={`${campo} w-24`} inputMode="decimal" aria-label="Cantidad" value={l.cantidad} onChange={(e) => cambiar(l.p.id, { cantidad: e.target.value })} />
            <select className={`${campo} w-32`} aria-label="Unidad" value={l.unidad} onChange={(e) => cambiar(l.p.id, { unidad: e.target.value })}>
              {unidadesDe(l.p).map((u) => <option key={u} value={u}>{NOMBRE_UNIDAD[u]}</option>)}
            </select>
            <span className="w-28 text-right text-sm font-medium text-foreground">{dinero(c.total)}</span>
            <button aria-label="Quitar" className="text-muted-foreground" onClick={() => setLineas((ls) => ls.filter((x) => x.p.id !== l.p.id))}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {lineas.length > 0 && (
          <div className="space-y-1 border-t border-glass-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Base</span><span>{dinero(base)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Impuestos</span><span>{dinero(impuestos)}</span></div>
            <div className="flex justify-between text-lg font-medium text-foreground"><span>Total{desc > 0 ? ` (con ${desc}% de descuento)` : ""}</span><span>{dinero(total)}</span></div>
          </div>
        )}
        <button className={boton} disabled={guardando || lineas.length === 0} onClick={guardar}><Plus className="h-4 w-4" /> Guardar cotización</button>
      </GlassPanel>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-medium text-foreground">Cotizaciones</h2>
          <select className={`${campo} w-auto`} aria-label="Forma de pago al convertir" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            <option value="efectivo">Cobrar en efectivo</option>
            <option value="transferencia">Cobrar por transferencia</option>
            <option value="tarjeta">Cobrar con tarjeta</option>
            <option value="fiado">Fiar (con cupo)</option>
          </select>
        </div>
        {cotizaciones.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay cotizaciones.</p>}
        {cotizaciones.map((c) => {
          const cerrada = c.estado === "convertida" || c.estado === "rechazada";
          return (
            <GlassPanel key={c.id} className="space-y-2 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-foreground">{c.numero} · {c.cliente}</p>
                  <p className="text-xs text-muted-foreground">{ESTADO_COT[c.estado] ?? c.estado} · {c.vigencia ? `válida hasta ${c.vigencia}` : ""}</p>
                </div>
                <span className="text-sm font-medium text-foreground">{dinero(c.total)}</span>
                <button aria-label="Ver detalle" className="text-muted-foreground" onClick={() => alternar(c)}>
                  {abierta === c.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
              {abierta === c.id && (
                <ul className="space-y-0.5 text-xs text-muted-foreground">
                  {itemsAbiertos.map((i) => <li key={i.id}>{i.cantidad} {i.unidad} {i.nombre} · {dinero(i.total)}</li>)}
                  {c.descuento > 0 && <li>Descuento {c.descuento_pct}%: -{dinero(c.descuento)}</li>}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                <button className={botonSec} onClick={() => whatsapp(c)}><MessageCircle className="h-4 w-4" /> WhatsApp</button>
                <button className={botonSec} onClick={() => pdf(c)}><Printer className="h-4 w-4" /> PDF / imprimir</button>
                {!cerrada && c.estado !== "aprobada" && <button className={botonSec} onClick={() => cambiarEstado(c, "aprobada")}>Aprobar como pedido</button>}
                {!cerrada && <button className={botonSec} onClick={() => cambiarEstado(c, "rechazada")}>Rechazar</button>}
                {!cerrada && <button className={boton} onClick={() => convertirEnVenta(c, false, "")}><ShoppingCart className="h-4 w-4" /> Convertir en venta</button>}
              </div>
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Desposte / transformación (carnicería y fruver)
// ============================================================
type Salida = { id: number; producto: string; peso: string };
type Merma = { id: number; tipo: string; peso: string };

export function DespostesFrescos() {
  const { productos, cargando, recargar } = usarProductos();
  const [historial, setHistorial] = useState<Desposte[]>([]);
  const [origen, setOrigen] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [entrada, setEntrada] = useState("");
  const [costoTotal, setCostoTotal] = useState("");
  const [salidas, setSalidas] = useState<Salida[]>([{ id: 1, producto: "", peso: "" }]);
  const [mermas, setMermas] = useState<Merma[]>([{ id: 1, tipo: "hueso", peso: "" }]);
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [items, setItems] = useState<ItemDesposte[]>([]);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("com_despostes").select("*").order("created_at", { ascending: false }).limit(40);
    setHistorial(data ?? []);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const activos = useMemo(() => productos.filter((p) => p.activo && FAMILIA[p.unidad_base] === "masa"), [productos]);
  const prodOrigen = activos.find((p) => p.id === origen);

  const pesoEntrada = num(entrada);
  const util = salidas.reduce((s, x) => s + num(x.peso), 0);
  const merma = Math.max(pesoEntrada - util, 0);
  const declarada = mermas.reduce((s, x) => s + num(x.peso), 0);
  const costoBase = (() => {
    if (num(costoTotal) > 0) return num(costoTotal);
    if (!prodOrigen || pesoEntrada <= 0) return 0;
    const b = convertir(pesoEntrada, "kg", prodOrigen.unidad_base, prodOrigen.unidades_por_caja);
    return b === null ? 0 : b * prodOrigen.costo;
  })();
  const ckl = util > 0 ? costoBase / util : 0;
  const rendimiento = pesoEntrada > 0 ? (util / pesoEntrada) * 100 : 0;
  const valorMerma = pesoEntrada > 0 ? (merma * costoBase) / pesoEntrada : 0;

  const guardar = async () => {
    if (pesoEntrada <= 0) return toast.error("Escribe el peso que entra, en kilos.");
    if (!prodOrigen && !descripcion.trim()) return toast.error("Elige el producto de origen o describe lo que entra.");
    const sal = salidas.filter((s) => s.producto && num(s.peso) > 0);
    if (sal.length === 0) return toast.error("Agrega al menos un corte con su peso.");
    if (util > pesoEntrada * 1.0001) return toast.error("Los cortes pesan más de lo que entró.");
    if (declarada > merma + 0.0005) return toast.error("Hueso y desperdicio pesan más que la diferencia entre lo que entró y los cortes.");
    if (costoBase <= 0) return toast.error("Indica el costo total de lo que entra.");
    setGuardando(true);
    const { data, error } = await supabase.rpc("com_registrar_desposte", {
      p_origen: origen || null,
      p_descripcion: descripcion.trim(),
      p_peso_entrada: pesoEntrada,
      p_costo_total: num(costoTotal),
      p_salidas: sal.map((s) => ({ producto_id: s.producto, peso: num(s.peso) })),
      p_mermas: mermas.filter((m) => num(m.peso) > 0).map((m) => ({ tipo: m.tipo, peso: num(m.peso) })),
      p_notas: notas.trim(),
    });
    setGuardando(false);
    if (error) return toast.error(mensajeError(error.message, "No se pudo registrar el desposte."));
    const r = (data ?? {}) as { costo_kilo_limpio?: number; rendimiento_pct?: number };
    toast.success(`Desposte registrado: rendimiento ${r.rendimiento_pct ?? Math.round(rendimiento)}% y costo real por kilo limpio ${dinero(r.costo_kilo_limpio ?? ckl)}.`);
    setOrigen(""); setDescripcion(""); setEntrada(""); setCostoTotal(""); setNotas("");
    setSalidas([{ id: 1, producto: "", peso: "" }]); setMermas([{ id: 1, tipo: "hueso", peso: "" }]);
    void cargar();
    void recargar();
  };

  const alternar = async (d: Desposte) => {
    if (abierto === d.id) return setAbierto(null);
    const { data } = await supabase.from("com_desposte_items").select("*").eq("desposte_id", d.id).order("created_at");
    setItems(data ?? []);
    setAbierto(d.id);
  };

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Desposte y rendimiento"
        texto="Registra lo que entra (canal, bulto de fruta) y en qué se divide. Calculo el rendimiento, el costo real por kilo limpio y la merma, y actualizo el inventario y Contabilidad."
      />
      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Entrada</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Producto que entra (de tu inventario)">
            <select className={campo} value={origen} onChange={(e) => setOrigen(e.target.value)}>
              <option value="">Compra directa (sin inventario)</option>
              {activos.map((p) => <option key={p.id} value={p.id}>{p.nombre} ({Math.round(p.stock * 1000) / 1000} {p.unidad_base})</option>)}
            </select>
          </Campo>
          {!origen && <Campo etiqueta="Qué entra *"><input className={campo} placeholder="Ej: Canal de res" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></Campo>}
          <Campo etiqueta="Peso que entra (kg) *"><input className={campo} inputMode="decimal" value={entrada} onChange={(e) => setEntrada(e.target.value)} /></Campo>
          <Campo etiqueta={origen ? "Costo total (vacío = costo del producto)" : "Costo total pagado *"}>
            <input className={campo} inputMode="decimal" value={costoTotal} onChange={(e) => setCostoTotal(e.target.value)} />
          </Campo>
        </div>

        <h2 className="pt-2 font-medium text-foreground">Salidas: cortes o categorías limpias</h2>
        {salidas.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-2">
            <select className={`${campo} min-w-0 flex-1`} aria-label="Corte" value={s.producto} onChange={(e) => setSalidas((ls) => ls.map((x) => (x.id === s.id ? { ...x, producto: e.target.value } : x)))}>
              <option value="">Elige el corte (producto)</option>
              {activos.filter((p) => p.id !== origen).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
            <input className={`${campo} w-28`} inputMode="decimal" placeholder="Kg" aria-label="Peso en kilos" value={s.peso} onChange={(e) => setSalidas((ls) => ls.map((x) => (x.id === s.id ? { ...x, peso: e.target.value } : x)))} />
            {salidas.length > 1 && <button aria-label="Quitar" className="text-muted-foreground" onClick={() => setSalidas((ls) => ls.filter((x) => x.id !== s.id))}><Trash2 className="h-4 w-4" /></button>}
          </div>
        ))}
        <button className={botonSec} onClick={() => setSalidas((ls) => [...ls, { id: Date.now(), producto: "", peso: "" }])}><Plus className="h-4 w-4" /> Agregar corte</button>
        {activos.length === 0 && <p className="text-sm text-muted-foreground">Crea primero los cortes como productos en “Productos y precios” (en kilos o libras).</p>}

        <h2 className="pt-2 font-medium text-foreground">Merma: hueso, grasa y desperdicio</h2>
        {mermas.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center gap-2">
            <select className={`${campo} w-40`} aria-label="Tipo de merma" value={m.tipo} onChange={(e) => setMermas((ls) => ls.map((x) => (x.id === m.id ? { ...x, tipo: e.target.value } : x)))}>
              <option value="hueso">Hueso</option>
              <option value="grasa">Grasa</option>
              <option value="desperdicio">Desperdicio / cáscara</option>
              <option value="merma">Otra merma</option>
            </select>
            <input className={`${campo} w-28`} inputMode="decimal" placeholder="Kg" aria-label="Peso en kilos" value={m.peso} onChange={(e) => setMermas((ls) => ls.map((x) => (x.id === m.id ? { ...x, peso: e.target.value } : x)))} />
            {mermas.length > 1 && <button aria-label="Quitar" className="text-muted-foreground" onClick={() => setMermas((ls) => ls.filter((x) => x.id !== m.id))}><Trash2 className="h-4 w-4" /></button>}
          </div>
        ))}
        <button className={botonSec} onClick={() => setMermas((ls) => [...ls, { id: Date.now(), tipo: "hueso", peso: "" }])}><Plus className="h-4 w-4" /> Agregar merma</button>
        <Campo etiqueta="Notas"><input className={campo} value={notas} onChange={(e) => setNotas(e.target.value)} /></Campo>

        {pesoEntrada > 0 && (
          <div className="space-y-1 rounded-xl border border-primary/40 bg-primary/5 p-3 text-sm">
            <p className="text-foreground">Cortes limpios: {Math.round(util * 1000) / 1000} kg · Merma total: {Math.round(merma * 1000) / 1000} kg (sin clasificar: {Math.round(Math.max(merma - declarada, 0) * 1000) / 1000} kg)</p>
            <p className="text-foreground">Rendimiento: {Math.round(rendimiento * 10) / 10}% · Costo real por kilo limpio: {ckl > 0 ? dinero(ckl) : "—"}</p>
            <p className="text-muted-foreground">Merma a registrar en Contabilidad: {dinero(valorMerma)}</p>
          </div>
        )}
        <button className={boton} disabled={guardando} onClick={guardar}><Plus className="h-4 w-4" /> Registrar desposte</button>
      </GlassPanel>

      <div className="space-y-2">
        <h2 className="font-medium text-foreground">Historial de despostes</h2>
        {historial.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay despostes registrados.</p>}
        {historial.map((d) => (
          <GlassPanel key={d.id} className="space-y-2 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium text-foreground">{d.descripcion} · {Math.round(d.peso_entrada * 1000) / 1000} kg</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(d.created_at).toLocaleDateString("es-CO")} · Rendimiento {Math.round(d.rendimiento_pct * 10) / 10}% · Kilo limpio {dinero(d.costo_kilo_limpio)} · Merma {Math.round(d.merma_kg * 1000) / 1000} kg ({dinero(d.merma_valor)})
                </p>
              </div>
              <button aria-label="Ver detalle" className="text-muted-foreground" onClick={() => alternar(d)}>
                {abierto === d.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
            {abierto === d.id && (
              <ul className="space-y-0.5 text-xs text-muted-foreground">
                {items.map((i) => <li key={i.id}>{i.tipo === "corte" ? "Corte" : "Merma"}: {i.nombre} · {Math.round(i.peso_kg * 1000) / 1000} kg · {dinero(i.valor)}</li>)}
              </ul>
            )}
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}
