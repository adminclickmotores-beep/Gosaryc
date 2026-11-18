-- Hallazgos críticos de la revisión de seguridad (18-nov-2026).
-- 1. "Anyone with an expired account can still see financial records":
--    capa RESTRICTIVA de lectura en las tablas financieras que exige licencia vigente
--    (misma regla que mi_licencia_vigente: estado activo y vence_en > now()).
--    Exentos: Superadmin, las 2 cuentas demo y negocios sin fila de suscripción.
-- 2. "Any signed-in user can link another business's customer":
--    disparador genérico en TODAS las llaves foráneas entre tablas con owner_id
--    (cliente_id, paciente_id, socio_id, vehiculo_id...): la fila referenciada debe
--    ser del mismo negocio que la fila que se guarda.
-- Sin DROP de tablas ni borrado de datos.

-- ============================================================
-- 1. Licencia vigente para leer información financiera
-- ============================================================
CREATE OR REPLACE FUNCTION public.licencia_negocio_vigente()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.es_superadmin()
    OR lower(coalesce(auth.jwt() ->> 'email', '')) IN ('demo.vehiculos@gosaryc.com', 'demo.restaurante@gosaryc.com')
    OR coalesce(
      (SELECT s.estado = 'activo' AND s.vence_en > now()
         FROM public.suscripciones_negocio s
        WHERE s.owner_id = public.mi_negocio_id()),
      true)
  );
$$;
REVOKE ALL ON FUNCTION public.licencia_negocio_vigente() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.licencia_negocio_vigente() TO authenticated;

DO $$
DECLARE
  t text;
  publico_lee boolean;
  tablas constant text[] := ARRAY[
    'cuentas_contables', 'asientos_contables', 'auditoria_financiera',
    'obligaciones_tributarias_negocio', 'restaurante_movimientos_caja', 'turnos_caja',
    'movimientos_turno', 'fac_emitidas', 'facturas_registros', 'gastos', 'fiados',
    'nomina_empleados', 'nomina_liquidaciones', 'equipo_pagos', 'comisiones_registros',
    'propinas_registros', 'pagos_digitales_registros', 'liquidaciones_repartidores',
    'com_ventas', 'com_venta_items', 'far_ventas', 'ventas_veh_registros',
    'cartera_veh_registros', 'vehiculo_costos', 'cl_cobros', 'cl_comisiones',
    'bel_liquidaciones', 'tal_liquidaciones', 'tal_comisiones', 'inm_liquidaciones',
    'inm_cobros', 'tra_liquidaciones', 'tra_anticipos', 'eve_abonos', 'edu_pensiones',
    'hot_cargos', 'negocio_traslados'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    -- Si la tabla tiene lectura pública controlada, no se toca.
    SELECT coalesce(bool_or(p.cmd IN ('SELECT', 'ALL')), false) INTO publico_lee
      FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = t
       AND p.roles && ARRAY['anon', 'public']::name[];
    IF publico_lee THEN CONTINUE; END IF;

    EXECUTE format('DROP POLICY IF EXISTS licencia_vigente_leer ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY licencia_vigente_leer ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING ((SELECT public.licencia_negocio_vigente()))',
      t);
  END LOOP;
END $$;

-- ============================================================
-- 2. No enlazar registros (clientes, pacientes, socios...) de otro negocio
-- ============================================================
-- Argumentos: tabla referenciada, columna local, columna referenciada, tipo de la columna referenciada.
CREATE OR REPLACE FUNCTION public.validar_referencia_mismo_negocio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  tabla_ref text := TG_ARGV[0];
  col_local text := TG_ARGV[1];
  col_ref text := TG_ARGV[2];
  tipo_ref text := TG_ARGV[3];
  nuevo jsonb := to_jsonb(NEW);
  valor text := nuevo ->> col_local;
  dueno_ref text;
  encontrado boolean;
BEGIN
  IF valor IS NULL THEN
    RETURN NEW;
  END IF;
  -- En ediciones solo se revisa si cambió el enlace o el negocio.
  IF TG_OP = 'UPDATE'
     AND (to_jsonb(OLD) ->> col_local) IS NOT DISTINCT FROM valor
     AND (to_jsonb(OLD) ->> 'owner_id') IS NOT DISTINCT FROM (nuevo ->> 'owner_id') THEN
    RETURN NEW;
  END IF;

  EXECUTE format('SELECT true, owner_id::text FROM public.%I WHERE %I = CAST($1 AS %s) LIMIT 1',
                 tabla_ref, col_ref, tipo_ref)
    INTO encontrado, dueno_ref
    USING valor;

  IF coalesce(encontrado, false) AND dueno_ref IS NOT DISTINCT FROM (nuevo ->> 'owner_id') THEN
    RETURN NEW;
  END IF;
  IF NOT coalesce(encontrado, false) THEN
    -- La llave foránea dará su propio error; no se oculta.
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'El registro enlazado no pertenece a tu negocio.' USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION public.validar_referencia_mismo_negocio() FROM public, anon, authenticated;

DO $$
DECLARE
  r record;
  nombre_trg text;
BEGIN
  FOR r IN
    SELECT c.conrelid::regclass AS hija,
           ch.relname AS tabla_hija,
           pa.relname AS tabla_padre,
           a_hija.attname AS col_hija,
           a_padre.attname AS col_padre,
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
