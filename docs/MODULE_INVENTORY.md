# MODULE_INVENTORY

La lista exacta de módulos por negocio es `TIPOS_NEGOCIO` en `src/lib/modulos-negocio.ts` (fuente de verdad; no se copia aquí para no desincronizarla).
El comportamiento de cada módulo genérico lo define su "tipo" en `src/lib/modulos-config.ts`.

## Tipos del motor genérico
| Tipo | Acciones reales | Integración |
|---|---|---|
| cartera, reserva, pago, huesped, estudiante, proyecto (saldo) | Abonos, saldo, cierre, anulación | Caja (ingreso o gasto) |
| stock | Entradas, salidas, mermas, conteo, alerta de mínimo | Ninguna aún (sin kardex central) |
| cita | Estados, reprogramar | Ninguna |
| vencimiento, socio | Renovar con nueva fecha, alertas | Ninguna |
| venta, paciente, mascota, inmueble, general | Estados, seguimiento, historial | Ninguna |

## Pendiente de auditar módulo por módulo
Verificar en ejecución cada módulo y registrar aquí su clasificación. Hasta entonces, ninguno de los 21 negocios está "completo".
