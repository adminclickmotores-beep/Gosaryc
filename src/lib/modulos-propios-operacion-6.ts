import type { CampoExtra } from "@/lib/modulos-config";
import type { FamiliaPropia } from "@/lib/modulos-propios";

/**
 * Caja, proveedores, finanzas y cuentas por cobrar propias del restaurante y de los negocios de comida
 * (panadería, cafetería, comida rápida y catering), que antes compartían esos módulos.
 */

const t = (clave: string, etiqueta: string, placeholder?: string): CampoExtra => ({ clave, etiqueta, tipo: "text", placeholder });
const tel = (clave: string, etiqueta: string): CampoExtra => ({ clave, etiqueta, tipo: "tel" });
const sel = (clave: string, etiqueta: string, opciones: string[]): CampoExtra => ({ clave, etiqueta, tipo: "select", opciones });
const PAGO = sel("forma_pago", "Forma de pago", ["Efectivo", "Transferencia", "Nequi", "Daviplata", "Bre-B", "Tarjeta"]);

const F = (
  titulo: string, desc: string, ph: string, det: string, cont: string, monto: string, fecha: string, res: string,
  campos: CampoExtra[], preset?: string,
): FamiliaPropia => ({ titulo, desc, ph, det, cont, monto, fecha, res, campos, preset });

/** Familias de caja, proveedores, finanzas y cuentas para un negocio de comida. */
const familiasComida = (
  nombre: string, cajaDesc: string, mesaTxt: string, provDesc: string, ventasTxt: string,
): Record<string, FamiliaPropia> => ({
  caja: F(`Caja ${nombre}`, cajaDesc,
    "Movimiento de caja (apertura, cierre, cobro o gasto)", "Concepto, pedido, cajero del turno y soporte", "Cajero", "Valor (COP)", "Fecha", "Movimientos por revisar",
    [sel("tipo_mov", "Tipo de movimiento", ["Apertura", "Cierre", "Cobro de pedido", "Domicilio", "Gasto"]), t("pedido", "Número de pedido"), t("soporte", "Soporte o recibo"), PAGO]),
  proveedores: F(`Proveedores ${nombre}`, provDesc,
    "Proveedor o pedido de insumos", "Insumos, cantidades, plazo y factura", "Proveedor", "Valor del pedido o deuda (COP)", "Fecha de pago acordada", "Por pagar a proveedores",
    [t("nit", "NIT del proveedor"), sel("tipo", "Tipo de insumo", ["Ingredientes", "Empaques", "Bebidas", "Aseo y químicos", "Otro"]), t("factura", "Factura del proveedor"), sel("plazo", "Plazo de pago", ["Contado", "15 días", "30 días"])]),
  finanzas: F(`Ventas, costos y utilidad ${nombre}`, ventasTxt,
    "Registro financiero (mes)", "Ventas, costo de insumos, mano de obra y utilidad", "Administrador", "Utilidad (COP)", "Fecha de cierre", "Cierres pendientes",
    [t("ventas_mes", "Ventas del mes (COP)"), t("costo_insumos", "Costo de insumos (COP)"), t("nomina", "Nómina del periodo (COP)"), t("gastos", "Gastos fijos (COP)")]),
  cuentas: F(`Cuentas a crédito ${nombre}`, `Clientes con pedidos a crédito, abonos y saldos. ${mesaTxt}`,
    "Cuenta (cliente y pedido)", "Pedido, abonos recibidos y saldo", "Cliente", "Saldo pendiente (COP)", "Fecha de pago", "Saldos por cobrar",
    [tel("telefono", "Teléfono o WhatsApp"), t("pedido", "Número de pedido"), t("abonos", "Abonos recibidos (COP)"), PAGO]),
});

export const PROPIOS_OPERACION_6: Record<string, Record<string, FamiliaPropia>> = {
  rest: familiasComida("del restaurante",
    "Apertura y cierre de caja del restaurante, con cobros de mesa, domicilio y propinas del turno.",
    "Mesas y domicilios con crédito.",
    "Proveedores de alimentos, bebidas y empaques, con su pedido, factura y plazo de pago.",
    "Ingresos por mesa, domicilio y apps, costo de insumos, nómina y utilidad."),
  pan: familiasComida("de la panadería",
    "Apertura y cierre de caja de la panadería, con ventas de mostrador y encargos de tortas.",
    "Encargos y pedidos a crédito de clientes frecuentes.",
    "Proveedores de harina, azúcar, lácteos y empaques, con plazo de pago y factura.",
    "Ingresos por mostrador y encargos, costo de insumos y utilidad por producto."),
  cafe: familiasComida("de la cafetería",
    "Apertura y cierre de caja de la cafetería, con ventas de barra, mesas y cuentas abiertas.",
    "Cuentas abiertas y consumos a crédito.",
    "Proveedores de café, licores, lácteos y desechables, con plazo de pago y factura.",
    "Ingresos por barra y mesa, costo de bebidas y utilidad."),
  rapida: familiasComida("de comida rápida",
    "Apertura y cierre de caja del punto de venta, con cobros de pedidos, combos y domicilios.",
    "Pedidos a crédito y domicilios por cobrar.",
    "Proveedores de carnes, pan, empaques y bebidas, con su pedido y plazo.",
    "Ingresos por punto de venta y domicilio, costo de insumos y utilidad por combo."),
  cat: familiasComida("del catering",
    "Apertura y cierre de caja por evento, con anticipos y saldos de banquetes.",
    "Anticipos y saldos de eventos por cobrar.",
    "Proveedores de insumos, transporte y menaje para cada evento, con su factura.",
    "Ingresos por evento, costo de insumos y utilidad por banquete."),
};
