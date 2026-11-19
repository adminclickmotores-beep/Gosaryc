-- Las demos vuelven a ser editables y se pueden restaurar con el botón.
-- 1) Se quitan los bloqueos de solo lectura de las cuentas demo.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN ('demo_block_shared_insert', 'demo_block_shared_update', 'demo_block_shared_delete')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END;
$$;

-- 2) Las funciones de siembra (que internamente solo actúan sobre las cuentas demo)
--    vuelven a poder llamarse desde la sesión demo para restaurar los datos.
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT format('%I.%I(%s)', n.nspname, p.proname, pg_get_function_identity_arguments(p.oid)) AS firma
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('demo_preparar_negocio', 'demo_sembrar_vehiculos', 'demo_completar_vehiculos',
                        'demo_sembrar_restaurante', 'demo_cifras_del_dia')
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.firma);
  END LOOP;
END;
$$;
