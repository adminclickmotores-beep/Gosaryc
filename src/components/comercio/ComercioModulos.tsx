import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ImageOff, LayoutGrid, List, Loader2, Minus, Plus, Printer, ScanBarcode, ShieldAlert, Sparkles, Trash2, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { usePermisos } from "@/hooks/use-permisos";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { descontarStockOffline, evitarSubmitConEnter, generarEAN13, reproducirBeep, stockEfectivoOffline } from "@/lib/escaner-barras";
import { CLASE_NIVEL, diasPara, nivelVence, textoVence, type NivelVence } from "@/lib/lotes-comercio";
import { escaparHtml, exportarExcel, imprimirReporte } from "@/lib/exportes";
import { ImportadorMasivo } from "@/components/comercio/ImportadorMasivo";
import { EtiquetasBarras } from "@/components/comercio/EtiquetasBarras";
import { SucursalesTraslados } from "@/components/negocio/SucursalesTraslados";

export type Producto = Tables<"com_productos">;

export const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
export const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";
export const boton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50";
export const botonSec =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-glass-border px-3 py-2 text-sm text-foreground hover:bg-glass/40 disabled:opacity-50";
export const num = (s: string): number => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

// ---- Unidades y conversión (igual que en la base de datos) ----
export const UNIDADES = ["und", "caja", "g", "kg", "lb", "cm", "m", "ml", "l"] as const;
export const FAMILIA: Record<string, string> = { g: "masa", kg: "masa", lb: "masa", cm: "longitud", m: "longitud", ml: "volumen", l: "volumen", und: "conteo", caja: "conteo" };
export const NOMBRE_UNIDAD: Record<string, string> = {
  und: "Unidad", caja: "Caja", g: "Gramo", kg: "Kilo", lb: "Libra", cm: "Centímetro", m: "Metro", ml: "Mililitro", l: "Litro",
};

/** Ubicación física en la bodega: Pasillo / Estante / Nivel. */
export function ubicacion(p: Producto): string {
  const partes: string[] = [];
  if (p.ubicacion_pasillo) partes.push(`Pasillo ${p.ubicacion_pasillo}`);
  if (p.ubicacion_estante) partes.push(`Estante ${p.ubicacion_estante}`);
  if (p.ubicacion_nivel) partes.push(`Nivel ${p.ubicacion_nivel}`);
  return partes.join(" · ");
}

export function unidadesDe(p: Producto): string[] {
  const fam = FAMILIA[p.unidad_base];
  return UNIDADES.filter((u) => FAMILIA[u] === fam && (u !== "caja" || p.unidades_por_caja !== null || p.unidad_base === "caja"));
}

export function convertir(cant: number, de: string, a: string, caja: number | null): number | null {
  if (de === a) return cant;
  if (FAMILIA[de] !== FAMILIA[a]) return null;
  const f = (u: string): number | null =>
    u === "kg" ? 1000 : u === "lb" ? 453.592 : u === "m" ? 100 : u === "l" ? 1000 : u === "caja" ? caja : 1;
  const x = f(de);
  const y = f(a);
  if (x === null || y === null) return null;
  return (cant * x) / y;
}

export type Linea = { p: Producto; cantidad: string; unidad: string };
type Calculo = { base: number; impuesto: number; total: number; cantBase: number; error: string | null };

export function precioDe(p: Producto, tipo: string): number {
  if (tipo === "mayorista") return p.precio_mayorista ?? p.precio_detal;
  if (tipo === "especial") return p.precio_especial ?? p.precio_detal;
  return p.precio_detal;
}

function calcular(l: Linea, tipo: string, permitirNegativo = false, stockDisp?: number): Calculo {
  const cant = num(l.cantidad);
  const cb = convertir(cant, l.unidad, l.p.unidad_base, l.p.unidades_por_caja);
  if (cant <= 0 || cb === null) return { base: 0, impuesto: 0, total: 0, cantBase: 0, error: "Cantidad no válida." };
  const pct = l.p.tipo_impuesto === "exento" ? 0 : l.p.impuesto_pct;
  const precio = precioDe(l.p, tipo);
  let base: number;
  let imp: number;
  let total: number;
  if (l.p.precio_incluye_impuesto) {
    total = Math.round(cb * precio * 100) / 100;
    base = Math.round((total / (1 + pct / 100)) * 100) / 100;
    imp = total - base;
  } else {
    base = Math.round(cb * precio * 100) / 100;
    imp = Math.round(((base * pct) / 100) * 100) / 100;
    total = base + imp;
  }
  const stockRef = stockDisp ?? l.p.stock;
  const error = !permitirNegativo && cb > stockRef ? `Sin existencias suficientes: solo quedan ${Math.round(stockRef * 1000) / 1000} ${l.p.unidad_base}.` : null;
  return { base, impuesto: imp, total, cantBase: cb, error };
}

export function Encabezado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-2xl text-foreground">{titulo}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

export function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-muted-foreground">
      <span className="mb-1 block">{etiqueta}</span>
      {children}
    </label>
  );
}

export function Cargando() {
  return (
    <div className="flex min-h-[30dvh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

export function usarProductos() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const cargar = useCallback(async () => {
    const { data } = await supabase.from("com_productos").select("*").order("nombre");
    setProductos(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
    const alSincronizar = () => {
      void cargar();
    };
    window.addEventListener("sin-conexion:sincronizado", alSincronizar);
    return () => window.removeEventListener("sin-conexion:sincronizado", alSincronizar);
  }, [cargar]);
  return { productos, cargando, recargar: cargar };
}

export const esc = escaparHtml;

type Ticket = {
  numero: string;
  cliente: string;
  metodo: string;
  tipoPrecio: string;
  lineas: { nombre: string; cantidad: number; unidad: string; total: number }[];
  base: number;
  iva: number;
  impoconsumo: number;
  total: number;
};

function imprimirTicket(t: Ticket, negocio: string) {
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) return toast.error("Permite las ventanas emergentes para imprimir.");
  const filas = t.lineas
    .map((l) => `<tr><td>${l.cantidad} ${esc(l.unidad)} ${esc(l.nombre)}</td><td style="text-align:right">${dinero(l.total)}</td></tr>`)
    .join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Ticket</title>
<style>@page{size:80mm auto;margin:4mm}body{font-family:monospace;font-size:13px;width:72mm;margin:0}h1{font-size:16px;text-align:center;margin:0 0 4px}
table{width:100%;border-collapse:collapse}td{padding:2px 0;vertical-align:top}hr{border:0;border-top:1px dashed #000;margin:6px 0}.c{text-align:center}</style></head><body>
<h1>${esc(negocio)}</h1><p class="c">Venta #${esc(t.numero)}<br>${new Date().toLocaleString("es-CO")}<br>Precio: ${esc(t.tipoPrecio)}</p><hr>
${t.cliente ? `<p>Cliente: ${esc(t.cliente)}</p><hr>` : ""}<table>${filas}</table><hr>
<table><tr><td>Base gravable</td><td style="text-align:right">${dinero(t.base)}</td></tr>
${t.iva > 0 ? `<tr><td>IVA</td><td style="text-align:right">${dinero(t.iva)}</td></tr>` : ""}
${t.impoconsumo > 0 ? `<tr><td>Impoconsumo</td><td style="text-align:right">${dinero(t.impoconsumo)}</td></tr>` : ""}
<tr><td><b>TOTAL</b></td><td style="text-align:right"><b>${dinero(t.total)}</b></td></tr></table>
<p class="c">${t.metodo === "fiado" ? "Venta a crédito (cuenta por cobrar)" : `Pagado (${esc(t.metodo)})`}</p><p class="c">¡Gracias por tu compra!</p>
<script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
}

// ============================================================
// Productos: código de barras, unidades, precios múltiples e impuesto
// ============================================================
export function ProductosComercial() {
  const { productos, cargando, recargar } = usarProductos();
  const [busqueda, setBusqueda] = useState("");
  const [nombre, setNombre] = useState("");
  const [barras, setBarras] = useState("");
  const [sku, setSku] = useState("");
  const [unidad, setUnidad] = useState("und");
  const [porCaja, setPorCaja] = useState("");
  const [detal, setDetal] = useState("");
  const [mayorista, setMayorista] = useState("");
  const [especial, setEspecial] = useState("");
  const [impuesto, setImpuesto] = useState("exento");
  const [pct, setPct] = useState("0");
  const [incluye, setIncluye] = useState(true);
  const [stock, setStock] = useState("");
  const [minimo, setMinimo] = useState("");
  const [costo, setCosto] = useState("");
  const [pasillo, setPasillo] = useState("");
  const [estante, setEstante] = useState("");
  const [nivel, setNivel] = useState("");
  const [vista, setVista] = useState<"mosaico" | "lista">("mosaico");
  const [abierto, setAbierto] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  const elegirImpuesto = (v: string) => {
    setImpuesto(v);
    setPct(v === "iva" ? "19" : v === "impoconsumo" ? "8" : "0");
  };

  const guardar = async () => {
    if (!nombre.trim()) return toast.error("Escribe el nombre del producto.");
    if (num(detal) <= 0) return toast.error("El precio detal debe ser mayor a cero.");
    if (impuesto !== "exento" && (num(pct) <= 0 || num(pct) > 100)) return toast.error("Indica el porcentaje del impuesto.");
    setGuardando(true);
    const { error } = await supabase.from("com_productos").insert({
      nombre: nombre.trim(),
      codigo_barras: barras.trim() || null,
      sku: sku.trim() || null,
      unidad_base: unidad,
      unidades_por_caja: num(porCaja) > 0 ? num(porCaja) : null,
      precio_detal: num(detal),
      precio_mayorista: mayorista.trim() ? num(mayorista) : null,
      precio_especial: especial.trim() ? num(especial) : null,
      tipo_impuesto: impuesto,
      impuesto_pct: impuesto === "exento" ? 0 : num(pct),
      precio_incluye_impuesto: incluye,
      stock: Math.max(num(stock), 0),
      stock_actual: Math.max(num(stock), 0),
      stock_minimo: Math.max(num(minimo), 0),
      costo: Math.max(num(costo), 0),
      ubicacion_pasillo: pasillo.trim() || null,
      ubicacion_estante: estante.trim() || null,
      ubicacion_nivel: nivel.trim() || null,
    });
    setGuardando(false);
    if (error) {
      return toast.error(/duplicate|unique/i.test(error.message) ? "Ya existe un producto con ese código de barras o SKU." : "No se pudo guardar el producto.");
    }
    toast.success("Producto guardado.");
    setNombre(""); setBarras(""); setSku(""); setPorCaja(""); setDetal(""); setMayorista(""); setEspecial("");
    setStock(""); setMinimo(""); setCosto(""); setPasillo(""); setEstante(""); setNivel("");
    void recargar();
  };

  const ajustarStock = async (p: Producto) => {
    const v = window.prompt(`Nuevo stock de ${p.nombre} (en ${NOMBRE_UNIDAD[p.unidad_base].toLowerCase()}s). Queda en el historial de inventario:`, String(p.stock));
    if (v === null) return;
    const n = num(v);
    if (n < 0) return toast.error("El stock no puede ser negativo.");
    const { error } = await supabase.from("com_productos").update({ stock: n }).eq("id", p.id);
    if (error) return toast.error("No se pudo ajustar el stock.");
    void recargar();
  };

  const alternar = async (p: Producto) => {
    const { error } = await supabase.from("com_productos").update({ activo: !p.activo }).eq("id", p.id);
    if (error) return toast.error("No se pudo actualizar.");
    void recargar();
  };

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter((p) => !q || p.nombre.toLowerCase().includes(q) || (p.codigo_barras ?? "").includes(q) || (p.sku ?? "").toLowerCase().includes(q));
  }, [productos, busqueda]);

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado
        titulo="Productos y precios"
        texto="Código de barras o SKU, unidad de venta (kilo, libra, metro, litro, caja), precios detal, mayorista y especial, e impuesto por producto."
      />
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => exportarExcel("inventario-valorizado",
            ["Producto", "Código", "SKU", "Unidad", "Stock", "Costo unitario", "Costo total", "Precio detal"],
            visibles.map((p) => [p.nombre, p.codigo_barras ?? "", p.sku ?? "", p.unidad_base, p.stock, p.costo, Math.round(p.stock * p.costo * 100) / 100, p.precio_detal]))}
          className="rounded-full border border-glass-border px-4 py-1.5 text-sm text-muted-foreground"
        >
          Inventario a Excel
        </button>
        <button
          onClick={() => imprimirReporte("Inventario valorizado", `${visibles.length} referencias`,
            ["Producto", "Stock", "Costo unit.", "Costo total", "Precio detal"],
            visibles.map((p) => [p.nombre, String(p.stock), dinero(p.costo), dinero(p.stock * p.costo), dinero(p.precio_detal)]),
            [`Valor total del inventario: ${dinero(visibles.reduce((s, p) => s + p.stock * p.costo, 0))}`])}
          className="rounded-full border border-glass-border px-4 py-1.5 text-sm text-muted-foreground"
        >
          Inventario a PDF
        </button>
      </div>
      <ImportadorMasivo alTerminar={recargar} />
      <EtiquetasBarras productos={productos} />
      <SucursalesTraslados />
      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Nuevo producto</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Nombre *"><input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
          <Campo etiqueta="Código de barras">
            <div className="flex gap-2">
              <input
                className={campo}
                placeholder="Escanea o escribe el código"
                value={barras}
                onChange={(e) => setBarras(e.target.value)}
                onKeyDown={evitarSubmitConEnter}
              />
              <button
                type="button"
                onClick={() => {
                  const nuevo = generarEAN13();
                  setBarras(nuevo);
                  toast.success(`Código EAN-13 generado: ${nuevo}`);
                }}
                className={`${botonSec} shrink-0 whitespace-nowrap`}
              >
                <Sparkles className="h-4 w-4" /> Generar EAN-13
              </button>
            </div>
          </Campo>
          <Campo etiqueta="SKU / referencia"><input className={campo} value={sku} onChange={(e) => setSku(e.target.value)} /></Campo>
          <Campo etiqueta="Unidad del inventario y de los precios">
            <select className={campo} value={unidad} onChange={(e) => setUnidad(e.target.value)}>
              {UNIDADES.map((u) => <option key={u} value={u}>{NOMBRE_UNIDAD[u]}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Unidades sueltas por caja (si vendes caja y unidad)">
            <input className={campo} inputMode="decimal" value={porCaja} onChange={(e) => setPorCaja(e.target.value)} />
          </Campo>
          <Campo etiqueta="Stock actual"><input className={campo} inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} /></Campo>
          <Campo etiqueta="Precio detal *"><input className={campo} inputMode="decimal" value={detal} onChange={(e) => setDetal(e.target.value)} /></Campo>
          <Campo etiqueta="Precio mayorista / ferretero"><input className={campo} inputMode="decimal" value={mayorista} onChange={(e) => setMayorista(e.target.value)} /></Campo>
          <Campo etiqueta="Precio especial"><input className={campo} inputMode="decimal" value={especial} onChange={(e) => setEspecial(e.target.value)} /></Campo>
          <Campo etiqueta="Impuesto">
            <select className={campo} value={impuesto} onChange={(e) => elegirImpuesto(e.target.value)}>
              <option value="exento">Exento</option>
              <option value="iva">IVA</option>
              <option value="impoconsumo">Impoconsumo</option>
            </select>
          </Campo>
          <Campo etiqueta="Porcentaje (%)"><input className={campo} inputMode="decimal" value={pct} disabled={impuesto === "exento"} onChange={(e) => setPct(e.target.value)} /></Campo>
          <Campo etiqueta="Costo (por unidad del inventario)"><input className={campo} inputMode="decimal" value={costo} onChange={(e) => setCosto(e.target.value)} /></Campo>
          <Campo etiqueta="Stock mínimo"><input className={campo} inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} /></Campo>
          <Campo etiqueta="Ubicación: pasillo"><input className={campo} placeholder="Ej: 3" value={pasillo} onChange={(e) => setPasillo(e.target.value)} /></Campo>
          <Campo etiqueta="Ubicación: estante"><input className={campo} placeholder="Ej: B" value={estante} onChange={(e) => setEstante(e.target.value)} /></Campo>
          <Campo etiqueta="Ubicación: nivel"><input className={campo} placeholder="Ej: 2" value={nivel} onChange={(e) => setNivel(e.target.value)} /></Campo>
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={incluye} onChange={(e) => setIncluye(e.target.checked)} /> Los precios ya incluyen el impuesto
        </label>
        <button className={boton} disabled={guardando} onClick={guardar}><Plus className="h-4 w-4" /> Guardar producto</button>
      </GlassPanel>

      <div className="space-y-2">
        <input className={campo} placeholder="Buscar por nombre, código o SKU" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        <div className="flex gap-2">
          <button type="button" onClick={() => setVista("mosaico")} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${vista === "mosaico" ? "border-primary bg-primary text-primary-foreground" : "border-glass-border text-muted-foreground"}`}>
            <LayoutGrid className="h-4 w-4" /> Vista mosaico HD
          </button>
          <button type="button" onClick={() => setVista("lista")} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${vista === "lista" ? "border-primary bg-primary text-primary-foreground" : "border-glass-border text-muted-foreground"}`}>
            <List className="h-4 w-4" /> Vista lista
          </button>
        </div>
        {visibles.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay productos.</p>}
        {vista === "mosaico" && visibles.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {visibles.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setAbierto(p.id)}
                className={`group min-w-0 overflow-hidden rounded-2xl border border-glass-border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${p.activo ? "" : "opacity-50"}`}
              >
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  {p.imagen_url ? (
                    <img src={p.imagen_url} alt={p.nombre} loading="lazy" className="h-full w-full max-w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-muted-foreground/50"><ImageOff className="h-10 w-10" /></span>
                  )}
                  <span className={`absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-medium ${p.stock <= p.stock_minimo ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}>
                    {p.stock <= p.stock_minimo ? "Stock bajo" : "Disponible"}
                  </span>
                </div>
                <div className="space-y-0.5 p-3">
                  <p className="break-words text-sm font-medium leading-snug text-foreground">{p.nombre}</p>
                  <p className="text-xs text-muted-foreground">Stock {Math.round(p.stock * 1000) / 1000} {p.unidad_base}</p>
                  <p className="precio-esmeralda text-base font-semibold">{dinero(p.precio_detal)}</p>
                </div>
              </button>
            ))}
          </div>
        )}
        {abierto && productos.find((x) => x.id === abierto) && (
          <FichaProductoInventario
            producto={productos.find((x) => x.id === abierto) as Producto}
            onCerrar={() => setAbierto(null)}
            onGuardado={recargar}
          />
        )}
        {vista === "lista" && visibles.map((p) => (
          <GlassPanel key={p.id} className={`flex flex-wrap items-center justify-between gap-3 p-3 ${p.activo ? "" : "opacity-50"}`}>
            <div className="min-w-0 flex-1">
              <p className="break-words text-sm font-medium text-foreground">{p.nombre}</p>
              <p className="break-words text-xs text-muted-foreground">
                {p.codigo_barras ? `Código ${p.codigo_barras} · ` : ""}{p.sku ? `SKU ${p.sku} · ` : ""}
                Detal {dinero(p.precio_detal)}{p.precio_mayorista !== null ? ` · Mayorista ${dinero(p.precio_mayorista)}` : ""}{p.precio_especial !== null ? ` · Especial ${dinero(p.precio_especial)}` : ""}
                {" "}por {NOMBRE_UNIDAD[p.unidad_base].toLowerCase()} · {p.tipo_impuesto === "exento" ? "Exento" : `${p.tipo_impuesto === "iva" ? "IVA" : "Impoconsumo"} ${p.impuesto_pct}%`}
              </p>
              {ubicacion(p) && <p className="break-words text-xs text-primary">{ubicacion(p)}</p>}
            </div>
            <span className={`text-sm ${p.stock <= p.stock_minimo ? "text-destructive" : "text-foreground"}`}>
              Stock: {Math.round(p.stock * 1000) / 1000} {p.unidad_base}
            </span>
            <button className={botonSec} onClick={() => ajustarStock(p)}>Ajustar stock</button>
            <button className={botonSec} onClick={() => alternar(p)}>{p.activo ? "Desactivar" : "Activar"}</button>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

/** Vista ampliada dividida del inventario: foto grande a la izquierda y ficha con edición rápida a la derecha. */
function FichaProductoInventario({
  producto: p,
  onCerrar,
  onGuardado,
}: {
  producto: Producto;
  onCerrar: () => void;
  onGuardado: () => Promise<void> | void;
}) {
  const [barras, setBarras] = useState(p.codigo_barras ?? "");
  const [detal, setDetal] = useState(String(p.precio_detal));
  const [mayorista, setMayorista] = useState(p.precio_mayorista !== null ? String(p.precio_mayorista) : "");
  const [especial, setEspecial] = useState(p.precio_especial !== null ? String(p.precio_especial) : "");
  const [stock, setStock] = useState(String(p.stock));
  const [minimo, setMinimo] = useState(String(p.stock_minimo));
  const [imagen, setImagen] = useState(p.imagen_url ?? "");
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    window.addEventListener("keydown", alTeclear);
    return () => window.removeEventListener("keydown", alTeclear);
  }, [onCerrar]);

  const guardarRapido = async () => {
    if (num(detal) <= 0) return toast.error("El precio detal debe ser mayor a cero.");
    setGuardando(true);
    const stockNuevo = Math.max(num(stock), 0);
    const { error } = await supabase
      .from("com_productos")
      .update({
        codigo_barras: barras.trim() || null,
        precio_detal: num(detal),
        precio_mayorista: mayorista.trim() ? num(mayorista) : null,
        precio_especial: especial.trim() ? num(especial) : null,
        stock: stockNuevo,
        stock_actual: stockNuevo,
        stock_minimo: Math.max(num(minimo), 0),
        imagen_url: imagen.trim() || null,
      })
      .eq("id", p.id);
    setGuardando(false);
    if (error) return toast.error(/duplicate|unique/i.test(error.message) ? "Ya existe otro producto con ese código de barras." : "No se pudo guardar el producto.");
    toast.success("Producto actualizado.");
    await onGuardado();
    onCerrar();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={p.nombre}
        onClick={(e) => e.stopPropagation()}
        className="relative grid max-h-[92dvh] w-full max-w-4xl grid-cols-1 overflow-y-auto rounded-t-3xl border border-glass-border bg-card text-card-foreground shadow-2xl sm:rounded-3xl md:grid-cols-12"
      >
        <button type="button" aria-label="Cerrar" onClick={onCerrar} className="absolute right-3 top-3 z-10 rounded-full bg-black/55 p-2 text-white hover:bg-black/75">
          <X className="h-5 w-5" />
        </button>
        <div className="group relative aspect-[4/3] w-full overflow-hidden bg-muted md:col-span-6 md:aspect-auto md:min-h-[420px]">
          {imagen.trim() ? (
            <img src={imagen.trim()} alt={p.nombre} className="absolute inset-0 h-full w-full max-w-full object-cover transition-transform duration-500 group-hover:scale-110" />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center text-muted-foreground/50"><ImageOff className="h-16 w-16" /></span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-3 p-5 md:col-span-6">
          <div>
            <h3 className="break-words pr-10 font-display text-2xl leading-tight">{p.nombre}</h3>
            <p className="precio-esmeralda mt-1 text-2xl font-semibold">{dinero(p.precio_detal)}</p>
            <p className="mt-1 break-words text-xs text-muted-foreground">
              {p.codigo_barras ? `Código de barras ${p.codigo_barras}` : "Sin código de barras"}
              {p.sku ? ` · SKU ${p.sku}` : ""}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <p><span className="text-muted-foreground">Unidad: </span>{NOMBRE_UNIDAD[p.unidad_base] ?? p.unidad_base}</p>
            <p><span className="text-muted-foreground">Por caja: </span>{p.unidades_por_caja ?? "—"}</p>
            <p><span className="text-muted-foreground">Impuesto: </span>{p.tipo_impuesto === "exento" ? "Exento" : `${p.tipo_impuesto === "iva" ? "IVA" : "Impoconsumo"} ${p.impuesto_pct}%`}</p>
            <p><span className="text-muted-foreground">Costo: </span>{dinero(p.costo)}</p>
            <p className="col-span-2"><span className="text-muted-foreground">Ubicación: </span>{ubicacion(p) || "Sin ubicación"}</p>
            <p className="col-span-2 text-xs text-muted-foreground">El stock es el total del negocio; los movimientos entre sucursales se registran en traslados.</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <Campo etiqueta="Código de barras">
                <div className="flex gap-2">
                  <input
                    className={campo}
                    placeholder="Escanea o escribe el código"
                    value={barras}
                    onChange={(e) => setBarras(e.target.value)}
                    onKeyDown={evitarSubmitConEnter}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const nuevo = generarEAN13();
                      setBarras(nuevo);
                      toast.success(`Código EAN-13 generado: ${nuevo}`);
                    }}
                    className={`${botonSec} shrink-0 whitespace-nowrap`}
                  >
                    <Sparkles className="h-4 w-4" /> Generar EAN-13
                  </button>
                </div>
              </Campo>
            </div>
            <Campo etiqueta="Precio detal"><input className={campo} inputMode="decimal" value={detal} onChange={(e) => setDetal(e.target.value)} /></Campo>
            <Campo etiqueta="Precio mayorista"><input className={campo} inputMode="decimal" value={mayorista} onChange={(e) => setMayorista(e.target.value)} /></Campo>
            <Campo etiqueta="Precio especial"><input className={campo} inputMode="decimal" value={especial} onChange={(e) => setEspecial(e.target.value)} /></Campo>
            <Campo etiqueta="Stock actual"><input className={campo} inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} /></Campo>
            <Campo etiqueta="Stock mínimo"><input className={campo} inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} /></Campo>
            <Campo etiqueta="Enlace de la foto"><input className={campo} placeholder="https://…" value={imagen} onChange={(e) => setImagen(e.target.value)} /></Campo>
          </div>
          <button type="button" disabled={guardando} onClick={guardarRapido} className="btn-pro mt-auto w-full rounded-2xl px-4 py-3.5 text-base font-semibold disabled:opacity-60">
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// POS ultrarrápido: lector de barras, peso o fracción, precios múltiples, crédito con cupo
// ============================================================
type EstadoCredito = { tiene_cupo: boolean; cupo: number; plazo_dias: number; deuda: number; vencido: number; disponible: number };

export function PosComercial() {
  const { negocio } = useNegocio();
  const { esAdmin } = usePermisos();
  const { productos, cargando, recargar } = usarProductos();
  const lector = useRef<HTMLInputElement | null>(null);
  const [codigo, setCodigo] = useState("");
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [tipoPrecio, setTipoPrecio] = useState("detal");
  const [metodo, setMetodo] = useState("efectivo");
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [credito, setCredito] = useState<EstadoCredito | null>(null);
  const [bloqueo, setBloqueo] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [recibido, setRecibido] = useState("");
  const [crearCodigo, setCrearCodigo] = useState<string | null>(null);
  const [tickOffline, setTickOffline] = useState(0);

  const [vencen, setVencen] = useState<Record<string, { dias: number; lote: string; nivel: NivelVence }>>({});

  const permitirNegativo = Boolean(negocio?.permitir_inventario_negativo);
  const stockDisponible = useCallback(
    (p: Producto) => {
      void tickOffline;
      return stockEfectivoOffline("com_productos", p.id, p.stock, permitirNegativo);
    },
    [permitirNegativo, tickOffline],
  );

  const enfocar = () => window.setTimeout(() => lector.current?.focus(), 30);
  useEffect(() => {
    enfocar();
  }, []);

  // Alertas de vencimiento: el lote que vence primero de cada producto (el que el FIFO vende primero).
  useEffect(() => {
    let vivo = true;
    void (async () => {
      const { data } = await supabase
        .from("com_lotes")
        .select("producto_id, numero_lote, vence")
        .gt("cantidad_actual", 0)
        .not("vence", "is", null)
        .order("vence");
      if (!vivo) return;
      const m: Record<string, { dias: number; lote: string; nivel: NivelVence }> = {};
      for (const l of data ?? []) {
        if (m[l.producto_id]) continue;
        const dias = diasPara(l.vence);
        if (dias === null) continue;
        const nivel = nivelVence(dias);
        if (nivel === "ok" || nivel === "sin") continue;
        m[l.producto_id] = { dias, lote: l.numero_lote, nivel };
      }
      setVencen(m);
    })();
    return () => {
      vivo = false;
    };
  }, [productos]);

  const activos = useMemo(() => productos.filter((p) => p.activo), [productos]);

  const agregar = useCallback(
    (p: Producto, conSonido = false): boolean => {
      const disp = stockDisponible(p);
      const existente = lineas.find((l) => l.p.id === p.id);
      const actualBase = existente
        ? (convertir(num(existente.cantidad), existente.unidad, p.unidad_base, p.unidades_por_caja) ?? 0)
        : 0;
      const incrementoBase = convertir(1, existente?.unidad ?? p.unidad_base, p.unidad_base, p.unidades_por_caja) ?? 1;
      if (!permitirNegativo && (disp <= 0 || actualBase + incrementoBase > disp)) {
        if (conSonido) reproducirBeep("error");
        toast.error(`Sin existencias para ${p.nombre}`);
        return false;
      }
      setLineas((ls) => {
        const i = ls.findIndex((l) => l.p.id === p.id);
        if (i >= 0) {
          const copia = [...ls];
          copia[i] = { ...copia[i], cantidad: String(num(copia[i].cantidad) + 1) };
          return copia;
        }
        return [...ls, { p, cantidad: "1", unidad: p.unidad_base }];
      });
      setBloqueo(null);
      if (conSonido) {
        reproducirBeep("ok");
        toast.success(`${p.nombre} (+1)`);
      }
      return true;
    },
    [lineas, permitirNegativo, stockDisponible],
  );

  const procesarCodigoEscaneado = useCallback(
    (raw: string) => {
      const q = raw.trim();
      if (!q) return;
      const ql = q.toLowerCase();
      const exacto = activos.find((p) => p.codigo_barras === q || (p.sku ?? "").toLowerCase() === ql);
      const porNombre = activos.filter((p) => p.nombre.toLowerCase().includes(ql));
      const p = exacto ?? (porNombre.length === 1 ? porNombre[0] : undefined);
      if (p) {
        agregar(p, true);
        setCodigo("");
      } else if (porNombre.length > 1) {
        toast.message("Hay varias coincidencias: elige una de la lista.");
      } else {
        reproducirBeep("error");
        toast.error(`Código "${q}" no registrado`, {
          duration: 6000,
          action: {
            label: "+ Crear producto con este código",
            onClick: () => setCrearCodigo(q),
          },
        });
        setCodigo("");
      }
    },
    [activos, agregar],
  );

  useBarcodeScanner({
    activo: !crearCodigo,
    onScan: (c) => procesarCodigoEscaneado(c),
  });

  const escanear = () => {
    procesarCodigoEscaneado(codigo);
    enfocar();
  };

  const sugeridos = useMemo(() => {
    const q = codigo.trim().toLowerCase();
    if (q.length < 2) return [];
    return activos
      .filter((p) => p.nombre.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q) || (p.codigo_barras ?? "").includes(q))
      .slice(0, 6);
  }, [codigo, activos]);

  const cambiarLinea = (id: string, cambio: Partial<Pick<Linea, "cantidad" | "unidad">>) =>
    setLineas((ls) =>
      ls.map((l) => {
        if (l.p.id !== id) return l;
        const next = { ...l, ...cambio };
        if (!permitirNegativo) {
          const disp = stockDisponible(l.p);
          const cb = convertir(num(next.cantidad), next.unidad, l.p.unidad_base, l.p.unidades_por_caja);
          if (cb !== null && cb > disp) {
            reproducirBeep("error");
            toast.error(`Sin existencias para ${l.p.nombre}`);
            return l;
          }
        }
        return next;
      }),
    );
  const quitar = (id: string) => setLineas((ls) => ls.filter((l) => l.p.id !== id));

  const calculos = lineas.map((l) => ({ l, c: calcular(l, tipoPrecio, permitirNegativo, stockDisponible(l.p)) }));
  const base = calculos.reduce((s, x) => s + x.c.base, 0);
  const iva = calculos.filter((x) => x.l.p.tipo_impuesto === "iva").reduce((s, x) => s + x.c.impuesto, 0);
  const impo = calculos.filter((x) => x.l.p.tipo_impuesto === "impoconsumo").reduce((s, x) => s + x.c.impuesto, 0);
  const total = calculos.reduce((s, x) => s + x.c.total, 0);
  const hayError = calculos.some((x) => x.c.error !== null);
  const cambio = metodo === "efectivo" && num(recibido) > total ? num(recibido) - total : 0;

  // Estado de crédito del cliente cuando se va a fiar.
  useEffect(() => {
    setCredito(null);
    if (metodo !== "fiado" || cliente.trim().length < 2) return;
    const t = window.setTimeout(async () => {
      const { data } = await supabase.rpc("com_estado_credito", { p_cliente: cliente.trim(), p_telefono: telefono.trim() });
      if (data && typeof data === "object" && !Array.isArray(data)) setCredito(data as unknown as EstadoCredito);
    }, 350);
    return () => window.clearTimeout(t);
  }, [metodo, cliente, telefono]);

  const cobrar = async (autorizar: boolean) => {
    if (lineas.length === 0) return toast.error("Escanea o agrega al menos un producto.");
    if (hayError) return toast.error("Revisa las cantidades marcadas en rojo.");
    if (metodo === "fiado" && !cliente.trim()) return toast.error("Para vender a crédito escribe el nombre del cliente.");
    setGuardando(true);
    const items = lineas.map((l) => ({ producto_id: l.p.id, cantidad: num(l.cantidad), unidad: l.unidad }));
    const { data, error } = await supabase.rpc("com_registrar_venta", {
      p_items: items,
      p_cliente: cliente.trim(),
      p_telefono: telefono.trim(),
      p_tipo_precio: tipoPrecio,
      p_metodo: metodo,
      p_autorizar: autorizar,
      p_motivo: motivo.trim(),
    });
    setGuardando(false);
    if (error) {
      const m = error.message ?? "";
      if (m.includes("CREDITO_BLOQUEADO")) {
        setBloqueo(m.split("CREDITO_BLOQUEADO:")[1]?.trim() ?? "Crédito bloqueado.");
        return toast.error(esAdmin ? "Crédito bloqueado. Puedes autorizarlo con un motivo." : "Crédito bloqueado. Pide autorización al dueño.");
      }
      return toast.error(m.length > 0 && m.length < 160 ? m : "No se pudo registrar la venta.");
    }
    const r = (data ?? {}) as { venta_id?: string; base?: number; iva?: number; impoconsumo?: number; total?: number };
    // Si estamos en Modo Offline, refleja el descuento de stock al instante en local hasta sincronizar con Supabase.
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      descontarStockOffline(
        "com_productos",
        calculos.map((x) => ({ productoId: x.l.p.id, cantidad: x.c.cantBase })),
      );
      setTickOffline((n) => n + 1);
    }
    setTicket({
      numero: (r.venta_id ?? "").slice(0, 6).toUpperCase(),
      cliente: cliente.trim(),
      metodo,
      tipoPrecio,
      lineas: calculos.map((x) => ({ nombre: x.l.p.nombre, cantidad: num(x.l.cantidad), unidad: x.l.unidad, total: x.c.total })),
      base: r.base ?? base,
      iva: r.iva ?? iva,
      impoconsumo: r.impoconsumo ?? impo,
      total: r.total ?? total,
    });
    toast.success(metodo === "fiado" ? `Cuenta por cobrar registrada por ${dinero(r.total ?? total)}.` : `Cobrado ${dinero(r.total ?? total)}${cambio > 0 ? ` · devuelve ${dinero(cambio)}` : ""}.`);
    setLineas([]); setCliente(""); setTelefono(""); setMotivo(""); setBloqueo(null); setRecibido(""); setMetodo("efectivo");
    void recargar();
    enfocar();
  };

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-4">
      <Encabezado titulo="Punto de venta" texto="Escanea el código de barras o escribe el SKU y presiona Enter. Vende por peso, fracción o caja con el precio proporcional exacto." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,24rem)]">
        <div className="min-w-0 space-y-3">
          <div className="relative">
            <ScanBarcode className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={lector}
              className={`${campo} rounded-2xl py-3.5 pl-12`}
              placeholder="Escanea código de barras o busca producto..."
              value={codigo}
              autoComplete="off"
              onChange={(e) => setCodigo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  escanear();
                }
              }}
            />
          </div>
          {sugeridos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {sugeridos.map((p) => (
                <button key={p.id} className={`${botonSec} flex-col items-start gap-0.5 text-left`} onClick={() => { agregar(p); setCodigo(""); enfocar(); }}>
                  <span>{p.nombre} · {dinero(precioDe(p, tipoPrecio))}/{p.unidad_base}</span>
                  {ubicacion(p) && <span className="text-xs text-primary">{ubicacion(p)}</span>}
                  {vencen[p.id] && <span className={`rounded border px-1.5 text-xs ${CLASE_NIVEL[vencen[p.id].nivel]}`}>{textoVence(vencen[p.id].dias)}</span>}
                </button>
              ))}
            </div>
          )}
          {activos.length === 0 && <p className="text-sm text-muted-foreground">Primero crea tus productos en “Productos y precios”.</p>}
          {Object.values(vencen).some((v) => v.nivel === "vencido" || v.nivel === "7") && (
            <p className="flex items-start gap-2 rounded-lg border border-destructive/50 p-2 text-sm text-destructive">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              Hay productos vencidos o que vencen en 7 días o menos. Revisa “Lotes y vencimientos”.
            </p>
          )}

          <div className="space-y-2">
            {lineas.length === 0 && <p className="text-sm text-muted-foreground">La cuenta está vacía. Escanea un producto para empezar.</p>}
            {calculos.map(({ l, c }) => (
              <GlassPanel key={l.p.id} className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 break-words text-sm font-medium text-foreground">{l.p.nombre}</p>
                  <button aria-label="Quitar" onClick={() => quitar(l.p.id)} className="shrink-0 text-muted-foreground"><Trash2 className="h-4 w-4" /></button>
                </div>
                {ubicacion(l.p) && <p className="text-xs text-primary">Ubicación: {ubicacion(l.p)}</p>}
                {vencen[l.p.id] && (
                  <p className={`inline-block rounded border px-2 py-0.5 text-xs ${CLASE_NIVEL[vencen[l.p.id].nivel]}`}>
                    Lote {vencen[l.p.id].lote}: {textoVence(vencen[l.p.id].dias)}. Se vende primero (FIFO).
                  </p>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <button aria-label="Menos" className="rounded-full border border-glass-border p-1.5 text-foreground"
                    onClick={() => cambiarLinea(l.p.id, { cantidad: String(Math.max(num(l.cantidad) - 1, 0)) })}><Minus className="h-3.5 w-3.5" /></button>
                  <input className={`${campo} w-28`} inputMode="decimal" aria-label="Cantidad" value={l.cantidad} onChange={(e) => cambiarLinea(l.p.id, { cantidad: e.target.value })} />
                  <button aria-label="Más" className="rounded-full border border-glass-border p-1.5 text-foreground"
                    onClick={() => cambiarLinea(l.p.id, { cantidad: String(num(l.cantidad) + 1) })}><Plus className="h-3.5 w-3.5" /></button>
                  <select className={`${campo} w-36`} aria-label="Unidad de venta" value={l.unidad} onChange={(e) => cambiarLinea(l.p.id, { unidad: e.target.value })}>
                    {unidadesDe(l.p).map((u) => <option key={u} value={u}>{NOMBRE_UNIDAD[u]}</option>)}
                  </select>
                  <span className="ml-auto text-sm font-medium text-foreground">{dinero(c.total)}</span>
                </div>
                {c.error && <p className="text-xs text-destructive">{c.error}</p>}
                {l.p.tipo_impuesto !== "exento" && (
                  <p className="text-xs text-muted-foreground">
                    Incluye {l.p.tipo_impuesto === "iva" ? "IVA" : "Impoconsumo"} {l.p.impuesto_pct}%: {dinero(c.impuesto)}
                  </p>
                )}
              </GlassPanel>
            ))}
          </div>
        </div>

        <GlassPanel className="h-fit space-y-3 p-5 lg:sticky lg:top-20">
          {ticket && (
            <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium text-foreground">Venta #{ticket.numero} · {dinero(ticket.total)}</p>
                <button aria-label="Cerrar" onClick={() => setTicket(null)} className="text-muted-foreground"><X className="h-4 w-4" /></button>
              </div>
              <button className={`${botonSec} w-full`} onClick={() => imprimirTicket(ticket, negocio?.nombre ?? "Mi negocio")}>
                <Printer className="h-4 w-4" /> Imprimir ticket
              </button>
            </div>
          )}
          <h2 className="font-medium text-foreground">Cuenta actual</h2>
          <div className="grid grid-cols-3 gap-2">
            {[{ c: "detal", t: "Detal" }, { c: "mayorista", t: "Mayorista" }, { c: "especial", t: "Especial" }].map((x) => (
              <button key={x.c} onClick={() => setTipoPrecio(x.c)}
                className={`rounded-lg px-2 py-2 text-xs ${tipoPrecio === x.c ? "bg-primary text-primary-foreground" : "border border-glass-border text-foreground/80"}`}>{x.t}</button>
            ))}
          </div>
          <select className={campo} value={metodo} onChange={(e) => { setMetodo(e.target.value); setBloqueo(null); }} aria-label="Forma de pago">
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia (Nequi, Daviplata, Bre-B)</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="fiado">A crédito / cuenta por cobrar</option>
          </select>
          <input className={campo} placeholder={metodo === "fiado" ? "Nombre del cliente *" : "Cliente (opcional)"} value={cliente} onChange={(e) => setCliente(e.target.value)} />
          <input className={campo} placeholder="Celular del cliente" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />

          {metodo === "fiado" && credito && (
            <div className="space-y-1 rounded-lg border border-glass-border p-3 text-sm">
              {credito.tiene_cupo ? (
                <>
                  <p className="text-foreground">Cupo: {dinero(credito.cupo)} · Plazo: {credito.plazo_dias} días</p>
                  <p className="text-muted-foreground">Debe: {dinero(credito.deuda)} · Disponible: {dinero(credito.disponible)}</p>
                </>
              ) : (
                <p className="text-muted-foreground">Este cliente no tiene cupo de crédito. Asígnalo en Cartera y cuentas por cobrar.</p>
              )}
              {credito.vencido > 0 && <p className="text-destructive">Tiene facturas vencidas por {dinero(credito.vencido)}.</p>}
            </div>
          )}

          <div className="space-y-1 border-t border-glass-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Base</span><span>{dinero(base)}</span></div>
            {iva > 0 && <div className="flex justify-between text-muted-foreground"><span>IVA</span><span>{dinero(iva)}</span></div>}
            {impo > 0 && <div className="flex justify-between text-muted-foreground"><span>Impoconsumo</span><span>{dinero(impo)}</span></div>}
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground">Total</span>
              <span className="text-xl font-medium text-foreground">{dinero(total)}</span>
            </div>
          </div>
          {metodo === "efectivo" && (
            <>
              <input className={campo} placeholder="Recibido" inputMode="decimal" value={recibido} onChange={(e) => setRecibido(e.target.value)} />
              {cambio > 0 && <p className="text-sm text-foreground">Devuelta: {dinero(cambio)}</p>}
            </>
          )}

          {bloqueo && (
            <div className="space-y-2 rounded-lg border border-destructive/50 p-3 text-sm">
              <p className="flex items-start gap-2 text-destructive"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {bloqueo}</p>
              {esAdmin ? (
                <>
                  <input className={campo} placeholder="Motivo de la autorización *" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                  <button className={`${boton} w-full`} disabled={guardando} onClick={() => cobrar(true)}>Autorizar y fiar</button>
                </>
              ) : (
                <p className="text-muted-foreground">Solo el dueño puede autorizar esta venta. Pídele que inicie sesión y la autorice.</p>
              )}
            </div>
          )}

          <button className={`${boton} w-full`} disabled={guardando || lineas.length === 0} onClick={() => cobrar(false)}>
            <Wallet className="h-4 w-4" /> {metodo === "fiado" ? "Vender a crédito" : "Cobrar"} {dinero(total)}
          </button>
        </GlassPanel>
      </div>
      <VentasRecientesDevolucion onCambio={recargar} />
      {crearCodigo !== null && (
        <ModalCrearProductoRapidoComercial
          codigoInicial={crearCodigo}
          onCerrar={() => {
            setCrearCodigo(null);
            enfocar();
          }}
          onCreado={async (nuevoProd) => {
            setCrearCodigo(null);
            await recargar();
            agregar(nuevoProd, true);
            enfocar();
          }}
        />
      )}
    </div>
  );
}

type VentaReciente = Pick<Tables<"com_ventas">, "id" | "cliente" | "metodo" | "total" | "created_at" | "fiado_id" | "devuelta_en" | "motivo_devolucion">;

function VentasRecientesDevolucion({ onCambio }: { onCambio: () => Promise<void> | void }) {
  const [abierto, setAbierto] = useState(false);
  const [ventas, setVentas] = useState<VentaReciente[]>([]);
  const [elegida, setElegida] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [trabajando, setTrabajando] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("com_ventas")
      .select("id, cliente, metodo, total, created_at, fiado_id, devuelta_en, motivo_devolucion")
      .order("created_at", { ascending: false })
      .limit(15);
    setVentas(data ?? []);
  }, []);
  useEffect(() => {
    if (abierto) void cargar();
  }, [abierto, cargar]);

  const devolver = async () => {
    if (!elegida) return;
    if (motivo.trim().length < 3) return toast.error("Escribe el motivo de la devolución.");
    setTrabajando(true);
    const { error } = await supabase.rpc("com_devolver_venta", { p_venta: elegida, p_motivo: motivo.trim() });
    setTrabajando(false);
    if (error) {
      const m = error.message ?? "";
      return toast.error(m.length > 0 && m.length < 200 ? m : "No se pudo registrar la devolución.");
    }
    toast.success("Devolución registrada: el producto volvió al inventario y la salida quedó en caja.");
    setElegida(null);
    setMotivo("");
    await cargar();
    await onCambio();
  };

  return (
    <GlassPanel className="space-y-3 p-5">
      <button className="flex w-full items-center justify-between text-left font-medium text-foreground" onClick={() => setAbierto((a) => !a)}>
        <span>Ventas recientes y devoluciones</span>
        <span className="text-xs text-muted-foreground">{abierto ? "Ocultar" : "Ver"}</span>
      </button>
      {abierto && (
        <div className="space-y-2">
          {ventas.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay ventas.</p>}
          {ventas.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-glass-border p-3 text-sm">
              <div className="min-w-0">
                <p className="text-foreground">#{v.id.slice(0, 6).toUpperCase()} · {dinero(v.total)} · {v.metodo}{v.cliente ? ` · ${v.cliente}` : ""}</p>
                <p className="text-xs text-muted-foreground">{new Date(v.created_at).toLocaleString("es-CO")}{v.devuelta_en ? ` · Devuelta: ${v.motivo_devolucion ?? ""}` : ""}</p>
              </div>
              {!v.devuelta_en && !v.fiado_id && (
                <button className="rounded-lg border border-glass-border px-3 py-1.5 text-xs text-foreground" onClick={() => setElegida(elegida === v.id ? null : v.id)}>
                  Devolver
                </button>
              )}
              {elegida === v.id && (
                <div className="flex w-full flex-wrap gap-2">
                  <input className="min-w-0 flex-1 rounded-lg border border-glass-border bg-transparent px-3 py-2 text-base text-foreground" maxLength={200} placeholder="Motivo (producto dañado, error de cobro...)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
                  <button className="rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50" disabled={trabajando} onClick={() => void devolver()}>Confirmar devolución</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}

function ModalCrearProductoRapidoComercial({
  codigoInicial,
  onCerrar,
  onCreado,
}: {
  codigoInicial: string;
  onCerrar: () => void;
  onCreado: (producto: Producto) => Promise<void> | void;
}) {
  const [nombre, setNombre] = useState("");
  const [barras, setBarras] = useState(codigoInicial);
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("10");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    if (!nombre.trim()) return toast.error("Escribe el nombre del producto.");
    if (num(precio) <= 0) return toast.error("El precio debe ser mayor a cero.");
    setGuardando(true);
    const stockNum = Math.max(num(stock), 0);
    const { data, error } = await supabase
      .from("com_productos")
      .insert({
        nombre: nombre.trim(),
        codigo_barras: barras.trim() || null,
        unidad_base: "und",
        precio_detal: num(precio),
        tipo_impuesto: "exento",
        impuesto_pct: 0,
        precio_incluye_impuesto: true,
        stock: stockNum,
        stock_actual: stockNum,
        stock_minimo: 0,
        costo: 0,
      })
      .select("*")
      .single();
    setGuardando(false);
    if (error || !data) {
      return toast.error(/duplicate|unique/i.test(error?.message ?? "") ? "Ya existe un producto con ese código." : "No se pudo crear el producto.");
    }
    toast.success("Producto creado y agregado al carrito.");
    await onCreado(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCerrar}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
      <GlassPanel className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg text-foreground">Crear producto rápido</h3>
          <button type="button" aria-label="Cerrar" onClick={onCerrar} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <Campo etiqueta="Código de barras">
            <div className="flex gap-2">
              <input
                className={campo}
                value={barras}
                onChange={(e) => setBarras(e.target.value)}
                onKeyDown={evitarSubmitConEnter}
              />
              <button
                type="button"
                onClick={() => setBarras(generarEAN13())}
                className={`${botonSec} shrink-0 whitespace-nowrap`}
              >
                <Sparkles className="h-4 w-4" /> Generar EAN-13
              </button>
            </div>
          </Campo>
          <Campo etiqueta="Nombre del producto *">
            <input className={campo} autoFocus placeholder="Ej: Gaseosa 400ml" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo etiqueta="Precio detal *">
              <input className={campo} inputMode="decimal" placeholder="3500" value={precio} onChange={(e) => setPrecio(e.target.value)} />
            </Campo>
            <Campo etiqueta="Stock actual">
              <input className={campo} inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} />
            </Campo>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className={botonSec}>Cancelar</button>
          <button type="button" disabled={guardando} onClick={guardar} className={boton}>
            <Plus className="h-4 w-4" /> {guardando ? "Guardando…" : "Crear y agregar"}
          </button>
        </div>
      </GlassPanel>
      </div>
    </div>
  );
}
