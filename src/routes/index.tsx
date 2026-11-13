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
  Store,
  Scissors,
  Stethoscope,
  GraduationCap,
  BedDouble,
  Dumbbell,
  Hammer,
  Sprout,
  Building2,
  PawPrint,
  Laptop,
  Truck,
  Car,
  Smartphone,
  Palette,
  ShieldCheck,
  Sparkles,
  Check,
} from "lucide-react";
import { GradientMesh } from "@/components/ui-custom/GradientMesh";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useAuth } from "@/contexts/AuthContext";
import { BRAND } from "@/lib/brand";
import { useNegocio } from "@/hooks/use-negocio";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Software para todo tipo de negocio | Ventas, inventario y clientes` },
      { name: "description", content: BRAND.description },
      { property: "og:title", content: `${BRAND.name} — ${BRAND.tagline}` },
      { property: "og:description", content: BRAND.description },
      { property: "og:type", content: "website" },
    ],
  }),
});

const MODULOS = [
  { Icon: UtensilsCrossed, label: "Ventas y catálogo", desc: "Muestra tus productos o servicios y recibe pedidos desde el celular.", to: "/menu" as const },
  { Icon: ChefHat, label: "Operación y producción", desc: "Tablero en vivo para seguir cada pedido de principio a fin.", to: "/restaurante" as const },
  { Icon: Bike, label: "Entregas y clientes", desc: "Organiza entregas y conoce a tus clientes frecuentes.", to: "/domicilios" as const },
  { Icon: Boxes, label: "Inventarios y recetas", desc: "Controla existencias, costos y márgenes de lo que vendes.", to: "/restaurante" as const },
  { Icon: Wallet, label: "Finanzas y rentabilidad", desc: "Caja, cartera y utilidad en un vistazo.", to: "/restaurante" as const },
  { Icon: MessageCircle, label: "Asistente de pedidos", desc: "Atiende y toma pedidos por chat.", to: "/agente" as const },
];

const NEGOCIOS = [
  { Icon: UtensilsCrossed, label: "Restaurantes" },
  { Icon: Store, label: "Tiendas" },
  { Icon: Scissors, label: "Belleza y servicios" },
  { Icon: Stethoscope, label: "Salud" },
  { Icon: GraduationCap, label: "Educación" },
  { Icon: BedDouble, label: "Hoteles" },
  { Icon: Dumbbell, label: "Gimnasios" },
  { Icon: Hammer, label: "Construcción" },
  { Icon: Sprout, label: "Agro" },
  { Icon: Building2, label: "Inmobiliarias" },
  { Icon: PawPrint, label: "Veterinarias" },
  { Icon: Laptop, label: "Tecnología" },
  { Icon: Truck, label: "Transporte" },
  { Icon: Car, label: "Vehículos" },
];

const VENTAJAS = [
  { Icon: Palette, titulo: "Se ve como tu marca", desc: "Sube tu logo, tu portada y elige tus colores." },
  { Icon: Smartphone, titulo: "En cualquier pantalla", desc: "Úsalo en el celular, la tablet o el computador, también instalado como app." },
  { Icon: Sparkles, titulo: "Fácil desde el primer día", desc: "Una guía paso a paso te lleva de la mano. Sin manuales." },
  { Icon: ShieldCheck, titulo: "Tus datos protegidos", desc: "Solo tu equipo autorizado entra a la gestión de tu negocio." },
];

const PASOS = [
  { n: "1", titulo: "Cuéntanos de tu negocio", desc: "Nombre, logo y tipo de negocio." },
  { n: "2", titulo: "Activamos tus módulos", desc: "Recibes las herramientas que tu tipo de negocio necesita." },
  { n: "3", titulo: "Vende y controla", desc: "Gestiona clientes, inventario y finanzas desde donde estés." },
];

function LandingPage() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const { negocio } = useNegocio();

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
          <img src={negocio?.logo_url ?? "/icono-app.svg"} alt={`Logo de ${negocio?.nombre ?? BRAND.name}`} className="h-9 w-9 rounded-xl object-cover shadow-sm" />
          <span className="truncate font-display text-xl">{negocio?.nombre ?? BRAND.name}</span>
        </Link>
        <Link
          to="/login"
          className="shrink-0 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90"
        >
          Iniciar sesión
        </Link>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 pt-6 sm:px-8 sm:pt-14">
        <section className="mx-auto max-w-3xl text-center">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass/50 px-4 py-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> {BRAND.name} · {BRAND.tagline}
          </p>
          <h1 className="mt-5 break-words font-display text-4xl leading-tight tracking-tight sm:text-6xl">
            {negocio?.nombre ?? "Todo tu negocio, en un solo lugar"}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            {negocio?.eslogan ?? BRAND.description}
          </p>
          {negocio?.eslogan ? (
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground/80">{BRAND.description}</p>
          ) : null}
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              to="/menu"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground shadow-md transition hover:-translate-y-0.5 hover:opacity-90"
            >
              Ver catálogo y pedir <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center justify-center rounded-full border border-glass-border bg-glass/40 px-7 py-3.5 text-sm text-foreground transition hover:bg-glass-strong"
            >
              Entrar al panel
            </Link>
            <Link
              to="/instalar"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-glass-border bg-glass/40 px-7 py-3.5 text-sm text-foreground transition hover:bg-glass-strong"
            >
              <Download className="h-4 w-4" /> Instalar app
            </Link>
          </div>
          {negocio?.portada_url ? (
            <img
              src={negocio.portada_url}
              alt={negocio.nombre}
              className="mx-auto mt-10 max-h-72 w-full rounded-2xl object-cover shadow-lg"
            />
          ) : null}
        </section>

        <section className="mt-16 sm:mt-24" aria-labelledby="para-quien">
          <h2 id="para-quien" className="text-center font-display text-2xl sm:text-3xl">
            Hecho para todo tipo de negocio
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-muted-foreground">
            Cada negocio recibe los módulos y los textos que necesita.
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {NEGOCIOS.map(({ Icon, label }) => (
              <li key={label}>
                <GlassPanel className="flex h-full flex-col items-center gap-2 p-4 text-center transition-all hover:-translate-y-0.5 hover:border-primary/40">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-medium text-foreground sm:text-sm">{label}</span>
                </GlassPanel>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-16 sm:mt-24" aria-labelledby="modulos">
          <h2 id="modulos" className="text-center font-display text-2xl sm:text-3xl">
            Todo lo que necesitas para crecer
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULOS.map((m) => (
              <Link key={m.label} to={m.to} className="block">
                <GlassPanel className="h-full p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <m.Icon className="h-5 w-5" />
                  </div>
                  <div className="mt-4 font-display text-lg">{m.label}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{m.desc}</p>
                </GlassPanel>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-16 sm:mt-24" aria-labelledby="ventajas">
          <h2 id="ventajas" className="text-center font-display text-2xl sm:text-3xl">
            Pensado para que sea fácil y bonito
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {VENTAJAS.map(({ Icon, titulo, desc }) => (
              <GlassPanel key={titulo} className="flex items-start gap-4 p-5">
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground">{titulo}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                </div>
              </GlassPanel>
            ))}
          </div>
        </section>

        <section className="mt-16 sm:mt-24" aria-labelledby="como">
          <h2 id="como" className="text-center font-display text-2xl sm:text-3xl">
            Empieza en 3 pasos
          </h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {PASOS.map((p) => (
              <li key={p.n}>
                <GlassPanel className="h-full p-5">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                    {p.n}
                  </span>
                  <h3 className="mt-3 font-medium text-foreground">{p.titulo}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                </GlassPanel>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16 sm:mt-24">
          <GlassPanel className="mx-auto max-w-3xl space-y-4 p-8 text-center">
            <h2 className="font-display text-2xl sm:text-3xl">Lleva tu negocio al siguiente nivel</h2>
            <ul className="mx-auto flex max-w-md flex-col gap-2 text-left text-sm text-muted-foreground">
              {["Funciona en la web y como app instalable", "Tu logo, tus colores y tus datos", "Módulos según tu tipo de negocio"].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-primary" /> {t}
                </li>
              ))}
            </ul>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-medium text-primary-foreground shadow-md transition hover:opacity-90"
            >
              Crear mi cuenta <ArrowRight className="h-4 w-4" />
            </Link>
          </GlassPanel>
        </section>

        <footer className="mt-20 border-t border-glass-border/60 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {BRAND.name}
        </footer>
      </main>
    </div>
  );
}
