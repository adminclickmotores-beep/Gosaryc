import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bot, Eye, EyeOff, Link2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type AgenteFila = Tables<"agente_whatsapp">;
type LineaLocal = { id: string; nombre: string; estado: string; agente: boolean; conClave: boolean; qr: string; aviso: string };
type ReglaEditable = { palabras: string; respuesta: string; asesor: boolean };
type RespuestasEditables = { saludo: string; sinRespuesta: string; reglas: ReglaEditable[] };
type RespuestasApi = { saludo: string; sinRespuesta: string; reglas: Array<{ palabras: string[]; respuesta: string; asesor: boolean }> };

const API_LOCAL = "http://localhost:3001";
const ETIQUETA_ESTADO: Record<string, string> = {
  iniciando: "Iniciando…",
  esperando_qr: "Esperando que escanees el código",
  listo: "Conectado",
  desconectado: "Desconectado",
};

/** Configura el agente de atención por WhatsApp del negocio (respuestas propias, sin IA) y conecta su número en la API local. */
export function AgenteWhatsApp() {
  const { negocio } = useNegocio();
  const { user } = useAuth();
  const [agente, setAgente] = useState<AgenteFila | null>(null);
  const [nombreAgente, setNombreAgente] = useState("Asistente");
  const [guardando, setGuardando] = useState(false);
  const [claveLocal, setClaveLocal] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [linea, setLinea] = useState<LineaLocal | null>(null);
  const [apiCaida, setApiCaida] = useState(false);
  const [respuestas, setRespuestas] = useState<RespuestasEditables | null>(null);
  const [guardandoResp, setGuardandoResp] = useState(false);

  const idLinea = (negocio?.id ?? "").slice(0, 8) || "negocio";

  useEffect(() => {
    setClaveLocal(localStorage.getItem("whatsapp_local_token") ?? "");
  }, []);

  const cargar = useCallback(async () => {
    if (!negocio) return;
    const { data } = await supabase.from("agente_whatsapp").select("*").eq("negocio_id", negocio.id).maybeSingle();
    setAgente(data);
    if (data) setNombreAgente(data.nombre_agente);
  }, [negocio]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

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

  useEffect(() => {
    void consultarLinea();
    const t = setInterval(() => void consultarLinea(), 5000);
    return () => clearInterval(t);
  }, [consultarLinea]);

  const existeLinea = !!linea;
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
    if (existeLinea) void cargarRespuestas();
  }, [existeLinea, cargarRespuestas]);

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

  const guardar = async (cambios: Partial<Pick<AgenteFila, "activo" | "nombre_agente">>) => {
    if (!negocio || !user) return;
    setGuardando(true);
    const { data, error } = agente
      ? await supabase.from("agente_whatsapp").update(cambios).eq("id", agente.id).select("*").maybeSingle()
      : await supabase
          .from("agente_whatsapp")
          .insert({ negocio_id: negocio.id, owner_id: user.id, ...cambios })
          .select("*")
          .maybeSingle();
    setGuardando(false);
    if (error) {
      toast.error("No se pudo guardar el agente");
      return;
    }
    setAgente(data);
    toast.success("Agente guardado");
  };

  const conectar = async () => {
    if (!claveLocal.trim()) {
      toast.error("Pega la clave de acceso de la API local");
      return;
    }
    localStorage.setItem("whatsapp_local_token", claveLocal.trim());
    try {
      const r = await fetch(`${API_LOCAL}/lineas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${claveLocal.trim()}` },
        body: JSON.stringify({ id: idLinea, nombre: negocio?.nombre ?? idLinea, clave: agente?.clave ?? "", agente: agente?.activo ?? true }),
      });
      if (!r.ok) throw new Error(r.status === 401 ? "Clave incorrecta" : "Error");
      toast.success("Número agregado. Escanea el código con el WhatsApp de este negocio.");
      void consultarLinea();
    } catch (e) {
      toast.error(e instanceof Error && e.message === "Clave incorrecta" ? "La clave de la API local no es correcta" : "No se pudo conectar. Abre la API local en este computador.");
    }
  };

  if (!negocio) return null;

  return (
    <GlassPanel className="space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span className="icon-chip h-10 w-10 shrink-0 rounded-xl"><Bot className="h-5 w-5" /></span>
        <div className="min-w-0">
          <h3 className="font-display text-lg">Agente de WhatsApp</h3>
          <p className="text-sm text-muted-foreground">
            Atiende a tus clientes por WhatsApp con las respuestas que tú configures. Funciona en este computador, sin inteligencia artificial.
          </p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          className="h-4 w-4"
          checked={agente?.activo ?? true}
          onChange={(e) => void guardar({ activo: e.target.checked })}
          disabled={guardando || !agente}
        />
        Agente activo en este negocio
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-muted-foreground">Nombre del agente</span>
        <input
          className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
          value={nombreAgente}
          maxLength={40}
          onChange={(e) => setNombreAgente(e.target.value)}
        />
      </label>
      <button
        disabled={guardando}
        onClick={() => void guardar({ nombre_agente: nombreAgente.trim() || "Asistente" })}
        className="rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
      >
        {guardando ? "Guardando…" : agente ? "Guardar agente" : "Crear agente"}
      </button>

      <div className="space-y-3 border-t border-glass-border/60 pt-4">
        <h4 className="text-sm font-medium">Conectar el número de este negocio</h4>
        <p className="text-xs text-muted-foreground">
          Abre la API local en este computador (iniciar-whatsapp), pega su clave de acceso y escanea el código con el WhatsApp de este negocio.
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
    </GlassPanel>
  );
}
