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
  otro: {
    frase: "Tu negocio, ordenado y creciendo.",
    pasos: [
      { titulo: "Crea tu catálogo", texto: "En “Catálogo” agrega lo que ofreces a tus clientes." },
      { titulo: "Registra a tus clientes", texto: "Guarda sus datos en “Clientes y contactos”." },
      { titulo: "Cuida tu dinero", texto: "Usa caja diaria, fiados y facturación para llevar tus cuentas." },
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
