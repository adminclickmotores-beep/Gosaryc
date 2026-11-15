# Matriz de seguimiento GOSARYC

Estados: pendiente, en desarrollo, implementado sin probar, en pruebas, verificado, bloqueado.
Nada está "verificado": no hay cuentas de prueba por rol ni pruebas automatizadas ejecutadas.

## Bloque 1 — Auditoría de seguridad (revisión de migraciones, sin ejecutar contra la base real)

| Sector | Módulo | Funcionalidad | Estado | Problemas | Correcciones | Dependencias | Pruebas | Evidencia | Próxima tarea |
|---|---|---|---|---|---|---|---|---|---|
| Plataforma | Aislamiento entre empresas | Políticas por negocio (`owner_id = mi_negocio_id()`) en tablas del restaurante, concesionario, contabilidad, caja, agenda, cotizaciones | implementado sin probar | Bodegas sin insumos quedaron sin dueño (nadie las ve) y requieren conciliación manual | Migración de aislamiento ya aplicada | mi_negocio_id, es_personal | Ninguna ejecutada | Lectura de migraciones | Escribir pruebas con dos negocios |
| Plataforma | Registros genéricos | Política por negocio y por permiso de módulo | implementado sin probar | La política original abierta fue reemplazada en migraciones posteriores | Ya corregido antes | tiene_permiso | Ninguna | Lectura de migraciones | Confirmar en la base real |
| Concesionario | Precio de adquisición | Tabla aparte con permiso de costos; la columna antigua queda en NULL por disparador | implementado sin probar | — | Ya aplicado | veh_permiso | Ninguna | Lectura de migración | Probar con cuenta de asesor |
| Concesionario | Fotos y documentos | Bucket privado por carpeta de negocio y permiso | implementado sin probar | Bucket antiguo "negocios" sigue legible por enlace público (menú) | No se borró nada | storage | Ninguna | Lectura de migración | Verificar migración privada antes de retirar lo público |
| Concesionario | Retomas | Valores económicos en tabla aparte con aprobación e historial | implementado sin probar | — | Ya aplicado | permisos granulares | Ninguna | Lectura de migración | Probar con 3 roles |
| Plataforma | Funciones de stock | Revocadas a anónimos, validan dueño | implementado sin probar | — | Ya aplicado | — | Ninguna | Lectura de migración | — |
| Plataforma | Tablas heredadas (campañas, audiencias, workspaces, etc.) | Políticas por organización | pendiente | No revisadas en esta ronda | — | org_members | Ninguna | — | Auditar una por una; evaluar si se quitan |

## Hallazgo clave
En las migraciones revisadas no encontré políticas abiertas vigentes sobre las tablas del ERP. No puedo confirmar que la base real tenga exactamente ese estado hasta probarlo con cuentas reales.

## Bloque 2 — Concesionario
| Módulo | Estado | Detalle / dependencias | Pruebas | Próxima tarea |
|---|---|---|---|---|
| Compras de vehículos | implementado sin probar | Tablas propias (compra, negociación, gastos, pagos, aprobaciones, historial, documentos). Valores económicos protegidos con permiso `com_economico`; cualquier cambio económico invalida la aprobación; la recepción crea o vincula el vehículo (sin duplicar placa/VIN) y guarda el precio en la tabla protegida de costos. | Ninguna (sin cuentas por rol) | Probar con asesor / administrador |
| Compras → Caja, cuentas por pagar y contabilidad | pendiente | Los pagos quedan registrados en la compra pero no se descuentan solos de caja ni se contabilizan. Los documentos quedan en la compra, no se copian a la ficha del vehículo. | — | Conectar pagos con caja y asientos |
| Consignaciones | pendiente | Siguen como registro genérico. | — | Tablas propias (propietario, precio mínimo, comisión, contrato, vigencia, liquidación) |
| Inspecciones/peritajes, prospectos, comisiones, costos por vehículo, cartera | pendiente | Registros genéricos. | — | Después de consignaciones |

## Bloque 3 — Procesos (pendiente)
Compra→Inventario→Venta→Cobro→Caja→Contabilidad; Retoma→Avalúo→Aprobación→Inventario; Reserva→Servicio→Factura→Pago (con control de disponibilidad); Pedido→Cocina→Inventario→Caja→Contabilidad.

## Bloque 4 — 21 sectores (pendiente)
Restaurante: implementado sin probar. Concesionario: parcial. Resto: módulos genéricos, pendientes de especializar.
