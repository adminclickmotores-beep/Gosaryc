import type { CampoExtra } from "@/lib/modulos-config";
import type { FamiliaPropia } from "@/lib/modulos-propios";

/**
 * Caja, proveedores, finanzas, cuentas por cobrar y agenda propios de los tipos de negocio que aún compartían
 * esos módulos: concesionario, belleza, taller, farmacia, eventos y profesionales.
 */

const t = (clave: string, etiqueta: string, placeholder?: string): CampoExtra => ({ clave, etiqueta, tipo: "text", placeholder });
const tel = (clave: string, etiqueta: string): CampoExtra => ({ clave, etiqueta, tipo: "tel" });
const d = (clave: string, etiqueta: string): CampoExtra => ({ clave, etiqueta, tipo: "date" });
const sel = (clave: string, etiqueta: string, opciones: string[]): CampoExtra => ({ clave, etiqueta, tipo: "select", opciones });
const PAGO = sel("forma_pago", "Forma de pago", ["Efectivo", "Transferencia", "Nequi", "Daviplata", "Bre-B", "Tarjeta"]);

const F = (
  titulo: string, desc: string, ph: string, det: string, cont: string, monto: string, fecha: string, res: string,
  campos: CampoExtra[], preset?: string,
): FamiliaPropia => ({ titulo, desc, ph, det, cont, monto, fecha, res, campos, preset });

export const PROPIOS_OPERACION_3: Record<string, Record<string, FamiliaPropia>> = {
  // Concesionario de vehículos
  veh: {
    caja: F("Caja de la sala de ventas", "Apertura y cierre de caja de la sala, con anticipos recibidos y gastos de trámites.",
      "Movimiento de caja (apertura, cierre, anticipo o gasto)", "Concepto, soporte, cajero del turno y vehículo asociado", "Cajero", "Valor (COP)", "Fecha", "Movimientos por revisar",
      [sel("tipo_mov", "Tipo de movimiento", ["Apertura", "Cierre", "Anticipo", "Gasto de trámite", "Consignación"]), t("placa", "Placa del vehículo asociado"), t("soporte", "Soporte o recibo"), PAGO]),
    proveedores: F("Gestores, talleres y proveedores", "Gestores de trámites, talleres externos, latonería y proveedores de repuestos del vehículo.",
      "Proveedor o gestor (servicio o trámite)", "Servicio, tarifa pactada, factura y fecha de pago", "Proveedor", "Valor de la deuda (COP)", "Fecha de pago acordada", "Por pagar a proveedores",
      [t("nit", "NIT o cédula del proveedor"), sel("tipo", "Tipo", ["Gestor de trámites", "Taller externo", "Latonería o pintura", "Repuestos", "Aseguradora", "Otro"]), t("factura", "Factura del proveedor"), PAGO]),
    finanzas: F("Ventas, utilidad y costos de la sala", "Ventas cerradas, costo de compra de cada vehículo, comisiones y utilidad del concesionario.",
      "Registro financiero (mes o vehículo)", "Ingresos, costos, comisiones y utilidad neta", "Gerente", "Utilidad (COP)", "Fecha de cierre", "Cierres pendientes",
      [t("vehiculos_vendidos", "Vehículos vendidos"), t("costo_total", "Costo total de compra (COP)"), t("comisiones", "Comisiones pagadas (COP)"), t("gastos", "Gastos de la sala (COP)"), sel("periodo", "Periodo", ["Mes", "Trimestre", "Año"])]),
  },
  // Belleza, peluquería y spa
  bell: {
    caja: F("Caja del salón", "Apertura y cierre de caja del salón, con cobros de servicios y productos por silla o cabina.",
      "Movimiento de caja (apertura, cierre, cobro o gasto)", "Concepto, servicio o producto, cajero del turno y soporte", "Cajero", "Valor (COP)", "Fecha", "Movimientos por revisar",
      [sel("tipo_mov", "Tipo de movimiento", ["Apertura", "Cierre", "Cobro de servicio", "Venta de producto", "Gasto"]), t("silla", "Silla o cabina"), t("soporte", "Soporte o recibo"), PAGO]),
    proveedores: F("Proveedores de cosméticos y productos", "Marcas de tintes, cosméticos y productos de uso en el salón, con su pedido y plazo de pago.",
      "Proveedor o pedido de productos", "Productos, cantidades, plazo y factura", "Proveedor", "Valor del pedido o deuda (COP)", "Fecha de pago acordada", "Por pagar a proveedores",
      [t("marca", "Marca o línea"), t("factura", "Factura del proveedor"), sel("plazo", "Plazo de pago", ["Contado", "15 días", "30 días", "60 días"])]),
    finanzas: F("Ventas, utilidad y costos del salón", "Ingresos por servicios, costo de productos, comisiones y utilidad del salón.",
      "Registro financiero (mes)", "Ingresos, costos, comisiones y utilidad neta", "Administrador", "Utilidad (COP)", "Fecha de cierre", "Cierres pendientes",
      [t("servicios_mes", "Servicios realizados"), t("costo_productos", "Costo de productos (COP)"), t("comisiones", "Comisiones pagadas (COP)"), t("arriendo", "Arriendo y gastos fijos (COP)")]),
    cuentas: F("Saldos y abonos de clientas", "Servicios o paquetes a crédito, abonos y saldos pendientes de cada clienta.",
      "Cuenta (clienta y servicio)", "Servicio o paquete, abonos recibidos y saldo", "Clienta", "Saldo pendiente (COP)", "Fecha del próximo abono", "Saldos por cobrar",
      [tel("telefono", "Teléfono o WhatsApp"), t("servicio", "Servicio o paquete"), t("abonos", "Abonos recibidos (COP)"), PAGO]),
    agenda: F("Agenda de sillas y cabinas", "Citas por silla o cabina y por profesional, sin cruces de horario.",
      "Cita (clienta, servicio y profesional)", "Servicio, duración, silla o cabina y recordatorio", "Clienta", "Valor del servicio (COP)", "Fecha y hora de la cita", "Citas del día",
      [t("profesional", "Estilista o profesional"), t("silla", "Silla o cabina"), t("duracion", "Duración (minutos)"), sel("recordatorio", "Recordatorio", ["WhatsApp 1 día antes", "WhatsApp 2 horas antes", "Sin recordatorio"])], "cita"),
  },
  // Taller mecánico, latonería y lubricentro
  taller: {
    caja: F("Caja del taller", "Apertura y cierre de caja del taller, con cobros de órdenes, repuestos y mano de obra.",
      "Movimiento de caja (apertura, cierre, cobro o gasto)", "Concepto, orden de servicio, cajero del turno y soporte", "Cajero", "Valor (COP)", "Fecha", "Movimientos por revisar",
      [sel("tipo_mov", "Tipo de movimiento", ["Apertura", "Cierre", "Cobro de orden", "Venta de repuesto", "Gasto"]), t("orden", "Número de orden de servicio"), t("soporte", "Soporte o recibo"), PAGO]),
    proveedores: F("Proveedores de repuestos y servicios", "Distribuidores de repuestos, lubricantes y talleres especializados, con su pedido y plazo.",
      "Proveedor o pedido de repuestos", "Repuestos o servicio, cantidades, plazo y factura", "Proveedor", "Valor del pedido o deuda (COP)", "Fecha de pago acordada", "Por pagar a proveedores",
      [t("nit", "NIT del proveedor"), sel("tipo", "Tipo", ["Repuestos", "Lubricantes", "Llantas", "Latonería o pintura", "Servicio externo"]), t("factura", "Factura del proveedor"), sel("plazo", "Plazo de pago", ["Contado", "15 días", "30 días", "60 días"])]),
    finanzas: F("Ingresos, costos y utilidad del taller", "Órdenes cobradas, costo de repuestos, mano de obra y utilidad del taller.",
      "Registro financiero (mes)", "Ingresos, costos de repuestos, mano de obra y utilidad", "Administrador", "Utilidad (COP)", "Fecha de cierre", "Cierres pendientes",
      [t("ordenes_mes", "Órdenes cerradas"), t("costo_repuestos", "Costo de repuestos (COP)"), t("mano_obra", "Mano de obra cobrada (COP)"), t("arriendo", "Arriendo y gastos fijos (COP)")]),
    cuentas: F("Cuentas de dueños de vehículos", "Órdenes a crédito, abonos y saldos pendientes de cada dueño de vehículo.",
      "Cuenta (dueño y placa)", "Órdenes abiertas, abonos recibidos y saldo", "Dueño del vehículo", "Saldo pendiente (COP)", "Fecha de pago prometida", "Saldos por cobrar",
      [tel("telefono", "Teléfono o WhatsApp"), t("placa", "Placa del vehículo"), t("abonos", "Abonos recibidos (COP)"), PAGO]),
    agenda: F("Agenda de ingreso de vehículos", "Citas de revisión, cambio de aceite y reparación, con su bahía asignada.",
      "Cita (dueño, placa y servicio)", "Servicio, bahía o mecánico asignado y recordatorio", "Dueño del vehículo", "Valor estimado (COP)", "Fecha y hora de ingreso", "Ingresos del día",
      [t("placa", "Placa"), t("bahia", "Bahía o mecánico asignado"), t("servicio", "Servicio solicitado"), sel("recordatorio", "Recordatorio", ["WhatsApp 1 día antes", "Sin recordatorio"])], "cita"),
  },
  // Farmacia y droguería
  farm: {
    caja: F("Caja de la farmacia", "Apertura y cierre de caja de la farmacia, con ventas de mostrador, domicilios y gastos del día.",
      "Movimiento de caja (apertura, cierre, venta o gasto)", "Concepto, cajero del turno y soporte", "Cajero", "Valor (COP)", "Fecha", "Movimientos por revisar",
      [sel("tipo_mov", "Tipo de movimiento", ["Apertura", "Cierre", "Venta de mostrador", "Domicilio", "Gasto"]), t("factura", "Factura o tiquete"), t("soporte", "Soporte"), PAGO]),
    proveedores: F("Laboratorios y distribuidores", "Laboratorios y distribuidores de medicamentos, con pedidos, lotes y plazos de pago.",
      "Laboratorio o distribuidor (pedido)", "Productos, lote, plazo de pago y factura", "Proveedor", "Valor del pedido o deuda (COP)", "Fecha de pago acordada", "Por pagar a proveedores",
      [t("nit", "NIT del proveedor"), t("registro_invima", "Registro INVIMA del producto"), t("lote", "Lote recibido"), sel("plazo", "Plazo de pago", ["Contado", "30 días", "60 días", "90 días"])]),
    finanzas: F("Ventas, márgenes y utilidad de la farmacia", "Ventas por línea, márgenes de medicamentos y productos de cuidado personal, y utilidad del mes.",
      "Registro financiero (mes)", "Ventas, costo de mercancía, márgenes y gastos", "Administrador", "Utilidad (COP)", "Fecha de cierre", "Cierres pendientes",
      [t("ventas_mes", "Ventas del mes (COP)"), t("costo_mercancia", "Costo de mercancía (COP)"), t("margen", "Margen promedio (%)"), t("gastos", "Gastos fijos (COP)")]),
    cuentas: F("Cuentas de clientes con crédito", "Clientes con cupo de crédito, abonos y saldos de medicamentos o domicilios.",
      "Cuenta (cliente y cupo)", "Compras a crédito, abonos recibidos y saldo", "Cliente", "Saldo pendiente (COP)", "Fecha de pago", "Saldos por cobrar",
      [tel("telefono", "Teléfono o WhatsApp"), t("cupo", "Cupo de crédito (COP)"), t("abonos", "Abonos recibidos (COP)"), PAGO]),
  },
  // Eventos y catering
  eventos: {
    caja: F("Caja de eventos", "Apertura y cierre de caja por evento, con anticipos, saldos y gastos del día del evento.",
      "Movimiento de caja (anticipo, saldo o gasto)", "Evento, concepto, cajero y soporte", "Cajero", "Valor (COP)", "Fecha", "Movimientos por revisar",
      [sel("tipo_mov", "Tipo de movimiento", ["Anticipo", "Saldo", "Gasto de evento", "Cierre"]), t("evento", "Evento asociado"), t("soporte", "Soporte o recibo"), PAGO]),
    proveedores: F("Proveedores de eventos", "Salones, banquetes, decoración, sonido y proveedores que se contratan para cada evento.",
      "Proveedor (servicio y evento)", "Servicio contratado, plazo de pago y factura", "Proveedor", "Valor del servicio o deuda (COP)", "Fecha de pago acordada", "Por pagar a proveedores",
      [t("nit", "NIT del proveedor"), sel("tipo", "Tipo de proveedor", ["Salón", "Banquetes", "Decoración", "Sonido y luces", "Transporte", "Otro"]), t("evento", "Evento asociado"), sel("plazo", "Plazo de pago", ["Contado", "15 días", "30 días"])]),
    finanzas: F("Utilidad por evento y temporada", "Ingresos y costos por evento, margen de cada banquete y utilidad de la temporada.",
      "Registro financiero (evento o mes)", "Ingresos, costos directos, margen y utilidad", "Responsable", "Utilidad (COP)", "Fecha de cierre", "Eventos por cerrar",
      [t("eventos_realizados", "Eventos realizados"), t("costo_directo", "Costo directo del evento (COP)"), t("margen", "Margen (%)"), t("gastos", "Gastos fijos (COP)")]),
    cuentas: F("Saldos de anfitriones", "Anticipos, saldos y pagos pendientes de cada anfitrión o empresa contratante.",
      "Cuenta (anfitrión y evento)", "Evento, anticipo recibido, saldo y fecha del pago final", "Anfitrión", "Saldo pendiente (COP)", "Fecha del pago final", "Saldos por cobrar",
      [tel("telefono", "Teléfono o WhatsApp"), t("evento", "Evento"), t("anticipo", "Anticipo recibido (COP)"), PAGO]),
    agenda: F("Agenda de eventos", "Fechas reservadas, visitas técnicas, pruebas de menú y montajes del equipo.",
      "Evento (fecha, lugar y tipo)", "Invitados, lugar, menú y montaje", "Anfitrión", "Valor del evento (COP)", "Fecha del evento", "Eventos próximos",
      [t("lugar", "Lugar del evento"), t("invitados", "Número de invitados"), t("montaje", "Hora de montaje"), sel("estado_fecha", "Fecha", ["Reservada", "Confirmada", "Liberada"])], "cita"),
  },
  // Profesionales y despachos
  prof: {
    caja: F("Caja del despacho", "Apertura y cierre de caja del despacho, con honorarios recibidos y gastos de trámites.",
      "Movimiento de caja (honorario, trámite o gasto)", "Concepto, caso asociado, responsable y soporte", "Responsable de caja", "Valor (COP)", "Fecha", "Movimientos por revisar",
      [sel("tipo_mov", "Tipo de movimiento", ["Honorario recibido", "Anticipo", "Gasto de trámite", "Cierre"]), t("caso", "Caso o cliente asociado"), t("soporte", "Soporte o recibo"), PAGO]),
    finanzas: F("Honorarios, costos y utilidad del despacho", "Honorarios facturados, costos del despacho y utilidad de cada mes.",
      "Registro financiero (mes)", "Honorarios, costos, gastos fijos y utilidad", "Socio o responsable", "Utilidad (COP)", "Fecha de cierre", "Cierres pendientes",
      [t("honorarios_mes", "Honorarios facturados (COP)"), t("costos", "Costos del despacho (COP)"), t("nomina", "Nómina de apoyo (COP)"), t("gastos", "Gastos fijos (COP)")]),
    agenda: F("Agenda de audiencias y reuniones", "Audiencias, citas con clientes y vencimientos de plazos del despacho.",
      "Cita o audiencia (caso y fecha)", "Caso, lugar, responsable y recordatorio del plazo", "Cliente o contraparte", "Honorario asociado (COP)", "Fecha y hora", "Citas de la semana",
      [t("caso", "Caso o expediente"), t("lugar", "Lugar o juzgado"), t("responsable", "Abogado responsable"), sel("recordatorio", "Recordatorio", ["Un día antes", "Una semana antes", "Sin recordatorio"])], "cita"),
  },
};
