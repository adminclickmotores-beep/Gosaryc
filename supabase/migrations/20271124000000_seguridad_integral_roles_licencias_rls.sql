-- ============================================================================
-- Migración de endurecimiento de seguridad integral:
-- 1. Roles de plataforma verificados en tabla (sin comparaciones por correo)
-- 2. Autorización estricta en servidor para pagos, licencias, suscripciones y soporte
-- 3. Bloqueo en servidor de ventas y cobros cuando la licencia esté vencida
-- 4. Protección contra inflación de comisiones por personal no administrador
-- 5. Validación de pertenencia al mismo negocio en vínculos de clientes
-- 6. Vinculación segura de WhatsApp (código de alta entropía con expiración + secreto)
-- 7. Protección de instrucciones de asistentes (solo dueño/admin del negocio)
-- 8. Lista blanca de dominios aprobados para enlaces cortos (/r/:slug)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABLA DE ROLES DE PLATAFORMA Y FUNCIONES DE AUTORIZACIÓN SEGURAS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.plataforma_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rol text NOT NULL CHECK (rol IN ('plataforma_admin', 'soporte_plataforma')),
  asignado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, rol)
);

ALTER TABLE public.plataforma_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plataforma_roles FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.plataforma_roles FROM anon;
REVOKE ALL ON public.plataforma_roles FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plataforma_roles TO authenticated;

-- Bootstrap seguro: si aún no existe ningún administrador de plataforma,
-- asigna el rol a la primera cuenta registrada (sin depender de correos).
INSERT INTO public.plataforma_roles (user_id, rol)
SELECT u.id, 'plataforma_admin'
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.plataforma_roles WHERE rol = 'plataforma_admin'
)
ORDER BY u.created_at ASC
LIMIT 1
ON CONFLICT (user_id, rol) DO NOTHING;

-- Trigger de registro: la primera cuenta que se registre en un proyecto nuevo
-- recibe automáticamente el rol plataforma_admin (con bloqueo transaccional).
CREATE OR REPLACE FUNCTION public.asignar_primer_admin_plataforma_tg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(784512369);
  IF NOT EXISTS (SELECT 1 FROM public.plataforma_roles WHERE rol = 'plataforma_admin') THEN
    INSERT INTO public.plataforma_roles (user_id, rol)
    VALUES (NEW.id, 'plataforma_admin')
    ON CONFLICT (user_id, rol) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asignar_primer_admin_plataforma ON auth.users;
CREATE TRIGGER trg_asignar_primer_admin_plataforma
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.asignar_primer_admin_plataforma_tg();

-- Reemplaza es_superadmin(): verifica EXCLUSIVAMENTE la tabla plataforma_roles.
CREATE OR REPLACE FUNCTION public.es_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.plataforma_roles
      WHERE user_id = auth.uid()
        AND rol = 'plataforma_admin'
    ),
    false
  );
$$;

-- Reemplaza es_soporte_plataforma(): verifica EXCLUSIVAMENTE la tabla plataforma_roles.
CREATE OR REPLACE FUNCTION public.es_soporte_plataforma()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    EXISTS (
      SELECT 1
      FROM public.plataforma_roles
      WHERE user_id = auth.uid()
        AND rol IN ('plataforma_admin', 'soporte_plataforma')
    ),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.es_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.es_superadmin() TO authenticated;

REVOKE ALL ON FUNCTION public.es_soporte_plataforma() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.es_soporte_plataforma() TO authenticated;

-- Políticas RLS de plataforma_roles: solo lectura propia o plataforma_admin;
-- escritura EXCLUSIVA de plataforma_admin.
DROP POLICY IF EXISTS plataforma_roles_select ON public.plataforma_roles;
CREATE POLICY plataforma_roles_select ON public.plataforma_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.es_superadmin());

DROP POLICY IF EXISTS plataforma_roles_insert ON public.plataforma_roles;
CREATE POLICY plataforma_roles_insert ON public.plataforma_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.es_superadmin());

DROP POLICY IF EXISTS plataforma_roles_update ON public.plataforma_roles;
CREATE POLICY plataforma_roles_update ON public.plataforma_roles
  FOR UPDATE TO authenticated
  USING (public.es_superadmin())
  WITH CHECK (public.es_superadmin());

DROP POLICY IF EXISTS plataforma_roles_delete ON public.plataforma_roles;
CREATE POLICY plataforma_roles_delete ON public.plataforma_roles
  FOR DELETE TO authenticated
  USING (public.es_superadmin());

-- RPC segura para que solo plataforma_admin asigne o revoque roles de plataforma.
CREATE OR REPLACE FUNCTION public.admin_asignar_rol_plataforma(
  p_user_id uuid,
  p_rol text,
  p_activo boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'Solo el administrador de plataforma puede asignar roles.' USING ERRCODE = '42501';
  END IF;
  IF p_rol NOT IN ('plataforma_admin', 'soporte_plataforma') THEN
    RAISE EXCEPTION 'Rol de plataforma no válido.';
  END IF;
  IF p_activo THEN
    INSERT INTO public.plataforma_roles (user_id, rol, asignado_por)
    VALUES (p_user_id, p_rol, auth.uid())
    ON CONFLICT (user_id, rol) DO NOTHING;
  ELSE
    IF p_rol = 'plataforma_admin' AND p_user_id = auth.uid() THEN
      RAISE EXCEPTION 'No puedes revocarte a ti mismo el rol de administrador de plataforma.';
    END IF;
    DELETE FROM public.plataforma_roles
    WHERE user_id = p_user_id AND rol = p_rol;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_asignar_rol_plataforma(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_asignar_rol_plataforma(uuid, text, boolean) TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. ENDURECIMIENTO DE RLS Y RPCs DE PAGOS, LICENCIAS, SUSCRIPCIONES Y SOPORTE
-- ----------------------------------------------------------------------------

-- Función auxiliar para generar códigos de alta entropía
CREATE OR REPLACE FUNCTION public.generar_codigo_alta_entropia(p_prefijo text DEFAULT 'GSR')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_raw text;
BEGIN
  v_raw := upper(encode(gen_random_bytes(10), 'hex'));
  RETURN p_prefijo || '-' || substr(v_raw, 1, 5) || '-' || substr(v_raw, 6, 5) || '-' || substr(v_raw, 11, 5) || '-' || substr(v_raw, 16, 5);
END;
$$;

-- A) suscripciones_negocio: solo plataforma_admin puede modificar/extender/cambiar suscripciones
DO $$
DECLARE
  pol record;
BEGIN
  IF to_regclass('public.suscripciones_negocio') IS NOT NULL THEN
    ALTER TABLE public.suscripciones_negocio ENABLE ROW LEVEL SECURITY;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suscripciones_negocio' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.suscripciones_negocio', pol.policyname);
    END LOOP;
    CREATE POLICY sub_select_propio_o_admin ON public.suscripciones_negocio
      FOR SELECT TO authenticated
      USING (owner_id = auth.uid() OR owner_id = public.mi_negocio_id() OR public.es_superadmin());
    CREATE POLICY sub_insert_solo_admin ON public.suscripciones_negocio
      FOR INSERT TO authenticated
      WITH CHECK (public.es_superadmin());
    CREATE POLICY sub_update_solo_admin ON public.suscripciones_negocio
      FOR UPDATE TO authenticated
      USING (public.es_superadmin())
      WITH CHECK (public.es_superadmin());
    CREATE POLICY sub_delete_solo_admin ON public.suscripciones_negocio
      FOR DELETE TO authenticated
      USING (public.es_superadmin());
  END IF;
END $$;

-- B) pagos_licencia: usuario solo crea solicitud pendiente para sí mismo; solo plataforma_admin aprueba/modifica
DO $$
DECLARE
  pol record;
BEGIN
  IF to_regclass('public.pagos_licencia') IS NOT NULL THEN
    ALTER TABLE public.pagos_licencia ENABLE ROW LEVEL SECURITY;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pagos_licencia' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.pagos_licencia', pol.policyname);
    END LOOP;
    CREATE POLICY pagos_select_propio_o_admin ON public.pagos_licencia
      FOR SELECT TO authenticated
      USING (owner_id = auth.uid() OR public.es_superadmin());
    CREATE POLICY pagos_insert_solicitud_propia ON public.pagos_licencia
      FOR INSERT TO authenticated
      WITH CHECK (
        owner_id = auth.uid()
        AND COALESCE(estado, 'pendiente') = 'pendiente'
      );
    CREATE POLICY pagos_update_solo_admin ON public.pagos_licencia
      FOR UPDATE TO authenticated
      USING (public.es_superadmin())
      WITH CHECK (public.es_superadmin());
    CREATE POLICY pagos_delete_solo_admin ON public.pagos_licencia
      FOR DELETE TO authenticated
      USING (public.es_superadmin());
  END IF;
END $$;

-- C) licencias y solicitudes_licencia: gestión exclusiva de plataforma_admin
DO $$
DECLARE
  pol record;
BEGIN
  IF to_regclass('public.licencias') IS NOT NULL THEN
    ALTER TABLE public.licencias ENABLE ROW LEVEL SECURITY;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'licencias' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.licencias', pol.policyname);
    END LOOP;
    CREATE POLICY licencias_solo_admin ON public.licencias
      FOR ALL TO authenticated
      USING (public.es_superadmin())
      WITH CHECK (public.es_superadmin());
  END IF;

  IF to_regclass('public.solicitudes_licencia') IS NOT NULL THEN
    ALTER TABLE public.solicitudes_licencia ENABLE ROW LEVEL SECURITY;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'solicitudes_licencia' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.solicitudes_licencia', pol.policyname);
    END LOOP;
    CREATE POLICY solicitudes_lic_solo_admin ON public.solicitudes_licencia
      FOR ALL TO authenticated
      USING (public.es_superadmin())
      WITH CHECK (public.es_superadmin());
  END IF;
END $$;

-- D) tickets_soporte: solo soporte_plataforma o plataforma_admin ven/responden todos los tickets
DO $$
DECLARE
  pol record;
BEGIN
  IF to_regclass('public.tickets_soporte') IS NOT NULL THEN
    ALTER TABLE public.tickets_soporte ENABLE ROW LEVEL SECURITY;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'tickets_soporte' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.tickets_soporte', pol.policyname);
    END LOOP;
    CREATE POLICY tickets_select_propio_o_soporte ON public.tickets_soporte
      FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR public.es_soporte_plataforma());
    CREATE POLICY tickets_insert_propio ON public.tickets_soporte
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
    CREATE POLICY tickets_update_solo_soporte ON public.tickets_soporte
      FOR UPDATE TO authenticated
      USING (public.es_soporte_plataforma())
      WITH CHECK (public.es_soporte_plataforma());
    CREATE POLICY tickets_delete_solo_admin ON public.tickets_soporte
      FOR DELETE TO authenticated
      USING (public.es_superadmin());
  END IF;
END $$;

-- E) negocio_dian_config: solo plataforma_admin
DO $$
DECLARE
  pol record;
BEGIN
  IF to_regclass('public.negocio_dian_config') IS NOT NULL THEN
    ALTER TABLE public.negocio_dian_config ENABLE ROW LEVEL SECURITY;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'negocio_dian_config' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.negocio_dian_config', pol.policyname);
    END LOOP;
    CREATE POLICY dian_solo_admin ON public.negocio_dian_config
      FOR ALL TO authenticated
      USING (public.es_superadmin())
      WITH CHECK (public.es_superadmin());
  END IF;
END $$;

-- F) Endurecimiento de RPCs administrativas (verificación obligatoria de es_superadmin())
CREATE OR REPLACE FUNCTION public.admin_actualizar_suscripcion(
  p_owner uuid,
  p_plan text DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_vence_el date DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'No autorizado: solo el administrador de plataforma puede modificar suscripciones.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.suscripciones_negocio (owner_id, plan, estado, vence_el, vence_en)
  VALUES (
    p_owner,
    COALESCE(p_plan, 'prueba'),
    COALESCE(p_estado, 'activo'),
    COALESCE(p_vence_el, CURRENT_DATE + 30),
    (COALESCE(p_vence_el, CURRENT_DATE + 30)::timestamptz + interval '23 hours 59 minutes')
  )
  ON CONFLICT (owner_id) DO UPDATE SET
    plan = COALESCE(p_plan, public.suscripciones_negocio.plan),
    estado = COALESCE(p_estado, public.suscripciones_negocio.estado),
    vence_el = COALESCE(p_vence_el, public.suscripciones_negocio.vence_el),
    vence_en = CASE
      WHEN p_vence_el IS NOT NULL THEN (p_vence_el::timestamptz + interval '23 hours 59 minutes')
      ELSE public.suscripciones_negocio.vence_en
    END,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.aprobar_pago_licencia(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pago record;
  v_base date;
  v_nueva date;
  v_plan text;
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'No autorizado: solo el administrador de plataforma puede aprobar pagos.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pago FROM public.pagos_licencia WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud de pago no encontrada.';
  END IF;
  IF v_pago.estado <> 'pendiente' THEN
    RAISE EXCEPTION 'Esta solicitud ya fue procesada.';
  END IF;

  SELECT GREATEST(COALESCE(vence_el, CURRENT_DATE), CURRENT_DATE)
  INTO v_base
  FROM public.suscripciones_negocio
  WHERE owner_id = v_pago.owner_id;
  v_base := COALESCE(v_base, CURRENT_DATE);

  IF v_pago.tipo = 'dias_extra' THEN
    v_nueva := v_base + 15;
    v_plan := NULL;
  ELSE
    v_nueva := v_base + 365;
    v_plan := 'anual';
  END IF;

  INSERT INTO public.suscripciones_negocio (owner_id, plan, estado, vence_el, vence_en, dias_extra_usados)
  VALUES (
    v_pago.owner_id,
    COALESCE(v_plan, 'prueba'),
    'activo',
    v_nueva,
    (v_nueva::timestamptz + interval '23 hours 59 minutes'),
    (v_pago.tipo = 'dias_extra')
  )
  ON CONFLICT (owner_id) DO UPDATE SET
    plan = COALESCE(v_plan, public.suscripciones_negocio.plan),
    estado = 'activo',
    vence_el = v_nueva,
    vence_en = (v_nueva::timestamptz + interval '23 hours 59 minutes'),
    dias_extra_usados = public.suscripciones_negocio.dias_extra_usados OR (v_pago.tipo = 'dias_extra'),
    updated_at = now();

  UPDATE public.pagos_licencia SET estado = 'aprobado' WHERE id = p_id;

  RETURN jsonb_build_object(
    'correo', v_pago.correo,
    'vence_el', v_nueva,
    'tipo', v_pago.tipo
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.aprobar_pase_dias_licencia(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pago record;
  v_dias integer;
  v_base date;
  v_nueva date;
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'No autorizado: solo el administrador de plataforma puede aprobar pases.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_pago FROM public.pagos_licencia WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada.';
  END IF;
  IF v_pago.estado <> 'pendiente' THEN
    RAISE EXCEPTION 'Esta solicitud ya fue procesada.';
  END IF;

  v_dias := GREATEST(1, LEAST(365, COALESCE(v_pago.dias, 1)));
  SELECT GREATEST(COALESCE(vence_el, CURRENT_DATE), CURRENT_DATE)
  INTO v_base
  FROM public.suscripciones_negocio
  WHERE owner_id = v_pago.owner_id;
  v_base := COALESCE(v_base, CURRENT_DATE);
  v_nueva := v_base + v_dias;

  INSERT INTO public.suscripciones_negocio (owner_id, plan, estado, vence_el, vence_en)
  VALUES (v_pago.owner_id, 'diario', 'activo', v_nueva, (v_nueva::timestamptz + interval '23 hours 59 minutes'))
  ON CONFLICT (owner_id) DO UPDATE SET
    plan = 'diario',
    estado = 'activo',
    vence_el = v_nueva,
    vence_en = (v_nueva::timestamptz + interval '23 hours 59 minutes'),
    updated_at = now();

  UPDATE public.pagos_licencia SET estado = 'aprobado' WHERE id = p_id;

  RETURN jsonb_build_object(
    'correo', v_pago.correo,
    'vence_el', v_nueva,
    'tipo', 'diario',
    'dias', v_dias
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_rechazar_pago_licencia(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'No autorizado.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.pagos_licencia SET estado = 'rechazado' WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_crear_licencia(
  p_cliente text,
  p_telefono text,
  p_ciudad text,
  p_tipo text,
  p_dias integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dias integer := GREATEST(1, LEAST(730, COALESCE(p_dias, 30)));
  v_tipo text := CASE WHEN p_tipo IN ('prueba', 'anual', 'diario') THEN p_tipo ELSE 'prueba' END;
  v_codigo text := public.generar_codigo_alta_entropia('GSR');
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'No autorizado: solo el administrador de plataforma puede emitir licencias.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.licencias (codigo, cliente, telefono, ciudad, tipo, estado, vence_el)
  VALUES (v_codigo, trim(p_cliente), NULLIF(trim(COALESCE(p_telefono, '')), ''), NULLIF(trim(COALESCE(p_ciudad, '')), ''), v_tipo, 'activa', CURRENT_DATE + v_dias);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_crear_pase_dias(
  p_cliente text,
  p_telefono text DEFAULT '',
  p_ciudad text DEFAULT '',
  p_dias integer DEFAULT 1
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dias integer := GREATEST(1, LEAST(365, COALESCE(p_dias, 1)));
  v_codigo text := public.generar_codigo_alta_entropia('GSR');
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'No autorizado: solo el administrador de plataforma puede emitir pases.' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.licencias (codigo, cliente, telefono, ciudad, tipo, estado, vence_el)
  VALUES (v_codigo, trim(p_cliente), NULLIF(trim(COALESCE(p_telefono, '')), ''), NULLIF(trim(COALESCE(p_ciudad, '')), ''), 'diario', 'activa', CURRENT_DATE + v_dias);

  RETURN v_codigo;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_actualizar_licencia(
  p_id uuid,
  p_tipo text DEFAULT NULL,
  p_estado text DEFAULT NULL,
  p_vence_el date DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'No autorizado: solo el administrador de plataforma puede cambiar licencias.' USING ERRCODE = '42501';
  END IF;

  UPDATE public.licencias
  SET
    tipo = COALESCE(p_tipo, tipo),
    estado = COALESCE(p_estado, estado),
    vence_el = COALESCE(p_vence_el, vence_el)
  WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.aprobar_solicitud_licencia(p_id uuid, p_tipo text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sol record;
  v_tipo text := CASE WHEN p_tipo = 'anual' THEN 'anual' ELSE 'prueba' END;
  v_dias integer := CASE WHEN p_tipo = 'anual' THEN 365 ELSE 30 END;
  v_codigo text := public.generar_codigo_alta_entropia('GSR');
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'No autorizado: solo el administrador de plataforma puede aprobar solicitudes.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_sol FROM public.solicitudes_licencia WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada.';
  END IF;

  INSERT INTO public.licencias (codigo, cliente, telefono, correo, equipo_id, tipo, estado, vence_el)
  VALUES (v_codigo, v_sol.cliente, v_sol.telefono, v_sol.correo, v_sol.equipo_id, v_tipo, 'activa', CURRENT_DATE + v_dias);

  UPDATE public.solicitudes_licencia SET estado = 'aprobada' WHERE id = p_id;
  RETURN v_codigo;
END;
$$;

CREATE OR REPLACE FUNCTION public.aprobar_solicitud_pase_dias(p_id uuid, p_dias integer DEFAULT 1)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sol record;
  v_dias integer := GREATEST(1, LEAST(365, COALESCE(p_dias, 1)));
  v_codigo text := public.generar_codigo_alta_entropia('GSR');
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'No autorizado: solo el administrador de plataforma puede aprobar pases.' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_sol FROM public.solicitudes_licencia WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada.';
  END IF;

  INSERT INTO public.licencias (codigo, cliente, telefono, correo, equipo_id, tipo, estado, vence_el)
  VALUES (v_codigo, v_sol.cliente, v_sol.telefono, v_sol.correo, v_sol.equipo_id, 'diario', 'activa', CURRENT_DATE + v_dias);

  UPDATE public.solicitudes_licencia SET estado = 'aprobada' WHERE id = p_id;
  RETURN v_codigo;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_rechazar_solicitud_licencia(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'No autorizado.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.solicitudes_licencia SET estado = 'rechazada' WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.generar_clave_activacion(p_owner uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clave text := public.generar_codigo_alta_entropia('GSR');
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'No autorizado: solo el administrador de plataforma puede generar claves.' USING ERRCODE = '42501';
  END IF;

  IF to_regclass('public.claves_activacion') IS NOT NULL THEN
    UPDATE public.claves_activacion SET usada = true WHERE owner_id = p_owner AND usada = false;
    INSERT INTO public.claves_activacion (owner_id, clave) VALUES (p_owner, v_clave);
  END IF;

  RETURN v_clave;
END;
$$;

-- Revocar permisos anónimos en todas las RPCs administrativas
REVOKE ALL ON FUNCTION public.admin_actualizar_suscripcion(uuid, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_suscripcion(uuid, text, text, date) TO authenticated;
REVOKE ALL ON FUNCTION public.aprobar_pago_licencia(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aprobar_pago_licencia(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.aprobar_pase_dias_licencia(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aprobar_pase_dias_licencia(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_rechazar_pago_licencia(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_rechazar_pago_licencia(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_crear_licencia(text, text, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_crear_licencia(text, text, text, text, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_crear_pase_dias(text, text, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_crear_pase_dias(text, text, text, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_actualizar_licencia(uuid, text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_licencia(uuid, text, text, date) TO authenticated;
REVOKE ALL ON FUNCTION public.aprobar_solicitud_licencia(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aprobar_solicitud_licencia(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.aprobar_solicitud_pase_dias(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aprobar_solicitud_pase_dias(uuid, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.admin_rechazar_solicitud_licencia(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_rechazar_solicitud_licencia(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.generar_clave_activacion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generar_clave_activacion(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3. BLOQUEO EN SERVIDOR DE VENTAS Y COBROS CON LICENCIA VENCIDA
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.licencia_activa_para(p_owner uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub record;
  v_limite timestamptz;
BEGIN
  IF public.es_superadmin() THEN
    RETURN true;
  END IF;
  IF p_owner IS NULL THEN
    RETURN false;
  END IF;
  IF to_regclass('public.suscripciones_negocio') IS NULL THEN
    RETURN true;
  END IF;

  SELECT estado, vence_el, vence_en, COALESCE(dias_gracia, 0) AS dias_gracia
  INTO v_sub
  FROM public.suscripciones_negocio
  WHERE owner_id = p_owner
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF v_sub.estado <> 'activo' THEN
    RETURN false;
  END IF;

  v_limite := COALESCE(v_sub.vence_en, (v_sub.vence_el::timestamptz + interval '1 day'))
              + (GREATEST(0, LEAST(30, v_sub.dias_gracia)) * interval '1 day');
  RETURN v_limite >= now();
END;
$$;

REVOKE ALL ON FUNCTION public.licencia_activa_para(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.licencia_activa_para(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.verificar_licencia_vigente_tg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF auth.uid() IS NULL OR public.es_superadmin() THEN
    RETURN NEW;
  END IF;

  v_owner := COALESCE((to_jsonb(NEW) ->> 'owner_id')::uuid, public.mi_negocio_id(), auth.uid());
  IF NOT public.licencia_activa_para(v_owner) THEN
    RAISE EXCEPTION 'Tu licencia está vencida o suspendida. Renueva tu suscripción para registrar ventas o cobros.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'restaurante_pedidos', 'com_ventas', 'caja_movimientos', 'fac_facturas',
    'bel_atenciones', 'cl_cobros', 'vehiculos_ventas', 'dis_pedidos',
    'tal_ordenes', 'tal_proyectos', 'srv_citas', 'pan_encargos',
    'flo_encargos', 'far_ventas', 'hot_reservas', 'eve_eventos',
    'gim_membresias', 'cv_contratos', 'alq_contratos', 'pre_creditos',
    'opt_ordenes', 'inm_contratos', 'tra_manifiestos', 'obr_cortes',
    'cond_cuotas', 'seg_facturas', 'sst_facturas', 'mot_ordenes', 'tex_ordenes'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_licencia_vigente ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER trg_licencia_vigente BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.verificar_licencia_vigente_tg()',
        t
      );
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 4. PROTECCIÓN CONTRA INFLACIÓN DE COMISIONES POR PERSONAL
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.proteger_comision_tg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_es_admin boolean;
  v_new jsonb := to_jsonb(NEW);
  v_old jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  v_pct numeric;
  v_com numeric;
  v_old_pct numeric;
  v_old_com numeric;
BEGIN
  IF auth.uid() IS NULL OR public.es_superadmin() THEN
    RETURN NEW;
  END IF;

  v_owner := COALESCE((v_new ->> 'owner_id')::uuid, public.mi_negocio_id(), auth.uid());
  v_es_admin := public.es_dueno_o_admin_negocio(v_owner);

  v_pct := COALESCE(NULLIF(v_new ->> 'comision_pct', '')::numeric, NULLIF(v_new ->> 'porcentaje', '')::numeric, 0);
  v_com := COALESCE(NULLIF(v_new ->> 'comision', '')::numeric, NULLIF(v_new ->> 'valor', '')::numeric, 0);

  IF v_pct < 0 OR v_pct > 100 THEN
    RAISE EXCEPTION 'El porcentaje de comisión debe estar entre 0 y 100.' USING ERRCODE = '22023';
  END IF;
  IF v_com < 0 THEN
    RAISE EXCEPTION 'La comisión no puede ser negativa.' USING ERRCODE = '22023';
  END IF;

  IF NOT v_es_admin THEN
    IF TG_OP = 'INSERT' THEN
      IF v_pct > 0 OR v_com > 0 THEN
        RAISE EXCEPTION 'Solo el dueño o administrador del negocio puede fijar comisiones.' USING ERRCODE = '42501';
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      v_old_pct := COALESCE(NULLIF(v_old ->> 'comision_pct', '')::numeric, NULLIF(v_old ->> 'porcentaje', '')::numeric, 0);
      v_old_com := COALESCE(NULLIF(v_old ->> 'comision', '')::numeric, NULLIF(v_old ->> 'valor', '')::numeric, 0);
      IF v_pct IS DISTINCT FROM v_old_pct OR v_com IS DISTINCT FROM v_old_com THEN
        RAISE EXCEPTION 'Solo el dueño o administrador del negocio puede modificar comisiones.' USING ERRCODE = '42501';
      END IF;
      IF (v_new ? 'liquidada') AND ((v_new ->> 'liquidada') IS DISTINCT FROM (v_old ->> 'liquidada')) THEN
        RAISE EXCEPTION 'Solo el dueño o administrador puede liquidar comisiones.' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DO $$
DECLARE
  t text;
  tablas text[] := ARRAY['tal_ordenes', 'srv_citas', 'bel_atenciones', 'cl_comisiones', 'mot_ordenes'];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_proteger_comision ON public.%I', t);
      EXECUTE format(
        'CREATE TRIGGER trg_proteger_comision BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.proteger_comision_tg()',
        t
      );
    END IF;
  END LOOP;
END $$;

-- Servicios con comisiones: solo el dueño/admin del negocio puede crear o editar tarifas/porcentajes
DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY['bel_servicios', 'cl_servicios'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      ALTER TABLE public.bel_servicios ENABLE ROW LEVEL SECURITY;
      FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
      END LOOP;
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id() OR public.es_superadmin())',
        t || '_select_negocio', t
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.es_dueno_o_admin_negocio(owner_id))',
        t || '_insert_admin', t
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.es_dueno_o_admin_negocio(owner_id)) WITH CHECK (public.es_dueno_o_admin_negocio(owner_id))',
        t || '_update_admin', t
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.es_dueno_o_admin_negocio(owner_id))',
        t || '_delete_admin', t
      );
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. IMPEDIR VINCULAR CLIENTES DE OTRO NEGOCIO / ORGANIZACIÓN
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validar_referencia_mismo_negocio_tg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fk_col text := TG_ARGV[0];
  v_ref_table text := TG_ARGV[1];
  v_scope_col text := TG_ARGV[2];
  v_row jsonb := to_jsonb(NEW);
  v_fk_val text;
  v_scope_val text;
  v_ok boolean := false;
BEGIN
  v_fk_val := v_row ->> v_fk_col;
  IF v_fk_val IS NULL OR v_fk_val = '' THEN
    RETURN NEW;
  END IF;

  v_scope_val := v_row ->> v_scope_col;
  IF v_scope_val IS NULL OR v_scope_val = '' THEN
    RAISE EXCEPTION 'Falta el identificador del negocio para validar el cliente.' USING ERRCODE = '42501';
  END IF;

  EXECUTE format(
    'SELECT EXISTS (SELECT 1 FROM public.%I WHERE id = $1::uuid AND %I = $2::uuid)',
    v_ref_table, v_scope_col
  )
  INTO v_ok
  USING v_fk_val, v_scope_val;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'No puedes vincular un cliente o registro que pertenece a otro negocio.' USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

-- Aplica automáticamente el trigger a toda llave foránea hacia tablas de clientes/contactos
-- que compartan columna owner_id o org_id.
DO $$
DECLARE
  r record;
  v_scope text;
  v_trig text;
BEGIN
  FOR r IN
    SELECT
      tc.table_name AS src_table,
      kcu.column_name AS fk_col,
      ccu.table_name AS ref_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_schema = 'public'
      AND ccu.column_name = 'id'
      AND ccu.table_name IN (
        'contacts', 'customers', 'clientes', 'negocio_clientes',
        'bel_clientes', 'cl_pacientes', 'gim_socios', 'dis_clientes',
        'crm_leads', 'igl_miembros', 'parq_abonados'
      )
  LOOP
    v_scope := NULL;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=r.src_table AND column_name='owner_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=r.ref_table AND column_name='owner_id') THEN
      v_scope := 'owner_id';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=r.src_table AND column_name='org_id')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=r.ref_table AND column_name='org_id') THEN
      v_scope := 'org_id';
    END IF;

    IF v_scope IS NOT NULL THEN
      v_trig := 'trg_mismo_negocio_' || r.fk_col;
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', v_trig, r.src_table);
      EXECUTE format(
        'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validar_referencia_mismo_negocio_tg(%L, %L, %L)',
        v_trig, r.src_table, r.fk_col, r.ref_table, v_scope
      );
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 6. VINCULACIÓN SEGURA DE WHATSAPP BRIDGE (ALTA ENTROPÍA + EXPIRACIÓN + SECRETO)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  pol record;
BEGIN
  IF to_regclass('public.whatsapp_bridge') IS NOT NULL THEN
    ALTER TABLE public.whatsapp_bridge
      ADD COLUMN IF NOT EXISTS bridge_secret_hash text,
      ADD COLUMN IF NOT EXISTS pairing_expires_at timestamptz;

    ALTER TABLE public.whatsapp_bridge ENABLE ROW LEVEL SECURITY;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_bridge' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.whatsapp_bridge', pol.policyname);
    END LOOP;

    CREATE POLICY wa_bridge_admin_negocio ON public.whatsapp_bridge
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.negocio_config n
          WHERE n.id = business_id
            AND public.es_dueno_o_admin_negocio(n.owner_id)
        )
        OR public.es_superadmin()
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.negocio_config n
          WHERE n.id = business_id
            AND public.es_dueno_o_admin_negocio(n.owner_id)
        )
        OR public.es_superadmin()
      );
  END IF;

  IF to_regclass('public.whatsapp_outbox') IS NOT NULL THEN
    ALTER TABLE public.whatsapp_outbox ENABLE ROW LEVEL SECURITY;
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'whatsapp_outbox' LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.whatsapp_outbox', pol.policyname);
    END LOOP;

    CREATE POLICY wa_outbox_admin_negocio ON public.whatsapp_outbox
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.negocio_config n
          WHERE n.id = business_id
            AND public.es_dueno_o_admin_negocio(n.owner_id)
        )
        OR public.es_superadmin()
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.negocio_config n
          WHERE n.id = business_id
            AND public.es_dueno_o_admin_negocio(n.owner_id)
        )
        OR public.es_superadmin()
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.generar_codigo_vinculacion_whatsapp(p_business_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_raw text;
  v_codigo text;
  v_expira timestamptz := now() + interval '15 minutes';
BEGIN
  SELECT owner_id INTO v_owner
  FROM public.negocio_config
  WHERE id = p_business_id;

  IF v_owner IS NULL OR NOT public.es_dueno_o_admin_negocio(v_owner) THEN
    RAISE EXCEPTION 'Solo el dueño o administrador del negocio puede vincular WhatsApp.' USING ERRCODE = '42501';
  END IF;

  IF NOT public.licencia_activa_para(v_owner) THEN
    RAISE EXCEPTION 'Tu licencia está vencida o suspendida.' USING ERRCODE = '42501';
  END IF;

  v_raw := upper(encode(gen_random_bytes(8), 'hex'));
  v_codigo := substr(v_raw, 1, 4) || '-' || substr(v_raw, 5, 4) || '-' || substr(v_raw, 9, 4);

  INSERT INTO public.whatsapp_bridge (business_id, pairing_code, pairing_expires_at, status, auto_pilot_200, config_version, updated_at)
  VALUES (p_business_id, v_codigo, v_expira, 'desconectado', true, 1, now())
  ON CONFLICT (business_id) DO UPDATE SET
    pairing_code = v_codigo,
    pairing_expires_at = v_expira,
    bridge_secret_hash = NULL,
    status = 'desconectado',
    updated_at = now();

  RETURN jsonb_build_object(
    'pairing_code', v_codigo,
    'pairing_expires_at', v_expira
  );
END;
$$;

REVOKE ALL ON FUNCTION public.generar_codigo_vinculacion_whatsapp(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generar_codigo_vinculacion_whatsapp(uuid) TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. PROTECCIÓN DE INSTRUCCIONES DE ASISTENTES (SOLO DUEÑO/ADMIN DEL NEGOCIO)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  pol record;
BEGIN
  FOREACH t IN ARRAY ARRAY['agente_whatsapp', 'agente_memoria'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
      END LOOP;
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id() OR public.es_superadmin())',
        t || '_select_negocio', t
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.es_dueno_o_admin_negocio(owner_id) OR public.es_superadmin())',
        t || '_insert_admin', t
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.es_dueno_o_admin_negocio(owner_id) OR public.es_superadmin()) WITH CHECK (public.es_dueno_o_admin_negocio(owner_id) OR public.es_superadmin())',
        t || '_update_admin', t
      );
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.es_dueno_o_admin_negocio(owner_id) OR public.es_superadmin())',
        t || '_delete_admin', t
      );
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 8. ENLACES CORTOS: LISTA BLANCA DE DESTINOS APROBADOS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.url_destino_aprobada(p_url text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_host text;
BEGIN
  IF p_url IS NULL OR length(trim(p_url)) = 0 OR length(p_url) > 2048 THEN
    RETURN false;
  END IF;
  IF trim(p_url) !~* '^https://' THEN
    RETURN false;
  END IF;

  v_host := lower((regexp_match(trim(p_url), '^https://([^/:?#]+)'))[1]);
  IF v_host IS NULL OR v_host = '' THEN
    RETURN false;
  END IF;

  RETURN (
    v_host = 'gosaryc.lovable.app'
    OR v_host LIKE '%.gosaryc.lovable.app'
    OR v_host IN (
      'wa.me', 'api.whatsapp.com', 'chat.whatsapp.com',
      'instagram.com', 'www.instagram.com',
      'facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.me',
      'maps.google.com', 'goo.gl', 'maps.app.goo.gl',
      'tiktok.com', 'www.tiktok.com',
      'youtube.com', 'www.youtube.com', 'youtu.be'
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.validar_short_link_destino_tg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.url_destino_aprobada(NEW.target_url) THEN
    RAISE EXCEPTION 'El enlace corto solo puede apuntar a dominios HTTPS aprobados.' USING ERRCODE = '22023';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.short_links') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_validar_short_link_destino ON public.short_links;
    CREATE TRIGGER trg_validar_short_link_destino
      BEFORE INSERT OR UPDATE ON public.short_links
      FOR EACH ROW
      EXECUTE FUNCTION public.validar_short_link_destino_tg();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.resolve_short_link(_slug text)
RETURNS TABLE(id uuid, org_id uuid, target_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.org_id, s.target_url
  FROM public.short_links s
  WHERE s.slug = _slug
    AND public.url_destino_aprobada(s.target_url)
  LIMIT 1;
$$;
