-- SOLO LECTURA (únicamente SELECT). No modifica nada. Seguro para producción.
-- Objetivo: saber si la migración 20261201120000 está aplicada y QUÉ VERSIÓN de su texto quedó en la base.

-- 1. Migraciones registradas (si tu entorno guarda el historial en supabase_migrations).
SELECT version, name
  FROM supabase_migrations.schema_migrations
 WHERE version >= '20261128000000'
 ORDER BY version;

-- 2. Huellas de la VERSIÓN NUEVA del archivo (cada fila debe decir true si la versión nueva está aplicada).
SELECT 'columna owner_id en restaurante_bodegas' AS huella,
       EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='restaurante_bodegas' AND column_name='owner_id') AS presente
UNION ALL
SELECT 'columna owner_id en restaurante_stock_bodega',
       EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='restaurante_stock_bodega' AND column_name='owner_id')
UNION ALL
SELECT 'columna owner_id en equipo_auditoria',
       EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema='public' AND table_name='equipo_auditoria' AND column_name='owner_id')
UNION ALL
SELECT 'índice único (owner_id, telefono) en clientes',
       EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='restaurante_clientes_owner_telefono_unico')
UNION ALL
SELECT 'trigger validar_pedido_mismo_negocio',
       EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_validar_pedido_mismo_negocio' AND NOT tgisinternal)
UNION ALL
SELECT 'mover_stock_bodega comprueba dueño',
       EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                WHERE n.nspname='public' AND p.proname='mover_stock_bodega' AND p.prosrc ILIKE '%v_owner%')
UNION ALL
SELECT 'restricción antigua de teléfono único YA NO existe',
       NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='restaurante_clientes_telefono_key')
UNION ALL
SELECT 'bloque de pruebas antiguo NO dejó rastro (función zz_t_* ausente)',
       NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                    WHERE n.nspname='public' AND p.proname LIKE 'zz_t_%');

-- 3. Distinguir VERSIÓN ANTIGUA de NUEVA en datos (solo cuentas, no modifica):
--    Versión nueva: bodegas sin insumos quedan con owner_id NULL. Versión antigua: se asignaron al negocio más antiguo.
SELECT count(*) FILTER (WHERE owner_id IS NULL)     AS bodegas_sin_dueno,
       count(*) FILTER (WHERE owner_id IS NOT NULL) AS bodegas_con_dueno,
       count(*) FILTER (WHERE owner_id IS NOT NULL
                         AND NOT EXISTS (SELECT 1 FROM public.restaurante_insumos i WHERE i.bodega_id = b.id)) AS con_dueno_sin_evidencia
  FROM public.restaurante_bodegas b;
-- Si con_dueno_sin_evidencia > 0 se aplicó la versión ANTIGUA (asignó dueño sin evidencia): revisar con
-- supabase/tests/informe_conciliacion_propietarios.sql (consulta 2, estado SIN_EVIDENCIA).
