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
import { ThemeToggle } from "@/components/ui-custom/ThemeToggle";
import { BRAND } from "@/lib/brand";

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
          .single();
        if (cancelled) return;
        if (pErr) throw pErr;
        if (p?.full_name) setFullName(p.full_name);
        if (!p?.default_org_id) {
          setLoading(false);
          return;
        }
        setOrgId(p.default_org_id);
        const [orgRes, memberRes, inviteRes] = await Promise.all([
          supabase.from("organizations").select("name, slug").eq("id", p.default_org_id).single(),
          supabase.from("org_members").select("id", { count: "exact", head: true }).eq("org_id", p.default_org_id),
          supabase.from("org_invites").select("id", { count: "exact", head: true }).eq("org_id", p.default_org_id).is("accepted_at", null),
        ]);
        if (cancelled) return;
        const firstErr = orgRes.error ?? memberRes.error ?? inviteRes.error;
        if (firstErr) throw firstErr;
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
        <PublicUrlCard orgId={orgId} />
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
        .single();
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
