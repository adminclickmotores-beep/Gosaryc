import type { ComponentType } from "react";
import {
  UtensilsCrossed, Store, Scissors, Stethoscope, GraduationCap, BedDouble, Dumbbell, Hammer, Sprout,
  Building2, PawPrint, Laptop, Truck, Car, Cake, Coffee, Wrench, Pill, PartyPopper, Briefcase, Shirt,
  Gem, Banknote, Smartphone, Layers, Gift, Sparkles, Palette, Users,
} from "lucide-react";

export type Sector = {
  slug: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  resumen: string;
  acciones: { titulo: string; texto: string }[];
};

const comunes = [
  { titulo: "Clientes y seguimiento", texto: "Guarda el historial de cada cliente y no pierdas ninguna venta." },
  { titulo: "Caja y finanzas", texto: "Mira lo que entra, lo que sale y lo que te deben, con reportes claros." },
  { titulo: "Equipo y permisos", texto: "Cada persona de tu equipo ve solo lo que le corresponde." },
];

const s = (
  slug: string,
  label: string,
  Icon: Sector["Icon"],
  resumen: string,
  acciones: { titulo: string; texto: string }[],
): Sector => ({ slug, label, Icon, resumen, acciones: [...acciones, ...comunes] });

export const SECTORES: Sector[] = [
  s("restaurantes", "Restaurantes", UtensilsCrossed, "Recibe pedidos, manda a cocina y controla tus insumos desde un solo panel.", [
    { titulo: "Menú y pedidos", texto: "Arma tu menú, comparte el enlace público y recibe pedidos de mesa, para llevar y a domicilio." },
    { titulo: "Cocina y mesas", texto: "Tablero en vivo para seguir cada pedido, con comanda impresa y control de mesas." },
    { titulo: "Recetas e inventario", texto: "Conoce el costo de cada plato y descuenta ingredientes automáticamente." },
  ]),
  s("tiendas", "Tiendas", Store, "Catálogo, inventario y fiados para que tu tienda siempre esté en orden.", [
    { titulo: "Catálogo de productos", texto: "Agrega lo que vendes con su precio y véndelo desde el celular." },
    { titulo: "Inventario y reposición", texto: "Recibe alertas cuando un producto se esté acabando." },
    { titulo: "Fiados y caja diaria", texto: "Anota quién te debe y cierra tu caja cada día." },
  ]),
  s("belleza-y-servicios", "Belleza y servicios", Scissors, "Organiza tu agenda, tus servicios y la fidelidad de tus clientes.", [
    { titulo: "Agenda de citas", texto: "Registra las citas del día sin cruces de horarios." },
    { titulo: "Catálogo de servicios", texto: "Define duración y precio de cada servicio." },
    { titulo: "Paquetes y fidelización", texto: "Vende paquetes y premia a tus clientes frecuentes." },
  ]),
  s("salud", "Salud", Stethoscope, "Fichas de pacientes, citas y tratamientos en un solo lugar.", [
    { titulo: "Pacientes y fichas", texto: "Crea la ficha de cada paciente con sus datos importantes." },
    { titulo: "Citas", texto: "Agenda consultas y evita cruces de horarios." },
    { titulo: "Historias y tratamientos", texto: "Lleva la evolución de cada consulta y el valor de cada tratamiento." },
  ]),
  s("educacion", "Educación", GraduationCap, "Cursos, matrículas y pensiones sin hojas de cálculo.", [
    { titulo: "Cursos y grupos", texto: "Registra horarios, cupos y docentes." },
    { titulo: "Estudiantes y matrículas", texto: "Lleva el control de cada estudiante inscrito." },
    { titulo: "Pensiones", texto: "Mira quién tiene mensualidades pendientes y cobra a tiempo." },
  ]),
  s("hoteles", "Hoteles", BedDouble, "Habitaciones, reservas y limpieza bajo control.", [
    { titulo: "Habitaciones y disponibilidad", texto: "Registra cada espacio con su tarifa y estado." },
    { titulo: "Reservas", texto: "Anota entradas, salidas y anticipos." },
    { titulo: "Limpieza y mantenimiento", texto: "Organiza las tareas por habitación." },
  ]),
  s("gimnasios", "Gimnasios", Dumbbell, "Socios, membresías, clases y asistencia en un panel.", [
    { titulo: "Socios y membresías", texto: "Registra planes y fechas de vencimiento." },
    { titulo: "Clases y cupos", texto: "Define horarios y cupos de cada clase." },
    { titulo: "Control de ingreso", texto: "Sabe quién asiste y quién dejó de venir." },
  ]),
  s("construccion", "Construcción", Hammer, "Proyectos, presupuestos y avance de obra al día.", [
    { titulo: "Proyectos y obras", texto: "Registra presupuesto, avance y responsables." },
    { titulo: "Cotizaciones", texto: "Crea cotizaciones y controla sus vencimientos." },
    { titulo: "Compras y proveedores", texto: "Controla materiales y pagos a proveedores." },
  ]),
  s("agro", "Agro", Sprout, "Cultivos, cosechas y ventas organizados.", [
    { titulo: "Lotes y cultivos", texto: "Registra tus lotes, siembras y cosechas." },
    { titulo: "Insumos", texto: "Controla fertilizantes, semillas y otros insumos." },
    { titulo: "Ventas y cobros", texto: "Lleva lo que vendes y lo que te deben." },
  ]),
  s("inmobiliarias", "Inmobiliarias", Building2, "Propiedades, interesados y cierres de negocio.", [
    { titulo: "Inventario de propiedades", texto: "Registra cada inmueble con su precio y estado." },
    { titulo: "Interesados", texto: "Anota cada cliente y programa su seguimiento." },
    { titulo: "Contratos y vencimientos", texto: "No dejes vencer arriendos ni documentos." },
  ]),
  s("veterinarias", "Veterinarias", PawPrint, "Fichas de mascotas, citas y vacunas al día.", [
    { titulo: "Mascotas y dueños", texto: "Crea la ficha de cada mascota con su historial." },
    { titulo: "Citas y vacunas", texto: "Agenda consultas y recibe avisos de próximas vacunas." },
    { titulo: "Productos y farmacia", texto: "Controla el inventario de alimentos y medicinas." },
  ]),
  s("tecnologia", "Tecnología", Laptop, "Proyectos, soporte y clientes de tu empresa de tecnología.", [
    { titulo: "Proyectos", texto: "Organiza entregas, responsables y avances." },
    { titulo: "Soporte a clientes", texto: "Registra solicitudes y da seguimiento hasta resolverlas." },
    { titulo: "Cotizaciones y cobros", texto: "Envía cotizaciones y controla tus facturas por cobrar." },
  ]),
  s("transporte", "Transporte", Truck, "Vehículos, viajes y gastos de tu flota.", [
    { titulo: "Flota", texto: "Registra tus vehículos y sus documentos." },
    { titulo: "Viajes y servicios", texto: "Lleva cada viaje con su valor y su cobro." },
    { titulo: "Mantenimientos y vencimientos", texto: "Recibe alertas de SOAT, revisiones y mantenimientos." },
  ]),
  s("vehiculos", "Vehículos", Car, "Inventario, cotizaciones, separaciones y trámites de tu concesionario.", [
    { titulo: "Inventario de vehículos", texto: "Registra placa, modelo, precio, fotos y estado." },
    { titulo: "Ventas y entregas", texto: "Cotizaciones, separaciones y cierre de cada venta." },
    { titulo: "Trámites y vencimientos", texto: "Controla SOAT, tecnomecánica y traspasos." },
  ]),
  s("panaderias-y-pastelerias", "Panaderías y pastelerías", Cake, "Pedidos por encargo, recetas e insumos con costos claros.", [
    { titulo: "Pedidos y encargos", texto: "Recibe pedidos con fecha de entrega y anticipo." },
    { titulo: "Recetas y costos", texto: "Conoce cuánto cuesta y cuánto ganas con cada producto." },
    { titulo: "Inventario de insumos", texto: "Controla harina, azúcar y todo lo que usas." },
  ]),
  s("cafeterias-y-bares", "Cafeterías y bares", Coffee, "Ventas rápidas, mesas y control de inventario.", [
    { titulo: "Venta rápida", texto: "Cobra en segundos desde el celular o el computador." },
    { titulo: "Mesas y cuentas", texto: "Lleva cada mesa con su consumo." },
    { titulo: "Inventario", texto: "Controla bebidas e insumos y evita pérdidas." },
  ]),
  s("talleres", "Talleres", Wrench, "Órdenes de trabajo, repuestos y cobros organizados.", [
    { titulo: "Órdenes de trabajo", texto: "Registra cada trabajo con su estado y su valor." },
    { titulo: "Repuestos", texto: "Controla existencias y costos de repuestos." },
    { titulo: "Clientes y vehículos", texto: "Guarda el historial de cada cliente y equipo." },
  ]),
  s("farmacias", "Farmacias", Pill, "Inventario con vencimientos y ventas al día.", [
    { titulo: "Inventario de medicamentos", texto: "Controla existencias y alertas de stock mínimo." },
    { titulo: "Vencimientos", texto: "Recibe avisos antes de que venza un producto." },
    { titulo: "Ventas y caja", texto: "Cobra y cierra tu caja diaria sin errores." },
  ]),
  s("eventos-y-catering", "Eventos y catering", PartyPopper, "Cotiza, reserva fechas y organiza cada evento.", [
    { titulo: "Eventos y reservas", texto: "Registra cada evento con fecha, lugar y anticipo." },
    { titulo: "Cotizaciones", texto: "Crea cotizaciones rápidas para tus clientes." },
    { titulo: "Proveedores y compras", texto: "Controla lo que compras para cada evento." },
  ]),
  s("servicios-profesionales", "Servicios profesionales", Briefcase, "Clientes, proyectos y cobros de tu consultoría o despacho.", [
    { titulo: "Clientes y casos", texto: "Organiza cada cliente y sus asuntos." },
    { titulo: "Agenda", texto: "Programa reuniones y recordatorios." },
    { titulo: "Honorarios y cobros", texto: "Controla lo facturado y lo pendiente." },
  ]),
  s("lavanderias-y-moda", "Lavanderías y moda", Shirt, "Pedidos, entregas e inventario de prendas.", [
    { titulo: "Pedidos y entregas", texto: "Anota cada prenda con su fecha de entrega." },
    { titulo: "Catálogo y tallas", texto: "Organiza tu inventario por talla y color." },
    { titulo: "Fiados y abonos", texto: "Lleva los abonos y saldos de tus clientes." },
  ]),
  s("joyerias", "Joyerías", Gem, "Inventario de piezas, apartados y ventas.", [
    { titulo: "Inventario de piezas", texto: "Registra cada pieza con su código, peso y precio." },
    { titulo: "Apartados y abonos", texto: "Controla los apartados y los pagos parciales." },
    { titulo: "Ventas", texto: "Registra cada venta y su método de pago." },
  ]),
  s("prestamos", "Préstamos", Banknote, "Créditos, cuotas y cobros bajo control.", [
    { titulo: "Créditos", texto: "Registra cada préstamo con su monto, plazo e interés." },
    { titulo: "Cuotas y abonos", texto: "Mira qué cuotas vencen y quién está atrasado." },
    { titulo: "Cartera", texto: "Conoce cuánto tienes por cobrar en total." },
  ]),
  s("celulares", "Celulares", Smartphone, "Inventario de equipos, reparaciones y ventas.", [
    { titulo: "Inventario de equipos", texto: "Controla equipos y accesorios con su costo y precio." },
    { titulo: "Reparaciones", texto: "Registra cada equipo recibido y su estado." },
    { titulo: "Ventas y garantías", texto: "Lleva cada venta con su garantía." },
  ]),
  s("condominios", "Condominios", Building2, "Cuotas de administración, residentes y solicitudes.", [
    { titulo: "Residentes y unidades", texto: "Registra cada unidad con su responsable." },
    { titulo: "Cuotas de administración", texto: "Mira quién está al día y quién tiene saldo pendiente." },
    { titulo: "Solicitudes y mantenimientos", texto: "Atiende y da seguimiento a cada solicitud." },
  ]),
  s("textil-y-papeleria", "Textil y papelería", Layers, "Inventario, pedidos y cartera de tu negocio.", [
    { titulo: "Catálogo e inventario", texto: "Organiza tus productos y recibe alertas de stock bajo." },
    { titulo: "Pedidos", texto: "Recibe y entrega pedidos sin olvidar ninguno." },
    { titulo: "Cartera de clientes", texto: "Controla lo que te deben y los abonos." },
  ]),
  s("ferreterias", "Ferreterías", Wrench, "Inventario amplio, precios y fiados a clientes de confianza.", [
    { titulo: "Inventario por referencia", texto: "Registra miles de productos con su costo, precio y stock mínimo." },
    { titulo: "Ventas y cotizaciones", texto: "Cotiza obras y materiales y cobra rápido en mostrador." },
    { titulo: "Cartera de constructores", texto: "Controla fiados, abonos y fechas de pago." },
  ]),
  s("supermercados", "Supermercados y minimercados", Store, "Venta rápida, inventario y proveedores en un solo lugar.", [
    { titulo: "Punto de venta", texto: "Cobra en segundos con caja diaria y cierre de turno." },
    { titulo: "Inventario y reposición", texto: "Recibe alertas de productos por agotarse o por vencer." },
    { titulo: "Proveedores y compras", texto: "Registra pedidos a proveedores y sus pagos." },
  ]),
  s("carnicerias-y-fruver", "Carnicerías y fruver", Store, "Control de producto fresco, pérdidas y ventas del día.", [
    { titulo: "Inventario de frescos", texto: "Lleva existencias por peso y controla mermas." },
    { titulo: "Ventas y caja", texto: "Registra ventas del día y cierra tu caja sin errores." },
    { titulo: "Pedidos a domicilio", texto: "Recibe pedidos por WhatsApp y organiza las entregas." },
  ]),
  s("licoreras", "Licoreras y tiendas de bebidas", Coffee, "Inventario, ventas y domicilios para tu licorera.", [
    { titulo: "Inventario por marca", texto: "Controla existencias, costos y márgenes de cada referencia." },
    { titulo: "Ventas y domicilios", texto: "Atiende mostrador y pedidos a domicilio." },
    { titulo: "Combos y promociones", texto: "Crea combos y promociones para vender más." },
  ]),
  s("floristerias", "Floristerías y regalos", Gift, "Pedidos por encargo, fechas especiales y entregas.", [
    { titulo: "Pedidos por encargo", texto: "Anota cada arreglo con su fecha, dedicatoria y dirección." },
    { titulo: "Catálogo de arreglos", texto: "Muestra tus productos con foto y precio." },
    { titulo: "Entregas", texto: "Organiza las rutas de entrega del día." },
  ]),
  s("barberias", "Barberías y peluquerías", Scissors, "Agenda, servicios y comisiones por barbero.", [
    { titulo: "Agenda de citas", texto: "Organiza el turno de cada barbero sin cruces." },
    { titulo: "Servicios y precios", texto: "Define cada corte o servicio con su valor." },
    { titulo: "Comisiones del equipo", texto: "Calcula lo que le corresponde a cada persona." },
  ]),
  s("spas-y-estetica", "Spas y centros de estética", Sparkles, "Citas, paquetes y fidelización de tus clientes.", [
    { titulo: "Agenda de tratamientos", texto: "Reserva cabinas y profesionales por horario." },
    { titulo: "Paquetes y sesiones", texto: "Vende paquetes y lleva el control de sesiones usadas." },
    { titulo: "Puntos y recompensas", texto: "Premia a tus clientes frecuentes." },
  ]),
  s("odontologia", "Odontología y consultorios", Stethoscope, "Pacientes, citas y tratamientos con sus cobros.", [
    { titulo: "Fichas de pacientes", texto: "Guarda datos y evolución de cada paciente." },
    { titulo: "Agenda de citas", texto: "Programa consultas y recordatorios." },
    { titulo: "Tratamientos y abonos", texto: "Controla el valor de cada tratamiento y sus pagos." },
  ]),
  s("opticas", "Ópticas", Stethoscope, "Fórmulas, monturas y ventas en un solo lugar.", [
    { titulo: "Clientes y fórmulas", texto: "Guarda la fórmula y el historial de cada cliente." },
    { titulo: "Inventario de monturas", texto: "Controla referencias, costos y precios." },
    { titulo: "Pedidos de laboratorio", texto: "Sigue cada pedido hasta la entrega." },
  ]),
  s("colegios-y-academias", "Colegios y academias", GraduationCap, "Matrículas, pensiones y grupos sin complicaciones.", [
    { titulo: "Matrículas", texto: "Registra estudiantes y acudientes." },
    { titulo: "Pensiones", texto: "Mira quién está al día y quién tiene saldo." },
    { titulo: "Cursos y horarios", texto: "Organiza grupos, docentes y cupos." },
  ]),
  s("guarderias", "Guarderías y jardines", GraduationCap, "Niños inscritos, mensualidades y comunicación con acudientes.", [
    { titulo: "Inscripciones", texto: "Registra a cada niño con sus datos importantes." },
    { titulo: "Mensualidades", texto: "Controla pagos y saldos pendientes." },
    { titulo: "Asistencia", texto: "Lleva el ingreso y salida diaria." },
  ]),
  s("lavaderos-de-autos", "Lavaderos de autos", Car, "Servicios por vehículo, turnos y comisiones.", [
    { titulo: "Servicios por vehículo", texto: "Registra placa, servicio y valor." },
    { titulo: "Turnos y empleados", texto: "Organiza quién atiende cada vehículo." },
    { titulo: "Cierre de caja", texto: "Cuadra lo cobrado cada día." },
  ]),
  s("mecanica-y-repuestos", "Mecánica y repuestos", Wrench, "Órdenes de trabajo, repuestos y mantenimientos.", [
    { titulo: "Órdenes de trabajo", texto: "Registra diagnóstico, repuestos y mano de obra." },
    { titulo: "Inventario de repuestos", texto: "Controla existencias y proveedores." },
    { titulo: "Recordatorios", texto: "Avisa a tus clientes de su próximo mantenimiento." },
  ]),
  s("alquiler-de-vehiculos", "Alquiler de vehículos", Car, "Reservas, contratos y entregas de tu flota.", [
    { titulo: "Flota disponible", texto: "Mira qué vehículo está libre u ocupado." },
    { titulo: "Reservas y contratos", texto: "Registra fechas, depósitos y cobros." },
    { titulo: "Vencimientos", texto: "Controla SOAT, seguros y revisiones." },
  ]),
  s("mensajeria-y-domicilios", "Mensajería y domicilios", Truck, "Repartidores, rutas y cobros de cada entrega.", [
    { titulo: "Pedidos y rutas", texto: "Asigna cada entrega a un repartidor." },
    { titulo: "Tarifas por zona", texto: "Define el valor de cada domicilio." },
    { titulo: "Liquidación", texto: "Cuadra lo que le corresponde a cada repartidor." },
  ]),
  s("hostales-y-cabanas", "Hostales y cabañas", BedDouble, "Reservas, disponibilidad y limpieza de tu alojamiento.", [
    { titulo: "Calendario de reservas", texto: "Evita sobreventas con un calendario claro." },
    { titulo: "Anticipos y pagos", texto: "Controla cada abono y saldo." },
    { titulo: "Limpieza", texto: "Programa el aseo de cada habitación." },
  ]),
  s("restaurantes-de-comida-rapida", "Comida rápida y food trucks", UtensilsCrossed, "Pedidos ágiles, combos y cobro inmediato.", [
    { titulo: "Venta rápida", texto: "Toma pedidos y cobra en segundos." },
    { titulo: "Combos", texto: "Crea combos y promociones." },
    { titulo: "Cocina en vivo", texto: "Sigue cada pedido hasta que sale." },
  ]),
  s("heladerias-y-dulces", "Heladerías y dulcerías", Cake, "Ventas, sabores e inventario de insumos.", [
    { titulo: "Catálogo de sabores", texto: "Muestra tus productos con precio y foto." },
    { titulo: "Inventario de insumos", texto: "Controla lo que usas cada día." },
    { titulo: "Pedidos por encargo", texto: "Recibe pedidos para eventos y fechas especiales." },
  ]),
  s("fotografia-y-produccion", "Fotografía y producción", Palette, "Sesiones, entregas y cobros de tu estudio.", [
    { titulo: "Agenda de sesiones", texto: "Reserva fechas con anticipo." },
    { titulo: "Paquetes y cotizaciones", texto: "Envía cotizaciones claras a tus clientes." },
    { titulo: "Entregas", texto: "Controla qué trabajos están pendientes de entregar." },
  ]),
  s("abogados-y-contadores", "Abogados y contadores", Briefcase, "Clientes, casos, honorarios y vencimientos.", [
    { titulo: "Clientes y casos", texto: "Organiza cada asunto con su estado." },
    { titulo: "Honorarios", texto: "Controla lo facturado y lo pendiente por cobrar." },
    { titulo: "Alertas de vencimientos", texto: "No dejes pasar ningún plazo." },
  ]),
  s("seguridad-y-aseo", "Empresas de aseo y seguridad", Users, "Personal, contratos y pagos de tu empresa de servicios.", [
    { titulo: "Personal y turnos", texto: "Organiza a tu equipo por cliente y turno." },
    { titulo: "Contratos", texto: "Controla fechas y valores de cada contrato." },
    { titulo: "Nómina", texto: "Calcula y registra los pagos de tu equipo." },
  ]),
  s("ganaderia-y-avicola", "Ganadería y avícola", Sprout, "Animales, producción y ventas de tu finca.", [
    { titulo: "Control de animales", texto: "Registra lotes, vacunas y producción." },
    { titulo: "Insumos y alimento", texto: "Controla concentrados y medicinas." },
    { titulo: "Ventas", texto: "Lleva lo vendido y lo que te deben." },
  ]),
  s("ong-y-fundaciones", "Fundaciones y organizaciones", Users, "Beneficiarios, aportes y proyectos de tu organización.", [
    { titulo: "Beneficiarios", texto: "Registra a quienes atiendes y su seguimiento." },
    { titulo: "Aportes y donaciones", texto: "Controla lo recibido y su destino." },
    { titulo: "Proyectos", texto: "Organiza actividades y presupuestos." },
  ]),
  s("iglesias-y-clubes", "Iglesias, clubes y asociaciones", Users, "Miembros, cuotas y eventos de tu comunidad.", [
    { titulo: "Miembros", texto: "Registra a cada persona de tu comunidad." },
    { titulo: "Cuotas y aportes", texto: "Mira quién está al día." },
    { titulo: "Eventos", texto: "Organiza actividades y reservas." },
  ]),
];

export const buscarSector = (slug: string): Sector | undefined => SECTORES.find((x) => x.slug === slug);
