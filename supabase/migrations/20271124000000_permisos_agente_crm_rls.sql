-- Otorga permisos completos y políticas RLS permisivas por negocio (incluyendo modo Demo y Prueba en Vivo)
-- para las tablas del Agente IA y CRM, corrigiendo el error "permission denied for table agente_whatsapp".

GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;

GRANT ALL ON TABLE public.agente_whatsapp TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.agente_memoria TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.crm_leads TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.crm_pqrs TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.crm_mensajes TO authenticated, anon, service_role;

ALTER TABLE public.agente_whatsapp ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agente_memoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pqrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_mensajes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  tabla TEXT;
  politica TEXT;
BEGIN
  FOREACH tabla IN ARRAY ARRAY[
    'agente_whatsapp',
    'agente_memoria',
    'crm_leads',
    'crm_pqrs',
    'crm_mensajes'
  ]
  LOOP
    politica := 'acceso_negocio_demo_' || tabla;
    IF NOT EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = tabla
        AND policyname = politica
    ) THEN
      EXECUTE format(
        $sql$
          CREATE POLICY %I
          ON public.%I
          AS PERMISSIVE
          FOR ALL
          TO authenticated, anon, service_role
          USING (
            auth.role() IN ('service_role', 'anon')
            OR owner_id = auth.uid()
            OR negocio_id IN (
              SELECT nc.id FROM public.negocio_config nc WHERE nc.owner_id = auth.uid()
            )
            OR EXISTS (
              SELECT 1 FROM public.equipo_negocio en
              WHERE en.user_id = auth.uid() AND en.activo = true
            )
            OR COALESCE(auth.jwt() ->> 'email', '') ILIKE '%%demo%%'
          )
          WITH CHECK (
            auth.role() IN ('service_role', 'anon')
            OR owner_id = auth.uid()
            OR negocio_id IN (
              SELECT nc.id FROM public.negocio_config nc WHERE nc.owner_id = auth.uid()
            )
            OR EXISTS (
              SELECT 1 FROM public.equipo_negocio en
              WHERE en.user_id = auth.uid() AND en.activo = true
            )
            OR COALESCE(auth.jwt() ->> 'email', '') ILIKE '%%demo%%'
          )
        $sql$,
        politica,
        tabla
      );
    END IF;
  END LOOP;
END
$$;
