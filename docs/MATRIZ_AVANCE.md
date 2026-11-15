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

El archivo recibido llegó cortado en el punto 4, "12. Cot…". No se puede reconstruir sin inventar: pendiente de que se reenvíe completo.
