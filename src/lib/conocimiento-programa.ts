import { configModulo } from "@/lib/modulos-config";
import { instructivoPara } from "@/lib/instructivos";

/**
 * Base de conocimiento del asistente de ayuda: describe cómo funciona Gosaryc por dentro
 * (pantallas, botones, flujos). Se arma a partir del código real (módulos, estados y campos)
 * más este manual fijo. Si cambia una pantalla, actualiza este texto.
 */
export const MANUAL_FIJO = `
# 1. ENTRAR AL PROGRAMA
- Registro: se crea la cuenta con correo y contraseña (mínimo 6 caracteres, sin reglas de complejidad). El botón del ojo muestra u oculta la contraseña. Marcar «Recordarme» mantiene la sesión abierta en ese dispositivo; si no se marca, la sesión se cierra al cerrar el navegador.
- Olvidé mi contraseña: en el inicio de sesión se usa el enlace de recuperación, llega un correo (revisar spam) y el enlace lleva a una pantalla para escribir la nueva contraseña.
- Pantalla de bienvenida (primera vez): se escribe el nombre del negocio y se elige el tipo de negocio. Luego el programa abre el panel principal.
- Las páginas del programa están protegidas: si no hay sesión, se pide iniciar sesión y después se vuelve a la pantalla que se quería abrir.
- El logo de Gosaryc (arriba a la izquierda) lleva al inicio del panel del negocio.

# 2. PANTALLAS Y MENÚ
- En computador hay un menú lateral con el logo, el buscador de módulos («Buscar módulo…», atajo ⌘K o Ctrl+K), los módulos del negocio y el menú de usuario. El menú lateral se puede contraer con la flecha.
- En el celular hay una barra superior con el logo y una barra inferior de atajos (Pedidos y otros).
- Arriba a la derecha aparece el indicador «Setup 2/3» (lista de primeros pasos) y el menú del usuario (nombre/correo): desde ahí se puede repetir el recorrido guiado, ir a configuración y cerrar sesión.
- Cada módulo tiene un pequeño instructivo («cómo usar esta pantalla») con pasos y consejo.
- Hay un recorrido guiado por el panel (5 pasos) la primera vez: conoce tu panel, tu pantalla de cada día, tu negocio/equipo/cuenta, tres pasos para arrancar y ahora a vender. Se puede repetir desde el menú del usuario.
- Los módulos se pueden abrir en «ventana completa» con un botón junto a cada pestaña del panel (útil para dejarlos fijos en una pantalla de caja o cocina).
- El programa guarda borradores y cambios automáticamente («Autoguardado») y puede funcionar con mala conexión: muestra un indicador de estado sin conexión y sincroniza cuando vuelve internet.

# 3. PANEL PRINCIPAL DEL NEGOCIO (nombre según el giro: Restaurante, Tienda, etc.)
- Arriba: nombre del panel, frase del giro, «Ventas de hoy» (negocios que usan pedidos) y un selector de «Tipo de negocio». Cambiar el tipo SOLO lo puede hacer la cuenta administradora; al cambiarlo se activan los módulos de ese giro y se redirige al panel del nuevo tipo.
- Botones: «Menú público» (abre el catálogo que ven los clientes) e «Instalar app».
- «Aprende a usar tu panel en 2 minutos»: guía rápida desplegable con pasos propios del giro.
- «Primeros pasos» (lista de 4): 1 Cuéntanos de tu negocio (nombre, teléfono, horarios), 2 Elige tu tipo de negocio, 3 Agrega tu primer producto (arma tu carta digital), 4 Instala la app en tu celular. Cada tarjeta tiene un botón (Completar datos, Elegir tipo, Ir al menú, Ver cómo).
- Cuadrícula de módulos del giro: cada tarjeta abre su pantalla; los que dicen «Próximo» aún no están disponibles.
- Pestañas del panel para negocios con pedidos (restaurantes, comida, tiendas, etc.): «Vender y cobrar», «Pedidos y cocina», «Menú», «QR del menú», «Mesas», «Caja», «Reportes», «Recetario e inventario» y «Mi negocio». Los negocios sin pedidos ven otras pestañas según su giro y sus módulos en tarjetas.

# 4. VENDER Y COBRAR (punto de venta)
1. Buscar producto con «Buscar producto» o tocar el producto: se agrega a la «Cuenta actual». Con + y − se cambia la cantidad; el icono de papelera quita el producto.
2. Elegir modalidad: en mesa, para llevar o domicilio. En mesa se escoge la mesa (o «Sin mesa»). En domicilio son obligatorios nombre, celular y dirección; el programa reconoce el barrio y suma la tarifa de envío (si no lo reconoce hay que elegir el barrio de la lista). El correo es opcional.
3. Notas del pedido (ej. sin cebolla). Se puede configurar el porcentaje de IVA.
4. Elegir el método de pago (efectivo, transferencia, tarjeta, Nequi, Daviplata…). En efectivo se escribe «Recibido» y se calcula el cambio. «Dividir entre (personas)» reparte la cuenta en partes iguales.
5. Cobrar: se genera el recibo/ticket (se puede imprimir). También se puede avisar a la cocina por WhatsApp (campo «WhatsApp de la cocina»).
- Si aún no hay productos, el POS avisa que se agreguen en la pestaña «Menú».
- Los productos pueden tener opciones/adicionales (grupos de opciones) que se eligen al vender.

# 5. PEDIDOS Y COCINA
- Tablero tipo kanban con columnas: Nuevos → En cocina → Listos → En camino → Entregados. Cada pedido muestra número, modalidad, cliente y teléfono, dirección, productos con cantidades y opciones, notas, total, método y estado del pago (pagado o pendiente).
- Un botón de cada pedido lo avanza a la siguiente etapa; se puede imprimir la comanda (COMANDA #número) para la cocina. Los pedidos de mesa permiten asignar la mesa.
- Los pedidos también llegan solos desde el menú público de los clientes.

# 6. MENÚ (catálogo) Y QR
- Pestaña «Menú»: «Nueva categoría» y «Nuevo producto» (nombre, precio, categoría, descripción/foto, activo o no). Solo los productos activos se ven en el menú público y los usa el asistente.
- Pestaña «QR del menú»: muestra el enlace público y el código QR para descargar o copiar y compartir por WhatsApp, redes o imprimirlo en las mesas. Los clientes ven el catálogo actualizado y pueden pedir desde el celular.
- La dirección base de los enlaces se define en Configuración > Negocio («Dirección pública»): debe empezar con http:// o https://. Las direcciones de prueba/vista previa se ignoran. Vacía = enlaces públicos desactivados.

# 7. MESAS
- Pestaña «Mesas»: crear y administrar las mesas del local (número/zona) y ver cuáles están ocupadas; los pedidos en mesa se asignan a una mesa.

# 8. CAJA (turnos)
1. Abrir turno: escribir el «Fondo inicial en efectivo (COP)» y abrir.
2. Durante el día: «Registrar movimiento» para gastos y retiros (categoría del gasto, concepto obligatorio, valor obligatorio). Las ventas del turno se suman solas.
3. Se ven tarjetas: Efectivo esperado, Ventas del turno, Transferencias + tarjeta, Gastos y retiros.
4. Cierre: «Arqueo y cierre»: escribir el «Efectivo contado (COP)»; si hay diferencia con el esperado, las notas del cierre son obligatorias. Se imprime el cierre de caja (con firma del cajero) y queda en «Cierres anteriores», donde se puede reimprimir.
- No se pueden registrar movimientos con la caja cerrada: primero se abre un turno.

# 9. REPORTES Y FINANZAS
- «Reportes»: ventas por periodo, por producto, por método de pago, etc., para saber qué deja más ganancia.
- «Finanzas y rentabilidad»: resumen del periodo (hoy o este mes) con ventas, costos y utilidad, y «Registro contable»: plan de cuentas básico ya cargado, «Libro diario» con «Nuevo asiento» (el total del debe debe ser igual al del haber para guardar), filtros por fecha, cuenta y tipo, libro mayor por cuenta y balance que comprueba que todo cuadre. Ejemplo de gasto de arriendo: debe en la cuenta de gasto y haber en Caja por el mismo valor.

# 10. RECETARIO E INVENTARIO
- Se registran insumos/ingredientes con cantidad, unidad, costo y stock mínimo, y recetas (qué insumos y cantidades lleva cada producto). Así el programa calcula el costo y el margen de cada producto y descuenta inventario en cada venta.
- Hay una biblioteca de recetas base y una sugerencia de recetas con IA (usa una cuota diaria).
- El estado «Bajo stock» o «Agotado» avisa qué reponer.

# 11. MI NEGOCIO (datos del negocio)
- Nombre, tipo, eslogan, descripción, horarios, ciudad, cobertura/zonas, aviso de entrega, teléfono de pedidos, WhatsApp de la cocina, Instagram, sitio web, moneda, IVA, color principal, logo y portada. Estos datos alimentan el menú público y las respuestas del asistente. Los campos vacíos aparecen como «NO CONFIGURADO» para el asistente.

# 12. CONFIGURACIÓN (menú de usuario > Configuración)
- Pestaña «Negocio»: dirección pública de los enlaces para compartir.
- Pestaña «Equipo y permisos»: se ve cuántos miembros e invitaciones pendientes hay; se invita a cada persona por correo con un enlace de invitación (la persona crea su cuenta o entra y queda unida al negocio) y se decide qué módulos puede usar cada una. Quien no tiene permiso para un módulo no lo ve en el menú. Los empleados ven una pantalla completa y sencilla; el administrador conserva todo el menú.
- Pestaña «Cuenta»: muestra con qué correo se inició sesión y el negocio activo, botón «Cerrar sesión» y «Apariencia» (modo claro u oscuro, se recuerda en el dispositivo).

# 13. MÓDULOS ESPECIALES
- Domicilios y clientes: pedidos a domicilio, direcciones y clientes frecuentes; tarifas de envío por barrio/zona.
- Repartidores y liquidación: cuántos domicilios hizo cada domiciliario y cuánto se le debe pagar.
- Cartera y fiados: deudas de clientes con abonos y fecha prometida; arriba el total por cobrar.
- Pagos digitales (Nequi, Daviplata, Bre-B): conciliar transferencias contra ventas.
- Combos y promociones, Puntos y recompensas, Pedidos recurrentes, Propinas y reparto, Proveedores y compras, Equipo y nómina (turnos, pagos, horas extra), Reseñas y PQRS, Metas, Cotizaciones, Clientes/contactos (leads), Agenda/calendario, Solicitudes.
- Concesionario de vehículos: inventario con ficha por vehículo (fotos privadas, costos, documentos), separaciones, compras, consignaciones, retomas, solicitudes de crédito, cotizaciones, documentos, vencimientos y un tablero del concesionario. Los permisos de vehículos se asignan por separado en Equipo y permisos.
- Los módulos genéricos (todos los demás giros) funcionan igual: «Nuevo registro» con título, detalle, contacto, teléfono, valor y fecha, más campos propios del módulo; «Guardar registro»; lista con selector de estado, filtros por estado y papelera para borrar.
- Academia: curso oficial por módulos y lecciones con práctica guiada.
- Instalar app (ruta Instalar): instrucciones para instalar en celular (Android: menú del navegador > Instalar aplicación; iPhone: Compartir > Agregar a pantalla de inicio) o computador. Existe también una versión de escritorio que se activa con un código de licencia.

# 14. PLANES, LICENCIAS Y SOPORTE
- Cada negocio tiene un plan (Prueba, Emprendedor o Pro), un estado (activo o suspendido) y una fecha de vencimiento. Si la cuenta está suspendida por falta de pago o vencida, el acceso se bloquea hasta renovar; la renovación o extensión la hace el equipo de Gosaryc (el usuario no puede hacerla desde el programa).
- La versión de escritorio pide un código de licencia al abrirla (30 días de prueba o licencia anual); al vencer muestra un aviso para renovar.
- Versiones: web (cualquier navegador), móvil (se instala desde el navegador con «Instalar app») y escritorio de Windows (instalador «Gosaryc Setup» con acceso directo del escritorio y del menú Inicio, logo propio, agente de WhatsApp integrado y «Guía de uso de Gosaryc», que también abre con F1).
- En línea y sin conexión: con internet todo se guarda al instante; sin internet el programa avisa, guarda cambios y borradores en el dispositivo y sincroniza al volver la conexión. El agente de WhatsApp y el asistente virtual necesitan internet.
- Agente de WhatsApp: en Mi negocio se vincula el número con un QR (WhatsApp > Dispositivos vinculados). Responde con los datos y el catálogo del negocio, aconseja y ayuda a cerrar ventas; aprende de las respuestas que da el dueño. En escritorio se enciende solo y requiere el computador encendido y con internet.
- Soporte: contactar al equipo de Gosaryc, quien creó y diseñó el programa.

# 15. SOLUCIÓN DE PROBLEMAS FRECUENTES
- «No veo un módulo»: es por permisos o porque el tipo de negocio no lo incluye; pedirle al administrador que lo active en Configuración > Equipo y permisos, o revisar el tipo de negocio.
- «No me deja cambiar el tipo de negocio»: solo la cuenta administradora puede.
- «No puedo cobrar/registrar movimientos de caja»: hay que abrir el turno de caja primero.
- «El menú público no tiene productos»: agregarlos en la pestaña Menú y dejarlos activos.
- «Los enlaces para compartir no funcionan»: revisar la dirección pública en Configuración > Negocio.
- «El asistente dice que falta un dato»: completarlo en Mi negocio.
- «La pantalla se ve rara o no carga»: recargar la página; si persiste, cerrar sesión y volver a entrar; si sigue, contactar a soporte indicando qué hacía y qué mensaje vio.
- «Perdí la sesión»: iniciar de nuevo; marcar «Recordarme» en equipos personales.
`;

const RUTAS_INSTRUCTIVO = [
  "/cartera-fiados", "/combos", "/cotizaciones", "/domicilios", "/equipo-nomina", "/finanzas",
  "/pagos-digitales", "/pedidos-recurrentes", "/propinas", "/proveedores-compras", "/puntos-recompensas",
  "/repartidores", "/resenas-pqrs", "/metas", "/asistente-virtual", "/leads", "/calendar", "/requests",
];

/** Instructivos de las pantallas propias (de instructivos.ts). */
export function textoInstructivos(): string {
  return RUTAS_INSTRUCTIVO.map((r) => {
    const i = instructivoPara(r);
    if (!i) return "";
    return `- ${i.titulo} (${r}): ${i.paraQue} Pasos: ${i.pasos.map((p, n) => `${n + 1}) ${p}`).join(" ")}${i.consejo ? ` Consejo: ${i.consejo}` : ""}`;
  })
    .filter(Boolean)
    .join("\n");
}

type ModuloBasico = { id: string; titulo: string; descripcion: string; estado?: string; ruta?: string };

/** Ficha de cada módulo del giro, leída de su configuración real (estados, etiquetas y campos). */
export function textoModulos(modulos: ModuloBasico[]): string {
  const vistos = new Set<string>();
  return modulos
    .filter((m) => {
      if (!m.titulo || vistos.has(m.id)) return false;
      vistos.add(m.id);
      return true;
    })
    .map((m) => {
      const c = configModulo(m.id);
      const estados = c.estados.map((e) => e.texto).join(" → ");
      const campos = (c.campos ?? [])
        .map((f) => f.etiqueta + (f.opciones ? ` (${f.opciones.join("/")})` : ""))
        .join("; ");
      return (
        `- ${m.titulo}${m.estado && m.estado !== "Activo" ? " [aún no disponible]" : ""}: ${m.descripcion} ` +
        `Se registra con: título («${c.placeholderTitulo}»), ${c.etiquetaContacto.toLowerCase()}, ${c.etiquetaMonto.toLowerCase()}, ${c.etiquetaFecha.toLowerCase()}. ` +
        `Estados: ${estados}. El resumen de arriba muestra «${c.resumen}».` +
        (c.exigeFecha ? " Exige fecha." : "") +
        (campos ? ` Campos extra: ${campos}.` : "")
      );
    })
    .join("\n");
}
