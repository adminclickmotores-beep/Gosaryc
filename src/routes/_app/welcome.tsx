import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNegocio } from "@/hooks/use-negocio";
import { usePermisos } from "@/hooks/use-permisos";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { GradientMesh } from "@/components/ui-custom/GradientMesh";
import { IconLogo } from "@/components/ui-custom/CustomIcon";
import { TIPOS_NEGOCIO, type TipoNegocioClave } from "@/lib/modulos-negocio";
import { BRAND } from "@/lib/brand";
import { getCachedOnboardedAt, markOnboarded } from "@/hooks/use-onboarding-status";

export const Route = createFileRoute("/_app/welcome")({
  component: Welcome,
});

const campo =
  "w-full rounded-xl border border-glass-border bg-glass/30 px-4 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground/60 focus:border-primary/60";

function Welcome() {
  const { user } = useAuth();
  const { negocio, cargando, recargar } = useNegocio();
  const { esAdmin, cargando: cargandoPermisos } = usePermisos();
  const nav = useNavigate();
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoNegocioClave | "">("");
  const [guardando, setGuardando] = useState(false);

  // Si ya terminó la bienvenida, va directo a su panel.
  useEffect(() => {
    if (!user) return;
    let cancelado = false;
    (async () => {
      const listo = await getCachedOnboardedAt(user.id);
      if (!cancelado && listo) nav({ to: "/restaurante", replace: true });
    })();
    return () => {
      cancelado = true;
    };
  }, [user?.id, nav]);

  useEffect(() => {
    if (negocio) {
      setNombre((n) => n || negocio.nombre);
      setTipo((t) => t || ((negocio.tipo_negocio as TipoNegocioClave | null) ?? ""));
    }
  }, [negocio]);

  const terminarOnboarding = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ onboarded_at: new Date().toISOString() }).eq("id", user.id);
    markOnboarded(user.id);
  };

  // Las personas que el administrador agregó al equipo no configuran el negocio: entran directo a lo suyo.
  useEffect(() => {
    if (!user || cargandoPermisos || esAdmin) return;
    let cancelado = false;
    (async () => {
      await terminarOnboarding();
      if (!cancelado) nav({ to: "/restaurante", replace: true });
    })();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, cargandoPermisos, esAdmin]);

  const continuar = async () => {
    if (!user) return;
    if (!tipo) return toast.error("Elige el tipo de negocio.");
    if (!nombre.trim()) return toast.error("Escribe el nombre de tu negocio.");
    setGuardando(true);
    try {
      const datos = { nombre: nombre.trim(), tipo_negocio: tipo, updated_at: new Date().toISOString() };
      const { data, error } = negocio
        ? await supabase.from("negocio_config").update(datos).eq("id", negocio.id).select("id")
        : await supabase.from("negocio_config").insert(datos).select("id");
      if (error || !data || data.length === 0) {
        toast.error(
          "Tu cuenta no tiene permiso para configurar el negocio. Pídele acceso a quien administra el negocio.",
        );
        return;
      }
      await terminarOnboarding();
      recargar();
      nav({ to: "/restaurante", replace: true });
    } finally {
      setGuardando(false);
    }
  };

  const omitir = async () => {
    await terminarOnboarding();
    nav({ to: "/restaurante", replace: true });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[color:var(--color-ink)] text-foreground">
      <GradientMesh />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-2xl flex-col px-5 py-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <IconLogo size={26} className="text-primary" />
            <span className="font-display text-lg">{BRAND.name}</span>
          </div>
          <button onClick={omitir} className="text-xs text-muted-foreground hover:text-foreground">
            Omitir por ahora →
          </button>
        </div>

        <GlassPanel tier="strong" className="mt-8 space-y-6 p-6 md:p-8">
          <div>
            <h1 className="font-display text-3xl">Cuéntanos de tu negocio</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Con esto activamos los módulos que necesitas. Puedes cambiarlo después en "Mi negocio".
            </p>
          </div>

          <label className="block space-y-1.5">
            <span className="text-xs text-muted-foreground">Nombre de tu negocio</span>
            <input
              className={campo}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Crokante, Autos del Valle…"
              disabled={cargando}
            />
          </label>

          <div className="space-y-2">
            <span className="text-xs text-muted-foreground">Tipo de negocio</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {TIPOS_NEGOCIO.map((t) => {
                const activo = tipo === t.clave;
                return (
                  <button
                    key={t.clave}
                    type="button"
                    onClick={() => setTipo(t.clave)}
                    className={`flex items-center justify-between gap-2 rounded-xl border px-4 py-3 text-left text-sm transition ${
                      activo
                        ? "border-primary/60 bg-primary/10 text-foreground"
                        : "border-glass-border bg-glass/30 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="min-w-0">{t.etiqueta}</span>
                    {activo && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={continuar}
            disabled={guardando}
            className="w-full rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Entrar a mi panel"}
          </button>
        </GlassPanel>
      </div>
    </div>
  );
}
