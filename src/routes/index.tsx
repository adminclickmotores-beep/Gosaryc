import { createFileRoute, Link } from "@tanstack/react-router";
import type { ComponentType } from "react";
import {
  UtensilsCrossed, ChefHat, Bike, Boxes, Wallet, MessageCircle, Download, ArrowRight, Store, Scissors,
  Stethoscope, GraduationCap, BedDouble, Dumbbell, Hammer, Sprout, Building2, PawPrint, Laptop, Truck, Car,
  Smartphone, Palette, ShieldCheck, Sparkles, Check, Users, Receipt, BarChart3, Layers, Clock, TrendingUp, Bot,
  Cake, Coffee, Wrench, Pill, PartyPopper, Briefcase, Shirt, Gem, Banknote, FileText, Gift, CalendarDays,
} from "lucide-react";
import { GradientMesh } from "@/components/ui-custom/GradientMesh";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useAuth } from "@/contexts/AuthContext";
import { BRAND } from "@/lib/brand";

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

type Icono = ComponentType<{ className?: string }>;
type RutaLanding = "/menu" | "/restaurante" | "/domicilios" | "/agente" | "/login";

const MODULOS: { Icon: Icono; label: string; desc: string; to: RutaLanding; grande?: boolean }[] = [
  { Icon: UtensilsCrossed, label: "Ventas y catálogo", desc: "Muestra tus productos o servicios y recibe pedidos desde el celular, con un catálogo que se ve como tu marca.", to: "/menu", grande: true },
  { Icon: ChefHat, label: "Operación y producción", desc: "Tablero en vivo para seguir cada pedido de principio a fin.", to: "/restaurante" },
  { Icon: Bike, label: "Entregas y clientes", desc: "Organiza entregas y conoce a tus clientes frecuentes.", to: "/domicilios" },
  { Icon: Boxes, label: "Inventarios y recetas", desc: "Controla existencias, costos y márgenes de lo que vendes.", to: "/restaurante" },
  { Icon: Wallet, label: "Finanzas y rentabilidad", desc: "Caja, cartera y utilidad en un vistazo, con reportes claros para decidir mejor.", to: "/restaurante", grande: true },
  { Icon: MessageCircle, label: "Agente virtual con IA", desc: "Responde dudas y toma pedidos o citas, adaptado a tu tipo de negocio.", to: "/agente" },
  { Icon: Users, label: "Equipo y nómina", desc: "Organiza a tu equipo, sus permisos y sus pagos.", to: "/login" },
  { Icon: Receipt, label: "Caja, fiados y cobros", desc: "Lo que entra, lo que sale y lo que te deben.", to: "/login" },
  { Icon: BarChart3, label: "Reportes y metas", desc: "Mira cómo va tu negocio y fija metas de ventas.", to: "/login" },
  { Icon: FileText, label: "Cotizaciones y documentos", desc: "Crea cotizaciones, controla vencimientos y guarda los documentos de tu negocio.", to: "/login" },
  { Icon: Gift, label: "Combos, puntos y recompensas", desc: "Promociones y puntos para que tus clientes vuelvan.", to: "/login" },
  { Icon: CalendarDays, label: "Agenda, reservas y pedidos recurrentes", desc: "Citas, reservas y pedidos que se repiten, sin olvidar ninguno.", to: "/login" },
];

const POR_QUE: { Icon: Icono; titulo: string; desc: string }[] = [
  { Icon: Layers, titulo: "Todo en un solo lugar", desc: "Ventas, inventario, clientes y finanzas juntos, sin cuadernos ni hojas de cálculo." },
  { Icon: Clock, titulo: "Ahorra tiempo cada día", desc: "Automatiza pedidos, cobros y reportes para dedicarte a crecer." },
  { Icon: TrendingUp, titulo: "Decide con datos", desc: "Conoce tus costos, márgenes y utilidad reales." },
  { Icon: Bot, titulo: "Atención con IA", desc: "Un agente virtual atiende a tus clientes y te ayuda a tomar pedidos." },
];

const NEGOCIOS: { Icon: Icono; label: string }[] = [
  { Icon: UtensilsCrossed, label: "Restaurantes" }, { Icon: Store, label: "Tiendas" }, { Icon: Scissors, label: "Belleza y servicios" },
  { Icon: Stethoscope, label: "Salud" }, { Icon: GraduationCap, label: "Educación" }, { Icon: BedDouble, label: "Hoteles" },
  { Icon: Dumbbell, label: "Gimnasios" }, { Icon: Hammer, label: "Construcción" }, { Icon: Sprout, label: "Agro" },
  { Icon: Building2, label: "Inmobiliarias" }, { Icon: PawPrint, label: "Veterinarias" }, { Icon: Laptop, label: "Tecnología" },
  { Icon: Truck, label: "Transporte" }, { Icon: Car, label: "Vehículos" },
  { Icon: Cake, label: "Panaderías y pastelerías" }, { Icon: Coffee, label: "Cafeterías y bares" },
  { Icon: Wrench, label: "Talleres" }, { Icon: Pill, label: "Farmacias" },
  { Icon: PartyPopper, label: "Eventos y catering" }, { Icon: Briefcase, label: "Servicios profesionales" },
  { Icon: Shirt, label: "Lavanderías y moda" }, { Icon: Gem, label: "Joyerías" },
  { Icon: Banknote, label: "Préstamos" }, { Icon: Smartphone, label: "Celulares" },
  { Icon: Building2, label: "Condominios" }, { Icon: Layers, label: "Textil y papelería" },
];

const VENTAJAS: { Icon: Icono; titulo: string; desc: string }[] = [
  { Icon: Palette, titulo: "Se ve como tu marca", desc: "Sube tu logo, tu portada y elige tus colores." },
  { Icon: Smartphone, titulo: "En cualquier pantalla", desc: "Celular, tablet o computador, también instalado como app." },
  { Icon: Sparkles, titulo: "Fácil desde el primer día", desc: "Una guía paso a paso te lleva de la mano." },
  { Icon: ShieldCheck, titulo: "Tus datos protegidos", desc: "Solo tu equipo autorizado entra a tu negocio." },
];

const PASOS = [
  { n: "01", titulo: "Cuéntanos de tu negocio", desc: "Nombre, logo y tipo de negocio." },
  { n: "02", titulo: "Activamos tus módulos", desc: "Recibes las herramientas que tu tipo de negocio necesita." },
  { n: "03", titulo: "Vende y controla", desc: "Gestiona clientes, inventario y finanzas desde donde estés." },
];

const CIFRAS = [
  { valor: "31", texto: "tipos de negocio" },
  { valor: "100%", texto: "desde el celular" },
  { valor: "24/7", texto: "agente con IA" },
  { valor: "1", texto: "solo panel para todo" },
];

function LandingPage() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <GradientMesh />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <GradientMesh />
      <div className="hero-grid" aria-hidden="true" />

      <header className="sticky top-0 z-30 border-b border-glass-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-3.5 sm:px-8">
          <Link to="/" className="inline-flex min-w-0 items-center gap-2.5">
            <img src="/icono-app.svg" alt={`Logo de ${BRAND.name}`} className="h-9 w-9 rounded-xl object-cover" />
            <span className="truncate font-display text-xl">{BRAND.name}</span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/login" className="btn-pro inline-flex rounded-full px-5 py-2.5 text-sm font-semibold">Iniciar sesión</Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        {/* Hero */}
        <section className="grid items-center gap-10 pb-6 pt-12 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div className="rise min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass/60 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> {BRAND.tagline}
            </p>
            <h1 className="mt-6 break-words font-display text-4xl leading-[1.05] tracking-tight sm:text-6xl">
              Todo tu negocio, <span className="text-brand-gradient">en un solo lugar</span>
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">{BRAND.description}</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link to="/login" className="btn-pro inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold">
                Crear mi cuenta <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/instalar" className="btn-ghost-pro inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm text-foreground">
                <Download className="h-4 w-4" /> Instalar app
              </Link>
            </div>
          </div>

          {/* Vista previa del panel */}
          <div className="rise relative min-w-0" style={{ animationDelay: "120ms" }} aria-hidden="true">
            <div className="absolute -inset-6 -z-10 rounded-[40px] bg-primary/10 blur-3xl" />
            <GlassPanel tier="strong" className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Ventas de hoy</p>
                  <p className="font-display text-3xl">$1.284.500</p>
                </div>
                <span className="icon-chip h-11 w-11 rounded-2xl"><TrendingUp className="h-5 w-5" /></span>
              </div>
              <div className="flex h-24 items-end gap-2">
                {[38, 55, 42, 70, 52, 88, 64].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-lg bg-gradient-to-t from-primary/20 to-primary/80" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <GlassPanel tier="inner" className="p-3"><p className="text-xs text-muted-foreground">Pedidos</p><p className="font-display text-xl">38</p></GlassPanel>
                <GlassPanel tier="inner" className="p-3"><p className="text-xs text-muted-foreground">Por cobrar</p><p className="font-display text-xl">$216.000</p></GlassPanel>
              </div>
            </GlassPanel>
          </div>
        </section>

        {/* Cifras */}
        <section className="mt-12 grid grid-cols-2 gap-3 md:grid-cols-4" aria-label="Cifras">
          {CIFRAS.map((c) => (
            <GlassPanel key={c.texto} className="p-5 text-center">
              <p className="font-display text-3xl text-brand-gradient">{c.valor}</p>
              <p className="mt-1 text-xs text-muted-foreground">{c.texto}</p>
            </GlassPanel>
          ))}
        </section>

        {/* Módulos en bento */}
        <section className="mt-24" aria-labelledby="modulos">
          <p className="text-eyebrow text-center">Módulos</p>
          <h2 id="modulos" className="mt-3 text-center font-display text-3xl sm:text-4xl">Todo lo que necesitas para crecer</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULOS.map((m) => (
              <Link key={m.label} to={m.to} className={`group block ${m.grande ? "lg:col-span-2" : ""}`}>
                <GlassPanel className="h-full p-6 transition-transform duration-300 group-hover:-translate-y-1">
                  <span className="icon-chip h-12 w-12 rounded-2xl"><m.Icon className="h-5 w-5" /></span>
                  <h3 className="mt-5 font-display text-lg">{m.label}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{m.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs text-primary opacity-0 transition group-hover:opacity-100">
                    Explorar <ArrowRight className="h-3 w-3" />
                  </span>
                </GlassPanel>
              </Link>
            ))}
          </div>
        </section>

        {/* Sectores */}
        <section className="mt-24" aria-labelledby="para-quien">
          <p className="text-eyebrow text-center">Sectores</p>
          <h2 id="para-quien" className="mt-3 text-center font-display text-3xl sm:text-4xl">Hecho para todo tipo de negocio</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground">Cada negocio recibe los módulos y los textos que necesita.</p>
          <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
            {NEGOCIOS.map(({ Icon, label }) => (
              <li key={label}>
                <GlassPanel className="flex h-full flex-col items-center gap-3 p-4 text-center">
                  <span className="icon-chip h-11 w-11 rounded-2xl"><Icon className="h-5 w-5" /></span>
                  <span className="text-xs font-medium text-foreground sm:text-sm">{label}</span>
                </GlassPanel>
              </li>
            ))}
          </ul>
        </section>

        {/* Por qué */}
        <section className="mt-24" aria-labelledby="por-que">
          <p className="text-eyebrow text-center">Ventajas</p>
          <h2 id="por-que" className="mt-3 text-center font-display text-3xl sm:text-4xl">¿Por qué usar {BRAND.name}?</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[...POR_QUE, ...VENTAJAS].map(({ Icon, titulo, desc }) => (
              <GlassPanel key={titulo} className="flex items-start gap-4 p-5">
                <span className="icon-chip h-11 w-11 shrink-0 rounded-xl"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground">{titulo}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                </div>
              </GlassPanel>
            ))}
          </div>
        </section>

        {/* Pasos */}
        <section className="mt-24" aria-labelledby="como">
          <p className="text-eyebrow text-center">Cómo empezar</p>
          <h2 id="como" className="mt-3 text-center font-display text-3xl sm:text-4xl">Empieza en 3 pasos</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {PASOS.map((p) => (
              <li key={p.n}>
                <GlassPanel className="h-full p-6">
                  <span className="font-display text-4xl text-brand-gradient">{p.n}</span>
                  <h3 className="mt-3 font-medium text-foreground">{p.titulo}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                </GlassPanel>
              </li>
            ))}
          </ol>
        </section>

        {/* Cierre */}
        <section className="mt-24">
          <GlassPanel tier="strong" className="relative mx-auto max-w-4xl overflow-hidden p-8 text-center sm:p-12">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
            <h2 className="relative font-display text-3xl sm:text-4xl">Lleva tu negocio al siguiente nivel</h2>
            <ul className="relative mx-auto mt-6 flex max-w-md flex-col gap-2 text-left text-sm text-muted-foreground">
              {["Funciona en la web y como app instalable", "Tu logo, tus colores y tus datos", "Módulos según tu tipo de negocio"].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-primary" /> {t}</li>
              ))}
            </ul>
            <Link to="/login" className="btn-pro relative mt-8 inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold">
              Crear mi cuenta <ArrowRight className="h-4 w-4" />
            </Link>
          </GlassPanel>
        </section>

        <footer className="mt-20 space-y-1 border-t border-glass-border/60 pt-6 pb-6 text-center text-xs text-muted-foreground">
          <p>© 2026 {BRAND.name}. Todos los derechos reservados.</p>
          <p>Prohibida su distribución.</p>
          <p>Diseñado y creado por Jhonathan Gonzalez Cortes</p>
        </footer>
      </main>
    </div>
  );
}
