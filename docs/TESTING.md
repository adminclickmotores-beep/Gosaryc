# TESTING

Estado: no hay suite automatizada en CI. Ninguna funcionalidad está marcada como completamente probada.

## Misión 1 — Aislamiento multiempresa
| Prueba | Dónde | Resultado |
|---|---|---|
| B no ve, edita ni borra bodegas de A | `supabase/tests/aislamiento_multiempresa.sql` y bloque de pruebas dentro de la migración `20261201120000` | Escritas. Resultado NO verificado: no se pudo leer la base desde aquí. La migración las ejecuta al aplicarse y las informa como aviso en el registro de la base |
| B no puede sumar stock a un insumo de A (función protegida) | Migración 20261201120000 (P3) | Escrita, sin verificar |
| B no puede crear bodegas a nombre de A | Migración 20261201120000 (P6) | Escrita, sin verificar |
| Imágenes: B no escribe en la carpeta de A | Política de almacenamiento por carpeta | Sin prueba automatizada |
| Reportes/estadísticas, finanzas, archivos de crédito | Revisión de políticas (todas con `owner_id = mi_negocio_id()`) | Revisado por lectura de código, sin ejecución |

### Revisión del 2026-11-14
Ninguna prueba fue ejecutada en esta ronda (sin acceso a la base ni a sus registros). Estado individual:
| Prueba | Estado |
|---|---|
| P1 B no ve bodegas de A | Escrita, NO EJECUTADA |
| P2 B no ve insumos de A | Escrita, NO EJECUTADA |
| P3 B no suma stock a insumo de A | Escrita, NO EJECUTADA |
| P4 B no modifica bodega de A | Escrita, NO EJECUTADA |
| P5 B no borra bodega de A | Escrita, NO EJECUTADA |
| P6 B no crea bodega a nombre de A | Escrita, NO EJECUTADA |
| Clientes, pedidos, historial, existencias, almacenamiento, roles | SIN PRUEBA escrita ni ejecutada |
| Migración aplicada / políticas activas | NO CONFIRMADO |

Pendiente: pruebas negativas por rol (empleado sin módulo), pruebas de descarga de archivos privados y pruebas con dos cuentas reales en la app.

## Plan mínimo
1. Aislamiento: dos cuentas A y B; B no debe leer ni escribir datos de A en ninguna tabla.
2. Permisos: un empleado sin módulo no puede leer ni escribir sus registros (probar contra la API).
3. Finanzas: venta POS → caja; abono en módulo → caja; anulación no duplica ingresos.
4. Inventario: vender descuenta insumos; mover entre bodegas conserva el total; stock negativo rechazado.
5. Sin conexión: crear registros sin internet, recuperar conexión, sin duplicados.
6. Suscripción: empresa suspendida o vencida queda bloqueada.
