-- Prueba de 30 días automática: quien ya inició sesión en el instalador recibe su prueba sin esperar aprobación.
-- Reglas: solo con sesión iniciada, una prueba por equipo y una prueba por cuenta. Si no aplica, el instalador
-- sigue usando la solicitud con aprobación manual. La licencia anual sigue siendo aprobada por el Superadmin.
CREATE OR REPLACE FUNCTION public.iniciar_prueba_equipo(p_equipo text, p_cliente text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_equipo text := left(trim(coalesce(p_equipo, '')), 80);
  v_user uuid := auth.uid();
  v_correo text;
  v_cliente text;
  v_codigo text;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('estado', 'requiere_sesion');
  END IF;
  IF length(v_equipo) < 8 THEN
    RETURN jsonb_build_object('estado', 'equipo_invalido');
  END IF;

  SELECT lower(u.email) INTO v_correo FROM auth.users u WHERE u.id = v_user;
  IF v_correo IS NULL OR v_correo = '' THEN
    RETURN jsonb_build_object('estado', 'requiere_sesion');
  END IF;

  IF EXISTS (SELECT 1 FROM public.licencias WHERE equipo_id = v_equipo) THEN
    RETURN jsonb_build_object('estado', 'ya_tiene');
  END IF;

  IF EXISTS (SELECT 1 FROM public.licencias WHERE lower(correo) = v_correo AND tipo = 'prueba') THEN
    RETURN jsonb_build_object('estado', 'cuenta_ya_uso_prueba');
  END IF;

  v_cliente := left(coalesce(nullif(trim(coalesce(p_cliente, '')), ''), v_correo), 120);

  INSERT INTO public.licencias (cliente, correo, tipo, inicio, vence_el, equipo_id, notas)
  VALUES (v_cliente, v_correo, 'prueba', current_date, current_date + 30, v_equipo, 'prueba automatica al iniciar sesion')
  RETURNING codigo INTO v_codigo;

  RETURN jsonb_build_object('estado', 'creada', 'codigo', v_codigo);
END;
$$;

REVOKE ALL ON FUNCTION public.iniciar_prueba_equipo(text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.iniciar_prueba_equipo(text, text) TO authenticated;
