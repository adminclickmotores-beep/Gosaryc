import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarPlus, Copy, Download, KeyRound, MessageCircle, Plus, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { DianAdmin } from "@/components/app/DianAdmin";

export const Route = createFileRoute("/licencias")({
  head: () => ({ meta: [{ title: "Licencias" }] }),
  component: LicenciasPage,
});

type Licencia = Tables<"licencias">;
type Solicitud = Tables<"solicitudes_licencia">;
type EventoInstalar = Event & { prompt: () => Promise<void> };

const campo =
  "w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/50";
const botonSec =
  "inline-flex items-center gap-1.5 rounded-lg border border-glass-border px-3 py-2.5 text-xs text-foreground hover:bg-glass/60";

const aIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const sumarDias = (fecha: string, dias: number) => {
  const d = new Date(`${fecha}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return aIso(d);
};

const diasEntre = (hasta: string, desde: string) =>
  Math.round((new Date(`${hasta}T00:00:00`).getTime() - new Date(`${desde}T00:00:00`).getTime()) / 86400000);

function LicenciasPage() {
  const { session, loading } = useAuth();
  const nav = useNavigate();
  const [permitido, setPermitido] = useState<boolean | null>(null);
  const [lista, setLista] = useState<Licencia[]>([]);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [hoy, setHoy] = useState("");
  const [busca, setBusca] = useState("");
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [tipoNueva, setTipoNueva] = useState<"prueba" | "anual">("prueba");
  const [diasPrueba, setDiasPrueba] = useState("30");
  const [diasLibres, setDiasLibres] = useState<Record<string, string>>({});
  const [abierta, setAbierta] = useState<string | null>(null);
  const [instalador, setInstalador] = useState<EventoInstalar | null>(null);

  useEffect(() => {
    setHoy(aIso(new Date()));
  }, []);

  // Esta pantalla se instala en el celular como app propia ("Licencias").
  useEffect(() => {
    const enlace = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const anterior = enlace?.getAttribute("href") ?? null;
    enlace?.setAttribute("href", "/manifest-licencias.webmanifest");
    const alPrompt = (e: Event) => {
      e.preventDefault();
      setInstalador(e as EventoInstalar);
    };
    window.addEventListener("beforeinstallprompt", alPrompt);
    return () => {
      window.removeEventListener("beforeinstallprompt", alPrompt);
      if (enlace && anterior) enlace.setAttribute("href", anterior);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      nav({ to: "/login", search: { redirect: "/licencias", mode: "signin" }, replace: true });
      return;
    }
    supabase.rpc("es_superadmin").then(({ data }) => setPermitido(data === true));
  }, [loading, session, nav]);

  const cargar = useCallback(async () => {
    const { data, error } = await supabase.from("licencias").select("*").order("vence_el", { ascending: true });
    if (error) toast.error("No se pudieron cargar las licencias.");
    setLista(data ?? []);
    const { data: sol } = await supabase
      .from("solicitudes_licencia")
      .select("*")
      .eq("estado", "pendiente")
      .order("created_at", { ascending: true });
    setSolicitudes(sol ?? []);
  }, []);

  // Aprueba la solicitud de un equipo: crea su licencia de prueba (30 días) o de 1 año.
  const aprobar = async (s: Solicitud, tipo: "prueba" | "anual") => {
    const { error } = await supabase.rpc("aprobar_solicitud_licencia", { p_id: s.id, p_tipo: tipo });
    if (error) return toast.error(error.message || "No se pudo aprobar la solicitud.");
    toast.success(tipo === "prueba" ? "Prueba de 30 días aprobada." : "Licencia de 1 año aprobada.");
    cargar();
  };

  const rechazar = async (s: Solicitud) => {
    const { error } = await supabase
      .from("solicitudes_licencia")
      .update({ estado: "rechazada", updated_at: new Date().toISOString() })
      .eq("id", s.id);
    if (error) return toast.error("No se pudo rechazar la solicitud.");
    toast.success("Solicitud rechazada.");
    cargar();
  };

  // Las solicitudes nuevas aparecen solas mientras la pantalla está abierta.
  useEffect(() => {
    if (!permitido) return;
    const t = setInterval(() => cargar(), 20000);
    return () => clearInterval(t);
  }, [permitido, cargar]);

  useEffect(() => {
    if (permitido) cargar();
  }, [permitido, cargar]);

  const crear = async () => {
    if (!cliente.trim()) return toast.error("Escribe el nombre del cliente.");
    const prueba = Math.min(Math.max(parseInt(diasPrueba) || 30, 1), 365);
    const dias = tipoNueva === "prueba" ? prueba : 365;
    const { error } = await supabase.from("licencias").insert({
      cliente: cliente.trim(),
      telefono: telefono.trim() || null,
      ciudad: ciudad.trim() || null,
      tipo: tipoNueva,
      inicio: hoy,
      vence_el: sumarDias(hoy, dias),
    });
    if (error) return toast.error("No se pudo crear la licencia.");
    setCliente("");
    setTelefono("");
    setCiudad("");
    toast.success(tipoNueva === "prueba" ? `Prueba de ${dias} días creada.` : "Licencia de 1 año creada.");
    cargar();
  };

  const actualizar = async (l: Licencia, cambios: Partial<Pick<Licencia, "tipo" | "estado" | "vence_el">>, mensaje: string) => {
    const { error } = await supabase
      .from("licencias")
      .update({ ...cambios, updated_at: new Date().toISOString() })
      .eq("id", l.id);
    if (error) return toast.error("No se pudo guardar el cambio.");
    toast.success(mensaje);
    cargar();
  };

  const baseFecha = (l: Licencia) => (l.vence_el > hoy ? l.vence_el : hoy);

  const extender = (l: Licencia, dias: number) =>
    actualizar(l, { vence_el: sumarDias(baseFecha(l), dias), estado: "activa" }, `Se extendió ${dias} días.`);

  const renovarAnual = (l: Licencia) =>
    actualizar(l, { tipo: "anual", vence_el: sumarDias(baseFecha(l), 365), estado: "activa" }, "Licencia renovada por 1 año.");

  const copiar = async (codigo: string) => {
    try {
      await navigator.clipboard.writeText(codigo);
      toast.success("Código copiado.");
    } catch {
      toast.error("No se pudo copiar el código.");
    }
  };

  const enviarWhatsapp = (l: Licencia) => {
    const t = (l.telefono ?? "").replace(/\D/g, "");
    if (!t) return;
    const numero = t.length === 10 ? `57${t}` : t;
    const msg = `Hola ${l.cliente}, tu código de licencia es ${l.codigo}. Vence el ${l.vence_el}.`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  };

  const instalar = async () => {
    if (!instalador) {
      let enMarco = true;
      try {
        enMarco = window.self !== window.top;
      } catch {
        enMarco = true;
      }
      if (enMarco) {
        window.open(window.location.href, "_blank", "noopener");
        toast.info("Se abrió en una pestaña nueva. Ahí pulsa de nuevo «Instalar app».");
        return;
      }
      toast.info("Abre el menú del navegador y elige «Instalar aplicación» o «Agregar a pantalla de inicio».");
      return;
    }
    await instalador.prompt();
    setInstalador(null);
  };

  if (loading || permitido === null) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Verificando acceso…</div>;
  }

  if (!permitido) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <GlassPanel className="max-w-md space-y-3 p-8 text-center">
          <h1 className="font-display text-2xl text-foreground">Acceso restringido</h1>
          <p className="text-sm text-muted-foreground">Las licencias solo las administra el dueño de la plataforma.</p>
          <Link to="/" className="text-sm text-primary">Volver al inicio</Link>
        </GlassPanel>
      </div>
    );
  }

  const q = busca.trim().toLowerCase();
  const visibles = lista.filter((l) => !q || [l.cliente, l.codigo, l.ciudad, l.telefono].some((x) => (x ?? "").toLowerCase().includes(q)));
  const vigentes = lista.filter((l) => l.estado === "activa" && l.vence_el >= hoy);
  const pruebas = vigentes.filter((l) => l.tipo === "prueba").length;
  const anuales = vigentes.filter((l) => l.tipo === "anual").length;
  const porVencer = vigentes.filter((l) => diasEntre(l.vence_el, hoy) <= 7).length;
  const vencidas = lista.filter((l) => l.vence_el < hoy).length;

  const tarjetas = [
    { t: "En prueba", v: pruebas },
    { t: "Licencia anual", v: anuales },
    { t: "Vencen en 7 días", v: porVencer },
    { t: "Vencidas", v: vencidas },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 px-4 py-6">
      <div className="space-y-1">
        <Link to="/superadmin" className="text-xs text-muted-foreground">Panel del dueño</Link>
        <h1 className="flex items-center gap-2 font-display text-2xl text-foreground sm:text-3xl">
          <ShieldCheck className="h-6 w-6 shrink-0 text-primary" /> Licencias
        </h1>
        <p className="text-sm text-muted-foreground">Da 30 días de prueba, extiéndelos y vende licencias de 1 año.</p>
      </div>

      <GlassPanel className="space-y-3 p-4">
        <h2 className="flex items-center gap-2 font-medium text-foreground"><Download className="h-4 w-4" /> Instalador de la app de licencias</h2>
        <p className="text-sm text-muted-foreground">Instala esta pantalla en tu celular o computador para abrirla como una app propia.</p>
        <button onClick={instalar} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
          <Download className="h-4 w-4" /> Instalar app
        </button>
        <button
          onClick={() => (window.history.length > 1 ? window.history.back() : nav({ to: "/superadmin" }))}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-glass-border px-4 py-3 text-sm text-foreground hover:bg-glass/60"
        >
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
      </GlassPanel>

      <div className="grid grid-cols-2 gap-3">
        {tarjetas.map((c) => (
          <GlassPanel key={c.t} className="p-4">
            <p className="text-xs text-muted-foreground">{c.t}</p>
            <p className="text-2xl font-medium text-foreground">{c.v}</p>
          </GlassPanel>
        ))}
      </div>

      {solicitudes.length > 0 && (
        <GlassPanel className="space-y-3 p-4">
          <h2 className="flex items-center gap-2 font-medium text-foreground">
            <Smartphone className="h-4 w-4" /> Solicitudes de licencia ({solicitudes.length})
          </h2>
          {solicitudes.map((s) => (
            <div key={s.id} className="space-y-2 rounded-lg border border-glass-border bg-glass/30 p-3">
              <p className="break-words font-medium text-foreground">{s.cliente}</p>
              <p className="break-all text-sm text-foreground">{s.correo}</p>
              <p className="break-words text-xs text-muted-foreground">
                {[s.telefono, s.sistema].filter(Boolean).join(" · ") || "Sin más datos"}
              </p>
              <p className="break-all font-mono text-xs text-muted-foreground">Equipo: {s.equipo_id}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(s.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => aprobar(s, "prueba")} className="rounded-lg bg-primary px-3 py-2.5 text-xs font-medium text-primary-foreground">
                  Prueba 30 días
                </button>
                <button onClick={() => aprobar(s, "anual")} className="rounded-lg bg-primary px-3 py-2.5 text-xs font-medium text-primary-foreground">
                  Licencia 1 año
                </button>
                <button onClick={() => rechazar(s)} className={botonSec}>Rechazar</button>
              </div>
            </div>
          ))}
        </GlassPanel>
      )}

      <DianAdmin />

      <GlassPanel className="space-y-3 p-4">
        <h2 className="flex items-center gap-2 font-medium text-foreground"><Plus className="h-4 w-4" /> Nueva licencia</h2>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Cliente o negocio *</span>
          <input className={campo} value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Teléfono (WhatsApp)</span>
            <input className={campo} inputMode="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="3001234567" />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Ciudad</span>
            <input className={campo} value={ciudad} onChange={(e) => setCiudad(e.target.value)} placeholder="Ciudad" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <button
            onClick={() => setTipoNueva("prueba")}
            className={`rounded-lg px-3 py-2.5 ${tipoNueva === "prueba" ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`}
          >
            Prueba de 30 días
          </button>
          <button
            onClick={() => setTipoNueva("anual")}
            className={`rounded-lg px-3 py-2.5 ${tipoNueva === "anual" ? "bg-primary text-primary-foreground" : "border border-glass-border text-muted-foreground"}`}
          >
            Licencia de 1 año
          </button>
        </div>
        {tipoNueva === "prueba" ? (
          <label className="block space-y-1">
            <span className="text-xs text-muted-foreground">Días exactos de prueba (1 a 365)</span>
            <input className={campo} inputMode="numeric" value={diasPrueba} onChange={(e) => setDiasPrueba(e.target.value)} placeholder="Ej. 3, 7, 15, 30, 60, 90" />
          </label>
        ) : (
          <p className="text-xs text-muted-foreground">La licencia de 1 año (365 días) solo la puede crear el Superadmin y la base de datos lo verifica.</p>
        )}
        <button onClick={crear} className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground hover:opacity-90">
          Crear y obtener código
        </button>
      </GlassPanel>

      <input className={campo} placeholder="Buscar por cliente, código o ciudad" value={busca} onChange={(e) => setBusca(e.target.value)} />
      {visibles.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay licencias para mostrar.</p>}

      <div className="space-y-3">
        {visibles.map((l) => {
          const dias = hoy ? diasEntre(l.vence_el, hoy) : 0;
          const vencida = Boolean(hoy) && dias < 0;
          const suspendida = l.estado === "suspendida";
          const critico = vencida || suspendida || dias <= 7;
          return (
            <GlassPanel key={l.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-medium text-foreground">{l.cliente}</p>
                  <p className="break-words text-xs text-muted-foreground">
                    {[l.ciudad, l.telefono].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                  </p>
                  {l.correo && <p className="break-all text-xs text-muted-foreground">{l.correo}</p>}
                  {l.equipo_id && <p className="break-all font-mono text-[11px] text-muted-foreground">Equipo: {l.equipo_id}</p>}
                </div>
                <span className="shrink-0 rounded-full border border-glass-border px-2.5 py-0.5 text-xs text-muted-foreground">
                  {l.tipo === "anual" ? "Anual" : "Prueba"}
                </span>
              </div>
              <button onClick={() => copiar(l.codigo)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-glass-border bg-glass/30 px-3 py-2.5 text-left">
                <span className="flex min-w-0 items-center gap-2 font-mono text-sm text-foreground">
                  <KeyRound className="h-4 w-4 shrink-0 text-primary" /> <span className="truncate">{l.codigo}</span>
                </span>
                <Copy className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
              <p className={`text-sm ${critico ? "text-destructive" : "text-foreground"}`}>
                {suspendida
                  ? "Suspendida"
                  : vencida
                    ? `Venció hace ${-dias} ${-dias === 1 ? "día" : "días"}`
                    : `Vence el ${l.vence_el} · faltan ${dias} ${dias === 1 ? "día" : "días"}`}
              </p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => renovarAnual(l)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-xs font-medium text-primary-foreground">
                  <RefreshCw className="h-3.5 w-3.5" /> Renovar 1 año
                </button>
                <button onClick={() => setAbierta(abierta === l.id ? null : l.id)} className={botonSec}>
                  <CalendarPlus className="h-3.5 w-3.5" /> Extender días
                </button>
                {l.telefono && (
                  <button onClick={() => enviarWhatsapp(l)} className={botonSec}>
                    <MessageCircle className="h-3.5 w-3.5" /> Enviar código
                  </button>
                )}
                <button
                  onClick={() => actualizar(l, { estado: suspendida ? "activa" : "suspendida" }, suspendida ? "Licencia reactivada." : "Licencia suspendida.")}
                  className={botonSec}
                >
                  {suspendida ? "Reactivar" : "Suspender"}
                </button>
              </div>
              {abierta === l.id && (
                <div className="flex flex-wrap gap-2 rounded-lg border border-glass-border bg-glass/30 p-3">
                  {[7, 15, 30, 60].map((d) => (
                    <button key={d} onClick={() => extender(l, d)} className={botonSec}>
                      + {d} días
                    </button>
                  ))}
                  <div className="flex w-full items-center gap-2">
                    <input
                      className={campo}
                      inputMode="numeric"
                      value={diasLibres[l.id] ?? ""}
                      onChange={(e) => setDiasLibres((x) => ({ ...x, [l.id]: e.target.value }))}
                      placeholder="Días exactos (ej. 3, 45, 90)"
                      aria-label="Días exactos para extender"
                    />
                    <button
                      onClick={() => {
                        const n = Math.min(Math.max(parseInt(diasLibres[l.id] ?? "") || 0, 1), 730);
                        if (!n) return toast.error("Escribe cuántos días quieres agregar.");
                        setDiasLibres((x) => ({ ...x, [l.id]: "" }));
                        extender(l, n);
                      }}
                      className={botonSec}
                    >
                      Extender días exactos
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {l.ultima_verificacion
                  ? `Última conexión de la instalación: ${new Date(l.ultima_verificacion).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}`
                  : "La instalación aún no ha verificado este código."}
              </p>
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}
