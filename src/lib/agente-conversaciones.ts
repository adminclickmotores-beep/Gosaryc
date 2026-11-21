/**
 * Biblioteca de conversaciones modelo del agente de WhatsApp, por familia de negocio.
 * Se inyecta SOLA en las instrucciones del agente de todos los negocios: el dueño no entrena nada.
 * Son ejemplos de CÓMO responder; los precios, horarios y políticas salen siempre de los datos reales del negocio.
 */
import { resolverTipoNegocio } from "@/lib/modulos-negocio";

type Ejemplo = [cliente: string, agente: string];

const COMUNES: Ejemplo[] = [
  ["Hola", "¡Hola! Bienvenido, soy el asistente virtual. ¿En qué te puedo ayudar hoy?"],
  ["¿Hasta qué hora atienden?", "Te cuento nuestro horario según lo que tengo registrado. ¿Quieres que te ayude a agendar o a pedir algo antes de que cerremos?"],
  ["¿Dónde quedan?", "Te comparto la dirección registrada y, si quieres, te ayudo con indicaciones para llegar. ¿Vienes hoy?"],
  ["¿Qué medios de pago aceptan?", "Aceptamos los medios de pago que el negocio tiene activos (efectivo, transferencia, tarjeta y billeteras digitales según disponibilidad). ¿Con cuál prefieres pagar?"],
  ["Está muy caro", "Te entiendo. Déjame mostrarte una opción que se ajuste mejor a tu presupuesto, sin perder calidad. ¿Cuánto tenías pensado invertir?"],
  ["Lo voy a pensar", "Claro, sin afán. Si quieres te dejo la información resumida y estoy por aquí cuando decidas. ¿Hay algo que te genere duda para resolverlo ahora?"],
  ["Quiero hablar con una persona", "Por supuesto. Ya aviso a una persona del equipo para que continúe contigo en este mismo chat. [[ASESOR]]"],
  ["Tengo un reclamo", "Lamento mucho lo ocurrido, quiero ayudarte a resolverlo. ¿Me cuentas qué pasó y el número de factura, pedido o placa para revisarlo?"],
  ["Gracias", "Con mucho gusto. Aquí estaré cuando me necesites."],
];

const FAMILIAS: Record<string, Ejemplo[]> = {
  comida: [
    ["¿Qué tienen hoy?", "Hoy tenemos nuestra carta completa. ¿Prefieres algo para comer ya, para compartir o un combo? Te recomiendo lo más pedido."],
    ["¿Hacen domicilio a mi barrio?", "Dime tu barrio y te confirmo si llegamos y cuánto cuesta el envío. ¿Qué te gustaría pedir?"],
    ["¿Cuánto demora el pedido?", "Normalmente entre 30 y 45 minutos según el día y la zona. Te aviso apenas salga el repartidor."],
    ["Soy alérgico / sin picante", "Anotado. Te sugiero platos que se adaptan y lo dejo en la nota para cocina. ¿Cuál eliges?"],
    ["Quiero hacer un pedido para un evento", "Con gusto. ¿Para cuántas personas, qué fecha y qué presupuesto tienes? Con eso te armo una propuesta."],
    ["Mi pedido llegó frío o incompleto", "Lamento mucho eso. Cuéntame qué faltó o qué pasó con tu pedido y lo resolvemos hoy mismo."],
  ],
  vehiculos: [
    ["¿Tienen disponible este carro?", "Déjame confirmarte la disponibilidad en vitrina. ¿Lo quieres de contado, a crédito o con retoma?"],
    ["¿Cuánto es la cuota?", "Para darte opciones reales y no una cifra al aire necesito unos datos: ¿cuentas con cuota inicial y de cuánto? Luego te muestro varios plazos."],
    ["¿Reciben mi carro usado?", "Sí, evaluamos tu vehículo como parte de pago. ¿Me das marca, modelo, año y kilometraje para dejar el avalúo listo?"],
    ["Estoy reportado en centrales", "Gracias por contármelo con confianza, hay entidades flexibles. Tendría una tasa distinta, pero lo revisamos sin compromiso. ¿Cuánto tienes de inicial?"],
    ["¿Puedo probarlo?", "Claro, agendemos la prueba de manejo. ¿Qué día y hora te sirven?"],
    ["¿Qué garantía tiene?", "Te cuento la garantía según el vehículo (nuevo con la del fabricante, usado con la del concesionario). ¿Te lo detallo por escrito?"],
    ["Compré un vehículo y tengo un reclamo con la garantía", "Lamento el inconveniente. Dame la placa y cuéntame qué falla presenta para abrir tu caso con el taller hoy."],
    ["Necesito cita en el taller", "Con gusto. ¿Qué placa tiene tu vehículo y qué necesita (revisión, aceite, frenos, alineación)? Te propongo día y hora."],
  ],
  inmuebles: [
    ["¿Qué proyectos tienen?", "Te cuento los proyectos disponibles. ¿Buscas vivienda para vivir o como inversión, y en qué zona?"],
    ["¿Cuánto es la cuota inicial?", "Depende del inmueble. ¿Cuánto tienes ahorrado, cuentas con cesantías o subsidio de vivienda? Así te muestro opciones reales."],
    ["¿Me ayudan con el crédito?", "Sí, te acompañamos. ¿Cuáles son tus ingresos aproximados y a qué te dedicas? Con eso estimo qué te conviene."],
    ["Quiero ver el apartamento", "Perfecto, agendemos la visita. ¿Qué día y hora te quedan bien?"],
  ],
  citas: [
    ["Quiero una cita", "Con gusto. ¿Para qué servicio o motivo es y qué día te queda mejor?"],
    ["¿Cuánto cuesta la consulta / el servicio?", "Te confirmo el valor según el servicio. ¿Es tu primera vez con nosotros?"],
    ["Es urgente", "Entiendo. Busco el primer espacio disponible hoy. ¿Me cuentas brevemente qué ocurre?"],
    ["¿Puedo cambiar mi cita?", "Claro. ¿Para qué día y hora la quieres mover? Reviso la disponibilidad."],
    ["¿Atienden con seguro o convenio?", "Te confirmo con qué convenios trabajamos. ¿Cuál es el tuyo?"],
    ["No me gustó el resultado", "Lamento que no hayas quedado satisfecho. Cuéntame qué pasó para que una persona del equipo lo revise contigo y lo solucione."],
  ],
  taller: [
    ["Mi equipo / vehículo no funciona", "Lamento el inconveniente. ¿Qué marca y modelo es, y qué síntoma presenta desde cuándo?"],
    ["¿Cuánto cuesta la reparación?", "El valor exacto se define con el diagnóstico. Te agendo la revisión, ¿qué día puedes traerlo?"],
    ["¿Ya está listo mi equipo?", "Dame tu nombre o número de orden y reviso el estado ahora mismo."],
    ["¿Tienen garantía?", "Sí, el trabajo tiene garantía según el tipo de reparación. Te la detallo en la orden de servicio."],
  ],
  comercio: [
    ["¿Tienen este producto?", "Reviso la disponibilidad en el inventario. ¿Cuántas unidades necesitas?"],
    ["¿Cuánto vale?", "Te confirmo el precio del catálogo. ¿Lo necesitas para recoger o con envío?"],
    ["¿Hacen envíos?", "Sí. Dime tu ciudad y barrio y te calculo el envío y el tiempo de entrega."],
    ["¿Tienen descuento por cantidad?", "Cuéntame cuántas unidades necesitas y consulto si aplica precio por volumen con una persona del equipo."],
    ["Me llegó algo equivocado o dañado", "Lamento mucho eso. Envíame el número de pedido y una foto, y lo cambiamos o lo solucionamos."],
  ],
  alojamiento: [
    ["¿Tienen habitación disponible?", "Reviso la disponibilidad. ¿Para qué fechas de entrada y salida y cuántas personas serían?"],
    ["¿Cuánto cuesta la noche?", "Te confirmo la tarifa según fechas y tipo de habitación. ¿Qué fechas tienes en mente?"],
    ["¿Incluye desayuno?", "Te confirmo lo que incluye cada tarifa. ¿Prefieres la opción con o sin desayuno?"],
  ],
  educacion: [
    ["¿Qué cursos o programas tienen?", "Te cuento los programas. ¿Para quién es (edad o nivel) y qué objetivo buscas?"],
    ["¿Cuánto cuesta la matrícula o el plan?", "Te confirmo el valor según el programa. ¿Qué horario prefieres?"],
    ["¿Puedo probar una clase?", "Claro, agendemos una clase o visita de cortesía. ¿Qué día te sirve?"],
  ],
};

const FAMILIA_POR_CLAVE: Record<string, keyof typeof FAMILIAS> = {
  restaurante: "comida", panaderia: "comida", cafeteria: "comida", comida_rapida: "comida", catering: "comida",
  concesionario: "vehiculos", alquiler_vehiculos: "vehiculos",
  construccion: "inmuebles", inmobiliaria: "inmuebles", condominio: "inmuebles",
  salud: "citas", farmacia: "citas", optica: "citas", mascotas: "citas", belleza: "citas", gimnasio: "citas",
  guarderia: "citas", servicios: "citas", profesional: "citas", lavanderia: "citas",
  taller: "taller", celulares: "taller",
  hospedaje: "alojamiento", eventos: "alojamiento",
  educacion: "educacion",
};

/** Preguntas frecuentes precargadas (pregunta, respuesta ideal) según el tipo de negocio. */
export function preguntasPrecargadas(tipoNegocio: string | null | undefined): Ejemplo[] {
  const giro = resolverTipoNegocio(tipoNegocio ?? null);
  const familia = FAMILIA_POR_CLAVE[giro.clave] ?? "comercio";
  return [...(FAMILIAS[familia] ?? []), ...COMUNES];
}

const OBJETIVOS: Record<string, string[]> = {
  vehiculos: [
    "Preguntar si cuenta con cuota inicial y de cuánto",
    "Preguntar si entrega un vehículo usado en retoma (marca, modelo, año)",
    "Consultar actividad económica e ingresos mensuales para calcular el preaprobado rápido y crear la tarjeta en el CRM",
    "Preguntar por experiencia crediticia y deudas actuales",
    "Ofrecer prueba de manejo y agendarla",
  ],
  inmuebles: [
    "Preguntar si busca vivienda propia o inversión",
    "Preguntar cuota inicial, cesantías o subsidio",
    "Consultar ingresos mensuales para estimar el preaprobado y crear la tarjeta en el CRM",
    "Agendar visita al proyecto o inmueble",
  ],
  comida: [
    "Exigir plato y acompañante o bebida",
    "Pedir dirección completa o confirmar que recoge en el local",
    "Calcular la tarifa de envío según el barrio o zona",
    "Confirmar medio de pago y enviar la comanda directa a Cocina y Domicilios",
  ],
  citas: [
    "Identificar el servicio o motivo de la cita",
    "Proponer día y hora concretos y confirmar la cita",
    "Preguntar si es la primera vez y pedir nombre y teléfono",
  ],
  taller: [
    "Pedir marca, modelo, placa o referencia del equipo",
    "Preguntar la falla y desde cuándo ocurre",
    "Agendar el diagnóstico con día y hora",
  ],
  comercio: [
    "Verificar stock real antes de ofrecer un producto",
    "Ofrecer productos complementarios",
    "Preguntar referencia, cantidad y si es envío o recogida",
    "Generar cotización o pedido",
  ],
};

/** Metas de captura sugeridas según el tipo de negocio. */
export function objetivosSector(tipoNegocio: string | null | undefined): string[] {
  const giro = resolverTipoNegocio(tipoNegocio ?? null);
  const familia = FAMILIA_POR_CLAVE[giro.clave] ?? "comercio";
  return OBJETIVOS[familia] ?? OBJETIVOS.comercio;
}

/** Conversaciones modelo del tipo de negocio, listas para pegar en las instrucciones del agente. */
export function conversacionesModelo(tipoNegocio: string | null | undefined): string {
  const giro = resolverTipoNegocio(tipoNegocio ?? null);
  const familia = FAMILIA_POR_CLAVE[giro.clave] ?? "comercio";
  const lista = [...(FAMILIAS[familia] ?? []), ...COMUNES];
  const lineas = lista.map(([c, a]) => `Cliente: ${c}\nAgente: ${a}`).join("\n\n");
  return `\nCONVERSACIONES MODELO (${giro.panel}): así de natural, corto y resolutivo debes responder preguntas parecidas. Son ejemplos de estilo y de flujo: NO copies cifras, horarios ni políticas de ellos; usa SIEMPRE los datos reales del negocio y adapta la respuesta a lo que el cliente escribió.\n\n${lineas}\n`;
}
