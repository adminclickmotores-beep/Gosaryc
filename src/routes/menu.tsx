import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Minus,
  Plus,
  ShoppingBag,
  Star,
  CheckCircle2,
  Loader2,
  Search,
  Clock,
  MapPin,
  MessageCircle,
  UtensilsCrossed,
  ChevronLeft,
  Store,
  X,
  ImageOff,
} from "lucide-react";
import { toast } from "sonner";
import {
  LIMITES,
  correoValido,
  limpiarCorreo,
  limpiarTelefono,
  limpiarTexto,
  telefonoValido,
} from "@/lib/validacion-publica";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { resolverTipoNegocio, mismoTipoNegocio } from "@/lib/modulos-negocio";
import { EnlaceUniversal } from "@/components/negocio/EnlaceUniversal";

export const Route = createFileRoute("/menu")({
  head: () => ({
    meta: [
      { title: "Menú digital — haz tu pedido" },
      { name: "description", content: "Mira el menú, arma tu pedido y recíbelo en casa o recógelo en el local." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { n?: string } =>
    typeof s.n === "string" && s.n ? { n: s.n } : {},
  component: MenuPage,
});

type Categoria = Tables<"restaurante_categorias">;
type Producto = Tables<"restaurante_productos">;
type Modalidad = "domicilio" | "recoger" | "mesa";

type OpcionProducto = Tables<"restaurante_producto_opciones">;
type Seleccion = { grupo: string; nombre: string; precio: number };
type Linea = { key: string; producto: Producto; cantidad: number; opciones: Seleccion[] };
const precioLinea = (l: Linea) => l.producto.precio + l.opciones.reduce((s, o) => s + o.precio, 0);

type Seguimiento = { estado: string; modalidad: string; total: number; metodo_pago: string; created_at: string };

const METODOS_PAGO: [string, string][] = [
  ["efectivo", "Efectivo"],
  ["transferencia", "Transferencia"],
  ["tarjeta", "Tarjeta"],
];

const ESTADOS_PEDIDO: Record<string, string> = {
  nuevo: "Recibido: esperando confirmación",
  aceptado: "Aceptado",
  preparando: "En preparación",
  listo: "Listo",
  en_camino: "En camino",
  entregado: "Entregado",
  rechazado: "Rechazado por el local",
  cancelado: "Cancelado",
};

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const campo =
  "w-full rounded-xl border border-glass-border bg-glass/40 px-3.5 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/60 focus:ring-2 focus:ring-primary/20";

function MenuPage() {
  const { n } = Route.useSearch();
  const { negocio, cargando: cargandoNegocio } = useNegocio(n);
  // Negocio al que pertenece este menú: el del enlace (?n=) o, si no hay, el que cargó.
  const dueno = n ?? negocio?.owner_id ?? null;  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [carrito, setCarrito] = useState<Linea[]>([]);
  const [opcionesTodas, setOpcionesTodas] = useState<OpcionProducto[]>([]);
  const [elegir, setElegir] = useState<Producto | null>(null);
  const [sel, setSel] = useState<Record<string, string[]>>({});
  const [cantElegir, setCantElegir] = useState(1);
  const [notaElegir, setNotaElegir] = useState("");
  const [paso, setPaso] = useState<"menu" | "datos" | "listo">("menu");
  const [enviando, setEnviando] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [modalidad, setModalidad] = useState<Modalidad>("domicilio");
  const [direccion, setDireccion] = useState("");
  const [notas, setNotas] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [barrio, setBarrio] = useState("");
  const [correo, setCorreo] = useState("");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [seguimiento, setSeguimiento] = useState<Seguimiento | null>(null);

  // Recupera el último pedido de este dispositivo para poder seguirlo.
  useEffect(() => {
    try {
      const guardado = localStorage.getItem("menu:ultimo_pedido");
      if (guardado) {
        setPedidoId(guardado);
        setCodigo(guardado.slice(0, 6).toUpperCase());
      }
    } catch {
      /* almacenamiento bloqueado */
    }
  }, []);

  // Consulta el estado del pedido cada 15 s mientras se ve el seguimiento.
  useEffect(() => {
    if (!pedidoId || paso !== "listo") return;
    let vivo = true;
    const consultar = async () => {
      const { data } = await supabase.rpc("seguimiento_pedido", { _id: pedidoId });
      if (vivo) setSeguimiento(data?.[0] ?? null);
    };
    consultar();
    const t = setInterval(consultar, 15000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [pedidoId, paso]);

  useEffect(() => {
    if (!dueno) {
      if (!cargandoNegocio) setCargando(false);
      return;
    }
    (async () => {
      const [c, p, o] = await Promise.all([
        supabase.from("restaurante_categorias").select("*").eq("owner_id", dueno).eq("activa", true).order("orden"),
        supabase.from("restaurante_productos").select("*").eq("owner_id", dueno).eq("activo", true).order("nombre"),
        supabase.from("restaurante_producto_opciones").select("*").eq("owner_id", dueno).eq("activa", true).order("created_at"),
      ]);
      setCategorias((c.data ?? []).filter((x) => mismoTipoNegocio(x.tipo_negocio, negocio?.tipo_negocio)));
      setProductos((p.data ?? []).filter((x) => mismoTipoNegocio(x.tipo_negocio, negocio?.tipo_negocio)));
      setOpcionesTodas(o.data ?? []);
      setCargando(false);
    })();
  }, [dueno, cargandoNegocio, negocio?.tipo_negocio]);

  const lineas = carrito;
  const total = lineas.reduce((s, l) => s + precioLinea(l) * l.cantidad, 0);
  const unidades = lineas.reduce((s, l) => s + l.cantidad, 0);

  const opcionesDe = (productoId: string) => opcionesTodas.filter((o) => o.producto_id === productoId);

  const sumarLinea = (producto: Producto, opciones: Seleccion[], cantidad = 1) => {
    const key = `${producto.id}|${opciones.map((o) => `${o.grupo}:${o.nombre}`).sort().join(",")}`;
    setCarrito((c) =>
      c.some((l) => l.key === key)
        ? c.map((l) => (l.key === key ? { ...l, cantidad: l.cantidad + cantidad } : l))
        : [...c, { key, producto, cantidad, opciones }],
    );
  };

  const abrirProducto = (p: Producto) => {
    setSel({});
    setCantElegir(1);
    setNotaElegir("");
    setElegir(p);
  };

  const agregar = (p: Producto) => {
    if (opcionesDe(p.id).length > 0) {
      abrirProducto(p);
    } else {
      sumarLinea(p, []);
    }
  };

  const cambiarLinea = (key: string, delta: number) =>
    setCarrito((c) =>
      c.map((l) => (l.key === key ? { ...l, cantidad: l.cantidad + delta } : l)).filter((l) => l.cantidad > 0),
    );

  const quitarUno = (productoId: string) => {
    const ultima = [...carrito].reverse().find((l) => l.producto.id === productoId);
    if (ultima) cambiarLinea(ultima.key, -1);
  };

  // Grupos del producto que se está personalizando.
  const gruposElegir = useMemo(() => {
    if (!elegir) return [];
    const ops = opcionesTodas.filter((o) => o.producto_id === elegir.id);
    return Array.from(new Set(ops.map((o) => o.grupo))).map((g) => {
      const items = ops.filter((o) => o.grupo === g);
      return { grupo: g, items, obligatorio: items[0].obligatorio, multiple: items[0].multiple };
    });
  }, [elegir, opcionesTodas]);

  const alternarOpcion = (g: { grupo: string; multiple: boolean }, id: string) =>
    setSel((s) => {
      const actual = s[g.grupo] ?? [];
      if (g.multiple) return { ...s, [g.grupo]: actual.includes(id) ? actual.filter((x) => x !== id) : [...actual, id] };
      return { ...s, [g.grupo]: actual.includes(id) ? [] : [id] };
    });

  const extrasElegidos = gruposElegir
    .flatMap((g) => g.items.filter((o) => (sel[g.grupo] ?? []).includes(o.id)))
    .reduce((s, o) => s + o.precio_extra, 0);

  const opcionesElegidas = (): Seleccion[] =>
    gruposElegir.flatMap((g) =>
      g.items
        .filter((o) => (sel[g.grupo] ?? []).includes(o.id))
        .map((o) => ({ grupo: g.grupo, nombre: o.nombre, precio: o.precio_extra })),
    );

  const confirmarOpciones = () => {
    if (!elegir) return;
    const faltante = gruposElegir.find((g) => g.obligatorio && (sel[g.grupo] ?? []).length === 0);
    if (faltante) return toast.error(`Elige una opción en "${faltante.grupo}".`);
    sumarLinea(elegir, opcionesElegidas(), cantElegir);
    setElegir(null);
  };

  const pedirProductoWhatsapp = () => {
    if (!elegir || !negocio?.telefono_pedidos) return;
    const faltante = gruposElegir.find((g) => g.obligatorio && (sel[g.grupo] ?? []).length === 0);
    if (faltante) return toast.error(`Elige una opción en "${faltante.grupo}".`);
    const ops = opcionesElegidas();
    const d = negocio.telefono_pedidos.replace(/\D/g, "");
    const numero = d.length === 10 ? `57${d}` : d;
    const texto =
      `Hola ${negocio.nombre ?? ""}, quiero pedir:\n${cantElegir} x ${elegir.nombre}` +
      (ops.length > 0 ? `\nOpciones: ${ops.map((o) => o.nombre).join(", ")}` : "") +
      (notaElegir.trim() ? `\nNota: ${notaElegir.trim()}` : "") +
      `\nTotal: ${dinero((elegir.precio + extrasElegidos) * cantElegir)}`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  };

  const termino = busqueda.trim().toLowerCase();
  const visibles = useMemo(
    () =>
      termino
        ? productos.filter(
            (p) => p.nombre.toLowerCase().includes(termino) || (p.descripcion ?? "").toLowerCase().includes(termino),
          )
        : productos,
    [productos, termino],
  );
  const destacados = useMemo(() => (termino ? [] : productos.filter((p) => p.destacado)), [productos, termino]);
  const categoriasConItems = categorias.filter((c) => visibles.some((p) => p.categoria_id === c.id));
  const sinCategoria = visibles.filter((p) => !p.categoria_id || !categorias.some((c) => c.id === p.categoria_id));

  const irA = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const enviar = async () => {
    const nombreLimpio = limpiarTexto(nombre, LIMITES.nombre);
    const telefonoLimpio = limpiarTelefono(telefono);
    const direccionLimpia = limpiarTexto(direccion, LIMITES.direccion);
    const barrioLimpio = limpiarTexto(barrio, LIMITES.barrio);
    const correoLimpio = limpiarCorreo(correo);
    const notasLimpias = limpiarTexto(notas, LIMITES.notas, true);
    if (!nombreLimpio || !telefonoLimpio) return toast.error("Escribe tu nombre y teléfono.");
    if (!telefonoValido(telefonoLimpio)) return toast.error("Escribe un teléfono válido, de 7 a 15 números.");
    if (correoLimpio && !correoValido(correoLimpio)) return toast.error("Revisa el correo, parece incompleto.");
    if (modalidad === "domicilio" && direccionLimpia.length < 5) return toast.error("Escribe la dirección de entrega.");
    if (lineas.length === 0 || lineas.length > 60) return toast.error("Revisa los productos de tu pedido.");
    setEnviando(true);
    const id = crypto.randomUUID();
    const { error } = await supabase.from("restaurante_pedidos").insert({
      id,
      owner_id: dueno,
      cliente_nombre: nombreLimpio,
      cliente_telefono: telefonoLimpio,
      modalidad,
      direccion: modalidad === "domicilio" ? direccionLimpia : null,
      barrio: modalidad === "domicilio" && barrioLimpio ? barrioLimpio : null,
      cliente_email: correoLimpio || null,
      metodo_pago: metodoPago,
      notas: notasLimpias || null,
      total,
    });
    if (error) {
      setEnviando(false);
      return toast.error("No pudimos registrar tu pedido. Intenta de nuevo.");
    }
    const { error: errItems } = await supabase.from("restaurante_pedido_items").insert(
      lineas.map((l) => ({
        pedido_id: id,
        producto_id: l.producto.id,
        nombre: l.producto.nombre,
        cantidad: l.cantidad,
        precio_unitario: precioLinea(l),
        opciones: l.opciones as unknown as Json,
      })),
    );
    setEnviando(false);
    if (errItems) return toast.error("No pudimos guardar los productos del pedido.");
    setCodigo(id.slice(0, 6).toUpperCase());
    setPedidoId(id);
    setSeguimiento(null);
    try {
      localStorage.setItem("menu:ultimo_pedido", id);
    } catch {
      /* almacenamiento bloqueado */
    }
    setCarrito([]);
    setPaso("listo");
  };

  const tarjeta = (p: Producto) => {
    const cant = carrito.filter((l) => l.producto.id === p.id).reduce((s, l) => s + l.cantidad, 0);
    const conOpciones = opcionesDe(p.id).length > 0;
    return (
      <div
        key={p.id}
        className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border border-glass-border bg-card shadow-sm transition hover:shadow-lg ${cant > 0 ? "ring-2 ring-primary/50" : ""}`}
      >
        <button type="button" onClick={() => abrirProducto(p)} className="group relative block aspect-square w-full overflow-hidden bg-muted text-left" aria-label={`Ver ${p.nombre}`}>
          {p.imagen_url ? (
            <img
              src={p.imagen_url}
              alt={p.nombre}
              loading="lazy"
              className="h-full w-full max-w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-muted-foreground/50">
              <ImageOff className="h-10 w-10" />
            </span>
          )}
          {p.destacado && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
              <Star className="h-3 w-3 fill-current" /> Recomendado
            </span>
          )}
        </button>
        <div className="flex min-w-0 flex-1 flex-col p-3">
          <p className="break-words font-medium leading-snug text-foreground">{p.nombre}</p>
          {p.descripcion && (
            <p className="mt-1 line-clamp-2 text-xs leading-snug text-muted-foreground">{p.descripcion}</p>
          )}
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
            <span className="precio-esmeralda text-base font-semibold">{dinero(p.precio)}</span>
            {cant > 0 ? (
              <div className="flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 p-0.5">
                <button
                  onClick={() => quitarUno(p.id)}
                  aria-label="Quitar uno"
                  className="flex h-8 w-8 items-center justify-center rounded-full text-foreground hover:bg-primary/15"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center text-sm font-medium text-foreground">{cant}</span>
                <button
                  onClick={() => agregar(p)}
                  aria-label="Agregar uno"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => agregar(p)}
                aria-label="Agregar"
                className="flex h-9 items-center gap-1 rounded-full bg-primary px-3.5 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                <Plus className="h-4 w-4" /> {conOpciones ? "Personalizar" : "Agregar"}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Mientras carga el negocio no se muestra ningún producto: así nunca aparece la carta de otro negocio.
  if (cargandoNegocio) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Sin negocio no hay nada que mostrar; con negocio de otro rubro se muestra
  // el enlace universal (catálogo por WhatsApp + cita online) en vez de bloquear.
  if (!negocio) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
          <Store className="h-10 w-10 text-primary" />
        </div>
        <h1 className="font-display text-2xl text-foreground">Catálogo</h1>
        <p className="text-muted-foreground">Este catálogo no está disponible.</p>
        <Link to="/" className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
          Ir al inicio
        </Link>
      </div>
    );
  }
  if (!resolverTipoNegocio(negocio.tipo_negocio).usaPedidos) {
    const duenoUniversal = dueno ?? negocio.owner_id ?? "";
    return (
      <EnlaceUniversal
        dueno={duenoUniversal}
        nombre={negocio.nombre ?? "Nuestro negocio"}
        telefono={negocio.telefono_pedidos ?? ""}
        descripcion={negocio.descripcion ?? negocio.eslogan ?? ""}
        tipoNegocio={negocio.tipo_negocio ?? null}
      />
    );
  }

  if (paso === "listo") {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
          <CheckCircle2 className="h-12 w-12 text-primary" />
        </div>
        <h1 className="font-display text-3xl text-foreground">¡Pedido recibido!</h1>
        <p className="text-muted-foreground">
          Tu código es{" "}
          <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-foreground">{codigo}</span>. Ya lo
          enviamos a cocina.
        </p>
        <GlassPanel className="w-full space-y-1 p-4 text-left text-sm">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Estado de tu pedido</p>
          <p className="text-base font-medium text-foreground">
            {seguimiento ? (ESTADOS_PEDIDO[seguimiento.estado] ?? seguimiento.estado) : "Consultando…"}
          </p>
          {seguimiento && (
            <p className="text-muted-foreground">
              {dinero(seguimiento.total)} · pago en {seguimiento.metodo_pago}
            </p>
          )}
          <p className="text-xs text-muted-foreground">Se actualiza solo cada pocos segundos.</p>
        </GlassPanel>
        <button
          onClick={() => setPaso("menu")}
          className="rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Hacer otro pedido
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-32">
      {/* Cabecera */}
      <header className="relative overflow-hidden border-b border-glass-border bg-gradient-to-br from-primary/25 via-primary/10 to-transparent px-4 pb-6 pt-8 sm:rounded-b-3xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
              <UtensilsCrossed className="h-7 w-7" />
            </div>
            <div className="min-w-0">
              <h1 className="break-words font-display text-3xl leading-tight text-foreground">
                {negocio?.nombre ?? "Nuestro menú"}
              </h1>
              <p className="text-sm text-muted-foreground">
                {negocio?.eslogan ?? "Arma tu pedido y lo preparamos al momento."}
              </p>
            </div>
          </div>
          <Link to="/instalar" className="shrink-0 text-xs text-primary hover:underline">
            Instalar app
          </Link>
        </div>

        {negocio && paso === "menu" && (
          <div className="mt-4 space-y-2 text-sm">
            {negocio.descripcion && <p className="text-foreground">{negocio.descripcion}</p>}
            <div className="flex flex-wrap gap-2">
              {(negocio.ciudad || negocio.cobertura) && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-glass/40 px-3 py-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {[negocio.ciudad, negocio.cobertura].filter(Boolean).join(" · ")}
                </span>
              )}
              {negocio.telefono_pedidos && (
                <a
                  href={`https://wa.me/${(() => {
                    const d = negocio.telefono_pedidos.replace(/\D/g, "");
                    return d.length === 10 ? `57${d}` : d;
                  })()}?text=${encodeURIComponent(`Hola ${negocio.nombre ?? ""}, quiero hacer un pedido.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-foreground hover:bg-primary/20"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-primary" />
                  Pedir por WhatsApp · {negocio.telefono_pedidos}
                </a>
              )}
            </div>
            {negocio.aviso_entrega && <p className="text-muted-foreground">{negocio.aviso_entrega}</p>}
            {negocio.horarios && (
              <details className="rounded-xl border border-glass-border bg-glass/30 px-3 py-2 text-muted-foreground">
                <summary className="flex cursor-pointer items-center gap-1.5 text-foreground">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Horarios
                </summary>
                <p className="mt-2 whitespace-pre-line">{negocio.horarios}</p>
              </details>
            )}
          </div>
        )}
      </header>

      {paso === "menu" && (
        <>
          {/* Buscador y categorías pegajosos */}
          <div className="sticky top-0 z-30 space-y-2 border-b border-glass-border bg-background/90 px-4 py-3 backdrop-blur-xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={`${campo} pl-10`}
                placeholder="Buscar en el menú…"
                maxLength={80}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>
            {categoriasConItems.length > 1 && (
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {categoriasConItems.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => irA(`cat-${c.id}`)}
                    className="shrink-0 rounded-full border border-glass-border bg-glass/40 px-4 py-1.5 text-sm text-foreground hover:border-primary/50 hover:bg-primary/10"
                  >
                    {c.nombre}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 pt-5">
            {cargando && (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-2xl bg-glass/40" />
                ))}
              </div>
            )}
            {!cargando && productos.length === 0 && (
              <p className="py-10 text-center text-muted-foreground">El menú aún no tiene productos.</p>
            )}
            {!cargando && productos.length > 0 && visibles.length === 0 && (
              <p className="py-10 text-center text-muted-foreground">No encontramos “{busqueda}”.</p>
            )}

            {destacados.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 flex items-center gap-2 font-display text-xl text-foreground">
                  <Star className="h-5 w-5 fill-primary text-primary" /> Recomendados
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{destacados.map(tarjeta)}</div>
              </section>
            )}

            {categoriasConItems.map((cat) => (
              <section key={cat.id} id={`cat-${cat.id}`} className="mb-8 scroll-mt-32">
                <h2 className="mb-3 border-l-4 border-primary pl-3 font-display text-xl text-foreground">
                  {cat.nombre}
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {visibles.filter((p) => p.categoria_id === cat.id).map(tarjeta)}
                </div>
              </section>
            ))}

            {sinCategoria.length > 0 && (
              <section className="mb-8">
                <h2 className="mb-3 border-l-4 border-primary pl-3 font-display text-xl text-foreground">Otros</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{sinCategoria.map(tarjeta)}</div>
              </section>
            )}
          </div>
        </>
      )}

      {paso === "datos" && (
        <div className="px-4 pt-5">
          <button
            onClick={() => setPaso("menu")}
            className="mb-3 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" /> Seguir pidiendo
          </button>
          <GlassPanel className="space-y-4 p-5">
            <h2 className="font-display text-xl text-foreground">Tus datos</h2>
            <input className={campo} placeholder="Nombre" maxLength={LIMITES.nombre} autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} />
            <input
              className={campo}
              placeholder="Teléfono"
              inputMode="tel"
              type="tel"
              autoComplete="tel"
              maxLength={LIMITES.telefono}
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["domicilio", "Domicilio"],
                  ["recoger", "Recoger"],
                  ["mesa", "En mesa"],
                ] as [Modalidad, string][]
              ).map(([v, t]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setModalidad(v)}
                  className={`rounded-xl border px-2 py-3 text-sm font-medium ${modalidad === v ? "border-primary bg-primary/15 text-foreground" : "border-glass-border text-muted-foreground"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            {modalidad === "domicilio" && (
              <>
                <input
                  className={campo}
                  placeholder="Dirección de entrega"
                  maxLength={LIMITES.direccion}
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                />
                <input
                  className={campo}
                  placeholder="Barrio"
                  maxLength={LIMITES.barrio}
                  value={barrio}
                  onChange={(e) => setBarrio(e.target.value)}
                />
              </>
            )}
            <input
              className={campo}
              type="email"
              placeholder="Correo (opcional)"
              autoComplete="email"
              maxLength={LIMITES.correo}
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
            />
            <div>
              <p className="mb-2 text-sm text-muted-foreground">Método de pago</p>
              <div className="grid grid-cols-3 gap-2">
                {METODOS_PAGO.map(([v, t]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMetodoPago(v)}
                    className={`rounded-xl border px-2 py-3 text-sm font-medium ${metodoPago === v ? "border-primary bg-primary/15 text-foreground" : "border-glass-border text-muted-foreground"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <textarea
              className={campo}
              rows={2}
              placeholder="Notas (sin cebolla, sin hielo…)"
              maxLength={LIMITES.notas}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
            <div className="space-y-1.5 border-t border-glass-border pt-3 text-sm">
              {lineas.map((l) => (
                <div key={l.key} className="flex items-start justify-between gap-3 text-muted-foreground">
                  <div className="min-w-0">
                    <span className="break-words text-foreground">{l.producto.nombre}</span>
                    {l.opciones.length > 0 && (
                      <p className="break-words text-xs">
                        {l.opciones.map((o) => `${o.nombre}${o.precio > 0 ? ` (+${dinero(o.precio)})` : ""}`).join(" · ")}
                      </p>
                    )}
                    <div className="mt-1 flex items-center gap-1">
                      <button type="button" aria-label="Quitar uno" onClick={() => cambiarLinea(l.key, -1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-glass-border">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center text-foreground">{l.cantidad}</span>
                      <button type="button" aria-label="Agregar uno" onClick={() => cambiarLinea(l.key, 1)} className="flex h-8 w-8 items-center justify-center rounded-full border border-glass-border">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <span className="shrink-0">{dinero(precioLinea(l) * l.cantidad)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-2 text-base font-semibold text-foreground">
                <span>Total</span>
                <span>{dinero(total)}</span>
              </div>
            </div>
          </GlassPanel>
        </div>
      )}

      {elegir && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4" onClick={() => setElegir(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={elegir.nombre}
            className="relative grid max-h-[92dvh] w-full max-w-4xl grid-cols-1 overflow-y-auto rounded-t-3xl border border-glass-border bg-background shadow-2xl sm:rounded-3xl md:grid-cols-12"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              aria-label="Cerrar"
              onClick={() => setElegir(null)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="group relative aspect-[4/3] w-full overflow-hidden bg-muted md:col-span-7 md:aspect-auto md:min-h-[420px]">
              {elegir.imagen_url ? (
                <img
                  src={elegir.imagen_url}
                  alt={elegir.nombre}
                  className="absolute inset-0 h-full w-full max-w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center text-muted-foreground/50">
                  <ImageOff className="h-16 w-16" />
                </span>
              )}
            </div>
            <div className="min-w-0 space-y-4 p-5 md:col-span-5">
            <div>
              <h2 className="break-words pr-10 font-display text-2xl leading-tight text-foreground">{elegir.nombre}</h2>
              <p className="precio-esmeralda mt-1 text-2xl font-semibold">{dinero(elegir.precio + extrasElegidos)}</p>
              {elegir.descripcion && <p className="mt-2 break-words text-sm text-muted-foreground">{elegir.descripcion}</p>}
            </div>
            {gruposElegir.map((g) => (
              <div key={g.grupo} className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  {g.grupo}{" "}
                  <span className="font-normal text-muted-foreground">
                    · {g.obligatorio ? "obligatorio" : "opcional"}
                    {g.multiple ? " · puedes elegir varias" : " · elige una"}
                  </span>
                </p>
                {g.items.map((o) => {
                  const marcada = (sel[g.grupo] ?? []).includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => alternarOpcion(g, o.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left text-base ${marcada ? "border-primary bg-primary/15 text-foreground" : "border-glass-border text-muted-foreground"}`}
                    >
                      <span className="min-w-0 break-words">{o.nombre}</span>
                      {o.precio_extra > 0 && <span className="shrink-0 text-sm">+{dinero(o.precio_extra)}</span>}
                    </button>
                  );
                })}
              </div>
            ))}
            <textarea
              className={campo}
              rows={2}
              placeholder="Notas: sin cebolla, sin hielo…"
              maxLength={LIMITES.nota_linea}
              value={notaElegir}
              onChange={(e) => setNotaElegir(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Cantidad</span>
              <div className="flex items-center gap-3">
                <button type="button" aria-label="Quitar uno" onClick={() => setCantElegir((c) => Math.max(1, c - 1))} className="rounded-full border border-glass-border p-2.5">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-lg font-semibold tabular-nums">{cantElegir}</span>
                <button type="button" aria-label="Agregar uno" onClick={() => setCantElegir((c) => Math.min(50, c + 1))} className="rounded-full border border-glass-border p-2.5">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <button type="button" onClick={confirmarOpciones} className="btn-pro w-full rounded-2xl px-4 py-3.5 text-base font-semibold">
                Agregar al pedido · {dinero((elegir.precio + extrasElegidos) * cantElegir)}
              </button>
              {negocio.telefono_pedidos && (
                <button
                  type="button"
                  onClick={pedirProductoWhatsapp}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-glass-border px-4 py-3 text-sm font-medium text-foreground hover:bg-glass/40"
                >
                  <MessageCircle className="h-4 w-4 text-primary" /> Pedir por WhatsApp
                </button>
              )}
            </div>
            </div>
          </div>
        </div>
      )}

      {unidades > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-glass-border bg-background/95 px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <button
              disabled={enviando}
              onClick={() => (paso === "menu" ? setPaso("datos") : enviar())}
              className="flex flex-1 items-center justify-between gap-3 rounded-full bg-primary px-5 py-3.5 text-sm font-medium text-primary-foreground shadow-lg hover:opacity-90 disabled:opacity-60"
            >
              <span className="flex items-center gap-2">
                {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
                {paso === "menu" ? `Ver pedido (${unidades})` : "Confirmar pedido"}
              </span>
              <span>{dinero(total)}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
