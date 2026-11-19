-- Nadie se otorga a sí mismo un rol, dinero, puntos o premios desde el navegador.
-- Roles: ya solo los asigna el dueño del negocio (equipo_negocio) o el Superadmin.
-- Aquí se cierran puntos, premios, recompensas, bonos y créditos: solo dueño o Superadmin.
-- No borra datos.

-- 1. Disparador genérico: el personal no puede crear ni cambiar valores de puntos/premios/bonos/créditos.
CREATE OR REPLACE FUNCTION public.proteger_premios_personal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  col text;
  v_dueno text;
  nuevo jsonb := to_jsonb(NEW);
BEGIN
  IF auth.uid() IS NULL OR public.es_superadmin() THEN
    RETURN NEW;
  END IF;
  v_dueno := nuevo ->> 'owner_id';
  IF v_dueno IS NOT NULL AND v_dueno = auth.uid()::text THEN
    RETURN NEW;
  END IF;
  FOR i IN 0..(TG_NARGS - 1) LOOP
    col := TG_ARGV[i];
    IF TG_OP = 'UPDATE' THEN
      IF (nuevo -> col) IS DISTINCT FROM (to_jsonb(OLD) -> col) THEN
        RAISE EXCEPTION 'Solo el dueño del negocio puede asignar puntos, premios o créditos.' USING ERRCODE = '42501';
      END IF;
    ELSE
      IF coalesce(nullif(btrim(nuevo ->> col), ''), '0') !~ '^-?0+(\.0+)?$'
         AND coalesce(nullif(btrim(nuevo ->> col), ''), '0') ~ '^-?[0-9.]+$' THEN
        RAISE EXCEPTION 'Solo el dueño del negocio puede asignar puntos, premios o créditos.' USING ERRCODE = '42501';
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.proteger_premios_personal() FROM public, anon, authenticated;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.table_name AS tabla, array_agg(c.column_name::text) AS cols
      FROM information_schema.columns c
      JOIN information_schema.tables tb
        ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
     WHERE c.table_schema = 'public'
       AND c.column_name ~ '^(puntos|puntos_[a-z_]+|premio|premios|premio_[a-z_]+|recompensa|recompensas|recompensa_[a-z_]+|bono|bonos|bono_[a-z_]+|credito|creditos|saldo_a_favor|dias_extra|dias_regalo|ganado|gano)$'
       AND EXISTS (SELECT 1 FROM information_schema.columns o
                    WHERE o.table_schema = 'public' AND o.table_name = c.table_name AND o.column_name = 'owner_id')
     GROUP BY c.table_name
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_proteger_premios ON public.%I', r.tabla);
    EXECUTE format(
      'CREATE TRIGGER trg_proteger_premios BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.proteger_premios_personal(%s)',
      r.tabla, (SELECT string_agg(quote_literal(k), ', ') FROM unnest(r.cols) k));
  END LOOP;
END $$;

-- 2. Tablas de puntos/premios/bonos: solo el dueño (o Superadmin) crea, edita o borra.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fidelizacion_registros', 'puntos_registros', 'propinas_registros', 'metas_registros',
                           'comisiones_registros', 'combos_registros'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = t AND column_name = 'owner_id') THEN
      EXECUTE format('DROP POLICY IF EXISTS premios_solo_dueno_insertar ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS premios_solo_dueno_editar ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS premios_solo_dueno_borrar ON public.%I', t);
      IF t <> 'combos_registros' THEN
        EXECUTE format(
          'CREATE POLICY premios_solo_dueno_insertar ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR public.es_superadmin())', t);
        EXECUTE format(
          'CREATE POLICY premios_solo_dueno_editar ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.es_superadmin()) WITH CHECK (owner_id = auth.uid() OR public.es_superadmin())', t);
        EXECUTE format(
          'CREATE POLICY premios_solo_dueno_borrar ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.es_superadmin())', t);
      END IF;
    END IF;
  END LOOP;
END $$;

-- 3. El motor genérico (modulo_registros) también: los módulos de puntos, premios, propinas, metas y comisiones
--    solo los escribe el dueño o el Superadmin.
DO $$
BEGIN
  IF to_regclass('public.modulo_registros') IS NOT NULL THEN
    DROP POLICY IF EXISTS premios_modulos_insertar ON public.modulo_registros;
    DROP POLICY IF EXISTS premios_modulos_editar ON public.modulo_registros;
    DROP POLICY IF EXISTS premios_modulos_borrar ON public.modulo_registros;
    CREATE POLICY premios_modulos_insertar ON public.modulo_registros AS RESTRICTIVE FOR INSERT TO authenticated
      WITH CHECK (modulo NOT IN ('fidelizacion', 'propinas', 'metas', 'comisiones') OR owner_id = auth.uid() OR public.es_superadmin());
    CREATE POLICY premios_modulos_editar ON public.modulo_registros AS RESTRICTIVE FOR UPDATE TO authenticated
      USING (modulo NOT IN ('fidelizacion', 'propinas', 'metas', 'comisiones') OR owner_id = auth.uid() OR public.es_superadmin())
      WITH CHECK (modulo NOT IN ('fidelizacion', 'propinas', 'metas', 'comisiones') OR owner_id = auth.uid() OR public.es_superadmin());
    CREATE POLICY premios_modulos_borrar ON public.modulo_registros AS RESTRICTIVE FOR DELETE TO authenticated
      USING (modulo NOT IN ('fidelizacion', 'propinas', 'metas', 'comisiones') OR owner_id = auth.uid() OR public.es_superadmin());
  END IF;
END $$;

-- 4. Perfiles: cada usuario solo escribe su propio perfil y nunca desde otra cuenta.
--    (El perfil no guarda roles ni saldos; el rol vive en equipo_negocio, que solo cambia el dueño.)
DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    DROP POLICY IF EXISTS profiles_solo_propio_escribir ON public.profiles;
    CREATE POLICY profiles_solo_propio_escribir ON public.profiles AS RESTRICTIVE FOR UPDATE TO authenticated
      USING (id = auth.uid() OR public.es_superadmin())
      WITH CHECK (id = auth.uid() OR public.es_superadmin());
    REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM anon;
  END IF;
END $$;
