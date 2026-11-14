# VALIDACIÓN DEL AISLAMIENTO MULTIEMPRESA (2026-11-14)

Nada de esto se ha ejecutado. Ningún resultado está aprobado.

## 1. Estado real de la migración
- Archivo original y actual (misma ruta): `supabase/migrations/20261201120000_aislamiento_multiempresa.sql`. Editar el archivo NO cambia lo que ya corrió en la base: una migración aplicada queda registrada por su número y no se vuelve a ejecutar.
- Versión que debería estar aplicada: la actual del repositorio (bodegas sin insumos con `owner_id` NULL, historial del equipo sin asignar por el autor, sin bloque de pruebas).
- Si se aplicó la versión anterior, quedaron fuera: (a) bodegas sin insumos asignadas al negocio más antiguo; (b) historial del equipo asignado por quien hizo el cambio sin comprobar que fuera dueño; (c) el bloque de pruebas dentro de la migración (aviso "Pruebas de aislamiento").
- Para ver exactamente qué cambió: `git log --oneline -- supabase/migrations/20261201120000_aislamiento_multiempresa.sql` y `git diff <commit_anterior> HEAD -- supabase/migrations/20261201120000_aislamiento_multiempresa.sql`.
- Cómo saber qué versión está aplicada en Lovable Cloud: ejecutar `supabase/consultas/verificar_migraciones_aplicadas.sql` (solo lectura). Consulta 1 = si el número está registrado; consulta 2 = huellas de la versión nueva; consulta 3 = si hay bodegas con dueño sin evidencia (señal de versión antigua).
- Si la versión antigua está aplicada, NO se reescribe: se corrige con una migración nueva y se concilia con `informe_conciliacion_propietarios.sql`. Esa migración no está escrita porque primero hay que ver qué versión corrió.

## 2. Hallazgo H6: permisos por rol (CONFIRMADO POR LECTURA, no por ejecución)
- Qué permite el acceso: políticas `bodegas_personal` y `stock_bodega_personal` (`USING/WITH CHECK owner_id = mi_negocio_id() AND (es_personal() OR tiene_permiso('insumos'))`).
- Función clave: `es_personal()` (definida en `20261120120000_roles_y_superadmin.sql`) devuelve verdadero para superadmin, administrador o cualquier empleado activo con `pedidos`, `cocina` o `domicilios`. El `OR` hace que baste cualquiera de las dos.
- Otras funciones: `tiene_permiso(modulo)`, `mi_negocio_id()`, `mover_stock_bodega()` (valida negocio pero no módulo). `descontar_insumos_pedido()` y `quitar_stock_bodegas()` deben seguir sirviendo al POS.
- Alcance: dentro de la MISMA empresa. No cruza entre empresas.
- Permisos que deberían tener: bodegas y existencias → administrador, superadmin, `insumos` o `proveedores` (el rol "Bodega / compras" usa ambos). Un empleado de solo pedidos/cocina/domicilios NO debe ver, crear, editar, borrar ni mover bodegas.
- Debe seguir funcionando: la venta en el POS descuenta stock aunque quien vende no tenga `insumos`.
- Pruebas: F1 (no lee) y F2 (no modifica), con control F0; F9–F11 cubren al empleado desactivado. Esperado hoy: PERMITIDA_INDEBIDAMENTE si la sospecha es cierta; tras la corrección: BLOQUEADA_OK.
- Corrección preparada, NO aplicada: `supabase/propuestas/20261201130000_restringir_bodegas_por_modulo.sql` (carpeta fuera de `migrations/` para que no se aplique sola). Cambia las dos políticas y `mover_stock_bodega`.
- Pendiente de revisar con la misma lógica: `insumos_personal`, `recetas_personal` (el comentario del código dice que cocina/pedidos pueden verlos, parece intencional) y `registrar_compra_insumo_bodega` (no revisada).

## 3. Archivos para validar
| Qué | Ruta |
|---|---|
| Prueba A bodegas y existencias | `supabase/tests/A_bodegas_existencias.sql` |
| Prueba B historial del equipo | `supabase/tests/B_historial_equipo.sql` |
| Prueba C clientes | `supabase/tests/C_clientes.sql` |
| Prueba D pedidos y relaciones | `supabase/tests/D_pedidos_relaciones.sql` |
| Prueba E archivos privados | `supabase/tests/E_archivos_privados.sql` |
| Prueba F roles y permisos | `supabase/tests/F_roles_permisos.sql` |
| Informe de conciliación (solo lectura) | `supabase/tests/informe_conciliacion_propietarios.sql` |
| Consulta de migraciones aplicadas (solo lectura) | `supabase/consultas/verificar_migraciones_aplicadas.sql` |
| Consulta de políticas RLS (solo lectura) | `supabase/consultas/revisar_politicas_rls.sql` |
| Corrección propuesta (no aplicada) | `supabase/propuestas/20261201130000_restringir_bodegas_por_modulo.sql` |

## 4. Cómo ejecutar las pruebas sin afectar producción
1. Crear un entorno aparte: un proyecto de Supabase nuevo y vacío, o una base local con `supabase start` (Supabase CLI + Docker). No usar el proyecto de producción.
2. Cargar el esquema: aplicar en orden TODAS las migraciones de `supabase/migrations/` en ese entorno (por ejemplo `supabase db reset` en local, o `supabase db push` apuntando al proyecto de pruebas). Ojo: hay números de migración repetidos (ver sección 5); si el entorno se queja, es un hallazgo real, no un fallo de las pruebas.
3. Abrir el editor SQL del entorno de pruebas y ejecutar un archivo A–F por vez. Cada uno corre en una transacción y termina en `ROLLBACK`.
4. Leer los avisos `RESULTADO | id | estado | detalle`. Local con CLI: `psql "$URL_PRUEBAS" -f supabase/tests/A_bodegas_existencias.sql` muestra los NOTICE.
5. Registrar cada línea tal cual en `docs/TESTING.md`. Estados: BLOQUEADA_OK, PERMITIDA_INDEBIDAMENTE, ERROR_TECNICO, NO_EJECUTADA, CONTROL_OK/FALLIDO. Solo BLOQUEADA_OK con su CONTROL_OK cuenta.
6. Después de F, aplicar la propuesta SOLO en el entorno de pruebas y repetir F1/F2.
7. Las consultas de `supabase/consultas/` y el informe de conciliación sí pueden correrse en producción: solo hacen SELECT.

## 5. Fechas de las migraciones
- Las migraciones se nombran `AAAAMMDDHHMMSS_nombre.sql` y se aplican en orden de ese número. Los números del proyecto avanzan en secuencia propia desde `20261112…` y NO coinciden con el reloj: los archivos del 15 al 30 de noviembre y el del 1 de diciembre se numeraron por delante de la fecha real (14 de noviembre de 2026) porque cada encargo toma el número siguiente al último existente. No es un error de funcionamiento mientras el número sea mayor que todos los anteriores; un número menor que uno ya aplicado puede ser ignorado o rechazado por el mecanismo de migraciones.
- Por eso no se cambiaron las fechas: renumerar una migración ya aplicada la haría ver como nueva o desordenada. Cualquier cambio de fechas se decide después de ver `supabase_migrations.schema_migrations` (consulta 1).
- Hallazgo: hay números repetidos en el repositorio: `20261113120000` (modulo_registros y restaurante_mesas), `20261114120000` (equipo_permisos y modulo_registros_operativo), `20261121120000` (vehiculos_inventario y kardex) y `20261122120000` (user_preferences y solicitudes_credito). Con el CLI de Supabase dos archivos con el mismo número chocan en el historial. No se sabe cómo lo maneja Lovable Cloud: se confirma con la consulta 1 (¿aparecen ambas?). No se tocó nada.
