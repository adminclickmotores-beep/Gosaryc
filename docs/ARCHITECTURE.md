# ARCHITECTURE

## Stack
TanStack Start/Router + Vite + React + Tailwind + shadcn/ui. Base de datos y autenticación: Lovable Cloud (Supabase).
Cliente único: `src/integrations/supabase/client.ts`.

## Multiempresa
- Cada negocio = una cuenta dueña. Las tablas de datos llevan `owner_id` (default `mi_negocio_id()`).
- `mi_negocio_id()`: dueño → su id; personal invitado → id de quien lo invitó (`equipo_negocio`).
- RLS por tabla: `owner_id = mi_negocio_id()` más permiso de módulo (`tiene_permiso`, `es_personal`, `es_admin`).
- `es_superadmin()` da acceso total al dueño de la plataforma (ver SECURITY).

## Piezas compartidas
- `modulos-negocio.ts`: catálogo de los 21 tipos y sus módulos (menú lateral).
- `modulos-config.ts` + `ModuloOperativo.tsx`: motor genérico de registros (`modulo_registros`) con estados, abonos, stock, renovación, seguimiento, tablero Kanban, historial, anulación, CSV e impresión. Los abonos/pagos se reflejan en `restaurante_movimientos_caja`.
- Pantallas especializadas: restaurante (POS, mesas, cocina, recetario, bodegas) y concesionario (vehículos, créditos, retomas, separaciones, documentos, cotizaciones, caja por turnos).
- `suscripciones_negocio`: plan, estado y vencimiento por empresa; panel `/superadmin`.
- `sin-conexion.ts`: cola local de escrituras y caché de lecturas; se reenvían al volver internet.

## Decisiones
- Escrituras sin conexión se encolan en `localStorage` y se reenvían en orden con el token vigente; los rechazos 4xx se descartan y se avisa.
- Las reglas de negocio críticas (descuento de insumos, mover stock) viven en funciones de base de datos.
