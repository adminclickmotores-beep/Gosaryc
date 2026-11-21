import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { usePermisos } from "@/hooks/use-permisos";
import { Campo, Cargando, Encabezado, boton, botonSec, campo, dinero, num } from "@/components/comercio/ComercioModulos";
import { escaparHtml } from "@/lib/exportes";

const hoyIso = (): string => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
const diasEntreIso = (desde: string, hasta: string): number =>
  Math.round((new Date(`${hasta}T00:00:00`).getTime() - new Date(`${desde}T00:00:00`).getTime()) / 86400000);
const abrirImpresion = (html: string): void => {
  const w = window.open("", "_blank", "width=800,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
};

type Hab = Tables<"hot_habitaciones">;
type Res = Tables<"hot_reservas">;
type Cargo = Tables<"hot_cargos">;
type Est = Tables<"edu_estudiantes">;
type Pen = Tables<"edu_pensiones">;
type Asi = Tables<"edu_asistencia">;
type Nota = Tables<"edu_notas">;
type Ref = Tables<"mod_referencias">;
type Var = Tables<"mod_variantes">;
type Bono = Tables<"mod_bonos">;
type Far = Tables<"far_productos">;
type OptF = Tables<"opt_formulas">;
type OptO = Tables<"opt_ordenes">;
type Salon = Tables<"eve_salones">;
type Eve = Tables<"eve_eventos">;
type Abono = Tables<"eve_abonos">;
type Tarea = Tables<"eve_checklist">;

const msg = (m: string | undefined, d: string) => (m && m.length > 0 && m.length < 220 ? m : d);

const aWhatsapp = (tel: string | null | undefined, texto: string): string | null => {
  const d = (tel ?? "").replace(/\D/g, "");
  if (d.length < 7) return null;
  const n = d.length === 10 ? `57${d}` : d;
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
};

const COLOR_ESTADO: Record<string, string> = {
  disponible: "bg-emerald-500/15 text-emerald-300",
  ocupada: "bg-rose-500/15 text-rose-300",
  reservada: "bg-amber-500/15 text-amber-300",
  limpieza: "bg-sky-500/15 text-sky-300",
  mantenimiento: "bg-zinc-500/20 text-zinc-300",
};

// ============================================================
// Hotel: rack visual de habitaciones
// ============================================================
export function HabitacionesHotel() {
  const [habs, setHabs] = useState<Hab[]>([]);
  const [cargando, setCargando] = useState(true);
  const [numero, setNumero] = useState("");
  const [tipo, setTipo] = useState("estandar");
  const [tarifa, setTarifa] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("hot_habitaciones").select("*").order("numero");
    setHabs(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (numero.trim().length < 1) return toast.error("Escribe el número de la habitación.");
    const { error } = await supabase.from("hot_habitaciones").insert({
      numero: numero.trim(), tipo_hab: tipo, tarifa: Math.max(num(tarifa), 0),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    setNumero(""); setTarifa("");
    void cargar();
  };

  const cambiarEstado = async (h: Hab, estado: string) => {
    const { error } = await supabase.from("hot_habitaciones").update({ estado }).eq("id", h.id);
    if (error) return toast.error(msg(error.message, "No se pudo cambiar el estado."));
    void cargar();
  };

  if (cargando) return <Cargando />; // habitaciones
  return (
    <GlassPanel>
      <Encabezado titulo="Rack de habitaciones" texto="Verde disponible, rojo ocupada, amarillo reservada, azul en limpieza." />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {habs.map((h) => (
          <div key={h.id} className={`rounded-xl border border-glass-border p-3 ${COLOR_ESTADO[h.estado] ?? ""}`}>
            <p className="font-display text-lg font-bold">Hab. {h.numero}</p>
            <p className="text-xs capitalize">{h.tipo_hab} · {dinero(h.tarifa)}/noche</p>
            <p className="mt-1 text-xs font-semibold uppercase">{h.estado}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {(["disponible", "ocupada", "reservada", "limpieza", "mantenimiento"] as const).filter((e) => e !== h.estado).map((e) => (
                <button key={e} type="button" className={botonSec} onClick={() => void cambiarEstado(h, e)}>
                  {e}
                </button>
              ))}
            </div>
          </div>
        ))}
        {habs.length === 0 && <p className="text-sm text-muted-foreground">Agrega tu primera habitación abajo.</p>}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <Campo etiqueta="Número"><input className={campo} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="101" /></Campo>
        <Campo etiqueta="Tipo">
          <select className={campo} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="estandar">Estándar</option>
            <option value="doble">Doble</option>
            <option value="suite">Suite</option>
            <option value="familiar">Familiar</option>
            <option value="cabaña">Cabaña</option>
          </select>
        </Campo>
        <Campo etiqueta="Tarifa por noche"><input className={campo} inputMode="decimal" value={tarifa} onChange={(e) => setTarifa(e.target.value)} placeholder="80000" /></Campo>
        <div className="flex items-end"><button type="button" className={boton} onClick={() => void crear()}>Agregar</button></div>
      </div>
    </GlassPanel>
  );
}

// ============================================================
// Hotel: reservas con check-in/out, cargos y liquidación
// ============================================================
export function ReservasHotel() {
  const [habs, setHabs] = useState<Hab[]>([]);
  const [ress, setRess] = useState<Res[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [cargando, setCargando] = useState(true);
  const [habId, setHabId] = useState("");
  const [huesped, setHuesped] = useState("");
  const [doc, setDoc] = useState("");
  const [tel, setTel] = useState("");
  const [fin, setFin] = useState("");
  const [fout, setFout] = useState("");
  const [anticipo, setAnticipo] = useState("");
  const [cargoRes, setCargoRes] = useState("");
  const [cargoConcepto, setCargoConcepto] = useState("");
  const [cargoRubro, setCargoRubro] = useState("minibar");
  const [cargoValor, setCargoValor] = useState("");
  const [metodo, setMetodo] = useState("efectivo");
  const { esAdmin } = usePermisos();

  const cargar = useCallback(async () => {
    const [h, r, c] = await Promise.all([
      supabase.from("hot_habitaciones").select("*").order("numero"),
      supabase.from("hot_reservas").select("*").order("created_at", { ascending: false }).limit(60),
      supabase.from("hot_cargos").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setHabs(h.data ?? []);
    setRess(r.data ?? []);
    setCargos(c.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (!habId) return toast.error("Elige la habitación.");
    if (huesped.trim().length < 2) return toast.error("Escribe el nombre del huésped.");
    const { error } = await supabase.from("hot_reservas").insert({
      habitacion_id: habId, huesped: huesped.trim(),
      documento: doc.trim() || null, telefono: tel.trim() || null,
      fecha_in: fin || new Date().toISOString().slice(0, 10),
      fecha_out: fout || new Date().toISOString().slice(0, 10),
      anticipo: Math.max(num(anticipo), 0), estado: "reservada",
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar la reserva."));
    await supabase.from("hot_habitaciones").update({ estado: "reservada" }).eq("id", habId);
    setHuesped(""); setDoc(""); setTel(""); setAnticipo("");
    toast.success("Reserva guardada.");
    void cargar();
  };

  const checkin = async (r: Res) => {
    const { error } = await supabase.from("hot_reservas").update({ estado: "ocupada" }).eq("id", r.id);
    if (error) return toast.error(msg(error.message, "No se pudo hacer el check-in."));
    await supabase.from("hot_habitaciones").update({ estado: "ocupada" }).eq("id", r.habitacion_id);
    void cargar();
  };

  const agregarCargo = async () => {
    if (!cargoRes) return toast.error("Elige la reserva.");
    if (cargoConcepto.trim().length < 2) return toast.error("Describe el cargo (minibar, lavandería…).");
    if (num(cargoValor) <= 0) return toast.error("El valor debe ser mayor a cero.");
    const { error } = await supabase.from("hot_cargos").insert({
      reserva_id: cargoRes, concepto: cargoConcepto.trim(), rubro: cargoRubro, valor: num(cargoValor),
    });
    if (error) return toast.error(msg(error.message, "No se pudo agregar el cargo."));
    setCargoConcepto(""); setCargoValor("");
    toast.success("Cargo agregado a la cuenta.");
    void cargar();
  };

  const checkout = async (r: Res) => {
    const { data, error } = await supabase.rpc("hot_checkout", { p_reserva: r.id, p_metodo: metodo });
    if (error) return toast.error(msg(error.message, "No se pudo liquidar."));
    const j = data as { total?: number; cobrado?: number } | null;
    toast.success(`Cuenta liquidada: ${dinero(j?.cobrado ?? 0)} (total ${dinero(j?.total ?? 0)}). Queda en Caja.`);
    void cargar();
  };

  const abiertas = useMemo(() => ress.filter((r) => r.estado !== "finalizada" && r.estado !== "cancelada"), [ress]);

  if (cargando) return <Cargando />; // reservas
  return (
    <GlassPanel>
      <Encabezado titulo="Reservas y check-in" texto="Reserva, check-in con documento, cargos a la habitación y check-out con liquidación a Caja." />
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Campo etiqueta="Habitación">
          <select className={campo} value={habId} onChange={(e) => setHabId(e.target.value)}>
            <option value="">Elige…</option>
            {habs.filter((h) => h.estado === "disponible").map((h) => (
              <option key={h.id} value={h.id}>Hab. {h.numero} · {dinero(h.tarifa)}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Huésped"><input className={campo} value={huesped} onChange={(e) => setHuesped(e.target.value)} placeholder="Nombre completo" /></Campo>
        <Campo etiqueta="Documento"><input className={campo} value={doc} onChange={(e) => setDoc(e.target.value)} placeholder="Cédula" /></Campo>
        <Campo etiqueta="Celular"><input className={campo} inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="300…" /></Campo>
        <Campo etiqueta="Salida"><input type="date" className={campo} value={fout} onChange={(e) => setFout(e.target.value)} /></Campo>
        <Campo etiqueta="Anticipo"><input className={campo} inputMode="decimal" value={anticipo} onChange={(e) => setAnticipo(e.target.value)} placeholder="0" /></Campo>
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <Campo etiqueta="Entrada"><input type="date" className={campo} value={fin} onChange={(e) => setFin(e.target.value)} /></Campo>
        <button type="button" className={boton} onClick={() => void crear()}>Guardar reserva</button>
      </div>
      <div className="mt-4 space-y-2">
        {abiertas.map((r) => {
          const hab = habs.find((h) => h.id === r.habitacion_id);
          const tot = cargos.filter((c) => c.reserva_id === r.id).reduce((a, c) => a + Number(c.valor), 0);
          const wa = aWhatsapp(r.telefono, `Hola ${r.huesped}, tu reserva de la hab. ${hab?.numero ?? ""} va del ${r.fecha_in} al ${r.fecha_out}. ¡Te esperamos!`);
          return (
            <div key={r.id} className="rounded-xl border border-glass-border p-3">
              <p className="font-semibold">Hab. {hab?.numero ?? "?"} · {r.huesped} <span className="text-xs text-muted-foreground">({r.estado})</span></p>
              <p className="text-xs text-muted-foreground">{r.fecha_in} → {r.fecha_out} · anticipo {dinero(r.anticipo)} · cargos {dinero(tot)}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {r.estado === "reservada" && <button type="button" className={botonSec} onClick={() => void checkin(r)}>Check-in</button>}
                {wa && <a className={botonSec} href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp</a>}
                {r.estado === "ocupada" && (
                  <>
                    <select className={campo} value={metodo} onChange={(e) => setMetodo(e.target.value)} style={{ maxWidth: 150 }}>
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="tarjeta">Tarjeta</option>
                    </select>
                    <button type="button" className={boton} onClick={() => void checkout(r)}>Check-out y cobrar</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
        {abiertas.length === 0 && <p className="text-sm text-muted-foreground">Sin reservas abiertas.</p>}
      </div>
      <div className="mt-4 border-t border-glass-border pt-3">
        <p className="text-sm font-semibold">Cargos a la habitación (minibar, lavandería, restaurante)</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-4">
          <Campo etiqueta="Reserva">
            <select className={campo} value={cargoRes} onChange={(e) => setCargoRes(e.target.value)}>
              <option value="">Elige…</option>
              {abiertas.filter((r) => r.estado === "ocupada").map((r) => (
                <option key={r.id} value={r.id}>{r.huesped} · Hab. {habs.find((h) => h.id === r.habitacion_id)?.numero}</option>
              ))}
            </select>
          </Campo>
          <Campo etiqueta="Concepto"><input className={campo} value={cargoConcepto} onChange={(e) => setCargoConcepto(e.target.value)} placeholder="Minibar: gaseosa" /></Campo>
          <Campo etiqueta="Rubro">
            <select className={campo} value={cargoRubro} onChange={(e) => setCargoRubro(e.target.value)}>
              <option value="minibar">Minibar</option>
              <option value="lavanderia">Lavandería</option>
              <option value="restaurante">Restaurante</option>
              <option value="tour">Tour</option>
              <option value="otro">Otro</option>
            </select>
          </Campo>
          <Campo etiqueta="Valor"><input className={campo} inputMode="decimal" value={cargoValor} onChange={(e) => setCargoValor(e.target.value)} placeholder="12000" /></Campo>
        </div>
        <button type="button" className={`${botonSec} mt-2`} onClick={() => void agregarCargo()}>Agregar cargo</button>
        {!esAdmin && <p className="mt-1 text-xs text-muted-foreground">La liquidación final la confirma el personal de recepción.</p>}
      </div>
    </GlassPanel>
  );
}

// ============================================================
// Educación: matrículas y ficha del estudiante
// ============================================================
export function MatriculasEducacion() {
  const [ests, setEsts] = useState<Est[]>([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState("");
  const [nombre, setNombre] = useState("");
  const [grado, setGrado] = useState("Primero");
  const [grupo, setGrupo] = useState("");
  const [acudiente, setAcudiente] = useState("");
  const [tel, setTel] = useState("");
  const [programa, setPrograma] = useState("");
  const [documento, setDocumento] = useState("");
  const [alergias, setAlergias] = useState("");
  const [eps, setEps] = useState("");

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("edu_estudiantes").select("*").order("nombre");
    setEsts(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (nombre.trim().length < 2) return toast.error("Escribe el nombre del estudiante.");
    const { error } = await supabase.from("edu_estudiantes").insert({
      nombre: nombre.trim(), grado, grupo: grupo.trim() || null,
      acudiente: acudiente.trim() || null, telefono_acu: tel.trim() || null,
      programa: programa.trim() || null, documento: documento.trim() || null,
      alergias: alergias.trim() || null, eps: eps.trim() || null,
    });
    if (error) return toast.error(msg(error.message, "No se pudo matricular."));
    setNombre(""); setGrupo(""); setAcudiente(""); setTel(""); setPrograma(""); setDocumento(""); setAlergias(""); setEps("");
    toast.success("Matrícula guardada.");
    void cargar();
  };

  const lista = ests.filter((e) => e.nombre.toLowerCase().includes(q.toLowerCase()) || (e.grado ?? "").toLowerCase().includes(q.toLowerCase()));

  if (cargando) return <Cargando />; // estudiantes
  return (
    <GlassPanel>
      <Encabezado titulo="Estudiantes y matrículas" texto="Ficha con acudiente, grado y grupo." />
      <input className={campo} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o grado…" />
      <div className="mt-2 space-y-2">
        {lista.slice(0, 60).map((e) => (
          <div key={e.id} className="rounded-xl border border-glass-border p-3">
            <p className="font-semibold">{e.nombre} <span className="text-xs text-muted-foreground">{e.grado}{e.grupo ? ` · ${e.grupo}` : ""}{e.programa ? ` · ${e.programa}` : ""} · {e.estado}</span></p>
            {e.acudiente && <p className="text-xs text-muted-foreground">Acudiente: {e.acudiente}{e.telefono_acu ? ` · ${e.telefono_acu}` : ""}</p>}
            {(e.alergias || e.eps) && <p className="text-xs text-muted-foreground">{e.alergias ? `Alergias: ${e.alergias}` : ""}{e.alergias && e.eps ? " · " : ""}{e.eps ? `EPS: ${e.eps}` : ""}</p>}
          </div>
        ))}
        {lista.length === 0 && <p className="text-sm text-muted-foreground">Sin estudiantes todavía.</p>}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Campo etiqueta="Estudiante"><input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre completo" /></Campo>
        <Campo etiqueta="Grado o curso">
          <select className={campo} value={grado} onChange={(e) => setGrado(e.target.value)}>
            {["Párvulos", "Prejardín", "Jardín", "Transición", "Primero", "Segundo", "Tercero", "Cuarto", "Quinto", "Sexto", "Séptimo", "Octavo", "Noveno", "Décimo", "Once"].map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </Campo>
        <Campo etiqueta="Grupo"><input className={campo} value={grupo} onChange={(e) => setGrupo(e.target.value)} placeholder="A, B…" /></Campo>
        <Campo etiqueta="Acudiente"><input className={campo} value={acudiente} onChange={(e) => setAcudiente(e.target.value)} placeholder="Mamá, papá…" /></Campo>
        <Campo etiqueta="Celular del acudiente"><input className={campo} inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} placeholder="300…" /></Campo>
        <Campo etiqueta="Programa o jornada"><input className={campo} value={programa} onChange={(e) => setPrograma(e.target.value)} placeholder="Jornada mañana, Inglés, Técnico…" /></Campo>
        <Campo etiqueta="Documento"><input className={campo} value={documento} onChange={(e) => setDocumento(e.target.value)} /></Campo>
        <Campo etiqueta="Alergias o condiciones"><input className={campo} value={alergias} onChange={(e) => setAlergias(e.target.value)} /></Campo>
        <Campo etiqueta="EPS"><input className={campo} value={eps} onChange={(e) => setEps(e.target.value)} /></Campo>
        <div className="flex items-end"><button type="button" className={boton} onClick={() => void crear()}>Matricular</button></div>
      </div>
    </GlassPanel>
  );
}

// ============================================================
// Educación: pensiones con mora y cobro por WhatsApp
// ============================================================
export function PensionesEducacion() {
  const [ests, setEsts] = useState<Est[]>([]);
  const [pens, setPens] = useState<Pen[]>([]);
  const [cargando, setCargando] = useState(true);
  const [periodo, setPeriodo] = useState("");
  const [valor, setValor] = useState("");
  const [vence, setVence] = useState("");
  const [metodo, setMetodo] = useState("efectivo");

  const cargar = useCallback(async () => {
    const [e, p] = await Promise.all([
      supabase.from("edu_estudiantes").select("*").eq("estado", "activo").order("nombre"),
      supabase.from("edu_pensiones").select("*").order("fecha_vence", { ascending: false }).limit(200),
    ]);
    setEsts(e.data ?? []);
    setPens(p.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const generar = async () => {
    if (periodo.trim().length < 3) return toast.error("Escribe el periodo (ej. 2026-03).");
    if (num(valor) < 0) return toast.error("El valor no es válido.");
    const { data, error } = await supabase.rpc("edu_generar_pensiones", {
      p_periodo: periodo.trim(), p_valor: num(valor), p_vence: vence || null,
    });
    if (error) return toast.error(msg(error.message, "No se pudo generar."));
    toast.success(`Pensiones generadas: ${(data as { generadas?: number } | null)?.generadas ?? 0}.`);
    setPeriodo(""); setValor("");
    void cargar();
  };

  const cobrar = async (p: Pen) => {
    const { error } = await supabase.rpc("edu_cobrar_pension", { p_pension: p.id, p_metodo: metodo });
    if (error) return toast.error(msg(error.message, "No se pudo cobrar."));
    toast.success("Pensión cobrada. Entró a Caja y Contabilidad.");
    imprimirRecibo(p, metodo);
    void cargar();
  };

  const imprimirRecibo = (p: Pen, met: string) => {
    const e = ests.find((x) => x.id === p.estudiante_id);
    abrirImpresion(`<html><head><meta charset="utf-8"><title>Recibo de caja</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111;max-width:420px}h1{font-size:18px}.box{border:2px dashed #555;border-radius:10px;padding:14px;margin-top:10px}.g{font-size:22px;font-weight:bold}.m{color:#555;font-size:12px}</style></head><body>
<h1>RECIBO DE CAJA</h1><p class="m">Fecha: ${escaparHtml(hoyIso())} · N.º ${escaparHtml(p.id.slice(0, 8).toUpperCase())}</p>
<div class="box"><p><b>Estudiante:</b> ${escaparHtml(e?.nombre ?? "")}</p><p><b>Acudiente:</b> ${escaparHtml(e?.acudiente ?? "")}</p>
<p><b>Concepto:</b> ${escaparHtml(p.concepto)} (${escaparHtml(p.periodo)})</p><p><b>Forma de pago:</b> ${escaparHtml(met)}</p>
<p class="g">Valor recibido: ${escaparHtml(dinero(p.valor))}</p></div><p class="m">Gracias por su pago puntual.</p></body></html>`);
  };

  const hoy = hoyIso();
  const mora = pens
    .filter((p) => p.estado === "pendiente")
    .sort((a, b) => (a.fecha_vence ?? "9999-12-31").localeCompare(b.fecha_vence ?? "9999-12-31"));
  const enMora = mora.filter((p) => p.fecha_vence !== null && p.fecha_vence < hoy);
  const totalMora = enMora.reduce((a, p) => a + p.valor, 0);
  const totalPendiente = mora.reduce((a, p) => a + p.valor, 0);
  const pagadas = pens.filter((p) => p.estado === "pagada").slice(0, 8);

  if (cargando) return <Cargando />; // pensiones
  return (
    <GlassPanel>
      <Encabezado titulo="Pensiones y cartera" texto="Genera el mes, cobra y avisa la mora por WhatsApp." />
      <div className="grid gap-2 sm:grid-cols-4">
        <Campo etiqueta="Periodo"><input className={campo} value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="2026-03" /></Campo>
        <Campo etiqueta="Valor"><input className={campo} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="250000" /></Campo>
        <Campo etiqueta="Vence"><input type="date" className={campo} value={vence} onChange={(e) => setVence(e.target.value)} /></Campo>
        <div className="flex items-end"><button type="button" className={boton} onClick={() => void generar()}>Generar mes</button></div>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Método de cobro:</span>
        <select className={campo} value={metodo} onChange={(e) => setMetodo(e.target.value)} style={{ maxWidth: 170 }}>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="tarjeta">Tarjeta</option>
        </select>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-glass-border p-3"><p className="text-xs text-muted-foreground">Por cobrar</p><p className="font-display text-xl">{dinero(totalPendiente)}</p></div>
        <div className={`rounded-xl border p-3 ${enMora.length > 0 ? "border-destructive/60 bg-destructive/10" : "border-glass-border"}`}><p className="text-xs text-muted-foreground">En mora ({enMora.length})</p><p className="font-display text-xl">{dinero(totalMora)}</p></div>
      </div>
      <div className="mt-3 space-y-2">
        {mora.slice(0, 80).map((p) => {
          const e = ests.find((x) => x.id === p.estudiante_id);
          const dMora = p.fecha_vence && p.fecha_vence < hoy ? diasEntreIso(p.fecha_vence, hoy) : 0;
          const wa = aWhatsapp(e?.telefono_acu, `Hola ${e?.acudiente ?? "acudiente"}, la pensión de ${e?.nombre} (${p.periodo}, ${dinero(p.valor)}) ${dMora > 0 ? `está vencida hace ${dMora} día(s)` : "está pendiente"}. ¿Te ayudamos con el pago?`);
          return (
            <div key={p.id} className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ${dMora > 0 ? "border-destructive/60 bg-destructive/10" : "border-glass-border"}`}>
              <div className="min-w-0">
                <p className="break-words font-semibold">{e?.nombre ?? "Estudiante"} · {p.periodo}</p>
                <p className="text-xs text-muted-foreground">{p.concepto} · {dinero(p.valor)}{p.fecha_vence ? ` · vence ${p.fecha_vence}` : ""}{dMora > 0 ? ` · EN MORA ${dMora} día(s)` : ""}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {wa && <a className={botonSec} href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> Cobrar</a>}
                <button type="button" className={botonSec} onClick={() => void cobrar(p)}>Cobrar y dar recibo</button>
              </div>
            </div>
          );
        })}
        {mora.length === 0 && <p className="text-sm text-muted-foreground">Sin pensiones pendientes. Genera el mes arriba.</p>}
      </div>
      {pagadas.length > 0 && (
        <div className="mt-4 space-y-1">
          <p className="text-sm font-medium">Últimos pagos</p>
          {pagadas.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="min-w-0 break-words">{ests.find((x) => x.id === p.estudiante_id)?.nombre ?? "Estudiante"} · {p.periodo} · {dinero(p.valor)}</span>
              <button type="button" className={botonSec} onClick={() => imprimirRecibo(p, metodo)}>Reimprimir recibo</button>
            </div>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}

// ============================================================
// Educación: asistencia y boletín de notas
// ============================================================
export function AcademicoEducacion() {
  const [ests, setEsts] = useState<Est[]>([]);
  const [asis, setAsis] = useState<Asi[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sel, setSel] = useState("");
  const [presente, setPresente] = useState(true);
  const [periodo, setPeriodo] = useState("");
  const [area, setArea] = useState("");
  const [logro, setLogro] = useState("");
  const [valoracion, setValoracion] = useState("Básico");

  const cargar = useCallback(async () => {
    const [e, a, n] = await Promise.all([
      supabase.from("edu_estudiantes").select("*").eq("estado", "activo").order("nombre"),
      supabase.from("edu_asistencia").select("*").order("fecha", { ascending: false }).limit(200),
      supabase.from("edu_notas").select("*").order("created_at", { ascending: false }).limit(200),
    ]);
    setEsts(e.data ?? []);
    setAsis(a.data ?? []);
    setNotas(n.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const marcar = async () => {
    if (!sel) return toast.error("Elige el estudiante.");
    const hoy = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from("edu_asistencia").insert({ estudiante_id: sel, fecha: hoy, presente });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    toast.success("Asistencia de hoy guardada.");
    void cargar();
  };

  const guardarNota = async () => {
    if (!sel) return toast.error("Elige el estudiante.");
    if (periodo.trim().length < 1) return toast.error("Escribe el periodo.");
    if (area.trim().length < 2) return toast.error("Escribe el área o materia.");
    const { error } = await supabase.from("edu_notas").insert({
      estudiante_id: sel, periodo: periodo.trim(), area: area.trim(),
      logro: logro.trim() || null, valoracion,
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    setPeriodo(""); setArea(""); setLogro("");
    toast.success("Nota guardada en el boletín.");
    void cargar();
  };

  const delSel = sel ? asis.filter((a) => a.estudiante_id === sel).slice(0, 10) : [];
  const notasSel = sel ? notas.filter((n) => n.estudiante_id === sel) : [];

  if (cargando) return <Cargando />; // académico
  return (
    <div className="space-y-6">
    <PaseDeLista ests={ests} />
    <ReporteDiarioAcudiente ests={ests} />
    <GlassPanel>
      <Encabezado titulo="Asistencia y boletín" texto="Llama a lista cada día y lleva las notas por periodo." />
      <Campo etiqueta="Estudiante">
        <select className={campo} value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="">Elige…</option>
          {ests.map((e) => <option key={e.id} value={e.id}>{e.nombre} · {e.grado}</option>)}
        </select>
      </Campo>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={presente} onChange={(e) => setPresente(e.target.checked)} /> Presente hoy
        </label>
        <button type="button" className={botonSec} onClick={() => void marcar()}>Guardar asistencia</button>
      </div>
      {delSel.length > 0 && (
        <p className="mt-2 text-xs text-muted-foreground">Últimos días: {delSel.map((a) => `${a.fecha.slice(5)} ${a.presente ? "✓" : "✗"}`).join(" · ")}</p>
      )}
      <div className="mt-4 grid gap-2 sm:grid-cols-4">
        <Campo etiqueta="Periodo"><input className={campo} value={periodo} onChange={(e) => setPeriodo(e.target.value)} placeholder="1er periodo" /></Campo>
        <Campo etiqueta="Área"><input className={campo} value={area} onChange={(e) => setArea(e.target.value)} placeholder="Matemáticas" /></Campo>
        <Campo etiqueta="Valoración">
          <select className={campo} value={valoracion} onChange={(e) => setValoracion(e.target.value)}>
            <option>Bajo</option><option>Básico</option><option>Alto</option><option>Superior</option>
          </select>
        </Campo>
        <Campo etiqueta="Logro"><input className={campo} value={logro} onChange={(e) => setLogro(e.target.value)} placeholder="Suma fracciones…" /></Campo>
      </div>
      <button type="button" className={`${botonSec} mt-2`} onClick={() => void guardarNota()}>Guardar nota</button>
      {notasSel.length > 0 && (
        <div className="mt-2 space-y-1">
          {notasSel.map((n) => (
            <p key={n.id} className="text-sm">{n.periodo} · <strong>{n.area}</strong> · {n.valoracion}{n.logro ? ` · ${n.logro}` : ""}</p>
          ))}
        </div>
      )}
    </GlassPanel>
    </div>
  );
}

// ------------------------------------------------------------
// Pase de lista diario con hora de entrada, salida y quién recoge
// ------------------------------------------------------------
type FilaLista = { presente: boolean; entrada: string; salida: string; recoge: string; nota: string };

function PaseDeLista({ ests }: { ests: Est[] }) {
  const hoy = hoyIso();
  const [hechos, setHechos] = useState<Asi[]>([]);
  const [filas, setFilas] = useState<Record<string, FilaLista>>({});
  const cargar = useCallback(async () => {
    const { data } = await supabase.from("edu_asistencia").select("*").eq("fecha", hoy);
    setHechos(data ?? []);
  }, [hoy]);
  useEffect(() => { void cargar(); }, [cargar]);

  const valorDe = (e: Est): FilaLista => {
    const h = hechos.find((x) => x.estudiante_id === e.id);
    return filas[e.id] ?? {
      presente: h ? h.presente : true, entrada: h?.hora_entrada ?? "", salida: h?.hora_salida ?? "",
      recoge: h?.recogido_por ?? "", nota: h?.nota ?? "",
    };
  };
  const cambiar = (e: Est, parcial: Partial<FilaLista>) => setFilas((p) => ({ ...p, [e.id]: { ...valorDe(e), ...parcial } }));

  const guardar = async (e: Est) => {
    const v = valorDe(e);
    const h = hechos.find((x) => x.estudiante_id === e.id);
    const datos = {
      presente: v.presente, hora_entrada: v.entrada || null, hora_salida: v.salida || null,
      recogido_por: v.recoge.trim() || null, nota: v.nota.trim() || null,
    };
    const { error } = h
      ? await supabase.from("edu_asistencia").update(datos).eq("id", h.id)
      : await supabase.from("edu_asistencia").insert({ estudiante_id: e.id, fecha: hoy, ...datos });
    if (error) return toast.error(msg(error.message, "No se pudo guardar la asistencia."));
    toast.success(`Asistencia de ${e.nombre} guardada.`);
    setFilas((p) => { const { [e.id]: _quitar, ...resto } = p; return resto; });
    void cargar();
  };

  const presentes = ests.filter((e) => hechos.find((x) => x.estudiante_id === e.id)?.presente).length;
  const ausentes = ests.filter((e) => hechos.find((x) => x.estudiante_id === e.id)?.presente === false).length;
  return (
    <GlassPanel>
      <Encabezado titulo="Asistencia de hoy" texto="Marca presente o ausente, la hora de entrada y salida y quién recoge. Si falta, avisa al acudiente por WhatsApp." />
      <p className="mb-2 text-sm text-muted-foreground">{hoy} · Presentes {presentes} · Ausentes {ausentes} · Sin registrar {Math.max(ests.length - presentes - ausentes, 0)}</p>
      <div className="space-y-2">
        {ests.map((e) => {
          const v = valorDe(e);
          const guardado = hechos.some((x) => x.estudiante_id === e.id);
          const wa = !v.presente ? aWhatsapp(e.telefono_acu, `Hola ${e.acudiente ?? "acudiente"}, hoy ${e.nombre} no asistió. ¿Está todo bien? Cuéntanos si necesita algo.`) : null;
          return (
            <div key={e.id} className={`space-y-2 rounded-xl border p-3 ${guardado ? "border-primary/40" : "border-glass-border"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 break-words font-semibold">{e.nombre} <span className="text-xs text-muted-foreground">{e.grado}{e.grupo ? ` · ${e.grupo}` : ""}</span></p>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.presente} onChange={(ev) => cambiar(e, { presente: ev.target.checked })} /> Presente</label>
              </div>
              {v.presente && (
                <div className="grid gap-2 sm:grid-cols-4">
                  <Campo etiqueta="Entrada"><input type="time" className={campo} value={v.entrada} onChange={(ev) => cambiar(e, { entrada: ev.target.value })} /></Campo>
                  <Campo etiqueta="Salida"><input type="time" className={campo} value={v.salida} onChange={(ev) => cambiar(e, { salida: ev.target.value })} /></Campo>
                  <Campo etiqueta="Lo recoge"><input className={campo} value={v.recoge} onChange={(ev) => cambiar(e, { recoge: ev.target.value })} placeholder="Nombre y parentesco" /></Campo>
                  <Campo etiqueta="Novedad"><input className={campo} value={v.nota} onChange={(ev) => cambiar(e, { nota: ev.target.value })} placeholder="Fiebre, golpe, medicamento…" /></Campo>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <button type="button" className={botonSec} onClick={() => void guardar(e)}>{guardado ? "Actualizar" : "Guardar"}</button>
                {wa && <a className={botonSec} href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> Avisar ausencia</a>}
              </div>
            </div>
          );
        })}
        {ests.length === 0 && <p className="text-sm text-muted-foreground">Matricula primero a los estudiantes o niños.</p>}
      </div>
    </GlassPanel>
  );
}

// ------------------------------------------------------------
// Reporte diario al acudiente (comidas, siestas, pañales, actividades)
// ------------------------------------------------------------
type Reporte = Tables<"edu_reportes_diarios">;

function ReporteDiarioAcudiente({ ests }: { ests: Est[] }) {
  const [sel, setSel] = useState("");
  const [lista, setLista] = useState<Reporte[]>([]);
  const [f, setF] = useState<Record<string, string>>({ comidas: "Comió todo", animo: "Feliz" });
  const cargar = useCallback(async () => {
    if (!sel) return setLista([]);
    const { data } = await supabase.from("edu_reportes_diarios").select("*").eq("estudiante_id", sel).order("fecha", { ascending: false }).order("created_at", { ascending: false }).limit(10);
    setLista(data ?? []);
  }, [sel]);
  useEffect(() => { void cargar(); }, [cargar]);
  const k = (c: string) => f[c] ?? "";
  const cambiar = (c: string, v: string) => setF((x) => ({ ...x, [c]: v }));

  const guardar = async () => {
    if (!sel) return toast.error("Elige al niño o estudiante.");
    if (!k("actividad").trim() && !k("mensaje").trim()) return toast.error("Cuéntale algo al acudiente: actividad o mensaje.");
    const { error } = await supabase.from("edu_reportes_diarios").insert({
      estudiante_id: sel, comidas: k("comidas"), siestas: k("siestas").trim(), panales: k("panales").trim(),
      estado_animo: k("animo"), actividad: k("actividad").trim(), mensaje: k("mensaje").trim(), profesora: k("profesora").trim(),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar el reporte."));
    toast.success("Reporte guardado. Ya puedes enviarlo por WhatsApp.");
    setF({ comidas: "Comió todo", animo: "Feliz" });
    void cargar();
  };

  const textoWa = (r: Reporte, e: Est | undefined): string =>
    `Reporte del día de ${e?.nombre ?? ""} (${r.fecha}): comidas: ${r.comidas || "—"}; siestas: ${r.siestas || "—"}; pañales/baño: ${r.panales || "—"}; ánimo: ${r.estado_animo || "—"}. Actividad: ${r.actividad || "—"}. ${r.mensaje ? `Mensaje: ${r.mensaje}` : ""}${r.profesora ? ` — ${r.profesora}` : ""}`;
  const imprimir = (r: Reporte, e: Est | undefined) =>
    abrirImpresion(`<html><head><meta charset="utf-8"><title>Reporte diario</title><style>body{font-family:Arial,sans-serif;padding:28px;color:#111}h1{font-size:18px}.box{border:2px solid #0e7490;border-radius:10px;padding:16px;margin-top:10px}</style></head><body>
<h1>REPORTE DIARIO · ${escaparHtml(e?.nombre ?? "")}</h1><p>${escaparHtml(r.fecha)}</p><div class="box"><p><b>Comidas:</b> ${escaparHtml(r.comidas)}</p><p><b>Siestas:</b> ${escaparHtml(r.siestas)}</p><p><b>Pañales o baño:</b> ${escaparHtml(r.panales)}</p><p><b>Estado de ánimo:</b> ${escaparHtml(r.estado_animo)}</p><p><b>Actividad:</b> ${escaparHtml(r.actividad)}</p><p><b>Mensaje:</b> ${escaparHtml(r.mensaje)}</p><p><b>Profesora:</b> ${escaparHtml(r.profesora)}</p></div></body></html>`);

  const est = ests.find((x) => x.id === sel);
  return (
    <GlassPanel>
      <Encabezado titulo="Reporte diario al acudiente" texto="Comidas, siestas, pañales, ánimo y actividades del día. Guárdalo y envíalo por WhatsApp o imprímelo para la agenda." />
      <Campo etiqueta="Niño o estudiante">
        <select className={campo} value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="">Elige…</option>
          {ests.map((e) => <option key={e.id} value={e.id}>{e.nombre} · {e.grado}</option>)}
        </select>
      </Campo>
      {sel && (
        <>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <Campo etiqueta="Comidas">
              <select className={campo} value={k("comidas")} onChange={(e) => cambiar("comidas", e.target.value)}>
                <option>Comió todo</option><option>Comió poco</option><option>No comió</option>
              </select>
            </Campo>
            <Campo etiqueta="Estado de ánimo">
              <select className={campo} value={k("animo")} onChange={(e) => cambiar("animo", e.target.value)}>
                <option>Feliz</option><option>Tranquilo</option><option>Inquieto</option><option>Triste o llorón</option>
              </select>
            </Campo>
            <Campo etiqueta="Siestas"><input className={campo} value={k("siestas")} onChange={(e) => cambiar("siestas", e.target.value)} placeholder="1 h 30 min" /></Campo>
            <Campo etiqueta="Pañales o baño"><input className={campo} value={k("panales")} onChange={(e) => cambiar("panales", e.target.value)} placeholder="3 pañales, fue al baño 2 veces" /></Campo>
            <Campo etiqueta="Actividad del día"><input className={campo} value={k("actividad")} onChange={(e) => cambiar("actividad", e.target.value)} /></Campo>
            <Campo etiqueta="Profesora a cargo"><input className={campo} value={k("profesora")} onChange={(e) => cambiar("profesora", e.target.value)} /></Campo>
          </div>
          <Campo etiqueta="Mensaje para el acudiente"><input className={campo} value={k("mensaje")} onChange={(e) => cambiar("mensaje", e.target.value)} /></Campo>
          <button type="button" className={`${boton} mt-2`} onClick={() => void guardar()}>Guardar reporte</button>
          <div className="mt-3 space-y-2">
            {lista.map((r) => {
              const wa = aWhatsapp(est?.telefono_acu, textoWa(r, est));
              return (
                <div key={r.id} className="rounded-xl border border-glass-border p-3 text-sm">
                  <p className="break-words font-medium">{r.fecha} · {r.comidas} · ánimo {r.estado_animo}</p>
                  <p className="break-words text-xs text-muted-foreground">{r.actividad}{r.mensaje ? ` · ${r.mensaje}` : ""}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {wa && <a className={botonSec} href={wa} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" /> Enviar por WhatsApp</a>}
                    <button type="button" className={botonSec} onClick={() => imprimir(r, est)}>Imprimir</button>
                  </div>
                </div>
              );
            })}
            {lista.length === 0 && <p className="text-sm text-muted-foreground">Sin reportes todavía.</p>}
          </div>
        </>
      )}
    </GlassPanel>
  );
}

// ============================================================
// Moda: matriz talla/color por referencia + bonos
// ============================================================
export function MatrizModa() {
  const [refs, setRefs] = useState<Ref[]>([]);
  const [vars, setVars] = useState<Var[]>([]);
  const [bonos, setBonos] = useState<Bono[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sel, setSel] = useState("");
  const [nombre, setNombre] = useState("");
  const [marca, setMarca] = useState("");
  const [temporada, setTemporada] = useState("");
  const [precio, setPrecio] = useState("");
  const [talla, setTalla] = useState("");
  const [color, setColor] = useState("");
  const [stock, setStock] = useState("");
  const [codigo, setCodigo] = useState("");
  const [bonoCli, setBonoCli] = useState("");
  const [bonoVal, setBonoVal] = useState("");
  const [bonoRef, setBonoRef] = useState("");

  const cargar = useCallback(async () => {
    const [r, v, b] = await Promise.all([
      supabase.from("mod_referencias").select("*").order("nombre"),
      supabase.from("mod_variantes").select("*").order("talla"),
      supabase.from("mod_bonos").select("*").order("created_at", { ascending: false }).limit(60),
    ]);
    setRefs(r.data ?? []);
    setVars(v.data ?? []);
    setBonos(b.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crearRef = async () => {
    if (nombre.trim().length < 2) return toast.error("Escribe el nombre de la referencia.");
    const { data, error } = await supabase.from("mod_referencias").insert({
      nombre: nombre.trim(), marca: marca.trim() || null,
      temporada: temporada.trim() || null, precio: Math.max(num(precio), 0),
    }).select("id").single();
    if (error || !data) return toast.error(msg(error?.message, "No se pudo guardar."));
    setNombre(""); setMarca(""); setTemporada(""); setPrecio("");
    setSel(data.id);
    toast.success("Referencia creada. Ahora agrega sus tallas y colores.");
    void cargar();
  };

  const crearVar = async () => {
    if (!sel) return toast.error("Elige la referencia.");
    if (talla.trim().length < 1) return toast.error("Escribe la talla.");
    const { error } = await supabase.from("mod_variantes").insert({
      referencia_id: sel, talla: talla.trim(), color: color.trim() || "único",
      stock: Math.max(Math.round(num(stock)), 0), codigo_barras: codigo.trim() || null,
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar la variante."));
    setTalla(""); setColor(""); setStock(""); setCodigo("");
    void cargar();
  };

  const sumar = async (v: Var, d: number) => {
    const { error } = await supabase.from("mod_variantes").update({ stock: Math.max(v.stock + d, 0) }).eq("id", v.id);
    if (error) return toast.error(msg(error.message, "No se pudo ajustar."));
    void cargar();
  };

  const crearBono = async () => {
    if (bonoCli.trim().length < 2) return toast.error("Escribe el cliente.");
    if (num(bonoVal) <= 0) return toast.error("El valor debe ser mayor a cero.");
    const { error } = await supabase.from("mod_bonos").insert({
      concepto: "bono", cliente: bonoCli.trim(), valor: num(bonoVal),
      referencia: bonoRef.trim() || null,
    });
    if (error) return toast.error(msg(error.message, "No se pudo crear el bono."));
    setBonoCli(""); setBonoVal(""); setBonoRef("");
    toast.success("Bono de regalo creado.");
    void cargar();
  };

  const varsSel = vars.filter((v) => v.referencia_id === sel);

  if (cargando) return <Cargando />; // colección
  return (
    <GlassPanel>
      <Encabezado titulo="Referencias y matriz talla/color" texto="Una referencia padre con todas sus combinaciones de talla y color." />
      <Campo etiqueta="Referencia">
        <select className={campo} value={sel} onChange={(e) => setSel(e.target.value)}>
          <option value="">Elige o crea una abajo…</option>
          {refs.map((r) => <option key={r.id} value={r.id}>{r.nombre} · {dinero(r.precio)}</option>)}
        </select>
      </Campo>
      {varsSel.length > 0 && (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground"><th>Talla</th><th>Color</th><th>Código</th><th>Stock</th><th /></tr></thead>
            <tbody>
              {varsSel.map((v) => (
                <tr key={v.id} className="border-t border-glass-border">
                  <td className="py-1 font-semibold">{v.talla}</td>
                  <td>{v.color}</td>
                  <td className="text-xs">{v.codigo_barras ?? "—"}</td>
                  <td>{v.stock}</td>
                  <td className="flex gap-1">
                    <button type="button" className={botonSec} onClick={() => void sumar(v, 1)}>+1</button>
                    <button type="button" className={botonSec} onClick={() => void sumar(v, -1)}>-1</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Campo etiqueta="Talla"><input className={campo} value={talla} onChange={(e) => setTalla(e.target.value)} placeholder="S, M, 37, 38…" /></Campo>
        <Campo etiqueta="Color"><input className={campo} value={color} onChange={(e) => setColor(e.target.value)} placeholder="Negro, blanco…" /></Campo>
        <Campo etiqueta="Stock inicial"><input className={campo} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="6" /></Campo>
        <Campo etiqueta="Código de barras"><input className={campo} value={codigo} onChange={(e) => setCodigo(e.target.value)} placeholder="770…" /></Campo>
        <div className="flex items-end sm:col-span-2"><button type="button" className={botonSec} onClick={() => void crearVar()}>Agregar variante</button></div>
      </div>
      <div className="mt-4 border-t border-glass-border pt-3">
        <p className="text-sm font-semibold">Nueva referencia</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-4">
          <Campo etiqueta="Nombre"><input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Jean skinny" /></Campo>
          <Campo etiqueta="Marca"><input className={campo} value={marca} onChange={(e) => setMarca(e.target.value)} /></Campo>
          <Campo etiqueta="Temporada"><input className={campo} value={temporada} onChange={(e) => setTemporada(e.target.value)} placeholder="2026-1" /></Campo>
          <Campo etiqueta="Precio"><input className={campo} inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Campo>
        </div>
        <button type="button" className={`${boton} mt-2`} onClick={() => void crearRef()}>Crear referencia</button>
      </div>
      <div className="mt-4 border-t border-glass-border pt-3">
        <p className="text-sm font-semibold">Bonos de regalo y cambios</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <Campo etiqueta="Cliente"><input className={campo} value={bonoCli} onChange={(e) => setBonoCli(e.target.value)} /></Campo>
          <Campo etiqueta="Valor"><input className={campo} inputMode="decimal" value={bonoVal} onChange={(e) => setBonoVal(e.target.value)} /></Campo>
          <Campo etiqueta="Motivo"><input className={campo} value={bonoRef} onChange={(e) => setBonoRef(e.target.value)} placeholder="Cambio talla M→S" /></Campo>
        </div>
        <button type="button" className={`${botonSec} mt-2`} onClick={() => void crearBono()}>Crear bono</button>
        {bonos.filter((b) => b.estado === "vigente").slice(0, 20).map((b) => (
          <p key={b.id} className="mt-1 text-sm">{b.cliente} · {dinero(b.valor)}{b.referencia ? ` · ${b.referencia}` : ""}</p>
        ))}
      </div>
    </GlassPanel>
  );
}

// ============================================================
// Farmacia: INVIMA, fórmula, controlados y frío
// ============================================================
export function ControlFarmacia() {
  const [prods, setProds] = useState<Far[]>([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState("");
  const [nombre, setNombre] = useState("");
  const [principio, setPrincipio] = useState("");
  const [invima, setInvima] = useState("");
  const [formula, setFormula] = useState(false);
  const [controlado, setControlado] = useState(false);
  const [frio, setFrio] = useState(false);
  const [stock, setStock] = useState("");
  const [precio, setPrecio] = useState("");
  const [vence, setVence] = useState("");
  const [cant, setCant] = useState("");
  const [cli, setCli] = useState("");
  const [conFormula, setConFormula] = useState(false);
  const [metodo, setMetodo] = useState("efectivo");

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("far_productos").select("*").order("nombre");
    setProds(data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    if (nombre.trim().length < 2) return toast.error("Escribe el nombre del producto.");
    const { error } = await supabase.from("far_productos").insert({
      nombre: nombre.trim(), principio_activo: principio.trim() || null,
      registro_invima: invima.trim() || null, requiere_formula: formula,
      controlado, refrigerado: frio, stock: Math.max(num(stock), 0),
      precio: Math.max(num(precio), 0), vence: vence || null,
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    setNombre(""); setPrincipio(""); setInvima(""); setStock(""); setPrecio(""); setVence("");
    toast.success("Producto guardado.");
    void cargar();
  };

  const vender = async (f: Far) => {
    if (num(cant) <= 0) return toast.error("Escribe la cantidad.");
    const { error } = await supabase.rpc("far_vender", {
      p_producto: f.id, p_cantidad: num(cant), p_cliente: cli.trim() || null,
      p_con_formula: conFormula, p_metodo: metodo,
    });
    if (error) return toast.error(msg(error.message, "No se pudo vender."));
    setCant("");
    toast.success("Venta registrada. Entró a Caja.");
    void cargar();
  };

  const lista = prods.filter((p) => p.nombre.toLowerCase().includes(q.toLowerCase()));

  if (cargando) return <Cargando />; // droguería
  return (
    <GlassPanel>
      <Encabezado titulo="Droguería y control de fórmula" texto="Antibióticos y controlados exigen fórmula marcada. Los refrigerados llevan cadena de frío." />
      <input className={campo} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto…" />
      <div className="mt-2 space-y-2">
        {lista.slice(0, 80).map((f) => (
          <div key={f.id} className="rounded-xl border border-glass-border p-3">
            <p className="font-semibold">{f.nombre}
              {f.requiere_formula && <span className="ml-2 rounded bg-amber-500/20 px-1 text-xs text-amber-300">con fórmula</span>}
              {f.controlado && <span className="ml-1 rounded bg-rose-500/20 px-1 text-xs text-rose-300">controlado</span>}
              {f.refrigerado && <span className="ml-1 rounded bg-sky-500/20 px-1 text-xs text-sky-300">refrigerado</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {f.principio_activo ?? "—"}{f.registro_invima ? ` · INVIMA ${f.registro_invima}` : " · sin INVIMA"} · stock {f.stock} · {dinero(f.precio)}{f.vence ? ` · vence ${f.vence}` : ""}
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <Campo etiqueta="Cantidad"><input className={campo} inputMode="decimal" value={cant} onChange={(e) => setCant(e.target.value)} style={{ maxWidth: 110 }} /></Campo>
              <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={conFormula} onChange={(e) => setConFormula(e.target.checked)} /> Tiene fórmula</label>
              <button type="button" className={botonSec} onClick={() => void vender(f)}>Vender</button>
            </div>
          </div>
        ))}
        {lista.length === 0 && <p className="text-sm text-muted-foreground">Sin productos todavía.</p>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Método:</span>
        <select className={campo} value={metodo} onChange={(e) => setMetodo(e.target.value)} style={{ maxWidth: 160 }}>
          <option value="efectivo">Efectivo</option>
          <option value="transferencia">Transferencia</option>
          <option value="tarjeta">Tarjeta</option>
        </select>
        <Campo etiqueta="Cliente (opcional)"><input className={campo} value={cli} onChange={(e) => setCli(e.target.value)} style={{ maxWidth: 200 }} /></Campo>
      </div>
      <div className="mt-4 border-t border-glass-border pt-3">
        <p className="text-sm font-semibold">Nuevo producto</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <Campo etiqueta="Nombre"><input className={campo} value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
          <Campo etiqueta="Principio activo"><input className={campo} value={principio} onChange={(e) => setPrincipio(e.target.value)} /></Campo>
          <Campo etiqueta="Registro INVIMA"><input className={campo} value={invima} onChange={(e) => setInvima(e.target.value)} /></Campo>
          <Campo etiqueta="Stock"><input className={campo} inputMode="decimal" value={stock} onChange={(e) => setStock(e.target.value)} /></Campo>
          <Campo etiqueta="Precio"><input className={campo} inputMode="decimal" value={precio} onChange={(e) => setPrecio(e.target.value)} /></Campo>
          <Campo etiqueta="Vence"><input type="date" className={campo} value={vence} onChange={(e) => setVence(e.target.value)} /></Campo>
        </div>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <label className="flex items-center gap-1"><input type="checkbox" checked={formula} onChange={(e) => setFormula(e.target.checked)} /> Exige fórmula</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={controlado} onChange={(e) => setControlado(e.target.checked)} /> Controlado</label>
          <label className="flex items-center gap-1"><input type="checkbox" checked={frio} onChange={(e) => setFrio(e.target.checked)} /> Refrigerado</label>
        </div>
        <button type="button" className={`${boton} mt-2`} onClick={() => void crear()}>Guardar producto</button>
      </div>
    </GlassPanel>
  );
}

// ============================================================
// Óptica: fórmula + orden de laboratorio con abono y saldo
// ============================================================
export function FormulasOptica() {
  const [fors, setFors] = useState<OptF[]>([]);
  const [ords, setOrds] = useState<OptO[]>([]);
  const [cargando, setCargando] = useState(true);
  const [cliente, setCliente] = useState("");
  const [tel, setTel] = useState("");
  const [od, setOd] = useState({ esf: "", cil: "", eje: "", adi: "", dp: "" });
  const [oi, setOi] = useState({ esf: "", cil: "", eje: "", adi: "", dp: "" });
  const [selF, setSelF] = useState("");
  const [montura, setMontura] = useState("");
  const [lentes, setLentes] = useState("");
  const [lab, setLab] = useState("");
  const [valor, setValor] = useState("");
  const [abono, setAbono] = useState("");
  const [promesa, setPromesa] = useState("");
  const [metodo, setMetodo] = useState("transferencia");

  const cargar = useCallback(async () => {
    const [f, o] = await Promise.all([
      supabase.from("opt_formulas").select("*").order("created_at", { ascending: false }).limit(60),
      supabase.from("opt_ordenes").select("*").order("created_at", { ascending: false }).limit(60),
    ]);
    setFors(f.data ?? []);
    setOrds(o.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardarFormula = async () => {
    if (cliente.trim().length < 2) return toast.error("Escribe el cliente.");
    const { data, error } = await supabase.from("opt_formulas").insert({
      cliente: cliente.trim(), telefono: tel.trim() || null,
      od_esfera: od.esf || null, od_cilindro: od.cil || null, od_eje: od.eje || null, od_adicion: od.adi || null, od_dp: od.dp || null,
      oi_esfera: oi.esf || null, oi_cilindro: oi.cil || null, oi_eje: oi.eje || null, oi_adicion: oi.adi || null, oi_dp: oi.dp || null,
    }).select("id").single();
    if (error || !data) return toast.error(msg(error?.message, "No se pudo guardar."));
    setSelF(data.id);
    toast.success("Fórmula guardada. Ahora crea la orden de laboratorio.");
    void cargar();
  };

  const crearOrden = async () => {
    if (num(valor) < 0) return toast.error("El valor no es válido.");
    const f = fors.find((x) => x.id === selF);
    const cli = f?.cliente ?? cliente.trim();
    if (cli.length < 2) return toast.error("Primero guarda la fórmula del cliente.");
    const ab = Math.max(num(abono), 0);
    if (ab > num(valor)) return toast.error("El abono supera el valor.");
    const { data: nueva, error } = await supabase.from("opt_ordenes").insert({
      formula_id: selF || null, cliente: cli,
      montura: montura.trim() || null, lentes: lentes.trim() || null, laboratorio: lab.trim() || null,
      valor: num(valor), abono: 0, saldo: num(valor),
      estado: "ordenada",
      promesa: promesa || null,
    }).select("id").single();
    if (error || !nueva) return toast.error(msg(error?.message, "No se pudo crear la orden."));
    if (ab > 0) {
      const { error: eAbono } = await supabase.rpc("opt_abonar", { p_orden: (nueva as { id: string }).id, p_valor: ab, p_metodo: metodo });
      if (eAbono) return toast.error(msg(eAbono.message, "No se pudo registrar el abono."));
    }
    setMontura(""); setLentes(""); setLab(""); setValor(""); setAbono("");
    toast.success("Orden de laboratorio creada.");
    void cargar();
  };

  const abonar = async (o: OptO, monto: string) => {
    if (num(monto) <= 0) return toast.error("Escribe el abono.");
    const { error } = await supabase.rpc("opt_abonar", { p_orden: o.id, p_valor: num(monto), p_metodo: metodo });
    if (error) return toast.error(msg(error.message, "No se pudo abonar."));
    toast.success("Abono registrado. Entró a Caja.");
    void cargar();
  };

  const entregar = async (o: OptO) => {
    if (o.saldo > 0) return toast.error(`Falta el saldo de ${dinero(o.saldo)} contra entrega.`);
    const { error } = await supabase.from("opt_ordenes").update({ estado: "entregada" }).eq("id", o.id);
    if (error) return toast.error(msg(error.message, "No se pudo entregar."));
    void cargar();
  };

  if (cargando) return <Cargando />; // óptica
  return (
    <GlassPanel>
      <Encabezado titulo="Fórmula y laboratorio" texto="Esfera, cilindro, eje, adición y DP de cada ojo, con orden, abono y saldo contra entrega." />
      <div className="grid gap-2 sm:grid-cols-3">
        <Campo etiqueta="Cliente"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
        <Campo etiqueta="Celular"><input className={campo} inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></Campo>
        <div className="flex items-end"><button type="button" className={botonSec} onClick={() => void guardarFormula()}>Guardar fórmula</button></div>
      </div>
      {(["OD ojo derecho", "OI ojo izquierdo"] as const).map((titulo) => {
        const v = titulo.startsWith("OD") ? od : oi;
        const set = titulo.startsWith("OD") ? setOd : setOi;
        return (
          <div key={titulo} className="mt-2 rounded-xl border border-glass-border p-2">
            <p className="text-xs font-semibold">{titulo}</p>
            <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(["esf", "cil", "eje", "adi", "dp"] as const).map((k) => (
                <Campo key={k} etiqueta={k === "esf" ? "Esfera" : k === "cil" ? "Cilindro" : k === "eje" ? "Eje" : k === "adi" ? "Adición" : "DP"}>
                  <input className={campo} value={v[k]} onChange={(e) => set({ ...v, [k]: e.target.value })} placeholder="—" />
                </Campo>
              ))}
            </div>
          </div>
        );
      })}
      <div className="mt-4 border-t border-glass-border pt-3">
        <p className="text-sm font-semibold">Orden de laboratorio</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <Campo etiqueta="Fórmula">
            <select className={campo} value={selF} onChange={(e) => setSelF(e.target.value)}>
              <option value="">Última guardada…</option>
              {fors.map((f) => <option key={f.id} value={f.id}>{f.cliente}</option>)}
            </select>
          </Campo>
          <Campo etiqueta="Montura"><input className={campo} value={montura} onChange={(e) => setMontura(e.target.value)} placeholder="Marca / modelo" /></Campo>
          <Campo etiqueta="Lentes"><input className={campo} value={lentes} onChange={(e) => setLentes(e.target.value)} placeholder="Progresivo, AR…" /></Campo>
          <Campo etiqueta="Laboratorio"><input className={campo} value={lab} onChange={(e) => setLab(e.target.value)} /></Campo>
          <Campo etiqueta="Valor total"><input className={campo} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></Campo>
          <Campo etiqueta="Abono inicial"><input className={campo} inputMode="decimal" value={abono} onChange={(e) => setAbono(e.target.value)} /></Campo>
          <Campo etiqueta="Fecha prometida"><input type="date" className={campo} value={promesa} onChange={(e) => setPromesa(e.target.value)} /></Campo>
          <Campo etiqueta="Método">
            <select className={campo} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              <option value="transferencia">Transferencia</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </Campo>
          <div className="flex items-end"><button type="button" className={boton} onClick={() => void crearOrden()}>Crear orden</button></div>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {ords.map((o) => (
          <OrdenOptica key={o.id} orden={o} onAbonar={abonar} onEntregar={entregar} />
        ))}
        {ords.length === 0 && <p className="text-sm text-muted-foreground">Sin órdenes todavía.</p>}
      </div>
    </GlassPanel>
  );
}

function OrdenOptica({ orden: o, onAbonar, onEntregar }: {
  orden: OptO;
  onAbonar: (o: OptO, monto: string) => Promise<unknown>;
  onEntregar: (o: OptO) => Promise<unknown>;
}) {
  const [monto, setMonto] = useState("");
  return (
    <div className="rounded-xl border border-glass-border p-3">
      <p className="font-semibold">{o.cliente} <span className="text-xs text-muted-foreground">· {o.estado}{o.promesa ? ` · promete ${o.promesa}` : ""}</span></p>
      <p className="text-xs text-muted-foreground">{o.montura ?? "—"} · {o.lentes ?? "—"} · valor {dinero(o.valor)} · abono {dinero(o.abono)} · saldo {dinero(o.saldo)}</p>
      {o.estado !== "entregada" && (
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <Campo etiqueta="Abonar"><input className={campo} inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} style={{ maxWidth: 130 }} /></Campo>
          <button type="button" className={botonSec} onClick={() => void onAbonar(o, monto)}>Abonar</button>
          <button type="button" className={botonSec} onClick={() => void onEntregar(o)}>Entregar</button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Eventos: salones, cotizador sin cruces, abonos y checklist
// ============================================================
export function EventosSalon() {
  const [salones, setSalones] = useState<Salon[]>([]);
  const [eves, setEves] = useState<Eve[]>([]);
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sel, setSel] = useState("");
  const [nomSalon, setNomSalon] = useState("");
  const [capSalon, setCapSalon] = useState("");
  const [tarSalon, setTarSalon] = useState("");
  const [salonId, setSalonId] = useState("");
  const [cliente, setCliente] = useState("");
  const [tel, setTel] = useState("");
  const [fecha, setFecha] = useState("");
  const [invitados, setInvitados] = useState("");
  const [menu, setMenu] = useState("");
  const [valor, setValor] = useState("");
  const [anticipo, setAnticipo] = useState("");
  const [abonoVal, setAbonoVal] = useState("");
  const [metodo, setMetodo] = useState("transferencia");
  const [tareaTxt, setTareaTxt] = useState("");

  const cargar = useCallback(async () => {
    const [s, e, a, t] = await Promise.all([
      supabase.from("eve_salones").select("*").order("nombre"),
      supabase.from("eve_eventos").select("*").order("fecha", { ascending: true }).limit(80),
      supabase.from("eve_abonos").select("*").order("created_at", { ascending: false }).limit(200),
      supabase.from("eve_checklist").select("*").order("created_at").limit(300),
    ]);
    setSalones(s.data ?? []);
    setEves(e.data ?? []);
    setAbonos(a.data ?? []);
    setTareas(t.data ?? []);
    setCargando(false);
  }, []);
  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crearSalon = async () => {
    if (nomSalon.trim().length < 2) return toast.error("Escribe el nombre del salón.");
    const { error } = await supabase.from("eve_salones").insert({
      nombre: nomSalon.trim(), capacidad: Math.max(Math.round(num(capSalon)) || 50, 1),
      tarifa: Math.max(num(tarSalon), 0),
    });
    if (error) return toast.error(msg(error.message, "No se pudo guardar."));
    setNomSalon(""); setCapSalon(""); setTarSalon("");
    void cargar();
  };

  const cotizar = async () => {
    if (cliente.trim().length < 2) return toast.error("Escribe el cliente.");
    if (!fecha) return toast.error("Elige la fecha.");
    if (num(valor) < 0) return toast.error("El valor no es válido.");
    const { data, error } = await supabase.rpc("eve_reservar", {
      p_salon: salonId || null, p_cliente: cliente.trim(), p_telefono: tel.trim() || null,
      p_fecha: fecha, p_valor: num(valor), p_anticipo: Math.max(num(anticipo), 0),
    });
    if (error) return toast.error(msg(error.message, "No se pudo reservar."));
    const id = (data as { id?: string } | null)?.id;
    if (id && Math.max(num(anticipo), 0) > 0) {
      await supabase.rpc("eve_abonar", { p_evento: id, p_valor: Math.max(num(anticipo), 0), p_metodo: metodo });
    }
    setCliente(""); setTel(""); setFecha(""); setInvitados(""); setMenu(""); setValor(""); setAnticipo("");
    if (id) setSel(id);
    toast.success("Evento cotizado y fecha apartada.");
    void cargar();
  };

  const abonar = async () => {
    if (!sel) return toast.error("Elige el evento.");
    if (num(abonoVal) <= 0) return toast.error("El abono debe ser mayor a cero.");
    const { error } = await supabase.rpc("eve_abonar", { p_evento: sel, p_valor: num(abonoVal), p_metodo: metodo });
    if (error) return toast.error(msg(error.message, "No se pudo abonar."));
    setAbonoVal("");
    toast.success("Abono registrado. Entró a Caja.");
    void cargar();
  };

  const agregarTarea = async () => {
    if (!sel) return toast.error("Elige el evento.");
    if (tareaTxt.trim().length < 2) return toast.error("Escribe la tarea.");
    const { error } = await supabase.from("eve_checklist").insert({ evento_id: sel, tarea: tareaTxt.trim() });
    if (error) return toast.error(msg(error.message, "No se pudo agregar."));
    setTareaTxt("");
    void cargar();
  };

  const toggleTarea = async (t: Tarea) => {
    await supabase.from("eve_checklist").update({ listo: !t.listo }).eq("id", t.id);
    void cargar();
  };

  const cambiarEstado = async (e: Eve, estado: string) => {
    const { error } = await supabase.from("eve_eventos").update({ estado }).eq("id", e.id);
    if (error) return toast.error(msg(error.message, "No se pudo cambiar."));
    void cargar();
  };

  const ev = eves.find((e) => e.id === sel);
  const tareasEv = tareas.filter((t) => t.evento_id === sel);
  const abonosEv = abonos.filter((a) => a.evento_id === sel);

  if (cargando) return <Cargando />; // eventos
  return (
    <GlassPanel>
      <Encabezado titulo="Eventos y salones" texto="Cotiza, aparta la fecha sin cruces, cobra abonos y cumple la lista logística." />
      <div className="grid gap-2 sm:grid-cols-3">
        <Campo etiqueta="Salón (opcional)">
          <select className={campo} value={salonId} onChange={(e) => setSalonId(e.target.value)}>
            <option value="">Sin salón / a domicilio</option>
            {salones.map((s) => <option key={s.id} value={s.id}>{s.nombre} · cap. {s.capacidad}</option>)}
          </select>
        </Campo>
        <Campo etiqueta="Cliente o anfitrión"><input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} /></Campo>
        <Campo etiqueta="Celular"><input className={campo} inputMode="tel" value={tel} onChange={(e) => setTel(e.target.value)} /></Campo>
        <Campo etiqueta="Fecha"><input type="date" className={campo} value={fecha} onChange={(e) => setFecha(e.target.value)} /></Campo>
        <Campo etiqueta="Invitados"><input className={campo} inputMode="numeric" value={invitados} onChange={(e) => setInvitados(e.target.value)} placeholder="100" /></Campo>
        <Campo etiqueta="Menú / paquete"><input className={campo} value={menu} onChange={(e) => setMenu(e.target.value)} placeholder="Menú criollo…" /></Campo>
        <Campo etiqueta="Valor total"><input className={campo} inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} /></Campo>
        <Campo etiqueta="Anticipo inicial"><input className={campo} inputMode="decimal" value={anticipo} onChange={(e) => setAnticipo(e.target.value)} /></Campo>
        <div className="flex items-end"><button type="button" className={boton} onClick={() => void cotizar()}><Plus className="h-4 w-4" /> Cotizar y apartar</button></div>
      </div>
      <div className="mt-3">
        <Campo etiqueta="Ver evento">
          <select className={campo} value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="">Elige…</option>
            {eves.map((e) => <option key={e.id} value={e.id}>{e.fecha} · {e.cliente} · {e.estado} · saldo {dinero(e.saldo)}</option>)}
          </select>
        </Campo>
      </div>
      {ev && (
        <div className="mt-3 rounded-xl border border-glass-border p-3">
          <p className="font-semibold">{ev.fecha} · {ev.cliente} <span className="text-xs text-muted-foreground">· {ev.estado}</span></p>
          <p className="text-xs text-muted-foreground">Valor {dinero(ev.valor)} · anticipo {dinero(ev.anticipo)} · saldo {dinero(ev.saldo)}</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <Campo etiqueta="Abonar"><input className={campo} inputMode="decimal" value={abonoVal} onChange={(e) => setAbonoVal(e.target.value)} style={{ maxWidth: 140 }} /></Campo>
            <Campo etiqueta="Método">
              <select className={campo} value={metodo} onChange={(e) => setMetodo(e.target.value)} style={{ maxWidth: 160 }}>
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
              </select>
            </Campo>
            <button type="button" className={botonSec} onClick={() => void abonar()}>Registrar abono</button>
            {(["confirmado", "realizado", "cancelado"] as const).filter((x) => x !== ev.estado).map((x) => (
              <button key={x} type="button" className={botonSec} onClick={() => void cambiarEstado(ev, x)}>{x}</button>
            ))}
          </div>
          {abonosEv.length > 0 && <p className="mt-1 text-xs text-muted-foreground">Abonos: {abonosEv.map((a) => dinero(a.valor)).join(" + ")}</p>}
          <div className="mt-3 border-t border-glass-border pt-2">
            <p className="text-sm font-semibold">Lista logística</p>
            <div className="mt-1 flex gap-2">
              <input className={campo} value={tareaTxt} onChange={(e) => setTareaTxt(e.target.value)} placeholder="Sonido, sillas, torta…" />
              <button type="button" className={botonSec} onClick={() => void agregarTarea()}>Agregar</button>
            </div>
            {tareasEv.map((t) => (
              <label key={t.id} className="mt-1 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={t.listo} onChange={() => void toggleTarea(t)} /> <span style={{ textDecoration: t.listo ? "line-through" : "none" }}>{t.tarea}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="mt-4 border-t border-glass-border pt-3">
        <p className="text-sm font-semibold">Nuevo salón</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <Campo etiqueta="Nombre"><input className={campo} value={nomSalon} onChange={(e) => setNomSalon(e.target.value)} /></Campo>
          <Campo etiqueta="Capacidad"><input className={campo} inputMode="numeric" value={capSalon} onChange={(e) => setCapSalon(e.target.value)} /></Campo>
          <Campo etiqueta="Tarifa"><input className={campo} inputMode="decimal" value={tarSalon} onChange={(e) => setTarSalon(e.target.value)} /></Campo>
        </div>
        <button type="button" className={`${botonSec} mt-2`} onClick={() => void crearSalon()}>Guardar salón</button>
      </div>
    </GlassPanel>
  );
}
