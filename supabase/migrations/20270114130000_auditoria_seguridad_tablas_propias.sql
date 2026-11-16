-- Auditoría de seguridad de las tablas propias por negocio (versión con fecha única).
-- Antes compartía la fecha 20270114120000 con otra migración y el orden de aplicación era ambiguo.
-- Es idempotente: si ya se aplicó, solo vuelve a dejar las mismas políticas.
-- Separa la política "FOR ALL" por operación; el borrado queda solo para el dueño del negocio.
-- No borra datos ni toca los triggers de sincronización.

DO $$
DECLARE
  t text;
  m text;
  pares text[][] := ARRAY[
    ['ventas_veh_registros', 'ventas_veh'],
    ['comisiones_registros', 'comisiones'],
    ['alistamiento_registros', 'alistamiento'],
    ['cartera_veh_registros', 'cartera_veh'],
    ['vehiculos_usados_registros', 'vehiculos_usados'],
    ['proveedores_registros', 'proveedores'],
    ['propinas_registros', 'propinas'],
    ['metas_registros', 'metas'],
    ['resenas_registros', 'resenas'],
    ['pagos_digitales_registros', 'pagos_digitales'],
    ['suscripciones_registros', 'suscripciones'],
    ['combos_registros', 'combos'],
    ['fidelizacion_registros', 'fidelizacion'],
    ['fiados', 'fiados'],
    ['equipo_pagos', 'equipo_turnos'],
    ['liquidaciones_repartidores', 'repartidores']
  ];
BEGIN
  FOR i IN 1 .. array_length(pares, 1) LOOP
    t := pares[i][1];
    m := pares[i][2];

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_personal', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_leer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_crear', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_editar', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_borrar', t);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso(%L))',
      t || '_leer', t, m);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso(%L))',
      t || '_crear', t, m);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso(%L)) WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso(%L))',
      t || '_editar', t, m, m);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (owner_id = public.mi_negocio_id() AND (public.es_admin() OR public.es_superadmin()))',
      t || '_borrar', t);

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_solo_tipo_actual'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual()) WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())',
        t || '_solo_tipo_actual', t);
    END IF;

    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM authenticated', t);
  END LOOP;
END $$;
