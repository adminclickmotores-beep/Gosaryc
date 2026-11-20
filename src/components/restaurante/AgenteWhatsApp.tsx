import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bot, Eye, EyeOff, Facebook, Globe, Instagram, Link2, MessageCircle, Plus, RefreshCw, Search, Send, Trash2, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { ResumenCierreWhatsApp } from "@/components/restaurante/Reportes";
import { useNegocio } from "@/hooks/use-negocio";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import { esCuentaDemo } from "@/lib/demo-real";
import { DemoAgenteWhatsApp } from "@/components/restaurante/DemoAgenteWhatsApp";
import { entrenarSectorAgente } from "@/lib/agente-entrenamiento.functions";

type AgenteFila = Pick<
  Tables<"agente_whatsapp">,
  | "id"
  | "negocio_id"
  | "owner_id"
  | "activo"
  | "nombre_agente"
  | "instrucciones"
  | "ia_activa"
  | "personalidad"
  | "objetivo_cierre"
  | "cierre_autonomo"
>;
type MemoriaFila = { id: string; tipo: string; contenido: string; created_at: string };
const INFO_CANAL: Record<string, { icono: typeof Bot; clase: string }> = {
  Facebook: { icono: Facebook, clase: "bg-blue-500/15 text-blue-600" },
  Instagram: { icono: Instagram, clase: "bg-purple-500/15 text-purple-600" },
  "Página Web": { icono: Globe, clase: "bg-slate-500/15 text-slate-600" },
  "WhatsApp Directo": { icono: MessageCircle, clase: "bg-green-500/15 text-green-600" },
  "Google / Otro": { icono: Search, clase: "bg-orange-500/15 text-orange-600" },
};
const ENLACES_CANAL = [
  { canal: "Instagram", texto: "Hola, vengo de Instagram" },
  { canal: "Facebook", texto: "Hola, vengo de Facebook" },
  { canal: "Página Web", texto: "Hola, vengo de la web" },
  { canal: "Google", texto: "Hola, te encontré en Google" },
];
const PERSONALIDADES =["Persuasivo Vendedor", "Amable y Cercano", "Ejecutivo Formal", "Técnico Experto"];
const OBJETIVOS_CIERRE = ["Cerrar pedido directo", "Agendar cita", "Enviar link de pago"];
const COLUMNAS_AGENTE = "id,negocio_id,owner_id,activo,nombre_agente,instrucciones,ia_activa,personalidad,objetivo_cierre,cierre_autonomo";
function leerJsonSeguro(t: string): Record<string, unknown> {
  try {
    const o = JSON.parse(t) as unknown;
    return o && typeof o === "object" ? (o as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
type Conocimiento = Tables<"whatsapp_conocimiento_negocio">;
type AvisoDB = Tables<"whatsapp_avisos">;
type LineaLocal = { id: string; nombre: string; estado: string; agente: boolean; conClave: boolean; qr: string; aviso: string };
type ReglaEditable = { palabras: string; respuesta: string; asesor: boolean };
type RespuestasEditables = { saludo: string; sinRespuesta: string; reglas: ReglaEditable[] };
type RespuestasApi = { saludo: string; sinRespuesta: string; reglas: Array<{ palabras: string[]; respuesta: string; asesor: boolean }> };
type MensajeChat = { role: string; content: string };
type ChatVivo = { jid: string; telefono: string; nombre: string; visto: string; noLeidos: number; humano: boolean; historial: MensajeChat[] };
type AvisoLocal = { id: string; linea: string; nombre: string; tipo: string; titulo: string; detalle: string; chat: string; fecha: string };
type PendAprend = { id: string; linea: string; pregunta: string; respuesta: string; fecha: string };

const API_LOCAL = "http://localhost:3001";
const ETIQUETA_ESTADO: Record<string, string> = {
  iniciando: "Iniciando…",
  esperando_qr: "Esperando que escanees el código",
  listo: "Conectado",
  desconectado: "Desconectado",
};
const ETIQUETA_AVISO: Record<string, string> = {
  nuevo_pedido: "Posible pedido o cita",
  espera_humano: "Cliente espera a una persona",
  pqrs: "PQRS radicada por el bot",
  stock_critico: "Stock crítico",
  cierre_turno: "Cierre de turno",
  otro: "Aviso",
};

/** En las cuentas demo muestra la demostración interactiva; el administrador puede pasar al puente local real. */
export function AgenteWhatsApp() {
  const { user } = useAuth();
  const [realDemo, setRealDemo] = useState(false);
  if (esCuentaDemo(user?.email) && !realDemo) {
    return <DemoAgenteWhatsApp onConectarReal={() => setRealDemo(true)} />;
  }
  return <AgenteWhatsAppReal />;
}

/** Panel de control del Agente WhatsApp IA: conexión y QR, bandeja de chats en vivo, IA por negocio y entrenamiento. */
function AgenteWhatsAppReal() {
  const { negocio } = useNegocio();
  const { user } = useAuth();
  const [agente, setAgente] = useState<AgenteFila | null>(null);
  const [nombreAgente, setNombreAgente] = useState("Asistente");
  const [instrucciones, setInstrucciones] = useState("");
  const [iaActiva, setIaActiva] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [claveLocal, setClaveLocal] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [linea, setLinea] = useState<LineaLocal | null>(null);
  const [apiCaida, setApiCaida] = useState(false);
  const [respuestas, setRespuestas] = useState<RespuestasEditables | null>(null);
  const [guardandoResp, setGuardandoResp] = useState(false);
  const [chats, setChats] = useState<ChatVivo[]>([]);
  const [chatSel, setChatSel] = useState("");
  const [textoHumano, setTextoHumano] = useState("");
  const [enviandoHumano, setEnviandoHumano] = useState(false);
  const [avisosLocal, setAvisosLocal] = useState<AvisoLocal[]>([]);
  const [avisosDB, setAvisosDB] = useState<AvisoDB[]>([]);
  const [conocimiento, setConocimiento] = useState<Conocimiento[]>([]);
  const [pendientes, setPendientes] = useState<PendAprend[]>([]);
  const [nuevaPregunta, setNuevaPregunta] = useState("");
  const [nuevaRespuesta, setNuevaRespuesta] = useState("");
  const [personalidad, setPersonalidad] = useState("Amable y Cercano");
  const [objetivoCierre, setObjetivoCierre] = useState("Cerrar pedido directo");
  const [cierreAutonomo, setCierreAutonomo] = useState(true);
  const [memoria, setMemoria] = useState<MemoriaFila[]>([]);
  const [entrenando, setEntrenando] = useState(false);
  const [leads, setLeads] = useState<Tables<"agente_leads">[]>([]);
  const [filtroCanal, setFiltroCanal] = useState("Todos");
  const [filtroTemp, setFiltroTemp] = useState("Todas");
  const [filtroEstado, setFiltroEstado] = useState("Todos");
  const [nuevaRegla, setNuevaRegla] = useState("");

  const idLinea = (negocio?.id ?? "").slice(0, 8) || "negocio";
  const tipoNegocio = ((negocio as unknown as { tipo_negocio?: string | null } | null)?.tipo_negocio ?? "").slice(0, 80);

  // La clave de acceso permanece únicamente en memoria durante esta sesión.

  const cargar = useCallback(async () => {
    if (!negocio) return;
    const { data } = await supabase
      .from("agente_whatsapp")
      .select(COLUMNAS_AGENTE)
      .eq("negocio_id", negocio.id)
      .maybeSingle();
    setAgente(data);
    if (data) {
      setNombreAgente(data.nombre_agente);
      setInstrucciones(data.instrucciones ?? "");
      setIaActiva(data.ia_activa);
      setPersonalidad(data.personalidad || "Amable y Cercano");
      setObjetivoCierre(data.objetivo_cierre || "Cerrar pedido directo");
      setCierreAutonomo(data.cierre_autonomo !== false);
    }
  }, [negocio]);

  const cargarLeads = useCallback(async () => {
    if (!negocio) return;
    const { data } = await supabase
      .from("agente_leads")
      .select("*")
      .eq("negocio_id", negocio.id)
      .order("numero_turno", { ascending: true })
      .limit(300);
    setLeads(data ?? []);
  }, [negocio]);

  useEffect(() => {
    void cargarLeads();
    const t = setInterval(() => void cargarLeads(), 30000);
    return () => clearInterval(t);
  }, [cargarLeads]);

  const marcarAtendido = async (id: string, v: boolean) => {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, atendido_por_humano: v } : l)));
    const { error } = await supabase.from("agente_leads").update({ atendido_por_humano: v }).eq("id", id);
    if (error) {
      toast.error("No se pudo actualizar el estado");
      void cargarLeads();
    }
  };

  const leadsFiltrados = leads.filter((l) => {
    if (filtroCanal !== "Todos" && l.canal_origen !== filtroCanal) return false;
    if (filtroTemp !== "Todas" && String(l.temperatura ?? "").toUpperCase() !== filtroTemp) return false;
    if (filtroEstado === "pendientes" && l.atendido_por_humano) return false;
    if (filtroEstado === "atendidos" && !l.atendido_por_humano) return false;
    return true;
  });

  const telNegocio = String((negocio as unknown as { telefono_pedidos?: string | null } | null)?.telefono_pedidos ?? "").replace(/\D/g, "");
  const numeroEnlace = telNegocio.length === 10 ? `57${telNegocio}` : telNegocio;

  const cargarMemoria = useCallback(async () => {
    if (!negocio) return;
    const { data } = await supabase
      .from("agente_memoria")
      .select("id,tipo,contenido,created_at")
      .eq("negocio_id", negocio.id)
      .in("tipo", ["sector", "regla_dueno", "lead", "pqrs"])
      .order("created_at", { ascending: false })
      .limit(120);
    setMemoria((data ?? []) as MemoriaFila[]);
  }, [negocio]);

  useEffect(() => {
    void cargarMemoria();
  }, [cargarMemoria]);

  const entrenar = async (silencioso = false) => {
    if (!negocio) return;
    setEntrenando(true);
    try {
      await entrenarSectorAgente({ data: { negocioId: negocio.id, tipoNegocio, ciudad: (negocio as unknown as { ciudad?: string | null }).ciudad ?? "" } });
      await cargarMemoria();
      if (!silencioso) toast.success("Inteligencia del sector actualizada");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar la inteligencia del sector");
    } finally {
      setEntrenando(false);
    }
  };

  const agregarRegla = async () => {
    const t = nuevaRegla.trim().slice(0, 400);
    if (!negocio || !user || t.length < 5) return;
    const { error } = await supabase.from("agente_memoria").insert({ negocio_id: negocio.id, owner_id: user.id, tipo: "regla_dueno", contenido: t });
    if (error) {
      toast.error("No se pudo guardar la regla");
      return;
    }
    setNuevaRegla("");
    void cargarMemoria();
  };

  const quitarMemoria = async (id: string) => {
    await supabase.from("agente_memoria").delete().eq("id", id);
    void cargarMemoria();
  };

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const cargarConocimiento = useCallback(async () => {
    if (!negocio) return;
    const [c, a] = await Promise.all([
      supabase.from("whatsapp_conocimiento_negocio").select("*").eq("negocio_id", negocio.id).order("frecuencia", { ascending: false }).limit(100),
      supabase.from("whatsapp_avisos").select("*").eq("negocio_id", negocio.id).order("created_at", { ascending: false }).limit(30),
    ]);
    setConocimiento(c.data ?? []);
    setAvisosDB(a.data ?? []);
  }, [negocio]);

  useEffect(() => {
    void cargarConocimiento();
  }, [cargarConocimiento]);

  const consultarLinea = useCallback(async () => {
    if (!claveLocal.trim()) return;
    try {
      const r = await fetch(`${API_LOCAL}/lineas`, { headers: { Authorization: `Bearer ${claveLocal.trim()}` } });
      if (!r.ok) {
        setApiCaida(r.status !== 401);
        return;
      }
      const j = (await r.json()) as { lineas: LineaLocal[] };
      setApiCaida(false);
      setLinea(j.lineas.find((l) => l.id === idLinea) ?? null);
    } catch {
      setApiCaida(true);
    }
  }, [claveLocal, idLinea]);

  const consultarVivo = useCallback(async () => {
    if (!claveLocal.trim()) return;
    try {
      const auth = { Authorization: `Bearer ${claveLocal.trim()}` };
      const [rc, ra, rp] = await Promise.all([
        fetch(`${API_LOCAL}/chats?linea=${encodeURIComponent(idLinea)}`, { headers: auth }),
        fetch(`${API_LOCAL}/avisos?linea=${encodeURIComponent(idLinea)}`, { headers: auth }),
        fetch(`${API_LOCAL}/aprendizaje?linea=${encodeURIComponent(idLinea)}`, { headers: auth }),
      ]);
      if (rc.ok) setChats(((await rc.json()) as { chats: ChatVivo[] }).chats ?? []);
      if (ra.ok) setAvisosLocal(((await ra.json()) as { avisos: AvisoLocal[] }).avisos ?? []);
      if (rp.ok) setPendientes(((await rp.json()) as { pendientes: PendAprend[] }).pendientes ?? []);
    } catch {
      /* la API local no está abierta */
    }
  }, [claveLocal, idLinea]);

  useEffect(() => {
    void consultarLinea();
    const t = setInterval(() => void consultarLinea(), 5000);
    return () => clearInterval(t);
  }, [consultarLinea]);

  const existeLinea = !!linea;
  const avisosVistos = useRef(0);
  // Alerta sonora y aviso del sistema cuando llega un pedido, una cita o un cliente que espera humano.
  useEffect(() => {
    const total = avisosLocal.length;
    if (total <= avisosVistos.current) {
      avisosVistos.current = total;
      return;
    }
    avisosVistos.current = total;
    const ultimo = avisosLocal[avisosLocal.length - 1];
    try {
      const Ventana = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const Ctx = Ventana.AudioContext ?? Ventana.webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        [523, 659, 784].forEach((f, i) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.frequency.value = f;
          const t = ctx.currentTime + i * 0.15;
          g.gain.setValueAtTime(0.001, t);
          g.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
          o.start(t);
          o.stop(t + 0.15);
        });
        setTimeout(() => void ctx.close(), 800);
      }
    } catch {
      /* sin sonido en este equipo */
    }
    try {
      if ("Notification" in window) {
        if (Notification.permission === "granted" && ultimo) {
          new Notification(ultimo.titulo || "Aviso del agente", { body: String(ultimo.detalle || "").slice(0, 150) });
        } else if (Notification.permission === "default") {
          void Notification.requestPermission();
        }
      }
    } catch {
      /* sin notificaciones en este equipo */
    }
  }, [avisosLocal]);
  useEffect(() => {
    if (!existeLinea) return;
    void consultarVivo();
    const t = setInterval(() => void consultarVivo(), 8000);
    return () => clearInterval(t);
  }, [existeLinea, consultarVivo]);

  const existeLineaResp = existeLinea;
  const cargarRespuestas = useCallback(async () => {
    if (!claveLocal.trim()) return;
    try {
      const r = await fetch(`${API_LOCAL}/respuestas?linea=${encodeURIComponent(idLinea)}`, {
        headers: { Authorization: `Bearer ${claveLocal.trim()}` },
      });
      if (!r.ok) return;
      const j = (await r.json()) as { respuestas: RespuestasApi };
      setRespuestas({
        saludo: j.respuestas.saludo,
        sinRespuesta: j.respuestas.sinRespuesta,
        reglas: j.respuestas.reglas.map((x) => ({ palabras: x.palabras.join(", "), respuesta: x.respuesta, asesor: x.asesor })),
      });
    } catch {
      /* la API local no está abierta */
    }
  }, [claveLocal, idLinea]);

  useEffect(() => {
    if (existeLineaResp) void cargarRespuestas();
  }, [existeLineaResp, cargarRespuestas]);

  const guardarRespuestas = async () => {
    if (!respuestas) return;
    setGuardandoResp(true);
    try {
      const cuerpo: RespuestasApi = {
        saludo: respuestas.saludo,
        sinRespuesta: respuestas.sinRespuesta,
        reglas: respuestas.reglas.map((x) => ({
          palabras: x.palabras.split(",").map((p) => p.trim()).filter(Boolean),
          respuesta: x.respuesta,
          asesor: x.asesor,
        })),
      };
      const r = await fetch(`${API_LOCAL}/respuestas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${claveLocal.trim()}` },
        body: JSON.stringify({ linea: idLinea, respuestas: cuerpo }),
      });
      if (!r.ok) throw new Error("Error");
      toast.success("Respuestas guardadas en este computador");
      void cargarRespuestas();
    } catch {
      toast.error("No se pudieron guardar. Abre la API local en este computador.");
    } finally {
      setGuardandoResp(false);
    }
  };

  const cambiarRegla = (i: number, cambios: Partial<ReglaEditable>) =>
    setRespuestas((r) => (r ? { ...r, reglas: r.reglas.map((x, j) => (j === i ? { ...x, ...cambios } : x)) } : r));

  const guardar = async (cambios: Partial<Pick<AgenteFila, "activo" | "nombre_agente" | "instrucciones" | "ia_activa" | "personalidad" | "objetivo_cierre" | "cierre_autonomo">>) => {
    if (!negocio || !user) return;
    setGuardando(true);
  const columnasAgente = COLUMNAS_AGENTE;
  const eraNuevo = !agente;

  const { data, error } = agente
    ? await supabase
        .from("agente_whatsapp")
        .update(cambios)
        .eq("id", agente.id)
        .select(columnasAgente)
        .maybeSingle()
    : await supabase
        .from("agente_whatsapp")
        .insert({ negocio_id: negocio.id, owner_id: user.id, ...cambios })
        .select(columnasAgente)
        .maybeSingle();
    setGuardando(false);
    if (error) {
      toast.error("No se pudo guardar el agente");
      return;
    }
    setAgente(data);
    // El servicio local habla como el especialista de este tipo de negocio: se le envían el tipo de negocio y las instrucciones.
    if (claveLocal.trim()) {
      try {
        await fetch(`${API_LOCAL}/lineas`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${claveLocal.trim()}` },
          body: JSON.stringify({
            id: idLinea,
            perfil: tipoNegocio,
            instrucciones: typeof cambios.instrucciones === "string" ? cambios.instrucciones : instrucciones,
          }),
        });
      } catch {
        /* se aplica al reconectar */
      }
    }
    toast.success("Agente guardado");
    // Primera activación: descarga sola el conocimiento del sector.
    if (eraNuevo) void entrenar(true);
  };

  const cambiarIA = async (v: boolean) => {
    setIaActiva(v);
    if (claveLocal.trim() && existeLinea) {
      try {
        await fetch(`${API_LOCAL}/lineas`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${claveLocal.trim()}` },
          body: JSON.stringify({ id: idLinea, agente: v }),
        });
      } catch {
        /* se aplica al reconectar */
      }
    }
    await guardar({ ia_activa: v });
  };

  const conectar = async () => {
    if (!claveLocal.trim()) {
      toast.error("Pega la clave de acceso de la API local");
      return;
    }
  try {
    const r = await fetch(`${API_LOCAL}/lineas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${claveLocal.trim()}`
      },
      body: JSON.stringify({
        id: idLinea,
        nombre: negocio?.nombre ?? idLinea,
        agente: iaActiva && (agente?.activo ?? true),
        perfil: tipoNegocio,
        instrucciones
      }),
    });
      if (!r.ok) throw new Error(r.status === 401 ? "Clave incorrecta" : "Error");
      toast.success("Número agregado. Escanea el código con el WhatsApp de este negocio.");
      void consultarLinea();
    } catch (e) {
      toast.error(e instanceof Error && e.message === "Clave incorrecta" ? "La clave de la API local no es correcta" : "No se pudo conectar. Abre la API local en este computador.");
    }
  };

  const revincular = async () => {
    if (!claveLocal.trim()) {
      toast.error("Pega la clave de acceso de la API local");
      return;
    }
    try {
      const r = await fetch(`${API_LOCAL}/lineas/revincular`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${claveLocal.trim()}` },
        body: JSON.stringify({ id: idLinea }),
      });
      if (!r.ok) throw new Error("Error");
      toast.success("Se generó un código nuevo. Escanéalo; tu configuración y lo aprendido se conservan.");
      void consultarLinea();
    } catch {
      toast.error("No se pudo generar el código. Revisa que la API local esté abierta.");
    }
  };

  const chatActual = chats.find((c) => c.jid === chatSel) ?? null;

  const verChat = async (jid: string) => {
    setChatSel(jid);
    try {
      await fetch(`${API_LOCAL}/chats?linea=${encodeURIComponent(idLinea)}&ver=${encodeURIComponent(jid)}`, {
        headers: { Authorization: `Bearer ${claveLocal.trim()}` },
      });
    } catch {
      /* solo marca lectura local */
    }
  };

  const responderHumano = async () => {
    if (!chatActual || !textoHumano.trim()) return;
    setEnviandoHumano(true);
    try {
      const r = await fetch(`${API_LOCAL}/chats/responder`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${claveLocal.trim()}` },
        body: JSON.stringify({ linea: idLinea, chat: chatActual.jid, mensaje: textoHumano.trim() }),
      });
      if (!r.ok) throw new Error("Error");
      setTextoHumano("");
      toast.success("Mensaje enviado. La IA queda en pausa en este chat.");
      void consultarVivo();
    } catch {
      toast.error("No se pudo enviar. Revisa que WhatsApp esté conectado.");
    } finally {
      setEnviandoHumano(false);
    }
  };

  const alternarHumano = async (c: ChatVivo) => {
    try {
      await fetch(`${API_LOCAL}/chats/modo-humano`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${claveLocal.trim()}` },
        body: JSON.stringify({ linea: idLinea, chat: c.jid, humano: !c.humano }),
      });
      void consultarVivo();
    } catch {
      toast.error("No se pudo cambiar el modo del chat.");
    }
  };

  const llevarAlPanel = async (a: AvisoLocal) => {
    if (!negocio || !user) return;
    const { error } = await supabase.from("whatsapp_avisos").insert({
      negocio_id: negocio.id,
      owner_id: user.id,
      tipo: a.tipo,
      titulo: a.titulo,
      detalle: a.detalle,
      chat_id: a.chat,
    });
    if (error) {
      toast.error("No se pudo guardar el aviso");
      return;
    }
    try {
      await fetch(`${API_LOCAL}/avisos/leido`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${claveLocal.trim()}` },
        body: JSON.stringify({ id: a.id }),
      });
    } catch {
      /* ya quedó en el panel */
    }
    toast.success("Aviso guardado en el panel");
    void consultarVivo();
    void cargarConocimiento();
  };

  const marcarAvisoDB = async (a: AvisoDB, leido: boolean) => {
    await supabase.from("whatsapp_avisos").update({ leido }).eq("id", a.id);
    void cargarConocimiento();
  };

  const borrarAvisoDB = async (a: AvisoDB) => {
    await supabase.from("whatsapp_avisos").delete().eq("id", a.id);
    void cargarConocimiento();
  };

  const guardarConocimiento = async () => {
    if (!negocio || !user || nuevaPregunta.trim().length < 3 || nuevaRespuesta.trim().length < 3) {
      toast.error("Escribe la pregunta y la respuesta que debe aprender.");
      return;
    }
    const { error } = await supabase.from("whatsapp_conocimiento_negocio").insert({
      negocio_id: negocio.id,
      owner_id: user.id,
      pregunta_patron: nuevaPregunta.trim().slice(0, 300),
      respuesta_aprendida: nuevaRespuesta.trim().slice(0, 1000),
    });
    if (error) {
      toast.error("No se pudo guardar");
      return;
    }
    setNuevaPregunta("");
    setNuevaRespuesta("");
    toast.success("El agente ya aprendió esa respuesta");
    void cargarConocimiento();
  };

  const borrarConocimiento = async (id: string) => {
    await supabase.from("whatsapp_conocimiento_negocio").delete().eq("id", id);
    void cargarConocimiento();
  };

  const aprobarPendiente = async (p: PendAprend) => {
    if (!negocio || !user) return;
    const { error } = await supabase.from("whatsapp_conocimiento_negocio").insert({
      negocio_id: negocio.id,
      owner_id: user.id,
      pregunta_patron: p.pregunta.slice(0, 300),
      respuesta_aprendida: p.respuesta.slice(0, 1000),
    });
    if (error) {
      toast.error("No se pudo aprobar");
      return;
    }
    try {
      await fetch(`${API_LOCAL}/aprendizaje/quitar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${claveLocal.trim()}` },
        body: JSON.stringify({ id: p.id }),
      });
    } catch {
      /* ya quedó guardado */
    }
    toast.success("Respuesta aprobada: el agente la usará");
    void consultarVivo();
    void cargarConocimiento();
  };

  const descartarPendiente = async (p: PendAprend) => {
    try {
      await fetch(`${API_LOCAL}/aprendizaje/quitar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${claveLocal.trim()}` },
        body: JSON.stringify({ id: p.id }),
      });
    } catch {
      /* sin API local */
    }
    void consultarVivo();
  };

  if (!negocio) return null;

  return (
    <>
    <GlassPanel className="space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span className="icon-chip h-10 w-10 shrink-0 rounded-xl"><Bot className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h3 className="font-display text-lg">Agente WhatsApp IA</h3>
          <p className="text-sm text-muted-foreground">
            Atiende y vende por WhatsApp con los datos reales de tu negocio. Si un cliente se molesta o pide una persona, la IA se pausa sola en ese chat y te avisa aquí.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-glass-border bg-background/40 px-3 py-2.5">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" checked={agente?.activo ?? true} onChange={(e) => void guardar({ activo: e.target.checked })} disabled={guardando || !agente} />
          Agente activo en este negocio
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4" checked={iaActiva} onChange={(e) => void cambiarIA(e.target.checked)} disabled={guardando} />
          IA comercial y de servicio activada
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-muted-foreground">Nombre del agente</span>
        <input
          className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
          value={nombreAgente}
          maxLength={40}
          onChange={(e) => setNombreAgente(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted-foreground">Cómo debe atender (tono, reglas de tu negocio, qué nunca prometer)</span>
        <textarea
          className="min-h-20 w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
          value={instrucciones}
          maxLength={1000}
          placeholder="Ej: Saluda con alegría, siempre confirma el barrio antes de prometer un domicilio, nunca inventes precios."
          onChange={(e) => setInstrucciones(e.target.value)}
        />
      </label>
      <button
        disabled={guardando}
        onClick={() =>
          void guardar({
            nombre_agente: nombreAgente.trim() || "Asistente",
            instrucciones: instrucciones.trim() || null,
            personalidad,
            objetivo_cierre: objetivoCierre,
            cierre_autonomo: cierreAutonomo,
          })
        }
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {guardando ? "Guardando…" : agente ? "Guardar agente" : "Crear agente"}
      </button>

      <div className="space-y-3 border-t border-glass-border/60 pt-4">
        <h4 className="text-sm font-medium">Personalidad y Entrenamiento</h4>
        <p className="text-xs text-muted-foreground">
          Define cómo se llama y habla tu asistente, si cierra ventas solo, y revisa el conocimiento de tu sector. Pulsa «Guardar agente» para aplicar los cambios.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Nombre del asistente (ej. Laura - Asesora Comercial)</span>
            <input className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base" value={nombreAgente} maxLength={40} onChange={(e) => setNombreAgente(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Tono / personalidad</span>
            <select className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base" value={personalidad} onChange={(e) => setPersonalidad(e.target.value)}>
              {PERSONALIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Objetivo de cierre</span>
            <select className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base" value={objetivoCierre} onChange={(e) => setObjetivoCierre(e.target.value)}>
              {OBJETIVOS_CIERRE.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <label className="flex cursor-pointer items-center gap-2 self-end rounded-lg border border-glass-border bg-background/40 px-3 py-2.5 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={cierreAutonomo} onChange={(e) => setCierreAutonomo(e.target.checked)} />
            Cierre autónomo de ventas
          </label>
        </div>

        <button
          disabled={entrenando || !agente}
          onClick={() => void entrenar()}
          className="inline-flex items-center gap-2 rounded-lg border border-glass-border bg-background/60 px-4 py-2 text-sm font-medium hover:bg-background/80 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${entrenando ? "animate-spin" : ""}`} />
          {entrenando ? "Descargando conocimiento…" : "Actualizar Inteligencia del Sector"}
        </button>
        {!agente && <p className="text-xs text-muted-foreground">Crea el agente primero; el conocimiento del sector se descarga solo la primera vez.</p>}

        {memoria.filter((m) => m.tipo === "sector").map((m) => (
          <details key={m.id} className="rounded-lg border border-glass-border/60 bg-background/40 px-3 py-2 text-sm">
            <summary className="cursor-pointer font-medium">{m.contenido.split(":")[0]}</summary>
            <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{m.contenido.slice(m.contenido.indexOf(":") + 1).trim()}</p>
            <button onClick={() => void quitarMemoria(m.id)} className="mt-2 inline-flex items-center gap-1 text-xs text-destructive"><Trash2 className="h-3 w-3" /> Quitar</button>
          </details>
        ))}

        <div className="space-y-2">
          <span className="block text-sm text-muted-foreground">Reglas propias del negocio</span>
          {memoria.filter((m) => m.tipo === "regla_dueno").map((m) => (
            <div key={m.id} className="flex items-start justify-between gap-2 rounded-lg border border-glass-border/60 bg-background/40 px-3 py-2 text-sm">
              <span className="min-w-0 break-words">{m.contenido}</span>
              <button onClick={() => void quitarMemoria(m.id)} aria-label="Quitar regla" className="shrink-0 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
          <div className="flex gap-2">
            <input className="min-w-0 flex-1 rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base" placeholder="Ej: Nunca ofrezcas descuentos mayores al 5 %" maxLength={400} value={nuevaRegla} onChange={(e) => setNuevaRegla(e.target.value)} />
            <button onClick={() => void agregarRegla()} disabled={nuevaRegla.trim().length < 5 || !agente} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-60"><Plus className="h-4 w-4" /> Agregar</button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <span className="block text-sm font-medium">Leads por orden de llegada (primero en entrar, primero en atender)</span>
            <div className="flex flex-wrap gap-2 text-xs">
              <select aria-label="Canal" className="rounded-lg border border-glass-border bg-background/60 px-2 py-1.5 text-base" value={filtroCanal} onChange={(e) => setFiltroCanal(e.target.value)}>
                {["Todos", "Facebook", "Instagram", "Página Web", "WhatsApp Directo", "Google / Otro"].map((c) => <option key={c} value={c}>{c === "Todos" ? "Canal: Todos" : c}</option>)}
              </select>
              <select aria-label="Temperatura" className="rounded-lg border border-glass-border bg-background/60 px-2 py-1.5 text-base" value={filtroTemp} onChange={(e) => setFiltroTemp(e.target.value)}>
                <option value="Todas">Temperatura: Todas</option>
                <option value="CALIENTE">Calientes</option>
                <option value="TIBIO">Tibios</option>
                <option value="FRIO">Fríos</option>
              </select>
              <select aria-label="Estado" className="rounded-lg border border-glass-border bg-background/60 px-2 py-1.5 text-base" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                <option value="Todos">Estado: Todos</option>
                <option value="pendientes">Pendientes por atender</option>
                <option value="atendidos">Atendidos</option>
              </select>
            </div>
            {leadsFiltrados.length === 0 && <p className="text-xs text-muted-foreground">Aún no hay leads con esos filtros.</p>}
            {leadsFiltrados.slice(0, 50).map((l) => {
              const temp = String(l.temperatura ?? "").toUpperCase();
              const color = temp === "CALIENTE" ? "bg-red-500/15 text-red-600" : temp === "TIBIO" ? "bg-amber-500/15 text-amber-600" : "bg-sky-500/15 text-sky-600";
              const info = INFO_CANAL[l.canal_origen] ?? INFO_CANAL["Google / Otro"];
              const Icono = info.icono;
              return (
                <div key={l.id} className="rounded-lg border border-glass-border/60 bg-background/40 px-3 py-2 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">#{l.numero_turno} · {new Date(l.fecha_llegada).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${info.clase}`}><Icono className="h-3 w-3" />{l.canal_origen}</span>
                    <span className={`rounded-full px-2 py-0.5 font-medium ${color}`}>{temp === "CALIENTE" ? "Caliente" : temp === "TIBIO" ? "Tibio" : temp === "FRIO" ? "Frío" : "Sin calificar"}{l.puntaje != null ? ` · ${l.puntaje}` : ""}</span>
                  </div>
                  <p className="mt-1 break-words text-muted-foreground">{l.telefono}{l.interes ? ` · ${l.interes}` : ""}{l.datos_confirmados ? ` · ${l.datos_confirmados}` : ""}</p>
                  <label className="mt-1 flex cursor-pointer items-center gap-2">
                    <input type="checkbox" className="h-4 w-4" checked={l.atendido_por_humano} onChange={(e) => void marcarAtendido(l.id, e.target.checked)} />
                    Atendido por una persona
                  </label>
                </div>
              );
            })}
          </div>
          <div className="space-y-2 sm:col-span-2 rounded-lg border border-glass-border/60 bg-background/40 p-3">
            <span className="block text-sm font-medium">Enlaces de rastreo para WhatsApp</span>
            <p className="text-xs text-muted-foreground">Copia el enlace de cada canal y pégalo en tu biografía de Instagram, botón de Facebook o página web. El agente reconoce de dónde llega cada cliente.</p>
            {numeroEnlace.length < 10 ? (
              <p className="text-xs text-muted-foreground">Configura el teléfono de pedidos de tu negocio para generar los enlaces.</p>
            ) : (
              ENLACES_CANAL.map((e) => {
                const url = `https://wa.me/${numeroEnlace}?text=${encodeURIComponent(e.texto)}`;
                return (
                  <div key={e.canal} className="flex items-center gap-2">
                    <span className="w-24 shrink-0 text-xs font-medium">{e.canal}</span>
                    <input readOnly className="min-w-0 flex-1 rounded-lg border border-glass-border bg-background/60 px-2 py-1.5 text-base" value={url} />
                    <button onClick={() => { void navigator.clipboard.writeText(url); toast.success(`Enlace de ${e.canal} copiado`); }} className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs text-primary-foreground">Copiar</button>
                  </div>
                );
              })
            )}
          </div>
          <div className="space-y-2">
            <span className="block text-sm font-medium">PQRS radicadas por el bot</span>
            {memoria.filter((m) => m.tipo === "pqrs").length === 0 && <p className="text-xs text-muted-foreground">Aún no hay PQRS radicadas.</p>}
            {memoria.filter((m) => m.tipo === "pqrs").slice(0, 12).map((m) => {
              const d = leerJsonSeguro(m.contenido);
              return (
                <div key={m.id} className="rounded-lg border border-glass-border/60 bg-background/40 px-3 py-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 font-medium">{String(d.tipo ?? "PQRS")} · {String(d.urgencia ?? "")}</span>
                    <span className="text-muted-foreground">{String(d.telefono ?? "")}</span>
                  </div>
                  <p className="mt-1 break-words">{String(d.resumen ?? "")}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-glass-border/60 pt-4">
        <h4 className="text-sm font-medium">Conectar el número de este negocio</h4>
        <p className="text-xs text-muted-foreground">
          Abre la API local en este computador (iniciar-whatsapp), pega su clave de acceso y escanea el código con el WhatsApp de este negocio. Funciona con WhatsApp normal y WhatsApp Business.
        </p>
        <div className="flex gap-2">
          <input
            type={verClave ? "text" : "password"}
            className="min-w-0 flex-1 rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
            placeholder="Clave de acceso de la API local"
            value={claveLocal}
            onChange={(e) => setClaveLocal(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setVerClave((v) => !v)}
            aria-label={verClave ? "Ocultar clave" : "Mostrar clave"}
            className="rounded-lg border border-glass-border px-3"
          >
            {verClave ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => void conectar()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            <Link2 className="h-4 w-4" /> Conectar este número
          </button>
          <button
            onClick={() => void consultarLinea()}
            className="inline-flex items-center gap-2 rounded-lg border border-glass-border px-4 py-2.5 text-sm"
          >
            <RefreshCw className="h-4 w-4" /> Actualizar estado
          </button>
          {existeLinea && (
            <button
              onClick={() => void revincular()}
              className="inline-flex items-center gap-2 rounded-lg border border-glass-border px-4 py-2.5 text-sm"
              title="Genera un código QR nuevo sin borrar tu configuración ni lo aprendido"
            >
              <RefreshCw className="h-4 w-4" /> Cambiar número / Vincular nuevo QR
            </button>
          )}
        </div>

        {apiCaida && <p className="text-sm text-muted-foreground">No encuentro la API local. Ábrela con iniciar-whatsapp en este computador.</p>}
        {linea && (
          <div className="space-y-2">
            <p className="text-sm">
              Estado: <span className="font-medium">{ETIQUETA_ESTADO[linea.estado] ?? linea.estado}</span>
            </p>
            {linea.aviso && <p className="text-sm text-destructive">{linea.aviso}</p>}
            {linea.qr && (
              <img src={linea.qr} alt="Código QR para vincular WhatsApp" className="h-auto max-w-full rounded-lg bg-white p-2" width={280} height={280} />
            )}
          </div>
        )}
      </div>

      {existeLinea && (
        <div className="space-y-3 border-t border-glass-border/60 pt-4">
          <h4 className="text-sm font-medium">Chats en vivo</h4>
          <p className="text-xs text-muted-foreground">
            Mira las conversaciones y responde tú cuando quieras: al hacerlo, la IA se pausa en ese chat. Si el cliente se molesta o pide una persona, el chat queda marcado para ti.
          </p>
          {chats.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay conversaciones en este computador.</p>}
          <div className="grid gap-3 lg:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
            <ul className="max-h-72 space-y-1 overflow-y-auto">
              {chats.map((c) => (
                <li key={c.jid}>
                  <button
                    type="button"
                    onClick={() => void verChat(c.jid)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${chatSel === c.jid ? "border-primary/60 bg-primary/10" : "border-glass-border"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate font-medium">{c.nombre || c.telefono}</span>
                      {c.noLeidos > 0 && <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{c.noLeidos}</span>}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{c.visto || c.telefono}</span>
                    {c.humano && <span className="text-xs text-amber-500">Atendido por humano</span>}
                  </button>
                </li>
              ))}
            </ul>
            <div className="space-y-2">
              {!chatActual && <p className="text-sm text-muted-foreground">Elige un chat para verlo y responder.</p>}
              {chatActual && (
                <>
                  <div className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-glass-border p-3">
                    {chatActual.historial.map((m, i) => (
                      <p key={i} className={`max-w-[90%] break-words rounded-xl px-3 py-2 text-sm ${m.role === "user" ? "bg-glass-strong" : "ml-auto bg-primary/15"}`}>
                        {m.content}
                      </p>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="min-w-0 flex-1 rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
                      placeholder="Responder como humano…"
                      value={textoHumano}
                      onChange={(e) => setTextoHumano(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void responderHumano(); }}
                    />
                    <button
                      type="button"
                      onClick={() => void responderHumano()}
                      disabled={enviandoHumano || !textoHumano.trim()}
                      aria-label="Enviar como humano"
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => void alternarHumano(chatActual)}
                    className="inline-flex items-center gap-2 text-xs text-muted-foreground underline"
                  >
                    <UserCheck className="h-3.5 w-3.5" />
                    {chatActual.humano ? "Reactivar la IA en este chat" : "Pausar la IA en este chat (lo atiendo yo)"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {(avisosLocal.length > 0 || avisosDB.length > 0) && (
        <div className="space-y-3 border-t border-glass-border/60 pt-4">
          <h4 className="text-sm font-medium">Avisos del agente</h4>
          {avisosLocal.length > 0 && (
            <ul className="space-y-2">
              {avisosLocal.map((a) => (
                <li key={a.id} className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-sm">
                  <p className="font-medium">{ETIQUETA_AVISO[a.tipo] ?? a.titulo} · {a.chat}</p>
                  <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{a.detalle}</p>
                  <button type="button" onClick={() => void llevarAlPanel(a)} className="mt-2 text-xs text-primary hover:underline">
                    Llevar al panel (queda guardado aunque apagues el computador)
                  </button>
                </li>
              ))}
            </ul>
          )}
          {avisosDB.filter((a) => !a.leido).map((a) => (
            <div key={a.id} className="rounded-lg border border-glass-border p-3 text-sm">
              <p className="font-medium">{ETIQUETA_AVISO[a.tipo] ?? a.titulo}{a.chat_id ? ` · ${a.chat_id}` : ""}</p>
              {a.detalle && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{a.detalle}</p>}
              <div className="mt-2 flex gap-3 text-xs">
                <button type="button" onClick={() => void marcarAvisoDB(a, true)} className="text-primary hover:underline">Marcar atendido</button>
                <button type="button" onClick={() => void borrarAvisoDB(a)} className="text-muted-foreground hover:underline">Borrar</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {respuestas && (
        <div className="space-y-3 border-t border-glass-border/60 pt-4">
          <h4 className="text-sm font-medium">Respuestas del agente</h4>
          <p className="text-xs text-muted-foreground">
            Cuando el mensaje del cliente contiene alguna de las palabras de una regla, el agente envía esa respuesta. Usa {"{negocio}"} para poner el nombre de tu negocio. Si marcas «Pasa a una persona», el agente se pausa 6 horas en ese chat para que lo atiendas tú. Si contestas desde tu celular, el agente también se pausa.
          </p>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Saludo (primer mensaje de un cliente)</span>
            <textarea
              className="min-h-16 w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
              value={respuestas.saludo}
              maxLength={600}
              onChange={(e) => setRespuestas({ ...respuestas, saludo: e.target.value })}
            />
          </label>
          <ul className="space-y-3">
            {respuestas.reglas.map((r, i) => (
              <li key={i} className="space-y-2 rounded-lg bg-background/50 p-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-muted-foreground">Si el cliente escribe (palabras separadas por coma)</span>
                  <input
                    className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
                    value={r.palabras}
                    onChange={(e) => cambiarRegla(i, { palabras: e.target.value })}
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block text-muted-foreground">El agente responde</span>
                  <textarea
                    className="min-h-20 w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
                    value={r.respuesta}
                    maxLength={1000}
                    onChange={(e) => cambiarRegla(i, { respuesta: e.target.value })}
                  />
                </label>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="h-4 w-4" checked={r.asesor} onChange={(e) => cambiarRegla(i, { asesor: e.target.checked })} />
                    Pasa a una persona
                  </label>
                  <button
                    type="button"
                    onClick={() => setRespuestas({ ...respuestas, reglas: respuestas.reglas.filter((_, j) => j !== i) })}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setRespuestas({ ...respuestas, reglas: [...respuestas.reglas, { palabras: "", respuesta: "", asesor: false }] })}
            className="inline-flex items-center gap-2 rounded-lg border border-glass-border px-4 py-2.5 text-sm"
          >
            <Plus className="h-4 w-4" /> Agregar respuesta
          </button>
          <label className="block text-sm">
            <span className="mb-1 block text-muted-foreground">Si no entiende el mensaje, responde</span>
            <textarea
              className="min-h-16 w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
              value={respuestas.sinRespuesta}
              maxLength={600}
              onChange={(e) => setRespuestas({ ...respuestas, sinRespuesta: e.target.value })}
            />
          </label>
          <div>
            <button
              disabled={guardandoResp}
              onClick={() => void guardarRespuestas()}
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {guardandoResp ? "Guardando…" : "Guardar respuestas"}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3 border-t border-glass-border/60 pt-4">
        <h4 className="text-sm font-medium">Lo que el agente aprendió de tu negocio</h4>
        <p className="text-xs text-muted-foreground">
          Cuando respondes a un cliente con tus propias palabras, el agente lo anota aquí para aprenderlo. Aprueba lo que sí debe decir siempre. También puedes enseñarle cosas nuevas escribiéndolas abajo.
        </p>
        {pendientes.length > 0 && (
          <ul className="space-y-2">
            {pendientes.map((p) => (
              <li key={p.id} className="rounded-lg border border-sky-500/40 bg-sky-500/5 p-3 text-sm">
                <p className="text-xs text-muted-foreground">Si preguntan: «{p.pregunta}»</p>
                <p className="mt-1">Responder: «{p.respuesta}»</p>
                <div className="mt-2 flex gap-3 text-xs">
                  <button type="button" onClick={() => void aprobarPendiente(p)} className="text-primary hover:underline">Aprobar y enseñar</button>
                  <button type="button" onClick={() => void descartarPendiente(p)} className="text-muted-foreground hover:underline">Descartar</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="grid gap-2 md:grid-cols-2">
          <input
            className="rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
            placeholder="Si el cliente pregunta… (ej: ¿hacen domicilios a El Caney?)"
            value={nuevaPregunta}
            onChange={(e) => setNuevaPregunta(e.target.value)}
          />
          <input
            className="rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
            placeholder="El agente debe responder… (ej: Sí, con $5.000 de envío)"
            value={nuevaRespuesta}
            onChange={(e) => setNuevaRespuesta(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={() => void guardarConocimiento()}
          className="inline-flex items-center gap-2 rounded-lg border border-glass-border px-4 py-2.5 text-sm"
        >
          <Plus className="h-4 w-4" /> Enseñar al agente
        </button>
        {conocimiento.length > 0 && (
          <ul className="space-y-1">
            {conocimiento.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-2 rounded-lg border border-glass-border px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">«{c.pregunta_patron}» → «{c.respuesta_aprendida}»</span>
                </span>
                <button type="button" onClick={() => void borrarConocimiento(c.id)} aria-label="Olvidar" className="shrink-0 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </GlassPanel>
    <div className="mt-4">
      <ResumenCierreWhatsApp />
    </div>
    </>
  );
}
