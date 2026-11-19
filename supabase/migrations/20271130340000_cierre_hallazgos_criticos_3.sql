-- Cierre de hallazgos críticos (19-nov-2026). Solo CREATE/ALTER/REVOKE: no borra datos.

-- ============================================================
-- 1. El código de licencia de un equipo se entrega UNA sola vez
--    (antes cualquiera que supiera el id del equipo podía pedirlo siempre).
-- ============================================================
ALTER TABLE public.licencias ADD COLUMN IF NOT EXISTS codigo_entregado_en timestamptz;

CREATE OR REPLACE FUNCTION public.consultar_licencia_equipo(p_equipo text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_equipo text := left(trim(coalesce(p_equipo, '')), 80);
  l public.licencias%ROWTYPE;
  v_estado text;
BEGIN
  IF length(v_equipo) < 8 THEN
    RETURN jsonb_build_object('estado', 'sin_solicitud');
  END IF;
  SELECT * INTO l FROM public.licencias
   WHERE equipo_id = v_equipo ORDER BY created_at DESC LIMIT 1;
  IF FOUND THEN
    IF l.codigo_entregado_en IS NULL AND l.ultima_verificacion IS NULL THEN
      PERFORM set_config('gosaryc.licencia_rpc', 'si', true);
      UPDATE public.licencias SET codigo_entregado_en = now() WHERE id = l.id;
      PERFORM set_config('gosaryc.licencia_rpc', '', true);
      RETURN jsonb_build_object('estado', 'aprobada', 'codigo', l.codigo);
    END IF;
    -- Ya se entregó: el código no se vuelve a mostrar; el equipo lo guarda localmente.
    RETURN jsonb_build_object('estado', 'ya_entregada');
  END IF;
  SELECT estado INTO v_estado FROM public.solicitudes_licencia
   WHERE equipo_id = v_equipo ORDER BY created_at DESC LIMIT 1;
  RETURN jsonb_build_object('estado', coalesce(v_estado, 'sin_solicitud'));
END;
$$;

REVOKE ALL ON FUNCTION public.consultar_licencia_equipo(text) FROM public;
GRANT EXECUTE ON FUNCTION public.consultar_licencia_equipo(text) TO anon, authenticated;

-- El Superadmin puede volver a permitir la entrega (equipo reinstalado).
CREATE OR REPLACE FUNCTION public.admin_permitir_recuperar_licencia(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'Solo el dueño de la plataforma puede hacer esto.' USING ERRCODE = '42501';
  END IF;
  UPDATE public.licencias SET codigo_entregado_en = NULL WHERE id = p_id;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_permitir_recuperar_licencia(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_permitir_recuperar_licencia(uuid) TO authenticated;

-- ============================================================
-- 2. El personal no puede subirse comisiones ni editar liquidaciones
--    (solo el dueño del negocio o el Superadmin).
-- ============================================================
CREATE OR REPLACE FUNCTION public.proteger_comisiones_personal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  col text;
  modo text := TG_ARGV[0];
  v_dueno uuid;
BEGIN
  IF auth.uid() IS NULL OR public.es_superadmin() THEN
    RETURN NEW;
  END IF;
  v_dueno := coalesce(to_jsonb(NEW)->>'owner_id', '')::uuid;
  IF v_dueno IS NOT NULL AND v_dueno = auth.uid() THEN
    RETURN NEW;
  END IF;
  FOR i IN 1..(TG_NARGS - 1) LOOP
    col := TG_ARGV[i];
    IF TG_OP = 'UPDATE' THEN
      IF (to_jsonb(NEW)->col) IS DISTINCT FROM (to_jsonb(OLD)->col) THEN
        RAISE EXCEPTION 'Solo el dueño del negocio puede cambiar comisiones.' USING ERRCODE = '42501';
      END IF;
    ELSIF modo = 'todo' THEN
      IF coalesce((to_jsonb(NEW)->>col)::numeric, 0) > 0 THEN
        RAISE EXCEPTION 'Solo el dueño del negocio puede definir comisiones.' USING ERRCODE = '42501';
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.proteger_comisiones_personal() FROM public, anon, authenticated;

DO $$
DECLARE
  d record;
  c text;
  existe boolean;
BEGIN
  FOR d IN
    SELECT * FROM (VALUES
      ('cl_servicios', 'todo', ARRAY['comision_pct']),
      ('bel_servicios', 'todo', ARRAY['comision_pct']),
      ('inm_contratos', 'todo', ARRAY['comision_pct']),
      ('tal_ordenes', 'todo', ARRAY['comision_pct']),
      ('consignaciones_vehiculos', 'todo', ARRAY['comision_pct']),
      ('bel_atenciones', 'edicion', ARRAY['comision_pct', 'comision', 'base_comision']),
      ('cl_comisiones', 'edicion', ARRAY['comision_total', 'comision_pct', 'comision']),
      ('tal_liquidaciones', 'edicion', ARRAY['total_comision']),
      ('bel_liquidaciones', 'edicion', ARRAY['total_comision'])
    ) AS x(tabla, modo, cols)
  LOOP
    IF to_regclass('public.' || d.tabla) IS NULL THEN CONTINUE; END IF;
    -- Solo columnas que de verdad existen
    existe := false;
    FOREACH c IN ARRAY d.cols LOOP
      IF EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'public' AND table_name = d.tabla AND column_name = c) THEN
        existe := true;
      END IF;
    END LOOP;
    IF NOT existe THEN CONTINUE; END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS trg_proteger_comisiones ON public.%I', d.tabla);
    EXECUTE format(
      'CREATE TRIGGER trg_proteger_comisiones BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.proteger_comisiones_personal(%L, %s)',
      d.tabla, d.modo,
      (SELECT string_agg(quote_literal(k), ', ') FROM unnest(d.cols) k
         WHERE EXISTS (SELECT 1 FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name = d.tabla AND column_name = k)));
  END LOOP;
END $$;

-- Pagos al personal (liquidaciones, comisiones, propinas, puntos): el personal no los edita ni los borra.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bel_liquidaciones', 'tal_liquidaciones', 'cl_comisiones', 'inm_liquidaciones', 'tra_liquidaciones',
    'comisiones_registros', 'propinas_registros', 'metas_registros', 'puntos_registros'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = t AND column_name = 'owner_id') THEN
      EXECUTE format('DROP POLICY IF EXISTS pagos_personal_editar ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS pagos_personal_borrar ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY pagos_personal_editar ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (owner_id = auth.uid() OR public.es_superadmin()) WITH CHECK (owner_id = auth.uid() OR public.es_superadmin())', t);
      EXECUTE format(
        'CREATE POLICY pagos_personal_borrar ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (owner_id = auth.uid() OR public.es_superadmin())', t);
    END IF;
  END LOOP;
END $$;

-- ============================================================
-- 3. El negocio activo del perfil solo puede ser uno del que el usuario es miembro
--    (evita enviar correos o ver contactos de otra organización).
-- ============================================================
CREATE OR REPLACE FUNCTION public.validar_org_por_defecto()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.es_superadmin() OR NEW.default_org_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.default_org_id IS NOT DISTINCT FROM OLD.default_org_id THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.org_members m WHERE m.org_id = NEW.default_org_id AND m.user_id = auth.uid()) THEN
    RAISE EXCEPTION 'No perteneces a esa organización.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validar_org_por_defecto() FROM public, anon, authenticated;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL AND to_regclass('public.org_members') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_validar_org_por_defecto ON public.profiles;
    CREATE TRIGGER trg_validar_org_por_defecto
      BEFORE INSERT OR UPDATE ON public.profiles
      FOR EACH ROW EXECUTE FUNCTION public.validar_org_por_defecto();
  END IF;
END $$;
