-- CRM: interruptor del módulo guardado en el negocio (se sincroniza entre dispositivos) e historial de mensajes por prospecto.
ALTER TABLE public.negocio_config ADD COLUMN IF NOT EXISTS crm_activo boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.crm_mensajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL REFERENCES public.negocio_config(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  telefono text NOT NULL DEFAULT '',
  rol text NOT NULL DEFAULT 'cliente',
  contenido text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_mensajes_lead_idx ON public.crm_mensajes (negocio_id, lead_id, created_at);

ALTER TABLE public.crm_mensajes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_mensajes_select_propio" ON public.crm_mensajes;
CREATE POLICY "crm_mensajes_select_propio" ON public.crm_mensajes
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "crm_mensajes_insert_propio" ON public.crm_mensajes;
CREATE POLICY "crm_mensajes_insert_propio" ON public.crm_mensajes
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
