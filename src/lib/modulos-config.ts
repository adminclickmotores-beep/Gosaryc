/** Reglas y etiquetas propias de cada módulo (estados, campos y qué cuenta como "pendiente"). */
export type EstadoModulo = { clave: string; texto: string };

export type ConfigModulo = {
  estados: EstadoModulo[];
  /** Estados que se consideran cerrados (no suman en el resumen "pendiente"). */
  cerrados: string[];
  placeholderTitulo: string;
  placeholderDetalle: string;
  etiquetaContacto: string;
  etiquetaMonto: string;
  etiquetaFecha: string;
  resumen: string;
  /** Estado que requiere que el registro tenga fecha (ej. citas). */
  exigeFecha?: boolean;
  /** Familia operativa del módulo (define qué acciones reales tiene). */
  tipo: string;
};

const base: ConfigModulo = {
  tipo: "general",
  estados: [
    { clave: "pendiente", texto: "Pendiente" },
    { clave: "en_proceso", texto: "En proceso" },
    { clave: "hecho", texto: "Hecho" },
  ],
  cerrados: ["hecho"],
  placeholderTitulo: "Título (ej. nombre o referencia)",
  placeholderDetalle: "Detalle / notas",
  etiquetaContacto: "Cliente o contacto",
  etiquetaMonto: "Valor (COP)",
  etiquetaFecha: "Fecha",
  resumen: "Por cerrar",
};

const PRESETS: Record<string, Partial<ConfigModulo>> = {
  cartera: {
    estados: [
      { clave: "pendiente", texto: "Debe" },
      { clave: "abonado", texto: "Abonó" },
      { clave: "pagado", texto: "Pagado" },
    ],
    cerrados: ["pagado"],
    placeholderTitulo: "Concepto (ej. fiado del mes, cuota 3)",
    placeholderDetalle: "Acuerdo de pago / notas",
    etiquetaContacto: "Deudor",
    etiquetaMonto: "Valor adeudado (COP)",
    etiquetaFecha: "Fecha prometida de pago",
    resumen: "Por cobrar",
  },
  reserva: {
    estados: [
      { clave: "pendiente", texto: "Separado" },
      { clave: "abonado", texto: "Con abono" },
      { clave: "entregado", texto: "Entregado" },
      { clave: "cancelado", texto: "Cancelado" },
    ],
    cerrados: ["entregado", "cancelado"],
    placeholderTitulo: "Producto o artículo separado",
    placeholderDetalle: "Abonos recibidos / condiciones",
    etiquetaContacto: "Cliente",
    etiquetaMonto: "Valor total (COP)",
    etiquetaFecha: "Fecha límite de entrega",
    resumen: "Por entregar",
  },
  cita: {
    estados: [
      { clave: "pendiente", texto: "Programada" },
      { clave: "confirmada", texto: "Confirmada" },
      { clave: "atendida", texto: "Atendida" },
      { clave: "cancelada", texto: "Cancelada" },
    ],
    cerrados: ["atendida", "cancelada"],
    placeholderTitulo: "Motivo o servicio de la cita",
    placeholderDetalle: "Notas previas / observaciones",
    etiquetaContacto: "Cliente o paciente",
    etiquetaMonto: "Valor estimado (COP)",
    etiquetaFecha: "Fecha de la cita",
    resumen: "Por atender",
    exigeFecha: true,
  },
  vencimiento: {
    estados: [
      { clave: "pendiente", texto: "Vigente" },
      { clave: "por_vencer", texto: "Por vencer" },
      { clave: "vencido", texto: "Vencido" },
      { clave: "hecho", texto: "Renovado" },
    ],
    cerrados: ["hecho"],
    placeholderTitulo: "Documento o trámite (ej. SOAT, contrato)",
    placeholderDetalle: "Número, entidad y notas",
    etiquetaContacto: "Responsable / titular",
    etiquetaMonto: "Costo (COP)",
    etiquetaFecha: "Fecha de vencimiento",
    resumen: "Por renovar",
    exigeFecha: true,
  },
  stock: {
    estados: [
      { clave: "pendiente", texto: "Disponible" },
      { clave: "bajo", texto: "Bajo stock" },
      { clave: "agotado", texto: "Agotado" },
    ],
    cerrados: ["pendiente"],
    placeholderTitulo: "Nombre / referencia del artículo",
    placeholderDetalle: "Cantidad, ubicación, características",
    etiquetaContacto: "Proveedor",
    etiquetaMonto: "Precio (COP)",
    etiquetaFecha: "Último ingreso",
    resumen: "A reponer",
  },
  proyecto: {
    estados: [
      { clave: "pendiente", texto: "Por iniciar" },
      { clave: "en_proceso", texto: "En curso" },
      { clave: "hecho", texto: "Terminado" },
    ],
    cerrados: ["hecho"],
    placeholderTitulo: "Nombre del trabajo o proyecto",
    placeholderDetalle: "Alcance, avances y responsables",
    etiquetaContacto: "Cliente",
    etiquetaMonto: "Presupuesto (COP)",
    etiquetaFecha: "Fecha de entrega",
    resumen: "En curso",
  },
  venta: {
    estados: [
      { clave: "pendiente", texto: "Cotizado" },
      { clave: "en_proceso", texto: "Negociando" },
      { clave: "hecho", texto: "Cerrado" },
    ],
    cerrados: ["hecho"],
    placeholderTitulo: "Producto o servicio cotizado",
    placeholderDetalle: "Condiciones y seguimiento",
    etiquetaContacto: "Cliente o interesado",
    etiquetaMonto: "Valor de la propuesta (COP)",
    etiquetaFecha: "Próximo seguimiento",
    resumen: "En negociación",
  },
  pago: {
    estados: [
      { clave: "pendiente", texto: "Por pagar" },
      { clave: "en_proceso", texto: "Parcial" },
      { clave: "hecho", texto: "Pagado" },
    ],
    cerrados: ["hecho"],
    placeholderTitulo: "Concepto del pago",
    placeholderDetalle: "Referencia, soporte o notas",
    etiquetaContacto: "Beneficiario / pagador",
    etiquetaMonto: "Valor (COP)",
    etiquetaFecha: "Fecha de pago",
    resumen: "Por pagar",
  },
  socio: {
    estados: [
      { clave: "pendiente", texto: "Al día" },
      { clave: "por_vencer", texto: "Por vencer" },
      { clave: "vencido", texto: "Vencido" },
    ],
    cerrados: ["pendiente"],
    placeholderTitulo: "Nombre del socio",
    placeholderDetalle: "Plan, horario preferido y observaciones",
    etiquetaContacto: "Contacto de emergencia",
    etiquetaMonto: "Valor del plan (COP)",
    etiquetaFecha: "Vencimiento del plan",
    resumen: "Por renovar",
    exigeFecha: true,
  },
  paciente: {
    estados: [
      { clave: "pendiente", texto: "En espera" },
      { clave: "en_proceso", texto: "En tratamiento" },
      { clave: "hecho", texto: "Dado de alta" },
    ],
    cerrados: ["hecho"],
    placeholderTitulo: "Nombre del paciente",
    placeholderDetalle: "Motivo de consulta, alergias y notas",
    etiquetaContacto: "Acudiente o responsable",
    etiquetaMonto: "Valor de la consulta (COP)",
    etiquetaFecha: "Fecha de atención",
    resumen: "En tratamiento",
  },
  estudiante: {
    estados: [
      { clave: "pendiente", texto: "Inscrito" },
      { clave: "en_proceso", texto: "Cursando" },
      { clave: "hecho", texto: "Finalizado" },
    ],
    cerrados: ["hecho"],
    placeholderTitulo: "Nombre del estudiante",
    placeholderDetalle: "Curso, grado y observaciones",
    etiquetaContacto: "Acudiente o padre/madre",
    etiquetaMonto: "Valor de la matrícula (COP)",
    etiquetaFecha: "Fecha de inscripción",
    resumen: "Por cerrar",
  },
  huesped: {
    estados: [
      { clave: "pendiente", texto: "Reservado" },
      { clave: "en_proceso", texto: "Hospedado" },
      { clave: "hecho", texto: "Salió" },
    ],
    cerrados: ["hecho"],
    placeholderTitulo: "Nombre del huésped",
    placeholderDetalle: "Documento, preferencias y notas",
    etiquetaContacto: "Acompañante o empresa",
    etiquetaMonto: "Valor de la estadía (COP)",
    etiquetaFecha: "Fecha de llegada",
    resumen: "Por cobrar",
  },
  mascota: {
    estados: [
      { clave: "pendiente", texto: "En espera" },
      { clave: "en_proceso", texto: "En atención" },
      { clave: "hecho", texto: "Atendida" },
    ],
    cerrados: ["hecho"],
    placeholderTitulo: "Nombre de la mascota",
    placeholderDetalle: "Especie, raza y observaciones",
    etiquetaContacto: "Dueño o responsable",
    etiquetaMonto: "Valor (COP)",
    etiquetaFecha: "Fecha de atención",
    resumen: "En atención",
  },
  inmueble: {
    estados: [
      { clave: "pendiente", texto: "Disponible" },
      { clave: "en_proceso", texto: "En negociación" },
      { clave: "hecho", texto: "Cerrado" },
    ],
    cerrados: ["hecho"],
    placeholderTitulo: "Dirección o nombre del inmueble",
    placeholderDetalle: "Área, habitaciones y características",
    etiquetaContacto: "Propietario o interesado",
    etiquetaMonto: "Precio o canon (COP)",
    etiquetaFecha: "Fecha de disponibilidad",
    resumen: "En negociación",
  },
};

const POR_MODULO: Record<string, keyof typeof PRESETS> = {
  fiados: "cartera", cobro_canon: "cartera", mensualidades: "cartera", cartera_veh: "cartera", contratistas: "pago",
  apartados: "reserva", separaciones_veh: "reserva", mesas: "reserva", reservas_hosp: "reserva",
  citas_taller: "cita", pruebas_manejo: "cita", visitas: "cita", clases: "cita", lista_espera: "cita", agenda: "cita",
  vacunacion: "vencimiento", vencimientos_veh: "vencimiento", tramites: "vencimiento",
  documentos_veh: "vencimiento", arrendatarios: "vencimiento", autorizaciones: "vencimiento",
  insumos: "stock", inventario: "stock", materiales: "stock", productos: "stock", repuestos: "stock",
  insumos_salud: "stock", insumos_agro: "stock", productos_vet: "stock",
  vehiculos: "stock", vehiculos_usados: "stock", combos: "stock",
  proyectos_obra: "proyecto", proyectos_tec: "proyecto", tickets: "proyecto", viajes: "proyecto",
  taller: "proyecto", alistamiento: "proyecto", limpieza: "proyecto", cultivos: "proyecto", cursos: "proyecto",
  tratamientos: "proyecto", cosechas: "proyecto",
  cotizaciones_veh: "venta", cotizaciones_obra: "venta", ventas_veh: "venta",
  creditos_veh: "venta", suscripciones: "venta", suscripciones_tec: "venta",
  pagos_digitales: "pago", facturas: "pago", propinas: "pago", comisiones: "pago", repartidores: "pago",
  conductores: "pago", combustible: "pago", costos_veh: "pago", equipo_turnos: "pago", caja_diaria: "pago",
  proveedores: "pago", proveedores_veh: "pago",
  socios: "socio", pacientes: "paciente", historia_clinica: "paciente", estudiantes: "estudiante",
  huespedes: "huesped", mascotas_reg: "mascota", inmuebles: "inmueble",
  encargos_tortas: "reserva", eventos_catering: "reserva", eventos_reg: "reserva",
  produccion_dia: "proyecto", ordenes_servicio: "proyecto", ordenes_lavado: "proyecto", casos: "proyecto",
  entregas_evento: "proyecto", entregas_lav: "proyecto", formulas: "proyecto", puntos_venta: "venta",
  honorarios: "cartera", plazos: "vencimiento", vencimientos_farm: "vencimiento", recordatorio_mant: "vencimiento",
  insumos_barra: "stock", productos_belleza: "stock", repuestos_taller: "stock", inventario_farm: "stock",
  productos_farm: "stock", insumos_lav: "stock",
  cotizaciones_taller: "venta",
  inspecciones_veh: "proyecto", prospectos_veh: "venta", garantias: "proyecto", devoluciones: "pago",
  catalogo_whatsapp: "stock", tarifas_servicios: "stock", profesionales: "proyecto", disponibilidad: "cita",
  prospectos_serv: "venta", anticipos_serv: "cartera", especialidades: "stock", consultas_diagnosticos: "paciente",
  procedimientos: "paciente", ordenes_medicas: "proyecto", convenios_salud: "cartera", auditoria_clinica: "proyecto",
  vehiculos_clientes: "stock", servicios_extra: "cartera", historial: "proyecto", catalogo_servicios: "stock",
  tarifas_lavado: "stock", documentos_prof: "vencimiento", habitaciones: "proyecto", control_acceso: "proyecto",  consultorios: "proyecto",consentimientos: "vencimiento",
};

const est = (...pares: [string, string][]): EstadoModulo[] => pares.map(([clave, texto]) => ({ clave, texto }));

/**
 * Vocabulario propio de cada sector: estados, etiquetas y textos de ayuda por módulo.
 * Se aplica encima del comportamiento (preset) del módulo, sin cambiar sus acciones.
 */
const VOCABULARIO: Record<string, Partial<ConfigModulo>> = {
  // Servicios, belleza y bienestar
  catalogo_servicios: {
    estados: est(["pendiente", "Activo"], ["en_proceso", "En promoción"], ["hecho", "Pausado"]),
    cerrados: ["pendiente", "en_proceso", "hecho"],
    placeholderTitulo: "Servicio (ej. corte, manicure, consulta)",
    placeholderDetalle: "Duración, qué incluye y personal que lo presta",
    etiquetaContacto: "Profesional asignado",
    etiquetaMonto: "Precio (COP)",
    etiquetaFecha: "Vigente hasta",
    resumen: "En promoción",
  },
  paquetes: {
    estados: est(["pendiente", "Vigente"], ["en_proceso", "En uso"], ["hecho", "Agotado"]),
    cerrados: ["hecho"],
    placeholderTitulo: "Paquete o bono (ej. 5 sesiones)",
    placeholderDetalle: "Sesiones incluidas, usadas y condiciones",
    etiquetaContacto: "Cliente titular",
    etiquetaMonto: "Valor del paquete (COP)",
    etiquetaFecha: "Vence el",
    resumen: "Paquetes activos",
  },
  historial: {
    placeholderTitulo: "Trabajo o atención realizada",
    placeholderDetalle: "Fórmulas, alergias, preferencias y resultado",
    etiquetaContacto: "Cliente",
    etiquetaMonto: "Valor cobrado (COP)",
    etiquetaFecha: "Fecha de la atención",
    resumen: "En seguimiento",
  },
  // Hospedaje
  habitaciones: {
    estados: est(["pendiente", "Disponible"], ["en_proceso", "Ocupada"], ["hecho", "Mantenimiento"]),
    cerrados: ["pendiente"],
    placeholderTitulo: "Habitación o espacio (ej. Hab. 203)",
    placeholderDetalle: "Camas, capacidad, servicios y estado",
    etiquetaContacto: "Huésped actual",
    etiquetaMonto: "Tarifa por noche (COP)",
    etiquetaFecha: "Libre desde",
    resumen: "Ocupadas o en mantenimiento",
  },
  servicios_extra: {
    placeholderTitulo: "Cargo adicional (desayuno, tour, lavandería)",
    placeholderDetalle: "Habitación, cantidad y observaciones",
    etiquetaContacto: "Huésped",
    etiquetaMonto: "Valor del cargo (COP)",
    etiquetaFecha: "Fecha del servicio",
    resumen: "Cargos por facturar",
  },
  // Gimnasio
  control_acceso: {
    estados: est(["pendiente", "Dentro"], ["hecho", "Salió"]),
    cerrados: ["hecho"],
    placeholderTitulo: "Socio que ingresa",
    placeholderDetalle: "Clase o zona, observaciones",
    etiquetaContacto: "Entrenador",
    etiquetaMonto: "Valor (COP)",
    etiquetaFecha: "Fecha de ingreso",
    resumen: "Dentro ahora",
  },
  planes_entreno: {
    estados: est(["pendiente", "Nueva"], ["en_proceso", "En curso"], ["hecho", "Cumplida"]),
    cerrados: ["hecho"],
    placeholderTitulo: "Rutina o plan (ej. hipertrofia 4 días)",
    placeholderDetalle: "Ejercicios, medidas y avances del socio",
    etiquetaContacto: "Socio",
    etiquetaMonto: "Valor del plan (COP)",
    etiquetaFecha: "Próxima revisión",
    resumen: "Rutinas en curso",
  },
  // Agro
  animales: {
    estados: est(["pendiente", "Sano"], ["en_proceso", "En tratamiento"], ["hecho", "Vendido o baja"]),
    cerrados: ["hecho"],
    placeholderTitulo: "Animal o lote (arete, nombre, especie)",
    placeholderDetalle: "Vacunas, peso, tratamientos y observaciones",
    etiquetaContacto: "Potrero o responsable",
    etiquetaMonto: "Valor estimado (COP)",
    etiquetaFecha: "Próxima vacuna o control",
    resumen: "En tratamiento",
  },
  cultivos: {
    estados: est(["pendiente", "Preparación"], ["en_proceso", "En crecimiento"], ["hecho", "Cosechado"]),
    cerrados: ["hecho"],
    placeholderTitulo: "Cultivo y lote (ej. tomate · Lote 2)",
    placeholderDetalle: "Área, variedad, riegos, fumigaciones y novedades",
    etiquetaContacto: "Encargado del lote",
    etiquetaMonto: "Inversión (COP)",
    etiquetaFecha: "Cosecha estimada",
    resumen: "Lotes en producción",
  },
  cosechas: {
    placeholderTitulo: "Cosecha (producto, lote y cantidad)",
    placeholderDetalle: "Kilos o unidades, calidad y destino",
    etiquetaContacto: "Comprador",
    etiquetaMonto: "Valor de venta (COP)",
    etiquetaFecha: "Fecha de cosecha",
    resumen: "Por vender",
  },
  // Transporte
  flota: {
    estados: est(["pendiente", "Disponible"], ["en_proceso", "En ruta"], ["hecho", "En mantenimiento"]),
    cerrados: ["pendiente"],
    placeholderTitulo: "Vehículo (placa y tipo)",
    placeholderDetalle: "Capacidad, kilometraje, documentos y novedades",
    etiquetaContacto: "Conductor asignado",
    etiquetaMonto: "Costo del último mantenimiento (COP)",
    etiquetaFecha: "Próximo mantenimiento",
    resumen: "En ruta o taller",
    exigeFecha: false,
  },
  viajes: {
    estados: est(["pendiente", "Programado"], ["en_proceso", "En ruta"], ["hecho", "Entregado"]),
    cerrados: ["hecho"],
    placeholderTitulo: "Ruta: origen → destino y carga",
    placeholderDetalle: "Vehículo, conductor, peso, guía, combustible y peajes del viaje, novedades de la entrega",
    etiquetaContacto: "Cliente o remitente",
    etiquetaMonto: "Flete (COP)",
    etiquetaFecha: "Fecha de salida",
    resumen: "Despachos en curso",
  },
  // Lavandería
  ordenes_lavado: {
    estados: est(["pendiente", "Recibido"], ["en_proceso", "En proceso"], ["hecho", "Entregado"]),
    cerrados: ["hecho"],
    placeholderTitulo: "Orden (prendas o vehículo y servicio)",
    placeholderDetalle: "Cantidad, manchas o daños previos, control de calidad",
    etiquetaContacto: "Cliente",
    etiquetaMonto: "Valor del servicio (COP)",
    etiquetaFecha: "Fecha de entrega",
    resumen: "Por entregar",
  },
  tarifas_lavado: {
    estados: est(["pendiente", "Vigente"], ["hecho", "Descontinuada"]),
    cerrados: ["pendiente", "hecho"],
    placeholderTitulo: "Servicio (ej. camisa, edredón, lavado completo)",
    placeholderDetalle: "Unidad de cobro (prenda, kilo, vehículo) y tiempo",
    etiquetaContacto: "Categoría",
    etiquetaMonto: "Precio por unidad (COP)",
    etiquetaFecha: "Vigente desde",
    resumen: "Tarifas vigentes",
  },
  // Taller
  ordenes_servicio: {
    estados: est(["pendiente", "Recibido"], ["en_proceso", "En reparación"], ["hecho", "Entregado"]),
    cerrados: ["hecho"],
    placeholderTitulo: "Placa y falla reportada",
    placeholderDetalle: "Diagnóstico, trabajos, repuestos usados y mecánico",
    etiquetaContacto: "Dueño del vehículo",
    etiquetaMonto: "Total de la orden (COP)",
    etiquetaFecha: "Entrega prometida",
    resumen: "Vehículos en taller",
  },
  // Eventos
  paquetes_evento: {
    estados: est(["pendiente", "Vigente"], ["hecho", "Retirado"]),
    cerrados: ["pendiente", "hecho"],
    placeholderTitulo: "Paquete (ej. boda completa, 15 años)",
    placeholderDetalle: "Qué incluye, horas, invitados y extras",
    etiquetaContacto: "Proveedor aliado",
    etiquetaMonto: "Precio del paquete (COP)",
    etiquetaFecha: "Vigente hasta",
    resumen: "Paquetes vigentes",
  },
  eventos_reg: {
    placeholderTitulo: "Evento (cliente y tipo de celebración)",
    placeholderDetalle: "Lugar, invitados, proveedores y programación",
    etiquetaMonto: "Valor del contrato (COP)",
    etiquetaFecha: "Fecha del evento",
    resumen: "Eventos por realizar",
  },
  // Profesionales
  casos: {
    estados: est(["pendiente", "Abierto"], ["en_proceso", "En trámite"], ["hecho", "Cerrado"]),
    cerrados: ["hecho"],
    placeholderTitulo: "Caso o expediente (cliente y asunto)",
    placeholderDetalle: "Actuaciones, documentos, horas y responsable",
    etiquetaContacto: "Cliente",
    etiquetaMonto: "Honorarios pactados (COP)",
    etiquetaFecha: "Próxima actuación",
    resumen: "Casos abiertos",
  },
  documentos_prof: {
    placeholderTitulo: "Documento (contrato, poder, declaración)",
    placeholderDetalle: "Cliente, ubicación del archivo y vigencia",
    etiquetaContacto: "Cliente",
    etiquetaMonto: "Valor asociado (COP)",
    etiquetaFecha: "Vence o se revisa el",
    resumen: "Por revisar",
  },
  // Tecnología
  horas: {
    estados: est(["pendiente", "Registradas"], ["en_proceso", "Por facturar"], ["hecho", "Facturadas"]),
    cerrados: ["hecho"],
    placeholderTitulo: "Tarea y horas dedicadas",
    placeholderDetalle: "Proyecto, responsable y detalle del trabajo",
    etiquetaContacto: "Cliente",
    etiquetaMonto: "Valor de las horas (COP)",
    etiquetaFecha: "Fecha del trabajo",
    resumen: "Horas por facturar",
  },
  // Salud
  tratamientos: {
    estados: est(["pendiente", "Presupuestado"], ["en_proceso", "En tratamiento"], ["hecho", "Finalizado"]),
    cerrados: ["hecho"],
    placeholderTitulo: "Tratamiento o procedimiento",
    placeholderDetalle: "Sesiones, avance y valor acordado con el paciente",
    etiquetaContacto: "Paciente",
    etiquetaMonto: "Valor del tratamiento (COP)",
    etiquetaFecha: "Próxima sesión",
    resumen: "En tratamiento",
  },
  historia_clinica: {
    estados: est(["pendiente", "Abierta"], ["en_proceso", "En seguimiento"], ["hecho", "Cerrada"]),
    cerrados: ["hecho"],
    placeholderTitulo: "Paciente y motivo de la consulta",
    placeholderDetalle: "Antecedentes, diagnóstico, procedimiento, formulación y evolución",
    etiquetaContacto: "Profesional que atendió",
    etiquetaMonto: "Valor de la consulta (COP)",
    etiquetaFecha: "Próximo control",
    resumen: "Historias en seguimiento",
  },
  consultorios: {
    estados: est(["pendiente", "Disponible"], ["en_proceso", "En consulta"], ["hecho", "Fuera de servicio"]),
    cerrados: ["pendiente"],
    placeholderTitulo: "Consultorio o profesional (ej. Consultorio 2 · Dra. Pérez)",
    placeholderDetalle: "Especialidad, horario de atención y equipos",
    etiquetaContacto: "Profesional responsable",
    etiquetaMonto: "Valor de la consulta (COP)",
    etiquetaFecha: "Disponible desde",
    resumen: "En consulta o sin servicio",
  },
  consentimientos: {
    estados: est(["pendiente", "Por firmar"], ["hecho", "Firmado"], ["vencido", "Vencido"]),
    cerrados: ["hecho"],
    placeholderTitulo: "Paciente y procedimiento autorizado",
    placeholderDetalle: "Tipo de consentimiento, versión del documento y quién lo firmó",
    etiquetaContacto: "Paciente o acudiente",
    etiquetaMonto: "Valor asociado (COP)",
    etiquetaFecha: "Vigente hasta",
    resumen: "Por firmar",
  },
  // Farmacia
  vencimientos_farm: {
    estados: est(["pendiente", "Vigente"], ["por_vencer", "Por vencer"], ["vencido", "Vencido"], ["hecho", "Retirado o devuelto"]),
    cerrados: ["hecho"],
    placeholderTitulo: "Medicamento y número de lote",
    placeholderDetalle: "Principio activo, presentación, cantidad del lote y proveedor",
    etiquetaContacto: "Proveedor",
    etiquetaMonto: "Costo del lote (COP)",
    etiquetaFecha: "Fecha de vencimiento del lote",
    resumen: "Lotes por rotar",
  },
  inventario_farm: {
    placeholderTitulo: "Medicamento o producto (nombre y presentación)",
    placeholderDetalle: "Cantidad, lote, ubicación y principio activo",
    etiquetaContacto: "Laboratorio o proveedor",
    etiquetaMonto: "Precio de venta (COP)",
    etiquetaFecha: "Último ingreso",
    resumen: "A reponer",
  },
  // Educación
  cursos: {
    estados: est(["pendiente", "Abierto a inscripción"], ["en_proceso", "En curso"], ["hecho", "Finalizado"]),
    cerrados: ["hecho"],
    placeholderTitulo: "Curso o grupo (nombre y horario)",
    placeholderDetalle: "Docente, cupos, inscritos y salón",
    etiquetaContacto: "Docente",
    etiquetaMonto: "Valor del curso (COP)",
    etiquetaFecha: "Fecha de inicio",
    resumen: "Cursos activos",
  },
  asistencia: {
    estados: est(["pendiente", "Presente"], ["en_proceso", "Tarde o excusa"], ["hecho", "Ausente"]),
    cerrados: ["pendiente", "en_proceso", "hecho"],
    placeholderTitulo: "Estudiante y curso",
    placeholderDetalle: "Nota, evaluación u observación del docente",
    etiquetaContacto: "Docente",
    etiquetaMonto: "Nota o valor",
    etiquetaFecha: "Fecha de la clase",
    resumen: "Novedades",
  },
  // Construcción y tienda
  materiales: {
    placeholderTitulo: "Material o herramienta",
    placeholderDetalle: "Cantidad, obra donde se usa y ubicación",
    etiquetaContacto: "Proveedor",
    etiquetaMonto: "Costo unitario (COP)",
    etiquetaFecha: "Último ingreso",
  },
  proyectos_obra: {
    estados: est(["pendiente", "Por iniciar"], ["en_proceso", "En obra"], ["hecho", "Entregada"]),
    cerrados: ["hecho"],
    placeholderTitulo: "Obra (nombre y dirección)",
    placeholderDetalle: "Avance por etapa, maestro, materiales y novedades",
    etiquetaContacto: "Cliente o propietario",
    etiquetaMonto: "Presupuesto de la obra (COP)",
    etiquetaFecha: "Entrega estimada",
    resumen: "Obras en curso",
  },
  // Servicios con cita
  ordenes_serv_cita: {
    estados: est(["pendiente", "Reservada"], ["en_proceso", "En atención"], ["hecho", "Finalizada"]),
    cerrados: ["hecho"],
    placeholderTitulo: "Servicio y cliente",
    placeholderDetalle: "Profesional asignado, recurso usado y notas del servicio",
    etiquetaContacto: "Cliente",
    etiquetaMonto: "Valor del servicio (COP)",
    etiquetaFecha: "Fecha del servicio",
    resumen: "Servicios por atender",
  },
};

/** Módulos del catálogo que tenían la configuración genérica y ahora tienen un comportamiento acorde. */
const COMPORTAMIENTO_EXTRA: Record<string, keyof typeof PRESETS> = {
  flota: "vencimiento",
  cursos: "proyecto",
  paquetes: "socio",
  planes_entreno: "proyecto",
  animales: "vencimiento",
  horas: "pago",
  paquetes_evento: "venta",
  ordenes_serv_cita: "proyecto",
};

export function configModulo(id: string): ConfigModulo {
  const preset = POR_MODULO[id] ?? COMPORTAMIENTO_EXTRA[id];
  const principal: ConfigModulo = preset ? { ...base, ...PRESETS[preset], tipo: preset } : base;
  const vocab = VOCABULARIO[id];
  return vocab ? { ...principal, ...vocab, tipo: principal.tipo } : principal;
}
