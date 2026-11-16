import type { CampoExtra, ConfigModulo, EstadoModulo } from "@/lib/modulos-config";

/**
 * Configuración de los módulos propios de los sectores con operación específica:
 * ferretería, supermercado, carnicería y fruver, licorera, floristería, óptica, guardería,
 * alquiler de vehículos, seguridad y aseo, ganadería, fundaciones e iglesias.
 */

const t = (clave: string, etiqueta: string, placeholder?: string): CampoExtra => ({ clave, etiqueta, tipo: "text", placeholder });
const tel = (clave: string, etiqueta: string): CampoExtra => ({ clave, etiqueta, tipo: "tel" });
const d = (clave: string, etiqueta: string): CampoExtra => ({ clave, etiqueta, tipo: "date" });
const sel = (clave: string, etiqueta: string, opciones: string[]): CampoExtra => ({ clave, etiqueta, tipo: "select", opciones });
const SI_NO = ["Sí", "No"];
const PAGO = sel("forma_pago", "Forma de pago", ["Efectivo", "Transferencia", "Nequi", "Daviplata", "Tarjeta"]);

const vc = (
  placeholderTitulo: string,
  placeholderDetalle: string,
  etiquetaContacto: string,
  etiquetaMonto: string,
  etiquetaFecha: string,
  resumen: string,
  estados?: EstadoModulo[],
): Partial<ConfigModulo> => ({
  placeholderTitulo, placeholderDetalle, etiquetaContacto, etiquetaMonto, etiquetaFecha, resumen,
  ...(estados ? { estados } : {}),
});
const est = (...pares: [string, string][]): EstadoModulo[] => pares.map(([clave, texto]) => ({ clave, texto }));

/** Comportamiento (preset) de cada módulo nuevo. */
export const PRESET_SECTORES: Record<string, string> = {
  estilistas_belleza: "proyecto", disponibilidad_belleza: "cita",
  referencias_ferr: "stock", despachos_ferr: "proyecto", cotizaciones_ferr: "venta", listas_precios_ferr: "stock",
  productos_super: "stock", vencimientos_super: "vencimiento", promociones_super: "venta", reposicion_super: "stock",
  cortes_carne: "stock", mermas_fresco: "pago", pedidos_fresco: "reserva", cadena_frio: "vencimiento",
  referencias_licor: "stock", permisos_licor: "vencimiento", domicilios_licor: "proyecto", combos_licor: "venta",
  arreglos_flor: "stock", encargos_flor: "reserva", flores_frescas: "vencimiento", fechas_especiales: "proyecto",
  formulas_optica: "paciente", monturas_optica: "stock", pedidos_lab_optica: "proyecto", examenes_visuales: "cita",
  ninos_inscritos: "estudiante", asistencia_guarderia: "proyecto", recogida_guarderia: "vencimiento", reportes_guarderia: "proyecto",
  flota_alquiler: "vencimiento", reservas_alquiler: "reserva", contratos_alquiler: "proyecto", entregas_alq: "proyecto", multas_alquiler: "cartera",
  puestos_seg: "proyecto", turnos_seg: "proyecto", dotacion_seg: "stock", novedades_seg: "proyecto",
  lotes_ganado: "proyecto", produccion_pecuaria: "proyecto", sanidad_pecuaria: "vencimiento", alimentacion_pecuaria: "stock", guias_movilizacion: "vencimiento",
  beneficiarios_fund: "socio", donaciones_fund: "pago", proyectos_fund: "proyecto", voluntarios_fund: "proyecto",
  miembros_iglesia: "socio", aportes_iglesia: "pago", eventos_iglesia: "reserva", grupos_iglesia: "proyecto", visitas_iglesia: "cita",
};

/** Textos y etiquetas propios de cada módulo. */
export const VOCAB_SECTORES: Record<string, Partial<ConfigModulo>> = {
  // Belleza
  estilistas_belleza: vc("Estilista o cabina (nombre)", "Especialidades (corte, color, uñas, masajes), silla o cabina asignada y observaciones", "Teléfono del estilista", "Comisión por servicio (%)", "Trabaja con nosotros desde", "Estilistas y cabinas activos",
    est(["pendiente", "Activo"], ["en_proceso", "De vacaciones o incapacidad"], ["hecho", "Retirado"])),
  disponibilidad_belleza: vc("Turno o bloqueo (estilista, silla o cabina)", "Horario, descanso o motivo del bloqueo (capacitación, mantenimiento, permiso)", "Estilista", "Sin valor", "Fecha del bloqueo", "Bloqueos vigentes"),
  // Ferretería
  referencias_ferr: vc("Referencia (ej. tubo PVC 1/2, cemento gris 50 kg)", "Marca, medida, unidad de venta, ubicación en bodega y proveedor", "Proveedor", "Precio de venta (COP)", "Último ingreso", "Referencias por reponer"),
  despachos_ferr: vc("Despacho a obra (cliente y obra)", "Materiales enviados, remisión, conductor y quién recibe", "Cliente o maestro de obra", "Valor del despacho (COP)", "Fecha de entrega", "Despachos por entregar",
    est(["pendiente", "Por despachar"], ["en_proceso", "En ruta"], ["hecho", "Entregado"])),
  cotizaciones_ferr: vc("Cotización de materiales (cliente y obra)", "Lista de materiales, cantidades, descuentos y flete", "Cliente o constructor", "Valor cotizado (COP)", "Vigente hasta", "Cotizaciones por cerrar"),
  listas_precios_ferr: vc("Lista de precios (proveedor)", "Fecha de la lista, variación frente a la anterior y condiciones de pago", "Proveedor", "Valor de referencia (COP)", "Vigente desde", "Listas por actualizar"),
  // Supermercado
  productos_super: vc("Producto (nombre y código de barras)", "Categoría, IVA, proveedor, ubicación en góndola y stock mínimo", "Proveedor", "Precio de venta (COP)", "Último ingreso", "Productos por reponer"),
  vencimientos_super: vc("Producto próximo a vencer (nombre y lote)", "Cantidad, ubicación y acción: rotar, descuento o devolver", "Responsable de góndola", "Costo en riesgo (COP)", "Fecha de vencimiento", "Productos por vencer",
    est(["pendiente", "Vigente"], ["por_vencer", "Por vencer"], ["vencido", "Vencido"], ["hecho", "Retirado o vendido"])),
  promociones_super: vc("Promoción (ej. 2x1 en aseo, precio especial)", "Productos incluidos, vigencia y quién la autorizó", "Proveedor que la patrocina", "Precio promocional (COP)", "Vigente hasta", "Promociones activas"),
  reposicion_super: vc("Pedido de reposición (proveedor)", "Productos agotados, día de visita del proveedor y pedido mínimo", "Proveedor", "Valor del pedido (COP)", "Fecha de entrega esperada", "Pedidos por hacer"),
  // Carnicería y fruver
  cortes_carne: vc("Producto fresco (ej. res lomo, tomate, pollo entero)", "Peso en existencia, costo por kilo, merma esperada y proveedor", "Proveedor", "Precio por kilo (COP)", "Fecha de ingreso", "Productos por reponer"),
  mermas_fresco: vc("Producto perdido (ej. 3 kg de tomate)", "Causa: maduró, vencido, daño por frío o recorte, y quién lo autorizó", "Responsable", "Costo de la pérdida (COP)", "Fecha de la pérdida", "Pérdidas por revisar",
    est(["pendiente", "Registrada"], ["en_proceso", "En revisión"], ["hecho", "Analizada"])),
  pedidos_fresco: vc("Pedido (cliente y productos por peso)", "Pesos pedidos, dirección, hora de entrega y forma de pago", "Cliente", "Valor del pedido (COP)", "Fecha y hora de entrega", "Pedidos por entregar"),
  cadena_frio: vc("Control de frío (ej. nevera de carnes, cuarto frío)", "Temperatura medida, rango permitido y acción correctiva", "Responsable del control", "Costo de la revisión (COP)", "Fecha del control", "Controles por hacer",
    est(["pendiente", "En rango"], ["por_vencer", "Por revisar"], ["vencido", "Fuera de rango"], ["hecho", "Corregido"])),
  // Licorera
  referencias_licor: vc("Referencia (marca, grados y presentación)", "Cantidad, costo, estampilla y ubicación", "Proveedor", "Precio de venta (COP)", "Último ingreso", "Referencias por reponer"),
  permisos_licor: vc("Permiso (ej. licencia de funcionamiento, bomberos, horario permitido)", "Entidad, número del permiso y requisitos para renovar", "Entidad o gestor", "Valor del trámite (COP)", "Fecha de vencimiento", "Permisos por renovar",
    est(["pendiente", "Vigente"], ["por_vencer", "Por vencer"], ["vencido", "Vencido"], ["hecho", "Renovado"])),
  domicilios_licor: vc("Domicilio (cliente y pedido)", "Dirección, verificación de mayoría de edad con documento y repartidor", "Cliente", "Valor del pedido (COP)", "Fecha y hora", "Domicilios por entregar",
    est(["pendiente", "Por despachar"], ["en_proceso", "En camino"], ["hecho", "Entregado"], ["cancelado", "Rechazado (sin verificar edad)"])),
  combos_licor: vc("Combo (ej. media de aguardiente + gaseosa)", "Contenido, ocasión y condiciones", "Canal (mostrador o domicilio)", "Precio del combo (COP)", "Vigente hasta", "Combos activos"),
  // Floristería
  arreglos_flor: vc("Arreglo (ej. ramo de 12 rosas, caja de girasoles)", "Flores incluidas, tamaño, tiempo de armado y costo", "Florista", "Precio de venta (COP)", "Disponible hasta", "Arreglos del catálogo"),
  encargos_flor: vc("Encargo (destinatario y arreglo)", "Dedicatoria, dirección de entrega, hora y ocasión", "Quien envía", "Valor del encargo (COP)", "Fecha y hora de entrega", "Encargos por entregar",
    est(["pendiente", "Por armar"], ["en_proceso", "Armado"], ["entregado", "Entregado"], ["cancelado", "Cancelado"])),
  flores_frescas: vc("Flor o insumo (ej. rosa roja, follaje)", "Tallos recibidos, vida útil en días y merma", "Proveedor", "Costo de la compra (COP)", "Se debe usar antes de", "Flores por usar",
    est(["pendiente", "Fresca"], ["por_vencer", "Por usar ya"], ["vencido", "Perdida"], ["hecho", "Usada"])),
  fechas_especiales: vc("Fecha especial (ej. Día de la Madre)", "Pedidos esperados, flores compradas con anticipación y fecha límite de pedidos", "Responsable de la temporada", "Presupuesto de compra (COP)", "Fecha de la celebración", "Temporadas por preparar"),
  // Óptica
  formulas_optica: vc("Fórmula del cliente (nombre y documento)", "Esfera, cilindro, eje, adición y distancia pupilar de cada ojo", "Optómetra", "Valor del examen (COP)", "Vigencia de la fórmula", "Fórmulas vigentes"),
  monturas_optica: vc("Montura (marca y referencia)", "Material, color, género y ubicación en vitrina", "Proveedor", "Precio de venta (COP)", "Fecha de ingreso", "Monturas por reponer"),
  pedidos_lab_optica: vc("Pedido al laboratorio (cliente y tipo de lente)", "Fórmula, tratamiento (antirreflejo, filtro azul), montura y saldo", "Laboratorio", "Valor del pedido (COP)", "Fecha prometida al cliente", "Pedidos en laboratorio",
    est(["pendiente", "Por enviar"], ["en_proceso", "En laboratorio"], ["hecho", "Listo para entregar"], ["entregado", "Entregado"])),
  examenes_visuales: vc("Examen visual (cliente y tipo)", "Motivo, optómetra y observaciones", "Cliente", "Valor del examen (COP)", "Fecha y hora", "Exámenes por atender"),
  // Guardería
  ninos_inscritos: vc("Niño o niña inscrito (nombre y grupo)", "Alergias, EPS, personas autorizadas y observaciones del acudiente", "Acudiente", "Mensualidad (COP)", "Fecha de ingreso", "Niños con matrícula activa"),
  asistencia_guarderia: vc("Asistencia del día (niño y fecha)", "Hora de entrada y salida, estado de salud y quién lo recogió", "Quien entrega", "Cobro extra por hora adicional (COP)", "Fecha", "Asistencias por registrar"),
  recogida_guarderia: vc("Persona autorizada (nombre y niño)", "Parentesco, documento y foto registrada", "Teléfono de la persona", "Sin valor", "Autorización vigente hasta", "Autorizaciones por renovar",
    est(["pendiente", "Vigente"], ["por_vencer", "Por vencer"], ["vencido", "Vencida"], ["hecho", "Renovada"])),
  reportes_guarderia: vc("Reporte diario (niño y fecha)", "Comidas, siestas, pañales, actividades y mensaje para el acudiente", "Profesora a cargo", "Sin valor", "Fecha del reporte", "Reportes por enviar"),
  // Alquiler de vehículos
  flota_alquiler: vc("Vehículo (placa, marca y modelo)", "Tarifa por día, kilometraje, seguro y estado actual", "Responsable del vehículo", "Tarifa por día (COP)", "Próximo vencimiento", "Vehículos con papeles por renovar",
    est(["pendiente", "Disponible"], ["en_proceso", "Alquilado"], ["por_vencer", "En mantenimiento"], ["vencido", "Papeles vencidos"])),
  reservas_alquiler: vc("Reserva (cliente y vehículo)", "Fechas de salida y devolución, depósito y kilometraje permitido", "Cliente", "Depósito o anticipo (COP)", "Fecha de salida", "Reservas por entregar"),
  contratos_alquiler: vc("Contrato de alquiler (cliente y placa)", "Kilometraje y combustible de salida, licencia, póliza y firma", "Cliente", "Valor del contrato (COP)", "Fecha de devolución", "Contratos activos"),
  entregas_alq: vc("Devolución de vehículo (contrato y placa)", "Kilometraje y combustible de entrada, daños encontrados y cobros extra", "Cliente", "Cobro extra (COP)", "Fecha de devolución", "Devoluciones por inspeccionar"),
  multas_alquiler: vc("Multa o peaje (placa y comparendo)", "Fecha de la infracción, entidad y a qué cliente se traslada", "Cliente responsable", "Valor de la multa (COP)", "Fecha límite de pago", "Multas por cobrar"),
  // Seguridad y aseo
  puestos_seg: vc("Puesto o contrato (cliente y sede)", "Cantidad de guardas o aseadoras, tipo de turno, supervisor y valor mensual", "Cliente", "Valor mensual del contrato (COP)", "Vence el contrato", "Contratos activos"),
  turnos_seg: vc("Turno (empleado y puesto)", "Horario, reemplazos, descansos y novedades del turno", "Empleado", "Sin valor", "Fecha del turno", "Turnos por cubrir"),
  dotacion_seg: vc("Dotación (elemento y empleado)", "Talla, fecha de entrega y próxima entrega obligatoria", "Empleado", "Costo del elemento (COP)", "Próxima entrega", "Dotaciones por entregar"),
  novedades_seg: vc("Novedad (puesto y tipo)", "Qué pasó, quién lo reportó y la acción tomada", "Reportado por", "Costo del incidente (COP)", "Fecha de la novedad", "Novedades abiertas"),
  // Ganadería y avícola
  lotes_ganado: vc("Lote (especie y potrero o galpón)", "Cantidad de animales, raza, peso promedio y meta", "Responsable del lote", "Valor estimado del lote (COP)", "Fecha de ingreso", "Lotes activos"),
  produccion_pecuaria: vc("Producción del día (lote)", "Litros de leche, huevos o kilos de carne y destino de la venta", "Responsable", "Valor de lo producido (COP)", "Fecha de producción", "Producción por vender"),
  sanidad_pecuaria: vc("Vacuna o tratamiento (lote y producto)", "Dosis, veterinario, registro ICA y próxima aplicación", "Veterinario", "Costo del tratamiento (COP)", "Próxima aplicación", "Vacunas por aplicar",
    est(["pendiente", "Vigente"], ["por_vencer", "Por aplicar"], ["vencido", "Atrasada"], ["hecho", "Aplicada"])),
  alimentacion_pecuaria: vc("Alimento o insumo (ej. concentrado engorde)", "Bultos en bodega, lote que lo consume y mínimo", "Proveedor", "Costo por bulto (COP)", "Último ingreso", "Alimento por reponer"),
  guias_movilizacion: vc("Guía de movilización (origen y destino)", "Número de guía del ICA, cantidad de animales y transportador", "Transportador", "Costo de la guía (COP)", "Vence la guía", "Guías por tramitar",
    est(["pendiente", "Vigente"], ["por_vencer", "Por vencer"], ["vencido", "Vencida"], ["hecho", "Movilización cumplida"])),
  // Fundaciones
  beneficiarios_fund: vc("Beneficiario (nombre y programa)", "Necesidad atendida, acudiente, consentimiento y seguimiento", "Acudiente o contacto", "Valor de la ayuda recibida (COP)", "Fecha de ingreso", "Beneficiarios activos"),
  donaciones_fund: vc("Donación (donante y tipo)", "Si es en dinero o en especie, proyecto al que se destina y certificado", "Donante", "Valor de la donación (COP)", "Fecha de la donación", "Donaciones por certificar"),
  proyectos_fund: vc("Proyecto (nombre y financiador)", "Objetivo, indicadores, beneficiarios meta y presupuesto ejecutado", "Responsable", "Presupuesto (COP)", "Fecha del informe", "Proyectos en ejecución"),
  voluntarios_fund: vc("Voluntario (nombre y área)", "Disponibilidad, horas al mes y certificado de voluntariado", "Voluntario", "Sin valor", "Fecha de ingreso", "Voluntarios activos"),
  // Iglesias y clubes
  miembros_iglesia: vc("Miembro (nombre y ministerio)", "Estado, bautizo, célula o grupo y datos de contacto", "Miembro", "Aporte mensual comprometido (COP)", "Fecha de ingreso", "Miembros activos"),
  aportes_iglesia: vc("Aporte (miembro y concepto)", "Diezmo, ofrenda o pacto, culto y número de recibo", "Miembro", "Valor del aporte (COP)", "Fecha del aporte", "Aportes por registrar"),
  eventos_iglesia: vc("Evento (nombre y tipo)", "Lugar, responsable, asistentes esperados y presupuesto", "Responsable", "Presupuesto del evento (COP)", "Fecha del evento", "Eventos por realizar"),
  grupos_iglesia: vc("Grupo o célula (nombre y líder)", "Día de reunión, dirección, integrantes y material de estudio", "Líder", "Sin valor", "Próxima reunión", "Grupos activos"),
  visitas_iglesia: vc("Visita pastoral (miembro y motivo)", "Hospital, consejería, oración o seguimiento a nuevos", "Miembro", "Sin valor", "Fecha y hora", "Visitas por hacer"),
};

/** Campos propios de cada módulo nuevo (se guardan en `datos`). */
export const CAMPOS_SECTORES: Record<string, CampoExtra[]> = {
  estilistas_belleza: [
    t("documento", "Documento"), tel("telefono", "Teléfono o WhatsApp"),
    sel("especialidad", "Especialidad", ["Corte y peinado", "Color y mechas", "Barbería", "Manicure y pedicure", "Cejas y pestañas", "Masajes y spa", "Maquillaje", "Depilación", "Tratamientos faciales", "Varias"]),
    t("servicios_que_presta", "Servicios que presta", "Ej. corte dama, tinte, keratina"),
    t("puesto", "Silla, puesto o cabina asignada", "Ej. Silla 2, Cabina 1"),
    sel("tipo_pago", "Forma de pago", ["Comisión por servicio", "Alquiler de silla", "Salario fijo", "Mixto"]),
    t("comision", "Comisión por servicio (%)", "Ej. 40"),
    t("comision_productos", "Comisión por venta de productos (%)", "Ej. 10"),
    t("horario", "Horario habitual", "Ej. Mar a sáb 9:00 a. m. a 6:00 p. m."),
  ],
  disponibilidad_belleza: [
    t("estilista", "Estilista"), t("puesto", "Silla o cabina"), d("fecha", "Fecha"),
    t("hora_inicio", "Desde", "Ej. 2:00 p. m."), t("hora_fin", "Hasta", "Ej. 4:00 p. m."),
    sel("motivo", "Motivo", ["Almuerzo o descanso", "Día libre", "Permiso", "Capacitación", "Mantenimiento de silla o cabina", "Cita especial (novia, evento)", "Otro"]),
  ],
  referencias_ferr: [
    t("codigo", "Código o referencia"), t("marca", "Marca"),
    sel("unidad", "Unidad de venta", ["Unidad", "Metro", "Kilo", "Bulto", "Galón", "Caja", "Rollo", "Lámina"]),
    sel("venta_fraccionada", "Se vende por fracción o corte", SI_NO),
    t("cantidad", "Cantidad en bodega"), t("minimo", "Stock mínimo"), t("costo", "Costo de compra (COP)"), t("margen", "Margen (%)"), t("ubicacion", "Ubicación en bodega"),
  ],
  despachos_ferr: [t("obra_dir", "Dirección de la obra"), t("remision", "Número de remisión"), t("conductor", "Conductor o domiciliario"), t("placa", "Placa del vehículo"), t("material_resumen", "Materiales despachados"), PAGO],
  cotizaciones_ferr: [t("obra", "Obra o proyecto"), d("vigencia", "Vigente hasta"), t("descuento", "Descuento (%)"), t("flete", "Flete (COP)"), t("plazo_pago", "Plazo de pago (días)"), PAGO],
  listas_precios_ferr: [t("proveedor", "Proveedor"), d("vigente_desde", "Vigente desde"), t("variacion", "Variación frente a la lista anterior (%)"), t("condiciones", "Condiciones de pago"), t("referencias_incluidas", "Referencias incluidas")],
  productos_super: [
    t("codigo_barras", "Código de barras"),
    sel("categoria", "Categoría", ["Abarrotes", "Lácteos", "Carnes y frías", "Frutas y verduras", "Aseo", "Cuidado personal", "Licores", "Snacks", "Mascotas", "Otros"]),
    sel("iva", "IVA", ["Exento", "5 %", "19 %"]),
    t("cantidad", "Cantidad en existencia"), t("minimo", "Stock mínimo"), t("costo", "Costo de compra (COP)"), t("ubicacion", "Pasillo o góndola"),
  ],
  vencimientos_super: [t("lote", "Lote"), d("vence", "Fecha de vencimiento"), t("cantidad", "Cantidad"), sel("accion", "Acción", ["Rotar a primera fila", "Poner en descuento", "Devolver al proveedor", "Donar", "Retirar"])],
  promociones_super: [sel("tipo_promo", "Tipo de promoción", ["2x1", "Descuento %", "Precio especial", "Combo", "Segunda unidad", "Lleve 3 pague 2"]), d("vigencia_desde", "Inicia"), t("descuento", "Descuento (%)"), t("productos", "Productos incluidos"), t("autorizado_por", "Autorizada por")],
  reposicion_super: [t("dia_visita", "Día de visita del proveedor"), t("minimo_pedido", "Pedido mínimo (COP)"), t("cantidad_sugerida", "Cantidad sugerida"), d("ultimo_pedido", "Último pedido")],
  cortes_carne: [
    sel("tipo", "Tipo", ["Res", "Cerdo", "Pollo", "Pescado", "Embutidos", "Fruta", "Verdura", "Tubérculo"]),
    sel("unidad", "Unidad de venta", ["Kilo", "Libra", "Unidad", "Atado", "Bandeja"]),
    t("peso_stock", "Peso en existencia (kg)"), t("costo_kilo", "Costo por kilo (COP)"), t("merma_pct", "Merma esperada (%)"), d("fecha_ingreso", "Fecha de ingreso"), t("invima", "Registro sanitario o INVIMA"),
  ],
  mermas_fresco: [t("producto", "Producto"), t("kilos_perdidos", "Kilos perdidos"), sel("causa", "Causa", ["Maduró de más", "Vencido", "Daño por frío", "Recorte o desperdicio", "Devolución", "Pérdida o robo"]), t("responsable", "Responsable")],
  pedidos_fresco: [t("direccion", "Dirección de entrega"), t("peso_pedido", "Peso total pedido (kg)"), t("hora_entrega", "Hora de entrega"), t("telefono", "Teléfono"), PAGO],
  cadena_frio: [t("equipo", "Equipo (nevera, cuarto frío)"), t("temperatura", "Temperatura medida (°C)"), t("rango_ok", "Rango permitido (°C)", "Ej. 0 a 4"), t("responsable", "Responsable"), t("accion_correctiva", "Acción correctiva")],
  referencias_licor: [
    t("marca", "Marca"), t("grados", "Grados de alcohol (%)"),
    sel("presentacion", "Presentación", ["Botella 750 ml", "Media", "Litro", "Six pack", "Caja", "Lata", "Garrafa"]),
    t("cantidad", "Cantidad en existencia"), t("minimo", "Stock mínimo"), t("costo", "Costo de compra (COP)"), t("estampilla", "Estampilla o impuesto de licores"),
  ],
  permisos_licor: [t("entidad", "Entidad que lo expide"), t("numero", "Número del permiso"), t("horario_permitido", "Horario permitido de venta"), d("vence", "Fecha de vencimiento"), t("responsable", "Responsable de renovar")],
  domicilios_licor: [t("direccion", "Dirección"), sel("mayor_edad", "Mayoría de edad", ["Verificada con documento", "Pendiente", "Rechazado por menor de edad"]), t("repartidor", "Repartidor"), t("hora", "Hora"), PAGO],
  combos_licor: [t("contenido", "Contenido del combo"), t("precio_combo", "Precio del combo (COP)"), d("vigencia", "Vigente hasta"), sel("ocasion", "Ocasión", ["Fin de semana", "Quincena", "Partido", "Fiesta", "Navidad", "Otra"])],
  arreglos_flor: [
    sel("tipo", "Tipo", ["Ramo", "Caja de flores", "Arreglo en base", "Corona fúnebre", "Planta", "Globos", "Peluche"]),
    t("flores_incluidas", "Flores incluidas"), sel("tamano", "Tamaño", ["Pequeño", "Mediano", "Grande", "Premium"]), t("costo_arreglo", "Costo de armado (COP)"), t("tiempo_armado", "Tiempo de armado"),
  ],
  encargos_flor: [
    t("destinatario", "Nombre del destinatario"), t("direccion_entrega", "Dirección de entrega"), t("dedicatoria", "Dedicatoria o tarjeta"), t("hora_entrega", "Hora de entrega"),
    sel("ocasion", "Ocasión", ["Cumpleaños", "Aniversario", "San Valentín", "Día de la Madre", "Duelo", "Grado", "Nacimiento", "Otra"]),
    sel("foto_entrega", "Foto de entrega", ["Pendiente", "Enviada al cliente"]), tel("telefono", "Teléfono de quien envía"), PAGO,
  ],
  flores_frescas: [t("flor", "Flor o insumo"), t("tallos", "Tallos recibidos"), d("ingreso", "Fecha de ingreso"), t("vida_dias", "Vida útil (días)"), t("merma", "Tallos perdidos"), t("proveedor", "Proveedor")],
  fechas_especiales: [
    sel("celebracion", "Celebración", ["San Valentín", "Día de la Madre", "Día del Padre", "Amor y Amistad", "Grados", "Navidad", "Otra"]),
    t("pedidos_esperados", "Pedidos esperados"), t("flores_compradas", "Flores compradas por anticipado"), d("fecha_limite_pedidos", "Fecha límite para recibir pedidos"),
  ],
  formulas_optica: [
    t("paciente_doc", "Documento del cliente"), t("od", "Ojo derecho (esfera / cilindro / eje)", "Ej. -1.50 / -0.50 / 90"), t("oi", "Ojo izquierdo (esfera / cilindro / eje)"),
    t("adicion", "Adición"), t("dp", "Distancia pupilar (mm)"), t("optometra", "Optómetra"), d("fecha_examen", "Fecha del examen"), d("vigencia", "Fórmula vigente hasta"),
  ],
  monturas_optica: [t("marca", "Marca"), sel("material", "Material", ["Acetato", "Metal", "Titanio", "Pasta", "Al aire"]), sel("genero", "Para", ["Hombre", "Mujer", "Unisex", "Niño"]), t("color", "Color"), t("cantidad", "Cantidad"), t("costo", "Costo (COP)")],
  pedidos_lab_optica: [
    t("laboratorio", "Laboratorio"), sel("tipo_lente", "Tipo de lente", ["Monofocal", "Bifocal", "Progresivo", "Lentes de contacto"]),
    sel("tratamiento", "Tratamiento", ["Antirreflejo", "Fotocromático", "Filtro azul", "Ninguno"]), t("formula_ref", "Fórmula asociada"), d("fecha_promesa", "Fecha prometida"), t("saldo", "Saldo por cobrar (COP)"),
  ],
  examenes_visuales: [t("documento", "Documento del cliente"), t("optometra", "Optómetra"), sel("tipo_examen", "Tipo de examen", ["Optometría", "Campimetría", "Contactología", "Control", "Examen para licencia"]), t("hora", "Hora")],
  ninos_inscritos: [
    d("nacimiento", "Fecha de nacimiento"), t("acudiente_1", "Acudiente principal"), tel("tel_acudiente", "Teléfono del acudiente"), t("acudiente_2", "Segundo acudiente"),
    t("alergias", "Alergias o condiciones de salud"), t("eps", "EPS"),
    sel("grupo", "Grupo", ["Sala cuna", "Caminadores", "Párvulos", "Pre-jardín", "Jardín", "Transición"]),
    sel("horario", "Jornada", ["Media jornada", "Jornada completa", "Extendida"]),
  ],
  asistencia_guarderia: [
    d("fecha", "Fecha"), t("hora_entrada", "Hora de entrada"), t("hora_salida", "Hora de salida"), t("quien_recoge", "Quién lo recoge"),
    sel("estado_nino", "Estado de salud", ["Bien", "Con fiebre", "Decaído", "Se retiró temprano"]), t("observacion", "Observación"),
  ],
  recogida_guarderia: [t("nino", "Niño o niña"), t("parentesco", "Parentesco"), t("documento", "Documento"), tel("telefono", "Teléfono"), sel("foto", "Foto de la persona", ["Registrada", "Pendiente"]), d("vence_autorizacion", "Autorización vigente hasta")],
  reportes_guarderia: [t("nino", "Niño o niña"), sel("comidas", "Comidas", ["Comió todo", "Comió poco", "No comió"]), t("siestas", "Siestas"), t("panales", "Pañales o baño"), t("actividad", "Actividad del día"), t("mensaje_acudiente", "Mensaje para el acudiente")],
  flota_alquiler: [
    t("placa", "Placa"), sel("tipo", "Tipo", ["Sedán", "SUV", "Camioneta", "Moto", "Van", "Camión"]), t("tarifa_dia", "Tarifa por día (COP)"), t("km_actual", "Kilometraje actual"),
    d("soat_vence", "Vence el SOAT"), d("tecnomecanica_vence", "Vence la tecnomecánica"), d("seguro_vence", "Vence el seguro todo riesgo"), d("proximo_mantenimiento", "Próximo mantenimiento"),
  ],
  reservas_alquiler: [t("placa", "Placa del vehículo"), d("fecha_devolucion", "Fecha de devolución"), t("licencia", "Licencia de conducción"), t("deposito", "Depósito de garantía (COP)"), t("km_limite", "Kilometraje permitido"), t("conductor_adicional", "Conductor adicional"), PAGO],
  contratos_alquiler: [
    t("numero_contrato", "Número de contrato"), t("placa", "Placa"), t("km_salida", "Kilometraje de salida"),
    sel("combustible_salida", "Combustible al salir", ["Lleno", "3/4", "1/2", "1/4", "Reserva"]), d("vence_licencia", "Vence la licencia del cliente"), t("poliza", "Póliza o seguro"), sel("firma", "Contrato firmado", SI_NO),
  ],
  entregas_alq: [t("placa", "Placa"), t("km_entrada", "Kilometraje de entrada"), sel("combustible_entrada", "Combustible al regresar", ["Lleno", "3/4", "1/2", "1/4", "Reserva"]), t("danos", "Daños encontrados"), t("cobro_extra", "Cobros extra (COP)"), sel("estado_inspeccion", "Inspección", ["Sin novedad", "Con daños", "Pendiente"])],
  multas_alquiler: [t("placa", "Placa"), d("fecha_infraccion", "Fecha de la infracción"), t("entidad", "Entidad o peaje"), t("comparendo", "Número de comparendo"), sel("trasladar_cliente", "Trasladar al cliente", SI_NO)],
  puestos_seg: [
    t("cliente_nit", "NIT del cliente"), t("puesto", "Nombre del puesto o sede"), t("num_guardas", "Número de personas"),
    sel("tipo_turno", "Tipo de turno", ["12 horas", "8 horas", "24 horas", "Fines de semana", "Medio tiempo"]), d("inicio", "Inicio del contrato"), t("supervisor", "Supervisor"),
  ],
  turnos_seg: [t("puesto", "Puesto"), d("fecha", "Fecha"), sel("turno", "Turno", ["Diurno", "Nocturno", "Mixto", "Descanso"]), t("hora_ingreso", "Hora de ingreso"), t("reemplazo", "Reemplazo"), t("novedad", "Novedad")],
  dotacion_seg: [
    sel("elemento", "Elemento", ["Uniforme", "Botas", "Radio", "Linterna", "Chaleco", "Implementos de aseo", "Químicos"]), t("talla", "Talla"), t("empleado", "Empleado"),
    d("entrega", "Fecha de entrega"), d("proxima_entrega", "Próxima entrega obligatoria"),
  ],
  novedades_seg: [t("puesto", "Puesto"), sel("tipo", "Tipo", ["Incidente", "Falta del empleado", "Reemplazo", "Queja del cliente", "Accidente", "Hurto"]), t("reportado_por", "Reportado por"), t("accion", "Acción tomada")],
  lotes_ganado: [
    sel("especie", "Especie", ["Bovino", "Porcino", "Aves de postura", "Pollos de engorde", "Ovino o caprino", "Equino"]),
    t("cantidad", "Cantidad de animales"), t("potrero", "Potrero o galpón"), t("raza", "Raza"), t("peso_promedio", "Peso promedio (kg)"), t("meta_peso", "Peso meta (kg)"), d("fecha_ingreso", "Fecha de ingreso"),
  ],
  produccion_pecuaria: [t("lote", "Lote"), t("litros_leche", "Litros de leche"), t("huevos", "Huevos recogidos"), t("kilos_carne", "Kilos de carne"), d("fecha", "Fecha"), t("destino", "Destino de la venta")],
  sanidad_pecuaria: [
    t("lote_animal", "Lote o animal"),
    sel("vacuna", "Vacuna o tratamiento", ["Fiebre aftosa", "Brucelosis", "Carbón", "Rabia", "Desparasitante", "Newcastle", "Gumboro", "Otro"]),
    d("fecha_aplicada", "Fecha de aplicación"), d("proxima", "Próxima aplicación"), t("veterinario", "Veterinario"), t("registro_ica", "Registro ICA del producto"),
  ],
  alimentacion_pecuaria: [
    sel("tipo", "Tipo", ["Concentrado", "Sal mineralizada", "Silo o heno", "Pasto", "Medicina", "Vitaminas"]),
    t("bultos", "Bultos en bodega"), t("minimo", "Mínimo de bultos"), t("costo_bulto", "Costo por bulto (COP)"), t("lote_destino", "Lote que lo consume"), d("vence", "Fecha de vencimiento"),
  ],
  guias_movilizacion: [t("guia_ica", "Número de guía ICA"), t("origen", "Finca de origen"), t("destino", "Destino"), t("cantidad", "Cantidad de animales"), t("transportador", "Transportador"), d("vence_guia", "Vence la guía")],
  beneficiarios_fund: [
    t("documento", "Documento"), tel("telefono", "Teléfono"), t("direccion", "Dirección"), t("programa", "Programa en el que participa"),
    t("necesidad", "Necesidad atendida"), t("acudiente", "Acudiente"), sel("consentimiento", "Consentimiento firmado", SI_NO),
  ],
  donaciones_fund: [
    t("donante", "Donante"), t("doc", "Documento o NIT del donante"), sel("tipo_donacion", "Tipo", ["Dinero", "En especie", "Recurrente", "Empresa"]),
    sel("certificado", "Certificado de donación", ["Pendiente", "Emitido"]), t("destino_proyecto", "Proyecto al que se destina"), PAGO,
  ],
  proyectos_fund: [t("financiador", "Financiador"), t("presupuesto", "Presupuesto aprobado (COP)"), t("ejecutado", "Ejecutado hasta hoy (COP)"), d("fecha_inicio", "Fecha de inicio"), t("indicador", "Indicador principal"), t("beneficiarios_meta", "Beneficiarios meta"), d("informe_vence", "Entrega del informe")],
  voluntarios_fund: [t("documento", "Documento"), tel("telefono", "Teléfono"), t("area", "Área de apoyo"), t("horas_mes", "Horas al mes"), t("disponibilidad", "Disponibilidad"), sel("certificado", "Certificado de voluntariado", ["Pendiente", "Emitido"])],
  miembros_iglesia: [
    t("documento", "Documento"), tel("telefono", "Teléfono"), t("direccion", "Dirección"), d("nacimiento", "Fecha de nacimiento"),
    sel("bautizado", "Bautizado", SI_NO), t("ministerio", "Ministerio o área de servicio"), t("grupo_celula", "Grupo o célula"), d("fecha_ingreso", "Fecha de ingreso"),
  ],
  aportes_iglesia: [
    sel("concepto", "Concepto", ["Diezmo", "Ofrenda", "Pacto", "Ofrenda misionera", "Construcción", "Ayuda social"]), t("miembro", "Miembro"), t("recibo", "Número de recibo"), t("culto", "Culto o reunión"), PAGO,
  ],
  eventos_iglesia: [
    sel("tipo", "Tipo de evento", ["Culto especial", "Retiro", "Campamento", "Bautismos", "Matrimonio", "Congreso", "Jornada social"]),
    t("lugar", "Lugar"), t("responsable", "Responsable"), t("asistentes", "Asistentes esperados"), t("presupuesto", "Presupuesto (COP)"),
  ],
  grupos_iglesia: [t("lider", "Líder"), t("dia_reunion", "Día y hora de reunión"), t("direccion", "Dirección"), t("integrantes", "Número de integrantes"), t("asistencia_promedio", "Asistencia promedio"), t("material", "Material de estudio")],
  visitas_iglesia: [t("miembro", "Miembro visitado"), sel("motivo", "Motivo", ["Hospital", "Consejería", "Oración", "Seguimiento a nuevos", "Duelo"]), t("hora", "Hora"), t("visitador", "Quién visita")],
};
