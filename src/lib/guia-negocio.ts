import type { TipoNegocioClave } from "@/lib/modulos-negocio";

export type GuiaNegocio = {
  /** Frase fija que acompaña el panel de este tipo de negocio. */
  frase: string;
  /** Pasos propios del tipo de negocio para empezar rápido. */
  pasos: { titulo: string; texto: string }[];
};

type TiposNuevos =
  | "ferreteria" | "supermercado" | "carniceria" | "licorera" | "floristeria" | "optica"
  | "guarderia" | "alquiler_vehiculos" | "seguridad_aseo" | "ganaderia" | "fundacion" | "iglesia" | "parqueadero";

const GUIAS_BASE: Record<Exclude<TipoNegocioClave, TiposNuevos>, GuiaNegocio> = {
  restaurante: {
    frase: "Cada pedido a tiempo, cada cliente feliz.",
    pasos: [
      { titulo: "Arma tu menú", texto: "En la pestaña “Menú” crea categorías y agrega tus productos con su precio." },
      { titulo: "Comparte tu menú público", texto: "Usa el botón “Menú público” y envía el enlace por WhatsApp o redes." },
      { titulo: "Atiende los pedidos", texto: "En “Pedidos y cocina” mueve cada pedido: enviar a cocina, listo, en camino, entregado." },
      { titulo: "Impresoras de caja y cocina", texto: "En Configuración elige la impresora de caja (facturas) y la de cocina (comandas): cada pedido nuevo imprime su comanda solo." },
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
      { titulo: "Vende con el POS", texto: "En “Punto de venta (POS)” escanea el código de barras, vende por peso o caja y elige precio detal, mayorista o especial." },
      { titulo: "Cuida los vencimientos", texto: "En “Lotes y vencimientos” registra el lote y la fecha al recibir mercancía: el POS vende primero lo que vence antes y avisa a 7, 15 y 30 días." },
      { titulo: "Imprime tus etiquetas", texto: "En “Productos y precios” usa “Etiquetas de código de barras”: elige productos, escribe cuántas de cada uno e imprime en carta o rollo térmico." },
      { titulo: "Maneja tus sedes", texto: "En “Sucursales y puntos de venta” crea cada sede, traslada mercancía con acta y filtra reportes por sede o consolidados." },
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
      { titulo: "Registra a tus pacientes", texto: "Crea la ficha de cada paciente en “Pacientes”, con alergias, foto y acudiente." },
      { titulo: "Agenda por especialista", texto: "Usa “Agenda por especialista y consultorio”: Agendada, En consulta, Atendida o No asistió. Al finalizar, la consulta pasa a “Caja de consultas”." },
      { titulo: "Lleva la evolución", texto: "Anota cada consulta en “Historias clínicas” con signos vitales, diagnóstico, adjuntos y fórmula imprimible. No se borra: solo se agregan notas aclaratorias. Los honorarios de cada profesional se liquidan en “Honorarios y comisiones”." },
      { titulo: "Pide consentimiento y guarda la historia", texto: "Registra el consentimiento informado antes de cada procedimiento. La historia clínica se conserva mínimo 20 años y solo la ve quien debe: revisa “Auditoría de accesos”." },
      { titulo: "Cobra a las EPS sin perder plata", texto: "Factura en “Facturación y RIPS”, y en “Glosas y cartera con EPS” responde cada glosa antes de su plazo." },
      { titulo: "Cumple la habilitación", texto: "En “Habilitación y calidad” y “Residuos hospitalarios” guarda REPS, calibraciones, actas del gestor de residuos y próximas fechas obligatorias." },
      { titulo: "Monta tu outsourcing SST", texto: "En “Empresas cliente y convenios” registra cada empresa con su riesgo ARL; en “Medicina del trabajo y aptitud” guarda evaluaciones y emite el certificado con código seguro; en “Profesiograma y matriz IPVR” define peligros GTC 45 y EPP por cargo; en “SG-SST y estándares mínimos” evalúa 7, 21 o 60 estándares con plan anual, COPASST y ATEL; en “Vigilancia y ausentismo” lleva días perdidos por programa; en “Capacitaciones y brigadas” programa temas y toma asistencia; y en “Normativa SST” actualiza las normas 2026." },
    ],
  },
  educacion: {
    frase: "Cada estudiante cuenta, cada avance se celebra.",
    pasos: [
      { titulo: "Matricula estudiantes", texto: "En “Estudiantes y matrículas” guarda la ficha con acudiente, grado y grupo." },
      { titulo: "Genera las pensiones", texto: "En “Pensiones y cartera” genera el mes para todos los activos y cobra: entra a Caja y Contabilidad. La mora se avisa por WhatsApp." },
      { titulo: "Llama a lista y califica", texto: "En “Asistencia y boletín” marca presente o ausente cada día y guarda las notas y logros por periodo." },
    ],
  },
  hospedaje: {
    frase: "Que cada huésped quiera volver.",
    pasos: [
      { titulo: "Arma tu rack", texto: "En “Rack de habitaciones” agrega cada espacio con su tarifa: verde disponible, rojo ocupada, amarillo reservada, azul en limpieza." },
      { titulo: "Reserva y haz check-in", texto: "En “Reservas y check-in” anota huésped, documento y anticipo; el check-in cambia la habitación a ocupada." },
      { titulo: "Carga todo a la cuenta", texto: "Suma minibar, lavandería y restaurante a la habitación y liquida al hacer check-out: noches más cargos menos anticipo, directo a Caja y Contabilidad." },
    ],
  },
  gimnasio: {
    frase: "Socios activos, gimnasio lleno de energía.",
    pasos: [
      { titulo: "Crea tus planes", texto: "En “Planes y tiqueteras” define mensualidades, trimestres, anualidades y tiqueteras por sesiones." },
      { titulo: "Inscribe a tus socios", texto: "En “Socios y membresías” registra al socio con su cédula, véndele un plan y congela la membresía si tiene incapacidad." },
      { titulo: "Controla el ingreso", texto: "En “Check-in de socios” escribe la cédula o escanea el QR: sale en rojo si está vencido o le quedan pocos días, con botón de cobro por WhatsApp." },
      { titulo: "Mide su evolución", texto: "En “Valoración física” guarda peso, grasa, masa muscular, medidas y la rutina de cada socio." },
      { titulo: "Organiza las clases", texto: "Define horarios y cupos en “Clases y cupos”." },
    ],
  },
  construccion: {
    frase: "Obras bien llevadas, clientes tranquilos.",
    pasos: [
      { titulo: "Crea tus proyectos", texto: "En “Proyectos y obras” registra presupuesto, avance y responsables." },
      { titulo: "Cotiza", texto: "Haz seguimiento a cada propuesta en “Cotizaciones” hasta el cierre." },
      { titulo: "Planea por capítulos", texto: "En “Obras y presupuestos” crea la obra y sus capítulos (materiales, mano de obra, maquinaria): ves planeado contra ejecutado real y te avisa el sobrecosto." },
      { titulo: "Despacha vales a obra", texto: "Registra cada salida de bodega hacia la obra: descuenta el inventario y suma al capítulo ejecutado." },
      { titulo: "Cobra cada corte", texto: "Guarda el acta con avance, valor, retención y anticipo aplicado; al cobrarla entra a Caja y Contabilidad." },
      { titulo: "Cotiza proyectos a la medida", texto: "En “Proyectos a la medida” arma la cotización de carpintería con materiales, cobra el abono para producir y el saldo contra entrega." },
    ],
  },
  agro: {
    frase: "Del campo a tu mesa, con cuentas claras.",
    pasos: [
      { titulo: "Registra tus lotes", texto: "En “Cultivos y lotes” anota siembras y ciclos de producción." },
      { titulo: "Anota las cosechas", texto: "Registra lo recogido y a quién se lo vendiste." },
      { titulo: "Aplica insumos con dosis", texto: "En “Lotes y producción” registra cada aplicación con su dosis por hectárea o animal: descuenta del inventario y suma al costo del lote." },
      { titulo: "Vende con utilidad real", texto: "Al vender la cosecha el programa calcula el costo promedio y la utilidad, y el cobro entra a Caja y Contabilidad." },
    ],
  },
  inmobiliaria: {
    frase: "Cada propiedad en su lugar, cada contrato al día.",
    pasos: [
      { titulo: "Publica tus inmuebles", texto: "En “Inmuebles” registra cada propiedad en venta o arriendo." },
      { titulo: "Arma tu portafolio", texto: "En “Propiedades y contratos” registra cada propiedad con matrícula, canon, administración y estado (disponible, arrendado, en mantenimiento)." },
      { titulo: "Firma y cobra el arriendo", texto: "Crea el contrato con tu comisión, genera el cobro de cada mes y cobra: entra a Caja y Contabilidad. Si se atrasa, avisa la mora por WhatsApp." },
      { titulo: "Liquida al propietario", texto: "Solo el dueño liquida: descuenta tu comisión y los gastos de reparación y paga el neto al propietario." },
    ],
  },
  mascotas: {
    frase: "Mascotas sanas, dueños tranquilos.",
    pasos: [
      { titulo: "Registra mascotas y dueños", texto: "Crea la ficha de cada mascota en “Pacientes / Mascotas”: especie, raza, peso, alergias y foto." },
      { titulo: "Programa vacunas", texto: "Usa “Carnet de vacunación y desparasitación” y revisa “Alertas y recordatorios” para avisar a los dueños." },
      { titulo: "Agenda y cobra consultas", texto: "Organiza las citas en “Agenda por veterinario”; al finalizar, la consulta y los medicamentos aplicados pasan a “Caja de consultas”. Las historias clínicas no se borran, solo se aclaran con notas." },
    ],
  },
  tecnologia: {
    frase: "Proyectos entregados a tiempo, clientes que regresan.",
    pasos: [
      { titulo: "Registra tus proyectos", texto: "En “Proyectos y cobro” anota alcance, horas, valor y fecha de entrega; cada abono entra a Caja y Contabilidad." },
      { titulo: "Atiende el soporte", texto: "Lleva cada solicitud de cliente en “Soporte y tickets”." },
      { titulo: "Cobra suscripciones", texto: "En “Planes y suscripciones” lleva los cobros recurrentes de cada cliente." },
    ],
  },
  transporte: {
    frase: "Cada carga a su destino, cada ruta bajo control.",
    pasos: [
      { titulo: "Registra tu flota", texto: "En “Flota y vehículos” agrega cada vehículo con sus documentos." },
      { titulo: "Despacha viajes", texto: "Anota rutas, cargas y el estado de cada envío en “Viajes y despachos”." },
      { titulo: "Crea el manifiesto", texto: "En “Manifiestos y liquidación” abre la guía con origen, destino, vehículo, conductor y valor del flete." },
      { titulo: "Entrega anticipos", texto: "Registra viáticos, ACPM y peajes: salen de Caja y se descuentan del viaje." },
      { titulo: "Cobra y liquida", texto: "Cobra el flete (entra a Caja y Contabilidad) y liquida al conductor: solo el dueño, y la utilidad neta queda registrada." },
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
      { titulo: "Organiza la agenda", texto: "En “Agenda por silla y estilista” reserva citas sin cruces, cobra y finaliza cada una, y envía el recordatorio por WhatsApp." },
      { titulo: "Guarda la ficha técnica", texto: "En “Clientes y ficha técnica” anota fórmulas, alergias y fotos de antes y después." },
      { titulo: "Configura insumos", texto: "En “Servicios, insumos y tarifas” indica cuánto tinte o ampolleta gasta cada servicio: se descuenta solo al cobrar." },
      { titulo: "Paga comisiones", texto: "En “Comisiones y liquidación” el dueño paga lo pendiente de cada estilista; sale de Caja y queda en Contabilidad." },
    ],
  },
  taller: {
    frase: "Cada vehículo reparado a tiempo y con garantía.",
    pasos: [
      { titulo: "Abre la orden con fotos", texto: "En “Órdenes de trabajo” registra cliente, placa o serial, checklist y sube las fotos de recepción: sin fotos no deja pasar a diagnóstico." },
      { titulo: "Diagnostica y pide aprobación", texto: "Mueve la orden por el tablero hasta “En diagnóstico” y envía el total por WhatsApp para que el cliente apruebe." },
      { titulo: "Suma repuestos y mano de obra", texto: "En “Repuestos e inventario” lleva el stock; al agregarlos a la orden descuentan solos y suman a la cuenta." },
      { titulo: "Cobra y entrega con garantía", texto: "Al cobrar, la orden entra a Caja y Contabilidad y queda con sus días de garantía. Busca por placa o serial para validar reclamos futuros." },
      { titulo: "Liquida comisiones", texto: "En “Comisiones y liquidación” solo el dueño paga lo pendiente de cada técnico: sale de Caja y queda en Contabilidad." },
      { titulo: "Recuerda el próximo servicio", texto: "Usa “Mantenimientos próximos” para que el cliente vuelva." },
    ],
  },
  farmacia: {
    frase: "Dispensar bien también es cuidar.",
    pasos: [
      { titulo: "Carga tus productos", texto: "En “Droguería y control de fórmula” registra principio activo, INVIMA, lote y vencimiento." },
      { titulo: "Marca qué exige fórmula", texto: "Antibióticos y controlados no se venden sin marcar que el cliente trae la fórmula: el programa lo bloquea." },
      { titulo: "Cuida el frío", texto: "Los refrigerados llevan etiqueta de cadena de frío para no romperla." },
      { titulo: "Vende y cobra", texto: "Cada venta descuenta stock y entra a Caja y Contabilidad." },
    ],
  },
  eventos: {
    frase: "Cada fecha reservada, cada detalle cumplido.",
    pasos: [
      { titulo: "Crea tus salones", texto: "En “Eventos y salones” registra cada salón con su capacidad y tarifa." },
      { titulo: "Cotiza sin cruces", texto: "Al apartar la fecha el programa avisa si ese salón ya está reservado ese día." },
      { titulo: "Cobra por abonos", texto: "Cada abono baja el saldo y entra a Caja y Contabilidad." },
      { titulo: "Cumple la logística", texto: "Marca la lista (sonido, sillas, torta…) para no olvidar nada el día del evento." },
    ],
  },
  profesional: {
    frase: "Cada caso al día, cada plazo cumplido.",
    pasos: [
      { titulo: "Abre tus casos", texto: "En “Casos y cobro de honorarios” registra cliente, asunto y honorarios pactados." },
      { titulo: "Cobra por abonos", texto: "Cada pago baja el saldo y entra a Caja y Contabilidad; la mora se avisa por WhatsApp." },
      { titulo: "No pierdas plazos", texto: "En “Plazos y vencimientos” anota términos y entregas." },
      { titulo: "Guarda documentos", texto: "Organiza contratos y archivos por cliente." },
    ],
  },
  lavanderia: {
    frase: "Cada orden entregada limpia y a tiempo.",
    pasos: [
      { titulo: "Recibe con la orden", texto: "En “Órdenes de lavado y cobro” anota cliente, prendas y fecha de entrega." },
      { titulo: "Cobra al entregar", texto: "Cada abono y el pago final entran a Caja y Contabilidad; avisa por WhatsApp cuando esté lista." },
      { titulo: "Define tus tarifas", texto: "En “Tarifas por servicio” pon precio por prenda, kilo o tipo de lavado." },
      { titulo: "Liquida comisiones", texto: "En “Comisiones y liquidación” solo el dueño paga a cada operario." },
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
      { titulo: "Registra tus piezas", texto: "En “Piezas, apartados y venta” anota material, peso y precio." },
      { titulo: "Aparta con abono", texto: "El abono queda registrado y el saldo se cobra contra entrega, todo a Caja y Contabilidad." },
      { titulo: "Atiende arreglos", texto: "En “Taller y reparaciones” lleva arreglos y relojes por encargo." },
      { titulo: "Entrega certificados", texto: "En “Certificados de autenticidad” guarda las garantías de cada pieza." },
    ],
  },
  celulares: {
    frase: "Ventas y reparaciones sin perder ningún equipo.",
    pasos: [
      { titulo: "Abre la orden técnica", texto: "En “Órdenes de servicio técnico” registra cliente, IMEI o serial, patrón de desbloqueo y fotos de recepción." },
      { titulo: "Pide la aprobación", texto: "Envía el diagnóstico con el total por WhatsApp y avanza el tablero hasta la entrega con garantía." },
      { titulo: "Usa tus repuestos", texto: "En “Repuestos e inventario” cada pantalla o batería descuenta sola al agregarla a la orden." },
      { titulo: "Carga tu inventario", texto: "Agrega equipos, accesorios y repuestos con su precio." },
      { titulo: "Liquida comisiones", texto: "En “Comisiones y liquidación” solo el dueño paga a cada técnico." },
    ],
  },
  papeleria: {
    frase: "Tu papelería surtida y las ventas al día.",
    pasos: [
      { titulo: "Carga tus productos", texto: "Agrega artículos con precio y existencias." },
      { titulo: "Recibe encargos", texto: "En “Encargos y copias con cobro” anota el pedido, cobra el abono y el saldo al entregar: entra a Caja y Contabilidad." },
      { titulo: "Surte a tiempo", texto: "Revisa qué se está agotando y haz tus compras." },
      { titulo: "Cotiza impresos y publicidad", texto: "En “Proyectos de impresión” arma la cotización con materiales, cobra el abono para producir y el saldo contra entrega." },
      { titulo: "Revisa tus ventas", texto: "Consulta los reportes del día y del mes." },
    ],
  },
  moda: {
    frase: "Tu colección ordenada y vendiendo todos los días.",
    pasos: [
      { titulo: "Crea la referencia", texto: "En “Referencias y matriz talla/color” abre la referencia padre con marca, temporada y precio." },
      { titulo: "Agrega tallas y colores", texto: "Cada combinación lleva su stock y su código de barras para venderla sin confundirte." },
      { titulo: "Vende sin perder trazabilidad", texto: "Los cambios generan bono de regalo en vez de borrarse: siempre sabes qué salió y qué entró." },
      { titulo: "Fideliza clientes", texto: "Guarda sus datos y ofrece puntos o promociones." },
    ],
  },
};

export const GUIAS_NEGOCIO = { ...GUIAS_BASE } as Record<TipoNegocioClave, GuiaNegocio>;

GUIAS_NEGOCIO.ferreteria = {
  frase: "Cada referencia a la mano, cada obra bien surtida.",
  pasos: [
    { titulo: "Carga tus referencias", texto: "En “Referencias e inventario” agrega cada producto con su unidad (metro, bulto, galón), costo y margen." },
    { titulo: "Ubica cada tornillo", texto: "En “Productos y precios” anota pasillo, estante y nivel de cada producto: el POS lo muestra para encontrarlo rápido." },
    { titulo: "Cotiza a constructores", texto: "En “Cotizador de materiales” arma la lista de la obra con precio mayorista y descuento, envíala por WhatsApp o PDF y conviértela en venta con un clic." },
    { titulo: "Despacha a la obra", texto: "En “Despachos a obra” anota la remisión, el conductor y quién recibe." },
    { titulo: "Cobra a tiempo", texto: "Usa “Cartera y fiados” para los constructores de confianza y actualiza las listas de precios de tus proveedores." },
  ],
};
GUIAS_NEGOCIO.supermercado = {
  frase: "Góndolas llenas, cero producto vencido.",
  pasos: [
    { titulo: "Carga tus productos", texto: "En “Productos y código de barras” registra categoría, IVA y stock mínimo." },
    { titulo: "Registra lotes y vencimientos", texto: "En “Lotes y vencimientos” anota el lote y la fecha al recibir mercancía. El POS vende primero lo que vence antes y avisa a 7, 15 y 30 días." },
    { titulo: "Crea promociones", texto: "En “Promociones” define 2x1 o precios especiales con vigencia." },
    { titulo: "Repón a tiempo", texto: "En “Reposición” revisa qué se agotó y el día de visita de cada proveedor." },
  ],
};
GUIAS_NEGOCIO.carniceria = {
  frase: "Producto fresco, merma controlada.",
  pasos: [
    { titulo: "Registra tus productos por peso", texto: "En “Productos frescos por peso” anota existencias en kilos, costo por kilo y merma esperada." },
    { titulo: "Registra el desposte", texto: "En “Desposte y rendimiento” anota lo que entra (canal o bulto) y los cortes que salen con hueso y merma: calcula tu costo real por kilo limpio." },
    { titulo: "Controla lotes y frío", texto: "En “Lotes y vencimientos” rota primero lo que vence antes, y en “Cadena de frío” anota la temperatura de neveras cada día." },
    { titulo: "Anota las mermas", texto: "En “Mermas y pérdidas” registra lo que se maduró, venció o se recortó." },
    { titulo: "Recibe pedidos", texto: "En “Pedidos y domicilios por peso” guarda el pedido con su peso, dirección y hora de entrega." },
  ],
};
GUIAS_NEGOCIO.licorera = {
  frase: "Tu licorera en regla y vendiendo.",
  pasos: [
    { titulo: "Carga tus referencias", texto: "En “Referencias por marca y presentación” registra grados, estampilla, costo y stock." },
    { titulo: "Cumple los permisos", texto: "En “Permisos y horarios de venta” guarda licencia, bomberos y horario permitido con su vencimiento." },
    { titulo: "Verifica la edad y cobra", texto: "En “Domicilios verificados y cobro” registra el documento y confirma la mayoría de edad (sin eso no deja cobrar); el pago entra a Caja y Contabilidad." },
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
    { titulo: "Guarda la fórmula", texto: "En “Fórmula y laboratorio” anota esfera, cilindro, eje, adición y distancia pupilar de cada ojo." },
    { titulo: "Crea la orden", texto: "Elige montura, lentes y laboratorio con fecha prometida y cobra el abono: entra a Caja y Contabilidad." },
    { titulo: "Entrega contra saldo", texto: "El programa no deja entregar hasta cobrar el saldo completo." },
  ],
};
GUIAS_NEGOCIO.guarderia = {
  frase: "Cada niño seguro, cada acudiente tranquilo.",
  pasos: [
    { titulo: "Inscribe a los niños", texto: "En “Niños y matrículas” registra grupo, jornada, alergias, EPS y acudientes." },
    { titulo: "Autoriza quién recoge", texto: "Guarda documento y foto de cada persona autorizada en la ficha del niño." },
    { titulo: "Registra la asistencia", texto: "En “Asistencia y reporte diario” anota hora de entrada, salida y estado de salud." },
    { titulo: "Informa a los acudientes", texto: "Cuenta comidas, siestas y actividades del día, y cobra la pensión en “Pensiones y cartera”." },
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
GUIAS_NEGOCIO.parqueadero = {
  frase: "Cada placa a tiempo, cada hora cobrada.",
  pasos: [
    { titulo: "Registra el ingreso", texto: "En “Turnos y cobro por horas” anota la placa y la tarifa: el tiempo corre solo." },
    { titulo: "Cobra al salir", texto: "El programa calcula las horas por la tarifa y el pago entra a Caja y Contabilidad." },
    { titulo: "Factura si te la piden", texto: "Emite la factura con consecutivo desde el módulo de Facturación. Si tienes DIAN activa, sale con CUFE y QR oficial; si no, pídela por WhatsApp." },
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
  { titulo: "Carga tu inventario de una vez", texto: "En Productos usa “Importar desde Excel o CSV”: descarga la plantilla, llénala y súbela; el programa te muestra los errores antes de guardar." },
  { titulo: "Manda el cierre al dueño", texto: "Con “Enviar cierre por WhatsApp” (en Caja, Reportes, Configuración o el Agente) le llega al dueño ventas, efectivo, créditos y stock crítico." },
  { titulo: "No se te pase ningún impuesto", texto: "En Finanzas abre “Contador Pro Colombia” y genera tu cronograma anual: te avisa cada vencimiento con semáforo y por WhatsApp." },
  { titulo: "Tu nómina siempre actualizada", texto: "En Equipo y nómina crea a cada empleado (ancla al SMMLV al que gane el mínimo), liquida por periodo y contabiliza con un clic. Si cambian los decretos, el botón de IA carga la vigencia nueva." },
];
