# PROJECT_CONTROL

Fuente principal para retomar el trabajo entre sesiones. Documentos de apoyo en `docs/`
(MASTER_PLAN, ARCHITECTURE, BUSINESS_TYPES, MODULE_INVENTORY, DEVELOPMENT_STATUS, SECURITY,
TESTING, DATABASE, INTEGRATIONS, CHANGELOG, KNOWN_ISSUES). Pendientes: DEPLOYMENT.md y RECOVERY_PLAN.md.

## Objetivo general
Plataforma empresarial multinegocio (ERP/CRM/POS) con soluciones especializadas por sector.
Pilotos: CROKANTE (restaurante) y JG MOTORS (concesionario).

## Estado actual
- Stack: TanStack Router/Start, Vite, React, Tailwind, Lovable Cloud (Supabase).
- Existe: restaurante (POS, mesas, caja, recetario/inventario, reportes, contabilidad, menú QR), vehículos
  (inventario, separaciones, retomas, créditos, cotizaciones, documentos, vencimientos), caja por turnos,
  módulos operativos genéricos, equipo y permisos, superadmin, agente virtual, modo sin conexión, login/recuperación.
- Catálogo de tipos de negocio en `src/lib/modulos-negocio.ts`.
- La clasificación por módulo (sección 21 de la misión) aún no está verificada módulo por módulo.

## Matriz de cumplimiento

| ID | Solicitud | Área afectada | Prioridad | Estado | Evidencia | Pendiente |
|---|---|---|---|---|---|---|
| T01 | Archivo central PROJECT_CONTROL.md | Documentación | Alta | IMPLEMENTADO | Este archivo | Mantenerlo al cierre de cada sesión |
| T02 | Documentos obligatorios (sec. 24) | Documentación | Media | PARCIAL: 11 de 14 existen en docs/ | docs/*.md | DEPLOYMENT.md, RECOVERY_PLAN.md; revisar que el contenido sea real |
| T03 | Auditoría técnica y funcional (sec. 21) | Todo | Crítica | PENDIENTE | — | Clasificar cada módulo en los 6 niveles |
| T04 | Seguridad y aislamiento multiempresa (sec. 12, 13) | Base de datos / RLS | Crítica | IMPLEMENTADO (sin verificar en ejecución) | Migración 20261201120000; 8 hallazgos V1–V8 corregidos (docs/SECURITY.md) | Verificar resultados de las pruebas; pruebas por rol; módulos de los otros sectores; descargas de archivos privados |
| T05 | Integración entre módulos: venta→inventario/caja/cartera (sec. 8) | Restaurante/Caja | Alta | PENDIENTE | Caja y compras con medio de pago hechas en encargo previo | Verificar consistencia e idempotencia |
| T06 | Motor financiero (sec. 9) | Finanzas | Alta | PENDIENTE | — | CxC, CxP, presupuestos, rentabilidad por producto |
| T07 | Análisis y módulos de los 21 sectores (sec. 4-5) | Módulos | Alta | PENDIENTE | docs/BUSINESS_TYPES.md | Módulos especializados por sector |
| T08 | Pruebas obligatorias (sec. 22) | Calidad | Alta | PENDIENTE | docs/TESTING.md | Sin suite automatizada |
| T09 | IA con permisos y sin inventar cifras (sec. 10) | Asistente | Estratégica | PENDIENTE | Existe asistente virtual | Revisar alcance y aislamiento |
| T10 | Suscripciones, planes y límites en backend (sec. 13) | SaaS | Alta | PENDIENTE | Existe superadmin | Planes, licencias, suspensión |
| T11 | Respaldo y recuperación (sec. 18) | Infraestructura | Crítica | BLOQUEADO parcial | — | Depende de ajustes del proyecto en Lovable Cloud |
| T12 | Apps de escritorio (sec. 14) | Distribución | Estratégica | PENDIENTE | escritorio/LEEME.md | Evaluar tecnología |
| T13 | Integraciones externas (sec. 15) | Integraciones | Estratégica | BLOQUEADO | docs/INTEGRATIONS.md | Requieren credenciales y contratos |
| T14 | Login, recuperación, 16px y sin scroll horizontal | Autenticación / móvil | Alta | APROBADO (revisión previa) | Encargo anterior | — |

## Tareas bloqueadas
- T13: faltan credenciales y contratos con terceros (facturación electrónica DIAN, pasarelas, WhatsApp).
- T11: los respaldos y su verificación se configuran en el proyecto de Lovable Cloud.

## Decisiones técnicas
- Una sola base de datos (Lovable Cloud); cambios de esquema solo con migraciones nuevas.
- Motores compartidos con reglas por sector, no 21 copias de la misma pantalla.

## Archivos modificados en esta sesión
- PROJECT_CONTROL.md (nuevo, actualizado)
- supabase/migrations/20261201120000_aislamiento_multiempresa.sql (nuevo)
- supabase/tests/aislamiento_multiempresa.sql (nuevo)
- NegocioConfig.tsx, InventarioVehiculos.tsx, routes/_app/restaurante.tsx: imágenes en carpeta del negocio
- types.ts: owner_id en bodegas y auditoría
- docs/SECURITY.md, TESTING.md, DATABASE.md, ARCHITECTURE.md, DEVELOPMENT_STATUS.md

## Errores conocidos
Ver docs/KNOWN_ISSUES.md.

## Revisión de verificación T04 (2026-11-14)
- Se revisó por lectura la migración 20261201120000 y su bloque de pruebas (P1–P6). Resultado de ejecución: NO VERIFICADO. Desde este entorno no hay acceso de lectura a la base ni a sus registros, así que no se puede confirmar que la migración esté aplicada ni leer el aviso de las pruebas.
- No se inventó ningún resultado. T04 sigue en "IMPLEMENTADO (sin verificar en ejecución)".
- Seguridad NO se marca como completada.

## Diagnóstico de conexión con la base (2026-11-14, segunda revisión)
- Acceso efectivo a Supabase/Lovable Cloud: NO. Este asistente solo puede leer y editar archivos del repositorio. No hay conexión MCP, ni herramienta de consulta SQL, ni lectura de historial de migraciones, políticas RLS, Storage o registros.
- Falta: una conexión de solo lectura (MCP o equivalente) autorizada para el proyecto de Lovable Cloud, configurada por el dueño en los ajustes de GoIDE/Lovable, nunca pegando claves en el chat.
- Las migraciones nuevas sí se aplican solas al publicar, pero no hay canal de regreso con el resultado.
- Sin cambios en la app ni en la base en esta ronda. T04 sigue abierta; T03 sigue bloqueada.

## Auditoría de la migración (2026-11-14, tercera revisión)
- Hecho: pruebas sacadas de la migración y separadas en conjuntos A–F en `supabase/tests/`; pruebas con error específico; asignación de dueños sin inventar (pendientes de conciliación); informe de conciliación de solo lectura; revisión de fecha, permisos y políticas (hallazgos H1–H7 en docs/SECURITY.md).
- No se agregó ninguna migración nueva (se habría aplicado sola). No se aplicó nada en producción.
- Pruebas realmente ejecutadas: NINGUNA. Pruebas preparadas: A–F.
- Archivos: supabase/migrations/20261201120000_aislamiento_multiempresa.sql (editado), supabase/tests/A–F y informe_conciliacion_propietarios.sql (nuevos), supabase/tests/aislamiento_multiempresa.sql (retirado), docs/TESTING.md y docs/SECURITY.md.
- Si la migración ya estaba aplicada antes de estos cambios, la versión anterior sigue vigente en la base: correr el informe de conciliación.

## Próxima tarea exacta
T04 (bloqueante): confirmar en los registros de la base de Lovable Cloud el aviso "Pruebas de aislamiento: todas superadas" (o "WARNING Pruebas de aislamiento: ..."), y ejecutar `supabase/tests/aislamiento_multiempresa.sql` en un entorno de pruebas. Luego pruebas por rol, descarga de archivos privados e integridad de relaciones.
Solo con esos resultados se pasa a T03 (clasificar módulos) y T05.
