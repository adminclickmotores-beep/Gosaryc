# MASTER_PLAN — Gosaryc

Plataforma de administración empresarial multinegocio (21 tipos de negocio) en la nube, con modo sin conexión.
Fuente de la misión: documentos "Misión maestra", "Reconstrucción integral" y "Fases PRO" entregados por el dueño.

## Principios
1. Preservar lo que funciona; no migraciones destructivas.
2. Un solo cliente de base de datos (Lovable Cloud) y cambios de esquema solo en `supabase/migrations/`.
3. Cada empresa aislada por `owner_id` + políticas RLS (`mi_negocio_id()`).
4. Nada se marca como "terminado" sin verificación; ver `DEVELOPMENT_STATUS.md`.

## Fases y estado
| Fase | Descripción | Estado |
|---|---|---|
| 1 Auditoría | Revisión de arquitectura, datos y módulos | Parcial (ver DEVELOPMENT_STATUS) |
| 2 Arquitectura | Multiempresa, roles, suscripciones, offline | Base hecha |
| 3 Modelos por negocio | Análisis de los 21 sectores | Pendiente (ver BUSINESS_TYPES) |
| 4 Reconstrucción | Motores especializados por negocio | Restaurante y concesionario avanzados; resto genérico |
| 5 IA y automatización | Asistente con datos reales | Pendiente (existe agente de pedidos) |
| 6 Seguridad y calidad | Pruebas de aislamiento y permisos | Pendiente de pruebas |
| 7 UX | Tablero, indicadores, ayuda | Parcial |
| 8 SaaS | Planes, suspensión, panel del dueño | Parcial (sin límites por plan) |
| 9 Distribución | Instaladores .exe/.dmg/AppImage | No iniciada |
| 10 Validación final | Pilotos Crokante y JG Motors | No iniciada |

## Siguiente trabajo concreto
1. Integrar compras (proveedor → inventario → cuentas por pagar → caja) en módulos genéricos.
2. Motor propio de Salud (historia clínica, evoluciones) con auditoría de acceso.
3. Límites reales por plan aplicados desde la base de datos.
