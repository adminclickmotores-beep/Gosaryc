-- Migración preventiva de portabilidad: garantiza que organizations, org_members y campaign_requests
-- existan con llaves, índices y RLS estricta aunque el repositorio se use en una base nueva.
-- Idempotente: si una tabla ya existe en la base real NO se toca (ni columnas, ni índices, ni políticas).
-- No borra ni modifica datos.

-- ============================================================
-- Tipos (solo si no existen)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                  WHERE n.nspname = 'public' AND t.typname = 'org_role') THEN
    CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                  WHERE n.nspname = 'public' AND t.typname = 'campaign_request_status') THEN
    CREATE TYPE public.campaign_request_status AS ENUM ('new', 'accepted', 'declined', 'converted');
  END IF;
END $$;

-- ============================================================
-- Tablas base (CREATE TABLE IF NOT EXISTS)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  industry text,
  public_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.org_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.org_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.campaign_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workspace_id uuid,
  template_id uuid,
  requestor_name text,
  requestor_email text NOT NULL,
  brief text NOT NULL,
  desired_due_date date,
  status public.campaign_request_status NOT NULL DEFAULT 'new',
  status_token text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  status_token_expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Funciones auxiliares (nombres propios, no pisan las existentes)
-- ============================================================
CREATE OR REPLACE FUNCTION public.base_es_miembro_org(p_org uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.org_members m WHERE m.org_id = p_org AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.base_es_admin_org(p_org uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.org_members m
     WHERE m.org_id = p_org AND m.user_id = auth.uid() AND m.role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.base_es_dueno_org(p_org uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.org_members m
     WHERE m.org_id = p_org AND m.user_id = auth.uid() AND m.role = 'owner'
  );
$$;

REVOKE ALL ON FUNCTION public.base_es_miembro_org(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.base_es_admin_org(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.base_es_dueno_org(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.base_es_miembro_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.base_es_admin_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.base_es_dueno_org(uuid) TO authenticated;

-- ============================================================
-- Índices, RLS y políticas: SOLO si la tabla aún no tiene RLS ni políticas
-- (es decir, se acaba de crear aquí; las tablas reales ya configuradas no se tocan).
-- ============================================================
DO $$
BEGIN
  -- organizations
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations') THEN
    CREATE INDEX IF NOT EXISTS organizations_slug_idx ON public.organizations (slug);
    CREATE INDEX IF NOT EXISTS organizations_created_at_idx ON public.organizations (created_at DESC);
    ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS organizations_leer_miembros ON public.organizations;
    CREATE POLICY organizations_leer_miembros ON public.organizations
      FOR SELECT TO authenticated USING (public.base_es_miembro_org(id));

    -- Datos públicos de la organización (nombre, slug) para el formulario público de solicitudes.
    DROP POLICY IF EXISTS organizations_leer_publico ON public.organizations;
    CREATE POLICY organizations_leer_publico ON public.organizations
      FOR SELECT TO anon USING (slug IS NOT NULL);

    DROP POLICY IF EXISTS organizations_editar_admin ON public.organizations;
    CREATE POLICY organizations_editar_admin ON public.organizations
      FOR UPDATE TO authenticated
      USING (public.base_es_admin_org(id)) WITH CHECK (public.base_es_admin_org(id));
  END IF;

  -- org_members
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'org_members') THEN
    CREATE UNIQUE INDEX IF NOT EXISTS org_members_org_user_uidx ON public.org_members (org_id, user_id);
    CREATE INDEX IF NOT EXISTS org_members_user_idx ON public.org_members (user_id);
    ALTER TABLE public.org_members ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS org_members_leer ON public.org_members;
    CREATE POLICY org_members_leer ON public.org_members
      FOR SELECT TO authenticated
      USING (user_id = auth.uid() OR public.base_es_miembro_org(org_id));

    -- Los administradores solo agregan miembros comunes; solo el dueño asigna otros roles.
    DROP POLICY IF EXISTS org_members_agregar ON public.org_members;
    CREATE POLICY org_members_agregar ON public.org_members
      FOR INSERT TO authenticated
      WITH CHECK (
        public.base_es_dueno_org(org_id)
        OR (public.base_es_admin_org(org_id) AND role = 'member')
      );

    DROP POLICY IF EXISTS org_members_editar ON public.org_members;
    CREATE POLICY org_members_editar ON public.org_members
      FOR UPDATE TO authenticated
      USING (public.base_es_dueno_org(org_id)) WITH CHECK (public.base_es_dueno_org(org_id));

    DROP POLICY IF EXISTS org_members_quitar ON public.org_members;
    CREATE POLICY org_members_quitar ON public.org_members
      FOR DELETE TO authenticated
      USING (public.base_es_dueno_org(org_id) OR (public.base_es_admin_org(org_id) AND role = 'member'));
  END IF;

  -- campaign_requests
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'campaign_requests') THEN
    CREATE INDEX IF NOT EXISTS campaign_requests_org_idx ON public.campaign_requests (org_id);
    CREATE INDEX IF NOT EXISTS campaign_requests_status_idx ON public.campaign_requests (org_id, status);
    CREATE INDEX IF NOT EXISTS campaign_requests_created_at_idx ON public.campaign_requests (created_at DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS campaign_requests_status_token_uidx ON public.campaign_requests (status_token);
    ALTER TABLE public.campaign_requests ENABLE ROW LEVEL SECURITY;

    -- Envío público validado: siempre estado "new" y textos acotados.
    DROP POLICY IF EXISTS campaign_requests_insertar_publico ON public.campaign_requests;
    CREATE POLICY campaign_requests_insertar_publico ON public.campaign_requests
      FOR INSERT TO anon, authenticated
      WITH CHECK (
        status = 'new'
        AND length(brief) BETWEEN 1 AND 4000
        AND length(requestor_email) BETWEEN 5 AND 200
        AND requestor_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
        AND (requestor_name IS NULL OR length(requestor_name) <= 200)
        AND EXISTS (SELECT 1 FROM public.organizations o WHERE o.id = org_id)
      );

    DROP POLICY IF EXISTS campaign_requests_leer_miembros ON public.campaign_requests;
    CREATE POLICY campaign_requests_leer_miembros ON public.campaign_requests
      FOR SELECT TO authenticated USING (public.base_es_miembro_org(org_id));

    DROP POLICY IF EXISTS campaign_requests_editar_admin ON public.campaign_requests;
    CREATE POLICY campaign_requests_editar_admin ON public.campaign_requests
      FOR UPDATE TO authenticated
      USING (public.base_es_admin_org(org_id)) WITH CHECK (public.base_es_admin_org(org_id));

    DROP POLICY IF EXISTS campaign_requests_borrar_admin ON public.campaign_requests;
    CREATE POLICY campaign_requests_borrar_admin ON public.campaign_requests
      FOR DELETE TO authenticated USING (public.base_es_admin_org(org_id));
  END IF;
END $$;
