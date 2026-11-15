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
  | "lavanderia";

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
      m("vehiculos_usados", "Retomas, compras y consignación", "Registra usados que retomas, compras o recibes en consignación, con peritaje y precio de retoma.", Handshake),
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
      m("alistamiento", "Alistamiento y entrega", "Lavado, revisión y papeles antes de entregar.", ShieldCheck),
      m("tramites", "Trámites: SOAT, traspaso y matrícula", "Control de trámites y vencimientos por vehículo.", Shield),
      m("documentos_veh", "Documentos del vehículo", "Tarjeta de propiedad, tecnomecánica, seguros y contratos.", FolderOpen),
      m("vencimientos_veh", "Alertas de vencimientos", "SOAT, tecnomecánica y seguros próximos a vencer.", CalendarClock),
      m("taller", "Taller y mantenimientos", "Órdenes de servicio y repuestos.", Wrench),
      m("citas_taller", "Citas de taller y mantenimiento", "Agenda de servicios y mantenimientos programados.", CalendarDays),
      m("repuestos", "Repuestos y accesorios", "Inventario y venta de repuestos y accesorios.", Cog),
      m("costos_veh", "Costos y rentabilidad por vehículo", "Compra, reparaciones y utilidad de cada vehículo.", TrendingUp),
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
      m("productos", "Catálogo de productos", "Productos, precios y categorías.", ShoppingBag),
      m("inventario", "Inventario y reposición", "Existencias y alertas de bajo stock.", Package),
      m("apartados", "Apartados (plan separe)", "Abonos y entrega de productos separados.", Tag),
      m("catalogo_whatsapp", "Catálogo para WhatsApp", "Comparte tu catálogo con un enlace.", QrCode),
      m("devoluciones", "Cambios y devoluciones", "Control de cambios y notas crédito.", Repeat),
      CLIENTES, SOLICITUDES, GARANTIAS,
      FIADOS, FACTURAS, PAGOS, FIDELIZACION, RESENAS,CAJA, PROVEEDORES, EMPLEADOS, METAS, FINANZAS,
    ],
  },
  {
    clave: "servicios",
    etiqueta: "Servicios / citas",
    panel: "Servicios",
    usaPedidos: false,
    modulos: [
      m("catalogo_servicios", "Catálogo de servicios", "Servicios, duración y precio.", Scissors),
      m("tarifas_servicios", "Tarifas", "Precios por servicio, profesional o tipo de cliente.", Tag),
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
      CLIENTES, SOLICITUDES,
      FIADOS, FACTURAS, PAGOS, FIDELIZACION, RESENAS,CAJA, PROVEEDORES, EMPLEADOS, METAS, FINANZAS,
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
      m("especialidades", "Especialidades", "Especialidades médicas que ofrece el centro y qué profesionales las atienden.", BadgeCheck),
      m("consultas_diagnosticos", "Consultas y diagnósticos", "Motivo de consulta, diagnóstico y conducta de cada atención.", Stethoscope),
      m("procedimientos", "Procedimientos", "Procedimientos realizados a cada paciente, con su valor.", Scissors),
      m("ordenes_medicas", "Órdenes médicas", "Exámenes y remisiones indicados por el profesional.", FileText),
      m("formulas", "Fórmulas", "Medicamentos formulados a cada paciente.", Pill),
      m("consentimientos", "Consentimientos", "Consentimientos informados firmados por cada paciente, con fecha y vigencia.", ClipboardList),
      m("convenios_salud", "Convenios y seguros", "Convenios con empresas y aseguradoras, y su cartera.", Handshake),
      m("auditoria_clinica", "Auditoría de accesos", "Registro de quién consultó o modificó información clínica.", ShieldCheck),
      m("insumos_salud", "Insumos y medicamentos", "Existencias y alertas de faltantes.", Package),
      m("autorizaciones", "Autorizaciones y EPS", "Seguimiento de autorizaciones y cobros a aseguradoras.", Landmark),
      CLIENTES, FACTURAS, PAGOS, RESENAS,CAJA, PROVEEDORES, EMPLEADOS, METAS, FINANZAS,
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
      CLIENTES, FACTURAS, PAGOS, RESENAS,CAJA, EMPLEADOS, METAS, FINANZAS,
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
      FACTURAS, PAGOS, FIDELIZACION, RESENAS,CAJA, PROVEEDORES, EMPLEADOS, METAS, FINANZAS,
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
      CLIENTES, FACTURAS, PAGOS, FIDELIZACION, RESENAS,CAJA, PROVEEDORES, EMPLEADOS, METAS, FINANZAS,
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
      AGENDA, CLIENTES, GARANTIAS, FIADOS, FACTURAS, PAGOS, RESENAS, CAJA, PROVEEDORES, EMPLEADOS, METAS, FINANZAS,
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
      CLIENTES, FACTURAS, PAGOS, FIADOS, CAJA, PROVEEDORES, EMPLEADOS, METAS, FINANZAS,
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
      CLIENTES, AGENDA, FACTURAS, PAGOS, CAJA, EMPLEADOS, METAS, FINANZAS,
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
      CLIENTES, FACTURAS, PAGOS, FIDELIZACION, RESENAS,CAJA, PROVEEDORES, EMPLEADOS, METAS, FINANZAS,
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
      CLIENTES, SOLICITUDES, FACTURAS, PAGOS, CAJA, EMPLEADOS, METAS, FINANZAS,
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
      CLIENTES, AGENDA, FIADOS, FACTURAS, PAGOS, RESENAS, CAJA, PROVEEDORES, EMPLEADOS, METAS, FINANZAS,
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
    m("produccion_dia", "Producción del día", "Qué hornear hoy y cuántas unidades por producto.", ChefHat),
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
      CLIENTES, SOLICITUDES,
      FIADOS, FACTURAS, PAGOS, FIDELIZACION, RESENAS,CAJA, PROVEEDORES, EMPLEADOS, METAS, FINANZAS,
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
      AGENDA, CLIENTES, GARANTIAS,
      FIADOS, FACTURAS, PAGOS, RESENAS,CAJA, PROVEEDORES, EMPLEADOS, METAS, FINANZAS,
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
      CLIENTES,
      FIADOS, FACTURAS, PAGOS, FIDELIZACION, RESENAS,CAJA, PROVEEDORES, EMPLEADOS, METAS, FINANZAS,
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
      CLIENTES, SOLICITUDES,
      FIADOS, FACTURAS, PAGOS, RESENAS,CAJA, PROVEEDORES, EMPLEADOS, METAS, FINANZAS,
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
      AGENDA, CLIENTES, SOLICITUDES,
      FACTURAS, PAGOS, RESENAS, CAJA, EMPLEADOS, METAS, FINANZAS,
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
      CLIENTES, AGENDA,
      FIADOS, FACTURAS, PAGOS, FIDELIZACION, RESENAS,CAJA, PROVEEDORES, EMPLEADOS, METAS, FINANZAS,
    ],
  },
);

// Se agrega el módulo de cotizaciones a los tipos que cotizan y no tienen uno propio.
// Salud (presupuestos de tratamiento), educación, hospedaje, gimnasio, mascotas, agro, farmacia y lavandería no cotizan así.
const SIN_COTIZACIONES: TipoNegocioClave[] = ["restaurante", "cafeteria", "comida_rapida","salud", "educacion", "hospedaje", "gimnasio", "mascotas", "agro", "farmacia", "lavanderia", "belleza"];
for (const t of TIPOS_NEGOCIO) {
  if (SIN_COTIZACIONES.includes(t.clave)) continue;
  if (t.modulos.some((x) => x.id === COTIZACIONES.id || x.id.startsWith("cotizaciones_"))) continue;
  const pos = t.modulos.findIndex((x) => x.id === "facturas");
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
