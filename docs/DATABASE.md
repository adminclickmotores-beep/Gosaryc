# DATABASE

Lovable Cloud. Esquema = archivos en `supabase/migrations/` (orden por nombre). Tipos en `src/integrations/supabase/types.ts`.

## Tablas principales
- Negocio: `negocio_config`, `equipo_negocio`, `suscripciones_negocio`, `user_preferences`.
- Genérico: `modulo_registros` (estado, monto, abonado, cantidad, mínimo, fecha, historial).
- Restaurante: categorías, productos, pedidos, items, clientes, repartidores, mesas, `restaurante_movimientos_caja`, insumos, recetas, bodegas, kardex, compras.
- Contabilidad: `cuentas_contables`, `asientos_contables`. Agenda: `agenda_citas`.
- Concesionario: vehículos, solicitudes de crédito, separaciones, documentos, cotizaciones, retomas, turnos de caja.

## Cambios de aislamiento (migración 20261201120000)
- `owner_id` en `restaurante_bodegas`, `restaurante_stock_bodega` y `equipo_auditoria` (con relleno de los datos existentes).
- `restaurante_clientes`: teléfono único por negocio `(owner_id, telefono)`, ya no global.
- Funciones de bodega con comprobación de dueño; funciones internas sin acceso externo.
- Bucket `negocios`: rutas `<negocio>/archivo`; escritura solo en la carpeta propia.
- Triggers que impiden enlazar pedidos con repartidores/mesas de otro negocio.

## Reglas
- Toda tabla de negocio lleva `owner_id` y RLS.
- Migraciones solo aditivas (sin DROP/TRUNCATE/DELETE de datos).
- Pendiente: restricciones adicionales para consistencia financiera (p. ej. evitar doble registro en caja de un mismo abono).
