-- CONJUNTO A: bodegas y existencias.
-- SOLO para un entorno de pruebas. Termina en ROLLBACK: no deja datos ni funciones.
-- Cada línea "RESULTADO | id | estado | detalle" sale como aviso (NOTICE).
-- Estados: BLOQUEADA_OK (bloqueo correcto y específico) · PERMITIDA_INDEBIDAMENTE (falla de seguridad)
--          ERROR_TECNICO (error distinto del esperado: NO cuenta como aprobada) · NO_EJECUTADA (no se pudo preparar)
--          CONTROL_OK / CONTROL_FALLIDO (verifica que lo legítimo sí funciona; sin control la prueba no vale)
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
  v_ins uuid; v_bod_a uuid; v_bod_b uuid;
BEGIN
  BEGIN
    INSERT INTO auth.users (id, email, aud, role, instance_id)
    VALUES (a, 'a_' || a || '@aislamiento.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
           (b, 'b_' || b || '@aislamiento.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
    INSERT INTO public.restaurante_insumos (owner_id, nombre, unidad, stock, stock_minimo, precio_compra, cantidad_compra)
    VALUES (a, 'Insumo A', 'kg', 10, 1, 1000, 1) RETURNING id INTO v_ins;
    INSERT INTO public.restaurante_bodegas (owner_id, nombre) VALUES (a, 'Bodega A') RETURNING id INTO v_bod_a;
    INSERT INTO public.restaurante_bodegas (owner_id, nombre) VALUES (b, 'Bodega B') RETURNING id INTO v_bod_b;
    INSERT INTO public.restaurante_stock_bodega (insumo_id, bodega_id, stock, owner_id) VALUES (v_ins, v_bod_a, 10, a);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RESULTADO | CONJUNTO A | NO_EJECUTADA | preparación falló: % %', SQLSTATE, SQLERRM;
    RETURN;
  END;

  -- Como A (control: lo legítimo funciona)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM public.zz_t_filas('A0 control: A ve su bodega', format('SELECT 1 FROM public.restaurante_bodegas WHERE id = %L', v_bod_a), 1, true);
  PERFORM public.zz_t_filas('A0b control: A ve su existencia', format('SELECT 1 FROM public.restaurante_stock_bodega WHERE bodega_id = %L', v_bod_a), 1, true);

  -- Como B (empresa intrusa)
  PERFORM set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  PERFORM public.zz_t_filas('A1 B no ve bodegas de A', format('SELECT 1 FROM public.restaurante_bodegas WHERE id = %L', v_bod_a), 0);
  PERFORM public.zz_t_filas('A2 B no ve existencias de A', format('SELECT 1 FROM public.restaurante_stock_bodega WHERE bodega_id = %L', v_bod_a), 0);
  PERFORM public.zz_t_filas('A3 B no ve insumos de A', format('SELECT 1 FROM public.restaurante_insumos WHERE id = %L', v_ins), 0);
  PERFORM public.zz_t_filas('A4 B no modifica bodega de A', format('UPDATE public.restaurante_bodegas SET nombre = %L WHERE id = %L', 'x', v_bod_a), 0);
  PERFORM public.zz_t_filas('A5 B no borra bodega de A', format('DELETE FROM public.restaurante_bodegas WHERE id = %L', v_bod_a), 0);
  PERFORM public.zz_t_filas('A6 B no modifica existencias de A', format('UPDATE public.restaurante_stock_bodega SET stock = 999 WHERE bodega_id = %L', v_bod_a), 0);
  PERFORM public.zz_t_error('A7 B no crea bodega a nombre de A', format('INSERT INTO public.restaurante_bodegas (owner_id, nombre) VALUES (%L, %L)', a, 'falsa'), '42501');
  PERFORM public.zz_t_error('A8 B no crea existencia en bodega de A', format('INSERT INTO public.restaurante_stock_bodega (insumo_id, bodega_id, stock, owner_id) VALUES (%L, %L, 1, %L)', v_ins, v_bod_a, a), '42501');
  PERFORM public.zz_t_error('A9 B no llama agregar_stock_bodega (revocada)', format('SELECT public.agregar_stock_bodega(%L, %L, 5)', v_ins, v_bod_b), '42501');
  PERFORM public.zz_t_error('A10 B no llama quitar_stock_bodegas (revocada)', format('SELECT public.quitar_stock_bodegas(%L, 1)', v_ins), '42501');
  PERFORM public.zz_t_error('A11 B no mueve stock de A con mover_stock_bodega', format('SELECT public.mover_stock_bodega(%L, %L, %L, 1)', v_ins, v_bod_a, v_bod_b), 'P0001', 'no encontrados');

  -- Como visitante sin sesión
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  PERFORM public.zz_t_error('A12 anon no llama mover_stock_bodega', format('SELECT public.mover_stock_bodega(%L, %L, %L, 1)', v_ins, v_bod_a, v_bod_b), '42501');
  PERFORM public.zz_t_error('A13 anon no llama agregar_stock_bodega', format('SELECT public.agregar_stock_bodega(%L, %L, 5)', v_ins, v_bod_a), '42501');
  PERFORM public.zz_t_error('A14 anon no llama descontar_insumos_pedido', format('SELECT public.descontar_insumos_pedido(%L)', gen_random_uuid()), '42501');
  RESET ROLE;
END $$;

ROLLBACK;
