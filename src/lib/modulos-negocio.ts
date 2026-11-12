import {
  ChefHat,
  Bike,
  Boxes,
  Wallet,
  MessageCircle,
  UtensilsCrossed,
  Car,
  KeyRound,
  Wrench,
  FileText,
  Users,
  CalendarDays,
  ShoppingBag,
  Store,
  Scissors,
  ClipboardList,
  Package,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export type TipoNegocioClave = "restaurante" | "concesionario" | "tienda" | "servicios" | "otro";

export type ModuloNegocio = {
  id: string;
  titulo: string;
  descripcion: string;
  Icon: LucideIcon;
  /** Ruta de la app donde vive el módulo (si ya existe). */
  ruta?: string;
  estado: "Activo" | "Próximo";
};

export type TipoNegocio = {
  clave: TipoNegocioClave;
  etiqueta: string;
  /** Nombre del panel principal en el menú lateral. */
  panel: string;
  /** Si usa pedidos, cocina/menú digital y domicilios. */
  usaPedidos: boolean;
  modulos: ModuloNegocio[];
};

const CLIENTES: ModuloNegocio = {
  id: "clientes",
  titulo: "Clientes y contactos",
  descripcion: "Registro de clientes e interesados.",
  Icon: Users,
  ruta: "/leads",
  estado: "Activo",
};
const AGENDA: ModuloNegocio = {
  id: "agenda",
  titulo: "Agenda y calendario",
  descripcion: "Citas, entregas y recordatorios.",
  Icon: CalendarDays,
  ruta: "/calendar",
  estado: "Activo",
};
const SOLICITUDES: ModuloNegocio = {
  id: "solicitudes",
  titulo: "Solicitudes y cotizaciones",
  descripcion: "Recibe y responde solicitudes de clientes.",
  Icon: ClipboardList,
  ruta: "/requests",
  estado: "Activo",
};
const FINANZAS: ModuloNegocio = {
  id: "finanzas",
  titulo: "Finanzas y rentabilidad",
  descripcion: "Ventas, costos y utilidad.",
  Icon: Wallet,
  estado: "Próximo",
};

export const TIPOS_NEGOCIO: TipoNegocio[] = [
  {
    clave: "restaurante",
    etiqueta: "Restaurante / comida",
    panel: "Restaurante",
    usaPedidos: true,
    modulos: [
      { id: "pedidos", titulo: "Pedidos y menú digital", descripcion: "Pedidos en línea y carta.", Icon: UtensilsCrossed, ruta: "/restaurante", estado: "Activo" },
      { id: "cocina", titulo: "Cocina y producción", descripcion: "Tablero de preparación.", Icon: ChefHat, ruta: "/restaurante", estado: "Activo" },
      { id: "domicilios", titulo: "Domicilios y clientes", descripcion: "Entregas y base de clientes.", Icon: Bike, ruta: "/domicilios", estado: "Activo" },
      { id: "inventario", titulo: "Inventarios y recetas", descripcion: "Insumos y costos por receta.", Icon: Boxes, estado: "Próximo" },
      FINANZAS,
      { id: "asistente", titulo: "Asistente de pedidos", descripcion: "Atiende pedidos por chat.", Icon: MessageCircle, ruta: "/agente", estado: "Activo" },
    ],
  },
  {
    clave: "concesionario",
    etiqueta: "Concesionario de vehículos",
    panel: "Concesionario",
    usaPedidos: false,
    modulos: [
      { id: "catalogo", titulo: "Catálogo de vehículos", descripcion: "Inventario con fotos, precio y ficha técnica.", Icon: Car, estado: "Próximo" },
      CLIENTES,
      { id: "pruebas", titulo: "Pruebas de manejo", descripcion: "Agenda de test drives.", Icon: KeyRound, ruta: "/calendar", estado: "Activo" },
      { id: "cotizaciones", titulo: "Cotizaciones y financiación", descripcion: "Propuestas y simulación de crédito.", Icon: FileText, ruta: "/requests", estado: "Activo" },
      { id: "taller", titulo: "Taller y posventa", descripcion: "Mantenimientos y garantías.", Icon: Wrench, estado: "Próximo" },
      FINANZAS,
    ],
  },
  {
    clave: "tienda",
    etiqueta: "Tienda / comercio",
    panel: "Tienda",
    usaPedidos: false,
    modulos: [
      { id: "productos", titulo: "Catálogo de productos", descripcion: "Productos, precios y categorías.", Icon: ShoppingBag, estado: "Próximo" },
      { id: "inventario", titulo: "Inventario", descripcion: "Existencias y reposición.", Icon: Package, estado: "Próximo" },
      CLIENTES,
      SOLICITUDES,
      FINANZAS,
    ],
  },
  {
    clave: "servicios",
    etiqueta: "Servicios / citas",
    panel: "Servicios",
    usaPedidos: false,
    modulos: [
      { id: "servicios", titulo: "Catálogo de servicios", descripcion: "Servicios, duración y precio.", Icon: Scissors, estado: "Próximo" },
      AGENDA,
      CLIENTES,
      SOLICITUDES,
      FINANZAS,
    ],
  },
  {
    clave: "otro",
    etiqueta: "Otro tipo de negocio",
    panel: "Mi negocio",
    usaPedidos: false,
    modulos: [
      { id: "catalogo", titulo: "Catálogo", descripcion: "Lo que ofreces a tus clientes.", Icon: Store, estado: "Próximo" },
      CLIENTES,
      AGENDA,
      SOLICITUDES,
      { id: "equipo", titulo: "Equipo y tareas", descripcion: "Organiza a tu equipo.", Icon: Briefcase, estado: "Próximo" },
      FINANZAS,
    ],
  },
];

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Convierte el texto guardado en "tipo_negocio" (clave o texto libre) en un tipo conocido. */
export function resolverTipoNegocio(valor: string | null | undefined): TipoNegocio {
  const t = sinAcentos((valor ?? "").trim());
  const por = (c: TipoNegocioClave) => TIPOS_NEGOCIO.find((x) => x.clave === c) as TipoNegocio;
  if (!t) return por("restaurante");
  const directo = TIPOS_NEGOCIO.find((x) => x.clave === t);
  if (directo) return directo;
  if (/vehic|carro|auto|moto|concesion/.test(t)) return por("concesionario");
  if (/comida|restaur|cafe|pizz|panader|bar\b|hamburg|pollo|chuleta/.test(t)) return por("restaurante");
  if (/tienda|comercio|repuesto|retail|ropa|boutique/.test(t)) return por("tienda");
  if (/servicio|cita|salon|belleza|barber|clinic|dental|spa|taller/.test(t)) return por("servicios");
  return por("otro");
}
