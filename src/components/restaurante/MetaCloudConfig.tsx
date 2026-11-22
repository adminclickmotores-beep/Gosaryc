import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Cloud, Copy, Eye, EyeOff, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";

const URL_BASE = String(import.meta.env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");
const URL_WEBHOOK = `${URL_BASE}/functions/v1/whatsapp-meta-webhook`;

function copiar(valor: string, etiqueta: string) {
  void navigator.clipboard
    .writeText(valor)
    .then(() => toast.success(`${etiqueta} copiado`))
    .catch(() => toast.error("No se pudo copiar"));
}

function generarToken(): string {
  return crypto.randomUUID().replace(/-/g, "");
}

/** Configuración de WhatsApp Cloud API oficial de Meta (nube 24/7). La conexión local por QR no se toca. */
export function MetaCloudConfig() {
  const { negocio } = useNegocio();
  const [phoneId, setPhoneId] = useState("");
  const [token, setToken] = useState("");
  const [verifyToken, setVerifyToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [activo, setActivo] = useState(true);
  const [tokenGuardado, setTokenGuardado] = useState(false);
  const [secretoGuardado, setSecretoGuardado] = useState(false);
  const [verToken, setVerToken] = useState(false);
  const [verSecreto, setVerSecreto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cargado, setCargado] = useState(false);

  const cargar = useCallback(async () => {
    if (!negocio?.id) return;
    const [{ data: fila }, { data: estado }] = await Promise.all([
      supabase
        .from("whatsapp_meta_config")
        .select("meta_phone_number_id,meta_verify_token,activo")
        .eq("business_id", negocio.id)
        .maybeSingle(),
      supabase.rpc("meta_estado_config"),
    ]);
    if (fila) {
      setPhoneId(fila.meta_phone_number_id);
      setVerifyToken(fila.meta_verify_token);
      setActivo(fila.activo);
    } else {
      setVerifyToken((v) => v || generarToken());
    }
    const e = (estado ?? {}) as { token_guardado?: boolean; secreto_guardado?: boolean };
    setTokenGuardado(e.token_guardado === true);
    setSecretoGuardado(e.secreto_guardado === true);
    setCargado(true);
  }, [negocio?.id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const guardar = async () => {
    if (!/^\d{5,30}$/.test(phoneId.trim())) {
      toast.error("El Phone Number ID debe tener solo números");
      return;
    }
    if (!token.trim() && !tokenGuardado) {
      toast.error("Pega el token de acceso permanente de Meta");
      return;
    }
    setGuardando(true);
    const { data, error } = await supabase.rpc("meta_guardar_config", {
      p_phone_number_id: phoneId.trim(),
      p_access_token: token.trim(),
      p_verify_token: verifyToken.trim(),
      p_app_secret: appSecret.trim(),
      p_activo: activo,
    });
    setGuardando(false);
    if (error) {
      toast.error(error.message || "No se pudo guardar la configuración");
      return;
    }
    const salida = (data ?? {}) as { verify_token?: string };
    if (salida.verify_token) setVerifyToken(salida.verify_token);
    setToken("");
    setAppSecret("");
    toast.success("Configuración de WhatsApp Cloud API guardada");
    void cargar();
  };

  if (!negocio) return null;

  return (
    <GlassPanel className="space-y-4 p-5">
      <div className="flex items-start gap-3">
        <span className="icon-chip h-10 w-10 shrink-0 rounded-xl">
          <Cloud className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-lg">WhatsApp Cloud API oficial de Meta (Nube 24/7)</h3>
          <p className="text-sm text-muted-foreground">
            Atiende a tus clientes y recibe comandos sin tener el computador encendido. La conexión local por QR sigue funcionando igual.
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-xl border border-glass-border bg-background/40 p-3.5">
        <p className="text-sm font-medium">Pega esto en developers.facebook.com → WhatsApp → Configuración → Webhook</p>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">URL de devolución de llamada (Callback URL)</span>
          <div className="flex gap-2">
            <input readOnly value={URL_WEBHOOK} className="min-w-0 flex-1 rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base" />
            <button type="button" onClick={() => copiar(URL_WEBHOOK, "URL del webhook")} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90">
              <Copy className="h-3.5 w-3.5" /> Copiar
            </button>
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Token de verificación (Verify token)</span>
          <div className="flex gap-2">
            <input readOnly value={verifyToken} className="min-w-0 flex-1 rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base" />
            <button type="button" disabled={!verifyToken} onClick={() => copiar(verifyToken, "Token de verificación")} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60">
              <Copy className="h-3.5 w-3.5" /> Copiar
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Guarda primero la configuración de abajo y después pulsa «Verificar y guardar» en Meta. Suscríbete al campo «messages».</p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Phone Number ID</span>
          <input
            inputMode="numeric"
            className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
            placeholder="Ej. 109876543210987"
            value={phoneId}
            maxLength={30}
            onChange={(e) => setPhoneId(e.target.value.replace(/\D/g, ""))}
          />
        </label>

        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Token de acceso permanente (Access token)</span>
          <div className="flex gap-2">
            <input
              type={verToken ? "text" : "password"}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
              placeholder={tokenGuardado ? "Ya guardado — escribe uno nuevo solo si quieres cambiarlo" : "EAAG..."}
              value={token}
              maxLength={1000}
              onChange={(e) => setToken(e.target.value)}
            />
            <button type="button" onClick={() => setVerToken((v) => !v)} aria-label={verToken ? "Ocultar token" : "Mostrar token"} className="rounded-lg border border-glass-border px-3">
              {verToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Token de verificación personalizado (opcional)</span>
          <input
            className="w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
            value={verifyToken}
            maxLength={100}
            onChange={(e) => setVerifyToken(e.target.value.replace(/\s/g, ""))}
          />
        </label>

        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Secreto de la app de Meta (App Secret) — necesario para activar los comandos por WhatsApp</span>
          <div className="flex gap-2">
            <input
              type={verSecreto ? "text" : "password"}
              autoComplete="off"
              className="min-w-0 flex-1 rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base"
              placeholder={secretoGuardado ? "Ya guardado — escribe uno nuevo solo si quieres cambiarlo" : "Configuración de la app → Básica → Clave secreta"}
              value={appSecret}
              maxLength={200}
              onChange={(e) => setAppSecret(e.target.value)}
            />
            <button type="button" onClick={() => setVerSecreto((v) => !v)} aria-label={verSecreto ? "Ocultar secreto" : "Mostrar secreto"} className="rounded-lg border border-glass-border px-3">
              {verSecreto ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {secretoGuardado
              ? "Los mensajes de Meta se validan con firma y el Modo Comandos Autorizados está activo en la nube."
              : "Sin el secreto, el agente atiende a tus clientes pero los comandos operativos quedan apagados en la nube, para que nadie pueda suplantar un número autorizado."}
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-glass-border bg-background/40 p-3">
          <input type="checkbox" className="h-5 w-5 shrink-0 accent-primary" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
          <span className="text-sm">Atender por WhatsApp Cloud API (nube)</span>
        </label>

        <button
          type="button"
          disabled={guardando || !cargado}
          onClick={() => void guardar()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 sm:w-auto"
        >
          <Save className="h-4 w-4" /> {guardando ? "Guardando…" : "Guardar configuración"}
        </button>
      </div>
    </GlassPanel>
  );
}
