/** Preguntas del CRM adaptadas a cada tipo de negocio. Se guardan en datos_extra.sector_datos. */
export type CampoCrm = {
  id: string;
  etiqueta: string;
  tipo: "texto" | "numero" | "opciones" | "fecha" | "area";
  opciones?: string[];
  ayuda?: string;
};

export type PerfilCrm = {
  /** Título del bloque de datos propios del sector. */
  titulo: string;
  /** Nombre de «Interés» en este sector. */
  interes: string;
  interesAyuda: string;
  valor: string;
  capacidad: string;
  accionAyuda: string;
  campos: CampoCrm[];
};

const t = (id: string, etiqueta: string, ayuda?: string): CampoCrm => ({ id, etiqueta, tipo: "texto", ayuda });
const n = (id: string, etiqueta: string, ayuda?: string): CampoCrm => ({ id, etiqueta, tipo: "numero", ayuda });
const o = (id: string, etiqueta: string, opciones: string[]): CampoCrm => ({ id, etiqueta, tipo: "opciones", opciones });
const f = (id: string, etiqueta: string): CampoCrm => ({ id, etiqueta, tipo: "fecha" });
const a = (id: string, etiqueta: string, ayuda?: string): CampoCrm => ({ id, etiqueta, tipo: "area", ayuda });

const GENERAL: PerfilCrm = {
  titulo: "Datos del prospecto",
  interes: "Interés",
  interesAyuda: "¿Qué producto o servicio busca?",
  valor: "Valor estimado (COP)",
  capacidad: "Capacidad de pago / presupuesto",
  accionAyuda: "Ej. llamar, enviar cotización",
  campos: [],
};

const PERFILES: Record<string, PerfilCrm> = {
  concesionario: {
    titulo: "Datos de compra del vehículo",
    interes: "Vehículo de interés",
    interesAyuda: "Marca, modelo y año que busca",
    valor: "Presupuesto del vehículo (COP)",
    capacidad: "Cuota inicial disponible",
    accionAyuda: "Ej. agendar test-drive",
    campos: [
      o("condicion", "¿Nuevo o usado?", ["Nuevo", "Usado", "Indiferente"]),
      o("tipo_vehiculo", "Tipo de vehículo", ["Automóvil", "SUV / Camioneta", "Pick-up", "Moto", "Van / Carga"]),
      o("forma_pago", "Forma de pago", ["Contado", "Crédito bancario", "Crédito directo", "Leasing"]),
      o("tiene_retoma", "¿Entrega vehículo en retoma?", ["Sí", "No"]),
      t("vehiculo_retoma", "Vehículo en retoma (marca, modelo, año, km)"),
      o("uso", "Uso principal", ["Familiar", "Trabajo", "Taxi / plataforma", "Carga", "Recreación"]),
      o("reportado", "¿Está reportado en centrales de riesgo?", ["No", "Sí", "No sabe"]),
    ],
  },
  taller: {
    titulo: "Datos del vehículo y la falla",
    interes: "Servicio requerido",
    interesAyuda: "Ej. frenos, mantenimiento 50.000 km",
    valor: "Valor estimado del servicio (COP)",
    capacidad: "Presupuesto máximo",
    accionAyuda: "Ej. llamar con el diagnóstico",
    campos: [
      t("placa", "Placa"),
      t("vehiculo", "Marca, modelo y año"),
      n("kilometraje", "Kilometraje actual"),
      a("falla", "Falla o síntoma que presenta"),
      o("aseguradora", "¿Es por seguro?", ["No", "Sí"]),
      f("fecha_soat", "Vencimiento del SOAT"),
      f("fecha_tecno", "Vencimiento de la tecnomecánica"),
    ],
  },
  taller_motos: {
    titulo: "Datos de la moto y la falla",
    interes: "Servicio requerido",
    interesAyuda: "Ej. sincronización, cambio de kit de arrastre",
    valor: "Valor estimado del servicio (COP)",
    capacidad: "Presupuesto máximo",
    accionAyuda: "Ej. llamar con el diagnóstico",
    campos: [t("placa", "Placa"), t("moto", "Marca, modelo y cilindraje"), n("kilometraje", "Kilometraje actual"), a("falla", "Falla o síntoma")],
  },
  alquiler_vehiculos: {
    titulo: "Datos del alquiler",
    interes: "Vehículo que necesita",
    interesAyuda: "Tipo de vehículo o referencia",
    valor: "Valor estimado del alquiler (COP)",
    capacidad: "Presupuesto",
    accionAyuda: "Ej. enviar cotización de alquiler",
    campos: [
      f("fecha_inicio", "Fecha de recogida"),
      f("fecha_fin", "Fecha de devolución"),
      n("pasajeros", "Número de pasajeros"),
      o("licencia", "¿Tiene licencia vigente?", ["Sí", "No"]),
      t("destino", "Destino o ciudad de uso"),
      o("conductor", "¿Requiere conductor?", ["No", "Sí"]),
    ],
  },
  inmobiliaria: {
    titulo: "Datos de búsqueda del inmueble",
    interes: "Inmueble de interés",
    interesAyuda: "Tipo de inmueble y sector",
    valor: "Presupuesto máximo (COP)",
    capacidad: "Cuota inicial / subsidio",
    accionAyuda: "Ej. coordinar visita",
    campos: [
      o("operacion", "Operación", ["Comprar", "Arrendar", "Vender su inmueble", "Invertir"]),
      o("tipo_inmueble", "Tipo de inmueble", ["Apartamento", "Casa", "Lote", "Local comercial", "Oficina", "Bodega"]),
      t("zona", "Zona o barrio preferido"),
      n("habitaciones", "Habitaciones mínimas"),
      n("area", "Área mínima (m²)"),
      o("financiacion", "Financiación", ["Recursos propios", "Crédito hipotecario", "Leasing habitacional", "Subsidio de vivienda"]),
      f("fecha_mudanza", "¿Para cuándo lo necesita?"),
    ],
  },
  construccion: {
    titulo: "Datos de la obra o proyecto",
    interes: "Proyecto o servicio",
    interesAyuda: "Ej. remodelación de cocina, casa de dos pisos",
    valor: "Presupuesto de la obra (COP)",
    capacidad: "Forma de financiación",
    accionAyuda: "Ej. visita técnica a la obra",
    campos: [
      o("tipo_obra", "Tipo de obra", ["Obra nueva", "Remodelación", "Ampliación", "Acabados", "Obra civil / infraestructura"]),
      t("direccion_obra", "Dirección o ciudad de la obra"),
      n("area", "Área aproximada (m²)"),
      o("licencia", "¿Cuenta con licencia / planos?", ["Sí", "No", "En trámite"]),
      f("fecha_inicio", "Fecha deseada de inicio"),
    ],
  },
  salud: {
    titulo: "Datos del paciente",
    interes: "Motivo de consulta o servicio",
    interesAyuda: "Ej. valoración, control, procedimiento",
    valor: "Valor estimado del tratamiento (COP)",
    capacidad: "Presupuesto",
    accionAyuda: "Ej. confirmar cita",
    campos: [
      f("fecha_nacimiento", "Fecha de nacimiento"),
      o("tipo_pago", "Tipo de pago", ["Particular", "EPS", "Medicina prepagada", "Póliza"]),
      t("eps", "EPS o aseguradora"),
      t("especialidad", "Especialidad que necesita"),
      o("primera_vez", "¿Primera vez?", ["Sí", "No"]),
      a("alergias", "Alergias o condiciones a tener en cuenta"),
    ],
  },
  belleza: {
    titulo: "Datos del servicio de belleza",
    interes: "Servicio que desea",
    interesAyuda: "Ej. corte, color, uñas, tratamiento facial",
    valor: "Valor estimado del servicio (COP)",
    capacidad: "Presupuesto",
    accionAyuda: "Ej. recordar cita",
    campos: [
      t("profesional", "Profesional preferido"),
      o("horario", "Horario preferido", ["Mañana", "Tarde", "Noche", "Fin de semana"]),
      a("alergias", "Alergias o sensibilidad a productos"),
      o("ocasion", "¿Es para una ocasión especial?", ["No", "Boda", "Grado", "Fiesta", "Otra"]),
      o("primera_vez", "¿Primera visita?", ["Sí", "No"]),
    ],
  },
  mascotas: {
    titulo: "Datos de la mascota",
    interes: "Servicio que necesita",
    interesAyuda: "Ej. vacunación, baño, consulta",
    valor: "Valor estimado (COP)",
    capacidad: "Presupuesto",
    accionAyuda: "Ej. recordar vacuna",
    campos: [
      t("mascota", "Nombre de la mascota"),
      o("especie", "Especie", ["Perro", "Gato", "Ave", "Roedor", "Otra"]),
      t("raza", "Raza"),
      n("edad", "Edad (años)"),
      n("peso", "Peso (kg)"),
      o("vacunas", "¿Vacunas al día?", ["Sí", "No", "No sabe"]),
      a("sintomas", "Síntomas o motivo"),
    ],
  },
  gimnasio: {
    titulo: "Datos del deportista",
    interes: "Plan o servicio de interés",
    interesAyuda: "Ej. plan mensual, entrenamiento personalizado",
    valor: "Valor del plan (COP)",
    capacidad: "Presupuesto mensual",
    accionAyuda: "Ej. invitar a clase de prueba",
    campos: [
      o("objetivo", "Objetivo", ["Bajar de peso", "Ganar masa muscular", "Salud / movilidad", "Rendimiento deportivo", "Rehabilitación"]),
      o("experiencia", "Experiencia", ["Principiante", "Intermedio", "Avanzado"]),
      o("horario", "Horario preferido", ["Madrugada", "Mañana", "Mediodía", "Tarde", "Noche"]),
      o("lesiones", "¿Tiene lesiones o restricciones?", ["No", "Sí"]),
      o("clase_prueba", "¿Quiere clase de prueba?", ["Sí", "No"]),
    ],
  },
  educacion: {
    titulo: "Datos del estudiante",
    interes: "Programa o curso de interés",
    interesAyuda: "Ej. inglés, bachillerato, curso técnico",
    valor: "Valor de matrícula y pensión (COP)",
    capacidad: "Forma de pago",
    accionAyuda: "Ej. agendar visita a la institución",
    campos: [
      t("estudiante", "Nombre del estudiante"),
      n("edad", "Edad del estudiante"),
      t("grado", "Grado o nivel actual"),
      t("acudiente", "Nombre del acudiente"),
      t("colegio_actual", "Institución de procedencia"),
      o("jornada", "Jornada", ["Mañana", "Tarde", "Noche", "Sábados", "Virtual"]),
    ],
  },
  hospedaje: {
    titulo: "Datos de la reserva",
    interes: "Tipo de habitación o plan",
    interesAyuda: "Ej. habitación doble, plan romántico",
    valor: "Valor estimado de la estadía (COP)",
    capacidad: "Presupuesto",
    accionAyuda: "Ej. confirmar reserva con anticipo",
    campos: [
      f("llegada", "Fecha de llegada"),
      f("salida", "Fecha de salida"),
      n("adultos", "Adultos"),
      n("ninos", "Niños"),
      o("motivo", "Motivo del viaje", ["Turismo", "Trabajo", "Evento", "Pareja", "Familiar"]),
      o("mascota", "¿Viaja con mascota?", ["No", "Sí"]),
    ],
  },
  eventos: {
    titulo: "Datos del evento",
    interes: "Tipo de evento",
    interesAyuda: "Ej. boda, cumpleaños, evento corporativo",
    valor: "Presupuesto del evento (COP)",
    capacidad: "Anticipo disponible",
    accionAyuda: "Ej. enviar propuesta",
    campos: [
      f("fecha_evento", "Fecha del evento"),
      n("invitados", "Número de invitados"),
      t("lugar", "Lugar o ciudad"),
      o("tipo", "Tipo", ["Boda", "Cumpleaños / quince", "Corporativo", "Grado", "Infantil", "Otro"]),
      o("servicios", "Servicios que necesita", ["Todo incluido", "Solo logística", "Alimentación", "Decoración", "Sonido y animación"]),
    ],
  },
  profesional: {
    titulo: "Datos del caso o asesoría",
    interes: "Asunto o servicio requerido",
    interesAyuda: "Ej. declaración de renta, proceso laboral, contrato",
    valor: "Honorarios estimados (COP)",
    capacidad: "Presupuesto",
    accionAyuda: "Ej. agendar consulta",
    campos: [
      o("tipo_cliente", "Tipo de cliente", ["Persona natural", "Empresa", "Independiente"]),
      t("empresa", "Empresa y NIT (si aplica)"),
      o("urgencia_legal", "¿Hay plazo legal próximo?", ["No", "Sí"]),
      f("fecha_limite", "Fecha límite o audiencia"),
      a("descripcion", "Descripción breve del caso"),
    ],
  },
  servicios: {
    titulo: "Datos del servicio solicitado",
    interes: "Servicio requerido",
    interesAyuda: "Ej. instalación, mantenimiento, reparación",
    valor: "Valor estimado (COP)",
    capacidad: "Presupuesto",
    accionAyuda: "Ej. visita técnica",
    campos: [
      t("direccion", "Dirección del servicio"),
      o("tipo_lugar", "Tipo de lugar", ["Casa", "Apartamento", "Local", "Oficina", "Bodega"]),
      f("fecha_servicio", "Fecha deseada"),
      o("horario", "Horario", ["Mañana", "Tarde", "Cualquiera"]),
      o("recurrente", "¿Servicio recurrente?", ["No", "Semanal", "Quincenal", "Mensual"]),
    ],
  },
  tecnologia: {
    titulo: "Datos del proyecto tecnológico",
    interes: "Solución que necesita",
    interesAyuda: "Ej. sitio web, software a la medida, soporte",
    valor: "Presupuesto del proyecto (COP)",
    capacidad: "Forma de pago",
    accionAyuda: "Ej. demostración del producto",
    campos: [
      t("empresa", "Empresa"),
      o("tamano", "Tamaño de la empresa", ["1-5 personas", "6-20", "21-100", "Más de 100"]),
      t("herramienta_actual", "Herramienta que usa hoy"),
      f("fecha_deseada", "Fecha deseada de entrega"),
      a("requerimientos", "Requerimientos principales"),
    ],
  },
  celulares: {
    titulo: "Datos del equipo",
    interes: "Equipo o servicio",
    interesAyuda: "Ej. pantalla iPhone 12, compra de Samsung",
    valor: "Valor estimado (COP)",
    capacidad: "Presupuesto",
    accionAyuda: "Ej. avisar cuando esté listo",
    campos: [
      t("marca_modelo", "Marca y modelo"),
      t("imei", "IMEI (opcional)"),
      o("necesidad", "Necesidad", ["Reparación", "Compra nuevo", "Compra usado", "Liberación / software", "Accesorios"]),
      a("falla", "Falla que presenta"),
      o("garantia", "¿Pide garantía?", ["Sí", "No"]),
    ],
  },
  transporte: {
    titulo: "Datos del envío o ruta",
    interes: "Servicio de transporte",
    interesAyuda: "Ej. carga completa, mudanza, mensajería",
    valor: "Valor estimado del flete (COP)",
    capacidad: "Presupuesto",
    accionAyuda: "Ej. enviar cotización del flete",
    campos: [
      t("origen", "Ciudad de origen"),
      t("destino", "Ciudad de destino"),
      t("carga", "Tipo de carga"),
      n("peso", "Peso aproximado (kg)"),
      f("fecha_envio", "Fecha de despacho"),
      o("seguro", "¿Requiere seguro de mercancía?", ["Sí", "No"]),
    ],
  },
  ferreteria: {
    titulo: "Datos de la compra",
    interes: "Materiales o productos",
    interesAyuda: "Ej. cemento, tubería, herramientas",
    valor: "Valor estimado del pedido (COP)",
    capacidad: "Cupo de crédito / forma de pago",
    accionAyuda: "Ej. enviar cotización de materiales",
    campos: [
      o("tipo_cliente", "Tipo de cliente", ["Particular", "Maestro de obra", "Constructora", "Empresa"]),
      t("obra", "Obra o proyecto"),
      o("entrega", "Entrega", ["Recoge en tienda", "Domicilio a obra"]),
      f("fecha_entrega", "Fecha requerida"),
      o("credito", "¿Solicita crédito?", ["No", "Sí"]),
    ],
  },
  optica: {
    titulo: "Datos de salud visual",
    interes: "Producto o servicio",
    interesAyuda: "Ej. examen visual, lentes progresivos",
    valor: "Valor estimado (COP)",
    capacidad: "Presupuesto",
    accionAyuda: "Ej. recordar examen visual",
    campos: [
      f("ultimo_examen", "Fecha del último examen visual"),
      o("usa_lentes", "¿Usa lentes actualmente?", ["No", "Sí, gafas", "Sí, lentes de contacto"]),
      o("necesidad", "Necesidad", ["Examen visual", "Montura y lentes", "Lentes de contacto", "Gafas de sol", "Reparación"]),
      o("convenio", "¿Convenio o EPS?", ["Ninguno", "EPS", "Empresa"]),
    ],
  },
  agro: {
    titulo: "Datos de la finca o cultivo",
    interes: "Producto o servicio agro",
    interesAyuda: "Ej. insumos, asesoría, venta de cosecha",
    valor: "Valor estimado (COP)",
    capacidad: "Forma de pago / ciclo de cosecha",
    accionAyuda: "Ej. visita a la finca",
    campos: [
      t("cultivo", "Cultivo o actividad"),
      n("hectareas", "Hectáreas"),
      t("vereda", "Vereda y municipio"),
      o("etapa", "Etapa del cultivo", ["Preparación", "Siembra", "Desarrollo", "Cosecha", "Poscosecha"]),
      o("credito", "¿Necesita crédito agrícola?", ["No", "Sí"]),
    ],
  },
  prestamos: {
    titulo: "Datos de la solicitud de crédito",
    interes: "Tipo de crédito",
    interesAyuda: "Ej. libre inversión, microcrédito",
    valor: "Monto solicitado (COP)",
    capacidad: "Ingresos mensuales",
    accionAyuda: "Ej. solicitar soportes",
    campos: [
      o("destino", "Destino del dinero", ["Capital de trabajo", "Consumo", "Vivienda", "Vehículo", "Deudas"]),
      n("plazo", "Plazo (meses)"),
      o("ocupacion", "Ocupación", ["Empleado", "Independiente", "Comerciante", "Pensionado"]),
      o("garantia", "Garantía", ["Sin garantía", "Codeudor", "Prenda", "Hipoteca"]),
      o("reportado", "¿Reportado en centrales?", ["No", "Sí", "No sabe"]),
    ],
  },
  restaurante: {
    titulo: "Datos del cliente de restaurante",
    interes: "Pedido o reserva",
    interesAyuda: "Ej. reserva para 6 personas, pedido corporativo",
    valor: "Valor estimado (COP)",
    capacidad: "Presupuesto",
    accionAyuda: "Ej. confirmar reserva",
    campos: [
      n("personas", "Número de personas"),
      f("fecha_reserva", "Fecha de la reserva"),
      o("ocasion", "Ocasión", ["Cotidiana", "Cumpleaños", "Corporativo", "Aniversario", "Evento privado"]),
      a("restricciones", "Alergias o restricciones alimentarias"),
    ],
  },
  textil: {
    titulo: "Datos del encargo de confección",
    interes: "Prenda o producto",
    interesAyuda: "Ej. uniformes, vestido a la medida",
    valor: "Valor estimado (COP)",
    capacidad: "Anticipo",
    accionAyuda: "Ej. agendar toma de medidas",
    campos: [n("cantidad", "Cantidad de prendas"), t("tela", "Tela o color"), t("tallas", "Tallas o medidas"), f("fecha_entrega", "Fecha de entrega deseada")],
  },
  floristeria: {
    titulo: "Datos del arreglo floral",
    interes: "Arreglo o evento",
    interesAyuda: "Ej. ramo de rosas, decoración de boda",
    valor: "Presupuesto (COP)",
    capacidad: "Anticipo",
    accionAyuda: "Ej. confirmar diseño",
    campos: [
      o("ocasion", "Ocasión", ["Cumpleaños", "Aniversario", "Condolencias", "Boda", "Corporativo", "Otra"]),
      f("fecha_entrega", "Fecha de entrega"),
      t("direccion_entrega", "Dirección de entrega"),
      t("mensaje", "Mensaje para la tarjeta"),
    ],
  },
  guarderia: {
    titulo: "Datos del niño y la familia",
    interes: "Servicio de cuidado",
    interesAyuda: "Ej. jornada completa, medio tiempo",
    valor: "Mensualidad estimada (COP)",
    capacidad: "Presupuesto",
    accionAyuda: "Ej. agendar visita a las instalaciones",
    campos: [t("nino", "Nombre del niño"), n("edad_meses", "Edad (meses)"), t("acudiente", "Nombre del acudiente"), o("jornada", "Jornada", ["Mañana", "Tarde", "Completa"]), a("salud", "Alergias o cuidados especiales")],
  },
  seguridad_aseo: {
    titulo: "Datos del contrato de servicio",
    interes: "Servicio requerido",
    interesAyuda: "Ej. vigilancia 24 h, aseo de oficinas",
    valor: "Valor mensual estimado (COP)",
    capacidad: "Presupuesto mensual",
    accionAyuda: "Ej. visita de evaluación del sitio",
    campos: [t("sitio", "Dirección del sitio"), n("puestos", "Número de puestos o personas"), o("horario", "Horario", ["8 horas", "12 horas", "24 horas", "Fines de semana"]), o("tipo_sitio", "Tipo de sitio", ["Conjunto residencial", "Empresa", "Bodega", "Local"])],
  },
  condominio: {
    titulo: "Datos del inmueble o copropiedad",
    interes: "Servicio requerido",
    interesAyuda: "Ej. administración, mantenimiento",
    valor: "Valor estimado (COP)",
    capacidad: "Presupuesto",
    accionAyuda: "Ej. visita a la copropiedad",
    campos: [t("copropiedad", "Nombre de la copropiedad"), n("unidades", "Número de unidades"), t("cargo", "Cargo del contacto")],
  },
  compraventa: {
    titulo: "Datos del artículo",
    interes: "Artículo de interés",
    interesAyuda: "Ej. oro 18k, electrodoméstico, herramienta",
    valor: "Valor estimado (COP)",
    capacidad: "Monto que necesita",
    accionAyuda: "Ej. avalúo del artículo",
    campos: [o("operacion", "Operación", ["Empeño", "Venta", "Compra", "Retiro"]), t("articulo", "Descripción del artículo"), o("estado", "Estado", ["Nuevo", "Muy bueno", "Usado", "Con daños"])],
  },
  distribuidora: {
    titulo: "Datos del cliente mayorista",
    interes: "Productos que necesita",
    interesAyuda: "Ej. línea de aseo, bebidas",
    valor: "Valor estimado del pedido (COP)",
    capacidad: "Cupo de crédito",
    accionAyuda: "Ej. visita del vendedor",
    campos: [o("tipo_cliente", "Tipo de negocio", ["Tienda de barrio", "Supermercado", "Restaurante", "Institución", "Otro"]), t("ruta", "Barrio o ruta"), o("frecuencia", "Frecuencia de pedido", ["Semanal", "Quincenal", "Mensual", "Ocasional"]), o("credito", "¿Solicita crédito?", ["No", "Sí"])],
  },
  ganaderia: {
    titulo: "Datos de la finca ganadera",
    interes: "Producto o servicio",
    interesAyuda: "Ej. compra de ganado, insumos, asesoría",
    valor: "Valor estimado (COP)",
    capacidad: "Forma de pago",
    accionAyuda: "Ej. visita a la finca",
    campos: [t("finca", "Finca y municipio"), n("cabezas", "Número de cabezas"), o("tipo", "Tipo de ganado", ["Bovino carne", "Bovino leche", "Porcino", "Equino", "Otro"])],
  },
  fundacion: {
    titulo: "Datos del donante o aliado",
    interes: "Causa o programa de interés",
    interesAyuda: "Ej. donación mensual, voluntariado",
    valor: "Aporte estimado (COP)",
    capacidad: "Frecuencia del aporte",
    accionAyuda: "Ej. enviar certificado de donación",
    campos: [o("tipo", "Tipo de aporte", ["Donación en dinero", "Donación en especie", "Voluntariado", "Alianza empresarial"]), o("certificado", "¿Requiere certificado de donación?", ["Sí", "No"])],
  },
  iglesia: {
    titulo: "Datos del visitante o miembro",
    interes: "Interés o necesidad",
    interesAyuda: "Ej. grupo de oración, consejería",
    valor: "Aporte estimado (COP)",
    capacidad: "Observaciones",
    accionAyuda: "Ej. llamar para visita pastoral",
    campos: [o("situacion", "Situación", ["Visitante", "Nuevo miembro", "Miembro activo"]), t("grupo", "Grupo de interés"), t("barrio", "Barrio de residencia")],
  },
  parqueadero: {
    titulo: "Datos del abonado",
    interes: "Tipo de parqueo",
    interesAyuda: "Ej. mensualidad carro, moto",
    valor: "Mensualidad estimada (COP)",
    capacidad: "Presupuesto",
    accionAyuda: "Ej. confirmar cupo",
    campos: [t("placa", "Placa del vehículo"), o("tipo", "Tipo de vehículo", ["Carro", "Moto", "Camioneta", "Bicicleta"]), o("plan", "Plan", ["Mensual diurno", "Mensual 24 h", "Nocturno", "Por horas"])],
  },
  lavanderia: {
    titulo: "Datos del servicio de lavandería",
    interes: "Servicio",
    interesAyuda: "Ej. lavado de edredones, servicio empresarial",
    valor: "Valor estimado (COP)",
    capacidad: "Presupuesto",
    accionAyuda: "Ej. coordinar recogida",
    campos: [o("tipo", "Tipo de servicio", ["Ropa por kilo", "Prendas especiales", "Edredones", "Empresarial / hotel"]), o("recogida", "¿Requiere recogida a domicilio?", ["Sí", "No"]), o("frecuencia", "Frecuencia", ["Única vez", "Semanal", "Mensual"])],
  },
  papeleria: {
    titulo: "Datos del pedido",
    interes: "Productos o servicio",
    interesAyuda: "Ej. impresión, útiles escolares, empastes",
    valor: "Valor estimado (COP)",
    capacidad: "Presupuesto",
    accionAyuda: "Ej. enviar cotización",
    campos: [o("tipo_cliente", "Tipo de cliente", ["Particular", "Colegio", "Empresa"]), n("cantidad", "Cantidad aproximada"), f("fecha_entrega", "Fecha requerida")],
  },
  joyeria: {
    titulo: "Datos de la pieza",
    interes: "Joya o servicio",
    interesAyuda: "Ej. anillo de compromiso, arreglo de cadena",
    valor: "Presupuesto (COP)",
    capacidad: "Anticipo",
    accionAyuda: "Ej. mostrar catálogo",
    campos: [o("ocasion", "Ocasión", ["Compromiso", "Matrimonio", "Regalo", "Uso personal", "Arreglo"]), o("material", "Material", ["Oro 18k", "Oro 10k", "Plata", "Otro"]), t("talla", "Talla o medida"), f("fecha_necesaria", "Fecha necesaria")],
  },
  moda: {
    titulo: "Datos de la clienta o cliente",
    interes: "Prendas de interés",
    interesAyuda: "Ej. vestidos de fiesta, ropa deportiva",
    valor: "Presupuesto (COP)",
    capacidad: "Medio de pago",
    accionAyuda: "Ej. avisar nueva colección",
    campos: [t("talla", "Talla"), t("estilo", "Estilo preferido"), o("ocasion", "Ocasión", ["Diario", "Trabajo", "Fiesta", "Deporte"])],
  },
  farmacia: {
    titulo: "Datos del cliente de farmacia",
    interes: "Producto o necesidad",
    interesAyuda: "Ej. medicamento de uso continuo",
    valor: "Valor estimado (COP)",
    capacidad: "Medio de pago",
    accionAyuda: "Ej. recordar reposición mensual",
    campos: [o("formula", "¿Tiene fórmula médica?", ["Sí", "No"]), o("recurrente", "¿Uso continuo?", ["No", "Sí"]), o("domicilio", "¿Requiere domicilio?", ["Sí", "No"])],
  },
  licorera: {
    titulo: "Datos del pedido",
    interes: "Productos",
    interesAyuda: "Ej. cajas de cerveza, whisky para evento",
    valor: "Valor estimado (COP)",
    capacidad: "Medio de pago",
    accionAyuda: "Ej. confirmar domicilio",
    campos: [o("mayor_edad", "Cliente mayor de edad verificado", ["Sí", "Pendiente"]), t("evento", "Evento o motivo"), f("fecha_entrega", "Fecha de entrega")],
  },
  carniceria: {
    titulo: "Datos del pedido",
    interes: "Cortes o productos",
    interesAyuda: "Ej. 10 kg de res para asado",
    valor: "Valor estimado (COP)",
    capacidad: "Medio de pago",
    accionAyuda: "Ej. confirmar pedido",
    campos: [t("evento", "Evento o motivo"), n("kilos", "Kilos aproximados"), f("fecha_entrega", "Fecha de entrega"), o("domicilio", "¿Domicilio?", ["Sí", "No"])],
  },
  supermercado: {
    titulo: "Datos del cliente",
    interes: "Productos o pedido",
    interesAyuda: "Ej. mercado mensual, pedido institucional",
    valor: "Valor estimado (COP)",
    capacidad: "Medio de pago",
    accionAyuda: "Ej. enviar lista de precios",
    campos: [o("tipo_cliente", "Tipo de cliente", ["Hogar", "Negocio", "Institución"]), o("domicilio", "¿Domicilio?", ["Sí", "No"]), o("frecuencia", "Frecuencia", ["Semanal", "Quincenal", "Mensual", "Ocasional"])],
  },
  tienda: {
    titulo: "Datos del cliente",
    interes: "Productos de interés",
    interesAyuda: "Ej. producto, referencia o categoría",
    valor: "Valor estimado de la compra (COP)",
    capacidad: "Medio de pago",
    accionAyuda: "Ej. enviar catálogo",
    campos: [o("entrega", "Entrega", ["Recoge en tienda", "Envío a domicilio"]), t("direccion", "Dirección de envío"), o("pago", "Medio de pago", ["Efectivo", "Transferencia", "Tarjeta", "Contra entrega"])],
  },
};

export function perfilCrm(clave: string): PerfilCrm {
  return PERFILES[clave] ?? GENERAL;
}

/** Lee los datos del sector guardados en datos_extra. */
export function datosSectorDe(extra: Record<string, unknown>): Record<string, string> {
  const d = extra.sector_datos;
  if (!d || typeof d !== "object" || Array.isArray(d)) return {};
  const salida: Record<string, string> = {};
  for (const [k, v] of Object.entries(d as Record<string, unknown>)) salida[k] = String(v ?? "");
  return salida;
}

/** Texto corto con los datos más importantes (para tarjetas del tablero). */
export function resumenSector(perfil: PerfilCrm, datos: Record<string, string>, max = 2): string {
  return perfil.campos
    .filter((c) => (datos[c.id] ?? "").trim() !== "")
    .slice(0, max)
    .map((c) => `${c.etiqueta.replace(/[¿?]/g, "")}: ${datos[c.id]}`)
    .join(" · ");
}
