-- Comisiones, tarifas y salarios: solo el dueño del negocio (o el Superadmin) los define o cambia.
-- El personal puede seguir operando (vender, cobrar, atender) pero no tocar estos valores,
-- ni en su registro ni en el de otros. No borra datos.

-- 1. Disparador en TODA tabla del negocio que tenga una columna de comisión/salario/tarifa fija.
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
       AND c.column_name IN ('comision_pct', 'porcentaje_comision', 'salario_base', 'num_smmlv',
                             'tarifa_arl', 'anclado_smmlv', 'valor_hora', 'sueldo')
       AND EXISTS (SELECT 1 FROM information_schema.columns o
                    WHERE o.table_schema = 'public' AND o.table_name = c.table_name AND o.column_name = 'owner_id')
     GROUP BY c.table_name
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_proteger_comisiones ON public.%I', r.tabla);
    EXECUTE format(
      'CREATE TRIGGER trg_proteger_comisiones BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.proteger_comisiones_personal(%L, %s)',
      r.tabla, 'edicion',
      (SELECT string_agg(quote_literal(k), ', ') FROM unnest(r.cols) k));
  END LOOP;
END $$;

-- Las tarifas de catálogo (habitaciones, etc.) también solo las cambia el dueño.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['hot_habitaciones', 'ica_tarifas', 'tarifas_domicilio'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      FOR i IN 1..1 LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = t AND column_name = 'tarifa') THEN
          EXECUTE format('DROP TRIGGER IF EXISTS trg_proteger_tarifas ON public.%I', t);
          EXECUTE format(
            'CREATE TRIGGER trg_proteger_tarifas BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.proteger_comisiones_personal(%L, %L)',
            t, 'edicion', 'tarifa');
        END IF;
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- 2. Nómina (salarios) y comisiones registradas: el personal no las crea, edita ni borra directamente.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['nomina_empleados', 'nomina_liquidaciones', 'comisiones_registros'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = t AND column_name = 'owner_id') THEN
      EXECUTE format('DROP POLICY IF EXISTS solo_dueno_insertar ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS solo_dueno_editar ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS solo_dueno_borrar ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY solo_dueno_insertar ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR public.es_superadmin())', t);
      EXECUTE format(
        'CREATE POLICY solo_dueno_editar ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.es_superadmin()) WITH CHECK (owner_id = auth.uid() OR public.es_superadmin())', t);
      EXECUTE format(
        'CREATE POLICY solo_dueno_borrar ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.es_superadmin())', t);
    END IF;
  END LOOP;
END $$;

-- 3. El personal ya no puede leer los salarios de sus compañeros ni los propios: solo el dueño.
DO $$
BEGIN
  IF to_regclass('public.nomina_empleados') IS NOT NULL THEN
    DROP POLICY IF EXISTS solo_dueno_leer ON public.nomina_empleados;
    CREATE POLICY solo_dueno_leer ON public.nomina_empleados AS RESTRICTIVE FOR SELECT TO authenticated
      USING (owner_id = auth.uid() OR public.es_superadmin());
  END IF;
END $$;
