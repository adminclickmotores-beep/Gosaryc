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
  type LucideIcon,
} from "lucide-react";

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
  | "moda";

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
const FIADOS: ModuloNegocio = {
  ...m("fiados", "Cartera y fiados", "Quién te debe, cuánto y cuándo prometió pagar.", Coins),
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
const CAJA_CEL = m("caja_cel", "Caja de la tienda de celulares", "Apertura, cierre de caja, cobros de equipos y gastos del día.", Banknote);
const CAJA_PAPEL = m("caja_papel", "Caja de la papelería", "Apertura, cierre de caja, cobros de útiles y gastos del día.", Banknote);
const CAJA_MODA = m("caja_moda", "Caja de la tienda de moda", "Apertura, cierre de caja, cobros de prendas y gastos del día.", Banknote);
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
      FIADOS, FACTURAS, PAGOS, FIDELIZACION, RESENAS,CAJA, PROVEEDORES, EMPLEADOS, METAS, FINANZAS,
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
      m("alistamiento", "Alistamiento", "Lavado, revisión y papeles para dejar el vehículo listo para la venta.", ShieldCheck),      m("documentos_veh", "Documentos del vehículo", "Tarjeta de propiedad, tecnomecánica, seguros y contratos.", FolderOpen),
      m("vencimientos_veh", "Alertas de vencimientos", "SOAT, tecnomecánica y seguros próximos a vencer.", CalendarClock),
      m("taller", "Taller y mantenimientos", "Órdenes de servicio y repuestos.", Wrench),      m("costos_veh", "Costos y rentabilidad por vehículo", "Compra, reparaciones y utilidad de cada vehículo.", TrendingUp),
      m("cartera_veh", "Cartera y cuotas de clientes", "Saldos y cuotas pendientes de pago.", Coins),
      m("proveedores_veh", "Proveedores y gestores", "Gestores de trámites, talleres externos y proveedores.", Truck),
      m("comisiones", "Comisiones de asesores", "Comisión por venta de cada asesor.", Percent),
      FACTURAS, GARANTIAS, RESENAS,CAJA, EMPLEADOS, METAS, FINANZAS,
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
      FIADOS, FACTURAS, PAGOS_TIENDA, FIDELIZACION, RESENAS_TIENDA, CAJA, PROVEEDORES, PERSONAL_TIENDA, METAS_TIENDA, FINANZAS,
    ],
  },
  {
    clave: "servicios",
    etiqueta: "Servicios / citas",
    panel: "Servicios",
    usaPedidos: false,
    modulos: [
      m("catalogo_servicios", "Catálogo de servicios", "Servicios, duración y precio.", Scissors),
      m("profesionales", "Profesionales y recursos", "Quién atiende, sus servicios, horarios y los recursos que usa (sala, equipo).", BadgeCheck),
      m("disponibilidad", "Disponibilidad", "Horarios y bloqueos de cada profesional y recurso para evitar reservas duplicadas.", CalendarClock),
      AGENDA,
      m("prospectos_serv", "Prospectos", "Personas interesadas que aún no reservan, con seguimiento.", Users),
      m("ordenes_serv_cita", "Órdenes de servicio", "Reserva, asignación, seguimiento y finalización del servicio hasta facturación y pago.", ClipboardList),
      m("anticipos_serv", "Anticipos", "Anticipos de reservas y su aplicación al pago final.", Banknote),
      m("paquetes", "Paquetes y membresías", "Bonos de sesiones y planes mensuales.", Gift),
      m("historial", "Historial del cliente", "Notas y trabajos realizados por cliente.", ClipboardList),
      m("lista_espera", "Lista de espera", "Clientes por atender cuando se libere un cupo.", Bell),
      m("comisiones", "Comisiones del personal", "Pago por servicio realizado.", Percent),
      CLIENTES_SERVICIOS,
      FACTURAS, PAGOS_SERVICIOS, FIDELIZACION, RESENAS_SERVICIOS, CAJA, PERSONAL_SERVICIOS, METAS_SERVICIOS, FINANZAS,
    ],
  },
  {
    clave: "salud",
    etiqueta: "Salud / consultorio / clínica",
    panel: "Consultorio",
    usaPedidos: false,
    modulos: [
      m("pacientes", "Pacientes y fichas", "Datos de contacto y antecedentes de cada paciente.", Stethoscope),
      AGENDA,
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
      FACTURAS_SALUD, PAGOS_SALUD, RESENAS_SALUD, CAJA, PROVEEDORES, PERSONAL_SALUD, METAS_SALUD, FINANZAS,
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
      AGENDA,
      m("mensualidades", "Pensiones y mensualidades", "Pagos pendientes y recordatorios de cobro.", Coins),
      m("asistencia", "Asistencia y notas", "Seguimiento del avance de cada estudiante.", BadgeCheck),
      FACTURAS, PAGOS_EDUCACION, RESENAS_EDUCACION, CAJA, PERSONAL_EDUCACION, METAS_EDUCACION, FINANZAS,
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
      FACTURAS, PAGOS_HOSP, FIDELIZACION, RESENAS_HOSP, CAJA, PROVEEDORES, PERSONAL_HOSP, METAS_HOSP, FINANZAS,
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
      FACTURAS, PAGOS_GYM, FIDELIZACION, RESENAS_GYM, CAJA, PROVEEDORES, PERSONAL_GYM, METAS_GYM, FINANZAS,
    ],
  },
  {
    clave: "construccion",
    etiqueta: "Construcción / ferretería / oficios",
    panel: "Obras y oficios",
    usaPedidos: false,
    modulos: [
      m("proyectos_obra", "Proyectos y obras", "Avance, presupuesto y responsables de cada obra.", Hammer),
      m("cotizaciones_obra", "Cotizaciones", "Propuestas y seguimiento hasta el cierre.", FileText),
      m("materiales", "Materiales y herramientas", "Inventario y consumo por obra.", Package),
      m("contratistas", "Contratistas y pagos", "Cuentas por pagar a maestros y subcontratistas.", Handshake),
      AGENDA, CLIENTES_OBRA, GARANTIAS, FIADOS, FACTURAS, PAGOS_OBRA, RESENAS_OBRA, CAJA, PROVEEDORES, PERSONAL_OBRA, METAS_OBRA, FINANZAS,
    ],
  },
  {
    clave: "agro",
    etiqueta: "Agro / campo / producción",
    panel: "Producción",
    usaPedidos: false,
    modulos: [
      m("cultivos", "Cultivos y lotes", "Siembras, lotes y ciclos de producción.", Sprout),
      m("cosechas", "Cosechas y ventas", "Producción recogida y a quién se vendió.", PackageCheck),
      m("insumos_agro", "Insumos y fertilizantes", "Compras y consumo por lote.", Boxes),
      m("animales", "Animales y sanidad", "Control de ganado, vacunas y tratamientos.", Shield),
      CLIENTES_AGRO, FACTURAS, PAGOS_AGRO, FIADOS, CAJA, PROVEEDORES, PERSONAL_AGRO, METAS_AGRO, FINANZAS,
    ],
  },
  {
    clave: "inmobiliaria",
    etiqueta: "Inmobiliaria / arriendos",
    panel: "Inmobiliaria",
    usaPedidos: false,
    modulos: [
      m("inmuebles", "Inmuebles", "Propiedades en venta o arriendo con su estado.", Building2),
      m("arrendatarios", "Arrendatarios y contratos", "Contratos, canon y vencimientos.", FileText),
      m("cobro_canon", "Cobro de arriendos", "Cartera mensual y recordatorios.", Coins),
      m("visitas", "Visitas a inmuebles", "Agenda de visitas con seguimiento.", KeyRound),
      CLIENTES_INMO, AGENDA, FACTURAS, PAGOS_INMO, CAJA, PERSONAL_INMO, METAS_INMO, FINANZAS,
    ],
  },
  {
    clave: "mascotas",
    etiqueta: "Veterinaria / mascotas",
    panel: "Veterinaria",
    usaPedidos: false,
    modulos: [
      m("mascotas_reg", "Mascotas y dueños", "Ficha de cada mascota y su responsable.", PawPrint),
      AGENDA,
      m("vacunacion", "Vacunas y desparasitación", "Próximas dosis y recordatorios.", ShieldCheck),
      m("productos_vet", "Productos y alimentos", "Inventario y ventas.", ShoppingBag),
      FACTURAS, PAGOS_VET, FIDELIZACION, RESENAS_VET, CAJA, PROVEEDORES, PERSONAL_VET, METAS_VET, FINANZAS,
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
      CLIENTES_TEC, SOLICITUDES, FACTURAS, PAGOS_TEC, CAJA, PERSONAL_TEC, METAS_TEC, FINANZAS,
    ],
  },
  {
    clave: "transporte",
    etiqueta: "Transporte / logística",
    panel: "Logística",
    usaPedidos: false,
    modulos: [
      m("flota", "Flota y vehículos", "Vehículos, documentos y mantenimiento.", Truck),
      m("viajes", "Viajes y despachos", "Rutas, cargas y estado de cada envío.", Package),
      m("conductores", "Conductores y pagos", "Liquidación por viaje.", Briefcase),
      m("combustible", "Combustible y gastos de ruta", "Control de gastos por vehículo.", Banknote),
      CLIENTES_TRANSP, AGENDA, FIADOS, FACTURAS, PAGOS_TRANSP, RESENAS_TRANSP, CAJA, PROVEEDORES, PERSONAL_TRANSP, METAS_TRANSP, FINANZAS,
    ],
  },
];

// ---- Más tipos de negocio ----
// Los negocios de comida comparten los módulos del restaurante (menú, pedidos, cocina, insumos, recetas)
// y agregan los suyos propios.
const comida = (
  clave: TipoNegocioClave,
  etiqueta: string,
  panel: string,
  extras: ModuloNegocio[],
  quitar: string[] = [],
): TipoNegocio => {
  const base = TIPOS_NEGOCIO.find((x) => x.clave === "restaurante") as TipoNegocio;
  const mods = base.modulos.filter((x) => !quitar.includes(x.id));
  mods.splice(2, 0, ...extras);
  return { clave, etiqueta, panel, usaPedidos: true, modulos: mods };
};

TIPOS_NEGOCIO.push(
  comida("panaderia", "Panadería / pastelería / repostería", "Panadería", [
    m("encargos_tortas", "Encargos de tortas y pasteles", "Pedidos por fecha: sabor, tamaño, decoración y anticipo.", Cake),
  ], ["mesas", "propinas", "suscripciones"]),
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
      AGENDA,
      m("paquetes", "Paquetes y membresías", "Bonos de sesiones y planes mensuales.", Gift),
      m("historial", "Historial del cliente", "Fórmulas, alergias y trabajos realizados.", ClipboardList),
      m("lista_espera", "Lista de espera", "Clientes por atender cuando se libere un cupo.", Bell),
      m("comisiones", "Comisiones del personal", "Pago por servicio realizado.", Percent),
      m("productos_belleza", "Productos y cosméticos", "Inventario y venta de productos.", Sparkles),
      CLIENTES_BELL, SOLICITUDES,
      FIADOS, FACTURAS, PAGOS_BELL, FIDELIZACION, RESENAS_BELL, CAJA, PROVEEDORES, PERSONAL_BELL, METAS_BELL, FINANZAS,
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
      AGENDA, CLIENTES_TALLER, GARANTIAS,
      FIADOS, FACTURAS, PAGOS_TALLER, RESENAS_TALLER, CAJA, PROVEEDORES, PERSONAL_TALLER, METAS_TALLER, FINANZAS,
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
      FIADOS, FACTURAS, PAGOS_FARM, FIDELIZACION, RESENAS_FARM, CAJA, PROVEEDORES, PERSONAL_FARM, METAS_FARM, FINANZAS,
    ],
  },
  {
    clave: "eventos",
    etiqueta: "Eventos / salón social / fotografía",
    panel: "Eventos",
    usaPedidos: false,
    modulos: [
      m("eventos_reg", "Eventos y reservas", "Fecha, cliente, lugar, anticipo y saldo.", PartyPopper),
      AGENDA,
      m("paquetes_evento", "Paquetes y servicios", "Paquetes con su precio y lo que incluyen.", Gift),
      m("entregas_evento", "Entregas y pendientes", "Álbumes, archivos o materiales por entregar.", PackageCheck),
      CLIENTES_EVENTOS, SOLICITUDES,
      FIADOS, FACTURAS, PAGOS_EVENTOS, RESENAS_EVENTOS, CAJA, PROVEEDORES, PERSONAL_EVENTOS, METAS_EVENTOS, FINANZAS,
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
      AGENDA, CLIENTES_PROF, SOLICITUDES,
      FACTURAS, PAGOS_PROF, RESENAS_PROF, CAJA, PERSONAL_PROF, METAS_PROF, FINANZAS,
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
      CLIENTES_LAV, AGENDA,
      FIADOS, FACTURAS, PAGOS_LAV, FIDELIZACION, RESENAS_LAV, CAJA, PROVEEDORES, PERSONAL_LAV, METAS_LAV, FINANZAS,
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
      CLIENTES_COND, AGENDA, FACTURAS, PAGOS_COND, CAJA, PROVEEDORES, PERSONAL_COND, METAS_COND, FINANZAS,
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
      CLIENTES_PREST, AGENDA, FACTURAS, PAGOS_PREST, CAJA, PERSONAL_PREST, METAS_PREST, FINANZAS,
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
      CLIENTES_TEXTIL, AGENDA, FIADOS, FACTURAS, PAGOS_TEXTIL, CAJA, PROVEEDORES, PERSONAL_TEXTIL, METAS_TEXTIL, FINANZAS,
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
      CLIENTES_JOY, FIADOS, FACTURAS, PAGOS_JOY, FIDELIZACION, RESENAS_JOY, CAJA, PROVEEDORES, PERSONAL_JOY, METAS_JOY, FINANZAS,
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
      CLIENTES_CEL, GARANTIAS, FIADOS, FACTURAS_CEL, PAGOS_CEL, FIDELIZACION, RESENAS_CEL, CAJA_CEL, PROVEEDORES, PERSONAL_CEL, METAS_CEL, FINANZAS,
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
      CLIENTES_PAPEL, FIADOS, FACTURAS_PAPEL, PAGOS_PAPEL, FIDELIZACION, CAJA_PAPEL, PROVEEDORES, PERSONAL_PAPEL, METAS_PAPEL, FINANZAS,
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
      CLIENTES_MODA, FIADOS, FACTURAS_MODA, PAGOS_MODA, FIDELIZACION, RESENAS_MODA, CAJA_MODA, PROVEEDORES, PERSONAL_MODA, METAS_MODA, FINANZAS,
    ],
  },
);

// Se agrega el módulo de cotizaciones a los tipos que cotizan y no tienen uno propio.
// Salud (presupuestos de tratamiento), educación, hospedaje, gimnasio, mascotas, agro, farmacia y lavandería no cotizan así.
const SIN_COTIZACIONES: TipoNegocioClave[] = ["tienda","restaurante", "cafeteria", "comida_rapida","salud", "educacion", "hospedaje", "gimnasio", "mascotas", "agro", "farmacia", "lavanderia", "belleza", "inmobiliaria", "tecnologia", "condominio", "prestamos", "papeleria"];
for (const t of TIPOS_NEGOCIO) {
  if (SIN_COTIZACIONES.includes(t.clave)) continue;
  if (t.modulos.some((x) => x.id === COTIZACIONES.id || x.id.startsWith("cotizaciones_"))) continue;
  const pos = t.modulos.findIndex((x) => x.id === "facturas" || x.id.startsWith("facturas_"));
  t.modulos.splice(pos >= 0 ? pos : t.modulos.length, 0, COTIZACIONES);
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
