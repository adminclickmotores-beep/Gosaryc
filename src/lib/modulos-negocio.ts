import {
  Calculator,
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
  Target,
  Banknote,
  Armchair,
  Landmark,
  FolderOpen,
  PackageCheck,
  ShieldCheck,
  CalendarClock,
  TrendingUp,
  Cog,
  Handshake,
  Stethoscope,
  GraduationCap,
  BedDouble,
  Dumbbell,
  Hammer,
  Sprout,
  Building2,
  PawPrint,
  Laptop,
  Cake,
  Coffee,
  Sandwich,
  Pill,
  Sparkles,
  PartyPopper,
  Shirt,
  Scale,
  Gem,
  BookOpen,
  Thermometer,
  ScrollText,
  Trash2,
  Flower2,
  Glasses,
  Baby,
  Beef,
  ShoppingCart,
  Wine,
  Church,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react";

import { PROPIOS } from "@/lib/modulos-propios";

export type TipoNegocioClave =
  | "restaurante"
  | "concesionario"
  | "tienda"
  | "servicios"
  | "salud"
  | "educacion"
  | "hospedaje"
  | "gimnasio"
  | "construccion"
  | "agro"
  | "inmobiliaria"
  | "mascotas"
  | "tecnologia"
  | "transporte"
  | "panaderia"
  | "cafeteria"
  | "comida_rapida"
  | "catering"
  | "belleza"
  | "taller"
  | "farmacia"
  | "eventos"
  | "profesional"
  | "lavanderia"
  | "condominio"
  | "prestamos"
  | "textil"
  | "joyeria"
  | "celulares"
  | "papeleria"
  | "moda"
  | "ferreteria"
  | "supermercado"
  | "carniceria"
  | "licorera"
  | "floristeria"
  | "optica"
  | "guarderia"
  | "alquiler_vehiculos"
  | "seguridad_aseo"
  | "ganaderia"
  | "fundacion"
  | "iglesia"
  | "parqueadero";

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

/**
 * Identidad visual por familia de negocio: cada tipo de negocio tiene su acento de
 * color sutil y su nombre de familia. Se usa en cabeceras de módulos para
 * que cada negocio se sienta propio sin romper el diseño general.
 */
const FAMILIA_POR_CLAVE: Record<TipoNegocioClave, { familia: string; acento: string }> = {
  restaurante: { familia: "Comida", acento: "#fb923c" },
  panaderia: { familia: "Comida", acento: "#fb923c" },
  cafeteria: { familia: "Comida", acento: "#fb923c" },
  comida_rapida: { familia: "Comida", acento: "#fb923c" },
  catering: { familia: "Comida", acento: "#fb923c" },
  tienda: { familia: "Comercio", acento: "#60a5fa" },
  ferreteria: { familia: "Comercio", acento: "#60a5fa" },
  supermercado: { familia: "Comercio", acento: "#60a5fa" },
  carniceria: { familia: "Comercio", acento: "#60a5fa" },
  mascotas: { familia: "Comercio", acento: "#60a5fa" },
  tecnologia: { familia: "Comercio", acento: "#60a5fa" },
  celulares: { familia: "Comercio", acento: "#60a5fa" },
  papeleria: { familia: "Comercio", acento: "#60a5fa" },
  moda: { familia: "Comercio", acento: "#60a5fa" },
  textil: { familia: "Comercio", acento: "#60a5fa" },
  joyeria: { familia: "Comercio", acento: "#60a5fa" },
  floristeria: { familia: "Comercio", acento: "#60a5fa" },
  licorera: { familia: "Comercio", acento: "#60a5fa" },
  salud: { familia: "Salud", acento: "#34d399" },
  farmacia: { familia: "Salud", acento: "#34d399" },
  optica: { familia: "Salud", acento: "#34d399" },
  belleza: { familia: "Belleza", acento: "#f472b6" },
  gimnasio: { familia: "Belleza y deporte", acento: "#f472b6" },
  concesionario: { familia: "Automotriz", acento: "#fbbf24" },
  taller: { familia: "Automotriz y taller", acento: "#fbbf24" },
  alquiler_vehiculos: { familia: "Automotriz", acento: "#fbbf24" },
  transporte: { familia: "Automotriz y transporte", acento: "#fbbf24" },
  parqueadero: { familia: "Automotriz y transporte", acento: "#fbbf24" },
  construccion: { familia: "Construcción y agro", acento: "#a3e635" },
  agro: { familia: "Construcción y agro", acento: "#a3e635" },
  inmobiliaria: { familia: "Construcción y agro", acento: "#a3e635" },
  ganaderia: { familia: "Construcción y agro", acento: "#a3e635" },
  hospedaje: { familia: "Hotel y educación", acento: "#22d3ee" },
  educacion: { familia: "Hotel y educación", acento: "#22d3ee" },
  guarderia: { familia: "Hotel y educación", acento: "#22d3ee" },
  eventos: { familia: "Hotel y educación", acento: "#22d3ee" },
  servicios: { familia: "Servicios", acento: "#c084fc" },
  profesional: { familia: "Servicios", acento: "#c084fc" },
  lavanderia: { familia: "Servicios", acento: "#c084fc" },
  condominio: { familia: "Servicios", acento: "#c084fc" },
  prestamos: { familia: "Servicios", acento: "#c084fc" },
  seguridad_aseo: { familia: "Servicios", acento: "#c084fc" },
  fundacion: { familia: "Servicios", acento: "#c084fc" },
  iglesia: { familia: "Servicios", acento: "#c084fc" },
};

/** Acento de color y familia del rubro para cabeceras e iconos. */
export function identidadRubro(clave: TipoNegocioClave): { familia: string; acento: string } {
  return FAMILIA_POR_CLAVE[clave] ?? { familia: "Servicios", acento: "#c084fc" };
}

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
const FIADOS: ModuloNegocio = {
  ...m("fiados", "Cartera y cuentas por cobrar", "Control profesional de saldos pendientes: quién te debe, cuánto, cuándo prometió pagar y el historial completo de abonos.", Coins),
  ruta: "/cartera-fiados",
};
const FACTURAS = m("facturas", "Facturación DIAN", "Control de facturas electrónicas y documentos soporte.", Receipt);
const PAGOS: ModuloNegocio = {
  ...m("pagos_digitales", "Nequi, Daviplata y Bre-B", "Concilia pagos por transferencia contra tus ventas.", Smartphone),
  ruta: "/pagos-digitales",
};
const FIDELIZACION: ModuloNegocio = {
  ...m("fidelizacion", "Puntos y recompensas", "Premia a tus clientes frecuentes.", Gift),
  ruta: "/puntos-recompensas",
};
const RESENAS: ModuloNegocio = {
  ...m("resenas", "Reseñas y PQRS", "Quejas, reclamos y opiniones con seguimiento.", Star),
  ruta: "/resenas-pqrs",
};
const CAJA = m("caja_diaria", "Caja y gastos diarios", "Apertura, cierre de caja y gastos del día.", Banknote);
const PROVEEDORES: ModuloNegocio = {
  ...m("proveedores", "Proveedores y compras", "Pedidos y deudas con proveedores.", Truck),
  ruta: "/proveedores-compras",
};
const EMPLEADOS: ModuloNegocio = {
  ...m("equipo_turnos", "Equipo, turnos y nómina", "Turnos, pagos y novedades del personal.", Briefcase),
  ruta: "/equipo-nomina",
};
const METAS: ModuloNegocio = {
  ...m("metas", "Metas y objetivos", "Metas de ventas y seguimiento semanal.", Target),
  ruta: "/metas",
};
const GARANTIAS = m("garantias", "Garantías y postventa", "Seguimiento a reclamos y garantías.", BadgeCheck);

const CLIENTES: ModuloNegocio = {
  id: "clientes",
  titulo: "Clientes y contactos",
  descripcion: "Registro de clientes e interesados.",
  Icon: Users,
  ruta: "/leads",
  estado: "Activo",
};
const CLIENTES_TIENDA = m("clientes_tienda", "Clientes de la tienda", "Clientes frecuentes, compras, crédito y talla o marca preferida.", Users);
const PAGOS_TIENDA = m("pagos_tienda", "Pagos digitales de la tienda", "Concilia pagos con Nequi, Daviplata y Bre-B contra tus ventas del día.", Smartphone);
const PERSONAL_TIENDA = m("personal_tienda", "Vendedores, turnos y comisiones", "Turnos de vendedores, comisiones y pagos del personal de la tienda.", Briefcase);
const METAS_TIENDA = m("metas_tienda", "Metas de venta por vendedor", "Metas semanales de venta y seguimiento por vendedor.", Target);
const RESENAS_TIENDA = m("resenas_tienda", "Cambios, quejas y reseñas", "Quejas, reclamos y opiniones de clientes de la tienda con seguimiento.", Star);
const CLIENTES_SERVICIOS = m("clientes_servicios", "Clientes del negocio", "Clientes que reservan, sus citas, preferencias y saldos.", Users);
const PAGOS_SERVICIOS = m("pagos_servicios", "Pagos digitales y anticipos", "Concilia pagos con Nequi, Daviplata y Bre-B de cada cita o servicio.", Smartphone);
const RESENAS_SERVICIOS = m("resenas_servicios", "Quejas y reseñas de clientes", "Opiniones, quejas y reclamos sobre el servicio, con seguimiento.", Star);
const PERSONAL_SERVICIOS = m("personal_servicios", "Personal, turnos y comisiones", "Turnos de profesionales, comisiones por servicio y pagos del personal.", Briefcase);
const PAGOS_EDUCACION = m("pagos_educacion", "Pagos de pensiones y matrículas", "Recaudo por transferencia, efectivo y datáfono de cada estudiante, con recibo.", Smartphone);
const RESENAS_EDUCACION = m("resenas_educacion", "Quejas y peticiones de acudientes", "Reclamos, peticiones y sugerencias de padres y estudiantes, con seguimiento.", Star);
const PERSONAL_EDUCACION = m("personal_educacion", "Docentes, turnos y pagos", "Horas de clase, pagos a docentes y novedades del personal académico.", Briefcase);
const PAGOS_HOSP = m("pagos_hosp", "Cobros y pagos de huéspedes", "Recaudo de estadías, anticipos y cargos adicionales por medio de pago.", Smartphone);
const RESENAS_HOSP = m("resenas_hosp", "Quejas y reseñas de huéspedes", "Opiniones, quejas y solicitudes de los huéspedes, con seguimiento.", Star);
const PERSONAL_HOSP = m("personal_hosp", "Personal, turnos y comisiones", "Turnos de recepción, limpieza y pagos o comisiones del personal.", Briefcase);
const PAGOS_GYM = m("pagos_gym", "Cobros de membresías y pagos digitales", "Recaudo de planes, inscripciones y tienda del gimnasio por cada medio de pago.", Smartphone);
const RESENAS_GYM = m("resenas_gym", "Quejas y sugerencias de socios", "Reclamos, sugerencias y reseñas de socios, con seguimiento.", Star);
const PERSONAL_GYM = m("personal_gym", "Entrenadores, turnos y pagos", "Horarios de entrenadores, pagos por clase y novedades del personal.", Briefcase);
const CLIENTES_OBRA = m("clientes_obra", "Clientes y propietarios", "Clientes, propietarios y obras asociadas, con su contacto y saldos.", Users);
const PAGOS_OBRA = m("pagos_obra", "Pagos de obra y anticipos", "Anticipos, abonos y pagos de cada obra, por transferencia o efectivo.", Smartphone);
const RESENAS_OBRA = m("resenas_obra", "Reclamos y garantías de obra", "Reclamos y observaciones de clientes sobre el trabajo, con seguimiento.", Star);
const PERSONAL_OBRA = m("personal_obra", "Oficiales, jornales y pagos", "Jornales, destajos y pagos de oficiales por obra.", Briefcase);
const CLIENTES_AGRO = m("clientes_agro", "Compradores y clientes del campo", "Compradores de cosechas, almacenes y clientes, con sus entregas y saldos.", Users);
const PAGOS_AGRO = m("pagos_agro", "Pagos y liquidaciones de cosecha", "Cobros de ventas de cosecha y pagos a jornaleros o proveedores del campo.", Smartphone);
const PERSONAL_AGRO = m("personal_agro", "Jornaleros, turnos y pagos", "Jornales, cuadrillas y pagos del personal del campo.", Briefcase);
const CLIENTES_INMO = m("clientes_inmo", "Propietarios, interesados y arrendatarios", "Propietarios, compradores e interesados en arriendo, con sus inmuebles y saldos.", Users);
const PAGOS_INMO = m("pagos_inmo", "Pagos de arriendos y consignaciones", "Cánones, administración y consignaciones a propietarios por medio de pago.", Smartphone);
const PERSONAL_INMO = m("personal_inmo", "Asesores, turnos y comisiones", "Comisiones de asesores y pagos del personal de la inmobiliaria.", Briefcase);
const PAGOS_VET = m("pagos_vet", "Cobros de consultas y pagos digitales", "Cobro de consultas, cirugías, vacunas y productos por cada medio de pago.", Smartphone);
const RESENAS_VET = m("resenas_vet", "Quejas y reseñas de dueños", "Reclamos, sugerencias y reseñas de los dueños de mascotas, con seguimiento.", Star);
const PERSONAL_VET = m("personal_vet", "Veterinarios, turnos y pagos", "Turnos de veterinarios y auxiliares, honorarios y novedades del personal.", Briefcase);
const CLIENTES_TEC = m("clientes_tec", "Clientes y cuentas de software", "Clientes de la agencia, sus proyectos, contactos y contratos activos.", Users);
const PAGOS_TEC = m("pagos_tec", "Cobros de proyectos y suscripciones", "Cobros de proyectos, mensualidades y soporte por transferencia o pasarela.", Smartphone);
const PERSONAL_TEC = m("personal_tec", "Equipo técnico, horas y pagos", "Horas de desarrolladores, pagos al equipo y novedades del personal técnico.", Briefcase);
const CLIENTES_TRANSP = m("clientes_transp", "Remitentes y clientes de carga", "Empresas y personas que envían carga, con sus rutas y tarifas pactadas.", Users);
const PAGOS_TRANSP = m("pagos_transp", "Cobros de fletes y pagos digitales", "Cobro de fletes, anticipos y saldos por transferencia o consignación.", Smartphone);
const RESENAS_TRANSP = m("resenas_transp", "Reclamos de carga y entregas", "Reclamos por averías, faltantes o retrasos, con seguimiento.", Star);
const PERSONAL_TRANSP = m("personal_transp", "Conductores, turnos y liquidaciones", "Liquidación de conductores y auxiliares de ruta por viaje y periodo.", Briefcase);
const CLIENTES_BELL = m("clientes_bell", "Clientas y clientes del salón", "Clientas con su historial, preferencias de color o tratamiento y citas.", Users);
const PAGOS_BELL = m("pagos_bell", "Cobros y pagos digitales del salón", "Cobro de servicios, productos y paquetes por cada medio de pago.", Smartphone);
const RESENAS_BELL = m("resenas_bell", "Quejas y reseñas de clientas", "Opiniones y reclamos sobre servicios y productos, con seguimiento.", Star);
const PERSONAL_BELL = m("personal_bell", "Estilistas, turnos y comisiones", "Turnos de estilistas y esteticistas, comisiones por servicio y novedades.", Briefcase);
const CLIENTES_TALLER = m("clientes_taller", "Dueños de vehículos", "Clientes del taller con sus vehículos, órdenes abiertas y saldos.", Users);
const PAGOS_TALLER = m("pagos_taller", "Cobros de órdenes y pagos digitales", "Cobro de mano de obra y repuestos por transferencia, efectivo o tarjeta.", Smartphone);
const RESENAS_TALLER = m("resenas_taller", "Reclamos de trabajos y garantías", "Reclamos sobre reparaciones realizadas, con seguimiento y solución.", Star);
const PERSONAL_TALLER = m("personal_taller", "Mecánicos, turnos y comisiones", "Turnos de mecánicos y hojalateros, comisiones por orden y novedades.", Briefcase);
const CLIENTES_FARM = m("clientes_farm", "Clientes y pacientes de la droguería", "Clientes frecuentes, cupos de crédito y pedidos con fórmula.", Users);
const PAGOS_FARM = m("pagos_farm", "Cobros y pagos digitales de la farmacia", "Cobro de ventas y domicilios por efectivo, tarjeta o transferencia.", Smartphone);
const RESENAS_FARM = m("resenas_farm", "Quejas y reseñas de clientes", "Reclamos por productos, precios o entregas, con seguimiento.", Star);
const PERSONAL_FARM = m("personal_farm", "Turnos de auxiliares y pagos", "Turnos de auxiliares y químicos, comisiones y novedades del personal.", Briefcase);
const CLIENTES_EVENTOS = m("clientes_eventos", "Anfitriones y clientes de eventos", "Anfitriones, empresas y familias con sus eventos, contratos y saldos.", Users);
const PAGOS_EVENTOS = m("pagos_eventos", "Anticipos y saldos de eventos", "Anticipos, abonos y saldos de cada evento por transferencia o tarjeta.", Smartphone);
const RESENAS_EVENTOS = m("resenas_eventos", "Quejas y reseñas de anfitriones", "Opiniones y reclamos sobre el evento o el servicio, con seguimiento.", Star);
const PERSONAL_EVENTOS = m("personal_eventos", "Staff, turnos y pagos por evento", "Meseros, fotógrafos y personal de apoyo: turnos, honorarios y novedades.", Briefcase);
const CLIENTES_PROF = m("clientes_prof", "Clientes y contrapartes del despacho", "Clientes del despacho, con sus casos abiertos y honorarios pactados.", Users);
const PAGOS_PROF = m("pagos_prof", "Pagos de honorarios y consignaciones", "Abonos de honorarios, consignaciones a terceros y pagos por transferencia.", Smartphone);
const RESENAS_PROF = m("resenas_prof", "Quejas y reseñas de clientes", "Observaciones y reclamos de clientes sobre la atención, con seguimiento.", Star);
const PERSONAL_PROF = m("personal_prof", "Asociados, asistentes y pagos", "Honorarios de asociados, horas de asistentes y novedades del equipo.", Briefcase);
const CLIENTES_LAV = m("clientes_lav", "Clientes de la lavandería", "Clientes frecuentes, empresas con contrato de ropa y su historial de prendas.", Users);
const PAGOS_LAV = m("pagos_lav", "Cobros y pagos digitales", "Cobro de servicios y domicilios por efectivo, tarjeta o transferencia.", Smartphone);
const RESENAS_LAV = m("resenas_lav", "Reclamos por prendas y entregas", "Prendas dañadas o perdidas, retrasos y reclamos, con seguimiento.", Star);
const PERSONAL_LAV = m("personal_lav", "Operarios, turnos y pagos", "Turnos de planchado y lavado, destajos y novedades del personal.", Briefcase);
const CLIENTES_COND = m("clientes_cond", "Propietarios e inquilinos", "Propietarios e inquilinos de cada unidad, con contacto y estado de cuenta.", Users);
const PAGOS_COND = m("pagos_cond", "Pagos de cuotas y consignaciones", "Pagos de administración, multas y consignaciones de cuotas por medio digital.", Smartphone);
const PERSONAL_COND = m("personal_cond", "Vigilancia, aseo y nómina", "Turnos de portería, aseo y mantenimiento, y pagos del personal del edificio.", Briefcase);
const CLIENTES_PREST = m("clientes_prest", "Clientes y deudores", "Prestatarios y avalistas con su historial de pagos y calificación de riesgo.", Users);
const PAGOS_PREST = m("pagos_prest", "Recaudos y abonos a préstamos", "Abonos a cuotas y recaudos en efectivo, transferencia o consignación.", Smartphone);
const PERSONAL_PREST = m("personal_prest", "Cobradores, turnos y comisiones", "Rutas de cobro, comisiones por recaudo y novedades de cada cobrador.", Briefcase);
const CLIENTES_TEXTIL = m("clientes_textil", "Marcas y clientes de confección", "Marcas, colegios y clientes que encargan prendas, con sus pedidos y saldos.", Users);
const PAGOS_TEXTIL = m("pagos_textil", "Anticipos y pagos de pedidos", "Anticipos de pedidos y pagos por transferencia o consignación.", Smartphone);
const PERSONAL_TEXTIL = m("personal_textil", "Operarios, destajos y nómina", "Pago por destajo de cada operario y novedades del taller de confección.", Briefcase);
const CLIENTES_JOY = m("clientes_joy", "Clientes de joyería y relojería", "Clientes con sus piezas, encargos, garantías y preferencias de diseño.", Users);
const PAGOS_JOY = m("pagos_joy", "Pagos y anticipos de piezas", "Anticipos de encargos y pagos de piezas por transferencia, tarjeta o efectivo.", Smartphone);
const RESENAS_JOY = m("resenas_joy", "Garantías y reclamos de clientes", "Reclamos sobre piezas, reparaciones o certificados, con seguimiento.", Star);
const PERSONAL_JOY = m("personal_joy", "Joyeros, vendedores y comisiones", "Comisiones de vendedores, pago a joyeros y novedades del equipo.", Briefcase);
const CLIENTES_CEL = m("clientes_cel", "Clientes de celulares", "Clientes con sus equipos, reparaciones, garantías y líneas activas.", Users);
const PAGOS_CEL = m("pagos_cel", "Cobros de equipos y reparaciones", "Cobro de celulares, accesorios y reparaciones por cada medio de pago.", Smartphone);
const RESENAS_CEL = m("resenas_cel", "Garantías y reclamos de equipos", "Reclamos por fallas, reparaciones o garantías, con seguimiento.", Star);
const PERSONAL_CEL = m("personal_cel", "Vendedores, técnicos y comisiones", "Comisiones de vendedores, pagos a técnicos y novedades del equipo.", Briefcase);
const CLIENTES_PAPEL = m("clientes_papel", "Colegios, empresas y clientes", "Colegios, empresas y clientes que compran útiles, copias o listas.", Users);
const PAGOS_PAPEL = m("pagos_papel", "Cobros y pagos digitales de la papelería", "Cobro de útiles, copias y pedidos de colegios por cada medio de pago.", Smartphone);
const PERSONAL_PAPEL = m("personal_papel", "Vendedores, turnos y pagos", "Turnos de vendedores, comisiones y novedades del personal de la papelería.", Briefcase);
const CLIENTES_MODA = m("clientes_moda", "Clientas y clientes de la tienda", "Clientes con sus tallas, colores preferidos, compras y apartados.", Users);
const PAGOS_MODA = m("pagos_moda", "Cobros y pagos digitales de la tienda", "Cobro de prendas y calzado por efectivo, tarjeta, Nequi o transferencia.", Smartphone);
const RESENAS_MODA = m("resenas_moda", "Cambios, quejas y reseñas", "Cambios de talla, quejas y opiniones de clientes, con seguimiento.", Star);
const PERSONAL_MODA = m("personal_moda", "Asesores de venta, turnos y comisiones", "Turnos de asesores de venta, comisiones por prenda y novedades.", Briefcase);
const METAS_MODA = m("metas_moda", "Metas de venta por temporada", "Metas de venta de prendas y calzado por temporada y por asesor.", Target);
const METAS_PAPEL = m("metas_papel", "Metas de temporada escolar", "Metas de ventas de útiles y listas escolares por temporada.", Target);
const METAS_CEL = m("metas_cel", "Metas de ventas y reparaciones", "Metas de equipos vendidos, reparaciones y líneas activadas por mes.", Target);
const FACTURAS_CEL = m("facturas_cel", "Facturación de equipos (DIAN)", "Facturas de celulares, accesorios y reparaciones, con IMEI y garantía.", Receipt);
const FACTURAS_PAPEL = m("facturas_papel", "Facturación de colegios y empresas (DIAN)", "Facturas de útiles, copias y pedidos de colegios y empresas.", Receipt);
const FACTURAS_MODA = m("facturas_moda", "Facturación de prendas (DIAN)", "Facturas de prendas y calzado, con talla y color.", Receipt);
const METAS_JOY = m("metas_joy", "Metas de ventas y encargos", "Metas de ventas de piezas y de encargos cerrados por mes.", Target);
const METAS_TEXTIL = m("metas_textil", "Metas de prendas y pedidos", "Metas de prendas confeccionadas y pedidos entregados por mes.", Target);
const METAS_PREST = m("metas_prest", "Metas de colocación y recuperación", "Metas de préstamos colocados y de cartera recuperada por mes.", Target);
const METAS_COND = m("metas_cond", "Metas de recaudo de cuotas", "Metas de recaudo mensual y cartera recuperada por torre.", Target);
const METAS_LAV = m("metas_lav", "Metas de kilos y facturación", "Metas de kilos lavados, órdenes y facturación por semana.", Target);
const METAS_PROF = m("metas_prof", "Metas de casos y honorarios", "Metas de casos cerrados y honorarios facturados por mes.", Target);
const METAS_EVENTOS = m("metas_eventos", "Metas de eventos y contratos", "Metas de eventos realizados y contratos cerrados por temporada.", Target);
const METAS_FARM = m("metas_farm", "Metas de ventas y rotación", "Metas de ventas mensuales y rotación de productos por categoría.", Target);
const METAS_TALLER = m("metas_taller", "Metas de órdenes y facturación", "Metas de órdenes cerradas y facturación mensual del taller.", Target);
const METAS_BELL = m("metas_bell", "Metas de servicios y productos", "Metas de servicios realizados y de venta de productos por profesional.", Target);
const METAS_TRANSP = m("metas_transp", "Metas de viajes y fletes", "Metas de viajes realizados, kilómetros y fletes facturados por mes.", Target);
const METAS_TEC = m("metas_tec", "Metas de proyectos y facturación", "Metas de proyectos entregados y facturación recurrente por mes.", Target);
const METAS_VET = m("metas_vet", "Metas de consultas y ventas", "Metas de consultas atendidas, vacunaciones y ventas de productos.", Target);
const METAS_INMO = m("metas_inmo", "Metas de negocios cerrados", "Metas de arriendos y ventas cerradas por asesor y mes.", Target);
const METAS_AGRO = m("metas_agro", "Metas de producción y ventas", "Metas de producción por lote y de ventas por temporada.", Target);
const METAS_OBRA = m("metas_obra", "Metas de obras y facturación", "Metas de obras entregadas y facturación por periodo.", Target);
const METAS_GYM = m("metas_gym", "Metas de socios y recaudo", "Metas de nuevos socios, renovaciones y recaudo por mes.", Target);
const METAS_HOSP = m("metas_hosp", "Metas de ocupación e ingresos", "Metas de ocupación y de ingresos por temporada.", Target);
const METAS_EDUCACION = m("metas_educacion", "Metas de matrícula y recaudo", "Metas de nuevas matrículas y de recaudo por periodo académico.", Target);
const METAS_SERVICIOS = m("metas_servicios", "Metas de citas y ventas", "Metas semanales de servicios realizados y seguimiento por profesional.", Target);
const FACTURAS_SALUD = m("facturas_salud", "Facturación y RIPS", "Facturas a pacientes y EPS, con RIPS, copagos y cuotas moderadoras.", Receipt);
const PAGOS_SALUD = m("pagos_salud", "Pagos y copagos digitales", "Concilia copagos y consultas pagadas por Nequi, Daviplata o transferencia.", Smartphone);
const RESENAS_SALUD = m("resenas_salud", "Quejas y satisfacción de pacientes", "Quejas, reclamos y sugerencias de pacientes, con respuesta y plazo.", Star);
const PERSONAL_SALUD = m("personal_salud", "Personal asistencial y nómina", "Turnos, contratos, honorarios por consulta y novedades del personal de salud.", Briefcase);
const METAS_SALUD = m("metas_salud", "Metas de atención", "Metas de consultas, procedimientos e ingresos por profesional.", Target);
const GLOSAS_SALUD = m("glosas_salud", "Glosas y cartera con EPS", "Glosas recibidas, respuesta dentro del plazo y pagos pendientes de aseguradoras.", Landmark);
const HABILITACION_SALUD = m("habilitacion_salud", "Habilitación y calidad", "REPS, autoevaluación de habilitación, calibración de equipos y planes de mejora.", ShieldCheck);
const RESIDUOS_SALUD = m("residuos_salud", "Residuos hospitalarios (PGIRASA)", "Bioseguridad, recolección y registro de residuos peligrosos y cortopunzantes.", Trash2);
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
const COTIZACIONES: ModuloNegocio = {
  ...m("cotizaciones", "Cotizaciones", "Arma propuestas con productos o servicios, envíalas por WhatsApp y sigue su cierre.", FileText),
  ruta: "/cotizaciones",
};
const FINANZAS: ModuloNegocio = {
  id: "finanzas",
  titulo: "Finanzas y rentabilidad",
  descripcion: "Ventas, costos, utilidad y registro contable.",
  Icon: Wallet,
  ruta: "/finanzas",
  estado: "Activo",
};

const ICONOS_PROPIOS: Record<string, LucideIcon> = {
  clientes: Users, facturas: Receipt, pagos: Smartphone, personal: Briefcase, metas: Target,
  fidelizacion: Gift, garantias: BadgeCheck, cotizaciones: FileText, mensualidades: Coins,
  caja: Banknote, proveedores: Truck, finanzas: Wallet, cuentas: Coins, agenda: CalendarDays,
};
/** Módulos propios de un negocio (clientes, facturación, pagos, personal, metas...) con sus textos y formularios. */
const propios = (suf: string, ...familias: string[]): ModuloNegocio[] =>
  familias.flatMap((fam) => {
    const f = PROPIOS[suf]?.[fam];
    if (!f) return [];
    return [m(`${fam}_${suf}`, f.titulo ?? "", f.desc ?? "", ICONOS_PROPIOS[fam])];
  });

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
      { ...m("repartidores", "Repartidores y liquidación", "Pago por domicilio y cuentas de cada domiciliario.", Bike), ruta: "/repartidores" },
      m("mesas", "Reservas de mesas", "Reservas y control de mesas.", Armchair),
      { ...m("combos", "Combos y promociones", "Combos del día, 2x1 y descuentos por horario.", Percent), ruta: "/combos" },
      m("insumos", "Inventario de insumos", "Ingredientes, mermas y alertas de faltantes.", Boxes),
      { ...m("propinas", "Propinas y reparto", "Registro y reparto de propinas entre el equipo.", Coins), ruta: "/propinas" },
      { ...m("suscripciones", "Pedidos recurrentes", "Clientes que piden cada semana (almuerzos, corporativos).", Repeat), ruta: "/pedidos-recurrentes" },
      m("plataformas_rest", "Rappi, DiDi Food y apps", "Ventas por cada app de domicilios, comisión que te cobran y lo que realmente te consignan.", Smartphone),
      m("mermas_rest", "Mermas y desperdicios", "Producto dañado, vencido o devuelto a cocina, con su costo, causa y responsable.", Trash2),
      m("sanidad_bpm", "Sanidad y buenas prácticas (BPM)", "Temperaturas de neveras, limpieza, fumigación, lavado de tanques y examen del personal manipulador.", Thermometer),
      m("permisos_rest", "Permisos y licencias", "Concepto sanitario, bomberos, Cámara de Comercio, SAYCO-ACINPRO, uso de suelo y fechas de renovación.", ScrollText),
      ...propios("rest", "cuentas"), FACTURAS, PAGOS, FIDELIZACION, RESENAS, ...propios("rest", "caja", "proveedores"), EMPLEADOS, METAS, ...propios("rest", "finanzas"),
    ],
  },
  {
    clave: "concesionario",
    etiqueta: "Concesionario de vehículos",
    panel: "Concesionario",
    usaPedidos: false,
    modulos: [
      m("vehiculos", "Inventario de vehículos", "Placa, marca, modelo, precio y estado de cada vehículo.", Car),
      m("vehiculos_usados", "Retomas de vehículos", "Usados que recibes como parte de pago, con peritaje y precio de retoma.", Handshake),
      m("compras_veh", "Compras de vehículos", "Negociaciones, ofertas, aprobaciones, órdenes de compra, recepción y pagos a proveedores o vendedores particulares.", ShoppingBag),
      m("consignaciones_veh", "Consignaciones", "Contrato, precio acordado, comisión, vigencia, gastos autorizados y liquidación al propietario.", FileText),
      m("inspecciones_veh", "Inspecciones y peritajes", "Estado mecánico, exterior e interior, reparaciones, repuestos y evidencias antes del alistamiento.", ClipboardList),
      m("prospectos_veh", "Prospectos y seguimientos", "Prospectos por asesor, seguimientos y contratos hasta cerrar la venta.", Users),
      CLIENTES,
      m("pruebas_manejo", "Pruebas de manejo", "Agenda de test drives con seguimiento.", KeyRound),
      m("cotizaciones_veh", "Cotizaciones", "Cotiza un vehículo de contado o a crédito, con la cuota calculada.", FileText),
      m("separaciones_veh", "Separaciones de vehículos", "Anticipos y reservas de un vehículo para un cliente.", Tag),
      m("ventas_veh", "Ventas y entregas", "Ventas cerradas, fecha y acta de entrega al cliente.", PackageCheck),
      m("creditos_veh", "Créditos y entidades financieras", "Solicitudes de crédito con bancos y financieras, y su estado.", Landmark),
      m("financiacion_veh", "Simulador de financiación", "Cuota, tabla de amortización mes a mes, PDF y envío por WhatsApp al cliente.", Calculator),
      m("alistamiento", "Alistamiento", "Lavado, revisión y papeles para dejar el vehículo listo para la venta.", ShieldCheck),      m("documentos_veh", "Documentos del vehículo", "Tarjeta de propiedad, tecnomecánica, seguros y contratos.", FolderOpen),
      m("vencimientos_veh", "Alertas de vencimientos", "SOAT, tecnomecánica y seguros próximos a vencer.", CalendarClock),
      m("taller", "Taller y mantenimientos", "Órdenes de servicio y repuestos.", Wrench),      m("costos_veh", "Costos y rentabilidad por vehículo", "Compra, reparaciones y utilidad de cada vehículo.", TrendingUp),
      m("cartera_veh", "Cartera y cuotas de clientes", "Saldos y cuotas pendientes de pago.", Coins),
      m("proveedores_veh", "Proveedores y gestores", "Gestores de trámites, talleres externos y proveedores.", Truck),
      m("comisiones", "Comisiones de asesores", "Comisión por venta de cada asesor.", Percent),
      FACTURAS, GARANTIAS, RESENAS, ...propios("veh", "caja"), EMPLEADOS, METAS, ...propios("veh", "finanzas"),
    ],
  },
  {
    clave: "tienda",
    etiqueta: "Tienda / comercio",
    panel: "Tienda",
    usaPedidos: false,
    modulos: [
      m("productos", "Productos e inventario", "Productos, precios, existencias y alertas de bajo stock.", ShoppingBag),
      m("apartados", "Apartados (plan separe)", "Abonos y entrega de productos separados.", Tag),
      m("devoluciones", "Cambios y devoluciones", "Control de cambios y notas crédito.", Repeat),
      CLIENTES_TIENDA,
      ...propios("tienda", "cuentas"), FACTURAS, PAGOS_TIENDA, FIDELIZACION, RESENAS_TIENDA, ...propios("tienda", "caja", "proveedores"), PERSONAL_TIENDA, METAS_TIENDA, ...propios("tienda", "finanzas"),
    ],
  },
  {
    clave: "servicios",
    etiqueta: "Servicios / citas",
    panel: "Servicios",
    usaPedidos: false,
    modulos: [
      m("catalogo_servicios", "Catálogo de servicios", "Servicios, duración y precio.", Scissors),
      m("profesionales", "Profesionales y recursos", "Quién presta cada servicio (profesional, técnico, instructor o terapeuta), su horario y el recurso que usa (sala, equipo o vehículo).", BadgeCheck),
      m("disponibilidad", "Disponibilidad", "Horarios y bloqueos de cada persona y recurso para evitar reservas duplicadas.", CalendarClock),
      ...propios("serv", "agenda"),
      m("prospectos_serv", "Prospectos", "Personas interesadas que aún no reservan, con seguimiento.", Users),
      m("ordenes_serv_cita", "Órdenes de servicio", "Reserva, asignación, seguimiento y finalización del servicio hasta facturación y pago.", ClipboardList),
      m("anticipos_serv", "Anticipos", "Anticipos de reservas y su aplicación al pago final.", Banknote),
      m("paquetes", "Paquetes y membresías", "Bonos de sesiones y planes mensuales.", Gift),
      m("historial", "Historial del cliente", "Notas y trabajos realizados por cliente.", ClipboardList),
      m("lista_espera", "Lista de espera", "Clientes por atender cuando se libere un cupo.", Bell),
      m("comisiones", "Comisiones del personal", "Pago por servicio realizado.", Percent),
      CLIENTES_SERVICIOS,
      FACTURAS, PAGOS_SERVICIOS, FIDELIZACION, RESENAS_SERVICIOS, ...propios("serv", "cuentas", "caja", "proveedores"), PERSONAL_SERVICIOS, METAS_SERVICIOS, ...propios("serv", "finanzas"),
    ],
  },
  {
    clave: "salud",
    etiqueta: "Salud / consultorio / clínica",
    panel: "Consultorio",
    usaPedidos: false,
    modulos: [
      m("pacientes", "Pacientes y fichas", "Datos de contacto y antecedentes de cada paciente.", Stethoscope),
      ...propios("salud", "agenda"),
      m("historia_clinica", "Historias y evoluciones", "Notas de cada consulta o tratamiento.", ClipboardList),
      m("tratamientos", "Tratamientos y presupuestos", "Planes de tratamiento con su valor y avance.", FileText),
      m("consultorios", "Consultorios y profesionales", "Consultorios, profesionales y su disponibilidad.", Landmark),
      m("procedimientos", "Procedimientos", "Procedimientos realizados a cada paciente, con su valor.", Scissors),
      m("ordenes_medicas", "Órdenes médicas", "Exámenes y remisiones indicados por el profesional.", FileText),
      m("formulas", "Fórmulas", "Medicamentos formulados a cada paciente.", Pill),
      m("consentimientos", "Consentimientos", "Consentimientos informados firmados por cada paciente, con fecha y vigencia.", ClipboardList),
      m("convenios_salud", "Convenios y seguros", "Convenios con empresas y aseguradoras, y sus tarifas pactadas.", Handshake),
      m("auditoria_clinica", "Auditoría de accesos", "Registro de quién consultó o modificó información clínica.", ShieldCheck),
      m("insumos_salud", "Insumos y medicamentos", "Existencias y alertas de faltantes.", Package),
      m("autorizaciones", "Autorizaciones y EPS", "Seguimiento de autorizaciones y cobros a aseguradoras.", Landmark),
      GLOSAS_SALUD, HABILITACION_SALUD, RESIDUOS_SALUD,
      FACTURAS_SALUD, PAGOS_SALUD, RESENAS_SALUD, ...propios("salud", "cuentas", "caja", "proveedores"), PERSONAL_SALUD, METAS_SALUD, ...propios("salud", "finanzas"),
    ],
  },
  {
    clave: "educacion",
    etiqueta: "Educación / academia / cursos",
    panel: "Academia",
    usaPedidos: false,
    modulos: [
      m("estudiantes", "Estudiantes y matrículas", "Inscripciones y datos de cada estudiante.", GraduationCap),
      m("cursos", "Cursos y grupos", "Cursos, horarios, cupos y docentes.", ClipboardList),
      ...propios("edu", "agenda"),
      m("mensualidades", "Pensiones y mensualidades", "Pagos pendientes y recordatorios de cobro.", Coins),
      m("asistencia", "Asistencia y notas", "Seguimiento del avance de cada estudiante.", BadgeCheck),
      FACTURAS, PAGOS_EDUCACION, RESENAS_EDUCACION, ...propios("edu", "cuentas", "caja", "proveedores"), PERSONAL_EDUCACION, METAS_EDUCACION, ...propios("edu", "finanzas"),
    ],
  },
  {
    clave: "hospedaje",
    etiqueta: "Hotel / hospedaje / turismo",
    panel: "Hospedaje",
    usaPedidos: false,
    modulos: [
      m("habitaciones", "Habitaciones y disponibilidad", "Estado y tarifa de cada habitación o espacio.", BedDouble),
      m("reservas_hosp", "Reservas", "Entradas, salidas y anticipos de huéspedes.", CalendarClock),
      m("huespedes", "Huéspedes", "Registro y preferencias de tus huéspedes.", Users),
      m("servicios_extra", "Servicios adicionales", "Desayunos, tours, lavandería y otros cargos.", Tag),
      m("limpieza", "Limpieza y mantenimiento", "Tareas por habitación y estado.", Wrench),
      FACTURAS, PAGOS_HOSP, FIDELIZACION, RESENAS_HOSP, ...propios("hosp", "agenda", "cuentas", "caja", "proveedores"), PERSONAL_HOSP, METAS_HOSP, ...propios("hosp", "finanzas"),
    ],
  },
  {
    clave: "gimnasio",
    etiqueta: "Gimnasio / deporte / bienestar",
    panel: "Gimnasio",
    usaPedidos: false,
    modulos: [
      m("socios", "Socios y membresías", "Planes, vencimientos y estado de cada socio.", Dumbbell),
      m("clases", "Clases y cupos", "Horarios de clases con cupos y asistentes.", CalendarDays),
      m("control_acceso", "Control de ingreso", "Registro de asistencia de los socios.", QrCode),
      m("planes_entreno", "Rutinas y seguimiento", "Planes y medidas de cada socio.", ClipboardList),
      FACTURAS, PAGOS_GYM, FIDELIZACION, RESENAS_GYM, ...propios("gym", "agenda", "cuentas", "caja", "proveedores"), PERSONAL_GYM, METAS_GYM, ...propios("gym", "finanzas"),
    ],
  },
  {
    clave: "construccion",
    etiqueta: "Construcción / ferretería / oficios",
    panel: "Obras y oficios",
    usaPedidos: false,
    modulos: [
      m("obr_obras", "Obras y presupuestos", "Capítulos planeados contra ejecutado real, vales de salida a obra y cortes con retención.", Hammer),
      m("proyectos_obra", "Proyectos y obras", "Avance, presupuesto y responsables de cada obra.", Hammer),
      m("cotizaciones_obra", "Cotizaciones", "Propuestas y seguimiento hasta el cierre.", FileText),
      m("materiales", "Materiales y herramientas", "Inventario y consumo por obra.", Package),
      m("contratistas", "Contratistas y pagos", "Cuentas por pagar a maestros y subcontratistas.", Handshake),
      ...propios("obra", "agenda"), CLIENTES_OBRA, GARANTIAS, ...propios("obra", "cuentas"), FACTURAS, PAGOS_OBRA, RESENAS_OBRA, ...propios("obra", "caja", "proveedores"), PERSONAL_OBRA, METAS_OBRA, ...propios("obra", "finanzas"),
    ],
  },
  {
    clave: "agro",
    etiqueta: "Agro / campo / producción",
    panel: "Producción",
    usaPedidos: false,
    modulos: [
      m("agr_lotes", "Lotes y producción", "Siembras, aplicaciones con dosis que descuentan inventario y venta con utilidad real.", Sprout),
      m("cultivos", "Cultivos y lotes", "Siembras, lotes y ciclos de producción.", Sprout),
      m("cosechas", "Cosechas y ventas", "Producción recogida y a quién se vendió.", PackageCheck),
      m("insumos_agro", "Insumos y fertilizantes", "Compras y consumo por lote.", Boxes),
      m("animales", "Animales y sanidad", "Control de ganado, vacunas y tratamientos.", Shield),
      m("financiacion_agro", "Financiación de ganado", "Vende ganado a cuotas: cuota, tabla de amortización, PDF y WhatsApp al cliente.", Calculator),
      CLIENTES_AGRO, FACTURAS, PAGOS_AGRO, ...propios("agro", "cuentas", "agenda", "caja", "proveedores"), PERSONAL_AGRO, METAS_AGRO, ...propios("agro", "finanzas"),
    ],
  },
  {
    clave: "inmobiliaria",
    etiqueta: "Inmobiliaria / arriendos",
    panel: "Inmobiliaria",
    usaPedidos: false,
    modulos: [
      m("inm_propiedades", "Propiedades y contratos", "Portafolio con matrícula y estado, cobro de canon con mora por WhatsApp y liquidación al propietario.", Building2),
      m("inmuebles", "Inmuebles", "Propiedades en venta o arriendo con su estado.", Building2),
      m("arrendatarios", "Arrendatarios y contratos", "Contratos, canon y vencimientos.", FileText),
      m("cobro_canon", "Cobro de arriendos", "Cartera mensual y recordatorios.", Coins),
      m("visitas", "Visitas a inmuebles", "Agenda de visitas con seguimiento.", KeyRound),
      CLIENTES_INMO, ...propios("inmo", "agenda", "cuentas"), FACTURAS, PAGOS_INMO, ...propios("inmo", "caja", "proveedores"), PERSONAL_INMO, METAS_INMO, ...propios("inmo", "finanzas"),
    ],
  },
  {
    clave: "mascotas",
    etiqueta: "Veterinaria / mascotas",
    panel: "Veterinaria",
    usaPedidos: false,
    modulos: [
      m("mascotas_reg", "Mascotas y dueños", "Ficha de cada mascota y su responsable.", PawPrint),
      ...propios("vet", "agenda"),
      m("vacunacion", "Vacunas y desparasitación", "Próximas dosis y recordatorios.", ShieldCheck),
      m("productos_vet", "Productos y alimentos", "Inventario y ventas.", ShoppingBag),
      FACTURAS, PAGOS_VET, FIDELIZACION, RESENAS_VET, ...propios("vet", "cuentas", "caja", "proveedores"), PERSONAL_VET, METAS_VET, ...propios("vet", "finanzas"),
    ],
  },
  {
    clave: "tecnologia",
    etiqueta: "Tecnología / software / agencia",
    panel: "Agencia",
    usaPedidos: false,
    modulos: [
      m("proyectos_tec", "Proyectos y entregables", "Estado, responsables y fechas de entrega.", Laptop),
      m("tickets", "Soporte y tickets", "Solicitudes de clientes con seguimiento.", ClipboardList),
      m("suscripciones_tec", "Planes y suscripciones", "Cobros recurrentes de tus clientes.", Repeat),
      m("horas", "Horas y facturación", "Horas dedicadas a cada cliente.", CalendarClock),
      CLIENTES_TEC, SOLICITUDES, ...propios("tec", "agenda", "cuentas"), FACTURAS, PAGOS_TEC, ...propios("tec", "caja", "proveedores"), PERSONAL_TEC, METAS_TEC, ...propios("tec", "finanzas"),
    ],
  },
  {
    clave: "transporte",
    etiqueta: "Transporte / logística",
    panel: "Logística",
    usaPedidos: false,
    modulos: [
      m("tra_manifiestos", "Manifiestos y liquidación", "Guías con vehículo y conductor, anticipos de viaje y liquidación con utilidad neta.", Truck),
      m("flota", "Flota y vehículos", "Vehículos, documentos y mantenimiento.", Truck),
      m("viajes", "Viajes y despachos", "Rutas, cargas y estado de cada envío.", Package),
      m("conductores", "Conductores y pagos", "Liquidación por viaje.", Briefcase),
      m("combustible", "Combustible y gastos de ruta", "Control de gastos por vehículo.", Banknote),
      CLIENTES_TRANSP, ...propios("transp", "agenda", "cuentas"), FACTURAS, PAGOS_TRANSP, RESENAS_TRANSP, ...propios("transp", "caja", "proveedores"), PERSONAL_TRANSP, METAS_TRANSP, ...propios("transp", "finanzas"),
    ],
  },
];

// ---- Más tipos de negocio ----
// Los negocios de comida comparten los módulos del restaurante (menú, pedidos, cocina, insumos, recetas)
// y agregan los suyos propios.
const SUFIJO_COMIDA: Record<string, string> = { panaderia: "pan", cafeteria: "cafe", comida_rapida: "rapida", catering: "cat" };

const comida = (
  clave: TipoNegocioClave,
  etiqueta: string,
  panel: string,
  extras: ModuloNegocio[],
  quitar: string[] = [],
): TipoNegocio => {
  const base = TIPOS_NEGOCIO.find((x) => x.clave === "restaurante") as TipoNegocio;
  // Los módulos propios del restaurante (sufijo _rest) se copian con el sufijo de este negocio.
  const suf: string | undefined = SUFIJO_COMIDA[clave];
  const mods = base.modulos
    .filter((x) => !quitar.includes(x.id))
    .map((x): ModuloNegocio => {
      if (!suf || !x.id.endsWith("_rest")) return x;
      const fam = x.id.replace(/_rest$/, "");
      // Solo las familias que este negocio tiene propias (caja, cuentas...). Las demás que terminan en
      // _rest (mermas_rest, plataformas_rest, permisos_rest) se comparten tal cual con el restaurante.
      const propia = PROPIOS[suf]?.[fam];
      if (!propia) return x;
      const id = `${fam}_${suf}`;
      return { ...x, id, ruta: `/modulos/${id}`, titulo: propia.titulo ?? x.titulo, descripcion: propia.desc ?? x.descripcion };
    });
  mods.splice(2, 0, ...extras);
  return { clave, etiqueta, panel, usaPedidos: true, modulos: mods };
};

// Jerga propia de la panadería: renombra los módulos compartidos con el restaurante.
// Si un módulo no existe, simplemente no se renombra (nunca falla).
const VOCAB_PANADERIA: Record<string, { titulo: string; descripcion: string }> = {
  pedidos: { titulo: "Vitrina / POS rápido", descripcion: "Ventas de mostrador y pedidos del día." },
  cocina: { titulo: "Tablero del horno", descripcion: "Qué se está preparando y horneando ahora." },
  insumos: { titulo: "Materia prima / Harinas", descripcion: "Harinas, levaduras, mantequilla y demás insumos con alertas de faltantes." },
  equipo_turnos: { titulo: "Equipo y nómina", descripcion: "Pagos y novedades de panaderos, hornero y vendedores." },
};
const panaderia = comida("panaderia", "Panadería / pastelería / repostería", "Panadería", [
  m("pan_produccion", "Horneadas / Producción diaria", "Registra lo que se horneó: descuenta la materia prima y calcula el costo real de cada unidad.", ChefHat),
  m("pan_recetas", "Recetas y gramajes", "Ingredientes por lote, gramaje, rendimiento y costo por unidad.", ScrollText),
  m("pan_mermas", "Mermas y vencimientos", "Pan quemado, dañado o vencido con su motivo; la pérdida pasa sola a Contabilidad.", Trash2),
  m("encargos_tortas", "Pedidos especiales / Tortas por encargo", "Entrega, abono, saldo, sabor, dedicatoria y foto de referencia.", Cake),
  m("pan_turnos", "Turnos y metas del personal", "Turnos de panaderos, horneros y mostrador con meta diaria de venta.", CalendarClock),
], ["mesas", "propinas", "suscripciones", "mermas_rest"]);
panaderia.modulos = panaderia.modulos.map((x): ModuloNegocio => {
  const v = VOCAB_PANADERIA[x.id];
  return v ? { ...x, titulo: v.titulo, descripcion: v.descripcion } : x;
});

TIPOS_NEGOCIO.push(
  panaderia,
  comida("cafeteria", "Cafetería / bar / heladería", "Cafetería", [
    m("insumos_barra", "Barra y bebidas", "Control de botellas, tragos, café y mermas de la barra.", Coffee),
  ], ["suscripciones"]),
  comida("comida_rapida", "Comida rápida / food truck / asadero", "Comida rápida", [
    m("puntos_venta", "Puntos de venta y turnos", "Ventas por local, carro o ubicación del día.", Sandwich),
  ], ["mesas", "suscripciones"]),
  comida("catering", "Catering / banquetes / cocina por encargo", "Catering", [
    m("eventos_catering", "Eventos y banquetes", "Fecha, invitados, menú, anticipo y saldo de cada evento.", PartyPopper),
  ], ["mesas", "propinas", "domicilios", "repartidores"]),
  {
    clave: "belleza",
    etiqueta: "Belleza / peluquería / spa / uñas",
    panel: "Salón",
    usaPedidos: false,
    modulos: [
      m("catalogo_servicios", "Catálogo de servicios", "Cortes, tintes, manicure, masajes: duración y precio.", Scissors),
      m("estilistas_belleza", "Estilistas y cabinas", "Quién atiende, su especialidad (corte, color, uñas, masajes), comisión y la silla o cabina que usa.", BadgeCheck),
      m("disponibilidad_belleza", "Turnos y disponibilidad", "Horario de cada estilista, descansos y bloqueo de sillas o cabinas para evitar citas cruzadas.", CalendarClock),
      ...propios("bell", "agenda"),
      m("paquetes", "Paquetes y membresías", "Bonos de sesiones y planes mensuales.", Gift),
      m("historial", "Historial del cliente", "Fórmulas, alergias y trabajos realizados.", ClipboardList),
      m("lista_espera", "Lista de espera", "Clientes por atender cuando se libere un cupo.", Bell),
      m("comisiones", "Comisiones del personal", "Pago por servicio realizado.", Percent),
      m("productos_belleza", "Productos y cosméticos", "Inventario y venta de productos.", Sparkles),
      CLIENTES_BELL, SOLICITUDES,
      ...propios("bell", "cuentas"), FACTURAS, PAGOS_BELL, FIDELIZACION, RESENAS_BELL, ...propios("bell", "caja", "proveedores"), PERSONAL_BELL, METAS_BELL, ...propios("bell", "finanzas"),
    ],
  },
  {
    clave: "taller",
    etiqueta: "Taller mecánico / latonería / lubricentro",
    panel: "Taller",
    usaPedidos: false,
    modulos: [
      m("ordenes_servicio", "Órdenes de servicio", "Vehículo, falla, trabajos, repuestos y estado de cada orden.", Wrench),
      m("vehiculos_clientes", "Vehículos de clientes", "Placa, marca, kilometraje e historial de cada vehículo.", Car),
      m("cotizaciones_taller", "Presupuestos de reparación", "Valor de mano de obra y repuestos antes de aprobar.", FileText),
      m("repuestos_taller", "Repuestos e inventario", "Existencias, costos y alertas de faltantes.", Cog),
      m("recordatorio_mant", "Mantenimientos próximos", "Aviso de cambio de aceite, revisiones y vencimientos.", CalendarClock),
      ...propios("taller", "agenda"), CLIENTES_TALLER, GARANTIAS,
      ...propios("taller", "cuentas"), FACTURAS, PAGOS_TALLER, RESENAS_TALLER, ...propios("taller", "caja", "proveedores"), PERSONAL_TALLER, METAS_TALLER, ...propios("taller", "finanzas"),
    ],
  },
  {
    clave: "farmacia",
    etiqueta: "Farmacia / droguería / minimercado",
    panel: "Droguería",
    usaPedidos: false,
    modulos: [
      m("productos_farm", "Productos y medicamentos", "Catálogo con precio y presentación.", Pill),
      m("inventario_farm", "Inventario y reposición", "Existencias y alertas de bajo stock.", Package),
      m("vencimientos_farm", "Lotes y vencimientos", "Fechas de vencimiento por lote para rotar a tiempo.", CalendarClock),
      m("formulas", "Fórmulas y domicilios", "Pedidos con fórmula y entregas a domicilio.", ClipboardList),
      CLIENTES_FARM,
      ...propios("farm", "cuentas"), FACTURAS, PAGOS_FARM, FIDELIZACION, RESENAS_FARM, ...propios("farm", "caja", "proveedores"), PERSONAL_FARM, METAS_FARM, ...propios("farm", "finanzas"),
    ],
  },
  {
    clave: "eventos",
    etiqueta: "Eventos / salón social / fotografía",
    panel: "Eventos",
    usaPedidos: false,
    modulos: [
      m("eventos_reg", "Eventos y reservas", "Fecha, cliente, lugar, anticipo y saldo.", PartyPopper),
      ...propios("eventos", "agenda"),
      m("paquetes_evento", "Paquetes y servicios", "Paquetes con su precio y lo que incluyen.", Gift),
      m("entregas_evento", "Entregas y pendientes", "Álbumes, archivos o materiales por entregar.", PackageCheck),
      CLIENTES_EVENTOS, SOLICITUDES,
      ...propios("eventos", "cuentas"), FACTURAS, PAGOS_EVENTOS, RESENAS_EVENTOS, ...propios("eventos", "caja", "proveedores"), PERSONAL_EVENTOS, METAS_EVENTOS, ...propios("eventos", "finanzas"),
    ],
  },
  {
    clave: "profesional",
    etiqueta: "Servicios profesionales (abogados, contadores, consultores)",
    panel: "Despacho",
    usaPedidos: false,
    modulos: [
      m("casos", "Casos y expedientes", "Cada caso o cliente con su estado y responsable.", Briefcase),
      m("honorarios", "Honorarios y cobros", "Valores pactados, abonos y saldos.", Scale),
      m("plazos", "Plazos y vencimientos", "Términos legales, declaraciones y entregas.", CalendarClock),
      m("documentos_prof", "Documentos por cliente", "Contratos y archivos importantes.", FolderOpen),
      ...propios("prof", "agenda"), CLIENTES_PROF, SOLICITUDES,
      ...propios("prof", "cuentas"), FACTURAS, PAGOS_PROF, RESENAS_PROF, ...propios("prof", "caja", "proveedores"), PERSONAL_PROF, METAS_PROF, ...propios("prof", "finanzas"),
    ],
  },
  {
    clave: "lavanderia",
    etiqueta: "Lavandería / tintorería / autolavado",
    panel: "Lavandería",
    usaPedidos: false,
    modulos: [
      m("ordenes_lavado", "Órdenes de servicio", "Recibido, en proceso, listo y entregado.", Shirt),
      m("tarifas_lavado", "Tarifas por servicio", "Precio por prenda, kilo o tipo de lavado.", Tag),
      m("entregas_lav", "Recogida y entrega", "Rutas de recogida y entrega a domicilio.", Bike),
      m("insumos_lav", "Insumos", "Jabones, químicos y consumibles.", Boxes),
      CLIENTES_LAV, ...propios("lav", "agenda"),
      ...propios("lav", "cuentas"), FACTURAS, PAGOS_LAV, FIDELIZACION, RESENAS_LAV, ...propios("lav", "caja", "proveedores"), PERSONAL_LAV, METAS_LAV, ...propios("lav", "finanzas"),
    ],
  },
);

// ---- Tipos de negocio tomados del catálogo de packs de software ----
TIPOS_NEGOCIO.push(
  {
    clave: "condominio",
    etiqueta: "Condominio / administración de edificios",
    panel: "Condominio",
    usaPedidos: false,
    modulos: [
      m("unidades_cond", "Unidades y propietarios", "Apartamentos o casas con su propietario o inquilino.", Building2),
      m("cuotas_cond", "Cuotas de administración", "Cuotas de mantenimiento, saldos y mora por unidad.", Coins),
      m("areas_comunes", "Áreas comunes y reservas", "Salón social, piscina, parqueaderos y sus reservas.", CalendarClock),
      m("mantenimiento_cond", "Mantenimiento del edificio", "Tareas, proveedores y reparaciones de zonas comunes.", Wrench),
      m("comunicados_cond", "Comunicados y PQRS", "Avisos a residentes y solicitudes con seguimiento.", Bell),
      CLIENTES_COND, ...propios("cond", "agenda"), FACTURAS, PAGOS_COND, ...propios("cond", "caja", "proveedores"), PERSONAL_COND, METAS_COND, ...propios("cond", "finanzas"),
    ],
  },
  {
    clave: "prestamos",
    etiqueta: "Préstamos y cobranza",
    panel: "Cobranza",
    usaPedidos: false,
    modulos: [
      m("prestamos_reg", "Préstamos", "Monto, interés, plazo y estado de cada préstamo.", Banknote),
      m("cronograma_cuotas", "Cronograma de cuotas", "Simulación de cuotas y fechas de pago.", CalendarDays),
      m("cobranza_diaria", "Cobranza diaria y mensual", "Cuotas por cobrar hoy, en mora y promesas de pago.", Coins),
      m("garantias_prest", "Garantías de préstamo", "Bienes o avales que respaldan cada préstamo.", ShieldCheck),
      CLIENTES_PREST, ...propios("prest", "agenda"), FACTURAS, PAGOS_PREST, ...propios("prest", "cuentas", "caja", "proveedores"), PERSONAL_PREST, METAS_PREST, ...propios("prest", "finanzas"),
    ],
  },
  {
    clave: "textil",
    etiqueta: "Taller textil / confección",
    panel: "Taller textil",
    usaPedidos: false,
    modulos: [
      m("cortes_tela", "Cortes de tela", "Lotes de corte, metros usados y rendimiento.", Scissors),
      m("ordenes_confeccion", "Órdenes de confección", "Prendas por talla y color, estado y fecha de entrega.", Shirt),
      m("destajo", "Pago por destajo", "Prendas terminadas por operario y valor a pagar.", Percent),
      m("insumos_textil", "Telas e insumos", "Telas, hilos, botones y existencias.", Boxes),
      CLIENTES_TEXTIL, ...propios("textil", "agenda"), ...propios("textil", "cuentas"), FACTURAS, PAGOS_TEXTIL, ...propios("textil", "caja", "proveedores"), PERSONAL_TEXTIL, METAS_TEXTIL, ...propios("textil", "finanzas"),
    ],
  },
  {
    clave: "joyeria",
    etiqueta: "Joyería / relojería",
    panel: "Joyería",
    usaPedidos: false,
    modulos: [
      m("piezas_joyeria", "Piezas y quilataje", "Piezas con peso, quilataje, material y precio.", Gem),
      m("certificados_joy", "Certificados de autenticidad", "Certificados y garantías entregadas a cada cliente.", BadgeCheck),
      m("taller_joyeria", "Taller y reparaciones", "Arreglos, relojes y trabajos por encargo.", Wrench),
      m("apartados", "Apartados (plan separe)", "Abonos y entrega de piezas separadas.", Tag),
      CLIENTES_JOY, ...propios("joy", "cuentas"), FACTURAS, PAGOS_JOY, FIDELIZACION, RESENAS_JOY, ...propios("joy", "caja", "proveedores"), PERSONAL_JOY, METAS_JOY, ...propios("joy", "finanzas"),
    ],
  },
  {
    clave: "celulares",
    etiqueta: "Tienda de celulares / reparaciones",
    panel: "Celulares",
    usaPedidos: false,
    modulos: [
      m("equipos_imei", "Equipos e IMEI", "Control de equipos por IMEI, estado y precio.", Smartphone),
      m("reparaciones_cel", "Reparaciones", "Equipos en reparación, diagnóstico, repuestos y entrega.", Wrench),
      m("accesorios_cel", "Accesorios e inventario", "Fundas, cargadores y existencias.", Package),
      CLIENTES_CEL, GARANTIAS, ...propios("cel", "cuentas"), FACTURAS_CEL, PAGOS_CEL, FIDELIZACION, RESENAS_CEL, ...propios("cel", "caja", "proveedores"), PERSONAL_CEL, METAS_CEL, ...propios("cel", "finanzas"),
    ],
  },
  {
    clave: "papeleria",
    etiqueta: "Papelería / librería",
    panel: "Papelería",
    usaPedidos: false,
    modulos: [
      m("productos_papel", "Útiles y libros", "Inventario de útiles escolares y libros por ISBN.", BookOpen),
      m("copias_impresiones", "Copias e impresiones", "Servicios de fotocopia, impresión y su cobro.", FileText),
      m("lista_escolar", "Listas escolares", "Listas de útiles por colegio y pedidos de temporada.", ClipboardList),
      CLIENTES_PAPEL, ...propios("papel", "cuentas"), FACTURAS_PAPEL, PAGOS_PAPEL, FIDELIZACION, ...propios("papel", "caja", "proveedores"), PERSONAL_PAPEL, METAS_PAPEL, ...propios("papel", "finanzas"),
    ],
  },
  {
    clave: "moda",
    etiqueta: "Tienda de moda / calzado",
    panel: "Moda y calzado",
    usaPedidos: false,
    modulos: [
      m("prendas_talla", "Prendas y calzado por talla/color", "Inventario por matriz de talla, número y color.", Shirt),
      m("temporadas", "Temporadas y colecciones", "Colecciones, marcas y rotación por temporada.", Tag),
      m("vitrina", "Exhibición en vitrina", "Qué está exhibido y qué falta reponer.", Armchair),
      m("apartados", "Apartados (plan separe)", "Abonos y entrega de productos separados.", Tag),
      m("devoluciones", "Cambios y devoluciones", "Control de cambios y notas crédito.", Repeat),
      CLIENTES_MODA, ...propios("moda", "cuentas"), FACTURAS_MODA, PAGOS_MODA, FIDELIZACION, RESENAS_MODA, ...propios("moda", "caja", "proveedores"), PERSONAL_MODA, METAS_MODA, ...propios("moda", "finanzas"),
    ],
  },
);

// ---- Sectores con operación propia (cada uno con sus módulos específicos) ----
TIPOS_NEGOCIO.push(
  {
    clave: "ferreteria",
    etiqueta: "Ferretería / materiales de construcción",
    panel: "Ferretería",
    usaPedidos: false,
    modulos: [
      m("referencias_ferr", "Referencias e inventario", "Miles de referencias con unidad, venta por corte, costo, margen y stock mínimo.", Package),
      m("cotizaciones_ferr", "Cotizaciones de materiales", "Lista de materiales para constructores y maestros, con descuento y flete.", FileText),
      m("despachos_ferr", "Despachos a obra", "Remisión, conductor y quién recibe el material en la obra.", Truck),
      m("listas_precios_ferr", "Listas de precios de proveedores", "Actualiza costos cuando un proveedor sube precios.", Tag),
      ...propios("ferr", "clientes", "cuentas", "facturas", "pagos", "caja", "proveedores", "personal", "metas", "finanzas"),
    ],
  },
  {
    clave: "supermercado",
    etiqueta: "Supermercado / minimercado / autoservicio",
    panel: "Supermercado",
    usaPedidos: false,
    modulos: [
      m("productos_super", "Productos y código de barras", "Catálogo por categoría con IVA, góndola, costo y stock mínimo.", ShoppingCart),
      m("vencimientos_super", "Productos por vencer", "Lotes próximos a vencer con acción: rotar, descuento o devolver.", CalendarClock),
      m("promociones_super", "Promociones", "2x1, precios especiales y combos con vigencia.", Percent),
      m("reposicion_super", "Reposición y pedidos a proveedores", "Qué se agotó, día de visita del proveedor y pedido mínimo.", Boxes),
      ...propios("super", "clientes", "cuentas", "facturas", "pagos", "fidelizacion", "caja", "proveedores", "personal", "metas", "finanzas"),
    ],
  },
  {
    clave: "carniceria",
    etiqueta: "Carnicería / fruver / pescadería",
    panel: "Frescos",
    usaPedidos: false,
    modulos: [
      m("cortes_carne", "Productos frescos por peso", "Existencias por kilo, costo, merma esperada y registro sanitario.", Beef),
      m("mermas_fresco", "Mermas y pérdidas", "Producto que se maduró, venció o se recortó, con su costo.", Trash2),
      m("cadena_frio", "Cadena de frío", "Temperatura de neveras y cuartos fríos, con acción correctiva.", Thermometer),
      m("pedidos_fresco", "Pedidos y domicilios por peso", "Pedidos por WhatsApp con pesos, dirección y hora de entrega.", Bike),
      ...propios("carn", "clientes", "cuentas", "facturas", "pagos", "caja", "proveedores", "personal", "metas", "finanzas"),
    ],
  },
  {
    clave: "licorera",
    etiqueta: "Licorera / tienda de bebidas / estanco",
    panel: "Licorera",
    usaPedidos: false,
    modulos: [
      m("referencias_licor", "Referencias por marca y presentación", "Botella, media, litro o caja, con grados, estampilla y costo.", Wine),
      m("combos_licor", "Combos y promociones", "Combos por ocasión: fin de semana, quincena, partido o fiesta.", Percent),
      m("domicilios_licor", "Domicilios con verificación de edad", "Registro de mayoría de edad por documento y repartidor.", Bike),
      m("permisos_licor", "Permisos y horarios de venta", "Licencia de funcionamiento, bomberos y horario permitido con fecha de renovación.", ScrollText),
      ...propios("licor", "clientes", "cuentas", "facturas", "pagos", "fidelizacion", "caja", "proveedores", "personal", "metas", "finanzas"),
    ],
  },
  {
    clave: "floristeria",
    etiqueta: "Floristería / regalos",
    panel: "Floristería",
    usaPedidos: false,
    modulos: [
      m("arreglos_flor", "Catálogo de arreglos", "Ramos, cajas y arreglos con flores incluidas, tamaño y costo de armado.", Flower2),
      m("encargos_flor", "Encargos con dedicatoria y entrega", "Destinatario, dirección, tarjeta, hora y foto de entrega.", Gift),
      m("flores_frescas", "Flores frescas y vida útil", "Tallos recibidos, días de vida y merma por proveedor.", Sprout),
      m("fechas_especiales", "Fechas especiales", "San Valentín, Día de la Madre y otras: pedidos esperados y compras anticipadas.", CalendarDays),
      ...propios("flor", "clientes", "facturas", "pagos", "fidelizacion", "caja", "proveedores", "personal", "metas", "finanzas"),
    ],
  },
  {
    clave: "optica",
    etiqueta: "Óptica / optometría",
    panel: "Óptica",
    usaPedidos: false,
    modulos: [
      m("formulas_optica", "Fórmulas de clientes", "Esfera, cilindro, eje, adición y distancia pupilar de cada ojo, con vigencia.", Glasses),
      m("examenes_visuales", "Exámenes visuales", "Agenda de optometría y controles con el optómetra.", CalendarClock),
      m("monturas_optica", "Monturas y vitrina", "Marca, material, género y existencias de monturas.", Package),
      m("pedidos_lab_optica", "Pedidos al laboratorio", "Tipo de lente, tratamiento, fecha prometida y saldo por cobrar.", ClipboardList),
      ...propios("optica", "clientes", "garantias", "cuentas", "facturas", "pagos", "fidelizacion", "caja", "proveedores", "personal", "metas", "finanzas"),
    ],
  },
  {
    clave: "guarderia",
    etiqueta: "Guardería / jardín infantil",
    panel: "Guardería",
    usaPedidos: false,
    modulos: [
      m("ninos_inscritos", "Niños inscritos", "Grupo, jornada, alergias, EPS y acudientes de cada niño.", Baby),
      m("asistencia_guarderia", "Asistencia y recogida diaria", "Hora de entrada y salida, estado de salud y quién lo recoge.", BadgeCheck),
      m("recogida_guarderia", "Personas autorizadas a recoger", "Quién puede llevarse a cada niño, con documento y foto.", ShieldCheck),
      m("reportes_guarderia", "Reporte diario al acudiente", "Comidas, siestas, pañales y actividades del día.", ClipboardList),
      ...propios("guard", "clientes", "mensualidades", "agenda", "facturas", "pagos", "caja", "proveedores", "personal", "metas", "finanzas"),
    ],
  },
  {
    clave: "alquiler_vehiculos",
    etiqueta: "Alquiler de vehículos",
    panel: "Alquiler",
    usaPedidos: false,
    modulos: [
      m("flota_alquiler", "Flota y disponibilidad", "Cada vehículo con tarifa, kilometraje, SOAT, tecnomecánica y mantenimiento.", Car),
      m("reservas_alquiler", "Reservas", "Fechas de salida y devolución, depósito y kilometraje permitido.", CalendarClock),
      m("contratos_alquiler", "Contratos de alquiler", "Licencia, póliza, combustible y kilometraje de salida, con firma.", FileText),
      m("entregas_alq", "Entregas y devoluciones", "Inspección de daños, combustible y cobros extra al regresar.", PackageCheck),
      m("multas_alquiler", "Multas y peajes", "Comparendos por placa que se trasladan al cliente.", Coins),
      ...propios("alq", "clientes", "cuentas", "facturas", "pagos", "caja", "proveedores", "personal", "metas", "finanzas"),
    ],
  },
  {
    clave: "seguridad_aseo",
    etiqueta: "Empresa de seguridad / aseo / servicios generales",
    panel: "Servicios generales",
    usaPedidos: false,
    modulos: [
      m("puestos_seg", "Puestos y contratos", "Cada cliente y sede con cantidad de personal, turno, supervisor y valor mensual.", Shield),
      m("turnos_seg", "Turnos y reemplazos", "Quién cubre cada puesto, descansos y reemplazos.", CalendarClock),
      m("dotacion_seg", "Dotación y entregas", "Uniformes, botas y elementos con fecha de próxima entrega obligatoria.", Shirt),
      m("novedades_seg", "Novedades e incidentes", "Incidentes, faltas y quejas de clientes con la acción tomada.", ClipboardList),
      ...propios("seg", "clientes", "cotizaciones", "cuentas", "facturas", "pagos", "caja", "proveedores", "personal", "metas", "finanzas"),
    ],
  },
  {
    clave: "ganaderia",
    etiqueta: "Ganadería / avícola / porcícola",
    panel: "Ganadería",
    usaPedidos: false,
    modulos: [
      m("lotes_ganado", "Lotes y animales", "Especie, cantidad, potrero o galpón, peso promedio y meta.", Sprout),
      m("produccion_pecuaria", "Producción de leche, huevos y carne", "Registro diario de lo producido y su destino de venta.", PackageCheck),
      m("sanidad_pecuaria", "Vacunas y sanidad", "Aftosa, brucelosis, desparasitantes y próxima aplicación con registro ICA.", ShieldCheck),
      m("alimentacion_pecuaria", "Alimentación y medicinas", "Concentrado, sal y medicinas con stock mínimo y lote que los consume.", Boxes),
      m("guias_movilizacion", "Guías de movilización ICA", "Origen, destino, cantidad y vencimiento de cada guía.", ScrollText),
      ...propios("gan", "clientes", "cuentas", "facturas", "pagos", "caja", "proveedores", "personal", "metas", "finanzas"),
    ],
  },
  {
    clave: "fundacion",
    etiqueta: "Fundación / ONG / organización social",
    panel: "Fundación",
    usaPedidos: false,
    modulos: [
      m("beneficiarios_fund", "Beneficiarios", "Programa, necesidad atendida, acudiente y consentimiento.", HeartHandshake),
      m("donaciones_fund", "Donaciones y certificados", "Dinero o especie, proyecto destino y certificado de donación.", Gift),
      m("proyectos_fund", "Proyectos y financiadores", "Presupuesto, ejecución, indicadores y fecha de informes.", ClipboardList),
      m("voluntarios_fund", "Voluntarios", "��rea, horas al mes y certificado de voluntariado.", Users),
      ...propios("fund", "clientes", "agenda", "facturas", "pagos", "caja", "proveedores", "personal", "metas", "finanzas"),
    ],
  },
  {
    clave: "iglesia",
    etiqueta: "Iglesia / club / asociación",
    panel: "Comunidad",
    usaPedidos: false,
    modulos: [
      m("miembros_iglesia", "Miembros", "Ministerio, célula, bautizo y datos de contacto.", Church),
      m("aportes_iglesia", "Diezmos, ofrendas y aportes", "Aportes por concepto y miembro, con número de recibo.", Coins),
      m("eventos_iglesia", "Eventos y reservas", "Cultos especiales, retiros y congresos con presupuesto.", PartyPopper),
      m("grupos_iglesia", "Grupos y células", "Líder, día de reunión, integrantes y asistencia.", Users),
      m("visitas_iglesia", "Visitas pastorales", "Hospital, consejería y seguimiento a nuevos.", CalendarClock),
      ...propios("igl", "agenda", "facturas", "pagos", "caja", "proveedores", "personal", "finanzas"),
    ],
  },
);

TIPOS_NEGOCIO.push({
  clave: "parqueadero",
  etiqueta: "Parqueadero / estacionamiento",
  panel: "Parqueadero",
  usaPedidos: false,
  modulos: [
    m("parq_turnos", "Turnos y cobro por horas", "Placa, hora de entrada y salida, tarifa por hora y cobro automático que entra a Caja y Contabilidad.", Car),
    m("parq_abonados", "Abonados y mensualidades", "Vehículos con mensualidad: vigencia, aviso de vencimiento por WhatsApp y cobro a Caja con recibo.", Users),
    FACTURAS, PAGOS, ...propios("parq", "caja", "finanzas"),
  ],
});

// ---- Módulo profesional de Veterinaria y Salud (consultorio, clínica, odontología) ----
// Reemplaza los módulos genéricos (pacientes, historia, fórmulas, vacunas, agenda, insumos) por los propios con
// tablas tipadas. Si un tipo o un módulo no existe, simplemente no se toca (nunca falla el arranque).
const clinica = (vet: boolean): ModuloNegocio[] => [
  m("cl_agenda", vet ? "Agenda por veterinario" : "Agenda por especialista y consultorio", "Citas por profesional y consultorio: Agendada, En consulta, Atendida o No asistió. Al finalizar pasan a Caja.", CalendarClock),
  m("cl_pacientes", vet ? "Pacientes / Mascotas" : "Pacientes", vet ? "Ficha de cada mascota: especie, raza, peso, alergias, foto y dueño." : "Ficha de cada paciente: datos, alergias, foto y acudiente.", vet ? PawPrint : Stethoscope),
  m("cl_historias", "Historias clínicas", "Evoluciones con motivo, signos vitales, diagnóstico, tratamiento, adjuntos y fórmula imprimible. Solo notas aclaratorias, nunca borrado.", ClipboardList),
  m("cl_vacunas", vet ? "Carnet de vacunación y desparasitación" : "Vacunas y esquemas", "Dosis aplicadas con lote y próxima fecha, carnet imprimible.", ShieldCheck),
  m("cl_alertas", "Alertas y recordatorios", "Próximas vacunas, controles post-operatorios y medicamentos por vencer, con aviso por WhatsApp.", Bell),
  m("cl_caja", "Caja de consultas", "Cobro de la consulta y los medicamentos aplicados; entra a Caja y Contabilidad.", Banknote),
  m("cl_servicios", "Servicios y tarifas", "Consultas, cirugías y procedimientos con su precio y el porcentaje de honorarios.", Tag),
  m("cl_insumos", "Medicamentos e insumos médicos", "Existencias, precio y vencimiento; lo aplicado se descuenta solo.", Pill),
  m("cl_comisiones", "Honorarios y comisiones", "Liquidación automática por consulta, cirugía o procedimiento de cada profesional.", Percent),
];
const REEMPLAZA_CLINICA: Record<string, string[]> = {
  mascotas: ["mascotas_reg", "agenda_vet", "vacunacion", "productos_vet"],
  salud: ["pacientes", "agenda_salud", "historia_clinica", "formulas", "insumos_salud"],
};
for (const clave of ["mascotas", "salud"] as const) {
  const tipoClinica = TIPOS_NEGOCIO.find((x) => x.clave === clave);
  if (!tipoClinica) continue;
  const quitar = REEMPLAZA_CLINICA[clave] ?? [];
  tipoClinica.modulos = [...clinica(clave === "mascotas"), ...tipoClinica.modulos.filter((x) => !quitar.includes(x.id))];
}

// ---- Peluquería/Barbería/Spa y Gimnasio: módulos propios con tablas tipadas ----
// Reemplazan los genéricos equivalentes. Si un tipo no existe, no se toca (nunca falla el arranque).
const MODULOS_BELLEZA: ModuloNegocio[] = [
  m("bel_agenda", "Agenda por silla y estilista", "Citas por servicio con duración, sin cruces por profesional ni por silla o cabina, y recordatorio por WhatsApp.", CalendarClock),
  m("bel_fichas", "Clientes y ficha técnica", "Fórmulas de tinte, alergias y fotos de antes y después de cada visita.", ClipboardList),
  m("bel_servicios", "Servicios, insumos y tarifas", "Duración, precio y comisión de cada servicio, con los insumos que gasta y su inventario.", Scissors),
  m("bel_comisiones", "Comisiones y liquidación", "Comisión en tiempo real por servicio o producto; la liquidación sale de Caja y llega a Contabilidad.", Percent),
];
const MODULOS_GIMNASIO: ModuloNegocio[] = [
  m("gim_checkin", "Check-in de socios", "Ingreso por cédula o QR: alerta en rojo si está vencido o por vencer, con cobro por WhatsApp.", QrCode),
  m("gim_socios", "Socios y membresías", "Venta de planes, fechas de inicio y vencimiento, congelamiento por incapacidad.", Dumbbell),
  m("gim_planes", "Planes y tiqueteras", "Mensualidades, trimestres, anualidades y tiqueteras por sesiones.", Tag),
  m("gim_valoracion", "Valoración física", "Peso, grasa, masa muscular, medidas y rutina asignada por entrenador.", ClipboardList),
];
const REEMPLAZA_BELLEZA_GIM: Record<string, { nuevos: ModuloNegocio[]; quitar: string[] }> = {
  belleza: { nuevos: MODULOS_BELLEZA, quitar: ["historial", "comisiones"] },
  gimnasio: { nuevos: MODULOS_GIMNASIO, quitar: ["socios", "control_acceso", "planes_entreno"] },
};
for (const [clave, def] of Object.entries(REEMPLAZA_BELLEZA_GIM)) {
  const tipoBG = TIPOS_NEGOCIO.find((x) => x.clave === clave);
  if (!tipoBG || tipoBG.modulos.some((x) => x.id === def.nuevos[0].id)) continue;
  tipoBG.modulos = [...def.nuevos, ...tipoBG.modulos.filter((x) => !def.quitar.includes(x.id))];
}

// ---- POS comercial (Tienda, Supermercado, Ferretería, Carnicería y Fruver) ----
// Se agregan al inicio del menú el punto de venta con código de barras y los productos con precios múltiples.
// Si un tipo no existe, simplemente no se toca (nunca falla el arranque).
for (const clave of ["tienda", "supermercado", "ferreteria", "carniceria"] as const) {
  const tipoComercio = TIPOS_NEGOCIO.find((x) => x.clave === clave);
  if (!tipoComercio || tipoComercio.modulos.some((x) => x.id === "com_pos")) continue;
  tipoComercio.modulos = [
    m("com_pos", "Punto de venta (POS)", "Escanea el código de barras, vende por peso, fracción o caja, con precios detal, mayorista y especial, e impuestos discriminados.", ShoppingCart),
    m("com_productos", "Productos y precios", "Código de barras o SKU, unidad de venta, precios múltiples, IVA o Impoconsumo y stock de cada producto.", Package),
    ...tipoComercio.modulos,
  ];
}

// ---- Lotes/FIFO, cotizador de ferretería y desposte de frescos ----
// Se insertan justo después de "Productos y precios". Si un tipo no existe, no se toca (nunca falla el arranque).
const EXTRAS_COMERCIO: Record<string, ModuloNegocio[]> = {
  tienda: [m("com_lotes", "Lotes y vencimientos", "Número de lote y vencimiento al recibir mercancía; el POS vende primero lo que vence antes (FIFO) y avisa a 7, 15 y 30 días.", CalendarClock)],
  supermercado: [m("com_lotes", "Lotes y vencimientos", "Número de lote y vencimiento al recibir mercancía; el POS vende primero lo que vence antes (FIFO) y avisa a 7, 15 y 30 días.", CalendarClock)],
  celulares: [m("com_seriales", "Seriales, IMEI y garantía", "Cada equipo con su serial o IMEI; al venderlo queda el cliente y la garantía calculada, y controlas equipos en garantía o devueltos.", ShieldCheck)],
  joyeria: [m("com_seriales", "Seriales y garantía de piezas", "Piezas con serial o certificado; al venderlas queda el cliente y la fecha en que vence la garantía.", ShieldCheck)],
  optica: [m("com_seriales", "Seriales y garantía", "Monturas y equipos con serial; garantía calculada al vender y control de devoluciones.", ShieldCheck)],
  licorera: [m("com_lotes", "Lotes y vencimientos", "Número de lote y vencimiento al recibir mercancía; el POS vende primero lo que vence antes (FIFO) y avisa a 7, 15 y 30 días.", CalendarClock)],
  ferreteria: [m("com_cotizador", "Cotizador de materiales", "Lista de materiales para maestros y contratistas con descuento e impuestos, por WhatsApp o PDF, y se convierte en venta con un clic.", FileText)],
  carniceria: [
    m("com_lotes", "Lotes y vencimientos", "Número de lote y vencimiento al recibir mercancía; el POS vende primero lo que vence antes (FIFO) y avisa a 7, 15 y 30 días.", CalendarClock),
    m("com_desposte", "Desposte y rendimiento", "Entra una canal o bulto y sale dividido en cortes con su peso, hueso y merma; calcula el costo real por kilo limpio.", Beef),
  ],
};
for (const [clave, extras] of Object.entries(EXTRAS_COMERCIO)) {
  const tipoExtra = TIPOS_NEGOCIO.find((x) => x.clave === clave);
  if (!tipoExtra) continue;
  const nuevos = extras.filter((e) => !tipoExtra.modulos.some((x) => x.id === e.id));
  if (nuevos.length === 0) continue;
  const pos = tipoExtra.modulos.findIndex((x) => x.id === "com_productos");
  tipoExtra.modulos.splice(pos >= 0 ? pos + 1 : 0, 0, ...nuevos);
}

// ---- Taller, lavadero, servicio técnico, carpintería e imprenta (Prompt #7) ----
// Órdenes de trabajo con fotos de recepción, repuestos, comisiones y proyectos a la medida.
// Si un tipo no existe, no se toca (nunca falla el arranque).
const MODULOS_TALLERTEC: Record<string, ModuloNegocio[]> = {
  taller: [
    m("tal_ordenes", "Órdenes de trabajo", "Placa o serial, checklist, fotos de recepción y tablero hasta la entrega con garantía.", Wrench),
    m("tal_repuestos", "Repuestos e inventario", "Stock, costo y precio; al agregar a una orden descuenta solo.", Cog),
    m("tal_comisiones", "Comisiones y liquidación", "Comisión por técnico sobre la mano de obra; solo el dueño liquida.", Percent),
  ],
  lavanderia: [
    m("tal_ordenes", "Órdenes de lavado", "Placa, checklist, fotos de recepción y tablero hasta la entrega.", Wrench),
    m("tal_repuestos", "Insumos de lavado", "Jabones y consumibles con stock y costo.", Cog),
    m("tal_comisiones", "Comisiones y liquidación", "Comisión por operario; solo el dueño liquida.", Percent),
  ],
  celulares: [
    m("tal_ordenes", "Órdenes de servicio técnico", "IMEI o serial, patrón de desbloqueo, fotos de recepción y tablero hasta la entrega con garantía.", Wrench),
    m("tal_repuestos", "Repuestos e inventario", "Pantallas, baterías y repuestos con stock y costo.", Cog),
    m("tal_comisiones", "Comisiones y liquidación", "Comisión por técnico; solo el dueño liquida.", Percent),
  ],
  construccion: [
    m("tal_proyectos", "Proyectos a la medida", "Cotiza carpintería y muebles con materiales, cobra el abono y el saldo contra entrega.", Hammer),
    m("tal_ordenes", "Órdenes de trabajo", "Instalaciones y servicios con fotos y garantía.", Wrench),
    m("tal_comisiones", "Comisiones y liquidación", "Comisión por operario; solo el dueño liquida.", Percent),
  ],
  papeleria: [
    m("tal_proyectos", "Proyectos de impresión", "Cotiza impresos y publicidad con materiales, cobra el abono y el saldo contra entrega.", FileText),
    m("tal_ordenes", "Órdenes de trabajo", "Trabajos recibidos con fotos y tablero hasta la entrega.", Wrench),
    m("tal_comisiones", "Comisiones y liquidación", "Comisión por operario; solo el dueño liquida.", Percent),
  ],
};
for (const [clave, nuevos] of Object.entries(MODULOS_TALLERTEC)) {
  const tipoTal = TIPOS_NEGOCIO.find((x) => x.clave === clave);
  if (!tipoTal) continue;
  const faltan = nuevos.filter((e) => !tipoTal.modulos.some((x) => x.id === e.id));
  if (faltan.length === 0) continue;
  const pos = tipoTal.modulos.findIndex((x) => x.id === "cotizaciones_taller" || x.id === "ordenes_servicio" || x.id === "ordenes_lavado" || x.id === "reparaciones_cel" || x.id === "proyectos_obra" || x.id === "copias_impresiones");
  tipoTal.modulos.splice(pos >= 0 ? pos : 0, 0, ...faltan);
}

// ---- Hotel, educación, moda, farmacia, óptica y eventos (Prompt #9) ----
// Rack de habitaciones, matrículas y pensiones, matriz talla/color, control de
// fórmula, fórmulas ópticas con laboratorio y eventos sin cruces de fecha.
// Si un tipo no existe, no se toca (nunca falla el arranque).
const MODULOS_TURISMO9: Record<string, ModuloNegocio[]> = {
  hospedaje: [
    m("hot_habitaciones", "Rack de habitaciones", "Disponible, ocupada, reservada, limpieza o mantenimiento: cambia el estado con un toque.", BedDouble),
    m("hot_reservas", "Reservas y check-in", "Entradas, salidas y anticipos; check-in con documento, cargos a la habitación y liquidación a Caja al hacer check-out.", CalendarClock),
  ],
  educacion: [
    m("edu_matriculas", "Estudiantes y matrículas", "Ficha del estudiante y su acudiente, grado y grupo.", GraduationCap),
    m("edu_pensiones", "Pensiones y cartera", "Genera el mes, cobra y avisa la mora por WhatsApp.", Coins),
    m("edu_academico", "Asistencia y boletín", "Llama a lista cada día y lleva las notas y logros por periodo.", ClipboardList),
  ],
  moda: [
    m("mod_matriz", "Referencias y matriz talla/color", "Una referencia padre con sus tallas y colores, código de barras por variante y bonos de regalo.", Shirt),
  ],
  farmacia: [
    m("far_control", "Droguería y control de fórmula", "INVIMA, principio activo y refrigerados; los antibióticos y controlados no se venden sin marcar la fórmula.", Pill),
  ],
  optica: [
    m("opt_formulas", "Fórmula y laboratorio", "Esfera, cilindro, eje, adición y DP de cada ojo, con orden al laboratorio, abono y saldo contra entrega.", Glasses),
  ],
  eventos: [
    m("eve_eventos", "Eventos y salones", "Cotiza, aparta la fecha sin cruces de salón, cobra abonos y cumple la lista logística.", PartyPopper),
  ],
  guarderia: [
    m("edu_matriculas", "Niños y matrículas", "Grupo, jornada, alergias, EPS y acudientes de cada niño.", Baby),
    m("edu_pensiones", "Pensiones y cartera", "Genera el mes, cobra y avisa la mora por WhatsApp.", Coins),
    m("edu_academico", "Asistencia y reporte diario", "Hora de entrada y salida, estado de salud y reporte de comidas, siestas y actividades.", ClipboardList),
  ],
};
const REEMPLAZA_TURISMO9: Record<string, string[]> = {
  hospedaje: ["habitaciones", "reservas_hosp", "huespedes", "servicios_extra", "limpieza"],
  educacion: ["estudiantes", "cursos", "mensualidades", "asistencia"],
  moda: ["prendas_talla", "temporadas", "vitrina"],
  farmacia: ["productos_farm", "inventario_farm", "vencimientos_farm", "formulas"],
  optica: ["formulas_optica", "examenes_visuales", "monturas_optica", "pedidos_lab_optica"],
  eventos: ["eventos_reg", "paquetes_evento", "entregas_evento"],
  guarderia: ["ninos_inscritos", "asistencia_guarderia", "recogida_guarderia", "reportes_guarderia"],
};
for (const [clave, nuevos] of Object.entries(MODULOS_TURISMO9)) {
  const tipoTur = TIPOS_NEGOCIO.find((x) => x.clave === clave);
  if (!tipoTur) continue;
  const quitar = REEMPLAZA_TURISMO9[clave] ?? [];
  const faltan = nuevos.filter((e) => !tipoTur.modulos.some((x) => x.id === e.id));
  if (faltan.length === 0) continue;
  tipoTur.modulos = [...faltan, ...tipoTur.modulos.filter((x) => !quitar.includes(x.id))];
}

// ---- Oficios y parqueadero (Prompt #10, cierre comercial) ----
// Órdenes, casos, proyectos, encargos, piezas, domicilios y turnos con cobro
// directo a Caja y Contabilidad. Cero rubros en modo genérico.
// Si un tipo no existe, no se toca (nunca falla el arranque).
const MODULOS_OFICIOS: Record<string, ModuloNegocio[]> = {
  lavanderia: [
    m("lav_ordenes", "Órdenes de lavado y cobro", "Prendas recibidas, fecha de entrega y cobro que entra a Caja y Contabilidad.", Shirt),
  ],
  profesional: [
    m("prof_casos", "Casos y cobro de honorarios", "Asunto, honorarios pactados y abonos; cada cobro entra a Caja y Contabilidad.", Briefcase),
  ],
  tecnologia: [
    m("tec_proyectos", "Proyectos y cobro", "Alcance, horas y valor con abonos; cada cobro entra a Caja y Contabilidad.", Laptop),
  ],
  papeleria: [
    m("pap_encargos", "Encargos y copias con cobro", "Detalle, fecha de entrega y cobro que entra a Caja y Contabilidad.", FileText),
  ],
  joyeria: [
    m("joy_apartados", "Piezas, apartados y venta", "Material, peso y precio; aparta con abono y cobra el saldo contra entrega.", Gem),
  ],
  licorera: [
    m("lic_domicilios", "Domicilios verificados y cobro", "Verifica la mayoría de edad con documento antes de entregar; el cobro entra a Caja.", Bike),
  ],
};
const REEMPLAZA_OFICIOS: Record<string, string[]> = {
  lavanderia: ["ordenes_lavado", "entregas_lav"],
  profesional: ["casos", "honorarios"],
  tecnologia: ["proyectos_tec", "horas"],
  papeleria: ["copias_impresiones"],
  joyeria: ["piezas_joyeria", "apartados"],
  licorera: ["domicilios_licor"],
};
for (const [clave, nuevos] of Object.entries(MODULOS_OFICIOS)) {
  const tipoOfi = TIPOS_NEGOCIO.find((x) => x.clave === clave);
  if (!tipoOfi) continue;
  const quitar = REEMPLAZA_OFICIOS[clave] ?? [];
  const faltan = nuevos.filter((e) => !tipoOfi.modulos.some((x) => x.id === e.id));
  if (faltan.length === 0) continue;
  tipoOfi.modulos = [...faltan, ...tipoOfi.modulos.filter((x) => !quitar.includes(x.id))];
}

// ---- Salud ocupacional y SG-SST (medicina laboral, profesiograma, estándares 0312, SVE, capacitación) ----
const MODULOS_SST: ModuloNegocio[] = [
  m("sst_empresas", "Empresas cliente y convenios", "Convenios con empresas, riesgo ARL y trabajadores cubiertos.", Handshake),
  m("sst_evaluaciones", "Medicina del trabajo y aptitud", "Evaluaciones de ingreso, periódico, egreso, alturas y certificado de aptitud con código seguro.", Stethoscope),
  m("sst_profesiograma", "Profesiograma y matriz IPVR", "Peligros GTC 45, controles, EPP y periodicidad de exámenes por cargo.", ClipboardList),
  m("sst_estandares", "SG-SST y estándares mínimos", "Evaluación 7, 21 o 60 estándares (Res. 0312), plan anual, COPASST, convivencia e investigación ATEL.", ShieldCheck),
  m("sst_sve", "Vigilancia y ausentismo (SVE)", "Riesgo psicosocial, osteomuscular, auditivo y control de incapacidades por días.", TrendingUp),
  m("sst_capacitaciones", "Capacitaciones y brigadas", "Cronograma por temas, asistencia digital y certificados en PDF.", GraduationCap),
  m("sst_normativa", "Normativa SST Colombia (IA)", "Decreto 1072, Res. 0312, alturas y GTC 45 con actualización automática.", Scale),
];
for (const t of TIPOS_NEGOCIO) {
  if (t.clave !== "salud") continue;
  const faltan = MODULOS_SST.filter((e) => !t.modulos.some((x) => x.id === e.id));
  if (faltan.length > 0) t.modulos = [...faltan, ...t.modulos];
  break;
}
// Salud (presupuestos de tratamiento), educación, hospedaje, gimnasio, mascotas, agro, farmacia y lavandería no cotizan así.
const SIN_COTIZACIONES: TipoNegocioClave[] = ["tienda","restaurante", "cafeteria", "comida_rapida","salud", "educacion", "hospedaje", "gimnasio", "mascotas", "agro", "farmacia", "lavanderia", "belleza", "inmobiliaria", "tecnologia", "condominio", "prestamos", "papeleria", "supermercado", "carniceria", "licorera", "floristeria", "optica", "guarderia", "ganaderia", "fundacion", "iglesia", "seguridad_aseo", "alquiler_vehiculos", "parqueadero"];
for (const t of TIPOS_NEGOCIO) {
  if (SIN_COTIZACIONES.includes(t.clave)) continue;
  if (t.modulos.some((x) => x.id === COTIZACIONES.id || x.id.startsWith("cotizaciones_"))) continue;
  const pos = t.modulos.findIndex((x) => x.id === "facturas" || x.id.startsWith("facturas_"));
  t.modulos.splice(pos >= 0 ? pos : t.modulos.length, 0, COTIZACIONES);
}

/** CRM y Embudo IA: se activa solo en negocios con seguimiento comercial; en mostrador es un switch en el panel del agente. */
export const MODULO_CRM: ModuloNegocio = {
  id: "crm_embudo",
  titulo: "CRM y Embudo IA",
  descripcion: "Prospectos del agente de WhatsApp en tablero Kanban y cola por orden de llegada, con calificación IA.",
  Icon: Target,
  ruta: "/crm-embudo",
  estado: "Activo",
};
/** Tipos de negocio que lo traen activo de fábrica. */
export const CRM_AUTOMATICO: TipoNegocioClave[] = [
  "concesionario", "taller", "alquiler_vehiculos", "inmobiliaria", "construccion", "salud", "belleza", "mascotas", "gimnasio",
  "profesional", "servicios", "educacion", "eventos", "hospedaje", "tecnologia", "transporte", "ferreteria", "optica", "agro", "prestamos",
];
for (const t of TIPOS_NEGOCIO) {
  if (!t.modulos.some((x) => x.id === MODULO_CRM.id)) t.modulos.push(MODULO_CRM);
}

/** Busca un módulo por id en todos los tipos de negocio. */
export function buscarModulo(id: string): ModuloNegocio | undefined {
  for (const t of TIPOS_NEGOCIO) {
    const x = t.modulos.find((mm) => mm.id === id);
    if (x) return x;
  }
  return undefined;
}

const sinAcentos = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** ¿Un producto/categoría guardado con ese tipo pertenece al tipo de negocio actual? (sin tipo = restaurante) */
export function mismoTipoNegocio(filaTipo: string | null | undefined, negocioTipo: string | null | undefined): boolean {
  const fila = filaTipo ? resolverTipoNegocio(filaTipo).clave : "restaurante";
  return fila === resolverTipoNegocio(negocioTipo).clave;
}

/** Convierte el texto guardado en "tipo_negocio" (clave o texto libre) en un tipo conocido. */
export function resolverTipoNegocio(valor: string | null | undefined): TipoNegocio {
  const t = sinAcentos((valor ?? "").trim());
  const por = (c: TipoNegocioClave) => TIPOS_NEGOCIO.find((x) => x.clave === c) as TipoNegocio;
  if (!t) return por("restaurante");
  const directo = TIPOS_NEGOCIO.find((x) => x.clave === t);
  if (directo) return directo;
  if (/ferreter|materiales de construccion|tornillo/.test(t)) return por("ferreteria");
  if (/supermercado|autoservicio|abarrote|minimercado/.test(t)) return por("supermercado");
  if (/carnicer|fruver|frutas y verduras|verduler|pescader|charcuter/.test(t)) return por("carniceria");
  if (/licorer|estanco|vinoteca|tienda de bebidas|licor/.test(t)) return por("licorera");
  if (/florister|flores|arreglos florales|regalos/.test(t)) return por("floristeria");
  if (/optica|optometr|lentes|gafas/.test(t)) return por("optica");
  if (/guarderi|jardin infantil|preescolar|hogar infantil|sala cuna/.test(t)) return por("guarderia");
  if (/alquiler de (vehic|carro|auto|moto)|renta de (carro|auto)|rent a car/.test(t)) return por("alquiler_vehiculos");
  if (/parqueadero|parqueo|estacionamiento|parking/.test(t)) return por("parqueadero");
  if (/seguridad|vigilancia|vigilante|aseo|servicios generales/.test(t)) return por("seguridad_aseo");
  if (/ganader|avicola|porcicol|lecher|pecuari/.test(t)) return por("ganaderia");
  if (/fundacion|ong\b|sin animo de lucro|beneficencia|corporacion social/.test(t)) return por("fundacion");
  if (/iglesia|parroquia|congregacion|templo|club|asociacion|cristian/.test(t)) return por("iglesia");
  if (/carpinter|muebler|ebanist|tapiz/.test(t)) return por("construccion");
  if (/imprenta|publicidad|tipograf|litograf|estampado|plotter/.test(t)) return por("papeleria");
  if (/condominio|conjunto residencial|administracion de edificio|propiedad horizontal/.test(t)) return por("condominio");
  if (/prestamo|cobranza|gota a gota|microcredito|financiera/.test(t)) return por("prestamos");
  if (/textil|confeccion|costura|destajo/.test(t)) return por("textil");
  if (/joyeri|relojeri|joya/.test(t)) return por("joyeria");
  if (/celular|telefonia|movil/.test(t)) return por("celulares");
  if (/papeleri|libreri/.test(t)) return por("papeleria");
  if (/zapater|calzado|\bmoda\b|indumentaria/.test(t)) return por("moda");
  if (/farmac|drogueri|minimercado|supermercado/.test(t)) return por("farmacia");
  if (/belleza|peluquer|barberia|manicur|unas|spa\b|estetica|maquillaje|salon de belleza/.test(t)) return por("belleza");
  if (/evento|fotograf|boda|salon social|matrimonio|quince/.test(t)) return por("eventos");
  if (/abogad|juridic|legal|contab|consultor|notari|despacho|asesor/.test(t)) return por("profesional");
  if (/salud|clinic|consultorio|odont|dental|medic|fisio|psicolog|laborator/.test(t)) return por("salud");
  if (/sst\b|sg-sst|salud ocupacional|medicina laboral|seguridad y salud/.test(t)) return por("salud");
  if (/educa|academ|colegio|curso|escuela|jardin|capacit/.test(t)) return por("educacion");
  if (/hotel|hostal|hospeda|turism|cabana|glamping/.test(t)) return por("hospedaje");
  if (/gimnas|gym|deporte|yoga|crossfit|bienestar/.test(t)) return por("gimnasio");
  if (/construc|ferreter|obra|electric|plomer|arquitect/.test(t)) return por("construccion");
  if (/inmobil|arriendo|propiedad|finca raiz/.test(t)) return por("inmobiliaria");
  if (/agro|campo|finca|cultivo|ganad|granja/.test(t)) return por("agro");
  if (/veterin|mascota|petshop|pet\b/.test(t)) return por("mascotas");
  if (/software|tecnolog|agencia|sistemas|marketing|diseno/.test(t)) return por("tecnologia");
  if (/transport|logistic|mensajer|flete|taxi|carga/.test(t)) return por("transporte");
  if (/lavander|tintorer|autolavado|lavadero/.test(t)) return por("lavanderia");
  if (/taller|mecanic|latoner|lubricent|llantas|alineacion/.test(t)) return por("taller");
  if (/vehic|carro|auto|moto|concesion/.test(t)) return por("concesionario");
  if (/catering|banquete|cocina por encargo|almuerzos corporativ/.test(t)) return por("catering");
  if (/panader|pastel|reposter|postre|torta|boller/.test(t)) return por("panaderia");
  if (/comida rapida|food truck|fast food|pizz|hamburg|perro caliente|salchipap|empanad|taquer|asadero|broaster/.test(t)) return por("comida_rapida");
  if (/cafe|bar\b|heladeri|helado|licor|cerveza|coctel|discoteca|pub\b/.test(t)) return por("cafeteria");
  if (/comida|restaur|pollo|chuleta/.test(t)) return por("restaurante");
  if (/tienda|comercio|repuesto|retail|ropa|boutique/.test(t)) return por("tienda");
  if (/servicio|cita|salon|belleza|barber|clinic|dental|spa|taller/.test(t)) return por("servicios");
  // Texto que no corresponde a ningún tipo (por ejemplo el antiguo "negocio general"): se trata como restaurante.
  return por("restaurante");
}
