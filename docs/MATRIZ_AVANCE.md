# GOSARYC — Matriz de avance y seguridad

Estados: **Implementado sin probar** · **Pendiente** · **Bloqueado por acceso** · **Probado** (ninguno todavía).
Regla: implementado no significa probado.

## Inventario de vehículos — seguridad

| # | Punto | Corrección | Estado |
|---|---|---|---|
| 1 | Precio de adquisición | Tabla `vehiculo_costos` con RLS por `veh_costos`; columna antigua vaciada y bloqueada por disparador | Implementado sin probar |
| 2 | Movimientos con montos (costo/gasto) | Política de lectura oculta esos tipos sin `veh_costos` | Implementado sin probar |
| 3 | Gastos | RLS: ver = `veh_costos`; crear/borrar = `veh_gastos` | Implementado sin probar |
| 4 | Retomas (precio de retoma = adquisición) | Hallazgo de esta revisión: cualquier personal lo leía. Ahora exige `veh_costos` | Implementado sin probar |
| 5 | Fotos | Bucket privado `vehiculos_fotos`, por negocio y permiso, enlaces temporales | Implementado sin probar |
| 6 | Fotos antiguas públicas (bucket `negocios`) | Migración automática al entrar alguien con permiso de edición | Pendiente de verificar (siguen públicas hasta migrar) |
| 7 | Documentos | Archivos `vehiculo-*` en `creditos_docs` exigen `veh_ver`/`veh_editar` | Implementado sin probar |
| 8 | Placa y VIN duplicados | Resolución histórica sin borrar + índices únicos + disparador | Implementado sin probar |
| 9 | Concurrencia de duplicados | Cubierta por el índice único | Pendiente de prueba |
| 10 | Historial conservado | Sin política DELETE en vehículos; retiro lógico | Implementado sin probar |
| 11 | Migraciones | `20261129130000_inventario_vehiculos_seguridad`, `20261129140000_retomas_precio_protegido` | No verificado que se aplicaran |

## Retomas — permisos granulares (migración `20261202120000_retomas_permisos_granulares`)

Reemplaza la medida conservadora del punto 4 (que bloqueaba a todo el que no tuviera `veh_costos`).

| # | Punto | Corrección | Estado |
|---|---|---|---|
| R1 | Asesor: crear solicitud, datos del vehículo, fotos/documentos, ver estado de las suyas | Permisos base `ret_crear`/`ret_ver_propias` (quien ya tiene vehículos/pedidos/cocina/domicilios); RLS por `creado_por` | Implementado sin probar |
| R2 | Asesor sin acceso a precio de adquisición, retoma, costos, utilidad | Valores en `retomas_economico` (RLS `ret_economico`); columnas antiguas vaciadas y bloqueadas por disparador; la pantalla ya no pide esas columnas | Implementado sin probar |
| R3 | Jefe de patio: inspecciones, observaciones, avalúos técnicos | `retomas_inspecciones` (`ret_inspeccionar`), `retomas_avaluos` (`ret_avaluo`); solo se agregan, no se editan | Implementado sin probar |
| R4 | Admin/autorizado: ver, modificar y aprobar valores | `ret_economico` (ver/modificar), `ret_aprobar` (aprobar, rechazar, pasar al inventario); función `retoma_decidir` | Implementado sin probar |
| R5 | Aprobación con usuario, fecha, valores autorizados e historial | `aprobado_por`, `aprobado_en`, `autorizado` (valores congelados) y `retomas_historial` (filas con montos solo para `ret_economico`); si los valores cambian después, la aprobación se invalida | Implementado sin probar |
| R6 | Sin exposición por consulta, API, relaciones o respuestas | RLS en las 5 tablas nuevas/ajustadas; historial sin FK a valores; sin vistas; archivos de peritaje solo para quien ve esa retoma | Implementado sin probar |
| R7 | Integración con inventario conserva controles | `retoma_a_inventario`: exige `ret_aprobar` + `veh_crear` + retoma aprobada; el precio de adquisición va a `vehiculo_costos` (protegida) | Implementado sin probar |
| R8 | Quien tenía `veh_costos` no pierde acceso | La migración le asigna los permisos `ret_*` equivalentes | Implementado sin probar |

Pruebas pendientes de Retomas (requieren cuentas: administrador, asesor, jefe de patio y una segunda empresa):
- [ ] Asesor: `select` sobre `retomas_economico`, `retomas_avaluos` y filas `economico = true` del historial devuelve 0 filas; insertar/actualizar ahí falla
- [ ] Asesor: no ve solicitudes creadas por otros; no puede poner `resultado = 'retomado'`, ni cambiar `estado_aprobacion`, ni `vehiculo_id` (ni por API directa)
- [ ] Asesor: no puede leer archivos de peritaje de solicitudes ajenas
- [ ] Jefe de patio: registra inspección y avalúo; no ve `precio_retoma`; no aprueba
- [ ] Administrador: edita valores, aprueba, rechaza, pasa al inventario; el historial muestra usuario, fecha y valores autorizados
- [ ] Cambiar valores tras aprobar devuelve la solicitud a pendiente; tras pasar al inventario ya no se pueden cambiar
- [ ] Vehículo creado por retoma: asesor no ve su costo; administrador sí
- [ ] Empresa B no ve nada de empresa A
- [ ] Confirmar que la migración se aplicó (tablas y funciones existen)

## Checkpoint — separación de negocios y acceso a módulos

| # | Punto | Corrección | Estado |
|---|---|---|---|
| S1 | Crokante y JG Motors mezclados (la cuenta con la carta de comida aparecía como "jg motors") | Migración `20261130120000_separar_crokante_jg_motors`: devuelve esa configuración a Crokante/restaurante | Implementado sin probar; no verificado que se aplicara |
| S2 | JG Motors debe tener su propia cuenta | Debe registrarse con su correo y elegir tipo "Concesionario" (si comparte cuenta con Crokante, no se puede separar sin otra cuenta) | Pendiente (acción del dueño) |
| S3 | Menú público `/menu` de un negocio que no vende por pedidos | Muestra aviso "sin menú digital" en vez de la carta | Implementado sin probar |
| S4 | Acceso a módulos por tipo de negocio y permiso | Sección inexistente o sin asignar muestra "sin acceso" aunque se escriba la dirección | Implementado sin probar |
| S5 | Cambio de contraseña desde el correo caía siempre en restaurante | Corregido el destino tras el cambio | Implementado sin probar |
| S6 | Auditoría de seguridad general | Primera pasada sin fallas explotables halladas; faltan pantallas una por una y pruebas con cuentas reales | Pendiente |

Siguiente paquete: cerrar las pruebas con cuentas (administrador, asesor, jefe de patio, segunda empresa), y luego Compras, consignaciones y avalúos del concesionario.

## Pruebas (todas pendientes: no hay pruebas automatizadas en el proyecto ni acceso a cuentas)

Falta: una cuenta administradora, una de asesor de ventas, una de jefe de patio y una segunda empresa, con datos de prueba marcados.

- [ ] Asesor: no puede leer `vehiculo_costos`, `vehiculo_gastos`, movimientos de costo ni retomas (API directa)
- [ ] Jefe de patio sin `veh_costos`: igual
- [ ] Administrador: ve y edita costos
- [ ] Empresa B no ve fotos, documentos ni vehículos de empresa A
- [ ] Insertar dos vehículos con la misma placa/VIN (también en paralelo): el segundo falla
- [ ] Crear, editar, retirar, reingresar y recargar: datos persisten
- [ ] Revisar si la migración dejó vehículos con placa/VIN movidos a observaciones (movimientos tipo `duplicado`)

## Riesgos abiertos (no confirmados)

- Módulos genéricos (`costos_veh`, `cartera_veh`, `comisiones`) guardan montos en `modulo_registros`, visible a todo el personal del negocio.
- Fotos de otras funciones (logo, productos) siguen en el bucket público `negocios` por diseño.

## Trabajo siguiente (no integrado al inventario hasta cerrar las pruebas)

Compras, retomas, consignaciones, avalúos, inspecciones: pendientes. No se declaran terminados.

## Instrucción maestra

El archivo recibido llegó cortado en el punto 4, "12. Cot���". No se puede reconstruir sin inventar: pendiente de que se reenvíe completo.
