-- Retiro completo de las demos en vivo. No toca negocios reales, usuarios ni datos: solo quita
-- las funciones, políticas y marcas que existían para las demos.

-- 1) Políticas de solo lectura de cuentas demo.
DO $$
DECLARE
  p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND policyname IN ('demo_block_shared_insert', 'demo_block_shared_update', 'demo_block_shared_delete')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', p.policyname, p.schemaname, p.tablename);
  END LOOP;
END;
$$;

-- 2) Funciones de demo.
DROP FUNCTION IF EXISTS public.es_cuenta_demo_actual();
DROP FUNCTION IF EXISTS public.demo_preparar_negocio(text, text);
DROP FUNCTION IF EXISTS public.demo_sembrar_vehiculos();
DROP FUNCTION IF EXISTS public.demo_sembrar_restaurante();
DROP FUNCTION IF EXISTS public.demo_completar_vehiculos();
DROP FUNCTION IF EXISTS public.demo_cifras_del_dia();

-- 3) Bloqueo de borrado de negocios demo.
DROP TRIGGER IF EXISTS negocio_config_demo_no_borrar ON public.negocio_config;
DROP FUNCTION IF EXISTS public.bloquear_borrado_negocio_demo();

-- 4) Estas dos funciones las usan políticas RLS reales: se conservan los nombres pero ya no reconocen ninguna demo.
CREATE OR REPLACE FUNCTION public.es_negocio_demo_publico(p_negocio_id uuid DEFAULT NULL, p_owner_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT false; $$;

CREATE OR REPLACE FUNCTION public.es_usuario_demo_actual()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$ SELECT false; $$;

-- 5) Licencia vigente sin la excepción de las cuentas demo.
CREATE OR REPLACE FUNCTION public.licencia_negocio_vigente()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.es_superadmin()
    OR public.mi_negocio_id() IS NULL
    OR coalesce(
      (SELECT s.estado = 'activo' AND s.vence_en > now()
         FROM public.suscripciones_negocio s
        WHERE s.owner_id = public.mi_negocio_id()),
      false)
  );
$$;
REVOKE ALL ON FUNCTION public.licencia_negocio_vigente() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.licencia_negocio_vigente() TO authenticated;

-- 6) Marca de demo pública.
ALTER TABLE public.negocio_config DROP COLUMN IF EXISTS es_demo_publico;
