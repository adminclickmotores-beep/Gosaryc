import { buscarModulo, TIPOS_NEGOCIO } from "@/lib/modulos-negocio";
import { configModulo } from "@/lib/modulos-config";

export type Instructivo = {
  titulo: string;
  paraQue: string;
  pasos: string[];
  consejo?: string;
  /** Por qué esta pantalla es mejor con Gosaryc. */
  ventaja?: string;
};

/** Instructivos de las pantallas propias (no genéricas), por ruta. */
const POR_RUTA: Record<string, Instructivo> = {
  "/": {
    titulo: "Portada y fichas por negocio",
    paraQue: "Conocer el programa (30 días gratis sin compromiso, POS con escáner y tirillas 58/80mm, Agente WhatsApp IA + CRM y PQRS, DIAN y Nómina Colombia) y empezar con tu rubro ya elegido.",
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
    paraQue: "Seguir prospectos del agente de WhatsApp, gestionar la Bandeja PQRS y revisar la Inteligencia IA automática de tu sector.",
    pasos: [
      "Usa «Tablero Kanban» para arrastrar cada tarjeta entre etapas o «Cola de Llegada» para atender por turno.",
      "Filtra por canal, temperatura (caliente, tibio, frío) o estado, y abre cualquier cliente para ver su Ficha 360°.",
      "Revisa «Bandeja PQRS» para gestionar las PQRS radicadas por el bot (Abierta, En gestión, Resuelta) con acceso directo a la Ficha 360°.",
      "En «Inteligencia IA» verifica el resumen automático de tu sector y, solo si lo necesitas, despliega «Personalizar reglas avanzadas (Opcional)».",
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
      "Abre la pestaña «Agente WhatsApp IA» para vincular tu número con QR 24/7, copiar enlaces de rastreo, activar el CRM en el menú y probar el agente en vivo.",
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
  sst_matriz_legal: {
    titulo: "Matriz legal SST",
    paraQue: "Saber qué normas cumples, quién responde por cada una y con qué evidencia.",
    pasos: ["Para cada norma elige el estado: cumple, parcial, no cumple o no aplica.", "Anota responsable, evidencia y la fecha de la próxima revisión.", "Exporta la matriz a Excel para auditorías."],
  },
  sst_psicosocial: {
    titulo: "Batería de riesgo psicosocial",
    paraQue: "Registrar la aplicación de la batería (interna o externa) y obtener el nivel de riesgo con su plan de intervención.",
    pasos: ["Elige si la aplicó un psicólogo de la empresa (interna) o un profesional externo con licencia SST.", "Escribe los puntajes 0 a 100 de cada dominio, del extralaboral y del estrés.", "Revisa el nivel y el plan sugerido, y guarda.", "Cambia el estado a «En intervención» o «Cerrado» según avance."],
  },
  sst_restricciones: {
    titulo: "Restricciones y plan de control",
    paraQue: "Saber qué trabajadores tienen restricciones, de qué tipo y qué plan seguir en los exámenes de control.",
    pasos: ["Los exámenes con concepto distinto de «Apto» aparecen por clasificar.", "Elige la categoría y si es temporal o permanente, y pulsa «Clasificar y generar plan».", "Filtra por vigentes, permanentes o control del próximo mes.", "Las recomendaciones son una guía: confírmalas con el médico laboral."],
  },
  sst_alertas: {
    titulo: "Alertas SST",
    paraQue: "Ver en un solo lugar lo vencido o en riesgo.",
    pasos: ["Revisa las alertas urgentes primero: exámenes vencidos, ATEL sin investigar, ausentismo recurrente.", "Usa «Avisar» para escribir al trabajador por WhatsApp.", "Pulsa Actualizar después de corregir algo."],
  },
  sst_normativa: {
    titulo: "Normativa SST Colombia (IA)",
    paraQue: "Tener vigentes Decreto 1072, Res. 0312, alturas y GTC 45.",
    pasos: ["Pulsa «Actualizar normativa SST Colombia (IA)» para verificar y guardar las normas.", "Exporta el listado a Excel para tus auditorías."],
  },
};

const GENERICO ="Para guardar cambios toca el botón de guardar; todo queda registrado en tu cuenta.";

/** Por qué esta pantalla es mejor en Gosaryc (se muestra a los clientes en cada instructivo). */
const VENTAJA_GENERAL =
  "Todo en un solo programa: ventas, caja, contabilidad, nómina, DIAN y WhatsApp con IA comparten la misma información, sin digitar dos veces. Funciona en web, celular, Windows y Linux, incluso sin internet, y se actualiza solo sin perder tus datos.";

const VENTAJA_RUTA: Record<string, string> = {
  "/": "Eliges tu tipo de negocio y ves exactamente lo que resuelve para ti. 30 días gratis, sin compromiso, con más de 45 tipos de negocio que tienen pantallas propias, no una plantilla genérica.",
  "/calendar": "La cita se cobra en un clic y la plata entra sola a Caja y a Contabilidad: cero cuadres manuales al cierre.",
  "/cartera-fiados": "Cada abono baja el saldo y queda en la contabilidad. Con un clic recuerdas el cobro por WhatsApp.",
  "/combos": "Los combos se descuentan del inventario por receta, así sabes tu utilidad real y no solo lo vendido.",
  "/cotizaciones": "De la cotización a la venta sin volver a escribir los datos, y la envías por WhatsApp con tu logo.",
  "/domicilios": "Pedidos de WhatsApp, menú QR y POS llegan a un solo lugar, con repartidor, estado y comanda automática en cocina.",
  "/equipo-nomina": "Nómina con las reglas de Colombia que se actualizan solas cada año (SMMLV, auxilio, recargos) y se contabiliza sin digitar.",
  "/finanzas": "Ingresos, gastos y utilidad real al instante, alimentados solos por cada venta y cada gasto. Incluye Contador Pro con vencimientos y pre-liquidación de impuestos.",
  "/crm-embudo": "El agente de WhatsApp con IA convierte conversaciones en clientes, citas o pedidos y los deja ordenados en tu embudo, 24/7.",
  "/asistente-virtual": "Un asistente que responde a tus clientes con tus precios y tu catálogo reales, y aprende de tus respuestas.",
  "/settings": "Respaldo total con un clic, varias sedes con traslados, impresoras de caja y cocina, y actualizaciones que conservan todo.",
  "/restaurante": "Tu panel se adapta a tu tipo de negocio: ves solo lo que necesitas, con permisos por rol para tu equipo.",
  "/metas": "Metas ligadas a tus ventas reales: el avance se calcula solo.",
  "/proveedores-compras": "Las compras suben el inventario y los costos solos, y puedes leer facturas de proveedores con IA.",
  "/propinas": "Reparto transparente que queda registrado, sin hojas de cálculo.",
  "/puntos-recompensas": "Fideliza clientes con puntos automáticos en cada venta, sin tarjetas ni papeles.",
  "/resenas-pqrs": "Cada reseña o PQRS queda con estado y responsable: atiendes mejor y proteges tu reputación.",
};

const VENTAJA_PREFIJO: Array<[string, string]> = [
  ["sst_", "SG-SST completo en Colombia: matriz legal, GTC 45, estándares 0312, certificados con validación pública y alertas, todo con normativa que se verifica sola."],
  ["veh", "Tasador de mercado con tarifas de Colombia del año, revisión de tu vitrina contra el mercado y crédito simulado: compras mejor y vendes más rápido."],
  ["com_", "Inventario con lotes y vencimientos, escáner de barras y precios sugeridos según inflación: proteges tu margen todos los días."],
  ["bel_", "Agenda, fichas de clientes, comisiones y cobro en un solo flujo, con recordatorios por WhatsApp."],
  ["gim_", "Control de socios con carnet QR, check-in rápido y cobro de planes automático."],
  ["tal_", "Órdenes de trabajo con repuestos, comisiones y cobro directo a Caja con asiento contable."],
  ["hot_", "Rack de habitaciones por colores, cuenta única del huésped y liquidación al check-out."],
  ["far_", "Control INVIMA, fórmulas y refrigerados: cumples la norma sin llevar papeles."],
  ["facturas", "Facturación con consecutivo, CUFE y QR oficial cuando se activa la DIAN, y tirilla o carta en tu impresora. La venta nunca se bloquea."],
];

/** Mensaje propio por tipo de negocio: se usa en los módulos que no tienen uno específico. */
const VENTAJA_TIPO: Record<string, string> = {
  restaurante: "Pedidos del POS, mesas, menú QR y WhatsApp llegan a cocina con comanda automática; las recetas descuentan el inventario y sabes tu utilidad real por plato.",
  panaderia: "Producción por receta, vitrina y pedidos por encargo: cada venta descuenta insumos y te dice cuánto ganas por producto.",
  cafeteria: "Cobro rápido en caja, recetas con costo por bebida y fidelización con puntos: más rotación sin perder el control del margen.",
  comida_rapida: "Pedidos de mostrador, domicilio y WhatsApp en una sola fila hacia cocina, con tiempos y cobro directo a caja.",
  catering: "Cotiza por número de invitados, aparta la fecha y controla anticipos, menú e insumos de cada evento en un solo lugar.",
  concesionario: "Inventario con fotos, tasador de mercado, cotización con crédito y ventas con comisiones: todo el ciclo del vehículo sin hojas de cálculo.",
  taller_motos: "Órdenes de trabajo con repuestos, mecánico y cobro directo a caja con asiento contable; avisas al cliente por WhatsApp cuando su moto está lista.",
  tienda: "Inventario con escáner de barras, lotes y precios sugeridos; cada venta actualiza stock, caja y contabilidad al instante.",
  supermercado: "Escáner de barras, vencimientos y reposición automática: no pierdes plata por productos vencidos ni por quedarte sin stock.",
  carniceria: "Despostes con rendimiento por corte, lotes y vencimientos: sabes cuánto ganas realmente por kilo.",
  licorera: "Venta y domicilios con verificación de mayoría de edad y control de inventario por lote, sin bloquear tu caja.",
  ferreteria: "Cotizador por unidades y conversión de medidas, inventario con ubicación y precios al día según tus costos.",
  papeleria: "Catálogo grande con escáner, fotocopias y servicios en la misma caja, y reposición sugerida de lo que más se vende.",
  moda: "Matriz de tallas y colores, temporadas y cambios controlados: ves qué se vende y qué se queda en el inventario.",
  joyeria: "Piezas con material, peso y apartados con saldo; cada abono queda en caja y contabilidad.",
  celulares: "Equipos con IMEI y garantía, reparaciones por orden y venta de accesorios con el mismo inventario y caja.",
  tecnologia: "Equipos, seriales y garantías, soporte por orden de servicio y cobro directo: cada cliente con su historial completo.",
  floristeria: "Arreglos con receta de flores, encargos con fecha de entrega y stock fresco que se descuenta solo.",
  distribuidora: "Pedidos por ruta, listas de precio por cliente y cartera con cobro por WhatsApp: vendes más y cobras a tiempo.",
  compraventa: "Empeños y compras a particulares con contrato, intereses y tasación; el inventario quedado se reprecia con inteligencia de mercado.",
  servicios: "Agenda de citas con recordatorio por WhatsApp, cobro en un clic y comisiones del equipo calculadas solas.",
  belleza: "Agenda, ficha de cada cliente, comisiones del equipo y cobro en un solo flujo, con recordatorios por WhatsApp.",
  profesional: "Honorarios, cuentas por cobrar y agenda de clientes con cotización enviada por WhatsApp y cobro registrado en contabilidad.",
  lavanderia: "Órdenes por prenda con estado y aviso por WhatsApp cuando está lista; cobras al entregar y todo queda en caja.",
  salud: "Pacientes, historias, agenda y facturación con datos protegidos por negocio; recordatorios y cobro en un solo lugar.",
  mascotas: "Ficha de cada mascota con vacunas y recordatorios por WhatsApp, agenda de citas y venta de productos en la misma caja.",
  farmacia: "Control de lotes, vencimientos y refrigerados con alertas, fórmulas y venta en caja sin llevar papeles.",
  optica: "Fórmulas por paciente, pedidos de laboratorio y venta de monturas con saldo y entrega controlados.",
  educacion: "Matrículas, pensiones y notas con cobro automático y avisos a acudientes por WhatsApp.",
  guarderia: "Fichas de niños y acudientes, asistencia diaria, pensiones y avisos por WhatsApp a los padres.",
  hospedaje: "Rack de habitaciones por colores, cuenta única del huésped y liquidación al check-out, con reservas sin cruces.",
  gimnasio: "Socios con carnet QR, check-in rápido, planes con vencimiento y cobro automático con avisos por WhatsApp.",
  construccion: "Obras con presupuesto, vales de materiales y cortes de obra: ves el costo real contra lo cotizado.",
  inmobiliaria: "Propiedades, contratos, cánones y liquidación al propietario con cobro y comisión calculados solos.",
  agro: "Lotes, aplicaciones e insumos con costo por cosecha y ventas registradas: sabes qué lote te deja más.",
  ganaderia: "Control por animal, pesajes, sanidad y producción, con costos de insumos y ventas ligadas al libro contable.",
  transporte: "Manifiestos, anticipos, fletes y liquidación al conductor con cobro directo y contabilidad al día.",
  alquiler_vehiculos: "Flota, reservas y contratos con entrega y devolución documentadas; multas y daños se cobran en el mismo flujo.",
  parqueadero: "Entrada y salida por placa con cobro por tiempo, abonados mensuales y cierre de caja sin diferencias.",
  taller: "Órdenes de trabajo con repuestos, comisiones del técnico y cobro directo a caja con asiento contable.",
  textil: "Órdenes de confección, cortes de tela e insumos con costo real por prenda y entregas con saldo.",
  eventos: "Salones, cotizaciones y fechas bloqueadas para que no se crucen, con abonos que entran a caja y contabilidad.",
  condominio: "Unidades, cuotas de administración y cartera con cobro por WhatsApp y estado de cuenta por residente.",
  prestamos: "Cronograma de cuotas, cobranza diaria y mora calculada sola; cada abono queda en caja y contabilidad.",
  seguridad_aseo: "Contratos por puesto, facturación mensual y personal asignado con cartera por cliente.",
  fundacion: "Donaciones con certificado, proyectos, beneficiarios y voluntarios con control transparente de ingresos y gastos.",
  iglesia: "Miembros, aportes y egresos con cierre por culto y reportes claros para la junta, con total reserva de los datos.",
};

function tipoDelModulo(id: string): string | undefined {
  const base = id.replace(/^(tipo_)/, "");
  return TIPOS_NEGOCIO.find((t) => t.modulos.some((m) => m.id === base))?.clave;
}

function conVentaja(g: Instructivo, pathname: string, id?: string): Instructivo {
  if (g.ventaja) return g;
  const ruta = Object.keys(VENTAJA_RUTA).find((r) => (r === "/" ? pathname === "/" : pathname === r || pathname.startsWith(`${r}/`)));
  const pref = id ? VENTAJA_PREFIJO.find(([p]) => id.startsWith(p)) : undefined;
  const clave = id ? tipoDelModulo(id) : undefined;
  const deTipo = clave ? VENTAJA_TIPO[clave] : undefined;
  return { ...g, ventaja: (ruta && VENTAJA_RUTA[ruta]) || (pref && pref[1]) || deTipo || VENTAJA_GENERAL };
}

/** Devuelve el instructivo de la pantalla actual, o null si no hay uno. */
export function instructivoPara(pathname: string): Instructivo | null {
  const base = instructivoBase(pathname);
  if (!base) return null;
  const m = /^\/modulos\/([^/]+)/.exec(pathname);
  return conVentaja(base, pathname, m ? decodeURIComponent(m[1]) : undefined);
}

function instructivoBase(pathname: string): Instructivo | null {
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
