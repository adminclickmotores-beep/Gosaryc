-- Identifica las sesiones correspondientes a las cuentas demo compartidas.
-- Se ejecuta con privilegios del propietario de la función.

CREATE OR REPLACE FUNCTION public.es_cuenta_demo_actual()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users AS u
    WHERE u.id = auth.uid()
      AND lower(coalesce(u.email, '')) IN (
        'demo.vehiculos@gosaryc.com',
        'demo.restaurante@gosaryc.com'
      )
  );
$$;

REVOKE ALL ON FUNCTION public.es_cuenta_demo_actual() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.es_cuenta_demo_actual()
TO authenticated;


-- Impide INSERT, UPDATE y DELETE desde las cuentas compartidas.
-- Las políticas restrictivas se combinan con las políticas RLS existentes.

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT
      n.nspname,
      c.relname
    FROM pg_class AS c
    JOIN pg_namespace AS n
      ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')
      AND c.relrowsecurity = true
  LOOP

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = t.nspname
        AND tablename = t.relname
        AND policyname = 'demo_block_shared_insert'
    ) THEN
      EXECUTE format(
        'CREATE POLICY demo_block_shared_insert
         ON %I.%I
         AS RESTRICTIVE
         FOR INSERT
         TO authenticated
         WITH CHECK (NOT public.es_cuenta_demo_actual())',
        t.nspname,
        t.relname
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = t.nspname
        AND tablename = t.relname
        AND policyname = 'demo_block_shared_update'
    ) THEN
      EXECUTE format(
        'CREATE POLICY demo_block_shared_update
         ON %I.%I
         AS RESTRICTIVE
         FOR UPDATE
         TO authenticated
         USING (NOT public.es_cuenta_demo_actual())
         WITH CHECK (NOT public.es_cuenta_demo_actual())',
        t.nspname,
        t.relname
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = t.nspname
        AND tablename = t.relname
        AND policyname = 'demo_block_shared_delete'
    ) THEN
      EXECUTE format(
        'CREATE POLICY demo_block_shared_delete
         ON %I.%I
         AS RESTRICTIVE
         FOR DELETE
         TO authenticated
         USING (NOT public.es_cuenta_demo_actual())',
        t.nspname,
        t.relname
      );
    END IF;

  END LOOP;
END;
$$;


-- Los procedimientos de siembra no deben poder ejecutarse
-- directamente desde sesiones normales del navegador.

DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT
      format(
        '%I.%I(%s)',
        n.nspname,
        p.proname,
        pg_get_function_identity_arguments(p.oid)
      ) AS firma
    FROM pg_proc AS p
    JOIN pg_namespace AS n
      ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'demo_preparar_negocio',
        'demo_sembrar_vehiculos',
        'demo_completar_vehiculos',
        'demo_sembrar_restaurante',
        'demo_cifras_del_dia'
      )
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon, authenticated',
      f.firma
    );
  END LOOP;
END;
$$;
