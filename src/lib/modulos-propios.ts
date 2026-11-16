import type { CampoExtra, ConfigModulo } from "@/lib/modulos-config";
import { PROPIOS_OPERACION } from "@/lib/modulos-propios-operacion";
import { PROPIOS_OPERACION_2 } from "@/lib/modulos-propios-operacion-2";
import { PROPIOS_OPERACION_3 } from "@/lib/modulos-propios-operacion-3";
import { PROPIOS_OPERACION_4 } from "@/lib/modulos-propios-operacion-4";
import { PROPIOS_OPERACION_5 } from "@/lib/modulos-propios-operacion-5";
import { PROPIOS_OPERACION_6 } from "@/lib/modulos-propios-operacion-6";

/**
 * Módulos propios (clientes, facturación, pagos, personal, metas, puntos...) de los negocios que antes
 * compartían módulos genéricos: ferretería, supermercado, carnicería, licorera, floristería, óptica,
 * guardería, alquiler de vehículos, seguridad y aseo, ganadería, fundaciones e iglesias.
 * Cada negocio tiene sus propios nombres, textos, formularios y datos a capturar.
 */

const t = (clave: string, etiqueta: string, placeholder?: string): CampoExtra => ({ clave, etiqueta, tipo: "text", placeholder });
const tel = (clave: string, etiqueta: string): CampoExtra => ({ clave, etiqueta, tipo: "tel" });
const em = (clave: string, etiqueta: string): CampoExtra => ({ clave, etiqueta, tipo: "email" });
const d = (clave: string, etiqueta: string): CampoExtra => ({ clave, etiqueta, tipo: "date" });
const sel = (clave: string, etiqueta: string, opciones: string[]): CampoExtra => ({ clave, etiqueta, tipo: "select", opciones });

const MEDIOS = ["Nequi", "Daviplata", "Bre-B", "Transferencia", "Tarjeta", "Efectivo"];
const FORMAS_PAGO = ["Efectivo", "Transferencia", "Nequi", "Daviplata", "Tarjeta"];
const CONTRATOS = ["Indefinido", "Fijo", "Obra o labor", "Prestación de servicios", "Por días", "Aprendizaje"];
const PERIODOS = ["Semana", "Mes", "Temporada", "Trimestre"];
const PAGO = sel("forma_pago", "Forma de pago", FORMAS_PAGO);

export type FamiliaPropia = {
  titulo: string;
  desc: string;
  ph: string;
  det: string;
  cont: string;
  monto: string;
  fecha: string;
  res: string;
  campos: CampoExtra[];
  /** Comportamiento del módulo (opcional; si falta se usa el de su familia). */
  preset?: string;
};

const F = (
  titulo: string, desc: string, ph: string, det: string, cont: string, monto: string, fecha: string, res: string,
  campos: CampoExtra[], preset?: string,
): FamiliaPropia => ({ titulo, desc, ph, det, cont, monto, fecha, res, campos, preset });

const cliC = (extra: CampoExtra[]): CampoExtra[] => [
  t("documento", "Documento o NIT"), tel("telefono", "Teléfono o WhatsApp"), em("correo", "Correo electrónico"), t("direccion", "Dirección o barrio"), ...extra,
];
const facC = (extra: CampoExtra[]): CampoExtra[] => [
  t("numero", "Número de factura"), t("nit", "NIT o cédula del cliente"),
  sel("forma_pago", "Forma de pago", ["Contado", "Crédito 15 días", "Crédito 30 días", "Transferencia", "Tarjeta"]),
  ...extra, t("cufe", "CUFE (factura electrónica DIAN)"), em("correo", "Correo para enviar"),
];
const pagC = (conceptos: string[], extra: CampoExtra[] = []): CampoExtra[] => [
  sel("app", "Medio de pago", MEDIOS), sel("concepto", "Concepto del pago", conceptos), t("pagador", "Quién paga (nombre)"),
  t("referencia", "Referencia de la transferencia"), t("factura", "Factura o recibo asociado"), ...extra,
];
const perC = (cargos: string[], extra: CampoExtra[]): CampoExtra[] => [
  t("documento", "Documento"), tel("telefono", "Teléfono"), sel("cargo", "Cargo", cargos), sel("contrato", "Tipo de contrato", CONTRATOS),
  t("turno", "Turno u horario"), ...extra, t("arl", "ARL (nivel de riesgo)"), sel("forma_pago", "Forma de pago al personal", FORMAS_PAGO),
];
const metC = (indicadores: string[]): CampoExtra[] => [
  t("responsable", "Responsable de la meta"), sel("indicador", "Qué se mide", indicadores), t("meta_cantidad", "Meta (cantidad)"),
  t("logrado", "Logrado hasta hoy"), sel("periodo", "Periodo", PERIODOS),
];
const fidC = (extra: CampoExtra[]): CampoExtra[] => [
  tel("telefono", "Teléfono o WhatsApp"), t("puntos", "Puntos acumulados"), sel("nivel", "Nivel", ["Básico", "Plata", "Oro"]), d("vencen", "Los puntos vencen el"), ...extra,
];
const tc = (...ops: string[]) => sel("tipo_cliente", "Tipo de cliente", ops);

/** sufijo del negocio -> familia -> definición. */
export const PROPIOS: Record<string, Record<string, FamiliaPropia>> = {
  ferr: {
    clientes: F("Constructores y maestros de obra", "Maestros, contratistas y clientes de mostrador con su obra, cupo de crédito y descuento pactado.",
      "Cliente (maestro, contratista o empresa)", "Obra actual, materiales de compra frecuente, descuento pactado y observaciones", "Maestro o contratista", "Cupo de crédito (COP)", "Última compra", "Clientes con obra activa",
      cliC([tc("Maestro de obra", "Contratista", "Constructora", "Particular", "Empresa"), t("obra", "Obra o proyecto actual"), t("descuento", "Descuento pactado (%)"), sel("lista_precios", "Lista de precios", ["Público", "Maestro", "Mayorista", "Constructora"])])),
    facturas: F("Facturación de materiales (DIAN)", "Facturas de materiales con IVA, obra y remisión asociada.",
      "Factura (número y cliente)", "Materiales, IVA, retenciones, obra y remisión", "Cliente", "Valor de la factura (COP)", "Fecha de emisión", "Facturas por cobrar",
      facC([t("obra", "Obra o destino"), t("remision", "Remisión asociada"), t("retencion", "Retención en la fuente (COP)")])),
    pagos: F("Pagos de clientes y abonos de obra", "Abonos de constructores y pagos por transferencia contra facturas de materiales.",
      "Pago (cliente, obra y concepto)", "Monto recibido, referencia y factura que abona", "Cajero que concilió", "Valor del pago (COP)", "Fecha del pago", "Pagos por conciliar",
      pagC(["Venta de mostrador", "Abono a obra", "Pago de factura a crédito", "Anticipo de pedido", "Flete cobrado"])),
    personal: F("Mostrador, bodega y despachos", "Vendedores de mostrador, bodegueros y conductores de despacho, con turnos y comisiones.",
      "Empleado y turno o novedad", "Horario, comisión por ventas, despachos realizados y novedades", "Empleado", "Pago o comisión (COP)", "Fecha de pago", "Pagos del personal",
      perC(["Vendedor de mostrador", "Bodeguero", "Conductor de despacho", "Cajero", "Auxiliar de cargue", "Administrador"], [t("comision_venta", "Comisión por venta (%)"), t("despachos", "Despachos del periodo")])),
    metas: F("Metas de ventas y recaudo de cartera", "Metas de ventas, cotizaciones cerradas y recaudo de constructores.",
      "Meta (responsable y periodo)", "Monto meta, logrado y estrategia (ej. más ventas a constructoras)", "Responsable", "Meta (COP)", "Fecha de cierre", "Metas en curso",
      metC(["Ventas (COP)", "Cotizaciones cerradas", "Recaudo de cartera (COP)", "Clientes nuevos", "Despachos a obra"])),
  },
  super: {
    facturas: F("Facturación del supermercado (DIAN)", "Facturas de caja, ventas a empresas y domicilios.",
      "Factura (número y cliente)", "Productos, IVA, caja que facturó y observaciones", "Cliente", "Valor de la factura (COP)", "Fecha de emisión", "Facturas por cobrar",
      facC([t("caja", "Caja registradora"), sel("tipo_venta", "Tipo de venta", ["Mostrador", "Domicilio", "Mayorista", "Empresa"])])),
    pagos: F("Pagos digitales y datáfono", "Concilia Nequi, Daviplata, Bre-B y datáfono contra las cajas del día.",
      "Pago (caja y concepto)", "Monto recibido, referencia y caja donde se cobró", "Cajero", "Valor del pago (COP)", "Fecha del pago", "Pagos por conciliar",
      pagC(["Venta de caja", "Domicilio", "Pago de fiado", "Pedido por WhatsApp", "Recarga o servicio"], [t("caja", "Caja registradora")])),
    fidelizacion: F("Club de clientes y puntos", "Puntos por compra, nivel del cliente y beneficios del club del supermercado.",
      "Cliente del club", "Puntos, beneficios canjeados y compras del mes", "Cliente", "Compras acumuladas (COP)", "Última compra", "Clientes del club",
      fidC([t("tarjeta", "Número de tarjeta del club"), t("compras_mes", "Compras del mes (COP)")])),
    personal: F("Cajeros, surtidores y domiciliarios", "Turnos por sección, comisiones y novedades del personal del supermercado.",
      "Empleado y sección o novedad", "Horario, sección, horas extra y novedades", "Empleado", "Pago o comisión (COP)", "Fecha de pago", "Pagos del personal",
      perC(["Cajero", "Surtidor de góndola", "Empacador", "Domiciliario", "Carnicero", "Jefe de sección", "Administrador"], [sel("seccion", "Sección", ["Cajas", "Lácteos", "Frutas y verduras", "Carnes", "Aseo", "Bodega", "Panadería"])])),
    metas: F("Metas por sección y ventas", "Metas de ventas, ticket promedio y mermas por sección.",
      "Meta (sección y periodo)", "Monto meta, logrado y plan de la semana", "Jefe de sección", "Meta (COP)", "Fecha de cierre", "Metas en curso",
      metC(["Ventas (COP)", "Ticket promedio (COP)", "Rotación por sección", "Mermas (%)", "Clientes nuevos del club"])),
  },
  carn: {
    facturas: F("Facturación por peso (DIAN)", "Facturas de ventas por kilo a restaurantes, tiendas y hogares.",
      "Factura (número y cliente)", "Productos, kilos, precio por kilo e IVA", "Cliente", "Valor de la factura (COP)", "Fecha de emisión", "Facturas por cobrar",
      facC([t("peso_total", "Peso total vendido (kg)"), sel("tipo_cliente", "Tipo de cliente", ["Hogar", "Restaurante", "Tienda", "Institución"])])),
    pagos: F("Pagos de pedidos por peso", "Concilia pagos de mostrador, domicilios y clientes mayoristas.",
      "Pago (cliente y pedido)", "Monto recibido, pesos del pedido y referencia", "Cajero", "Valor del pago (COP)", "Fecha del pago", "Pagos por conciliar",
      pagC(["Venta en mostrador", "Pedido por WhatsApp", "Domicilio", "Pago de restaurante o mayorista", "Abono"])),
    personal: F("Cortadores, mostrador y domicilios", "Carniceros, fruver, cajeros y domiciliarios con su carné de manipulación.",
      "Empleado y turno o novedad", "Horario, kilos cortados, domicilios y novedades", "Empleado", "Pago o comisión (COP)", "Fecha de pago", "Pagos del personal",
      perC(["Carnicero o cortador", "Pescadero", "Fruver", "Cajero", "Domiciliario", "Auxiliar de cuarto frío"], [t("carnet", "Carné de manipulación de alimentos"), d("carnet_vence", "Vence el carné")])),
    metas: F("Metas de kilos y mermas", "Metas de kilos vendidos, ventas y control de mermas.",
      "Meta (responsable y periodo)", "Meta de kilos o ventas, logrado y plan", "Responsable", "Meta (COP)", "Fecha de cierre", "Metas en curso",
      metC(["Kilos vendidos", "Ventas (COP)", "Merma (%)", "Pedidos a domicilio", "Clientes mayoristas nuevos"])),
  },
  licor: {
    facturas: F("Facturación de licores (DIAN)", "Facturas con impuesto al consumo y estampilla por referencia.",
      "Factura (número y cliente)", "Referencias, impuesto al consumo, estampilla y canal", "Cliente", "Valor de la factura (COP)", "Fecha de emisión", "Facturas por cobrar",
      facC([t("estampilla", "Estampilla o impuesto al consumo"), sel("canal", "Canal", ["Mostrador", "Domicilio", "Evento"])])),
    pagos: F("Pagos de mostrador y domicilios", "Concilia Nequi, Daviplata, Bre-B y datáfono de ventas y domicilios.",
      "Pago (cliente y concepto)", "Monto recibido, referencia y pedido asociado", "Cajero", "Valor del pago (COP)", "Fecha del pago", "Pagos por conciliar",
      pagC(["Venta de mostrador", "Domicilio", "Combo", "Pago de fiado", "Pedido de evento"])),
    fidelizacion: F("Clientes frecuentes y beneficios", "Puntos y beneficios para quienes compran seguido, con su marca favorita.",
      "Cliente frecuente", "Puntos, marca favorita y beneficios canjeados", "Cliente", "Compras acumuladas (COP)", "Última compra", "Clientes frecuentes",
      fidC([d("cumple", "Cumpleaños"), t("favorita", "Bebida o marca favorita")])),
    personal: F("Vendedores, cajeros y domiciliarios", "Turnos de día, noche y fin de semana, con comisiones por venta.",
      "Empleado y turno o novedad", "Horario, comisión, domicilios entregados y novedades", "Empleado", "Pago o comisión (COP)", "Fecha de pago", "Pagos del personal",
      perC(["Vendedor", "Cajero", "Domiciliario", "Bodeguero", "Administrador"], [sel("turno_tipo", "Turno", ["Día", "Noche", "Fin de semana"]), t("comision_venta", "Comisión por venta (%)")])),
    metas: F("Metas de ventas y combos", "Metas de ventas, combos vendidos y fines de semana.",
      "Meta (responsable y periodo)", "Monto meta, logrado y combos a impulsar", "Responsable", "Meta (COP)", "Fecha de cierre", "Metas en curso",
      metC(["Ventas (COP)", "Combos vendidos", "Domicilios", "Margen (%)", "Ventas de fin de semana (COP)"])),
  },
  flor: {
    facturas: F("Facturación de arreglos (DIAN)", "Facturas de arreglos, encargos corporativos y decoración.",
      "Factura (número y cliente)", "Arreglo, ocasión, destinatario e IVA", "Cliente", "Valor de la factura (COP)", "Fecha de emisión", "Facturas por cobrar",
      facC([t("destinatario", "Destinatario del arreglo"), sel("ocasion", "Ocasión", ["Cumpleaños", "Aniversario", "Día de la Madre", "San Valentín", "Funeral", "Corporativo", "Otra"])])),
    pagos: F("Pagos de encargos y anticipos", "Anticipos y saldos de encargos pagados por transferencia o efectivo.",
      "Pago (cliente y encargo)", "Monto recibido, referencia y encargo asociado", "Cajero", "Valor del pago (COP)", "Fecha del pago", "Pagos por conciliar",
      pagC(["Arreglo", "Anticipo de encargo", "Saldo de encargo", "Pedido de empresa", "Domicilio", "Evento o decoración"])),
    fidelizacion: F("Fechas especiales y clientes frecuentes", "Clientes que compran en fechas importantes, con recordatorio y beneficios.",
      "Cliente frecuente", "Fecha especial, flor o estilo favorito y beneficios", "Cliente", "Compras acumuladas (COP)", "Próxima fecha especial", "Clientes frecuentes",
      fidC([d("fecha_especial", "Fecha especial a recordar"), t("flor_favorita", "Flor o estilo favorito")])),
    personal: F("Floristas, armado y domicilios", "Floristas, auxiliares y domiciliarios, con pago por arreglo armado.",
      "Empleado y turno o novedad", "Horario, arreglos armados, entregas y novedades", "Empleado", "Pago o comisión (COP)", "Fecha de pago", "Pagos del personal",
      perC(["Florista", "Auxiliar de armado", "Domiciliario", "Vendedor", "Administrador"], [t("arreglos", "Arreglos armados en el periodo"), t("pago_arreglo", "Pago por arreglo (COP)")])),
    metas: F("Metas de temporada y encargos", "Metas para San Valentín, Día de la Madre y otras fechas.",
      "Meta (temporada o periodo)", "Encargos esperados, flores a comprar y plan de entregas", "Responsable", "Meta de ventas (COP)", "Fecha de cierre", "Metas en curso",
      metC(["Encargos entregados", "Ventas (COP)", "Ventas en temporada alta (COP)", "Pedidos corporativos", "Merma de flores (%)"])),
  },
  optica: {
    clientes: F("Clientes y pacientes de la óptica", "Clientes con su fórmula vigente, último examen, tipo de lente y optómetra.",
      "Cliente (nombre y documento)", "Fórmula vigente, tipo de lente, preferencias de montura y observaciones", "Optómetra", "Saldo pendiente (COP)", "Próximo control", "Clientes con control pendiente",
      cliC([d("ultimo_examen", "Último examen visual"), t("formula", "Fórmula vigente (resumen)"), sel("uso", "Tipo de lente habitual", ["Monofocal", "Bifocal", "Progresivo", "Lentes de contacto", "Filtro azul", "Solar"]), t("eps", "EPS o convenio")])),
    garantias: F("Garantías y ajustes de lentes", "Garantías por adaptación, rayones o montura, con la solución dada.",
      "Garantía (cliente y producto)", "Motivo, fecha de compra y solución acordada", "Cliente", "Valor de la garantía (COP)", "Vence la garantía", "Garantías abiertas",
      [t("factura", "Factura de compra"), sel("motivo", "Motivo", ["Adaptación", "Rayón", "Montura rota", "Tratamiento defectuoso", "Fórmula equivocada"]), sel("solucion", "Solución", ["Pendiente", "Ajuste", "Cambio de lente", "Cambio de montura", "Devolución"]), d("compra", "Fecha de compra")], "proyecto"),
    facturas: F("Facturación de lentes y monturas (DIAN)", "Facturas con la fórmula, el laboratorio y el saldo por cobrar.",
      "Factura (número y cliente)", "Montura, lentes, tratamientos, fórmula y saldo", "Cliente", "Valor de la factura (COP)", "Fecha de emisión", "Facturas por cobrar",
      facC([t("formula", "Fórmula asociada"), t("laboratorio", "Laboratorio"), t("saldo", "Saldo por cobrar (COP)")])),
    pagos: F("Pagos de lentes, exámenes y anticipos", "Anticipos de pedidos al laboratorio y saldos de entrega.",
      "Pago (cliente y concepto)", "Monto recibido, referencia y pedido asociado", "Cajero", "Valor del pago (COP)", "Fecha del pago", "Pagos por conciliar",
      pagC(["Examen visual", "Montura", "Lentes", "Anticipo de pedido", "Saldo de entrega", "Lentes de contacto"])),
    fidelizacion: F("Controles y clientes frecuentes", "Recordatorio de control visual anual y beneficios por referidos.",
      "Cliente del programa", "Próximo control, beneficios y referidos", "Cliente", "Compras acumuladas (COP)", "Próximo control visual", "Clientes del programa",
      fidC([d("proximo_control", "Próximo control visual"), t("referido_por", "Referido por")])),
    personal: F("Optómetras, asesores y laboratorio", "Optómetras, asesores de ventas y técnicos de laboratorio con comisiones.",
      "Empleado y turno o novedad", "Horario, exámenes realizados, comisión y novedades", "Empleado", "Pago o comisión (COP)", "Fecha de pago", "Pagos del personal",
      perC(["Optómetra", "Asesor de ventas", "Técnico de laboratorio", "Cajero", "Administrador"], [t("registro", "Registro profesional (optómetra)"), t("comision_venta", "Comisión por venta (%)")])),
    metas: F("Metas de exámenes y lentes", "Metas de exámenes, lentes vendidos y pedidos entregados a tiempo.",
      "Meta (responsable y periodo)", "Monto o cantidad meta, logrado y plan", "Responsable", "Meta (COP)", "Fecha de cierre", "Metas en curso",
      metC(["Exámenes realizados", "Lentes vendidos", "Ventas (COP)", "Controles agendados", "Pedidos entregados a tiempo (%)"])),
  },
  guard: {
    facturas: F("Facturación de pensiones (DIAN)", "Facturas de matrícula, pensión y servicios de la guardería.",
      "Factura (número y acudiente)", "Niño, mes o concepto facturado y servicios adicionales", "Acudiente", "Valor de la factura (COP)", "Fecha de emisión", "Facturas por cobrar",
      facC([t("nino", "Niño o niña"), t("concepto", "Mes o concepto facturado")])),
    pagos: F("Pagos de acudientes", "Recaudo de pensiones, jornadas extra y alimentación por cada medio de pago.",
      "Pago (niño y concepto)", "Mes pagado, recibo y medio de pago", "Secretaría", "Valor del pago (COP)", "Fecha del pago", "Pagos por conciliar",
      pagC(["Matrícula", "Pensión mensual", "Jornada extra", "Alimentación", "Transporte", "Uniforme o material"], [t("acudiente", "Acudiente que paga"), t("mes", "Mes que paga")])),
    personal: F("Docentes, auxiliares y cocina", "Docentes de aula, auxiliares, cocina y transporte con turnos y novedades.",
      "Empleado y grupo o novedad", "Grupo asignado, horario, capacitaciones y novedades", "Empleada o empleado", "Pago (COP)", "Fecha de pago", "Pagos del personal",
      perC(["Docente de aula", "Auxiliar", "Cocinera", "Psicóloga", "Conductor de ruta", "Directora"], [t("grupo", "Grupo asignado"), sel("jornada", "Jornada", ["Mañana", "Tarde", "Completa"]), d("primeros_auxilios", "Vence el curso de primeros auxilios")])),
    metas: F("Metas de cupos y recaudo", "Metas de niños matriculados, cupos ocupados y recaudo de pensiones.",
      "Meta (periodo)", "Cupos meta, logrado y plan de matrículas", "Responsable", "Meta de recaudo (COP)", "Fecha de cierre", "Metas en curso",
      metC(["Niños matriculados", "Recaudo de pensiones (COP)", "Asistencia (%)", "Cupos ocupados (%)", "Cartera recuperada (COP)"])),
    mensualidades: F("Pensiones de los niños", "Pensión mensual de cada niño, abonos, descuentos por hermanos y recordatorios al acudiente.",
      "Pensión (niño y mes)", "Valor, abonos, descuento por hermanos y recordatorios", "Acudiente", "Valor de la pensión (COP)", "Fecha límite de pago", "Pensiones pendientes",
      [t("nino", "Niño o niña"), t("grupo", "Grupo"), sel("jornada", "Jornada", ["Mañana", "Tarde", "Completa"]), t("descuento_hermanos", "Descuento por hermanos (%)"), t("mes", "Mes cobrado"), tel("telefono", "Teléfono del acudiente"), PAGO], "cartera"),
  },
  alq: {
    clientes: F("Arrendatarios de vehículos", "Clientes con su licencia, vigencia, historial de alquileres y depósito en garantía.",
      "Cliente (nombre y documento)", "Licencia, historial de alquileres, depósito y observaciones", "Conductor principal", "Depósito en garantía (COP)", "Último alquiler", "Clientes con licencia por vencer",
      cliC([t("licencia", "Licencia de conducción (categoría)"), d("licencia_vence", "Vence la licencia"), t("ciudad", "Ciudad de residencia"), tc("Particular", "Turista", "Empresa", "Conductor de plataforma"), t("tarjeta", "Tarjeta o depósito en garantía")])),
    facturas: F("Facturación de alquileres (DIAN)", "Facturas por días de alquiler, kilometraje y cobros extra.",
      "Factura (número y cliente)", "Vehículo, días, kilometraje y cobros extra", "Cliente", "Valor de la factura (COP)", "Fecha de emisión", "Facturas por cobrar",
      facC([t("placa", "Placa del vehículo"), t("dias", "Días de alquiler"), t("extras", "Cobros extra (km, combustible, daños)")])),
    pagos: F("Pagos, depósitos y cobros extra", "Alquileres, depósitos en garantía, multas trasladadas y devoluciones.",
      "Pago (cliente y placa)", "Monto recibido, referencia y contrato asociado", "Cajero", "Valor del pago (COP)", "Fecha del pago", "Pagos por conciliar",
      pagC(["Alquiler", "Depósito en garantía", "Anticipo de reserva", "Cobro extra", "Multa trasladada", "Devolución de depósito"], [t("placa", "Placa")])),
    personal: F("Asesores, conductores y lavado", "Asesores de alquiler, conductores y personal de alistamiento.",
      "Empleado y turno o novedad", "Horario, alquileres cerrados, comisión y novedades", "Empleado", "Pago o comisión (COP)", "Fecha de pago", "Pagos del personal",
      perC(["Asesor de alquiler", "Conductor", "Lavador", "Mecánico", "Administrador"], [t("comision_alquiler", "Comisión por alquiler (%)"), t("licencia", "Licencia de conducción")])),
    metas: F("Metas de ocupación e ingresos", "Metas de ocupación de la flota, días alquilados e ingresos.",
      "Meta (periodo)", "Ocupación meta, ingresos esperados y temporada", "Responsable", "Meta de ingresos (COP)", "Fecha de cierre", "Metas en curso",
      metC(["Alquileres realizados", "Ocupación de la flota (%)", "Ingresos (COP)", "Días de alquiler", "Cobros extra recuperados (COP)"])),
  },
  seg: {
    clientes: F("Clientes y sedes atendidas", "Empresas y conjuntos con sus sedes, contrato, interventor y vigencia.",
      "Cliente (empresa y sede)", "Puestos atendidos, contrato, interventor y observaciones", "Interventor o administrador", "Valor mensual (COP)", "Vence el contrato", "Contratos por renovar",
      cliC([t("sede", "Sede o puesto atendido"), sel("servicio", "Tipo de servicio", ["Vigilancia", "Aseo", "Mantenimiento", "Mixto"]), t("contrato", "N.º de contrato"), d("contrato_vence", "Vence el contrato")])),
    cotizaciones: F("Cotizaciones de servicio", "Propuestas de vigilancia, aseo o mantenimiento según puestos y turnos.",
      "Cotización (cliente y servicio)", "Puestos, turnos, dotación, supervisión y valor mensual", "Cliente", "Valor mensual (COP)", "Vigente hasta", "Cotizaciones por cerrar",
      [sel("servicio", "Servicio", ["Vigilancia 24 h", "Vigilancia diurna", "Aseo", "Mantenimiento", "Mixto"]), t("puestos", "Cantidad de puestos"), t("turnos", "Turnos por puesto"), t("duracion", "Duración del contrato"), t("aiu", "Administración e imprevistos (%)")], "venta"),
    facturas: F("Facturación mensual de contratos (DIAN)", "Factura mensual por contrato, puestos y descuentos por novedades.",
      "Factura (contrato y mes)", "Puestos facturados, descuentos por novedades e IVA", "Cliente", "Valor de la factura (COP)", "Fecha de emisión", "Facturas por cobrar",
      facC([t("contrato", "Contrato"), t("mes", "Mes facturado"), t("puestos", "Puestos facturados"), t("novedades", "Descuentos por novedades (COP)")])),
    pagos: F("Pagos de clientes y nómina", "Recaudo de contratos y pagos de nómina del personal operativo.",
      "Pago (cliente o contrato)", "Monto recibido, referencia y factura que cancela", "Tesorería", "Valor del pago (COP)", "Fecha del pago", "Pagos por conciliar",
      pagC(["Pago de factura mensual", "Anticipo de contrato", "Pago de novedad", "Pago de dotación", "Nómina de personal"], [t("contrato", "Contrato")])),
    personal: F("Guardas, aseadoras y supervisores", "Personal operativo con puesto, turnos, recargos y vigencia de cursos.",
      "Empleado y puesto o novedad", "Puesto, turno, recargos y novedades", "Empleado", "Pago o recargo (COP)", "Fecha de pago", "Pagos del personal",
      perC(["Guarda de seguridad", "Supervisor", "Aseadora", "Operario de mantenimiento", "Jefe de operaciones", "Administrativo"], [t("puesto", "Puesto asignado"), t("credencial", "Credencial de vigilancia"), d("curso_vence", "Vence el curso de vigilancia"), t("recargos", "Recargos nocturnos o dominicales (COP)")])),
    metas: F("Metas de contratos y cobertura", "Metas de contratos nuevos, puestos cubiertos y ausentismo.",
      "Meta (responsable y periodo)", "Meta, logrado y plan de cobertura", "Responsable", "Meta (COP)", "Fecha de cierre", "Metas en curso",
      metC(["Contratos nuevos", "Puestos cubiertos (%)", "Facturación mensual (COP)", "Ausentismo (%)", "Cartera recuperada (COP)"])),
  },
  gan: {
    clientes: F("Compradores de leche, huevos y ganado", "Frigoríficos, acopiadores y tiendas que compran la producción de la finca.",
      "Comprador (nombre o empresa)", "Producto que compra, lugar de entrega, condición de pago y saldo", "Comprador", "Saldo por cobrar (COP)", "Última entrega", "Compradores activos",
      cliC([sel("tipo", "Tipo de comprador", ["Frigorífico", "Plaza de ganado", "Acopiador", "Cooperativa", "Tienda o restaurante", "Particular"]), t("producto", "Producto que compra"), t("lugar", "Lugar de entrega"), t("condicion", "Condición de pago")])),
    facturas: F("Facturación de ventas pecuarias (DIAN)", "Facturas de leche, huevos, carne o animales vendidos.",
      "Factura (número y comprador)", "Producto, cantidad, guía de movilización e IVA", "Comprador", "Valor de la factura (COP)", "Fecha de emisión", "Facturas por cobrar",
      facC([t("producto", "Producto vendido"), t("cantidad", "Cantidad (litros, huevos, kilos o cabezas)"), t("guia", "Guía de movilización")])),
    pagos: F("Pagos de compradores y de la finca", "Cobro de ventas y pagos de jornales, concentrado y veterinario.",
      "Pago (concepto y lote)", "Monto, referencia y lote o venta asociada", "Quien recibe o paga", "Valor del pago (COP)", "Fecha del pago", "Pagos por conciliar",
      pagC(["Venta de leche", "Venta de huevos", "Venta de ganado", "Anticipo de comprador", "Pago de jornales", "Compra de concentrado", "Pago de veterinario"], [t("lote", "Lote o galpón")])),
    personal: F("Ordeñadores, galponeros y vaqueros", "Personal de la finca con jornal, lote asignado y novedades.",
      "Empleado y lote o novedad", "Lote, horario, jornales y novedades", "Empleado", "Pago (COP)", "Fecha de pago", "Pagos del personal",
      perC(["Ordeñador", "Vaquero", "Galponero", "Mayordomo", "Veterinario", "Administrador"], [t("lote", "Lote o galpón asignado"), sel("modalidad", "Modalidad", ["Jornal", "Mensual", "Por litro ordeñado"])])),
    metas: F("Metas de producción pecuaria", "Metas de litros, huevos, kilos de carne y ganancia de peso.",
      "Meta (lote y periodo)", "Meta de producción, logrado y plan del lote", "Responsable del lote", "Meta de ventas (COP)", "Fecha de cierre", "Metas en curso",
      metC(["Litros de leche", "Huevos producidos", "Kilos de carne", "Ganancia de peso (kg)", "Mortalidad (%)", "Ventas (COP)"])),
  },
  fund: {
    facturas: F("Recibos y certificados de la fundación", "Facturas, cuentas de cobro y certificados de donación.",
      "Documento (número y destinatario)", "Proyecto, concepto y valor certificado", "Donante o cliente", "Valor del documento (COP)", "Fecha de emisión", "Documentos por enviar",
      facC([t("proyecto", "Proyecto asociado"), sel("tipo", "Tipo de documento", ["Factura de servicio", "Recibo de donación", "Cuenta de cobro", "Certificado de donación"])])),
    pagos: F("Donaciones y aportes recibidos", "Donaciones en dinero, aportes de aliados y pagos a proveedores de los proyectos.",
      "Aporte o pago (donante o proveedor)", "Monto, proyecto destino y soporte", "Tesorería", "Valor (COP)", "Fecha", "Aportes por conciliar",
      pagC(["Donación en dinero", "Aporte de aliado", "Pago de proveedor del proyecto", "Cuota de socio", "Evento o rifa"], [t("donante", "Donante"), t("proyecto", "Proyecto destino")])),
    personal: F("Equipo, contratistas y voluntarios", "Coordinadores, profesionales y voluntarios por proyecto.",
      "Persona y proyecto o novedad", "Proyecto, horas, honorarios y novedades", "Persona", "Honorario o pago (COP)", "Fecha de pago", "Pagos del equipo",
      perC(["Coordinador de proyecto", "Trabajador social", "Psicólogo", "Voluntario", "Contador", "Auxiliar"], [t("proyecto", "Proyecto asignado"), sel("vinculo", "Vínculo", ["Contratado", "Prestación de servicios", "Voluntario"]), t("horas", "Horas del periodo")])),
    metas: F("Metas de impacto y recaudo", "Metas de beneficiarios atendidos, donaciones y proyectos ejecutados.",
      "Meta (proyecto y periodo)", "Indicador, meta, logrado y plan", "Responsable", "Meta (COP)", "Fecha de cierre", "Metas en curso",
      metC(["Beneficiarios atendidos", "Donaciones recibidas (COP)", "Proyectos ejecutados", "Voluntarios activos", "Informes entregados a tiempo"])),
  },
  igl: {
    facturas: F("Recibos y certificados de aportes", "Recibos de ofrendas, diezmos y certificados de donación para los miembros.",
      "Recibo (número y miembro)", "Concepto, valor y certificado entregado", "Miembro", "Valor del recibo (COP)", "Fecha de emisión", "Recibos por entregar",
      facC([t("miembro", "Miembro"), t("concepto", "Concepto")])),
    pagos: F("Diezmos, ofrendas y aportes", "Aportes por transferencia, efectivo o datáfono, con su recibo.",
      "Aporte (miembro y concepto)", "Monto, culto o evento, recibo y medio de pago", "Tesorero", "Valor del aporte (COP)", "Fecha del aporte", "Aportes por conciliar",
      pagC(["Diezmo", "Ofrenda", "Pacto o siembra", "Cuota de club o asociación", "Reserva de salón", "Cuota de evento"], [t("miembro", "Miembro"), t("recibo", "Número de recibo")])),
    personal: F("Pastores, líderes y personal de apoyo", "Pastores, líderes de ministerio, músicos y personal de aseo.",
      "Persona y ministerio o novedad", "Ministerio, horario, honorarios y novedades", "Persona", "Honorario o pago (COP)", "Fecha de pago", "Pagos del personal",
      perC(["Pastor", "Líder de ministerio", "Tesorero", "Portero o sacristán", "Músico", "Auxiliar de aseo"], [t("ministerio", "Ministerio o área"), sel("vinculo", "Vínculo", ["Contratado", "Honorarios", "Voluntario"])])),
  },
};

// Caja, proveedores, finanzas, cuentas por cobrar, agenda y clientes propios de cada negocio.
for (const grupo of [PROPIOS_OPERACION, PROPIOS_OPERACION_2, PROPIOS_OPERACION_3, PROPIOS_OPERACION_4, PROPIOS_OPERACION_5, PROPIOS_OPERACION_6]) {
  for (const [suf, fams] of Object.entries(grupo)) {
    PROPIOS[suf] = { ...(PROPIOS[suf] ?? {}), ...fams };
  }
}

const PRESET_FAMILIA: Record<string, string> = {
  facturas: "pago", pagos: "pago", personal: "pago", metas: "proyecto", garantias: "proyecto", cotizaciones: "venta", mensualidades: "cartera",
  caja: "pago", proveedores: "pago", finanzas: "pago", cuentas: "cartera", agenda: "cita",
};

export const PRESET_PROPIOS: Record<string, string> = {};
export const VOCAB_PROPIOS: Record<string, Partial<ConfigModulo>> = {};
export const CAMPOS_PROPIOS: Record<string, CampoExtra[]> = {};

for (const [suf, fams] of Object.entries(PROPIOS)) {
  for (const [fam, f] of Object.entries(fams)) {
    const id = `${fam}_${suf}`;
    const preset = f.preset ?? PRESET_FAMILIA[fam];
    if (preset) PRESET_PROPIOS[id] = preset;
    VOCAB_PROPIOS[id] = {
      placeholderTitulo: f.ph, placeholderDetalle: f.det, etiquetaContacto: f.cont, etiquetaMonto: f.monto, etiquetaFecha: f.fecha, resumen: f.res,
    };
    CAMPOS_PROPIOS[id] = f.campos;
  }
}

/** Formularios propios de los módulos específicos de estos negocios. */
export const CAMPOS_OPERACION: Record<string, CampoExtra[]> = {
  despachos_ferr: [t("obra", "Obra o destino"), t("remision", "N.º de remisión"), t("conductor", "Conductor"), t("placa", "Placa del vehículo"), t("recibe", "Quién recibe en la obra"), t("materiales", "Materiales despachados")],
  cotizaciones_ferr: [t("obra", "Obra o proyecto"), t("lista", "Lista de materiales"), t("flete", "Flete (COP)"), t("descuento", "Descuento (%)"), t("validez", "Validez de la oferta (días)")],
  listas_precios_ferr: [t("proveedor", "Proveedor"), t("contacto", "Contacto del proveedor"), t("variacion", "Variación frente a la anterior (%)"), t("condicion", "Condición de pago"), d("vigencia", "Vigente desde")],
  vencimientos_super: [t("lote", "Lote"), t("cantidad", "Cantidad"), t("gondola", "Ubicación en góndola"), sel("accion", "Acción", ["Rotar", "Descuento", "Devolver al proveedor", "Retirar"]), t("descuento", "Descuento aplicado (%)"), t("proveedor", "Proveedor")],
  promociones_super: [sel("tipo", "Tipo de promoción", ["2x1", "Precio especial", "Combo", "Descuento por volumen", "Segundo al 50 %"]), t("productos", "Productos incluidos"), t("descuento", "Descuento (%)"), t("autoriza", "Autorizada por"), d("inicio", "Inicio de la promoción")],
  reposicion_super: [t("proveedor", "Proveedor"), sel("dia_visita", "Día de visita del proveedor", ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]), t("pedido_minimo", "Pedido mínimo (COP)"), t("agotados", "Productos agotados"), t("condicion", "Condición de pago")],
  mermas_fresco: [t("producto", "Producto"), t("kilos", "Kilos perdidos"), sel("causa", "Causa", ["Maduró", "Vencido", "Daño por frío", "Recorte", "Faltante", "Devolución"]), t("autoriza", "Autorizó"), t("evitar", "Cómo evitarlo")],
  pedidos_fresco: [tel("telefono", "Teléfono o WhatsApp"), t("direccion", "Dirección de entrega"), t("productos", "Productos y pesos pedidos"), t("hora", "Hora de entrega"), PAGO, t("domiciliario", "Domiciliario")],
  cadena_frio: [t("equipo", "Nevera o cuarto frío"), t("temp", "Temperatura medida (°C)"), t("rango", "Rango permitido (°C)"), t("accion", "Acción correctiva"), t("responsable", "Responsable del control")],
  combos_licor: [sel("ocasion", "Ocasión", ["Fin de semana", "Quincena", "Partido", "Fiesta", "Cumpleaños", "Año nuevo"]), t("contenido", "Contenido del combo"), t("costo", "Costo del combo (COP)"), sel("canal", "Canal", ["Mostrador", "Domicilio", "Ambos"])],
  domicilios_licor: [tel("telefono", "Teléfono del cliente"), t("direccion", "Dirección de entrega"), sel("edad", "Mayoría de edad", ["Verificada con documento", "No verificada"]), t("documento", "Documento revisado"), t("repartidor", "Repartidor"), PAGO],
  permisos_licor: [sel("permiso", "Permiso", ["Licencia de funcionamiento", "Concepto de bomberos", "Uso de suelo", "Registro de Cámara de Comercio", "Horario de venta", "SAYCO-ACINPRO"]), t("entidad", "Entidad"), t("numero", "Número del permiso"), t("horario", "Horario autorizado"), d("emision", "Fecha de emisión"), t("aviso", "Avisar con (días)")],
  flores_frescas: [t("tipo_flor", "Tipo de flor"), t("proveedor", "Proveedor"), t("tallos", "Tallos recibidos"), t("vida_dias", "Vida útil (días)"), t("merma", "Merma (tallos)"), d("llegada", "Fecha de llegada")],
  monturas_optica: [t("marca", "Marca"), t("referencia", "Referencia"), sel("material", "Material", ["Acetato", "Metal", "Titanio", "Flexible", "Mixto"]), sel("genero", "Género", ["Hombre", "Mujer", "Unisex", "Niños"]), t("color", "Color"), t("cantidad", "Cantidad"), t("vitrina", "Ubicación en vitrina"), t("costo", "Costo (COP)")],
  examenes_visuales: [t("documento", "Documento"), tel("telefono", "Teléfono"), sel("tipo", "Tipo de examen", ["Examen visual completo", "Control", "Lentes de contacto", "Examen infantil"]), t("optometra", "Optómetra"), t("motivo", "Motivo de consulta"), t("hora", "Hora")],
  reportes_guarderia: [t("nino", "Niño o niña"), t("grupo", "Grupo"), t("comidas", "Qué comió"), sel("siesta", "Siesta", ["No durmió", "Menos de 1 hora", "1 a 2 horas", "Más de 2 horas"]), t("panales", "Pañales o baño"), t("actividades", "Actividades del día"), sel("animo", "Estado de ánimo", ["Alegre", "Tranquilo", "Inquieto", "Triste"]), t("mensaje", "Mensaje para el acudiente")],
  recogida_guarderia: [t("nino", "Niño o niña"), t("parentesco", "Parentesco"), t("documento", "Documento de la persona"), tel("telefono", "Teléfono"), sel("foto", "Foto registrada", ["Sí", "No"]), t("contrasena", "Contraseña de recogida")],
  reservas_alquiler: [t("placa", "Placa del vehículo"), t("documento", "Documento del cliente"), tel("telefono", "Teléfono"), d("devolucion", "Fecha de devolución"), t("km_permitido", "Kilometraje permitido"), t("deposito", "Depósito o anticipo (COP)"), PAGO],
  entregas_alq: [t("placa", "Placa del vehículo"), t("km_entrada", "Kilometraje de entrada"), sel("combustible", "Combustible al regresar", ["Lleno", "3/4", "1/2", "1/4", "Reserva"]), sel("danos", "¿Daños encontrados?", ["No", "Sí, leves", "Sí, graves"]), t("detalle_danos", "Detalle de los daños"), t("cobros_extra", "Cobros extra (COP)")],
  multas_alquiler: [t("placa", "Placa del vehículo"), t("comparendo", "N.º de comparendo"), t("entidad", "Entidad que sanciona"), d("infraccion", "Fecha de la infracción"), t("cliente", "Cliente al que se traslada"), sel("estado_cobro", "Estado del cobro", ["Pendiente", "Cobrada al cliente", "Pagada", "Impugnada"])],
  turnos_seg: [t("empleado", "Empleado"), t("puesto", "Puesto"), sel("turno", "Turno", ["Diurno 12 h", "Nocturno 12 h", "8 horas", "Rotativo", "Descanso remunerado"]), t("reemplazo", "Reemplazo"), t("novedad", "Novedad del turno")],
  novedades_seg: [sel("tipo", "Tipo de novedad", ["Incidente", "Falta", "Queja del cliente", "Accidente", "Hallazgo", "Llegada tarde"]), t("puesto", "Puesto"), t("reportado", "Reportado por"), t("accion", "Acción tomada"), sel("gravedad", "Gravedad", ["Leve", "Media", "Grave"])],
  produccion_pecuaria: [t("lote", "Lote"), sel("producto", "Producto", ["Leche (litros)", "Huevos", "Carne (kilos)", "Lana", "Miel", "Otro"]), t("cantidad", "Cantidad producida"), t("destino", "Destino de la venta"), t("calidad", "Calidad o clasificación")],
  guias_movilizacion: [t("numero", "Número de guía ICA"), t("especie", "Especie"), t("cantidad", "Cantidad de animales"), t("origen", "Predio de origen"), t("destino", "Predio o lugar de destino"), t("transportador", "Transportador"), t("placa", "Placa del vehículo")],
  proyectos_fund: [t("financiador", "Financiador"), t("objetivo", "Objetivo del proyecto"), t("beneficiarios_meta", "Beneficiarios meta"), t("indicador", "Indicador principal"), t("ejecutado", "Presupuesto ejecutado (COP)"), d("informe", "Próximo informe al financiador")],
  voluntarios_fund: [t("documento", "Documento"), tel("telefono", "Teléfono"), em("correo", "Correo electrónico"), t("area", "Área de trabajo"), t("horas_mes", "Horas al mes"), sel("certificado", "Certificado de voluntariado", ["Pendiente", "Entregado"])],
  grupos_iglesia: [t("lider", "Líder"), sel("dia", "Día de reunión", ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]), t("hora", "Hora"), t("direccion", "Dirección de la reunión"), t("integrantes", "Cantidad de integrantes"), t("material", "Material de estudio")],
  visitas_iglesia: [t("miembro", "Miembro visitado"), sel("motivo", "Motivo", ["Hospital", "Consejería", "Oración", "Seguimiento a nuevos", "Duelo", "Bautizo"]), t("direccion", "Dirección o lugar"), t("quien_visita", "Pastor o líder que visita"), t("hora", "Hora")],
};
