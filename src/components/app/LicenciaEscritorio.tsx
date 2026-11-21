import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, KeyRound, Send, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

// Solo se activa dentro de la app de escritorio (el envoltorio añade "GosarycEscritorio" al navegador).
const MARCA_ESCRITORIO = "GosarycEscritorio";
const CLAVE_CODIGO = "gosaryc_licencia_codigo";
const CLAVE_OK = "gosaryc_licencia_ok";
const CLAVE_EQUIPO = "gosaryc_equipo_local";
const DIAS_SIN_CONEXION = 7;

type Estado = "normal" | "revisando" | "ok" | "bloqueada";
type Resultado = { valida: boolean; motivo: string } | "sin_conexion";
type EstadoSolicitud = "ninguna" | "pendiente" | "rechazada";
type InfoEquipo = { id: string; nombre?: string; sistema?: string };
type PuenteEscritorio = {
  idEquipo?: () => Promise<string>;
  infoEquipo?: () => Promise<InfoEquipo>;
};

const MENSAJES: Record<string, string> = {
  no_existe: "Ese código no existe. Revísalo o pídele uno nuevo al creador de Gosaryc.",
  suspendida: "Esta licencia está suspendida. Comunícate con el creador de Gosaryc.",
  vencida: "Tu prueba o licencia ya venció. La licencia anual cuesta $100.000 COP e incluye soporte, instalación local y web. Paga la renovación y avísale al creador de Gosaryc: la activará en este mismo equipo.",
  otro_equipo: "Este código pertenece a otro equipo. Solicita la licencia de este equipo.",
  demasiados_intentos: "Demasiados intentos fallidos. Espera 15 minutos antes de intentar de nuevo.",
  sin_conexion: "No hay conexión con el servidor. Conéctate a internet e intenta de nuevo.",
};

async function leerEquipo(): Promise<InfoEquipo> {
  const puente = (window as unknown as { gosarycEscritorio?: PuenteEscritorio }).gosarycEscritorio;
  try {
    if (puente?.infoEquipo) {
      const info = await puente.infoEquipo();
      if (info?.id) return info;
    }
    if (puente?.idEquipo) {
      const id = await puente.idEquipo();
      if (id) return { id };
    }
  } catch {
    /* se usa el código local */
  }
  let local = localStorage.getItem(CLAVE_EQUIPO);
  if (!local) {
    local = `WEB-${crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase()}`;
    localStorage.setItem(CLAVE_EQUIPO, local);
  }
  return { id: local };
}

async function consultarLicencia(codigo: string, equipo: string): Promise<Resultado> {
  const { data, error } = await supabase.rpc("verificar_licencia_equipo", { p_codigo: codigo, p_equipo: equipo });
  if (error || !data) return "sin_conexion";
  const d = data as { valida?: boolean; motivo?: string };
  return { valida: d.valida === true, motivo: d.motivo ?? "no_existe" };
}

async function consultarEquipo(equipo: string): Promise<{ estado: string; codigo?: string }> {
  const { data, error } = await supabase.rpc("consultar_licencia_equipo", { p_equipo: equipo });
  if (error || !data) return { estado: "sin_conexion" };
  const d = data as { estado?: string; codigo?: string };
  return { estado: d.estado ?? "sin_solicitud", codigo: d.codigo };
}

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";

export function LicenciaEscritorio() {
  const [estado, setEstado] = useState<Estado>("normal");
  const [equipo, setEquipo] = useState<InfoEquipo | null>(null);
  const [codigo, setCodigo] = useState("");
  const [correo, setCorreo] = useState("");
  const [negocio, setNegocio] = useState("");
  const [telefono, setTelefono] = useState("");
  const [solicitud, setSolicitud] = useState<EstadoSolicitud>("ninguna");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [verCodigo, setVerCodigo] = useState(false);
  const equipoRef = useRef<string>("");

  // Valida un código en este equipo y, si sirve, lo guarda y abre el programa.
  const activarCodigo = useCallback(async (c: string, eq: string): Promise<boolean> => {
    const r = await consultarLicencia(c, eq);
    if (r === "sin_conexion") {
      setError(MENSAJES.sin_conexion);
      return false;
    }
    if (!r.valida) {
      setError(MENSAJES[r.motivo] ?? MENSAJES.no_existe);
      return false;
    }
    localStorage.setItem(CLAVE_CODIGO, c);
    localStorage.setItem(CLAVE_OK, String(Date.now()));
    setError(null);
    setEstado("ok");
    return true;
  }, []);

  useEffect(() => {
    if (!navigator.userAgent.includes(MARCA_ESCRITORIO)) return;
    setEstado("revisando");
    let vivo = true;
    (async () => {
      const info = await leerEquipo();
      if (!vivo) return;
      equipoRef.current = info.id;
      setEquipo(info);

      // Correo de quien ya inició sesión en este equipo, para no pedirlo de nuevo.
      supabase.auth.getUser().then(({ data }) => {
        if (vivo && data.user?.email) setCorreo((c) => c || (data.user?.email ?? ""));
      });

      let guardado = localStorage.getItem(CLAVE_CODIGO);
      if (!guardado) {
        const r = await consultarEquipo(info.id);
        if (!vivo) return;
        if (r.estado === "aprobada" && r.codigo) {
          guardado = r.codigo;
        } else {
          if (r.estado === "sin_conexion") setError(MENSAJES.sin_conexion);
          setSolicitud(r.estado === "pendiente" ? "pendiente" : r.estado === "rechazada" ? "rechazada" : "ninguna");
          setEstado("bloqueada");
          return;
        }
      }

      const r = await consultarLicencia(guardado, info.id);
      if (!vivo) return;
      if (r === "sin_conexion") {
        // Sin internet se permite seguir unos días si la última verificación fue reciente.
        const ultimo = Number(localStorage.getItem(CLAVE_OK) ?? 0);
        if (Date.now() - ultimo < DIAS_SIN_CONEXION * 86400000) {
          setEstado("ok");
        } else {
          setError(MENSAJES.sin_conexion);
          setEstado("bloqueada");
        }
        return;
      }
      if (r.valida) {
        localStorage.setItem(CLAVE_CODIGO, guardado);
        localStorage.setItem(CLAVE_OK, String(Date.now()));
        setEstado("ok");
      } else {
        setError(MENSAJES[r.motivo] ?? MENSAJES.no_existe);
        setVerCodigo(true);
        setEstado("bloqueada");
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  // Mientras la solicitud está pendiente, se revisa cada 15 segundos si el dueño ya la aprobó.
  useEffect(() => {
    if (estado !== "bloqueada" || solicitud !== "pendiente") return;
    const t = setInterval(async () => {
      const eq = equipoRef.current;
      if (!eq) return;
      const r = await consultarEquipo(eq);
      if (r.estado === "aprobada" && r.codigo) {
        await activarCodigo(r.codigo, eq);
      } else if (r.estado === "rechazada") {
        setSolicitud("rechazada");
      }
    }, 15000);
    return () => clearInterval(t);
  }, [estado, solicitud, activarCodigo]);

  const activar = async () => {
    const c = codigo.trim().toUpperCase();
    if (!c) {
      setError("Escribe el código de licencia.");
      return;
    }
    setEnviando(true);
    setError(null);
    await activarCodigo(c, equipoRef.current);
    setEnviando(false);
  };

  const solicitar = async () => {
    if (!correo.trim()) return setError("Escribe tu correo.");
    if (!negocio.trim()) return setError("Escribe el nombre de tu negocio.");
    setEnviando(true);
    setError(null);
    const { data, error: err } = await supabase.rpc("solicitar_licencia", {
      p_equipo: equipoRef.current,
      p_correo: correo.trim(),
      p_cliente: negocio.trim(),
      p_telefono: telefono.trim() || undefined,
      p_sistema: equipo?.sistema ? `${equipo.nombre ?? ""} ${equipo.sistema}`.trim() : undefined,
    });
    setEnviando(false);
    if (err || !data) return setError(MENSAJES.sin_conexion);
    const e = (data as { estado?: string }).estado;
    if (e === "pendiente") setSolicitud("pendiente");
    else if (e === "correo_invalido") setError("Ese correo no parece válido. Revísalo.");
    else if (e === "nombre_requerido") setError("Escribe el nombre de tu negocio.");
    else if (e === "ya_tiene") {
      const r = await consultarEquipo(equipoRef.current);
      if (r.estado === "aprobada" && r.codigo) await activarCodigo(r.codigo, equipoRef.current);
    } else setError("No se pudo enviar la solicitud. Inténtalo de nuevo.");
  };

  const copiarEquipo = async () => {
    try {
      await navigator.clipboard.writeText(equipo?.id ?? "");
    } catch {
      /* sin permiso para copiar */
    }
  };

  if (estado === "normal" || estado === "ok") return null;

  if (estado === "revisando") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background text-sm text-muted-foreground">
        Verificando licencia…
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-background p-4">
      <GlassPanel className="w-full max-w-md space-y-4 p-6">
        <h1 className="flex items-center gap-2 font-display text-2xl text-foreground">
          <ShieldCheck className="h-6 w-6 shrink-0 text-primary" /> Activa Gosaryc
        </h1>

        <div className="space-y-2 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
          <p className="font-medium text-foreground">Cómo funciona tu licencia</p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            <li>Para tener acceso ilimitado a Gosaryc se necesita una licencia.</li>
            <li>Empiezas con una prueba gratis de 30 días, con todo incluido.</li>
            <li>Si necesitas más tiempo, puedes pedir días adicionales una sola vez; se aprueban según tu nivel de interés.</li>
            <li>
              Si te gusta el programa, la licencia cuesta solo <strong className="text-foreground">$100.000 COP al año</strong>:
              incluye soporte, instalación local en tu computador y uso en la web.
            </li>
          </ul>
        </div>

        <button
          onClick={copiarEquipo}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-glass-border bg-glass/30 px-3 py-2.5 text-left"
        >
          <span className="min-w-0">
            <span className="block text-xs text-muted-foreground">Código de este equipo</span>
            <span className="block truncate font-mono text-sm text-foreground">{equipo?.id ?? "…"}</span>
          </span>
          <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>

        {solicitud === "pendiente" ? (
          <div className="space-y-2 rounded-lg border border-glass-border bg-glass/30 p-4 text-sm">
            <p className="font-medium text-foreground">Solicitud enviada</p>
            <p className="text-muted-foreground">
              Estamos esperando la aprobación de tu licencia. Esta pantalla se abrirá sola cuando esté lista; no necesitas
              cerrar el programa.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              {solicitud === "rechazada"
                ? "Tu solicitud no fue aprobada. Comunícate con el creador de Gosaryc."
                : "Pide tu prueba de 30 días o tu licencia anual: la aprobamos y se activa en este equipo."}
            </p>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Tu correo</span>
              <input
                className={campo}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="correo@ejemplo.com"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Nombre de tu negocio</span>
              <input className={campo} value={negocio} onChange={(e) => setNegocio(e.target.value)} placeholder="Mi negocio" />
            </label>
            <label className="block space-y-1">
              <span className="text-xs text-muted-foreground">Teléfono (opcional)</span>
              <input
                className={campo}
                inputMode="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="3001234567"
              />
            </label>
            <button
              onClick={solicitar}
              disabled={enviando}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              <Send className="h-4 w-4" /> {enviando ? "Enviando…" : "Solicitar licencia"}
            </button>
          </>
        )}

        {error && <p className="break-words text-sm text-destructive">{error}</p>}

        <div className="border-t border-glass-border pt-3">
          {verCodigo ? (
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">Código de licencia</span>
                <input
                  className={`${campo} font-mono uppercase`}
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="GOS-XXXX-XXXX-XXXX"
                  autoCapitalize="characters"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </label>
              <button
                onClick={activar}
                disabled={enviando}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-glass-border px-4 py-3 text-sm text-foreground hover:bg-glass/60 disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4" /> {enviando ? "Verificando…" : "Activar con código"}
              </button>
            </div>
          ) : (
            <button onClick={() => setVerCodigo(true)} className="text-sm text-primary hover:underline">
              Ya tengo un código de licencia
            </button>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}
