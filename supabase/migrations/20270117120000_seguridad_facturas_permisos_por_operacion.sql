-- Facturación y permisos: la política "FOR ALL" dejaba borrar a cualquier miembro con permiso.
-- Se separa por operación igual que en la auditoría de tablas propias: el borrado queda
-- solo para el dueño del negocio (o superadmin). No borra datos.

DO $$
DECLARE
  par text[];
  t text;
  m text;
  pares text[][] := ARRAY[
    ['facturas_registros', 'facturas'],
    ['permisos_rest_registros', 'permisos_rest']
  ];
BEGIN
  FOR i IN 1 .. array_length(pares, 1) LOOP
    t := pares[i][1];
    m := pares[i][2];

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    -- Política antigua "FOR ALL" (la que permitía borrar a todo el equipo).
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

    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM authenticated', t);
  END LOOP;
END $$;
