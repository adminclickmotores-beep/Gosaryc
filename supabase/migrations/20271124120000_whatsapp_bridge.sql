-- Puente híbrido Cloud + Desktop Bridge para WhatsApp IA Local
-- Tablas aisladas por business_id con RLS estricto y sincronización automática de config_version.

CREATE TABLE IF NOT EXISTS public.whatsapp_bridge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.negocio_config(id) ON DELETE CASCADE,
  pairing_code text NOT NULL UNIQUE CHECK (char_length(pairing_code) = 6),
  status text NOT NULL DEFAULT 'desconectado' CHECK (status IN ('conectado', 'desconectado', 'sin_internet')),
  last_heartbeat timestamptz,
  auto_pilot_200 boolean NOT NULL DEFAULT true,
  config_version integer NOT NULL DEFAULT 1,
  mensajes_hoy integer NOT NULL DEFAULT 0,
  mensajes_hoy_fecha date NOT NULL DEFAULT current_date,
  last_sync_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.whatsapp_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.negocio_config(id) ON DELETE CASCADE,
  telefono text NOT NULL,
  mensaje text NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'enviado')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_outbox_business_estado
  ON public.whatsapp_outbox (business_id, estado, created_at);

ALTER TABLE public.whatsapp_bridge ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_bridge_owner_all" ON public.whatsapp_bridge;
CREATE POLICY "whatsapp_bridge_owner_all"
  ON public.whatsapp_bridge
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.negocio_config nc
      WHERE nc.id = whatsapp_bridge.business_id
        AND nc.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.negocio_config nc
      WHERE nc.id = whatsapp_bridge.business_id
        AND nc.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "whatsapp_outbox_owner_all" ON public.whatsapp_outbox;
CREATE POLICY "whatsapp_outbox_owner_all"
  ON public.whatsapp_outbox
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.negocio_config nc
      WHERE nc.id = whatsapp_outbox.business_id
        AND nc.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.negocio_config nc
      WHERE nc.id = whatsapp_outbox.business_id
        AND nc.owner_id = auth.uid()
    )
  );

-- Incremento automático de config_version cada vez que el negocio edita precios, platos, vehículos o reglas/FAQ.
CREATE OR REPLACE FUNCTION public.whatsapp_bridge_bump_config_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_business_id uuid;
  v_owner_id uuid;
BEGIN
  IF TG_TABLE_NAME = 'negocio_config' THEN
    v_business_id := COALESCE(NEW.id, OLD.id);
  ELSIF TG_TABLE_NAME IN ('agente_memoria', 'agente_whatsapp') THEN
    v_business_id := COALESCE(NEW.negocio_id, OLD.negocio_id);
  ELSE
    v_owner_id := COALESCE(NEW.owner_id, OLD.owner_id);
    IF v_owner_id IS NOT NULL THEN
      UPDATE public.whatsapp_bridge wb
      SET config_version = wb.config_version + 1,
          updated_at = now()
      FROM public.negocio_config nc
      WHERE nc.id = wb.business_id
        AND nc.owner_id = v_owner_id;
    END IF;
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_business_id IS NOT NULL THEN
    UPDATE public.whatsapp_bridge
    SET config_version = config_version + 1,
        updated_at = now()
    WHERE business_id = v_business_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'restaurante_productos',
    'com_productos',
    'vehiculos_inventario',
    'agente_memoria',
    'agente_whatsapp',
    'negocio_config'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_wa_bridge_bump_%I ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_wa_bridge_bump_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.whatsapp_bridge_bump_config_version()',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- Habilitar Realtime para estado en vivo y cola de salida
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_bridge;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_outbox;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;
