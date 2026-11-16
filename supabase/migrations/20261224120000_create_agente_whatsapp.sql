-- Agente de WhatsApp (ventas y atención al cliente) por negocio.
-- Cada negocio tiene una clave propia que se pega en la API local de WhatsApp para atender ese número.
CREATE TABLE IF NOT EXISTS public.agente_whatsapp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL UNIQUE REFERENCES public.negocio_config(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  clave text NOT NULL UNIQUE DEFAULT (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
  activo boolean NOT NULL DEFAULT true,
  nombre_agente text NOT NULL DEFAULT 'Asistente',
  instrucciones text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agente_whatsapp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agente_whatsapp_select_propio" ON public.agente_whatsapp;
CREATE POLICY "agente_whatsapp_select_propio" ON public.agente_whatsapp
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "agente_whatsapp_insert_propio" ON public.agente_whatsapp;
CREATE POLICY "agente_whatsapp_insert_propio" ON public.agente_whatsapp
  FOR INSERT TO authenticated WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.negocio_config n WHERE n.id = negocio_id AND n.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "agente_whatsapp_update_propio" ON public.agente_whatsapp;
CREATE POLICY "agente_whatsapp_update_propio" ON public.agente_whatsapp
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
