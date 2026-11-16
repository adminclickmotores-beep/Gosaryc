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
  ] as ModuloCurso[],
};

export const TOTAL_LECCIONES = CURSO_GOSARYC.modulos.reduce((a, m) => a + m.lecciones.length, 0);
