-- CONJUNTO B: historial del equipo (equipo_auditoria).
-- SOLO para un entorno de pruebas. Termina en ROLLBACK. Estados: ver encabezado de A_bodegas_existencias.sql.
BEGIN;

CREATE FUNCTION public.zz_t_error(p_id text, p_sql text, p_sqlstate text, p_frag text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $f$
BEGIN
  BEGIN
    EXECUTE p_sql;
    RAISE NOTICE 'RESULTADO | % | PERMITIDA_INDEBIDAMENTE | la operación se ejecutó', p_id;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = p_sqlstate AND (p_frag IS NULL OR SQLERRM ILIKE '%' || p_frag || '%') THEN
      RAISE NOTICE 'RESULTADO | % | BLOQUEADA_OK | % %', p_id, SQLSTATE, SQLERRM;
    ELSE
      RAISE NOTICE 'RESULTADO | % | ERROR_TECNICO | % %', p_id, SQLSTATE, SQLERRM;
    END IF;
  END;
END $f$;

CREATE FUNCTION public.zz_t_filas(p_id text, p_sql text, p_esperadas integer, p_control boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql AS $f$
DECLARE n integer;
BEGIN
  BEGIN
    EXECUTE p_sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF p_control THEN
      IF n = p_esperadas THEN RAISE NOTICE 'RESULTADO | % | CONTROL_OK | % filas', p_id, n;
      ELSE RAISE NOTICE 'RESULTADO | % | CONTROL_FALLIDO | esperaba % filas y hubo %', p_id, p_esperadas, n; END IF;
    ELSIF n = p_esperadas THEN RAISE NOTICE 'RESULTADO | % | BLOQUEADA_OK | % filas afectadas', p_id, n;
    ELSE RAISE NOTICE 'RESULTADO | % | PERMITIDA_INDEBIDAMENTE | esperaba % filas y hubo %', p_id, p_esperadas, n; END IF;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = '42501' AND NOT p_control THEN
      RAISE NOTICE 'RESULTADO | % | BLOQUEADA_OK | permiso/RLS denegó: %', p_id, SQLERRM;
    ELSE
      RAISE NOTICE 'RESULTADO | % | ERROR_TECNICO | % %', p_id, SQLSTATE, SQLERRM;
    END IF;
  END;
END $f$;

DO $$
DECLARE
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
BEGIN
  BEGIN
    INSERT INTO auth.users (id, email, aud, role, instance_id)
    VALUES (a, 'a_' || a || '@aislamiento.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
           (b, 'b_' || b || '@aislamiento.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
    INSERT INTO public.equipo_auditoria (owner_id, actor_id, actor_email, accion, miembro_email, detalle)
    VALUES (a, a, 'a@aislamiento.test', 'autorizó a', 'miembro_de_a@aislamiento.test', 'Módulos: pedidos');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RESULTADO | CONJUNTO B | NO_EJECUTADA | preparación falló: % %', SQLSTATE, SQLERRM;
    RETURN;
  END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM public.zz_t_filas('B0 control: A (administrador) ve su historial', 'SELECT 1 FROM public.equipo_auditoria WHERE miembro_email = ''miembro_de_a@aislamiento.test''', 1, true);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  PERFORM public.zz_t_filas('B1 B no ve el historial de A', 'SELECT 1 FROM public.equipo_auditoria WHERE miembro_email = ''miembro_de_a@aislamiento.test''', 0);
  PERFORM public.zz_t_error('B2 B no escribe en el historial de A', format('INSERT INTO public.equipo_auditoria (owner_id, actor_id, actor_email, accion, miembro_email) VALUES (%L, %L, %L, %L, %L)', a, b, 'b@x.test', 'falsa', 'x@x.test'), '42501');
  PERFORM public.zz_t_filas('B3 B no modifica el historial de A', 'UPDATE public.equipo_auditoria SET detalle = ''x'' WHERE miembro_email = ''miembro_de_a@aislamiento.test''', 0);
  PERFORM public.zz_t_filas('B4 B no borra el historial de A', 'DELETE FROM public.equipo_auditoria WHERE miembro_email = ''miembro_de_a@aislamiento.test''', 0);

  -- B autoriza a un miembro en SU equipo: el trigger debe guardar el historial a nombre de B.
  PERFORM public.zz_t_filas('B5 control: B autoriza a un miembro de su equipo', 'INSERT INTO public.equipo_negocio (email, nombre, modulos) VALUES (''miembro_de_b@aislamiento.test'', ''M'', ARRAY[''pedidos''])', 1, true);
  PERFORM public.zz_t_filas('B6 control: B ve su propio historial', 'SELECT 1 FROM public.equipo_auditoria WHERE miembro_email = ''miembro_de_b@aislamiento.test''', 1, true);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  PERFORM public.zz_t_filas('B7 A no ve el historial de B', 'SELECT 1 FROM public.equipo_auditoria WHERE miembro_email = ''miembro_de_b@aislamiento.test''', 0);

  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  PERFORM public.zz_t_filas('B8 anon no ve ningún historial', 'SELECT 1 FROM public.equipo_auditoria', 0);
  RESET ROLE;
END $$;

ROLLBACK;
