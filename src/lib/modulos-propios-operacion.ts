import type { CampoExtra } from "@/lib/modulos-config";
import type { FamiliaPropia } from "@/lib/modulos-propios";

/**
 * Caja, proveedores, finanzas, cuentas por cobrar, agenda y clientes PROPIOS de cada negocio
 * (ferretería, supermercado, carnicería, licorera, floristería, óptica, guardería, alquiler de vehículos,
 * seguridad y aseo, ganadería, fundación e iglesia). Cada uno con su vocabulario y sus formularios.
 */

export const t = (clave: string, etiqueta: string): CampoExtra => ({ clave, etiqueta, tipo: "text" });
export const tel = (clave: string, etiqueta: string): CampoExtra => ({ clave, etiqueta, tipo: "tel" });
export const em = (clave: string, etiqueta: string): CampoExtra => ({ clave, etiqueta, tipo: "email" });
export const d = (clave: string, etiqueta: string): CampoExtra => ({ clave, etiqueta, tipo: "date" });
export const sel = (clave: string, etiqueta: string, opciones: string[]): CampoExtra => ({ clave, etiqueta, tipo: "select", opciones });

const MEDIOS = ["Efectivo", "Nequi", "Daviplata", "Bre-B", "Transferencia", "Tarjeta"];

const F = (
  titulo: string, desc: string, ph: string, det: string, cont: string, monto: string, fecha: string, res: string,
  campos: CampoExtra[],
): FamiliaPropia => ({ titulo, desc, ph, det, cont, monto, fecha, res, campos });

export const caja = (titulo: string, desc: string, ph: string, det: string, tipos: string[], extra: CampoExtra[]): FamiliaPropia =>
  F(titulo, desc, ph, det, "Cajero responsable", "Valor (COP)", "Fecha del movimiento", "Movimientos por revisar",
    [sel("tipo_mov", "Tipo de movimiento", tipos), sel("medio", "Medio de pago", MEDIOS), t("responsable", "Responsable del turno"), ...extra, t("soporte", "Soporte o comprobante")]);

export const prov = (titulo: string, desc: string, ph: string, det: string, extra: CampoExtra[]): FamiliaPropia =>
  F(titulo, desc, ph, det, "Proveedor", "Valor del pedido o deuda (COP)", "Fecha de pago acordada", "Por pagar a proveedores",
    [t("nit", "NIT del proveedor"), tel("telefono", "Teléfono o WhatsApp"), ...extra, sel("condicion", "Condición de pago", ["Contado", "8 días", "15 días", "30 días", "45 días"]), t("factura", "Factura del proveedor")]);

export const fin = (titulo: string, desc: string, ph: string, det: string, conceptos: string[], extra: CampoExtra[]): FamiliaPropia =>
  F(titulo, desc, ph, det, "Responsable", "Valor (COP)", "Fecha del registro", "Registros del periodo",
    [sel("clase", "Clase", ["Ingreso", "Costo", "Gasto", "Impuesto", "Inversión"]), sel("concepto", "Concepto", conceptos), ...extra, sel("periodo", "Periodo", ["Semana", "Mes", "Trimestre", "Año"])]);

export const cta = (titulo: string, desc: string, ph: string, det: string, extra: CampoExtra[]): FamiliaPropia =>
  F(titulo, desc, ph, det, "Deudor", "Saldo por cobrar (COP)", "Fecha prometida de pago", "Cuentas por cobrar",
    [t("documento", "Documento o NIT"), tel("telefono", "Teléfono o WhatsApp"), t("factura", "Factura o remisión"), ...extra, sel("estado_cobro", "Gestión de cobro", ["Al día", "Recordatorio enviado", "Llamada hecha", "Promesa de pago", "Cobro jurídico"])]);

export const agd = (titulo: string, desc: string, ph: string, det: string, cont: string, extra: CampoExtra[]): FamiliaPropia =>
  F(titulo, desc, ph, det, cont, "Valor estimado (COP)", "Fecha y hora", "Citas por atender",
    [tel("telefono", "Teléfono o WhatsApp"), t("hora", "Hora"), ...extra, sel("confirmacion", "Confirmación", ["Pendiente", "Confirmada", "Reprogramada", "Cancelada"])]);

const cli = (titulo: string, desc: string, ph: string, det: string, cont: string, monto: string, res: string, extra: CampoExtra[]): FamiliaPropia =>
  F(titulo, desc, ph, det, cont, monto, "Último contacto", res,
    [t("documento", "Documento"), tel("telefono", "Teléfono o WhatsApp"), em("correo", "Correo electrónico"), t("direccion", "Dirección o barrio"), ...extra,
      sel("seguimiento", "Seguimiento", ["Nuevo", "En contacto", "Interesado", "Cliente activo", "Inactivo"])]);

export const PROPIOS_OPERACION: Record<string, Record<string, FamiliaPropia>> = {
  ferr: {
    caja: caja("Caja del mostrador y bodega", "Apertura, cierre, abonos de obra, gastos de despacho y consignaciones del día.",
      "Movimiento (concepto y caja)", "Abono de obra, flete pagado, cierre y diferencias", ["Apertura", "Venta de mostrador", "Abono de obra", "Pago de flete", "Gasto de bodega", "Consignación", "Cierre"], [t("caja", "Caja o mostrador"), t("diferencia", "Diferencia al cierre (COP)")]),
    proveedores: prov("Proveedores de materiales y fábricas", "Cementeras, ferreterías mayoristas y distribuidores, con pedidos y deuda.",
      "Proveedor o pedido de materiales", "Referencias, cantidades, descuento por volumen y fecha de entrega", [sel("rubro", "Rubro", ["Cemento y concreto", "Hierro y acero", "Tubería y sanitario", "Eléctrico", "Pinturas", "Herramienta", "Acabados"]), t("descuento", "Descuento por volumen (%)")]),
    finanzas: fin("Margen y rentabilidad por línea", "Ventas, costos y utilidad por línea de materiales y por obra atendida.",
      "Registro (línea y periodo)", "Ventas, costo de reposición, margen y fletes", ["Venta de materiales", "Costo de mercancía", "Flete", "Arriendo del local", "Nómina", "Servicios públicos", "Impuestos"], [sel("linea", "Línea", ["Cemento", "Hierro", "Pinturas", "Eléctrico", "Plomería", "Herramienta", "Acabados"]), t("margen", "Margen (%)")]),
    cuentas: cta("Cartera de constructores y obras", "Saldos por cobrar a maestros y constructoras, con obra, corte y cupo.",
      "Cuenta (cliente y obra)", "Facturas pendientes, corte de cartera, cupo usado y promesa de pago", [t("obra", "Obra"), t("cupo", "Cupo de crédito (COP)"), sel("corte", "Corte de cartera", ["Semanal", "Quincenal", "Mensual"])]),
  },
  super: {
    clientes: cli("Clientes y hogares del barrio", "Clientes frecuentes, tiendas y empresas que compran, con domicilio y crédito.",
      "Cliente (nombre o tienda)", "Preferencias, domicilios frecuentes, cupo y observaciones", "Cliente", "Compra promedio (COP)", "Clientes frecuentes",
      [sel("tipo_cliente", "Tipo de cliente", ["Hogar", "Tienda de barrio", "Restaurante", "Empresa", "Institución"]), sel("canal", "Canal habitual", ["Mostrador", "Domicilio", "WhatsApp"]), t("dia_compra", "Día de mercado")]),
    caja: caja("Cajas registradoras y arqueo", "Apertura y cierre por caja, arqueo, retiros parciales y faltantes o sobrantes.",
      "Movimiento (caja y concepto)", "Base inicial, retiro parcial, arqueo y diferencia", ["Apertura de caja", "Retiro parcial", "Arqueo", "Gasto menor", "Consignación", "Cierre de caja"], [t("caja", "Caja registradora"), t("base", "Base inicial (COP)"), t("diferencia", "Faltante o sobrante (COP)")]),
    proveedores: prov("Proveedores y visitadores", "Distribuidores de lácteos, abarrotes, aseo y bebidas, con día de visita y pedido mínimo.",
      "Proveedor o pedido", "Productos, pedido mínimo, día de visita y devoluciones", [sel("categoria", "Categoría", ["Lácteos", "Abarrotes", "Aseo", "Bebidas", "Frutas y verduras", "Carnes", "Panadería"]), sel("dia_visita", "Día de visita", ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]), t("pedido_minimo", "Pedido mínimo (COP)")]),
    finanzas: fin("Rentabilidad por sección", "Ventas, costos, mermas y utilidad de cada sección del supermercado.",
      "Registro (sección y periodo)", "Ventas, costo, merma y margen por sección", ["Ventas de caja", "Costo de mercancía", "Mermas", "Arriendo", "Nómina", "Servicios públicos", "Impuestos"], [sel("seccion", "Sección", ["Cajas", "Lácteos", "Frutas y verduras", "Carnes", "Aseo", "Abarrotes", "Panadería"]), t("margen", "Margen (%)")]),
    cuentas: cta("Fiados de clientes y empresas", "Compras a crédito de clientes, tiendas y empresas con fecha de pago.",
      "Cuenta (cliente y concepto)", "Compras a crédito, abonos y fecha de pago", [sel("tipo_cliente", "Tipo de cliente", ["Hogar", "Tienda", "Empresa", "Institución"]), t("cupo", "Cupo de crédito (COP)")]),
  },
  carn: {
    clientes: cli("Clientes por peso y mayoristas", "Hogares, restaurantes y tiendas con sus cortes preferidos y pedidos fijos.",
      "Cliente (hogar, restaurante o tienda)", "Cortes preferidos, pedido fijo semanal y hora de entrega", "Cliente", "Compra semanal (COP)", "Clientes activos",
      [sel("tipo_cliente", "Tipo de cliente", ["Hogar", "Restaurante", "Tienda", "Institución", "Evento"]), t("corte_favorito", "Corte o producto favorito"), t("pedido_fijo", "Pedido fijo (kilos por semana)")]),
    caja: caja("Caja del mostrador y báscula", "Ventas por peso, cierre de caja, gastos de abasto y consignaciones.",
      "Movimiento (concepto y turno)", "Ventas por peso, gasto de abasto y diferencia al cierre", ["Apertura", "Venta por peso", "Pago de abasto o plaza", "Gasto del día", "Consignación", "Cierre"], [t("kilos_vendidos", "Kilos vendidos en el turno"), t("diferencia", "Diferencia al cierre (COP)")]),
    proveedores: prov("Frigoríficos, plazas y pescadores", "Proveedores de carne, pollo, pescado y fruver, con precio por kilo y guía sanitaria.",
      "Proveedor o compra de abasto", "Producto, kilos comprados, precio por kilo y guía sanitaria", [sel("producto", "Producto", ["Res", "Cerdo", "Pollo", "Pescado", "Frutas y verduras", "Embutidos"]), t("precio_kilo", "Precio por kilo (COP)"), t("guia", "Guía o certificado sanitario")]),
    finanzas: fin("Rendimiento y utilidad por corte", "Costo por kilo, rendimiento, merma y utilidad por tipo de corte.",
      "Registro (producto y periodo)", "Kilos comprados, kilos vendidos, merma y utilidad", ["Venta por peso", "Compra de abasto", "Merma", "Refrigeración y energía", "Nómina", "Arriendo", "Impuestos"], [t("rendimiento", "Rendimiento del corte (%)"), t("utilidad_kilo", "Utilidad por kilo (COP)")]),
    cuentas: cta("Cartera de restaurantes y mayoristas", "Saldos de restaurantes, tiendas e instituciones que compran a crédito.",
      "Cuenta (cliente y pedido)", "Pedidos a crédito, abonos y día de pago", [sel("tipo_cliente", "Tipo de cliente", ["Restaurante", "Tienda", "Institución", "Hogar"]), t("dia_pago", "Día de pago acordado")]),
  },
  licor: {
    clientes: cli("Clientes y fiestas", "Clientes frecuentes, organizadores de eventos y bares, con su marca favorita.",
      "Cliente (persona, bar o evento)", "Marca favorita, ocasión, domicilios y observaciones", "Cliente", "Compra promedio (COP)", "Clientes frecuentes",
      [sel("tipo_cliente", "Tipo de cliente", ["Particular", "Bar o restaurante", "Organizador de eventos", "Empresa"]), t("marca", "Marca favorita"), d("cumple", "Cumpleaños")]),
    caja: caja("Caja nocturna y domicilios", "Cierre por turno de día o noche, cobros de domicilios y retiros.",
      "Movimiento (turno y concepto)", "Turno, cobros de domicilios, retiro y cierre", ["Apertura", "Venta de mostrador", "Cobro de domicilio", "Retiro", "Gasto", "Consignación", "Cierre"], [sel("turno", "Turno", ["Día", "Noche", "Fin de semana"]), t("diferencia", "Diferencia al cierre (COP)")]),
    proveedores: prov("Distribuidores de licores y cervezas", "Distribuidoras, licoreras departamentales y mayoristas, con impuesto al consumo.",
      "Proveedor o pedido de licores", "Referencias, cajas, estampilla y condiciones", [sel("rubro", "Rubro", ["Cerveza", "Aguardiente", "Ron", "Whisky", "Vino", "Gaseosas y mezcladores", "Cigarrillos"]), t("cajas", "Cajas pedidas"), t("estampilla", "Estampilla o impuesto al consumo")]),
    finanzas: fin("Margen por marca y categoría", "Ventas, costos, impuestos al consumo y utilidad por categoría.",
      "Registro (categoría y periodo)", "Ventas, costo, impuesto al consumo y margen", ["Venta de licores", "Costo de mercancía", "Impuesto al consumo", "Domicilios", "Nómina", "Arriendo", "Permisos"], [sel("categoria", "Categoría", ["Cerveza", "Aguardiente", "Ron", "Whisky", "Vino", "Combos"]), t("margen", "Margen (%)")]),
    cuentas: cta("Fiados y cuentas de eventos", "Saldos de clientes de confianza, bares y eventos pendientes de pago.",
      "Cuenta (cliente o evento)", "Consumo a crédito, abonos y fecha de pago", [sel("tipo_cliente", "Tipo de cliente", ["Particular", "Bar", "Evento", "Empresa"]), t("evento", "Evento asociado")]),
  },
  flor: {
    clientes: cli("Clientes y destinatarios especiales", "Quién envía flores, a quién y en qué fechas, con recordatorio de ocasiones.",
      "Cliente (quien envía)", "Fechas importantes, destinatarios frecuentes, gustos y dirección de entrega", "Cliente", "Gasto anual (COP)", "Clientes con fechas próximas",
      [sel("tipo_cliente", "Tipo de cliente", ["Particular", "Empresa", "Funeraria", "Evento", "Hotel o restaurante"]), t("destinatario", "Destinatario frecuente"), d("fecha_especial", "Próxima fecha especial"), t("flor_favorita", "Flor favorita")]),
    caja: caja("Caja del local y entregas", "Cobros de arreglos, anticipos de encargos, gastos de transporte y cierre.",
      "Movimiento (concepto y turno)", "Arreglo cobrado, anticipo, transporte y cierre", ["Apertura", "Venta de arreglo", "Anticipo de encargo", "Gasto de transporte", "Compra de flores", "Consignación", "Cierre"], [t("encargo", "Encargo relacionado"), t("diferencia", "Diferencia al cierre (COP)")]),
    proveedores: prov("Cultivadores y mayoristas de flores", "Floricultores, Corabastos y proveedores de insumos, con día de llegada de flor.",
      "Proveedor o compra de flores", "Tipo de flor, tallos, precio por tallo y día de llegada", [sel("rubro", "Rubro", ["Rosas", "Claveles", "Follaje", "Flores exóticas", "Insumos y floral foam", "Cajas y empaques", "Peluches y regalos"]), t("precio_tallo", "Precio por tallo (COP)"), t("dia_llegada", "Día de llegada")]),
    finanzas: fin("Rentabilidad por arreglo y temporada", "Costo de flores, mano de obra, mermas y utilidad por arreglo y fecha especial.",
      "Registro (arreglo o temporada)", "Costo de flores, armado, merma y utilidad", ["Venta de arreglos", "Compra de flores", "Merma de flores", "Mano de obra", "Transporte", "Arriendo", "Publicidad"], [sel("temporada", "Temporada", ["Normal", "San Valentín", "Día de la Madre", "Amor y Amistad", "Navidad", "Grados"]), t("margen", "Margen (%)")]),
  },
  optica: {
    caja: caja("Caja de la óptica", "Cobros de exámenes, anticipos de lentes, saldos de entrega y cierre.",
      "Movimiento (concepto y turno)", "Anticipo, saldo de entrega, examen cobrado y cierre", ["Apertura", "Cobro de examen", "Anticipo de lentes", "Saldo de entrega", "Pago al laboratorio", "Gasto", "Cierre"], [t("pedido", "Pedido o fórmula asociada"), t("diferencia", "Diferencia al cierre (COP)")]),
    proveedores: prov("Laboratorios, monturas y lentes", "Laboratorios ópticos, distribuidores de monturas y de lentes de contacto.",
      "Proveedor o pedido", "Tipo de lente, tratamiento, marca de montura y fecha de entrega", [sel("rubro", "Rubro", ["Laboratorio de lentes", "Monturas", "Lentes de contacto", "Líquidos y accesorios", "Equipos de optometría"]), t("tiempo_entrega", "Tiempo de entrega (días)")]),
    finanzas: fin("Rentabilidad por lente y montura", "Ventas, costo de laboratorio, margen de monturas y utilidad por optómetra.",
      "Registro (concepto y periodo)", "Ventas, costo de laboratorio y utilidad por tipo de producto", ["Venta de lentes", "Venta de monturas", "Exámenes", "Costo de laboratorio", "Comisiones", "Arriendo", "Impuestos"], [sel("producto", "Producto", ["Lente monofocal", "Lente progresivo", "Lente de contacto", "Montura", "Examen"]), t("margen", "Margen (%)")]),
    cuentas: cta("Saldos de lentes por cobrar", "Anticipos recibidos y saldos de pedidos pendientes de entrega o pago.",
      "Cuenta (cliente y pedido)", "Valor del pedido, anticipo, saldo y fecha de entrega", [t("pedido", "Pedido al laboratorio"), t("anticipo", "Anticipo recibido (COP)"), d("entrega", "Fecha de entrega")]),
  },
  guard: {
    clientes: cli("Acudientes y familias", "Padres y acudientes con sus hijos, contactos de emergencia y estado de pensión.",
      "Acudiente (nombre y niño)", "Hijos inscritos, contactos de emergencia, EPS y observaciones", "Acudiente", "Pensión mensual (COP)", "Familias activas",
      [t("nino", "Niño o niña"), t("parentesco", "Parentesco"), t("emergencia", "Contacto de emergencia"), t("trabajo", "Lugar de trabajo")]),
    caja: caja("Caja de pensiones y matrículas", "Recaudo diario de pensiones, matrículas, transporte y alimentación.",
      "Movimiento (concepto y niño)", "Pensión, matrícula, transporte o gasto del día", ["Apertura", "Pensión", "Matrícula", "Transporte", "Alimentación", "Gasto de material", "Consignación", "Cierre"], [t("nino", "Niño o niña"), t("recibo", "Recibo expedido")]),
    finanzas: fin("Ingresos y costos de la guardería", "Pensiones recibidas, nómina de docentes, alimentación y costos por grupo.",
      "Registro (concepto y periodo)", "Ingresos por pensiones, nómina, alimentación y material didáctico", ["Pensiones", "Matrículas", "Nómina docente", "Alimentación", "Material didáctico", "Arriendo", "Servicios públicos", "Seguros"], [sel("grupo", "Grupo", ["Sala cuna", "Caminadores", "Párvulos", "Pre-jardín", "Jardín"]), t("cupos", "Cupos ocupados")]),
    agenda: agd("Agenda de la guardería", "Reuniones con acudientes, matrículas, actos, simulacros y salidas pedagógicas.",
      "Evento (tipo y grupo)", "Asunto, grupo, acudientes citados y recordatorios", "Responsable",
      [sel("tipo_evento", "Tipo de evento", ["Reunión de acudientes", "Visita de matrícula", "Acto o celebración", "Salida pedagógica", "Simulacro", "Vacunación o salud"]), sel("grupo", "Grupo", ["Todos", "Sala cuna", "Caminadores", "Párvulos", "Jardín"])]),
  },
  alq: {
    caja: caja("Caja de alquileres y depósitos", "Cobro de alquileres, depósitos en garantía, devoluciones y gastos de lavado.",
      "Movimiento (placa y concepto)", "Alquiler cobrado, depósito, devolución y cobros extra", ["Apertura", "Cobro de alquiler", "Depósito en garantía", "Devolución de depósito", "Cobro extra", "Gasto de lavado o combustible", "Cierre"], [t("placa", "Placa del vehículo"), t("contrato", "Contrato asociado")]),
    proveedores: prov("Talleres, aseguradoras y concesionarios", "Talleres, aseguradoras, lavaderos y concesionarios que atienden la flota.",
      "Proveedor o servicio", "Servicio prestado, placa atendida y valor", [sel("rubro", "Rubro", ["Taller mecánico", "Seguros y SOAT", "Lavadero", "Llantas", "Combustible", "Concesionario", "Grúa"]), t("placa", "Placa atendida")]),
    finanzas: fin("Rentabilidad por vehículo y flota", "Ingresos por alquiler, costos de mantenimiento, seguros y utilidad por vehículo.",
      "Registro (vehículo y periodo)", "Días alquilados, ingreso, mantenimiento y utilidad por placa", ["Ingreso por alquiler", "Mantenimiento", "Seguros y SOAT", "Impuesto vehicular", "Combustible", "Lavado", "Depreciación", "Nómina"], [t("placa", "Placa del vehículo"), t("dias_alquilados", "Días alquilados"), t("ocupacion", "Ocupación (%)")]),
    cuentas: cta("Cobros pendientes a arrendatarios", "Alquileres sin pagar, multas trasladadas y daños por cobrar.",
      "Cuenta (cliente y placa)", "Contrato, concepto del saldo, multas o daños por cobrar", [t("placa", "Placa del vehículo"), sel("concepto", "Concepto", ["Alquiler", "Multa trasladada", "Daños", "Combustible faltante", "Kilometraje extra"]), t("contrato", "Contrato")]),
  },
  seg: {
    caja: caja("Caja y cuentas de cobro de la empresa", "Recaudos de contratos, pagos de dotación, nómina y gastos operativos.",
      "Movimiento (concepto y contrato)", "Recaudo del contrato, gasto operativo o pago de nómina", ["Apertura", "Recaudo de contrato", "Pago de dotación", "Pago de nómina", "Gasto operativo", "Consignación", "Cierre"], [t("contrato", "Contrato o cliente"), t("puesto", "Puesto asociado")]),
    proveedores: prov("Proveedores de dotación y equipos", "Uniformes, radios, insumos de aseo y equipos de vigilancia.",
      "Proveedor o pedido", "Dotación, insumos de aseo, equipos y fecha de entrega", [sel("rubro", "Rubro", ["Uniformes y botas", "Radios y comunicaciones", "Insumos de aseo", "Maquinaria de limpieza", "Armamento y licencias", "Capacitación"]), t("entrega", "Fecha de entrega prevista")]),
    finanzas: fin("Rentabilidad por contrato y puesto", "Valor del contrato, costo de personal, recargos, dotación y utilidad por puesto.",
      "Registro (contrato y periodo)", "Ingreso mensual, nómina, recargos, dotación y utilidad", ["Ingreso por contrato", "Nómina y recargos", "Seguridad social", "Dotación", "Supervisión", "Administración", "Impuestos"], [t("contrato", "Contrato o cliente"), t("utilidad_puesto", "Utilidad por puesto (COP)"), t("ausentismo", "Ausentismo (%)")]),
    cuentas: cta("Cartera por contratos y facturas", "Facturas mensuales de clientes pendientes de pago, con interventor y vencimiento.",
      "Cuenta (cliente y contrato)", "Factura mensual, retenciones, novedades descontadas y plazo", [t("contrato", "Contrato"), t("interventor", "Interventor o supervisor del cliente"), sel("plazo", "Plazo de pago", ["15 días", "30 días", "45 días", "60 días"])]),
  },
  gan: {
    caja: caja("Caja de la finca", "Ventas de leche, huevos o ganado, pagos de jornales y gastos del día.",
      "Movimiento (concepto y lote)", "Venta de producción, jornales, concentrado o veterinario", ["Apertura", "Venta de leche", "Venta de huevos", "Venta de ganado o carne", "Pago de jornales", "Compra de concentrado", "Gasto veterinario", "Cierre"], [t("lote", "Lote o potrero"), t("cantidad", "Cantidad (litros, unidades o kilos)")]),
    proveedores: prov("Proveedores de concentrado y veterinarios", "Casas de concentrado, droguerías veterinarias, semen y servicios del campo.",
      "Proveedor o pedido", "Concentrado, sal, medicinas, bultos y fecha de entrega", [sel("rubro", "Rubro", ["Concentrado", "Sal y suplementos", "Medicinas veterinarias", "Semen y genética", "Cercas e infraestructura", "Transporte de animales"]), t("bultos", "Bultos o cantidad pedida")]),
    finanzas: fin("Costos y rentabilidad por lote", "Costo de alimentación y sanidad contra producción y ventas de cada lote.",
      "Registro (lote y periodo)", "Costo de alimentación, sanidad, producción vendida y utilidad", ["Venta de producción", "Alimentación", "Sanidad y vacunas", "Jornales", "Mantenimiento de cercas", "Transporte", "Impuesto predial"], [t("lote", "Lote o galpón"), t("costo_unidad", "Costo por litro, huevo o kilo (COP)")]),
    cuentas: cta("Cartera de compradores de la finca", "Saldos de frigoríficos, acopiadores y tiendas que compran la producción.",
      "Cuenta (comprador y producto)", "Producción entregada, precio pactado, saldo y fecha de pago", [sel("producto", "Producto entregado", ["Leche", "Huevos", "Carne", "Animales en pie", "Lana o miel"]), t("entregas", "Entregas pendientes de pago")]),
  },
  fund: {
    clientes: cli("Donantes y aliados", "Personas, empresas y entidades que aportan, con su historial de donaciones.",
      "Donante o aliado", "Historial de aportes, intereses, certificados y contactos", "Donante", "Total donado (COP)", "Donantes activos",
      [sel("tipo_donante", "Tipo de donante", ["Persona natural", "Empresa", "Fundación aliada", "Entidad pública", "Cooperación internacional"]), t("interes", "Proyecto de interés"), sel("certificado", "Certificado de donación", ["Pendiente", "Entregado", "No requiere"])]),
    caja: caja("Caja y bancos de la fundación", "Ingresos por donaciones, gastos de proyectos, legalizaciones y caja menor.",
      "Movimiento (proyecto y concepto)", "Donación recibida, gasto del proyecto y soporte", ["Apertura de caja menor", "Donación recibida", "Gasto de proyecto", "Legalización de gastos", "Consignación", "Cierre"], [t("proyecto", "Proyecto asociado"), t("rubro", "Rubro presupuestal")]),
    proveedores: prov("Proveedores y contratistas de proyectos", "Quienes prestan servicios o venden insumos a los proyectos de la fundación.",
      "Proveedor o contratista", "Servicio, proyecto que lo paga y soportes exigidos", [t("proyecto", "Proyecto que lo paga"), sel("rubro", "Rubro", ["Alimentación", "Logística de eventos", "Material educativo", "Honorarios profesionales", "Transporte", "Dotación"]), t("soportes", "Soportes entregados")]),
    finanzas: fin("Ejecución presupuestal por proyecto", "Presupuesto, ejecución, saldo y gastos por proyecto y financiador.",
      "Registro (proyecto y rubro)", "Presupuesto aprobado, ejecutado y saldo", ["Donaciones", "Subvención", "Gastos de proyecto", "Gastos administrativos", "Honorarios", "Impuestos y retenciones"], [t("proyecto", "Proyecto"), t("financiador", "Financiador"), t("saldo", "Saldo disponible (COP)")]),
    agenda: agd("Agenda de actividades y entregas", "Jornadas con beneficiarios, reuniones con financiadores, informes y eventos de recaudo.",
      "Actividad (proyecto y fecha)", "Lugar, beneficiarios, voluntarios necesarios y recursos", "Responsable",
      [sel("tipo_actividad", "Tipo de actividad", ["Jornada con beneficiarios", "Reunión con financiador", "Entrega de informe", "Evento de recaudo", "Capacitación", "Visita de campo"]), t("proyecto", "Proyecto"), t("voluntarios", "Voluntarios necesarios")]),
  },
  igl: {
    caja: caja("Tesorería y caja de la iglesia", "Ingresos de cultos, diezmos en efectivo, gastos de ministerios y consignaciones.",
      "Movimiento (culto y concepto)", "Ofrenda del culto, gasto de ministerio y soporte", ["Apertura", "Ofrenda de culto", "Diezmos en efectivo", "Gasto de ministerio", "Pago de servicios", "Consignación", "Cierre"], [t("culto", "Culto o evento"), t("conteo", "Contado por (dos personas)")]),
    proveedores: prov("Proveedores y servicios de la comunidad", "Sonido, mantenimiento, papelería, alimentación de eventos y servicios del templo.",
      "Proveedor o servicio", "Servicio, ministerio que lo solicita y valor", [t("ministerio", "Ministerio que lo solicita"), sel("rubro", "Rubro", ["Sonido y audiovisuales", "Mantenimiento del templo", "Papelería y material", "Alimentación de eventos", "Instrumentos", "Servicios públicos"])]),
    finanzas: fin("Presupuesto y ejecución de la comunidad", "Ingresos por aportes, gastos por ministerio y presupuesto anual.",
      "Registro (ministerio y periodo)", "Ingresos, gastos por ministerio y saldo", ["Diezmos", "Ofrendas", "Pactos", "Gastos de ministerio", "Misiones y ayuda social", "Servicios públicos", "Mantenimiento", "Salarios"], [t("ministerio", "Ministerio o área"), t("presupuesto", "Presupuesto asignado (COP)")]),
    agenda: agd("Agenda de cultos y actividades", "Cultos, reuniones de grupos, bautizos, matrimonios, retiros y uso de salones.",
      "Actividad (tipo y ministerio)", "Lugar, responsable, personas esperadas y necesidades", "Responsable",
      [sel("tipo_actividad", "Tipo de actividad", ["Culto", "Reunión de grupo", "Bautizo", "Matrimonio", "Retiro", "Ensayo", "Reserva de salón", "Capacitación"]), t("ministerio", "Ministerio"), t("lugar", "Salón o lugar")]),
  },
};
