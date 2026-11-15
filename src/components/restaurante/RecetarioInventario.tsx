import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Lightbulb, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { consejosPara } from "@/lib/consejos-cocina";
import { sugerirReceta } from "@/lib/recetas-sugerir.functions";
import { buscarRecetaBase } from "@/data/recetas-biblioteca";
import { useNegocio } from "@/hooks/use-negocio";
import { resolverTipoNegocio, mismoTipoNegocio } from "@/lib/modulos-negocio";

type Insumo = Tables<"restaurante_insumos">;
type Receta = Tables<"restaurante_recetas">;
type Ingrediente = Tables<"restaurante_receta_ingredientes">;
type Producto = Tables<"restaurante_productos">;

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

/** Costo de alimentos objetivo: 35 % del precio de venta (margen bruto de 65 %). */
const COSTO_OBJETIVO = 0.35;

const costoUnidad = (i: Insumo) => (i.cantidad_compra > 0 ? i.precio_compra / i.cantidad_compra : 0);

export function RecetarioInventario() {
  const { negocio } = useNegocio();
  const tipoClave = resolverTipoNegocio(negocio?.tipo_negocio).clave;
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [ingredientes, setIngredientes] = useState<Ingrediente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoId, setProductoId] = useState("");

  const cargar = useCallback(async () => {
    const [a, b, c, d] = await Promise.all([
      supabase.from("restaurante_insumos").select("*").order("nombre"),
      supabase.from("restaurante_recetas").select("*"),
      supabase.from("restaurante_receta_ingredientes").select("*"),
      supabase.from("restaurante_productos").select("*").order("nombre"),
    ]);
    setInsumos(a.data ?? []);
    setRecetas(b.data ?? []);
    setIngredientes(c.data ?? []);
    setProductos((d.data ?? []).filter((x) => mismoTipoNegocio(x.tipo_negocio, negocio?.tipo_negocio)));
  }, [negocio?.tipo_negocio]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const analisis = useMemo(() => {
    return productos.map((p) => {
      const receta = recetas.find((r) => r.producto_id === p.id);
      if (!receta) return { producto: p, receta: null, costo: 0, margen: 0, sugerido: 0, caro: null as string | null, pesoCaro: 0 };
      const lineas = ingredientes
        .filter((i) => i.receta_id === receta.id)
        .map((i) => {
          const ins = insumos.find((x) => x.id === i.insumo_id);
          return { nombre: ins?.nombre ?? "", costo: ins ? i.cantidad * costoUnidad(ins) : 0 };
        });
      const total = lineas.reduce((s, l) => s + l.costo, 0);
      const costo = (total * (1 + receta.merma_pct / 100)) / (receta.porciones || 1);
      const margen = p.precio > 0 ? (p.precio - costo) / p.precio : 0;
      const sugerido = costo > 0 ? Math.ceil(costo / COSTO_OBJETIVO / 100) * 100 : 0;
      const masCaro = [...lineas].sort((x, y) => y.costo - x.costo)[0];
      return {
        producto: p,
        receta,
        costo,
        margen,
        sugerido,
        caro: masCaro && total > 0 ? masCaro.nombre : null,
        pesoCaro: masCaro && total > 0 ? masCaro.costo / total : 0,
      };
    });
  }, [productos, recetas, ingredientes, insumos]);

  const seleccion = analisis.find((a) => a.producto.id === productoId) ?? null;

  const crearReceta = async () => {
    if (!productoId) return toast.error("Elige primero un producto del menú.");
    const { error } = await supabase.from("restaurante_recetas").insert({ producto_id: productoId });
    if (error) return toast.error("No se pudo crear la receta.");
    cargar();
  };

  const usoInsumo = (id: string) => ingredientes.filter((i) => i.insumo_id === id).length;
  const bajos = insumos.filter((i) => i.stock <= i.stock_minimo && i.stock_minimo > 0);
  const sinUso = insumos.filter((i) => usoInsumo(i.id) === 0);
  const unSoloUso = insumos.filter((i) => usoInsumo(i.id) === 1);
  const perdiendo = analisis.filter((a) => a.receta && a.costo > 0 && a.margen < 0.5);

  const consejos = useMemo(
    () =>
      consejosPara([
        ...(seleccion ? [seleccion.producto.nombre] : productos.map((p) => p.nombre)),
        ...insumos.map((i) => i.nombre),
      ]),
    [seleccion, productos, insumos],
  );

  return (
    <div className="space-y-6">
      {(bajos.length > 0 || perdiendo.length > 0) && (
        <GlassPanel className="space-y-2 border-destructive/40 p-4">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Atención
          </p>
          {bajos.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Por agotarse: {bajos.map((i) => `${i.nombre} (${i.stock} ${i.unidad})`).join(", ")}.
            </p>
          )}
          {perdiendo.map((a) => (
            <p key={a.producto.id} className="text-sm text-muted-foreground">
              {a.producto.nombre}: {a.margen < 0 ? "estás perdiendo dinero" : "margen bajo"} ({Math.round(a.margen * 100)} %).
              Precio sugerido: {dinero(a.sugerido)}.
            </p>
          ))}
        </GlassPanel>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Insumos insumos={insumos} onCambio={cargar} usoInsumo={usoInsumo} />

        <div className="space-y-4">
          <GlassPanel className="space-y-3 p-5">
            <h2 className="font-medium text-foreground">Recetario y costos</h2>
            <p className="text-sm text-muted-foreground">
              Elige un producto de tu menú, arma su receta y verás cuánto te cuesta cada plato y cuánto ganas.
            </p>
            <select className={campo} value={productoId} onChange={(e) => setProductoId(e.target.value)}>
              <option value="">Elige un producto…</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
            {seleccion && !seleccion.receta && (
              <button onClick={crearReceta} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
                Crear receta de {seleccion.producto.nombre}
              </button>
            )}
          </GlassPanel>

          {seleccion?.receta && (
            <EditorReceta
              key={seleccion.receta.id}
              receta={seleccion.receta}
              producto={seleccion.producto}
              insumos={insumos}
              ingredientes={ingredientes.filter((i) => i.receta_id === seleccion.receta?.id)}
              costo={seleccion.costo}
              margen={seleccion.margen}
              sugerido={seleccion.sugerido}
              caro={seleccion.caro}
              pesoCaro={seleccion.pesoCaro}
              onCambio={cargar}
            />
          )}
        </div>
      </div>

      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Margen de cada plato</h2>
        {analisis.length === 0 && <p className="text-sm text-muted-foreground">Primero agrega productos en la pestaña Menú.</p>}
        <div className="space-y-2">
          {analisis.map((a) => (
            <button
              key={a.producto.id}
              onClick={() => setProductoId(a.producto.id)}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-glass-border p-3 text-left"
            >
              <span className="min-w-0 truncate text-sm text-foreground">{a.producto.nombre}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {a.receta && a.costo > 0
                  ? `Costo ${dinero(a.costo)} · Precio ${dinero(a.producto.precio)} · Margen ${Math.round(a.margen * 100)} %`
                  : "Sin receta"}
              </span>
            </button>
          ))}
        </div>
      </GlassPanel>

      <GlassPanel className="space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-medium text-foreground">
          <Lightbulb className="h-4 w-4 text-primary" /> Cómo prepararlo mejor y optimizar tu inventario
        </h2>
        {(sinUso.length > 0 || unSoloUso.length > 0) && (
          <div className="space-y-1 text-sm text-muted-foreground">
            {sinUso.length > 0 && (
              <p>Insumos que no usas en ninguna receta (no compres de más): {sinUso.map((i) => i.nombre).join(", ")}.</p>
            )}
            {unSoloUso.length > 0 && (
              <p>Insumos que usas en una sola receta (riesgo de merma, intenta aprovecharlos en otro plato): {unSoloUso.map((i) => i.nombre).join(", ")}.</p>
            )}
          </div>
        )}
        {consejos.map((c) => (
          <div key={c.tema} className="space-y-1">
            <p className="text-sm font-medium text-foreground">{c.tema}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {c.consejos.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        ))}
      </GlassPanel>
    </div>
  );
}

function Insumos({
  insumos,
  onCambio,
  usoInsumo,
}: {
  insumos: Insumo[];
  onCambio: () => void;
  usoInsumo: (id: string) => number;
}) {
  const [nombre, setNombre] = useState("");
  const [unidad, setUnidad] = useState("g");
  const [cantidad, setCantidad] = useState("");
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("");
  const [minimo, setMinimo] = useState("");
  const [bodegas, setBodegas] = useState<Tables<"restaurante_bodegas">[]>([]);
  const [bodegaId, setBodegaId] = useState("");
  const [nuevaBodega, setNuevaBodega] = useState("");
  const [movInsumo, setMovInsumo] = useState("");
  const [movOrigen, setMovOrigen] = useState("");
  const [movDestino, setMovDestino] = useState("");
  const [movCantidad, setMovCantidad] = useState("");

  const moverStock = async () => {
    const cant = Number(movCantidad);
    if (!movInsumo || !movOrigen || !movDestino) return toast.error("Elige el insumo y las dos bodegas.");
    if (movOrigen === movDestino) return toast.error("La bodega de origen y destino deben ser distintas.");
    if (!(cant > 0)) return toast.error("Escribe la cantidad a mover.");
    const { error } = await supabase.rpc("mover_stock_bodega", {
      p_insumo: movInsumo,
      p_origen: movOrigen,
      p_destino: movDestino,
      p_cantidad: cant,
    });
    if (error) return toast.error("No se pudo mover el stock. Revisa que la bodega de origen tenga esa cantidad.");
    toast.success("Stock movido entre bodegas.");
    setMovCantidad("");
  };

  const cargarBodegas = async () => {
    const { data } = await supabase.from("restaurante_bodegas").select("*").order("nombre");
    setBodegas(data ?? []);
  };

  useEffect(() => {
    cargarBodegas();
  }, []);

  const cambiarBodega = async (i: Insumo, bodegaNueva: string) => {
    const { error } = await supabase
      .from("restaurante_insumos")
      .update({ bodega_id: bodegaNueva || null })
      .eq("id", i.id);
    if (error) return toast.error("No se pudo cambiar la bodega.");
    onCambio();
  };

  const crearBodega = async () => {
    if (!nuevaBodega.trim()) return toast.error("Escribe el nombre de la bodega.");
    const { error } = await supabase.from("restaurante_bodegas").insert({ nombre: nuevaBodega.trim() });
    if (error) return toast.error("No se pudo crear la bodega.");
    setNuevaBodega("");
    cargarBodegas();
  };

  const agregar = async () => {
    const c = Number(cantidad);
    const p = Number(precio);
    if (!nombre.trim() || !(c > 0) || !Number.isFinite(p) || p < 0) {
      return toast.error("Escribe nombre, cantidad comprada y precio pagado.");
    }
    const { error } = await supabase.from("restaurante_insumos").insert({
      nombre: nombre.trim(),
      unidad,
      cantidad_compra: c,
      precio_compra: p,
      stock: Number(stock) || 0,
      stock_minimo: Number(minimo) || 0,
      bodega_id: bodegaId || null,
    });
    if (error) return toast.error("No se pudo guardar el insumo.");
    setNombre("");
    setCantidad("");
    setPrecio("");
    setStock("");
    setMinimo("");
    onCambio();
  };

  const ajustarStock = async (i: Insumo, nuevo: number) => {
    if (!Number.isFinite(nuevo) || nuevo < 0) return;
    const { error } = await supabase.from("restaurante_insumos").update({ stock: nuevo }).eq("id", i.id);
    if (error) return toast.error("No se pudo actualizar el stock.");
    onCambio();
  };

  const borrar = async (i: Insumo) => {
    const { error } = await supabase.from("restaurante_insumos").delete().eq("id", i.id);
    if (error) return toast.error("No se pudo eliminar.");
    onCambio();
  };

  return (
    <GlassPanel className="space-y-3 p-5">
      <h2 className="font-medium text-foreground">Inventario de insumos</h2>
      <p className="text-sm text-muted-foreground">
        Escribe lo que compras y lo que pagaste (ej. 1000 g por $12.000). Calculamos el costo por unidad.
      </p>
      <input className={campo} placeholder="Insumo (ej. Pechuga de pollo)" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <input className={campo} placeholder="Cantidad comprada" inputMode="decimal" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        <select className={campo} value={unidad} onChange={(e) => setUnidad(e.target.value)}>
          <option value="g">gramos</option>
          <option value="ml">mililitros</option>
          <option value="und">unidades</option>
        </select>
      </div>
      <input className={campo} placeholder="Precio pagado (COP)" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} />
      <div className="grid grid-cols-2 gap-2">
        <input className={campo} placeholder="Stock actual" inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} />
        <input className={campo} placeholder="Stock mínimo" inputMode="decimal" value={minimo} onChange={(e) => setMinimo(e.target.value)} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <select className={campo} value={bodegaId} onChange={(e) => setBodegaId(e.target.value)} aria-label="Bodega del insumo">
          <option value="">Sin bodega</option>
          {bodegas.map((b) => (
            <option key={b.id} value={b.id}>{b.nombre}</option>
          ))}
        </select>
        <div className="flex min-w-0 gap-2">
          <input className={`${campo} min-w-0 flex-1`} placeholder="Nueva bodega (ej. Cuarto frío)" value={nuevaBodega} onChange={(e) => setNuevaBodega(e.target.value)} />
          <button onClick={crearBodega} className="shrink-0 rounded-lg border border-glass-border px-4 py-2.5 text-sm text-foreground hover:bg-glass-strong">
            Crear bodega
          </button>
        </div>
      </div>
      <button onClick={agregar} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
        Agregar insumo
      </button>

      {bodegas.length > 0 && (
        <div className="grid gap-2 pt-2 sm:grid-cols-2">
          {[...bodegas, { id: "sin", nombre: "Sin bodega" }].map((b) => {
            const de = insumos.filter((i) => (b.id === "sin" ? !i.bodega_id : i.bodega_id === b.id));
            if (de.length === 0) return null;
            return (
              <div key={b.id} className="rounded-lg border border-glass-border p-3">
                <p className="truncate text-sm font-medium text-foreground">{b.nombre}</p>
                <p className="text-xs text-muted-foreground">
                  {de.length} insumo(s) · {de.filter((i) => i.stock_minimo > 0 && i.stock <= i.stock_minimo).length} con stock bajo
                </p>
              </div>
            );
          })}
        </div>
      )}

      {bodegas.length > 1 && insumos.length > 0 && (
        <div className="space-y-2 rounded-lg border border-glass-border p-3">
          <p className="text-sm font-medium text-foreground">Mover stock entre bodegas</p>
          <select className={campo} value={movInsumo} onChange={(e) => setMovInsumo(e.target.value)} aria-label="Insumo a mover">
            <option value="">Elige el insumo</option>
            {insumos.map((i) => (
              <option key={i.id} value={i.id}>{i.nombre}</option>
            ))}
          </select>
          <div className="grid gap-2 sm:grid-cols-2">
            <select className={campo} value={movOrigen} onChange={(e) => setMovOrigen(e.target.value)} aria-label="Bodega de origen">
              <option value="">Desde…</option>
              {bodegas.map((b) => (
                <option key={b.id} value={b.id}>{b.nombre}</option>
              ))}
            </select>
            <select className={campo} value={movDestino} onChange={(e) => setMovDestino(e.target.value)} aria-label="Bodega de destino">
              <option value="">Hacia…</option>
              {bodegas.map((b) => (
                <option key={b.id} value={b.id}>{b.nombre}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input className={`${campo} min-w-0 flex-1`} inputMode="decimal" placeholder="Cantidad a mover" value={movCantidad} onChange={(e) => setMovCantidad(e.target.value)} />
            <button onClick={moverStock} className="shrink-0 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
              Mover
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2 pt-2">
        {insumos.map((i) => {
          const bajo = i.stock_minimo > 0 && i.stock <= i.stock_minimo;
          return (
            <div key={i.id} className="space-y-2 rounded-lg border border-glass-border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{i.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {dinero(costoUnidad(i))} por {i.unidad} · en {usoInsumo(i.id)} receta(s)
                  </p>
                </div>
                <button onClick={() => borrar(i)} aria-label="Eliminar insumo" className="shrink-0 text-muted-foreground hover:text-foreground">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${bajo ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                  Stock {i.unidad}{bajo ? " (bajo)" : ""}
                </span>
                <input
                  key={`${i.id}-${i.stock}`}
                  className={`${campo} !py-1.5`}
                  inputMode="decimal"
                  defaultValue={i.stock}
                  onBlur={(e) => {
                    if (Number(e.target.value) !== i.stock) ajustarStock(i, Number(e.target.value));
                  }}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-xs text-muted-foreground">Bodega</span>
                <select
                  className={`${campo} !py-1.5 min-w-0 flex-1`}
                  value={i.bodega_id ?? ""}
                  onChange={(e) => cambiarBodega(i, e.target.value)}
                  aria-label="Bodega de este insumo"
                >
                  <option value="">Sin bodega</option>
                  {bodegas.map((b) => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}

function EditorReceta({
  receta,
  producto,
  insumos,
  ingredientes,
  costo,
  margen,
  sugerido,
  caro,
  pesoCaro,
  onCambio,
}: {
  receta: Receta;
  producto: Producto;
  insumos: Insumo[];
  ingredientes: Ingrediente[];
  costo: number;
  margen: number;
  sugerido: number;
  caro: string | null;
  pesoCaro: number;
  onCambio: () => void;
}) {
  const { negocio } = useNegocio();
  const tipoClave = resolverTipoNegocio(negocio?.tipo_negocio).clave;
  const [porciones, setPorciones] = useState(String(receta.porciones));
  const [merma, setMerma] = useState(String(receta.merma_pct));
  const [tiempo, setTiempo] = useState(receta.tiempo_min ? String(receta.tiempo_min) : "");
  const [preparacion, setPreparacion] = useState(receta.preparacion ?? "");
  const [insumoId, setInsumoId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [acompanamiento, setAcompanamiento] = useState("");
  const [sugiriendo, setSugiriendo] = useState(false);

  const sugerir = async () => {
    const p = Number(porciones);
    if (!(p > 0)) return toast.error("Revisa las porciones antes de sugerir la receta.");
    setSugiriendo(true);
    try {
      // Primero la biblioteca de recetas base (cantidades fijas); si no hay, la IA.
      const base = buscarRecetaBase(tipoClave, producto.nombre);
      const r = base
        ? {
            preparacion: base.preparacion,
            ingredientes: base.ingredientes.map((i) => ({
              nombre: i.nombre,
              cantidad: Math.round(i.cantidad * (p / base.porciones) * 100) / 100,
              unidad: i.unidad,
            })),
          }
        : await sugerirReceta({
            data: {
              platillo: producto.nombre,
              porciones: p,
              acompanamiento: acompanamiento.trim(),
              insumos: insumos.map((i) => ({ nombre: i.nombre, unidad: i.unidad })),
            },
          });
      setPreparacion(r.preparacion);
      const faltan: string[] = [];
      for (const ing of r.ingredientes) {
        const ins = insumos.find((x) => x.nombre.trim().toLowerCase() === ing.nombre.trim().toLowerCase());
        if (!ins) {
          faltan.push(ing.nombre);
          continue;
        }
        if (ingredientes.some((x) => x.insumo_id === ins.id)) continue;
        if (!(ing.cantidad > 0)) continue;
        await supabase
          .from("restaurante_receta_ingredientes")
          .insert({ receta_id: receta.id, insumo_id: ins.id, cantidad: ing.cantidad });
      }
      toast.success("Receta sugerida. Revísala y guarda los cambios.");
      if (faltan.length > 0) {
        toast(`Agrega a tu inventario para completarla: ${faltan.join(", ")}.`);
      }
      onCambio();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo sugerir la receta.");
    } finally {
      setSugiriendo(false);
    }
  };

  const guardar = async () => {
    const p = Number(porciones);
    const m = Number(merma);
    if (!(p > 0) || !Number.isFinite(m) || m < 0) return toast.error("Revisa las porciones y la merma.");
    const { error } = await supabase
      .from("restaurante_recetas")
      .update({
        porciones: p,
        merma_pct: m,
        tiempo_min: tiempo.trim() ? Number(tiempo) : null,
        preparacion: preparacion.trim() || null,
      })
      .eq("id", receta.id);
    if (error) return toast.error("No se pudo guardar la receta.");
    toast.success("Receta guardada.");
    onCambio();
  };

  const agregar = async () => {
    const c = Number(cantidad);
    if (!insumoId || !(c > 0)) return toast.error("Elige un insumo y la cantidad que lleva el plato.");
    const { error } = await supabase
      .from("restaurante_receta_ingredientes")
      .insert({ receta_id: receta.id, insumo_id: insumoId, cantidad: c });
    if (error) return toast.error("No se pudo agregar el ingrediente.");
    setCantidad("");
    onCambio();
  };

  const quitar = async (i: Ingrediente) => {
    const { error } = await supabase.from("restaurante_receta_ingredientes").delete().eq("id", i.id);
    if (error) return toast.error("No se pudo quitar.");
    onCambio();
  };

  const estado =
    costo <= 0
      ? "Agrega ingredientes para calcular el costo."
      : margen < 0
        ? "Estás perdiendo dinero con este plato."
        : margen < 0.5
          ? "Margen bajo: sube el precio o reduce el costo."
          : "Buen margen.";

  return (
    <GlassPanel className="space-y-3 p-5">
      <h3 className="font-medium text-foreground">Receta de {producto.nombre}</h3>

      <div className="grid grid-cols-1 gap-2 text-center sm:grid-cols-3">
        <div className="rounded-lg border border-glass-border p-2">
          <p className="text-xs text-muted-foreground">Costo por porción</p>
          <p className="truncate text-sm font-medium text-foreground">{dinero(costo)}</p>
        </div>
        <div className="rounded-lg border border-glass-border p-2">
          <p className="text-xs text-muted-foreground">Precio</p>
          <p className="truncate text-sm font-medium text-foreground">{dinero(producto.precio)}</p>
        </div>
        <div className="rounded-lg border border-glass-border p-2">
          <p className="text-xs text-muted-foreground">Margen</p>
          <p className={`text-sm font-medium ${margen < 0.5 && costo > 0 ? "text-destructive" : "text-foreground"}`}>
            {costo > 0 ? `${Math.round(margen * 100)} %` : "—"}
          </p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{estado}</p>
      {costo > 0 && margen < 0.65 && (
        <p className="text-sm text-muted-foreground">
          Para ganar cerca del 65 % de margen, el precio ideal sería {dinero(sugerido)}.
        </p>
      )}
      {caro && pesoCaro > 0.4 && (
        <p className="text-sm text-muted-foreground">
          {caro} es el {Math.round(pesoCaro * 100)} % del costo: cotiza otro proveedor o ajusta la porción.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2">
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Porciones</span>
          <input className={campo} inputMode="decimal" value={porciones} onChange={(e) => setPorciones(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Merma %</span>
          <input className={campo} inputMode="decimal" value={merma} onChange={(e) => setMerma(e.target.value)} />
        </label>
        <label className="space-y-1">
          <span className="text-xs text-muted-foreground">Minutos</span>
          <input className={campo} inputMode="numeric" value={tiempo} onChange={(e) => setTiempo(e.target.value)} />
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Ingredientes por receta</p>
        {ingredientes.map((i) => {
          const ins = insumos.find((x) => x.id === i.insumo_id);
          return (
            <div key={i.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-foreground">
                {ins?.nombre ?? "Insumo"} · {i.cantidad} {ins?.unidad}
              </span>
              <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                {ins ? dinero(i.cantidad * costoUnidad(ins)) : ""}
                <button onClick={() => quitar(i)} aria-label="Quitar ingrediente">
                  <Trash2 className="h-4 w-4" />
                </button>
              </span>
            </div>
          );
        })}
        <div className="grid grid-cols-[minmax(0,1fr)_6rem] gap-2">
          <select className={campo} value={insumoId} onChange={(e) => setInsumoId(e.target.value)}>
            <option value="">Insumo…</option>
            {insumos.map((i) => (
              <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>
            ))}
          </select>
          <input className={campo} placeholder="Cant." inputMode="decimal" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
        </div>
        <button onClick={agregar} className="w-full rounded-lg border border-glass-border px-4 py-2.5 text-sm text-foreground">
          Agregar ingrediente
        </button>
      </div>

      <div className="space-y-2 rounded-lg border border-glass-border p-3">
        <p className="text-sm font-medium text-foreground">Sugerir receta</p>
        <input
          className={campo}
          placeholder="Acompañamiento (ej. papas, ensalada)"
          value={acompanamiento}
          onChange={(e) => setAcompanamiento(e.target.value)}
        />
        <button
          onClick={sugerir}
          disabled={sugiriendo}
          className="w-full rounded-lg border border-glass-border px-4 py-2.5 text-sm text-foreground disabled:opacity-60"
        >
          {sugiriendo ? "Generando receta…" : "Sugerir ingredientes y preparación"}
        </button>
        <p className="text-xs text-muted-foreground">
          Usa las porciones de arriba. Revisa las cantidades antes de guardar.
        </p>
      </div>

      <label className="block space-y-1">
        <span className="text-xs text-muted-foreground">Preparación paso a paso</span>
        <textarea className={campo} rows={5} value={preparacion} onChange={(e) => setPreparacion(e.target.value)} />
      </label>
      <button onClick={guardar} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
        Guardar receta
      </button>
    </GlassPanel>
  );
}
