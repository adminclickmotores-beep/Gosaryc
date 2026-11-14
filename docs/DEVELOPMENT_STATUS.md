# DEVELOPMENT_STATUS

Clasificación: No desarrollado · Solo visual · Parcialmente funcional · Funcional sin integración · Funcional e integrado · Completamente probado.
**Ningún módulo está "completamente probado": no hay pruebas automatizadas ni verificación en ejecución registrada.**

**Aislamiento multiempresa:** corregido en bodegas, historial del equipo, imágenes, clientes de domicilios y pedidos (ver SECURITY.md). Pruebas escritas pero sin resultado verificado (revisado 2026-11-14: sigue sin poder confirmarse la ejecución; seguridad NO completada, no se avanza a clasificar módulos hasta tener resultados).

## Universales
| Módulo | Estado | Nota |
|---|---|---|
| Inicio de sesión / registro / recuperar contraseña | Funcional sin integración | Sin prueba registrada |
| Equipo y permisos por módulo | Funcional e integrado | Con historial de cambios del equipo |
| Caja diaria (restaurante) | Funcional e integrado | Recibe ventas POS y abonos de módulos |
| Caja por turnos (concesionario) | Funcional sin integración | Arqueo por billetes sin confirmar |
| Finanzas / contabilidad | Parcialmente funcional | Lee caja y pedidos |
| Panel del dueño `/superadmin` | Funcional sin integración | Planes, suspensión, vencimientos |
| Bloqueo por suspensión/vencimiento | Funcional sin integración | Sin prueba registrada |
| Modo sin internet | Parcialmente funcional | Ver KNOWN_ISSUES |
| Auditoría de acciones | Parcialmente funcional | Solo equipo; faltan ventas/anulaciones |

## Por negocio (ver `MODULE_INVENTORY.md`)
- Restaurante: funcional e integrado (POS → inventario por recetas → caja; compras; bodegas). Sin pruebas.
- Concesionario: pantallas especializadas (inventario, créditos, retomas, separaciones, documentos, cotizaciones). Integración parcial.
- Los otros 19 negocios: módulos sobre el motor genérico de registros → "Funcional sin integración" (con caja en abonos).
