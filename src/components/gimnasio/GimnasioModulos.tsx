import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Plus, ScanLine, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";

type Socio = Tables<"gim_socios">;
type Plan = Tables<"gim_planes">;
type Membresia = Tables<"gim_membresias">;
type Acceso = Tables<"gim_accesos">;
type Valoracion = Tables<"gim_valoraciones">;

const msg = (m: string | undefined, d: string) => (m && m.length > 0 && m.length < 220 ? m : d);
const aWhatsapp = (tel: string | null | undefined, texto: string): string | null => {
  const d = (tel ?? "").replace(/\D/g, "");
  if (d.length < 7) return null;
  return `https://wa.me/${d.length === 10 ? `57${d}` : d}?text=${encodeURIComponent(texto)}`;
};
const hoyISO = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const diasHasta = (fecha: string) => Math.round((new Date(`${fecha}T00:00:00`).getTime() - new Date(`${hoyISO()}T00:00:00`).getTime()) / 86400000);

const ROJO = "border-destructive/60 bg-destructive/10 text-destructive";
const VERDE = "border-primary/50 bg-primary/10 text-foreground";

/** Estado de la última membresía del socio. */
function estadoDe(m: Membresia | undefined): { texto: string; clase: string; alerta: boolean } {
  if (!m) return { texto: "Sin membresía", clase: ROJO, alerta: true };
  if (m.estado === "congelada") return { texto: "Congelada", clase: "border-glass-border text-muted-foreground", alerta: false };
  const d = diasHasta(m.vence);
  if (d < 0) return { texto: `Vencida hace ${-d} día(s)`, clase: ROJO, alerta: true };
  if (m.sesiones_restantes !== null && m.sesiones_restantes <= 0) return { texto: "Sin sesiones", clase: ROJO, alerta: true };
  if (d <= 5) return { texto: `Vence en ${d} día(s)`, clase: ROJO, alerta: true };
  return { texto: `Al día · vence ${m.vence}`, clase: VERDE, alerta: false };
}

function usarGimnasio() {
  const [socios, setSocios] = useState<Socio[]>([]);
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [membresias, setMembresias] = useState<Membresia[]>([]);
  const [cargando, setCargando] = useState(true);
  const cargar = useCallback(async () => {
    const [s, p, m] = await Promise.all([
      supabase.from("gim_socios").select("*").eq("activo", true).order("nombre"),
      supabase.from("gim_planes").select("*").order("duracion_dias"),
      supabase.from("gim_membresias").select("*").order("vence", { ascending: false }),
    ]);
    setSocios(s.data ?? []);
    setPlanes(p.data ?? []);
    setMembresias(m.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);
  const ultima = (socioId: string) => membresias.find((m) => m.socio_id === socioId);
  return { socios, planes, membresias, cargando, recargar: cargar, ultima };
}

const textoCobro = (nombre: string, plan: string | undefined, vence: string | undefined) =>
  `Hola ${nombre}, te escribimos del gimnasio. Tu membresía${plan ? ` ${plan}` : ""} ${vence ? (diasHasta(vence) < 0 ? `venció el ${vence}` : `vence el ${vence}`) : "no está activa"}. ¿Quieres renovarla hoy? Te esperamos.`;

// ============================================================
// Check-in rápido por cédula o QR
// ============================================================
type ResCheckin = { resultado: string; nombre?: string; telefono?: string | null; plan?: string; vence?: string; dias?: number; sesiones?: number | null };
const TITULO_RES: Record<string, string> = {
  permitido: "Acceso permitido", por_vencer: "Acceso permitido: le quedan pocos días", vencida: "Membresía vencida",
  congelada: "Membresía congelada", sin_membresia: "Sin membresía", no_iniciada: "La membresía aún no inicia",
  sin_sesiones: "Se acabaron las sesiones", no_encontrado: "Socio no encontrado",
};

export function CheckinGimnasio() {
  const { socios } = usarGimnasio();
  const [codigo, setCodigo] = useState("");
  const [res, setRes] = useState<ResCheckin | null>(null);
  const [accesos, setAccesos] = useState<Acceso[]>([]);
  const [cargando, setCargando] = useState(false);
  const entrada = useRef<HTMLInputElement | null>(null);

  const cargarAccesos = useCallback(async () => {
    const { data } = await supabase.from("gim_accesos").select("*").order("created_at", { ascending: false }).limit(15);
    setAccesos(data ?? []);
  }, []);
  useEffect(() => {
    void cargarAccesos();
    entrada.current?.focus();
  }, [cargarAccesos]);

  const entrar = async () => {
    if (!codigo.trim()) return;
    setCargando(true);
    const { data, error } = await supabase.rpc("gim_checkin", { p_codigo: codigo.trim() });
    setCargando(false);
    if (error) return toast.error(msg(error.message, "No se pudo registrar el ingreso."));
    setRes(data as unknown as ResCheckin);
    setCodigo("");
    void cargarAccesos();
    entrada.current?.focus();
  };

  const bien = res?.resultado === "permitido";
  const wa = res && res.resultado !== "permitido" && res.resultado !== "no_encontrado" && res.nombre
    ? aWhatsapp(res.telefono, textoCobro(res.nombre, res.plan, res.vence)) : null;

  return (
    <div className="space-y-6">
      <Encabezado titulo="Check-in de socios" texto="Escribe la cédula o escanea el código QR y presiona Enter. Si la membresía está vencida o le quedan pocos días, sale en rojo." />
      <GlassPanel className="space-y-3 p-5">
        <Campo etiqueta="Cédula o código QR">
          <input ref={entrada} className={`${campo} text-lg`} autoFocus value={codigo} onChange={(e) => setCodigo(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void entrar(); }} />
        </Campo>
        <button className={boton} disabled={cargando} onClick={entrar}><ScanLine className="h-4 w-4" /> Registrar ingreso</button>
      </GlassPanel>

      {res && (
        <div className={`space-y-2 rounded-2xl border p-5 ${bien ? VERDE : ROJO}`}>
          <p className="font-display text-2xl">{TITULO_RES[res.resultado] ?? res.resultado}</p>
          {res.nombre && <p className="break-words text-lg">{res.nombre}</p>}
          {res.plan && <p className="text-sm">{res.plan}{res.vence ? ` · vence ${res.vence}` : ""}{typeof res.dias === "number" ? ` (${res.dias} día(s))` : ""}</p>}
          {typeof res.sesiones === "number" && <p className="text-sm">Sesiones restantes: {res.sesiones}</p>}
          {wa && <a className={botonSec} href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> Cobrar por WhatsApp</a>}
          {res.resultado !== "permitido" && res.nombre && !wa && <p className="text-xs">Este socio no tiene teléfono registrado para cobrar por WhatsApp.</p>}
        </div>
      )}

      <div className="space-y-2">
        <h2 className="font-medium text-foreground">Últimos ingresos</h2>
        {accesos.map((a) => (
          <GlassPanel key={a.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <span className="min-w-0 break-words text-foreground">{socios.find((s) => s.id === a.socio_id)?.nombre ?? a.codigo ?? "—"}</span>
            <span className="text-muted-foreground">{new Date(a.created_at).toLocaleString("es-CO")} · {a.resultado.replace("_", " ")}</span>
          </GlassPanel>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Planes
// ============================================================
const DIAS_TIPO: Record<string, number> = { tiquetera: 60, mensual: 30, trimestral: 90, semestral: 180, anual: 365 };

export function PlanesGimnasio() {
  const { planes, cargando, recargar } = usarGimnasio();
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("mensual");
  const [dias, setDias] = useState("30");
  const [sesiones, setSesiones] = useState("");
  const [precio, setPrecio] = useState("");

  const guardar = async () => {
    if (nombre.trim().length < 2) return toast.error("Escribe el nombre del plan.");
    if (num(dias) <= 0) return toast.error("Los días de vigencia deben ser mayores a cero.");
    if (tipo === "tiquetera" && num(sesiones) <= 0) return toast.error("Escribe cuántas sesiones trae la tiquetera.");
    const { error } = await supabase.from("gim_planes").insert({
      nombre: nombre.trim(), tipo, duracion_dias: Math.round(num(dias)),
      sesiones: tipo === "tiquetera" ? Math.round(num(sesiones)) : null, precio: Math.max(num(precio), 0),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el plan."));
    toast.success("Plan guardado.");
    setNombre(""); setPrecio("");
    void recargar();
  };
  const alternar = async (p: Plan) => {
    await supabase.from("gim_planes").update({ activo: !p.activo }).eq("id", p.id);
    void recargar();
  };

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Planes y tiqueteras" texto="Mensualidades, trimestres, anualidades y tiqueteras por sesiones, con su precio y vigencia." />
      <GlassPanel className="space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Campo etiqueta="Nombre *"><input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
          <Campo etiqueta="Tipo">
            <select className={campo} value={tipo} onChange={(e) => { setTipo(e.target.value); setDias(String(DIAS_TIPO[e.target.value] ?? 30)); }}>
              <option value="tiquetera">Tiquetera (por sesiones)</option>
              <option value="mensual">Mensualidad</option>
              <option value="trimestral">Trimestre</option>
              <option value="semestral">Semestre</option>
              <option value="anual">Anualidad</option>
            </select>
          </Campo>
          <Campo etiqueta="Vigencia (días)"><input className={campo} inputMode="numeric" value={dias} onChange={(e) => setDias(e.target.value)} /></Campo>
          {tipo === "tiquetera" && <Campo etiqueta="Sesiones"><input className={campo} inputMode="numeric" value={sesiones} onChange={(e) => setSesiones(e.target.value)} /></Campo>}
          <Campo etiqueta="Precio"><input className={campo} inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Campo>
        </div>
        <button className={boton} onClick={guardar}><Plus className="h-4 w-4" /> Guardar plan</button>
      </GlassPanel>
      {planes.map((p) => (
        <GlassPanel key={p.id} className={`flex flex-wrap items-center justify-between gap-2 p-3 text-sm ${p.activo ? "" : "opacity-60"}`}>
          <span className="min-w-0 break-words text-foreground">{p.nombre} · {p.tipo}{p.sesiones ? ` · ${p.sesiones} sesiones` : ""} · {p.duracion_dias} días · {dinero(p.precio)}</span>
          <button className={botonSec} onClick={() => alternar(p)}>{p.activo ? "Desactivar" : "Activar"}</button>
        </GlassPanel>
      ))}
    </div>
  );
}

// ============================================================
// Socios y membresías
// ============================================================
export function SociosGimnasio() {
  const { socios, planes, cargando, recargar, ultima } = usarGimnasio();
  const [nombre, setNombre] = useState("");
  const [documento, setDocumento] = useState("");
  const [telefono, setTelefono] = useState("");
  const [emergencia, setEmergencia] = useState("");
  const [buscar, setBuscar] = useState("");
  const [vendiendo, setVendiendo] = useState<string | null>(null);
  const [planId, setPlanId] = useState("");
  const [metodo, setMetodo] = useState("efectivo");

  const crear = async () => {
    if (nombre.trim().length < 2) return toast.error("Escribe el nombre del socio.");
    if (documento.trim().length < 3) return toast.error("Escribe la cédula.");
    const { error } = await supabase.from("gim_socios").insert({
      nombre: nombre.trim(), documento: documento.trim(), telefono: telefono.trim() || null, contacto_emergencia: emergencia.trim() || null,
    });
    if (error) return toast.error(error.message.includes("duplicate") ? "Ya existe un socio con esa cédula." : msg(error.message, "No se pudo guardar el socio."));
    toast.success("Socio guardado.");
    setNombre(""); setDocumento(""); setTelefono(""); setEmergencia("");
    void recargar();
  };

  const vender = async (s: Socio) => {
    if (!planId) return toast.error("Elige el plan.");
    const { error } = await supabase.rpc("gim_vender_membresia", { p_socio: s.id, p_plan: planId, p_inicio: null, p_metodo: metodo });
    if (error) return toast.error(msg(error.message, "No se pudo vender la membresía."));
    toast.success("Membresía vendida. El cobro entró a Caja y Contabilidad.");
    setVendiendo(null); setPlanId("");
    void recargar();
  };

  const congelar = async (m: Membresia) => {
    const motivo = window.prompt("Motivo del congelamiento (por ejemplo, incapacidad):");
    if (!motivo) return;
    const { error } = await supabase.rpc("gim_congelar_membresia", { p_membresia: m.id, p_motivo: motivo });
    if (error) return toast.error(msg(error.message, "No se pudo congelar."));
    toast.success("Membresía congelada.");
    void recargar();
  };
  const descongelar = async (m: Membresia) => {
    const { data, error } = await supabase.rpc("gim_descongelar_membresia", { p_membresia: m.id });
    if (error) return toast.error(msg(error.message, "No se pudo reactivar."));
    toast.success(`Membresía reactivada. Se sumaron ${Number(data ?? 0)} día(s) al vencimiento.`);
    void recargar();
  };

  const lista = useMemo(() => {
    const q = buscar.trim().toLowerCase();
    return socios.filter((s) => !q || s.nombre.toLowerCase().includes(q) || s.documento.toLowerCase().includes(q));
  }, [socios, buscar]);

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Socios y membresías" texto="Vende planes con fecha de inicio y vencimiento, congela por incapacidad y cobra por WhatsApp a quien está vencido." />
      <GlassPanel className="space-y-3 p-5">
        <h2 className="font-medium text-foreground">Nuevo socio</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Campo etiqueta="Nombre *"><input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
          <Campo etiqueta="Cédula *"><input className={campo} value={documento} onChange={(e) => setDocumento(e.target.value)} /></Campo>
          <Campo etiqueta="Teléfono (WhatsApp)"><input className={campo} inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></Campo>
          <Campo etiqueta="Contacto de emergencia"><input className={campo} value={emergencia} onChange={(e) => setEmergencia(e.target.value)} /></Campo>
        </div>
        <button className={boton} onClick={crear}><Plus className="h-4 w-4" /> Guardar socio</button>
      </GlassPanel>

      <input className={campo} placeholder="Buscar por nombre o cédula…" value={buscar} onChange={(e) => setBuscar(e.target.value)} />
      <div className="space-y-3">
        {lista.map((s) => {
          const m = ultima(s.id);
          const est = estadoDe(m);
          const wa = est.alerta ? aWhatsapp(s.telefono, textoCobro(s.nombre, m?.plan_nombre, m?.vence)) : null;
          return (
            <div key={s.id} className={`space-y-2 rounded-xl border p-4 ${est.clase}`}>
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-medium text-foreground">{s.nombre}</p>
                  <p className="text-xs text-muted-foreground">Cédula {s.documento} · Código {s.codigo_qr}{s.telefono ? ` · ${s.telefono}` : ""}</p>
                </div>
                <span className="text-sm font-medium">{est.texto}</span>
              </div>
              {m && <p className="text-xs text-muted-foreground">{m.plan_nombre} · {m.inicio} a {m.vence}{m.sesiones_restantes !== null ? ` · ${m.sesiones_restantes} sesiones` : ""}{m.dias_congelados > 0 ? ` · ${m.dias_congelados} día(s) congelados` : ""}</p>}
              <div className="flex flex-wrap gap-2">
                <button className={botonSec} onClick={() => { setVendiendo(vendiendo === s.id ? null : s.id); setPlanId(""); }}>Vender plan</button>
                {m && m.estado === "activa" && diasHasta(m.vence) >= 0 && <button className={botonSec} onClick={() => congelar(m)}><Snowflake className="h-4 w-4" /> Congelar</button>}
                {m && m.estado === "congelada" && <button className={botonSec} onClick={() => descongelar(m)}>Reactivar</button>}
                {wa && <a className={botonSec} href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> Cobrar por WhatsApp</a>}
              </div>
              {vendiendo === s.id && (
                <div className="grid gap-2 rounded-lg border border-glass-border p-2 sm:grid-cols-3">
                  <Campo etiqueta="Plan">
                    <select className={campo} value={planId} onChange={(e) => setPlanId(e.target.value)}>
                      <option value="">Elige un plan</option>
                      {planes.filter((p) => p.activo).map((p) => <option key={p.id} value={p.id}>{p.nombre} · {dinero(p.precio)}</option>)}
                    </select>
                  </Campo>
                  <Campo etiqueta="Método de pago">
                    <select className={campo} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia / tarjeta</option>
                    </select>
                  </Campo>
                  <div className="flex items-end"><button className={boton} onClick={() => vender(s)}>Confirmar venta</button></div>
                </div>
              )}
            </div>
          );
        })}
        {lista.length === 0 && <p className="text-sm text-muted-foreground">No hay socios para mostrar.</p>}
      </div>
    </div>
  );
}

// ============================================================
// Ficha antropométrica y valoración física
// ============================================================
export function ValoracionGimnasio() {
  const { socios, cargando } = usarGimnasio();
  const [sel, setSel] = useState("");
  const [lista, setLista] = useState<Valoracion[]>([]);
  const [f, setF] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    if (!sel) return setLista([]);
    const { data } = await supabase.from("gim_valoraciones").select("*").eq("socio_id", sel).order("fecha", { ascending: false }).order("created_at", { ascending: false });
    setLista(data ?? []);
  }, [sel]);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const n = (k: string): number | null => (f[k]?.trim() ? num(f[k]) : null);
  const guardar = async () => {
    if (!sel) return toast.error("Elige el socio.");
    if (n("peso") === null && !f.rutina?.trim() && n("grasa") === null) return toast.error("Escribe al menos el peso, el porcentaje de grasa o la rutina.");
    setGuardando(true);
    const { error } = await supabase.from("gim_valoraciones").insert({
      socio_id: sel, peso_kg: n("peso"), estatura_cm: n("estatura"), grasa_pct: n("grasa"), masa_muscular_kg: n("masa"),
      pecho_cm: n("pecho"), cintura_cm: n("cintura"), cadera_cm: n("cadera"), brazo_cm: n("brazo"), muslo_cm: n("muslo"),
      rutina: f.rutina?.trim() || null, entrenador: f.entrenador?.trim() || null, notas: f.notas?.trim() || null,
    });
    setGuardando(false);
    if (error) return toast.error(msg(error.message, "No se pudo guardar la valoración."));
    toast.success("Valoración guardada en el historial.");
    setF({});
    void cargar();
  };

  const campoN = (k: string, etiqueta: string) => (
    <Campo etiqueta={etiqueta} key={k}><input className={campo} inputMode="decimal" value={f[k] ?? ""} onChange={(e) => setF((x) => ({ ...x, [k]: e.target.value }))} /></Campo>
  );
  const cambio = (campoK: "peso_kg" | "grasa_pct" | "masa_muscular_kg") => {
    const conDato = lista.filter((v) => v[campoK] !== null);
    if (conDato.length < 2) return null;
    const d = (conDato[0][campoK] as number) - (conDato[conDato.length - 1][campoK] as number);
    return `${d > 0 ? "+" : ""}${Math.round(d * 10) / 10}`;
  };

  if (cargando) return <Cargando />;
  return (
    <div className="space-y-6">
      <Encabezado titulo="Valoración física" texto="Registro evolutivo de peso, grasa, masa muscular, medidas y rutina por entrenador. Las valoraciones no se editan ni se borran: cada control es un registro nuevo." />
      <Campo etiqueta="Socio">
        <select className={campo} value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="">Elige un socio</option>
          {socios.map((s) => <option key={s.id} value={s.id}>{s.nombre} · {s.documento}</option>)}
        </select>
      </Campo>
      {sel && (
        <>
          <GlassPanel className="space-y-3 p-5">
            <h2 className="font-medium text-foreground">Nueva valoración</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {campoN("peso", "Peso (kg)")}{campoN("estatura", "Estatura (cm)")}{campoN("grasa", "% de grasa")}{campoN("masa", "Masa muscular (kg)")}
              {campoN("pecho", "Pecho (cm)")}{campoN("cintura", "Cintura (cm)")}{campoN("cadera", "Cadera (cm)")}{campoN("brazo", "Brazo (cm)")}{campoN("muslo", "Muslo (cm)")}
              <Campo etiqueta="Entrenador"><input className={campo} value={f.entrenador ?? ""} onChange={(e) => setF((x) => ({ ...x, entrenador: e.target.value }))} /></Campo>
            </div>
            <Campo etiqueta="Rutina asignada"><textarea className={campo} rows={3} value={f.rutina ?? ""} onChange={(e) => setF((x) => ({ ...x, rutina: e.target.value }))} /></Campo>
            <Campo etiqueta="Notas"><input className={campo} value={f.notas ?? ""} onChange={(e) => setF((x) => ({ ...x, notas: e.target.value }))} /></Campo>
            <button className={boton} disabled={guardando} onClick={guardar}><Plus className="h-4 w-4" /> Guardar valoración</button>
          </GlassPanel>

          {lista.length >= 2 && (
            <p className="text-sm text-muted-foreground">
              Evolución desde la primera valoración: peso {cambio("peso_kg") ?? "—"} kg · grasa {cambio("grasa_pct") ?? "—"} % · masa muscular {cambio("masa_muscular_kg") ?? "—"} kg
            </p>
          )}
          <div className="space-y-2">
            {lista.map((v) => (
              <GlassPanel key={v.id} className="space-y-1 p-3 text-sm">
                <p className="font-medium text-foreground">{v.fecha}{v.entrenador ? ` · ${v.entrenador}` : ""}</p>
                <p className="break-words text-muted-foreground">
                  {[
                    v.peso_kg !== null && `Peso ${v.peso_kg} kg`, v.grasa_pct !== null && `Grasa ${v.grasa_pct}%`, v.masa_muscular_kg !== null && `Músculo ${v.masa_muscular_kg} kg`,
                    v.pecho_cm !== null && `Pecho ${v.pecho_cm}`, v.cintura_cm !== null && `Cintura ${v.cintura_cm}`, v.cadera_cm !== null && `Cadera ${v.cadera_cm}`,
                    v.brazo_cm !== null && `Brazo ${v.brazo_cm}`, v.muslo_cm !== null && `Muslo ${v.muslo_cm}`,
                  ].filter(Boolean).join(" · ")}
                </p>
                {v.rutina && <p className="whitespace-pre-wrap break-words text-foreground"><b>Rutina:</b> {v.rutina}</p>}
                {v.notas && <p className="break-words text-muted-foreground">{v.notas}</p>}
              </GlassPanel>
            ))}
            {lista.length === 0 && <p className="text-sm text-muted-foreground">Este socio aún no tiene valoraciones.</p>}
          </div>
        </>
      )}
    </div>
  );
}
