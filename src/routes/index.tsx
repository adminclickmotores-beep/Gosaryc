import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import {
  UtensilsCrossed, ChefHat, Bike, Boxes, Wallet, Download, ArrowRight, Smartphone,
  Palette, ShieldCheck, Sparkles, Check, Users, Receipt, BarChart3, Layers, Clock, TrendingUp,
  FileText, Gift, CalendarDays, Bot, MessageCircle, Brain, Headphones, BellRing, RefreshCw, PlayCircle, X,
} from "lucide-react";
import { SECTORES, buscarSector } from "@/lib/sectores";
import { GradientMesh } from "@/components/ui-custom/GradientMesh";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useAuth } from "@/contexts/AuthContext";
import { BRAND } from "@/lib/brand";

export const Route = createFileRoute("/")({
  component: LandingPage,
  head: () => ({
    meta: [
      { title: `${BRAND.name} — Software profesional para administrar tu negocio en Colombia` },
      { name: "description", content: BRAND.description },
      { property: "og:title", content: `${BRAND.name} — Gestión profesional para cada tipo de negocio en Colombia` },
      { property: "og:description", content: BRAND.description },
      { property: "og:type", content: "website" },
    ],
  }),
});

type Icono = ComponentType<{ className?: string }>;

// Tarjetas de módulos con color propio por familia: cada tarjeta tiene su acento.
// Tocar una tarjeta abre su ficha detallada aquí mismo, sin ir al inicio de sesión.
const MODULOS: { Icon: Icono; label: string; desc: string; detalle: string; beneficios: string[]; como: string; color: string; grande?: boolean }[] = [
  { Icon: UtensilsCrossed, label: "Ventas y catálogo digital", desc: "Presenta tus productos o servicios con tu marca, recibe pedidos desde el celular y cobra sin errores. Incluye código QR para mesas y vitrina.", detalle: "Publicas tus productos o servicios con tu marca y recibes pedidos desde el celular, el computador o un código QR, y cobras sin errores.", beneficios: ["Catálogo con fotos, precios y tu logo", "Pedidos de mesa, para llevar y a domicilio", "Cobro con todos los medios de pago y comprobante"], como: "Armas tu menú una vez y compartes el enlace: cada pedido llega solo a tu panel.", color: "#fb923c", grande: true },
  { Icon: ChefHat, label: "Operación y producción en vivo", desc: "Tablero en tiempo real: cada pedido avanza de principio a fin, con comanda automática a cocina y control de tiempos.", detalle: "Un tablero en tiempo real donde cada pedido avanza de principio a fin, con comanda automática a cocina y control de tiempos.", beneficios: ["Tablero: nuevos, en cocina, listos y entregados", "Comanda impresa automática al registrar el pedido", "Control de mesas y tiempos de preparación"], como: "El pedido entra y aparece en cocina al instante; marcas cada avance con un toque.", color: "#f472b6" },
  { Icon: Bike, label: "Domicilios y clientes", desc: "Rutas, tarifas por barrio, repartidores y base de clientes con historial de compras y direcciones.", detalle: "Organizas entregas con rutas, tarifas por barrio y repartidores, y guardas a cada cliente con su historial y direcciones.", beneficios: ["Tarifas de domicilio por barrio o zona", "Repartidores con liquidación de cada entrega", "Historial de cada cliente: qué pide y dónde vive"], como: "Registras el pedido con su dirección y se lo asignas al repartidor de turno.", color: "#22d3ee" },
  { Icon: Boxes, label: "Inventario, recetas y costos", desc: "Existencias, costo real por plato o producto, alertas de faltantes, lotes y vencimientos. Sin hojas de cálculo.", detalle: "Controlas existencias, costo real por plato o producto, alertas de faltantes, lotes y vencimientos, sin hojas de cálculo.", beneficios: ["Costo real de cada plato con su receta", "Descuento automático al vender", "Alertas de stock bajo y productos por vencer"], como: "Cargas tus insumos una vez con su receta; cada venta descuenta sola.", color: "#a3e635" },
  { Icon: Wallet, label: "Finanzas y rentabilidad", desc: "Caja por turnos con arqueo discriminado, cuentas por cobrar con recordatorios por WhatsApp y utilidad real del periodo.", detalle: "Llevas la caja por turnos con arqueo discriminado, las cuentas por cobrar con recordatorios por WhatsApp y la utilidad real del periodo.", beneficios: ["Cierre de caja por turno: efectivo, transferencia y tarjeta", "Cuentas por cobrar con recordatorio por WhatsApp", "Utilidad real: ventas menos costos y gastos"], como: "Abres turno, registras movimientos y cierras con el arqueo; el reporte sale solo.", color: "#60a5fa", grande: true },
  { Icon: Users, label: "Equipo y nómina conforme a la ley colombiana", desc: "Empleados, turnos y liquidación de nómina con SMMLV, auxilio, salud, pensión, primas, cesantías y PILA según la normatividad vigente.", detalle: "Registras empleados y turnos, y liquidas la nómina con SMMLV, auxilios, salud, pensión, primas, cesantías y PILA según la norma vigente.", beneficios: ["Empleados con salario y auxilios de ley", "Liquidación automática: salud, pensión, primas y cesantías", "Desprendible por WhatsApp e histórico por periodo"], como: "Registras a cada empleado una vez; cada periodo liquidas con un clic.", color: "#c084fc" },
  { Icon: ShieldCheck, label: "Diseñado para tu tipo de negocio", desc: "Restaurante con Rappi y sanidad, salud con RIPS y habilitación, concesionario con traspasos, tienda con código de barras, taller con órdenes: cada negocio con sus propios formularios.", detalle: "Cada negocio recibe sus propios módulos, textos y color: restaurante, salud, concesionario, tienda, taller y más de 50 tipos.", beneficios: ["Módulos exactos según tu tipo de negocio", "Textos y vocabulario de tu actividad, sin tecnicismos", "Tu color y tu logo en todo el programa"], como: "Eliges tu tipo al crear la cuenta y el programa se adapta solo.", color: "#34d399" },
  { Icon: Receipt, label: "Caja, cuentas por cobrar y facturación electrónica DIAN", desc: "Registra ingresos y egresos, gestiona saldos pendientes por cliente y emite facturas electrónicas con CUFE y código QR.", detalle: "Registras ingresos y egresos, gestionas los saldos pendientes por cliente y emites facturas electrónicas con CUFE y código QR.", beneficios: ["Factura electrónica DIAN con CUFE y QR", "Cuentas por cobrar con abonos y saldos", "Resolución, prefijo y rangos configurables"], como: "Vendes, eliges facturar y el documento sale con todos los requisitos.", color: "#fbbf24" },
  { Icon: BarChart3, label: "Reportes, metas e indicadores", desc: "Ventas por producto, por medio de pago, por sede y por periodo. Define metas semanales y mide el avance de cada equipo.", detalle: "Ves tus ventas por producto, medio de pago, sede y periodo, defines metas semanales y mides el avance de cada equipo.", beneficios: ["Ventas por producto, pago, sede y periodo", "Metas semanales con avance por equipo", "Exporta a Excel o imprime en PDF"], como: "Cada venta alimenta los reportes; consultas el periodo que quieras.", color: "#38bdf8" },
  { Icon: FileText, label: "Cotizaciones y documentos", desc: "Cotizaciones profesionales enviadas por WhatsApp, control de vencimientos y archivo digital de tus documentos.", detalle: "Envías cotizaciones profesionales por WhatsApp, controlas sus vencimientos y archivas tus documentos por cliente.", beneficios: ["Cotización clara con tu logo, enviada por WhatsApp", "Control de vencimientos y seguimiento", "Documentos archivados por cliente"], como: "Armas la cotización con tus productos y la envías con un toque.", color: "#fb7185" },
  { Icon: Gift, label: "Combos, puntos y fidelización", desc: "Promociones por horario, combos, puntos por compra y recompensas para que tus clientes regresen.", detalle: "Creas promociones por horario, combos, puntos por compra y recompensas para que tus clientes regresen.", beneficios: ["Combos y 2x1 por horario o día", "Puntos por cada compra", "Recompensas para clientes frecuentes"], como: "Defines el combo o los puntos una vez y se aplican solos al vender.", color: "#e879f9" },
  { Icon: CalendarDays, label: "Agenda, reservas y pedidos recurrentes", desc: "Citas por profesional y recurso, reservas de mesas o espacios, y pedidos que se repiten cada semana sin olvidar ninguno.", detalle: "Atiendes citas por profesional, reservas de mesas o espacios, y pedidos que se repiten cada semana sin olvidar ninguno.", beneficios: ["Agenda por profesional, sin cruces", "Reservas de mesas o espacios con anticipo", "Pedidos semanales automáticos"], como: "Agendas la cita o el pedido recurrente y el programa te avisa.", color: "#2dd4bf" },
];

const POR_QUE: { Icon: Icono; titulo: string; desc: string; color: string }[] = [
  { Icon: Layers, titulo: "Toda tu operación en un solo panel", desc: "Ventas, inventario, clientes, caja, nómina y finanzas conectados entre sí. Lo que vendes descuenta inventario, entra a caja y alimenta la contabilidad.", color: "#60a5fa" },
  { Icon: Clock, titulo: "Ahorra horas cada semana", desc: "Pedidos que llegan solos, comandas que se imprimen sin pedirlo, cobros con recordatorio por WhatsApp y cierres de caja en minutos.", color: "#34d399" },
  { Icon: TrendingUp, titulo: "Decide con cifras reales", desc: "Costo, margen y utilidad por producto, por sede y por periodo. Sabrás qué te deja ganancia y qué solo ocupa espacio.", color: "#fbbf24" },
  { Icon: ShieldCheck, titulo: "Información protegida y privada", desc: "Cada negocio ve solo su información. El acceso por empleado se limita a los módulos que le asignes, con auditoría de accesos sensibles.", color: "#c084fc" },
];

const VENTAJAS: { Icon: Icono; titulo: string; desc: string; color: string }[] = [
  { Icon: Palette, titulo: "Con la imagen de tu marca", desc: "Logo, portada y colores de tu negocio en el menú público, las facturas y la app instalada.", color: "#f472b6" },
  { Icon: Smartphone, titulo: "En cualquier pantalla", desc: "Computador, tableta y celular. Se instala como app y sigue funcionando sin internet.", color: "#22d3ee" },
  { Icon: Sparkles, titulo: "Fácil desde el primer día", desc: "Guía de primeros pasos, academia con lecciones cortas y un asistente virtual que te enseña a usar cada pantalla.", color: "#a3e635" },
  { Icon: BellRing, titulo: "Siempre al día, sin perder nada", desc: "Las actualizaciones se instalan solas conservando tu información. Cuando hay una mejora importante, te avisamos dentro del programa.", color: "#fb923c" },
];

const PASOS = [
  { n: "01", titulo: "Cuéntanos de tu negocio", desc: "Nombre, logo, horarios y tipo de negocio. Así activamos los módulos exactos que necesitas." },
  { n: "02", titulo: "Carga tu catálogo y tu equipo", desc: "Productos con precio, clientes frecuentes e invita a tu personal con sus permisos." },
  { n: "03", titulo: "Vende, cobra y controla", desc: "Factura, gestiona caja y cuentas por cobrar, revisa reportes y haz crecer tu negocio." },
];

const COLORES_SECTOR = ["#fb923c", "#60a5fa", "#34d399", "#f472b6", "#fbbf24", "#22d3ee", "#c084fc", "#a3e635"];

function ExploradorSectores() {
  const [sel, setSel] = useState<string | null>(null);
  const ficha = sel ? buscarSector(sel) : undefined;
  const FichaIcon = ficha?.Icon;

  const guardarPreseleccion = (slug: string) => {
    try {
      localStorage.setItem("gosaryc:tipo_preseleccionado", slug);
    } catch {
      /* almacenamiento bloqueado */
    }
  };

  return (
    <div>
      <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {SECTORES.map(({ Icon, label, slug }, i) => {
          const color = COLORES_SECTOR[i % COLORES_SECTOR.length];
          const activo = sel === slug;
          return (
            <li key={slug}>
              <button
                type="button"
                onClick={() => setSel(activo ? null : slug)}
                aria-expanded={activo}
                className="group block h-full w-full"
              >
                <GlassPanel className={`flex h-full flex-col items-center gap-3 border-b-4 p-4 text-center transition-transform duration-300 group-hover:-translate-y-1 ${activo ? "ring-2 ring-primary" : ""}`} style={{ borderBottomColor: color }}>
                  <span className="icon-chip h-11 w-11 rounded-2xl" style={{ background: `${color}1f`, color }}><Icon className="h-5 w-5" /></span>
                  <span className="text-xs font-medium text-foreground sm:text-sm">{label}</span>
                </GlassPanel>
              </button>
            </li>
          );
        })}
      </ul>

      {ficha && FichaIcon ? (
        <GlassPanel tier="strong" className="mt-6 p-6 text-left sm:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <span className="icon-chip h-12 w-12 shrink-0 rounded-2xl"><FichaIcon className="h-6 w-6" /></span>
            <div className="min-w-0">
              <p className="text-eyebrow">Ficha del negocio</p>
              <h3 className="mt-1 break-words font-display text-2xl">{ficha.label}</h3>
            </div>
          </div>
          <p className="mt-5 font-medium text-foreground">Qué problema resuelve</p>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">{ficha.resumen}</p>
          <p className="mt-5 font-medium text-foreground">Funciones reales incluidas</p>
          <ul className="mt-2 grid gap-2 sm:grid-cols-2">
            {ficha.acciones.map((a) => (
              <li key={a.titulo} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0"><strong className="text-foreground">{a.titulo}:</strong> <span className="text-muted-foreground">{a.texto}</span></span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              to="/login"
              search={{ mode: "signup" }}
              onClick={() => guardarPreseleccion(ficha.slug)}
              className="btn-pro inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold"
            >
              Probar Gosaryc gratis para {ficha.label} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/sectores/$slug"
              params={{ slug: ficha.slug }}
              className="btn-ghost-pro inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm text-foreground"
            >
              Ver ficha completa
            </Link>
          </div>
        </GlassPanel>
      ) : (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Toca tu tipo de negocio para ver qué problema resuelve, sus funciones reales y cómo empezar gratis.
        </p>
      )}
    </div>
  );
}

function LandingPage() {
  const { loading } = useAuth();
  const [fichaModulo, setFichaModulo] = useState<(typeof MODULOS)[number] | null>(null);

  useEffect(() => {
    if (!fichaModulo) return;
    const cerrar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFichaModulo(null);
    };
    window.addEventListener("keydown", cerrar);
    return () => window.removeEventListener("keydown", cerrar);
  }, [fichaModulo]);

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
            <Link to="/instalar" className="hidden rounded-full px-4 py-2 text-sm text-muted-foreground sm:inline-flex">Descargar app</Link>
            <Link to="/login" className="btn-pro inline-flex rounded-full px-5 py-2.5 text-sm font-semibold">Iniciar sesión</Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        {/* 1. INFORMACIÓN PRIMERO: qué es, para quién, por qué */}
        <section className="grid items-center gap-10 pb-6 pt-12 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div className="rise min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass/60 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> {BRAND.tagline} · Hecho en Colombia
            </p>
            <h1 className="mt-6 break-words font-display text-4xl leading-[1.05] tracking-tight sm:text-6xl">
              Todo tu negocio, <span className="text-brand-gradient">en un solo lugar</span>
            </h1>
            <p className="mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              {BRAND.description}
            </p>
            <div className="mt-6 flex flex-wrap gap-2 text-xs">
              {["Más de 50 tipos de negocio", "Facturación electrónica DIAN", "Nómina según ley colombiana", "Funciona sin internet"].map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-glass-border bg-glass/50 px-3 py-1.5 text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-primary" /> {t}
                </span>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Primero conoce el programa con calma. Cuando estés listo, crea tu cuenta o inicia sesión: tus datos se conservan siempre, incluso al actualizar.
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a href="#conocer" className="btn-pro inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold">
                <PlayCircle className="h-4 w-4" /> Conocer el programa
              </a>
              <Link to="/instalar" className="btn-ghost-pro inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm text-foreground">
                <Download className="h-4 w-4" /> Descargar app Android / PC
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
                  <div key={i} className="flex-1 rounded-t-lg" style={{ height: `${h}%`, background: `linear-gradient(to top, ${COLORES_SECTOR[i % COLORES_SECTOR.length]}33, ${COLORES_SECTOR[i % COLORES_SECTOR.length]})` }} />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <GlassPanel tier="inner" className="border-l-4 p-3" style={{ borderLeftColor: "#fb923c" }}><p className="text-xs text-muted-foreground">Pedidos de hoy</p><p className="font-display text-xl">38</p></GlassPanel>
                <GlassPanel tier="inner" className="border-l-4 p-3" style={{ borderLeftColor: "#60a5fa" }}><p className="text-xs text-muted-foreground">Cuentas por cobrar</p><p className="font-display text-xl">$216.000</p></GlassPanel>
              </div>
            </GlassPanel>
          </div>
        </section>

        {/* 2. QUÉ INCLUYE (tarjetas de colores) */}
        <section id="conocer" className="mt-16 scroll-mt-24" aria-labelledby="modulos">
          <p className="text-eyebrow text-center">Qué incluye</p>
          <h2 id="modulos" className="mt-3 text-center font-display text-3xl sm:text-4xl">Un programa completo, explicado en lenguaje claro</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground sm:text-base">
            Cada tarjeta es un módulo real del programa. Los colores identifican la familia: ventas, operación, finanzas, equipo y cumplimiento. Al crear tu cuenta, verás solo los módulos de tu tipo de negocio, con tus colores y tu logo.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MODULOS.map((m) => (
              <button key={m.label} type="button" onClick={() => setFichaModulo(m)} className={`group block h-full text-left ${m.grande ? "lg:col-span-2" : ""}`}>
                <GlassPanel className="relative h-full overflow-hidden p-6 transition-transform duration-300 group-hover:-translate-y-1" style={{ borderTop: `3px solid ${m.color}` }}>
                  <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-20 blur-2xl" style={{ background: m.color }} />
                  <span className="icon-chip h-12 w-12 rounded-2xl" style={{ background: `${m.color}1f`, color: m.color }}><m.Icon className="h-5 w-5" /></span>
                  <h3 className="mt-5 font-display text-lg">{m.label}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{m.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium opacity-0 transition group-hover:opacity-100" style={{ color: m.color }}>
                    Ver detalle <ArrowRight className="h-3 w-3" />
                  </span>
                </GlassPanel>
              </button>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Toca cualquier tarjeta para ver el detalle sin iniciar sesión.
          </p>

          {fichaModulo && (
            <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="dialog" aria-modal="true" aria-label={fichaModulo.label}>
              <button type="button" aria-label="Cerrar detalle" onClick={() => setFichaModulo(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
              <GlassPanel tier="strong" className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto p-6 text-left sm:p-8">
                <div className="flex items-start justify-between gap-4">
                  <span className="icon-chip h-12 w-12 shrink-0 rounded-2xl" style={{ background: `${fichaModulo.color}1f`, color: fichaModulo.color }}><fichaModulo.Icon className="h-6 w-6" /></span>
                  <button type="button" onClick={() => setFichaModulo(null)} aria-label="Cerrar" className="rounded-full border border-glass-border bg-glass/40 p-2 text-muted-foreground transition hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="mt-4 font-display text-2xl">{fichaModulo.label}</h3>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">{fichaModulo.detalle}</p>
                <p className="mt-5 font-medium text-foreground">Beneficios reales</p>
                <ul className="mt-2 space-y-2">
                  {fichaModulo.beneficios.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span className="text-muted-foreground">{b}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-5 font-medium text-foreground">Cómo funciona</p>
                <p className="mt-1 text-sm text-muted-foreground">{fichaModulo.como}</p>
                <div className="mt-6 flex flex-col gap-3">
                  <Link to="/login" search={{ mode: "signup" }} className="btn-pro inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold">
                    Crear cuenta y probar gratis <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/login" search={{ mode: "signin" }} className="btn-ghost-pro inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm text-foreground">
                    Ya tengo cuenta, iniciar sesión
                  </Link>
                </div>
              </GlassPanel>
            </div>
          )}
        </section>

        {/* 3. AGENTE WHATSAPP */}
        <section className="mt-24" aria-labelledby="agente-ia">
          <GlassPanel tier="strong" className="relative overflow-hidden p-6 sm:p-10">
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
            <p className="text-eyebrow text-center">Atención automática</p>
            <h2 id="agente-ia" className="mt-3 text-center font-display text-3xl sm:text-4xl">
              Un agente de WhatsApp que atiende y vende por ti, las 24 horas
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-muted-foreground sm:text-base">
              Se conecta al número de tu negocio, responde dudas de horarios, precios y pedidos al instante, y aprende de tus propias respuestas para sonar cada vez más como tu equipo. Tú puedes intervenir cuando quieras.
            </p>
            <div className="relative mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { Icon: Headphones, titulo: "Servicio al cliente", desc: "Resuelve dudas de horarios, precios, garantías y entregas al instante.", color: "#22d3ee" },
                { Icon: Bot, titulo: "Asesor y vendedor", desc: "Recomienda productos, resuelve objeciones y ayuda a cerrar la venta.", color: "#f472b6" },
                { Icon: Brain, titulo: "Aprende de tu negocio", desc: "Se adapta a tu tipo de negocio y mejora con cada conversación real.", color: "#a3e635" },
                { Icon: MessageCircle, titulo: "Un número por negocio", desc: "Cada negocio conecta su propio WhatsApp. Tú puedes tomar el chat cuando quieras.", color: "#fb923c" },
              ].map(({ Icon, titulo, desc, color }) => (
                <GlassPanel key={titulo} tier="inner" className="border-t-2 p-4" style={{ borderTopColor: color }}>
                  <span className="icon-chip h-10 w-10 rounded-xl" style={{ background: `${color}1f`, color }}><Icon className="h-5 w-5" /></span>
                  <h3 className="mt-3 font-medium text-foreground">{titulo}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                </GlassPanel>
              ))}
            </div>
          </GlassPanel>
        </section>

        {/* 4. ADAPTADO A CADA NEGOCIO */}
        <section className="mt-24" aria-labelledby="para-quien">
          <p className="text-eyebrow text-center">Por tipo de negocio</p>
          <h2 id="para-quien" className="mt-3 text-center font-display text-3xl sm:text-4xl">El programa se adapta a tu negocio, no al revés</h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-sm text-muted-foreground">Cada tipo de negocio recibe sus módulos, sus textos y su color. Elige el tuyo para ver el detalle.</p>
          <ExploradorSectores />
        </section>

        {/* 5. POR QUÉ + ACTUALIZACIONES + APP */}
        <section className="mt-24" aria-labelledby="por-que">
          <p className="text-eyebrow text-center">Ventajas</p>
          <h2 id="por-que" className="mt-3 text-center font-display text-3xl sm:text-4xl">¿Por qué elegir {BRAND.name}?</h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {[...POR_QUE, ...VENTAJAS].map(({ Icon, titulo, desc, color }) => (
              <GlassPanel key={titulo} className="flex items-start gap-4 border-l-4 p-5" style={{ borderLeftColor: color }}>
                <span className="icon-chip h-11 w-11 shrink-0 rounded-xl" style={{ background: `${color}1f`, color }}><Icon className="h-5 w-5" /></span>
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground">{titulo}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
                </div>
              </GlassPanel>
            ))}
          </div>
          <GlassPanel tier="strong" className="mt-6 flex flex-col gap-4 p-6 sm:flex-row sm:items-center">
            <span className="icon-chip h-12 w-12 shrink-0 rounded-2xl"><RefreshCw className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-foreground">Actualizaciones sin perder tu información</h3>
              <p className="mt-1 text-sm text-muted-foreground">Cuando publiquemos una mejora, el programa te avisará con un mensaje dentro de la app. La actualización conserva tus productos, clientes, ventas y saldos. Solo se instala la base nueva; tu información queda intacta. Si la mejora incluye una app nueva, también te avisaremos para que descargues e instales la APK en tus celulares Android.</p>
            </div>
            <Link to="/instalar" className="btn-pro inline-flex shrink-0 items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"><Download className="h-4 w-4" /> Descargar APK y app</Link>
          </GlassPanel>
        </section>

        {/* 6. PASOS + ACCESO (login/registro al final) */}
        <section className="mt-24" aria-labelledby="como">
          <p className="text-eyebrow text-center">Cómo empezar</p>
          <h2 id="como" className="mt-3 text-center font-display text-3xl sm:text-4xl">Empieza en 3 pasos</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {PASOS.map((p, i) => (
              <li key={p.n}>
                <GlassPanel className="h-full border-t-4 p-6" style={{ borderTopColor: COLORES_SECTOR[i % COLORES_SECTOR.length] }}>
                  <span className="font-display text-4xl text-brand-gradient">{p.n}</span>
                  <h3 className="mt-3 font-medium text-foreground">{p.titulo}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                </GlassPanel>
              </li>
            ))}
          </ol>
        </section>

        {/* 7. CIERRE CON ACCESO */}
        <section className="mt-24" id="acceso">
          <GlassPanel tier="strong" className="relative mx-auto max-w-4xl overflow-hidden p-8 text-center sm:p-12">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
            <h2 className="relative font-display text-3xl sm:text-4xl">Lleva tu negocio al siguiente nivel</h2>
            <p className="relative mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">Ya viste lo que incluye. Ahora crea tu cuenta gratis o inicia sesión para activar los módulos de tu tipo de negocio, con tus colores y tu logo.</p>
            <ul className="relative mx-auto mt-6 flex max-w-md flex-col gap-2 text-left text-sm text-muted-foreground">
              {["Funciona en la web y como app instalable en Android y PC", "Tus colores, tu logo y tus datos siempre a salvo", "Módulos y textos según tu tipo de negocio"].map((t) => (
                <li key={t} className="flex items-center gap-2"><Check className="h-4 w-4 shrink-0 text-primary" /> {t}</li>
              ))}
            </ul>
            <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/login" className="btn-pro inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm font-semibold">
                Crear mi cuenta gratis <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/login" className="btn-ghost-pro inline-flex items-center justify-center gap-2 rounded-full px-8 py-3.5 text-sm text-foreground">
                Ya tengo cuenta: iniciar sesión
              </Link>
            </div>
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
