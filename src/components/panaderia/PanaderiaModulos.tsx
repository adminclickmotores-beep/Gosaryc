import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Camera, CheckCircle2, ImageIcon, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { urlLocalPrivada } from "@/lib/archivo-privado";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

type Receta = Tables<"pan_recetas">;
type Item = Tables<"pan_receta_items">;
type Produccion = Tables<"pan_producciones">;
type Merma = Tables<"pan_mermas">;
type Encargo = Tables<"pan_encargos">;
type Turno = Tables<"pan_turnos">;
type Insumo = Pick<Tables<"restaurante_insumos">, "id" | "nombre" | "unidad" | "stock" | "precio_compra" | "cantidad_compra">;

const BUCKET = "creditos_docs";
const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";
const boton =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50";
const botonSec =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-glass-border px-3 py-2 text-sm text-foreground hover:bg-glass/40 disabled:opacity-50";
const num = (s: string): number => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const hoy = (): string => new Date().toISOString().slice(0, 10);
const costoUnitario = (i: Insumo): number => i.precio_compra / Math.max(i.cantidad_compra, 0.000001);
const fechaHora = (iso: string): string =>
  new Date(iso).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });

function Encabezado({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="mb-5">
      <h1 className="font-display text-2xl text-foreground">{titulo}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-muted-foreground">
      <span className="mb-1 block">{etiqueta}</span>
      {children}
    </label>
  );
}

function Cargando() {
  return (
    <div className="flex min-h-[30dvh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  );
}

function usarInsumos() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("restaurante_insumos")
        .select("id, nombre, unidad, stock, precio_compra, cantidad_compra")
        .order("nombre");
      setInsumos((data ?? []) as Insumo[]);
    })();
  }, []);
  return insumos;
}

function usarRecetas() {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [cargando, setCargando] = useState(true);
  const cargar = useCallback(async () => {
    const [r, i] = await Promise.all([
      supabase.from("pan_recetas").select("*").order("nombre"),
      supabase.from("pan_receta_items").select("*"),
    ]);
    setRecetas(r.data ?? []);
    setItems(i.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);
  return { recetas, items, cargando, recargar: cargar };
}

function costoLote(receta: Receta, items: Item[], insumos: Insumo[]): number {
  return items
    .filter((x) => x.receta_id === receta.id)
    .reduce((s, x) => {
      const ins = insumos.find((i) => i.id === x.insumo_id);
      return s + (ins ? x.cantidad * costoUnitario(ins) : 0);
    }, 0);
}

// ============================================================
// Recetas y gramajes
// ============================================================
export function RecetasPan() {
  const insumos = usarInsumos();
  const { recetas, items, cargando, recargar } = usarRecetas();
  const [nombre, setNombre] = useState("");
  const [unidades, setUnidades] = useState("12");
  const [gramaje, setGramaje] = useState("");
  const [precio, setPrecio] = useState("");
  const [ingredientes, setIngredientes] = useState<{ insumo_id: string; cantidad: string }[]>([{ insumo_id: "", cantidad: "" }]);
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    const validos = ingredientes.filter((x) => x.insumo_id && num(x.cantidad) > 0);
    if (!nombre.trim()) return toast.error("Escribe el nombre del producto.");
    if (num(unidades) <= 0) return toast.error("Indica cuántas unidades rinde cada lote.");
    if (validos.length === 0) return toast.error("Agrega al menos un ingrediente con su cantidad.");
    setGuardando(true);
    const { data, error } = await supabase
      .from("pan_recetas")
      .insert({ nombre: nombre.trim(), unidades_por_lote: num(unidades), gramaje_unidad: num(gramaje), precio_venta: num(precio) })
      .select("id")
      .single();
    if (error || !data) {
      setGuardando(false);
      return toast.error("No se pudo guardar la receta.");
    }
    const { error: e2 } = await supabase
      .from("pan_receta_items")
      .insert(validos.map((x) => ({ receta_id: data.id, insumo_id: x.insumo_id, cantidad: num(x.cantidad) })));
    setGuardando(false);
    if (e2) return toast.error("La receta se creó pero no se pudieron guardar los ingredientes.");
    toast.success("Receta guardada.");
    setNombre("");
    setGramaje("");
    setPrecio("");
    setIngredientes([{ insumo_id: "", cantidad: "" }]);
    void recargar();
  };

  const desactivar = async (r: Receta) => {
    const { error } = await supabase.from("pan_recetas").update({ activo: !r.activo }).eq("id", r.id);
    if (error) return toast.error("No se pudo actualizar.");
    void recargar();
  };

  if (cargando) return <Cargando />;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Encabezado titulo="Recetas y gramajes" texto="Cantidad de cada materia prima por lote. Con esto se descuenta el inventario y se calcula el costo real de cada pan." />
      <GlassPanel className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Producto"><input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Pan francés, torta de chocolate..." /></Campo>
          <Campo etiqueta="Unidades que rinde un lote"><input className={campo} inputMode="decimal" value={unidades} onChange={(e) => setUnidades(e.target.value)} /></Campo>
          <Campo etiqueta="Gramaje por unidad (g)"><input className={campo} inputMode="decimal" value={gramaje} onChange={(e) => setGramaje(e.target.value)} placeholder="60" /></Campo>
          <Campo etiqueta="Precio de venta por unidad"><input className={campo} inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="1500" /></Campo>
        </div>
        <p className="text-sm text-muted-foreground">Ingredientes por lote</p>
        {ingredientes.map((ing, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_6rem_auto] gap-2">
            <select className={campo} value={ing.insumo_id} onChange={(e) => setIngredientes((l) => l.map((x, k) => (k === idx ? { ...x, insumo_id: e.target.value } : x)))}>
              <option value="">Materia prima...</option>
              {insumos.map((i) => (<option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>))}
            </select>
            <input className={campo} inputMode="decimal" placeholder="Cant." value={ing.cantidad} onChange={(e) => setIngredientes((l) => l.map((x, k) => (k === idx ? { ...x, cantidad: e.target.value } : x)))} />
            <button type="button" className={botonSec} aria-label="Quitar ingrediente" onClick={() => setIngredientes((l) => (l.length > 1 ? l.filter((_, k) => k !== idx) : l))}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {insumos.length === 0 && <p className="text-sm text-muted-foreground">Primero agrega tu materia prima en "Materia prima / Harinas".</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className={botonSec} onClick={() => setIngredientes((l) => [...l, { insumo_id: "", cantidad: "" }])}><Plus className="h-4 w-4" /> Ingrediente</button>
          <button type="button" className={boton} disabled={guardando} onClick={guardar}>{guardando ? "Guardando..." : "Guardar receta"}</button>
        </div>
      </GlassPanel>

      <div className="grid gap-3 sm:grid-cols-2">
        {recetas.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay recetas.</p>}
        {recetas.map((r) => {
          const lote = costoLote(r, items, insumos);
          const unit = lote / Math.max(r.unidades_por_lote, 1);
          const margen = r.precio_venta > 0 ? ((r.precio_venta - unit) / r.precio_venta) * 100 : null;
          return (
            <GlassPanel key={r.id} className={`space-y-1 p-4 ${r.activo ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-foreground">{r.nombre}</p>
                <button type="button" className={botonSec} onClick={() => desactivar(r)}>{r.activo ? "Desactivar" : "Activar"}</button>
              </div>
              <p className="text-sm text-muted-foreground">Rinde {r.unidades_por_lote} u. · {r.gramaje_unidad > 0 ? `${r.gramaje_unidad} g c/u · ` : ""}{items.filter((x) => x.receta_id === r.id).length} ingredientes</p>
              <p className="text-sm text-foreground">Costo lote {dinero(lote)} · por unidad {dinero(unit)}</p>
              {margen !== null && <p className="text-sm text-muted-foreground">Precio {dinero(r.precio_venta)} · margen {margen.toFixed(0)}%</p>}
              <p className="text-sm text-foreground">En vitrina: <strong>{r.stock_vitrina}</strong> u.</p>
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Horneadas / Producción diaria
// ============================================================
export function ProduccionPan() {
  const insumos = usarInsumos();
  const { recetas, items, cargando, recargar: recargarRecetas } = usarRecetas();
  const [lista, setLista] = useState<Produccion[]>([]);
  const [recetaId, setRecetaId] = useState("");
  const [lotes, setLotes] = useState("1");
  const [hornero, setHornero] = useState("");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("pan_producciones").select("*").order("created_at", { ascending: false }).limit(60);
    setLista(data ?? []);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const receta = recetas.find((r) => r.id === recetaId);
  const vista = useMemo(() => {
    if (!receta) return null;
    const n = Math.max(num(lotes), 0);
    const costo = costoLote(receta, items, insumos) * n;
    const unidades = receta.unidades_por_lote * n;
    const faltan = items
      .filter((x) => x.receta_id === receta.id)
      .map((x) => ({ x, ins: insumos.find((i) => i.id === x.insumo_id) }))
      .filter((p) => p.ins && p.ins.stock < p.x.cantidad * n)
      .map((p) => p.ins?.nombre ?? "");
    return { costo, unidades, unit: unidades > 0 ? costo / unidades : 0, faltan };
  }, [receta, lotes, items, insumos]);

  const registrar = async () => {
    if (!receta) return toast.error("Elige qué se horneó.");
    if (num(lotes) <= 0) return toast.error("Indica cuántos lotes.");
    setGuardando(true);
    const { error } = await supabase.rpc("pan_registrar_horneada", {
      p_receta: receta.id, p_lotes: num(lotes), p_horneado_por: hornero, p_notas: notas,
    });
    setGuardando(false);
    if (error) return toast.error(error.message || "No se pudo registrar la horneada.");
    toast.success("Horneada registrada: materia prima descontada y unidades sumadas a la vitrina.");
    setNotas("");
    void cargar();
    void recargarRecetas();
  };

  const delDia = lista.filter((p) => p.fecha === hoy() && !p.anulado);
  if (cargando) return <Cargando />;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Encabezado titulo="Horneadas / Producción diaria" texto="Anota lo que salió del horno: el sistema descuenta la harina y demás insumos según la receta y calcula el costo real por unidad." />
      <VentasVitrinaPan />
      <GlassPanel className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Qué se horneó">
            <select className={campo} value={recetaId} onChange={(e) => setRecetaId(e.target.value)}>
              <option value="">Elige una receta...</option>
              {recetas.filter((r) => r.activo).map((r) => (<option key={r.id} value={r.id}>{r.nombre}</option>))}
            </select>
          </Campo>
          <Campo etiqueta="Lotes"><input className={campo} inputMode="decimal" value={lotes} onChange={(e) => setLotes(e.target.value)} /></Campo>
          <Campo etiqueta="Hornero / panadero"><input className={campo} value={hornero} onChange={(e) => setHornero(e.target.value)} /></Campo>
          <Campo etiqueta="Notas"><input className={campo} value={notas} onChange={(e) => setNotas(e.target.value)} /></Campo>
        </div>
        {vista && (
          <p className="text-sm text-muted-foreground">
            Saldrán {vista.unidades} unidades · costo {dinero(vista.costo)} · {dinero(vista.unit)} por unidad
            {vista.faltan.length > 0 && <span className="block text-destructive">Falta materia prima: {vista.faltan.join(", ")}</span>}
          </p>
        )}
        <button type="button" className={boton} disabled={guardando} onClick={registrar}>{guardando ? "Registrando..." : "Registrar horneada"}</button>
      </GlassPanel>

      <GlassPanel className="p-4">
        <p className="text-sm text-muted-foreground">Hoy: {delDia.reduce((s, p) => s + p.unidades, 0)} unidades · costo {dinero(delDia.reduce((s, p) => s + p.costo_total, 0))}</p>
      </GlassPanel>
      <div className="space-y-2">
        {lista.map((p) => (
          <GlassPanel key={p.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <p className="font-medium text-foreground">{p.nombre} · {p.lotes} lote(s) · {p.unidades} u.</p>
              <p className="text-xs text-muted-foreground">{fechaHora(p.created_at)}{p.horneado_por ? ` · ${p.horneado_por}` : ""}{p.notas ? ` · ${p.notas}` : ""}</p>
            </div>
            <p className="text-sm text-foreground">{dinero(p.costo_unitario)} c/u · {dinero(p.costo_total)}</p>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Ventas de vitrina (enlazadas por receta_id directo, sin comparar nombres)
// ============================================================
export function VentasVitrinaPan() {
  const { recetas, cargando, recargar } = usarRecetas();
  const [recetaId, setRecetaId] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [metodo, setMetodo] = useState("efectivo");
  const [vendiendo, setVendiendo] = useState(false);

  const receta = recetas.find((r) => r.id === recetaId);
  const total = receta ? receta.precio_venta * Math.max(Math.floor(num(cantidad)), 0) : 0;

  const vender = async () => {
    if (!receta) return toast.error("Elige el producto de vitrina.");
    const cant = Math.floor(num(cantidad));
    if (cant <= 0) return toast.error("Indica cuántas unidades.");
    if (cant > receta.stock_vitrina) return toast.error(`En vitrina solo hay ${receta.stock_vitrina} de ${receta.nombre}.`);
    setVendiendo(true);
    const { error: eStock } = await supabase
      .from("pan_recetas")
      .update({ stock_vitrina: receta.stock_vitrina - cant })
      .eq("id", receta.id);
    if (eStock) {
      setVendiendo(false);
      return toast.error("No se pudo descontar la vitrina.");
    }
    const { data: abiertos } = await supabase
      .from("turnos_caja")
      .select("id")
      .eq("estado", "abierto")
      .order("abierto_en", { ascending: false })
      .limit(1);
    if (abiertos?.[0]) {
      await supabase.from("movimientos_turno").insert({
        turno_id: abiertos[0].id,
        tipo: "venta",
        metodo,
        concepto: `Vitrina panadería: ${receta.nombre} x ${cant}`,
        monto: receta.precio_venta * cant,
      });
    }
    setVendiendo(false);
    toast.success(abiertos?.[0] ? "Venta registrada: descontó vitrina y entró a Caja." : "Venta descontada de vitrina (abre la caja para que entre el dinero).");
    setCantidad("1");
    void recargar();
  };

  if (cargando) return <Cargando />;
  return (
    <GlassPanel className="space-y-3 p-4">
      <h2 className="font-medium text-foreground">Vender de vitrina</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Campo etiqueta="Producto de vitrina">
          <select className={campo} value={recetaId} onChange={(e) => setRecetaId(e.target.value)}>
            <option value="">Elige...</option>
            {recetas.filter((r) => r.activo).map((r) => (
              <option key={r.id} value={r.id}>{r.nombre} (hay {r.stock_vitrina}) · {dinero(r.precio_venta)}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Unidades"><input className={campo} inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></Campo>
        <Campo etiqueta="Medio de pago">
          <select className={campo} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia / tarjeta</option>
          </select>
        </Campo>
        <div className="flex items-end">
          <p className="text-sm text-muted-foreground">Total: <span className="text-base font-medium text-foreground">{dinero(total)}</span></p>
        </div>
      </div>
      <button type="button" className={boton} disabled={vendiendo} onClick={vender}>
        {vendiendo ? "Vendiendo..." : "Cobrar y descontar vitrina"}
      </button>
    </GlassPanel>
  );
}

// ============================================================
// Mermas y vencimientos
// ============================================================
const CAUSAS = ["Quemado", "Dañado", "Vencido", "Se cayó", "Devuelto por el cliente", "Sobrante del día", "Otro"];

export function MermasPan() {
  const insumos = usarInsumos();
  const { recetas, cargando, recargar: recargarRecetas } = usarRecetas();
  const [lista, setLista] = useState<Merma[]>([]);
  const [clase, setClase] = useState<"producto" | "insumo">("producto");
  const [refId, setRefId] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [causa, setCausa] = useState(CAUSAS[0] ?? "");
  const [motivo, setMotivo] = useState("");
  const [quien, setQuien] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("pan_mermas").select("*").order("created_at", { ascending: false }).limit(60);
    setLista(data ?? []);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const registrar = async () => {
    if (!refId) return toast.error("Elige qué se perdió.");
    if (num(cantidad) <= 0) return toast.error("Indica la cantidad.");
    if (motivo.trim().length < 3) return toast.error("El motivo es obligatorio.");
    if (clase === "producto") {
      const rec = recetas.find((r) => r.id === refId);
      if (rec && num(cantidad) > rec.stock_vitrina) return toast.error(`En vitrina solo hay ${rec.stock_vitrina} de ${rec.nombre}.`);
    }
    setGuardando(true);
    const { error } = await supabase.rpc("pan_registrar_merma", {
      p_clase: clase,
      p_receta: clase === "producto" ? refId : null,
      p_insumo: clase === "insumo" ? refId : null,
      p_cantidad: num(cantidad),
      p_causa: causa,
      p_motivo: motivo.trim(),
      p_registrado_por: quien,
    });
    setGuardando(false);
    if (error) return toast.error(error.message || "No se pudo registrar la merma.");
    toast.success("Merma registrada, descontada del stock y enviada a Contabilidad.");
    setCantidad("");
    setMotivo("");
    void cargar();
    void recargarRecetas();
  };

  const perdidaHoy = lista.filter((m) => m.fecha === hoy() && !m.anulado).reduce((s, m) => s + m.costo_total, 0);
  if (cargando) return <Cargando />;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Encabezado titulo="Mermas y vencimientos" texto="Pan quemado, dañado o vencido. Cada pérdida lleva su motivo, baja el inventario y llega sola a Contabilidad." />
      <GlassPanel className="space-y-3 p-4">
        <div className="flex gap-2">
          <button type="button" className={clase === "producto" ? boton : botonSec} onClick={() => { setClase("producto"); setRefId(""); }}>Producto terminado</button>
          <button type="button" className={clase === "insumo" ? boton : botonSec} onClick={() => { setClase("insumo"); setRefId(""); }}>Materia prima</button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta={clase === "producto" ? "Producto" : "Materia prima"}>
            <select className={campo} value={refId} onChange={(e) => setRefId(e.target.value)}>
              <option value="">Elige...</option>
              {clase === "producto"
                ? recetas.map((r) => (<option key={r.id} value={r.id}>{r.nombre} (en vitrina {r.stock_vitrina})</option>))
                : insumos.map((i) => (<option key={i.id} value={i.id}>{i.nombre} (hay {i.stock} {i.unidad})</option>))}
            </select>
          </Campo>
          <Campo etiqueta="Cantidad"><input className={campo} inputMode="decimal" value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></Campo>
          <Campo etiqueta="Causa">
            <select className={campo} value={causa} onChange={(e) => setCausa(e.target.value)}>
              {CAUSAS.map((c) => (<option key={c} value={c}>{c}</option>))}
            </select>
          </Campo>
          <Campo etiqueta="Responsable"><input className={campo} value={quien} onChange={(e) => setQuien(e.target.value)} /></Campo>
        </div>
        <Campo etiqueta="Motivo (obligatorio)"><input className={campo} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Qué pasó" /></Campo>
        <button type="button" className={boton} disabled={guardando} onClick={registrar}>{guardando ? "Registrando..." : "Registrar merma"}</button>
      </GlassPanel>
      <GlassPanel className="p-4"><p className="text-sm text-muted-foreground">Pérdida de hoy: <span className="text-foreground">{dinero(perdidaHoy)}</span></p></GlassPanel>
      <div className="space-y-2">
        {lista.map((m) => (
          <GlassPanel key={m.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
            <div>
              <p className="font-medium text-foreground">{m.nombre} · {m.cantidad} · {m.causa}</p>
              <p className="text-xs text-muted-foreground">{fechaHora(m.created_at)} · {m.motivo}{m.registrado_por ? ` · ${m.registrado_por}` : ""}</p>
            </div>
            <p className="text-sm text-foreground">{dinero(m.costo_total)}</p>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Pedidos especiales / Tortas por encargo
// ============================================================
const ESTADOS_ENCARGO: Record<string, string> = {
  pendiente: "Pendiente", en_horno: "En el horno", listo: "Listo", entregado: "Entregado", cancelado: "Cancelado",
};

function FotoEncargo({ ruta }: { ruta: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    let local: string | null = null;
    void urlLocalPrivada(BUCKET, ruta).then((u) => {
      local = u;
      if (vivo) setUrl(u);
      else if (u) URL.revokeObjectURL(u);
    });
    return () => {
      vivo = false;
      if (local) URL.revokeObjectURL(local);
    };
  }, [ruta]);
  if (!url) return <ImageIcon className="h-5 w-5 text-muted-foreground" />;
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="Foto de referencia" className="h-20 w-20 max-w-full rounded-lg object-cover" />
    </a>
  );
}

export function EncargosPan() {
  const [lista, setLista] = useState<Encargo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [f, setF] = useState({ cliente: "", telefono: "", descripcion: "", sabor: "", tamano: "", dedicatoria: "", entrega: "", total: "", abono: "", metodo: "efectivo", notas: "" });
  const [foto, setFoto] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [abonos, setAbonos] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("pan_encargos").select("*").order("entrega_en", { ascending: true }).limit(200);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  const crear = async () => {
    if (!f.cliente.trim() || !f.descripcion.trim()) return toast.error("Escribe el cliente y qué pidió.");
    if (!f.entrega) return toast.error("Elige la fecha y hora de entrega.");
    if (num(f.total) <= 0) return toast.error("Escribe el valor total.");
    if (num(f.abono) > num(f.total)) return toast.error("El abono no puede superar el total.");
    setGuardando(true);
    let ruta: string | null = null;
    if (foto) {
      const { data: owner } = await supabase.rpc("mi_negocio_id");
      const ext = (foto.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      ruta = `${owner}/panaderia/${crypto.randomUUID()}.${ext || "jpg"}`;
      const { error: eFoto } = await supabase.storage.from(BUCKET).upload(ruta, foto, { contentType: foto.type });
      if (eFoto) {
        setGuardando(false);
        return toast.error("No se pudo subir la foto. Intenta con otra imagen.");
      }
    }
    const { error } = await supabase.rpc("pan_crear_encargo", {
      p_cliente: f.cliente, p_telefono: f.telefono, p_descripcion: f.descripcion, p_sabor: f.sabor, p_tamano: f.tamano,
      p_dedicatoria: f.dedicatoria, p_entrega: new Date(f.entrega).toISOString(), p_total: num(f.total),
      p_abono: num(f.abono), p_metodo: f.metodo, p_foto: ruta, p_notas: f.notas,
    });
    setGuardando(false);
    if (error) return toast.error(error.message || "No se pudo guardar el encargo.");
    toast.success(num(f.abono) > 0 ? "Encargo guardado y abono enviado a Caja y Contabilidad." : "Encargo guardado.");
    setF({ cliente: "", telefono: "", descripcion: "", sabor: "", tamano: "", dedicatoria: "", entrega: "", total: "", abono: "", metodo: "efectivo", notas: "" });
    setFoto(null);
    void cargar();
  };

  const abonar = async (e: Encargo) => {
    const monto = num(abonos[e.id] ?? "");
    if (monto <= 0) return toast.error("Escribe el valor del abono.");
    const { error } = await supabase.rpc("pan_abonar_encargo", { p_id: e.id, p_monto: monto, p_metodo: "efectivo" });
    if (error) return toast.error(error.message || "No se pudo registrar el abono.");
    toast.success("Abono registrado en Caja y Contabilidad.");
    setAbonos((p) => ({ ...p, [e.id]: "" }));
    void cargar();
  };

  const entregar = async (e: Encargo) => {
    const { error } = await supabase.rpc("pan_entregar_encargo", { p_id: e.id, p_metodo: "efectivo" });
    if (error) return toast.error(error.message || "No se pudo registrar la entrega.");
    toast.success("Entregado y saldo cobrado.");
    void cargar();
  };

  const cambiarEstado = async (e: Encargo, estado: string) => {
    const { error } = await supabase.from("pan_encargos").update({ estado }).eq("id", e.id);
    if (error) return toast.error(error.message || "No se pudo cambiar el estado.");
    void cargar();
  };

  if (cargando) return <Cargando />;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Encabezado titulo="Pedidos especiales / Tortas por encargo" texto="Fecha y hora de entrega, abono inicial (entra a Caja y Contabilidad), saldo pendiente, dedicatoria y foto de referencia." />
      <GlassPanel className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Cliente"><input className={campo} value={f.cliente} onChange={(e) => set("cliente", e.target.value)} /></Campo>
          <Campo etiqueta="Teléfono"><input className={campo} inputMode="tel" value={f.telefono} onChange={(e) => set("telefono", e.target.value)} /></Campo>
          <Campo etiqueta="Qué pidió"><input className={campo} value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="Torta de cumpleaños, 30 cupcakes..." /></Campo>
          <Campo etiqueta="Entrega (fecha y hora)"><input type="datetime-local" className={campo} value={f.entrega} onChange={(e) => set("entrega", e.target.value)} /></Campo>
          <Campo etiqueta="Sabor"><input className={campo} value={f.sabor} onChange={(e) => set("sabor", e.target.value)} /></Campo>
          <Campo etiqueta="Tamaño / porciones"><input className={campo} value={f.tamano} onChange={(e) => set("tamano", e.target.value)} /></Campo>
          <Campo etiqueta="Dedicatoria"><input className={campo} value={f.dedicatoria} onChange={(e) => set("dedicatoria", e.target.value)} /></Campo>
          <Campo etiqueta="Valor total"><input className={campo} inputMode="decimal" value={f.total} onChange={(e) => set("total", e.target.value)} /></Campo>
          <Campo etiqueta="Abono inicial"><input className={campo} inputMode="decimal" value={f.abono} onChange={(e) => set("abono", e.target.value)} /></Campo>
          <Campo etiqueta="Forma de pago del abono">
            <select className={campo} value={f.metodo} onChange={(e) => set("metodo", e.target.value)}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia / tarjeta</option>
            </select>
          </Campo>
        </div>
        <p className="text-sm text-muted-foreground">Saldo pendiente: <span className="text-foreground">{dinero(Math.max(num(f.total) - num(f.abono), 0))}</span></p>
        <Campo etiqueta="Notas"><input className={campo} value={f.notas} onChange={(e) => set("notas", e.target.value)} /></Campo>
        <label className={`${botonSec} cursor-pointer`}>
          <Camera className="h-4 w-4" /> {foto ? foto.name : "Subir foto de referencia"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
        </label>
        <div><button type="button" className={boton} disabled={guardando} onClick={crear}>{guardando ? "Guardando..." : "Guardar encargo"}</button></div>
      </GlassPanel>

      <div className="space-y-3">
        {lista.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay encargos.</p>}
        {lista.map((e) => {
          const saldo = e.total - e.abonado;
          const cerrado = e.estado === "entregado" || e.estado === "cancelado" || e.anulado;
          return (
            <GlassPanel key={e.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-medium text-foreground">{e.cliente} · {e.descripcion}</p>
                  <p className="text-xs text-muted-foreground">Entrega {fechaHora(e.entrega_en)}{e.sabor ? ` · ${e.sabor}` : ""}{e.tamano ? ` · ${e.tamano}` : ""}{e.telefono ? ` · ${e.telefono}` : ""}</p>
                  {e.dedicatoria && <p className="break-words text-sm text-foreground">Dedicatoria: “{e.dedicatoria}”</p>}
                </div>
                {e.foto_path && <FotoEncargo ruta={e.foto_path} />}
              </div>
              <p className="text-sm text-foreground">Total {dinero(e.total)} · abonado {dinero(e.abonado)} · saldo <strong>{dinero(saldo)}</strong></p>
              <div className="flex flex-wrap items-center gap-2">
                <select className={`${campo} w-auto`} value={e.estado} disabled={cerrado} onChange={(ev) => cambiarEstado(e, ev.target.value)}>
                  {Object.entries(ESTADOS_ENCARGO).filter(([k]) => k !== "entregado" || e.estado === "entregado").map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
                </select>
                {!cerrado && saldo > 0 && (
                  <>
                    <input className={`${campo} w-32`} inputMode="decimal" placeholder="Abono" value={abonos[e.id] ?? ""} onChange={(ev) => setAbonos((p) => ({ ...p, [e.id]: ev.target.value }))} />
                    <button type="button" className={botonSec} onClick={() => abonar(e)}>Abonar</button>
                  </>
                )}
                {!cerrado && (
                  <button type="button" className={boton} onClick={() => entregar(e)}><CheckCircle2 className="h-4 w-4" /> Entregar y cobrar saldo</button>
                )}
              </div>
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// Turnos y metas diarias
// ============================================================
const ROLES: Record<string, string> = { panadero: "Panadero", hornero: "Hornero", pastelero: "Pastelero", mostrador: "Vendedor de mostrador", otro: "Otro" };

export function TurnosPan() {
  const [fecha, setFecha] = useState(hoy());
  const [lista, setLista] = useState<Turno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [f, setF] = useState({ persona: "", rol: "panadero", inicio: "", fin: "", meta: "" });
  const [ventas, setVentas] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("pan_turnos").select("*").eq("fecha", fecha).order("hora_inicio", { ascending: true });
    setLista(data ?? []);
    setCargando(false);
  }, [fecha]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (!f.persona.trim()) return toast.error("Escribe el nombre de la persona.");
    setGuardando(true);
    const { error } = await supabase.from("pan_turnos").insert({
      persona: f.persona.trim(), rol: f.rol, fecha, hora_inicio: f.inicio || null, hora_fin: f.fin || null, meta_venta: num(f.meta),
    });
    setGuardando(false);
    if (error) return toast.error("No se pudo guardar el turno.");
    setF({ persona: "", rol: "panadero", inicio: "", fin: "", meta: "" });
    void cargar();
  };

  const actualizar = async (t: Turno, cambios: Partial<Pick<Turno, "estado" | "venta_real">>) => {
    const { error } = await supabase.from("pan_turnos").update(cambios).eq("id", t.id);
    if (error) return toast.error("No se pudo actualizar el turno.");
    void cargar();
  };

  const metaTotal = lista.filter((t) => t.estado !== "cancelado").reduce((s, t) => s + t.meta_venta, 0);
  const ventaTotal = lista.filter((t) => t.estado !== "cancelado").reduce((s, t) => s + t.venta_real, 0);
  if (cargando) return <Cargando />;
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Encabezado titulo="Turnos y metas del personal" texto="Quién trabaja cada día (panaderos, horneros y mostrador) y cuánto debe vender." />
      <GlassPanel className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etiqueta="Día"><input type="date" className={campo} value={fecha} onChange={(e) => setFecha(e.target.value)} /></Campo>
          <Campo etiqueta="Persona"><input className={campo} value={f.persona} onChange={(e) => setF((p) => ({ ...p, persona: e.target.value }))} /></Campo>
          <Campo etiqueta="Cargo">
            <select className={campo} value={f.rol} onChange={(e) => setF((p) => ({ ...p, rol: e.target.value }))}>
              {Object.entries(ROLES).map(([k, v]) => (<option key={k} value={k}>{v}</option>))}
            </select>
          </Campo>
          <Campo etiqueta="Meta de venta del día"><input className={campo} inputMode="decimal" value={f.meta} onChange={(e) => setF((p) => ({ ...p, meta: e.target.value }))} /></Campo>
          <Campo etiqueta="Entrada"><input type="time" className={campo} value={f.inicio} onChange={(e) => setF((p) => ({ ...p, inicio: e.target.value }))} /></Campo>
          <Campo etiqueta="Salida"><input type="time" className={campo} value={f.fin} onChange={(e) => setF((p) => ({ ...p, fin: e.target.value }))} /></Campo>
        </div>
        <button type="button" className={boton} disabled={guardando} onClick={crear}>{guardando ? "Guardando..." : "Agregar turno"}</button>
      </GlassPanel>
      <GlassPanel className="p-4"><p className="text-sm text-muted-foreground">Meta del día {dinero(metaTotal)} · vendido {dinero(ventaTotal)}{metaTotal > 0 ? ` · ${Math.round((ventaTotal / metaTotal) * 100)}%` : ""}</p></GlassPanel>
      <div className="space-y-2">
        {lista.length === 0 && <p className="text-sm text-muted-foreground">No hay turnos para este día.</p>}
        {lista.map((t) => {
          const avance = t.meta_venta > 0 ? Math.min(Math.round((t.venta_real / t.meta_venta) * 100), 999) : null;
          return (
            <GlassPanel key={t.id} className="space-y-2 p-3">
              <p className="font-medium text-foreground">{t.persona} · {ROLES[t.rol] ?? t.rol}</p>
              <p className="text-xs text-muted-foreground">{t.hora_inicio?.slice(0, 5) ?? "--"} a {t.hora_fin?.slice(0, 5) ?? "--"} · {t.estado} · meta {dinero(t.meta_venta)} · vendido {dinero(t.venta_real)}{avance !== null ? ` (${avance}%)` : ""}</p>
              {t.estado !== "cerrado" && t.estado !== "cancelado" && (
                <div className="flex flex-wrap items-center gap-2">
                  {t.estado === "programado" && <button type="button" className={botonSec} onClick={() => actualizar(t, { estado: "en_curso" })}>Iniciar</button>}
                  <input className={`${campo} w-36`} inputMode="decimal" placeholder="Venta real" value={ventas[t.id] ?? ""} onChange={(e) => setVentas((p) => ({ ...p, [t.id]: e.target.value }))} />
                  <button type="button" className={botonSec} onClick={() => actualizar(t, { estado: "cerrado", venta_real: num(ventas[t.id] ?? "") || t.venta_real })}>Cerrar turno</button>
                  <button type="button" className={botonSec} onClick={() => actualizar(t, { estado: "cancelado" })}>Cancelar</button>
                </div>
              )}
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}
