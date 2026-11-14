-- CONJUNTO E: archivos y almacenamiento (políticas de storage.objects, buckets "negocios" y "creditos_docs").
-- SOLO para un entorno de pruebas. Termina en ROLLBACK. Estados: ver encabezado de A_bodegas_existencias.sql.
-- LÍMITE: esto prueba las políticas a nivel de base. NO prueba la API de Storage: queda pendiente una prueba
-- con dos sesiones reales (descarga firmada de creditos_docs). "negocios" es público por diseño: con el enlace exacto
-- cualquiera ve la imagen; las políticas solo controlan listar, subir, reemplazar y borrar.
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
    INSERT INTO storage.objects (bucket_id, name) VALUES
      ('negocios', a || '/foto_a.png'),
      ('negocios', 'zz_antigua_sin_carpeta.png'),
      ('creditos_docs', a || '/documento_a.pdf');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'RESULTADO | CONJUNTO E | NO_EJECUTADA | preparación falló (¿buckets inexistentes?): % %', SQLSTATE, SQLERRM;
    RETURN;
  END;

  -- Como A
  PERFORM set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  PERFORM public.zz_t_filas('E0 control: A lista su imagen', format('SELECT 1 FROM storage.objects WHERE bucket_id = ''negocios'' AND name = %L', a || '/foto_a.png'), 1, true);
  PERFORM public.zz_t_filas('E0b control: A lista su documento privado', format('SELECT 1 FROM storage.objects WHERE bucket_id = ''creditos_docs'' AND name = %L', a || '/documento_a.pdf'), 1, true);
  PERFORM public.zz_t_filas('E0c control: A sube a su carpeta', format('INSERT INTO storage.objects (bucket_id, name) VALUES (''negocios'', %L)', a || '/nueva.png'), 1, true);
  -- Imágenes antiguas (sin carpeta): visibles por enlace público, pero nadie las puede modificar.
  PERFORM public.zz_t_filas('E1 imagen antigua: ni A la modifica', 'UPDATE storage.objects SET name = name WHERE bucket_id = ''negocios'' AND name = ''zz_antigua_sin_carpeta.png''', 0);
  PERFORM public.zz_t_filas('E2 imagen antigua: ni A la borra', 'DELETE FROM storage.objects WHERE bucket_id = ''negocios'' AND name = ''zz_antigua_sin_carpeta.png''', 0);

  -- Como B
  PERFORM set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  PERFORM public.zz_t_filas('E3 B no lista imágenes de A', format('SELECT 1 FROM storage.objects WHERE bucket_id = ''negocios'' AND name = %L', a || '/foto_a.png'), 0);
  PERFORM public.zz_t_filas('E4 B no reemplaza imágenes de A', format('UPDATE storage.objects SET name = name WHERE bucket_id = ''negocios'' AND name = %L', a || '/foto_a.png'), 0);
  PERFORM public.zz_t_filas('E5 B no borra imágenes de A', format('DELETE FROM storage.objects WHERE bucket_id = ''negocios'' AND name = %L', a || '/foto_a.png'), 0);
  PERFORM public.zz_t_error('E6 B no sube a la carpeta de A', format('INSERT INTO storage.objects (bucket_id, name) VALUES (''negocios'', %L)', a || '/falsa.png'), '42501');
  PERFORM public.zz_t_error('E7 B no sube a la raíz del bucket (carpeta ajena o vacía)', 'INSERT INTO storage.objects (bucket_id, name) VALUES (''negocios'', ''zz_raiz.png'')', '42501');
  PERFORM public.zz_t_filas('E8 B no lista documentos privados de A', format('SELECT 1 FROM storage.objects WHERE bucket_id = ''creditos_docs'' AND name = %L', a || '/documento_a.pdf'), 0);
  PERFORM public.zz_t_filas('E9 B no modifica documentos privados de A', format('UPDATE storage.objects SET name = name WHERE bucket_id = ''creditos_docs'' AND name = %L', a || '/documento_a.pdf'), 0);
  PERFORM public.zz_t_filas('E10 B no borra documentos privados de A', format('DELETE FROM storage.objects WHERE bucket_id = ''creditos_docs'' AND name = %L', a || '/documento_a.pdf'), 0);
  PERFORM public.zz_t_error('E11 B no sube documentos a la carpeta de A', format('INSERT INTO storage.objects (bucket_id, name) VALUES (''creditos_docs'', %L)', a || '/falso.pdf'), '42501');

  -- Visitante sin sesión
  RESET ROLE;
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  PERFORM public.zz_t_filas('E12 anon no lista documentos privados', 'SELECT 1 FROM storage.objects WHERE bucket_id = ''creditos_docs''', 0);
  PERFORM public.zz_t_error('E13 anon no sube imágenes', 'INSERT INTO storage.objects (bucket_id, name) VALUES (''negocios'', ''zz_anon.png'')', '42501');
  RESET ROLE;
END $$;

ROLLBACK;
