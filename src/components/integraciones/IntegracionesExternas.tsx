import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2, Plug, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";
import { limpiarTexto } from "@/lib/validacion-publica";

type Proveedor = "simit_runt" | "riesgo";
type Conf = { activo: boolean; url_api: string; token: string };
const VACIA: Conf = { activo: false, url_api: "", token: "" };

const SECTORES_VEHICULAR = ["concesionario", "taller", "taller_motos", "alquiler_vehiculos", "transporte"];
const SECTORES_RIESGO = ["concesionario", "inmobiliaria", "prestamos"];

function claveSector(tipo: string | null | undefined): string {
  return String(resolverTipoNegocio(tipo ?? "") ?? tipo ?? "");
}
export function aplicaVehicular(tipo: string | null | undefined): boolean {
  return SECTORES_VEHICULAR.includes(claveSector(tipo));
}
export function aplicaRiesgo(tipo: string | null | undefined): boolean {
  return SECTORES_RIESGO.includes(claveSector(tipo));
}

function usarConf(proveedor: Proveedor) {
  const [conf, setConf] = useState<Conf>(VACIA);
  const [cargando, setCargando] = useState(true);
  const cargar = useCallback(async () => {
    const { data } = await supabase.from("integraciones_negocio").select("activo,url_api,token").eq("proveedor", proveedor).maybeSingle();
    if (data) setConf({ activo: data.activo, url_api: data.url_api ?? "", token: data.token ?? "" });
    setCargando(false);
  }, [proveedor]);
  useEffect(() => { void cargar(); }, [cargar]);
  return { conf, setConf, cargando };
}

/** TRM oficial del día (Datos Abiertos, Superfinanciera / Banco de la República). */
export function TrmDelDia() {
  const [trm, setTrm] = useState<{ valor: number; desde: string } | null>(null);
  const [fallo, setFallo] = useState(false);
  useEffect(() => {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 8000);
    fetch("https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1&$order=vigenciadesde%20DESC", { signal: ctl.signal })
      .then((r) => r.json() as Promise<Array<{ valor?: string; vigenciadesde?: string }>>)
      .then((f) => {
        const v = Number(f[0]?.valor);
        if (Number.isFinite(v) && v > 0) setTrm({ valor: v, desde: String(f[0]?.vigenciadesde ?? "").slice(0, 10) });
        else setFallo(true);
      })
      .catch(() => setFallo(true))
      .finally(() => clearTimeout(t));
    return () => { clearTimeout(t); ctl.abort(); };
  }, []);
  return (
    <p className="inline-flex items-center gap-2 rounded-full border border-glass-border px-3 py-1 text-xs tabular-nums">
      <span className="text-muted-foreground">TRM oficial</span>
      {trm ? (
        <b>{new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 2 }).format(trm.valor)} <span className="font-normal text-muted-foreground">({trm.desde})</span></b>
      ) : fallo ? <span className="text-muted-foreground">no disponible ahora</span> : <Loader2 className="h-3 w-3 animate-spin" />}
    </p>
  );
}

const inp = "w-full rounded-lg border border-glass-border bg-background/60 px-3 py-2 text-base";

function Bloque({ proveedor, titulo, texto }: { proveedor: Proveedor; titulo: string; texto: string }) {
  const { conf, setConf, cargando } = usarConf(proveedor);
  const [guardando, setGuardando] = useState(false);
  const guardar = async () => {
    if (conf.url_api && !/^https:\/\//.test(conf.url_api)) return toast.error("La dirección de la API debe empezar con https://");
    setGuardando(true);
    const { error } = await supabase.from("integraciones_negocio").upsert(
      { proveedor, activo: conf.activo, url_api: conf.url_api || null, token: conf.token || null, updated_at: new Date().toISOString() },
      { onConflict: "owner_id,proveedor" },
    );
    setGuardando(false);
    if (error) toast.error("No se pudo guardar: " + error.message);
    else toast.success("Integración guardada");
  };
  if (cargando) return null;
  return (
    <div className="space-y-2 rounded-xl border border-glass-border p-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={conf.activo} onChange={(e) => setConf({ ...conf, activo: e.target.checked })} /> {titulo}
      </label>
      <p className="text-xs text-muted-foreground">{texto}</p>
      {conf.activo && (
        <>
          <input className={inp} placeholder="Dirección de la API de tu proveedor (https://…)" maxLength={500} value={conf.url_api} onChange={(e) => setConf({ ...conf, url_api: limpiarTexto(e.target.value, 500) })} />
          <input className={inp} type="password" autoComplete="off" placeholder="Token / API Key propia" maxLength={2000} value={conf.token} onChange={(e) => setConf({ ...conf, token: e.target.value.trim() })} />
        </>
      )}
      <button type="button" disabled={guardando} onClick={guardar} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
        {guardando ? "Guardando…" : "Guardar"}
      </button>
    </div>
  );
}

/** Consulta de multas y estado vehicular: enlace oficial o API propia si hay token. */
export function ConsultaVehicular({ placaInicial = "" }: { placaInicial?: string }) {
  const { negocio } = useNegocio();
  const { conf } = usarConf("simit_runt");
  const [placa, setPlaca] = useState(placaInicial.toUpperCase());
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState("");
  if (!aplicaVehicular(negocio?.tipo_negocio)) return null;
  const p = placa.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  const consultar = async () => {
    if (p.length < 5) return toast.error("Escribe la placa");
    if (conf.activo && conf.url_api && conf.token) {
      setCargando(true);
      setResultado("");
      try {
        const r = await fetch(`${conf.url_api}${conf.url_api.includes("?") ? "&" : "?"}placa=${encodeURIComponent(p)}`, { headers: { Authorization: `Bearer ${conf.token}` } });
        const t = await r.text();
        setResultado(r.ok ? t.slice(0, 1500) : `El proveedor respondió con error ${r.status}.`);
        return;
      } catch {
        setResultado("No se pudo conectar con tu proveedor; abrimos la consulta oficial.");
      } finally {
        setCargando(false);
      }
    }
    window.open("https://www.fcm.org.co/simit/#/estado-cuenta", "_blank", "noopener,noreferrer");
  };
  return (
    <div className="space-y-2 rounded-xl border border-glass-border p-3">
      <p className="text-sm font-medium">Multas y estado vehicular (SIMIT / RUNT)</p>
      <div className="flex flex-wrap gap-2">
        <input className={inp + " max-w-[10rem] uppercase"} placeholder="Placa" maxLength={8} value={placa} onChange={(e) => setPlaca(e.target.value.toUpperCase())} />
        <button type="button" onClick={consultar} disabled={cargando} className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />} Consultar Multas y Estado Vehicular
        </button>
        <a className="rounded-lg border border-glass-border px-3 py-2 text-sm" href="https://www.runt.com.co/consultaCiudadana/#/consultaVehiculo" target="_blank" rel="noopener noreferrer">RUNT oficial</a>
      </div>
      {resultado && <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background/60 p-2 text-xs">{resultado}</pre>}
    </div>
  );
}

/** Selector del Preaprobado: cálculo interno o central de riesgo con consentimiento Habeas Data. */
export function ModoRiesgo({ documento = "" }: { documento?: string }) {
  const { negocio } = useNegocio();
  const { conf } = usarConf("riesgo");
  const [modo, setModo] = useState<"interno" | "central">("interno");
  const [consiente, setConsiente] = useState(false);
  const [doc, setDoc] = useState(documento);
  const [cargando, setCargando] = useState(false);
  const [resultado, setResultado] = useState("");
  if (!aplicaRiesgo(negocio?.tipo_negocio)) return null;
  const disponible = conf.activo && !!conf.url_api && !!conf.token;
  const consultar = async () => {
    const d = doc.replace(/[^0-9]/g, "");
    if (!consiente) return toast.error("Se requiere el consentimiento Habeas Data del cliente");
    if (d.length < 5) return toast.error("Escribe el documento del cliente");
    setCargando(true);
    try {
      const r = await fetch(conf.url_api, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${conf.token}` },
        body: JSON.stringify({ documento: d, consentimiento_habeas_data: true }),
      });
      setResultado(r.ok ? (await r.text()).slice(0, 1500) : `La central respondió con error ${r.status}.`);
    } catch {
      setResultado("No se pudo conectar con la central de riesgo. Usa el cálculo rápido interno.");
    } finally {
      setCargando(false);
    }
  };
  return (
    <div className="space-y-2 rounded-xl border border-glass-border p-3">
      <p className="text-xs font-medium text-muted-foreground">Método de análisis</p>
      <label className="flex items-center gap-2 text-sm"><input type="radio" checked={modo === "interno"} onChange={() => setModo("interno")} /> Cálculo rápido interno (35 % de capacidad)</label>
      <label className="flex items-center gap-2 text-sm"><input type="radio" checked={modo === "central"} onChange={() => setModo("central")} /> Consulta Central de Riesgo (Datacrédito / TransUnion)</label>
      {modo === "central" && (disponible ? (
        <div className="space-y-2">
          <input className={inp} inputMode="numeric" placeholder="Documento del cliente" maxLength={15} value={doc} onChange={(e) => setDoc(e.target.value.replace(/[^0-9]/g, ""))} />
          <label className="flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={consiente} onChange={(e) => setConsiente(e.target.checked)} /> El cliente autorizó la consulta (Habeas Data, Ley 1266 de 2008).</label>
          <button type="button" onClick={consultar} disabled={cargando} className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60">
            {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Consultar central de riesgo
          </button>
          {resultado && <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-background/60 p-2 text-xs">{resultado}</pre>}
        </div>
      ) : (
        <p className="text-xs text-amber-600">Aún no configuras tu API Key. Actívala en Configuración, «Integraciones Externas (APIs)». Mientras tanto usa el cálculo interno.</p>
      ))}
    </div>
  );
}

/** Pestaña de Configuración: solo aparece en los sectores que usan conectores propios. */
export function IntegracionesExternas() {
  const { negocio } = useNegocio();
  const tipo = negocio?.tipo_negocio;
  const veh = aplicaVehicular(tipo);
  const rie = aplicaRiesgo(tipo);
  if (!veh && !rie) return null;
  return (
    <GlassPanel className="space-y-3 p-5">
      <h3 className="flex items-center gap-2 font-display text-lg"><Plug className="h-5 w-5 text-primary" /> Integraciones Externas (APIs)</h3>
      <p className="text-xs text-muted-foreground">Conecta tus propias credenciales. Quedan guardadas solo para tu negocio.</p>
      <TrmDelDia />
      {veh && (
        <>
          <Bloque proveedor="simit_runt" titulo="SIMIT y Tránsito / RUNT con API propia" texto="Sin token, el botón de consulta abre la página oficial de SIMIT." />
          <ConsultaVehicular />
        </>
      )}
      {rie && <Bloque proveedor="riesgo" titulo="Central de riesgo (Datacrédito / TransUnion)" texto="Se usa en el Preaprobado del CRM, siempre con consentimiento Habeas Data del cliente." />}
    </GlassPanel>
  );
}
