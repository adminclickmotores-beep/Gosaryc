import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Bot, Eye, EyeOff, Link2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

type AgenteFila = Tables<"agente_whatsapp">;
type LineaLocal = { id: string; nombre: string; estado: string; agente: boolean; conClave: boolean; qr: string; aviso: string };

const API_LOCAL = "http://localhost:3001";
const ETIQUETA_ESTADO: Record<string, string> = {
  iniciando: "Iniciando…",
  esperando_qr: "Esperando que escanees el código",
  listo: "Conectado",
  desconectado: "Desconectado",
};

/** Configura el agente de ventas y atención por WhatsApp del negocio y conecta su número en la API local. */
export function AgenteWhatsApp() {
  const { negocio } = useNegocio();
  const { user } = useAuth();
  const [agente, setAgente] = useState<AgenteFila | null>(null);
  const [nombreAgente, setNombreAgente] = useState("Asistente");
  const [instrucciones, setInstrucciones] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [claveLocal, setClaveLocal] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [linea, setLinea] = useState<LineaLocal | null>(null);
  const [apiCaida, setApiCaida] = useState(false);

  const idLinea = (negocio?.id ?? "").slice(0, 8) || "negocio";

  useEffect(() => {
    setClaveLocal(localStorage.getItem("whatsapp_local_token") ?? "");
  }, []);

  const cargar = useCallback(async () => {
    if (!negocio) return;
    const { data } = await supabase.from("agente_whatsapp").select("*").eq("negocio_id", negocio.id).maybeSingle();
    setAgente(data);
    if (data) {
      setNombreAgente(data.nombre_agente);
      setInstrucciones(data.instrucciones ?? "");
    }
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

  const guardar = async (cambios: Partial<Pick<AgenteFila, "activo" | "nombre_agente" | "instrucciones">>) => {
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
    if (!agente) {
      toast.error("Primero guarda el agente");
      return;
    }
    if (!claveLocal.trim()) {
      toast.error("Pega la clave de acceso de la API local");
      return;
    }
    localStorage.setItem("whatsapp_local_token", claveLocal.trim());
    try {
      const r = await fetch(`${API_LOCAL}/lineas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${claveLocal.trim()}` },
        body: JSON.stringify({ id: idLinea, nombre: negocio?.nombre ?? idLinea, clave: agente.clave, agente: agente.activo }),
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
            Responde a tus clientes, resuelve dudas, asesora y ayuda a cerrar ventas con los datos y el catálogo de este negocio.
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
        <span className="mb-1 block text-muted-foreground">Nombre con el que se presenta</span>
        <input
          className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
          value={nombreAgente}
          maxLength={40}
          onChange={(e) => setNombreAgente(e.target.value)}
        />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block text-muted-foreground">Instrucciones propias (promociones, políticas, forma de pago, tono…)</span>
        <textarea
          className="min-h-28 w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
          value={instrucciones}
          maxLength={3000}
          onChange={(e) => setInstrucciones(e.target.value)}
          placeholder="Ej.: Aceptamos Nequi y efectivo. Los pedidos de más de $100.000 tienen envío gratis."
        />
      </label>

      <button
        disabled={guardando}
        onClick={() => void guardar({ nombre_agente: nombreAgente.trim() || "Asistente", instrucciones: instrucciones.trim() || null })}
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
            disabled={!agente}
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
    </GlassPanel>
  );
}
