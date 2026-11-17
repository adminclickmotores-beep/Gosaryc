-- MÓDULO DIAN controlado por el Superadmin (estructura de conexión, sin llaves reales).
-- 1) negocio_config.dian_activa: lo único que ve el cliente (interruptor).
-- 2) negocio_dian_config: datos técnicos del proveedor (solo Superadmin).
-- 3) fac_emitidas: CUFE + QR oficial + estado del envío.
-- Sin DROP/TRUNCATE/DELETE.

-- 1. Interruptor visible para el cliente
ALTER TABLE public.negocio_config
  ADD COLUMN IF NOT EXISTS dian_activa boolean NOT NULL DEFAULT false;

-- 2. Config técnica del proveedor (un registro por dueño, solo Superadmin)
CREATE TABLE IF NOT EXISTS public.negocio_dian_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  activa boolean NOT NULL DEFAULT false,
  proveedor_url text,
  token_api text,
  prefijo text,
  resolucion text,
  rango_desde bigint CHECK (rango_desde IS NULL OR rango_desde >= 1),
  rango_hasta bigint CHECK (rango_hasta IS NULL OR rango_hasta >= 1),
  ambiente text NOT NULL DEFAULT 'Pruebas' CHECK (ambiente IN ('Pruebas', 'Producción')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS negocio_dian_config_owner_idx ON public.negocio_dian_config (owner_id);

-- 3. CUFE / QR en las facturas emitidas
ALTER TABLE public.fac_emitidas
  ADD COLUMN IF NOT EXISTS dian_cufe text,
  ADD COLUMN IF NOT EXISTS dian_qr text,
  ADD COLUMN IF NOT EXISTS dian_estado text NOT NULL DEFAULT 'pendiente' CHECK (dian_estado IN ('pendiente', 'enviada', 'aceptada', 'rechazada', 'no_aplica')),
  ADD COLUMN IF NOT EXISTS dian_respuesta jsonb NOT NULL DEFAULT '{}'::jsonb;

-- 4. RLS: la config técnica solo la toca el Superadmin (ni el dueño la ve)
ALTER TABLE public.negocio_dian_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dian_cfg_superadmin_todo" ON public.negocio_dian_config;
CREATE POLICY "dian_cfg_superadmin_todo" ON public.negocio_dian_config
  FOR ALL TO authenticated
  USING (public.es_superadmin())
  WITH CHECK (public.es_superadmin());
REVOKE ALL ON public.negocio_dian_config FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.negocio_dian_config FROM authenticated;
DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.negocio_dian_config;
CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.negocio_dian_config
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero();

-- 5. El cliente NO puede cambiar dian_activa por su cuenta (solo el Superadmin vía sync)
CREATE OR REPLACE FUNCTION public.proteger_dian_activa()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.dian_activa IS DISTINCT FROM NEW.dian_activa AND NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'Solo el administrador de Gosaryc puede activar la facturación DIAN.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_proteger_dian_activa ON public.negocio_config;
CREATE TRIGGER trg_proteger_dian_activa BEFORE UPDATE ON public.negocio_config
  FOR EACH ROW EXECUTE FUNCTION public.proteger_dian_activa();

-- 6. Al guardar la config técnica se refleja el interruptor en la ficha del negocio
CREATE OR REPLACE FUNCTION public.sync_dian_activa()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.negocio_config SET dian_activa = NEW.activa, updated_at = now()
  WHERE owner_id = NEW.owner_id;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_dian_activa ON public.negocio_dian_config;
CREATE TRIGGER trg_sync_dian_activa BEFORE INSERT OR UPDATE ON public.negocio_dian_config
  FOR EACH ROW EXECUTE FUNCTION public.sync_dian_activa();

-- 7. El dueño solo obtiene su config para el envío automático (nunca se muestra en pantalla)
CREATE OR REPLACE FUNCTION public.mi_dian_config()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v jsonb;
BEGIN
  SELECT jsonb_build_object(
    'activa', c.activa, 'proveedor_url', c.proveedor_url, 'token_api', c.token_api,
    'prefijo', c.prefijo, 'resolucion', c.resolucion,
    'rango_desde', c.rango_desde, 'rango_hasta', c.rango_hasta, 'ambiente', c.ambiente
  ) INTO v FROM public.negocio_dian_config c WHERE c.owner_id = auth.uid();
  RETURN coalesce(v, jsonb_build_object('activa', false));
END;
$$;
REVOKE ALL ON FUNCTION public.mi_dian_config() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mi_dian_config() TO authenticated;
