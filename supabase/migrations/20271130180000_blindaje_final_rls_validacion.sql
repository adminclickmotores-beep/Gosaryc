-- Blindaje final de la Comprobación de seguridad avanzada (18-nov-2026).
-- 1. Permisos de acceso y datos privados: capa RESTRICTIVA de aislamiento por negocio
--    sobre las tablas sensibles de clientes, ventas, contabilidad, nómina, salud y SST.
--    Una política restrictiva se suma (AND) a las que ya existen: si alguna regla
--    antigua quedara demasiado abierta, igual exige que la fila sea del negocio de la
--    cuenta (owner_id = mi_negocio_id(), que para el dueño es auth.uid() y para su
--    equipo es el dueño) o que quien consulta sea el Superadmin.
--    Excepciones automáticas (NO se bloquean):
--      * Tablas con lectura o creación pública (menú QR, catálogo, pedidos del menú,
--        formularios públicos): se detectan por sus políticas para anon/public y en
--        esa operación no se agrega la capa, para no romper el flujo público.
--      * Validación pública de certificados SST: es la función sst_validar_certificado
--        (SECURITY DEFINER), no pasa por estas políticas.
--      * Cuentas demo: sus datos tienen su propio owner_id y las siembras son funciones
--        SECURITY DEFINER; no cambian.
-- 2. Datos introducidos por el usuario: límites de longitud y formato en el formulario
--    público de solicitudes (campaign_requests). Los pedidos públicos ya se validan con
--    los triggers de 20271130170000.
-- Sin DROP de tablas ni borrado de datos. Solo se crean políticas nuevas.

DO $$
DECLARE
  t text;
  cond constant text :=
    '(owner_id = (SELECT public.mi_negocio_id()) OR (SELECT public.es_superadmin()))';
  publico_lee boolean;
  publico_inserta boolean;
  publico_edita boolean;
  publico_borra boolean;
  tablas constant text[] := ARRAY[
    -- Clientes
    'restaurante_clientes', 'bel_clientes', 'gim_socios', 'gim_membresias', 'cl_pacientes',
    'hot_huespedes', 'edu_estudiantes', 'fiados', 'solicitudes_credito', 'cotizaciones',
    'cotizaciones_vehiculo', 'agenda_citas', 'cl_citas', 'bel_citas', 'com_cupos',
    -- Ventas y caja
    'restaurante_pedidos', 'restaurante_pedido_items', 'restaurante_movimientos_caja',
    'turnos_caja', 'movimientos_turno', 'com_ventas', 'com_venta_items', 'com_cotizaciones',
    'com_cotizacion_items', 'far_ventas', 'fac_emitidas', 'facturas_registros',
    'propinas_registros', 'pagos_digitales_registros', 'ventas_veh_registros',
    'cartera_veh_registros', 'cl_cobros', 'hot_reservas', 'hot_cargos', 'edu_pensiones',
    'inm_contratos', 'inm_cobros', 'eve_eventos', 'eve_abonos', 'liquidaciones_repartidores',
    'tal_ordenes', 'lav_ordenes', 'prof_casos', 'tec_proyectos', 'pap_encargos', 'joy_piezas',
    'lic_domicilios', 'parq_turnos', 'pan_encargos',
    -- Contabilidad
    'cuentas_contables', 'asientos_contables', 'auditoria_financiera',
    'obligaciones_tributarias_negocio', 'inm_liquidaciones', 'tra_liquidaciones', 'tra_anticipos',
    -- Nómina y comisiones
    'nomina_empleados', 'nomina_liquidaciones', 'equipo_pagos', 'comisiones_registros',
    'bel_liquidaciones', 'cl_comisiones', 'tal_liquidaciones',
    -- Salud (clínica, óptica, valoraciones) y auditoría clínica
    'cl_historias', 'cl_notas_aclaratorias', 'cl_vacunas', 'opt_formulas', 'opt_ordenes',
    'auditoria_clinica', 'gim_valoraciones', 'bel_fichas', 'bel_atenciones',
    -- Salud ocupacional (SG-SST)
    'sst_empresas', 'sst_trabajadores', 'sst_evaluaciones', 'sst_profesiogramas',
    'sst_estandares', 'sst_atel', 'sst_ausentismo', 'sst_capacitaciones', 'sst_asistencias'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    -- Solo tablas que existen y que guardan el negocio dueño en owner_id.
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = t AND column_name = 'owner_id'
    ) THEN CONTINUE; END IF;

    -- ¿Qué operaciones tiene abiertas al público (menú QR, formularios)?
    SELECT
      bool_or(p.cmd IN ('SELECT', 'ALL')),
      bool_or(p.cmd IN ('INSERT', 'ALL')),
      bool_or(p.cmd IN ('UPDATE', 'ALL')),
      bool_or(p.cmd IN ('DELETE', 'ALL'))
      INTO publico_lee, publico_inserta, publico_edita, publico_borra
      FROM pg_policies p
     WHERE p.schemaname = 'public' AND p.tablename = t
       AND p.roles && ARRAY['anon', 'public']::name[];
    publico_lee := coalesce(publico_lee, false);
    publico_inserta := coalesce(publico_inserta, false);
    publico_edita := coalesce(publico_edita, false);
    publico_borra := coalesce(publico_borra, false);

    -- Si la tabla no tuviera ninguna política permisiva, se crea la del propio negocio
    -- (una restrictiva sola no daría acceso a nadie).
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies p
       WHERE p.schemaname = 'public' AND p.tablename = t AND p.permissive = 'PERMISSIVE'
    ) THEN
      EXECUTE format(
        'CREATE POLICY blindaje_propietario_base ON public.%I FOR ALL TO authenticated USING %s WITH CHECK %s',
        t, cond, cond);
    END IF;

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    IF NOT publico_lee THEN
      EXECUTE format('DROP POLICY IF EXISTS blindaje_propietario_leer ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY blindaje_propietario_leer ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING %s',
        t, cond);
    END IF;

    IF NOT publico_inserta THEN
      EXECUTE format('DROP POLICY IF EXISTS blindaje_propietario_crear ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY blindaje_propietario_crear ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK %s',
        t, cond);
    END IF;

    IF NOT publico_edita THEN
      EXECUTE format('DROP POLICY IF EXISTS blindaje_propietario_editar ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY blindaje_propietario_editar ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING %s WITH CHECK %s',
        t, cond, cond);
    END IF;

    IF NOT publico_borra THEN
      EXECUTE format('DROP POLICY IF EXISTS blindaje_propietario_borrar ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY blindaje_propietario_borrar ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING %s',
        t, cond);
    END IF;

    -- Sin ninguna regla pública: el visitante sin sesión no tiene ningún permiso.
    IF NOT (publico_lee OR publico_inserta OR publico_edita OR publico_borra) THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 2. Formulario público de solicitudes: longitud y formato
--    (NOT VALID: no revisa filas antiguas, solo las nuevas).
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.campaign_requests') IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'campaign_requests_validacion_publica') THEN
    ALTER TABLE public.campaign_requests
      ADD CONSTRAINT campaign_requests_validacion_publica CHECK (
        char_length(brief) BETWEEN 10 AND 4000
        AND char_length(requestor_email) <= 254
        AND requestor_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
        AND (requestor_name IS NULL OR char_length(requestor_name) <= 120)
      ) NOT VALID;
  END IF;
END $$;
