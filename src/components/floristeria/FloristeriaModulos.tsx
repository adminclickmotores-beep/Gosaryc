import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { urlLocalPrivada } from "@/lib/archivo-privado";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";
import { Etiqueta, Indicador, SelectorMetodo, aWhatsapp, hoyISO, msg } from "@/components/negocios/comunes";

type Flor = Tables<"flo_flores">;
type Arreglo = Tables<"flo_arreglos">;
type Encargo = Tables<"flo_encargos">;
type LineaReceta = { flor_id: string; nombre: string; cantidad: number };

const BUCKET = "creditos_docs";
const FRANJAS = ["Mañana (8 a 12)", "Tarde (12 a 4)", "Tarde-noche (4 a 8)"];
const CATEGORIAS = [
  { clave: "flor", texto: "Flor" },
  { clave: "follaje", texto: "Follaje" },
  { clave: "base", texto: "Base / florero / caja" },
  { clave: "accesorio", texto: "Accesorio (lazo, tarjeta)" },
];

const leerReceta = (r: Arreglo["receta"]): LineaReceta[] => {
  if (!Array.isArray(r)) return [];
  const salida: LineaReceta[] = [];
  for (const x of r) {
    if (x && typeof x === "object" && !Array.isArray(x)) {
      const o = x as Record<string, unknown>;
      if (typeof o.flor_id === "string" && typeof o.cantidad === "number") salida.push({ flor_id: o.flor_id, nombre: typeof o.nombre === "string" ? o.nombre : "", cantidad: o.cantidad });
    }
  }
  return salida;
};

function FotoArreglo({ ruta }: { ruta: string }) {
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
  if (!url) return <div className="flex h-40 w-full items-center justify-center rounded-lg bg-glass/40 text-xs text-muted-foreground">Sin foto</div>;
  return <img src={url} alt="Arreglo floral" className="h-40 w-full max-w-full rounded-lg object-cover" />;
}

// ============================================================
// Flores, follaje y bases (inventario con vida útil)
// ============================================================
export function FloresStock() {
  const [flores, setFlores] = useState<Flor[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("flor");
  const [stock, setStock] = useState("");
  const [costo, setCosto] = useState("");
  const [vida, setVida] = useState("7");
  const [suma, setSuma] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("flo_flores").select("*").order("nombre");
    setFlores(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (nombre.trim().length < 2) return toast.error("Escribe el nombre.");
    const { error } = await supabase.from("flo_flores").insert({ nombre: nombre.trim(), categoria, stock: Math.max(num(stock), 0), costo: Math.max(num(costo), 0), vida_dias: Math.max(Math.round(num(vida)), 0) });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    toast.success("Guardado en el inventario.");
    setNombre(""); setStock(""); setCosto("");
    void cargar();
  };
  const agregar = async (f: Flor) => {
    const n = num(suma[f.id] ?? "");
    if (n <= 0) return toast.error("Escribe cuántos tallos o unidades entran.");
    const { error } = await supabase.from("flo_flores").update({ stock: f.stock + n }).eq("id", f.id);
    if (error) return toast.error(msg(error.message, "No se pudo sumar."));
    setSuma((x) => ({ ...x, [f.id]: "" }));
    void cargar();
  };

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Flores frescas, follaje y bases" texto="Inventario de lo que usan tus arreglos. Se descuenta solo al vender un arreglo según su receta." />
      <GlassPanel className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Campo etiqueta="Nombre *"><input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Rosa roja" /></Campo>
          <Campo etiqueta="Tipo"><select className={campo} value={categoria} onChange={(e) => setCategoria(e.target.value)}>{CATEGORIAS.map((c) => <option key={c.clave} value={c.clave}>{c.texto}</option>)}</select></Campo>
          <Campo etiqueta="Existencia"><input className={campo} inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} /></Campo>
          <Campo etiqueta="Costo por unidad"><input className={campo} inputMode="decimal" value={costo} onChange={(e) => setCosto(e.target.value)} /></Campo>
          <Campo etiqueta="Vida útil (días)"><input className={campo} inputMode="numeric" value={vida} onChange={(e) => setVida(e.target.value)} /></Campo>
        </div>
        <button type="button" className={boton} onClick={() => void crear()}>Guardar</button>
      </GlassPanel>
      <GlassPanel className="space-y-2 p-4">
        {flores.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay flores ni bases.</p> : flores.map((f) => (
          <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
            <div className="min-w-0"><p className="break-words text-sm font-semibold text-foreground">{f.nombre}</p><p className="text-xs text-muted-foreground">{CATEGORIAS.find((c) => c.clave === f.categoria)?.texto} · {f.stock} und · {dinero(f.costo)} c/u · vive {f.vida_dias} días</p></div>
            <div className="flex flex-wrap items-center gap-2">
              {f.stock <= 0 && <Etiqueta texto="Agotado" tono="alerta" />}
              <input className={`${campo} !w-28`} inputMode="decimal" placeholder="Entran" aria-label="Cantidad que entra" value={suma[f.id] ?? ""} onChange={(e) => setSuma((x) => ({ ...x, [f.id]: e.target.value }))} />
              <button type="button" className={botonSec} onClick={() => void agregar(f)}>Sumar</button>
            </div>
          </div>
        ))}
      </GlassPanel>
    </div>
  );
}

// ============================================================
// Catálogo de arreglos con foto y receta (escandallo)
// ============================================================
export function CatalogoArreglos() {
  const [flores, setFlores] = useState<Flor[]>([]);
  const [arreglos, setArreglos] = useState<Arreglo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [armado, setArmado] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [receta, setReceta] = useState<LineaReceta[]>([]);
  const [florSel, setFlorSel] = useState("");
  const [cantSel, setCantSel] = useState("1");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const [f, a] = await Promise.all([
      supabase.from("flo_flores").select("*").order("nombre"),
      supabase.from("flo_arreglos").select("*").order("created_at", { ascending: false }),
    ]);
    setFlores(f.data ?? []);
    setArreglos(a.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const costoDe = useCallback((lineas: LineaReceta[], costoArmado: number) => lineas.reduce((s, l) => s + (flores.find((f) => f.id === l.flor_id)?.costo ?? 0) * l.cantidad, 0) + costoArmado, [flores]);
  const costoForm = costoDe(receta, Math.max(num(armado), 0));

  const agregarLinea = () => {
    const f = flores.find((x) => x.id === florSel);
    const c = num(cantSel);
    if (!f || c <= 0) return toast.error("Elige el ingrediente y la cantidad.");
    setReceta((r) => (r.some((x) => x.flor_id === f.id) ? r.map((x) => (x.flor_id === f.id ? { ...x, cantidad: x.cantidad + c } : x)) : [...r, { flor_id: f.id, nombre: f.nombre, cantidad: c }]));
    setFlorSel(""); setCantSel("1");
  };

  const guardar = async () => {
    if (nombre.trim().length < 2) return toast.error("Escribe el nombre del arreglo.");
    if (receta.length === 0) return toast.error("Agrega al menos un ingrediente a la receta.");
    setGuardando(true);
    let ruta: string | null = null;
    if (foto) {
      const { data: owner } = await supabase.rpc("mi_negocio_id");
      const ext = (foto.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
      const destino = `${owner}/floristeria/${crypto.randomUUID()}.${ext || "jpg"}`;
      const { error: errSubida } = await supabase.storage.from(BUCKET).upload(destino, foto, { contentType: foto.type || undefined });
      if (errSubida) {
        setGuardando(false);
        return toast.error("No se pudo subir la foto. Revisa el archivo e inténtalo de nuevo.");
      }
      ruta = destino;
    }
    const { error } = await supabase.from("flo_arreglos").insert({
      nombre: nombre.trim(), descripcion: descripcion.trim() || null, foto_ruta: ruta, precio: Math.max(num(precio), 0),
      costo_armado: Math.max(num(armado), 0), receta: receta.map((r) => ({ flor_id: r.flor_id, nombre: r.nombre, cantidad: r.cantidad })),
    });
    setGuardando(false);
    if (error) return toast.error(msg(error.message, "No se pudo guardar el arreglo."));
    toast.success("Arreglo guardado en el catálogo.");
    setNombre(""); setDescripcion(""); setPrecio(""); setArmado(""); setFoto(null); setReceta([]);
    void cargar();
  };
  const alternar = async (a: Arreglo) => {
    const { error } = await supabase.from("flo_arreglos").update({ activo: !a.activo }).eq("id", a.id);
    if (error) return toast.error(msg(error.message, "No se pudo cambiar el arreglo."));
    void cargar();
  };

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Catálogo de arreglos florales" texto="Cada arreglo con su foto, precio y receta de flores y bases. Al venderlo, las existencias se descuentan solas y ves el costo y el margen." />
      <GlassPanel className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-foreground">Nuevo arreglo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Nombre *"><input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Ramo 12 rosas rojas" /></Campo>
          <Campo etiqueta="Precio de venta"><input className={campo} inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Campo>
          <Campo etiqueta="Costo de armado"><input className={campo} inputMode="decimal" value={armado} onChange={(e) => setArmado(e.target.value)} /></Campo>
          <Campo etiqueta="Foto"><input className={campo} type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} /></Campo>
          <div className="sm:col-span-2 lg:col-span-4"><Campo etiqueta="Descripción"><input className={campo} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></Campo></div>
        </div>
        <div className="space-y-2 rounded-xl border border-glass-border p-3">
          <p className="text-sm font-semibold text-foreground">Receta (escandallo)</p>
          <div className="grid gap-2 sm:grid-cols-3">
            <select className={campo} value={florSel} onChange={(e) => setFlorSel(e.target.value)} aria-label="Ingrediente">
              <option value="">Flor, follaje o base…</option>
              {flores.filter((f) => f.activo).map((f) => <option key={f.id} value={f.id}>{f.nombre} ({f.stock})</option>)}
            </select>
            <input className={campo} inputMode="decimal" aria-label="Cantidad" value={cantSel} onChange={(e) => setCantSel(e.target.value)} />
            <button type="button" className={botonSec} onClick={agregarLinea}>Agregar a la receta</button>
          </div>
          {receta.map((r) => (
            <p key={r.flor_id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <span>{r.cantidad} × {r.nombre}</span>
              <button type="button" className="text-xs text-destructive" onClick={() => setReceta((x) => x.filter((y) => y.flor_id !== r.flor_id))}>Quitar</button>
            </p>
          ))}
          {receta.length > 0 && <p className="text-xs text-muted-foreground">Costo estimado {dinero(Math.round(costoForm))} · margen {dinero(Math.round(num(precio) - costoForm))}</p>}
        </div>
        <button type="button" className={boton} disabled={guardando} onClick={() => void guardar()}>{guardando ? "Guardando…" : "Guardar arreglo"}</button>
      </GlassPanel>

      {arreglos.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay arreglos.</p> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {arreglos.map((a) => {
            const lineas = leerReceta(a.receta);
            const costo = costoDe(lineas, a.costo_armado);
            const alcanza = lineas.length === 0 ? 0 : Math.min(...lineas.map((l) => Math.floor((flores.find((f) => f.id === l.flor_id)?.stock ?? 0) / l.cantidad)));
            return (
              <GlassPanel key={a.id} className="space-y-2 p-4">
                {a.foto_ruta ? <FotoArreglo ruta={a.foto_ruta} /> : <div className="flex h-40 items-center justify-center rounded-lg bg-glass/40 text-xs text-muted-foreground">Sin foto</div>}
                <h3 className="break-words font-display text-lg text-foreground">{a.nombre}</h3>
                {a.descripcion && <p className="break-words text-xs text-muted-foreground">{a.descripcion}</p>}
                <p className="break-words text-xs text-muted-foreground">{lineas.map((l) => `${l.cantidad} ${l.nombre}`).join(" · ")}</p>
                <p className="text-sm text-foreground">{dinero(a.precio)} <span className="text-xs text-muted-foreground">· costo {dinero(Math.round(costo))} · margen {dinero(Math.round(a.precio - costo))}</span></p>
                <div className="flex flex-wrap items-center gap-2">
                  <Etiqueta texto={alcanza > 0 ? `Alcanza para ${alcanza}` : "Sin existencias"} tono={alcanza > 0 ? "ok" : "alerta"} />
                  {!a.activo && <Etiqueta texto="Oculto" />}
                  <button type="button" className={botonSec} onClick={() => void alternar(a)}>{a.activo ? "Ocultar" : "Mostrar"}</button>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Encargos: venta + dedicatoria + entrega + despacho
// ============================================================
const SIGUIENTE: Record<string, { estado: string; texto: string } | undefined> = {
  pedido: { estado: "armado", texto: "Marcar armado" },
  armado: { estado: "en_ruta", texto: "Salió a entrega" },
  en_ruta: { estado: "entregado", texto: "Marcar entregado" },
};

export function EncargosFlor() {
  const [arreglos, setArreglos] = useState<Arreglo[]>([]);
  const [encargos, setEncargos] = useState<Encargo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [hoy, setHoy] = useState("");
  const [arreglo, setArreglo] = useState("");
  const [cantidad, setCantidad] = useState("1");
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [direccion, setDireccion] = useState("");
  const [tarjeta, setTarjeta] = useState("");
  const [fecha, setFecha] = useState("");
  const [franja, setFranja] = useState(FRANJAS[0]);
  const [metodo, setMetodo] = useState("efectivo");
  const [guardando, setGuardando] = useState(false);
  const [filtro, setFiltro] = useState("pendientes");
  const [repartidores, setRepartidores] = useState<Record<string, string>>({});

  useEffect(() => {
    const h = hoyISO();
    setHoy(h);
    setFecha(h);
  }, []);

  const cargar = useCallback(async () => {
    const [a, e] = await Promise.all([
      supabase.from("flo_arreglos").select("*").eq("activo", true).order("nombre"),
      supabase.from("flo_encargos").select("*").order("fecha_entrega", { ascending: false }).order("created_at", { ascending: false }).limit(400),
    ]);
    setArreglos(a.data ?? []);
    setEncargos(e.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const sel = arreglos.find((a) => a.id === arreglo);
  const totalForm = sel ? Math.round(sel.precio * Math.max(Math.round(num(cantidad)), 0)) : 0;

  const vender = async () => {
    if (!sel) return toast.error("Elige el arreglo.");
    setGuardando(true);
    const { data, error } = await supabase.rpc("flo_vender", {
      p_arreglo: sel.id, p_cantidad: Math.round(num(cantidad)), p_cliente: cliente.trim(), p_telefono: telefono.trim(), p_destinatario: destinatario.trim(),
      p_direccion: direccion.trim(), p_tarjeta: tarjeta.trim(), p_fecha: fecha, p_franja: franja, p_metodo: metodo,
    });
    setGuardando(false);
    if (error) return toast.error(msg(error.message, "No se pudo registrar el encargo."));
    const r = (data ?? {}) as { total?: number };
    toast.success(`Encargo registrado: ${dinero(r.total ?? totalForm)} a Caja y flores descontadas del inventario.`);
    setCliente(""); setTelefono(""); setDestinatario(""); setDireccion(""); setTarjeta(""); setCantidad("1");
    void cargar();
  };

  const mover = async (e: Encargo, estado: string) => {
    const rep = repartidores[e.id];
    const { error } = await supabase.from("flo_encargos").update(rep !== undefined ? { estado, repartidor: rep.trim() || null } : { estado }).eq("id", e.id);
    if (error) return toast.error(msg(error.message, "No se pudo actualizar el despacho."));
    void cargar();
  };
  const avisar = (e: Encargo) => {
    const u = aWhatsapp(e.telefono, `Hola ${e.cliente}, tu ${e.arreglo} para ${e.destinatario} ya va ${e.estado === "entregado" ? "entregado" : "en camino"}. ¡Gracias por tu compra!`);
    if (!u) return toast.error("Este encargo no tiene teléfono.");
    window.open(u, "_blank", "noopener");
  };

  const lista = useMemo(() => encargos.filter((e) => (filtro === "todos" ? true : filtro === "hoy" ? e.fecha_entrega === hoy : filtro === "entregados" ? e.estado === "entregado" : e.estado !== "entregado")).sort((a, b) => (filtro === "entregados" || filtro === "todos" ? 0 : a.fecha_entrega.localeCompare(b.fecha_entrega))), [encargos, filtro, hoy]);

  if (cargando) return <Cargando />;
  const deHoy = encargos.filter((e) => e.fecha_entrega === hoy);
  return (
    <div className="space-y-6">
      <Encabezado titulo="Encargos, dedicatorias y despacho" texto="Vende un arreglo con su tarjeta, fecha y franja de entrega. Cobra a Caja, descuenta las flores de la receta y controla el despacho hasta la entrega." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador titulo="Entregas de hoy" valor={deHoy.length} />
        <Indicador titulo="Por despachar hoy" valor={deHoy.filter((e) => e.estado !== "entregado").length} alerta={deHoy.some((e) => e.estado !== "entregado")} />
        <Indicador titulo="Vendido hoy" valor={dinero(encargos.filter((e) => e.created_at.slice(0, 10) === hoy).reduce((s, e) => s + e.total, 0))} />
      </div>

      <GlassPanel className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-foreground">Nuevo encargo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Arreglo *">
            <select className={campo} value={arreglo} onChange={(e) => setArreglo(e.target.value)}>
              <option value="">Elige…</option>
              {arreglos.map((a) => <option key={a.id} value={a.id}>{a.nombre} · {dinero(a.precio)}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Cantidad"><input className={campo} inputMode="numeric" value={cantidad} onChange={(e) => setCantidad(e.target.value)} /></Campo>
          <Campo etiqueta="Quién compra *"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
          <Campo etiqueta="Teléfono del comprador"><input className={campo} inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></Campo>
          <Campo etiqueta="Quién recibe *"><input className={campo} value={destinatario} onChange={(e) => setDestinatario(e.target.value)} /></Campo>
          <div className="sm:col-span-2"><Campo etiqueta="Dirección de entrega"><input className={campo} value={direccion} onChange={(e) => setDireccion(e.target.value)} /></Campo></div>
          <Campo etiqueta="Fecha de entrega"><input type="date" className={campo} value={fecha} onChange={(e) => setFecha(e.target.value)} /></Campo>
          <Campo etiqueta="Franja horaria"><select className={campo} value={franja} onChange={(e) => setFranja(e.target.value)}>{FRANJAS.map((f) => <option key={f} value={f}>{f}</option>)}</select></Campo>
          <Campo etiqueta="Pago"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
          <div className="sm:col-span-2 lg:col-span-4"><Campo etiqueta="Dedicatoria de la tarjeta"><textarea className={campo} rows={2} maxLength={400} value={tarjeta} onChange={(e) => setTarjeta(e.target.value)} /></Campo></div>
        </div>
        <button type="button" className={boton} disabled={guardando} onClick={() => void vender()}>{guardando ? "Registrando…" : `Vender y cobrar ${dinero(totalForm)}`}</button>
      </GlassPanel>

      <Campo etiqueta="Mostrar">
        <select className={`${campo} !w-52`} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
          <option value="pendientes">Por entregar</option><option value="hoy">Entregas de hoy</option><option value="entregados">Entregados</option><option value="todos">Todos</option>
        </select>
      </Campo>
      {lista.length === 0 ? <p className="text-sm text-muted-foreground">No hay encargos con este filtro.</p> : (
        <div className="grid gap-4 lg:grid-cols-2">
          {lista.map((e) => {
            const sig = SIGUIENTE[e.estado];
            return (
              <GlassPanel key={e.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0"><p className="break-words text-sm font-semibold text-foreground">{e.cantidad} × {e.arreglo}</p><p className="break-words text-xs text-muted-foreground">Para {e.destinatario} · {e.fecha_entrega} · {e.franja}</p></div>
                  <Etiqueta texto={e.estado === "en_ruta" ? "En ruta" : e.estado.charAt(0).toUpperCase() + e.estado.slice(1)} tono={e.estado === "entregado" ? "ok" : e.fecha_entrega === hoy ? "alerta" : "info"} />
                </div>
                {e.direccion && <p className="break-words text-xs text-muted-foreground">{e.direccion}</p>}
                {e.tarjeta && <p className="break-words rounded-lg bg-glass/40 p-2 text-sm italic text-foreground">“{e.tarjeta}”</p>}
                <p className="text-xs text-muted-foreground">Compra {e.cliente} · {dinero(e.total)} (costo {dinero(e.costo)}, utilidad {dinero(e.total - e.costo)})</p>
                {e.estado !== "entregado" && (
                  <div className="flex flex-wrap items-center gap-2">
                    <input className={`${campo} !w-40`} placeholder="Repartidor" aria-label="Repartidor" value={repartidores[e.id] ?? e.repartidor ?? ""} onChange={(ev) => setRepartidores((x) => ({ ...x, [e.id]: ev.target.value }))} />
                    {sig && <button type="button" className={boton} onClick={() => void mover(e, sig.estado)}>{sig.texto}</button>}
                    <button type="button" className={botonSec} onClick={() => avisar(e)}><MessageCircle className="h-4 w-4" /> Avisar</button>
                  </div>
                )}
              </GlassPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
