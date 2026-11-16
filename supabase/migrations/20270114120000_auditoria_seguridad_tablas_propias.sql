-- Auditoría de seguridad de las tablas propias por negocio.
-- Mantiene lo que ya estaba bien (RLS activo, aislamiento por negocio y por tipo de negocio,
-- permiso del módulo en equipo_negocio) y corrige tres cosas:
--   1. La política "FOR ALL" permitía a cualquier miembro con permiso borrar registros:
--      se separa por operación y el borrado queda solo para el dueño del negocio.
--   2. Se asegura que ninguna política permita acceso sin sesión (anon sin permisos).
--   3. Se quitan privilegios innecesarios (TRUNCATE, TRIGGER, REFERENCES) a los roles de la API,
--      porque TRUNCATE ignora RLS.
-- No borra datos ni toca los triggers de sincronización (son SECURITY DEFINER).

DO $$
DECLARE
  par text[];
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

    -- Política antigua "FOR ALL".
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_personal', t);

    -- Políticas por operación (por si se vuelve a ejecutar).
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_leer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_crear', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_editar', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_borrar', t);

    -- Leer: mismo negocio + permiso del módulo.
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso(%L))',
      t || '_leer', t, m);

    -- Crear: solo en su negocio y con permiso del módulo.
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso(%L))',
      t || '_crear', t, m);

    -- Editar: no puede mover el registro a otro negocio.
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso(%L)) WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso(%L))',
      t || '_editar', t, m, m);

    -- Borrar: solo el dueño del negocio (o el superadmin), no un miembro del equipo.
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (owner_id = public.mi_negocio_id() AND (public.es_admin() OR public.es_superadmin()))',
      t || '_borrar', t);

    -- La política restrictiva por tipo de negocio (ya existente) se conserva tal cual;
    -- se recrea solo si faltara.
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t AND policyname = t || '_solo_tipo_actual'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual()) WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())',
        t || '_solo_tipo_actual', t);
    END IF;

    -- Sin acceso anónimo y sin privilegios que ignoran RLS.
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM authenticated', t);
  END LOOP;
END $$;
