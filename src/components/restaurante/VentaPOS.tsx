import { useCallback, useEffect, useMemo, useState } from "react";
import { Armchair, Bike, ChefHat, ImageOff, LayoutGrid, List, MessageCircle, Minus, Plus, Printer, ScanBarcode, ShoppingBag, Sparkles, Trash2, Wallet, X } from "lucide-react";
import { VistaProducto, type SeleccionProducto } from "@/components/restaurante/VistaProducto";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { TARIFAS_DOMICILIO, buscarTarifa } from "@/lib/tarifas-domicilio";
import { escaparHtml } from "@/lib/exportes";
import { LIMITES, limpiarTexto } from "@/lib/validacion-publica";
import { useNegocio } from "@/hooks/use-negocio";
import { useBarcodeScanner } from "@/hooks/use-barcode-scanner";
import { descontarStockOffline, evitarSubmitConEnter, generarEAN13, reproducirBeep, stockEfectivoOffline } from "@/lib/escaner-barras";
import { mismoTipoNegocio } from "@/lib/modulos-negocio";
import { autoComandaActivada, estadoApiLocal, fijarImpresionDirecta, impresionDirectaActivada, imprimirComandaCocina, imprimirTirillaLocal, leerImpresoraCaja } from "@/lib/impresion-local";

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

type Recibo = {
  id: string;
  numero: number | null;
  cliente: string;
  telefono: string;
  modalidad: string;
  mesa: string;
  direccion: string;
  barrio: string;
  notas: string;
  lineas: { nombre: string; cant: number; precio: number }[];
  envio: number;
  total: number;
  metodo: string;
  cobrado: boolean;
};

const soloDigitos = (t: string) => t.replace(/\D/g, "");
/** Deja el número listo para wa.me: si trae 10 dígitos (Colombia) le agrega el 57. */
const numeroWa = (t: string) => {
  const d = soloDigitos(t);
  return d.length === 10 ? `57${d}` : d;
};
const WA_NEGOCIO = "3052095232";
/** Abre WhatsApp Web siempre en la misma pestaña, para dejarlo abierto mientras se trabaja. */
const abrirWa = (tel: string, texto: string) =>
  window.open(`https://web.whatsapp.com/send?phone=${numeroWa(tel)}&text=${encodeURIComponent(texto)}`, "whatsapp_web");

const textoComanda = (r: Recibo, nombreNegocio: string, paraCocina: boolean) => {
  const lineas = r.lineas.map((l) => `${l.cant} x ${l.nombre}${paraCocina ? "" : ` - ${dinero(l.precio * l.cant)}`}`).join("\n");
  const donde =
    r.modalidad === "mesa" ? (r.mesa ? `Mesa ${r.mesa}` : "Mesa") : r.modalidad === "recoger" ? "Para llevar" : "Domicilio";
  return [
    `*${paraCocina ? "COMANDA" : "PEDIDO"} #${r.id.slice(0, 6).toUpperCase()}* - ${nombreNegocio}`,
    `${donde} | ${r.cobrado ? "Cobrado" : "Pendiente de cobro"}`,
    "",
    lineas,
    r.notas ? `\nNotas: ${r.notas}` : "",
    "",
    `Cliente: ${r.cliente}${r.telefono ? ` (${r.telefono})` : ""}`,
    r.modalidad === "domicilio" ? `Dirección: ${r.direccion}${r.barrio ? ` - ${r.barrio}` : ""}` : "",
    r.envio > 0 ? `Domicilio: ${dinero(r.envio)}` : "",
    `*Total: ${dinero(r.total)}*`,
  ]
    .filter((x, i, a) => x !== "" || (i > 0 && a[i - 1] !== ""))
    .join("\n");
};

const imprimirTicket = (r: Recibo, nombreNegocio: string) => {
  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) return toast.error("El navegador bloqueó la ventana de impresión. Permite las ventanas emergentes.");
  const esc = escaparHtml;
  const filas = r.lineas
    .map((l) => `<tr><td>${l.cant} x ${esc(l.nombre)}</td><td style="text-align:right">${dinero(l.precio * l.cant)}</td></tr>`)
    .join("");
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Ticket</title>
<style>@page{size:80mm auto;margin:4mm}body{font-family:monospace;font-size:13px;width:72mm;margin:0}h1{font-size:16px;text-align:center;margin:0 0 4px}
table{width:100%;border-collapse:collapse}td{padding:2px 0;vertical-align:top}hr{border:0;border-top:1px dashed #000;margin:6px 0}.c{text-align:center}</style></head><body>
<h1>${esc(nombreNegocio)}</h1><p class="c">Pedido #${r.id.slice(0, 6).toUpperCase()}<br>${new Date().toLocaleString("es-CO")}</p><hr>
<p>${r.modalidad === "mesa" ? (r.mesa ? `Mesa ${esc(r.mesa)}` : "Mesa") : r.modalidad === "recoger" ? "Para llevar" : "Domicilio"}<br>Cliente: ${esc(r.cliente)}${r.telefono ? `<br>Tel: ${esc(r.telefono)}` : ""}${r.modalidad === "domicilio" ? `<br>${esc(r.direccion)} ${esc(r.barrio)}` : ""}</p><hr>
<table>${filas}${r.envio > 0 ? `<tr><td>Domicilio</td><td style="text-align:right">${dinero(r.envio)}</td></tr>` : ""}</table><hr>
<table><tr><td><b>TOTAL</b></td><td style="text-align:right"><b>${dinero(r.total)}</b></td></tr></table>
<p class="c">${r.cobrado ? `Pagado (${esc(r.metodo)})` : "Pendiente de cobro"}</p>${r.notas ? `<p>Notas: ${esc(r.notas)}</p>` : ""}<p class="c">¡Gracias por tu compra!</p>
<script>window.onload=function(){window.print()}</script></body></html>`);
  w.document.close();
};

/** Pantalla de venta: eliges productos, armas la cuenta, la envías a cocina y la cobras. */
export function VentaPOS({ onCambio }: { onCambio?: () => void }) {
  const { negocio, recargar } = useNegocio();
  const [recibo, setRecibo] = useState<Recibo | null>(null);
  const [numCocina, setNumCocina] = useState("");
  const nombreNegocio = negocio?.nombre ?? "Mi negocio";
  useEffect(() => {
    setNumCocina(negocio?.whatsapp_cocina || negocio?.telefono_pedidos || "");
  }, [negocio?.whatsapp_cocina, negocio?.telefono_pedidos]);
  const [ivaTexto, setIvaTexto] = useState("0");
  useEffect(() => {
    setIvaTexto(String(negocio?.iva_porcentaje ?? 0));
  }, [negocio?.iva_porcentaje]);

  const guardarIva = async () => {
    if (!negocio) return;
    const pct = Number(ivaTexto.replace(",", "."));
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) return toast.error("El IVA debe estar entre 0 y 100.");
    const { error } = await supabase.from("negocio_config").update({ iva_porcentaje: pct }).eq("id", negocio.id);
    if (error) return toast.error("No se pudo guardar el IVA.");
    toast.success("IVA guardado.");
    recargar();
  };

  const guardarNumCocina = async () => {
    if (!negocio) return;
    const { error } = await supabase.from("negocio_config").update({ whatsapp_cocina: numCocina.trim() || null }).eq("id", negocio.id);
    if (error) return toast.error("No se pudo guardar el número de cocina.");
    toast.success("Número de cocina guardado.");
    recargar();
  };
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [mesas, setMesas] = useState<Mesa[]>([]);
  const [catActiva, setCatActiva] = useState("todas");
  const [busqueda, setBusqueda] = useState("");
  const [cuenta, setCuenta] = useState<Record<string, number>>({});
  const [vista, setVista] = useState<"mosaico" | "lista">("mosaico");
  const [abierto, setAbierto] = useState<Producto | null>(null);
  const [detalle, setDetalle] = useState<Record<string, { extra: number; texto: string }>>({});
  const [modalidad, setModalidad] = useState<"mesa" | "recoger" | "domicilio">("mesa");
  const [mesaId, setMesaId] = useState("");
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [notas, setNotas] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [recibido, setRecibido] = useState("");
  const [personas, setPersonas] = useState("1");
  const [guardando, setGuardando] = useState(false);
  const [directa, setDirecta] = useState(() => impresionDirectaActivada());
  const [apiMsg, setApiMsg] = useState("");

  const imprimirDirectoOSilencioso = async (r: Recibo) => {
    if (directa) {
      const ok = await imprimirTirillaLocal({
        negocio: nombreNegocio, numero: r.numero != null ? String(r.numero) : r.id.slice(0, 6).toUpperCase(),
        cliente: r.cliente, items: r.lineas.map((l) => ({ descripcion: l.nombre, cantidad: l.cant, precio: l.precio })),
        subtotal: r.total - r.envio, total: r.total, metodo: r.metodo, formato: "80mm",
        impresora: leerImpresoraCaja() || undefined,
      });
      if (ok) return;
      // Sin API local (celular): impresión normal, sin error.
    }
    imprimirTicket(r, nombreNegocio);
  };

  const imprimirComandaSinConfirmar = async (r: Recibo) => {
    // La comanda sale sola en la impresora de cocina, sin preguntar ni abrir diálogos.
    if (!directa || !autoComandaActivada()) return;
    await imprimirComandaCocina({
      negocio: nombreNegocio,
      numero: r.numero != null ? String(r.numero) : r.id.slice(0, 6).toUpperCase(),
      cliente: r.cliente, telefono: r.telefono, modalidad: r.modalidad,
      mesa: r.mesa, direccion: r.direccion, barrio: r.barrio, notas: r.notas,
      canal: "Mostrador",
      items: r.lineas.map((l) => ({ nombre: l.nombre, cantidad: l.cant })),
      formato: "80mm",
    });
  };

  const probarImpresora = async () => {
    setApiMsg("Buscando impresora…");
    const est = await estadoApiLocal();
    if (!est.disponible) {
      setApiMsg("La API local no está corriendo aquí (celular/navegador). Se usa la impresión normal.");
      return;
    }
    const ok = await imprimirTirillaLocal({ negocio: nombreNegocio, numero: "PRUEBA", cliente: "Prueba", items: [{ descripcion: "Tirilla de prueba", cantidad: 1, precio: 1000 }], total: 1000, formato: "80mm", impresora: leerImpresoraCaja() || undefined });
    setApiMsg(ok ? `Impreso en ${leerImpresoraCaja() || est.predeterminada || "la de caja"}.` : "No se pudo imprimir. Revisa la impresora de caja en Windows.");
  };
  const [zonaManual, setZonaManual] = useState("");
  const [correo, setCorreo] = useState("");
  const [crearCodigo, setCrearCodigo] = useState<string | null>(null);
  const [tickOffline, setTickOffline] = useState(0);

  const permitirNegativo = Boolean(negocio?.permitir_inventario_negativo);
  const stockDisponible = useCallback(
    (p: Producto): number | null => {
      void tickOffline;
      if (typeof p.stock_actual !== "number") return null;
      return stockEfectivoOffline("restaurante_productos", p.id, p.stock_actual, permitirNegativo);
    },
    [permitirNegativo, tickOffline],
  );

  const cargar = useCallback(async () => {
    const [c, p, m] = await Promise.all([
      supabase.from("restaurante_categorias").select("*").order("orden"),
      supabase.from("restaurante_productos").select("*").eq("activo", true).order("nombre"),
      supabase.from("restaurante_mesas").select("*").order("numero"),
    ]);
    const tipoActual = negocio?.tipo_negocio;
    setCategorias((c.data ?? []).filter((x) => mismoTipoNegocio(x.tipo_negocio, tipoActual)));
    setProductos((p.data ?? []).filter((x) => x.activo === true && mismoTipoNegocio(x.tipo_negocio, tipoActual)));
    setMesas(m.data ?? []);
  }, [negocio?.tipo_negocio]);

  useEffect(() => {
    cargar();
    // Mantiene el mosaico al día si ocultas o creas productos desde otra ventana.
    const t = setInterval(cargar, 15000);
    const alVolver = () => {
      cargar();
    };
    window.addEventListener("focus", alVolver);
    window.addEventListener("menu:cambio", alVolver);
    window.addEventListener("sin-conexion:sincronizado", alVolver);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", alVolver);
      window.removeEventListener("menu:cambio", alVolver);
      window.removeEventListener("sin-conexion:sincronizado", alVolver);
    };
  }, [cargar]);

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return productos.filter(
      (p) =>
        (catActiva === "todas" || p.categoria_id === catActiva) &&
        (!q || p.nombre.toLowerCase().includes(q) || (p.codigo_barras ?? "").toLowerCase().includes(q)),
    );
  }, [productos, catActiva, busqueda]);

  const lineas = productos
    .filter((p) => (cuenta[p.id] ?? 0) > 0)
    .map((p) => ({ p, cant: cuenta[p.id], precio: p.precio + (detalle[p.id]?.extra ?? 0) }));
  const subtotal = lineas.reduce((s, l) => s + l.precio * l.cant, 0);
  const notasFinal = limpiarTexto(
    [limpiarTexto(notas, LIMITES.notas), ...lineas.map((l) => limpiarTexto(detalle[l.p.id]?.texto ?? "", LIMITES.nota_linea))]
      .filter((x) => x !== "")
      .join(" · "),
    LIMITES.notas,
  );

  const agregarDesdeVista = (p: Producto, sel: SeleccionProducto) => {
    const disp = stockDisponible(p);
    const actual = cuenta[p.id] ?? 0;
    if (disp !== null && !permitirNegativo && actual + sel.cantidad > disp) {
      reproducirBeep("error");
      toast.error(`Sin existencias para ${p.nombre}`);
      return;
    }
    setDetalle((d) => ({ ...d, [p.id]: { extra: sel.extraUnidad, texto: sel.texto } }));
    setCuenta((c) => ({ ...c, [p.id]: Math.min(100, (c[p.id] ?? 0) + sel.cantidad) }));
    setAbierto(null);
    toast.success(`${p.nombre} agregado a la cuenta.`);
  };
  const tarifaDetectada = useMemo(() => buscarTarifa(direccion), [direccion]);
  const tarifa =
    modalidad !== "domicilio"
      ? null
      : zonaManual
        ? (TARIFAS_DOMICILIO.find((x) => x.nombre === zonaManual) ?? null)
        : tarifaDetectada;
  const envio = tarifa ? tarifa.precio : 0;
  const total = subtotal + envio;
  const ivaPct = negocio?.iva_porcentaje ?? 0;
  const ivaIncluido = ivaPct > 0 ? total - total / (1 + ivaPct / 100) : 0;
  const cambio = Number(recibido) > total ? Number(recibido) - total : 0;
  const numPersonas = Math.min(50, Math.max(1, Math.floor(Number(personas) || 1)));
  const porPersona = Math.ceil(total / numPersonas);

  const cambiarCant = useCallback(
    (id: string, delta: number, conSonido = false): boolean => {
      const prod = productos.find((x) => x.id === id);
      if (prod && delta > 0) {
        const disp = stockDisponible(prod);
        const actual = cuenta[id] ?? 0;
        if (disp !== null && !permitirNegativo && (disp <= 0 || actual + delta > disp)) {
          if (conSonido) reproducirBeep("error");
          toast.error(`Sin existencias para ${prod.nombre}`);
          return false;
        }
      }
      setCuenta((c) => {
        const nuevo = Math.max(0, Math.min(100, (c[id] ?? 0) + delta));
        const copia = { ...c };
        if (nuevo === 0) delete copia[id];
        else copia[id] = nuevo;
        return copia;
      });
      if (conSonido && prod) {
        reproducirBeep("ok");
        toast.success(`${prod.nombre} (+1)`);
      }
      return true;
    },
    [cuenta, permitirNegativo, productos, stockDisponible],
  );

  const procesarCodigoEscaneado = useCallback(
    (raw: string) => {
      const q = raw.trim();
      if (!q) return;
      const ql = q.toLowerCase();
      const exacto = productos.find((p) => (p.codigo_barras ?? "").trim() === q);
      const porNombre = productos.filter((p) => p.nombre.toLowerCase().includes(ql));
      const encontrado = exacto ?? (porNombre.length === 1 ? porNombre[0] : undefined);
      if (encontrado) {
        cambiarCant(encontrado.id, 1, true);
        setBusqueda("");
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
        setBusqueda("");
      }
    },
    [cambiarCant, productos],
  );

  useBarcodeScanner({
    activo: !abierto && !crearCodigo,
    onScan: (c) => procesarCodigoEscaneado(c),
  });

  const limpiar = () => {
    setCuenta({});
    setDetalle({});
    setCliente("");
    setTelefono("");
    setDireccion("");
    setNotas("");
    setRecibido("");
    setMesaId("");
    setZonaManual("");
    setCorreo("");
  };

  const registrar = async (cobrar: boolean) => {
    if (lineas.length === 0) return toast.error("Agrega al menos un producto a la cuenta.");
    if (modalidad === "domicilio") {
      if (!cliente.trim()) return toast.error("Escribe el nombre del cliente.");
      if (telefono.replace(/\D/g, "").length < 7) return toast.error("Escribe el celular del cliente.");
      if (!tarifa) return toast.error("Elige el barrio de entrega para cobrar el domicilio.");
      if (!direccion.trim()) return toast.error("Escribe la dirección de entrega.");
      if (correo.trim() && !/^\S+@\S+\.\S+$/.test(correo.trim())) return toast.error("El correo electrónico no es válido.");
    }
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
        barrio: modalidad === "domicilio" && tarifa ? tarifa.nombre : null,
        cliente_email: modalidad === "domicilio" && correo.trim() ? correo.trim().slice(0, 160) : null,
        notas: notasFinal || null,
        canal: "mostrador",
        estado: "nuevo",
        metodo_pago: metodo,
        pago_estado: cobrar ? "pagado" : "pendiente",
        historial: [
          { f: new Date().toISOString(), t: `Pedido creado en mostrador · ${METODOS.find((m) => m.clave === metodo)?.texto ?? metodo}${cobrar ? " · cobrado" : ""}` },
        ],
        total,
      })
      .select("id, numero_factura")
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
      precio_unitario: l.precio,
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
    // Descuenta del inventario los insumos de las recetas y el stock directo de los productos vendidos (queda en el kardex).
    const { data: bajos } = await supabase.rpc("descontar_insumos_pedido", { p_pedido: pedido.id });
    await supabase.rpc("descontar_stock_productos_pedido", { p_pedido: pedido.id });
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      descontarStockOffline(
        "restaurante_productos",
        lineas
          .filter((l) => typeof l.p.stock_actual === "number")
          .map((l) => ({ productoId: l.p.id, cantidad: l.cant })),
      );
      setTickOffline((n) => n + 1);
    }
    if (typeof bajos === "number" && bajos > 0) {
      toast.warning(`${bajos} ${bajos === 1 ? "insumo está" : "insumos están"} en o bajo el stock mínimo. Revisa el recetario.`);
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
    const reciboNuevo: Recibo = {
      id: pedido.id,
      numero: pedido.numero_factura ?? null,
      cliente: nombre,
      telefono: telefono.trim(),
      modalidad,
      mesa: mesa ? String(mesa.numero) : "",
      direccion: direccion.trim(),
      barrio: tarifa?.nombre ?? "",
      notas: notasFinal,
      lineas: lineas.map((l) => ({ nombre: l.p.nombre, cant: l.cant, precio: l.precio })),
      envio,
      total,
      metodo: METODOS.find((m) => m.clave === metodo)?.texto ?? metodo,
      cobrado: cobrar,
    };
    // La comanda entra sola a cocina (POS, mesas y WhatsApp): sin confirmación.
    void imprimirComandaSinConfirmar(reciboNuevo);
    setRecibo(reciboNuevo);
    limpiar();
    void cargar();
    onCambio?.();
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(380px,26rem)]">
      <div className="min-w-0 space-y-4">
        <div className="relative">
          <ScanBarcode className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <input
            className={`${campo} rounded-2xl py-3.5 pl-12 shadow-sm`}
            placeholder="Escanea código de barras o busca producto..."
            value={busqueda}
            autoComplete="off"
            onChange={(e) => setBusqueda(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                procesarCodigoEscaneado(busqueda);
              }
            }}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 text-sm">
          {[{ id: "todas", nombre: "Todos" }, ...categorias].map((c) => (
            <button
              key={c.id}
              onClick={() => setCatActiva(c.id)}
              className={`shrink-0 rounded-full px-5 py-2.5 text-sm font-medium transition ${catActiva === c.id ? "bg-primary text-primary-foreground shadow-md" : "border border-glass-border bg-glass-strong text-foreground/80 hover:text-foreground"}`}
            >
              {c.nombre}
            </button>
          ))}
        </div>
        {productos.length === 0 && (
          <p className="text-sm text-muted-foreground">Aún no tienes productos. Agrégalos en la pestaña “Menú”.</p>
        )}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{visibles.length} productos · toca uno para ver foto grande y opciones</p>
          <div className="inline-flex rounded-xl border border-glass-border p-0.5" role="group" aria-label="Tipo de vista">
            <button
              type="button"
              onClick={() => setVista("mosaico")}
              aria-pressed={vista === "mosaico"}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${vista === "mosaico" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="h-4 w-4" /> Mosaico
            </button>
            <button
              type="button"
              onClick={() => setVista("lista")}
              aria-pressed={vista === "lista"}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ${vista === "lista" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              <List className="h-4 w-4" /> Lista
            </button>
          </div>
        </div>
        <div className={vista === "mosaico" ? "grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5" : "space-y-2"}>
          {visibles.map((p) => {
            const cant = cuenta[p.id] ?? 0;
            const anillo = cant > 0 ? "ring-2 ring-primary" : "";
            if (vista === "lista") {
              return (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setAbierto(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setAbierto(p);
                  }}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border border-glass-border bg-glass/40 p-2.5 transition hover:border-primary/40 ${anillo}`}
                >
                  <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {p.imagen_url ? (
                      <img src={p.imagen_url} alt={p.nombre} loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-muted-foreground/50"><ImageOff className="h-6 w-6" /></span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-semibold text-foreground">{p.nombre}</span>
                    <span className="precio-esmeralda block text-sm font-semibold">{dinero(p.precio)}</span>
                  </span>
                  {cant > 0 && <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">{cant}</span>}
                  <button
                    type="button"
                    aria-label={`Agregar ${p.nombre}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      cambiarCant(p.id, 1);
                    }}
                    className="rounded-full border border-glass-border p-2 text-foreground"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              );
            }
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => setAbierto(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setAbierto(p);
                }}
                className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-glass-border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] ${anillo}`}
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                  {p.imagen_url ? (
                    <img src={p.imagen_url} alt={p.nombre} loading="lazy" className="h-full w-full max-w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-muted-foreground/50">
                      <ImageOff className="h-10 w-10" />
                    </span>
                  )}
                  <span className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${stockDisponible(p) !== null && (stockDisponible(p) ?? 0) <= 0 ? "bg-destructive text-destructive-foreground" : "bg-black/60 text-white"}`}>
                    {stockDisponible(p) === null
                      ? "Disponible"
                      : (stockDisponible(p) ?? 0) <= 0
                        ? "Agotado"
                        : `Stock: ${Math.round((stockDisponible(p) ?? 0) * 100) / 100}`}
                  </span>
                  {cant > 0 && (
                    <span className="absolute right-2 top-2 rounded-full bg-primary px-2.5 py-0.5 text-sm font-semibold text-primary-foreground shadow">{cant}</span>
                  )}
                  <button
                    type="button"
                    aria-label={`Agregar ${p.nombre} rápido`}
                    onClick={(e) => {
                      e.stopPropagation();
                      cambiarCant(p.id, 1);
                    }}
                    className="absolute bottom-2 right-2 rounded-full bg-primary p-2 text-primary-foreground shadow-lg"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="p-3">
                  <span className="block break-words text-sm font-semibold leading-tight text-foreground">{p.nombre}</span>
                  <span className="precio-esmeralda mt-1 block text-base font-semibold">{dinero(p.precio)}</span>
                </div>
              </div>
            );
          })}
        </div>
        {abierto && (
          <VistaProducto
            producto={abierto}
            onCerrar={() => setAbierto(null)}
            onAgregar={(sel) => agregarDesdeVista(abierto, sel)}
          />
        )}
        {crearCodigo !== null && (
          <ModalCrearProductoRapidoPOS
            codigoInicial={crearCodigo}
            categorias={categorias}
            onCerrar={() => setCrearCodigo(null)}
            onCreado={async (nuevoProd) => {
              setCrearCodigo(null);
              await cargar();
              window.dispatchEvent(new Event("menu:cambio"));
              setCuenta((c) => ({ ...c, [nuevoProd.id]: (c[nuevoProd.id] ?? 0) + 1 }));
              reproducirBeep("ok");
              toast.success(`${nuevoProd.nombre} (+1)`);
            }}
          />
        )}
      </div>

      <GlassPanel className="h-fit space-y-3 p-5 shadow-lg lg:sticky lg:top-20">
        {recibo && (
          <div className="space-y-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                Factura #{recibo.numero ?? recibo.id.slice(0, 6).toUpperCase()} {recibo.cobrado ? "cobrado" : "en cocina"} · {dinero(recibo.total)}
              </p>
              <button aria-label="Cerrar" onClick={() => setRecibo(null)} className="text-muted-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => {
                  if (soloDigitos(numCocina).length < 7) return toast.error("Escribe abajo el WhatsApp de la cocina.");
                  abrirWa(numCocina, textoComanda(recibo, nombreNegocio, true));
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-2 py-2.5 font-medium text-primary-foreground"
              >
                <MessageCircle className="h-4 w-4" /> Comanda a cocina
              </button>
              <button
                onClick={() => void imprimirDirectoOSilencioso(recibo)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-glass-border px-2 py-2.5 text-foreground"
              >
                <Printer className="h-4 w-4" /> Imprimir
              </button>
              <button
                onClick={() => {
                  abrirWa(WA_NEGOCIO, textoComanda(recibo, nombreNegocio, false));
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-glass-border px-2 py-2.5 text-foreground"
              >
                <MessageCircle className="h-4 w-4" /> Registro al negocio
              </button>
              <button
                onClick={() => {
                  if (soloDigitos(recibo.telefono).length < 7) return toast.error("Este pedido no tiene celular del cliente.");
                  const msg = `Hola ${recibo.cliente}, tomamos tu pedido en ${nombreNegocio}.\n\n${textoComanda(recibo, nombreNegocio, false)}\n\n¡Gracias por elegirnos!`;
                  abrirWa(recibo.telefono, msg);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-glass-border px-2 py-2.5 text-foreground"
              >
                <MessageCircle className="h-4 w-4" /> Cliente: pedido tomado
              </button>
              <button
                onClick={() => {
                  if (soloDigitos(recibo.telefono).length < 7) return toast.error("Este pedido no tiene celular del cliente.");
                  abrirWa(recibo.telefono, `Hola ${recibo.cliente}, tu pedido #${recibo.id.slice(0, 6).toUpperCase()} ya entró a cocina y lo estamos preparando. Te avisamos cuando esté listo.`);
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-glass-border px-2 py-2.5 text-foreground"
              >
                <ChefHat className="h-4 w-4" /> Cliente: en cocina
              </button>
            </div>
            <div className="flex gap-2">
              <input
                className={`${campo} py-2`}
                inputMode="tel"
                placeholder="WhatsApp de la cocina"
                value={numCocina}
                onChange={(e) => setNumCocina(e.target.value)}
              />
              <button onClick={guardarNumCocina} className="shrink-0 rounded-lg border border-glass-border px-3 text-xs text-foreground">
                Guardar
              </button>
            </div>
          </div>
        )}
        <h2 className="font-medium text-foreground">Cuenta actual</h2>
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-glass-border bg-glass/40 px-3 py-2">
          <label className="flex cursor-pointer items-center gap-2 text-xs">
            <input type="checkbox" checked={directa} onChange={(e) => { setDirecta(e.target.checked); fijarImpresionDirecta(e.target.checked); }} className="h-4 w-4 accent-primary" />
            Impresión directa (caja y cocina)
          </label>
          <button type="button" onClick={() => void probarImpresora()} className="text-xs text-primary hover:underline">Probar impresora</button>
        </div>
        {apiMsg && <p className="text-xs text-muted-foreground">{apiMsg}</p>}
        <div className="grid grid-cols-3 gap-2">
          {MODALIDADES.map(({ clave, texto, Icon }) => (
            <button
              key={clave}
              onClick={() => setModalidad(clave)}
              className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs ${modalidad === clave ? "bg-primary text-primary-foreground" : "border border-glass-border bg-glass-strong text-foreground/80"}`}
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
        <input className={campo} placeholder={modalidad === "domicilio" ? "Nombre del cliente *" : "Nombre del cliente (opcional)"} value={cliente} onChange={(e) => setCliente(e.target.value)} />
        {modalidad !== "mesa" && (
          <input className={campo} placeholder={modalidad === "domicilio" ? "Celular *" : "Teléfono"} inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        )}
        {modalidad === "domicilio" && (
          <>
            <input className={campo} placeholder="Dirección de entrega *" value={direccion} onChange={(e) => setDireccion(e.target.value)} />
            <select className={campo} value={zonaManual} onChange={(e) => setZonaManual(e.target.value)} aria-label="Barrio de entrega">
              <option value="">
                {tarifaDetectada ? `Barrio detectado: ${tarifaDetectada.nombre} (${dinero(tarifaDetectada.precio)})` : "Barrio de entrega *"}
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
            <input className={campo} type="email" placeholder="Correo electrónico (opcional)" value={correo} onChange={(e) => setCorreo(e.target.value)} />
          </>
        )}

        <div className="space-y-2">
          {lineas.length === 0 && <p className="text-xs text-muted-foreground">Toca un producto para agregarlo.</p>}
          {lineas.map(({ p, cant, precio }) => (
            <div key={p.id} className="flex items-center gap-2 text-sm">
              <span className="min-w-0 flex-1 break-words text-foreground">{p.nombre}</span>
              <button aria-label="Quitar uno" onClick={() => cambiarCant(p.id, -1)} className="rounded-full border border-glass-border p-1 text-foreground">
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-6 text-center text-foreground">{cant}</span>
              <button aria-label="Agregar uno" onClick={() => cambiarCant(p.id, 1)} className="rounded-full border border-glass-border p-1 text-foreground">
                <Plus className="h-3.5 w-3.5" />
              </button>
              <span className="w-20 text-right text-foreground">{dinero(precio * cant)}</span>
              <button aria-label="Eliminar" onClick={() => cambiarCant(p.id, -cant)} className="text-muted-foreground">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <textarea className={campo} rows={2} placeholder="Notas (opcional): sin cebolla, indicaciones de entrega..." value={notas} onChange={(e) => setNotas(e.target.value)} />

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
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">IVA incluido en los precios ({ivaPct}%)</span>
          <span className="flex items-center gap-2">
            <span className="text-foreground">{dinero(ivaIncluido)}</span>
            <input
              aria-label="Porcentaje de IVA"
              inputMode="decimal"
              className={`${campo} w-20 text-base`}
              value={ivaTexto}
              onChange={(e) => setIvaTexto(e.target.value)}
              onBlur={guardarIva}
            />
          </span>
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

        <div className="grid grid-cols-2 items-center gap-2">
          <input className={campo} placeholder="Dividir entre (personas)" inputMode="numeric" value={personas} onChange={(e) => setPersonas(e.target.value.replace(/\D/g, ""))} aria-label="Número de personas" />
          <p className="text-sm text-foreground">{numPersonas > 1 ? `Cada uno: ${dinero(porPersona)}` : "Cuenta completa"}</p>
        </div>

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

function ModalCrearProductoRapidoPOS({
  codigoInicial,
  categorias,
  onCerrar,
  onCreado,
}: {
  codigoInicial: string;
  categorias: Categoria[];
  onCerrar: () => void;
  onCreado: (producto: Producto) => Promise<void> | void;
}) {
  const [nombre, setNombre] = useState("");
  const [barras, setBarras] = useState(codigoInicial);
  const [precio, setPrecio] = useState("");
  const [stock, setStock] = useState("10");
  const [categoriaId, setCategoriaId] = useState("");
  const [guardando, setGuardando] = useState(false);

  const guardar = async () => {
    const valor = Number(precio.replace(",", "."));
    if (!nombre.trim() || !Number.isFinite(valor) || valor < 0) {
      return toast.error("Escribe un nombre y precio válidos.");
    }
    setGuardando(true);
    const stockVal = stock.trim() === "" ? null : Math.max(0, Number(stock.replace(",", ".")) || 0);
    const { data, error } = await supabase
      .from("restaurante_productos")
      .insert({
        nombre: nombre.trim(),
        codigo_barras: barras.trim() || null,
        precio: valor,
        stock_actual: stockVal,
        categoria_id: categoriaId || null,
        activo: true,
      })
      .select("*")
      .single();
    setGuardando(false);
    if (error || !data) {
      return toast.error("No se pudo crear el producto.");
    }
    await onCreado(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onCerrar}>
      <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
      <GlassPanel className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-lg text-foreground">Crear producto con este código</h3>
          <button type="button" aria-label="Cerrar" onClick={onCerrar} className="text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-3">
          <label className="block space-y-1 text-xs text-muted-foreground">
            <span>Código de barras</span>
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
                className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-glass-border px-3 py-2 text-xs text-foreground hover:bg-glass/40"
              >
                <Sparkles className="h-3.5 w-3.5" /> Generar EAN-13
              </button>
            </div>
          </label>
          <label className="block space-y-1 text-xs text-muted-foreground">
            <span>Nombre *</span>
            <input className={campo} autoFocus placeholder="Ej: Bebida 400ml" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-xs text-muted-foreground">
              <span>Precio *</span>
              <input className={campo} inputMode="decimal" placeholder="4000" value={precio} onChange={(e) => setPrecio(e.target.value)} />
            </label>
            <label className="block space-y-1 text-xs text-muted-foreground">
              <span>Stock actual</span>
              <input className={campo} inputMode="decimal" placeholder="10" value={stock} onChange={(e) => setStock(e.target.value)} />
            </label>
          </div>
          {categorias.length > 0 && (
            <label className="block space-y-1 text-xs text-muted-foreground">
              <span>Categoría</span>
              <select className={campo} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
                <option value="">Sin categoría</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCerrar} className="rounded-lg border border-glass-border px-4 py-2 text-sm text-foreground">
            Cancelar
          </button>
          <button type="button" disabled={guardando} onClick={guardar} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
            <Plus className="h-4 w-4" /> {guardando ? "Guardando…" : "Crear y agregar"}
          </button>
        </div>
      </GlassPanel>
      </div>
    </div>
  );
}
