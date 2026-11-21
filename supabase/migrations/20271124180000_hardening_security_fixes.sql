-- Comprehensive Security Hardening Migration
-- Fixes all 6 security findings with zero invalid column references and zero dynamic SQL injection:
-- 1. Prevent users from awarding themselves a role, money, or a win (org_members, campaign_variants, equipo_negocio, claves_activacion, suscripciones_negocio, pagos_licencia).
-- 2. Enforce license expiry on all sales tables (restrictive RLS + BEFORE INSERT trigger using real suscripciones_negocio columns).
-- 3. Prevent staff from inflating commissions (server-side calculation/capping + locking bel_servicios/cl_servicios/cl_comisiones/tal_ordenes/bel_atenciones).
-- 4. Prevent guessing desktop license codes (high-entropy 100-bit codes, salted SHA-256 hashes, constant-time compare, rate limiting, no unauthenticated code leaks).
-- 5. Lock platform support access (server-verified soporte_plataforma table + locked tickets_soporte RLS + hardened reclamar_acceso).
-- 6. Prevent workspace/business members from linking another business's customer, patient, lead, or org resource (static allowlist FK ownership triggers).

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- 0. HARDEN registro_es_del_negocio & verificar_mismo_dueno (NO CALLER-SHAPED SQL)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.registro_es_del_negocio(
  p_tabla text,
  p_id uuid,
  p_owner uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_owner uuid;
BEGIN
  IF auth.uid() IS NULL OR p_id IS NULL OR p_owner IS NULL THEN
    RETURN false;
  END IF;

  IF NOT public.es_superadmin() THEN
    v_caller_owner := public.mi_negocio_id();
    IF v_caller_owner IS NULL OR (v_caller_owner <> p_owner AND auth.uid() <> p_owner) THEN
      RETURN false;
    END IF;
  END IF;

  CASE p_tabla
    WHEN 'negocio_config' THEN
      RETURN EXISTS (SELECT 1 FROM public.negocio_config WHERE id = p_id AND owner_id = p_owner);
    WHEN 'restaurante_clientes' THEN
      RETURN EXISTS (SELECT 1 FROM public.restaurante_clientes WHERE id = p_id AND owner_id = p_owner);
    WHEN 'restaurante_productos' THEN
      RETURN EXISTS (SELECT 1 FROM public.restaurante_productos WHERE id = p_id AND owner_id = p_owner);
    WHEN 'restaurante_pedidos' THEN
      RETURN EXISTS (SELECT 1 FROM public.restaurante_pedidos WHERE id = p_id AND owner_id = p_owner);
    WHEN 'com_productos' THEN
      RETURN EXISTS (SELECT 1 FROM public.com_productos WHERE id = p_id AND owner_id = p_owner);
    WHEN 'com_ventas' THEN
      RETURN EXISTS (SELECT 1 FROM public.com_ventas WHERE id = p_id AND owner_id = p_owner);
    WHEN 'vehiculos_inventario' THEN
      RETURN EXISTS (SELECT 1 FROM public.vehiculos_inventario WHERE id = p_id AND owner_id = p_owner);
    WHEN 'tal_ordenes' THEN
      RETURN EXISTS (SELECT 1 FROM public.tal_ordenes WHERE id = p_id AND owner_id = p_owner);
    WHEN 'tal_repuestos' THEN
      RETURN EXISTS (SELECT 1 FROM public.tal_repuestos WHERE id = p_id AND owner_id = p_owner);
    WHEN 'bel_clientes' THEN
      RETURN EXISTS (SELECT 1 FROM public.bel_clientes WHERE id = p_id AND owner_id = p_owner);
    WHEN 'bel_servicios' THEN
      RETURN EXISTS (SELECT 1 FROM public.bel_servicios WHERE id = p_id AND owner_id = p_owner);
    WHEN 'bel_citas' THEN
      RETURN EXISTS (SELECT 1 FROM public.bel_citas WHERE id = p_id AND owner_id = p_owner);
    WHEN 'cl_pacientes' THEN
      RETURN EXISTS (SELECT 1 FROM public.cl_pacientes WHERE id = p_id AND owner_id = p_owner);
    WHEN 'crm_leads' THEN
      RETURN EXISTS (SELECT 1 FROM public.crm_leads WHERE id = p_id AND owner_id = p_owner);
    WHEN 'edu_estudiantes' THEN
      RETURN EXISTS (SELECT 1 FROM public.edu_estudiantes WHERE id = p_id AND owner_id = p_owner);
    WHEN 'sst_empresas' THEN
      RETURN EXISTS (SELECT 1 FROM public.sst_empresas WHERE id = p_id AND owner_id = p_owner);
    WHEN 'sst_trabajadores' THEN
      RETURN EXISTS (SELECT 1 FROM public.sst_trabajadores WHERE id = p_id AND owner_id = p_owner);
    ELSE
      RETURN false;
  END CASE;
END;
$$;

REVOKE ALL ON FUNCTION public.registro_es_del_negocio(text, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.registro_es_del_negocio(text, uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.verificar_mismo_dueno()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tabla text := lower(trim(COALESCE(TG_ARGV[0], '')));
  v_col text := lower(trim(COALESCE(TG_ARGV[1], '')));
  v_row jsonb := to_jsonb(NEW);
  v_ref_text text;
  v_ref_id uuid;
  v_owner uuid;
  v_caller_owner uuid;
BEGIN
  IF jsonb_typeof(v_row) <> 'object' THEN
    RAISE EXCEPTION 'Registro inválido';
  END IF;

  v_owner := NULLIF(v_row ->> 'owner_id', '')::uuid;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Falta el propietario del registro';
  END IF;

  IF auth.uid() IS NOT NULL AND NOT public.es_superadmin() THEN
    v_caller_owner := public.mi_negocio_id();
    IF v_caller_owner IS NULL OR (v_caller_owner <> v_owner AND auth.uid() <> v_owner) THEN
      RAISE EXCEPTION 'No autorizado para operar sobre otro negocio';
    END IF;
  END IF;

  IF v_col = '' OR v_col !~ '^[a-z][a-z0-9_]{0,62}$' THEN
    RAISE EXCEPTION 'Columna de referencia inválida';
  END IF;

  v_ref_text := NULLIF(v_row ->> v_col, '');
  IF v_ref_text IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_ref_id := v_ref_text::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RAISE EXCEPTION 'Identificador de referencia inválido';
  END;

  IF NOT public.registro_es_del_negocio(v_tabla, v_ref_id, v_owner) THEN
    RAISE EXCEPTION 'El registro referenciado no pertenece a este negocio';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT oid::regprocedure AS sig
    FROM pg_proc
    WHERE proname = 'verificar_mismo_dueno'
      AND pronamespace = 'public'::regnamespace
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- ============================================================================
-- 1. PREVENT USERS FROM AWARDING THEMSELVES A ROLE, MONEY, OR A WIN
-- ============================================================================
-- 1a. Lock org_members so users cannot self-promote to owner/admin or join arbitrary orgs
DO $$
DECLARE
  pol record;
BEGIN
  IF to_regclass('public.org_members') IS NOT NULL THEN
    ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'org_members'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.org_members', pol.policyname);
    END LOOP;

    CREATE POLICY "org_members_select_member"
      ON public.org_members
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid() OR public.is_org_member(org_id));

    CREATE POLICY "org_members_insert_owner_or_bootstrap"
      ON public.org_members
      FOR INSERT
      TO authenticated
      WITH CHECK (
        public.has_org_role(org_id, 'owner'::public.org_role)
        OR (
          user_id = auth.uid()
          AND role = 'owner'::public.org_role
          AND NOT EXISTS (SELECT 1 FROM public.org_members om WHERE om.org_id = org_members.org_id)
        )
      );

    CREATE POLICY "org_members_update_owner_only"
      ON public.org_members
      FOR UPDATE
      TO authenticated
      USING (public.has_org_role(org_id, 'owner'::public.org_role))
      WITH CHECK (public.has_org_role(org_id, 'owner'::public.org_role));

    CREATE POLICY "org_members_delete_owner_or_self"
      ON public.org_members
      FOR DELETE
      TO authenticated
      USING (public.has_org_role(org_id, 'owner'::public.org_role) OR user_id = auth.uid());
  END IF;
END $$;

-- 1b. Prevent non-owners/non-admins from marking campaign_variants.is_winner = true
CREATE OR REPLACE FUNCTION public.proteger_ganador_campana()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.es_superadmin() THEN
    IF (TG_OP = 'INSERT' AND NEW.is_winner = true)
       OR (TG_OP = 'UPDATE' AND NEW.is_winner IS DISTINCT FROM OLD.is_winner) THEN
      IF NOT public.has_org_role_any(NEW.org_id, ARRAY['owner'::public.org_role, 'admin'::public.org_role]) THEN
        RAISE EXCEPTION 'Solo administradores de la organización pueden declarar una variante ganadora';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.campaign_variants') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_proteger_ganador_campana ON public.campaign_variants;
    CREATE TRIGGER trg_proteger_ganador_campana
      BEFORE INSERT OR UPDATE ON public.campaign_variants
      FOR EACH ROW
      EXECUTE FUNCTION public.proteger_ganador_campana();
  END IF;
END $$;

-- 1c. Lock equipo_negocio so staff cannot edit their own modules/roles
DO $$
DECLARE
  pol record;
BEGIN
  IF to_regclass('public.equipo_negocio') IS NOT NULL THEN
    ALTER TABLE public.equipo_negocio ENABLE ROW LEVEL SECURITY;
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'equipo_negocio'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.equipo_negocio', pol.policyname);
    END LOOP;

    CREATE POLICY "equipo_negocio_select_own_or_admin"
      ON public.equipo_negocio
      FOR SELECT
      TO authenticated
      USING (
        user_id = auth.uid()
        OR public.es_superadmin()
        OR public.es_dueno_o_admin_negocio(public.mi_negocio_id())
      );

    CREATE POLICY "equipo_negocio_manage_admin_only"
      ON public.equipo_negocio
      FOR ALL
      TO authenticated
      USING (public.es_superadmin() OR public.es_dueno_o_admin_negocio(public.mi_negocio_id()))
      WITH CHECK (public.es_superadmin() OR public.es_dueno_o_admin_negocio(public.mi_negocio_id()));
  END IF;
END $$;

-- 1d. Lock suscripciones_negocio, pagos_licencia, and claves_activacion
DO $$
DECLARE
  pol record;
BEGIN
  IF to_regclass('public.suscripciones_negocio') IS NOT NULL THEN
    ALTER TABLE public.suscripciones_negocio ENABLE ROW LEVEL SECURITY;
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suscripciones_negocio'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.suscripciones_negocio', pol.policyname);
    END LOOP;

    CREATE POLICY "suscripciones_negocio_select_owner"
      ON public.suscripciones_negocio
      FOR SELECT
      TO authenticated
      USING (owner_id = auth.uid() OR owner_id = public.mi_negocio_id() OR public.es_superadmin());

    CREATE POLICY "suscripciones_negocio_admin_insert"
      ON public.suscripciones_negocio
      FOR INSERT
      TO authenticated
      WITH CHECK (public.es_superadmin());

    CREATE POLICY "suscripciones_negocio_admin_update"
      ON public.suscripciones_negocio
      FOR UPDATE
      TO authenticated
      USING (public.es_superadmin())
      WITH CHECK (public.es_superadmin());

    CREATE POLICY "suscripciones_negocio_admin_delete"
      ON public.suscripciones_negocio
      FOR DELETE
      TO authenticated
      USING (public.es_superadmin());
  END IF;

  IF to_regclass('public.pagos_licencia') IS NOT NULL THEN
    ALTER TABLE public.pagos_licencia ENABLE ROW LEVEL SECURITY;
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pagos_licencia'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.pagos_licencia', pol.policyname);
    END LOOP;

    CREATE POLICY "pagos_licencia_select_own"
      ON public.pagos_licencia
      FOR SELECT
      TO authenticated
      USING (owner_id = auth.uid() OR public.es_superadmin());

    CREATE POLICY "pagos_licencia_insert_pending"
      ON public.pagos_licencia
      FOR INSERT
      TO authenticated
      WITH CHECK (
        owner_id = auth.uid()
        AND COALESCE(estado, 'pendiente') = 'pendiente'
        AND COALESCE(monto, 0) >= 0
      );

    CREATE POLICY "pagos_licencia_admin_update"
      ON public.pagos_licencia
      FOR UPDATE
      TO authenticated
      USING (public.es_superadmin())
      WITH CHECK (public.es_superadmin());

    CREATE POLICY "pagos_licencia_admin_delete"
      ON public.pagos_licencia
      FOR DELETE
      TO authenticated
      USING (public.es_superadmin());
  END IF;

  IF to_regclass('public.claves_activacion') IS NOT NULL THEN
    ALTER TABLE public.claves_activacion ENABLE ROW LEVEL SECURITY;
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'claves_activacion'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.claves_activacion', pol.policyname);
    END LOOP;

    CREATE POLICY "claves_activacion_superadmin_only"
      ON public.claves_activacion
      FOR ALL
      TO authenticated
      USING (public.es_superadmin())
      WITH CHECK (public.es_superadmin());
  END IF;
END $$;

-- Prevent anon from calling subscription RPCs
DO $$
DECLARE
  fn text;
  r record;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'admin_actualizar_suscripcion',
    'aprobar_pago_licencia',
    'aprobar_pase_dias_licencia',
    'admin_rechazar_pago_licencia',
    'generar_clave_activacion',
    'activar_licencia'
  ] LOOP
    FOR r IN
      SELECT oid::regprocedure AS sig
      FROM pg_proc
      WHERE proname = fn AND pronamespace = 'public'::regnamespace
    LOOP
      EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    END LOOP;
  END LOOP;
END $$;

-- ============================================================================
-- 2. ENFORCE LICENSE EXPIRY ON ALL SALES (STRICT EXPIRY CHECK + RLS + TRIGGER)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.licencia_activa_para(p_owner uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activa boolean := false;
BEGIN
  IF p_owner IS NULL THEN
    RETURN false;
  END IF;
  IF public.es_superadmin() THEN
    RETURN true;
  END IF;

  IF to_regclass('public.suscripciones_negocio') IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.suscripciones_negocio s
    WHERE s.owner_id = p_owner
      AND s.estado = 'activo'
      AND (s.vence_en IS NULL OR s.vence_en >= now())
      AND (s.vence_el IS NULL OR s.vence_el >= current_date)
      AND (s.vence_en IS NOT NULL OR s.vence_el IS NOT NULL)
  )
  INTO v_activa;

  RETURN COALESCE(v_activa, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.exigir_licencia_activa_venta()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  v_owner := NULLIF(to_jsonb(NEW) ->> 'owner_id', '')::uuid;
  IF v_owner IS NULL THEN
    v_owner := public.mi_negocio_id();
  END IF;

  IF v_owner IS NULL OR NOT public.licencia_activa_para(v_owner) THEN
    RAISE EXCEPTION 'Tu licencia ha vencido o está inactiva. Renuévala para registrar nuevas ventas.';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  tablas_venta text[] := ARRAY[
    'restaurante_pedidos',
    'com_ventas',
    'fac_emitidas',
    'bel_atenciones',
    'far_ventas',
    'tal_ordenes',
    'cl_cobros',
    'gim_membresias',
    'hot_reservas',
    'edu_pensiones',
    'opt_ordenes',
    'eve_abonos',
    'agr_cosechas',
    'lav_ordenes',
    'lic_domicilios',
    'parq_turnos',
    'ventas_veh_registros'
  ];
BEGIN
  FOREACH t IN ARRAY tablas_venta LOOP
    IF to_regclass('public.' || t) IS NOT NULL AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'owner_id'
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'restrict_licencia_activa_' || t, t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.licencia_activa_para(owner_id))',
        'restrict_licencia_activa_' || t,
        t
      );

      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_licencia_activa_' || t, t);
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.exigir_licencia_activa_venta()',
        'trg_licencia_activa_' || t,
        t
      );
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 3. PREVENT STAFF FROM INFLATING COMMISSIONS (SERVER-SIDE CALC & CAP)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.proteger_comision_staff()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new jsonb := to_jsonb(NEW);
  v_old jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  v_owner uuid := NULLIF(v_new ->> 'owner_id', '')::uuid;
  v_es_admin boolean := false;
  v_pct numeric := 0;
  v_base numeric := 0;
  v_svc_pct numeric := NULL;
  v_svc_id uuid := NULL;
BEGIN
  IF v_owner IS NULL THEN
    v_owner := public.mi_negocio_id();
  END IF;

  v_es_admin := public.es_superadmin() OR (v_owner IS NOT NULL AND public.es_dueno_o_admin_negocio(v_owner));

  -- Non-admin staff can NEVER modify service commission rates
  IF TG_TABLE_NAME IN ('bel_servicios', 'cl_servicios') THEN
    IF NOT v_es_admin THEN
      IF (TG_OP = 'INSERT' AND COALESCE(NULLIF(v_new ->> 'comision_pct', '')::numeric, 0) <> 0)
         OR (TG_OP = 'UPDATE' AND (v_new ->> 'comision_pct') IS DISTINCT FROM (v_old ->> 'comision_pct')) THEN
        RAISE EXCEPTION 'Solo el administrador del negocio puede configurar porcentajes de comisión';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  -- Non-admin staff can NEVER directly insert/update commission ledger tables
  IF TG_TABLE_NAME IN ('cl_comisiones', 'comisiones_registros') THEN
    IF NOT v_es_admin AND auth.uid() IS NOT NULL THEN
      RAISE EXCEPTION 'Solo el administrador del negocio puede registrar o modificar comisiones';
    END IF;
    RETURN NEW;
  END IF;

  -- Non-admin staff can NEVER modify commission fields on UPDATE
  IF TG_OP = 'UPDATE' AND NOT v_es_admin THEN
    IF (v_new ? 'comision_pct' AND (v_new ->> 'comision_pct') IS DISTINCT FROM (v_old ->> 'comision_pct'))
       OR (v_new ? 'comision' AND (v_new ->> 'comision') IS DISTINCT FROM (v_old ->> 'comision'))
       OR (v_new ? 'comision_total' AND (v_new ->> 'comision_total') IS DISTINCT FROM (v_old ->> 'comision_total'))
       OR (v_new ? 'liquidada' AND (v_new ->> 'liquidada') IS DISTINCT FROM (v_old ->> 'liquidada')) THEN
      RAISE EXCEPTION 'Solo el administrador del negocio puede modificar comisiones';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'bel_atenciones' THEN
    IF NOT v_es_admin THEN
      v_svc_id := NULLIF(v_new ->> 'servicio_id', '')::uuid;
      IF v_svc_id IS NOT NULL AND to_regclass('public.bel_servicios') IS NOT NULL THEN
        SELECT s.comision_pct INTO v_svc_pct
        FROM public.bel_servicios s
        WHERE s.id = v_svc_id AND s.owner_id = v_owner;
      END IF;
      v_pct := LEAST(GREATEST(COALESCE(v_svc_pct, 0), 0), 50);
    ELSE
      v_pct := LEAST(GREATEST(COALESCE(NULLIF(v_new ->> 'comision_pct', '')::numeric, 0), 0), 100);
    END IF;
    v_base := GREATEST(COALESCE(NULLIF(v_new ->> 'precio', '')::numeric, 0), 0);
    NEW := jsonb_populate_record(NEW, jsonb_build_object(
      'comision_pct', v_pct,
      'comision', ROUND(v_base * v_pct / 100.0, 2)
    ));
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'tal_ordenes' THEN
    IF NOT v_es_admin THEN
      v_pct := 0;
    ELSE
      v_pct := LEAST(GREATEST(COALESCE(NULLIF(v_new ->> 'comision_pct', '')::numeric, 0), 0), 100);
    END IF;
    v_base := GREATEST(COALESCE(NULLIF(v_new ->> 'mano_obra', '')::numeric, 0), 0);
    NEW := jsonb_populate_record(NEW, jsonb_build_object(
      'comision_pct', v_pct,
      'comision', ROUND(v_base * v_pct / 100.0, 2)
    ));
    RETURN NEW;
  END IF;

  IF v_new ? 'comision_pct' THEN
    v_pct := CASE
      WHEN v_es_admin THEN LEAST(GREATEST(COALESCE(NULLIF(v_new ->> 'comision_pct', '')::numeric, 0), 0), 100)
      ELSE 0
    END;
    NEW := jsonb_populate_record(NEW, jsonb_build_object('comision_pct', v_pct));
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT table_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND (
        column_name IN ('comision_pct', 'comision', 'comision_total')
        OR table_name IN ('cl_comisiones', 'comisiones_registros')
      )
      AND table_name NOT IN ('bel_liquidaciones', 'tal_liquidaciones', 'inm_liquidaciones')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_proteger_comision_' || r.table_name, r.table_name);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.proteger_comision_staff()',
      'trg_proteger_comision_' || r.table_name,
      r.table_name
    );
  END LOOP;
END $$;

-- ============================================================================
-- 4. HARDEN DESKTOP LICENSE CODES (HIGH ENTROPY, SALTED HASH, RATE LIMITING)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.licencia_intentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clave_origen text NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_licencia_intentos_origen_fecha
  ON public.licencia_intentos (clave_origen, creado_en DESC);

ALTER TABLE public.licencia_intentos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.comparar_constante(a text, b text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  ba bytea;
  bb bytea;
  len int;
  diff int := 0;
  i int;
BEGIN
  IF a IS NULL OR b IS NULL THEN
    RETURN false;
  END IF;
  ba := convert_to(a, 'UTF8');
  bb := convert_to(b, 'UTF8');
  IF octet_length(ba) <> octet_length(bb) THEN
    RETURN false;
  END IF;
  len := octet_length(ba);
  FOR i IN 0..(len - 1) LOOP
    diff := diff | (get_byte(ba, i) # get_byte(bb, i));
  END LOOP;
  RETURN diff = 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.generar_codigo_alta_entropia(p_prefijo text DEFAULT 'GOS')
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alfabeto constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  bytes bytea := extensions.gen_random_bytes(20);
  raw_code text := '';
  pref text := regexp_replace(upper(COALESCE(NULLIF(trim(p_prefijo), ''), 'GOS')), '[^A-Z0-9]', '', 'g');
  i int;
BEGIN
  IF length(pref) = 0 THEN
    pref := 'GOS';
  END IF;
  FOR i IN 0..19 LOOP
    raw_code := raw_code || substr(alfabeto, (get_byte(bytes, i) % 32) + 1, 1);
  END LOOP;
  RETURN pref || '-' || substr(raw_code, 1, 5) || '-' || substr(raw_code, 6, 5) || '-' || substr(raw_code, 11, 5) || '-' || substr(raw_code, 16, 5);
END;
$$;

DO $$
DECLARE
  pol record;
BEGIN
  IF to_regclass('public.licencias') IS NOT NULL THEN
    ALTER TABLE public.licencias ADD COLUMN IF NOT EXISTS codigo_salt text;
    ALTER TABLE public.licencias ADD COLUMN IF NOT EXISTS codigo_hash text;

    UPDATE public.licencias
    SET codigo_salt = encode(extensions.gen_random_bytes(16), 'hex')
    WHERE codigo_salt IS NULL;

    UPDATE public.licencias
    SET codigo_hash = encode(extensions.digest(codigo_salt || ':' || upper(trim(codigo)), 'sha256'), 'hex')
    WHERE codigo IS NOT NULL AND codigo_hash IS NULL;

    ALTER TABLE public.licencias ENABLE ROW LEVEL SECURITY;
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'licencias'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.licencias', pol.policyname);
    END LOOP;

    CREATE POLICY "licencias_superadmin_all"
      ON public.licencias
      FOR ALL
      TO authenticated
      USING (public.es_superadmin())
      WITH CHECK (public.es_superadmin());
  END IF;

  IF to_regclass('public.solicitudes_licencia') IS NOT NULL THEN
    ALTER TABLE public.solicitudes_licencia ENABLE ROW LEVEL SECURITY;
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'solicitudes_licencia'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.solicitudes_licencia', pol.policyname);
    END LOOP;

    CREATE POLICY "solicitudes_licencia_superadmin_all"
      ON public.solicitudes_licencia
      FOR ALL
      TO authenticated
      USING (public.es_superadmin())
      WITH CHECK (public.es_superadmin());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.licencias_mantener_hash()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo IS NULL OR length(trim(NEW.codigo)) < 16 THEN
    NEW.codigo := public.generar_codigo_alta_entropia('GOS');
  END IF;
  IF NEW.codigo_salt IS NULL OR length(NEW.codigo_salt) < 16 THEN
    NEW.codigo_salt := encode(extensions.gen_random_bytes(16), 'hex');
  END IF;
  NEW.codigo_hash := encode(extensions.digest(NEW.codigo_salt || ':' || upper(trim(NEW.codigo)), 'sha256'), 'hex');
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.licencias') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_licencias_mantener_hash ON public.licencias;
    CREATE TRIGGER trg_licencias_mantener_hash
      BEFORE INSERT OR UPDATE ON public.licencias
      FOR EACH ROW
      EXECUTE FUNCTION public.licencias_mantener_hash();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.verificar_licencia_equipo(
  p_codigo text,
  p_equipo text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_origen text := COALESCE(NULLIF(trim(p_equipo), ''), COALESCE(auth.uid()::text, 'anon'));
  v_intentos int := 0;
  v_norm text := upper(trim(COALESCE(p_codigo, '')));
  v_eq text := trim(COALESCE(p_equipo, ''));
  v_rec record;
  v_encontrada record;
  v_match boolean := false;
BEGIN
  DELETE FROM public.licencia_intentos WHERE creado_en < now() - interval '24 hours';

  SELECT count(*) INTO v_intentos
  FROM public.licencia_intentos
  WHERE clave_origen = v_origen
    AND creado_en >= now() - interval '15 minutes';

  IF v_intentos >= 5 THEN
    RETURN jsonb_build_object('valida', false, 'motivo', 'demasiados_intentos');
  END IF;

  IF length(v_norm) < 8 OR length(v_eq) < 4 THEN
    INSERT INTO public.licencia_intentos (clave_origen) VALUES (v_origen);
    RETURN jsonb_build_object('valida', false, 'motivo', 'no_existe');
  END IF;

  FOR v_rec IN
    SELECT id, estado, vence_el, equipo_id, codigo_salt, codigo_hash
    FROM public.licencias
    WHERE codigo_salt IS NOT NULL AND codigo_hash IS NOT NULL
  LOOP
    IF public.comparar_constante(
      v_rec.codigo_hash,
      encode(extensions.digest(v_rec.codigo_salt || ':' || v_norm, 'sha256'), 'hex')
    ) THEN
      v_encontrada := v_rec;
      v_match := true;
      EXIT;
    END IF;
  END LOOP;

  IF NOT v_match THEN
    INSERT INTO public.licencia_intentos (clave_origen) VALUES (v_origen);
    RETURN jsonb_build_object('valida', false, 'motivo', 'no_existe');
  END IF;

  IF v_encontrada.estado IS DISTINCT FROM 'activa' THEN
    RETURN jsonb_build_object('valida', false, 'motivo', 'suspendida');
  END IF;

  IF v_encontrada.vence_el IS NOT NULL AND v_encontrada.vence_el < current_date THEN
    RETURN jsonb_build_object('valida', false, 'motivo', 'vencida');
  END IF;

  IF v_encontrada.equipo_id IS NOT NULL AND v_encontrada.equipo_id <> '' AND v_encontrada.equipo_id <> v_eq THEN
    INSERT INTO public.licencia_intentos (clave_origen) VALUES (v_origen);
    RETURN jsonb_build_object('valida', false, 'motivo', 'otro_equipo');
  END IF;

  IF v_encontrada.equipo_id IS NULL OR v_encontrada.equipo_id = '' THEN
    UPDATE public.licencias SET equipo_id = v_eq WHERE id = v_encontrada.id;
  END IF;

  RETURN jsonb_build_object('valida', true, 'motivo', 'ok');
END;
$$;

CREATE OR REPLACE FUNCTION public.verificar_licencia(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.verificar_licencia_equipo(p_codigo, COALESCE(auth.uid()::text, 'web-check'));
END;
$$;

-- Fixed: joins licencias via licencia_id (solicitudes_licencia has no codigo column) and requires authenticated matching email
CREATE OR REPLACE FUNCTION public.consultar_licencia_equipo(p_equipo text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_eq text := trim(COALESCE(p_equipo, ''));
  v_intentos int := 0;
  v_sol record;
  v_email text := lower(trim(COALESCE(auth.jwt() ->> 'email', '')));
BEGIN
  IF length(v_eq) < 4 THEN
    RETURN jsonb_build_object('estado', 'sin_solicitud');
  END IF;

  SELECT count(*) INTO v_intentos
  FROM public.licencia_intentos
  WHERE clave_origen = 'poll:' || v_eq
    AND creado_en >= now() - interval '15 minutes';

  IF v_intentos >= 20 THEN
    RETURN jsonb_build_object('estado', 'sin_solicitud');
  END IF;

  SELECT s.estado, s.correo, l.codigo
  INTO v_sol
  FROM public.solicitudes_licencia s
  LEFT JOIN public.licencias l ON l.id = s.licencia_id
  WHERE s.equipo_id = v_eq
  ORDER BY s.created_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.licencia_intentos (clave_origen) VALUES ('poll:' || v_eq);
    RETURN jsonb_build_object('estado', 'sin_solicitud');
  END IF;

  IF v_sol.estado = 'aprobada'
     AND v_sol.codigo IS NOT NULL
     AND (public.es_superadmin() OR (auth.uid() IS NOT NULL AND v_email <> '' AND lower(trim(COALESCE(v_sol.correo, ''))) = v_email)) THEN
    RETURN jsonb_build_object('estado', 'aprobada', 'codigo', v_sol.codigo);
  END IF;

  RETURN jsonb_build_object('estado', v_sol.estado);
END;
$$;

-- ============================================================================
-- 5. LOCK PLATFORM SUPPORT ACCESS (SERVER-SIDE VERIFIED APPROVAL ONLY)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.soporte_plataforma (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  aprobado boolean NOT NULL DEFAULT false,
  aprobado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.soporte_plataforma ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "soporte_plataforma_superadmin_all" ON public.soporte_plataforma;
CREATE POLICY "soporte_plataforma_superadmin_all"
  ON public.soporte_plataforma
  FOR ALL
  TO authenticated
  USING (public.es_superadmin())
  WITH CHECK (public.es_superadmin());

CREATE OR REPLACE FUNCTION public.es_soporte_plataforma()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      public.es_superadmin()
      OR EXISTS (
        SELECT 1
        FROM public.soporte_plataforma sp
        WHERE sp.user_id = auth.uid()
          AND sp.aprobado = true
      )
    );
$$;

REVOKE ALL ON FUNCTION public.es_soporte_plataforma() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.es_soporte_plataforma() TO authenticated;

DO $$
DECLARE
  pol record;
BEGIN
  IF to_regclass('public.tickets_soporte') IS NOT NULL THEN
    ALTER TABLE public.tickets_soporte ENABLE ROW LEVEL SECURITY;
    FOR pol IN
      SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tickets_soporte'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.tickets_soporte', pol.policyname);
    END LOOP;

    CREATE POLICY "tickets_soporte_select_own_or_support"
      ON public.tickets_soporte
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid() OR public.es_soporte_plataforma());

    CREATE POLICY "tickets_soporte_insert_own"
      ON public.tickets_soporte
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        AND COALESCE(estado, 'abierto') = 'abierto'
        AND respuesta IS NULL
      );

    CREATE POLICY "tickets_soporte_update_support_only"
      ON public.tickets_soporte
      FOR UPDATE
      TO authenticated
      USING (public.es_soporte_plataforma())
      WITH CHECK (public.es_soporte_plataforma());

    CREATE POLICY "tickets_soporte_delete_superadmin_only"
      ON public.tickets_soporte
      FOR DELETE
      TO authenticated
      USING (public.es_superadmin());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.reclamar_acceso()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  SELECT lower(trim(u.email)) INTO v_email
  FROM auth.users u
  WHERE u.id = v_uid;

  IF v_email IS NULL OR v_email = '' THEN
    RETURN;
  END IF;

  IF to_regclass('public.equipo_negocio') IS NOT NULL THEN
    UPDATE public.equipo_negocio
    SET user_id = v_uid
    WHERE user_id IS NULL
      AND activo = true
      AND lower(trim(email)) = v_email;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.reclamar_acceso() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reclamar_acceso() TO authenticated;

-- ============================================================================
-- 6. PREVENT LINKING ANOTHER BUSINESS'S CUSTOMER / PATIENT / LEAD / RESOURCE
-- ============================================================================
CREATE OR REPLACE FUNCTION public.verificar_referencia_mismo_negocio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row jsonb := to_jsonb(NEW);
  v_owner uuid := NULLIF(v_row ->> 'owner_id', '')::uuid;
  v_org uuid := NULLIF(v_row ->> 'org_id', '')::uuid;
  v_ref uuid;
BEGIN
  -- Business-scoped customer / patient / lead / student / worker FK checks
  IF v_owner IS NOT NULL THEN
    IF TG_TABLE_NAME = 'restaurante_pedidos' THEN
      v_ref := NULLIF(v_row ->> 'cliente_id', '')::uuid;
      IF v_ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.restaurante_clientes WHERE id = v_ref AND owner_id = v_owner) THEN
        RAISE EXCEPTION 'El cliente indicado no pertenece a este negocio';
      END IF;
    ELSIF TG_TABLE_NAME IN ('bel_citas', 'bel_fichas', 'bel_atenciones') THEN
      v_ref := NULLIF(v_row ->> 'cliente_id', '')::uuid;
      IF v_ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.bel_clientes WHERE id = v_ref AND owner_id = v_owner) THEN
        RAISE EXCEPTION 'El cliente indicado no pertenece a este negocio';
      END IF;
      v_ref := NULLIF(v_row ->> 'servicio_id', '')::uuid;
      IF v_ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.bel_servicios WHERE id = v_ref AND owner_id = v_owner) THEN
        RAISE EXCEPTION 'El servicio indicado no pertenece a este negocio';
      END IF;
    ELSIF TG_TABLE_NAME IN ('cl_historias', 'cl_notas_aclaratorias', 'cl_vacunas', 'cl_citas', 'cl_cobros') THEN
      v_ref := NULLIF(v_row ->> 'paciente_id', '')::uuid;
      IF v_ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.cl_pacientes WHERE id = v_ref AND owner_id = v_owner) THEN
        RAISE EXCEPTION 'El paciente indicado no pertenece a este negocio';
      END IF;
    ELSIF TG_TABLE_NAME IN ('crm_pqrs', 'crm_mensajes') THEN
      v_ref := NULLIF(v_row ->> 'lead_id', '')::uuid;
      IF v_ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.crm_leads WHERE id = v_ref AND owner_id = v_owner) THEN
        RAISE EXCEPTION 'El contacto indicado no pertenece a este negocio';
      END IF;
    ELSIF TG_TABLE_NAME IN ('edu_pensiones', 'edu_asistencia', 'edu_notas') THEN
      v_ref := NULLIF(v_row ->> 'estudiante_id', '')::uuid;
      IF v_ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.edu_estudiantes WHERE id = v_ref AND owner_id = v_owner) THEN
        RAISE EXCEPTION 'El estudiante indicado no pertenece a este negocio';
      END IF;
    ELSIF TG_TABLE_NAME = 'sst_trabajadores' THEN
      v_ref := NULLIF(v_row ->> 'empresa_id', '')::uuid;
      IF v_ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.sst_empresas WHERE id = v_ref AND owner_id = v_owner) THEN
        RAISE EXCEPTION 'La empresa indicada no pertenece a este negocio';
      END IF;
    ELSIF TG_TABLE_NAME = 'sst_evaluaciones' THEN
      v_ref := NULLIF(v_row ->> 'trabajador_id', '')::uuid;
      IF v_ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.sst_trabajadores WHERE id = v_ref AND owner_id = v_owner) THEN
        RAISE EXCEPTION 'El trabajador indicado no pertenece a este negocio';
      END IF;
    END IF;
  END IF;

  -- Organization / workspace cross-tenant link checks
  IF v_org IS NOT NULL THEN
    v_ref := NULLIF(v_row ->> 'workspace_id', '')::uuid;
    IF v_ref IS NOT NULL AND TG_TABLE_NAME <> 'workspaces' THEN
      IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id = v_ref AND org_id = v_org) THEN
        RAISE EXCEPTION 'El espacio de trabajo indicado no pertenece a esta organización';
      END IF;
    END IF;

    IF TG_TABLE_NAME = 'imported_contacts' THEN
      v_ref := NULLIF(v_row ->> 'list_id', '')::uuid;
      IF v_ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.imported_lists WHERE id = v_ref AND org_id = v_org) THEN
        RAISE EXCEPTION 'La lista de contactos no pertenece a esta organización';
      END IF;
    ELSIF TG_TABLE_NAME = 'lead_referrals' THEN
      v_ref := NULLIF(v_row ->> 'referral_link_id', '')::uuid;
      IF v_ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.referral_links WHERE id = v_ref AND org_id = v_org) THEN
        RAISE EXCEPTION 'El enlace de referido no pertenece a esta organización';
      END IF;
    ELSIF TG_TABLE_NAME = 'link_clicks' THEN
      v_ref := NULLIF(v_row ->> 'short_link_id', '')::uuid;
      IF v_ref IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.short_links WHERE id = v_ref AND org_id = v_org) THEN
        RAISE EXCEPTION 'El enlace corto no pertenece a esta organización';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  tablas_fk text[] := ARRAY[
    'restaurante_pedidos',
    'bel_citas',
    'bel_fichas',
    'bel_atenciones',
    'cl_historias',
    'cl_notas_aclaratorias',
    'cl_vacunas',
    'cl_citas',
    'cl_cobros',
    'crm_pqrs',
    'crm_mensajes',
    'edu_pensiones',
    'edu_asistencia',
    'edu_notas',
    'sst_trabajadores',
    'sst_evaluaciones',
    'audiences',
    'campaign_variants',
    'imported_contacts',
    'imported_lists',
    'lead_referrals',
    'link_clicks',
    'short_links',
    'utm_links',
    'workspace_activity',
    'workspace_assets',
    'workspace_budget_lines',
    'workspace_comments',
    'workspace_kpis',
    'workspace_retros',
    'workspace_share_links'
  ];
BEGIN
  FOREACH t IN ARRAY tablas_fk LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', 'trg_ref_mismo_negocio_' || t, t);
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.verificar_referencia_mismo_negocio()',
        'trg_ref_mismo_negocio_' || t,
        t
      );
    END IF;
  END LOOP;
END $$;
