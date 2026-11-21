import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";
import { exportarExcel, imprimirReporte } from "@/lib/exportes";
import { Etiqueta, Indicador, Pestanas, SelectorMetodo, aWhatsapp, diasEntre, hoyISO, msg } from "@/components/negocios/comunes";
import { MiniFoto, SubirFotos } from "@/components/negocios/FotosPrivadas";

type Contrato = Tables<"cv_contratos">;
type Articulo = Tables<"cv_articulos">;
type Movimiento = Tables<"cv_movimientos">;

const GRACIA_DIAS = 3;
const MARGEN_VENTA_PCT = 30;

const FORM_VACIO = { articulo: "", descripcion: "", cliente: "", documento: "", telefono: "", avaluo: "", prestado: "", plazo: "30", pct: "10" };

// ------------------------------------------------------------------
// Empeños y contratos de retroventa
// ------------------------------------------------------------------
export function EmpenosContratos() {
  const [lista, setLista] = useState<Contrato[]>([]);
  const [cargando, setCargando] = useState(true);
  const [hoy, setHoy] = useState("");
  const [vista, setVista] = useState<"vigente" | "todos">("vigente");
  const [f, setF] = useState(FORM_VACIO);
  const [fotos, setFotos] = useState<string[]>([]);
  const [metodo, setMetodo] = useState("efectivo");
  const [guardando, setGuardando] = useState(false);
  const [ocupado, setOcupado] = useState("");
  const procesado = useRef(false);

  useEffect(() => {
    setHoy(hoyISO());
  }, []);

  const cargar = useCallback(async () => {
    if (!procesado.current) {
      procesado.current = true;
      const { data: n } = await supabase.rpc("cv_procesar_vencidos", { p_gracia: GRACIA_DIAS, p_margen: MARGEN_VENTA_PCT });
      if (typeof n === "number" && n > 0) toast.info(`${n} prenda(s) vencida(s) pasaron a «Artículos en venta».`);
    }
    const { data } = await supabase.from("cv_contratos").select("*").order("vence").limit(1000);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const prestado = num(f.prestado);
  const pct = num(f.pct);
  const recompra = prestado + Math.round((prestado * pct) / 100);

  const imprimir = (c: { numero: string; articulo: string; descripcion: string | null; cliente: string; documento: string | null; prestado: number; retroventa_pct: number; plazo_dias: number; vence: string }) => {
    const interes = Math.round((c.prestado * c.retroventa_pct) / 100);
    imprimirReporte(`Contrato de retroventa ${c.numero}`, `${c.cliente}${c.documento ? ` · ${c.documento}` : ""}`,
      ["Concepto", "Detalle"],
      [["Artículo", c.articulo], ["Descripción", c.descripcion ?? "—"], ["Valor prestado", dinero(c.prestado)], ["Costo del plazo", `${c.retroventa_pct} % (${dinero(interes)})`], ["Plazo", `${c.plazo_dias} días`], ["Fecha límite de retiro", c.vence], ["Valor para recuperar el artículo", dinero(c.prestado + interes)]],
      ["Si no se retira o prorroga antes de la fecha límite (más los días de gracia), el artículo pasa a venta.", "Firma del cliente: ______________________"]);
  };

  const crear = async () => {
    if (f.articulo.trim().length < 2) return toast.error("Describe el artículo.");
    if (f.cliente.trim().length < 2) return toast.error("Escribe el nombre del cliente.");
    if (prestado <= 0) return toast.error("Escribe el valor prestado.");
    setGuardando(true);
    const { data, error } = await supabase.rpc("cv_crear_contrato", {
      p_articulo: f.articulo, p_descripcion: f.descripcion, p_cliente: f.cliente, p_documento: f.documento, p_telefono: f.telefono,
      p_avaluo: num(f.avaluo), p_prestado: prestado, p_plazo_dias: Math.round(num(f.plazo)), p_retroventa_pct: pct, p_fotos: fotos, p_metodo: metodo,
    });
    setGuardando(false);
    if (error) return toast.error(msg(error.message, "No se pudo registrar el contrato."));
    const r = (data ?? {}) as { numero?: string; vence?: string };
    toast.success(`Contrato ${r.numero ?? ""} registrado. El préstamo salió de Caja.`);
    imprimir({ numero: r.numero ?? "", articulo: f.articulo, descripcion: f.descripcion || null, cliente: f.cliente, documento: f.documento || null, prestado, retroventa_pct: pct, plazo_dias: Math.round(num(f.plazo)), vence: r.vence ?? "" });
    setF(FORM_VACIO);
    setFotos([]);
    void cargar();
  };

  const prorrogar = async (c: Contrato) => {
    const interes = Math.round((c.prestado * c.retroventa_pct) / 100);
    if (!window.confirm(`Prorrogar ${c.plazo_dias} días cobrando ${dinero(interes)} a Caja?`)) return;
    setOcupado(c.id);
    const { data, error } = await supabase.rpc("cv_prorrogar", { p_contrato: c.id, p_metodo: metodo });
    setOcupado("");
    if (error) return toast.error(msg(error.message, "No se pudo prorrogar."));
    const r = (data ?? {}) as { vence?: string };
    toast.success(`Prórroga registrada. Nueva fecha límite: ${r.vence ?? ""}.`);
    void cargar();
  };

  const rescatar = async (c: Contrato) => {
    const total = c.prestado + Math.round((c.prestado * c.retroventa_pct) / 100);
    if (!window.confirm(`El cliente recupera su artículo pagando ${dinero(total)}. Confirmar?`)) return;
    setOcupado(c.id);
    const { data, error } = await supabase.rpc("cv_rescatar", { p_contrato: c.id, p_metodo: metodo });
    setOcupado("");
    if (error) return toast.error(msg(error.message, "No se pudo registrar el rescate."));
    const r = (data ?? {}) as { recibo?: string; total?: number };
    toast.success(`Rescate cobrado a Caja (${dinero(r.total ?? total)}).`);
    imprimirReporte(`Recibo de rescate ${r.recibo ?? ""}`, `${c.cliente} · ${c.numero}`, ["Concepto", "Valor"], [["Capital devuelto", dinero(c.prestado)], ["Intereses", dinero((r.total ?? total) - c.prestado)], ["Total pagado", dinero(r.total ?? total)]], ["Artículo entregado: " + c.articulo]);
    void cargar();
  };

  if (cargando) return <Cargando />;
  const vigentes = lista.filter((c) => c.estado === "vigente");
  const vencidos = vigentes.filter((c) => !!hoy && c.vence < hoy);
  const porVencer = vigentes.filter((c) => !!hoy && c.vence >= hoy && diasEntre(hoy, c.vence) <= 5);
  const enCalle = vigentes.reduce((s, c) => s + c.prestado, 0);
  const mostrados = vista === "vigente" ? vigentes : lista;

  return (
    <div className="space-y-6">
      <Encabezado titulo="Empeños y contratos de retroventa" texto={`Registra la prenda con fotos, el valor prestado, el plazo y el porcentaje de retroventa. El préstamo sale de Caja con su asiento; si no se retira (más ${GRACIA_DIAS} días de gracia) pasa sola a artículos en venta.`} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Indicador titulo="Contratos vigentes" valor={vigentes.length} />
        <Indicador titulo="Dinero prestado" valor={dinero(enCalle)} />
        <Indicador titulo="Vencen en 5 días" valor={porVencer.length} alerta={porVencer.length > 0} />
        <Indicador titulo="Vencidos (en gracia)" valor={vencidos.length} alerta={vencidos.length > 0} />
      </div>

      <GlassPanel className="space-y-3 p-4">
        <h2 className="text-sm font-semibold text-foreground">Nuevo contrato</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Artículo (moto, joya, equipo...) *"><input className={campo} maxLength={120} value={f.articulo} onChange={(e) => setF({ ...f, articulo: e.target.value })} /></Campo>
          <Campo etiqueta="Cliente *"><input className={campo} maxLength={120} value={f.cliente} onChange={(e) => setF({ ...f, cliente: e.target.value })} /></Campo>
          <Campo etiqueta="Documento"><input className={campo} maxLength={30} value={f.documento} onChange={(e) => setF({ ...f, documento: e.target.value })} /></Campo>
          <Campo etiqueta="Teléfono"><input className={campo} inputMode="tel" maxLength={20} value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></Campo>
          <Campo etiqueta="Avalúo del artículo"><input className={campo} inputMode="decimal" value={f.avaluo} onChange={(e) => setF({ ...f, avaluo: e.target.value })} /></Campo>
          <Campo etiqueta="Valor prestado *"><input className={campo} inputMode="decimal" value={f.prestado} onChange={(e) => setF({ ...f, prestado: e.target.value })} /></Campo>
          <Campo etiqueta="Plazo (días)"><input className={campo} inputMode="numeric" value={f.plazo} onChange={(e) => setF({ ...f, plazo: e.target.value })} /></Campo>
          <Campo etiqueta="Retroventa (% sobre lo prestado)"><input className={campo} inputMode="decimal" value={f.pct} onChange={(e) => setF({ ...f, pct: e.target.value })} /></Campo>
          <Campo etiqueta="Entregar el préstamo con"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
        </div>
        <Campo etiqueta="Descripción (marca, serie, estado, placa...)"><textarea className={campo} rows={2} maxLength={500} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></Campo>
        <SubirFotos carpeta="empeno" rutas={fotos} onChange={setFotos} />
        <p className="text-xs text-muted-foreground">Para recuperar el artículo el cliente paga {dinero(recompra)} dentro del plazo.</p>
        <button type="button" className={boton} disabled={guardando} onClick={() => void crear()}>{guardando ? "Guardando..." : "Registrar y entregar préstamo"}</button>
      </GlassPanel>

      <GlassPanel className="space-y-2 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Pestanas items={[{ clave: "vigente", texto: "Vigentes" }, { clave: "todos", texto: "Todos" }]} valor={vista} onChange={setVista} />
          <Campo etiqueta="Cobrar con"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
          <button type="button" className={botonSec} onClick={() => exportarExcel("contratos-empeno", ["Número", "Artículo", "Cliente", "Prestado", "Retroventa %", "Vence", "Prórrogas", "Estado"], lista.map((c) => [c.numero, c.articulo, c.cliente, c.prestado, c.retroventa_pct, c.vence, c.prorrogas, c.estado]))}>Descargar Excel</button>
        </div>
        {mostrados.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay contratos.</p> : mostrados.map((c) => {
          const dias = hoy ? diasEntre(hoy, c.vence) : 0;
          const interes = Math.round((c.prestado * c.retroventa_pct) / 100);
          return (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-glass-border p-3">
              <div className="flex min-w-0 items-center gap-3">
                {c.fotos[0] ? <MiniFoto ruta={c.fotos[0]} /> : null}
                <div className="min-w-0">
                  <p className="break-words text-sm font-semibold text-foreground">{c.numero} · {c.articulo}</p>
                  <p className="text-xs text-muted-foreground">{c.cliente}{c.telefono ? ` · ${c.telefono}` : ""} · Prestado {dinero(c.prestado)} · Recupera por {dinero(c.prestado + interes)}</p>
                  <p className="text-xs text-muted-foreground">Límite {c.vence} · {c.prorrogas} prórroga(s)</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {c.estado === "vigente" ? (dias < 0 ? <Etiqueta texto={`Vencido hace ${Math.abs(dias)} día(s)`} tono="alerta" /> : dias <= 5 ? <Etiqueta texto={`Vence en ${dias} día(s)`} tono="info" /> : <Etiqueta texto="Vigente" tono="ok" />) : <Etiqueta texto={c.estado === "rescatado" ? "Rescatado" : c.estado === "en_venta" ? "En venta" : "Vendido"} tono="neutro" />}
                {c.estado === "vigente" && (
                  <>
                    <button type="button" className={botonSec} disabled={ocupado === c.id} onClick={() => void prorrogar(c)}>Prorrogar {dinero(interes)}</button>
                    <button type="button" className={boton} disabled={ocupado === c.id} onClick={() => void rescatar(c)}>Rescatar {dinero(c.prestado + interes)}</button>
                    <button type="button" className={botonSec} onClick={() => { const u = aWhatsapp(c.telefono, `Hola ${c.cliente}, te recordamos que tu contrato ${c.numero} (${c.articulo}) vence el ${c.vence}. Puedes prorrogarlo o recuperar tu artículo antes de esa fecha.`); if (u) window.open(u, "_blank", "noopener"); else toast.error("Sin teléfono."); }}>Avisar</button>
                  </>
                )}
                <button type="button" className={botonSec} onClick={() => imprimir(c)}>Imprimir</button>
              </div>
            </div>
          );
        })}
      </GlassPanel>
    </div>
  );
}

// ------------------------------------------------------------------
// Artículos en venta (vencidos y comprados)
// ------------------------------------------------------------------
export function ArticulosVentaCV() {
  const [lista, setLista] = useState<Articulo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<"en_venta" | "vendido">("en_venta");
  const [metodo, setMetodo] = useState("efectivo");
  const [precios, setPrecios] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("cv_articulos").select("*").order("created_at", { ascending: false }).limit(1000);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardarPrecio = async (a: Articulo) => {
    const v = precios[a.id];
    if (v === undefined) return;
    const { error } = await supabase.from("cv_articulos").update({ precio_venta: Math.max(num(v), 0) }).eq("id", a.id);
    if (error) return toast.error(msg(error.message, "No se pudo guardar el precio."));
    setPrecios((p) => {
      const { [a.id]: _omitido, ...resto } = p;
      return resto;
    });
    void cargar();
  };

  const vender = async (a: Articulo) => {
    const precio = num(precios[a.id] ?? String(a.precio_venta));
    if (precio <= 0) return toast.error("Escribe el precio de venta.");
    setOcupado(a.id);
    const { data, error } = await supabase.rpc("cv_vender", { p_articulo: a.id, p_precio: precio, p_metodo: metodo });
    setOcupado("");
    if (error) return toast.error(msg(error.message, "No se pudo registrar la venta."));
    const r = (data ?? {}) as { recibo?: string };
    toast.success(`Venta de ${dinero(precio)} cobrada a Caja.`);
    imprimirReporte(`Comprobante de venta ${r.recibo ?? ""}`, a.nombre, ["Concepto", "Valor"], [[a.nombre, dinero(precio)]], ["Gracias por su compra."]);
    setPrecios((p) => {
      const { [a.id]: _omitido, ...resto } = p;
      return resto;
    });
    void cargar();
  };

  if (cargando) return <Cargando />;
  const enVenta = lista.filter((a) => a.estado === "en_venta");
  const vendidos = lista.filter((a) => a.estado === "vendido");
  const valorInventario = enVenta.reduce((s, a) => s + a.costo, 0);
  const utilidad = vendidos.reduce((s, a) => s + ((a.precio_vendido ?? 0) - a.costo), 0);
  const mostrados = vista === "en_venta" ? enVenta : vendidos;

  return (
    <div className="space-y-6">
      <Encabezado titulo="Artículos en venta" texto="Prendas vencidas y artículos comprados a particulares. Al vender, el dinero entra a Caja y la utilidad queda en contabilidad." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador titulo="Artículos en venta" valor={enVenta.length} />
        <Indicador titulo="Costo del inventario" valor={dinero(valorInventario)} />
        <Indicador titulo="Utilidad de lo vendido" valor={dinero(utilidad)} />
      </div>
      <GlassPanel className="space-y-2 p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <Pestanas items={[{ clave: "en_venta", texto: "En venta" }, { clave: "vendido", texto: "Vendidos" }]} valor={vista} onChange={setVista} />
          <Campo etiqueta="Cobrar con"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
        </div>
        {mostrados.length === 0 ? <p className="text-sm text-muted-foreground">No hay artículos en esta lista.</p> : mostrados.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-glass-border p-3">
            <div className="flex min-w-0 items-center gap-3">
              {a.fotos[0] ? <MiniFoto ruta={a.fotos[0]} /> : null}
              <div className="min-w-0">
                <p className="break-words text-sm font-semibold text-foreground">{a.nombre}</p>
                <p className="text-xs text-muted-foreground">{a.origen === "empeno_vencido" ? "Prenda vencida" : `Compra a ${a.vendedor ?? "particular"}`} · Costo {dinero(a.costo)}{a.estado === "vendido" ? ` · Vendido en ${dinero(a.precio_vendido ?? 0)}` : ""}</p>
              </div>
            </div>
            {a.estado === "en_venta" ? (
              <div className="flex flex-wrap items-center gap-2">
                <input className={`${campo} !w-36`} aria-label="Precio de venta" inputMode="decimal" value={precios[a.id] ?? String(a.precio_venta)} onChange={(e) => setPrecios((p) => ({ ...p, [a.id]: e.target.value }))} />
                {precios[a.id] !== undefined && <button type="button" className={botonSec} onClick={() => void guardarPrecio(a)}>Guardar precio</button>}
                <button type="button" className={boton} disabled={ocupado === a.id} onClick={() => void vender(a)}>Vender</button>
              </div>
            ) : <Etiqueta texto={`Recibo ${a.recibo ?? ""}`} tono="ok" />}
          </div>
        ))}
      </GlassPanel>
    </div>
  );
}

// ------------------------------------------------------------------
// Compras a particulares
// ------------------------------------------------------------------
export function ComprasParticularesCV() {
  const [lista, setLista] = useState<Articulo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [f, setF] = useState({ nombre: "", descripcion: "", vendedor: "", documento: "", telefono: "", costo: "", precio: "" });
  const [fotos, setFotos] = useState<string[]>([]);
  const [metodo, setMetodo] = useState("efectivo");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("cv_articulos").select("*").eq("origen", "compra").order("created_at", { ascending: false }).limit(500);
    setLista(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const comprar = async () => {
    if (f.nombre.trim().length < 2) return toast.error("Describe el artículo.");
    if (f.vendedor.trim().length < 2 || f.documento.trim().length < 4) return toast.error("Escribe el nombre y el documento de quien vende.");
    if (num(f.costo) <= 0) return toast.error("Escribe cuánto pagas.");
    setGuardando(true);
    const { error } = await supabase.rpc("cv_comprar", { p_nombre: f.nombre, p_descripcion: f.descripcion, p_vendedor: f.vendedor, p_documento: f.documento, p_telefono: f.telefono, p_costo: num(f.costo), p_precio_venta: num(f.precio), p_fotos: fotos, p_metodo: metodo });
    setGuardando(false);
    if (error) return toast.error(msg(error.message, "No se pudo registrar la compra."));
    toast.success("Compra registrada. El pago salió de Caja y el artículo quedó en venta.");
    imprimirReporte("Comprobante de compra a particular", `${f.vendedor} · ${f.documento}`, ["Artículo", "Valor pagado"], [[f.nombre, dinero(num(f.costo))]], ["El vendedor declara que el artículo es de su propiedad.", "Firma del vendedor: ______________________"]);
    setF({ nombre: "", descripcion: "", vendedor: "", documento: "", telefono: "", costo: "", precio: "" });
    setFotos([]);
    void cargar();
  };

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Compras a particulares" texto="Compra directa de artículos con el documento del vendedor y fotos. El pago sale de Caja y el artículo pasa al inventario en venta." />
      <GlassPanel className="space-y-3 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Artículo *"><input className={campo} maxLength={120} value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Campo>
          <Campo etiqueta="Nombre de quien vende *"><input className={campo} maxLength={120} value={f.vendedor} onChange={(e) => setF({ ...f, vendedor: e.target.value })} /></Campo>
          <Campo etiqueta="Documento del vendedor *"><input className={campo} maxLength={30} value={f.documento} onChange={(e) => setF({ ...f, documento: e.target.value })} /></Campo>
          <Campo etiqueta="Teléfono"><input className={campo} inputMode="tel" maxLength={20} value={f.telefono} onChange={(e) => setF({ ...f, telefono: e.target.value })} /></Campo>
          <Campo etiqueta="Valor que pagas *"><input className={campo} inputMode="decimal" value={f.costo} onChange={(e) => setF({ ...f, costo: e.target.value })} /></Campo>
          <Campo etiqueta="Precio de venta"><input className={campo} inputMode="decimal" value={f.precio} onChange={(e) => setF({ ...f, precio: e.target.value })} /></Campo>
          <Campo etiqueta="Pagar con"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
        </div>
        <Campo etiqueta="Descripción"><textarea className={campo} rows={2} maxLength={500} value={f.descripcion} onChange={(e) => setF({ ...f, descripcion: e.target.value })} /></Campo>
        <SubirFotos carpeta="compras" rutas={fotos} onChange={setFotos} />
        <button type="button" className={boton} disabled={guardando} onClick={() => void comprar()}>{guardando ? "Guardando..." : "Registrar compra"}</button>
      </GlassPanel>
      <GlassPanel className="space-y-2 p-4">
        <h2 className="text-sm font-semibold text-foreground">Últimas compras</h2>
        {lista.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay compras.</p> : lista.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
            <p className="break-words text-sm text-foreground">{a.nombre} · {a.vendedor} ({a.vendedor_doc})</p>
            <div className="flex items-center gap-2"><span className="text-sm text-foreground">{dinero(a.costo)}</span><Etiqueta texto={a.estado === "vendido" ? "Vendido" : "En venta"} tono={a.estado === "vendido" ? "neutro" : "ok"} /></div>
          </div>
        ))}
      </GlassPanel>
    </div>
  );
}

// ------------------------------------------------------------------
// Retiros y renovaciones
// ------------------------------------------------------------------
export function RetirosCV() {
  const [lista, setLista] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("cv_movimientos").select("*").order("created_at", { ascending: false }).limit(1000);
      setLista(data ?? []);
      setCargando(false);
    })();
  }, []);

  if (cargando) return <Cargando />;
  const intereses = lista.reduce((s, m) => s + m.interes, 0);
  const rescates = lista.filter((m) => m.tipo === "rescate").length;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Retiros y renovaciones" texto="Historial de prórrogas y artículos recuperados por los clientes, con el recibo de cada cobro." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Indicador titulo="Movimientos" valor={lista.length} />
        <Indicador titulo="Artículos recuperados" valor={rescates} />
        <Indicador titulo="Intereses cobrados" valor={dinero(intereses)} />
      </div>
      <GlassPanel className="space-y-2 p-4">
        <div className="flex justify-end">
          <button type="button" className={botonSec} onClick={() => exportarExcel("retiros-renovaciones", ["Fecha", "Recibo", "Contrato", "Artículo", "Cliente", "Tipo", "Capital", "Interés", "Total"], lista.map((m) => [m.fecha, m.recibo, m.numero, m.articulo, m.cliente, m.tipo, m.capital, m.interes, m.total]))}>Descargar Excel</button>
        </div>
        {lista.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay movimientos.</p> : lista.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-semibold text-foreground">{m.tipo === "rescate" ? "Retiro" : "Prórroga"} · {m.numero} · {m.articulo}</p>
              <p className="text-xs text-muted-foreground">{m.cliente} · {m.fecha} · {m.recibo}{m.tipo === "prorroga" && m.vence_nuevo ? ` · Nuevo límite ${m.vence_nuevo}` : ""}</p>
            </div>
            <span className="text-sm font-medium text-foreground">{dinero(m.total)}</span>
          </div>
        ))}
      </GlassPanel>
    </div>
  );
}
