-- Cierre final de hallazgos de seguridad (RLS, permisos, acciones de la aplicación, pagos).
-- Solo CREATE/ALTER/REVOKE/GRANT: no borra ni modifica datos.

-- ============================================================
-- 1. RLS activo en toda tabla pública que ya tiene políticas
-- ============================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname AS t
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
     WHERE c.relkind = 'r' AND NOT c.relrowsecurity
       AND EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname)
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.t);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'RLS en %: %', r.t, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================
-- 2. Funciones SECURITY DEFINER: ruta de búsqueda fija
-- ============================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS firma
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
     WHERE p.prosecdef AND p.prokind = 'f'
       AND NOT EXISTS (SELECT 1 FROM unnest(coalesce(p.proconfig, '{}')) cfg WHERE cfg LIKE 'search_path=%')
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %s SET search_path = public, auth, extensions, pg_temp', r.firma);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'search_path en %: %', r.firma, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================
-- 3. Funciones de disparador: nadie las llama directamente
-- ============================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS firma
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
     WHERE p.prokind = 'f' AND p.prorettype = 'trigger'::regtype
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public, anon, authenticated', r.firma);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Trigger %: %', r.firma, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================
-- 4. Acciones y pagos (cobrar, liquidar, demo): solo sesión iniciada, nunca anónimo
-- ============================================================
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS firma
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace AND n.nspname = 'public'
     WHERE p.prosecdef AND p.prokind = 'f' AND p.prorettype <> 'trigger'::regtype
       AND (p.proname LIKE 'demo\_%' OR p.proname LIKE '%\_cobrar%' OR p.proname LIKE '%\_liquidar%'
            OR p.proname IN ('fac_emitir', 'obr_registrar_vale', 'agr_aplicar', 'agr_vender', 'tra_anticipo',
                             'mi_dian_config', 'verificar_licencia'))
  LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM public, anon', r.firma);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.firma);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Acción %: %', r.firma, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================
-- 5. Licencias, planes, claves, pagos y roles: escritura solo del Superadmin
--    (política RESTRICTIVA que se suma a las existentes; la lectura propia no cambia)
-- ============================================================
DO $$
DECLARE t text; op text;
BEGIN
  FOREACH t IN ARRAY ARRAY['claves_activacion', 'user_roles', 'negocio_dian_config']
  LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      FOREACH op IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE']
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS solo_superadmin_%s ON public.%I', lower(op), t);
        IF op = 'INSERT' THEN
          EXECUTE format('CREATE POLICY solo_superadmin_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT public.es_superadmin()))', t);
        ELSIF op = 'UPDATE' THEN
          EXECUTE format('CREATE POLICY solo_superadmin_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT public.es_superadmin())) WITH CHECK ((SELECT public.es_superadmin()))', t);
        ELSE
          EXECUTE format('CREATE POLICY solo_superadmin_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING ((SELECT public.es_superadmin()))', t);
        END IF;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Superadmin en %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

-- anon nunca escribe en tablas de licencias, roles ni pagos
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['licencias', 'suscripciones_negocio', 'claves_activacion', 'user_roles',
                           'pagos_licencia', 'negocio_dian_config', 'equipo_negocio']
  LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;
