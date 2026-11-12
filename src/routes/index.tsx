import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  UtensilsCrossed,
  ChefHat,
  Bike,
  Boxes,
  Wallet,
  MessageCircle,
  Download,
  ArrowRight,
} from "lucide-react";
import { GradientMesh } from "@/components/ui-custom/GradientMesh";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useAuth } from "@/contexts/AuthContext";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: `${BRAND.name} — ${BRAND.tagline}` },
      { name: "description", content: BRAND.description },
      { property: "og:title", content: `${BRAND.name} — ${BRAND.tagline}` },
      { property: "og:description", content: BRAND.description },
      { property: "og:type", content: "website" },
    ],
  }),
});

const MODULOS = [
  { Icon: UtensilsCrossed, label: "Pedidos y menú digital", desc: "Tus clientes piden desde el celular y el pedido llega solo.", to: "/menu" as const },
  { Icon: ChefHat, label: "Cocina y producción", desc: "Tablero en vivo: nuevo, en cocina, listo y entregado.", to: "/restaurante" as const },
  { Icon: Bike, label: "Domicilios y clientes", desc: "Asigna repartidores y conoce a tus clientes frecuentes.", to: "/domicilios" as const },
  { Icon: Boxes, label: "Inventarios y recetas", desc: "Controla insumos y costos de cada plato. Próximamente.", to: "/restaurante" as const },
  { Icon: Wallet, label: "Finanzas y rentabilidad", desc: "Ventas y márgenes en un vistazo. Próximamente.", to: "/restaurante" as const },
  { Icon: MessageCircle, label: "Asistente de pedidos", desc: "Atiende y toma pedidos por chat. Próximamente.", to: "/restaurante" as const },
];

function LandingPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) {
      navigate({ to: "/restaurante", replace: true });
    }
  }, [session, loading, navigate]);

  if (loading || session) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <GradientMesh />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <GradientMesh />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-5 sm:px-8">
        <Link to="/" className="inline-flex min-w-0 items-center gap-2 text-sm font-medium">
          <img src="/icono-app.svg" alt="" className="h-7 w-7 rounded-md" />
          <span className="truncate font-display text-lg">{BRAND.name}</span>
        </Link>
        <Link
          to="/login"
          className="shrink-0 rounded-full border border-glass-border bg-glass/40 px-4 py-2 text-sm text-foreground hover:bg-glass-strong"
        >
          Iniciar sesión
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 pt-8 sm:px-8 sm:pt-16">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{BRAND.tagline}</p>
          <h1 className="mt-4 font-display text-4xl leading-tight tracking-tight sm:text-6xl">
            Todo tu restaurante, conectado
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">{BRAND.description}</p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              to="/menu"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Ver menú y pedir <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-full border border-glass-border bg-glass/40 px-6 py-3 text-sm text-foreground hover:bg-glass-strong"
            >
              Entrar al panel
            </Link>
            <Link
              to="/instalar"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-glass-border bg-glass/40 px-6 py-3 text-sm text-foreground hover:bg-glass-strong"
            >
              <Download className="h-4 w-4" /> Instalar app
            </Link>
          </div>
        </section>

        <section className="mt-16 sm:mt-24">
          <h2 className="text-center text-xs uppercase tracking-[0.28em] text-muted-foreground">Módulos del sistema</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULOS.map((m) => (
              <Link key={m.label} to={m.to} className="block">
                <GlassPanel className="h-full p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <m.Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4 font-display text-lg">{m.label}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
                </GlassPanel>
              </Link>
            ))}
          </div>
        </section>

        <footer className="mt-20 border-t border-glass-border/60 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {BRAND.name}
        </footer>
      </main>
    </div>
  );
}
