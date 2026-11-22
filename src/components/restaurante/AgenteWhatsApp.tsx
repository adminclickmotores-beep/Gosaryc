import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Bot, CheckCircle2, Cloud, Copy, Eye, EyeOff, Link2, RefreshCw, Wifi, WifiOff, Zap } from "lucide-react";
import { ProbadorAgenteVivo } from "@/components/restaurante/ProbadorAgenteVivo";
import { CerebroEntrenamiento } from "@/components/restaurante/CerebroEntrenamiento";
import { PuenteWhatsAppLocal } from "@/components/restaurante/PuenteWhatsAppLocal";
import { MetaCloudConfig } from "@/components/restaurante/MetaCloudConfig";
import { AvisosWhatsApp } from "@/components/restaurante/AvisosWhatsApp";
import { ComandosWhatsApp } from "@/components/restaurante/ComandosWhatsApp";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { useAuth } from "@/contexts/AuthContext";
import { asegurarConfiguracionAutomaticaAgente, type AgenteAutoRow } from "@/lib/agente-autoconfig";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";

const ENLACES_CANAL = [
  { canal: "Instagram", texto: "Hola, vengo de Instagram" },
  { canal: "Facebook", texto: "Hola, vengo de Facebook" },
  { canal: "Página Web", texto: "Hola, vengo de la web" },
  { canal: "Google", texto: "Hola, te encontré en Google" },
];

type LineaLocal = { id: string; nombre: string; estado: string; agente: boolean; conClave: boolean; qr: string; aviso: string };

const API_LOCAL_DEFECTO = "http://localhost:3001";
const CLAVE_URL_API = "gosaryc:agente-api-url";

function normalizarUrlApi(raw: string): string {
  const limpio = raw.trim().replace(/\/+$/, "");
  if (!limpio) return API_LOCAL_DEFECTO;
  return /^https?:\/\//i.test(limpio) ? limpio : `http://${limpio}`;
}
const ETIQUETA_ESTADO: Record<string, string> = {
  iniciando: "Iniciando…",
  esperando_qr: "Esperando que escanees el código QR",
  listo: "Conectado 24/7",
  desconectado: "Desconectado",
};

export function AgenteWhatsApp() {
  return <AgenteWhatsAppReal />;
}

/**
 * Pantalla simplificada de Agente de WhatsApp (solo conexión 24/7, QR, activar/desactivar,
 * interruptor de CRM y Embudo IA en el menú, generador de enlaces de rastreo y Prueba en Vivo).
 * La personalidad, objetivo de cierre, reglas y bandeja PQRS viven en CRM y Embudo IA.
 */
function AgenteWhatsAppReal() {
  const { negocio } = useNegocio();
  const { user } = useAuth();
  const [probarVivo, setProbarVivo] = useState(false);
  const [crmActivo, setCrmActivo] = useState(false);
  const [agente, setAgente] = useState<AgenteAutoRow | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [claveLocal, setClaveLocal] = useState("");
  const [urlApiLocal, setUrlApiLocal] = useState(() => {
    try {
      return window.localStorage.getItem(CLAVE_URL_API) || API_LOCAL_DEFECTO;
    } catch {
      return API_LOCAL_DEFECTO;
    }
  });
  const [verClave, setVerClave] = useState(false);
  const [linea, setLinea] = useState<LineaLocal | null>(null);
  const [apiCaida, setApiCaida] = useState(false);
  const creandoLinea = useRef(false);

  const apiBase = normalizarUrlApi(urlApiLocal);
  const guardarUrlApi = (valor: string) => {
    setUrlApiLocal(valor);
    try {
      window.localStorage.setItem(CLAVE_URL_API, valor.trim() || API_LOCAL_DEFECTO);
    } catch {
      /* modo privado */
    }
  };

  const idLinea = (negocio?.id ?? "").slice(0, 8) || "negocio";
  const tipoNegocio = ((negocio as unknown as { tipo_negocio?: string | null } | null)?.tipo_negocio ?? "").slice(0, 80);
  const giro = resolverTipoNegocio(tipoNegocio || null);

  useEffect(() => {
    setCrmActivo(negocio?.crm_activo === true);
  }, [negocio?.crm_activo]);

  // Autoconfiguración Plug & Play al abrir la pantalla por primera vez.
  const cargar = useCallback(async () => {
    if (!negocio?.id || !user) return;
    const { agente: fila } = await asegurarConfiguracionAutomaticaAgente({
      negocioId: negocio.id,
      ownerId: negocio.owner_id ?? user.id,
      tipoNegocio: tipoNegocio || null,
      nombreNegocio: negocio.nombre,
    });
    if (fila) setAgente(fila);
  }, [negocio?.id, negocio?.owner_id, negocio?.nombre, tipoNegocio, user]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Enlace automático: pide la clave a la API local (solo responde al panel autorizado en este equipo).
  useEffect(() => {
    if (claveLocal.trim()) return;
    let vivo = true;
    const pedir = async () => {
      try {
        const r = await fetch(`${apiBase}/enlace`);
        if (!r.ok) return;
        const j = (await r.json()) as { clave?: string };
        if (vivo && j.clave) {
          setClaveLocal(j.clave);
          setApiCaida(false);
        }
      } catch {
        if (vivo) setApiCaida(true);
      }
    };
    void pedir();
    const t = setInterval(() => void pedir(), 6000);
    return () => {
      vivo = false;
      clearInterval(t);
    };
  }, [apiBase, claveLocal]);

  const consultarLinea = useCallback(async () => {
    if (!claveLocal.trim()) return;
    try {
      const r = await fetch(`${apiBase}/lineas`, { headers: { Authorization: `Bearer ${claveLocal.trim()}` } });
      if (!r.ok) {
        setApiCaida(r.status !== 401);
        return;
      }
      const j = (await r.json()) as { lineas: LineaLocal[] };
      setApiCaida(false);
      const encontrada = j.lineas.find((l) => l.id === idLinea) ?? null;
      setLinea(encontrada);
      // Conexión automática: si el negocio aún no tiene línea, se crea sola y aparece el QR.
      if (!encontrada && agente && negocio?.id && !creandoLinea.current) {
        creandoLinea.current = true;
        try {
          await fetch(`${apiBase}/lineas`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${claveLocal.trim()}` },
            body: JSON.stringify({
              id: idLinea,
              nombre: negocio.nombre ?? idLinea,
              clave: agente.clave ?? "",
              agente: (agente.ia_activa ?? true) && (agente.activo ?? true),
              perfil: tipoNegocio,
              instrucciones: agente.instrucciones ?? "",
            }),
          });
        } catch {
          /* se reintenta en el siguiente ciclo */
        }
        creandoLinea.current = false;
      }
    } catch {
      setApiCaida(true);
    }
  }, [apiBase, claveLocal, idLinea, agente, negocio?.id, negocio?.nombre, tipoNegocio]);

  useEffect(() => {
    void consultarLinea();
    const t = setInterval(() => void consultarLinea(), 5000);
    return () => clearInterval(t);
  }, [consultarLinea]);

  const actualizarEstadoAgente = async (cambios: Partial<Pick<AgenteAutoRow, "activo" | "ia_activa">>) => {
    if (!negocio?.id || !user) return;
    setGuardando(true);
    let actual = agente;
    if (!actual) {
      const res = await asegurarConfiguracionAutomaticaAgente({
        negocioId: negocio.id,
        ownerId: negocio.owner_id ?? user.id,
        tipoNegocio: tipoNegocio || null,
        nombreNegocio: negocio.nombre,
      });
      actual = res.agente;
    }
    if (!actual) {
      setGuardando(false);
      toast.error("No se pudo preparar el agente de este negocio.");
      return;
    }
    const { data, error } = await supabase
      .from("agente_whatsapp")
      .update(cambios)
      .eq("id", actual.id)
      .select("id,negocio_id,owner_id,clave,activo,nombre_agente,instrucciones,ia_activa,personalidad,objetivo_cierre,cierre_autonomo")
      .maybeSingle();
    setGuardando(false);
    if (error || !data) {
      toast.error("No se pudo actualizar el estado del agente.");
      return;
    }
    const actualizado = data as AgenteAutoRow;
    setAgente(actualizado);
    if (claveLocal.trim() && linea) {
      try {
        await fetch(`${apiBase}/lineas`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${claveLocal.trim()}` },
          body: JSON.stringify({
            id: idLinea,
            agente: actualizado.activo && actualizado.ia_activa,
            clave: actualizado.clave,
            perfil: tipoNegocio,
            instrucciones: actualizado.instrucciones ?? "",
          }),
        });
      } catch {
        /* se sincroniza al reconectar */
      }
    }
    toast.success(actualizado.activo && actualizado.ia_activa ? "Agente activado 24/7" : "Agente pausado");
  };

  const conectar = async () => {
    if (!claveLocal.trim()) {
      toast.error("Pega la clave de acceso de la API local");
      return;
    }
    try {
      const r = await fetch(`${apiBase}/lineas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${claveLocal.trim()}`,
        },
        body: JSON.stringify({
          id: idLinea,
          nombre: negocio?.nombre ?? idLinea,
          clave: agente?.clave ?? "",
          agente: (agente?.ia_activa ?? true) && (agente?.activo ?? true),
          perfil: tipoNegocio,
          instrucciones: agente?.instrucciones ?? "",
        }),
      });
      if (!r.ok) throw new Error(r.status === 401 ? "Clave incorrecta" : "Error");
      toast.success("Número agregado. Escanea el código QR con el WhatsApp de este negocio.");
      void consultarLinea();
    } catch (e) {
      toast.error(
        e instanceof Error && e.message === "Clave incorrecta"
          ? "La clave de la API local no es correcta"
          : "No se pudo conectar. Abre la API local en este computador.",
      );
    }
  };

  const revincular = async () => {
    if (!claveLocal.trim()) {
      toast.error("Pega la clave de acceso de la API local");
      return;
    }
    try {
      const r = await fetch(`${apiBase}/lineas/revincular`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${claveLocal.trim()}` },
        body: JSON.stringify({ id: idLinea }),
      });
      if (!r.ok) throw new Error("Error");
      toast.success("Se generó un código QR nuevo. Tu configuración y aprendizaje se conservan.");
      void consultarLinea();
    } catch {
      toast.error("No se pudo generar el código QR. Revisa que la API local esté abierta.");
    }
  };

  const alternarCrm = (valor: boolean) => {
    if (!negocio?.id) return;
    setCrmActivo(valor);
    void supabase
      .from("negocio_config")
      .update({ crm_activo: valor })
      .eq("id", negocio.id)
      .select("id")
      .then(({ data, error }) => {
        if (error || !data || data.length === 0) {
          setCrmActivo(!valor);
          toast.error("No se pudo guardar el cambio del CRM.");
          return;
        }
        window.dispatchEvent(new Event("crm:cambio"));
        toast.success(valor ? "CRM y Embudo IA visible en el menú" : "CRM y Embudo IA oculto del menú");
      });
  };

  if (!negocio) return null;

  const telNegocio = String((negocio as unknown as { telefono_pedidos?: string | null } | null)?.telefono_pedidos ?? "").replace(/\D/g, "");
  const numeroEnlace = telNegocio.length === 10 ? `57${telNegocio}` : telNegocio;
  const conectado = linea?.estado === "listo";
  const activo = (agente?.activo ?? true) && (agente?.ia_activa ?? true);

  return (
    <div className="space-y-4">
      {probarVivo && <ProbadorAgenteVivo onCerrar={() => setProbarVivo(false)} />}

      <PuenteWhatsAppLocal apiBase={apiBase} claveLocal={claveLocal} />

      <MetaCloudConfig />

      <AvisosWhatsApp />

      <ComandosWhatsApp />

      <GlassPanel className="space-y-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="icon-chip h-10 w-10 shrink-0 rounded-xl">
              <Bot className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h3 className="font-display text-lg">Agente de WhatsApp</h3>
              <p className="text-sm text-muted-foreground">
                Conexión 24/7 para <span className="font-medium text-foreground">{negocio.nombre}</span> ({giro.panel}). Configurado automáticamente con tu catálogo y reglas del sector.
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              conectado
                ? "bg-emerald-500/15 text-emerald-500"
                : linea
                  ? "bg-amber-500/15 text-amber-500"
                  : activo
                    ? "bg-sky-500/15 text-sky-400"
                    : "bg-muted text-muted-foreground"
            }`}
          >
            {conectado ? <Wifi className="h-3.5 w-3.5" /> : activo && !linea ? <Cloud className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
            {conectado
              ? "Conectado 24/7 (API Local)"
              : linea
                ? ETIQUETA_ESTADO[linea.estado] ?? linea.estado
                : activo
                  ? "Modo Web/Nube activo"
                  : "Pausado"}
          </span>
        </div>

        {/* 1. Activar / Desactivar + Mostrar CRM en el menú */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center justify-between gap-3 rounded-xl border border-glass-border bg-background/40 p-3.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">Agente IA 24/7</p>
              <p className="text-xs text-muted-foreground">
                {activo ? "Activo y listo para responder clientes" : "Pausado temporalmente"}
              </p>
            </div>
            <button
              type="button"
              disabled={guardando}
              onClick={() => void actualizarEstadoAgente({ activo: !activo, ia_activa: !activo })}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-xs font-medium transition-colors disabled:opacity-60 ${
                activo
                  ? "bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/25"
                  : "bg-primary text-primary-foreground hover:opacity-90"
              }`}
            >
              {guardando ? "Guardando…" : activo ? "Desactivar" : "Activar"}
            </button>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-glass-border bg-background/40 p-3.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">Mostrar CRM y Embudo IA en el menú</p>
              <p className="text-xs text-muted-foreground">Actívalo para gestionar prospectos, PQRS y reglas IA.</p>
            </div>
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0 accent-primary"
              checked={crmActivo}
              onChange={(e) => alternarCrm(e.target.checked)}
            />
          </label>
        </div>

        {/* Botón Probar Agente IA en Vivo */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>
              Personalidad y cierre automático listos para <strong className="text-foreground">{giro.panel}</strong>. Si deseas ajustarlos, encuéntralos en <strong className="text-foreground">CRM y Embudo IA → Inteligencia IA</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setProbarVivo((v) => !v)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 sm:w-auto"
          >
            <Zap className="h-4 w-4" />
            {probarVivo ? "Ocultar prueba en vivo" : "Probar Agente IA en Vivo"}
          </button>
        </div>

        <CerebroEntrenamiento />

        {/* 2. Vinculación / QR 24/7 (Modo Dual: API Local / Túnel + Respaldo Web/Nube) */}
        <div className="space-y-3 border-t border-glass-border/60 pt-4">
          <h4 className="text-sm font-medium">Conecta tu WhatsApp</h4>
          <p className="text-xs text-muted-foreground">
            {linea?.estado === "listo"
              ? "Tu WhatsApp está conectado y el agente ya atiende a tus clientes. No tienes que configurar nada más."
              : linea?.qr
                ? "Abre WhatsApp en tu celular → Dispositivos vinculados → Vincular dispositivo y escanea este código. En cuanto lo escanees, el agente empieza a trabajar solo."
                : claveLocal
                  ? "Preparando tu código QR…"
                  : "Abre la app de escritorio de Gosaryc en este computador: aquí aparecerá el código QR automáticamente. Mientras tanto, el agente ya responde desde la nube."}
          </p>
          {linea?.qr && linea.estado !== "listo" && (
            <img src={linea.qr} alt="Código QR para vincular WhatsApp" className="h-auto max-w-full rounded-lg bg-white p-2" width={260} height={260} />
          )}
          <details className="rounded-lg border border-glass-border/60 p-3">
            <summary className="cursor-pointer text-xs text-muted-foreground">Opciones avanzadas (túnel o clave manual)</summary>
            <div className="mt-3 space-y-3">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">URL de la API Local o Túnel</span>
            <input
              type="url"
              className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
              placeholder="http://localhost:3001 o https://tu-tunel.trycloudflare.com"
              value={urlApiLocal}
              onChange={(e) => guardarUrlApi(e.target.value)}
            />
          </label>
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
              type="button"
              onClick={() => void conectar()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              <Link2 className="h-4 w-4" /> Conectar este número
            </button>
            <button
              type="button"
              onClick={() => void consultarLinea()}
              className="inline-flex items-center gap-2 rounded-lg border border-glass-border px-4 py-2.5 text-sm hover:bg-background/60"
            >
              <RefreshCw className="h-4 w-4" /> Actualizar estado
            </button>
            {linea && (
              <button
                type="button"
                onClick={() => void revincular()}
                className="inline-flex items-center gap-2 rounded-lg border border-glass-border px-4 py-2.5 text-sm hover:bg-background/60"
                title="Genera un código QR nuevo sin borrar tu configuración ni lo aprendido"
              >
                <RefreshCw className="h-4 w-4" /> Nuevo código QR
              </button>
            )}
          </div>

          {apiCaida && (
            <div className="flex items-start gap-2.5 rounded-xl border border-sky-500/35 bg-sky-500/10 p-3 text-xs text-foreground">
              <Cloud className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
              <p>
                <strong>Modo Web/Nube activo (respaldo automático):</strong> no se detectó la API local en <span className="font-mono">{apiBase}</span>. Tu agente IA en la nube, la prueba en vivo, los enlaces de rastreo y el registro de leads/PQRS en el CRM siguen operando con normalidad. Cuando abras <span className="font-mono">iniciar-whatsapp</span> en el PC, se reconectará solo.
              </p>
            </div>
          )}
            </div>
          </details>
          {linea && (
            <div className="space-y-2 rounded-xl border border-glass-border bg-background/40 p-3">
              <p className="text-sm">
                Estado: <span className="font-medium">{ETIQUETA_ESTADO[linea.estado] ?? linea.estado}</span>
              </p>
              {linea.aviso && <p className="text-sm text-destructive">{linea.aviso}</p>}
            </div>
          )}
        </div>

        {/* 3. Generador de Enlaces de Rastreo */}
        <div className="space-y-2.5 border-t border-glass-border/60 pt-4">
          <h4 className="text-sm font-medium">Generador de Enlaces de Rastreo</h4>
          <p className="text-xs text-muted-foreground">
            Copia el enlace de cada canal y pégalo en tu biografía de Instagram, botón de Facebook o página web. El agente identifica automáticamente de dónde llegó cada cliente.
          </p>
          {numeroEnlace.length < 10 ? (
            <p className="rounded-lg border border-glass-border/60 bg-background/40 p-3 text-xs text-muted-foreground">
              Configura el teléfono de pedidos o WhatsApp en los datos de tu negocio para generar los enlaces de rastreo.
            </p>
          ) : (
            <div className="space-y-2">
              {ENLACES_CANAL.map((e) => {
                const url = `https://wa.me/${numeroEnlace}?text=${encodeURIComponent(e.texto)}`;
                return (
                  <div key={e.canal} className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                    <span className="w-24 shrink-0 text-xs font-medium">{e.canal}</span>
                    <input
                      readOnly
                      className="min-w-0 flex-1 rounded-lg border border-glass-border bg-background/60 px-2.5 py-1.5 text-base"
                      value={url}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void navigator.clipboard.writeText(url);
                        toast.success(`Enlace de ${e.canal} copiado`);
                      }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90"
                    >
                      <Copy className="h-3.5 w-3.5" /> Copiar
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}
