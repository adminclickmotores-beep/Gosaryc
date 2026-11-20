import { useCallback, useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, MessageCircle, Plus, Search, Wrench } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { urlLocalPrivada } from "@/lib/archivo-privado";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { usePermisos } from "@/hooks/use-permisos";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";

type Orden = Tables<"tal_ordenes">;
type Foto = Tables<"tal_fotos">;
type Repuesto = Tables<"tal_repuestos">;
type OrdenRep = Tables<"tal_orden_repuestos">;
type Liquidacion = Tables<"tal_liquidaciones">;
type Proyecto = Tables<"tal_proyectos">;

const BUCKET = "creditos_docs";
const msg = (m: string | undefined, d: string) => (m && m.length > 0 && m.length < 220 ? m : d);

const ESTADOS = [
  { clave: "recibido", texto: "Recibido" },
  { clave: "diagnostico", texto: "En diagnóstico" },
  { clave: "aprobado", texto: "Aprobado" },
  { clave: "reparacion", texto: "En reparación" },
  { clave: "listo", texto: "Listo" },
  { clave: "entregado", texto: "Entregado" },
] as const;

const CHECKS = ["Rayones", "Golpes", "Luces", "Espejos", "Antena", "Accesorios", "Llantas", "Documentos"];

const aWhatsapp = (tel: string | null | undefined, texto: string): string | null => {
  const d = (tel ?? "").replace(/\D/g, "");
  if (d.length < 7) return null;
  const n = d.length === 10 ? `57${d}` : d;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
};

const garantiaHasta = (o: Orden): string => {
  const base = o.fecha_entrega ?? o.created_at.slice(0, 10);
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + (o.dias_garantia ?? 0));
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
};

const garantiaVigente = (o: Orden): boolean | null => {
  if (o.estado !== "entregado") return null;
  const base = o.fecha_entrega ?? o.created_at.slice(0, 10);
  const d = new Date(`${base}T12:00:00`);
  d.setDate(d.getDate() + (o.dias_garantia ?? 0));
  return d.getTime() >= Date.now();
};

async function subirFoto(file: File): Promise<string | null> {
  const { data: owner } = await supabase.rpc("mi_negocio_id");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ruta = `${owner}/taller/${crypto.randomUUID()}.${ext || "jpg"}`;
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, file, { contentType: file.type || undefined });
  return error ? null : ruta;
}

function FotoMini({ ruta }: { ruta: string }) {
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
  if (!url) return null;
  return <img src={url} alt="Recepción" className="h-20 max-w-full rounded-lg object-cover" />;
}

// ============================================================
// Órdenes de trabajo + inventario de recepción con fotos
// ============================================================
export function OrdenesTaller({ rubroFijo }: { rubroFijo?: string }) {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [usos, setUsos] = useState<OrdenRep[]>([]);
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtro, setFiltro] = useState("todas");
  const [buscar, setBuscar] = useState("");
  const [rubro, setRubro] = useState(rubroFijo ?? "taller");
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ident, setIdent] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [km, setKm] = useState("");
  const [clave, setClave] = useState("");
  const [combustible, setCombustible] = useState("1/2");
  const [tecnico, setTecnico] = useState("");
  const [mano, setMano] = useState("");
  const [pct, setPct] = useState("30");
  const [garantia, setGarantia] = useState("30");
  const [notas, setNotas] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [archivos, setArchivos] = useState<FileList | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [selRep, setSelRep] = useState<Record<string, { repuesto: string; cantidad: string }>>({});
  const [metodo, setMetodo] = useState("efectivo");
  const [cobrando, setCobrando] = useState("");

  useEffect(() => {
    if (rubroFijo) setRubro(rubroFijo);
  }, [rubroFijo]);

  const cargar = useCallback(async () => {
    setCargando(true);
    const q = supabase.from("tal_ordenes").select("*").order("created_at", { ascending: false }).limit(200);
    const { data: o } = rubroFijo ? await q.eq("rubro", rubroFijo) : await q;
    setOrdenes(o ?? []);
    const ids = (o ?? []).map((x) => x.id);
    if (ids.length > 0) {
      const [f, u] = await Promise.all([
        supabase.from("tal_fotos").select("*").in("orden_id", ids),
        supabase.from("tal_orden_repuestos").select("*").in("orden_id", ids),
      ]);
      setFotos(f.data ?? []);
      setUsos(u.data ?? []);
    } else {
      setFotos([]);
      setUsos([]);
    }
    const { data: r } = await supabase.from("tal_repuestos").select("*").eq("activo", true).order("nombre");
    setRepuestos(r ?? []);
    setCargando(false);
  }, [rubroFijo]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (cliente.trim().length < 2) return toast.error("Escribe el nombre del cliente.");
    if (ident.trim().length < 2) return toast.error("Escribe la placa, serial o IMEI del equipo.");
    setGuardando(true);
    const { data, error } = await supabase.from("tal_ordenes").insert({
      rubro, cliente: cliente.trim(), telefono: telefono.trim() || null,
      identificador: ident.trim().toUpperCase(), marca: marca.trim() || null, modelo: modelo.trim() || null,
      kilometraje: km.trim() || null, clave_patron: clave.trim() || null, combustible,
      checklist: checks, tecnico: tecnico.trim() || null, mano_obra: num(mano),
      total: num(mano), comision_pct: Math.min(Math.max(num(pct), 0), 100),
      dias_garantia: Math.max(Math.round(num(garantia)), 0), notas: notas.trim() || null,
    }).select("id").single();
    if (error || !data) {
      setGuardando(false);
      return toast.error(msg(error?.message, "No se pudo abrir la orden."));
    }
    if (archivos && archivos.length > 0) {
      for (const f of Array.from(archivos).slice(0, 6)) {
        const ruta = await subirFoto(f);
        if (ruta) await supabase.from("tal_fotos").insert({ orden_id: data.id, ruta });
      }
    }
    toast.success("Orden abierta en Recibido. Súbele las fotos de recepción antes de diagnosticar.");
    setCliente(""); setTelefono(""); setIdent(""); setMarca(""); setModelo(""); setKm("");
    setClave(""); setMano(""); setNotas(""); setChecks({}); setArchivos(null);
    setGuardando(false);
    void cargar();
  };

  const agregarFotos = async (o: Orden, files: FileList | null) => {
    if (!files || files.length === 0) return;
    for (const f of Array.from(files).slice(0, 6)) {
      const ruta = await subirFoto(f);
      if (!ruta) return toast.error("No se pudo subir una foto.");
      const { error } = await supabase.from("tal_fotos").insert({ orden_id: o.id, ruta });
      if (error) return toast.error(msg(error.message, "No se pudo guardar la foto."));
    }
    toast.success("Fotos de recepción guardadas.");
    void cargar();
  };

  const cambiarEstado = async (o: Orden, estado: string) => {
    if (estado === "diagnostico" && fotos.filter((f) => f.orden_id === o.id).length === 0) {
      return toast.error("Sube al menos una foto de recepción antes de diagnosticar.");
    }
    const { error } = await supabase.from("tal_ordenes").update({ estado }).eq("id", o.id);
    if (error) return toast.error(msg(error.message, "No se pudo mover la orden."));
    void cargar();
  };

  const agregarRepuesto = async (o: Orden) => {
    const s = selRep[o.id];
    if (!s?.repuesto || num(s.cantidad) <= 0) return toast.error("Elige el repuesto y la cantidad.");
    const { error } = await supabase.rpc("tal_agregar_repuesto", { p_orden: o.id, p_repuesto: s.repuesto, p_cantidad: num(s.cantidad) });
    if (error) return toast.error(msg(error.message, "No se pudo agregar el repuesto."));
    toast.success("Repuesto agregado: descontó del inventario y sumó a la cuenta.");
    setSelRep((x) => ({ ...x, [o.id]: { repuesto: "", cantidad: "" } }));
    void cargar();
  };

  const cobrar = async (o: Orden) => {
    const { error } = await supabase.rpc("tal_cobrar_orden", { p_orden: o.id, p_metodo: metodo });
    if (error) return toast.error(msg(error.message, "No se pudo cobrar la orden."));
    toast.success(`Orden entregada. El cobro entró a Caja y Contabilidad con ${o.dias_garantia} días de garantía.`);
    setCobrando("");
    void cargar();
  };

  const aprobarWhatsapp = (o: Orden) => {
    const url = aWhatsapp(o.telefono, `Hola ${o.cliente}, tu equipo ${o.identificador} ya tiene diagnóstico: mano de obra ${dinero(o.mano_obra)} + repuestos ${dinero(o.repuestos_total)} = total ${dinero(o.total)}. ¿Lo aprobamos para empezar?`);
    if (!url) return toast.error("Esta orden no tiene teléfono registrado.");
    window.open(url, "_blank", "noopener");
  };

  const lista = useMemo(() => {
    const b = buscar.trim().toLowerCase();
    return ordenes.filter((o) =>
      (filtro === "todas" || o.estado === filtro) &&
      (!b || o.cliente.toLowerCase().includes(b) || o.identificador.toLowerCase().includes(b) || (o.tecnico ?? "").toLowerCase().includes(b)));
  }, [ordenes, filtro, buscar]);

  const porEstado = useMemo(() => ESTADOS.map((e) => ({ ...e, items: lista.filter((o) => o.estado === e.clave) })), [lista]);

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Órdenes de trabajo y recepción" texto="Placa, serial o IMEI, checklist de estado, fotos obligatorias de recepción y tablero Recibido → Diagnóstico → Aprobado → Reparación → Listo → Entregado. Al entregar se cobra a Caja y queda la garantía." />

      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Nueva orden de recepción</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {!rubroFijo && (
            <Campo etiqueta="Rubro">
              <select className={campo} value={rubro} onChange={(e) => setRubro(e.target.value)}>
                <option value="taller">Taller mecánico / motos</option>
                <option value="lavadero">Lavadero / detailing</option>
                <option value="celulares">Servicio técnico (celulares / pc)</option>
                <option value="carpinteria">Carpintería / mueblería</option>
                <option value="imprenta">Imprenta / publicidad</option>
              </select>
            </Campo>
          )}
          <Campo etiqueta="Cliente *"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
          <Campo etiqueta="Teléfono (WhatsApp)"><input className={campo} inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></Campo>
          <Campo etiqueta="Placa / serial / IMEI *"><input className={campo} value={ident} onChange={(e) => setIdent(e.target.value)} /></Campo>
          <Campo etiqueta="Marca"><input className={campo} value={marca} onChange={(e) => setMarca(e.target.value)} /></Campo>
          <Campo etiqueta="Modelo"><input className={campo} value={modelo} onChange={(e) => setModelo(e.target.value)} /></Campo>
          <Campo etiqueta="Kilometraje o patrón / clave"><input className={campo} value={km} onChange={(e) => setKm(e.target.value)} placeholder="Km o patrón de desbloqueo" /></Campo>
          <Campo etiqueta="Clave o patrón (celulares / pc)"><input className={campo} value={clave} onChange={(e) => setClave(e.target.value)} /></Campo>
          <Campo etiqueta="Nivel de combustible">
            <select className={campo} value={combustible} onChange={(e) => setCombustible(e.target.value)}>
              <option value="1/4">1/4</option><option value="1/2">1/2</option><option value="3/4">3/4</option><option value="lleno">Lleno</option><option value="n/a">No aplica</option>
            </select>
          </Campo>
          <Campo etiqueta="Técnico / lavador"><input className={campo} value={tecnico} onChange={(e) => setTecnico(e.target.value)} /></Campo>
          <Campo etiqueta="Mano de obra"><input className={campo} inputMode="decimal" value={mano} onChange={(e) => setMano(e.target.value)} /></Campo>
          <Campo etiqueta="Comisión del técnico (%)"><input className={campo} inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} /></Campo>
          <Campo etiqueta="Garantía (días)"><input className={campo} inputMode="numeric" value={garantia} onChange={(e) => setGarantia(e.target.value)} /></Campo>
        </div>
        <div className="flex flex-wrap gap-2">
          {CHECKS.map((c) => (
            <label key={c} className="flex items-center gap-1.5 rounded-lg border border-glass-border px-2.5 py-1.5 text-sm text-foreground">
              <input type="checkbox" checked={!!checks[c]} onChange={(e) => setChecks((x) => ({ ...x, [c]: e.target.checked }))} /> {c}
            </label>
          ))}
        </div>
        <Campo etiqueta="Notas de la falla"><input className={campo} value={notas} onChange={(e) => setNotas(e.target.value)} /></Campo>
        <Campo etiqueta="Fotos de recepción (obligatorias)"><input type="file" accept="image/*" multiple className={campo} onChange={(e) => setArchivos(e.target.files)} /></Campo>
        <button className={boton} disabled={guardando} onClick={crear}><Plus className="h-4 w-4" /> Abrir orden</button>
      </GlassPanel>

      <div className="flex flex-wrap items-end gap-3">
        <Campo etiqueta="Buscar por cliente, placa o técnico">
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input className={`${campo} pl-9`} value={buscar} onChange={(e) => setBuscar(e.target.value)} />
          </span>
        </Campo>
        <Campo etiqueta="Estado">
          <select className={campo} value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="todas">Todas</option>
            {ESTADOS.map((e) => <option key={e.clave} value={e.clave}>{e.texto}</option>)}
          </select>
        </Campo>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {porEstado.map((col) => (
          <div key={col.clave} className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">{col.texto} ({col.items.length})</h3>
            {col.items.map((o) => {
              const misFotos = fotos.filter((f) => f.orden_id === o.id);
              const misRep = usos.filter((u) => u.orden_id === o.id);
              const s = selRep[o.id] ?? { repuesto: "", cantidad: "" };
              const g = garantiaVigente(o);
              return (
                <GlassPanel key={o.id} className="space-y-2 p-3">
                  <p className="break-words text-sm font-medium text-foreground">{o.identificador} · {o.cliente}</p>
                  <p className="text-xs text-muted-foreground">{o.marca ?? ""} {o.modelo ?? ""} · {o.tecnico || "Sin técnico"} · Total {dinero(o.total)} (abono {dinero(o.abono)})</p>
                  {o.estado === "entregado" && (
                    <p className={`text-xs ${g ? "text-emerald-600" : "text-destructive"}`}>
                      Garantía {o.dias_garantia} días hasta {garantiaHasta(o)} ({g ? "vigente" : "vencida"})
                    </p>
                  )}
                  {misFotos.length > 0 && <div className="flex flex-wrap gap-2">{misFotos.map((f) => <FotoMini key={f.id} ruta={f.ruta} />)}</div>}
                  {misRep.map((u) => (
                    <p key={u.id} className="text-xs text-muted-foreground">+ {u.nombre} × {u.cantidad} = {dinero(u.precio)}</p>
                  ))}
                  <div className="flex flex-wrap gap-2">
                    {col.clave !== "entregado" && col.clave !== "recibido" && (
                      <button className={botonSec} onClick={() => cambiarEstado(o, ESTADOS[ESTADOS.findIndex((e) => e.clave === col.clave) - 1].clave)}>◀ Atrás</button>
                    )}
                    {col.clave !== "entregado" && (
                      <button className={botonSec} onClick={() => cambiarEstado(o, col.clave === "recibido" ? "diagnostico" : col.clave === "diagnostico" ? "aprobado" : col.clave === "aprobado" ? "reparacion" : col.clave === "reparacion" ? "listo" : "entregado")}>Avanzar ▶</button>
                    )}
                    {o.estado === "diagnostico" && (
                      <button className={botonSec} onClick={() => aprobarWhatsapp(o)}><MessageCircle className="h-4 w-4" /> Pedir aprobación</button>
                    )}
                  </div>
                  {o.estado !== "entregado" && (
                    <>
                      <div className="flex flex-wrap items-end gap-2">
                        <select className={`${campo} flex-1`} value={s.repuesto} onChange={(e) => setSelRep((x) => ({ ...x, [o.id]: { ...s, repuesto: e.target.value } }))}>
                          <option value="">Repuesto del inventario…</option>
                          {repuestos.map((r) => <option key={r.id} value={r.id}>{r.nombre} (quedan {r.stock}) · {dinero(r.precio)}</option>)}
                        </select>
                        <input className={`${campo} w-24`} inputMode="decimal" placeholder="Cant." value={s.cantidad} onChange={(e) => setSelRep((x) => ({ ...x, [o.id]: { ...s, cantidad: e.target.value } }))} />
                        <button className={botonSec} onClick={() => agregarRepuesto(o)}><Wrench className="h-4 w-4" /></button>
                      </div>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Camera className="h-4 w-4" /> Más fotos
                        <input type="file" accept="image/*" multiple className="text-xs" onChange={(e) => agregarFotos(o, e.target.files)} />
                      </label>
                      {cobrando === o.id ? (
                        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-glass-border p-2">
                          <select className={`${campo} w-auto`} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia / tarjeta</option>
                          </select>
                          <button className={boton} onClick={() => cobrar(o)}><CheckCircle2 className="h-4 w-4" /> Cobrar {dinero(Math.max(o.total - o.abono, 0))} y entregar</button>
                          <button className={botonSec} onClick={() => setCobrando("")}>Volver</button>
                        </div>
                      ) : (
                        <button className={botonSec} onClick={() => { setCobrando(o.id); }}>Cobrar y entregar</button>
                      )}
                    </>
                  )}
                </GlassPanel>
              );
            })}
            {col.items.length === 0 && <p className="text-xs text-muted-foreground">Vacío.</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Repuestos e inventario del taller
// ============================================================
export function RepuestosTaller() {
  const [repuestos, setRepuestos] = useState<Repuesto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [stock, setStock] = useState("");
  const [costo, setCosto] = useState("");
  const [precio, setPrecio] = useState("");
  const [sumar, setSumar] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("tal_repuestos").select("*").order("nombre");
    setRepuestos(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (nombre.trim().length < 2) return toast.error("Escribe el nombre del repuesto.");
    const { error } = await supabase.from("tal_repuestos").insert({
      nombre: nombre.trim(), codigo: codigo.trim() || null, stock: Math.max(num(stock), 0),
      costo: Math.max(num(costo), 0), precio: Math.max(num(precio), 0),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el repuesto."));
    toast.success("Repuesto guardado.");
    setNombre(""); setCodigo(""); setStock(""); setCosto(""); setPrecio("");
    void cargar();
  };

  const entrar = async (r: Repuesto) => {
    const n = num(sumar[r.id] ?? "");
    if (n <= 0) return toast.error("Escribe cuánto entra.");
    const { error } = await supabase.from("tal_repuestos").update({ stock: r.stock + n }).eq("id", r.id);
    if (error) return toast.error(msg(error.message, "No se pudo actualizar el inventario."));
    setSumar((x) => ({ ...x, [r.id]: "" }));
    void cargar();
  };

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Repuestos e inventario" texto="Cada repuesto con su stock, costo y precio. Al agregarlo a una orden descuenta solo y suma su precio a la cuenta." />
      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Nuevo repuesto</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Campo etiqueta="Nombre *"><input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
          <Campo etiqueta="Código"><input className={campo} value={codigo} onChange={(e) => setCodigo(e.target.value)} /></Campo>
          <Campo etiqueta="Stock inicial"><input className={campo} inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} /></Campo>
          <Campo etiqueta="Costo"><input className={campo} inputMode="decimal" value={costo} onChange={(e) => setCosto(e.target.value)} /></Campo>
          <Campo etiqueta="Precio de venta"><input className={campo} inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Campo>
        </div>
        <button className={boton} onClick={crear}><Plus className="h-4 w-4" /> Guardar repuesto</button>
      </GlassPanel>
      <div className="space-y-2">
        {repuestos.map((r) => (
          <GlassPanel key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <span className="min-w-0 break-words text-foreground">{r.nombre}{r.codigo ? ` · ${r.codigo}` : ""}: {r.stock} und · costo {dinero(r.costo)} · vende {dinero(r.precio)}</span>
            <span className="flex items-center gap-2">
              <input className={`${campo} w-28`} inputMode="decimal" placeholder="Entra…" value={sumar[r.id] ?? ""} onChange={(e) => setSumar((x) => ({ ...x, [r.id]: e.target.value }))} />
              <button className={botonSec} onClick={() => entrar(r)}>Sumar</button>
            </span>
          </GlassPanel>
        ))}
        {repuestos.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay repuestos.</p>}
      </div>
    </div>
  );
}

// ============================================================
// Comisiones y liquidación por técnico / operario
// ============================================================
export function ComisionesTaller() {
  const { esAdmin } = usePermisos();
  const [pendientes, setPendientes] = useState<Orden[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [metodo, setMetodo] = useState("efectivo");

  const cargar = useCallback(async () => {
    const [p, l] = await Promise.all([
      supabase.from("tal_ordenes").select("*").eq("estado", "entregado").eq("liquidada", false).gt("comision", 0).order("created_at", { ascending: false }),
      supabase.from("tal_liquidaciones").select("*").order("created_at", { ascending: false }).limit(15),
    ]);
    setPendientes(p.data ?? []);
    setLiquidaciones(l.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const porTecnico = useMemo(() => {
    const g = new Map<string, { total: number; mano: number; n: number }>();
    for (const o of pendientes) {
      const t = o.tecnico?.trim() || "Sin técnico";
      const x = g.get(t) ?? { total: 0, mano: 0, n: 0 };
      g.set(t, { total: x.total + o.comision, mano: x.mano + o.mano_obra, n: x.n + 1 });
    }
    return [...g.entries()];
  }, [pendientes]);

  const liquidar = async (prof: string) => {
    const { error } = await supabase.rpc("tal_liquidar", { p_profesional: prof === "Sin técnico" ? "" : prof, p_metodo: metodo });
    if (error) return toast.error(msg(error.message, "No se pudo liquidar."));
    toast.success("Liquidación pagada: salió de Caja y quedó en Contabilidad.");
    void cargar();
  };

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Comisiones y liquidación" texto="Cada orden entregada calcula la comisión sobre la mano de obra. Solo el dueño liquida: sale de Caja y queda en Contabilidad." />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {porTecnico.length === 0 && <p className="text-sm text-muted-foreground">No hay comisiones pendientes.</p>}
        {porTecnico.map(([t, x]) => (
          <GlassPanel key={t} className="space-y-2 p-4">
            <p className="break-words font-medium text-foreground">{t}</p>
            <p className="font-display text-2xl text-foreground">{dinero(x.total)}</p>
            <p className="text-xs text-muted-foreground">{x.n} órdenes · mano de obra {dinero(x.mano)}</p>
            {esAdmin ? (
              <div className="flex flex-wrap items-center gap-2">
                <select className={`${campo} w-auto`} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia</option>
                </select>
                <button className={boton} onClick={() => liquidar(t)}>Liquidar</button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Solo el dueño liquida.</p>
            )}
          </GlassPanel>
        ))}
      </div>
      {liquidaciones.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-medium text-foreground">Liquidaciones pagadas</h2>
          {liquidaciones.map((l) => (
            <GlassPanel key={l.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span className="min-w-0 break-words text-foreground">{l.created_at.slice(0, 10)} · {l.profesional} · {l.ordenes} órdenes</span>
              <span className="text-muted-foreground">{dinero(l.total_comision)} · {l.metodo}</span>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Proyectos a la medida (carpintería / imprenta) con abono y saldo
// ============================================================
type Material = { nombre: string; cantidad: string; costo: string };

export function ProyectosMedida({ rubroFijo }: { rubroFijo?: string }) {
  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [rubro, setRubro] = useState(rubroFijo ?? "carpinteria");
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [total, setTotal] = useState("");
  const [materiales, setMateriales] = useState<Material[]>([{ nombre: "", cantidad: "", costo: "" }]);
  const [fecha, setFecha] = useState("");
  const [cobro, setCobro] = useState<Record<string, { monto: string; metodo: string; esAbono: boolean }>>({});

  useEffect(() => {
    if (rubroFijo) setRubro(rubroFijo);
  }, [rubroFijo]);

  const cargar = useCallback(async () => {
    const q = supabase.from("tal_proyectos").select("*").order("created_at", { ascending: false }).limit(200);
    const { data } = rubroFijo ? await q.eq("rubro", rubroFijo) : await q;
    setProyectos(data ?? []);
    setCargando(false);
  }, [rubroFijo]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (cliente.trim().length < 2) return toast.error("Escribe el nombre del cliente.");
    if (titulo.trim().length < 2) return toast.error("Escribe el título del proyecto.");
    if (num(total) <= 0) return toast.error("Escribe el valor total del proyecto.");
    const mats = materiales.filter((m) => m.nombre.trim());
    const { error } = await supabase.from("tal_proyectos").insert({
      rubro, cliente: cliente.trim(), telefono: telefono.trim() || null, titulo: titulo.trim(),
      descripcion: descripcion.trim() || null, materiales: mats, total: num(total),
      abono: 0, saldo: num(total), fecha_entrega: fecha || null,
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el proyecto."));
    toast.success("Proyecto cotizado. Cobra el abono (50%) para pasar a producción.");
    setCliente(""); setTelefono(""); setTitulo(""); setDescripcion(""); setTotal(""); setFecha("");
    setMateriales([{ nombre: "", cantidad: "", costo: "" }]);
    void cargar();
  };

  const cambiarEstado = async (p: Proyecto, estado: string) => {
    const { error } = await supabase.from("tal_proyectos").update({ estado }).eq("id", p.id);
    if (error) return toast.error(msg(error.message, "No se pudo mover el proyecto."));
    void cargar();
  };

  const cobrar = async (p: Proyecto) => {
    const c = cobro[p.id] ?? { monto: String(Math.round(p.saldo > 0 ? p.saldo : p.total * 0.5)), metodo: "efectivo", esAbono: p.abono <= 0 };
    if (num(c.monto) <= 0) return toast.error("Escribe el valor a cobrar.");
    const { error } = await supabase.rpc("tal_cobrar_proyecto", { p_proyecto: p.id, p_monto: num(c.monto), p_metodo: c.metodo, p_es_abono: c.esAbono });
    if (error) return toast.error(msg(error.message, "No se pudo registrar el cobro."));
    toast.success(c.esAbono ? "Abono registrado: entró a Caja y Contabilidad." : "Saldo cobrado contra entrega.");
    void cargar();
  };

  const avisar = (p: Proyecto) => {
    const url = aWhatsapp(p.telefono, `Hola ${p.cliente}, tu proyecto "${p.titulo}" está en estado: ${p.estado}. Total ${dinero(p.total)}, abono ${dinero(p.abono)}, saldo ${dinero(p.saldo)}. Fecha de entrega: ${p.fecha_entrega ?? "por confirmar"}.`);
    if (!url) return toast.error("Este proyecto no tiene teléfono registrado.");
    window.open(url, "_blank", "noopener");
  };

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo={rubro === "imprenta" ? "Proyectos de impresión y publicidad" : "Proyectos a la medida"} texto="Cotiza el proyecto con sus materiales, cobra el abono para producir (entra a Caja y Contabilidad) y cobra el saldo contra entrega." />
      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Nueva cotización de proyecto</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {!rubroFijo && (
            <Campo etiqueta="Rubro">
              <select className={campo} value={rubro} onChange={(e) => setRubro(e.target.value)}>
                <option value="carpinteria">Carpintería / mueblería</option>
                <option value="imprenta">Imprenta / publicidad</option>
              </select>
            </Campo>
          )}
          <Campo etiqueta="Cliente *"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
          <Campo etiqueta="Teléfono (WhatsApp)"><input className={campo} inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></Campo>
          <Campo etiqueta="Proyecto *"><input className={campo} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Closet en L, 1000 volantes…" /></Campo>
          <Campo etiqueta="Valor total *"><input className={campo} inputMode="decimal" value={total} onChange={(e) => setTotal(e.target.value)} /></Campo>
          <Campo etiqueta="Fecha de entrega"><input type="date" className={campo} value={fecha} onChange={(e) => setFecha(e.target.value)} /></Campo>
        </div>
        <Campo etiqueta="Descripción"><textarea className={campo} rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></Campo>
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Materiales o insumos del proyecto</p>
          {materiales.map((m, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-3">
              <input className={campo} placeholder="Material" value={m.nombre} onChange={(e) => setMateriales((x) => x.map((y, j) => (j === i ? { ...y, nombre: e.target.value } : y)))} />
              <input className={campo} placeholder="Cantidad" value={m.cantidad} onChange={(e) => setMateriales((x) => x.map((y, j) => (j === i ? { ...y, cantidad: e.target.value } : y)))} />
              <input className={campo} placeholder="Costo" inputMode="decimal" value={m.costo} onChange={(e) => setMateriales((x) => x.map((y, j) => (j === i ? { ...y, costo: e.target.value } : y)))} />
            </div>
          ))}
          <button className={botonSec} onClick={() => setMateriales((x) => [...x, { nombre: "", cantidad: "", costo: "" }])}>Agregar material</button>
        </div>
        <button className={boton} onClick={crear}><Plus className="h-4 w-4" /> Guardar cotización</button>
      </GlassPanel>

      <div className="space-y-3">
        {proyectos.map((p) => {
          const c = cobro[p.id] ?? { monto: String(Math.round(p.saldo > 0 ? p.saldo : p.total * 0.5)), metodo: "efectivo", esAbono: p.abono <= 0 };
          const mats = (Array.isArray(p.materiales) ? p.materiales : []) as Material[];
          return (
            <GlassPanel key={p.id} className="space-y-2 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="min-w-0 break-words font-medium text-foreground">{p.titulo} · {p.cliente}</p>
                <span className="text-xs text-muted-foreground">{p.estado} · entrega {p.fecha_entrega ?? "por confirmar"}</span>
              </div>
              {p.descripcion && <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">{p.descripcion}</p>}
              {mats.length > 0 && (
                <p className="text-xs text-muted-foreground">Materiales: {mats.map((m) => `${m.nombre} × ${m.cantidad}`).join(" · ")}</p>
              )}
              <p className="text-sm text-foreground">Total {dinero(p.total)} · abono {dinero(p.abono)} · saldo {dinero(p.saldo)}</p>
              <div className="flex flex-wrap gap-2">
                {(["cotizado", "aprobado", "produccion", "listo"] as const).includes(p.estado as never) && (
                  <button className={botonSec} onClick={() => cambiarEstado(p, p.estado === "cotizado" ? "aprobado" : p.estado === "aprobado" ? "produccion" : p.estado === "produccion" ? "listo" : "entregado")}>Avanzar ▶</button>
                )}
                <button className={botonSec} onClick={() => avisar(p)}><MessageCircle className="h-4 w-4" /> WhatsApp</button>
              </div>
              {p.estado !== "entregado" && (
                <div className="flex flex-wrap items-end gap-2 rounded-lg border border-glass-border p-2">
                  <Campo etiqueta={c.esAbono ? "Abono (sugerido 50%)" : "Saldo contra entrega"}>
                    <input className={`${campo} w-36`} inputMode="decimal" value={c.monto} onChange={(e) => setCobro((x) => ({ ...x, [p.id]: { ...c, monto: e.target.value } }))} />
                  </Campo>
                  <select className={`${campo} w-auto`} value={c.metodo} onChange={(e) => setCobro((x) => ({ ...x, [p.id]: { ...c, metodo: e.target.value } }))}>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia / tarjeta</option>
                  </select>
                  <label className="flex items-center gap-1.5 text-xs text-foreground">
                    <input type="checkbox" checked={c.esAbono} onChange={(e) => setCobro((x) => ({ ...x, [p.id]: { ...c, esAbono: e.target.checked } }))} /> Es abono
                  </label>
                  <button className={boton} onClick={() => cobrar(p)}>Cobrar {dinero(num(c.monto))}</button>
                </div>
              )}
            </GlassPanel>
          );
        })}
        {proyectos.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay proyectos. Crea la primera cotización arriba.</p>}
      </div>
    </div>
  );
}
