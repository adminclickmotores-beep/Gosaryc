-- SOLO LECTURA (únicamente SELECT). No modifica nada. Seguro para producción.

-- 1. Tablas de public con RLS desactivado (deberían ser casi ninguna).
SELECT c.relname AS tabla, c.relrowsecurity AS rls_activo, c.relforcerowsecurity AS rls_forzado
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
 ORDER BY 1;

-- 2. Políticas de las tablas tocadas por la migración de aislamiento.
SELECT schemaname, tablename, policyname, cmd, roles, qual AS using_expr, with_check
  FROM pg_policies
 WHERE (schemaname = 'public' AND tablename IN (
         'restaurante_bodegas','restaurante_stock_bodega','equipo_auditoria','equipo_negocio','restaurante_clientes',
         'restaurante_pedidos','restaurante_pedido_items','restaurante_insumos','restaurante_recetas'))
    OR (schemaname = 'storage' AND tablename = 'objects')
 ORDER BY schemaname, tablename, policyname;

-- 3. Políticas que NO filtran por negocio (sin owner_id / mi_negocio_id / es_superadmin en la condición) en tablas con owner_id.
SELECT p.tablename, p.policyname, p.cmd, p.roles, p.qual, p.with_check
  FROM pg_policies p
 WHERE p.schemaname = 'public'
   AND EXISTS (SELECT 1 FROM information_schema.columns c
                WHERE c.table_schema='public' AND c.table_name=p.tablename AND c.column_name='owner_id')
   AND coalesce(p.qual,'') NOT ILIKE '%owner_id%' AND coalesce(p.qual,'') NOT ILIKE '%es_superadmin%'
   AND coalesce(p.with_check,'') NOT ILIKE '%owner_id%' AND coalesce(p.with_check,'') NOT ILIKE '%es_superadmin%'
 ORDER BY 1, 2;

-- 4. Políticas de bodegas que usan es_personal() (hallazgo H6; debería quedar vacío tras la corrección propuesta).
SELECT tablename, policyname, qual FROM pg_policies
 WHERE schemaname='public' AND tablename IN ('restaurante_bodegas','restaurante_stock_bodega')
   AND (qual ILIKE '%es_personal%' OR with_check ILIKE '%es_personal%');

-- 5. Funciones SECURITY DEFINER de public ejecutables por visitantes sin sesión (anon) o por PUBLIC.
SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS argumentos,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_puede,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS autenticado_puede
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public' AND p.prosecdef
   AND has_function_privilege('anon', p.oid, 'EXECUTE')
 ORDER BY 1;

-- 6. Quién está autorizado en las tablas de bodegas (privilegios de tabla, además de RLS).
SELECT grantee, table_name, privilege_type
  FROM information_schema.role_table_grants
 WHERE table_schema='public' AND table_name IN ('restaurante_bodegas','restaurante_stock_bodega','equipo_auditoria')
   AND grantee IN ('anon','authenticated')
 ORDER BY table_name, grantee, privilege_type;
