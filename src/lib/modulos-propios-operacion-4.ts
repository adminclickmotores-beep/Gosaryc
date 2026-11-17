import type { CampoExtra } from "@/lib/modulos-config";
import type { FamiliaPropia } from "@/lib/modulos-propios";

/**
 * Caja, proveedores, finanzas, cuentas por cobrar, agenda y cartera propias de los tipos de negocio que aún
 * compartían esos módulos: lavandería, condominio, préstamos, textil y joyería.
 */

const t = (clave: string, etiqueta: string, placeholder?: string): CampoExtra => ({ clave, etiqueta, tipo: "text", placeholder });
const tel = (clave: string, etiqueta: string): CampoExtra => ({ clave, etiqueta, tipo: "tel" });
const sel = (clave: string, etiqueta: string, opciones: string[]): CampoExtra => ({ clave, etiqueta, tipo: "select", opciones });
const PAGO = sel("forma_pago", "Forma de pago", ["Efectivo", "Transferencia", "Nequi", "Daviplata", "Bre-B", "Tarjeta"]);

const F = (
  titulo: string, desc: string, ph: string, det: string, cont: string, monto: string, fecha: string, res: string,
  campos: CampoExtra[], preset?: string,
): FamiliaPropia => ({ titulo, desc, ph, det, cont, monto, fecha, res, campos, preset });

export const PROPIOS_OPERACION_4: Record<string, Record<string, FamiliaPropia>> = {
  // Lavandería, tintorería y autolavado
  lav: {
    caja: F("Caja de la lavandería", "Apertura y cierre de caja, con cobros de lavado, planchado y entregas del día.",
      "Movimiento de caja (apertura, cierre, cobro o gasto)", "Concepto, número de orden, cajero del turno y soporte", "Cajero", "Valor (COP)", "Fecha", "Movimientos por revisar",
      [sel("tipo_mov", "Tipo de movimiento", ["Apertura", "Cierre", "Cobro de orden", "Domicilio", "Gasto"]), t("orden", "Número de orden"), t("soporte", "Soporte o recibo"), PAGO]),
    proveedores: F("Proveedores de detergentes y químicos", "Detergentes, suavizantes, bolsas de empaque y repuestos de máquinas, con su plazo de pago.",
      "Proveedor o pedido de insumos", "Insumos, cantidades, plazo y factura", "Proveedor", "Valor del pedido o deuda (COP)", "Fecha de pago acordada", "Por pagar a proveedores",
      [t("nit", "NIT del proveedor"), sel("tipo", "Tipo de insumo", ["Detergentes", "Suavizantes", "Bolsas y empaques", "Repuestos de máquinas", "Otro"]), t("factura", "Factura del proveedor"), sel("plazo", "Plazo de pago", ["Contado", "15 días", "30 días"])]),
    finanzas: F("Ventas, costos y utilidad de la lavandería", "Ingresos por kilo y por prenda, costo de insumos, energía y utilidad.",
      "Registro financiero (mes)", "Ingresos, costos de insumos, servicios y utilidad", "Administrador", "Utilidad (COP)", "Fecha de cierre", "Cierres pendientes",
      [t("kilos_mes", "Kilos lavados"), t("costo_insumos", "Costo de insumos (COP)"), t("servicios", "Energía y agua (COP)"), t("arriendo", "Arriendo y gastos fijos (COP)")]),
    cuentas: F("Clientes con contrato de ropa", "Empresas y hogares con contrato de lavado, abonos y saldos pendientes.",
      "Cuenta (cliente y contrato)", "Servicio, abonos recibidos y saldo", "Cliente", "Saldo pendiente (COP)", "Fecha de pago", "Saldos por cobrar",
      [tel("telefono", "Teléfono o WhatsApp"), t("contrato", "Contrato o convenio"), t("abonos", "Abonos recibidos (COP)"), PAGO]),
    agenda: F("Agenda de recogidas y entregas", "Recogidas a domicilio y entregas programadas por ruta.",
      "Recogida o entrega (cliente y dirección)", "Dirección, franja horaria y prendas", "Cliente", "Valor estimado (COP)", "Fecha y hora", "Recogidas del día",
      [t("direccion", "Dirección"), sel("franja", "Franja horaria", ["Mañana", "Tarde", "Noche"]), t("prendas", "Número de prendas"), sel("tipo", "Tipo", ["Recogida", "Entrega"])], "cita"),
  },
  // Condominio y propiedad horizontal
  cond: {
    caja: F("Caja de administración", "Recaudo y gastos de administración, con cuotas recibidas y pagos a proveedores del conjunto.",
      "Movimiento de caja (cuota, pago o gasto)", "Concepto, unidad, responsable y soporte", "Administrador", "Valor (COP)", "Fecha", "Movimientos por revisar",
      [sel("tipo_mov", "Tipo de movimiento", ["Cuota recibida", "Pago a proveedor", "Gasto común", "Cierre"]), t("unidad", "Unidad o apartamento"), t("soporte", "Soporte o recibo"), PAGO]),
    proveedores: F("Proveedores del conjunto", "Aseo, vigilancia, ascensores y mantenimiento del edificio, con contrato y plazo de pago.",
      "Proveedor o contrato de servicio", "Servicio, periodo, plazo y factura", "Proveedor", "Valor del contrato o deuda (COP)", "Fecha de pago acordada", "Por pagar a proveedores",
      [t("nit", "NIT del proveedor"), sel("tipo", "Tipo de servicio", ["Aseo", "Vigilancia", "Ascensores", "Jardinería", "Mantenimiento", "Otro"]), t("contrato", "Número de contrato"), sel("plazo", "Plazo de pago", ["Contado", "15 días", "30 días"])]),
    finanzas: F("Presupuesto y ejecución del conjunto", "Presupuesto anual, recaudo de cuotas, gastos ejecutados y saldo del fondo de reserva.",
      "Registro financiero (mes)", "Recaudo, gastos, fondo de reserva y saldo", "Administrador", "Saldo del fondo (COP)", "Fecha de cierre", "Cierres pendientes",
      [t("recaudo_mes", "Recaudo del mes (COP)"), t("gastos_mes", "Gastos del mes (COP)"), t("fondo", "Fondo de reserva (COP)"), t("presupuesto", "Presupuesto anual (COP)")]),
    agenda: F("Agenda de zonas comunes", "Reservas de salón social, piscina y zonas comunes, con cupos y normas de uso.",
      "Reserva (zona, fecha y unidad)", "Zona, horario, depósito y normas aceptadas", "Propietario o inquilino", "Depósito (COP)", "Fecha de la reserva", "Reservas de la semana",
      [t("zona", "Zona común"), t("unidad", "Unidad que reserva"), t("invitados", "Número de invitados"), sel("deposito", "Depósito recibido", ["Sí", "No"])], "reserva"),
  },
  // Préstamos y cobranza
  prest: {
    caja: F("Caja de desembolsos y cobros", "Desembolsos de créditos y cobros de cuotas en efectivo o transferencia, con su recibo.",
      "Movimiento de caja (desembolso, cobro o gasto)", "Crédito o cliente, concepto, cajero y soporte", "Cajero", "Valor (COP)", "Fecha", "Movimientos por revisar",
      [sel("tipo_mov", "Tipo de movimiento", ["Desembolso", "Cobro de cuota", "Abono a capital", "Gasto", "Cierre"]), t("credito", "Número de crédito"), t("soporte", "Recibo o soporte"), PAGO]),
    finanzas: F("Cartera, intereses y utilidad", "Intereses cobrados, provisión de cartera vencida y utilidad del periodo.",
      "Registro financiero (mes)", "Intereses, provisiones y utilidad", "Responsable", "Utilidad (COP)", "Fecha de cierre", "Cierres pendientes",
      [t("intereses", "Intereses cobrados (COP)"), t("cartera_vencida", "Cartera vencida (COP)"), t("provision", "Provisión de cartera (%)"), t("gastos", "Gastos del periodo (COP)")]),
    agenda: F("Agenda de cobranza", "Llamadas, visitas y compromisos de pago programados, con seguimiento.",
      "Gestión de cobro (cliente y crédito)", "Motivo de la gestión, promesa de pago y resultado", "Deudor", "Valor en mora (COP)", "Fecha de la gestión", "Gestiones de hoy",
      [t("credito", "Número de crédito"), sel("gestion", "Tipo de gestión", ["Llamada", "Visita", "Mensaje", "Acuerdo de pago"]), t("promesa", "Fecha de promesa de pago"), t("resultado", "Resultado de la gestión")], "cita"),
  },
  // Textil y confección
  textil: {
    caja: F("Caja del taller de confección", "Apertura y cierre de caja, con anticipos de pedidos y pagos de maquila.",
      "Movimiento de caja (anticipo, saldo, pago o gasto)", "Pedido, concepto, responsable y soporte", "Responsable de caja", "Valor (COP)", "Fecha", "Movimientos por revisar",
      [sel("tipo_mov", "Tipo de movimiento", ["Anticipo de pedido", "Saldo de pedido", "Pago de maquila", "Gasto", "Cierre"]), t("pedido", "Número de pedido"), t("soporte", "Soporte o recibo"), PAGO]),
    proveedores: F("Proveedores de telas e insumos", "Telas, hilos, avíos, cierres y etiquetas, con plazo de pago y factura.",
      "Proveedor o pedido de insumos", "Materiales, cantidades, plazo y factura", "Proveedor", "Valor del pedido o deuda (COP)", "Fecha de pago acordada", "Por pagar a proveedores",
      [t("nit", "NIT del proveedor"), sel("tipo", "Tipo de insumo", ["Telas", "Hilos", "Avíos (botones, cierres)", "Etiquetas y empaques", "Otro"]), t("factura", "Factura del proveedor"), sel("plazo", "Plazo de pago", ["Contado", "15 días", "30 días", "60 días"])]),
    finanzas: F("Ventas, costos y utilidad de confección", "Ingresos por pedidos y maquila, costo de telas y mano de obra, y utilidad.",
      "Registro financiero (mes)", "Ingresos, costos de materia prima, mano de obra y utilidad", "Administrador", "Utilidad (COP)", "Fecha de cierre", "Cierres pendientes",
      [t("prendas_mes", "Prendas confeccionadas"), t("costo_telas", "Costo de telas (COP)"), t("mano_obra", "Mano de obra pagada (COP)"), t("gastos", "Gastos fijos (COP)")]),
    cuentas: F("Saldos de marcas y clientes de confección", "Marcas y colegios con pedidos a crédito, abonos y saldos pendientes.",
      "Cuenta (marca o cliente y pedido)", "Pedido, abonos recibidos y saldo", "Cliente", "Saldo pendiente (COP)", "Fecha de pago", "Saldos por cobrar",
      [tel("telefono", "Teléfono o WhatsApp"), t("pedido", "Número de pedido"), t("abonos", "Abonos recibidos (COP)"), PAGO]),
    agenda: F("Agenda de entregas y pruebas", "Fechas de entrega de pedidos, pruebas de talla y prendas por terminar.",
      "Entrega o prueba (pedido y fecha)", "Cantidad de prendas, taller y responsable", "Cliente", "Valor del pedido (COP)", "Fecha de entrega", "Entregas de la semana",
      [t("pedido", "Número de pedido"), t("prendas", "Cantidad de prendas"), t("taller", "Taller o costurera asignada"), sel("etapa", "Etapa", ["Corte", "Confección", "Acabados", "Lista para entregar"])], "cita"),
  },
  // Joyería y relojería
  joy: {
    caja: F("Caja de la joyería", "Apertura y cierre de caja, con ventas, apartados y pagos de encargos.",
      "Movimiento de caja (venta, apartado, abono o gasto)", "Pieza, método de pago, cajero y soporte", "Cajero", "Valor (COP)", "Fecha", "Movimientos por revisar",
      [sel("tipo_mov", "Tipo de movimiento", ["Venta", "Apartado", "Abono", "Pago de encargo", "Gasto", "Cierre"]), t("pieza", "Código de la pieza"), t("soporte", "Factura o recibo"), PAGO]),
    proveedores: F("Proveedores de metales, piedras y piezas", "Casas de metales, gemólogos y proveedores de piezas, con su certificado y plazo de pago.",
      "Proveedor o pedido de piezas", "Piezas o metal, peso, certificado y plazo", "Proveedor", "Valor del pedido o deuda (COP)", "Fecha de pago acordada", "Por pagar a proveedores",
      [t("nit", "NIT del proveedor"), sel("tipo", "Tipo", ["Metales preciosos", "Piedras", "Piezas terminadas", "Relojes", "Otro"]), t("certificado", "Certificado de la pieza"), sel("plazo", "Plazo de pago", ["Contado", "30 días", "60 días"])]),
    finanzas: F("Ventas, costos y utilidad de la joyería", "Ventas por pieza, costo del metal y las piedras, márgenes y utilidad.",
      "Registro financiero (mes)", "Ventas, costos de materia prima, márgenes y utilidad", "Administrador", "Utilidad (COP)", "Fecha de cierre", "Cierres pendientes",
      [t("ventas_mes", "Ventas del mes (COP)"), t("costo_metal", "Costo de metal y piedras (COP)"), t("margen", "Margen promedio (%)"), t("gastos", "Gastos fijos (COP)")]),
    cuentas: F("Apartados y encargos de clientes", "Piezas apartadas, encargos en proceso, abonos y saldos pendientes.",
      "Apartado o encargo (cliente y pieza)", "Pieza, fecha límite, abonos y saldo", "Cliente", "Saldo pendiente (COP)", "Fecha límite de pago", "Apartados por cerrar",
      [tel("telefono", "Teléfono o WhatsApp"), t("pieza", "Pieza apartada o encargada"), t("abonos", "Abonos recibidos (COP)"), PAGO]),
  },
};
