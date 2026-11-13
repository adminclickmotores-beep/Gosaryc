export type TourStep = {
  id: string;
  route?: string;
  /** CSS selector of the element to spotlight + ring */
  target?: string;
  /**
   * Optional broader region selector to keep visible (un-dimmed) while the
   * narrow `target` gets the focus ring. Use to keep nav/sidebar context.
   */
  context?: string;
  eyebrow: string;
  title: string;
  body: string;
  /** Optional deep-link shown as "Open this →" inside the tooltip */
  openTo?: string;
  /** Preferred tooltip placement relative to target */
  placement?: "bottom" | "top" | "right" | "left" | "center";
  /** Force the sidebar's tools subtree open before resolving target */
  expandTools?: boolean;
};

const SIDEBAR = '[data-tour="sidebar"]';

export const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    route: "/dashboard",
    eyebrow: "Recorrido de 2 minutos",
    title: "Recorramos toda la app.",
    body: "Te señalo cada opción del menú, de arriba abajo, y te explico en una línea para qué sirve. Usa ← → para avanzar y Esc para salir.",
    placement: "center",
  },

  // ── Navegación principal ──────────────────────────────────────
  {
    id: "nav-dashboard",
    route: "/dashboard",
    target: '[data-tour="nav-/dashboard"]',
    context: SIDEBAR,
    openTo: "/dashboard",
    eyebrow: "Esta semana",
    title: "Tu pantalla de cada día.",
    body: "Aquí ves lo que está en curso, el avance hacia tus metas y la siguiente acción que requiere tu atención. Empieza tu día aquí.",
    placement: "right",
  },
  {
    id: "nav-campaigns",
    route: "/dashboard",
    target: '[data-tour="nav-/campaigns"]',
    context: SIDEBAR,
    openTo: "/campaigns",
    eyebrow: "Proyectos",
    title: "Aquí vive cada proyecto.",
    body: "Una fila por proyecto: resumen, archivos, lista de pendientes y resultados. Pulsa \"Nuevo proyecto\" para crear uno o genéralo a partir de un resumen con ayuda de la IA.",
    placement: "right",
  },
  {
    id: "nav-tools",
    route: "/dashboard",
    target: '[data-tour="nav-/tools"]',
    context: SIDEBAR,
    openTo: "/tools",
    eyebrow: "Herramientas",
    title: "Tus herramientas, en 3 grupos.",
    body: "Proyecto listo para usar, Embudo y Constructor UTM. Abro el menú para que veas cada una.",
    placement: "right",
    expandTools: true,
  },

  // ── Submenú de herramientas ───────────────────────────────────
  {
    id: "tool-campaign",
    route: "/dashboard",
    target: '[data-tour="tool-campaign"]',
    context: SIDEBAR,
    openTo: "/tools?focus=campaign",
    eyebrow: "Herramientas › Proyecto listo para usar",
    title: "Lanza algo de principio a fin.",
    body: "Redacta, importa una lista y programa eventos desde un solo lugar. Úsalo cuando empieces algo nuevo.",
    placement: "right",
    expandTools: true,
  },
  {
    id: "tool-funnel",
    route: "/dashboard",
    target: '[data-tour="tool-funnel"]',
    context: SIDEBAR,
    openTo: "/funnel",
    eyebrow: "Herramientas › Embudo",
    title: "Define metas y revisa el avance.",
    body: "Las metas MQL / SQO fijan tus objetivos mensuales, de toda la organización o por proyecto. Desempeño muestra si vas por buen camino. Revísalo cada semana.",
    placement: "right",
    expandTools: true,
  },
  {
    id: "tool-utm",
    route: "/dashboard",
    target: '[data-tour="tool-utm"]',
    context: SIDEBAR,
    openTo: "/tools/utm",
    eyebrow: "Herramientas › Constructor UTM",
    title: "Enlaces ordenados, siempre.",
    body: "El generador de nombres crea nombres estándar, las convenciones de nombres mantienen tu forma de escribir y Todos los UTM muestra cada enlace que ha creado el equipo.",
    placement: "right",
    expandTools: true,
  },

  // ── Resto de la navegación ────────────────────────────────────
  {
    id: "nav-calendar",
    route: "/dashboard",
    target: '[data-tour="nav-/calendar"]',
    context: SIDEBAR,
    openTo: "/calendar",
    eyebrow: "Calendario",
    title: "Cada envío, evento y lanzamiento.",
    body: "Vista mensual de todos los hitos, con colores por tipo. Arrastra para cambiar fechas. Es la fuente de verdad de \"qué sale y cuándo\".",
    placement: "right",
  },
  {
    id: "nav-requests",
    route: "/dashboard",
    target: '[data-tour="nav-/requests"]',
    context: SIDEBAR,
    openTo: "/requests",
    eyebrow: "Solicitudes",
    title: "Pedidos de todo el equipo.",
    body: "Cualquier persona puede pedir un proyecto desde tu enlace público. Clasifica, pasa a un proyecto o rechaza desde aquí.",
    placement: "right",
  },
  {
    id: "nav-templates",
    route: "/dashboard",
    target: '[data-tour="nav-/templates"]',
    context: SIDEBAR,
    openTo: "/templates",
    eyebrow: "Plantillas",
    title: "Puntos de partida reutilizables.",
    body: "Plantillas de resumen, diseños de correo y listas de pendientes. Guarda lo que funcionó una vez para que el siguiente proyecto empiece más adelantado.",
    placement: "right",
  },

  // ── Navegación inferior ───────────────────────────────────────
  {
    id: "nav-settings",
    route: "/dashboard",
    target: '[data-tour="nav-settings"]',
    context: SIDEBAR,
    openTo: "/settings",
    eyebrow: "Configuración",
    title: "Organización, equipo, etiquetas y marca.",
    body: "Invita a tu equipo, asigna roles, edita el vocabulario de tus proyectos y configura tu marca. Visítalo una vez al inicio y luego muy de vez en cuando.",
    placement: "right",
  },
  {
    id: "nav-integrations",
    route: "/dashboard",
    target: '[data-tour="nav-integrations"]',
    context: SIDEBAR,
    openTo: "/integrations",
    eyebrow: "Conexiones",
    title: "Conecta tu CRM, webhooks y más.",
    body: "Sin esto, verás datos de demostración. Conecta aquí tu CRM y tu correo para que cada panel muestre datos reales. Hazlo el primer día.",
    placement: "right",
  },

  // ── Píldora superior derecha ──────────────────────────────────
  {
    id: "setup-pill",
    route: "/dashboard",
    target: '[data-tour="setup-pill"], [data-tour="onboarding-checklist"]',
    eyebrow: "Lista de inicio",
    title: "Cinco pasos de 30 segundos.",
    body: "Sigue la píldora de arriba a la derecha para aprovechar la app rápido. Puedes repetir este recorrido cuando quieras desde ahí.",
    placement: "bottom",
  },

  // ── Cierre ────────────────────────────────────────────────────
  {
    id: "done",
    route: "/dashboard",
    eyebrow: "Listo",
    title: "Ahora a trabajar.",
    body: "Pulsa ⌘K en cualquier momento para saltar entre herramientas. Repite este recorrido desde la píldora de inicio si lo necesitas.",
    placement: "center",
  },
];

export const TOUR_PREF_KEY = "tour_v1";
