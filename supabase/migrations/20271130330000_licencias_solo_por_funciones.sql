-- Licencias, vencimientos, pagos y roles: el navegador ya no escribe directamente.
-- Todo cambio pasa por funciones del servidor que comprueban que quien llama es el Superadmin
-- (o, en la activación con clave, el titular con una clave válida). No borra datos.

-- 1. El disparador de protección acepta SOLO las funciones de confianza (marca local a la transacción).
CREATE OR REPLACE FUNCTION public.proteger_campos_licencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.es_superadmin()
     OR coalesce(current_setting('gosaryc.licencia_rpc', true), '') = 'si' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'suscripciones_negocio' THEN
    NEW.owner_id := auth.uid();
    NEW.plan := 'prueba';
    NEW.estado := 'activo';
    NEW.vence_el := current_date + 14;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'licencias' THEN
    IF to_jsonb(NEW) - 'ultima_verificacion' = to_jsonb(OLD) - 'ultima_verificacion' THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'Solo el Superadmin puede modificar licencias y planes';
END;
$$;

REVOKE ALL ON FUNCTION public.proteger_campos_licencia() FROM public, anon, authenticated;

-- 2. Activar licencia con clave: función de confianza (antes el disparador la bloqueaba).
CREATE OR REPLACE FUNCTION public.activar_licencia(p_clave text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.claves_activacion%ROWTYPE;
  v timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Inicia sesión para activar la licencia.';
  END IF;
  SELECT * INTO c FROM public.claves_activacion
  WHERE owner_id = auth.uid() AND estado = 'disponible' AND clave = upper(trim(p_clave))
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La clave no es válida para tu negocio o ya fue usada.';
  END IF;
  PERFORM set_config('gosaryc.licencia_rpc', 'si', true);
  UPDATE public.claves_activacion SET estado = 'usada', usada_en = now() WHERE id = c.id;
  UPDATE public.suscripciones_negocio
  SET plan = 'anual', estado = 'activo', inicio = current_date,
      vence_en = greatest(vence_en, now()) + interval '1 year',
      vence_el = (greatest(vence_en, now()) + interval '1 year')::date,
      updated_at = now()
  WHERE owner_id = auth.uid()
  RETURNING vence_en INTO v;
  PERFORM set_config('gosaryc.licencia_rpc', '', true);
  RETURN jsonb_build_object('vence_en', v);
END;
$$;

REVOKE ALL ON FUNCTION public.activar_licencia(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.activar_licencia(text) TO authenticated;

-- 3. Funciones de administración (solo Superadmin)
CREATE OR REPLACE FUNCTION public.admin_actualizar_suscripcion(
  p_owner uuid, p_plan text DEFAULT NULL, p_estado text DEFAULT NULL, p_vence_el date DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'Solo el dueño de la plataforma puede cambiar licencias.' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.suscripciones_negocio (owner_id) VALUES (p_owner) ON CONFLICT (owner_id) DO NOTHING;
  UPDATE public.suscripciones_negocio
     SET plan = coalesce(p_plan, plan),
         estado = coalesce(p_estado, estado),
         vence_el = coalesce(p_vence_el, vence_el),
         updated_at = now()
   WHERE owner_id = p_owner;
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
    RAISE EXCEPTION 'Solo el dueño de la plataforma puede revisar pagos.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.pagos_licencia SET estado = 'rechazado', revisado_en = now()
   WHERE id = p_id AND estado = 'pendiente';
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
    RAISE EXCEPTION 'Solo el dueño de la plataforma puede revisar solicitudes.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.solicitudes_licencia SET estado = 'rechazada', updated_at = now() WHERE id = p_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_crear_licencia(
  p_cliente text, p_telefono text, p_ciudad text, p_tipo text, p_dias integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'Solo el dueño de la plataforma puede crear licencias.' USING ERRCODE = '42501';
  END IF;
  IF p_tipo NOT IN ('prueba', 'anual') OR p_dias < 1 OR p_dias > 365 OR coalesce(trim(p_cliente), '') = '' THEN
    RAISE EXCEPTION 'Datos de licencia no válidos.';
  END IF;
  INSERT INTO public.licencias (cliente, telefono, ciudad, tipo, inicio, vence_el)
  VALUES (left(trim(p_cliente), 120), nullif(left(trim(coalesce(p_telefono, '')), 20), ''),
          nullif(left(trim(coalesce(p_ciudad, '')), 120), ''), p_tipo, current_date, current_date + p_dias);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_actualizar_licencia(
  p_id uuid, p_tipo text DEFAULT NULL, p_estado text DEFAULT NULL, p_vence_el date DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'Solo el dueño de la plataforma puede cambiar licencias.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.licencias
     SET tipo = coalesce(p_tipo, tipo),
         estado = coalesce(p_estado, estado),
         vence_el = coalesce(p_vence_el, vence_el),
         updated_at = now()
   WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_actualizar_suscripcion(uuid, text, text, date) FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_rechazar_pago_licencia(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_rechazar_solicitud_licencia(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_crear_licencia(text, text, text, text, integer) FROM public, anon;
REVOKE ALL ON FUNCTION public.admin_actualizar_licencia(uuid, text, text, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_suscripcion(uuid, text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_rechazar_pago_licencia(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_rechazar_solicitud_licencia(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_crear_licencia(text, text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_actualizar_licencia(uuid, text, text, date) TO authenticated;

-- 4. El navegador no puede escribir en estas tablas (solo leer lo propio y, en pagos, SOLICITAR).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['suscripciones_negocio', 'licencias', 'solicitudes_licencia', 'claves_activacion'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM authenticated, anon', t);
    END IF;
  END LOOP;
  IF to_regclass('public.pagos_licencia') IS NOT NULL THEN
    REVOKE UPDATE, DELETE ON public.pagos_licencia FROM authenticated, anon;
  END IF;
END $$;

-- 5. Equipo y roles: solo el administrador de ese negocio (o el Superadmin) cambia roles y permisos;
-- esto reemplaza el bloqueo total anterior, que impedía gestionar el equipo.
DO $$
BEGIN
  IF to_regclass('public.equipo_negocio') IS NOT NULL THEN
    DROP POLICY IF EXISTS rls_bloqueo_insertar_privilegios ON public.equipo_negocio;
    DROP POLICY IF EXISTS rls_bloqueo_editar_privilegios ON public.equipo_negocio;
    DROP POLICY IF EXISTS rls_bloqueo_borrar_privilegios ON public.equipo_negocio;
    CREATE POLICY rls_bloqueo_insertar_privilegios ON public.equipo_negocio AS RESTRICTIVE FOR INSERT TO authenticated
      WITH CHECK ((public.es_admin() AND owner_id = public.mi_negocio_id()) OR public.es_superadmin());
    CREATE POLICY rls_bloqueo_editar_privilegios ON public.equipo_negocio AS RESTRICTIVE FOR UPDATE TO authenticated
      USING ((public.es_admin() AND owner_id = public.mi_negocio_id()) OR public.es_superadmin())
      WITH CHECK ((public.es_admin() AND owner_id = public.mi_negocio_id()) OR public.es_superadmin());
    CREATE POLICY rls_bloqueo_borrar_privilegios ON public.equipo_negocio AS RESTRICTIVE FOR DELETE TO authenticated
      USING ((public.es_admin() AND owner_id = public.mi_negocio_id()) OR public.es_superadmin());
  END IF;
END $$;
