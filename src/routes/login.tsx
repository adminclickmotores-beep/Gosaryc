import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/contexts/AuthContext";
import { GradientMesh } from "@/components/ui-custom/GradientMesh";
import { Button } from "@/components/ui/button";

import { BRAND } from "@/lib/brand";
import { BrandHexLogo } from "@/components/app/BrandHexLogo";
import { BotonesDemo } from "@/components/app/BotonesDemo";
import { esCuentaDemo } from "@/lib/demo-real";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/login")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { redirect?: string; mode?: "signin" | "signup" } => ({
    // Solo rutas internas: evita redirigir a sitios externos tras iniciar sesión.
    ...(typeof s.redirect === "string" && s.redirect.startsWith("/") && !s.redirect.startsWith("//") && !s.redirect.includes("\\")
      ? { redirect: s.redirect }
      : {}),
    ...(s.mode === "signup" || s.mode === "signin" ? { mode: s.mode as "signin" | "signup" } : {}),
  }),
  component: LoginPage,
});

function LoginPage() {
  const search = Route.useSearch();
  const nav = useNavigate();
  const { session, loading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);
  const [resendBusy, setResendBusy] = useState(false);
  const [recordar, setRecordar] = useState(true);

  useEffect(() => {
    if (!loading && session) {
      nav({ to: (search.redirect && search.redirect !== "/" ? search.redirect : "/restaurante") as "/dashboard", replace: true });
    }
  }, [session, loading, nav, search.redirect]);

  // "Recordarme": si no está marcado, la sesión se cierra al cerrar el navegador.
  const guardarPreferenciaSesion = () => {
    try {
      localStorage.setItem("gosaly:recordarme", recordar ? "1" : "0");
      sessionStorage.setItem("gosaly:sesion_activa", "1");
    } catch {
      /* almacenamiento bloqueado */
    }
  };

  const traducirError = (msg: string) => {
    const m = msg.toLowerCase();
    if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
    if (m.includes("already registered") || m.includes("already been registered")) return "Ese correo ya tiene una cuenta. Inicia sesión.";
    if (m.includes("email not confirmed")) return "Debes confirmar tu correo antes de entrar. Revisa tu bandeja y el spam.";
    if (m.includes("signups not allowed") || m.includes("signup is disabled") || m.includes("signups are disabled"))
      return "El registro de cuentas nuevas está desactivado en este momento.";
    if (m.includes("rate limit")) return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
    if (m.includes("at least 6")) return "La contraseña debe tener mínimo 6 caracteres.";
    return msg;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        guardarPreferenciaSesion();
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/welcome` },
        });
        if (error) throw error;
        if (!data.session) {
          // Si el proyecto exige confirmar el correo, se muestra el aviso de revisar la bandeja.
          setPendingConfirm(email);
        } else {
          toast.success("Cuenta creada. ¡Bienvenido!");
        }
      } else if (mode === "forgot") {
        if (esCuentaDemo(email.trim())) {
          toast.error("Las cuentas demo no permiten cambiar la contraseña.");
          return;
        }
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Te enviamos un enlace para cambiar tu contraseña. Revisa tu correo y el spam.");
        setMode("signin");
      } else {
        guardarPreferenciaSesion();
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? traducirError(err.message) : "Algo salió mal. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  };

  const resendConfirm = async () => {
    if (!pendingConfirm) return;
    setResendBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: pendingConfirm,
        options: { emailRedirectTo: `${window.location.origin}/welcome` },
      });
      if (error) throw error;
      toast.success("Correo de confirmación reenviado");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo reenviar");
    } finally {
      setResendBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    guardarPreferenciaSesion();
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}${search.redirect ?? "/restaurante"}`,
    });
    if (result.error) {
      toast.error(result.error.message);
      setBusy(false);
    }
  };

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      <GradientMesh />

      {/* Floating refractive orbs */}
      <FloatingOrbs />

      {/* Ambient hex constellation */}
      <HexConstellation />

      <div className="relative z-10 w-full max-w-[420px]">


        {/* Liquid glass card */}
        <div className="relative">
          {/* Outer chromatic halo */}
          <div
            className="pointer-events-none absolute -inset-px rounded-[28px] opacity-70 blur-xl"
            style={{
              background:
                "conic-gradient(from 140deg, oklch(0.65 0.22 270 / 0.35), oklch(0.78 0.16 165 / 0.25), oklch(0.75 0.16 200 / 0.3), oklch(0.65 0.22 270 / 0.35))",
            }}
          />
          {/* Card */}
          <div
            className="relative overflow-hidden rounded-[28px] p-8 md:p-9"
            style={{
              background:
                "linear-gradient(155deg, oklch(1 0 0 / 0.09) 0%, oklch(1 0 0 / 0.04) 45%, oklch(0 0 0 / 0.15) 100%)",
              backdropFilter: "blur(40px) saturate(180%)",
              WebkitBackdropFilter: "blur(40px) saturate(180%)",
              border: "1px solid oklch(1 0 0 / 0.12)",
              boxShadow:
                "inset 0 1px 0 oklch(1 0 0 / 0.14), inset 0 -1px 0 oklch(0 0 0 / 0.3), 0 40px 80px -20px oklch(0 0 0 / 0.6), 0 0 60px -10px oklch(0.65 0.22 270 / 0.25)",
            }}
          >
            {/* Specular sheen */}
            <div
              className="pointer-events-none absolute -top-1/2 left-0 h-full w-full rotate-12"
              style={{
                background: "linear-gradient(180deg, oklch(1 0 0 / 0.08) 0%, transparent 60%)",
                filter: "blur(20px)",
              }}
            />
            {/* Top edge highlight */}
            <div
              className="pointer-events-none absolute inset-x-8 top-0 h-px"
              style={{
                background: "linear-gradient(90deg, transparent, oklch(1 0 0 / 0.5), transparent)",
              }}
            />

            <div className="relative">
              <Link
                to="/"
                className="group mb-7 flex items-center justify-center gap-3 text-foreground"
              >
                <BrandHexLogo size={52} intro />
                <span className="flex flex-col leading-none">
                  <span className="font-display text-2xl tracking-tight">{BRAND.name}</span>
                </span>
              </Link>

              {pendingConfirm ? (
                <div className="mt-7 space-y-4 text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                  </div>
                  <h2 className="font-display text-2xl tracking-tight">Revisa tu correo</h2>
                  <p className="text-sm text-muted-foreground">
                    Enviamos un enlace de confirmación a <span className="text-foreground">{pendingConfirm}</span>. Ábrelo para terminar el registro (revisa también el spam).
                  </p>
                  <div className="flex flex-col items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={resendConfirm}
                      disabled={resendBusy}
                      className="rounded-full border border-glass-border bg-glass/40 px-4 py-2 text-xs text-foreground transition hover:bg-glass-strong disabled:opacity-50"
                    >
                      {resendBusy ? "Enviando…" : "Reenviar correo"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingConfirm(null);
                        setMode("signin");
                      }}
                      className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
                    >
                      ← Volver a iniciar sesión
                    </button>
                  </div>
                </div>
              ) : (
              <>
              {mode !== "forgot" && (
                <>
                  <BotonesDemo className="mt-7" />
                  <div className="my-5 h-px bg-glass-border" />
                  <button
                    type="button"
                    onClick={google}
                    disabled={busy}
                    className="group relative mt-7 flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl px-4 py-3 text-sm font-medium transition disabled:opacity-50"
                    style={{
                      background:
                        "linear-gradient(160deg, oklch(1 0 0 / 0.08), oklch(1 0 0 / 0.03))",
                      border: "1px solid oklch(1 0 0 / 0.14)",
                      backdropFilter: "blur(20px)",
                      boxShadow:
                        "inset 0 1px 0 oklch(1 0 0 / 0.1), 0 4px 16px -4px oklch(0 0 0 / 0.4)",
                    }}
                  >
                    <span
                      className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100"
                      style={{
                        background:
                          "radial-gradient(circle at 50% 0%, oklch(1 0 0 / 0.12), transparent 70%)",
                      }}
                    />
                    <GoogleMark />
                    <span className="relative">Continuar con Google</span>
                  </button>

                  <div className="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.3em] text-muted-foreground/70">
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-glass-border to-glass-border" />
                    o con tu correo
                    <span className="h-px flex-1 bg-gradient-to-l from-transparent via-glass-border to-glass-border" />
                  </div>
                </>
              )}

              <form
                onSubmit={submit}
                className={mode === "forgot" ? "mt-7 space-y-4" : "space-y-4"}
              >
                <GlassField
                  label="Correo"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  required
                  autoComplete="email"
                />
                {mode !== "forgot" && (
                  <GlassField
                    label="Contraseña"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    required
                    minLength={6}
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    trailing={
                      mode === "signin" ? (
                        <button
                          type="button"
                          onClick={() => setMode("forgot")}
                          className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80 transition hover:text-primary"
                        >
                          ¿La olvidaste?
                        </button>
                      ) : null
                    }
                  />
                )}
                {mode !== "forgot" && (
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={recordar}
                      onChange={(e) => setRecordar(e.target.checked)}
                      className="h-4 w-4 accent-primary"
                    />
                    Recordarme en este dispositivo
                  </label>
                )}

                <div className="group relative isolate rounded-full p-px shadow-[0_8px_24px_-6px_oklch(0.65_0.22_270/0.4)] transition-transform duration-300 ease-out hover:scale-105">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-full opacity-80 transition-opacity duration-300 group-hover:opacity-100"
                    style={{
                      background: `
                        linear-gradient(160deg, oklch(0.65 0.22 270 / 0.55), oklch(0.75 0.16 200 / 0.35)) border-box,
                        conic-gradient(from var(--beam-angle, 0deg), transparent 0deg, transparent 40deg, oklch(0.65 0.22 270) 78deg, oklch(0.78 0.16 165) 116deg, oklch(0.75 0.16 200) 152deg, transparent 196deg, transparent 360deg) border-box
                      `,
                      animation: "beam-spin 4s linear infinite",
                      border: "2px solid transparent",
                      WebkitMask:
                        "linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0)",
                      WebkitMaskComposite: "xor",
                      mask: "linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0)",
                      maskComposite: "exclude",
                    }}
                  />
                  <Button
                    type="submit"
                    disabled={busy}
                    className="relative h-11 w-full overflow-hidden rounded-full text-sm font-medium text-foreground shadow-none hover:text-foreground"
                    style={{
                      background:
                        "linear-gradient(160deg, oklch(0.22 0.01 270), oklch(0.14 0.01 270))",
                      boxShadow:
                        "inset 0 1px 0 oklch(1 0 0 / 0.08), inset 0 -1px 0 oklch(0 0 0 / 0.3)",
                    }}
                  >
                    <span className="relative z-10">
                      {busy
                        ? "…"
                        : mode === "signin"
                          ? "Iniciar sesión"
                          : mode === "signup"
                            ? "Crear cuenta"
                            : "Enviar enlace"}
                    </span>
                  </Button>
                </div>
                <style>{`
                  @property --beam-angle {
                    syntax: '<angle>';
                    initial-value: 0deg;
                    inherits: false;
                  }
                  @keyframes beam-spin {
                    to { --beam-angle: 360deg; }
                  }
                `}</style>
              </form>

              <div className="mt-6 text-center text-sm text-muted-foreground">
                {mode === "signin" ? (
                  <>
                    ¿Eres nuevo?{" "}
                    <button
                      onClick={() => setMode("signup")}
                      className="text-primary transition hover:text-primary/80"
                      type="button"
                    >
                      Crea tu cuenta
                    </button>
                  </>
                ) : mode === "signup" ? (
                  <>
                    ¿Ya tienes cuenta?{" "}
                    <button
                      onClick={() => setMode("signin")}
                      className="text-primary transition hover:text-primary/80"
                      type="button"
                    >
                      Inicia sesión
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setMode("signin")}
                    className="text-muted-foreground transition hover:text-foreground"
                    type="button"
                  >
                    ← Volver a iniciar sesión
                  </button>
                )}
              </div>
              </>
              )}
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-[10px] uppercase tracking-[0.3em] text-muted-foreground/50">
          Seguro · Cifrado · Tuyo
        </p>
      </div>
    </div>
  );
}

function GlassField({
  label,
  type,
  value,
  onChange,
  required,
  minLength,
  autoComplete,
  trailing,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  trailing?: React.ReactNode;
}) {
  const [mostrar, setMostrar] = useState(false);
  const esClave = type === "password";
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground/80">
          {label}
        </span>
        {trailing}
      </div>
      <div
        className="group relative overflow-hidden rounded-xl transition focus-within:ring-1 focus-within:ring-primary/40"
        style={{
          background: "linear-gradient(160deg, oklch(0 0 0 / 0.25), oklch(0 0 0 / 0.1))",
          border: "1px solid oklch(1 0 0 / 0.1)",
          boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.06), inset 0 -1px 0 oklch(0 0 0 / 0.2)",
        }}
      >
        <input
          type={esClave && mostrar ? "text" : type}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full bg-transparent py-2.5 text-base text-foreground placeholder:text-muted-foreground/50 focus:outline-none ${esClave ? "pl-3.5 pr-11" : "px-3.5"}`}
        />
        {esClave && (
          <button
            type="button"
            onClick={() => setMostrar((v) => !v)}
            aria-label={mostrar ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition hover:text-foreground"
          >
            {mostrar ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>
    </label>
  );
}

function FloatingOrbs() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div
        className="absolute h-[480px] w-[480px] rounded-full opacity-60"
        style={{
          top: "-10%",
          left: "-8%",
          background: "radial-gradient(circle, oklch(0.65 0.22 270 / 0.55), transparent 65%)",
          filter: "blur(60px)",
          animation: "orb-drift-a 22s ease-in-out infinite",
        }}
      />
      <div
        className="absolute h-[420px] w-[420px] rounded-full opacity-55"
        style={{
          bottom: "-12%",
          right: "-6%",
          background: "radial-gradient(circle, oklch(0.78 0.16 165 / 0.5), transparent 65%)",
          filter: "blur(70px)",
          animation: "orb-drift-b 26s ease-in-out infinite",
        }}
      />
      <div
        className="absolute h-[360px] w-[360px] rounded-full opacity-40"
        style={{
          top: "30%",
          right: "20%",
          background: "radial-gradient(circle, oklch(0.75 0.16 200 / 0.35), transparent 65%)",
          filter: "blur(80px)",
          animation: "orb-drift-c 30s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes orb-drift-a {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 60px) scale(1.08); }
        }
        @keyframes orb-drift-b {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-50px, -40px) scale(1.1); }
        }
        @keyframes orb-drift-c {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, 40px) scale(0.92); }
        }
      `}</style>
    </div>
  );
}

function HexConstellation() {
  const HEX = "polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)";
  const hexes = [
    { size: 28, top: "15%", left: "12%", delay: 0 },
    { size: 18, top: "22%", left: "78%", delay: 1.2 },
    { size: 22, top: "70%", left: "10%", delay: 2.4 },
    { size: 16, top: "78%", left: "85%", delay: 0.6 },
    { size: 36, top: "55%", left: "6%", delay: 1.8 },
    { size: 14, top: "40%", left: "90%", delay: 3 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {hexes.map((h, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: h.top,
            left: h.left,
            width: h.size,
            height: h.size * 1.1547,
            clipPath: HEX,
            background: "linear-gradient(140deg, oklch(1 0 0 / 0.08), oklch(1 0 0 / 0.02))",
            border: "1px solid oklch(1 0 0 / 0.06)",
            animation: `hex-float 8s ease-in-out ${h.delay}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes hex-float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.5; }
          50% { transform: translateY(-14px) rotate(8deg); opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.6 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-8l-6.6 5.1C9.6 39.6 16.3 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C40 35.8 44 30.4 44 24c0-1.2-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
