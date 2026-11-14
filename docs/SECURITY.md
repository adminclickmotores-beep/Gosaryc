# SECURITY

## Modelo de aislamiento
- Cada cuenta que se registra es dueña de un negocio (`owner_id` = su id). El equipo hereda el negocio de quien lo invitó (`mi_negocio_id()`).
- Todas las tablas de datos filtran con `owner_id = mi_negocio_id()` en RLS; los permisos por módulo se validan con `tiene_permiso()`.
- Las funciones `SECURITY DEFINER` deben comprobar la propiedad por sí mismas (RLS no se aplica dentro de ellas).

## Misión 1 — Auditoría de aislamiento multiempresa (2026-11-14)

### Vulnerabilidades identificadas
| ID | Hallazgo | Gravedad |
|---|---|---|
| V1 | `restaurante_bodegas` y `restaurante_stock_bodega` sin `owner_id`: cualquier cuenta veía, editaba y borraba las bodegas y existencias de todas las empresas | Crítica |
| V2 | `quitar_stock_bodegas` y `agregar_stock_bodega` (SECURITY DEFINER) sin comprobar dueño y ejecutables por cualquiera, incluso sin sesión | Crítica |
| V3 | `mover_stock_bodega` no comprobaba que insumo y bodegas fueran del negocio de quien llama | Crítica |
| V4 | `equipo_auditoria`: el historial del equipo (correos) lo leía cualquier administrador de cualquier empresa | Alta |
| V5 | Bucket `negocios`: cualquier cuenta podía subir, reemplazar o borrar imágenes de otra empresa | Alta |
| V6 | `restaurante_clientes.telefono` único en toda la plataforma: mezclaba estadísticas de clientes entre negocios y los pedidos públicos dejaban clientes sin dueño | Alta |
| V7 | Pedidos podían enlazarse con repartidor o mesa de otro negocio; artículos de pedido con productos de otro negocio | Media |
| V8 | Funciones de compras/devoluciones/descuento ejecutables por usuarios anónimos (ya comprobaban dueño, pero sin necesidad de exponerlas) | Baja |

### Vulnerabilidades corregidas
V1–V8 en la migración `20261201120000_aislamiento_multiempresa.sql` (solo agrega columnas, rellena dueños y reemplaza políticas/funciones; no borra datos). La app ahora sube imágenes dentro de la carpeta del negocio (`<negocio>/archivo`).
Imágenes antiguas sin carpeta siguen visibles por su enlace público pero ya nadie puede modificarlas.

### Estado de verificación (2026-11-14)
Las correcciones V1–V8 están escritas; su aplicación en la base y el resultado de las pruebas NO están confirmados. El aislamiento no se considera validado. Riesgos vigentes: políticas de almacenamiento sin probar, límites por rol sin probar, relaciones cruzadas en clientes/pedidos sin prueba ejecutada.

Bloqueo vigente: no existe conexión de lectura a la base desde el asistente (ver PROJECT_CONTROL.md). Seguridad sigue sin validar.

### Auditoría de la migración (2026-11-14, por lectura; nada ejecutado)
| ID | Hallazgo | Estado |
|---|---|---|
| H1 | El bloque de pruebas dentro de la migración tenía su propio manejo de errores y no podía revertir la migración, pero mezclaba pruebas con correcciones y sus avisos pueden no mostrarse | Corregido: pruebas fuera de la migración |
| H2 | P3 y P6 pasaban con cualquier error, no con el esperado | Corregido: se exige el código de error y el mensaje |
| H3 | Bodegas sin insumos se asignaban al "negocio más antiguo" sin evidencia | Corregido en el archivo: quedan sin dueño (pendientes de conciliación). Si la migración ya se aplicó antes de este cambio, hay que correr el informe de conciliación y revisar esas bodegas |
| H4 | Historial del equipo: se usaba al autor del cambio como dueño sin comprobar que fuera dueño | Corregido en el archivo: solo si consta como dueño de un equipo |
| H5 | Fecha 20261201: el proyecto numera sus migraciones en secuencia y la anterior ya era 20261130120000. Va después de todas, sin conflicto de orden. Tras una migración futura hay que numerar después de ella | Sin conflicto |
| H6 | Políticas de bodegas usan `es_personal()`: un empleado con solo pedidos/cocina/domicilios podría ver y editar bodegas sin el módulo "insumos". Probable por lectura; la prueba F1/F2 lo confirma o descarta | PENDIENTE (no corregido; requiere migración nueva tras confirmar) |
| H7 | Cualquiera puede añadir artículos a un pedido "nuevo y reciente" si conoce su id (UUID) | Riesgo aceptado, ver abajo |

Revisado sin hallar problema: los `REVOKE` de la migración quitan `anon` a funciones que solo llama la app con sesión (`authenticated` conserva su permiso); funciones `SECURITY DEFINER` con `search_path = public`; las políticas de `creditos_docs` ya filtran por carpeta de negocio. Relaciones sin validar entre empresas todavía: insumos↔recetas, compras↔proveedores, `modulo_registros` (sin revisar).

### Pendiente
0. Confirmar migración aplicada y leer el aviso de pruebas en los registros de la base.
1. `es_superadmin()` compara un correo fijo (mover a tabla de roles).
2. Sin pruebas automatizadas en CI; la prueba incluida en la migración es de mejor esfuerzo (informa por aviso, no bloquea).
3. Pedidos públicos: el visitante puede crear pedidos para cualquier negocio existente (intencional); falta límite de frecuencia.
4. Revisar cada módulo genérico y de los otros sectores (`modulo_registros`) con pruebas de rol.
5. Cola sin conexión en `localStorage` sin cifrar.
6. Sin copias de seguridad gestionadas ni límites de planes aplicados desde la base de datos.
7. Un negocio no puede verificar en este entorno los resultados de las pruebas: ver TESTING.md.
