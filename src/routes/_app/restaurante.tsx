import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Download, ExternalLink, Trash2 } from "lucide-react";
import { useNegocio } from "@/hooks/use-negocio";
import { usePermisos } from "@/hooks/use-permisos";
import { PasoAPaso } from "@/components/restaurante/PasoAPaso";
import { resolverTipoNegocio, mismoTipoNegocio, TIPOS_NEGOCIO } from "@/lib/modulos-negocio";
import { toast } from "sonner";
import { GuiaRapida } from "@/components/app/GuiaRapida";
import { GUIAS_NEGOCIO } from "@/lib/guia-negocio";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { NegocioConfig } from "@/components/restaurante/NegocioConfig";
import { RecetarioInventario } from "@/components/restaurante/RecetarioInventario";
import { MenuQR } from "@/components/restaurante/MenuQR";
import { Reportes } from "@/components/restaurante/Reportes";
import { MesasPanel } from "@/components/restaurante/MesasPanel";
import { CajaPanel } from "@/components/restaurante/CajaPanel";
import { VentaPOS } from "@/components/restaurante/VentaPOS";
import { OpcionesProducto } from "@/components/restaurante/OpcionesProducto";
import { BotonVentanaCompleta } from "@/components/app/BotonVentanaCompleta";
import { IndicadoresNegocio } from "@/components/app/IndicadoresNegocio";
import { DashboardConcesionario } from "@/components/vehiculos/DashboardConcesionario";

const VISTAS_VALIDAS = ["venta", "pedidos", "menu", "qr", "mesas", "caja", "reportes", "recetario", "negocio"] as const;
type VistaClave = (typeof VISTAS_VALIDAS)[number];

export const Route = createFileRoute("/_app/restaurante")({
  validateSearch: (s: Record<string, unknown>): { vista?: string; ventana?: string } => ({
    vista: typeof s.vista === "string" ? s.vista : undefined,
    ventana: typeof s.ventana === "string" ? s.ventana : undefined,
  }),
  head: () => ({ meta: [{ title: "Panel de tu negocio" }] }),
  component: RestaurantePage,
});

type Pedido = Tables<"restaurante_pedidos">;
type Item = Tables<"restaurante_pedido_items">;
type Producto = Tables<"restaurante_productos">;
type Categoria = Tables<"restaurante_categorias">;

const dinero = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const ESTADOS: { clave: string; titulo: string }[] = [
  { clave: "nuevo", titulo: "Nuevos" },
  { clave: "preparando", titulo: "En cocina" },
  { clave: "listo", titulo: "Listos" },
  { clave: "en_camino", titulo: "En camino" },
  { clave: "entregado", titulo: "Entregados" },
];

const TEXTO_METODO: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  nequi: "Nequi",
  daviplata: "Daviplata",
  "bre-b": "Bre-B",
};
const textoMetodo = (m: string) => TEXTO_METODO[m] ?? m;

type EventoHistorial = { f: string; t: string };
const leerHistorial = (h: Json): EventoHistorial[] =>
  Array.isArray(h)
    ? h.flatMap((e) =>
        e && typeof e === "object" && !Array.isArray(e) && typeof e.f === "string" && typeof e.t === "string"
          ? [{ f: e.f, t: e.t }]
          : [],
      )
    : [];
const conEvento = (p: Pedido, texto: string): Json =>
  [...leerHistorial(p.historial), { f: new Date().toISOString(), t: texto }] as unknown as Json;

type OpcionElegida = { grupo: string; nombre: string; precio: number };
const leerOpciones = (o: Json): OpcionElegida[] =>
  Array.isArray(o)
    ? o.flatMap((e) =>
        e && typeof e === "object" && !Array.isArray(e) && typeof e.grupo === "string" && typeof e.nombre === "string"
          ? [{ grupo: e.grupo, nombre: e.nombre, precio: typeof e.precio === "number" ? e.precio : 0 }]
          : [],
      )
    : [];

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Comanda para cocina: exactamente lo que confirmó el cliente. */
const imprimirComanda = (p: Pedido, lineas: Item[]) => {
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) return toast.error("Permite las ventanas emergentes para imprimir la comanda.");
  const cobro =
    p.pago_estado === "pagado" ? "PAGADO" : p.metodo_pago === "efectivo" ? "POR COBRAR" : "PAGO SIN VERIFICAR";
  const filas = lineas
    .map((i) => {
      const ops = leerOpciones(i.opciones);
      return `<p><b>${i.cantidad} × ${esc(i.nombre)}</b>${ops.map((o) => `<br>&nbsp;&nbsp;${esc(o.grupo)}: ${esc(o.nombre)}`).join("")}</p>`;
    })
    .join("");
  w.document.write(`<html><head><title>Comanda</title><style>body{font-family:monospace;font-size:14px;padding:12px}h2{margin:0 0 6px}hr{border:0;border-top:1px dashed #000}p{margin:6px 0}</style></head><body>
<h2>COMANDA #${p.numero_factura ?? p.id.slice(0, 6).toUpperCase()}</h2>
<p>${new Date(p.created_at).toLocaleString("es-CO")}</p>
<p>Cliente: ${esc(p.cliente_nombre)} · ${esc(p.cliente_telefono)}</p>
<p>Modalidad: ${esc(p.modalidad)}${p.direccion ? ` · ${esc(p.direccion)}${p.barrio ? `, ${esc(p.barrio)}` : ""}` : ""}</p><hr>
${filas}<hr>
${p.notas ? `<p>Observaciones: ${esc(p.notas)}</p>` : ""}
<p>Pago: ${esc(textoMetodo(p.metodo_pago))} · ${cobro}</p>
<p>Total: ${dinero(p.total)}</p>
<script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
};

const SIGUIENTE = (p: Pedido): { estado: string; texto: string } | null => {
  if (p.estado === "nuevo") return { estado: "preparando", texto: "Enviar a cocina" };
  if (p.estado === "preparando") return { estado: "listo", texto: "Marcar listo" };
  if (p.estado === "listo")
    return p.modalidad === "domicilio"
      ? { estado: "en_camino", texto: "Sale a domicilio" }
      : { estado: "entregado", texto: "Entregado" };
  if (p.estado === "en_camino") return { estado: "entregado", texto: "Entregado" };
  return null;
};

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

function RestaurantePage() {
  const { negocio } = useNegocio();
  const tipo = resolverTipoNegocio(negocio?.tipo_negocio);
  const busqueda = Route.useSearch();
  const { esAdmin, cargando: cargandoPermisos, puede } = usePermisos();
  const completa = busqueda.ventana === "completa" || (!cargandoPermisos && !esAdmin);
  const [vistaElegida, setVista] = useState<VistaClave>(
    (VISTAS_VALIDAS as readonly string[]).includes(busqueda.vista ?? "") ? (busqueda.vista as VistaClave) : "venta",
  );
  // Qué módulo (de los que asigna el administrador) abre cada pestaña del panel.
  const PERMISO_VISTA: Record<string, string[]> = {
    venta: ["pedidos"],
    pedidos: ["pedidos", "cocina"],
    menu: ["pedidos"],
    qr: ["pedidos"],
    mesas: ["mesas"],
    caja: ["caja_diaria"],
    reportes: ["finanzas"],
    recetario: ["insumos"],
    negocio: [],
  };
  const todasLasVistas: VistaClave[] = tipo.usaPedidos
    ? ["venta", "pedidos", "menu", "qr", "mesas", "caja", "reportes", "recetario", "negocio"]
    : ["negocio"];
  const vistas: VistaClave[] = todasLasVistas.filter((v: VistaClave) =>
    esAdmin ? true : v === "negocio" ? !tipo.usaPedidos : (PERMISO_VISTA[v] ?? []).some((id: string) => puede(id)),
  );
  const vista: VistaClave = !tipo.usaPedidos
    ? "negocio"
    : vistas.includes(vistaElegida)
      ? vistaElegida
      : (vistas[0] ?? "negocio");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [mesas, setMesas] = useState<Tables<"restaurante_mesas">[]>([]);

  const cargar = useCallback(async () => {
    const { data } = await supabase
      .from("restaurante_pedidos")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    const lista = data ?? [];
    setPedidos(lista);
    const { data: mesasData } = await supabase.from("restaurante_mesas").select("*").order("numero");
    setMesas(mesasData ?? []);
    if (lista.length > 0) {
      const { data: its } = await supabase
        .from("restaurante_pedido_items")
        .select("*")
        .in("pedido_id", lista.map((p) => p.id));
      setItems(its ?? []);
    } else {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    cargar();
    const t = setInterval(cargar, 15000);
    return () => clearInterval(t);
  }, [cargar]);

  const mover = async (p: Pedido, estado: string) => {
    const { error } = await supabase
      .from("restaurante_pedidos")
      .update({ estado, historial: conEvento(p, `Estado: ${estado.replace("_", " ")}`) })
      .eq("id", p.id);
    if (error) return toast.error("No se pudo actualizar el pedido.");
    // Al enviar a cocina se descuenta el inventario (la función evita descontar dos veces).
    if (estado === "preparando") await descontarInventario(p);
    if (estado === "cancelado") {
      // Si el pedido ya había descontado inventario, se devuelve (una sola vez).
      const { data: devueltos, error: errDev } = await supabase.rpc("devolver_insumos_pedido", { p_pedido: p.id });
      if (errDev) toast.error("El pedido se canceló, pero no se pudo devolver el inventario.");
      else if (typeof devueltos === "number" && devueltos > 0) {
        toast.success(`Pedido cancelado: se devolvieron ${devueltos} ${devueltos === 1 ? "insumo" : "insumos"} al inventario.`);
      }
    }
    cargar();
  };

  const descontarInventario = async (p: Pedido) => {
    const lineasPedido = items.filter((i) => i.pedido_id === p.id && i.producto_id);
    const { data: bajos, error } = await supabase.rpc("descontar_insumos_pedido", { p_pedido: p.id });
    if (error) return toast.error("El pedido avanzó, pero no se pudo descontar el inventario.");
    if (typeof bajos === "number" && bajos > 0) {
      toast.warning(`${bajos} ${bajos === 1 ? "insumo está" : "insumos están"} en o bajo el stock mínimo.`);
    }
    const ids = Array.from(new Set(lineasPedido.map((i) => i.producto_id as string)));
    if (ids.length > 0) {
      const { data: recetas } = await supabase.from("restaurante_recetas").select("producto_id").in("producto_id", ids);
      const conReceta = new Set((recetas ?? []).map((r) => r.producto_id));
      const sin = lineasPedido.filter((i) => !conReceta.has(i.producto_id as string)).map((i) => i.nombre);
      if (sin.length > 0) toast.info(`Sin receta, no descuentan inventario: ${Array.from(new Set(sin)).join(", ")}.`);
    }
  };

  const cobrar = async (p: Pedido) => {
    if (p.pago_estado === "pagado") return toast.info("Este pedido ya está pagado.");
    const metodo = textoMetodo(p.metodo_pago);
    const { error } = await supabase
      .from("restaurante_pedidos")
      .update({
        estado: "entregado",
        pago_estado: "pagado",
        historial: conEvento(p, `Pago verificado y cobrado (${metodo}) · ${dinero(p.total)}`),
      })
      .eq("id", p.id);
    if (error) return toast.error("No se pudo cobrar el pedido.");
    await supabase.from("restaurante_movimientos_caja").insert({
      tipo: "ingreso",
      concepto: `Venta #${p.id.slice(0, 6).toUpperCase()} (${metodo})`,
      monto: p.total,
    });
    await descontarInventario(p);
    toast.success(`Cobrado ${dinero(p.total)}.`);
    cargar();
  };

  const asignarMesa = async (p: Pedido, mesaId: string) => {
    const { error } = await supabase.from("restaurante_pedidos").update({ mesa_id: mesaId || null }).eq("id", p.id);
    if (error) return toast.error("No se pudo asignar la mesa.");
    cargar();
  };

  const cambiarTipo = async (clave: string) => {
    if (!negocio) return;
    const { data, error } = await supabase
      .from("negocio_config")
      .update({ tipo_negocio: clave, updated_at: new Date().toISOString() })
      .eq("id", negocio.id)
      .select("id");
    if (error || !data || data.length === 0)
      return toast.error("No se pudo cambiar el tipo de negocio. Tu cuenta debe ser la del administrador.");
    toast.success("Tipo de negocio actualizado.");
    window.dispatchEvent(new Event("negocio:cambio"));
  };

  const ventasHoy = pedidos
    .filter((p) => p.estado !== "cancelado" && new Date(p.created_at).toDateString() === new Date().toDateString())
    .reduce((s, p) => s + p.total, 0);

  return (
    <div className="space-y-6">
      {!completa && (
      <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-foreground">{tipo.panel}</h1>
          <p className="text-base italic text-primary">{GUIAS_NEGOCIO[tipo.clave].frase}</p>
          <p className="text-sm text-muted-foreground">
            {tipo.usaPedidos ? `Ventas de hoy: ${dinero(ventasHoy)}` : negocio?.nombre ?? tipo.etiqueta}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <select
            aria-label="Tipo de negocio"
            value={tipo.clave}
            disabled={!negocio}
            onChange={(e) => cambiarTipo(e.target.value)}
            className="rounded-full border border-glass-border bg-glass/40 px-4 py-2 text-base text-foreground outline-none focus:border-primary/50"
          >
            {TIPOS_NEGOCIO.map((t) => (
              <option key={t.clave} value={t.clave}>
                {t.etiqueta}
              </option>
            ))}
          </select>
          {tipo.usaPedidos && (
            <Link to="/menu" target="_blank" className="inline-flex items-center gap-1.5 rounded-full border border-glass-border px-4 py-2 text-foreground">
              <ExternalLink className="h-4 w-4" /> Menú público
            </Link>
          )}
          <Link to="/instalar" className="inline-flex items-center gap-1.5 rounded-full border border-glass-border px-4 py-2 text-foreground">
            <Download className="h-4 w-4" /> Instalar app
          </Link>
        </div>
      </div>

      {tipo.clave === "concesionario" && <DashboardConcesionario />}
      {!tipo.usaPedidos && tipo.clave !== "concesionario" && <IndicadoresNegocio tipo={tipo} />}

      <GuiaRapida tipo={tipo.clave} />

      <PasoAPaso
        negocio={negocio}
        tipo={tipo}
        onAbrirNegocio={() => setVista("negocio")}
        onAbrirMenu={() => setVista("menu")}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {tipo.modulos.map(({ id, Icon, titulo, descripcion, estado, ruta }) => {
          const contenido = (
            <GlassPanel className="flex h-full items-center gap-3 p-4">
              <Icon className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{titulo}</p>
                <p className="truncate text-xs text-muted-foreground">{estado === "Activo" ? descripcion : "Próximo"}</p>
              </div>
            </GlassPanel>
          );
          return ruta && ruta !== "/restaurante" ? (
            <Link key={id} to={ruta as never}>
              {contenido}
            </Link>
          ) : (
            <div key={id}>{contenido}</div>
          );
        })}
      </div>
      </>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {vistas.map((v) => (
          <span
            key={v}
            className={`inline-flex items-center overflow-hidden rounded-full text-sm ${vista === v ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`}
          >
            <button onClick={() => setVista(v)} className={`py-2 pl-5 ${completa ? "pr-5" : "pr-2"}`}>
              {v === "venta" ? "Vender y cobrar" : v === "pedidos" ? "Pedidos y cocina" : v === "menu" ? "Menú" : v === "qr" ? "QR del menú" : v === "mesas" ? "Mesas" : v === "caja" ? "Caja" : v === "reportes" ? "Reportes" : v === "recetario" ? "Recetario e inventario" : "Mi negocio"}
            </button>
            {!completa && <BotonVentanaCompleta vista={v} className="py-2 pl-1 pr-3 opacity-80 hover:opacity-100" />}
          </span>
        ))}
      </div>

      {vista === "venta" ? (
        <VentaPOS onCambio={cargar} />
      ) : vista === "pedidos" ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {ESTADOS.map((col) => {
            const lista = pedidos.filter((p) => p.estado === col.clave);
            return (
              <div key={col.clave} className="min-w-0 space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {col.titulo} ({lista.length})
                </h2>
                {lista.map((p) => {
                  const sig = SIGUIENTE(p);
                  return (
                    <GlassPanel key={p.id} className="space-y-2 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm text-foreground">#{p.id.slice(0, 6).toUpperCase()}</span>
                        <span className="text-xs capitalize text-muted-foreground">{p.modalidad}</span>
                      </div>
                      <p className="break-words text-sm text-foreground">{p.cliente_nombre} · {p.cliente_telefono}</p>
                      {p.modalidad === "mesa" && (
                        <select
                          aria-label="Mesa del pedido"
                          value={p.mesa_id ?? ""}
                          onChange={(e) => asignarMesa(p, e.target.value)}
                          className="w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2 text-base text-foreground outline-none focus:border-primary/50"
                        >
                          <option value="">Sin mesa</option>
                          {mesas.map((m) => (
                            <option key={m.id} value={m.id}>Mesa {m.numero}</option>
                          ))}
                        </select>
                      )}
                      {p.direccion && <p className="break-words text-xs text-muted-foreground">{p.direccion}</p>}
                      <ul className="text-sm text-muted-foreground">
                        {items.filter((i) => i.pedido_id === p.id).map((i) => (
                          <li key={i.id} className="break-words">
                            {i.cantidad} × {i.nombre}
                            {leerOpciones(i.opciones).length > 0 && (
                              <span className="block pl-3 text-xs">
                                {leerOpciones(i.opciones).map((o) => `${o.grupo}: ${o.nombre}`).join(" · ")}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      {p.notas && <p className="text-xs italic text-muted-foreground">“{p.notas}”</p>}
                      <p className="text-sm font-medium text-foreground">{dinero(p.total)}</p>
                      <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span>Pago: {textoMetodo(p.metodo_pago)}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 ${p.pago_estado === "pagado" ? "bg-primary/15 text-primary" : "border border-glass-border text-muted-foreground"}`}
                        >
                          {p.pago_estado === "pagado"
                            ? "Pagado"
                            : p.metodo_pago === "efectivo"
                              ? "Por cobrar"
                              : "Sin verificar"}
                        </span>
                      </p>
                      {leerHistorial(p.historial).length > 0 && (
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer">Historial</summary>
                          <ul className="mt-1 space-y-0.5">
                            {leerHistorial(p.historial).map((e, idx) => (
                              <li key={idx} className="break-words">
                                {new Date(e.f).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })} · {e.t}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                      <div className="flex gap-2">
                        {sig && (
                          <button onClick={() => mover(p, sig.estado)} className="flex-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90">
                            {sig.texto}
                          </button>
                        )}
                        <button onClick={() => imprimirComanda(p, items.filter((i) => i.pedido_id === p.id))} className="rounded-lg border border-glass-border px-3 py-2 text-xs text-foreground">
                          Comanda
                        </button>
                        {p.estado !== "entregado" && p.estado !== "cancelado" && (
                          <button onClick={() => cobrar(p)} className="rounded-lg border border-primary px-3 py-2 text-xs text-primary">
                            {p.metodo_pago === "efectivo" ? "Cobrar" : "Verificar pago y cobrar"}
                          </button>
                        )}
                        {p.estado !== "entregado" && p.estado !== "cancelado" && (
                          <button onClick={() => mover(p, "cancelado")} className="rounded-lg border border-glass-border px-3 py-2 text-xs text-muted-foreground">
                            Cancelar
                          </button>
                        )}
                      </div>
                    </GlassPanel>
                  );
                })}
                {lista.length === 0 && <p className="text-xs text-muted-foreground/70">Sin pedidos</p>}
              </div>
            );
          })}
        </div>
      ) : vista === "menu" ? (
        <GestionMenu />
      ) : vista === "qr" ? (
        <MenuQR />
      ) : vista === "mesas" ? (
        <MesasPanel />
      ) : vista === "caja" ? (
        <CajaPanel />
      ) : vista === "reportes" ? (
        <Reportes />
      ) : vista === "recetario" ? (
        <RecetarioInventario />
      ) : (
        <NegocioConfig />
      )}
    </div>
  );
}

function GestionMenu() {
  const { negocio: negocioActual } = useNegocio();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio, setPrecio] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [nuevaCategoria, setNuevaCategoria] = useState("");
  const [fotoNueva, setFotoNueva] = useState("");

  const cargar = useCallback(async () => {
    const [c, p] = await Promise.all([
      supabase.from("restaurante_categorias").select("*").order("orden"),
      supabase.from("restaurante_productos").select("*").order("nombre"),
    ]);
    setCategorias((c.data ?? []).filter((x) => mismoTipoNegocio(x.tipo_negocio, negocioActual?.tipo_negocio)));
    setProductos((p.data ?? []).filter((x) => mismoTipoNegocio(x.tipo_negocio, negocioActual?.tipo_negocio)));
  }, [negocioActual?.tipo_negocio]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const subirFoto = async (archivo: File | undefined, destino: "nuevo" | Producto) => {
    if (!archivo) return;
    if (!archivo.type.startsWith("image/")) return toast.error("Elige un archivo de imagen.");
    if (archivo.size > 3 * 1024 * 1024) return toast.error("La foto debe pesar menos de 3 MB.");
    const ext = (archivo.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const { data: negocioId } = await supabase.rpc("mi_negocio_id");
    if (!negocioId) return toast.error("No se pudo identificar tu negocio.");
    const ruta = `${negocioId}/producto-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("negocios").upload(ruta, archivo, { upsert: true });
    if (error) return toast.error("No se pudo subir la foto.");
    const url = supabase.storage.from("negocios").getPublicUrl(ruta).data.publicUrl;
    if (destino === "nuevo") {
      setFotoNueva(url);
      return;
    }
    const { error: e2 } = await supabase.from("restaurante_productos").update({ imagen_url: url }).eq("id", destino.id);
    if (e2) return toast.error("No se pudo guardar la foto.");
    toast.success("Foto actualizada.");
    cargar();
  };

  const agregar = async () => {
    const valor = Number(precio);
    if (!nombre.trim() || !Number.isFinite(valor) || valor < 0) return toast.error("Escribe nombre y precio válidos.");
    const { error } = await supabase.from("restaurante_productos").insert({
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || null,
      precio: valor,
      categoria_id: categoriaId || null,
      imagen_url: fotoNueva || null,
      activo: true,
    });
    if (error) return toast.error("No se pudo guardar el producto.");
    setFotoNueva("");
    setNombre("");
    setDescripcion("");
    setPrecio("");
    cargar();
  };

  const agregarCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    const { error } = await supabase
      .from("restaurante_categorias")
      .insert({ nombre: nuevaCategoria.trim(), orden: categorias.length + 1 });
    if (error) return toast.error("No se pudo crear la categoría.");
    setNuevaCategoria("");
    cargar();
  };

  const alternar = async (p: Producto) => {
    const { data, error } = await supabase
      .from("restaurante_productos")
      .update({ activo: !p.activo })
      .eq("id", p.id)
      .select("id");
    if (error || !data || data.length === 0) return toast.error("No se pudo cambiar el producto. Tu cuenta debe ser la del administrador.");
    window.dispatchEvent(new Event("menu:cambio"));
    cargar();
  };

  const eliminar = async (p: Producto) => {
    if (!window.confirm(`¿Eliminar "${p.nombre}" del menú? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("restaurante_productos").delete().eq("id", p.id);
    if (error) return toast.error("No se pudo eliminar el producto.");
    toast.success("Producto eliminado.");
    cargar();
  };

  const eliminarCategoria = async (c: Categoria) => {
    if (!window.confirm(`¿Eliminar la categoría "${c.nombre}"? Sus productos quedarán sin categoría.`)) return;
    const { error } = await supabase.from("restaurante_categorias").delete().eq("id", c.id);
    if (error) return toast.error("No se pudo eliminar la categoría.");
    toast.success("Categoría eliminada.");
    cargar();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <div className="space-y-4">
        <GlassPanel className="space-y-3 p-5">
          <h2 className="font-medium text-foreground">Nuevo producto</h2>
          <input className={campo} placeholder="Nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <input className={campo} placeholder="Descripción" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
          <input className={campo} placeholder="Precio" inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} />
          <select className={campo} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Sin categoría</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Foto del producto (opcional)</span>
            {fotoNueva ? <img src={fotoNueva} alt="Foto nueva" className="h-20 w-28 rounded-lg object-cover" /> : null}
            <input type="file" accept="image/*" className={campo} onChange={(e) => subirFoto(e.target.files?.[0], "nuevo")} />
          </div>
          <button onClick={agregar} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90">
            Agregar al menú
          </button>
        </GlassPanel>
        <GlassPanel className="space-y-3 p-5">
          <h2 className="font-medium text-foreground">Nueva categoría</h2>
          <input className={campo} placeholder="Ej. Postres" value={nuevaCategoria} onChange={(e) => setNuevaCategoria(e.target.value)} />
          <button onClick={agregarCategoria} className="w-full rounded-lg border border-glass-border px-4 py-2.5 text-sm text-foreground">
            Crear categoría
          </button>
          {categorias.length > 0 && (
            <div className="space-y-1 border-t border-glass-border pt-3">
              {categorias.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 text-sm text-foreground">
                  <span className="min-w-0 truncate">{c.nombre}</span>
                  <button aria-label={`Eliminar categoría ${c.nombre}`} onClick={() => eliminarCategoria(c)} className="shrink-0 p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </GlassPanel>
      </div>

      <div className="space-y-2">
        {productos.map((p) => (
          <div key={p.id} className="space-y-1">
          <GlassPanel className="flex items-center gap-3 p-4">
            {p.imagen_url ? (
              <img src={p.imagen_url} alt={p.nombre} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
            ) : null}
            <label className="shrink-0 cursor-pointer rounded-full border border-glass-border px-3 py-1.5 text-xs text-foreground">
              {p.imagen_url ? "Cambiar foto" : "Subir foto"}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => subirFoto(e.target.files?.[0], p)} />
            </label>
            <div className="min-w-0 flex-1">
              <p className={`truncate text-sm font-medium ${p.activo ? "text-foreground" : "text-muted-foreground line-through"}`}>{p.nombre}</p>
              <p className="text-xs text-muted-foreground">
                {categorias.find((c) => c.id === p.categoria_id)?.nombre ?? "Sin categoría"} · {dinero(p.precio)}
              </p>
            </div>
            <button onClick={() => alternar(p)} className="shrink-0 rounded-full border border-glass-border px-3 py-1.5 text-xs text-foreground">
              {p.activo ? "Ocultar" : "Mostrar"}
            </button>
            <button aria-label={`Eliminar ${p.nombre}`} onClick={() => eliminar(p)} className="shrink-0 p-1 text-muted-foreground hover:text-destructive">
              <Trash2 className="h-4 w-4" />
            </button>
          </GlassPanel>
          <OpcionesProducto productoId={p.id} />
          </div>
        ))}
      </div>
    </div>
  );
}
