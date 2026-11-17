export type Leccion = {
  id: string;
  titulo: string;
  /** Duración estimada, en minutos. */
  minutos: number;
  descripcion: string;
  pasos: string[];
  /** Ruta de la app donde se practica la lección. */
  practica?: { ruta: string; etiqueta: string };
};

export type ModuloCurso = {
  id: string;
  titulo: string;
  resumen: string;
  lecciones: Leccion[];
};

export const CURSO_GOSARYC = {
  id: "gosaryc-oficial",
  titulo: "Aprende a manejar Gosaryc",
  subtitulo: "Curso oficial: de la instalación a la operación diaria de tu negocio.",
  modulos: [
    {
      id: "instalacion",
      titulo: "Módulo 1 · Instalación y primeros pasos",
      resumen: "Crea tu cuenta, configura el negocio y deja todo listo para vender.",
      lecciones: [
        {
          id: "crear-cuenta",
          titulo: "Crear tu cuenta y entrar",
          minutos: 4,
          descripcion: "Registro, inicio de sesión y recuperación de contraseña.",
          pasos: [
            "Abre la página de registro y crea tu cuenta con correo y contraseña (mínimo 6 caracteres).",
            "Marca «Recordarme» si es tu equipo personal y usa el ojo para ver la contraseña.",
            "Si olvidas la clave, usa «Olvidé mi contraseña» y sigue el enlace que llega al correo.",
          ],
        },
        {
          id: "configurar-negocio",
          titulo: "Configurar tu negocio",
          minutos: 7,
          descripcion: "Elige el tipo de negocio y completa los datos básicos.",
          pasos: [
            "En la pantalla de bienvenida escribe el nombre de tu negocio y elige su tipo.",
            "El menú lateral cambia solo: verás los módulos pensados para tu tipo de negocio.",
            "Completa la lista de primeros pasos que aparece arriba a la derecha.",
          ],
          practica: { ruta: "/welcome", etiqueta: "Ir a la bienvenida" },
        },
        {
          id: "instalar-escritorio",
          titulo: "Instalar en celular o computador",
          minutos: 6,
          descripcion: "Versión web, app en el celular e instalador de Windows con accesos directos y guía incluida.",
          pasos: [
            "Versión web: entra desde cualquier navegador, sin instalar nada. En el celular usa «Instalar app» (Android: menú del navegador > Instalar aplicación; iPhone: Compartir > Agregar a pantalla de inicio).",
            "Instalador de Windows: ejecuta «Gosaryc Setup», elige la carpeta y deja marcado el acceso directo del escritorio. Si Windows muestra «Protegió su PC», pulsa «Más información» > «Ejecutar de todas formas».",
            "El instalador trae el agente de WhatsApp integrado y la «Guía de uso de Gosaryc» (acceso directo propio, también con F1).",
            "Al abrir el programa de escritorio ingresa tu código de licencia (30 días de prueba o licencia anual). Con la licencia vencida verás el aviso para renovar.",
          ],
          practica: { ruta: "/instalar", etiqueta: "Ver instalación" },
        },
      ],
    },
    {
      id: "personalizacion",
      titulo: "Módulo 2 · Personalización",
      resumen: "Deja Gosaryc a tu medida: catálogo, equipo y permisos.",
      lecciones: [
        {
          id: "catalogo",
          titulo: "Cargar productos o servicios",
          minutos: 8,
          descripcion: "Crea tu catálogo con precios, categorías e insumos.",
          pasos: [
            "Entra al panel de tu negocio y abre la sección de productos o menú.",
            "Crea categorías y agrega cada producto con su precio.",
            "Si manejas recetas, enlaza los insumos para descontar inventario en cada venta.",
          ],
          practica: { ruta: "/restaurante", etiqueta: "Abrir mi panel" },
        },
        {
          id: "equipo-permisos",
          titulo: "Invitar a tu equipo y dar permisos",
          minutos: 6,
          descripcion: "Cada persona entra solo a lo que le corresponde.",
          pasos: [
            "En Configuración invita a tus empleados por correo.",
            "Asigna a cada uno los módulos que puede usar (caja, cocina, pedidos…).",
            "Los empleados ven una pantalla completa y sencilla; el administrador conserva el menú.",
          ],
          practica: { ruta: "/settings", etiqueta: "Ir a Configuración" },
        },
        {
          id: "menu-qr",
          titulo: "Menú digital y código QR",
          minutos: 5,
          descripcion: "Comparte tu carta o enlace de pedidos con tus clientes.",
          pasos: [
            "Abre la sección de menú QR dentro del panel.",
            "Descarga el QR o copia el enlace y pégalo en WhatsApp o redes.",
            "Tus clientes ven tu carta actualizada y pueden pedir desde el celular.",
          ],
          practica: { ruta: "/restaurante", etiqueta: "Abrir mi panel" },
        },
      ],
    },
    {
      id: "operacion",
      titulo: "Módulo 3 · Operación diaria",
      resumen: "Vende, cobra y cierra el día sin enredos.",
      lecciones: [
        {
          id: "vender",
          titulo: "Registrar una venta o pedido",
          minutos: 6,
          descripcion: "Punto de venta, mesas, domicilios y medios de pago.",
          pasos: [
            "Abre el punto de venta, elige los productos y el medio de pago.",
            "Para domicilios, registra al cliente y asigna el repartidor.",
            "Los pagos por Nequi, Daviplata o Bre-B se concilian en Pagos digitales.",
          ],
          practica: { ruta: "/restaurante", etiqueta: "Abrir mi panel" },
        },
        {
          id: "caja",
          titulo: "Abrir y cerrar la caja",
          minutos: 5,
          descripcion: "Control de turnos, gastos del día y cuadre.",
          pasos: [
            "Al empezar el día abre la caja con la base inicial.",
            "Registra los gastos a medida que ocurren.",
            "Al terminar, cierra la caja y compara lo esperado con lo contado.",
          ],
        },
        {
          id: "cartera",
          titulo: "Fiados, clientes y puntos",
          minutos: 5,
          descripcion: "Cobra lo pendiente y premia a los clientes frecuentes.",
          pasos: [
            "En Cartera y fiados anota quién debe y la fecha prometida de pago.",
            "Registra los abonos hasta saldar la deuda.",
            "Activa puntos y recompensas para fidelizar a tus mejores clientes.",
          ],
          practica: { ruta: "/cartera-fiados", etiqueta: "Abrir cartera" },
        },
      ],
    },
    {
      id: "avanzado",
      titulo: "Módulo 4 · Avanzado",
      resumen: "Saca provecho a las finanzas, metas y el asistente virtual.",
      lecciones: [
        {
          id: "finanzas",
          titulo: "Finanzas y rentabilidad",
          minutos: 7,
          descripcion: "Ventas, costos, utilidad y reportes.",
          pasos: [
            "Entra a Finanzas para ver ventas, costos y utilidad del periodo.",
            "Revisa los reportes por producto para saber qué te deja más ganancia.",
            "Define metas de ventas y sigue su avance cada semana.",
          ],
          practica: { ruta: "/finanzas", etiqueta: "Abrir finanzas" },
        },
        {
          id: "asistente",
          titulo: "Agente virtual y atajos",
          minutos: 5,
          descripcion: "Pide ayuda al asistente y muévete más rápido.",
          pasos: [
            "Abre el Agente virtual y pregúntale por tus ventas, precios o tarifas.",
            "Usa ⌘K (o Ctrl+K) para buscar cualquier módulo al instante.",
            "Repite el recorrido guiado cuando quieras desde el menú de usuario.",
          ],
          practica: { ruta: "/asistente-virtual", etiqueta: "Abrir agente virtual" },
        },
        {
          id: "agente-whatsapp",
          titulo: "Agente de WhatsApp para vender",
          minutos: 8,
          descripcion: "Conecta tu número y configura las respuestas con las que el agente atiende a tus clientes.",
          pasos: [
            "Completa «Mi negocio» y deja activos tus productos con precio: de ahí sale lo que el agente responde.",
            "En Mi negocio busca el Agente de WhatsApp, agrega una línea y escanea el QR con WhatsApp > Dispositivos vinculados.",
            "En «Respuestas del agente» escribe el saludo y, para cada tema (horarios, precios, domicilios, pagos, pedidos), las palabras que activan la respuesta y el mensaje con tus datos reales.",
            "Marca «Pasa a una persona» en lo que necesites atender tú. Si contestas desde tu celular, el agente se pausa 6 horas en ese chat.",
            "En el programa de escritorio el agente se enciende solo; mantén el computador encendido y con internet.",
          ],
          practica: { ruta: "/restaurante", etiqueta: "Ir a Mi negocio" },
        },
        {
          id: "pedir-soporte",
          titulo: "Pedir ayuda: Agente, Academia y Soporte",
          minutos: 4,
          descripcion: "Qué hacer si algo no funciona y cómo crear un ticket de soporte.",
          pasos: [
            "Primero pregúntale al Agente virtual: te explica cualquier pantalla paso a paso.",
            "Revisa la Academia: casi todo tiene una lección con práctica guiada.",
            "Si sigue fallando, abre «Soporte» en el menú lateral, elige el tipo (algo no funciona, duda, cuenta o sugerencia), escribe un asunto y cuenta qué estabas haciendo.",
            "Envía el ticket. En la misma pantalla ves su estado (abierto, en proceso o resuelto) y la respuesta del equipo de soporte.",
          ],
          practica: { ruta: "/soporte", etiqueta: "Abrir soporte" },
        },
        {
          id: "sin-conexion",
          titulo: "Trabajar con o sin internet",
          minutos: 4,
          descripcion: "Qué pasa cuando se cae la conexión y cómo se sincroniza.",
          pasos: [
            "Con internet (en línea) todo se guarda al instante y se comparte con tu equipo.",
            "Si se cae la conexión, el indicador de estado avisa y el programa guarda tus cambios y borradores en el dispositivo.",
            "Al volver el internet se sincroniza solo. El agente de WhatsApp sí necesita internet para responder.",
          ],
        },
      ],
    },
    {
      id: "tu-giro",
      titulo: "Módulo 5 · Tu giro y el cumplimiento en Colombia",
      resumen: "Cada negocio tiene sus propios módulos y formularios. Aprende los de tu sector y cumple con la ley.",
      lecciones: [
        {
          id: "modulos-de-tu-giro",
          titulo: "Los módulos propios de tu tipo de negocio",
          minutos: 7,
          descripcion: "Gosaryc tiene más de 50 sectores; cada uno trae formularios, estados y alertas diferentes.",
          pasos: [
            "Abre tu panel: las tarjetas de módulos cambian según tu tipo de negocio. Cada una tiene su pequeño instructivo.",
            "Restaurante: pedidos y cocina, mesas, combos, insumos, repartidores, propinas, «Rappi, DiDi Food y apps» (venta bruta, comisión y lo que te consignan), «Mermas y desperdicios», «Sanidad y buenas prácticas» y «Permisos y licencias» (concepto sanitario, bomberos, SAYCO-ACINPRO).",
            "Salud: pacientes, historias, consentimientos, convenios, «Facturación y RIPS», «Glosas y cartera con EPS», «Habilitación y calidad» y «Residuos hospitalarios».",
            "Concesionario: inventario de vehículos, compras, consignaciones, retomas, créditos, separaciones, vencimientos de SOAT y tecnomecánica, y taller.",
            "Tiendas, servicios y demás giros: cada uno tiene sus clientes, pagos digitales, personal, metas y reseñas con campos propios (por ejemplo tallas y colores en moda, o profesionales y anticipos en citas).",
            "Si cambias de tipo de negocio (solo la cuenta administradora puede), el menú cambia y tus datos se conservan.",
            "Taller y servicio técnico: abre la orden con fotos de recepción, pide la aprobación por WhatsApp, agrega repuestos del inventario, cobra con garantía y liquida las comisiones del técnico. Carpintería e imprenta: cotiza el proyecto con materiales, cobra el abono para producir y el saldo contra entrega.",
            "Obras: planea por capítulos, despacha vales desde bodega y cobra cada acta con su neto. Inmobiliaria: publica la propiedad, firma el contrato, cobra el canon cada mes y liquida al propietario. Agro: aplica insumos con dosis y vende la cosecha viendo la utilidad. Transporte: crea el manifiesto, entrega anticipos, cobra el flete y liquida al conductor.",
            "Hotel: arma el rack por colores, reserva con anticipo, suma minibar y lavandería a la cuenta y liquida al hacer check-out. Educación y jardín: matricula con acudiente, genera las pensiones del mes, cobra la mora por WhatsApp y lleva asistencia y boletín. Moda: crea la referencia padre y sus tallas y colores con código de barras; los cambios se resuelven con bono. Farmacia: marca INVIMA, exige fórmula en antibióticos y controlados y cuida los refrigerados. Óptica: guarda esfera, cilindro, eje, adición y DP, crea la orden al laboratorio con abono y entrega contra saldo. Eventos: aparta el salón sin cruces de fecha, cobra por abonos y cumple la lista logística. Facturación y reportes: completa tus datos fiscales DIAN en Mi negocio (NIT con dígito de verificación, régimen, responsabilidad y resolución con rango), emite facturas con consecutivo e imprime tirilla o carta; exporta a Excel y PDF la contabilidad, las ventas, el inventario, la cartera y la nómina. Oficios con cobro directo: lavandería, casos de profesionales, proyectos de agencia, encargos de papelería, joyas por apartado, domicilios de licorera con edad verificada y turnos de parqueadero por horas.",
          ],
          practica: { ruta: "/welcome", etiqueta: "Ver mis módulos" },
        },
        {
          id: "nomina-colombia",
          titulo: "Nómina con las reglas de Colombia",
          minutos: 8,
          descripcion: "Liquida a tu equipo: salud, pensión, solidaridad, auxilio de transporte, horas extra y provisiones.",
          pasos: [
            "En «Equipo, turnos y nómina» crea a cada empleado con su salario, tipo de contrato, EPS y pensión.",
            "Abre el liquidador: calcula el neto, los aportes del empleador (PILA) y las provisiones del mes (cesantías, intereses, prima y vacaciones).",
            "Revisa el costo total de cada persona para ti: es lo que realmente te cuesta, más que su salario.",
            "Actualiza el salario mínimo y el auxilio de transporte cada enero (son valores editables) y confírmalos con tu contador.",
          ],
          practica: { ruta: "/equipo-nomina", etiqueta: "Abrir nómina" },
        },
        {
          id: "calendario-obligaciones",
          titulo: "Fechas y obligaciones que no puedes olvidar",
          minutos: 5,
          descripcion: "PILA, retención en la fuente, nómina electrónica, cesantías, primas, vacaciones y SG-SST.",
          pasos: [
            "En el calendario de obligaciones mira lo que vence este mes: PILA, retención, nómina electrónica, cesantías, primas y vacaciones.",
            "En módulos de permisos o vencimientos de tu giro (sanidad, habilitación, SOAT, tecnomecánica) guarda cada fecha de renovación para recibir la alerta a tiempo.",
            "Lleva la facturación electrónica en «Facturación DIAN»: número, cliente, valor y estado de cobro.",
            "Consulta siempre a tu contador: Gosaryc es una guía de control, no reemplaza la asesoría contable ni la liquidación oficial.",
          ],
          practica: { ruta: "/equipo-nomina", etiqueta: "Ver calendario" },
        },
      ],
    },
  ] as ModuloCurso[],
};

export const TOTAL_LECCIONES = CURSO_GOSARYC.modulos.reduce((a, m) => a + m.lecciones.length, 0);
