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
| T04 | Seguridad y aislamiento multiempresa (sec. 12, 13) | Base de datos / RLS | Crítica | EN ANÁLISIS | docs/SECURITY.md | Auditar políticas RLS de todas las tablas |
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
- PROJECT_CONTROL.md (nuevo)

## Errores conocidos
Ver docs/KNOWN_ISSUES.md.

## Próxima tarea exacta
T04: auditar las políticas de seguridad (RLS) de las tablas en `supabase/migrations/` para confirmar aislamiento por empresa; después T03.
