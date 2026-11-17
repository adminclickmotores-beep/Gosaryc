import type { CampoExtra } from "@/lib/modulos-config";

/**
 * Formularios propios de los módulos transversales de cada tipo de negocio:
 * clientes, pagos, personal, quejas y reseñas, metas y caja.
 * Cada negocio captura los datos que realmente usa (placa en el taller, talla en la tienda de moda,
 * honorarios en el despacho, ruta de cobro en préstamos, etc.) en vez de un formulario general.
 */

const t = (clave: string, etiqueta: string, placeholder?: string): CampoExtra => ({ clave, etiqueta, tipo: "text", placeholder });
const tel = (clave: string, etiqueta: string): CampoExtra => ({ clave, etiqueta, tipo: "tel" });
const em = (clave: string, etiqueta: string): CampoExtra => ({ clave, etiqueta, tipo: "email" });
const d = (clave: string, etiqueta: string): CampoExtra => ({ clave, etiqueta, tipo: "date" });
const sel = (clave: string, etiqueta: string, opciones: string[]): CampoExtra => ({ clave, etiqueta, tipo: "select", opciones });

const MEDIOS = ["Nequi", "Daviplata", "Bre-B", "Transferencia", "Tarjeta", "Efectivo"];
const FORMAS_PAGO = ["Efectivo", "Transferencia", "Nequi", "Daviplata", "Tarjeta"];
const CONTRATOS = ["Indefinido", "Fijo", "Obra o labor", "Prestación de servicios", "Por días", "Aprendizaje"];
const CANALES_QUEJA = ["WhatsApp", "Mostrador", "Teléfono", "Correo", "Redes sociales", "Buzón"];
const PERIODOS = ["Semana", "Mes", "Temporada", "Trimestre"];
const tipoCliente = (...ops: string[]) => sel("tipo_cliente", "Tipo de cliente", ops);

type DatosSector = {
  /** Campos propios de "Clientes". */
  c?: CampoExtra[];
  /** Conceptos de cobro de "Pagos". */
  p: string[];
  /** Cargos del "Personal". */
  r: string[];
  /** Campos extra del "Personal". */
  pe?: CampoExtra[];
  /** Temas de "Quejas y reseñas". */
  q?: string[];
  /** Indicadores de "Metas". */
  m: string[];
  /** Campos extra de la caja del negocio. */
  caja?: CampoExtra[];
};

const SECTORES_CAMPOS: Record<string, DatosSector> = {
  tienda: {
    c: [tipoCliente("Frecuente", "Mayorista", "Ocasional", "Empresa"), t("talla_marca", "Talla o marca preferida"), t("cupo_credito", "Cupo de crédito (COP)")],
    p: ["Venta de mostrador", "Abono de apartado", "Abono a cuenta por cobrar", "Pedido por WhatsApp", "Cambio con diferencia"],
    r: ["Vendedor", "Cajero", "Bodeguero", "Domiciliario", "Administrador"],
    pe: [t("comision_venta", "Comisión por venta (%)")],
    q: ["Producto defectuoso", "Cambio o devolución", "Precio", "Atención", "Domicilio"],
    m: ["Ventas (COP)", "Unidades vendidas", "Ticket promedio (COP)", "Clientes nuevos", "Apartados cerrados"],
  },
  servicios: {
    c: [tipoCliente("Frecuente", "Nuevo", "Con membresía", "Empresa"), t("preferencias", "Preferencias o servicio habitual"), t("alergias", "Alergias o restricciones"), sel("recordatorio", "Recordatorio de cita", ["WhatsApp", "Llamada", "Ninguno"])],
    p: ["Cita o servicio", "Anticipo de reserva", "Paquete o membresía", "Saldo final", "Propina"],
    r: ["Profesional", "Recepcionista", "Auxiliar", "Administrador"],
    pe: [t("comision_servicio", "Comisión por servicio (%)")],
    q: ["Atención", "Puntualidad", "Resultado del servicio", "Cobro", "Instalaciones"],
    m: ["Servicios realizados", "Citas agendadas", "Ingresos (COP)", "Clientes nuevos", "Ocupación de la agenda (%)"],
  },
  educacion: {
    p: ["Matrícula", "Pensión mensual", "Transporte escolar", "Uniforme o útiles", "Derechos de grado", "Curso o taller"],
    r: ["Docente", "Coordinador", "Secretaría", "Psicoorientación", "Servicios generales", "Rector o director"],
    pe: [sel("modalidad", "Modalidad de pago", ["Por hora de clase", "Salario fijo", "Por curso"]), t("horas", "Horas dictadas en el periodo")],
    q: ["Académico", "Convivencia", "Cobros", "Transporte", "Alimentación", "Instalaciones"],
    m: ["Matrículas nuevas", "Recaudo de pensiones (COP)", "Cartera recuperada (COP)", "Asistencia (%)", "Estudiantes retenidos"],
  },
  hosp: {
    p: ["Estadía", "Anticipo de reserva", "Consumos y minibar", "Servicio adicional", "Depósito de garantía", "Tarifa de plataforma"],
    r: ["Recepcionista", "Camarera", "Mantenimiento", "Cocina", "Botones", "Administrador"],
    pe: [t("area", "Área o piso asignado")],
    q: ["Limpieza", "Ruido", "Atención", "Check-in o check-out", "Ubicación", "Desayuno"],
    m: ["Ocupación (%)", "Ingresos (COP)", "Reservas directas", "Tarifa promedio (COP)", "Calificación promedio"],
  },
  gym: {
    p: ["Inscripción", "Mensualidad", "Plan trimestral", "Plan anual", "Clase suelta", "Producto de la tienda", "Entrenamiento personalizado"],
    r: ["Entrenador", "Instructor de clases", "Recepción", "Aseo", "Administrador"],
    pe: [t("clases_dictadas", "Clases dictadas en el periodo"), t("pago_clase", "Pago por clase (COP)")],
    q: ["Equipos", "Clases", "Limpieza", "Horarios", "Entrenadores", "Cobros"],
    m: ["Socios nuevos", "Renovaciones", "Recaudo (COP)", "Asistencia promedio", "Bajas de socios"],
  },
  obra: {
    c: [tipoCliente("Propietario", "Constructora", "Maestro de obra", "Entidad pública", "Particular"), t("obra", "Obra o proyecto"), t("direccion_obra", "Dirección de la obra"), t("presupuesto", "Presupuesto aprobado (COP)")],
    p: ["Anticipo", "Corte de obra", "Pago de materiales", "Abono", "Pago final", "Retención de garantía"],
    r: ["Maestro de obra", "Oficial", "Ayudante", "Ingeniero residente", "Almacenista", "Contratista"],
    pe: [sel("modalidad", "Modalidad de pago", ["Jornal", "Destajo", "Por obra", "Salario fijo"]), t("obra", "Obra asignada"), t("dias", "Días trabajados")],
    q: ["Acabados", "Plazo de entrega", "Calidad del trabajo", "Materiales", "Garantía", "Limpieza de obra"],
    m: ["Obras entregadas", "Facturación (COP)", "Avance de obra (%)", "Cotizaciones cerradas", "Cartera recuperada (COP)"],
  },
  agro: {
    c: [tipoCliente("Mayorista", "Plaza de mercado", "Supermercado", "Exportador", "Cooperativa", "Consumidor final"), t("producto_habitual", "Producto que compra"), t("lugar_entrega", "Lugar de entrega"), t("condicion_pago", "Condición de pago", "Contado o a plazo")],
    p: ["Venta de cosecha", "Anticipo de compra", "Pago de jornales", "Compra de insumos", "Arriendo de tierra", "Flete"],
    r: ["Jornalero", "Mayordomo", "Ordeñador", "Tractorista", "Administrador de finca", "Veterinario"],
    pe: [sel("modalidad", "Modalidad de pago", ["Jornal", "Destajo (por kilo)", "Mensual"]), t("lote", "Lote o potrero asignado")],
    m: ["Producción (kg)", "Hectáreas sembradas", "Ventas (COP)", "Animales vendidos", "Costo por lote (COP)"],
  },
  inmo: {
    c: [sel("rol", "Rol", ["Propietario", "Comprador interesado", "Arrendatario interesado", "Arrendatario actual", "Codeudor"]), t("inmueble", "Inmueble de interés o relacionado"), t("presupuesto", "Presupuesto o canon (COP)"), t("zona", "Zona preferida")],
    p: ["Canon de arriendo", "Cuota de administración", "Consignación al propietario", "Comisión de la inmobiliaria", "Depósito", "Cobro de servicios"],
    r: ["Asesor comercial", "Administrador de arriendos", "Auxiliar contable", "Mensajero", "Abogado"],
    pe: [t("comision", "Comisión pactada (%)")],
    m: ["Arriendos cerrados", "Ventas cerradas", "Inmuebles captados", "Visitas realizadas", "Recaudo de cánones (COP)"],
  },
  vet: {
    p: ["Consulta", "Vacunación", "Cirugía", "Hospitalización", "Peluquería", "Alimento o medicamento", "Abono"],
    r: ["Veterinario", "Auxiliar veterinario", "Peluquero canino", "Recepción", "Administrador"],
    pe: [t("honorario", "Honorario por consulta (COP)")],
    q: ["Atención del veterinario", "Precios", "Tiempo de espera", "Resultado del tratamiento", "Peluquería", "Medicamentos"],
    m: ["Consultas atendidas", "Vacunas aplicadas", "Cirugías", "Ventas de productos (COP)", "Mascotas nuevas"],
  },
  tec: {
    c: [tipoCliente("Empresa", "Startup", "Entidad pública", "Persona natural", "Agencia aliada"), t("empresa", "Empresa"), t("proyecto", "Proyecto o producto contratado"), t("contacto_tecnico", "Contacto técnico"), sel("contrato", "Tipo de contrato", ["Proyecto cerrado", "Mensualidad", "Por horas", "Soporte anual"])],
    p: ["Anticipo de proyecto", "Entrega de hito", "Mensualidad", "Soporte", "Hosting o dominio", "Horas adicionales"],
    r: ["Desarrollador", "Diseñador", "Líder de proyecto", "Soporte técnico", "Comercial", "QA"],
    pe: [t("tarifa_hora", "Tarifa por hora (COP)"), t("horas", "Horas del periodo")],
    m: ["Proyectos entregados", "Facturación recurrente (COP)", "Horas facturables", "Tickets resueltos", "Clientes nuevos"],
  },
  transp: {
    c: [tipoCliente("Empresa", "Persona natural", "Comercializador", "Aliado transportador"), t("ruta_habitual", "Ruta habitual"), t("tipo_carga", "Tipo de carga"), t("tarifa", "Tarifa pactada (COP)"), t("condicion_pago", "Condición de pago")],
    p: ["Flete", "Anticipo del viaje", "Saldo del flete", "Peajes y gastos reembolsados", "Cargue y descargue", "Seguro de carga"],
    r: ["Conductor", "Auxiliar de ruta", "Despachador", "Mecánico", "Administrador de flota"],
    pe: [t("licencia", "Licencia de conducción (categoría)"), d("licencia_vence", "Vence la licencia"), t("viajes", "Viajes del periodo")],
    q: ["Avería", "Faltante", "Retraso", "Trato del conductor", "Documentos", "Cobro"],
    m: ["Viajes realizados", "Kilómetros recorridos", "Fletes facturados (COP)", "Entregas a tiempo (%)", "Costo por kilómetro (COP)"],
  },
  bell: {
    c: [tipoCliente("Frecuente", "Nueva", "Con paquete", "Empresa"), t("preferencias", "Servicio o color habitual"), t("alergias", "Alergias o sensibilidad"), t("estilista", "Estilista de confianza"), d("cumple", "Cumpleaños")],
    p: ["Servicio", "Producto", "Paquete o membresía", "Anticipo de cita", "Propina", "Saldo"],
    r: ["Estilista", "Barbero", "Manicurista", "Esteticista", "Masajista", "Recepción", "Auxiliar de lavado"],
    pe: [t("comision_servicio", "Comisión por servicio (%)"), t("comision_producto", "Comisión por productos (%)"), t("silla", "Silla o cabina")],
    q: ["Resultado del servicio", "Puntualidad", "Atención", "Producto", "Higiene", "Cobro"],
    m: ["Servicios realizados", "Ingresos (COP)", "Venta de productos (COP)", "Clientas nuevas", "Ocupación de sillas o cabinas (%)"],
  },
  taller: {
    c: [t("placa", "Placa del vehículo principal"), t("marca_modelo", "Marca y modelo"), t("kilometraje", "Kilometraje actual"), tipoCliente("Particular", "Flota empresarial", "Aseguradora", "Taxista o conductor"), t("aseguradora", "Aseguradora")],
    p: ["Mano de obra", "Repuestos", "Anticipo de orden", "Saldo de orden", "Pago de aseguradora", "Revisión o diagnóstico"],
    r: ["Mecánico", "Latonero", "Pintor", "Electricista automotriz", "Recepcionista", "Jefe de taller"],
    pe: [t("comision_orden", "Comisión por orden (%)"), t("especialidad", "Especialidad")],
    q: ["Falla persistente", "Demora en la entrega", "Cobro", "Repuesto defectuoso", "Atención", "Daño adicional"],
    m: ["Órdenes cerradas", "Facturación (COP)", "Ticket promedio (COP)", "Vehículos reincidentes (%)", "Entregas a tiempo (%)"],
  },
  farm: {
    c: [t("eps", "EPS"), t("cupo_credito", "Cupo de crédito (COP)"), tipoCliente("Particular", "Crónico con fórmula", "Domicilio frecuente", "Empresa"), t("medicamento_habitual", "Medicamento de uso continuo"), t("alergias", "Alergias")],
    p: ["Venta de mostrador", "Domicilio", "Medicamento con fórmula", "Pago de crédito", "Cuota moderadora"],
    r: ["Regente de farmacia", "Auxiliar", "Cajero", "Domiciliario", "Administrador"],
    pe: [t("registro", "Registro o certificado (regente)")],
    q: ["Producto agotado", "Precio", "Domicilio", "Atención", "Producto vencido", "Fórmula"],
    m: ["Ventas (COP)", "Rotación de inventario", "Domicilios realizados", "Clientes nuevos", "Productos agotados (%)"],
  },
  eventos: {
    c: [tipoCliente("Familia", "Empresa", "Pareja (boda)", "Institución", "Agencia"), t("tipo_evento", "Tipo de evento de interés"), t("invitados", "Invitados estimados"), t("presupuesto", "Presupuesto (COP)"), d("fecha_evento", "Fecha del evento")],
    p: ["Anticipo", "Abono", "Saldo final", "Adicionales del día", "Depósito de garantía", "Pago a proveedor"],
    r: ["Mesero", "Fotógrafo", "Camarógrafo", "Coordinador", "DJ o sonido", "Decorador", "Barman", "Auxiliar"],
    pe: [t("evento", "Evento asignado"), t("horas", "Horas trabajadas"), t("tarifa_evento", "Tarifa por evento (COP)")],
    q: ["Puntualidad", "Comida", "Decoración", "Fotos o video", "Sonido", "Cobros"],
    m: ["Eventos realizados", "Contratos cerrados", "Ingresos (COP)", "Anticipos recibidos (COP)", "Cotizaciones enviadas"],
  },
  prof: {
    c: [tipoCliente("Persona natural", "Empresa", "Entidad pública"), t("nit", "NIT o cédula"), t("asunto", "Asunto o servicio contratado"), t("honorarios", "Honorarios pactados (COP)"), t("contraparte", "Contraparte o juzgado")],
    p: ["Abono de honorarios", "Honorarios finales", "Gastos del proceso", "Consignación a terceros", "Impuestos o derechos", "Retainer mensual"],
    r: ["Abogado asociado", "Contador", "Consultor", "Asistente", "Pasante", "Mensajero"],
    pe: [t("tarifa_hora", "Tarifa por hora (COP)"), t("tarjeta_prof", "Tarjeta profesional")],
    q: ["Atención", "Plazos", "Honorarios", "Comunicación", "Resultado"],
    m: ["Casos cerrados", "Honorarios facturados (COP)", "Horas facturables", "Clientes nuevos", "Declaraciones presentadas"],
  },
  lav: {
    c: [tipoCliente("Hogar", "Empresa con contrato", "Hotel o restaurante", "Gimnasio o spa"), t("prendas_habituales", "Servicio o prendas habituales"), t("direccion_recogida", "Dirección de recogida"), sel("frecuencia", "Frecuencia", ["Semanal", "Quincenal", "Mensual", "Ocasional"])],
    p: ["Orden de lavado", "Servicio de planchado", "Domicilio", "Anticipo", "Pago de empresa", "Prenda especial"],
    r: ["Operario de lavado", "Planchador", "Recepción", "Domiciliario", "Lavador de autos", "Administrador"],
    pe: [t("destajo", "Prendas o kilos del periodo"), t("pago_unidad", "Pago por unidad o kilo (COP)")],
    q: ["Prenda dañada", "Prenda perdida", "Retraso", "Mancha no salió", "Cobro", "Domicilio"],
    m: ["Kilos lavados", "Órdenes entregadas", "Facturación (COP)", "Entregas a tiempo (%)", "Clientes nuevos"],
  },
  cond: {
    c: [sel("rol", "Rol", ["Propietario", "Inquilino", "Residente", "Administrador"]), t("unidad", "Torre y apartamento o casa"), t("coeficiente", "Coeficiente de copropiedad (%)"), t("vehiculos", "Vehículos y parqueadero"), t("contacto_emergencia", "Contacto de emergencia")],
    p: ["Cuota de administración", "Cuota extraordinaria", "Multa", "Reserva de zona común", "Acuerdo de pago", "Parqueadero"],
    r: ["Vigilante", "Aseador", "Jardinero", "Portero", "Administrador", "Contador", "Mantenimiento"],
    pe: [t("puesto", "Puesto asignado"), sel("turno_tipo", "Turno", ["Diurno", "Nocturno", "Rotativo", "Fin de semana"])],
    m: ["Recaudo del mes (COP)", "Cartera recuperada (COP)", "Unidades al día (%)", "Reparaciones atendidas", "PQRS resueltas"],
  },
  prest: {
    c: [t("ocupacion", "Ocupación"), t("ingresos", "Ingresos mensuales (COP)"), t("referencia_personal", "Referencia personal (nombre y teléfono)"), t("avalista", "Avalista o codeudor"), sel("riesgo", "Calificación de riesgo", ["A - Excelente", "B - Bueno", "C - Regular", "D - Riesgoso"]), t("ruta", "Ruta de cobro")],
    p: ["Abono a cuota", "Cuota completa", "Pago de interés", "Pago total del préstamo", "Cargo por mora", "Desembolso"],
    r: ["Cobrador", "Analista de crédito", "Cajero", "Administrador", "Abogado de cobranza"],
    pe: [t("ruta", "Ruta de cobro"), t("comision_recaudo", "Comisión por recaudo (%)")],
    m: ["Préstamos colocados (COP)", "Cartera recuperada (COP)", "Clientes en mora (%)", "Clientes nuevos", "Cuotas cobradas"],
  },
  textil: {
    c: [tipoCliente("Marca propia", "Colegio o institución", "Empresa (dotación)", "Boutique", "Particular"), t("prenda_habitual", "Prenda habitual"), t("tallas", "Tallas y cantidades habituales"), t("condicion_pago", "Condición de pago")],
    p: ["Anticipo de pedido", "Saldo de pedido", "Pago de muestra", "Pago de empresa", "Abono"],
    r: ["Operario de plana", "Operario de fileteadora", "Cortador", "Terminador", "Patronista o diseñador", "Supervisor"],
    pe: [t("operacion", "Operación que realiza"), t("prendas", "Prendas del periodo"), t("valor_prenda", "Valor por prenda (COP)")],
    m: ["Prendas confeccionadas", "Pedidos entregados", "Facturación (COP)", "Eficiencia por operario (%)", "Reprocesos (%)"],
  },
  joy: {
    c: [tipoCliente("Particular", "Coleccionista", "Empresa", "Revendedor"), t("estilo", "Estilo o material preferido", "Oro, plata, relojes"), t("talla_anillo", "Talla de anillo o muñeca"), d("fecha_especial", "Fecha especial (cumpleaños, aniversario)"), t("encargo", "Encargo en curso")],
    p: ["Venta de pieza", "Anticipo de encargo", "Saldo de encargo", "Reparación", "Apartado", "Compra de oro"],
    r: ["Joyero", "Relojero", "Vendedor", "Diseñador", "Cajero", "Administrador"],
    pe: [t("comision_venta", "Comisión por venta (%)")],
    q: ["Pieza defectuosa", "Reparación", "Certificado", "Garantía", "Precio", "Atención"],
    m: ["Piezas vendidas", "Ventas (COP)", "Encargos cerrados", "Reparaciones entregadas", "Clientes nuevos"],
  },
  cel: {
    c: [tipoCliente("Particular", "Distribuidor", "Empresa", "Técnico aliado"), t("equipo", "Equipo principal (marca y modelo)"), t("imei", "IMEI"), t("linea", "Línea u operador"), d("garantia_vence", "Garantía vigente hasta")],
    p: ["Venta de equipo", "Reparación", "Accesorio", "Anticipo de reparación", "Recarga o plan", "Crédito de equipo"],
    r: ["Vendedor", "Técnico", "Cajero", "Domiciliario", "Administrador"],
    pe: [t("comision_equipo", "Comisión por equipo vendido (%)"), t("pago_reparacion", "Pago por reparación (COP)")],
    q: ["Falla recurrente", "Garantía", "Equipo no entregado", "Precio", "Repuesto", "Atención"],
    m: ["Equipos vendidos", "Reparaciones entregadas", "Líneas activadas", "Ventas (COP)", "Accesorios vendidos"],
    caja: [t("reparaciones_cobradas", "Reparaciones cobradas hoy (COP)")],
  },
  papel: {
    c: [tipoCliente("Colegio", "Empresa", "Estudiante o acudiente", "Oficina", "Particular"), t("institucion", "Colegio o institución"), t("grado", "Grado o lista habitual"), t("condicion_pago", "Condición de pago")],
    p: ["Venta de útiles", "Lista escolar", "Copias e impresiones", "Pedido de colegio", "Anticipo de lista", "Abono"],
    r: ["Vendedor", "Cajero", "Operario de copias", "Domiciliario", "Administrador"],
    pe: [t("comision_venta", "Comisión por venta (%)")],
    m: ["Ventas (COP)", "Listas escolares entregadas", "Copias o impresiones", "Pedidos de colegios", "Clientes nuevos"],
    caja: [t("copias_cobradas", "Copias e impresiones del día (COP)")],
  },
  moda: {
    c: [tipoCliente("Frecuente", "Nueva", "Mayorista", "Empresa"), t("talla_ropa", "Talla de ropa"), t("talla_calzado", "Talla de calzado"), t("colores", "Colores o estilos preferidos"), t("marcas", "Marcas favoritas"), d("cumple", "Cumpleaños")],
    p: ["Venta de prendas", "Venta de calzado", "Apartado", "Abono a apartado", "Cambio con diferencia", "Abono a cuenta por cobrar"],
    r: ["Asesor de ventas", "Cajero", "Bodeguero", "Vitrinista", "Administrador"],
    pe: [t("comision_prenda", "Comisión por venta (%)")],
    q: ["Cambio de talla", "Calidad", "Precio", "Atención", "Producto dañado", "Devolución"],
    m: ["Ventas (COP)", "Prendas vendidas", "Ticket promedio (COP)", "Apartados cerrados", "Rotación de temporada (%)"],
    caja: [t("apartados_abonos", "Abonos a apartados del día (COP)")],
  },
};

const ID_CLIENTE = [t("documento", "Documento o NIT"), tel("telefono", "Teléfono o WhatsApp"), em("correo", "Correo electrónico"), t("direccion", "Dirección o barrio")];

/** Campos por id de módulo (clientes_x, pagos_x, personal_x, resenas_x, metas_x, caja_x). */
export const CAMPOS_FAMILIAS: Record<string, CampoExtra[]> = {};

for (const [sufijo, x] of Object.entries(SECTORES_CAMPOS)) {
  if (x.c) CAMPOS_FAMILIAS[`clientes_${sufijo}`] = [...ID_CLIENTE, ...x.c];
  CAMPOS_FAMILIAS[`pagos_${sufijo}`] = [
    sel("app", "Medio de pago", MEDIOS),
    sel("concepto", "Concepto del pago", x.p),
    t("pagador", "Quién paga (nombre)"),
    t("referencia", "Referencia de la transferencia"),
    t("factura", "Factura o recibo asociado"),
  ];
  CAMPOS_FAMILIAS[`personal_${sufijo}`] = [
    t("documento", "Documento"),
    tel("telefono", "Teléfono"),
    sel("cargo", "Cargo", x.r),
    sel("contrato", "Tipo de contrato", CONTRATOS),
    t("turno", "Turno u horario"),
    ...(x.pe ?? []),
    t("arl", "ARL (nivel de riesgo)"),
    sel("forma_pago", "Forma de pago al personal", FORMAS_PAGO),
  ];
  if (x.q) {
    CAMPOS_FAMILIAS[`resenas_${sufijo}`] = [
      sel("tipo", "Tipo", ["Queja", "Reclamo", "Sugerencia", "Felicitación", "Petición"]),
      sel("tema", "Tema", x.q),
      t("responsable", "Responsable de responder"),
      sel("canal", "Canal", CANALES_QUEJA),
      t("plazo_dias", "Días para responder", "Ej. 15"),
      t("solucion", "Solución dada"),
    ];
  }
  CAMPOS_FAMILIAS[`metas_${sufijo}`] = [
    t("responsable", "Responsable de la meta"),
    sel("indicador", "Qué se mide", x.m),
    t("meta_cantidad", "Meta (cantidad)"),
    t("logrado", "Logrado hasta hoy"),
    sel("periodo", "Periodo", PERIODOS),
  ];
  if (x.caja) {
    CAMPOS_FAMILIAS[`caja_${sufijo}`] = [
      sel("turno", "Turno", ["Mañana", "Tarde", "Noche", "Completo"]),
      t("responsable", "Cajero responsable"),
      t("base_inicial", "Base de apertura (COP)"),
      t("efectivo_contado", "Efectivo contado al cierre (COP)"),
      t("ventas_tarjeta", "Ventas con tarjeta (COP)"),
      t("ventas_transferencia", "Ventas por transferencia (COP)"),
      ...x.caja,
      t("diferencia", "Sobrante o faltante (COP)"),
    ];
  }
}
