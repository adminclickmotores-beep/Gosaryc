-- 1. Rota de nuevo la clave de las demos (la anterior estuvo en el historial del repositorio). Entran solo con enlace de un solo uso.
UPDATE auth.users
SET encrypted_password = extensions.crypt(gen_random_uuid()::text || gen_random_uuid()::text, extensions.gen_salt('bf')),
    updated_at = now()
WHERE lower(email) IN ('demo.vehiculos@gosaryc.com', 'demo.restaurante@gosaryc.com');

-- 2. Licencia vigente: sin fila de suscripción ya NO es "vigente" (antes bastaba no tenerla para saltarse el vencimiento).
--    Solo quien aún no pertenece a ningún negocio (sin datos que proteger) pasa.
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
    OR public.mi_negocio_id() IS NULL
    OR coalesce(
      (SELECT s.estado = 'activo' AND s.vence_en > now()
         FROM public.suscripciones_negocio s
        WHERE s.owner_id = public.mi_negocio_id()),
      false)
  );
$$;
REVOKE ALL ON FUNCTION public.licencia_negocio_vigente() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.licencia_negocio_vigente() TO authenticated;

-- 3. Todo negocio existente tiene su suscripción (prueba de 14 días solo si no tenía).
INSERT INTO public.suscripciones_negocio (owner_id)
SELECT DISTINCT owner_id FROM public.negocio_config WHERE owner_id IS NOT NULL
ON CONFLICT (owner_id) DO NOTHING;

-- 4. Con licencia vencida tampoco se puede escribir en las tablas financieras.
DO $$
DECLARE
  t text;
  tablas constant text[] := ARRAY[
    'cuentas_contables', 'asientos_contables', 'restaurante_movimientos_caja', 'turnos_caja',
    'movimientos_turno', 'fac_emitidas', 'facturas_registros', 'gastos', 'fiados',
    'nomina_empleados', 'nomina_liquidaciones', 'equipo_pagos', 'comisiones_registros',
    'pagos_digitales_registros', 'liquidaciones_repartidores', 'com_ventas', 'com_venta_items',
    'vehiculo_costos', 'cl_cobros', 'inm_cobros', 'eve_abonos', 'edu_pensiones', 'hot_cargos'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS licencia_vigente_insertar ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS licencia_vigente_editar ON public.%I', t);
      EXECUTE format('CREATE POLICY licencia_vigente_insertar ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT public.licencia_negocio_vigente()))', t);
      EXECUTE format('CREATE POLICY licencia_vigente_editar ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT public.licencia_negocio_vigente())) WITH CHECK ((SELECT public.licencia_negocio_vigente()))', t);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Licencia escritura en %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;
