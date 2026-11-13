-- Equipo del negocio: el administrador autoriza correos y marca qué módulos puede usar cada persona.

CREATE TABLE IF NOT EXISTS public.equipo_negocio (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  nombre text,
  user_id uuid references auth.users(id) on delete set null,
  modulos text[] not null default '{}',
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

CREATE UNIQUE INDEX IF NOT EXISTS equipo_negocio_email_idx ON public.equipo_negocio (lower(email));
CREATE INDEX IF NOT EXISTS equipo_negocio_user_idx ON public.equipo_negocio (user_id);

ALTER TABLE public.equipo_negocio ENABLE ROW LEVEL SECURITY;

-- Administrador = cuenta registrada en personal_autorizado (la primera cuenta que se registró).
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.personal_autorizado WHERE user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.es_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.es_admin() TO anon, authenticated;

-- ¿Puede esta cuenta usar el módulo indicado?
CREATE OR REPLACE FUNCTION public.tiene_permiso(p_modulo text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.es_admin() OR EXISTS (
    SELECT 1 FROM public.equipo_negocio
    WHERE user_id = auth.uid() AND activo = true AND p_modulo = ANY (modulos)
  );
$$;

REVOKE ALL ON FUNCTION public.tiene_permiso(text) FROM public;
GRANT EXECUTE ON FUNCTION public.tiene_permiso(text) TO authenticated;

-- Personal con acceso a pedidos, cocina y domicilios (tablas del restaurante).
CREATE OR REPLACE FUNCTION public.es_personal()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.es_admin() OR EXISTS (
    SELECT 1 FROM public.equipo_negocio
    WHERE user_id = auth.uid() AND activo = true
      AND modulos && ARRAY['pedidos', 'cocina', 'domicilios']::text[]
  );
$$;

-- Políticas de la tabla del equipo.
DROP POLICY IF EXISTS "equipo_admin_gestion" ON public.equipo_negocio;
CREATE POLICY "equipo_admin_gestion" ON public.equipo_negocio
  FOR ALL TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin());

DROP POLICY IF EXISTS "equipo_ver_propio" ON public.equipo_negocio;
CREATE POLICY "equipo_ver_propio" ON public.equipo_negocio
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Solo el administrador cambia los datos del negocio.
DROP POLICY IF EXISTS "negocio_gestion_personal" ON public.negocio_config;
CREATE POLICY "negocio_gestion_personal" ON public.negocio_config
  FOR ALL TO authenticated USING (public.es_admin()) WITH CHECK (public.es_admin());

-- Registros de módulos: cada persona solo ve y edita los módulos que tiene permitidos.
DROP POLICY IF EXISTS "modulo_registros_gestion_personal" ON public.modulo_registros;
CREATE POLICY "modulo_registros_gestion_personal" ON public.modulo_registros
  FOR ALL TO authenticated USING (public.tiene_permiso(modulo)) WITH CHECK (public.tiene_permiso(modulo));

-- Al registrarse una cuenta cuyo correo fue autorizado, se vincula sola.
CREATE OR REPLACE FUNCTION public.vincular_equipo_nuevo_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.equipo_negocio
     SET user_id = NEW.id
   WHERE lower(email) = lower(NEW.email) AND user_id IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_vincular_equipo ON auth.users;
CREATE TRIGGER trg_vincular_equipo
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.vincular_equipo_nuevo_usuario();

-- Para cuentas que ya existían: se vincula al iniciar sesión.
CREATE OR REPLACE FUNCTION public.reclamar_acceso()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.equipo_negocio
     SET user_id = auth.uid()
   WHERE user_id IS NULL
     AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
     AND auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.reclamar_acceso() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.reclamar_acceso() TO authenticated;

-- Resumen de acceso de la cuenta actual: { admin, modulos }.
CREATE OR REPLACE FUNCTION public.mi_acceso()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'admin', public.es_admin(),
    'modulos', coalesce(
      (SELECT modulos FROM public.equipo_negocio WHERE user_id = auth.uid() AND activo = true LIMIT 1),
      '{}'::text[]
    )
  );
$$;

REVOKE ALL ON FUNCTION public.mi_acceso() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mi_acceso() TO authenticated;
