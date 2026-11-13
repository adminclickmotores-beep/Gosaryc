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
};

const base: ConfigModulo = {
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
  insumos_salud: "stock", insumos_agro: "stock", productos_vet: "stock", habitaciones: "stock",
  vehiculos: "stock", vehiculos_usados: "stock", combos: "stock", catalogo: "stock", catalogo_servicios: "stock",
  catalogo_whatsapp: "stock", servicios_extra: "stock",
  proyectos_obra: "proyecto", proyectos_tec: "proyecto", tickets: "proyecto", viajes: "proyecto",
  taller: "proyecto", alistamiento: "proyecto", limpieza: "proyecto", cultivos: "proyecto", cursos: "proyecto",
  tratamientos: "proyecto", cosechas: "proyecto", flota: "proyecto",
  cotizaciones_veh: "venta", cotizaciones_obra: "venta", ventas_veh: "venta", seguimiento_leads: "venta",
  permutas: "venta", creditos_veh: "venta", suscripciones: "venta", suscripciones_tec: "venta",
  pagos_digitales: "pago", facturas: "pago", propinas: "pago", comisiones: "pago", repartidores: "pago",
  conductores: "pago", combustible: "pago", costos_veh: "pago", equipo_turnos: "pago", caja_diaria: "pago",
  proveedores: "pago", proveedores_veh: "pago",
  socios: "socio", pacientes: "paciente", historia_clinica: "paciente", estudiantes: "estudiante",
  huespedes: "huesped", mascotas_reg: "mascota", inmuebles: "inmueble",
};

export function configModulo(id: string): ConfigModulo {
  const preset = POR_MODULO[id];
  return preset ? { ...base, ...PRESETS[preset] } : base;
}
