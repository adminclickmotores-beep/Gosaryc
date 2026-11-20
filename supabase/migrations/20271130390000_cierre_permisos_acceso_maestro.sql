-- Cierre maestro de "Permisos de acceso". Solo CREATE/ALTER/REVOKE: no borra ni modifica datos.

-- ============================================================
-- 1. Soporte de plataforma y roles: solo el Superadmin
-- ============================================================
CREATE OR REPLACE FUNCTION public.es_soporte()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.es_superadmin();
$$;
REVOKE ALL ON FUNCTION public.es_soporte() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.es_soporte() TO authenticated;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
     WHERE c.relkind = 'r'
       AND (c.relname = 'user_roles' OR c.relname IN ('roles_usuario', 'roles_plataforma', 'soporte_roles', 'superadmins'))
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon', t);
      EXECUTE format('DROP POLICY IF EXISTS roles_solo_superadmin_insert ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS roles_solo_superadmin_update ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS roles_solo_superadmin_delete ON public.%I', t);
      EXECUTE format('CREATE POLICY roles_solo_superadmin_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT public.es_superadmin()))', t);
      EXECUTE format('CREATE POLICY roles_solo_superadmin_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT public.es_superadmin())) WITH CHECK ((SELECT public.es_superadmin()))', t);
      EXECUTE format('CREATE POLICY roles_solo_superadmin_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING ((SELECT public.es_superadmin()))', t);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Roles en %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================
-- 2. registro_es_del_negocio: sin SQL dinámico, tablas fijas, ruta de búsqueda estricta
-- ============================================================
CREATE OR REPLACE FUNCTION public.registro_es_del_negocio(p_tabla text, p_id text, p_owner uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  ok boolean := false;
  uid uuid := auth.uid();
BEGIN
  IF p_id IS NULL OR btrim(p_id) = '' THEN
    RETURN true;
  END IF;
  IF p_owner IS NULL THEN
    RETURN false;
  END IF;
  -- Con sesión, quien consulta debe pertenecer al negocio indicado.
  IF uid IS NOT NULL AND p_owner <> uid AND p_owner IS DISTINCT FROM public.mi_negocio_id()
     AND NOT public.es_superadmin() THEN
    RETURN false;
  END IF;

  IF p_tabla = 'clientes' THEN
    IF to_regclass('public.clientes') IS NULL THEN RETURN true; END IF;
    SELECT EXISTS (SELECT 1 FROM public.clientes WHERE id::text = p_id AND owner_id = p_owner) INTO ok;
  ELSIF p_tabla = 'restaurante_clientes' THEN
    IF to_regclass('public.restaurante_clientes') IS NULL THEN RETURN true; END IF;
    SELECT EXISTS (SELECT 1 FROM public.restaurante_clientes WHERE id::text = p_id AND owner_id = p_owner) INTO ok;
  ELSIF p_tabla = 'pacientes' THEN
    IF to_regclass('public.pacientes') IS NULL THEN RETURN true; END IF;
    SELECT EXISTS (SELECT 1 FROM public.pacientes WHERE id::text = p_id AND owner_id = p_owner) INTO ok;
  ELSIF p_tabla = 'socios' THEN
    IF to_regclass('public.socios') IS NULL THEN RETURN true; END IF;
    SELECT EXISTS (SELECT 1 FROM public.socios WHERE id::text = p_id AND owner_id = p_owner) INTO ok;
  ELSIF p_tabla = 'contactos' THEN
    IF to_regclass('public.contactos') IS NULL THEN RETURN true; END IF;
    SELECT EXISTS (SELECT 1 FROM public.contactos WHERE id::text = p_id AND owner_id = p_owner) INTO ok;
  ELSIF p_tabla = 'huespedes' THEN
    IF to_regclass('public.huespedes') IS NULL THEN RETURN true; END IF;
    SELECT EXISTS (SELECT 1 FROM public.huespedes WHERE id::text = p_id AND owner_id = p_owner) INTO ok;
  ELSIF p_tabla = 'estudiantes' THEN
    IF to_regclass('public.estudiantes') IS NULL THEN RETURN true; END IF;
    SELECT EXISTS (SELECT 1 FROM public.estudiantes WHERE id::text = p_id AND owner_id = p_owner) INTO ok;
  ELSE
    RETURN false;
  END IF;
  RETURN coalesce(ok, false);
EXCEPTION WHEN others THEN
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.registro_es_del_negocio(text, text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.registro_es_del_negocio(text, text, uuid) TO authenticated;

-- ============================================================
-- 3. Aislamiento entre negocios: vuelve a aplicar el control de llaves foráneas a tablas nuevas
-- ============================================================
DO $$
DECLARE
  r record;
  nombre_trg text;
BEGIN
  IF to_regprocedure('public.validar_referencia_mismo_negocio()') IS NULL THEN
    RETURN;
  END IF;
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
    BEGIN
      nombre_trg := left('zz_mismo_negocio_' || r.col_hija, 63);
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', nombre_trg, r.tabla_hija);
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validar_referencia_mismo_negocio(%L, %L, %L, %L)',
        nombre_trg, r.tabla_hija, r.tabla_padre, r.col_hija, r.col_padre, r.tipo_padre);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Referencia % %: %', r.tabla_hija, r.col_hija, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================
-- 4. Comisiones, saldos, billeteras, descuentos y nómina: escribe solo el dueño o administrador
--    (el personal conserva la lectura; las funciones de cobro del sistema siguen funcionando)
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
     WHERE c.relkind = 'r'
       AND c.relname ~ '(comision|saldo|billetera|descuento|nomina|premio)'
       AND EXISTS (SELECT 1 FROM pg_attribute x WHERE x.attrelid = c.oid AND x.attname = 'owner_id' AND NOT x.attisdropped)
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS dueno_admin_insertar ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS dueno_admin_editar ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS dueno_admin_borrar ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY dueno_admin_insertar ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR public.es_superadmin() OR (owner_id = public.mi_negocio_id() AND public.es_admin()))', t);
      EXECUTE format(
        'CREATE POLICY dueno_admin_editar ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.es_superadmin() OR (owner_id = public.mi_negocio_id() AND public.es_admin())) WITH CHECK (owner_id = auth.uid() OR public.es_superadmin() OR (owner_id = public.mi_negocio_id() AND public.es_admin()))', t);
      EXECUTE format(
        'CREATE POLICY dueno_admin_borrar ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.es_superadmin() OR (owner_id = public.mi_negocio_id() AND public.es_admin()))', t);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Dinero en %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;
