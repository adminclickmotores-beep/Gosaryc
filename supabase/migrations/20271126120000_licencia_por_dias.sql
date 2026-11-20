-- Plan de licencia por días (pase diario / temporal) junto a la prueba de 14 días,
-- la cortesía de 15 días adicionales y la licencia anual de $100.000 COP.

ALTER TABLE public.pagos_licencia ADD COLUMN IF NOT EXISTS dias integer;

-- Ampliar restricciones CHECK si existen en tipo/plan para aceptar 'diario'
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT conname, conrelid::regclass AS tabla
    FROM pg_constraint
    WHERE contype = 'c'
      AND conrelid IN (
        'public.licencias'::regclass,
        'public.pagos_licencia'::regclass,
        'public.suscripciones_negocio'::regclass
      )
      AND (
        pg_get_constraintdef(oid) ILIKE '%tipo%'
        OR pg_get_constraintdef(oid) ILIKE '%plan%'
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tabla, r.conname);
  END LOOP;
END $$;

ALTER TABLE public.licencias
  ADD CONSTRAINT licencias_tipo_check CHECK (tipo IN ('prueba', 'diario', 'anual'));

ALTER TABLE public.pagos_licencia
  ADD CONSTRAINT pagos_licencia_tipo_check CHECK (tipo IN ('anual', 'dias_extra', 'diario'));

ALTER TABLE public.suscripciones_negocio
  ADD CONSTRAINT suscripciones_negocio_plan_check CHECK (plan IN ('prueba', 'diario', 'emprendedor', 'pro', 'anual'));

-- Crear licencia de pase diario/temporal desde /licencias (solo Superadmin)
CREATE OR REPLACE FUNCTION public.admin_crear_pase_dias(
  p_cliente text,
  p_telefono text DEFAULT '',
  p_ciudad text DEFAULT '',
  p_dias integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dias integer := GREATEST(1, LEAST(COALESCE(p_dias, 1), 365));
  v_id uuid;
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'Solo el superadministrador puede crear licencias.';
  END IF;

  INSERT INTO public.licencias (cliente, telefono, ciudad, tipo, estado, inicio, vence_el)
  VALUES (
    btrim(p_cliente),
    NULLIF(btrim(COALESCE(p_telefono, '')), ''),
    NULLIF(btrim(COALESCE(p_ciudad, '')), ''),
    'diario',
    'activa',
    current_date,
    current_date + v_dias
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- Aprobar solicitud de equipo como pase por días (solo Superadmin)
CREATE OR REPLACE FUNCTION public.aprobar_solicitud_pase_dias(
  p_id uuid,
  p_dias integer DEFAULT 1
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dias integer := GREATEST(1, LEAST(COALESCE(p_dias, 1), 365));
  v_sol public.solicitudes_licencia%ROWTYPE;
  v_lic_id uuid;
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'Solo el superadministrador puede aprobar solicitudes.';
  END IF;

  SELECT * INTO v_sol FROM public.solicitudes_licencia WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud no encontrada.';
  END IF;

  INSERT INTO public.licencias (cliente, correo, telefono, equipo_id, tipo, estado, inicio, vence_el)
  VALUES (
    v_sol.cliente,
    v_sol.correo,
    v_sol.telefono,
    v_sol.equipo_id,
    'diario',
    'activa',
    current_date,
    current_date + v_dias
  )
  RETURNING id INTO v_lic_id;

  UPDATE public.solicitudes_licencia
  SET estado = 'aprobada', licencia_id = v_lic_id, updated_at = now()
  WHERE id = p_id;

  RETURN v_lic_id;
END;
$$;

-- Aprobar solicitud de pase por días en pagos_licencia (solo Superadmin)
CREATE OR REPLACE FUNCTION public.aprobar_pase_dias_licencia(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pago public.pagos_licencia%ROWTYPE;
  v_dias integer;
  v_base date;
  v_nuevo_vence date;
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'Solo el superadministrador puede aprobar pagos.';
  END IF;

  SELECT * INTO v_pago FROM public.pagos_licencia WHERE id = p_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitud de pago no encontrada.';
  END IF;

  v_dias := GREATEST(1, LEAST(COALESCE(v_pago.dias, 1), 365));

  SELECT GREATEST(COALESCE(vence_el, current_date), current_date)
  INTO v_base
  FROM public.suscripciones_negocio
  WHERE owner_id = v_pago.owner_id;

  v_nuevo_vence := COALESCE(v_base, current_date) + v_dias;

  UPDATE public.suscripciones_negocio
  SET
    plan = 'diario',
    estado = 'activo',
    vence_el = v_nuevo_vence,
    vence_en = (v_nuevo_vence::timestamp + interval '23 hours 59 minutes') AT TIME ZONE 'UTC',
    updated_at = now()
  WHERE owner_id = v_pago.owner_id;

  UPDATE public.pagos_licencia
  SET estado = 'aprobado', revisado_en = now()
  WHERE id = p_id;

  RETURN jsonb_build_object(
    'correo', v_pago.correo,
    'vence_el', v_nuevo_vence::text,
    'tipo', 'diario',
    'dias', v_dias
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_crear_pase_dias(text, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aprobar_solicitud_pase_dias(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.aprobar_pase_dias_licencia(uuid) TO authenticated;
