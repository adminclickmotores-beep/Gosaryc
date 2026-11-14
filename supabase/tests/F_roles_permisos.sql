-- CONJUNTO F: roles y permisos de empleados dentro de UNA misma empresa.
-- SOLO para un entorno de pruebas. Termina en ROLLBACK. Estados: ver encabezado de A_bodegas_existencias.sql.
-- F1 y F2 pueden salir PERMITIDA_INDEBIDAMENTE: por lectura, la política de bodegas usa es_personal(), que acepta
-- a quien tenga pedidos/cocina/domicilios aunque no tenga el módulo "insumos". Si ocurre, es un hallazgo real.
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
  e1 uuid := gen_random_uuid();  -- empleado activo, solo módulo "domicilios"
  e2 uuid := gen_random_uuid();  -- empleado DESACTIVADO
  v_bod_a uuid;
BEGIN
  BEGIN
    INSERT INTO auth.users (id, email, aud, role, instance_id)
    VALUES (a,  'a_'  || a  || '@aislamiento.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
           (e1, 'e1_' || e1 || '@aislamiento.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
           (e2, 'e2_' || e2 || '@aislamiento.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
    INSERT INTO public.equipo_negocio (owner_id, email, user_id, modulos, activo)
    VALUES (a, 'e1_' || e1 || '@aislamiento.test', e1, ARRAY['domicilios'], true),
           (a, 'e2_' || e2 || '@aislamiento.test', e2, ARRAY['domicilios','insumos'], false);
    INSERT INTO public.restaurante_bodegas (owner_id, nombre) VALUES (a, 'Bodega A') RETURNING id INTO v_bod_a;
    INSERT INTO public.equipo_auditoria (owner_id, actor_id, actor_email, accion, miembro_email)
    VALUES (a, a, 'a@aislamiento.test', 'autorizó a', 'x@aislamiento.test');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RESULTADO | CONJUNTO F | NO_EJECUTADA | preparación falló: % %', SQLSTATE, SQLERRM;
    RETURN;
  END;

  -- Empleado 1 (activo, solo "domicilios")
  PERFORM set_config('request.jwt.claims', json_build_object('sub', e1, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM public.zz_t_filas('F0 control: el empleado ve su propia ficha de equipo', format('SELECT 1 FROM public.equipo_negocio WHERE user_id = %L', e1), 1, true);
  PERFORM public.zz_t_filas('F1 empleado sin módulo "insumos" no ve bodegas', format('SELECT 1 FROM public.restaurante_bodegas WHERE id = %L', v_bod_a), 0);
  PERFORM public.zz_t_filas('F2 empleado sin módulo "insumos" no modifica bodegas', format('UPDATE public.restaurante_bodegas SET nombre = %L WHERE id = %L', 'x', v_bod_a), 0);
  PERFORM public.zz_t_error('F3 empleado no se da módulos nuevos (insert en equipo)', format('INSERT INTO public.equipo_negocio (owner_id, email, user_id, modulos) VALUES (%L, %L, %L, ARRAY[''insumos'',''finanzas''])', a, 'otro@aislamiento.test', e1), '42501');
  PERFORM public.zz_t_filas('F4 empleado no amplía sus propios módulos (update)', format('UPDATE public.equipo_negocio SET modulos = ARRAY[''insumos'',''finanzas'',''domicilios''] WHERE user_id = %L', e1), 0);
  PERFORM public.zz_t_filas('F5 empleado no se reactiva ni cambia a otro (update ajeno)', format('UPDATE public.equipo_negocio SET activo = true WHERE user_id = %L', e2), 0);
  PERFORM public.zz_t_filas('F6 empleado no borra miembros del equipo', 'DELETE FROM public.equipo_negocio', 0);
  PERFORM public.zz_t_filas('F7 empleado no ve el historial del equipo', 'SELECT 1 FROM public.equipo_auditoria', 0);
  PERFORM public.zz_t_error('F8 empleado no escribe en el historial', format('INSERT INTO public.equipo_auditoria (owner_id, actor_id, actor_email, accion, miembro_email) VALUES (%L, %L, %L, %L, %L)', a, e1, 'e@x.test', 'falsa', 'x@x.test'), '42501');

  -- Empleado 2 (desactivado): debe quedar sin acceso a nada de la empresa
  PERFORM set_config('request.jwt.claims', json_build_object('sub', e2, 'role', 'authenticated')::text, true);
  PERFORM public.zz_t_filas('F9 empleado desactivado no ve bodegas', format('SELECT 1 FROM public.restaurante_bodegas WHERE id = %L', v_bod_a), 0);
  PERFORM public.zz_t_filas('F10 empleado desactivado no ve el historial', 'SELECT 1 FROM public.equipo_auditoria', 0);
  PERFORM public.zz_t_error('F11 empleado desactivado no mueve stock', format('SELECT public.mover_stock_bodega(%L, %L, %L, 1)', gen_random_uuid(), v_bod_a, gen_random_uuid()), 'P0001', 'no encontrados');
  RESET ROLE;
END $$;

ROLLBACK;
