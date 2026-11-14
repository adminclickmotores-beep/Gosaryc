# TESTING

Estado: **no existen pruebas automatizadas en el repositorio.** Ninguna funcionalidad está marcada como probada.

## Plan mínimo (a ejecutar por el responsable de pruebas)
1. Aislamiento: dos cuentas A y B; B no debe leer ni escribir datos de A en ninguna tabla.
2. Permisos: un empleado sin módulo no puede leer ni escribir sus registros (probar contra la API, no solo la pantalla).
3. Finanzas: venta POS → caja; abono en módulo → caja; anulación no duplica ingresos.
4. Inventario: vender descuenta insumos; mover entre bodegas conserva el total; stock negativo rechazado.
5. Sin conexión: crear registros sin internet, recuperar conexión, comprobar que no hay duplicados.
6. Suscripción: empresa suspendida o vencida queda bloqueada.
