-- Agente comercial y de servicio de WhatsApp con IA: conocimiento por negocio y avisos internos.
-- Aislado por owner_id = mi_negocio_id(). Sin borrados físicos de datos ajenos.

-- 1) Conocimiento del negocio: reglas y respuestas frecuentes que el dueño enseña.
CREATE TABLE IF NOT EXISTS public.whatsapp_conocimiento_negocio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL REFERENCES public.negocio_config(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  pregunta_patron text NOT NULL,
  respuesta_aprendida text NOT NULL,
  frecuencia integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_conocimiento_negocio_idx
  ON public.whatsapp_conocimiento_negocio (negocio_id);

ALTER TABLE public.whatsapp_conocimiento_negocio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wp_conocimiento_select_propio" ON public.whatsapp_conocimiento_negocio;
CREATE POLICY "wp_conocimiento_select_propio" ON public.whatsapp_conocimiento_negocio
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "wp_conocimiento_insert_propio" ON public.whatsapp_conocimiento_negocio;
CREATE POLICY "wp_conocimiento_insert_propio" ON public.whatsapp_conocimiento_negocio
  FOR INSERT TO authenticated WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.negocio_config n WHERE n.id = negocio_id AND n.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "wp_conocimiento_update_propio" ON public.whatsapp_conocimiento_negocio;
CREATE POLICY "wp_conocimiento_update_propio" ON public.whatsapp_conocimiento_negocio
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "wp_conocimiento_delete_propio" ON public.whatsapp_conocimiento_negocio;
CREATE POLICY "wp_conocimiento_delete_propio" ON public.whatsapp_conocimiento_negocio
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- 2) Avisos internos del agente (persisten en el panel aunque el computador se apague).
CREATE TABLE IF NOT EXISTS public.whatsapp_avisos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL REFERENCES public.negocio_config(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'otro',
  titulo text NOT NULL,
  detalle text,
  chat_id text,
  leido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS whatsapp_avisos_negocio_idx
  ON public.whatsapp_avisos (negocio_id, leido);

ALTER TABLE public.whatsapp_avisos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wp_avisos_select_propio" ON public.whatsapp_avisos;
CREATE POLICY "wp_avisos_select_propio" ON public.whatsapp_avisos
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "wp_avisos_insert_propio" ON public.whatsapp_avisos;
CREATE POLICY "wp_avisos_insert_propio" ON public.whatsapp_avisos
  FOR INSERT TO authenticated WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.negocio_config n WHERE n.id = negocio_id AND n.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "wp_avisos_update_propio" ON public.whatsapp_avisos;
CREATE POLICY "wp_avisos_update_propio" ON public.whatsapp_avisos
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "wp_avisos_delete_propio" ON public.whatsapp_avisos;
CREATE POLICY "wp_avisos_delete_propio" ON public.whatsapp_avisos
  FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- 3) Interruptor de IA por negocio (el agente con reglas siempre queda como respaldo).
ALTER TABLE public.agente_whatsapp
  ADD COLUMN IF NOT EXISTS ia_activa boolean NOT NULL DEFAULT true;

-- 4) La memoria del agente también la escribe el panel (aprobar aprendizajes).
DROP POLICY IF EXISTS "agente_memoria_insert_propio" ON public.agente_memoria;
CREATE POLICY "agente_memoria_insert_propio" ON public.agente_memoria
  FOR INSERT TO authenticated WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.negocio_config n WHERE n.id = negocio_id AND n.owner_id = auth.uid())
  );

DROP POLICY IF EXISTS "agente_memoria_update_propio" ON public.agente_memoria;
CREATE POLICY "agente_memoria_update_propio" ON public.agente_memoria
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
