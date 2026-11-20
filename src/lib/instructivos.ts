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
  "/": {
    titulo: "Portada y fichas por negocio",
    paraQue: "Conocer el programa y empezar gratis con tu rubro ya elegido.",
    pasos: [
      "Baja a «El programa se adapta a tu negocio, no al revés» y toca tu tipo de negocio para ver su ficha.",
      "Lee qué problema resuelve y sus funciones reales incluidas.",
      "Pulsa «Probar Gosaryc gratis para [tu negocio]» para crear tu cuenta con ese rubro preseleccionado.",
    ],
    consejo: "La portada muestra primero toda la información; el registro y el inicio de sesión están al final.",
  },
  "/calendar": {
    titulo: "Agenda y cobro de citas",
    paraQue: "Agendar citas y cobrarlas para que la plata entre directo a la caja del día.",
    pasos: [
      "Crea la cita con título, fecha, hora y cliente.",
      "Cuando el cliente llegue, pulsa «Cobrar», escribe el valor y confirma: entra a Caja.",
      "Si se cancela, queda marcada como cancelada en el historial (no se borra).",
    ],
    consejo: "Cobra cada cita el mismo día para que el cierre de caja cuadre.",
  },
  "/cartera-fiados": {
    titulo: "Cartera y cuentas por cobrar",
    paraQue: "Controlar los saldos pendientes de tus clientes: montos, abonos, fechas prometidas de pago y estado de cada cuenta.",
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
      "Crea a cada empleado con su salario: si marcas «Salario anclado al SMMLV vigente», su base se ajusta sola cuando entra un decreto nuevo.",
      "Anota turnos, horas extra, recargos, incapacidades y descuentos.",
      "Liquida el periodo: el motor usa la vigencia oficial de la fecha (SMMLV, auxilio, recargos Ley 2466, aportes y provisiones), verifica el tope de 2 SMMLV para el auxilio y guarda el histórico.",
      "Pulsa «Guardar y contabilizar» para llevar el gasto y el pasivo a Contabilidad, o «Desprendible por WhatsApp» para enviárselo al empleado.",
      "Si el Gobierno cambia los valores, pulsa «Consultar y actualizar valores de ley (IA)» y la vigencia nueva queda cargada con su respaldo legal.",
      "Revisa el calendario de obligaciones (PILA, retención, nómina electrónica, cesantías, primas y SG-SST) para no pagar multas.",
    ],
    consejo: "Los porcentajes no están fijos: salen de la tabla oficial por vigencia. El liquidador es una guía de cálculo: confirma siempre con tu contador antes de pagar o presentar la PILA.",
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
      "En “Contador Pro Colombia” genera tu cronograma anual de vencimientos (semáforo rojo, amarillo y verde), pre-liquida Retefuente, IVA e ICA con tus asientos reales, valida tus terceros para la exógena y actualiza la normativa con IA.",
    ],
    consejo: "Ejemplo de gasto: debe en la cuenta de gasto (arriendo) y haber en Caja por el mismo valor. Todo es estimado: tu contador confirma antes de declarar.",
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
  "/crm-embudo": {
    titulo: "CRM y Embudo IA",
    paraQue: "Seguir a cada prospecto del agente de WhatsApp desde que escribe hasta que cierra.",
    pasos: [
      "Alterna entre Tablero (arrastra cada tarjeta a su etapa) y Cola de llegada (atiende por turno).",
      "Filtra por canal, temperatura (caliente, tibio, frío) o estado, o busca por nombre o teléfono.",
      "Abre una tarjeta para ver el perfil calificado por la IA, la línea de tiempo y sus PQRS.",
      "Usa los 4 botones: abrir chat, crear cotización, agendar cita o convertir a cliente.",
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
  "/settings": {
    titulo: "Configuración, sedes y respaldo",
    paraQue: "Crear sucursales, ver el enlace público de tu negocio y descargar el respaldo total.",
    pasos: [
      "En “Sucursales y puntos de venta” crea cada sede; en reportes y caja puedes ver el consolidado o una sola sede.",
      "En “Traslado de mercancía” registra el envío entre sedes e imprime el acta; al recibir, marca el traslado como recibido.",
      "En “Enlace público de tu negocio” copia el QR: cada visitante solo ve lo de tu negocio (restaurantes muestran menú, tiendas catálogo por WhatsApp, salones o clínicas servicios y citas online, talleres agendamiento; lo de Salud Ocupacional solo aparece en negocios SST).",
      "En “Respaldo total del negocio” descarga clientes, productos, ventas, cartera y contabilidad en Excel con un clic.",
      "En “Impresoras de caja y cocina” elige cada impresora con su botón de prueba: la factura sale en caja y cada pedido nuevo imprime su comanda solo en cocina.",
      "Sin el programa instalado también imprimes: la factura sale en tirilla de 58/80 mm o carta PDF con el diálogo del navegador (si lo bloquea, se descarga el archivo).",
      "Cuando salga versión nueva verás arriba «¡Nueva versión disponible! Haz clic aquí para actualizar ahora»: tócalo y listo, tus datos se conservan.",
    ],
    consejo: "Instaladores: Windows 64/32 (8 a 11) + paquete de tienda, Linux AppImage/.deb y APK directo sin Play Store. Todo se genera con doble clic o solo en la nube (Actions > Compilar todo).",
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
  "/requests": {
    titulo: "Solicitudes y cotizaciones",
    paraQue: "Recibir y responder las solicitudes de tus clientes.",
    pasos: [
      "Crea o recibe una solicitud con los datos del cliente.",
      "Respóndele y cambia el estado según avance.",
      "Ciérrala cuando esté resuelta.",
    ],
  },
  "/restaurante": {
    titulo: "Mi negocio",
    paraQue: "Tus datos, logo, facturación, agente de WhatsApp y enlace público en un solo lugar.",
    pasos: [
      "Completa nombre, logo, colores y horarios: eso ven tus clientes en el menú y las facturas.",
      "En “Datos fiscales” escribe razón social, NIT con DV, régimen, resolución con rango y vencimiento, y el pie de página: todo sale impreso en cada factura.",
      "Abre la pestaña «Agente WhatsApp IA» para conectarlo, definir sus respuestas y mirar los chats en vivo.",
      "Copia tu enlace público o QR y pégalo en el local o en redes.",
    ],
    consejo: "Las facturas siempre llevan tu logo, régimen y pie de página: revísalos aquí antes de facturar.",
  },
  "/licencias": {
    titulo: "Licencias (Superadmin)",
    paraQue: "Dar pruebas con días exactos y vender licencias de 1 año.",
    pasos: [
      "Crea la prueba con los días exactos que quieras (3, 7, 15, 30, 60, 90 o los que escribas).",
      "Extiende cualquier licencia por botones rápidos o por días exactos.",
      "La licencia de 1 año (365 días) solo la activa el Superadmin y la base de datos lo verifica.",
      "Envía el código al cliente por WhatsApp con un clic.",
    ],
  },
};

/** Instructivos de los módulos comerciales con pantalla propia, por id de módulo. */
const POR_MODULO: Record<string, Instructivo> = {
  com_lotes: {
    titulo: "Lotes y vencimientos",
    paraQue: "Saber qué lote vence primero y vender siempre lo más viejo antes (FIFO).",
    pasos: [
      "Al recibir mercancía, elige el producto, escribe el número de lote, la fecha de vencimiento y la cantidad.",
      "Toca “Registrar lote”: el stock del producto sube solo.",
      "Arriba ves cuántos lotes están vencidos o vencen en 7, 15 y 30 días.",
      "En el POS, cada venta descuenta primero del lote que vence antes y el producto muestra su alerta.",
    ],
    consejo: "Los lotes no se borran: cuando se agotan salen de la lista.",
  },
  com_cotizador: {
    titulo: "Cotizador de materiales",
    paraQue: "Cotizar rápido a maestros de obra y contratistas y convertir la cotización en venta.",
    pasos: [
      "Escribe el cliente u obra y su celular, elige la lista de precios (mayorista, detal o especial) y el descuento.",
      "Busca cada material y ajusta cantidad y unidad; ves el total con impuestos al instante.",
      "Toca “Guardar cotización”, y luego envíala por WhatsApp o imprímela como PDF.",
      "Cuando el cliente apruebe, toca “Aprobar como pedido” o “Convertir en venta”: descuenta el inventario y entra a Caja y Contabilidad.",
    ],
    consejo: "En “Productos y precios” anota pasillo, estante y nivel para ubicar cada material en el POS.",
  },
  com_desposte: {
    titulo: "Desposte y rendimiento",
    paraQue: "Saber cuánto rinde una canal o bulto y cuánto cuesta realmente cada kilo limpio.",
    pasos: [
      "Elige lo que entra (de tu inventario o compra directa), su peso en kilos y el costo total.",
      "Agrega cada corte que sale con su peso, y el hueso, grasa o desperdicio.",
      "Revisa el rendimiento y el costo real por kilo limpio antes de guardar.",
      "Al guardar, baja lo que entró, suben los cortes con su costo y la merma queda en Contabilidad.",
    ],
    consejo: "Crea antes los cortes como productos en kilos en “Productos y precios”.",
  },
  bel_agenda: {
    titulo: "Agenda por silla y estilista",
    paraQue: "Reservar citas por servicio sin que se crucen el profesional ni la silla o cabina.",
    pasos: [
      "Elige el cliente, el servicio (trae su duración), quién atiende, la silla o cabina y la hora.",
      "Toca “Agendar cita”: si hay cruce, el sistema te avisa.",
      "Mañana aparecen los recordatorios: un clic abre WhatsApp con el mensaje listo.",
      "Al terminar, toca “Cobrar y finalizar”: se descuentan los insumos, entra a Caja y Contabilidad y se calcula la comisión.",
    ],
  },
  bel_fichas: {
    titulo: "Clientes y ficha técnica",
    paraQue: "Guardar fórmulas de tinte, alergias y fotos de antes y después.",
    pasos: [
      "Crea el cliente con su teléfono y sus alergias.",
      "En cada visita escribe la fórmula, las notas y sube las fotos.",
      "El historial queda ordenado por fecha; las alergias salen en rojo en la agenda.",
    ],
    consejo: "Las fichas no se editan ni se borran: si algo cambia, crea una ficha nueva.",
  },
  bel_servicios: {
    titulo: "Servicios, insumos y tarifas",
    paraQue: "Definir precio, duración, comisión e insumos que gasta cada servicio.",
    pasos: [
      "Crea el servicio con su duración, precio y porcentaje de comisión.",
      "Crea los insumos (tintes, ampolletas) con su existencia y costo.",
      "En cada servicio agrega los insumos y la cantidad que gasta.",
    ],
    consejo: "Si no hay insumo suficiente, el sistema avisa antes de cobrar.",
  },
  bel_comisiones: {
    titulo: "Comisiones y liquidación",
    paraQue: "Ver lo que gana cada estilista y pagarlo desde Caja.",
    pasos: [
      "Cada servicio o producto cobrado calcula la comisión (descontando insumos si el servicio lo indica).",
      "También puedes registrar una venta rápida sin cita.",
      "El dueño toca “Liquidar”: sale de Caja y queda en Contabilidad.",
    ],
  },
  gim_checkin: {
    titulo: "Check-in de socios",
    paraQue: "Dejar entrar solo a quien tiene la membresía al día.",
    pasos: [
      "Escribe la cédula o escanea el código QR y presiona Enter.",
      "Verde: puede entrar. Rojo: está vencido, sin sesiones, congelado o le quedan 5 días o menos.",
      "Si está en rojo, toca “Cobrar por WhatsApp” para enviarle el recordatorio.",
    ],
    consejo: "En una tiquetera, entrar dos veces el mismo día cuenta una sola sesión.",
  },
  gim_socios: {
    titulo: "Socios y membresías",
    paraQue: "Inscribir socios, vender planes y controlar vencimientos.",
    pasos: [
      "Guarda al socio con su cédula y su celular.",
      "Toca “Vender plan”: el cobro entra a Caja y Contabilidad.",
      "Si tiene una incapacidad, toca “Congelar”; al reactivar se suman los días congelados.",
    ],
  },
  gim_planes: {
    titulo: "Planes y tiqueteras",
    paraQue: "Definir lo que vendes: mensualidades, trimestres, anualidades y tiqueteras.",
    pasos: ["Elige el tipo de plan, su vigencia en días y su precio.", "En las tiqueteras escribe cuántas sesiones trae."],
  },
  gim_valoracion: {
    titulo: "Valoración física",
    paraQue: "Seguir la evolución de cada socio.",
    pasos: [
      "Elige al socio y registra peso, grasa, masa muscular y medidas.",
      "Escribe la rutina y el entrenador.",
      "Compara con la primera valoración para ver su avance.",
    ],
    consejo: "Las valoraciones no se editan ni se borran: cada control es un registro nuevo.",
  },
  tal_ordenes: {
    titulo: "Órdenes de trabajo y recepción",
    paraQue: "Recibir el vehículo o equipo con checklist y fotos, y llevarlo hasta la entrega con garantía.",
    pasos: [
      "Abre la orden con cliente, placa o serial, marca, kilometraje o patrón de desbloqueo, técnico y mano de obra.",
      "Marca el checklist de estado y sube las fotos de recepción: sin fotos no deja pasar a diagnóstico.",
      "Mueve la orden por el tablero: Recibido, Diagnóstico, Aprobado (pídelo por WhatsApp), Reparación, Listo y Entregado.",
      "Agrega repuestos del inventario: descuentan stock solos y suman a la cuenta.",
      "Al cobrar, la orden entra a Caja y Contabilidad y queda con sus días de garantía para validar reclamos por placa o serial.",
    ],
  },
  tal_repuestos: {
    titulo: "Repuestos e inventario",
    paraQue: "Llevar el stock de repuestos que se usan en las órdenes.",
    pasos: ["Crea cada repuesto con su stock, costo y precio.", "Cuando entra mercancía usa “Sumar”.", "Al agregarlo a una orden descuenta solo."],
  },
  tal_comisiones: {
    titulo: "Comisiones y liquidación",
    paraQue: "Pagar a cada técnico u operario su comisión sobre la mano de obra.",
    pasos: ["Cada orden entregada calcula la comisión del técnico.", "El dueño toca “Liquidar”: sale de Caja y queda en Contabilidad."],
  },
  tal_proyectos: {
    titulo: "Proyectos a la medida",
    paraQue: "Cotizar trabajos de carpintería o imprenta con abono y saldo.",
    pasos: [
      "Crea el proyecto con cliente, valor total, materiales y fecha de entrega.",
      "Cobra el abono (sugerido 50%): entra a Caja y Contabilidad y pasa a producción.",
      "Cobra el saldo contra entrega y avisa por WhatsApp en cada etapa.",
    ],
  },
  obr_obras: {
    titulo: "Obras y presupuestos",
    paraQue: "Controlar planeado contra ejecutado, vales a obra y cortes por acta.",
    pasos: [
      "Crea la obra con su presupuesto total.",
      "Agrega sus capítulos (materiales, mano de obra, maquinaria) con lo planeado: si lo ejecutado lo supera, sale la alerta de sobrecosto.",
      "Despacha cada vale de salida: descuenta de bodega y suma al capítulo.",
      "Guarda el corte con acta, avance, retención y anticipo; al cobrarlo entra a Caja y Contabilidad.",
    ],
  },
  inm_propiedades: {
    titulo: "Propiedades y contratos",
    paraQue: "Portafolio, arriendo mensual y pago al propietario.",
    pasos: [
      "Registra la propiedad con matrícula, canon y estado.",
      "Crea el contrato con tu comisión y genera el cobro de cada mes.",
      "Cobra el canon (entra a Caja y Contabilidad) o avisa la mora por WhatsApp.",
      "El dueño liquida: descuenta comisión y reparaciones y paga el neto.",
    ],
  },
  agr_lotes: {
    titulo: "Lotes y producción",
    paraQue: "Costear cada lote y vender con la utilidad real.",
    pasos: [
      "Crea el lote con su cultivo y producción disponible.",
      "Aplica cada insumo con su dosis: descuenta del inventario y suma al costo del lote.",
      "Vende la producción: calcula el costo promedio, la utilidad y entra a Caja y Contabilidad.",
    ],
  },
  tra_manifiestos: {
    titulo: "Manifiestos y liquidación",
    paraQue: "Llevar cada viaje de la guía al pago del conductor.",
    pasos: [
      "Registra el vehículo con su placa y crea el manifiesto con origen, destino y flete.",
      "Entrega anticipos de viáticos, ACPM y peajes: salen de Caja.",
      "Cobra el flete y liquida al conductor (solo el dueño): la utilidad neta queda registrada.",
    ],
  },
  hot_habitaciones: {
    titulo: "Rack de habitaciones",
    paraQue: "Ver de un vistazo qué está libre, ocupado o en limpieza.",
    pasos: [
      "Crea cada habitación con su tipo y tarifa por noche.",
      "Toca el estado para cambiarlo: disponible, ocupada, reservada, limpieza o mantenimiento.",
      "Las reservas y el check-in mueven el estado solas; el check-out la deja en limpieza.",
    ],
  },
  hot_reservas: {
    titulo: "Reservas y check-in",
    paraQue: "Reservar, recibir al huésped y cobrarle todo al salir.",
    pasos: [
      "Guarda la reserva con huésped, documento, fechas y anticipo.",
      "Haz check-in al llegar: la habitación pasa a ocupada.",
      "Suma cargos de minibar, lavandería o restaurante a la cuenta.",
      "Al hacer check-out se cobran las noches más los cargos menos el anticipo: entra a Caja y Contabilidad.",
    ],
  },
  edu_matriculas: {
    titulo: "Estudiantes y matrículas",
    paraQue: "La ficha de cada estudiante con su acudiente.",
    pasos: ["Matricula con nombre, grado, grupo y acudiente con su celular.", "Busca por nombre o grado para ubicarlo rápido."],
  },
  edu_pensiones: {
    titulo: "Pensiones y cartera",
    paraQue: "Cobrar el mes a tiempo sin perseguir a nadie.",
    pasos: [
      "Genera el periodo una sola vez: se crea la pensión de cada estudiante activo, sin duplicar.",
      "Cobra: entra a Caja y Contabilidad. Lo pendiente se avisa al acudiente por WhatsApp.",
    ],
  },
  edu_academico: {
    titulo: "Asistencia y boletín",
    paraQue: "Llevar la asistencia diaria y las notas por periodo.",
    pasos: ["Marca presente o ausente cada día por estudiante.", "Guarda área, valoración y logro de cada periodo para el boletín."],
  },
  mod_matriz: {
    titulo: "Referencias y matriz talla/color",
    paraQue: "Vender cada variante sin confundir tallas ni colores.",
    pasos: [
      "Crea la referencia padre con marca, temporada y precio.",
      "Agrega cada variante con su talla, color, stock y código de barras.",
      "Los cambios se resuelven con bono de regalo: no se borra el movimiento.",
    ],
  },
  far_control: {
    titulo: "Droguería y control de fórmula",
    paraQue: "Vender medicamentos cumpliendo la norma.",
    pasos: [
      "Registra cada producto con principio activo, INVIMA, lote y vencimiento; marca fórmula, controlado y refrigerado.",
      "Antibióticos y controlados no se venden sin marcar que el cliente trae la fórmula.",
      "Cada venta descuenta stock y entra a Caja y Contabilidad.",
    ],
  },
  opt_formulas: {
    titulo: "Fórmula y laboratorio",
    paraQue: "Del examen a la entrega de las gafas.",
    pasos: [
      "Guarda la fórmula con esfera, cilindro, eje, adición y DP de cada ojo.",
      "Crea la orden con montura, lentes, laboratorio y fecha prometida; el abono entra a Caja.",
      "Entrega solo cuando el saldo quede en cero.",
    ],
  },
  facturas: {
    titulo: "Facturación",
    paraQue: "Emitir facturas de venta con consecutivo y resolución DIAN.",
    pasos: [
      "Completa tus datos fiscales en Mi negocio: NIT con dígito de verificación, régimen, responsabilidad fiscal y resolución con rango y vencimiento.",
      "Crea la factura con cliente, ítems, IVA y formato tirilla o carta; el número sale solo dentro de tu rango autorizado.",
      "Si tu cuenta tiene DIAN activa, la factura se envía sola al proveedor y guarda su CUFE y QR oficial (salen en la tirilla y en el PDF). Si no la tienes, pide la activación por WhatsApp desde la tarjeta de Facturación Electrónica DIAN.",
      "Imprime o guarda en PDF y reimprime cuando el cliente la pida. El historial se exporta a Excel.",
    ],
  },
  lav_ordenes: {
    titulo: "Órdenes de lavado y cobro",
    paraQue: "Recibir prendas, avisar cuando estén listas y cobrar.",
    pasos: [
      "Recibe con cliente, prendas, total y fecha de entrega.",
      "Avanza de recibida a en proceso y a lista; avisa por WhatsApp.",
      "Cobra abonos o el total: entra a Caja y Contabilidad.",
    ],
  },
  prof_casos: {
    titulo: "Casos y cobro de honorarios",
    paraQue: "Llevar cada asunto y cobrarlo por abonos.",
    pasos: ["Abre el caso con cliente, asunto, honorarios y vencimiento.", "Cobra abonos que entran a Caja; la mora se avisa por WhatsApp."],
  },
  tec_proyectos: {
    titulo: "Proyectos y cobro",
    paraQue: "Del alcance cotizado a la entrega cobrada.",
    pasos: ["Registra alcance, valor, horas y entrega.", "Avanza de cotizado a entregado y cobra abonos que entran a Caja."],
  },
  pap_encargos: {
    titulo: "Encargos y copias con cobro",
    paraQue: "Recibir pedidos de impresión y cobrarlos al entregar.",
    pasos: ["Anota cliente, detalle, valor y entrega.", "Pasa de recibido a lista y cobra: entra a Caja."],
  },
  joy_apartados: {
    titulo: "Piezas, apartados y venta",
    paraQue: "Vender joyas con apartado y saldo contra entrega.",
    pasos: ["Registra la pieza con material, peso y precio (y para quién queda apartada).", "Cobra el abono y luego el saldo: todo entra a Caja."],
  },
  lic_domicilios: {
    titulo: "Domicilios verificados y cobro",
    paraQue: "Vender licor a domicilio cumpliendo la verificación de edad.",
    pasos: ["Registra cliente, pedido y documento de quien recibe.", "Marca la mayoría de edad verificada: sin eso el programa no deja cobrar.", "Cobra al entregar: entra a Caja."],
  },
  parq_turnos: {
    titulo: "Turnos y cobro por horas",
    paraQue: "Cobrar el parqueadero por tiempo.",
    pasos: ["Registra la placa y la tarifa por hora al entrar.", "Al salir, el programa calcula las horas y cobra: entra a Caja y Contabilidad."],
  },
  eve_eventos: {
    titulo: "Eventos y salones",
    paraQue: "Cotizar, apartar la fecha y cumplir la logística.",
    pasos: [
      "Crea tus salones con capacidad y tarifa.",
      "Cotiza con cliente, fecha e invitados: si el salón ya está apartado ese día, el programa lo bloquea.",
      "Cada abono baja el saldo y entra a Caja y Contabilidad; la lista logística se chulea tarea por tarea.",
    ],
  },
  sst_empresas: {
    titulo: "Empresas cliente y convenios",
    paraQue: "Llevar cada empresa con su riesgo ARL y sus trabajadores cubiertos.",
    pasos: ["Registra la empresa con NIT, contacto y número de trabajadores.", "Marca su nivel de riesgo ARL (I a V).", "Descarga o comparte el estado por WhatsApp."],
  },
  sst_evaluaciones: {
    titulo: "Medicina del trabajo y aptitud",
    paraQue: "Evaluar trabajadores y emitir el certificado de aptitud con código seguro.",
    pasos: ["Registra al trabajador con documento, cargo y vencimiento del examen.", "Guarda la evaluación (Ingreso, Periódico, Egreso, Post-Incapacidad, Alturas o Espacios Confinados) con su concepto.", "Genera el certificado en PDF: trae código seguro y no incluye historia clínica.", "Cobra el examen: entra a Caja y Contabilidad. Avisa vencimientos por WhatsApp."],
    consejo: "La historia clínica nunca se escribe aquí: solo el concepto de aptitud.",
  },
  sst_profesiograma: {
    titulo: "Profesiograma y matriz IPVR",
    paraQue: "Definir peligros GTC 45, controles y EPP por cargo.",
    pasos: ["Por cada empresa y cargo escribe peligros, controles y EPP obligatorio.", "Define cada cuántos meses se repite el examen.", "El vencimiento se avisa desde Medicina del trabajo por WhatsApp."],
  },
  sst_estandares: {
    titulo: "SG-SST y estándares mínimos",
    paraQue: "Evaluar 7, 21 o 60 estándares (Res. 0312) y llevar plan anual y ATEL.",
    pasos: ["Elige tamaño y riesgo: el programa dice cuántos estándares aplican.", "Anota cuántos cumples: el porcentaje sale solo.", "Guarda plan anual, COPASST y comité de convivencia.", "Registra cada accidente o enfermedad y avanza su investigación hasta cerrarla."],
  },
  sst_sve: {
    titulo: "Vigilancia y ausentismo (SVE)",
    paraQue: "Controlar incapacidades por programa de vigilancia.",
    pasos: ["Registra cada incapacidad con trabajador, empresa, programa y días.", "Arriba ves los días perdidos por programa para actuar donde más duele."],
  },
  sst_capacitaciones: {
    titulo: "Capacitaciones y brigadas",
    paraQue: "Programar temas, tomar asistencia y certificar.",
    pasos: ["Programa cada capacitación con tema, empresa y fecha.", "Marca la asistencia de cada persona.", "Genera la lista en PDF y los certificados.", "Cobra el contrato: entra a Caja y Contabilidad."],
  },
  sst_normativa: {
    titulo: "Normativa SST Colombia (IA)",
    paraQue: "Tener vigentes Decreto 1072, Res. 0312, alturas y GTC 45.",
    pasos: ["Pulsa «Actualizar normativa SST Colombia (IA)» para verificar y guardar las normas.", "Exporta el listado a Excel para tus auditorías."],
  },
};

const GENERICO ="Para guardar cambios toca el botón de guardar; todo queda registrado en tu cuenta.";

/** Devuelve el instructivo de la pantalla actual, o null si no hay uno. */
export function instructivoPara(pathname: string): Instructivo | null {
  const mod = /^\/modulos\/([^/]+)/.exec(pathname);
  if (mod) {
    const modulo = buscarModulo(decodeURIComponent(mod[1]));
    if (!modulo) return null;
    const propio = POR_MODULO[modulo.id];
    if (propio) return propio;
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
