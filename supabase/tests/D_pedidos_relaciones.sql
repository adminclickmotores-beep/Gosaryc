-- CONJUNTO D: pedidos y relaciones entre empresas (repartidores, mesas, productos, artículos).
-- SOLO para un entorno de pruebas. Termina en ROLLBACK. Estados: ver encabezado de A_bodegas_existencias.sql.
-- Nota: crear pedidos para cualquier negocio desde el menú público es intencional; no se prueba como falla.
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
  v_rep_a uuid; v_rep_b uuid; v_mesa_a uuid; v_prod_a uuid; v_ped_b uuid; v_ped_a uuid;
BEGIN
  BEGIN
    INSERT INTO auth.users (id, email, aud, role, instance_id)
    VALUES (a, 'a_' || a || '@aislamiento.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
           (b, 'b_' || b || '@aislamiento.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
    INSERT INTO public.restaurante_repartidores (owner_id, nombre) VALUES (a, 'Repartidor A') RETURNING id INTO v_rep_a;
    INSERT INTO public.restaurante_repartidores (owner_id, nombre) VALUES (b, 'Repartidor B') RETURNING id INTO v_rep_b;
    INSERT INTO public.restaurante_mesas (owner_id, numero) VALUES (a, '1') RETURNING id INTO v_mesa_a;
    INSERT INTO public.restaurante_productos (owner_id, nombre, precio) VALUES (a, 'Producto A', 1000) RETURNING id INTO v_prod_a;
    INSERT INTO public.restaurante_pedidos (owner_id, cliente_nombre, cliente_telefono, total) VALUES (b, 'Cliente B', '3000000003', 0) RETURNING id INTO v_ped_b;
    INSERT INTO public.restaurante_pedidos (owner_id, cliente_nombre, cliente_telefono, total) VALUES (a, 'Cliente A', '3000000004', 0) RETURNING id INTO v_ped_a;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RESULTADO | CONJUNTO D | NO_EJECUTADA | preparación falló: % %', SQLSTATE, SQLERRM;
    RETURN;
  END;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  PERFORM public.zz_t_filas('D0 control: B ve su propio pedido', format('SELECT 1 FROM public.restaurante_pedidos WHERE id = %L', v_ped_b), 1, true);
  PERFORM public.zz_t_filas('D1 B no ve pedidos de A', format('SELECT 1 FROM public.restaurante_pedidos WHERE id = %L', v_ped_a), 0);
  PERFORM public.zz_t_filas('D2 B no modifica pedidos de A', format('UPDATE public.restaurante_pedidos SET estado = %L WHERE id = %L', 'cancelado', v_ped_a), 0);
  PERFORM public.zz_t_filas('D3 B no borra pedidos de A', format('DELETE FROM public.restaurante_pedidos WHERE id = %L', v_ped_a), 0);
  PERFORM public.zz_t_filas('D4 B no ve repartidores de A', format('SELECT 1 FROM public.restaurante_repartidores WHERE id = %L', v_rep_a), 0);
  PERFORM public.zz_t_filas('D5 B no ve mesas de A', format('SELECT 1 FROM public.restaurante_mesas WHERE id = %L', v_mesa_a), 0);

  -- Relaciones cruzadas: debe responder el disparador con su mensaje específico (P0001), no cualquier error.
  PERFORM public.zz_t_error('D6 pedido de B con repartidor de A', format('INSERT INTO public.restaurante_pedidos (owner_id, cliente_nombre, cliente_telefono, total, repartidor_id) VALUES (%L, %L, %L, 0, %L)', b, 'X', '3000000005', v_rep_a), 'P0001', 'Repartidor no válido');
  PERFORM public.zz_t_error('D7 pedido de B con mesa de A', format('INSERT INTO public.restaurante_pedidos (owner_id, cliente_nombre, cliente_telefono, total, mesa_id) VALUES (%L, %L, %L, 0, %L)', b, 'X', '3000000006', v_mesa_a), 'P0001', 'Mesa no válida');
  PERFORM public.zz_t_error('D8 B reasigna su pedido a repartidor de A', format('UPDATE public.restaurante_pedidos SET repartidor_id = %L WHERE id = %L', v_rep_a, v_ped_b), 'P0001', 'Repartidor no válido');
  PERFORM public.zz_t_filas('D9 control: B asigna su pedido a SU repartidor', format('UPDATE public.restaurante_pedidos SET repartidor_id = %L WHERE id = %L', v_rep_b, v_ped_b), 1, true);

  -- Artículos de pedido con un producto de otra empresa: lo bloquea la política (42501).
  PERFORM public.zz_t_error('D10 artículo de pedido de B con producto de A', format('INSERT INTO public.restaurante_pedido_items (pedido_id, producto_id, nombre, cantidad, precio_unitario) VALUES (%L, %L, %L, 1, 1000)', v_ped_b, v_prod_a, 'Producto A'), '42501');
  PERFORM public.zz_t_filas('D11 control: artículo sin producto enlazado', format('INSERT INTO public.restaurante_pedido_items (pedido_id, producto_id, nombre, cantidad, precio_unitario) VALUES (%L, NULL, %L, 1, 1000)', v_ped_b, 'Libre'), 1, true);
  PERFORM public.zz_t_filas('D12 B no ve artículos de pedidos de A', format('SELECT 1 FROM public.restaurante_pedido_items WHERE pedido_id = %L', v_ped_a), 0);
  RESET ROLE;
END $$;

ROLLBACK;
