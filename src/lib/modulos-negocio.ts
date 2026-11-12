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
  Receipt,
  Coins,
  Gift,
  Star,
  Truck,
  Smartphone,
  QrCode,
  Percent,
  Tag,
  Bell,
  BadgeCheck,
  Shield,
  Repeat,
  Megaphone,
  Target,
  Banknote,
  Armchair,
  type LucideIcon,
} from "lucide-react";

export type TipoNegocioClave = "restaurante" | "concesionario" | "tienda" | "servicios" | "otro";

export type ModuloNegocio = {
  id: string;
  titulo: string;
  descripcion: string;
  Icon: LucideIcon;
  /** Ruta de la app donde vive el módulo. */
  ruta?: string;
  estado: "Activo" | "Próximo";
};

export type TipoNegocio = {
  clave: TipoNegocioClave;
  etiqueta: string;
  panel: string;
  usaPedidos: boolean;
  modulos: ModuloNegocio[];
};

/** Módulo funcional con registros propios (pantalla /modulos/<id>). */
const m = (id: string, titulo: string, descripcion: string, Icon: LucideIcon): ModuloNegocio => ({
  id,
  titulo,
  descripcion,
  Icon,
  ruta: `/modulos/${id}`,
  estado: "Activo",
});

// ---- Módulos transversales pensados para negocios colombianos ----
const FIADOS = m("fiados", "Cartera y fiados", "Quién te debe, cuánto y cuándo prometió pagar.", Coins);
const FACTURAS = m("facturas", "Facturación DIAN", "Control de facturas electrónicas y documentos soporte.", Receipt);
const PAGOS = m("pagos_digitales", "Nequi, Daviplata y Bre-B", "Concilia pagos por transferencia contra tus ventas.", Smartphone);
const FIDELIZACION = m("fidelizacion", "Puntos y recompensas", "Premia a tus clientes frecuentes.", Gift);
const RESENAS = m("resenas", "Reseñas y PQRS", "Quejas, reclamos y opiniones con seguimiento.", Star);
const DIFUSION = m("difusion", "Difusión por WhatsApp", "Promociones y recordatorios para tus contactos.", Megaphone);
const CAJA = m("caja_diaria", "Caja y gastos diarios", "Apertura, cierre de caja y gastos del día.", Banknote);
const PROVEEDORES = m("proveedores", "Proveedores y compras", "Pedidos y deudas con proveedores.", Truck);
const EMPLEADOS = m("equipo_turnos", "Equipo, turnos y nómina", "Turnos, pagos y novedades del personal.", Briefcase);
const METAS = m("metas", "Metas y objetivos", "Metas de ventas y seguimiento semanal.", Target);
const GARANTIAS = m("garantias", "Garantías y postventa", "Seguimiento a reclamos y garantías.", BadgeCheck);

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
      { id: "asistente", titulo: "Asistente de pedidos", descripcion: "Atiende pedidos por chat.", Icon: MessageCircle, ruta: "/agente", estado: "Activo" },
      m("repartidores", "Repartidores y liquidación", "Pago por domicilio y cuentas de cada domiciliario.", Bike),
      m("mesas", "Reservas de mesas", "Reservas y control de mesas.", Armchair),
      m("combos", "Combos y promociones", "Combos del día, 2x1 y descuentos por horario.", Percent),
      m("insumos", "Inventario de insumos", "Ingredientes, mermas y alertas de faltantes.", Boxes),
      m("propinas", "Propinas y reparto", "Registro y reparto de propinas entre el equipo.", Coins),
      m("suscripciones", "Pedidos recurrentes", "Clientes que piden cada semana (almuerzos, corporativos).", Repeat),
      FIADOS, FACTURAS, PAGOS, FIDELIZACION, RESENAS, DIFUSION, CAJA, PROVEEDORES, EMPLEADOS, METAS,
    ],
  },
  {
    clave: "concesionario",
    etiqueta: "Concesionario de vehículos",
    panel: "Concesionario",
    usaPedidos: false,
    modulos: [
      m("vehiculos", "Inventario de vehículos", "Placa, marca, modelo, precio y estado de cada vehículo.", Car),
      CLIENTES,
      m("pruebas_manejo", "Pruebas de manejo", "Agenda de test drives con seguimiento.", KeyRound),
      m("cotizaciones_veh", "Cotizaciones y financiación", "Propuestas, cuota inicial y simulación de crédito.", FileText),
      m("permutas", "Retomas y permutas", "Avalúo de vehículos recibidos en parte de pago.", Repeat),
      m("tramites", "Trámites: SOAT, traspaso y matrícula", "Control de trámites y vencimientos por vehículo.", Shield),
      m("taller", "Taller y mantenimientos", "Órdenes de servicio y repuestos.", Wrench),
      m("seguimiento_leads", "Seguimiento de interesados", "Recordatorios para cerrar cada venta.", Bell),
      m("comisiones", "Comisiones de asesores", "Comisión por venta de cada asesor.", Percent),
      FACTURAS, GARANTIAS, FIDELIZACION, RESENAS, DIFUSION, CAJA, EMPLEADOS, METAS, FINANZAS,
    ],
  },
  {
    clave: "tienda",
    etiqueta: "Tienda / comercio",
    panel: "Tienda",
    usaPedidos: false,
    modulos: [
      m("productos", "Catálogo de productos", "Productos, precios y categorías.", ShoppingBag),
      m("inventario", "Inventario y reposición", "Existencias y alertas de bajo stock.", Package),
      m("apartados", "Apartados (plan separe)", "Abonos y entrega de productos separados.", Tag),
      m("catalogo_whatsapp", "Catálogo para WhatsApp", "Comparte tu catálogo con un enlace.", QrCode),
      m("devoluciones", "Cambios y devoluciones", "Control de cambios y notas crédito.", Repeat),
      CLIENTES, SOLICITUDES,
      FIADOS, FACTURAS, PAGOS, FIDELIZACION, RESENAS, DIFUSION, CAJA, PROVEEDORES, EMPLEADOS, METAS, FINANZAS,
    ],
  },
  {
    clave: "servicios",
    etiqueta: "Servicios / citas",
    panel: "Servicios",
    usaPedidos: false,
    modulos: [
      m("catalogo_servicios", "Catálogo de servicios", "Servicios, duración y precio.", Scissors),
      AGENDA,
      m("paquetes", "Paquetes y membresías", "Bonos de sesiones y planes mensuales.", Gift),
      m("historial", "Historial del cliente", "Notas y trabajos realizados por cliente.", ClipboardList),
      m("lista_espera", "Lista de espera", "Clientes por atender cuando se libere un cupo.", Bell),
      m("comisiones", "Comisiones del personal", "Pago por servicio realizado.", Percent),
      CLIENTES, SOLICITUDES,
      FIADOS, FACTURAS, PAGOS, FIDELIZACION, RESENAS, DIFUSION, CAJA, PROVEEDORES, EMPLEADOS, METAS, FINANZAS,
    ],
  },
  {
    clave: "otro",
    etiqueta: "Otro tipo de negocio",
    panel: "Mi negocio",
    usaPedidos: false,
    modulos: [
      m("catalogo", "Catálogo", "Lo que ofreces a tus clientes.", Store),
      CLIENTES, AGENDA, SOLICITUDES,
      FIADOS, FACTURAS, PAGOS, FIDELIZACION, RESENAS, DIFUSION, CAJA, PROVEEDORES, EMPLEADOS, METAS, FINANZAS,
    ],
  },
];

/** Busca un módulo por id en todos los tipos de negocio. */
export function buscarModulo(id: string): ModuloNegocio | undefined {
  for (const t of TIPOS_NEGOCIO) {
    const x = t.modulos.find((mm) => mm.id === id);
    if (x) return x;
  }
  return undefined;
}

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
