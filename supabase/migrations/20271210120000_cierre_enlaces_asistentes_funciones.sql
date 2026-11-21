-- Cierre: enlaces web aprobados, instrucciones de asistentes solo dueño/administrador y funciones privilegiadas sin acceso anónimo.

-- 1. Enlaces públicos del negocio: solo https (sin javascript:, data: ni esquemas raros).
DO $$
BEGIN
  IF to_regclass('public.negocio_config') IS NOT NULL THEN
    BEGIN
      ALTER TABLE public.negocio_config DROP CONSTRAINT IF EXISTS negocio_config_sitio_web_https;
      ALTER TABLE public.negocio_config
        ADD CONSTRAINT negocio_config_sitio_web_https
        CHECK (sitio_web IS NULL OR sitio_web ~* '^https://[^[:space:]<>"'']{1,300}$') NOT VALID;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'sitio_web https: %', SQLERRM;
    END;
    BEGIN
      ALTER TABLE public.negocio_config DROP CONSTRAINT IF EXISTS negocio_config_instagram_seguro;
      ALTER TABLE public.negocio_config
        ADD CONSTRAINT negocio_config_instagram_seguro
        CHECK (instagram IS NULL OR instagram !~* '^\s*(javascript|data|vbscript):') NOT VALID;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'instagram seguro: %', SQLERRM;
    END;
  END IF;
END $$;

-- 2. Instrucciones del asistente virtual / voz y vínculo de WhatsApp: solo el dueño del negocio o el Superadmin.
--    (Política restrictiva: el personal con acceso de lectura no puede crear ni modificar.)
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['agente_whatsapp', 'agente_memoria', 'whatsapp_bridge', 'whatsapp_outbox'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, PUBLIC', t);
    END IF;
  END LOOP;

  IF to_regclass('public.agente_whatsapp') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS solo_dueno_escribe_agente ON public.agente_whatsapp';
    EXECUTE 'CREATE POLICY solo_dueno_escribe_agente ON public.agente_whatsapp AS RESTRICTIVE FOR ALL TO authenticated
             USING (owner_id = (SELECT auth.uid()) OR public.es_superadmin())
             WITH CHECK (owner_id = (SELECT auth.uid()) OR public.es_superadmin())';
  END IF;
  IF to_regclass('public.agente_memoria') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS solo_dueno_escribe_memoria ON public.agente_memoria';
    EXECUTE 'CREATE POLICY solo_dueno_escribe_memoria ON public.agente_memoria AS RESTRICTIVE FOR ALL TO authenticated
             USING (owner_id = (SELECT auth.uid()) OR public.es_superadmin())
             WITH CHECK (owner_id = (SELECT auth.uid()) OR public.es_superadmin())';
  END IF;
END $$;

-- 3. Funciones de aprobación/emisión: sin acceso anónimo ni PUBLIC; solo usuarios con sesión (y cada una valida Superadmin adentro).
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'admin_crear_pase_dias(text, text, text, integer)',
    'aprobar_solicitud_pase_dias(uuid, integer)',
    'aprobar_pase_dias_licencia(uuid)',
    'admin_crear_licencia(text, text, text, text, integer)',
    'admin_actualizar_licencia(uuid, text, text, date)',
    'admin_actualizar_suscripcion(uuid, text, text, date)',
    'admin_rechazar_pago_licencia(uuid)',
    'admin_rechazar_solicitud_licencia(uuid)',
    'aprobar_pago_licencia(uuid)',
    'aprobar_solicitud_licencia(uuid)'
  ] LOOP
    IF to_regprocedure('public.' || f) IS NOT NULL THEN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon', f);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', f);
    END IF;
  END LOOP;
END $$;
