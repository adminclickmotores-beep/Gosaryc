import { useCallback, useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, ImageIcon, MessageCircle, Plus, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { urlLocalPrivada } from "@/lib/archivo-privado";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { usePermisos } from "@/hooks/use-permisos";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";

type Cliente = Tables<"bel_clientes">;
type Servicio = Tables<"bel_servicios">;
type Insumo = Tables<"bel_insumos">;
type ServicioInsumo = Tables<"bel_servicio_insumos">;
type Cita = Tables<"bel_citas">;
type Ficha = Tables<"bel_fichas">;
type Atencion = Tables<"bel_atenciones">;
type Liquidacion = Tables<"bel_liquidaciones">;

const BUCKET = "creditos_docs";
const msg = (m: string | undefined, d: string) => (m && m.length > 0 && m.length < 220 ? m : d);

const aWhatsapp = (tel: string | null | undefined, texto: string): string | null => {
  const d = (tel ?? "").replace(/\D/g, "");
  if (d.length < 7) return null;
  const n = d.length === 10 ? `57${d}` : d;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
};

const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
const diaLargo = (iso: string) => new Date(iso).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
const aLocalISO = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function usarClientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const cargar = useCallback(async () => {
    const { data } = await supabase.from("bel_clientes").select("*").eq("activo", true).order("nombre");
    setClientes(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);
  return { clientes, cargando, recargar: cargar };
}

function usarServicios() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [cargando, setCargando] = useState(true);
  const cargar = useCallback(async () => {
    const { data } = await supabase.from("bel_servicios").select("*").order("nombre");
    setServicios(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);
  return { servicios, cargando, recargar: cargar };
}

// ============================================================
// Agenda por silla / estilista / cabina
// ============================================================
export function AgendaBelleza() {
  const { clientes, cargando: cargC } = usarClientes();
  const { servicios, cargando: cargS } = usarServicios();
  const [dia, setDia] = useState(() => aLocalISO(new Date()));
  const [citas, setCitas] = useState<Cita[]>([]);
  const [manana, setManana] = useState<Cita[]>([]);
  const [conocidos, setConocidos] = useState<{ profesionales: string[]; recursos: string[] }>({ profesionales: [], recursos: [] });
  const [clienteId, setClienteId] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [profesional, setProfesional] = useState("");
  const [recurso, setRecurso] = useState("");
  const [cuando, setCuando] = useState("");
  const [duracion, setDuracion] = useState("30");
  const [notas, setNotas] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [cobrando, setCobrando] = useState<string | null>(null);
  const [metodo, setMetodo] = useState("efectivo");
  const [precioCobro, setPrecioCobro] = useState("");

  const cargar = useCallback(async () => {
    const ini = new Date(`${dia}T00:00:00`);
    const fin = new Date(ini.getTime() + 86400000);
    const { data } = await supabase.from("bel_citas").select("*").gte("inicio", ini.toISOString()).lt("inicio", fin.toISOString()).order("inicio");
    setCitas(data ?? []);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const m0 = new Date(hoy.getTime() + 86400000);
    const m1 = new Date(hoy.getTime() + 2 * 86400000);
    const { data: dm } = await supabase.from("bel_citas").select("*").eq("estado", "agendada").eq("recordatorio_enviado", false)
      .gte("inicio", m0.toISOString()).lt("inicio", m1.toISOString()).order("inicio");
    setManana(dm ?? []);
    const { data: rec } = await supabase.from("bel_citas").select("profesional, recurso").order("created_at", { ascending: false }).limit(300);
    setConocidos({
      profesionales: [...new Set((rec ?? []).map((r) => r.profesional).filter(Boolean))],
      recursos: [...new Set((rec ?? []).map((r) => r.recurso ?? "").filter(Boolean))],
    });
  }, [dia]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const clienteDe = (id: string) => clientes.find((c) => c.id === id);
  const servicioDe = (id: string | null) => servicios.find((s) => s.id === id);

  const lineas = useMemo(() => {
    const g = new Map<string, Cita[]>();
    for (const c of citas) g.set(c.profesional, [...(g.get(c.profesional) ?? []), c]);
    return [...g.entries()];
  }, [citas]);

  const elegirServicio = (id: string) => {
    setServicioId(id);
    const s = servicios.find((x) => x.id === id);
    if (s) setDuracion(String(s.duracion_min));
  };

  const agendar = async () => {
    if (!clienteId) return toast.error("Elige el cliente.");
    if (!profesional.trim()) return toast.error("Escribe quién atiende.");
    if (!cuando) return toast.error("Elige fecha y hora.");
    if (num(duracion) <= 0) return toast.error("La duración debe ser mayor a cero.");
    setGuardando(true);
    const { error } = await supabase.from("bel_citas").insert({
      cliente_id: clienteId,
      servicio_id: servicioId || null,
      profesional: profesional.trim(),
      recurso: recurso.trim() || null,
      inicio: new Date(cuando).toISOString(),
      duracion_min: Math.round(num(duracion)),
      notas: notas.trim() || null,
    });
    setGuardando(false);
    if (error) return toast.error(msg(error.message, "No se pudo agendar la cita."));
    toast.success("Cita agendada.");
    setNotas("");
    setDia(cuando.slice(0, 10));
    void cargar();
  };

  const cambiarEstado = async (id: string, estado: string) => {
    const { error } = await supabase.from("bel_citas").update({ estado }).eq("id", id);
    if (error) return toast.error(msg(error.message, "No se pudo actualizar la cita."));
    void cargar();
  };

  const cobrar = async (c: Cita) => {
    const precio = precioCobro.trim() ? num(precioCobro) : null;
    const { error } = await supabase.rpc("bel_registrar_atencion", {
      p_cita: c.id, p_cliente: c.cliente_id, p_profesional: c.profesional, p_servicio: c.servicio_id,
      p_concepto: null, p_tipo: "servicio", p_precio: precio, p_costo: null, p_comision_pct: null, p_metodo: metodo,
    });
    if (error) return toast.error(msg(error.message, "No se pudo cobrar la cita."));
    toast.success("Cita finalizada. El cobro entró a Caja y Contabilidad y la comisión quedó pendiente.");
    setCobrando(null);
    setPrecioCobro("");
    void cargar();
  };

  const recordar = async (c: Cita) => {
    const cli = clienteDe(c.cliente_id);
    const s = servicioDe(c.servicio_id);
    const url = aWhatsapp(cli?.telefono, `Hola ${cli?.nombre ?? ""}, te recordamos tu cita${s ? ` de ${s.nombre}` : ""} el ${diaLargo(c.inicio)} a las ${hora(c.inicio)} con ${c.profesional}. ¡Te esperamos! Si no puedes asistir, avísanos.`);
    if (!url) return toast.error("Este cliente no tiene teléfono registrado.");
    window.open(url, "_blank", "noopener");
    await supabase.from("bel_citas").update({ recordatorio_enviado: true }).eq("id", c.id);
    void cargar();
  };

  if (cargC || cargS) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Agenda por silla, estilista y cabina" texto="Reserva citas por servicio con su duración. El sistema no deja cruzar a un mismo profesional ni la misma silla o cabina." />

      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Nueva cita</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Cliente *">
            <select className={campo} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
              <option value="">Elige un cliente</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Servicio">
            <select className={campo} value={servicioId} onChange={(e) => elegirServicio(e.target.value)}>
              <option value="">Sin servicio definido</option>
              {servicios.filter((s) => s.activo).map((s) => <option key={s.id} value={s.id}>{s.nombre} · {s.duracion_min} min</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Estilista o barbero *">
            <input className={campo} list="bel-profesionales" value={profesional} onChange={(e) => setProfesional(e.target.value)} />
            <datalist id="bel-profesionales">{conocidos.profesionales.map((p) => <option key={p} value={p} />)}</datalist>
          </Campo>
          <Campo etiqueta="Silla o cabina">
            <input className={campo} list="bel-recursos" placeholder="Silla 2, Cabina 1…" value={recurso} onChange={(e) => setRecurso(e.target.value)} />
            <datalist id="bel-recursos">{conocidos.recursos.map((p) => <option key={p} value={p} />)}</datalist>
          </Campo>
          <Campo etiqueta="Fecha y hora *"><input type="datetime-local" className={campo} value={cuando} onChange={(e) => setCuando(e.target.value)} /></Campo>
          <Campo etiqueta="Duración (min)"><input className={campo} inputMode="numeric" value={duracion} onChange={(e) => setDuracion(e.target.value)} /></Campo>
        </div>
        <Campo etiqueta="Notas"><input className={campo} value={notas} onChange={(e) => setNotas(e.target.value)} /></Campo>
        <button className={boton} disabled={guardando} onClick={agendar}><Plus className="h-4 w-4" /> Agendar cita</button>
      </GlassPanel>

      {manana.length > 0 && (
        <GlassPanel className="space-y-2 p-5">
          <h2 className="font-medium text-foreground">Recordatorios de mañana ({manana.length})</h2>
          <p className="text-xs text-muted-foreground">Un clic abre WhatsApp con el mensaje listo y marca el recordatorio como enviado.</p>
          {manana.map((c) => (
            <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-glass-border p-2 text-sm">
              <span className="min-w-0 break-words text-foreground">{hora(c.inicio)} · {clienteDe(c.cliente_id)?.nombre ?? "Cliente"} · {c.profesional}</span>
              <button className={botonSec} onClick={() => recordar(c)}><MessageCircle className="h-4 w-4" /> Recordar</button>
            </div>
          ))}
        </GlassPanel>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <Campo etiqueta="Ver el día"><input type="date" className={campo} value={dia} onChange={(e) => setDia(e.target.value)} /></Campo>
        <p className="pb-2 text-sm capitalize text-muted-foreground">{diaLargo(`${dia}T12:00:00`)}</p>
      </div>

      {lineas.length === 0 && <p className="text-sm text-muted-foreground">No hay citas este día.</p>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lineas.map(([prof, lista]) => (
          <div key={prof} className="space-y-2">
            <h3 className="text-sm font-medium text-foreground">{prof}</h3>
            {lista.map((c) => {
              const cli = clienteDe(c.cliente_id);
              const abierta = c.estado === "agendada" || c.estado === "en_atencion";
              return (
                <GlassPanel key={c.id} className="space-y-2 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="min-w-0 break-words text-sm font-medium text-foreground">{hora(c.inicio)} · {cli?.nombre ?? "Cliente"}</p>
                    <span className="text-xs text-muted-foreground">{c.estado.replace("_", " ")}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {servicioDe(c.servicio_id)?.nombre ?? "Sin servicio"} · {c.duracion_min} min{c.recurso ? ` · ${c.recurso}` : ""}
                  </p>
                  {cli?.alergias && (
                    <p className="flex items-start gap-1 text-xs text-destructive"><ShieldAlert className="mt-0.5 h-3 w-3 shrink-0" /> Alergias: {cli.alergias}</p>
                  )}
                  {abierta && cobrando !== c.id && (
                    <div className="flex flex-wrap gap-2">
                      <button className={botonSec} onClick={() => { setCobrando(c.id); setPrecioCobro(""); }}><CheckCircle2 className="h-4 w-4" /> Cobrar y finalizar</button>
                      <button className={botonSec} onClick={() => recordar(c)}><MessageCircle className="h-4 w-4" /> WhatsApp</button>
                      <button className={botonSec} onClick={() => cambiarEstado(c.id, "no_asistio")}><XCircle className="h-4 w-4" /> No asistió</button>
                      <button className={botonSec} onClick={() => cambiarEstado(c.id, "cancelada")}>Cancelar</button>
                    </div>
                  )}
                  {abierta && cobrando === c.id && (
                    <div className="space-y-2 rounded-lg border border-glass-border p-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Campo etiqueta="Método de pago">
                          <select className={campo} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                            <option value="efectivo">Efectivo</option>
                            <option value="transferencia">Transferencia / tarjeta</option>
                          </select>
                        </Campo>
                        <Campo etiqueta={`Precio (vacío = ${servicioDe(c.servicio_id) ? dinero(servicioDe(c.servicio_id)?.precio ?? 0) : "requerido"})`}>
                          <input className={campo} inputMode="decimal" value={precioCobro} onChange={(e) => setPrecioCobro(e.target.value)} />
                        </Campo>
                      </div>
                      <div className="flex gap-2">
                        <button className={boton} onClick={() => cobrar(c)}>Confirmar cobro</button>
                        <button className={botonSec} onClick={() => setCobrando(null)}>Volver</button>
                      </div>
                    </div>
                  )}
                </GlassPanel>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Clientes y ficha técnica estética
// ============================================================
function FotoFicha({ ruta, titulo }: { ruta: string | null; titulo: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    if (!ruta) return;
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
  if (!ruta) return null;
  return (
    <figure className="min-w-0">
      {url ? <img src={url} alt={titulo} className="h-32 max-w-full rounded-lg object-cover" /> : <ImageIcon className="h-6 w-6 text-muted-foreground" />}
      <figcaption className="mt-1 text-xs text-muted-foreground">{titulo}</figcaption>
    </figure>
  );
}

async function subirFoto(file: File): Promise<string | null> {
  const { data: owner } = await supabase.rpc("mi_negocio_id");
  const ext = (file.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ruta = `${owner}/belleza/${crypto.randomUUID()}.${ext || "jpg"}`;
  const { error } = await supabase.storage.from(BUCKET).upload(ruta, file, { contentType: file.type || undefined });
  return error ? null : ruta;
}

export function FichasBelleza() {
  const { clientes, cargando, recargar } = usarClientes();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [alergiasNuevo, setAlergiasNuevo] = useState("");
  const [sel, setSel] = useState("");
  const [buscar, setBuscar] = useState("");
  const [fichas, setFichas] = useState<Ficha[]>([]);
  const [alergias, setAlergias] = useState("");
  const [formula, setFormula] = useState("");
  const [notas, setNotas] = useState("");
  const [profesional, setProfesional] = useState("");
  const [antes, setAntes] = useState<File | null>(null);
  const [despues, setDespues] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);

  const cliente = clientes.find((c) => c.id === sel);
  useEffect(() => {
    setAlergias(cliente?.alergias ?? "");
  }, [cliente?.id, cliente?.alergias]);

  const cargarFichas = useCallback(async () => {
    if (!sel) return setFichas([]);
    const { data } = await supabase.from("bel_fichas").select("*").eq("cliente_id", sel).order("created_at", { ascending: false });
    setFichas(data ?? []);
  }, [sel]);
  useEffect(() => {
    void cargarFichas();
  }, [cargarFichas]);

  const crear = async () => {
    if (nombre.trim().length < 2) return toast.error("Escribe el nombre del cliente.");
    const { data, error } = await supabase.from("bel_clientes").insert({
      nombre: nombre.trim(), telefono: telefono.trim() || null, alergias: alergiasNuevo.trim() || null,
    }).select("id").single();
    if (error) return toast.error(msg(error.message, "No se pudo guardar el cliente."));
    toast.success("Cliente guardado.");
    setNombre(""); setTelefono(""); setAlergiasNuevo("");
    await recargar();
    if (data) setSel(data.id);
  };

  const guardarAlergias = async () => {
    if (!cliente) return;
    const { error } = await supabase.from("bel_clientes").update({ alergias: alergias.trim() || null }).eq("id", cliente.id);
    if (error) return toast.error(msg(error.message, "No se pudieron guardar las alergias."));
    toast.success("Alergias guardadas.");
    void recargar();
  };

  const guardarFicha = async () => {
    if (!cliente) return;
    if (!formula.trim() && !notas.trim() && !antes && !despues) return toast.error("Escribe la fórmula, una nota o agrega una foto.");
    setGuardando(true);
    const fa = antes ? await subirFoto(antes) : null;
    const fd = despues ? await subirFoto(despues) : null;
    if ((antes && !fa) || (despues && !fd)) {
      setGuardando(false);
      return toast.error("No se pudo subir una de las fotos.");
    }
    const { error } = await supabase.from("bel_fichas").insert({
      cliente_id: cliente.id, formula: formula.trim() || null, notas: notas.trim() || null,
      profesional: profesional.trim() || null, foto_antes: fa, foto_despues: fd,
    });
    setGuardando(false);
    if (error) return toast.error(msg(error.message, "No se pudo guardar la ficha."));
    toast.success("Ficha guardada en el historial.");
    setFormula(""); setNotas(""); setAntes(null); setDespues(null);
    void cargarFichas();
  };

  const lista = clientes.filter((c) => c.nombre.toLowerCase().includes(buscar.trim().toLowerCase()) || (c.telefono ?? "").includes(buscar.trim()));
  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Clientes y ficha técnica" texto="Historial de fórmulas de tinte, alergias y fotos de antes y después. Las fichas no se editan ni se borran: cada visita es un registro nuevo." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <div className="space-y-4">
          <GlassPanel className="space-y-3 p-4">
            <h2 className="font-medium text-foreground">Nuevo cliente</h2>
            <Campo etiqueta="Nombre *"><input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
            <Campo etiqueta="Teléfono (WhatsApp)"><input className={campo} inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></Campo>
            <Campo etiqueta="Alergias"><input className={campo} value={alergiasNuevo} onChange={(e) => setAlergiasNuevo(e.target.value)} /></Campo>
            <button className={boton} onClick={crear}><Plus className="h-4 w-4" /> Guardar cliente</button>
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            <input className={campo} placeholder="Buscar cliente…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
            <div className="max-h-80 space-y-1 overflow-y-auto">
              {lista.map((c) => (
                <button key={c.id} onClick={() => setSel(c.id)} className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2 text-left text-sm ${sel === c.id ? "border-primary/60 bg-primary/10" : "border-glass-border"}`}>
                  <span className="min-w-0 break-words text-foreground">{c.nombre}</span>
                  {c.alergias && <ShieldAlert className="h-4 w-4 shrink-0 text-destructive" />}
                </button>
              ))}
              {lista.length === 0 && <p className="text-sm text-muted-foreground">Sin resultados.</p>}
            </div>
          </GlassPanel>
        </div>

        <div className="space-y-4">
          {!cliente && <p className="text-sm text-muted-foreground">Elige o crea un cliente para ver su ficha.</p>}
          {cliente && (
            <>
              <GlassPanel className="space-y-3 p-4">
                <h2 className="break-words font-medium text-foreground">{cliente.nombre}{cliente.telefono ? ` · ${cliente.telefono}` : ""}</h2>
                <Campo etiqueta="Alergias y sensibilidades">
                  <input className={`${campo} ${alergias ? "border-destructive/60" : ""}`} value={alergias} onChange={(e) => setAlergias(e.target.value)} />
                </Campo>
                <button className={botonSec} onClick={guardarAlergias}>Guardar alergias</button>
              </GlassPanel>

              <GlassPanel className="space-y-3 p-4">
                <h2 className="font-medium text-foreground">Nueva ficha de la visita</h2>
                <Campo etiqueta="Fórmula (tinte, oxidante, tiempos…)"><textarea className={campo} rows={3} value={formula} onChange={(e) => setFormula(e.target.value)} /></Campo>
                <Campo etiqueta="Notas del trabajo"><textarea className={campo} rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} /></Campo>
                <Campo etiqueta="Atendió"><input className={campo} value={profesional} onChange={(e) => setProfesional(e.target.value)} /></Campo>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Campo etiqueta="Foto antes"><input type="file" accept="image/*" className={campo} onChange={(e) => setAntes(e.target.files?.[0] ?? null)} /></Campo>
                  <Campo etiqueta="Foto después"><input type="file" accept="image/*" className={campo} onChange={(e) => setDespues(e.target.files?.[0] ?? null)} /></Campo>
                </div>
                <button className={boton} disabled={guardando} onClick={guardarFicha}><Camera className="h-4 w-4" /> Guardar ficha</button>
              </GlassPanel>

              <div className="space-y-2">
                <h2 className="font-medium text-foreground">Historial</h2>
                {fichas.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay fichas de este cliente.</p>}
                {fichas.map((f) => (
                  <GlassPanel key={f.id} className="space-y-2 p-3">
                    <p className="text-xs text-muted-foreground">{f.fecha}{f.profesional ? ` · ${f.profesional}` : ""}</p>
                    {f.formula && <p className="whitespace-pre-wrap break-words text-sm text-foreground"><b>Fórmula:</b> {f.formula}</p>}
                    {f.notas && <p className="whitespace-pre-wrap break-words text-sm text-foreground">{f.notas}</p>}
                    <div className="flex flex-wrap gap-3">
                      <FotoFicha ruta={f.foto_antes} titulo="Antes" />
                      <FotoFicha ruta={f.foto_despues} titulo="Después" />
                    </div>
                  </GlassPanel>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Servicios, duración, comisión e insumos que consumen
// ============================================================
export function ServiciosBelleza() {
  const { esAdmin, cargando: cargPermisos } = usePermisos();
  const { servicios, cargando, recargar } = usarServicios();
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [recetas, setRecetas] = useState<ServicioInsumo[]>([]);
  const [nombre, setNombre] = useState("");
  const [duracion, setDuracion] = useState("30");
  const [precio, setPrecio] = useState("");
  const [pct, setPct] = useState("40");
  const [descontar, setDescontar] = useState(true);
  const [iNombre, setINombre] = useState("");
  const [iUnidad, setIUnidad] = useState("g");
  const [iStock, setIStock] = useState("");
  const [iCosto, setICosto] = useState("");
  const [agregar, setAgregar] = useState<Record<string, { insumo: string; cantidad: string }>>({});
  const [sumar, setSumar] = useState<Record<string, string>>({});

  const cargarInsumos = useCallback(async () => {
    if (!esAdmin) {
      setInsumos([]);
      setRecetas([]);
      return;
    }
    const [i, r] = await Promise.all([
      supabase.from("bel_insumos").select("*").order("nombre"),
      supabase.from("bel_servicio_insumos").select("*"),
    ]);
    setInsumos(i.data ?? []);
    setRecetas(r.data ?? []);
  }, [esAdmin]);
  useEffect(() => {
    if (!cargPermisos) void cargarInsumos();
  }, [cargPermisos, cargarInsumos]);

  const crearServicio = async () => {
    if (!esAdmin) return toast.error("Solo el dueño o administrador puede crear servicios.");
    if (nombre.trim().length < 2) return toast.error("Escribe el nombre del servicio.");
    if (num(duracion) <= 0) return toast.error("La duración debe ser mayor a cero.");
    const { error } = await supabase.from("bel_servicios").insert({
      nombre: nombre.trim(), duracion_min: Math.round(num(duracion)), precio: num(precio),
      comision_pct: Math.min(Math.max(num(pct), 0), 100), descontar_insumos: descontar,
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el servicio."));
    toast.success("Servicio guardado.");
    setNombre(""); setPrecio("");
    void recargar();
  };

  const crearInsumo = async () => {
    if (!esAdmin) return toast.error("Solo el dueño o administrador puede crear insumos.");
    if (iNombre.trim().length < 2) return toast.error("Escribe el nombre del insumo.");
    const { error } = await supabase.from("bel_insumos").insert({
      nombre: iNombre.trim(), unidad: iUnidad.trim() || "und", stock: Math.max(num(iStock), 0), costo_unitario: Math.max(num(iCosto), 0),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el insumo."));
    toast.success("Insumo guardado.");
    setINombre(""); setIStock(""); setICosto("");
    void cargarInsumos();
  };

  const sumarStock = async (i: Insumo) => {
    if (!esAdmin) return toast.error("Solo el dueño o administrador puede editar el inventario.");
    const n = num(sumar[i.id] ?? "");
    if (n <= 0) return toast.error("Escribe cuánto entra.");
    const { error } = await supabase.from("bel_insumos").update({ stock: i.stock + n }).eq("id", i.id);
    if (error) return toast.error(msg(error.message, "No se pudo actualizar el inventario."));
    setSumar((s) => ({ ...s, [i.id]: "" }));
    void cargarInsumos();
  };

  const asociar = async (servicioId: string) => {
    if (!esAdmin) return toast.error("Solo el dueño o administrador puede configurar recetas.");
    const a = agregar[servicioId];
    if (!a?.insumo || num(a.cantidad) <= 0) return toast.error("Elige el insumo y la cantidad por servicio.");
    const { error } = await supabase.from("bel_servicio_insumos").insert({ servicio_id: servicioId, insumo_id: a.insumo, cantidad: num(a.cantidad) });
    if (error) return toast.error(msg(error.message, "No se pudo asociar el insumo."));
    setAgregar((s) => ({ ...s, [servicioId]: { insumo: "", cantidad: "" } }));
    void cargarInsumos();
  };

  const cambiarCantidad = async (r: ServicioInsumo) => {
    if (!esAdmin) return toast.error("Solo el dueño o administrador puede editar recetas.");
    const nueva = window.prompt("Nueva cantidad que gasta cada servicio:", String(r.cantidad));
    if (nueva === null) return;
    if (num(nueva) <= 0) return toast.error("La cantidad debe ser mayor a cero.");
    const { error } = await supabase.from("bel_servicio_insumos").update({ cantidad: num(nueva) }).eq("id", r.id);
    if (error) return toast.error(msg(error.message, "No se pudo cambiar la cantidad."));
    void cargarInsumos();
  };

  const activar = async (s: Servicio) => {
    if (!esAdmin) return toast.error("Solo el dueño o administrador puede editar servicios.");
    const { error } = await supabase.from("bel_servicios").update({ activo: !s.activo }).eq("id", s.id);
    if (error) return toast.error(msg(error.message, "No se pudo actualizar el servicio."));
    void recargar();
  };

  if (cargando || cargPermisos) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Servicios, comisiones e insumos" texto="Cada servicio lleva duración, precio, porcentaje de comisión y los insumos que gasta; al cobrar, los insumos se descuentan solos." />

      {!esAdmin && (
        <GlassPanel className="p-4 text-sm text-muted-foreground">
          Vista de solo lectura. Solo el dueño o administrador del negocio puede crear o editar servicios, porcentajes de comisión, insumos y recetas.
        </GlassPanel>
      )}

      {esAdmin && (
        <GlassPanel className="space-y-3 p-5">
          <h2 className="font-medium text-foreground">Nuevo servicio</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo etiqueta="Nombre *"><input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
            <Campo etiqueta="Duración (min)"><input className={campo} inputMode="numeric" value={duracion} onChange={(e) => setDuracion(e.target.value)} /></Campo>
            <Campo etiqueta="Precio"><input className={campo} inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Campo>
            <Campo etiqueta="Comisión del estilista (%)"><input className={campo} inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} /></Campo>
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={descontar} onChange={(e) => setDescontar(e.target.checked)} /> Descontar el costo de los insumos antes de calcular la comisión
          </label>
          <button className={boton} onClick={crearServicio}><Plus className="h-4 w-4" /> Guardar servicio</button>
        </GlassPanel>
      )}

      <div className="space-y-3">
        {servicios.map((s) => {
          const mias = recetas.filter((r) => r.servicio_id === s.id);
          const a = agregar[s.id] ?? { insumo: "", cantidad: "" };
          return (
            <GlassPanel key={s.id} className={`space-y-2 p-4 ${s.activo ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 break-words font-medium text-foreground">{s.nombre} · {s.duracion_min} min · {dinero(s.precio)} · {s.comision_pct}%</p>
                {esAdmin && (
                  <button className={botonSec} onClick={() => activar(s)}>{s.activo ? "Desactivar" : "Activar"}</button>
                )}
              </div>
              {esAdmin && mias.map((r) => {
                const ins = insumos.find((i) => i.id === r.insumo_id);
                return (
                  <div key={r.id} className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span className="min-w-0 break-words">Gasta {r.cantidad} {ins?.unidad} de {ins?.nombre ?? "insumo"}</span>
                    <button className="text-xs text-primary hover:underline" onClick={() => cambiarCantidad(r)}>Cambiar cantidad</button>
                  </div>
                );
              })}
              {esAdmin && (
                <div className="flex flex-wrap items-end gap-2">
                  <select className={`${campo} sm:max-w-xs`} value={a.insumo} onChange={(e) => setAgregar((x) => ({ ...x, [s.id]: { ...a, insumo: e.target.value } }))}>
                    <option value="">Agregar insumo…</option>
                    {insumos.filter((i) => i.activo).map((i) => <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>)}
                  </select>
                  <input className={`${campo} sm:max-w-[8rem]`} inputMode="decimal" placeholder="Cantidad" value={a.cantidad} onChange={(e) => setAgregar((x) => ({ ...x, [s.id]: { ...a, cantidad: e.target.value } }))} />
                  <button className={botonSec} onClick={() => asociar(s.id)}>Agregar</button>
                </div>
              )}
            </GlassPanel>
          );
        })}
        {servicios.length === 0 && <p className="text-sm text-muted-foreground">{esAdmin ? "Aún no hay servicios. Crea el primero arriba." : "Aún no hay servicios registrados."}</p>}
      </div>

      {esAdmin && (
        <GlassPanel className="space-y-3 p-5">
          <h2 className="font-medium text-foreground">Insumos (tintes, ampolletas, cera…)</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Campo etiqueta="Nombre *"><input className={campo} value={iNombre} onChange={(e) => setINombre(e.target.value)} /></Campo>
            <Campo etiqueta="Unidad (g, ml, und)"><input className={campo} value={iUnidad} onChange={(e) => setIUnidad(e.target.value)} /></Campo>
            <Campo etiqueta="Existencia inicial"><input className={campo} inputMode="decimal" value={iStock} onChange={(e) => setIStock(e.target.value)} /></Campo>
            <Campo etiqueta="Costo por unidad"><input className={campo} inputMode="decimal" value={iCosto} onChange={(e) => setICosto(e.target.value)} /></Campo>
          </div>
          <button className={boton} onClick={crearInsumo}><Plus className="h-4 w-4" /> Guardar insumo</button>
          <div className="space-y-2 pt-2">
            {insumos.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-glass-border p-2 text-sm">
                <span className="min-w-0 break-words text-foreground">{i.nombre}: {Math.round(i.stock * 1000) / 1000} {i.unidad} · {dinero(i.costo_unitario)}/{i.unidad}</span>
                <span className="flex items-center gap-2">
                  <input className={`${campo} w-28`} inputMode="decimal" placeholder="Entra…" value={sumar[i.id] ?? ""} onChange={(e) => setSumar((x) => ({ ...x, [i.id]: e.target.value }))} />
                  <button className={botonSec} onClick={() => sumarStock(i)}>Sumar</button>
                </span>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}

// ============================================================
// Comisiones en tiempo real, venta rápida y liquidación
// ============================================================
export function ComisionesBelleza() {
  const { esAdmin } = usePermisos();
  const { servicios } = usarServicios();
  const [pendientes, setPendientes] = useState<Atencion[]>([]);
  const [recientes, setRecientes] = useState<Atencion[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [prof, setProf] = useState("");
  const [tipo, setTipo] = useState<"servicio" | "producto">("servicio");
  const [servicioId, setServicioId] = useState("");
  const [concepto, setConcepto] = useState("");
  const [precio, setPrecio] = useState("");
  const [costo, setCosto] = useState("");
  const [pct, setPct] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [metodoPago, setMetodoPago] = useState("efectivo");
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    const [p, r, l] = await Promise.all([
      supabase.from("bel_atenciones").select("*").eq("estado", "pendiente").gt("comision", 0).order("created_at", { ascending: false }),
      supabase.from("bel_atenciones").select("*").order("created_at", { ascending: false }).limit(25),
      supabase.from("bel_liquidaciones").select("*").order("created_at", { ascending: false }).limit(15),
    ]);
    setPendientes(p.data ?? []);
    setRecientes(r.data ?? []);
    setLiquidaciones(l.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const porProfesional = useMemo(() => {
    const g = new Map<string, { total: number; ventas: number; n: number }>();
    for (const a of pendientes) {
      const x = g.get(a.profesional) ?? { total: 0, ventas: 0, n: 0 };
      g.set(a.profesional, { total: x.total + a.comision, ventas: x.ventas + a.precio, n: x.n + 1 });
    }
    return [...g.entries()];
  }, [pendientes]);

  const vender = async () => {
    if (!esAdmin) return toast.error("Solo el dueño o administrador puede registrar ventas con reglas personalizadas.");
    if (!prof.trim()) return toast.error("Escribe quién atendió o vendió.");
    if (tipo === "servicio" && !servicioId) return toast.error("Elige el servicio.");
    if (tipo === "producto" && !concepto.trim()) return toast.error("Escribe qué producto se vendió.");
    setGuardando(true);
    const { error } = await supabase.rpc("bel_registrar_atencion", {
      p_cita: null, p_cliente: null, p_profesional: prof.trim(),
      p_servicio: tipo === "servicio" ? servicioId : null,
      p_concepto: tipo === "producto" ? concepto.trim() : null,
      p_tipo: tipo,
      p_precio: precio.trim() ? num(precio) : null,
      p_costo: tipo === "producto" ? num(costo) : null,
      p_comision_pct: pct.trim() ? num(pct) : null,
      p_metodo: metodo,
    });
    setGuardando(false);
    if (error) return toast.error(msg(error.message, "No se pudo registrar la venta."));
    toast.success("Venta registrada. Entró a Caja y Contabilidad y la comisión quedó pendiente.");
    setConcepto(""); setPrecio(""); setCosto(""); setPct("");
    void cargar();
  };

  const liquidar = async (profesional: string) => {
    if (!esAdmin) return toast.error("Solo el dueño o administrador puede liquidar comisiones.");
    const { data, error } = await supabase.rpc("bel_liquidar_comisiones", { p_profesional: profesional, p_hasta: new Date().toISOString().slice(0, 10), p_metodo: metodoPago });
    if (error) return toast.error(msg(error.message, "No se pudo liquidar."));
    toast.success(`Liquidación pagada: ${dinero(Number(data ?? 0))}. Salió de Caja y quedó en Contabilidad.`);
    void cargar();
  };

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Comisiones y liquidación" texto="Cada servicio o producto vendido calcula la comisión del estilista (descontando el costo de insumos si aplica). Liquidar paga lo pendiente desde Caja y lo registra en Contabilidad." />

      {!esAdmin && (
        <GlassPanel className="p-4 text-sm text-muted-foreground">
          Vista de solo lectura: aquí ves únicamente tus propios servicios registrados y tus comisiones ganadas. Solo el dueño o administrador puede modificar porcentajes, registrar ventas rápidas o liquidar comisiones.
        </GlassPanel>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {porProfesional.length === 0 && <p className="text-sm text-muted-foreground">No hay comisiones pendientes.</p>}
        {porProfesional.map(([nombre, x]) => (
          <GlassPanel key={nombre} className="space-y-2 p-4">
            <p className="break-words font-medium text-foreground">{nombre}</p>
            <p className="font-display text-2xl text-foreground">{dinero(x.total)}</p>
            <p className="text-xs text-muted-foreground">{x.n} servicios o ventas · {dinero(x.ventas)} vendidos</p>
            {esAdmin ? (
              <div className="flex flex-wrap items-center gap-2">
                <select className={`${campo} w-auto`} value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                  <option value="efectivo">Pagar en efectivo</option>
                  <option value="transferencia">Pagar por transferencia</option>
                </select>
                <button className={boton} onClick={() => liquidar(nombre)}>Liquidar</button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Solo el dueño liquida.</p>
            )}
          </GlassPanel>
        ))}
      </div>

      {esAdmin && (
        <GlassPanel className="space-y-3 p-5">
          <h2 className="font-medium text-foreground">Venta rápida (sin cita)</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Campo etiqueta="Atendió o vendió *"><input className={campo} value={prof} onChange={(e) => setProf(e.target.value)} /></Campo>
            <Campo etiqueta="Qué se vende">
              <select className={campo} value={tipo} onChange={(e) => setTipo(e.target.value as "servicio" | "producto")}>
                <option value="servicio">Servicio</option>
                <option value="producto">Producto</option>
              </select>
            </Campo>
            {tipo === "servicio" ? (
              <Campo etiqueta="Servicio *">
                <select className={campo} value={servicioId} onChange={(e) => setServicioId(e.target.value)}>
                  <option value="">Elige un servicio</option>
                  {servicios.filter((s) => s.activo).map((s) => <option key={s.id} value={s.id}>{s.nombre} · {dinero(s.precio)}</option>)}
                </select>
              </Campo>
            ) : (
              <Campo etiqueta="Producto *"><input className={campo} value={concepto} onChange={(e) => setConcepto(e.target.value)} /></Campo>
            )}
            <Campo etiqueta={tipo === "servicio" ? "Precio (vacío = el del servicio)" : "Precio *"}><input className={campo} inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Campo>
            {tipo === "producto" && <Campo etiqueta="Costo del producto"><input className={campo} inputMode="decimal" value={costo} onChange={(e) => setCosto(e.target.value)} /></Campo>}
            <Campo etiqueta={tipo === "servicio" ? "Comisión % (vacío = la del servicio)" : "Comisión %"}><input className={campo} inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} /></Campo>
            <Campo etiqueta="Método de pago">
              <select className={campo} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="transferencia">Transferencia / tarjeta</option>
              </select>
            </Campo>
          </div>
          <button className={boton} disabled={guardando} onClick={vender}>Registrar venta</button>
        </GlassPanel>
      )}

      <div className="space-y-2">
        <h2 className="font-medium text-foreground">Últimos servicios y ventas</h2>
        {recientes.map((a) => (
          <GlassPanel key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <span className="min-w-0 break-words text-foreground">{a.fecha} · {a.concepto} · {a.profesional}</span>
            <span className="text-muted-foreground">
              {dinero(a.precio)} · comisión {dinero(a.comision)} {a.estado === "liquidada" ? "(pagada)" : "(pendiente)"}
            </span>
          </GlassPanel>
        ))}
      </div>

      {liquidaciones.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-medium text-foreground">Liquidaciones pagadas</h2>
          {liquidaciones.map((l) => (
            <GlassPanel key={l.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <span className="min-w-0 break-words text-foreground">{l.created_at.slice(0, 10)} · {l.profesional} · {l.atenciones} servicios</span>
              <span className="text-muted-foreground">{dinero(l.total_comision)} · {l.metodo}</span>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  );
}
