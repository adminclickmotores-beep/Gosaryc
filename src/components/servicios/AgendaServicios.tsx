import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { usePermisos } from "@/hooks/use-permisos";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";
import { Etiqueta, Indicador, Pestanas, SelectorMetodo, aWhatsapp, hoyISO, msg } from "@/components/negocios/comunes";

type Cita = Tables<"srv_citas">;
type Liquidacion = Tables<"srv_liquidaciones">;

const ESTADOS: Record<string, { texto: string; tono: "neutro" | "ok" | "alerta" | "info" }> = {
  agendada: { texto: "Agendada", tono: "neutro" },
  en_atencion: { texto: "En atención", tono: "info" },
  completada: { texto: "Completada", tono: "ok" },
  cancelada: { texto: "Cancelada", tono: "alerta" },
};

const aMinutos = (hora: string): number => {
  const [h, m] = hora.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

function TarjetaCita({ cita, metodo, onCambio }: { cita: Cita; metodo: string; onCambio: () => void }) {
  const [ficha, setFicha] = useState(cita.ficha ?? "");
  const [ocupado, setOcupado] = useState(false);
  const est = ESTADOS[cita.estado] ?? ESTADOS.agendada;

  const mover = async (estado: string) => {
    setOcupado(true);
    const { error } = await supabase.from("srv_citas").update({ estado }).eq("id", cita.id);
    setOcupado(false);
    if (error) return toast.error(msg(error.message, "No se pudo cambiar el estado."));
    onCambio();
  };
  const guardarFicha = async () => {
    const { error } = await supabase.from("srv_citas").update({ ficha: ficha.trim() || null }).eq("id", cita.id);
    if (error) return toast.error(msg(error.message, "No se pudo guardar la ficha."));
    toast.success("Ficha del servicio guardada.");
    onCambio();
  };
  const cobrar = async () => {
    setOcupado(true);
    const { data, error } = await supabase.rpc("srv_cobrar_cita", { p_cita: cita.id, p_metodo: metodo });
    setOcupado(false);
    if (error) return toast.error(msg(error.message, "No se pudo cobrar la cita."));
    const r = (data ?? {}) as { cobrado?: number; comision?: number };
    toast.success(`Cobrado ${dinero(r.cobrado ?? cita.precio)} a Caja. Honorario del profesional: ${dinero(r.comision ?? 0)}.`);
    onCambio();
  };
  const recordar = () => {
    const url = aWhatsapp(cita.telefono, `Hola ${cita.cliente}, te recordamos tu cita de ${cita.servicio} el ${cita.fecha} a las ${cita.hora} con ${cita.profesional}.`);
    if (!url) return toast.error("Esta cita no tiene teléfono.");
    window.open(url, "_blank", "noopener");
  };

  return (
    <div className="space-y-2 rounded-xl border border-glass-border p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold text-foreground">{cita.hora} · {cita.cliente}</p>
          <p className="break-words text-xs text-muted-foreground">{cita.servicio} · {cita.duracion_min} min · {dinero(cita.precio)}</p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Etiqueta texto={est.texto} tono={est.tono} />
          {cita.cobrada && <Etiqueta texto="Cobrada" tono="ok" />}
        </div>
      </div>
      {(cita.estado === "en_atencion" || cita.estado === "completada") && (
        <div className="space-y-1">
          <textarea className={campo} rows={2} placeholder="Ficha del servicio realizado (notas, productos usados, recomendaciones)" value={ficha} onChange={(e) => setFicha(e.target.value)} />
          {ficha !== (cita.ficha ?? "") && <button type="button" className={botonSec} onClick={() => void guardarFicha()}>Guardar ficha</button>}
        </div>
      )}
      {cita.ficha && cita.estado === "cancelada" && <p className="text-xs text-muted-foreground">{cita.ficha}</p>}
      <div className="flex flex-wrap gap-2">
        {cita.estado === "agendada" && <button type="button" disabled={ocupado} className={botonSec} onClick={() => void mover("en_atencion")}>Iniciar atención</button>}
        {(cita.estado === "agendada" || cita.estado === "en_atencion") && <button type="button" disabled={ocupado} className={botonSec} onClick={() => void mover("completada")}>Completar</button>}
        {(cita.estado === "agendada" || cita.estado === "en_atencion") && <button type="button" disabled={ocupado} className={botonSec} onClick={() => void mover("cancelada")}>Cancelar</button>}
        {cita.estado === "completada" && !cita.cobrada && cita.precio > 0 && <button type="button" disabled={ocupado} className={boton} onClick={() => void cobrar()}>Cobrar en Caja</button>}
        {cita.estado === "agendada" && <button type="button" className={botonSec} onClick={recordar}><MessageCircle className="h-4 w-4" /> Recordar</button>}
      </div>
      {cita.cobrada && cita.comision > 0 && (
        <p className="text-xs text-muted-foreground">Honorario del profesional: {dinero(cita.comision)} ({cita.liquidada ? "ya liquidado" : "pendiente de liquidar"})</p>
      )}
    </div>
  );
}

export function AgendaServicios() {
  const { esAdmin } = usePermisos();
  const [citas, setCitas] = useState<Cita[]>([]);
  const [liqs, setLiqs] = useState<Liquidacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [vista, setVista] = useState<"agenda" | "liquidacion">("agenda");
  const [dia, setDia] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const [profesional, setProfesional] = useState("");
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [servicio, setServicio] = useState("");
  const [hora, setHora] = useState("09:00");
  const [duracion, setDuracion] = useState("60");
  const [precio, setPrecio] = useState("");
  const [pct, setPct] = useState("30");
  const [guardando, setGuardando] = useState(false);
  const [liquidando, setLiquidando] = useState("");

  useEffect(() => {
    setDia(hoyISO());
  }, []);

  const cargar = useCallback(async () => {
    const [c, l] = await Promise.all([
      supabase.from("srv_citas").select("*").order("fecha", { ascending: false }).order("hora").limit(600),
      supabase.from("srv_liquidaciones").select("*").order("created_at", { ascending: false }).limit(30),
    ]);
    setCitas(c.data ?? []);
    setLiqs(l.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const profesionales = useMemo(() => Array.from(new Set(citas.map((c) => c.profesional))).sort(), [citas]);
  const delDia = useMemo(() => citas.filter((c) => c.fecha === dia), [citas, dia]);
  const columnas = useMemo(() => {
    const nombres = Array.from(new Set(delDia.map((c) => c.profesional))).sort();
    return nombres.map((n) => ({ nombre: n, items: delDia.filter((c) => c.profesional === n).sort((a, b) => a.hora.localeCompare(b.hora)) }));
  }, [delDia]);

  const pendientes = useMemo(() => {
    const mapa = new Map<string, { citas: number; total: number }>();
    for (const c of citas) {
      if (c.cobrada && !c.liquidada && c.comision > 0) {
        const x = mapa.get(c.profesional) ?? { citas: 0, total: 0 };
        x.citas += 1;
        x.total += c.comision;
        mapa.set(c.profesional, x);
      }
    }
    return Array.from(mapa.entries()).map(([nombre, v]) => ({ nombre, ...v }));
  }, [citas]);

  const crear = async () => {
    if (profesional.trim().length < 2) return toast.error("Escribe el profesional.");
    if (cliente.trim().length < 2) return toast.error("Escribe el cliente.");
    if (servicio.trim().length < 2) return toast.error("Escribe el servicio.");
    if (!dia) return toast.error("Elige la fecha.");
    const dur = Math.max(Math.round(num(duracion)), 5);
    const ini = aMinutos(hora);
    const choque = citas.find((c) => c.fecha === dia && c.profesional.toLowerCase() === profesional.trim().toLowerCase() && c.estado !== "cancelada" && ini < aMinutos(c.hora) + c.duracion_min && aMinutos(c.hora) < ini + dur);
    if (choque) return toast.error(`${choque.profesional} ya tiene una cita de ${choque.hora} a ${Math.floor((aMinutos(choque.hora) + choque.duracion_min) / 60)}:${String((aMinutos(choque.hora) + choque.duracion_min) % 60).padStart(2, "0")}.`);
    setGuardando(true);
    const { error } = await supabase.from("srv_citas").insert({
      profesional: profesional.trim(), cliente: cliente.trim(), telefono: telefono.trim() || null, servicio: servicio.trim(),
      fecha: dia, hora, duracion_min: dur, precio: Math.max(num(precio), 0), comision_pct: esAdmin ? Math.min(Math.max(num(pct), 0), 100) : 0,
    });
    setGuardando(false);
    if (error) return toast.error(msg(error.message, "No se pudo agendar la cita."));
    toast.success("Cita agendada.");
    setCliente(""); setTelefono(""); setServicio(""); setPrecio("");
    void cargar();
  };

  const liquidar = async (nombre: string) => {
    setLiquidando(nombre);
    const { data, error } = await supabase.rpc("srv_liquidar", { p_profesional: nombre, p_metodo: metodo });
    setLiquidando("");
    if (error) return toast.error(msg(error.message, "No se pudo liquidar."));
    toast.success(`Liquidación de ${nombre} por ${dinero(Number(data ?? 0))}: salió de Caja y quedó en Contabilidad.`);
    void cargar();
  };

  if (cargando) return <Cargando />;
  const cobradoDia = delDia.filter((c) => c.cobrada).reduce((s, c) => s + c.precio, 0);
  const porCobrar = delDia.filter((c) => c.estado === "completada" && !c.cobrada).reduce((s, c) => s + c.precio, 0);

  return (
    <div className="space-y-6">
      <Encabezado titulo="Agenda de citas y servicios" texto="Agenda por profesional, estado de cada cita, ficha del servicio realizado, cobro en Caja con su asiento contable y liquidación automática de honorarios." />
      <Pestanas items={[{ clave: "agenda", texto: "Agenda" }, { clave: "liquidacion", texto: "Honorarios" }]} valor={vista} onChange={setVista} />

      {vista === "agenda" && (
        <>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Nueva cita</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Campo etiqueta="Profesional *">
                <input className={campo} list="lista-profesionales" value={profesional} onChange={(e) => setProfesional(e.target.value)} />
                <datalist id="lista-profesionales">{profesionales.map((p) => <option key={p} value={p} />)}</datalist>
              </Campo>
              <Campo etiqueta="Cliente *"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
              <Campo etiqueta="Teléfono (WhatsApp)"><input className={campo} inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} /></Campo>
              <Campo etiqueta="Servicio *"><input className={campo} value={servicio} onChange={(e) => setServicio(e.target.value)} /></Campo>
              <Campo etiqueta="Fecha"><input type="date" className={campo} value={dia} onChange={(e) => setDia(e.target.value)} /></Campo>
              <Campo etiqueta="Hora"><input type="time" className={campo} value={hora} onChange={(e) => setHora(e.target.value)} /></Campo>
              <Campo etiqueta="Duración (min)"><input className={campo} inputMode="numeric" value={duracion} onChange={(e) => setDuracion(e.target.value)} /></Campo>
              <Campo etiqueta="Valor del servicio"><input className={campo} inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Campo>
              {esAdmin && <Campo etiqueta="Comisión del profesional %"><input className={campo} inputMode="decimal" value={pct} onChange={(e) => setPct(e.target.value)} /></Campo>}
            </div>
            <button type="button" className={boton} disabled={guardando} onClick={() => void crear()}>{guardando ? "Guardando…" : "Agendar cita"}</button>
          </GlassPanel>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Indicador titulo="Citas del día" valor={delDia.filter((c) => c.estado !== "cancelada").length} />
            <Indicador titulo="Completadas" valor={delDia.filter((c) => c.estado === "completada").length} />
            <Indicador titulo="Por cobrar" valor={dinero(porCobrar)} alerta={porCobrar > 0} />
            <Indicador titulo="Cobrado del día" valor={dinero(cobradoDia)} />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Campo etiqueta="Día de la agenda"><input type="date" className={campo} value={dia} onChange={(e) => setDia(e.target.value)} /></Campo>
            <Campo etiqueta="Cobrar con"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
          </div>

          {columnas.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay citas este día.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {columnas.map((col) => (
                <GlassPanel key={col.nombre} className="space-y-3 p-4">
                  <h3 className="font-display text-lg text-foreground">{col.nombre}</h3>
                  {col.items.map((c) => <TarjetaCita key={c.id} cita={c} metodo={metodo} onCambio={() => void cargar()} />)}
                </GlassPanel>
              ))}
            </div>
          )}
        </>
      )}

      {vista === "liquidacion" && (
        <div className="space-y-4">
          <Campo etiqueta="Pagar honorarios con"><SelectorMetodo valor={metodo} onChange={setMetodo} /></Campo>
          <GlassPanel className="space-y-3 p-4">
            <h2 className="text-sm font-semibold text-foreground">Honorarios pendientes por profesional</h2>
            {pendientes.length === 0 ? <p className="text-sm text-muted-foreground">No hay honorarios pendientes: se generan al cobrar cada cita.</p> : pendientes.map((p) => (
              <div key={p.nombre} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-glass-border p-3">
                <div><p className="text-sm font-semibold text-foreground">{p.nombre}</p><p className="text-xs text-muted-foreground">{p.citas} citas cobradas · {dinero(p.total)}</p></div>
                {esAdmin ? <button type="button" className={boton} disabled={liquidando === p.nombre} onClick={() => void liquidar(p.nombre)}>Liquidar y pagar</button> : <span className="text-xs text-muted-foreground">Solo el dueño liquida</span>}
              </div>
            ))}
          </GlassPanel>
          <GlassPanel className="space-y-2 p-4">
            <h2 className="text-sm font-semibold text-foreground">Liquidaciones realizadas</h2>
            {liqs.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay liquidaciones.</p> : liqs.map((l) => (
              <p key={l.id} className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground">
                <span>{new Date(l.created_at).toLocaleDateString("es-CO")} · {l.profesional} · {l.citas} citas ({l.metodo})</span>
                <span className="text-foreground">{dinero(l.total_comision)}</span>
              </p>
            ))}
          </GlassPanel>
        </div>
      )}
    </div>
  );
}
