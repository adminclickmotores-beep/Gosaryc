import type { ComponentType } from "react";
import {
  UtensilsCrossed, Store, Scissors, Stethoscope, GraduationCap, BedDouble, Dumbbell, Hammer, Sprout,
  Building2, PawPrint, Laptop, Truck, Car, Cake, Coffee, Wrench, Pill, PartyPopper, Briefcase, Shirt,
  Gem, Banknote, Smartphone, Layers,
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
];

export const buscarSector = (slug: string): Sector | undefined => SECTORES.find((x) => x.slug === slug);
