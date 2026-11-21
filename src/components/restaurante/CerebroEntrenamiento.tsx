import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Brain, Plus, Trash2, Save, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { useAuth } from "@/contexts/AuthContext";
import { objetivosSector, preguntasPrecargadas } from "@/lib/agente-conversaciones";
import { ProbadorAgenteVivo } from "@/components/restaurante/ProbadorAgenteVivo";

type Fila = { id: string; tipo: string; contenido: string };
type Pestana = "identidad" | "faq" | "objetivos" | "probar";

const PERSONALIDADES = ["Amable y Cercano", "Ejecutivo y Profesional", "Rápido y Directo"];
const SEP = " → ";
const campoCls = "w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base";

/**
 * Cerebro y Entrenamiento WhatsApp IA: 4 pestañas. Todo llega precargado por tipo de negocio;
 * el dueño solo ajusta si quiere. Lo guardado lo lee el agente automáticamente.
 */
export function CerebroEntrenamiento() {
  const { negocio } = useNegocio();
  const { user } = useAuth();
  const [pestana, setPestana] = useState<Pestana>("identidad");
  const [filas, setFilas] = useState<Fila[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [probar, setProbar] = useState(false);

  const tipoNegocio = ((negocio as unknown as { tipo_negocio?: string | null } | null)?.tipo_negocio ?? "").slice(0, 80);
  const ownerId = negocio?.owner_id ?? user?.id ?? "";

  const [ident, setIdent] = useState({ nombre: "", ciudad: "", horarios: "", aviso_entrega: "", telefono_pedidos: "" });
  const [pagos, setPagos] = useState("");
  const [personalidad, setPersonalidad] = useState(PERSONALIDADES[0]);
  const [nuevaP, setNuevaP] = useState("");
  const [nuevaR, setNuevaR] = useState("");
  const [politicas, setPoliticas] = useState("");

  const cargar = useCallback(async () => {
    if (!negocio?.id || !ownerId) return;
    const { data } = await supabase
      .from("agente_memoria")
      .select("id,tipo,contenido")
      .eq("negocio_id", negocio.id)
      .in("tipo", ["faq", "objetivo", "objetivo_off", "politica", "identidad_pago", "cerebro_init"])
      .order("created_at", { ascending: true })
      .limit(300);
    let lista = (data ?? []) as Fila[];
    // Precarga automática por tipo de negocio, una sola vez.
    if (!lista.some((f) => f.tipo === "cerebro_init")) {
      const nuevas = [
        ...preguntasPrecargadas(tipoNegocio).map(([p, r]) => ({ tipo: "faq", contenido: `${p}${SEP}${r}` })),
        ...objetivosSector(tipoNegocio).map((o) => ({ tipo: "objetivo", contenido: o })),
        { tipo: "cerebro_init", contenido: "ok" },
      ].map((n) => ({ ...n, negocio_id: negocio.id, owner_id: ownerId }));
      const { data: ins } = await supabase.from("agente_memoria").insert(nuevas).select("id,tipo,contenido");
      lista = [...lista, ...((ins ?? []) as Fila[])];
    }
    setFilas(lista);
    setPagos(lista.find((f) => f.tipo === "identidad_pago")?.contenido ?? "");
    setPoliticas(lista.find((f) => f.tipo === "politica")?.contenido ?? "");
    setCargando(false);
  }, [negocio?.id, ownerId, tipoNegocio]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!negocio) return;
    const n = negocio as unknown as Record<string, string | null>;
    setIdent({
      nombre: n.nombre ?? "",
      ciudad: n.ciudad ?? "",
      horarios: n.horarios ?? "",
      aviso_entrega: n.aviso_entrega ?? "",
      telefono_pedidos: n.telefono_pedidos ?? "",
    });
  }, [negocio]);

  useEffect(() => {
    if (!negocio?.id) return;
    void supabase
      .from("agente_whatsapp")
      .select("personalidad")
      .eq("negocio_id", negocio.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.personalidad && PERSONALIDADES.includes(data.personalidad)) setPersonalidad(data.personalidad);
      });
  }, [negocio?.id]);

  /** Reemplaza el único registro de un tipo (pagos, políticas). */
  const guardarUnico = async (tipo: string, texto: string) => {
    if (!negocio?.id) return;
    await supabase.from("agente_memoria").delete().eq("negocio_id", negocio.id).eq("tipo", tipo);
    if (texto.trim()) {
      await supabase.from("agente_memoria").insert({ negocio_id: negocio.id, owner_id: ownerId, tipo, contenido: texto.trim().slice(0, 1500) });
    }
  };

  const guardarIdentidad = async () => {
    if (!negocio?.id) return;
    setGuardando(true);
    const { error } = await supabase
      .from("negocio_config")
      .update({
        nombre: ident.nombre.trim().slice(0, 80),
        ciudad: ident.ciudad.trim().slice(0, 80),
        horarios: ident.horarios.trim().slice(0, 300),
        aviso_entrega: ident.aviso_entrega.trim().slice(0, 200),
        telefono_pedidos: ident.telefono_pedidos.trim().slice(0, 30),
      })
      .eq("id", negocio.id);
    await supabase.from("agente_whatsapp").update({ personalidad }).eq("negocio_id", negocio.id);
    await guardarUnico("identidad_pago", pagos);
    setGuardando(false);
    if (error) toast.error("No se pudo guardar la identidad del negocio");
    else toast.success("Guardado. El agente ya usa estos datos.");
    void cargar();
  };

  const agregarFaq = async () => {
    if (!negocio?.id || nuevaP.trim().length < 3 || nuevaR.trim().length < 3) {
      toast.error("Escribe la pregunta y la respuesta");
      return;
    }
    const { error } = await supabase.from("agente_memoria").insert({
      negocio_id: negocio.id,
      owner_id: ownerId,
      tipo: "faq",
      contenido: `${nuevaP.trim().slice(0, 200)}${SEP}${nuevaR.trim().slice(0, 500)}`,
    });
    if (error) return void toast.error("No se pudo agregar");
    setNuevaP("");
    setNuevaR("");
    toast.success("Pregunta agregada. El agente ya la conoce.");
    void cargar();
  };

  const borrar = async (id: string) => {
    await supabase.from("agente_memoria").delete().eq("id", id);
    setFilas((f) => f.filter((x) => x.id !== id));
  };

  const guardarPoliticas = async () => {
    setGuardando(true);
    await guardarUnico("politica", politicas);
    setGuardando(false);
    toast.success("Políticas guardadas");
  };

  // Objetivo activo = fila "objetivo"; desmarcado = fila "objetivo_off" (así no se vuelve a sembrar).
  const alternarObjetivo = async (texto: string, activo: boolean) => {
    if (!negocio?.id) return;
    const aBorrar = filas.filter((f) => (f.tipo === "objetivo" || f.tipo === "objetivo_off") && f.contenido === texto);
    for (const f of aBorrar) await supabase.from("agente_memoria").delete().eq("id", f.id);
    await supabase.from("agente_memoria").insert({ negocio_id: negocio.id, owner_id: ownerId, tipo: activo ? "objetivo" : "objetivo_off", contenido: texto });
    void cargar();
  };

  const faqs = filas.filter((f) => f.tipo === "faq");
  const objetivos = objetivosSector(tipoNegocio);
  const activos = new Set(filas.filter((f) => f.tipo === "objetivo").map((f) => f.contenido));
  const tabs: Array<[Pestana, string]> = [
    ["identidad", "Identidad y reglas"],
    ["faq", "Preguntas frecuentes"],
    ["objetivos", "Objetivos de captura"],
    ["probar", "Probar lo que aprendió"],
  ];

  return (
    <GlassPanel className="space-y-4 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Brain className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <div>
          <h3 className="text-base font-semibold">Cerebro y Entrenamiento WhatsApp IA</h3>
          <p className="text-xs text-muted-foreground">
            Todo viene precargado para tu tipo de negocio y el agente ya trabaja con eso. Ajusta solo si quieres afinar algo.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([id, nombre]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPestana(id)}
            className={`rounded-lg border px-3 py-2 text-sm ${pestana === id ? "border-primary bg-primary/10 font-medium text-foreground" : "border-glass-border text-muted-foreground hover:bg-background/60"}`}
          >
            {nombre}
          </button>
        ))}
      </div>

      {cargando && <p className="text-sm text-muted-foreground">Preparando el cerebro de tu agente…</p>}

      {!cargando && pestana === "identidad" && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Nombre comercial</span>
              <input className={campoCls} value={ident.nombre} onChange={(e) => setIdent({ ...ident, nombre: e.target.value })} /></label>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Ciudad</span>
              <input className={campoCls} value={ident.ciudad} onChange={(e) => setIdent({ ...ident, ciudad: e.target.value })} /></label>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Horarios de atención</span>
              <input className={campoCls} value={ident.horarios} onChange={(e) => setIdent({ ...ident, horarios: e.target.value })} placeholder="Lun a Sáb 8 a. m. – 6 p. m." /></label>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Teléfono para pedidos</span>
              <input className={campoCls} inputMode="tel" value={ident.telefono_pedidos} onChange={(e) => setIdent({ ...ident, telefono_pedidos: e.target.value })} /></label>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Tiempo estimado de entrega o atención</span>
              <input className={campoCls} value={ident.aviso_entrega} onChange={(e) => setIdent({ ...ident, aviso_entrega: e.target.value })} placeholder="30 a 45 minutos" /></label>
            <label className="space-y-1"><span className="text-xs text-muted-foreground">Personalidad del agente</span>
              <select className={campoCls} value={personalidad} onChange={(e) => setPersonalidad(e.target.value)}>
                {PERSONALIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select></label>
          </div>
          <label className="block space-y-1"><span className="text-xs text-muted-foreground">Medios de pago aceptados</span>
            <input className={campoCls} value={pagos} onChange={(e) => setPagos(e.target.value)} placeholder="Efectivo, Nequi, transferencia, tarjeta" /></label>
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
            Precios y disponibilidad en tiempo real: <strong>siempre activo</strong>. El agente toma el inventario, el menú o los vehículos directamente de tu base y nunca ofrece lo que está agotado ni inventa precios.
          </p>
          <button type="button" disabled={guardando} onClick={() => void guardarIdentidad()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
            <Save className="h-4 w-4" /> {guardando ? "Guardando…" : "Guardar"}
          </button>
        </div>
      )}

      {!cargando && pestana === "faq" && (
        <div className="space-y-3">
          <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {faqs.map((f) => {
              const [p, ...r] = f.contenido.split(SEP);
              return (
                <li key={f.id} className="flex items-start gap-2 rounded-lg border border-glass-border bg-background/40 p-3 text-sm">
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="break-words"><span className="text-xs text-muted-foreground">Cliente: </span>{p}</p>
                    <p className="break-words"><span className="text-xs text-muted-foreground">Agente: </span>{r.join(SEP)}</p>
                  </div>
                  <button type="button" aria-label="Quitar pregunta" onClick={() => void borrar(f.id)} className="rounded-md p-1.5 text-muted-foreground hover:bg-background/60 hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="space-y-2 rounded-xl border border-glass-border p-3">
            <input className={campoCls} placeholder="Pregunta del cliente (ej. ¿Reciben usado en retoma?)" value={nuevaP} onChange={(e) => setNuevaP(e.target.value)} />
            <textarea className={campoCls} rows={2} placeholder="Respuesta ideal del agente" value={nuevaR} onChange={(e) => setNuevaR(e.target.value)} />
            <button type="button" onClick={() => void agregarFaq()} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
              <Plus className="h-4 w-4" /> Agregar nueva pregunta / regla
            </button>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-muted-foreground">Políticas del negocio en texto libre (tarifas de domicilio por barrio, condiciones de retoma, garantías…)</label>
            <textarea className={campoCls} rows={4} value={politicas} onChange={(e) => setPoliticas(e.target.value)} />
            <button type="button" disabled={guardando} onClick={() => void guardarPoliticas()} className="inline-flex items-center gap-2 rounded-lg border border-glass-border px-4 py-2.5 text-sm hover:bg-background/60">
              <Save className="h-4 w-4" /> Guardar políticas
            </button>
          </div>
        </div>
      )}

      {!cargando && pestana === "objetivos" && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Datos que el agente debe pedir antes de cerrar o pasar el caso a una persona. Vienen activados según tu tipo de negocio.</p>
          {objetivos.map((o) => (
            <label key={o} className="flex items-start gap-3 rounded-lg border border-glass-border bg-background/40 p-3 text-sm">
              <input type="checkbox" className="mt-1 h-4 w-4" checked={activos.has(o)} onChange={(e) => void alternarObjetivo(o, e.target.checked)} />
              <span>{o}</span>
            </label>
          ))}
        </div>
      )}

      {!cargando && pestana === "probar" && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">Escríbele como lo haría un cliente. Prueba también una pregunta difícil (por ejemplo, un dato que no tengas) para ver cómo avisa a una persona del equipo.</p>
          <button type="button" onClick={() => setProbar((v) => !v)} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
            <Zap className="h-4 w-4" /> {probar ? "Ocultar prueba" : "Abrir prueba en vivo"}
          </button>
          {probar && <ProbadorAgenteVivo onCerrar={() => setProbar(false)} />}
        </div>
      )}
    </GlassPanel>
  );
}
