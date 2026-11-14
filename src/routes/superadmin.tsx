import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarPlus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";

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
];

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
  const [busca, setBusca] = useState("");

  useEffect(() => {
    setHoy(hoyIso());
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      nav({ to: "/login", search: { redirect: "/superadmin", mode: "signin" }, replace: true });
      return;
    }
    supabase.rpc("es_superadmin").then(({ data }) => setPermitido(data === true));
  }, [loading, session, nav]);

  const cargar = useCallback(async () => {
    const [a, b] = await Promise.all([
      supabase.from("negocio_config").select("*").order("created_at", { ascending: false }),
      supabase.from("suscripciones_negocio").select("*"),
    ]);
    if (a.error || b.error) toast.error("No se pudieron cargar las empresas.");
    setEmpresas(a.data ?? []);
    const mapa: Record<string, Suscripcion> = {};
    for (const s of b.data ?? []) mapa[s.owner_id] = s;
    setSubs(mapa);
  }, []);

  useEffect(() => {
    if (permitido) cargar();
  }, [permitido, cargar]);

  const actualizar = async (ownerId: string, cambios: Partial<Pick<Suscripcion, "plan" | "estado" | "vence_el">>) => {
    const { error } = await supabase
      .from("suscripciones_negocio")
      .upsert({ owner_id: ownerId, ...cambios, updated_at: new Date().toISOString() }, { onConflict: "owner_id" });
    if (error) return toast.error("No se pudo guardar el cambio.");
    toast.success("Cambio guardado.");
    cargar();
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
    { t: "Empresas", v: empresas.length },
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
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tarjetas.map((c) => (
          <GlassPanel key={c.t} className="p-4">
            <p className="text-xs text-muted-foreground">{c.t}</p>
            <p className="text-2xl font-medium text-foreground">{c.v}</p>
          </GlassPanel>
        ))}
      </div>

      <input className={`${campo} w-full`} placeholder="Buscar empresa por nombre o ciudad" value={busca} onChange={(e) => setBusca(e.target.value)} />

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
                  <CalendarPlus className="h-3.5 w-3.5" /> Extender 30 días
                </button>
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
