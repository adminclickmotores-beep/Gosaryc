-- Cierre integral de seguridad:
-- 1) Superadministrador estricto (solo jhonathan.cortes.24@gmail.com con correo confirmado)
-- 2) Códigos de licencia y activación con alta entropía criptográfica (pgcrypto)
-- 3) Bloqueo RLS en ventas/facturas cuando la licencia o prueba de 30 días expire (sin afectar Demos ni Superadmin)
-- 4) Aislamiento multi-negocio en referencias cruzadas (clientes/pacientes/contactos/leads)
-- 5) Protección contra autoedición de roles, salarios, bonos y comisiones por empleados

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Verificación estricta de superadministrador en el servidor (correo confirmado)
CREATE OR REPLACE FUNCTION public.es_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM auth.users u
    WHERE u.id = auth.uid()
      AND u.email_confirmed_at IS NOT NULL
      AND lower(u.email) = 'jhonathan.cortes.24@gmail.com'
  );
$$;

-- 2. Generador criptográfico de alta entropía (128 bits) para códigos de licencia y activación
CREATE OR REPLACE FUNCTION public.generar_codigo_alta_entropia(p_prefijo text DEFAULT 'GSR')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  raw_hex text;
BEGIN
  raw_hex := upper(encode(extensions.gen_random_bytes(16), 'hex'));
  RETURN p_prefijo || '-' ||
    substr(raw_hex, 1, 6) || '-' ||
    substr(raw_hex, 7, 6) || '-' ||
    substr(raw_hex, 13, 6) || '-' ||
    substr(raw_hex, 19, 6) || '-' ||
    substr(raw_hex, 25, 8);
END;
$$;

-- Asegura que generar_clave_activacion exija superadmin y genere claves de alta entropía
DO $$
BEGIN
  IF to_regclass('public.suscripciones_negocio') IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM pg_proc p
       JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public' AND p.proname = 'generar_clave_activacion'
     ) THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.generar_clave_activacion(p_owner uuid)
      RETURNS text
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, extensions
      AS $body$
      DECLARE
        v_clave text;
      BEGIN
        IF NOT public.es_superadmin() THEN
          RAISE EXCEPTION 'Solo el superadministrador autorizado puede generar claves de activación.';
        END IF;
        v_clave := public.generar_codigo_alta_entropia('GSR');
        IF to_regclass('public.claves_activacion') IS NOT NULL THEN
          UPDATE public.claves_activacion
          SET usada = true
          WHERE owner_id = p_owner AND coalesce(usada, false) = false;

          INSERT INTO public.claves_activacion (owner_id, clave)
          VALUES (p_owner, v_clave);
        END IF;
        RETURN v_clave;
      END;
      $body$;
    $fn$;
  END IF;
END;
$$;

-- Trigger de seguridad en tablas de licencias: solo superadmin puede crear/actualizar licencias
-- y fuerza códigos de alta entropía si viene vacío o corto (< 20 caracteres).
CREATE OR REPLACE FUNCTION public.proteger_escritura_licencias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NOT public.es_superadmin() AND current_user NOT IN ('postgres', 'supabase_admin', 'service_role') THEN
    RAISE EXCEPTION 'Solo el superadministrador autorizado puede crear, activar o extender licencias.';
  END IF;

  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'licencias' THEN
    IF NEW.codigo IS NULL OR length(trim(NEW.codigo)) < 20 THEN
      NEW.codigo := public.generar_codigo_alta_entropia('LIC');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.licencias') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_proteger_licencias_superadmin'
        AND tgrelid = 'public.licencias'::regclass
    ) THEN
      CREATE TRIGGER trg_proteger_licencias_superadmin
      BEFORE INSERT OR UPDATE ON public.licencias
      FOR EACH ROW
      EXECUTE FUNCTION public.proteger_escritura_licencias();
    END IF;
  END IF;
END;
$$;

-- Trigger en suscripciones_negocio: un cliente nunca puede extenderse la fecha, cambiar su plan o reactivarse directo
CREATE OR REPLACE FUNCTION public.proteger_suscripcion_negocio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF public.es_superadmin() OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.plan IS DISTINCT FROM OLD.plan
       OR NEW.estado IS DISTINCT FROM OLD.estado
       OR NEW.vence_el IS DISTINCT FROM OLD.vence_el
       OR NEW.vence_en IS DISTINCT FROM OLD.vence_en
       OR NEW.dias_gracia IS DISTINCT FROM OLD.dias_gracia THEN
      RAISE EXCEPTION 'Solo el superadministrador puede modificar la vigencia o el plan de la suscripción.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.suscripciones_negocio') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_proteger_suscripcion_negocio'
        AND tgrelid = 'public.suscripciones_negocio'::regclass
    ) THEN
      CREATE TRIGGER trg_proteger_suscripcion_negocio
      BEFORE UPDATE ON public.suscripciones_negocio
      FOR EACH ROW
      EXECUTE FUNCTION public.proteger_suscripcion_negocio();
    END IF;
  END IF;
END;
$$;

-- 3. Validación server-side de vigencia de licencia / prueba de 30 días para RLS
-- Respeta siempre al Superadministrador y a las dos cuentas de Demo en Vivo.
CREATE OR REPLACE FUNCTION public.licencia_activa_para(p_owner uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_owner uuid;
  v_email text;
  v_creado timestamptz;
  v_sub record;
  v_limite timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  -- El superadministrador siempre tiene acceso
  IF public.es_superadmin() THEN
    RETURN true;
  END IF;

  -- Las cuentas demo en vivo nunca se bloquean
  SELECT lower(u.email) INTO v_email FROM auth.users u WHERE u.id = auth.uid();
  IF v_email IN ('demo.vehiculos@gosaryc.com', 'demo.restaurante@gosaryc.com') THEN
    RETURN true;
  END IF;

  v_owner := coalesce(p_owner, public.mi_negocio_id(), auth.uid());

  SELECT lower(u.email), u.created_at
  INTO v_email, v_creado
  FROM auth.users u
  WHERE u.id = v_owner;

  IF v_email IN ('jhonathan.cortes.24@gmail.com', 'demo.vehiculos@gosaryc.com', 'demo.restaurante@gosaryc.com') THEN
    RETURN true;
  END IF;

  IF to_regclass('public.suscripciones_negocio') IS NOT NULL THEN
    SELECT estado, vence_el, vence_en, coalesce(dias_gracia, 3) AS dias_gracia
    INTO v_sub
    FROM public.suscripciones_negocio
    WHERE owner_id = v_owner
    LIMIT 1;

    IF FOUND THEN
      IF v_sub.estado = 'suspendido' THEN
        RETURN false;
      END IF;
      v_limite := coalesce(v_sub.vence_en, (v_sub.vence_el::timestamptz + interval '1 day'))
                  + make_interval(days => greatest(0, least(30, v_sub.dias_gracia)));
      RETURN v_limite >= now();
    END IF;
  END IF;

  -- Si aún no tiene fila en suscripciones_negocio, aplica la prueba de 30 días desde el registro
  IF v_creado IS NOT NULL THEN
    RETURN (v_creado + interval '30 days') >= now();
  END IF;

  RETURN false;
END;
$$;

-- Políticas RESTRICTIVE en tablas de ventas y facturación para bloquear escritura cuando la licencia/prueba expire
DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'fac_emitidas',
    'com_ventas',
    'com_venta_items',
    'restaurante_pedidos',
    'caja_movimientos',
    'vehiculos_ventas',
    'tal_ordenes',
    'bel_atenciones',
    'cl_cobros'
  ];
  pol_ins text;
  pol_upd text;
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = t AND column_name = 'owner_id'
       ) THEN
      pol_ins := 'rls_licencia_vigente_ins_' || t;
      pol_upd := 'rls_licencia_vigente_upd_' || t;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t AND policyname = pol_ins
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.licencia_activa_para(owner_id))',
          pol_ins, t
        );
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t AND policyname = pol_upd
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.licencia_activa_para(owner_id)) WITH CHECK (public.licencia_activa_para(owner_id))',
          pol_upd, t
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- 4. Aislamiento multi-negocio en referencias cruzadas (impide enlazar clientes/pacientes/contactos de otro negocio)
CREATE OR REPLACE FUNCTION public.verificar_mismo_dueno(p_tabla text, p_ref_id uuid, p_owner uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean := false;
BEGIN
  IF p_ref_id IS NULL THEN
    RETURN true;
  END IF;
  IF to_regclass('public.' || p_tabla) IS NULL THEN
    RETURN true;
  END IF;
  EXECUTE format(
    'SELECT EXISTS (SELECT 1 FROM public.%I WHERE id = $1 AND owner_id = $2)',
    p_tabla
  ) INTO v_ok USING p_ref_id, p_owner;
  RETURN coalesce(v_ok, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_validar_aislamiento_fk()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_col text := TG_ARGV[0];
  v_tabla_ref text := TG_ARGV[1];
  v_ref_id uuid;
  v_owner uuid;
  v_json jsonb;
BEGIN
  v_json := to_jsonb(NEW);
  v_owner := coalesce((v_json ->> 'owner_id')::uuid, public.mi_negocio_id(), auth.uid());
  IF (v_json ->> v_col) IS NULL OR (v_json ->> v_col) = '' THEN
    RETURN NEW;
  END IF;
  v_ref_id := (v_json ->> v_col)::uuid;
  IF NOT public.verificar_mismo_dueno(v_tabla_ref, v_ref_id, v_owner) THEN
    RAISE EXCEPTION 'Referencia no permitida: el registro relacionado pertenece a otro negocio.';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  reglas text[][] := ARRAY[
    ARRAY['bel_citas', 'cliente_id', 'bel_clientes'],
    ARRAY['bel_citas', 'servicio_id', 'bel_servicios'],
    ARRAY['bel_fichas', 'cliente_id', 'bel_clientes'],
    ARRAY['bel_fichas', 'cita_id', 'bel_citas'],
    ARRAY['bel_atenciones', 'cliente_id', 'bel_clientes'],
    ARRAY['bel_atenciones', 'cita_id', 'bel_citas'],
    ARRAY['bel_atenciones', 'servicio_id', 'bel_servicios'],
    ARRAY['cl_historias', 'paciente_id', 'cl_pacientes'],
    ARRAY['cl_vacunas', 'paciente_id', 'cl_pacientes'],
    ARRAY['cl_citas', 'paciente_id', 'cl_pacientes'],
    ARRAY['cl_cobros', 'paciente_id', 'cl_pacientes'],
    ARRAY['gim_membresias', 'socio_id', 'gim_socios'],
    ARRAY['gim_membresias', 'plan_id', 'gim_planes'],
    ARRAY['crm_pqrs', 'lead_id', 'crm_leads'],
    ARRAY['crm_mensajes', 'lead_id', 'crm_leads'],
    ARRAY['sst_trabajadores', 'empresa_id', 'sst_empresas'],
    ARRAY['sst_evaluaciones', 'trabajador_id', 'sst_trabajadores'],
    ARRAY['sst_asistencias', 'capacitacion_id', 'sst_capacitaciones'],
    ARRAY['com_venta_items', 'venta_id', 'com_ventas'],
    ARRAY['com_venta_items', 'producto_id', 'com_productos'],
    ARRAY['com_cotizacion_items', 'cotizacion_id', 'com_cotizaciones'],
    ARRAY['com_cotizacion_items', 'producto_id', 'com_productos'],
    ARRAY['tal_fotos', 'orden_id', 'tal_ordenes'],
    ARRAY['tal_orden_repuestos', 'orden_id', 'tal_ordenes'],
    ARRAY['eve_abonos', 'evento_id', 'eve_eventos'],
    ARRAY['eve_checklist', 'evento_id', 'eve_eventos'],
    ARRAY['opt_ordenes', 'formula_id', 'opt_formulas'],
    ARRAY['nomina_liquidaciones', 'empleado_id', 'nomina_empleados']
  ];
  r text[];
  trg_name text;
BEGIN
  FOREACH r SLICE 1 IN ARRAY reglas LOOP
    IF to_regclass('public.' || r[1]) IS NOT NULL
       AND to_regclass('public.' || r[3]) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = r[1] AND column_name = r[2]
       )
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = r[1] AND column_name = 'owner_id'
       )
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = r[3] AND column_name = 'owner_id'
       ) THEN
      trg_name := 'trg_aislamiento_' || r[1] || '_' || r[2];
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = trg_name
          AND tgrelid = ('public.' || r[1])::regclass
      ) THEN
        EXECUTE format(
          'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.trg_validar_aislamiento_fk(%L, %L)',
          trg_name, r[1], r[2], r[3]
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- 5. Protección contra autoedición de roles, salarios, bonos y comisiones por empleados
CREATE OR REPLACE FUNCTION public.proteger_rol_y_permisos_empleado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF public.es_superadmin() OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'equipo_negocio' THEN
    IF NEW.owner_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Solo el dueño del negocio puede modificar roles o permisos del equipo.';
    END IF;
  ELSIF TG_TABLE_NAME = 'org_members' THEN
    IF TG_OP = 'UPDATE' AND OLD.user_id = auth.uid() AND NEW.role IS DISTINCT FROM OLD.role THEN
      RAISE EXCEPTION 'Un miembro del equipo no puede modificar su propio rol.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.equipo_negocio') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_proteger_equipo_negocio'
        AND tgrelid = 'public.equipo_negocio'::regclass
    ) THEN
      CREATE TRIGGER trg_proteger_equipo_negocio
      BEFORE INSERT OR UPDATE ON public.equipo_negocio
      FOR EACH ROW
      EXECUTE FUNCTION public.proteger_rol_y_permisos_empleado();
    END IF;
  END IF;

  IF to_regclass('public.org_members') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
      WHERE tgname = 'trg_proteger_org_members_rol'
        AND tgrelid = 'public.org_members'::regclass
    ) THEN
      CREATE TRIGGER trg_proteger_org_members_rol
      BEFORE UPDATE ON public.org_members
      FOR EACH ROW
      EXECUTE FUNCTION public.proteger_rol_y_permisos_empleado();
    END IF;
  END IF;
END;
$$;

-- Bloqueo de autoedición de comisiones/salarios/bonos: solo dueño/admin del negocio puede modificarlos
CREATE OR REPLACE FUNCTION public.proteger_comision_empleado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF public.es_superadmin() OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF NEW.owner_id = auth.uid() OR public.es_dueno_o_admin_negocio(NEW.owner_id) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(NEW) ->> 'comision') IS DISTINCT FROM (to_jsonb(OLD) ->> 'comision')
       OR (to_jsonb(NEW) ->> 'comision_pct') IS DISTINCT FROM (to_jsonb(OLD) ->> 'comision_pct')
       OR (to_jsonb(NEW) ->> 'liquidada') IS DISTINCT FROM (to_jsonb(OLD) ->> 'liquidada')
       OR (to_jsonb(NEW) ->> 'liquidacion_id') IS DISTINCT FROM (to_jsonb(OLD) ->> 'liquidacion_id') THEN
      RAISE EXCEPTION 'Un empleado no puede modificar sus propias comisiones ni liquidaciones.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  tablas_nomina text[] := ARRAY[
    'nomina_empleados',
    'nomina_liquidaciones',
    'equipo_pagos',
    'propinas_registros',
    'liquidaciones_repartidores',
    'bel_liquidaciones',
    'tal_liquidaciones',
    'cl_comisiones'
  ];
  tablas_comision text[] := ARRAY['bel_atenciones', 'tal_ordenes'];
  pol_ins text;
  pol_upd text;
BEGIN
  FOREACH t IN ARRAY tablas_nomina LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = t AND column_name = 'owner_id'
       ) THEN
      pol_ins := 'rls_solo_admin_nomina_ins_' || t;
      pol_upd := 'rls_solo_admin_nomina_upd_' || t;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t AND policyname = pol_ins
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid() OR public.es_dueno_o_admin_negocio(owner_id) OR public.es_superadmin())',
          pol_ins, t
        );
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public' AND tablename = t AND policyname = pol_upd
      ) THEN
        EXECUTE format(
          'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.es_dueno_o_admin_negocio(owner_id) OR public.es_superadmin()) WITH CHECK (owner_id = auth.uid() OR public.es_dueno_o_admin_negocio(owner_id) OR public.es_superadmin())',
          pol_upd, t
        );
      END IF;
    END IF;
  END LOOP;

  FOREACH t IN ARRAY tablas_comision LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'trg_proteger_comision_' || t
          AND tgrelid = ('public.' || t)::regclass
      ) THEN
        EXECUTE format(
          'CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.proteger_comision_empleado()',
          'trg_proteger_comision_' || t, t
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;
