-- Endurecimiento estricto de seguridad RLS (multi-tenant + Superadmin exclusivo).
-- Regla 1: En licencias y roles, SOLO jhonathan.cortes.24@gmail.com puede crear, modificar o asignar licencias pagas, licencias de 1 año o roles de administrador.
-- Regla 2: Aislamiento estricto por negocio_id / owner_id en clientes, ventas, leads y PQRS, permitiendo solo lectura controlada para negocios marcados explícitamente como modo Demo público.

-- 1. Marca explícita de modo Demo público en negocio_config.
ALTER TABLE public.negocio_config
  ADD COLUMN IF NOT EXISTS es_demo_publico boolean NOT NULL DEFAULT false;

-- Marcar únicamente los negocios oficiales de demostración pública.
UPDATE public.negocio_config nc
SET es_demo_publico = true
FROM auth.users u
WHERE nc.owner_id = u.id
  AND lower(u.email) IN ('demo.vehiculos@gosaryc.com', 'demo.restaurante@gosaryc.com')
  AND nc.es_demo_publico IS DISTINCT FROM true;

-- Asegurar owner_id en restaurante_clientes para aislamiento multi-tenant.
ALTER TABLE public.restaurante_clientes
  ADD COLUMN IF NOT EXISTS owner_id uuid DEFAULT public.mi_negocio_id();

-- 2. Función estricta de Superadministrador: únicamente jhonathan.cortes.24@gmail.com.
CREATE OR REPLACE FUNCTION public.es_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    lower(coalesce(auth.jwt() ->> 'email', '')) = 'jhonathan.cortes.24@gmail.com'
    OR EXISTS (
      SELECT 1
      FROM auth.users u
      WHERE u.id = auth.uid()
        AND lower(u.email) = 'jhonathan.cortes.24@gmail.com'
    );
$$;

-- 3. Helpers de aislamiento multi-tenant y modo Demo público controlado.
CREATE OR REPLACE FUNCTION public.mi_negocio_config_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.negocio_config
  WHERE owner_id = public.mi_negocio_id()
  ORDER BY created_at ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.es_negocio_demo_publico(p_negocio_id uuid DEFAULT NULL, p_owner_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.negocio_config nc
    WHERE nc.es_demo_publico = true
      AND (
        (p_negocio_id IS NOT NULL AND nc.id = p_negocio_id)
        OR (p_owner_id IS NOT NULL AND nc.owner_id = p_owner_id)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.es_usuario_demo_actual()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) IN (
    'demo.vehiculos@gosaryc.com',
    'demo.restaurante@gosaryc.com'
  );
$$;

-- 4. REGLA 1: Políticas RESTRICTIVE en licencias, suscripciones y roles.
DO $$
BEGIN
  -- Tabla licencias (instalaciones locales / claves): solo Superadmin escribe; usuario solo lee las de su correo.
  IF to_regclass('public.licencias') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.licencias ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'licencias' AND policyname = 'rls_estricto_licencias_select') THEN
      CREATE POLICY rls_estricto_licencias_select
        ON public.licencias AS RESTRICTIVE FOR SELECT TO authenticated
        USING (
          public.es_superadmin()
          OR lower(coalesce(correo, '')) = lower(coalesce(auth.jwt() ->> 'email', ''))
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'licencias' AND policyname = 'rls_estricto_licencias_insert') THEN
      CREATE POLICY rls_estricto_licencias_insert
        ON public.licencias AS RESTRICTIVE FOR INSERT TO authenticated
        WITH CHECK (public.es_superadmin());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'licencias' AND policyname = 'rls_estricto_licencias_update') THEN
      CREATE POLICY rls_estricto_licencias_update
        ON public.licencias AS RESTRICTIVE FOR UPDATE TO authenticated
        USING (public.es_superadmin())
        WITH CHECK (public.es_superadmin());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'licencias' AND policyname = 'rls_estricto_licencias_delete') THEN
      CREATE POLICY rls_estricto_licencias_delete
        ON public.licencias AS RESTRICTIVE FOR DELETE TO authenticated
        USING (public.es_superadmin());
    END IF;
  END IF;

  -- Tabla suscripciones_negocio: usuarios solo leen la de su propio negocio; solo Superadmin crea/modifica/asigna licencias pagas o de 1 año.
  IF to_regclass('public.suscripciones_negocio') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.suscripciones_negocio ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suscripciones_negocio' AND policyname = 'rls_estricto_suscripciones_select') THEN
      CREATE POLICY rls_estricto_suscripciones_select
        ON public.suscripciones_negocio AS RESTRICTIVE FOR SELECT TO authenticated
        USING (
          public.es_superadmin()
          OR owner_id = public.mi_negocio_id()
          OR owner_id = auth.uid()
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suscripciones_negocio' AND policyname = 'rls_estricto_suscripciones_insert') THEN
      CREATE POLICY rls_estricto_suscripciones_insert
        ON public.suscripciones_negocio AS RESTRICTIVE FOR INSERT TO authenticated
        WITH CHECK (public.es_superadmin());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suscripciones_negocio' AND policyname = 'rls_estricto_suscripciones_update') THEN
      CREATE POLICY rls_estricto_suscripciones_update
        ON public.suscripciones_negocio AS RESTRICTIVE FOR UPDATE TO authenticated
        USING (public.es_superadmin())
        WITH CHECK (public.es_superadmin());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suscripciones_negocio' AND policyname = 'rls_estricto_suscripciones_delete') THEN
      CREATE POLICY rls_estricto_suscripciones_delete
        ON public.suscripciones_negocio AS RESTRICTIVE FOR DELETE TO authenticated
        USING (public.es_superadmin());
    END IF;
  END IF;

  -- Tabla user_roles (si existe): solo Superadmin puede asignar o modificar roles de administrador.
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'rls_estricto_user_roles_insert') THEN
      CREATE POLICY rls_estricto_user_roles_insert
        ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated
        WITH CHECK (public.es_superadmin());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'rls_estricto_user_roles_update') THEN
      CREATE POLICY rls_estricto_user_roles_update
        ON public.user_roles AS RESTRICTIVE FOR UPDATE TO authenticated
        USING (public.es_superadmin())
        WITH CHECK (public.es_superadmin());
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'rls_estricto_user_roles_delete') THEN
      CREATE POLICY rls_estricto_user_roles_delete
        ON public.user_roles AS RESTRICTIVE FOR DELETE TO authenticated
        USING (public.es_superadmin());
    END IF;
  END IF;
END $$;

-- 5. REGLA 2: Aislamiento estricto multi-tenant (clientes, ventas, leads y PQRS) con lectura controlada en modo Demo público.
DO $$
BEGIN
  -- Leads CRM (crm_leads): tiene negocio_id y owner_id.
  IF to_regclass('public.crm_leads') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crm_leads' AND policyname = 'rls_mt_crm_leads_select') THEN
      CREATE POLICY rls_mt_crm_leads_select
        ON public.crm_leads AS RESTRICTIVE FOR SELECT TO authenticated
        USING (
          public.es_superadmin()
          OR owner_id = public.mi_negocio_id()
          OR negocio_id = public.mi_negocio_config_id()
          OR public.es_negocio_demo_publico(negocio_id, owner_id)
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crm_leads' AND policyname = 'rls_mt_crm_leads_write') THEN
      CREATE POLICY rls_mt_crm_leads_write
        ON public.crm_leads AS RESTRICTIVE FOR ALL TO authenticated
        USING (
          public.es_superadmin()
          OR owner_id = public.mi_negocio_id()
          OR negocio_id = public.mi_negocio_config_id()
          OR public.es_negocio_demo_publico(negocio_id, owner_id)
        )
        WITH CHECK (
          (NOT public.es_usuario_demo_actual())
          AND (
            public.es_superadmin()
            OR owner_id = public.mi_negocio_id()
            OR negocio_id = public.mi_negocio_config_id()
          )
        );
    END IF;
  END IF;

  -- Leads del agente (agente_leads): tiene negocio_id y owner_id.
  IF to_regclass('public.agente_leads') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.agente_leads ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'agente_leads' AND policyname = 'rls_mt_agente_leads_all') THEN
      CREATE POLICY rls_mt_agente_leads_all
        ON public.agente_leads AS RESTRICTIVE FOR ALL TO authenticated
        USING (
          public.es_superadmin()
          OR owner_id = public.mi_negocio_id()
          OR negocio_id = public.mi_negocio_config_id()
          OR public.es_negocio_demo_publico(negocio_id, owner_id)
        )
        WITH CHECK (
          (NOT public.es_usuario_demo_actual())
          AND (
            public.es_superadmin()
            OR owner_id = public.mi_negocio_id()
            OR negocio_id = public.mi_negocio_config_id()
          )
        );
    END IF;
  END IF;

  -- PQRS (crm_pqrs): tiene negocio_id y owner_id.
  IF to_regclass('public.crm_pqrs') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.crm_pqrs ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crm_pqrs' AND policyname = 'rls_mt_crm_pqrs_all') THEN
      CREATE POLICY rls_mt_crm_pqrs_all
        ON public.crm_pqrs AS RESTRICTIVE FOR ALL TO authenticated
        USING (
          public.es_superadmin()
          OR owner_id = public.mi_negocio_id()
          OR negocio_id = public.mi_negocio_config_id()
          OR public.es_negocio_demo_publico(negocio_id, owner_id)
        )
        WITH CHECK (
          (NOT public.es_usuario_demo_actual())
          AND (
            public.es_superadmin()
            OR owner_id = public.mi_negocio_id()
            OR negocio_id = public.mi_negocio_config_id()
          )
        );
    END IF;
  END IF;

  -- Mensajes CRM (crm_mensajes): tiene negocio_id y owner_id.
  IF to_regclass('public.crm_mensajes') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.crm_mensajes ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'crm_mensajes' AND policyname = 'rls_mt_crm_mensajes_all') THEN
      CREATE POLICY rls_mt_crm_mensajes_all
        ON public.crm_mensajes AS RESTRICTIVE FOR ALL TO authenticated
        USING (
          public.es_superadmin()
          OR owner_id = public.mi_negocio_id()
          OR negocio_id = public.mi_negocio_config_id()
          OR public.es_negocio_demo_publico(negocio_id, owner_id)
        )
        WITH CHECK (
          (NOT public.es_usuario_demo_actual())
          AND (
            public.es_superadmin()
            OR owner_id = public.mi_negocio_id()
            OR negocio_id = public.mi_negocio_config_id()
          )
        );
    END IF;
  END IF;

  -- Ventas comerciales (com_ventas).
  IF to_regclass('public.com_ventas') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.com_ventas ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'com_ventas' AND policyname = 'rls_mt_com_ventas_all') THEN
      CREATE POLICY rls_mt_com_ventas_all
        ON public.com_ventas AS RESTRICTIVE FOR ALL TO authenticated
        USING (
          public.es_superadmin()
          OR owner_id = public.mi_negocio_id()
          OR public.es_negocio_demo_publico(NULL, owner_id)
        )
        WITH CHECK (
          (NOT public.es_usuario_demo_actual())
          AND (public.es_superadmin() OR owner_id = public.mi_negocio_id())
        );
    END IF;
  END IF;

  -- Ventas / pedidos POS (restaurante_pedidos).
  IF to_regclass('public.restaurante_pedidos') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.restaurante_pedidos ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'restaurante_pedidos' AND policyname = 'rls_mt_restaurante_pedidos_all') THEN
      CREATE POLICY rls_mt_restaurante_pedidos_all
        ON public.restaurante_pedidos AS RESTRICTIVE FOR ALL TO authenticated
        USING (
          public.es_superadmin()
          OR owner_id = public.mi_negocio_id()
          OR public.es_negocio_demo_publico(NULL, owner_id)
        )
        WITH CHECK (
          (NOT public.es_usuario_demo_actual())
          AND (public.es_superadmin() OR owner_id = public.mi_negocio_id())
        );
    END IF;
  END IF;

  -- Facturas fiscales emitidas (fac_emitidas).
  IF to_regclass('public.fac_emitidas') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.fac_emitidas ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'fac_emitidas' AND policyname = 'rls_mt_fac_emitidas_all') THEN
      CREATE POLICY rls_mt_fac_emitidas_all
        ON public.fac_emitidas AS RESTRICTIVE FOR ALL TO authenticated
        USING (
          public.es_superadmin()
          OR owner_id = public.mi_negocio_id()
          OR public.es_negocio_demo_publico(NULL, owner_id)
        )
        WITH CHECK (
          (NOT public.es_usuario_demo_actual())
          AND (public.es_superadmin() OR owner_id = public.mi_negocio_id())
        );
    END IF;
  END IF;

  -- Clientes (restaurante_clientes).
  IF to_regclass('public.restaurante_clientes') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.restaurante_clientes ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'restaurante_clientes' AND policyname = 'rls_mt_restaurante_clientes_all') THEN
      CREATE POLICY rls_mt_restaurante_clientes_all
        ON public.restaurante_clientes AS RESTRICTIVE FOR ALL TO authenticated
        USING (
          public.es_superadmin()
          OR owner_id = public.mi_negocio_id()
          OR public.es_negocio_demo_publico(NULL, owner_id)
        )
        WITH CHECK (
          (NOT public.es_usuario_demo_actual())
          AND (public.es_superadmin() OR owner_id = public.mi_negocio_id())
        );
    END IF;
  END IF;

  -- Reseñas y PQRS legacy (resenas_registros).
  IF to_regclass('public.resenas_registros') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.resenas_registros ENABLE ROW LEVEL SECURITY';

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'resenas_registros' AND policyname = 'rls_mt_resenas_registros_all') THEN
      CREATE POLICY rls_mt_resenas_registros_all
        ON public.resenas_registros AS RESTRICTIVE FOR ALL TO authenticated
        USING (
          public.es_superadmin()
          OR owner_id = public.mi_negocio_id()
          OR public.es_negocio_demo_publico(NULL, owner_id)
        )
        WITH CHECK (
          (NOT public.es_usuario_demo_actual())
          AND (public.es_superadmin() OR owner_id = public.mi_negocio_id())
        );
    END IF;
  END IF;
END $$;
