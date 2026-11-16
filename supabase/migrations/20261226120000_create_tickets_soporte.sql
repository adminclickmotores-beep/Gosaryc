-- Tickets de soporte: el cliente reporta un problema y el equipo de soporte (cuenta de soporte o superadmin) lo atiende.
CREATE TABLE IF NOT EXISTS public.tickets_soporte (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  correo text,
  negocio text,
  categoria text NOT NULL DEFAULT 'falla' CHECK (categoria IN ('falla', 'duda', 'sugerencia', 'cuenta')),
  asunto text NOT NULL,
  descripcion text NOT NULL,
  pagina text,
  estado text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'en_proceso', 'resuelto')),
  respuesta text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tickets_soporte ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.es_soporte()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.es_superadmin()
    OR lower(coalesce(auth.jwt() ->> 'email', '')) = 'gosarycsoporte@gmail.com';
$$;

REVOKE ALL ON FUNCTION public.es_soporte() FROM public;
GRANT EXECUTE ON FUNCTION public.es_soporte() TO authenticated;

DROP POLICY IF EXISTS "tickets_crear_propio" ON public.tickets_soporte;
CREATE POLICY "tickets_crear_propio" ON public.tickets_soporte
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "tickets_ver_propio" ON public.tickets_soporte;
CREATE POLICY "tickets_ver_propio" ON public.tickets_soporte
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.es_soporte());

DROP POLICY IF EXISTS "tickets_soporte_actualiza" ON public.tickets_soporte;
CREATE POLICY "tickets_soporte_actualiza" ON public.tickets_soporte
  FOR UPDATE TO authenticated
  USING (public.es_soporte())
  WITH CHECK (public.es_soporte());
