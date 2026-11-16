import { buscarModulo } from "@/lib/modulos-negocio";
import { configModulo } from "@/lib/modulos-config";

export type Instructivo = {
  titulo: string;
  paraQue: string;
  pasos: string[];
  consejo?: string;
};

/** Instructivos de las pantallas propias (no genéricas), por ruta. */
const POR_RUTA: Record<string, Instructivo> = {
  "/cartera-fiados": {
    titulo: "Cartera y fiados",
    paraQue: "Llevar quién te debe, cuánto y cuándo prometió pagar.",
    pasos: [
      "Registra la deuda con el nombre del cliente, el valor y la fecha prometida de pago.",
      "Cuando el cliente abone, anótalo para que el saldo baje.",
      "Al pagar completo, marca la deuda como pagada.",
      "Revisa arriba el total por cobrar para saber cuánta plata tienes en la calle.",
    ],
    consejo: "Revisa esta pantalla al empezar la semana para cobrar lo que ya venció.",
  },
  "/combos": {
    titulo: "Combos y promociones",
    paraQue: "Armar combos del día, 2x1 y descuentos por horario con tus productos.",
    pasos: [
      "Crea un combo y ponle un nombre claro, por ejemplo “Combo almuerzo”.",
      "Elige los productos que lo componen y el precio final.",
      "Actívalo o desactívalo según el día o el horario.",
    ],
    consejo: "Que el precio del combo sea menor a la suma de los productos sueltos para que al cliente le convenga.",
  },
  "/cotizaciones": {
    titulo: "Cotizaciones",
    paraQue: "Armar propuestas con productos o servicios y hacerles seguimiento hasta el cierre.",
    pasos: [
      "Crea una cotización con el nombre y teléfono del cliente.",
      "Agrega cada producto o servicio con su cantidad y precio; si das descuento, anótalo.",
      "Escribe hasta cuándo es válida la propuesta.",
      "Envíala por WhatsApp y cambia su estado cuando el cliente responda.",
    ],
  },
  "/domicilios": {
    titulo: "Domicilios y clientes",
    paraQue: "Ver los pedidos a domicilio y tu base de clientes con sus direcciones.",
    pasos: [
      "Revisa los pedidos que van para entrega y su dirección.",
      "Asigna el domiciliario y actualiza el estado cuando salga y cuando llegue.",
      "Consulta los datos de cada cliente para repetir su pedido más rápido.",
    ],
  },
  "/equipo-nomina": {
    titulo: "Equipo, turnos y nómina",
    paraQue: "Llevar turnos, pagos y novedades de tu personal, y liquidar la nómina con las reglas de Colombia.",
    pasos: [
      "Registra a cada persona de tu equipo con su cargo, contrato, EPS y fondo de pensión.",
      "Anota turnos, horas extra, recargos, incapacidades y descuentos.",
      "Usa el liquidador de nómina: calcula el neto del empleado, los aportes del empleador (PILA), las provisiones de cesantías, intereses, prima y vacaciones, y el costo total de cada persona.",
      "Revisa el calendario de obligaciones (PILA, retención, nómina electrónica, cesantías, primas y SG-SST) para no pagar multas.",
      "Marca como pagado lo que ya cancelaste para saber lo que falta.",
    ],
    consejo: "El salario mínimo y el auxilio de transporte son valores editables: confírmalos cada enero con tu contador. El liquidador es una guía de cálculo, no una liquidación oficial.",
  },
  "/finanzas": {
    titulo: "Finanzas y rentabilidad",
    paraQue: "Ver cuánto vendes, cuánto gastas y cuánta utilidad te queda, y llevar tu registro contable.",
    pasos: [
      "Arriba elige el periodo (hoy o este mes) para ver el resumen.",
      "En “Registro contable” crea primero tu plan de cuentas (hay uno básico listo).",
      "En “Libro diario” pulsa “Nuevo asiento”: el total del debe y del haber debe ser igual para poder guardar.",
      "Usa los filtros de fecha, cuenta y tipo para ver lo que necesites.",
      "El libro mayor muestra cada cuenta por separado y el balance comprueba que todo cuadre.",
    ],
    consejo: "Ejemplo de gasto: debe en la cuenta de gasto (arriendo) y haber en Caja por el mismo valor.",
  },
  "/pagos-digitales": {
    titulo: "Nequi, Daviplata y Bre-B",
    paraQue: "Conciliar los pagos por transferencia contra tus ventas.",
    pasos: [
      "Anota cada pago recibido con el valor, quién lo hizo y por qué medio.",
      "Compáralo con la venta correspondiente.",
      "Marca como confirmado el que ya viste en tu app del banco.",
    ],
  },
  "/pedidos-recurrentes": {
    titulo: "Pedidos recurrentes",
    paraQue: "Atender a clientes que piden cada semana, como almuerzos o empresas.",
    pasos: [
      "Crea el pedido con el cliente, qué pide y los días en que lo recibe.",
      "Cada día revisa cuáles toca preparar.",
      "Pausa o termina el pedido si el cliente deja de pedir.",
    ],
  },
  "/propinas": {
    titulo: "Propinas y reparto",
    paraQue: "Registrar las propinas y repartirlas entre el equipo.",
    pasos: [
      "Anota la propina recibida en el día.",
      "Indica entre quiénes se reparte.",
      "Revisa cuánto le toca a cada persona y márcalo como entregado.",
    ],
  },
  "/proveedores-compras": {
    titulo: "Proveedores y compras",
    paraQue: "Llevar tus pedidos y deudas con proveedores.",
    pasos: [
      "Registra a cada proveedor con su teléfono.",
      "Anota cada compra con el valor y si quedó pendiente de pago.",
      "Cuando pagues, actualiza el estado para saber cuánto debes.",
    ],
  },
  "/puntos-recompensas": {
    titulo: "Puntos y recompensas",
    paraQue: "Premiar a tus clientes frecuentes.",
    pasos: [
      "Busca o registra al cliente por su teléfono.",
      "Suma puntos según lo que compre.",
      "Cuando junte los suficientes, entrégale su premio y descuenta los puntos.",
    ],
  },
  "/repartidores": {
    titulo: "Repartidores y liquidación",
    paraQue: "Controlar el pago por domicilio de cada domiciliario.",
    pasos: [
      "Registra a tus repartidores.",
      "Revisa cuántos domicilios hizo cada uno.",
      "Liquida lo que le debes y márcalo como pagado.",
    ],
  },
  "/resenas-pqrs": {
    titulo: "Reseñas y PQRS",
    paraQue: "Atender quejas, reclamos y opiniones con seguimiento.",
    pasos: [
      "Registra la opinión, queja o reclamo con el nombre del cliente.",
      "Cámbiale el estado mientras lo resuelves.",
      "Ciérralo cuando el cliente quede conforme.",
    ],
  },
  "/metas": {
    titulo: "Metas y objetivos",
    paraQue: "Fijar metas de ventas y seguirlas cada semana.",
    pasos: [
      "Crea una meta con su valor y el plazo.",
      "Actualiza el avance con frecuencia.",
      "Compara lo logrado contra la meta para ajustar a tiempo.",
    ],
  },
  "/asistente-virtual": {
    titulo: "Asistente virtual",
    paraQue: "Atender pedidos y preguntas de tus clientes por chat.",
    pasos: [
      "Revisa que tu menú, precios y datos del negocio estén al día: de ahí responde el asistente.",
      "Haz una prueba escribiendo como si fueras un cliente.",
      "Comparte el enlace del asistente con tus clientes.",
    ],
  },
  "/leads": {
    titulo: "Clientes y contactos",
    paraQue: "Tener a la mano a tus clientes e interesados.",
    pasos: [
      "Agrega cada contacto con su nombre y teléfono.",
      "Anota en qué va: interesado, en seguimiento o cliente.",
      "Búscalo cuando necesites volver a escribirle.",
    ],
  },
  "/calendar": {
    titulo: "Agenda y calendario",
    paraQue: "Ver citas, entregas y recordatorios en un solo lugar.",
    pasos: [
      "Mira el mes y toca un día para ver lo que tienes.",
      "Usa los filtros para ver solo lo que te interesa.",
      "Revisa la agenda cada mañana para no olvidar nada.",
    ],
  },
  "/requests": {
    titulo: "Solicitudes y cotizaciones",
    paraQue: "Recibir y responder las solicitudes de tus clientes.",
    pasos: [
      "Crea o recibe una solicitud con los datos del cliente.",
      "Respóndele y cambia el estado según avance.",
      "Ciérrala cuando esté resuelta.",
    ],
  },
};

const GENERICO = "Para guardar cambios toca el botón de guardar; todo queda registrado en tu cuenta.";

/** Devuelve el instructivo de la pantalla actual, o null si no hay uno. */
export function instructivoPara(pathname: string): Instructivo | null {
  const mod = /^\/modulos\/([^/]+)/.exec(pathname);
  if (mod) {
    const modulo = buscarModulo(decodeURIComponent(mod[1]));
    if (!modulo) return null;
    const cfg = configModulo(modulo.id);
    const estados = cfg.estados.map((e) => `“${e.texto}”`).join(", ");
    const cerrados = cfg.estados.filter((e) => cfg.cerrados.includes(e.clave)).map((e) => `“${e.texto}”`).join(", ");
    return {
      titulo: modulo.titulo,
      paraQue: modulo.descripcion,
      pasos: [
        `En “Nuevo registro” escribe el título, por ejemplo: ${cfg.placeholderTitulo.replace(/^Título \(ej\. /, "").replace(/\)$/, "")}.`,
        `Completa lo que aplique: ${cfg.etiquetaContacto.toLowerCase()}, teléfono, ${cfg.etiquetaMonto.toLowerCase()} y ${cfg.etiquetaFecha.toLowerCase()}.`,
        "Toca “Guardar registro”; aparece en la lista de la derecha.",
        `Cambia el avance de cada registro con su selector de estado: ${estados}.`,
        `Arriba ves “${cfg.resumen}”: suma lo que aún no está cerrado${cerrados ? ` (cerrado = ${cerrados})` : ""}.`,
        "Usa los botones de estado para filtrar la lista, y la papelera para borrar un registro.",
      ],
      consejo: GENERICO,
    };
  }
  const clave = Object.keys(POR_RUTA).find((r) => pathname === r || pathname.startsWith(`${r}/`));
  return clave ? POR_RUTA[clave] : null;
}
