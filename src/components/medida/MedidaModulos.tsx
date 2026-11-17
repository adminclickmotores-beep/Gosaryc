import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { usePermisos } from "@/hooks/use-permisos";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";

type Obra = Tables<"obr_obras">;
type Capitulo = Tables<"obr_capitulos">;
type ObrMaterial = Tables<"obr_materiales">;
type Corte = Tables<"obr_cortes">;
type Propiedad = Tables<"inm_propiedades">;
type Contrato = Tables<"inm_contratos">;
type Cobro = Tables<"inm_cobros">;
type InmGasto = Tables<"inm_gastos">;
type InmLiq = Tables<"inm_liquidaciones">;
type Lote = Tables<"agr_lotes">;
type AgrInsumo = Tables<"agr_insumos">;
type Cosecha = Tables<"agr_cosechas">;
type Flota = Tables<"tra_flota">;
type Manifiesto = Tables<"tra_manifiestos">;
type Anticipo = Tables<"tra_anticipos">;

const msg = (m: string | undefined, d: string) => (m && m.length > 0 && m.length < 220 ? m : d);

const aWhatsapp = (tel: string | null | undefined, texto: string): string | null => {
  const d = (tel ?? "").replace(/\D/g, "");
  if (d.length < 7) return null;
  const n = d.length === 10 ? `57${d}` : d;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
};

// ============================================================
// Constructora: presupuestos por capítulos, vales a obra y cortes
// ============================================================
export function ObrasConstructora() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [caps, setCaps] = useState<Capitulo[]>([]);
  const [mats, setMats] = useState<ObrMaterial[]>([]);
  const [cortes, setCortes] = useState<Corte[]>([]);
  const [sel, setSel] = useState("");
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [cliente, setCliente] = useState("");
  const [presupuesto, setPresupuesto] = useState("");
  const [responsable, setResponsable] = useState("");
  const [capNombre, setCapNombre] = useState("");
  const [capPlan, setCapPlan] = useState("");
  const [matNombre, setMatNombre] = useState("");
  const [matUnidad, setMatUnidad] = useState("und");
  const [matStock, setMatStock] = useState("");
  const [matCosto, setMatCosto] = useState("");
  const [valeItems, setValeItems] = useState<{ material: string; cantidad: string }[]>([{ material: "", cantidad: "" }]);
  const [valeCap, setValeCap] = useState("");
  const [valePara, setValePara] = useState("");
  const [acta, setActa] = useState("");
  const [avance, setAvance] = useState("");
  const [valor, setValor] = useState("");
  const [retencion, setRetencion] = useState("");
  const [anticipoApl, setAnticipoApl] = useState("");
  const [metodo, setMetodo] = useState("transferencia");

  const obra = obras.find((o) => o.id === sel);
  const capsObra = caps.filter((c) => c.obra_id === sel);
  const cortesObra = cortes.filter((c) => c.obra_id === sel);
  const ejecutado = capsObra.reduce((a, c) => a + Number(c.ejecutado), 0);

  const cargar = useCallback(async () => {
    const [o, c, m, t] = await Promise.all([
      supabase.from("obr_obras").select("*").order("created_at", { ascending: false }),
      supabase.from("obr_capitulos").select("*"),
      supabase.from("obr_materiales").select("*").eq("activo", true).order("nombre"),
      supabase.from("obr_cortes").select("*").order("created_at", { ascending: false }),
    ]);
    setObras(o.data ?? []);
    setCaps(c.data ?? []);
    setMats(m.data ?? []);
    setCortes(t.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crearObra = async () => {
    if (nombre.trim().length < 2) return toast.error("Escribe el nombre de la obra.");
    const { data, error } = await supabase.from("obr_obras").insert({
      nombre: nombre.trim(), cliente: cliente.trim() || null, presupuesto: num(presupuesto), responsable: responsable.trim() || null,
    }).select("id").single();
    if (error || !data) return toast.error(msg(error?.message, "No se pudo crear la obra."));
    toast.success("Obra creada. Agrega sus capítulos de presupuesto.");
    setNombre(""); setCliente(""); setPresupuesto(""); setResponsable("");
    setSel(data.id);
    void cargar();
  };

  const crearCap = async () => {
    if (!sel) return toast.error("Elige la obra.");
    if (capNombre.trim().length < 2) return toast.error("Escribe el nombre del capítulo.");
    const { error } = await supabase.from("obr_capitulos").insert({ obra_id: sel, nombre: capNombre.trim(), planeado: num(capPlan) });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el capítulo."));
    setCapNombre(""); setCapPlan("");
    void cargar();
  };

  const crearMat = async () => {
    if (matNombre.trim().length < 2) return toast.error("Escribe el nombre del material.");
    const { error } = await supabase.from("obr_materiales").insert({
      nombre: matNombre.trim(), unidad: matUnidad.trim() || "und", stock: Math.max(num(matStock), 0), costo: Math.max(num(matCosto), 0),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el material."));
    setMatNombre(""); setMatStock(""); setMatCosto("");
    void cargar();
  };

  const registrarVale = async () => {
    if (!sel) return toast.error("Elige la obra.");
    const items = valeItems.filter((v) => v.material && num(v.cantidad) > 0)
      .map((v) => ({ material_id: v.material, cantidad: num(v.cantidad) }));
    if (items.length === 0) return toast.error("Agrega al menos un material con cantidad.");
    const { error } = await supabase.rpc("obr_registrar_vale", {
      p_obra: sel, p_capitulo: valeCap || null, p_items: items, p_entregado: valePara.trim() || null,
    });
    if (error) return toast.error(msg(error.message, "No se pudo registrar el vale."));
    toast.success("Vale registrado: salió de bodega y sumó al capítulo ejecutado.");
    setValeItems([{ material: "", cantidad: "" }]);
    void cargar();
  };

  const crearCorte = async () => {
    if (!sel) return toast.error("Elige la obra.");
    if (!acta.trim()) return toast.error("Escribe el número del acta.");
    if (num(valor) <= 0) return toast.error("El valor del corte debe ser mayor a cero.");
    const neto = num(valor) - num(retencion) - num(anticipoApl);
    if (neto <= 0) return toast.error("El neto debe ser mayor a cero (valor menos retención y anticipo).");
    const { error } = await supabase.from("obr_cortes").insert({
      obra_id: sel, acta: acta.trim(), avance_pct: Math.min(Math.max(num(avance), 0), 100),
      valor: num(valor), retencion: num(retencion), anticipo_aplicado: num(anticipoApl), neto,
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el corte."));
    toast.success("Corte guardado. Cóbalo para que entre a Caja y Contabilidad.");
    setActa(""); setAvance(""); setValor(""); setRetencion(""); setAnticipoApl("");
    void cargar();
  };

  const cobrarCorte = async (c: Corte) => {
    const { error } = await supabase.rpc("obr_cobrar_corte", { p_corte: c.id, p_metodo: metodo });
    if (error) return toast.error(msg(error.message, "No se pudo cobrar el corte."));
    toast.success(`Corte cobrado: ${dinero(c.neto)} entró a Caja y Contabilidad.`);
    void cargar();
  };

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Obras, presupuestos y cortes" texto="Planea por capítulos (materiales, mano de obra, maquinaria), despacha vales desde bodega y cobra cada acta: el ejecutado real se compara con lo planeado para alertar sobrecostos." />
      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Nueva obra</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Nombre de la obra *"><input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
          <Campo etiqueta="Cliente"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
          <Campo etiqueta="Presupuesto total"><input className={campo} inputMode="decimal" value={presupuesto} onChange={(e) => setPresupuesto(e.target.value)} /></Campo>
          <Campo etiqueta="Responsable"><input className={campo} value={responsable} onChange={(e) => setResponsable(e.target.value)} /></Campo>
        </div>
        <button className={boton} onClick={crearObra}><Plus className="h-4 w-4" /> Crear obra</button>
        <Campo etiqueta="Obra en trabajo">
          <select className={campo} value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="">Elige una obra</option>
            {obras.map((o) => <option key={o.id} value={o.id}>{o.nombre}{o.cliente ? ` · ${o.cliente}` : ""}</option>)}
          </select>
        </Campo>
      </GlassPanel>

      {!obra && <p className="text-sm text-muted-foreground">Elige o crea una obra para ver su presupuesto, vales y cortes.</p>}
      {obra && (
        <>
          <GlassPanel className="space-y-2 p-5">
            <p className="break-words font-medium text-foreground">{obra.nombre}</p>
            <p className="text-sm text-muted-foreground">
              Planeado {dinero(capsObra.reduce((a, c) => a + Number(c.planeado), 0))} · Ejecutado {dinero(ejecutado)}
              {obra.presupuesto > 0 && <> · Presupuesto {dinero(obra.presupuesto)}</>}
            </p>
            {obra.presupuesto > 0 && ejecutado > obra.presupuesto && (
              <p className="text-sm font-medium text-destructive">⚠ Sobrecosto: lo ejecutado supera el presupuesto en {dinero(ejecutado - Number(obra.presupuesto))}.</p>
            )}
            <div className="space-y-1 pt-1">
              {capsObra.map((c) => (
                <p key={c.id} className={`text-sm ${Number(c.ejecutado) > Number(c.planeado) ? "text-destructive" : "text-muted-foreground"}`}>
                  {c.nombre}: planeado {dinero(c.planeado)} · ejecutado {dinero(c.ejecutado)}
                  {Number(c.ejecutado) > Number(c.planeado) ? " (sobrecosto)" : ""}
                </p>
              ))}
              {capsObra.length === 0 && <p className="text-sm text-muted-foreground">Sin capítulos. Crea el primero abajo.</p>}
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <input className={campo} placeholder="Capítulo (materiales, mano de obra…)" value={capNombre} onChange={(e) => setCapNombre(e.target.value)} />
              <input className={campo} inputMode="decimal" placeholder="Planeado" value={capPlan} onChange={(e) => setCapPlan(e.target.value)} />
              <button className={botonSec} onClick={crearCap}>Agregar capítulo</button>
            </div>
          </GlassPanel>

          <GlassPanel className="space-y-3 p-5">
            <h2 className="font-medium text-foreground">Vale de salida a obra</h2>
            {valeItems.map((v, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-2">
                <select className={campo} value={v.material} onChange={(e) => setValeItems((x) => x.map((y, j) => (j === i ? { ...y, material: e.target.value } : y)))}>
                  <option value="">Material de bodega…</option>
                  {mats.map((m) => <option key={m.id} value={m.id}>{m.nombre} (quedan {m.stock} {m.unidad})</option>)}
                </select>
                <input className={campo} inputMode="decimal" placeholder="Cantidad" value={v.cantidad} onChange={(e) => setValeItems((x) => x.map((y, j) => (j === i ? { ...y, cantidad: e.target.value } : y)))} />
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              <button className={botonSec} onClick={() => setValeItems((x) => [...x, { material: "", cantidad: "" }])}>Agregar material</button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Campo etiqueta="Capítulo al que se carga">
                <select className={campo} value={valeCap} onChange={(e) => setValeCap(e.target.value)}>
                  <option value="">Sin capítulo</option>
                  {capsObra.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </Campo>
              <Campo etiqueta="Entregado a"><input className={campo} value={valePara} onChange={(e) => setValePara(e.target.value)} /></Campo>
            </div>
            <button className={boton} onClick={registrarVale}>Despachar a obra</button>
            <div className="grid gap-2 border-t border-glass-border pt-3 sm:grid-cols-4">
              <input className={campo} placeholder="Nuevo material" value={matNombre} onChange={(e) => setMatNombre(e.target.value)} />
              <input className={campo} placeholder="Unidad" value={matUnidad} onChange={(e) => setMatUnidad(e.target.value)} />
              <input className={campo} inputMode="decimal" placeholder="Stock" value={matStock} onChange={(e) => setMatStock(e.target.value)} />
              <span className="flex gap-2">
                <input className={campo} inputMode="decimal" placeholder="Costo" value={matCosto} onChange={(e) => setMatCosto(e.target.value)} />
                <button className={botonSec} onClick={crearMat}>Guardar</button>
              </span>
            </div>
          </GlassPanel>

          <GlassPanel className="space-y-3 p-5">
            <h2 className="font-medium text-foreground">Acta / corte de obra</h2>
            <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <input className={campo} placeholder="Acta # *" value={acta} onChange={(e) => setActa(e.target.value)} />
              <input className={campo} inputMode="decimal" placeholder="Avance %" value={avance} onChange={(e) => setAvance(e.target.value)} />
              <input className={campo} inputMode="decimal" placeholder="Valor *" value={valor} onChange={(e) => setValor(e.target.value)} />
              <input className={campo} inputMode="decimal" placeholder="Retención" value={retencion} onChange={(e) => setRetencion(e.target.value)} />
              <input className={campo} inputMode="decimal" placeholder="Anticipo aplicado" value={anticipoApl} onChange={(e) => setAnticipoApl(e.target.value)} />
            </div>
            <p className="text-sm text-muted-foreground">Neto a cobrar: {dinero(Math.max(num(valor) - num(retencion) - num(anticipoApl), 0))}</p>
            <button className={boton} onClick={crearCorte}><Plus className="h-4 w-4" /> Guardar corte</button>
            <div className="space-y-2 pt-2">
              {cortesObra.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-glass-border p-2 text-sm">
                  <span className="min-w-0 break-words text-foreground">Acta {c.acta} · avance {c.avance_pct}% · neto {dinero(c.neto)} ({c.estado})</span>
                  {c.estado === "pendiente" && (
                    <span className="flex items-center gap-2">
                      <select className={`${campo} w-auto`} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                        <option value="transferencia">Transferencia</option>
                        <option value="efectivo">Efectivo</option>
                      </select>
                      <button className={botonSec} onClick={() => cobrarCorte(c)}>Cobrar</button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </GlassPanel>
        </>
      )}
    </div>
  );
}

// ============================================================
// Inmobiliaria: portafolio, contratos, cobro y liquidación
// ============================================================
export function PropiedadesInmobiliaria() {
  const { esAdmin } = usePermisos();
  const [props, setProps] = useState<Propiedad[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [cobros, setCobros] = useState<Cobro[]>([]);
  const [gastos, setGastos] = useState<InmGasto[]>([]);
  const [liqs, setLiqs] = useState<InmLiq[]>([]);
  const [cargando, setCargando] = useState(true);
  const [titulo, setTitulo] = useState("");
  const [matricula, setMatricula] = useState("");
  const [direccion, setDireccion] = useState("");
  const [modalidad, setModalidad] = useState("arriendo");
  const [canon, setCanon] = useState("");
  const [admon, setAdmon] = useState("");
  const [precio, setPrecio] = useState("");
  const [propietario, setPropietario] = useState("");
  const [telProp, setTelProp] = useState("");
  const [selProp, setSelProp] = useState("");
  const [arrendatario, setArrendatario] = useState("");
  const [telArr, setTelArr] = useState("");
  const [comision, setComision] = useState("10");
  const [diaPago, setDiaPago] = useState("5");
  const [periodo, setPeriodo] = useState(() => new Date().toISOString().slice(0, 7));
  const [gastoConcepto, setGastoConcepto] = useState("");
  const [gastoValor, setGastoValor] = useState("");
  const [gastoCont, setGastoCont] = useState("");
  const [metodo, setMetodo] = useState("transferencia");

  const cargar = useCallback(async () => {
    const [p, c, b, g, l] = await Promise.all([
      supabase.from("inm_propiedades").select("*").order("created_at", { ascending: false }),
      supabase.from("inm_contratos").select("*").order("created_at", { ascending: false }),
      supabase.from("inm_cobros").select("*").order("periodo", { ascending: false }).limit(120),
      supabase.from("inm_gastos").select("*").order("created_at", { ascending: false }).limit(60),
      supabase.from("inm_liquidaciones").select("*").order("created_at", { ascending: false }).limit(20),
    ]);
    setProps(p.data ?? []);
    setContratos(c.data ?? []);
    setCobros(b.data ?? []);
    setGastos(g.data ?? []);
    setLiqs(l.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crearProp = async () => {
    if (titulo.trim().length < 2) return toast.error("Escribe el título de la propiedad.");
    const { error } = await supabase.from("inm_propiedades").insert({
      titulo: titulo.trim(), matricula: matricula.trim() || null, direccion: direccion.trim() || null,
      modalidad, canon: num(canon), administracion: num(admon), precio_venta: num(precio),
      propietario: propietario.trim() || null, telefono_prop: telProp.trim() || null,
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar la propiedad."));
    toast.success("Propiedad agregada al portafolio.");
    setTitulo(""); setMatricula(""); setDireccion(""); setCanon(""); setAdmon(""); setPrecio(""); setPropietario(""); setTelProp("");
    void cargar();
  };

  const cambiarEstadoProp = async (p: Propiedad, estado: string) => {
    await supabase.from("inm_propiedades").update({ estado }).eq("id", p.id);
    void cargar();
  };

  const crearContrato = async () => {
    if (!selProp) return toast.error("Elige la propiedad.");
    if (arrendatario.trim().length < 2) return toast.error("Escribe el nombre del arrendatario.");
    if (num(canon) <= 0 && num(comision) < 0) return toast.error("Revisa el canon.");
    const prop = props.find((x) => x.id === selProp);
    const { error } = await supabase.from("inm_contratos").insert({
      propiedad_id: selProp, arrendatario: arrendatario.trim(), telefono: telArr.trim() || null,
      canon: num(canon) > 0 ? num(canon) : Number(prop?.canon ?? 0),
      comision_pct: Math.min(Math.max(num(comision), 0), 100), dia_pago: Math.min(Math.max(Math.round(num(diaPago)), 1), 31),
    });
    if (error) return toast.error(msg(error.message, "No se pudo crear el contrato."));
    await supabase.from("inm_propiedades").update({ estado: "arrendado" }).eq("id", selProp);
    toast.success("Contrato creado y propiedad marcada como arrendada.");
    setArrendatario(""); setTelArr("");
    void cargar();
  };

  const generarCobro = async (ct: Contrato) => {
    const { error } = await supabase.from("inm_cobros").insert({ contrato_id: ct.id, periodo, valor: ct.canon });
    if (error) return toast.error(msg(error.message, "No se pudo generar el cobro (quizá ya existe ese periodo)."));
    toast.success(`Cobro ${periodo} generado por ${dinero(ct.canon)}.`);
    void cargar();
  };

  const cobrar = async (b: Cobro) => {
    const { error } = await supabase.rpc("inm_cobrar_canon", { p_cobro: b.id, p_metodo: metodo });
    if (error) return toast.error(msg(error.message, "No se pudo cobrar el canon."));
    toast.success("Canon cobrado: entró a Caja y Contabilidad.");
    void cargar();
  };

  const mora = async (ct: Contrato, b: Cobro) => {
    const url = aWhatsapp(ct.telefono, `Hola ${ct.arrendatario}, te recordamos que el canon ${b.periodo} por ${dinero(b.valor)} está pendiente. Por favor ponte al día. ¡Gracias!`);
    if (!url) return toast.error("El arrendatario no tiene teléfono registrado.");
    window.open(url, "_blank", "noopener");
  };

  const agregarGasto = async () => {
    if (!gastoCont) return toast.error("Elige el contrato.");
    if (gastoConcepto.trim().length < 2 || num(gastoValor) <= 0) return toast.error("Escribe el concepto y el valor de la reparación.");
    const { error } = await supabase.from("inm_gastos").insert({ contrato_id: gastoCont, concepto: gastoConcepto.trim(), valor: num(gastoValor) });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el gasto."));
    setGastoConcepto(""); setGastoValor("");
    void cargar();
  };

  const liquidar = async (ct: Contrato) => {
    const { error } = await supabase.rpc("inm_liquidar", { p_contrato: ct.id, p_metodo: metodo });
    if (error) return toast.error(msg(error.message, "No se pudo liquidar."));
    toast.success("Liquidación pagada al propietario: la comisión neta quedó en Contabilidad.");
    void cargar();
  };

  const pendPorContrato = useMemo(() => {
    const g = new Map<string, { pagados: number; n: number; gastos: number }>();
    for (const b of cobros) {
      if (b.estado !== "pagado" || b.liquidado) continue;
      const x = g.get(b.contrato_id) ?? { pagados: 0, n: 0, gastos: 0 };
      g.set(b.contrato_id, { ...x, pagados: x.pagados + Number(b.valor), n: x.n + 1 });
    }
    for (const x of gastos) {
      if (x.liquidado) continue;
      const e = g.get(x.contrato_id) ?? { pagados: 0, n: 0, gastos: 0 };
      g.set(x.contrato_id, { ...e, gastos: e.gastos + Number(x.valor) });
    }
    return g;
  }, [cobros, gastos]);

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Propiedades, contratos y liquidaciones" texto="Portafolio con matrícula y estado, cobro mensual del canon con alerta de mora por WhatsApp y liquidación al propietario descontando tu comisión y las reparaciones." />
      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Nueva propiedad</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Título *"><input className={campo} value={titulo} onChange={(e) => setTitulo(e.target.value)} /></Campo>
          <Campo etiqueta="Matrícula inmobiliaria"><input className={campo} value={matricula} onChange={(e) => setMatricula(e.target.value)} /></Campo>
          <Campo etiqueta="Dirección"><input className={campo} value={direccion} onChange={(e) => setDireccion(e.target.value)} /></Campo>
          <Campo etiqueta="Modalidad">
            <select className={campo} value={modalidad} onChange={(e) => setModalidad(e.target.value)}>
              <option value="arriendo">Arriendo</option><option value="venta">Venta</option>
            </select>
          </Campo>
          <Campo etiqueta="Canon mensual"><input className={campo} inputMode="decimal" value={canon} onChange={(e) => setCanon(e.target.value)} /></Campo>
          <Campo etiqueta="Administración"><input className={campo} inputMode="decimal" value={admon} onChange={(e) => setAdmon(e.target.value)} /></Campo>
          <Campo etiqueta="Propietario"><input className={campo} value={propietario} onChange={(e) => setPropietario(e.target.value)} /></Campo>
          <Campo etiqueta="Teléfono propietario"><input className={campo} inputMode="tel" value={telProp} onChange={(e) => setTelProp(e.target.value)} /></Campo>
          {modalidad === "venta" && <Campo etiqueta="Precio de venta"><input className={campo} inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Campo>}
        </div>
        <button className={boton} onClick={crearProp}><Plus className="h-4 w-4" /> Guardar propiedad</button>
      </GlassPanel>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {props.map((p) => (
          <GlassPanel key={p.id} className="space-y-2 p-4">
            <p className="break-words font-medium text-foreground">{p.titulo}</p>
            <p className="text-xs text-muted-foreground">
              {p.matricula ? `Matrícula ${p.matricula} · ` : ""}{p.modalidad} · {p.estado}
              {p.modalidad === "arriendo" ? ` · canon ${dinero(p.canon)}` : ` · ${dinero(p.precio_venta)}`}
            </p>
            {p.propietario && <p className="text-xs text-muted-foreground">Propietario: {p.propietario}</p>}
            <div className="flex flex-wrap gap-2">
              {(["disponible", "arrendado", "mantenimiento"] as const).map((e) => (
                <button key={e} className={p.estado === e ? boton : botonSec} onClick={() => cambiarEstadoProp(p, e)}>{e}</button>
              ))}
            </div>
          </GlassPanel>
        ))}
        {props.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay propiedades.</p>}
      </div>

      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Nuevo contrato de arriendo</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Propiedad *">
            <select className={campo} value={selProp} onChange={(e) => setSelProp(e.target.value)}>
              <option value="">Elige una propiedad</option>
              {props.filter((x) => x.modalidad === "arriendo").map((x) => <option key={x.id} value={x.id}>{x.titulo} · {x.estado}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Arrendatario *"><input className={campo} value={arrendatario} onChange={(e) => setArrendatario(e.target.value)} /></Campo>
          <Campo etiqueta="Teléfono"><input className={campo} inputMode="tel" value={telArr} onChange={(e) => setTelArr(e.target.value)} /></Campo>
          <Campo etiqueta="Canon (vacío = el de la propiedad)"><input className={campo} inputMode="decimal" value={canon} onChange={(e) => setCanon(e.target.value)} /></Campo>
          <Campo etiqueta="Tu comisión (%)"><input className={campo} inputMode="decimal" value={comision} onChange={(e) => setComision(e.target.value)} /></Campo>
          <Campo etiqueta="Día de pago"><input className={campo} inputMode="numeric" value={diaPago} onChange={(e) => setDiaPago(e.target.value)} /></Campo>
        </div>
        <button className={boton} onClick={crearContrato}><Plus className="h-4 w-4" /> Crear contrato</button>
      </GlassPanel>

      <div className="space-y-3">
        {contratos.filter((c) => c.estado === "activo").map((ct) => {
          const misCobros = cobros.filter((b) => b.contrato_id === ct.id);
          const pend = pendPorContrato.get(ct.id);
          return (
            <GlassPanel key={ct.id} className="space-y-2 p-4">
              <p className="break-words font-medium text-foreground">{ct.arrendatario} · canon {dinero(ct.canon)} · comisión {ct.comision_pct}%</p>
              <div className="flex flex-wrap items-end gap-2">
                <Campo etiqueta="Periodo (AAAA-MM)"><input className={campo} value={periodo} onChange={(e) => setPeriodo(e.target.value)} /></Campo>
                <button className={botonSec} onClick={() => generarCobro(ct)}>Generar cobro</button>
                <select className={`${campo} w-auto`} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                  <option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option>
                </select>
              </div>
              {misCobros.map((b) => (
                <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-glass-border p-2 text-sm">
                  <span className="text-foreground">{b.periodo} · {dinero(b.valor)} · {b.estado}</span>
                  {b.estado === "pendiente" && (
                    <span className="flex gap-2">
                      <button className={botonSec} onClick={() => mora(ct, b)}><MessageCircle className="h-4 w-4" /> Mora</button>
                      <button className={boton} onClick={() => cobrar(b)}>Cobrar</button>
                    </span>
                  )}
                </div>
              ))}
              {pend && pend.pagados > 0 && (
                <p className="text-sm text-muted-foreground">
                  Por liquidar: {dinero(pend.pagados)} en {pend.n} cánones · gastos {dinero(pend.gastos)} · neto aprox {dinero(Math.max(pend.pagados - pend.pagados * Number(ct.comision_pct) / 100 - pend.gastos, 0))}
                </p>
              )}
              <div className="flex flex-wrap items-end gap-2">
                <input className={`${campo} flex-1`} placeholder="Gasto de reparación (concepto)" value={gastoCont === ct.id ? gastoConcepto : ""} onChange={(e) => { setGastoCont(ct.id); setGastoConcepto(e.target.value); }} />
                <input className={`${campo} w-32`} inputMode="decimal" placeholder="Valor" value={gastoCont === ct.id ? gastoValor : ""} onChange={(e) => { setGastoCont(ct.id); setGastoValor(e.target.value); }} />
                <button className={botonSec} onClick={agregarGasto}>Agregar gasto</button>
                {esAdmin ? <button className={boton} onClick={() => liquidar(ct)}>Liquidar propietario</button>
                  : <p className="text-xs text-muted-foreground">Solo el dueño liquida.</p>}
              </div>
            </GlassPanel>
          );
        })}
      </div>

      {liqs.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-medium text-foreground">Liquidaciones a propietarios</h2>
          {liqs.map((l) => (
            <GlassPanel key={l.id} className="p-3 text-sm">
              <span className="text-foreground">{l.created_at.slice(0, 10)} · cobrado {dinero(l.total_cobrado)} · comisión {dinero(l.comision)} · gastos {dinero(l.gastos)} · neto {dinero(l.neto)}</span>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Agro: lotes, aplicaciones con dosis y venta con utilidad real
// ============================================================
export function AgroLotes() {
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [insumos, setInsumos] = useState<AgrInsumo[]>([]);
  const [cosechas, setCosechas] = useState<Cosecha[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [cultivo, setCultivo] = useState("");
  const [superficie, setSuperficie] = useState("");
  const [stockIni, setStockIni] = useState("");
  const [iNombre, setINombre] = useState("");
  const [iUnidad, setIUnidad] = useState("kg");
  const [iStock, setIStock] = useState("");
  const [iCosto, setICosto] = useState("");
  const [apl, setApl] = useState<Record<string, { insumo: string; cantidad: string; dosis: string }>>({});
  const [ven, setVen] = useState<Record<string, { cantidad: string; precio: string; cliente: string; metodo: string }>>({});

  const cargar = useCallback(async () => {
    const [l, i, c] = await Promise.all([
      supabase.from("agr_lotes").select("*").order("nombre"),
      supabase.from("agr_insumos").select("*").eq("activo", true).order("nombre"),
      supabase.from("agr_cosechas").select("*").order("created_at", { ascending: false }).limit(40),
    ]);
    setLotes(l.data ?? []);
    setInsumos(i.data ?? []);
    setCosechas(c.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crearLote = async () => {
    if (nombre.trim().length < 2) return toast.error("Escribe el nombre del lote.");
    const { error } = await supabase.from("agr_lotes").insert({
      nombre: nombre.trim(), cultivo: cultivo.trim() || null, superficie: num(superficie), stock: Math.max(num(stockIni), 0),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el lote."));
    setNombre(""); setCultivo(""); setSuperficie(""); setStockIni("");
    void cargar();
  };

  const crearInsumo = async () => {
    if (iNombre.trim().length < 2) return toast.error("Escribe el nombre del insumo.");
    const { error } = await supabase.from("agr_insumos").insert({
      nombre: iNombre.trim(), unidad: iUnidad.trim() || "kg", stock: Math.max(num(iStock), 0), costo: Math.max(num(iCosto), 0),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el insumo."));
    setINombre(""); setIStock(""); setICosto("");
    void cargar();
  };

  const aplicar = async (l: Lote) => {
    const a = apl[l.id];
    if (!a?.insumo || num(a.cantidad) <= 0) return toast.error("Elige el insumo y la cantidad.");
    const { error } = await supabase.rpc("agr_aplicar", { p_lote: l.id, p_insumo: a.insumo, p_cantidad: num(a.cantidad), p_dosis: a.dosis.trim() || null });
    if (error) return toast.error(msg(error.message, "No se pudo registrar la aplicación."));
    toast.success("Aplicación registrada: descontó del inventario y sumó al costo del lote.");
    setApl((x) => ({ ...x, [l.id]: { insumo: "", cantidad: "", dosis: "" } }));
    void cargar();
  };

  const vender = async (l: Lote) => {
    const v = ven[l.id];
    if (!v || num(v.cantidad) <= 0) return toast.error("Escribe la cantidad a vender.");
    const { error } = await supabase.rpc("agr_vender", {
      p_lote: l.id, p_cantidad: num(v.cantidad), p_precio: num(v.precio), p_cliente: v.cliente.trim() || null, p_metodo: v.metodo || "efectivo",
    });
    if (error) return toast.error(msg(error.message, "No se pudo registrar la venta."));
    toast.success("Venta registrada con su utilidad real: entró a Caja y Contabilidad.");
    setVen((x) => ({ ...x, [l.id]: { cantidad: "", precio: "", cliente: "", metodo: "efectivo" } }));
    void cargar();
  };

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Lotes, aplicaciones y cosechas" texto="Siembra por lote, aplica fertilizantes con dosis por hectárea o animal (descuenta del inventario) y vende la producción viendo la utilidad real." />
      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Nuevo lote / cultivo / hato</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Nombre *"><input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
          <Campo etiqueta="Cultivo o especie"><input className={campo} value={cultivo} onChange={(e) => setCultivo(e.target.value)} /></Campo>
          <Campo etiqueta="Superficie (ha)"><input className={campo} inputMode="decimal" value={superficie} onChange={(e) => setSuperficie(e.target.value)} /></Campo>
          <Campo etiqueta="Producción inicial (kg)"><input className={campo} inputMode="decimal" value={stockIni} onChange={(e) => setStockIni(e.target.value)} /></Campo>
        </div>
        <button className={boton} onClick={crearLote}><Plus className="h-4 w-4" /> Guardar lote</button>
      </GlassPanel>

      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Insumos agrícolas</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Nombre *"><input className={campo} value={iNombre} onChange={(e) => setINombre(e.target.value)} /></Campo>
          <Campo etiqueta="Unidad"><input className={campo} value={iUnidad} onChange={(e) => setIUnidad(e.target.value)} /></Campo>
          <Campo etiqueta="Stock"><input className={campo} inputMode="decimal" value={iStock} onChange={(e) => setIStock(e.target.value)} /></Campo>
          <Campo etiqueta="Costo por unidad"><input className={campo} inputMode="decimal" value={iCosto} onChange={(e) => setICosto(e.target.value)} /></Campo>
        </div>
        <button className={boton} onClick={crearInsumo}><Plus className="h-4 w-4" /> Guardar insumo</button>
        <div className="space-y-1 pt-1">
          {insumos.map((i) => (
            <p key={i.id} className="text-sm text-muted-foreground">{i.nombre}: {i.stock} {i.unidad} · {dinero(i.costo)}/{i.unidad}</p>
          ))}
        </div>
      </GlassPanel>

      <div className="space-y-3">
        {lotes.map((l) => {
          const a = apl[l.id] ?? { insumo: "", cantidad: "", dosis: "" };
          const v = ven[l.id] ?? { cantidad: "", precio: "", cliente: "", metodo: "efectivo" };
          const costoUnit = l.stock > 0 ? Number(l.costo_acumulado) / Number(l.stock) : 0;
          return (
            <GlassPanel key={l.id} className="space-y-2 p-4">
              <p className="break-words font-medium text-foreground">{l.nombre}{l.cultivo ? ` · ${l.cultivo}` : ""}</p>
              <p className="text-sm text-muted-foreground">
                Producción {l.stock} {l.unidad} · costo acumulado {dinero(l.costo_acumulado)}
                {l.stock > 0 && <> · costo por {l.unidad} {dinero(costoUnit)}</>}
              </p>
              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-glass-border p-2">
                <select className={`${campo} flex-1`} value={a.insumo} onChange={(e) => setApl((x) => ({ ...x, [l.id]: { ...a, insumo: e.target.value } }))}>
                  <option value="">Insumo a aplicar…</option>
                  {insumos.map((i) => <option key={i.id} value={i.id}>{i.nombre} (quedan {i.stock})</option>)}
                </select>
                <input className={`${campo} w-28`} inputMode="decimal" placeholder="Cantidad" value={a.cantidad} onChange={(e) => setApl((x) => ({ ...x, [l.id]: { ...a, cantidad: e.target.value } }))} />
                <input className={`${campo} flex-1`} placeholder="Dosis/ha o por animal" value={a.dosis} onChange={(e) => setApl((x) => ({ ...x, [l.id]: { ...a, dosis: e.target.value } }))} />
                <button className={botonSec} onClick={() => aplicar(l)}>Aplicar</button>
              </div>
              <div className="flex flex-wrap items-end gap-2 rounded-lg border border-glass-border p-2">
                <input className={`${campo} w-28`} inputMode="decimal" placeholder="Cantidad" value={v.cantidad} onChange={(e) => setVen((x) => ({ ...x, [l.id]: { ...v, cantidad: e.target.value } }))} />
                <input className={`${campo} w-32`} inputMode="decimal" placeholder="Precio" value={v.precio} onChange={(e) => setVen((x) => ({ ...x, [l.id]: { ...v, precio: e.target.value } }))} />
                <input className={`${campo} flex-1`} placeholder="Cliente" value={v.cliente} onChange={(e) => setVen((x) => ({ ...x, [l.id]: { ...v, cliente: e.target.value } }))} />
                <select className={`${campo} w-auto`} value={v.metodo} onChange={(e) => setVen((x) => ({ ...x, [l.id]: { ...v, metodo: e.target.value } }))}>
                  <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option>
                </select>
                <button className={boton} onClick={() => vender(l)}>Vender</button>
              </div>
            </GlassPanel>
          );
        })}
        {lotes.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay lotes.</p>}
      </div>

      {cosechas.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-medium text-foreground">Últimas ventas de producción</h2>
          {cosechas.map((c) => (
            <GlassPanel key={c.id} className="p-3 text-sm">
              <span className="text-foreground">{c.fecha} · {c.cantidad} {c.unidad}{c.cliente ? ` · ${c.cliente}` : ""}</span>
              <span className="text-muted-foreground"> · vendió {dinero(c.total)} · costó {dinero(c.costo)} · utilidad {dinero(c.utilidad)}</span>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Transporte: manifiestos, anticipos y liquidación al conductor
// ============================================================
export function TransporteManifiestos() {
  const { esAdmin } = usePermisos();
  const [flota, setFlota] = useState<Flota[]>([]);
  const [manifiestos, setManifiestos] = useState<Manifiesto[]>([]);
  const [anticipos, setAnticipos] = useState<Anticipo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [placa, setPlaca] = useState("");
  const [conductor, setConductor] = useState("");
  const [guia, setGuia] = useState("");
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [origen, setOrigen] = useState("");
  const [destino, setDestino] = useState("");
  const [flete, setFlete] = useState("");
  const [selVeh, setSelVeh] = useState("");
  const [ant, setAnt] = useState<Record<string, { concepto: string; detalle: string; valor: string }>>({});
  const [pago, setPago] = useState<Record<string, string>>({});
  const [metodo, setMetodo] = useState("efectivo");

  const cargar = useCallback(async () => {
    const [f, m, a] = await Promise.all([
      supabase.from("tra_flota").select("*").order("placa"),
      supabase.from("tra_manifiestos").select("*").order("created_at", { ascending: false }).limit(120),
      supabase.from("tra_anticipos").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setFlota(f.data ?? []);
    setManifiestos(m.data ?? []);
    setAnticipos(a.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crearVeh = async () => {
    if (placa.trim().length < 2) return toast.error("Escribe la placa.");
    const { error } = await supabase.from("tra_flota").insert({ placa: placa.trim().toUpperCase(), conductor: conductor.trim() || null });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el vehículo."));
    setPlaca(""); setConductor("");
    void cargar();
  };

  const crearMan = async () => {
    if (!guia.trim()) return toast.error("Escribe el número de guía.");
    if (cliente.trim().length < 2) return toast.error("Escribe el cliente.");
    const v = flota.find((x) => x.id === selVeh);
    const { error } = await supabase.from("tra_manifiestos").insert({
      guia: guia.trim(), cliente: cliente.trim(), telefono: telefono.trim() || null,
      origen: origen.trim(), destino: destino.trim(), placa: v?.placa ?? null,
      conductor: v?.conductor ?? conductor.trim() || null, valor_flete: num(flete),
    });
    if (error) return toast.error(msg(error.message, "No se pudo crear el manifiesto."));
    toast.success("Manifiesto creado y vehículo asignado.");
    setGuia(""); setCliente(""); setTelefono(""); setOrigen(""); setDestino(""); setFlete("");
    void cargar();
  };

  const avanzar = async (m: Manifiesto) => {
    const sig = m.estado === "asignado" ? "en_ruta" : m.estado;
    if (sig === m.estado) return;
    await supabase.from("tra_manifiestos").update({ estado: sig }).eq("id", m.id);
    void cargar();
  };

  const darAnticipo = async (m: Manifiesto) => {
    const a = ant[m.id];
    if (!a || num(a.valor) <= 0) return toast.error("Escribe el valor del anticipo.");
    const { error } = await supabase.rpc("tra_anticipo", { p_manifiesto: m.id, p_concepto: a.concepto || "viaticos", p_detalle: a.detalle.trim() || null, p_valor: num(a.valor) });
    if (error) return toast.error(msg(error.message, "No se pudo registrar el anticipo."));
    toast.success("Anticipo entregado: salió de Caja.");
    setAnt((x) => ({ ...x, [m.id]: { concepto: "viaticos", detalle: "", valor: "" } }));
    void cargar();
  };

  const cobrar = async (m: Manifiesto) => {
    const { error } = await supabase.rpc("tra_cobrar_flete", { p_manifiesto: m.id, p_metodo: metodo });
    if (error) return toast.error(msg(error.message, "No se pudo cobrar el flete."));
    toast.success("Flete cobrado: entró a Caja y Contabilidad.");
    void cargar();
  };

  const liquidar = async (m: Manifiesto) => {
    const restante = Number(m.valor_flete) - Number(m.anticipos) - Number(m.pago_conductor);
    const p = num(pago[m.id] ?? String(Math.max(restante, 0)));
    const { error } = await supabase.rpc("tra_liquidar", { p_manifiesto: m.id, p_pago: p, p_metodo: metodo });
    if (error) return toast.error(msg(error.message, "No se pudo liquidar."));
    toast.success("Viaje liquidado: la utilidad neta quedó en Contabilidad.");
    void cargar();
  };

  const avisar = (m: Manifiesto) => {
    const url = aWhatsapp(m.telefono, `Hola ${m.cliente}, tu carga con guía ${m.guia} (${m.origen} → ${m.destino}) está en estado: ${m.estado}. Conductor: ${m.conductor ?? "por asignar"}.`);
    if (!url) return toast.error("Este manifiesto no tiene teléfono registrado.");
    window.open(url, "_blank", "noopener");
  };

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Manifiestos, anticipos y liquidación" texto="Asigna vehículo y conductor, entrega anticipos de viáticos, ACPM y peajes, cobra el flete y liquida al conductor: la utilidad neta cruza con Caja y Contabilidad." />
      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Flota</h2>
        <div className="flex flex-wrap items-end gap-2">
          <Campo etiqueta="Placa *"><input className={campo} value={placa} onChange={(e) => setPlaca(e.target.value)} /></Campo>
          <Campo etiqueta="Conductor"><input className={campo} value={conductor} onChange={(e) => setConductor(e.target.value)} /></Campo>
          <button className={botonSec} onClick={crearVeh}><Plus className="h-4 w-4" /> Guardar vehículo</button>
        </div>
        <p className="text-sm text-muted-foreground">{flota.length === 0 ? "Sin vehículos." : flota.map((f) => `${f.placa}${f.conductor ? ` (${f.conductor})` : ""}`).join(" · ")}</p>
      </GlassPanel>

      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Nuevo manifiesto / guía</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Guía # *"><input className={campo} value={guia} onChange={(e) => setGuia(e.target.value)} /></Campo>
          <Campo etiqueta="Cliente *"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
          <Campo etiqueta="Teléfono"><input className={campo} inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></Campo>
          <Campo etiqueta="Origen"><input className={campo} value={origen} onChange={(e) => setOrigen(e.target.value)} /></Campo>
          <Campo etiqueta="Destino"><input className={campo} value={destino} onChange={(e) => setDestino(e.target.value)} /></Campo>
          <Campo etiqueta="Valor del flete"><input className={campo} inputMode="decimal" value={flete} onChange={(e) => setFlete(e.target.value)} /></Campo>
          <Campo etiqueta="Vehículo">
            <select className={campo} value={selVeh} onChange={(e) => setSelVeh(e.target.value)}>
              <option value="">Sin asignar</option>
              {flota.filter((f) => f.activo).map((f) => <option key={f.id} value={f.id}>{f.placa}{f.conductor ? ` · ${f.conductor}` : ""}</option>)}
            </select>
          </Campo>
        </div>
        <button className={boton} onClick={crearMan}><Plus className="h-4 w-4" /> Crear manifiesto</button>
      </GlassPanel>

      <div className="space-y-3">
        {manifiestos.map((m) => {
          const misAnt = anticipos.filter((a) => a.manifiesto_id === m.id);
          const a = ant[m.id] ?? { concepto: "viaticos", detalle: "", valor: "" };
          const saldo = Number(m.valor_flete) - Number(m.anticipos) - Number(m.pago_conductor);
          return (
            <GlassPanel key={m.id} className="space-y-2 p-4">
              <p className="break-words font-medium text-foreground">Guía {m.guia} · {m.cliente} · {m.origen} → {m.destino}</p>
              <p className="text-xs text-muted-foreground">
                {m.placa ?? "Sin vehículo"} · {m.conductor ?? "sin conductor"} · {m.estado} · flete {dinero(m.valor_flete)} · anticipos {dinero(m.anticipos)} · saldo {dinero(saldo)}
              </p>
              {misAnt.map((x) => (
                <p key={x.id} className="text-xs text-muted-foreground">Anticipo {x.concepto}{x.detalle ? ` · ${x.detalle}` : ""}: {dinero(x.valor)}</p>
              ))}
              <div className="flex flex-wrap gap-2">
                {m.estado === "asignado" && <button className={botonSec} onClick={() => avanzar(m)}>Salir a ruta</button>}
                {(m.estado === "asignado" || m.estado === "en_ruta") && <button className={botonSec} onClick={() => cobrar(m)}>Cobrar flete</button>}
                <button className={botonSec} onClick={() => avisar(m)}><MessageCircle className="h-4 w-4" /> WhatsApp</button>
                <select className={`${campo} w-auto`} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                  <option value="efectivo">Efectivo</option><option value="transferencia">Transferencia</option>
                </select>
              </div>
              {m.estado !== "liquidado" && (
                <>
                  <div className="flex flex-wrap items-end gap-2 rounded-lg border border-glass-border p-2">
                    <select className={`${campo} w-auto`} value={a.concepto} onChange={(e) => setAnt((x) => ({ ...x, [m.id]: { ...a, concepto: e.target.value } }))}>
                      <option value="viaticos">Viáticos</option><option value="acpm">ACPM</option><option value="peajes">Peajes</option><option value="gasto">Otro gasto</option>
                    </select>
                    <input className={`${campo} flex-1`} placeholder="Detalle" value={a.detalle} onChange={(e) => setAnt((x) => ({ ...x, [m.id]: { ...a, detalle: e.target.value } }))} />
                    <input className={`${campo} w-32`} inputMode="decimal" placeholder="Valor" value={a.valor} onChange={(e) => setAnt((x) => ({ ...x, [m.id]: { ...a, valor: e.target.value } }))} />
                    <button className={botonSec} onClick={() => darAnticipo(m)}>Dar anticipo</button>
                  </div>
                  {m.estado === "cobrado" && (
                    esAdmin ? (
                      <div className="flex flex-wrap items-end gap-2 rounded-lg border border-glass-border p-2">
                        <Campo etiqueta={`Pago al conductor (saldo ${dinero(Math.max(saldo, 0))})`}>
                          <input className={`${campo} w-36`} inputMode="decimal" value={pago[m.id] ?? String(Math.max(saldo, 0))} onChange={(e) => setPago((x) => ({ ...x, [m.id]: e.target.value }))} />
                        </Campo>
                        <button className={boton} onClick={() => liquidar(m)}>Liquidar viaje</button>
                      </div>
                    ) : <p className="text-xs text-muted-foreground">Solo el dueño liquida viajes.</p>
                  )}
                </>
              )}
              {m.estado === "liquidado" && (
                <p className="text-sm text-muted-foreground">Liquidado · pagado al conductor {dinero(m.pago_conductor)} · utilidad neta {dinero(m.utilidad)}</p>
              )}
            </GlassPanel>
          );
        })}
        {manifiestos.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay manifiestos.</p>}
      </div>
    </div>
  );
}
