-- Las demos en vivo necesitan que la propia cuenta demo pueda pedir la carga inicial de sus datos de ejemplo.
-- Cada función valida por dentro que quien llama sea una cuenta demo (SECURITY DEFINER), es idempotente y no borra nada.
-- Las escrituras directas de las cuentas demo siguen bloqueadas por las políticas demo_block_shared_*.
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
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', f.firma);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', f.firma);
  END LOOP;
END;
$$;
