import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GradientMesh } from "@/components/ui-custom/GradientMesh";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { Button } from "@/components/ui/button";
import { IconLogo } from "@/components/ui-custom/CustomIcon";
import { toast } from "sonner";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [busy, setBusy] = useState(false);

  // El enlace del correo trae una sesión temporal en la URL; con ella se puede cambiar la contraseña.
  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    if (!hash.includes("type=recovery")) {
      supabase.auth.getSession().then(({ data }) => {
        if (!data.session) {
          toast.error("El enlace no es válido o ya venció. Pide uno nuevo.");
          nav({ to: "/login", replace: true });
        } else {
          setReady(true);
        }
      });
      return;
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [nav]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Contraseña actualizada. Ya iniciaste sesión.");
    nav({ to: "/restaurante", replace: true });
  };

  const tipo = mostrar ? "text" : "password";
  const clase =
    "mt-1.5 w-full rounded-xl border border-glass-border bg-transparent py-2 pl-3 pr-11 text-base focus:border-primary/60 focus:outline-none disabled:opacity-50";

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4">
      <GradientMesh />
      <div className="relative z-10 w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5 text-foreground">
          <IconLogo size={28} className="text-primary" />
          <span className="font-display text-2xl">{BRAND.name}</span>
        </Link>

        <GlassPanel tier="strong" className="p-6 md:p-8">
          <h1 className="font-display text-2xl">Crea una contraseña nueva</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuando la guardes, entrarás a tu cuenta automáticamente.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Nueva contraseña</label>
              <div className="relative">
                <input
                  type={tipo}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  disabled={!ready}
                  className={clase}
                />
                <button
                  type="button"
                  onClick={() => setMostrar((v) => !v)}
                  aria-label={mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute inset-y-0 right-0 mt-1.5 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Confirma la contraseña</label>
              <div className="relative">
                <input
                  type={tipo}
                  required
                  minLength={6}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  disabled={!ready}
                  className={clase}
                />
                <button
                  type="button"
                  onClick={() => setMostrar((v) => !v)}
                  aria-label={mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute inset-y-0 right-0 mt-1.5 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
                >
                  {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" disabled={busy || !ready} className="w-full">
              {!ready ? "Verificando enlace…" : busy ? "Guardando…" : "Guardar contraseña"}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-foreground">
              Volver a iniciar sesión
            </Link>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
