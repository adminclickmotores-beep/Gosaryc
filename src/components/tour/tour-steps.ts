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
    route: "/restaurante",
    eyebrow: "Recorrido rápido",
    title: "Conozcamos tu panel.",
    body: "Te señalo lo principal del menú y para qué sirve cada cosa. Usa ← → para avanzar y Esc para salir.",
    placement: "center",
  },
  {
    id: "nav-panel",
    route: "/restaurante",
    target: '[data-tour="nav-/restaurante"]',
    context: SIDEBAR,
    openTo: "/restaurante",
    eyebrow: "Tu panel",
    title: "Tu pantalla de cada día.",
    body: "Aquí atiendes pedidos, ventas, caja y todo lo del día a día de tu negocio. Empieza tu jornada aquí.",
    placement: "right",
  },
  {
    id: "nav-settings",
    route: "/restaurante",
    target: '[data-tour="nav-settings"]',
    context: SIDEBAR,
    openTo: "/settings",
    eyebrow: "Configuración",
    title: "Tu negocio, tu equipo y tu cuenta.",
    body: "Invita a tu equipo, define qué puede ver cada persona y configura el enlace público de tu negocio.",
    placement: "right",
  },
  {
    id: "setup-pill",
    route: "/restaurante",
    target: '[data-tour="setup-pill"], [data-tour="onboarding-checklist"]',
    eyebrow: "Lista de inicio",
    title: "Tres pasos para arrancar.",
    body: "Sigue la píldora de arriba a la derecha para dejar tu negocio listo rápido. Puedes repetir este recorrido desde ahí.",
    placement: "bottom",
  },
  {
    id: "done",
    route: "/restaurante",
    eyebrow: "Listo para trabajar",
    title: "Ahora a vender.",
    body: "Pulsa ⌘K en cualquier momento para saltar entre módulos.",
    placement: "center",
  },
];

export const TOUR_PREF_KEY = "tour_v1";
