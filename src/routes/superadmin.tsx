import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarPlus, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { DianAdmin } from "@/components/app/DianAdmin";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";
import { useUsuariosEnLinea } from "@/hooks/use-presencia";
import { esCuentaMaestra } from "@/lib/cuenta-maestra";

export const Route = createFileRoute("/superadmin")({
  head: () => ({ meta: [{ title: "Panel del dueño" }] }),
  component: SuperAdminPage,
});

type Empresa = Tables<"negocio_config">;
type Suscripcion = Tables<"suscripciones_negocio">;

const PLANES: { clave: string; texto: string }[] = [
  { clave: "prueba", texto: "Prueba" },
  { clave: "emprendedor", texto: "Emprendedor" },
  { clave: "pro", texto: "Pro" },
  { clave: "anual", texto: "Licencia anual ($100.000)" },
];

type Pago = Tables<"pagos_licencia">;
type EnvioLicencia = { correo: string; telefono: string; mensaje: string };

const campo =
  "rounded-lg border border-glass-border bg-glass/40 px-3 py-2 text-base text-foreground outline-none focus:border-primary/50";

const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const sumarDias = (fecha: string, dias: number) => {
  const d = new Date(`${fecha}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function SuperAdminPage() {
  const { session, loading } = useAuth();
  const nav = useNavigate();
  const [permitido, setPermitido] = useState<boolean | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [subs, setSubs] = useState<Record<string, Suscripcion>>({});
  const [hoy, setHoy] = useState("");
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [envio, setEnvio] = useState<EnvioLicencia | null>(null);
  const [busca, setBusca] = useState("");
  const enLinea = useUsuariosEnLinea(permitido === true);

  useEffect(() => {
    setHoy(hoyIso());
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      nav({ to: "/login", search: { redirect: "/superadmin", mode: "signin" }, replace: true });
      return;
    }
    if (!esCuentaMaestra(session.user?.email)) {
      setPermitido(false);
      return;
    }
    supabase.rpc("es_superadmin").then(({ data }) => setPermitido(data === true));
  }, [loading, session, nav]);

  const cargar = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      supabase.from("negocio_config").select("*").order("created_at", { ascending: false }),
      supabase.from("suscripciones_negocio").select("*"),
      supabase.from("pagos_licencia").select("*").eq("estado", "pendiente").order("created_at", { ascending: true }),
    ]);
    if (a.error || b.error) toast.error("No se pudieron cargar las empresas.");
    setPagos(c.data ?? []);
    setEmpresas(a.data ?? []);
    const mapa: Record<string, Suscripcion> = {};
    for (const s of b.data ?? []) mapa[s.owner_id] = s;
    setSubs(mapa);
  }, []);

  useEffect(() => {
    if (permitido) cargar();
  }, [permitido, cargar]);

  const actualizar = async (ownerId: string, cambios: Partial<Pick<Suscripcion, "plan" | "estado" | "vence_el">>) => {
    const { error } = await supabase.rpc("admin_actualizar_suscripcion", {
      p_owner: ownerId,
      p_plan: cambios.plan ?? undefined,
      p_estado: cambios.estado ?? undefined,
      p_vence_el: cambios.vence_el ?? undefined,
    });
    if (error) return toast.error("No se pudo guardar el cambio.");
    toast.success("Cambio guardado.");
    cargar();
  };

  // Genera la clave única del negocio (anula la anterior) y deja listo el envío por WhatsApp y correo.
  const generarClave = async (ownerId: string, nombre: string, correo: string, telefono: string) => {
    const { data, error } = await supabase.rpc("generar_clave_activacion", { p_owner: ownerId });
    if (error || !data) return toast.error(error?.message || "No se pudo generar la clave.");
    setEnvio({
      correo,
      telefono,
      mensaje: `Hola ${nombre}, tu clave de activación de Gosaryc es ${data}. Pégala en el campo de renovación de tu licencia y pulsa Activar: quedará vigente por 1 año.`,
    });
    toast.success("Clave generada. Envíala al cliente.");
  };

  const verComprobante = async (p: Pago) => {
    if (!p.comprobante_url) return;
    const { data, error } = await supabase.storage.from("comprobantes_pago").createSignedUrl(p.comprobante_url, 300);
    if (error || !data) return toast.error("No se pudo abrir el comprobante.");
    window.open(data.signedUrl, "_blank", "noopener");
  };

  const aprobarPago = async (p: Pago) => {
    const { data, error } = await supabase.rpc("aprobar_pago_licencia", { p_id: p.id });
    if (error) return toast.error(error.message || "No se pudo aprobar el pago.");
    const r = (data ?? {}) as { correo?: string; vence_el?: string; tipo?: string };
    const emp = empresas.find((e) => e.owner_id === p.owner_id);
    const tel = emp?.whatsapp_cocina || emp?.telefono_pedidos || "";
    const detalle =
      r.tipo === "dias_extra"
        ? `Aprobamos tus días adicionales. Tu licencia vence el ${r.vence_el}.`
        : `Recibimos tu pago. Tu licencia anual de Gosaryc está activa desde hoy y vence el ${r.vence_el}.`;
    setEnvio({
      correo: r.correo ?? p.correo ?? "",
      telefono: tel,
      mensaje: `Hola${emp?.nombre ? ` ${emp.nombre}` : ""}, ${detalle}`,
    });
    toast.success("Pago aprobado. Envía la licencia al cliente.");
    cargar();
  };

  const rechazarPago = async (p: Pago) => {
    const { error } = await supabase.rpc("admin_rechazar_pago_licencia", { p_id: p.id });
    if (error) return toast.error("No se pudo rechazar el pago.");
    toast.success("Pago rechazado.");
    cargar();
  };

  const enviarWhatsapp = (x: EnvioLicencia) => {
    const t = x.telefono.replace(/\D/g, "");
    if (!t) return toast.error("Este negocio no tiene WhatsApp registrado.");
    const numero = t.length === 10 ? `57${t}` : t;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(x.mensaje)}`, "_blank", "noopener");
  };

  if (loading || permitido === null) {
    return <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">Verificando acceso…</div>;
  }

  if (!permitido) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <GlassPanel className="max-w-md space-y-3 p-8 text-center">
          <h1 className="font-display text-2xl text-foreground">Acceso restringido</h1>
          <p className="text-sm text-muted-foreground">Esta sección es solo para el dueño de la plataforma.</p>
          <Link to="/" className="text-sm text-primary">Volver al inicio</Link>
        </GlassPanel>
      </div>
    );
  }

  const q = busca.trim().toLowerCase();
  const visibles = empresas.filter((e) => !q || [e.nombre, e.ciudad].some((x) => (x ?? "").toLowerCase().includes(q)));
  const vencida = (s?: Suscripcion) => Boolean(hoy && s && s.vence_el < hoy);
  const activas = empresas.filter((e) => subs[e.owner_id ?? ""]?.estado === "activo" && !vencida(subs[e.owner_id ?? ""])).length;
  const suspendidas = empresas.filter((e) => subs[e.owner_id ?? ""]?.estado === "suspendido").length;
  const porVencer = empresas.filter((e) => {
    const s = subs[e.owner_id ?? ""];
    return Boolean(hoy && s && s.estado === "activo" && s.vence_el >= hoy && s.vence_el <= sumarDias(hoy, 7));
  }).length;

  const tarjetas = [
    { t: "Personas registradas", v: empresas.length },
    { t: "Activas", v: activas },
    { t: "Suspendidas", v: suspendidas },
    { t: "Vencen en 7 días", v: porVencer },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <div className="space-y-1">
        <Link to="/restaurante" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Volver a mi panel
        </Link>
        <h1 className="flex items-center gap-2 font-display text-3xl text-foreground">
          <ShieldCheck className="h-7 w-7 text-primary" /> Panel del dueño
        </h1>
        <p className="text-sm text-muted-foreground">Todas las empresas registradas, su plan y su estado de pago.</p>
        <Link to="/licencias" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary">
          <ShieldCheck className="h-4 w-4" /> Licencias de instalaciones locales
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tarjetas.map((c) => (
          <GlassPanel key={c.t} className="p-4">
            <p className="text-xs text-muted-foreground">{c.t}</p>
            <p className="text-2xl font-medium text-foreground">{c.v}</p>
          </GlassPanel>
        ))}
      </div>

      {(pagos.length > 0 || envio) && (
        <GlassPanel className="space-y-3 p-4">
          <h2 className="font-medium text-foreground">Licencias por enviar y solicitudes ({pagos.length})</h2>
          {envio && (
            <div className="space-y-2 rounded-lg border border-primary/40 bg-glass/30 p-3">
              <p className="text-sm text-foreground">Listo para enviar al administrador del negocio:</p>
              <p className="break-words text-xs text-muted-foreground">{envio.mensaje}</p>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => enviarWhatsapp(envio)} className="rounded-lg bg-primary px-3 py-2.5 text-xs font-medium text-primary-foreground">
                  Enviar por WhatsApp
                </button>
                {envio.correo && (
                  <a
                    href={`mailto:${envio.correo}?subject=${encodeURIComponent("Tu licencia de Gosaryc")}&body=${encodeURIComponent(envio.mensaje)}`}
                    className="rounded-lg border border-glass-border px-3 py-2.5 text-xs text-foreground"
                  >
                    Enviar por correo
                  </a>
                )}
                <button onClick={() => setEnvio(null)} className="rounded-lg border border-glass-border px-3 py-2.5 text-xs text-muted-foreground">
                  Cerrar
                </button>
              </div>
            </div>
          )}
          {pagos.map((p) => {
            const emp = empresas.find((e) => e.owner_id === p.owner_id);
            return (
              <div key={p.id} className="space-y-2 rounded-lg border border-glass-border bg-glass/30 p-3">
                <p className="break-words font-medium text-foreground">{emp?.nombre ?? "Negocio"}</p>
                <p className="break-all text-sm text-foreground">{p.correo}</p>
                <p className="text-xs text-muted-foreground">
                  {p.tipo === "anual" ? "Licencia anual · $100.000" : "Solicita días adicionales (única vez)"} ·{" "}
                  {new Date(p.created_at).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {p.comprobante_url && (
                    <button onClick={() => verComprobante(p)} className="rounded-lg border border-glass-border px-3 py-2.5 text-xs text-foreground">
                      Ver comprobante
                    </button>
                  )}
                  <button onClick={() => aprobarPago(p)} className="rounded-lg bg-primary px-3 py-2.5 text-xs font-medium text-primary-foreground">
                    Aprobar y activar
                  </button>
                  <button onClick={() => rechazarPago(p)} className="rounded-lg border border-glass-border px-3 py-2.5 text-xs text-foreground">
                    Rechazar
                  </button>
                </div>
              </div>
            );
          })}
        </GlassPanel>
      )}

      <GlassPanel className="space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm font-medium text-foreground">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Usando el programa ahora
          </p>
          <p className="text-2xl font-medium text-foreground">{enLinea.length}</p>
        </div>
        {enLinea.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nadie conectado en este momento.</p>
        ) : (
          <ul className="divide-y divide-glass-border">
            {Object.entries(
              enLinea.reduce<Record<string, { tipo: string; personas: number }>>((acc, u) => {
                const a = acc[u.negocio] ?? { tipo: u.tipo, personas: 0 };
                a.personas += 1;
                acc[u.negocio] = a;
                return acc;
              }, {}),
            ).map(([negocio, v]) => (
              <li key={negocio} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0 break-words text-foreground">
                  {negocio}
                  {v.tipo ? <span className="text-xs text-muted-foreground"> · {v.tipo}</span> : null}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {v.personas} {v.personas === 1 ? "persona" : "personas"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>

      <input className={`${campo} w-full`} placeholder="Buscar empresa por nombre o ciudad" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <DianAdmin />

      {visibles.length === 0 && <p className="text-sm text-muted-foreground">No hay empresas para mostrar.</p>}

      <div className="space-y-3">
        {visibles.map((e) => {
          const oid = e.owner_id;
          if (!oid) return null;
          const s = subs[oid];
          const plan = s?.plan ?? "prueba";
          const estado = s?.estado ?? "activo";
          const vence = s?.vence_el ?? "";
          const base = vence && vence > hoy ? vence : hoy;
          const diasRestantes =
            vence && hoy
              ? Math.round((new Date(`${vence}T00:00:00`).getTime() - new Date(`${hoy}T00:00:00`).getTime()) / 86400000)
              : null;
          const planTexto = PLANES.find((p) => p.clave === plan)?.texto ?? plan;
          const contacto = [e.telefono_pedidos, e.whatsapp_cocina, e.instagram, e.sitio_web].filter(Boolean).join(" · ");
          return (
            <GlassPanel key={e.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="break-words font-medium text-foreground">{e.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {resolverTipoNegocio(e.tipo_negocio).etiqueta}
                    {e.ciudad ? ` · ${e.ciudad}` : ""} · Registrada el {new Date(e.created_at).toLocaleDateString("es-CO")}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs ${
                    estado === "suspendido" || vencida(s) ? "border-destructive/50 text-destructive" : "border-glass-border text-muted-foreground"
                  }`}
                >
                  {estado === "suspendido" ? "Suspendida por falta de pago" : vencida(s) ? "Vencida" : "Activa"}
                </span>
              </div>
              <div className="grid gap-1 rounded-lg border border-glass-border bg-glass/30 p-3 text-sm sm:grid-cols-2">
                <p className="break-words text-foreground">
                  <span className="text-xs text-muted-foreground">Contacto: </span>
                  {contacto || "Sin datos de contacto"}
                </p>
                <p className="text-foreground">
                  <span className="text-xs text-muted-foreground">Licencia: </span>
                  {planTexto}
                </p>
                <p className={diasRestantes !== null && diasRestantes < 0 ? "text-destructive" : "text-foreground"}>
                  <span className="text-xs text-muted-foreground">Días de licencia: </span>
                  {diasRestantes === null
                    ? "Sin fecha"
                    : diasRestantes < 0
                      ? `Venció hace ${-diasRestantes} ${-diasRestantes === 1 ? "día" : "días"}`
                      : `${diasRestantes} ${diasRestantes === 1 ? "día" : "días"}`}
                </p>
                <p className="text-foreground">
                  <span className="text-xs text-muted-foreground">Vence el: </span>
                  {vence || "Sin fecha"}
                </p>
                <p className="text-foreground">
                  <span className="text-xs text-muted-foreground">Inicio: </span>
                  {s?.inicio ?? "Sin fecha"}
                </p>
                <p className="break-all text-foreground">
                  <span className="text-xs text-muted-foreground">Correo titular: </span>
                  {s?.correo_titular ?? "Sin correo"}
                </p>
              </div>
              <button
                onClick={() => generarClave(oid, e.nombre, s?.correo_titular ?? "", e.whatsapp_cocina || e.telefono_pedidos || "")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-xs font-medium text-primary-foreground"
              >
                <KeyRound className="h-3.5 w-3.5" /> Generar clave de renovación (1 año)
              </button>
              <div className="flex flex-wrap items-end gap-3">
                <label className="space-y-1">
                  <span className="block text-xs text-muted-foreground">Plan</span>
                  <select className={campo} value={plan} onChange={(ev) => actualizar(oid, { plan: ev.target.value })}>
                    {PLANES.map((p) => (
                      <option key={p.clave} value={p.clave}>{p.texto}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="block text-xs text-muted-foreground">Vence el</span>
                  <input className={campo} type="date" value={vence} onChange={(ev) => ev.target.value && actualizar(oid, { vence_el: ev.target.value })} />
                </label>
                <button
                  onClick={() => hoy && actualizar(oid, { vence_el: sumarDias(base, 30), estado: "activo" })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-glass-border px-3 py-2.5 text-xs text-foreground hover:bg-glass/60"
                >
                  <CalendarPlus className="h-3.5 w-3.5" /> +30 días
                </button>
                <button
                  onClick={() => hoy && actualizar(oid, { plan: "anual", vence_el: sumarDias(base, 365), estado: "activo" })}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2.5 text-xs font-medium text-primary hover:bg-primary/20"
                >
                  <CalendarPlus className="h-3.5 w-3.5" /> Activar 1 año (365 días)
                </button>
                <label className="space-y-1">
                  <span className="block text-xs text-muted-foreground">Días de gracia</span>
                  <select
                    className={campo}
                    value={String((s as { dias_gracia?: number | null } | undefined)?.dias_gracia ?? 3)}
                    onChange={async (ev) => {
                      const d = Math.max(0, Math.min(30, Number(ev.target.value) || 0));
                      const { error } = await supabase.from("suscripciones_negocio").update({ dias_gracia: d } as never).eq("owner_id", oid);
                      if (error) return toast.error("No se pudo actualizar los días de gracia.");
                      toast.success(`Periodo de gracia fijado en ${d} días.`);
                      void cargar();
                    }}
                  >
                    {[0, 3, 5, 7, 15].map((d) => (
                      <option key={d} value={String(d)}>{d} días</option>
                    ))}
                  </select>
                </label>
                <button
                  onClick={() => actualizar(oid, { estado: estado === "activo" ? "suspendido" : "activo" })}
                  className={`rounded-lg px-3 py-2.5 text-xs font-medium ${
                    estado === "activo" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
                  }`}
                >
                  {estado === "activo" ? "Suspender" : "Reactivar"}
                </button>
              </div>
            </GlassPanel>
          );
        })}
      </div>
    </div>
  );
}
