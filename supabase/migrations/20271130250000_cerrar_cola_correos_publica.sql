-- Blindaje (19-nov-2026): la cola de correos solo la usa el servidor (service_role).
-- Antes, las funciones enqueue_email / read_email_batch / delete_email podían ejecutarse
-- con la clave pública (anon) o por cualquier usuario con sesión, y así cualquiera podía
-- borrar correos en cola. Solo REVOKE/GRANT y RLS: no se borra ninguna tabla ni dato.

-- 1. Funciones de la cola de correos: quitar ejecución a anon, authenticated y public.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS fn
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE (n.nspname = 'public' AND p.proname IN (
             'enqueue_email', 'read_email_batch', 'delete_email', 'move_to_dlq', 'read_email', 'send_email'))
       OR (n.nspname = 'pgmq')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.fn);
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Cola correos funciones: %', SQLERRM;
END $$;

-- 2. Tablas internas de la cola (esquema pgmq) y de estado de envío: sin acceso para anon ni usuarios.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'pgmq'
  LOOP
    EXECUTE format('REVOKE ALL ON TABLE %I.%I FROM PUBLIC, anon, authenticated', t.schemaname, t.tablename);
  END LOOP;
  IF to_regclass('public.email_send_state') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY';
    EXECUTE 'REVOKE ALL ON public.email_send_state FROM anon, authenticated';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Cola correos tablas: %', SQLERRM;
END $$;
