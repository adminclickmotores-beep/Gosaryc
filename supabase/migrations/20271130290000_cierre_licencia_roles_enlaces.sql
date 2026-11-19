-- Hallazgos: (1) cuenta con licencia vencida aún ve registros financieros, (2) enlazar clientes de otro
-- negocio, (3) asignarse un rol. No se borra nada.

-- ============================================================
-- 1. Licencia vigente en TODA tabla con owner_id (lectura, solo rol authenticated)
-- ============================================================
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.table_name AS t
      FROM information_schema.columns c
      JOIN information_schema.tables tb
        ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
     WHERE c.table_schema = 'public'
       AND c.column_name = 'owner_id'
       AND c.table_name NOT IN ('suscripciones_negocio', 'licencias', 'negocio_config', 'pagos_licencia',
                                'claves_activacion', 'equipo_negocio', 'negocio_dian_config')
       AND NOT EXISTS (
         SELECT 1 FROM pg_policies p
          WHERE p.schemaname = 'public' AND p.tablename = c.table_name
            AND p.roles && ARRAY['anon', 'public']::name[] AND p.cmd IN ('SELECT', 'ALL')
       )
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.t);
      EXECUTE format('DROP POLICY IF EXISTS licencia_vigente_leer ON public.%I', r.t);
      EXECUTE format(
        'CREATE POLICY licencia_vigente_leer ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING ((SELECT public.licencia_negocio_vigente()))',
        r.t);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Licencia en %: %', r.t, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================
-- 2. Rol de equipo: solo se vincula un usuario cuyo correo coincide y está verificado
-- ============================================================
CREATE OR REPLACE FUNCTION public.validar_equipo_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.es_superadmin() THEN
    RETURN NEW;
  END IF;
  IF NEW.user_id IS NOT NULL THEN
    IF TG_OP = 'UPDATE' AND NEW.user_id IS NOT DISTINCT FROM OLD.user_id
       AND lower(NEW.email) = lower(OLD.email) THEN
      RETURN NEW;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM auth.users u
       WHERE u.id = NEW.user_id
         AND lower(u.email) = lower(NEW.email)
         AND u.email_confirmed_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'El usuario no coincide con el correo autorizado.' USING ERRCODE = '42501';
    END IF;
  END IF;
  -- Nadie cambia a qué negocio pertenece un miembro ya creado.
  IF TG_OP = 'UPDATE' AND NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'No se puede cambiar el negocio de un miembro.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validar_equipo_usuario() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS trg_validar_equipo_usuario ON public.equipo_negocio;
CREATE TRIGGER trg_validar_equipo_usuario
  BEFORE INSERT OR UPDATE ON public.equipo_negocio
  FOR EACH ROW EXECUTE FUNCTION public.validar_equipo_usuario();

-- ============================================================
-- 3. Enlaces entre negocios: reaplica el control a toda llave foránea (incluye tablas nuevas)
-- ============================================================
DO $$
DECLARE
  r record;
  nombre_trg text;
BEGIN
  FOR r IN
    SELECT ch.relname AS tabla_hija, pa.relname AS tabla_padre,
           a_hija.attname AS col_hija, a_padre.attname AS col_padre,
           format_type(a_padre.atttypid, a_padre.atttypmod) AS tipo_padre
      FROM pg_constraint c
      JOIN pg_class ch ON ch.oid = c.conrelid
      JOIN pg_namespace nh ON nh.oid = ch.relnamespace AND nh.nspname = 'public'
      JOIN pg_class pa ON pa.oid = c.confrelid
      JOIN pg_namespace np ON np.oid = pa.relnamespace AND np.nspname = 'public'
      JOIN pg_attribute a_hija ON a_hija.attrelid = c.conrelid AND a_hija.attnum = c.conkey[1]
      JOIN pg_attribute a_padre ON a_padre.attrelid = c.confrelid AND a_padre.attnum = c.confkey[1]
     WHERE c.contype = 'f'
       AND array_length(c.conkey, 1) = 1
       AND a_hija.attname <> 'owner_id'
       AND ch.relkind = 'r' AND pa.relkind = 'r'
       AND EXISTS (SELECT 1 FROM pg_attribute x WHERE x.attrelid = c.conrelid AND x.attname = 'owner_id' AND NOT x.attisdropped)
       AND EXISTS (SELECT 1 FROM pg_attribute x WHERE x.attrelid = c.confrelid AND x.attname = 'owner_id' AND NOT x.attisdropped)
  LOOP
    nombre_trg := left('zz_mismo_negocio_' || r.col_hija, 63);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', nombre_trg, r.tabla_hija);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validar_referencia_mismo_negocio(%L, %L, %L, %L)',
      nombre_trg, r.tabla_hija, r.tabla_padre, r.col_hija, r.col_padre, r.tipo_padre);
  END LOOP;
END $$;
