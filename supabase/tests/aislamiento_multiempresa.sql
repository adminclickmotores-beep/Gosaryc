-- Pruebas negativas de aislamiento (ejecutar con rol postgres en un entorno de pruebas).
-- Crea dos empresas, actúa como B y comprueba que no cruza datos de A. Revierte todo al final.
BEGIN;
DO $$
DECLARE
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  v_bod_a uuid;
  v_n integer;
BEGIN
  INSERT INTO auth.users (id, email, aud, role, instance_id)
  VALUES (a, 'a@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
         (b, 'b@test.local', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
  INSERT INTO public.restaurante_bodegas (owner_id, nombre) VALUES (a, 'Bodega A') RETURNING id INTO v_bod_a;

  PERFORM set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;

  SELECT count(*) INTO v_n FROM public.restaurante_bodegas WHERE id = v_bod_a;
  ASSERT v_n = 0, 'B ve la bodega de A';
  UPDATE public.restaurante_bodegas SET nombre = 'x' WHERE id = v_bod_a;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  ASSERT v_n = 0, 'B modificó la bodega de A';
  DELETE FROM public.restaurante_bodegas WHERE id = v_bod_a;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  ASSERT v_n = 0, 'B borró la bodega de A';
  RESET ROLE;
END $$;
ROLLBACK;
