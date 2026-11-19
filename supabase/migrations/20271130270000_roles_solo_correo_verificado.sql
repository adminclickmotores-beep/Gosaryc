-- Los roles con privilegios (superadmin, soporte, equipo del negocio) solo se reconocen si el correo
-- de la cuenta está VERIFICADO. Antes bastaba con registrarse con ese correo.

CREATE OR REPLACE FUNCTION public.correo_verificado()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM auth.users u
    WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
  );
$$;

REVOKE ALL ON FUNCTION public.correo_verificado() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.correo_verificado() TO authenticated;

CREATE OR REPLACE FUNCTION public.es_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT auth.uid() IS NOT NULL
    AND lower(coalesce(auth.jwt() ->> 'email', '')) = 'jhonathan.cortes.24@gmail.com'
    AND EXISTS (
      SELECT 1 FROM auth.users u
      WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
    );
$$;

REVOKE ALL ON FUNCTION public.es_superadmin() FROM public;
GRANT EXECUTE ON FUNCTION public.es_superadmin() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.es_soporte()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.es_superadmin()
    OR (
      lower(coalesce(auth.jwt() ->> 'email', '')) = 'gosarycsoporte@gmail.com'
      AND public.correo_verificado()
    );
$$;

REVOKE ALL ON FUNCTION public.es_soporte() FROM public;
GRANT EXECUTE ON FUNCTION public.es_soporte() TO authenticated;

-- Vincular al equipo solo con correo verificado.
CREATE OR REPLACE FUNCTION public.vincular_equipo_nuevo_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.equipo_negocio
       SET user_id = NEW.id
     WHERE lower(email) = lower(NEW.email) AND user_id IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reclamar_acceso()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, auth
AS $$
  UPDATE public.equipo_negocio
     SET user_id = auth.uid()
   WHERE user_id IS NULL
     AND auth.uid() IS NOT NULL
     AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
     AND EXISTS (
       SELECT 1 FROM auth.users u
       WHERE u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
     );
$$;

REVOKE ALL ON FUNCTION public.reclamar_acceso() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reclamar_acceso() TO authenticated;
