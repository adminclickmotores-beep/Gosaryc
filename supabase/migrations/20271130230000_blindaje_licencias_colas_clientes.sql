-- Blindaje (19-nov-2026): licencias/planes solo por Superadmin, códigos de activación sin lectura
-- pública, colas de mensajes aisladas por negocio y licencia vigente para leer clientes.
-- Solo ALTER/CREATE: no se borra ninguna tabla ni dato. Demo y Superadmin quedan exentos
-- por licencia_negocio_vigente(); el menú QR y la validación SST (anon) no se tocan.

-- 1. Códigos de activación: ningún acceso para el rol anon (la verificación usa la función SECURITY DEFINER).
DO $$
BEGIN
  IF to_regclass('public.licencias') IS NOT NULL THEN
    REVOKE ALL ON public.licencias FROM anon;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Revoke licencias: %', SQLERRM;
END $$;

-- 2. Nadie que no sea Superadmin cambia plan, estado, vencimiento ni tipo (defensa extra a las políticas).
CREATE OR REPLACE FUNCTION public.proteger_campos_licencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Sin sesión de usuario = función interna autorizada (ej. verificar_licencia).
  IF auth.uid() IS NULL OR public.es_superadmin() THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Solo el Superadmin puede modificar licencias y planes';
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.suscripciones_negocio') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_proteger_suscripcion ON public.suscripciones_negocio;
    CREATE TRIGGER trg_proteger_suscripcion
      BEFORE INSERT OR UPDATE OR DELETE ON public.suscripciones_negocio
      FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_licencia();
  END IF;
  IF to_regclass('public.licencias') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_proteger_licencia ON public.licencias;
    CREATE TRIGGER trg_proteger_licencia
      BEFORE INSERT OR UPDATE OR DELETE ON public.licencias
      FOR EACH ROW EXECUTE FUNCTION public.proteger_campos_licencia();
  END IF;
END $$;

-- 3. Colas de mensajes y conocimiento del agente: solo el propio negocio (o Superadmin).
DO $$
DECLARE
  t text;
  op text;
  cond constant text := '(owner_id = (SELECT public.mi_negocio_id()) OR (SELECT public.es_superadmin()))';
  tablas constant text[] := ARRAY[
    'whatsapp_avisos', 'whatsapp_conocimiento_negocio', 'agente_whatsapp',
    'email_send_log', 'email_queue', 'cola_correos', 'cola_whatsapp'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = t AND column_name = 'owner_id') THEN
      CONTINUE;
    END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    FOREACH op IN ARRAY ARRAY['leer', 'crear', 'editar', 'borrar'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'blindaje_propietario_' || op, t);
    END LOOP;
    EXECUTE format('CREATE POLICY blindaje_propietario_leer ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING %s', t, cond);
    EXECUTE format('CREATE POLICY blindaje_propietario_crear ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK %s', t, cond);
    EXECUTE format('CREATE POLICY blindaje_propietario_editar ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING %s WITH CHECK %s', t, cond, cond);
    EXECUTE format('CREATE POLICY blindaje_propietario_borrar ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING %s', t, cond);
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Colas: %', SQLERRM;
END $$;

-- 4. Clientes, pacientes y socios: licencia vigente para leer (solo rol authenticated).
DO $$
DECLARE
  t text;
  tablas constant text[] := ARRAY[
    'restaurante_clientes', 'clientes', 'com_clientes', 'cl_pacientes', 'bel_clientes', 'gim_socios',
    'clientes_veh', 'veh_clientes', 'cl_historias', 'cl_vacunas', 'sst_trabajadores', 'sst_empresas'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS licencia_vigente_leer ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY licencia_vigente_leer ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING ((SELECT public.licencia_negocio_vigente()))',
      t);
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Licencia en clientes: %', SQLERRM;
END $$;
