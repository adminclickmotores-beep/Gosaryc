import type { TipoNegocioClave } from "@/lib/modulos-negocio";

export type GuiaNegocio = {
  /** Frase fija que acompaña el panel de este tipo de negocio. */
  frase: string;
  /** Pasos propios del tipo de negocio para empezar rápido. */
  pasos: { titulo: string; texto: string }[];
};

type TiposNuevos =
  | "ferreteria" | "supermercado" | "carniceria" | "licorera" | "floristeria" | "optica"
  | "guarderia" | "alquiler_vehiculos" | "seguridad_aseo" | "ganaderia" | "fundacion" | "iglesia";

const GUIAS_BASE: Record<Exclude<TipoNegocioClave, TiposNuevos>, GuiaNegocio> = {
  restaurante: {
    frase: "Cada pedido a tiempo, cada cliente feliz.",
    pasos: [
      { titulo: "Arma tu menú", texto: "En la pestaña “Menú” crea categorías y agrega tus productos con su precio." },
      { titulo: "Comparte tu menú público", texto: "Usa el botón “Menú público” y envía el enlace por WhatsApp o redes." },
      { titulo: "Atiende los pedidos", texto: "En “Pedidos y cocina” mueve cada pedido: enviar a cocina, listo, en camino, entregado." },
      { titulo: "Controla tus insumos", texto: "En “Recetario e inventario” registra ingredientes y recetas para saber tu costo." },
      { titulo: "Concilia Rappi y las apps", texto: "En “Rappi, DiDi Food y apps” anota cada liquidación: venta bruta, comisión y lo que te consignaron." },
      { titulo: "Registra las mermas", texto: "En “Mermas y desperdicios” anota lo que se daña o se devuelve para ver cuánto te cuesta cada semana." },
      { titulo: "Cumple con sanidad y permisos", texto: "En “Sanidad y buenas prácticas” y “Permisos y licencias” guarda temperaturas, fumigaciones, concepto sanitario, bomberos y SAYCO-ACINPRO con su fecha de vencimiento." },
      { titulo: "Cuida la propina y el impoconsumo", texto: "La propina es voluntaria (sugerida 10%) y se reparte en “Propinas”. Tu contador te dirá si cobras impoconsumo (8%) o IVA según tu régimen." },
    ],
  },
  concesionario: {
    frase: "Cada vehículo, un cliente satisfecho.",
    pasos: [
      { titulo: "Carga tu inventario", texto: "Entra a “Inventario de vehículos” y registra placa, modelo, precio y estado." },
      { titulo: "Registra a los interesados", texto: "Anota cada cliente y programa su seguimiento para no perder ventas." },
      { titulo: "Cierra la venta", texto: "Usa cotizaciones, separaciones y “Ventas y entregas” para llevar el proceso completo." },
      { titulo: "No dejes vencer papeles", texto: "En “Trámites” y “Alertas de vencimientos” controla SOAT, tecnomecánica y traspasos." },
    ],
  },
  tienda: {
    frase: "Tu tienda en orden, tus ventas en crecimiento.",
    pasos: [
      { titulo: "Crea tu catálogo", texto: "En “Catálogo de productos” agrega lo que vendes con su precio." },
      { titulo: "Vigila el inventario", texto: "En “Inventario y reposición” registra existencias y mira qué se está acabando." },
      { titulo: "Controla fiados y caja", texto: "Anota quién te debe y cierra tu caja diaria en sus módulos." },
    ],
  },
  servicios: {
    frase: "Tu tiempo bien organizado, tus clientes bien atendidos.",
    pasos: [
      { titulo: "Define tus servicios", texto: "En “Catálogo de servicios” agrega cada servicio con su duración y precio." },
      { titulo: "Organiza tu agenda", texto: "Usa “Agenda y calendario” para registrar las citas del día." },
      { titulo: "Conoce a tus clientes", texto: "Guarda el historial de cada cliente y fideliza con paquetes." },
    ],
  },
  salud: {
    frase: "Cuidar a tus pacientes empieza por tener todo en orden.",
    pasos: [
      { titulo: "Registra a tus pacientes", texto: "Crea la ficha de cada paciente en “Pacientes y fichas”." },
      { titulo: "Agenda las citas", texto: "Usa “Agenda y calendario” para evitar cruces de horarios." },
      { titulo: "Lleva la evolución", texto: "Anota cada consulta en “Historias y evoluciones” y sus tratamientos con su valor." },
      { titulo: "Pide consentimiento y guarda la historia", texto: "Registra el consentimiento informado antes de cada procedimiento. La historia clínica se conserva mínimo 20 años y solo la ve quien debe: revisa “Auditoría de accesos”." },
      { titulo: "Cobra a las EPS sin perder plata", texto: "Factura en “Facturación y RIPS”, y en “Glosas y cartera con EPS” responde cada glosa antes de su plazo." },
      { titulo: "Cumple la habilitación", texto: "En “Habilitación y calidad” y “Residuos hospitalarios” guarda REPS, calibraciones, actas del gestor de residuos y próximas fechas obligatorias." },
    ],
  },
  educacion: {
    frase: "Cada estudiante cuenta, cada avance se celebra.",
    pasos: [
      { titulo: "Crea tus cursos", texto: "En “Cursos y grupos” registra horarios, cupos y docentes." },
      { titulo: "Matricula estudiantes", texto: "Agrega a cada estudiante en “Estudiantes y matrículas”." },
      { titulo: "Cobra a tiempo", texto: "Usa “Pensiones y mensualidades” para ver quién tiene pagos pendientes." },
    ],
  },
  hospedaje: {
    frase: "Que cada huésped quiera volver.",
    pasos: [
      { titulo: "Registra tus habitaciones", texto: "En “Habitaciones y disponibilidad” agrega cada espacio con su tarifa." },
      { titulo: "Toma reservas", texto: "Anota entradas, salidas y anticipos en “Reservas”." },
      { titulo: "Cuida la limpieza", texto: "Organiza las tareas por habitación en “Limpieza y mantenimiento”." },
    ],
  },
  gimnasio: {
    frase: "Socios activos, gimnasio lleno de energía.",
    pasos: [
      { titulo: "Inscribe a tus socios", texto: "En “Socios y membresías” registra planes y fechas de vencimiento." },
      { titulo: "Organiza las clases", texto: "Define horarios y cupos en “Clases y cupos”." },
      { titulo: "Registra la asistencia", texto: "Usa “Control de ingreso” para saber quién asiste y quién dejó de venir." },
    ],
  },
  construccion: {
    frase: "Obras bien llevadas, clientes tranquilos.",
    pasos: [
      { titulo: "Crea tus proyectos", texto: "En “Proyectos y obras” registra presupuesto, avance y responsables." },
      { titulo: "Cotiza", texto: "Haz seguimiento a cada propuesta en “Cotizaciones” hasta el cierre." },
      { titulo: "Controla materiales y pagos", texto: "Lleva materiales por obra y las cuentas con tus contratistas." },
    ],
  },
  agro: {
    frase: "Del campo a tu mesa, con cuentas claras.",
    pasos: [
      { titulo: "Registra tus lotes", texto: "En “Cultivos y lotes” anota siembras y ciclos de producción." },
      { titulo: "Anota las cosechas", texto: "Registra lo recogido y a quién se lo vendiste." },
      { titulo: "Controla insumos y animales", texto: "Lleva compras de insumos y la sanidad de tus animales." },
    ],
  },
  inmobiliaria: {
    frase: "Cada propiedad en su lugar, cada contrato al día.",
    pasos: [
      { titulo: "Publica tus inmuebles", texto: "En “Inmuebles” registra cada propiedad en venta o arriendo." },
      { titulo: "Lleva los contratos", texto: "En “Arrendatarios y contratos” guarda canon y vencimientos." },
      { titulo: "Cobra los arriendos", texto: "Usa “Cobro de arriendos” para ver la cartera mensual." },
    ],
  },
  mascotas: {
    frase: "Mascotas sanas, dueños tranquilos.",
    pasos: [
      { titulo: "Registra mascotas y dueños", texto: "Crea la ficha de cada mascota en “Mascotas y dueños”." },
      { titulo: "Programa vacunas", texto: "Usa “Vacunas y desparasitación” para recordar las próximas dosis." },
      { titulo: "Agenda consultas", texto: "Organiza las citas del día en “Agenda y calendario”." },
    ],
  },
  tecnologia: {
    frase: "Proyectos entregados a tiempo, clientes que regresan.",
    pasos: [
      { titulo: "Registra tus proyectos", texto: "En “Proyectos y entregables” anota estado, responsables y fechas." },
      { titulo: "Atiende el soporte", texto: "Lleva cada solicitud de cliente en “Soporte y tickets”." },
      { titulo: "Factura tus horas", texto: "Anota las horas por cliente y tus cobros recurrentes." },
    ],
  },
  transporte: {
    frase: "Cada carga a su destino, cada ruta bajo control.",
    pasos: [
      { titulo: "Registra tu flota", texto: "En “Flota y vehículos” agrega cada vehículo con sus documentos." },
      { titulo: "Despacha viajes", texto: "Anota rutas, cargas y el estado de cada envío en “Viajes y despachos”." },
      { titulo: "Controla gastos", texto: "Registra combustible y pagos a conductores por viaje." },
    ],
  },
  panaderia: {
    frase: "Pan fresco cada mañana, clientes que vuelven.",
    pasos: [
      { titulo: "Arma tu menú", texto: "Crea tus categorías (panes, tortas, postres) y agrega cada producto con su precio y porción." },
      { titulo: "Carga tu materia prima y tus recetas", texto: "En “Materia prima / Harinas” registra tus insumos y en “Recetas y gramajes” arma cada receta por lote para conocer su costo por unidad." },
      { titulo: "Registra las horneadas", texto: "En “Horneadas / Producción diaria” anota lo que salió del horno: se descuenta la materia prima y queda el costo real de cada unidad." },
      { titulo: "Controla las mermas", texto: "En “Mermas y vencimientos” registra el pan quemado, dañado o vencido con su motivo; la pérdida pasa sola a Contabilidad." },
      { titulo: "Recibe tortas por encargo", texto: "En “Pedidos especiales / Tortas por encargo” anota sabor, dedicatoria, foto, fecha de entrega y abono; el saldo se cobra al entregar." },
      { titulo: "Organiza turnos y metas", texto: "En “Turnos y metas del personal” asigna panaderos, horneros y mostrador con su meta diaria de venta." },
    ],
  },
  cafeteria: {
    frase: "Cada taza y cada trago, bien servidos.",
    pasos: [
      { titulo: "Arma tu carta", texto: "Agrega bebidas, postres y snacks con su precio y tamaño." },
      { titulo: "Controla la barra", texto: "En “Barra y bebidas” lleva botellas, café y mermas." },
      { titulo: "Atiende mesas y pedidos", texto: "Usa el punto de venta y las mesas para cobrar rápido." },
      { titulo: "Revisa tu caja", texto: "Cierra caja cada día y mira tus ventas en reportes." },
    ],
  },
  comida_rapida: {
    frase: "Rápido, rico y sin perder una venta.",
    pasos: [
      { titulo: "Crea tu carta", texto: "Agrega combos y productos con su precio; arma promociones en “Combos”." },
      { titulo: "Vende en el punto de venta", texto: "Registra cada venta en segundos y envíala a cocina." },
      { titulo: "Controla tus puntos", texto: "En “Puntos de venta y turnos” compara lo vendido por local o ubicación." },
      { titulo: "Domicilios", texto: "Asigna repartidores y liquida cada entrega." },
    ],
  },
  catering: {
    frase: "Cada evento, servido a tiempo y con cuentas claras.",
    pasos: [
      { titulo: "Registra tus eventos", texto: "En “Eventos y banquetes” anota fecha, invitados, menú y anticipo." },
      { titulo: "Cotiza", texto: "Envía propuestas en “Cotizaciones” y sigue su cierre." },
      { titulo: "Define recetas y costos", texto: "Carga recetas e insumos para saber cuánto cuesta cada porción." },
      { titulo: "Cobra saldos", texto: "Controla anticipos y saldos pendientes en cartera." },
    ],
  },
  belleza: {
    frase: "Que cada cita termine en una sonrisa.",
    pasos: [
      { titulo: "Define tus servicios", texto: "En “Catálogo de servicios” agrega duración y precio de cada uno." },
      { titulo: "Registra a tus estilistas", texto: "En “Estilistas y cabinas” anota cada profesional con su especialidad, comisión y la silla o cabina que usa." },
      { titulo: "Define sus turnos", texto: "En “Turnos y disponibilidad” marca horarios, descansos y bloqueos para que la agenda no cruce citas." },
      { titulo: "Organiza la agenda", texto: "Registra las citas con su estilista y usa la lista de espera para llenar cupos." },
      { titulo: "Guarda el historial", texto: "Anota fórmulas, alergias y trabajos de cada cliente." },
      { titulo: "Paga comisiones", texto: "Liquida a tu equipo por servicio realizado y por productos vendidos." },
    ],
  },
  taller: {
    frase: "Cada vehículo reparado a tiempo y con garantía.",
    pasos: [
      { titulo: "Registra el vehículo", texto: "En “Vehículos de clientes” guarda placa, marca y kilometraje." },
      { titulo: "Abre la orden", texto: "En “Órdenes de servicio” anota la falla, trabajos y repuestos." },
      { titulo: "Presupuesta", texto: "Envía el presupuesto y espera la aprobación del cliente." },
      { titulo: "Recuerda el próximo servicio", texto: "Usa “Mantenimientos próximos” para que el cliente vuelva." },
    ],
  },
  farmacia: {
    frase: "Inventario al día, vencimientos bajo control.",
    pasos: [
      { titulo: "Carga tus productos", texto: "En “Productos y medicamentos” registra presentación y precio." },
      { titulo: "Controla vencimientos", texto: "En “Lotes y vencimientos” revisa qué vence pronto para rotarlo." },
      { titulo: "Atiende domicilios", texto: "Anota pedidos y fórmulas en “Fórmulas y domicilios”." },
      { titulo: "Repón a tiempo", texto: "Mira el bajo stock y pide a tus proveedores." },
    ],
  },
  eventos: {
    frase: "Cada fecha reservada, cada detalle cumplido.",
    pasos: [
      { titulo: "Crea tus paquetes", texto: "En “Paquetes y servicios” define qué incluye cada uno y su precio." },
      { titulo: "Reserva fechas", texto: "En “Eventos y reservas” anota cliente, lugar y anticipo." },
      { titulo: "Cumple las entregas", texto: "Lleva los pendientes en “Entregas y pendientes”." },
      { titulo: "Cobra saldos", texto: "Controla lo que falta por pagar de cada evento." },
    ],
  },
  profesional: {
    frase: "Cada caso al día, cada plazo cumplido.",
    pasos: [
      { titulo: "Abre tus casos", texto: "En “Casos y expedientes” registra cliente, estado y responsable." },
      { titulo: "No pierdas plazos", texto: "En “Plazos y vencimientos” anota términos y entregas." },
      { titulo: "Cobra honorarios", texto: "Controla abonos y saldos en “Honorarios y cobros”." },
      { titulo: "Guarda documentos", texto: "Organiza contratos y archivos por cliente." },
    ],
  },
  lavanderia: {
    frase: "Cada orden entregada limpia y a tiempo.",
    pasos: [
      { titulo: "Define tus tarifas", texto: "En “Tarifas por servicio” pon precio por prenda, kilo o tipo de lavado." },
      { titulo: "Recibe órdenes", texto: "Registra cada orden y muévela de recibido a entregado." },
      { titulo: "Programa entregas", texto: "Organiza la recogida y entrega a domicilio." },
      { titulo: "Controla insumos", texto: "Lleva el consumo de jabones y químicos." },
    ],
  },
  condominio: {
    frase: "Una administración clara y vecinos al día.",
    pasos: [
      { titulo: "Registra las unidades", texto: "Agrega apartamentos o casas con su propietario y contacto." },
      { titulo: "Cobra las cuotas", texto: "Lleva el control de administración, abonos y saldos pendientes." },
      { titulo: "Atiende solicitudes", texto: "Registra reclamos y mantenimientos y dales seguimiento." },
      { titulo: "Comunica novedades", texto: "Mantén informados a los residentes de avisos y reuniones." },
    ],
  },
  prestamos: {
    frase: "Cada préstamo y cada cuota bajo control.",
    pasos: [
      { titulo: "Registra a tus clientes", texto: "Guarda sus datos y contacto para ubicarlos fácil." },
      { titulo: "Crea los préstamos", texto: "Define monto, interés y fecha de cada cuota." },
      { titulo: "Anota los pagos", texto: "Registra cada abono y revisa el saldo pendiente." },
      { titulo: "Revisa la cartera", texto: "Consulta quién está atrasado y haz el cobro a tiempo." },
    ],
  },
  textil: {
    frase: "Tus pedidos y telas siempre ordenados.",
    pasos: [
      { titulo: "Carga tu catálogo", texto: "Agrega prendas, telas y precios." },
      { titulo: "Recibe pedidos", texto: "Registra cada pedido y sigue su producción hasta la entrega." },
      { titulo: "Controla materiales", texto: "Lleva el inventario de telas e insumos." },
      { titulo: "Cobra a tus clientes", texto: "Controla abonos y saldos por pedido." },
    ],
  },
  joyeria: {
    frase: "Cada pieza registrada y cada venta cuidada.",
    pasos: [
      { titulo: "Registra tus piezas", texto: "Agrega joyas con material, peso y precio." },
      { titulo: "Vende y cotiza", texto: "Registra ventas y entrega cotizaciones a tus clientes." },
      { titulo: "Atiende arreglos", texto: "Lleva el control de reparaciones y pedidos a medida." },
      { titulo: "Controla tu inventario", texto: "Revisa qué tienes disponible y qué falta." },
    ],
  },
  celulares: {
    frase: "Ventas y reparaciones sin perder ningún equipo.",
    pasos: [
      { titulo: "Carga tu inventario", texto: "Agrega equipos, accesorios y repuestos con su precio." },
      { titulo: "Registra ventas", texto: "Vende, cobra y factura cada equipo desde la caja y la facturación propia de la tienda." },
      { titulo: "Recibe reparaciones", texto: "Anota el equipo, la falla y el estado hasta entregarlo." },
      { titulo: "Avisa a tus clientes", texto: "Comunica cuando su equipo esté listo." },
    ],
  },
  papeleria: {
    frase: "Tu papelería surtida y las ventas al día.",
    pasos: [
      { titulo: "Carga tus productos", texto: "Agrega artículos con precio y existencias." },
      { titulo: "Vende rápido", texto: "Registra cada venta desde el punto de venta y cuadra la caja del día." },
      { titulo: "Surte a tiempo", texto: "Revisa qué se está agotando y haz tus compras." },
      { titulo: "Revisa tus ventas", texto: "Consulta los reportes del día y del mes." },
    ],
  },
  moda: {
    frase: "Tu colección ordenada y vendiendo todos los días.",
    pasos: [
      { titulo: "Carga tu colección", texto: "Agrega prendas con tallas, colores y precios." },
      { titulo: "Registra ventas", texto: "Vende en tienda o por pedido, controla los cobros y factura cada compra con su talla y color." },
      { titulo: "Controla el inventario", texto: "Revisa existencias por talla y color." },
      { titulo: "Fideliza clientes", texto: "Guarda sus datos y ofrece puntos o promociones." },
    ],
  },
};

export const GUIAS_NEGOCIO = { ...GUIAS_BASE } as Record<TipoNegocioClave, GuiaNegocio>;

GUIAS_NEGOCIO.ferreteria = {
  frase: "Cada referencia a la mano, cada obra bien surtida.",
  pasos: [
    { titulo: "Carga tus referencias", texto: "En “Referencias e inventario” agrega cada producto con su unidad (metro, bulto, galón), costo y margen." },
    { titulo: "Cotiza a constructores", texto: "En “Cotizaciones de materiales” arma la lista de una obra con descuento y flete." },
    { titulo: "Despacha a la obra", texto: "En “Despachos a obra” anota la remisión, el conductor y quién recibe." },
    { titulo: "Cobra a tiempo", texto: "Usa “Cartera y fiados” para los constructores de confianza y actualiza las listas de precios de tus proveedores." },
  ],
};
GUIAS_NEGOCIO.supermercado = {
  frase: "Góndolas llenas, cero producto vencido.",
  pasos: [
    { titulo: "Carga tus productos", texto: "En “Productos y código de barras” registra categoría, IVA y stock mínimo." },
    { titulo: "Vigila los vencimientos", texto: "En “Productos por vencer” anota lote y fecha, y decide si rotar, poner en descuento o devolver." },
    { titulo: "Crea promociones", texto: "En “Promociones” define 2x1 o precios especiales con vigencia." },
    { titulo: "Repón a tiempo", texto: "En “Reposición” revisa qué se agotó y el día de visita de cada proveedor." },
  ],
};
GUIAS_NEGOCIO.carniceria = {
  frase: "Producto fresco, merma controlada.",
  pasos: [
    { titulo: "Registra tus productos por peso", texto: "En “Productos frescos por peso” anota existencias en kilos, costo por kilo y merma esperada." },
    { titulo: "Controla el frío", texto: "En “Cadena de frío” registra la temperatura de neveras y cuartos fríos cada día." },
    { titulo: "Anota las mermas", texto: "En “Mermas y pérdidas” registra lo que se maduró, venció o se recortó." },
    { titulo: "Recibe pedidos", texto: "En “Pedidos y domicilios por peso” guarda el pedido con su peso, dirección y hora de entrega." },
  ],
};
GUIAS_NEGOCIO.licorera = {
  frase: "Tu licorera en regla y vendiendo.",
  pasos: [
    { titulo: "Carga tus referencias", texto: "En “Referencias por marca y presentación” registra grados, estampilla, costo y stock." },
    { titulo: "Cumple los permisos", texto: "En “Permisos y horarios de venta” guarda licencia, bomberos y horario permitido con su vencimiento." },
    { titulo: "Verifica la edad en domicilios", texto: "En “Domicilios con verificación de edad” registra el documento antes de entregar y rechaza si es menor." },
    { titulo: "Arma combos", texto: "En “Combos y promociones” crea ofertas por ocasión." },
  ],
};
GUIAS_NEGOCIO.floristeria = {
  frase: "Cada arreglo a tiempo, cada flor fresca.",
  pasos: [
    { titulo: "Arma tu catálogo", texto: "En “Catálogo de arreglos” registra flores incluidas, tamaño y costo de armado." },
    { titulo: "Recibe encargos", texto: "En “Encargos con dedicatoria y entrega” anota destinatario, dirección, tarjeta y hora." },
    { titulo: "Cuida la frescura", texto: "En “Flores frescas y vida útil” registra tallos recibidos y usa primero los que vencen antes." },
    { titulo: "Prepara las fechas fuertes", texto: "En “Fechas especiales” planea San Valentín o Día de la Madre con pedidos esperados y compras anticipadas." },
  ],
};
GUIAS_NEGOCIO.optica = {
  frase: "Cada fórmula exacta, cada cliente viendo bien.",
  pasos: [
    { titulo: "Guarda la fórmula", texto: "En “Fórmulas de clientes” anota esfera, cilindro, eje, adición y distancia pupilar de cada ojo." },
    { titulo: "Agenda los exámenes", texto: "En “Exámenes visuales” programa optometría y controles." },
    { titulo: "Controla tus monturas", texto: "En “Monturas y vitrina” registra marca, material y existencias." },
    { titulo: "Sigue el laboratorio", texto: "En “Pedidos al laboratorio” controla la fecha prometida y el saldo de cada pedido." },
  ],
};
GUIAS_NEGOCIO.guarderia = {
  frase: "Cada niño seguro, cada acudiente tranquilo.",
  pasos: [
    { titulo: "Inscribe a los niños", texto: "En “Niños inscritos” registra grupo, jornada, alergias, EPS y acudientes." },
    { titulo: "Autoriza quién recoge", texto: "En “Personas autorizadas a recoger” guarda documento y foto de cada persona." },
    { titulo: "Registra la asistencia", texto: "En “Asistencia y recogida diaria” anota hora de entrada, salida y estado de salud." },
    { titulo: "Informa a los acudientes", texto: "En “Reporte diario” cuenta comidas, siestas y actividades, y cobra en “Pensiones”." },
  ],
};
GUIAS_NEGOCIO.alquiler_vehiculos = {
  frase: "Cada vehículo en la calle, con sus papeles al día.",
  pasos: [
    { titulo: "Registra tu flota", texto: "En “Flota y disponibilidad” carga placa, tarifa, SOAT, tecnomecánica y seguro." },
    { titulo: "Reserva y firma", texto: "En “Reservas” y “Contratos de alquiler” anota fechas, depósito, licencia y combustible de salida." },
    { titulo: "Inspecciona al regresar", texto: "En “Entregas y devoluciones” registra kilometraje, combustible y daños." },
    { titulo: "Traslada las multas", texto: "En “Multas y peajes” asocia cada comparendo a la placa y al cliente." },
  ],
};
GUIAS_NEGOCIO.seguridad_aseo = {
  frase: "Cada puesto cubierto, cada contrato cumplido.",
  pasos: [
    { titulo: "Registra tus contratos", texto: "En “Puestos y contratos” anota cliente, sede, personal, turno y valor mensual." },
    { titulo: "Organiza los turnos", texto: "En “Turnos y reemplazos” asigna quién cubre cada puesto." },
    { titulo: "Entrega la dotación", texto: "En “Dotación y entregas” controla uniformes y la fecha de la próxima entrega obligatoria." },
    { titulo: "Reporta novedades", texto: "En “Novedades e incidentes” deja constancia de lo que pasa en cada puesto." },
  ],
};
GUIAS_NEGOCIO.ganaderia = {
  frase: "Cada lote sano, cada guía al día.",
  pasos: [
    { titulo: "Crea tus lotes", texto: "En “Lotes y animales” registra especie, cantidad, potrero o galpón y peso." },
    { titulo: "Registra la producción", texto: "En “Producción” anota litros, huevos o kilos de carne cada día." },
    { titulo: "Cumple la sanidad", texto: "En “Vacunas y sanidad” programa aftosa, brucelosis y desparasitantes con su registro ICA." },
    { titulo: "Moviliza con guía", texto: "En “Guías de movilización ICA” controla origen, destino y vencimiento." },
  ],
};
GUIAS_NEGOCIO.fundacion = {
  frase: "Cada aporte con destino, cada beneficiario atendido.",
  pasos: [
    { titulo: "Registra beneficiarios", texto: "En “Beneficiarios” anota programa, necesidad y consentimiento." },
    { titulo: "Anota las donaciones", texto: "En “Donaciones y certificados” registra el donante, el proyecto destino y emite su certificado." },
    { titulo: "Controla los proyectos", texto: "En “Proyectos y financiadores” sigue presupuesto, ejecución y fecha de informes." },
    { titulo: "Cuenta con voluntarios", texto: "En “Voluntarios” guarda su área y horas." },
  ],
};
GUIAS_NEGOCIO.iglesia = {
  frase: "Una comunidad unida, cuentas claras.",
  pasos: [
    { titulo: "Registra a tus miembros", texto: "En “Miembros” anota ministerio, célula y datos de contacto." },
    { titulo: "Lleva los aportes", texto: "En “Diezmos, ofrendas y aportes” registra cada aporte con su recibo." },
    { titulo: "Organiza grupos y eventos", texto: "En “Grupos y células” y “Eventos y reservas” programa reuniones y actividades." },
    { titulo: "Visita y acompaña", texto: "En “Visitas pastorales” da seguimiento a quienes lo necesitan." },
  ],
};

/** Pasos que valen para cualquier tipo de negocio. */
export const PASOS_GENERALES: { titulo: string; texto: string }[] = [
  { titulo: "Completa “Mi negocio”", texto: "Pon tu nombre, logo, color y horarios. Es lo primero que ven tus clientes." },
  { titulo: "Usa el menú lateral", texto: "Ahí aparecen todas las herramientas de tu tipo de negocio. Con el buscador encuentras cualquiera." },
  { titulo: "Invita a tu equipo", texto: "En Configuración > Equipo y permisos autorizas personas y eliges qué puede usar cada una." },
  { titulo: "Instala la app", texto: "Con “Instalar app” la tienes en tu celular o computador; en Windows también hay instalador con accesos directos y guía de uso." },
  { titulo: "Conecta tu WhatsApp", texto: "En Mi negocio vincula tu número con el QR y el agente atiende a tus clientes con las respuestas que tú configures." },
  { titulo: "Pregunta al asistente", texto: "El Asistente virtual te explica cualquier pantalla paso a paso. Usa Ctrl+K para buscar módulos." },
  { titulo: "Pide soporte si algo falla", texto: "Si el Agente virtual y la Academia no lo resuelven, entra a “Soporte” en el menú lateral y crea un ticket; el equipo te responde ahí y ves su estado." },
];
