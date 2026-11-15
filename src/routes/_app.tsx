import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";

import { motion, AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GradientMesh } from "@/components/ui-custom/GradientMesh";
import {
  IconLogo,
  IconSettings,
  IconCommand,
  IconChevronLeft,
  IconChevronRight,
  IconBolt,
  IconSearch,
  IconSpark,
} from "@/components/ui-custom/CustomIcon";
import { CommandPalette } from "@/components/app/CommandPalette";
import { BottomNav } from "@/components/app/BottomNav";
import { UserMenu } from "@/components/app/UserMenu";
import { InstructivoPagina } from "@/components/app/InstructivoPagina";
import { OnboardingChecklist } from "@/components/app/OnboardingChecklist";
import { GuidedTour } from "@/components/tour/GuidedTour";
import { RouteProgressBar } from "@/components/app/RouteProgressBar";
import { BrandHexLogo } from "@/components/app/BrandHexLogo";
import { EstadoSinConexion } from "@/components/app/EstadoSinConexion";
import { BRAND } from "@/lib/brand";
import { useNegocio } from "@/hooks/use-negocio";
import { usePermisos } from "@/hooks/use-permisos";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";

import { AutosaveStatus } from "@/components/app/AutosaveStatus";
import { purgeExpiredDrafts } from "@/hooks/use-draft";
import { getCachedOnboardedAt } from "@/hooks/use-onboarding-status";
import { esCuentaMaestra } from "@/lib/cuenta-maestra";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});

type NavItem = {
  to: string;
  label: string;
  Icon: React.ComponentType<{ size?: number; className?: string }>;
};

function ActiveBloom() {
  return (
    <motion.span
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="pointer-events-none absolute left-1/2 top-full mt-1.5 -translate-x-1/2"
      style={{ width: "120%" }}
    >
      <motion.span
        aria-hidden
        initial={{ scaleX: 0.6, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
        style={{
          transformOrigin: "center bottom",
          background:
            "radial-gradient(ellipse 60% 100% at 50% 100%, oklch(0.78 0.18 305 / 0.45), oklch(0.72 0.2 275 / 0.2) 40%, transparent 70%)",
        }}
        className="pointer-events-none absolute bottom-0 left-0 h-6 w-full"
      />
      <motion.span
        aria-hidden
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: 1, opacity: 1 }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{
          transformOrigin: "center",
          background:
            "linear-gradient(90deg, transparent, oklch(0.78 0.18 305 / 0.95) 50%, transparent)",
        }}
        className="pointer-events-none absolute bottom-0 left-0 h-px w-full"
      />
    </motion.span>
  );
}

function AppShell() {
  const { session, loading, user } = useAuth();
  const loc = useLocation();
  const nav = useNavigate();
  const completa = (loc.search as Record<string, unknown> | undefined)?.ventana === "completa";
  const pathnameRef = useRef(loc.pathname);
  const { negocio } = useNegocio();
  const tipoNegocio = resolverTipoNegocio(negocio?.tipo_negocio);
  const { esAdmin, puede, cargando: cargandoPermisos } = usePermisos();
  const [bloqueo, setBloqueo] = useState<"suspendido" | "vencido" | null>(null);
  // Empleados (no administrador) en el panel: pantalla completa fija, sin menú lateral.
  // El administrador conserva el menú para probar módulo por módulo.
  const completaFinal = completa || (!cargandoPermisos && !esAdmin && loc.pathname.startsWith("/restaurante"));
  const anchoGrande = completaFinal || loc.pathname.startsWith("/restaurante");
  const verPanel = ["pedidos", "cocina", "mesas", "caja_diaria", "insumos"].some((id) => puede(id));
  const modulosVisibles = tipoNegocio.modulos;
  const navItems: NavItem[] = [
    ...(verPanel || cargandoPermisos
      ? [{ to: "/restaurante", label: tipoNegocio.panel, Icon: IconBolt } as NavItem]
      : []),
    ...modulosVisibles
      .filter((m) => m.ruta && m.ruta !== "/restaurante" && (cargandoPermisos || puede(m.id)))
      .map((m) => ({ to: m.ruta as string, label: m.titulo, Icon: m.Icon })),
  ].filter((n, i, arr) => arr.findIndex((x) => x.to === n.to) === i);

  useEffect(() => {
    pathnameRef.current = loc.pathname;
  });

  // Control de acceso por módulo: cada persona solo entra a lo que el administrador le asignó.
  const modulosDeLaRuta = modulosVisibles.filter(
    (m) => m.ruta && m.ruta !== "/restaurante" && (loc.pathname === m.ruta || loc.pathname.startsWith(`${m.ruta}/`)),
  );
  const enPanel = loc.pathname.startsWith("/restaurante");
  const sinAcceso =
    !cargandoPermisos &&
    !esAdmin &&
    ((enPanel && !verPanel) || (modulosDeLaRuta.length > 0 && !modulosDeLaRuta.some((m) => puede(m.id))));
  const primeraRutaPermitida = navItems.find((n) => n.to !== "/restaurante")?.to;
  useEffect(() => {
    if (!cargandoPermisos && !esAdmin && enPanel && !verPanel && primeraRutaPermitida) {
      nav({ to: primeraRutaPermitida as never, replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cargandoPermisos, esAdmin, enPanel, verPanel, primeraRutaPermitida]);

  // Cada módulo se abre en una pestaña aparte, a pantalla completa, sin importar
  // desde dónde se haga clic (menú lateral, menú inferior, tarjetas, enlaces).
  const rutasModulosRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    rutasModulosRef.current = new Set(
      modulosVisibles
        .map((m) => m.ruta)
        .filter((r): r is string => !!r && r !== "/restaurante"),
    );
  });
  useEffect(() => {
    const onClickModulo = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      if (!(e.target instanceof Element)) return;
      const enlace = e.target.closest("a[href]");
      if (!(enlace instanceof HTMLAnchorElement)) return;
      if (enlace.target && enlace.target !== "_self") return;
      if (enlace.origin !== window.location.origin) return;
      if (!rutasModulosRef.current.has(enlace.pathname)) return;
      if (new URLSearchParams(enlace.search).get("ventana") === "completa") return;
      e.preventDefault();
      window.open(`${enlace.pathname}?ventana=completa`, "_blank", "noopener,noreferrer");
    };
    document.addEventListener("click", onClickModulo, true);
    return () => document.removeEventListener("click", onClickModulo, true);
  }, []);

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const stored = window.localStorage.getItem("sidebar:collapsed");
    if (stored === "1") return true;
    if (stored === "0") return false;
    // First visit: auto-collapse on tablet widths.
    return window.innerWidth < 1024;
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sidebar:collapsed", collapsed ? "1" : "0");
    }
  }, [collapsed]);
  // Auto-collapse when the viewport crosses below 1024px (e.g. resize / rotate).
  useEffect(() => {
    if (typeof window === "undefined") return;
    let lastWide = window.innerWidth >= 1024;
    const onResize = () => {
      const wide = window.innerWidth >= 1024;
      if (lastWide && !wide) setCollapsed(true);
      lastWide = wide;
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    purgeExpiredDrafts();
  }, []);

  // First-run gate: send to /welcome until onboarded.
  useEffect(() => {
    if (!user) return;
    // La cuenta maestra nunca pasa por la configuración inicial.
    if (esCuentaMaestra(user.email)) return;
    // En ventana completa (nueva pestaña) nunca redirigir a /welcome.
    if (new URLSearchParams(window.location.search).get("ventana") === "completa") return;
    let cancelled = false;
    (async () => {
      const onboardedAt = await getCachedOnboardedAt(user.id);
      if (cancelled || onboardedAt) return;
      if (window.location.pathname.startsWith("/welcome")) return;
      nav({ to: "/welcome", replace: true });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!loading && !session) {
      nav({
        to: "/login",
        search: { redirect: pathnameRef.current, mode: "signin" },
        replace: true,
      });
    }
    // Fragile: this guard must not depend on location.pathname.
  }, [loading, session, nav]);

  // Bloqueo por suspensión o vencimiento de la suscripción de la empresa.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("suscripciones_negocio").select("estado, vence_el").maybeSingle();
      if (cancelled || !data) return;
      const d = new Date();
      const hoy = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (data.estado === "suspendido") setBloqueo("suspendido");
      else if (data.vence_el < hoy) setBloqueo("vencido");
      else setBloqueo(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  if (loading || !session) {
    return (
      <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[color:var(--color-ink)]">
        <GradientMesh />
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative z-10 flex flex-col items-center gap-5"
        >
          <motion.div
            animate={{ scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-glass/60 backdrop-blur-xl ring-1 ring-glass-border"
          >
            <IconLogo size={28} className="text-primary" />
          </motion.div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            <span className="font-display tracking-wide">
              {loading ? `Iniciando ${BRAND.name}` : "Redirigiendo al inicio de sesión"}
            </span>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[color:var(--color-ink)] text-foreground">
      <GradientMesh />
      <div className="relative z-10 flex min-h-screen">
        {/* Sidebar (desktop) — sticky + collapsible */}
        <aside
          data-tour="sidebar"
          className={`sticky top-0 hidden h-screen shrink-0 self-start overflow-y-auto border-r border-glass-border bg-background/70 backdrop-blur-2xl transition-[width] duration-200 ${completaFinal ? "" : "md:flex md:flex-col"} ${
            collapsed ? "w-16" : "w-64"
          }`}
        >
          <div className={`flex items-center ${collapsed ? "justify-center px-1" : "justify-between gap-1 px-4"} py-5`}>
            <Link to="/" className="flex min-w-0 items-center gap-2 text-foreground">
              <BrandHexLogo size={collapsed ? 32 : 34} />
              {!collapsed && <span className="font-display text-base tracking-tight truncate">{BRAND.name}</span>}
            </Link>
            {!collapsed && (
              <button
                onClick={() => setCollapsed(true)}
                aria-label="Contraer menú lateral"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-glass/60 hover:text-foreground"
              >
                <IconChevronLeft size={16} />
              </button>
            )}
          </div>
          {collapsed && (
            <div className="px-2 pb-2">
              <button
                onClick={() => setCollapsed(false)}
                aria-label="Expandir menú lateral"
                className="inline-flex h-7 w-full items-center justify-center rounded-md text-muted-foreground transition hover:bg-glass/60 hover:text-foreground"
              >
                <IconChevronRight size={16} />
              </button>
            </div>
          )}

          {!collapsed && (
            <div className="px-3 pb-2">
              <SidebarSearch items={navItems} />
            </div>
          )}

          <nav className={`flex-1 space-y-1 ${collapsed ? "px-2" : "px-3"}`}>
            {navItems.map((n) => {
              const active = loc.pathname.startsWith(n.to);
              return (
                <Link
                  key={n.to}
                  to={n.to as never}
                  preload="render"
                  title={collapsed ? n.label : undefined}
                  data-tour={`nav-${n.to}`}
                  className={`relative flex items-center ${collapsed ? "justify-center px-0" : "gap-3 px-3"} rounded-xl py-2.5 text-sm transition-colors duration-150 ${
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:bg-glass/50 hover:text-foreground"
                  }`}
                >
                  <span className="relative z-10 inline-flex">
                    <n.Icon size={18} className={active ? "text-primary" : ""} />
                    {active && collapsed && <ActiveBloom />}
                  </span>

                  {!collapsed && (
                    <span className="relative z-10 flex-1">
                      <span className="relative inline-block">
                        {n.label}
                        {active && <ActiveBloom />}
                      </span>
                    </span>
                  )}
                </Link>
              );
            })}

            <div className="pt-4 space-y-1">
              <Link
                to="/asistente-virtual"
                preload="render"
                title={collapsed ? "Agente virtual" : undefined}
                className={`flex items-center ${collapsed ? "justify-center px-0" : "gap-3 px-3"} rounded-xl py-2.5 text-sm transition-colors ${
                  loc.pathname.startsWith("/asistente-virtual")
                    ? "bg-glass text-foreground"
                    : "text-muted-foreground hover:bg-glass/50 hover:text-foreground"
                }`}
              >
                <IconSpark size={18} />
                {!collapsed && <span>Agente virtual</span>}
              </Link>
              <Link
                to="/settings"
                preload="render"
                title={collapsed ? "Configuración" : undefined}
                data-tour="nav-settings"
                className={`flex items-center ${collapsed ? "justify-center px-0" : "gap-3 px-3"} rounded-xl py-2.5 text-sm transition-colors ${
                  loc.pathname.startsWith("/settings")
                    ? "bg-glass text-foreground"
                    : "text-muted-foreground hover:bg-glass/50 hover:text-foreground"
                }`}
              >
                <IconSettings size={18} />
                {!collapsed && <span>Configuración</span>}
              </Link>
            </div>
          </nav>
        </aside>

        <CommandPalette />

        <main className="flex-1 min-w-0 overflow-x-hidden pb-[calc(env(safe-area-inset-bottom)+5rem)] md:pb-0">
          {/* Mobile top bar */}
          <header className={`sticky top-0 z-30 ${completaFinal ? "hidden" : "flex"} items-center justify-between border-b border-glass-border bg-background/80 px-4 py-3 backdrop-blur-xl md:hidden`}>
            <Link to="/restaurante" className="flex items-center gap-2 text-foreground">
              <BrandHexLogo size={26} />
              <span className="font-display text-base tracking-tight">{BRAND.name}</span>
            </Link>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const ev = new KeyboardEvent("keydown", { key: "k", metaKey: true });
                  window.dispatchEvent(ev);
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-glass-border bg-glass/40 px-2.5 py-1.5 text-xs text-muted-foreground"
                aria-label="Abrir búsqueda"
              >
                <IconCommand size={14} />
                <span>Buscar</span>
              </button>
            </div>
          </header>
          {/* Single user-control mount for both mobile and desktop. */}
          <div className="pointer-events-none fixed right-4 top-3 z-40 flex items-center gap-2 md:right-5 md:top-4">
            <div className="pointer-events-auto hidden md:block">
              <AutosaveStatus />
            </div>
            <div className="pointer-events-auto">
              <OnboardingChecklist variant="pill" />
            </div>
            <div className="pointer-events-auto">
              <UserMenu />
            </div>
          </div>

          {/* Mobile autosave status sits inline below header */}
          <div className="sticky top-[57px] z-20 flex justify-end px-4 pt-2 md:hidden">
            <AutosaveStatus />
          </div>
          <div
            className={`mx-auto w-full pb-10 pt-6 transition-[padding,max-width] duration-200 ${completaFinal ? "md:pt-16" : "md:pt-20"} ${
              anchoGrande ? "max-w-full px-3 sm:px-5" : "max-w-6xl px-4 sm:px-6"
            }`}
          >
            <InstructivoPagina />
            {bloqueo ? (
              <div className="mx-auto mt-10 max-w-md rounded-2xl border border-glass-border bg-glass/30 p-8 text-center">
                <Lock className="mx-auto h-8 w-8 text-destructive" />
                <h1 className="mt-3 font-display text-2xl">
                  {bloqueo === "suspendido" ? "Cuenta suspendida" : "Suscripción vencida"}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  {bloqueo === "suspendido"
                    ? "Tu cuenta está suspendida por falta de pago. Comunícate con Gosaryc para reactivarla."
                    : "El periodo de uso de tu cuenta venció. Comunícate con Gosaryc para renovarlo."}
                </p>
              </div>
            ) : sinAcceso ? (
              <div className="mx-auto mt-10 max-w-md rounded-2xl border border-glass-border bg-glass/30 p-8 text-center">
                <h1 className="font-display text-2xl">Sin acceso a esta sección</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Tu cuenta no tiene permiso para este módulo. Si lo necesitas, pídeselo a quien administra el negocio.
                </p>
              </div>
            ) : (
              <Outlet />
            )}
          </div>
        </main>
      </div>

      {!completaFinal && <BottomNav />}
      <RouteProgressBar />
      <EstadoSinConexion />
      <GuidedTour />
    </div>
  );
}

/** Buscador del menú lateral — filtra los módulos; Enter abre el primer resultado.
 *  ⌘K abre la búsqueda completa. */
function SidebarSearch({ items }: { items: NavItem[] }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const ql = q.trim().toLowerCase();
  const hits = useMemo(
    () => (ql ? items.filter((x) => x.label.toLowerCase().includes(ql)) : []),
    [items, ql],
  );

  const go = (h: NavItem) => {
    setQ("");
    setOpen(false);
    navigate({ to: h.to as never });
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-glass-border bg-glass/40 px-2.5 py-1.5 text-sm text-muted-foreground focus-within:border-primary/40 focus-within:text-foreground">
        <IconSearch size={14} />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hits[0]) {
              e.preventDefault();
              go(hits[0]);
            } else if (e.key === "Escape") {
              setQ("");
              setOpen(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="Buscar módulo…"
          className="w-full bg-transparent outline-none placeholder:text-muted-foreground/60"
        />
        <kbd className="hidden rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground/70 md:inline">
          ⌘K
        </kbd>
      </div>
      <AnimatePresence>
        {open && ql && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-lg border border-glass-border bg-popover/95 p-1 shadow-lg backdrop-blur-xl"
          >
            {hits.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</div>
            ) : (
              hits.map((h) => (
                <button
                  key={h.to}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(h)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-sm text-muted-foreground hover:bg-glass-strong hover:text-foreground"
                >
                  <h.Icon size={14} className="text-primary/80" />
                  <span className="flex-1 truncate">{h.label}</span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
