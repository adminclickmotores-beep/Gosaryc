import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Bot, Flame, Loader2, RotateCcw, Send, Snowflake, Sun, UserRound, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { useAuth } from "@/contexts/AuthContext";
import { TIPOS_NEGOCIO } from "@/lib/modulos-negocio";

type Lead = { temperatura?: string; puntaje?: number; interes?: string; capacidad_pago?: string; urgencia?: string; datos_confirmados?: string };
type Pqrs = { tipo?: string; resumen?: string; urgencia?: string };
type Respuesta = { texto: string; escalar: boolean; lead?: Lead | null; pqrs?: Pqrs | null; error?: string };
type Mensaje = { role: "user" | "assistant"; content: string };
type Analisis = { lead: Lead | null; pqrs: Pqrs | null; escalar: boolean };

const SUGERENCIAS: Record<string, string[]> = {
  concesionario: ["Hola, busco una camioneta 2022, ¿qué tienen?", "Tengo 20 millones de cuota inicial, ¿a cuántos meses?"],
  inmobiliaria: ["Quiero comprar un apartamento para vivir, ¿qué proyectos hay?", "Tengo subsidio de vivienda, ¿me sirve?"],
  construccion: ["Necesito cotizar una remodelación de cocina", "Quiero hablar con un gerente, mi obra va retrasada"],
  restaurante: ["Hola, ¿me envías el menú?", "Mi pedido llegó frío y quiero un reclamo"],
};

function etiquetaTemperatura(t: string | undefined): { texto: string; clase: string; Icono: typeof Flame } {
  const v = (t ?? "").toUpperCase();
  if (v.startsWith("CAL")) return { texto: "Caliente", clase: "border-destructive/50 bg-destructive/15 text-destructive", Icono: Flame };
  if (v.startsWith("TIB")) return { texto: "Tibio", clase: "border-primary/50 bg-primary/15 text-primary", Icono: Sun };
  return { texto: "Frío", clase: "border-glass-border bg-glass-strong text-muted-foreground", Icono: Snowflake };
}

/** Chat de prueba en vivo contra el endpoint real del agente, sin puente local ni QR. No guarda leads ni PQRS. */
export function ProbadorAgenteVivo({ onCerrar }: { onCerrar?: () => void }) {
  const { user } = useAuth();
  const { negocio } = useNegocio();
  const [clave, setClave] = useState("");
  const [errorClave, setErrorClave] = useState("");
  const [sector, setSector] = useState("");
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [analisis, setAnalisis] = useState<Analisis | null>(null);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const fin = useRef<HTMLDivElement | null>(null);

  const cargarClave = useCallback(async () => {
    if (!user || !negocio?.id) return;
    const { data: fila } = await supabase.from("agente_whatsapp").select("clave").eq("negocio_id", negocio.id).maybeSingle();
    if (fila?.clave) {
      setClave(fila.clave);
      return;
    }
    const { data: nueva, error: e } = await supabase
      .from("agente_whatsapp")
      .insert({ negocio_id: negocio.id, owner_id: user.id })
      .select("clave")
      .maybeSingle();
    if (nueva?.clave) setClave(nueva.clave);
    else setErrorClave(e?.message ?? "No se pudo preparar el agente de este negocio.");
  }, [user, negocio?.id]);

  useEffect(() => {
    void cargarClave();
  }, [cargarClave]);

  useEffect(() => {
    fin.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensajes, enviando]);

  const reiniciar = () => {
    setMensajes([]);
    setAnalisis(null);
    setError("");
  };

  const enviar = async (valor: string) => {
    const limpio = valor.trim().slice(0, 500);
    if (!limpio || enviando || !clave) return;
    const historial: Mensaje[] = [...mensajes, { role: "user", content: limpio }];
    setMensajes(historial);
    setTexto("");
    setError("");
    setEnviando(true);
    try {
      const r = await fetch("/api/public/agente-cliente", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${clave}` },
        body: JSON.stringify({ mensajes: historial, sector_prueba: sector, canal_origen: "WhatsApp Directo" }),
      });
      const j = (await r.json()) as Respuesta;
      if (!r.ok) throw new Error(j.error ?? "El agente no respondió");
      setMensajes([...historial, { role: "assistant", content: j.texto }]);
      setAnalisis((a) => ({ lead: j.lead ?? a?.lead ?? null, pqrs: j.pqrs ?? a?.pqrs ?? null, escalar: j.escalar || (a?.escalar ?? false) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo conectar con el agente");
    } finally {
      setEnviando(false);
    }
  };

  const sugeridas = SUGERENCIAS[sector || (negocio as unknown as { tipo_negocio?: string } | null)?.tipo_negocio?.toLowerCase() || "restaurante"] ?? SUGERENCIAS.restaurante;
  const temp = etiquetaTemperatura(analisis?.lead?.temperatura);
  const puntaje = Math.max(0, Math.min(100, Number(analisis?.lead?.puntaje ?? 0)));
  const filas: Array<[string, string | undefined]> = [
    ["Interés", analisis?.lead?.interes],
    ["Capacidad de pago", analisis?.lead?.capacidad_pago],
    ["Urgencia", analisis?.lead?.urgencia],
    ["Datos confirmados", analisis?.lead?.datos_confirmados],
  ];

  return (
    <GlassPanel className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="icon-chip h-9 w-9 shrink-0 rounded-xl"><Bot className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base">Probar Agente IA en vivo</h3>
          <p className="text-xs text-muted-foreground">Responde la IA real. Es solo una prueba: no se guardan leads ni casos.</p>
        </div>
        <select
          aria-label="Sector a simular"
          className="rounded-lg border border-glass-border bg-background/60 px-2 py-2 text-base"
          value={sector}
          onChange={(e) => {
            setSector(e.target.value);
            reiniciar();
          }}
        >
          <option value="">Mi negocio</option>
          {TIPOS_NEGOCIO.map((t) => (
            <option key={t.clave} value={t.clave}>{t.panel}</option>
          ))}
        </select>
        <button type="button" onClick={reiniciar} aria-label="Reiniciar conversación" className="flex h-9 w-9 items-center justify-center rounded-lg border border-glass-border hover:bg-primary/10">
          <RotateCcw className="h-4 w-4" />
        </button>
        {onCerrar && (
          <button type="button" onClick={onCerrar} aria-label="Cerrar prueba" className="flex h-9 w-9 items-center justify-center rounded-lg border border-glass-border hover:bg-primary/10">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {errorClave && <p className="text-sm text-destructive">{errorClave}</p>}

      <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-glass-border">
          <div className="h-80 space-y-2 overflow-y-auto bg-background/50 p-3">
            {mensajes.length === 0 && <p className="text-center text-xs text-muted-foreground">Escribe como si fueras un cliente o toca una sugerencia.</p>}
            {mensajes.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-3 py-2 text-sm ${m.role === "user" ? "bg-primary/20" : "bg-glass-strong"}`}>{m.content}</div>
              </div>
            ))}
            {enviando && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> El agente está escribiendo…</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
            <div ref={fin} />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-glass-border/60 p-2">
            {sugeridas.map((q) => (
              <button key={q} type="button" disabled={enviando || !clave} onClick={() => void enviar(q)} className="rounded-full border border-glass-border px-3 py-1 text-left text-xs hover:bg-primary/10 disabled:opacity-50">
                {q}
              </button>
            ))}
          </div>
          <div className="flex gap-2 border-t border-glass-border/60 p-2">
            <input
              className="min-w-0 flex-1 rounded-full border border-glass-border bg-background/60 px-4 py-2 text-base"
              placeholder={clave ? "Escribe un mensaje…" : "Preparando el agente…"}
              value={texto}
              maxLength={500}
              disabled={!clave}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void enviar(texto);
              }}
            />
            <button type="button" onClick={() => void enviar(texto)} disabled={enviando || !texto.trim() || !clave} aria-label="Enviar mensaje" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-40">
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="min-w-0 space-y-3 rounded-xl border border-glass-border bg-background/40 p-3 text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Análisis en tiempo real</p>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${temp.clase}`}>
              <temp.Icono className="h-4 w-4" /> {analisis?.lead ? temp.texto : "Sin calificar"}
            </span>
            {analisis?.lead && <span className="text-sm font-medium">{puntaje}/100</span>}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-glass-strong">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${analisis?.lead ? puntaje : 0}%` }} />
          </div>
          <dl className="space-y-1.5">
            {filas.map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-muted-foreground">{k}</dt>
                <dd className="break-words">{v && v.trim() ? v : "—"}</dd>
              </div>
            ))}
          </dl>
          <div className="space-y-2 border-t border-glass-border/60 pt-3">
            <p className={`flex items-start gap-2 ${analisis?.pqrs ? "text-destructive" : "text-muted-foreground"}`}>
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="min-w-0 break-words">
                {analisis?.pqrs ? `PQRS activada: ${analisis.pqrs.tipo ?? "Caso"} · urgencia ${analisis.pqrs.urgencia ?? "—"}${analisis.pqrs.resumen ? ` — ${analisis.pqrs.resumen}` : ""}` : "PQRS: no activada"}
              </span>
            </p>
            <p className={`flex items-center gap-2 ${analisis?.escalar ? "font-medium text-destructive" : "text-muted-foreground"}`}>
              <UserRound className="h-4 w-4 shrink-0" /> {analisis?.escalar ? "Escalar a asesor: ACTIVADO" : "Escalar a asesor: no"}
            </p>
          </div>
        </div>
      </div>
    </GlassPanel>
  );
}
