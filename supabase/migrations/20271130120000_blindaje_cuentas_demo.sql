-- Blindaje de las cuentas demo reales: no se puede eliminar su negocio.
CREATE OR REPLACE FUNCTION public.bloquear_borrado_negocio_demo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = OLD.owner_id
      AND lower(u.email) IN ('demo.vehiculos@gosaryc.com', 'demo.restaurante@gosaryc.com')
  ) THEN
    RAISE EXCEPTION 'DEMO_PROTEGIDA: el negocio de una cuenta demo no se puede eliminar';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS negocio_config_demo_no_borrar ON public.negocio_config;
CREATE TRIGGER negocio_config_demo_no_borrar
  BEFORE DELETE ON public.negocio_config
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_negocio_demo();
