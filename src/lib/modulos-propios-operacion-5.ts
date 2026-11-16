import type { CampoExtra } from "@/lib/modulos-config";
import type { FamiliaPropia } from "@/lib/modulos-propios";

/**
 * Caja, proveedores, finanzas y cuentas por cobrar propias de la tienda de celulares, la papelería
 * y la tienda de moda.
 */

const t = (clave: string, etiqueta: string, placeholder?: string): CampoExtra => ({ clave, etiqueta, tipo: "text", placeholder });
const tel = (clave: string, etiqueta: string): CampoExtra => ({ clave, etiqueta, tipo: "tel" });
const sel = (clave: string, etiqueta: string, opciones: string[]): CampoExtra => ({ clave, etiqueta, tipo: "select", opciones });
const PAGO = sel("forma_pago", "Forma de pago", ["Efectivo", "Transferencia", "Nequi", "Daviplata", "Bre-B", "Tarjeta"]);

const F = (
  titulo: string, desc: string, ph: string, det: string, cont: string, monto: string, fecha: string, res: string,
  campos: CampoExtra[], preset?: string,
): FamiliaPropia => ({ titulo, desc, ph, det, cont, monto, fecha, res, campos, preset });

export const PROPIOS_OPERACION_5: Record<string, Record<string, FamiliaPropia>> = {
  // Tienda de celulares
  cel: {
    caja: F("Caja de la tienda de celulares", "Apertura y cierre de caja, con cobros de equipos, accesorios y reparaciones.",
      "Movimiento de caja (apertura, cierre, cobro o gasto)", "Equipo o reparación, IMEI si aplica, cajero del turno y soporte", "Cajero", "Valor (COP)", "Fecha", "Movimientos por revisar",
      [sel("tipo_mov", "Tipo de movimiento", ["Apertura", "Cierre", "Venta de equipo", "Cobro de reparación", "Venta de accesorio", "Gasto"]), t("imei", "IMEI del equipo"), t("soporte", "Factura o recibo"), PAGO]),
    proveedores: F("Proveedores de equipos y repuestos", "Distribuidores de celulares, accesorios y repuestos, con su pedido, garantía y plazo de pago.",
      "Proveedor o pedido de equipos", "Referencias, cantidades, garantía del proveedor y plazo", "Proveedor", "Valor del pedido o deuda (COP)", "Fecha de pago acordada", "Por pagar a proveedores",
      [t("nit", "NIT del proveedor"), sel("tipo", "Tipo", ["Equipos", "Accesorios", "Repuestos", "Garantía con proveedor", "Otro"]), t("factura", "Factura del proveedor"), sel("plazo", "Plazo de pago", ["Contado", "15 días", "30 días", "60 días"])]),
    finanzas: F("Ventas, márgenes y utilidad de la tienda", "Ventas de equipos, accesorios y reparaciones, con costo, margen y utilidad.",
      "Registro financiero (mes)", "Ingresos por línea, costos, comisiones y utilidad", "Administrador", "Utilidad (COP)", "Fecha de cierre", "Cierres pendientes",
      [t("equipos_vendidos", "Equipos vendidos"), t("reparaciones", "Reparaciones entregadas"), t("costo_equipos", "Costo de equipos (COP)"), t("gastos", "Gastos fijos (COP)")]),
    cuentas: F("Clientes con equipo a crédito", "Equipos vendidos a cuotas o con saldo pendiente, con abonos y fecha de pago.",
      "Cuenta (cliente y equipo)", "Equipo, cuotas, abonos recibidos y saldo", "Cliente", "Saldo pendiente (COP)", "Próxima cuota", "Saldos por cobrar",
      [tel("telefono", "Teléfono o WhatsApp"), t("imei", "IMEI del equipo"), t("abonos", "Abonos recibidos (COP)"), PAGO]),
  },
  // Papelería, útiles y copias
  papel: {
    caja: F("Caja de la papelería", "Apertura y cierre de caja, con cobros de útiles, copias e impresiones.",
      "Movimiento de caja (apertura, cierre, cobro o gasto)", "Concepto, cliente, cajero del turno y soporte", "Cajero", "Valor (COP)", "Fecha", "Movimientos por revisar",
      [sel("tipo_mov", "Tipo de movimiento", ["Apertura", "Cierre", "Venta de útiles", "Copias e impresiones", "Pedido de colegio", "Gasto"]), t("soporte", "Factura o recibo"), PAGO]),
    proveedores: F("Editoriales y distribuidores de útiles", "Editoriales, distribuidores de cuadernos, libros y papelería, con pedidos y plazo de pago.",
      "Proveedor o pedido de útiles", "Referencias, cantidades, descuento por volumen y plazo", "Proveedor", "Valor del pedido o deuda (COP)", "Fecha de pago acordada", "Por pagar a proveedores",
      [t("nit", "NIT del proveedor"), sel("tipo", "Tipo", ["Editorial", "Útiles escolares", "Oficina", "Arte y dibujo", "Otro"]), t("factura", "Factura del proveedor"), sel("plazo", "Plazo de pago", ["Contado", "30 días", "60 días"])]),
    finanzas: F("Ventas por temporada y utilidad", "Ventas de útiles, copias y pedidos de colegios, con margen y utilidad por temporada escolar.",
      "Registro financiero (mes o temporada)", "Ingresos por línea, costos, comisiones y utilidad", "Administrador", "Utilidad (COP)", "Fecha de cierre", "Cierres pendientes",
      [t("copias_mes", "Copias e impresiones del mes"), t("ventas_temporada", "Ventas de temporada (COP)"), t("costo_mercancia", "Costo de mercancía (COP)"), t("gastos", "Gastos fijos (COP)")]),
    cuentas: F("Colegios y empresas a crédito", "Pedidos de útiles a crédito para colegios y empresas, con abonos y saldo.",
      "Cuenta (colegio o empresa y pedido)", "Pedido, fecha de entrega, abonos y saldo", "Contacto", "Saldo pendiente (COP)", "Fecha de pago", "Saldos por cobrar",
      [tel("telefono", "Teléfono o WhatsApp"), t("pedido", "Número de pedido"), t("abonos", "Abonos recibidos (COP)"), PAGO]),
  },
  // Tienda de moda y calzado
  moda: {
    caja: F("Caja de la tienda de moda", "Apertura y cierre de caja, con ventas de prendas y calzado, apartados y cambios.",
      "Movimiento de caja (apertura, cierre, venta o gasto)", "Prenda o calzado, talla, cajero del turno y soporte", "Cajero", "Valor (COP)", "Fecha", "Movimientos por revisar",
      [sel("tipo_mov", "Tipo de movimiento", ["Apertura", "Cierre", "Venta", "Apartado", "Abono de apartado", "Gasto"]), t("talla", "Talla y color"), t("soporte", "Factura o tiquete"), PAGO]),
    proveedores: F("Proveedores de marcas y calzado", "Marcas, distribuidores y fábricas de ropa y calzado, con su temporada, pedido y plazo.",
      "Proveedor o pedido de temporada", "Marca, colección, tallas, cantidades y plazo", "Proveedor", "Valor del pedido o deuda (COP)", "Fecha de pago acordada", "Por pagar a proveedores",
      [t("nit", "NIT del proveedor"), t("marca", "Marca o colección"), t("factura", "Factura del proveedor"), sel("plazo", "Plazo de pago", ["Contado", "30 días", "60 días", "90 días"])]),
    finanzas: F("Ventas por temporada y utilidad", "Ventas de prendas y calzado por temporada, margen de cada colección y utilidad.",
      "Registro financiero (mes o temporada)", "Ingresos por colección, costos, comisiones y utilidad", "Administrador", "Utilidad (COP)", "Fecha de cierre", "Cierres pendientes",
      [t("prendas_vendidas", "Prendas vendidas"), t("costo_mercancia", "Costo de mercancía (COP)"), t("comisiones", "Comisiones pagadas (COP)"), t("gastos", "Gastos fijos (COP)")]),
    cuentas: F("Apartados y crédito de clientas", "Prendas apartadas a crédito o en plan separe, con abonos y fecha límite.",
      "Apartado (clienta y prenda)", "Prenda, talla, abonos y fecha límite", "Clienta", "Saldo pendiente (COP)", "Fecha límite del apartado", "Apartados por cerrar",
      [tel("telefono", "Teléfono o WhatsApp"), t("prenda", "Prenda y talla apartada"), t("abonos", "Abonos recibidos (COP)"), PAGO]),
  },
};
