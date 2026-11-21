import { createFileRoute, useSearch, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

type TabId = "organization" | "team" | "account";
const TAB_IDS: TabId[] = ["organization", "team", "account"];
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { GlassSkeleton } from "@/components/ui-custom/GlassSkeleton";
import { PanelError } from "@/components/ui-custom/PanelError";

import { IconSettings, IconLogout } from "@/components/ui-custom/CustomIcon";
import { PageHexBadge } from "@/components/app/PageHexBadge";
import { Users as IconUsers } from "lucide-react";
import { EquipoPermisos } from "@/components/settings/EquipoPermisos";
import { ResumenCierreWhatsApp } from "@/components/restaurante/Reportes";
import { ThemeToggle } from "@/components/ui-custom/ThemeToggle";
import { BRAND } from "@/lib/brand";
import { autoComandaActivada, estadoApiLocal, fijarAutoComanda, fijarImpresionDirecta, fijarImpresoraCaja, fijarImpresoraCocina, guardarConfigImpresoras, impresionDirectaActivada, imprimirTirillaLocal, leerImpresoraCaja, leerImpresoraCocina } from "@/lib/impresion-local";

export const Route = createFileRoute("/_app/settings")({
  validateSearch: (s: Record<string, unknown>): { tab?: TabId } => {
    const raw = typeof s.tab === "string" ? s.tab : "";
    return (TAB_IDS as string[]).includes(raw) ? { tab: raw as TabId } : {};
  },
  component: Settings,
});

type OrgStats = {
  memberCount: number;
  inviteCount: number;
};

function Settings() {
  const { user, signOut } = useAuth();
  const search = useSearch({ from: "/_app/settings" });
  const navigate = useNavigate();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [fullName, setFullName] = useState("");
  const tab: TabId = search.tab ?? "organization";
  const setTab = (next: TabId) =>
    navigate({ to: "/settings", search: next === "organization" ? {} : { tab: next }, replace: true });

  const [stats, setStats] = useState<OrgStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!user) return;
      setLoading(true);
      setLoadError(null);
      try {
        const { data: p, error: pErr } = await supabase
          .from("profiles")
          .select("default_org_id, full_name")
          .eq("id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (pErr) throw pErr;
        if (p?.full_name) setFullName(p.full_name);
        let currentOrg: string | null = p?.default_org_id ?? null;
        if (!currentOrg) {
          const { data: m } = await supabase
            .from("org_members")
            .select("org_id")
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();
          currentOrg = (m?.org_id as string | undefined) ?? null;
        }
        if (cancelled) return;
        if (!currentOrg) {
          setLoading(false);
          return;
        }
        setOrgId(currentOrg);
        const [orgRes, memberRes, inviteRes] = await Promise.all([
          supabase.from("organizations").select("name, slug").eq("id", currentOrg).maybeSingle(),
          supabase.from("org_members").select("id", { count: "exact", head: true }).eq("org_id", currentOrg),
          supabase.from("org_invites").select("id", { count: "exact", head: true }).eq("org_id", currentOrg).is("accepted_at", null),
        ]);
        if (cancelled) return;
        const org = orgRes.data;
        if (org) {
          setOrgName(org.name ?? "");
          setOrgSlug(org.slug ?? "");
        }
        setStats({ memberCount: memberRes.count ?? 0, inviteCount: inviteRes.count ?? 0 });
        setLoading(false);
      } catch (e) {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : "No se pudo cargar la configuración");
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, reloadKey]);

  return (
    <div className="space-y-8 pb-16">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-start gap-4">
          <PageHexBadge hue={88} size={26} icon={<IconSettings size={22} />} aria-label="Configuración" />
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Configuración</div>
            <h1 className="mt-1 font-display text-4xl tracking-tight">{orgName || "Mi negocio"}</h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Tu negocio, tu equipo y tu cuenta, en un solo lugar.
            </p>
          </div>
        </div>
        {stats && (
          <div className="flex flex-wrap items-center gap-2">
            <StatChip label="Miembros" value={String(stats.memberCount)} />
            <StatChip label="Invitaciones pendientes" value={String(stats.inviteCount)} muted={stats.inviteCount === 0} />
            {orgSlug && <StatChip label="Identificador" value={orgSlug} mono />}
          </div>
        )}
      </div>

      {/* tabs */}
      <div className="flex flex-wrap gap-1 rounded-2xl border border-glass-border bg-glass/40 p-1">
        {[
          { id: "organization", label: "Negocio", Icon: IconSettings },
          { id: "team", label: "Equipo y permisos", Icon: IconUsers },
          { id: "account", label: "Cuenta", Icon: IconLogout },
        ].map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id as TabId)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-glass-strong hover:text-foreground"
              }`}
            >
              <Icon size={16} /> {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <GlassSkeleton rows={6} />
      ) : loadError && tab === "organization" ? (
        <PanelError message="No se pudo cargar la configuración" onRetry={() => setReloadKey((k) => k + 1)} />
      ) : tab === "organization" ? (
        <div className="space-y-6">
          <PublicUrlCard orgId={orgId} />
          <TarjetaImpresion />
          <ResumenCierreWhatsApp />
        </div>
      ) : tab === "team" ? (
        <EquipoPermisos />
      ) : (
        <AccountTab email={user?.email ?? ""} fullName={fullName} orgName={orgName} signOut={signOut} />
      )}
    </div>
  );
}

function StatChip({ label, value, mono, muted }: { label: string; value: string; mono?: boolean; muted?: boolean }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass/50 px-3 py-1.5">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className={`text-sm ${mono ? "font-mono text-xs" : ""} ${muted ? "text-muted-foreground" : "text-foreground"}`}>{value}</span>
    </div>
  );
}

function TarjetaImpresion() {
  const [directa, setDirecta] = useState(() => impresionDirectaActivada());
  const [auto, setAuto] = useState(() => autoComandaActivada());
  const [caja, setCaja] = useState(() => leerImpresoraCaja());
  const [cocina, setCocina] = useState(() => leerImpresoraCocina());
  const [impresoras, setImpresoras] = useState<string[]>([]);
  const [predeterminada, setPredeterminada] = useState("");
  const [msg, setMsg] = useState("");
  const [probando, setProbando] = useState<"caja" | "cocina" | null>(null);

  useEffect(() => {
    (async () => {
      const est = await estadoApiLocal();
      if (!est.disponible) return;
      setImpresoras(est.impresoras);
      setPredeterminada(est.predeterminada);
      if (est.impresoraCaja) {
        setCaja(est.impresoraCaja);
        fijarImpresoraCaja(est.impresoraCaja);
      }
      if (est.impresoraCocina) {
        setCocina(est.impresoraCocina);
        fijarImpresoraCocina(est.impresoraCocina);
      }
    })();
  }, []);

  const cambiar = (v: boolean) => {
    setDirecta(v);
    fijarImpresionDirecta(v);
  };
  const cambiarAuto = (v: boolean) => {
    setAuto(v);
    fijarAutoComanda(v);
  };
  const elegir = (cual: "caja" | "cocina", nombre: string) => {
    if (cual === "caja") {
      setCaja(nombre);
      fijarImpresoraCaja(nombre);
    } else {
      setCocina(nombre);
      fijarImpresoraCocina(nombre);
    }
    const nc = cual === "caja" ? nombre : caja;
    const no = cual === "cocina" ? nombre : cocina;
    void guardarConfigImpresoras(nc, no);
  };
  const probar = async (cual: "caja" | "cocina") => {
    setProbando(cual);
    setMsg("Buscando la API local…");
    const est = await estadoApiLocal();
    if (!est.disponible) {
      setMsg("Es normal: la impresión directa solo funciona con la app de escritorio de Windows abierta. Desde el navegador o el celular se usa la impresión normal, así que no necesitas hacer nada.");
      setProbando(null);
      return;
    }
    if (est.impresoras.length > 0) {
      setImpresoras(est.impresoras);
      setPredeterminada(est.predeterminada);
    }
    const nombre = cual === "caja" ? caja : cocina;
    const esComanda = cual === "cocina";
    const ok = esComanda
      ? await (async () => {
          const { imprimirComandaCocina } = await import("@/lib/impresion-local");
          return imprimirComandaCocina({
            negocio: "Mi negocio", numero: "PRUEBA", cliente: "Prueba de cocina",
            modalidad: "mesa", mesa: "1", notas: "Comanda de prueba",
            items: [{ nombre: "Plato de prueba", cantidad: 1 }],
            formato: "80mm", impresora: nombre || undefined,
          });
        })()
      : await imprimirTirillaLocal({
          negocio: "Mi negocio", numero: "PRUEBA", cliente: "Prueba de impresión",
          items: [{ descripcion: "Tirilla de prueba", cantidad: 1, precio: 1000 }],
          subtotal: 1000, iva: 0, ivaPct: 0, total: 1000, formato: "80mm",
          impresora: nombre || undefined,
        });
    setMsg(ok
      ? `Listo: se imprimió en ${nombre || est.predeterminada || "tu impresora predeterminada"}${est.pendientes > 0 ? ` (cola offline: ${est.pendientes} pendientes).` : "."}`
      : "No se pudo imprimir. Revisa que Windows tenga esa impresora instalada y con papel.");
    setProbando(null);
  };

  const opciones = (valor: string) => (
    <>
      <option value="">Predeterminada de Windows{predeterminada ? ` (${predeterminada})` : ""}</option>
      {impresoras.filter((n) => n !== predeterminada).map((n) => (
        <option key={n} value={n}>{n}{n === valor ? " (elegida)" : ""}</option>
      ))}
      {valor && !impresoras.includes(valor) && <option value={valor}>{valor} (guardada)</option>}
    </>
  );

  return (
    <div className="overflow-hidden rounded-3xl border border-glass-border bg-glass/40 p-6 backdrop-blur-xl">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-sky-400" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-sky-300">Facturación e impresión</span>
        </div>
        <h2 className="font-display text-2xl text-foreground">Impresoras de caja y cocina (API local)</h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          En la app de Windows la factura sale en la impresora de caja y cada pedido nuevo imprime su comanda
          en la impresora de cocina, sin pedirte confirmación. Si la API local no está corriendo —por ejemplo,
          si entraste desde el celular— se usa la impresión normal, sin mostrar error.
        </p>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Impresora de caja (facturas)</span>
          <select
            value={caja}
            onChange={(e) => elegir("caja", e.target.value)}
            className="w-full rounded-xl border border-glass-border bg-glass/40 px-3 py-2.5 text-base outline-none focus:border-primary/60"
          >
            {opciones(caja)}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Impresora de cocina (comandas)</span>
          <select
            value={cocina}
            onChange={(e) => elegir("cocina", e.target.value)}
            className="w-full rounded-xl border border-glass-border bg-glass/40 px-3 py-2.5 text-base outline-none focus:border-primary/60"
          >
            {opciones(cocina)}
          </select>
        </label>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-glass-border bg-glass px-4 py-2 text-sm">
          <input type="checkbox" checked={directa} onChange={(e) => cambiar(e.target.checked)} className="h-5 w-5 accent-primary" />
          {directa ? "Activada" : "Desactivada"}
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-glass-border bg-glass px-4 py-2 text-sm">
          <input type="checkbox" checked={auto} onChange={(e) => cambiarAuto(e.target.checked)} className="h-5 w-5 accent-primary" />
          Comanda automática en cocina
        </label>
        <button
          type="button" onClick={() => void probar("caja")} disabled={probando !== null}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {probando === "caja" ? "Probando caja…" : "Probar caja"}
        </button>
        <button
          type="button" onClick={() => void probar("cocina")} disabled={probando !== null}
          className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-4 py-2 text-sm hover:bg-glass-strong disabled:opacity-50"
        >
          {probando === "cocina" ? "Probando cocina…" : "Probar cocina"}
        </button>
      </div>
      {msg && <p className="mt-3 text-xs text-muted-foreground">{msg}</p>}
    </div>
  );
}

function PublicUrlCard({ orgId }: { orgId: string | null }) {
  const [value, setValue] = useState("");
  const [initial, setInitial] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("organizations")
        .select("public_url")
        .eq("id", orgId)
        .maybeSingle();
      if (cancelled) return;
      const v = (data?.public_url as string | null) ?? "";
      setValue(v);
      setInitial(v);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  const detectedOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const isSandbox = /lovableproject\.com|lovable\.dev/i.test(detectedOrigin);

  const save = async () => {
    if (!orgId) return;
    const trimmed = value.trim().replace(/\/+$/, "");
    if (trimmed && !/^https?:\/\//i.test(trimmed)) {
      setError("La dirección debe empezar con http:// o https://");
      return;
    }
    setError(null);
    setSaving(true);
    const { error: err } = await supabase
      .from("organizations")
      .update({ public_url: trimmed || null })
      .eq("id", orgId);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setValue(trimmed);
    setInitial(trimmed);
  };

  const dirty = value.trim().replace(/\/+$/, "") !== initial;

  return (
    <div className="overflow-hidden rounded-3xl border border-glass-border bg-glass/40 p-6 backdrop-blur-xl">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-400" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300">Dirección pública de la app</span>
        </div>
        <h2 className="font-display text-2xl text-foreground">Origen de los enlaces para compartir</h2>
        <p className="max-w-xl text-sm text-muted-foreground">
          Es la dirección base de los enlaces que compartes con tus clientes, como el formulario público de solicitudes.
          Pon aquí tu dominio (por ejemplo <span className="font-mono">https://minegocio.com</span>).
          Déjala vacía para desactivar los enlaces públicos.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Dirección pública</label>
        <input
          type="url"
          value={loading ? "" : value}
          disabled={loading || !orgId}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://minegocio.com"
          className="w-full rounded-xl border border-glass-border bg-glass/40 px-4 py-2.5 font-mono text-base outline-none focus:border-primary/60"
        />
        {error && <div className="text-xs text-destructive">{error}</div>}
        {detectedOrigin && !isSandbox && !value && (
          <button
            type="button"
            onClick={() => setValue(detectedOrigin)}
            className="text-xs text-primary hover:underline"
          >
            Usar la dirección actual ({detectedOrigin})
          </button>
        )}
        <div className="flex items-center justify-between gap-3 pt-1">
          <p className="text-[11px] text-muted-foreground">
            Las direcciones de prueba o vista previa se ignoran.
          </p>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving || loading || !orgId}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Cuenta ─────────────────────────
function AccountTab({ email, fullName, orgName, signOut }: { email: string; fullName: string; orgName: string; signOut: () => Promise<void> }) {
  const primary = fullName || email || "Sesión iniciada";
  const secondary = fullName && email ? email : "";
  const initial = (primary || "?").trim().charAt(0).toUpperCase();
  return (
    <div className="space-y-6">
      <GlassPanel className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-glass-strong font-display text-2xl text-foreground">
              {initial}
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Sesión iniciada como</div>
              <div className="mt-1 font-display text-xl">{primary}</div>
              {secondary && <div className="mt-0.5 font-mono text-xs text-muted-foreground">{secondary}</div>}
              <div className="mt-2 text-xs text-muted-foreground">
                Negocio activo: <span className="text-foreground">{orgName || "—"}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => signOut()}
            className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-4 py-2 text-sm hover:bg-glass-strong"
          >
            <IconLogout size={14} /> Cerrar sesión
          </button>
        </div>
      </GlassPanel>

      <GlassPanel className="flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Apariencia</div>
          <div className="mt-2 font-display text-lg">Modo claro u oscuro</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Cambia el aspecto de {BRAND.name}. Tu elección se recuerda en este dispositivo.
          </p>
        </div>
        <ThemeToggle />
      </GlassPanel>
    </div>
  );
}
