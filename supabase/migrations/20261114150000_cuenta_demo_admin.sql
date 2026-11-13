-- Cuenta de demostración: este correo siempre tiene acceso de administrador para mostrar todos los módulos a clientes.
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.personal_autorizado WHERE user_id = auth.uid())
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'jhonathan.cortes.24@gmail.com';
$$;

REVOKE ALL ON FUNCTION public.es_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.es_admin() TO anon, authenticated;
