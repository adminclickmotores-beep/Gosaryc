-- Personalidad, objetivo de cierre y cierre autónomo del agente de WhatsApp.
ALTER TABLE public.agente_whatsapp
  ADD COLUMN IF NOT EXISTS personalidad text NOT NULL DEFAULT 'Amable y Cercano',
  ADD COLUMN IF NOT EXISTS objetivo_cierre text NOT NULL DEFAULT 'Cerrar pedido directo',
  ADD COLUMN IF NOT EXISTS cierre_autonomo boolean NOT NULL DEFAULT true;

GRANT SELECT (personalidad, objetivo_cierre, cierre_autonomo)
  ON TABLE public.agente_whatsapp TO authenticated;
GRANT INSERT (personalidad, objetivo_cierre, cierre_autonomo)
  ON TABLE public.agente_whatsapp TO authenticated;
GRANT UPDATE (personalidad, objetivo_cierre, cierre_autonomo)
  ON TABLE public.agente_whatsapp TO authenticated;
