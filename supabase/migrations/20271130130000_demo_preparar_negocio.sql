-- Demo de vehículos abría el panel del restaurante (18-nov-2026).
-- La configuración del negocio demo se guardaba desde el navegador; si las reglas
-- de acceso no dejaban escribir, la actualización afectaba 0 filas SIN error y el
-- negocio quedaba como restaurante (o la cuenta demo seguía ligada a otro negocio
-- como miembro de equipo y veía ese negocio).
-- Esta función, solo para las dos cuentas demo, deja la cuenta como dueña de su
-- propio negocio y fija el tipo correcto. No borra datos.

CREATE OR REPLACE FUNCTION public.demo_preparar_negocio(p_tipo text, p_nombre text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_tipo text := lower(trim(coalesce(p_tipo, '')));
  v_nombre text := left(coalesce(nullif(trim(p_nombre), ''), 'Negocio demo'), 120);
  v_id uuid;
  v_actual text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sin sesión.'; END IF;
  IF v_email NOT IN ('demo.vehiculos@gosaryc.com', 'demo.restaurante@gosaryc.com') THEN
    RAISE EXCEPTION 'Solo disponible para las cuentas demo.';
  END IF;
  -- Cada cuenta demo solo puede quedar con su propio tipo.
  IF v_email = 'demo.vehiculos@gosaryc.com' AND v_tipo <> 'concesionario' THEN
    RAISE EXCEPTION 'Tipo no válido para esta demo.';
  END IF;
  IF v_email = 'demo.restaurante@gosaryc.com' AND v_tipo <> 'restaurante' THEN
    RAISE EXCEPTION 'Tipo no válido para esta demo.';
  END IF;

  -- La cuenta demo nunca queda como empleada de otro negocio: así ve solo el suyo.
  UPDATE public.equipo_negocio
     SET activo = false
   WHERE user_id = v_uid AND owner_id IS NOT NULL AND owner_id <> v_uid AND activo = true;

  SELECT id, tipo_negocio INTO v_id, v_actual
    FROM public.negocio_config WHERE owner_id = v_uid
   ORDER BY created_at LIMIT 1;

  IF v_id IS NULL THEN
    INSERT INTO public.negocio_config (owner_id, nombre, tipo_negocio)
    VALUES (v_uid, v_nombre, v_tipo);
  ELSE
    IF v_actual IS DISTINCT FROM v_tipo THEN
      UPDATE public.negocio_config SET tipo_negocio = v_tipo, updated_at = now() WHERE id = v_id;
    END IF;
    -- Segundo paso: el cambio de tipo reinicia el nombre, se vuelve a poner.
    UPDATE public.negocio_config SET nombre = v_nombre, updated_at = now() WHERE id = v_id;
  END IF;

  RETURN v_tipo;
END;
$$;

REVOKE ALL ON FUNCTION public.demo_preparar_negocio(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.demo_preparar_negocio(text, text) TO authenticated;
