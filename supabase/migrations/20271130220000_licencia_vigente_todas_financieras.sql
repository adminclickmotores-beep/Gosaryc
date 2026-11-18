-- Revisión de seguridad (18-nov-2026): la capa "licencia vigente para leer información
-- financiera" de 20271130210000 se saltaba toda tabla que tuviera alguna política creada
-- sin cláusula TO (rol "public" por defecto), aunque esa política fuera solo del dueño.
-- Resultado: muchas tablas financieras quedaban sin la restricción y una cuenta con
-- licencia vencida seguía leyéndolas.
--
-- Esta capa es RESTRICTIVA y aplica SOLO al rol authenticated: nunca toca a los visitantes
-- anónimos (menú QR, catálogo público, validación de certificados SST). Exentos por la propia
-- función: Superadmin, las 2 cuentas demo y negocios sin fila de suscripción.
-- Sin DROP de tablas ni borrado de datos.

DO $$
DECLARE
  t text;
  tablas constant text[] := ARRAY[
    -- contabilidad e impuestos
    'cuentas_contables', 'asientos_contables', 'auditoria_financiera', 'obligaciones_tributarias_negocio',
    -- caja y ventas
    'restaurante_movimientos_caja', 'turnos_caja', 'movimientos_turno', 'fac_emitidas', 'facturas_registros',
    'com_ventas', 'com_venta_items', 'far_ventas', 'ventas_veh_registros', 'pagos_digitales_registros',
    -- cartera, gastos y compras
    'gastos', 'fiados', 'cartera_veh_registros', 'vehiculo_costos', 'vehiculo_gastos', 'vehiculo_movimientos',
    'costos_veh', 'compras_vehiculos', 'compras_vehiculos_economico', 'compras_vehiculos_gastos',
    'compras_vehiculos_pagos', 'inm_gastos',
    -- nómina, comisiones y liquidaciones
    'nomina_empleados', 'nomina_liquidaciones', 'equipo_pagos', 'comisiones_registros', 'propinas_registros',
    'liquidaciones_repartidores', 'cl_cobros', 'cl_comisiones', 'bel_liquidaciones', 'tal_liquidaciones',
    'tal_comisiones', 'inm_liquidaciones', 'inm_cobros', 'tra_liquidaciones', 'tra_anticipos',
    -- cobros por sector
    'eve_abonos', 'edu_pensiones', 'hot_cargos', 'negocio_traslados'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS licencia_vigente_leer ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY licencia_vigente_leer ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING ((SELECT public.licencia_negocio_vigente()))',
      t);
  END LOOP;
END $$;
