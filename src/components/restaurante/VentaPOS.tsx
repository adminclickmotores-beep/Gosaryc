import { useCallback, useEffect, useMemo, useState } from "react";
import { Armchair, Bike, ChefHat, ImageOff, Minus, Plus, Search, ShoppingBag, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { TARIFAS_DOMICILIO, buscarTarifa } from "@/lib/tarifas-domicilio";

type Producto = Tables<"restaurante_productos">;
type Categoria = Tables<"restaurante_categorias">;
type Mesa = Tables<"restaurante_mesas">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

const MODALIDADES = [
  { clave: "mesa", texto: "Mesa", Icon: Armchair },
  { clave: "recoger", texto: "Para llevar", Icon: ShoppingBag },
  { clave: "domicilio", texto: "Domicilio", Icon: Bike },
] as const;

const METODOS = [
  { clave: "efectivo", texto: "Efectivo" },
  { clave: "nequi", texto: "Nequi" },
  { clave: "daviplata", texto: "Daviplata" },
  { clave: "bre-b", texto: "Bre-B" },
  { clave: "tarjeta", texto: "Tarjeta" },
];

/** Pantalla de venta: eliges productos, armas la cuenta, la envías a cocina y la cobras. */
export function VentaPOS({ onCambio }: { onCambio?: () => void }) {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [catActiva, setCatActiva] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [cuenta, setCuenta] = useState<Record<string, number>>({});
  const [modalidad, setModalidad] = useState<"mesa" | "recoger" | "domicilio">("mesa");
  const [mesaId, setMesaId] = useState("");
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [notas, setNotas] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [recibido, setRecibido] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [zonaManual, setZonaManual] = useState("");

  const cargar = useCallback(async () => {
    const [c, p, m] = await Promise.all([
      supabase.from("restaurante_categorias").select("*").order("orden"),
      supabase.from("restaurante_productos").select("*").eq("activo", true).order("nombre"),
      supabase.from("restaurante_mesas").select("*").order("numero"),
    ]);
    setCategorias(c.data ?? []);
    setProductos(p.data ?? []);
    setMesas(m.data ?? []);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter(
      (p) => (catActiva === "todas" || p.categoria_id === catActiva) && (!q || p.nombre.toLowerCase().includes(q)),
    );
  }, [productos, catActiva, busqueda]);

  const lineas = productos.filter((p) => (cuenta[p.id] ?? 0) > 0).map((p) => ({ p, cant: cuenta[p.id] }));
  const subtotal = lineas.reduce((s, l) => s + l.p.precio * l.cant, 0);
  const tarifaDetectada = useMemo(() => buscarTarifa(direccion), [direccion]);
  const tarifa =
    modalidad !== "domicilio"
      ? null
      : zonaManual
        ? (TARIFAS_DOMICILIO.find((x) => x.nombre === zonaManual) ?? null)
        : tarifaDetectada;
  const envio = tarifa ? tarifa.precio : 0;
  const total = subtotal + envio;
  const cambio = Number(recibido) > total ? Number(recibido) - total : 0;

  const cambiarCant = (id: string, delta: number) =>
    setCuenta((c) => {
      const nuevo = Math.max(0, Math.min(100, (c[id] ?? 0) + delta));
      const copia = { ...c };
      if (nuevo === 0) delete copia[id];
      else copia[id] = nuevo;
      return copia;
    });

  const limpiar = () => {
    setCuenta({});
    setCliente("");
    setTelefono("");
    setDireccion("");
    setNotas("");
    setRecibido("");
    setMesaId("");
    setZonaManual("");
  };

  const registrar = async (cobrar: boolean) => {
    if (lineas.length === 0) return toast.error("Agrega al menos un producto a la cuenta.");
    if (modalidad === "domicilio" && (!direccion.trim() || telefono.trim().length < 5))
      return toast.error("Para un domicilio escribe la dirección y el teléfono del cliente.");
    if (modalidad === "domicilio" && !tarifa)
      return toast.error("Elige el barrio de entrega para cobrar el domicilio.");
    setGuardando(true);
    const mesa = mesas.find((m) => m.id === mesaId);
    const nombre =
      cliente.trim() || (modalidad === "mesa" && mesa ? `Mesa ${mesa.numero}` : "Cliente mostrador");
    const { data: pedido, error } = await supabase
      .from("restaurante_pedidos")
      .insert({
        cliente_nombre: nombre.slice(0, 120),
        cliente_telefono: telefono.trim().length >= 5 ? telefono.trim() : "00000",
        modalidad,
        mesa_id: modalidad === "mesa" && mesaId ? mesaId : null,
        direccion: modalidad === "domicilio" ? direccion.trim() : null,
        notas: notas.trim() || null,
        canal: "mostrador",
        estado: "nuevo",
        total,
      })
      .select("id")
      .single();
    if (error || !pedido) {
      setGuardando(false);
      return toast.error("No se pudo registrar el pedido.");
    }
    const itemsPedido = lineas.map((l) => ({
      pedido_id: pedido.id,
      producto_id: l.p.id as string | null,
      nombre: l.p.nombre,
      cantidad: l.cant,
      precio_unitario: l.p.precio,
    }));
    if (tarifa) {
      itemsPedido.push({
        pedido_id: pedido.id,
        producto_id: null,
        nombre: `Domicilio - ${tarifa.nombre}`,
        cantidad: 1,
        precio_unitario: tarifa.precio,
      });
    }
    const { error: errItems } = await supabase.from("restaurante_pedido_items").insert(itemsPedido);
    if (errItems) {
      setGuardando(false);
      return toast.error("El pedido se creó pero no se pudieron guardar los productos.");
    }
    if (cobrar) {
      await supabase.from("restaurante_pedidos").update({ estado: "entregado" }).eq("id", pedido.id);
      await supabase.from("restaurante_movimientos_caja").insert({
        tipo: "ingreso",
        concepto: `Venta #${pedido.id.slice(0, 6).toUpperCase()} (${METODOS.find((m) => m.clave === metodo)?.texto ?? metodo})`,
        monto: total,
      });
      toast.success(`Cobrado ${dinero(total)}${cambio > 0 ? ` · devuelve ${dinero(cambio)}` : ""}.`);
    } else {
      await supabase.from("restaurante_pedidos").update({ estado: "preparando" }).eq("id", pedido.id);
      toast.success("Pedido enviado a cocina. Cóbralo cuando el cliente pague.");
    }
    setGuardando(false);
    limpiar();
    onCambio?.();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className={`${campo} pl-9`} placeholder="Buscar producto" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 text-sm">
          {[{ id: "todas", nombre: "Todos" }, ...categorias].map((c) => (
            <button
              key={c.id}
              onClick={() => setCatActiva(c.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 ${catActiva === c.id ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`}
            >
              {c.nombre}
            </button>
          ))}
        </div>
        {productos.length === 0 && (
          <p className="text-sm text-muted-foreground">Aún no tienes productos. Agrégalos en la pestaña “Menú”.</p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {visibles.map((p) => {
            const cant = cuenta[p.id] ?? 0;
            return (
              <button
                key={p.id}
                onClick={() => cambiarCant(p.id, 1)}
                className={`group relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-glass-border bg-glass/40 text-left ${cant > 0 ? "ring-2 ring-primary" : ""}`}
              >
                {p.imagen_url ? (
                  <img src={p.imagen_url} alt={p.nombre} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105" />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center text-primary/40">
                    <ImageOff className="h-8 w-8" />
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2 pt-8">
                  <span className="block break-words text-sm font-medium leading-tight text-white">{p.nombre}</span>
                  <span className="block text-sm font-semibold text-white/90">{dinero(p.precio)}</span>
                </span>
                {cant > 0 && (
                  <span className="absolute right-2 top-2 rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground shadow">
                    {cant}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <GlassPanel className="h-fit space-y-3 p-4">
        <h2 className="font-medium text-foreground">Cuenta actual</h2>
        <div className="grid grid-cols-3 gap-2">
          {MODALIDADES.map(({ clave, texto, Icon }) => (
            <button
              key={clave}
              onClick={() => setModalidad(clave)}
              className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs ${modalidad === clave ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`}
            >
              <Icon className="h-4 w-4" /> {texto}
            </button>
          ))}
        </div>
        {modalidad === "mesa" && (
          <select className={campo} value={mesaId} onChange={(e) => setMesaId(e.target.value)}>
            <option value="">Sin mesa</option>
            {mesas.map((m) => (
              <option key={m.id} value={m.id}>Mesa {m.numero}</option>
            ))}
          </select>
        )}
        <input className={campo} placeholder="Nombre del cliente (opcional)" value={cliente} onChange={(e) => setCliente(e.target.value)} />
        {modalidad !== "mesa" && (
          <input className={campo} placeholder="Teléfono" inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        )}
        {modalidad === "domicilio" && (
          <>
            <input className={campo} placeholder="Dirección de entrega (incluye el barrio)" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
            <select className={campo} value={zonaManual} onChange={(e) => setZonaManual(e.target.value)} aria-label="Barrio de entrega">
              <option value="">
                {tarifaDetectada ? `Detectado: ${tarifaDetectada.nombre} (${dinero(tarifaDetectada.precio)})` : "Elegir barrio de entrega"}
              </option>
              {TARIFAS_DOMICILIO.map((x) => (
                <option key={x.nombre} value={x.nombre}>
                  {x.nombre}{x.detalle ? ` (${x.detalle})` : ""} - {dinero(x.precio)}
                </option>
              ))}
            </select>
            {!tarifa && direccion.trim().length > 3 && (
              <p className="text-xs text-muted-foreground">No reconocí el barrio en la dirección; elígelo de la lista.</p>
            )}
          </>
        )}

        <div className="space-y-2">
          {lineas.length === 0 && <p className="text-xs text-muted-foreground">Toca un producto para agregarlo.</p>}
          {lineas.map(({ p, cant }) => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 break-words text-foreground">{p.nombre}</span>
              <button aria-label="Quitar uno" onClick={() => cambiarCant(p.id, -1)} className="rounded-full border border-glass-border p-1 text-foreground">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center text-foreground">{cant}</span>
              <button aria-label="Agregar uno" onClick={() => cambiarCant(p.id, 1)} className="rounded-full border border-glass-border p-1 text-foreground">
                <Plus className="h-3.5 w-3.5" />
              </button>
              <span className="w-20 text-right text-foreground">{dinero(p.precio * cant)}</span>
              <button aria-label="Eliminar" onClick={() => cambiarCant(p.id, -cant)} className="text-muted-foreground">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <textarea className={campo} rows={2} placeholder="Notas para cocina (sin cebolla, etc.)" value={notas} onChange={(e) => setNotas(e.target.value)} />

        {tarifa && (
          <div className="space-y-1 border-t border-glass-border pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground"><span>Productos</span><span>{dinero(subtotal)}</span></div>
            <div className="flex justify-between text-foreground"><span>Domicilio · {tarifa.nombre}</span><span>{dinero(envio)}</span></div>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-glass-border pt-3">
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="text-xl font-medium text-foreground">{dinero(total)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select className={campo} value={metodo} onChange={(e) => setMetodo(e.target.value)} aria-label="Método de pago">
            {METODOS.map((m) => (
              <option key={m.clave} value={m.clave}>{m.texto}</option>
            ))}
          </select>
          <input className={campo} placeholder="Recibido" inputMode="decimal" value={recibido} onChange={(e) => setRecibido(e.target.value)} />
        </div>
        {cambio > 0 && <p className="text-sm text-foreground">Devuelta: {dinero(cambio)}</p>}

        <div className="grid grid-cols-2 gap-2">
          <button
            disabled={guardando}
            onClick={() => registrar(false)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-glass-border px-3 py-2.5 text-sm text-foreground disabled:opacity-60"
          >
            <ChefHat className="h-4 w-4" /> A cocina
          </button>
          <button
            disabled={guardando}
            onClick={() => registrar(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            <Wallet className="h-4 w-4" /> Cobrar
          </button>
        </div>
      </GlassPanel>
    </div>
  );
}
