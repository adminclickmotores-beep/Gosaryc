-- CONJUNTO C: clientes de domicilios (restaurante_clientes).
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
    INSERT INTO public.restaurante_clientes (owner_id, nombre, telefono) VALUES (a, 'Cliente de A', '3000000001');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RESULTADO | CONJUNTO C | NO_EJECUTADA | preparación falló: % %', SQLSTATE, SQLERRM;
    RETURN;
  END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM public.zz_t_filas('C0 control: A ve su cliente', 'SELECT 1 FROM public.restaurante_clientes WHERE telefono = ''3000000001''', 1, true);

  PERFORM set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  PERFORM public.zz_t_filas('C1 B no ve clientes de A', 'SELECT 1 FROM public.restaurante_clientes WHERE telefono = ''3000000001''', 0);
  PERFORM public.zz_t_filas('C2 B no modifica clientes de A', 'UPDATE public.restaurante_clientes SET nombre = ''x'' WHERE telefono = ''3000000001''', 0);
  PERFORM public.zz_t_filas('C3 B no borra clientes de A', 'DELETE FROM public.restaurante_clientes WHERE telefono = ''3000000001''', 0);
  PERFORM public.zz_t_error('C4 B no crea clientes a nombre de A', format('INSERT INTO public.restaurante_clientes (owner_id, nombre, telefono) VALUES (%L, %L, %L)', a, 'falso', '3000000009'), '42501');
  -- El teléfono ya no es único en toda la plataforma: B puede tener el mismo teléfono en SU negocio.
  PERFORM public.zz_t_filas('C5 control: B registra el mismo teléfono en su negocio', 'INSERT INTO public.restaurante_clientes (nombre, telefono) VALUES (''Cliente de B'', ''3000000001'')', 1, true);

  -- Pedidos con el mismo teléfono en dos negocios: cada uno debe tener su propio cliente (el disparador corre como dueño).
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  BEGIN
    INSERT INTO public.restaurante_pedidos (owner_id, cliente_nombre, cliente_telefono, total) VALUES (a, 'Juan', '3000000002', 10000);
    INSERT INTO public.restaurante_pedidos (owner_id, cliente_nombre, cliente_telefono, total) VALUES (b, 'Juan', '3000000002', 20000);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RESULTADO | C6 | NO_EJECUTADA | no se pudieron crear los pedidos de prueba: % %', SQLSTATE, SQLERRM;
    RETURN;
  END;
  PERFORM public.zz_t_filas('C6 control: dos clientes separados por negocio con el mismo teléfono', 'SELECT 1 FROM public.restaurante_clientes WHERE telefono = ''3000000002'' AND total_pedidos = 1', 2, true);
  PERFORM public.zz_t_filas('C7 control: ningún cliente nuevo queda sin dueño', 'SELECT 1 FROM public.restaurante_clientes WHERE telefono = ''3000000002'' AND owner_id IS NULL', 0, true);
END $$;

ROLLBACK;
