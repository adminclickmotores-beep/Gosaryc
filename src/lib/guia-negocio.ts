import type { TipoNegocioClave } from "@/lib/modulos-negocio";

export type GuiaNegocio = {
  /** Frase fija que acompaña el panel de este tipo de negocio. */
  frase: string;
  /** Pasos propios del tipo de negocio para empezar rápido. */
  pasos: { titulo: string; texto: string }[];
};

export const GUIAS_NEGOCIO: Record<TipoNegocioClave, GuiaNegocio> = {
  restaurante: {
    frase: "Cada pedido a tiempo, cada cliente feliz.",
    pasos: [
      { titulo: "Arma tu menú", texto: "En la pestaña “Menú” crea categorías y agrega tus productos con su precio." },
      { titulo: "Comparte tu menú público", texto: "Usa el botón “Menú público” y envía el enlace por WhatsApp o redes." },
      { titulo: "Atiende los pedidos", texto: "En “Pedidos y cocina” mueve cada pedido: enviar a cocina, listo, en camino, entregado." },
      { titulo: "Controla tus insumos", texto: "En “Recetario e inventario” registra ingredientes y recetas para saber tu costo." },
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
      { titulo: "Recibe encargos", texto: "En “Encargos de tortas y pasteles” anota sabor, tamaño, fecha de entrega y anticipo." },
      { titulo: "Planea la producción", texto: "En “Producción del día” define qué hornear y cuántas unidades." },
      { titulo: "Calcula tus costos", texto: "En “Recetario e inventario” carga ingredientes y recetas para conocer tu margen." },
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
      { titulo: "Organiza la agenda", texto: "Registra las citas y usa la lista de espera para llenar cupos." },
      { titulo: "Guarda el historial", texto: "Anota fórmulas, alergias y trabajos de cada cliente." },
      { titulo: "Paga comisiones", texto: "Liquida a tu equipo por servicio realizado." },
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
};

/** Pasos que valen para cualquier tipo de negocio. */
export const PASOS_GENERALES: { titulo: string; texto: string }[] = [
  { titulo: "Completa “Mi negocio”", texto: "Pon tu nombre, logo, color y horarios. Es lo primero que ven tus clientes." },
  { titulo: "Usa el menú lateral", texto: "Ahí aparecen todas las herramientas de tu tipo de negocio. Con el buscador encuentras cualquiera." },
  { titulo: "Invita a tu equipo", texto: "En Configuración > Equipo y permisos autorizas personas y eliges qué puede usar cada una." },
  { titulo: "Instala la app", texto: "Con “Instalar app” la tienes como una aplicación en tu celular o computador." },
];
