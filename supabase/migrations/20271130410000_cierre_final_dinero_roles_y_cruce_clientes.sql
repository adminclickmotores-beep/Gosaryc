-- Cierre final: (1) nadie se asigna roles, dinero, comisiones o premios; (2) ningún registro puede enlazar
-- un cliente/paciente/contacto/socio/lead de OTRO negocio. Solo CREATE/ALTER; no borra ni modifica datos.
-- El Superadmin (es_superadmin) y las funciones del sistema (cobros, POS, demos) siguen funcionando.

-- ============================================================
-- 1. Dinero, comisiones, premios, puntos, nómina y roles: escribe solo dueño / administrador / Superadmin
-- ============================================================
DO $$
DECLARE
  t text;
  cond text;
BEGIN
  cond := '(owner_id = auth.uid() OR public.es_superadmin()';
  IF to_regprocedure('public.es_admin()') IS NOT NULL THEN
    cond := cond || ' OR (owner_id = public.mi_negocio_id() AND public.es_admin())';
  END IF;
  cond := cond || ')';

  FOR t IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
     WHERE c.relkind = 'r'
       AND (c.relname ~ '(comision|saldo|billetera|monedero|wallet|descuento|cupon|nomina|salario|sueldo|premio|puntos|bono|recompensa|fidelizacion)'
            OR c.relname IN ('equipo_negocio', 'miembros_negocio', 'negocio_miembros', 'equipo_permisos'))
       AND EXISTS (SELECT 1 FROM pg_attribute x WHERE x.attrelid = c.oid AND x.attname = 'owner_id' AND NOT x.attisdropped)
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS dueno_admin_insertar ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS dueno_admin_editar ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS dueno_admin_borrar ON public.%I', t);
      EXECUTE format('CREATE POLICY dueno_admin_insertar ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK %s', t, cond);
      EXECUTE format('CREATE POLICY dueno_admin_editar ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING %s WITH CHECK %s', t, cond, cond);
      EXECUTE format('CREATE POLICY dueno_admin_borrar ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING %s', t, cond);
      EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM anon', t);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Dinero/roles en %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

-- Motor genérico: los módulos de dinero/premios/comisiones solo los escribe dueño, administrador o Superadmin.
DO $$
DECLARE
  cond text;
  patron text := '(fidelizacion|puntos|premio|bono|recompensa|comision|propina|meta|saldo|billetera|monedero|descuento|cupon|nomina|salario)';
BEGIN
  IF to_regclass('public.modulo_registros') IS NULL THEN
    RETURN;
  END IF;
  cond := '(owner_id = auth.uid() OR public.es_superadmin()';
  IF to_regprocedure('public.es_admin()') IS NOT NULL THEN
    cond := cond || ' OR (owner_id = public.mi_negocio_id() AND public.es_admin())';
  END IF;
  cond := cond || ')';

  DROP POLICY IF EXISTS dinero_modulos_insertar ON public.modulo_registros;
  DROP POLICY IF EXISTS dinero_modulos_editar ON public.modulo_registros;
  DROP POLICY IF EXISTS dinero_modulos_borrar ON public.modulo_registros;
  EXECUTE format('CREATE POLICY dinero_modulos_insertar ON public.modulo_registros AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (modulo !~* %L OR %s)', patron, cond);
  EXECUTE format('CREATE POLICY dinero_modulos_editar ON public.modulo_registros AS RESTRICTIVE FOR UPDATE TO authenticated USING (modulo !~* %L OR %s) WITH CHECK (modulo !~* %L OR %s)', patron, cond, patron, cond);
  EXECUTE format('CREATE POLICY dinero_modulos_borrar ON public.modulo_registros AS RESTRICTIVE FOR DELETE TO authenticated USING (modulo !~* %L OR %s)', patron, cond);
END $$;

-- ============================================================
-- 2. Anti-cruce de clientes: aunque la columna no tenga llave foránea declarada
-- ============================================================
CREATE OR REPLACE FUNCTION public.validar_enlace_persona_mismo_negocio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  col text := TG_ARGV[0];
  padres text[];
  p text;
  valor text := to_jsonb(NEW) ->> TG_ARGV[0];
  dueno text := to_jsonb(NEW) ->> 'owner_id';
  propio boolean;
  ajeno boolean;
  hay_propio boolean := false;
  hay_ajeno boolean := false;
BEGIN
  IF auth.uid() IS NULL OR valor IS NULL OR btrim(valor) = '' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND (to_jsonb(OLD) ->> col) IS NOT DISTINCT FROM valor
     AND (to_jsonb(OLD) ->> 'owner_id') IS NOT DISTINCT FROM dueno THEN
    RETURN NEW;
  END IF;
  IF dueno IS NULL THEN
    RAISE EXCEPTION 'El registro no pertenece a ningún negocio.' USING ERRCODE = '42501';
  END IF;

  padres := CASE col
    WHEN 'cliente_id'   THEN ARRAY['clientes', 'restaurante_clientes']
    WHEN 'paciente_id'  THEN ARRAY['pacientes']
    WHEN 'contacto_id'  THEN ARRAY['contactos']
    WHEN 'socio_id'     THEN ARRAY['socios']
    WHEN 'lead_id'      THEN ARRAY['crm_leads', 'leads']
    ELSE ARRAY[]::text[]
  END;

  FOREACH p IN ARRAY padres LOOP
    IF to_regclass('public.' || p) IS NOT NULL THEN
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE id::text = $1 AND owner_id::text = $2)', p)
        INTO propio USING valor, dueno;
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE id::text = $1 AND owner_id::text <> $2)', p)
        INTO ajeno USING valor, dueno;
      hay_propio := hay_propio OR coalesce(propio, false);
      hay_ajeno := hay_ajeno OR coalesce(ajeno, false);
    END IF;
  END LOOP;

  IF hay_ajeno AND NOT hay_propio THEN
    RAISE EXCEPTION 'No puedes enlazar un registro de otro negocio.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validar_enlace_persona_mismo_negocio() FROM public, anon, authenticated;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tabla, a.attname AS col
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
      JOIN pg_attribute a ON a.attrelid = c.oid AND NOT a.attisdropped
     WHERE c.relkind = 'r'
       AND a.attname IN ('cliente_id', 'paciente_id', 'contacto_id', 'socio_id', 'lead_id')
       AND c.relname NOT IN ('clientes', 'restaurante_clientes', 'pacientes', 'contactos', 'socios', 'crm_leads', 'leads')
       AND EXISTS (SELECT 1 FROM pg_attribute x WHERE x.attrelid = c.oid AND x.attname = 'owner_id' AND NOT x.attisdropped)
  LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', left('zz_enlace_persona_' || r.col, 63), r.tabla);
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validar_enlace_persona_mismo_negocio(%L)',
        left('zz_enlace_persona_' || r.col, 63), r.tabla, r.col);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Enlace % %: %', r.tabla, r.col, SQLERRM;
    END;
  END LOOP;
END $$;
