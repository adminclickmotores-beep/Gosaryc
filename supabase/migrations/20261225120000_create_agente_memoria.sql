-- Memoria del agente: lo que aprende de las respuestas reales del dueño y de los patrones de las conversaciones.
CREATE TABLE IF NOT EXISTS public.agente_memoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL REFERENCES public.negocio_config(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'patron',
  contenido text NOT NULL,
  veces integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agente_memoria_negocio_idx ON public.agente_memoria (negocio_id, tipo);

ALTER TABLE public.agente_memoria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agente_memoria_select_propio" ON public.agente_memoria;
CREATE POLICY "agente_memoria_select_propio" ON public.agente_memoria
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "agente_memoria_delete_propio" ON public.agente_memoria;
CREATE POLICY "agente_memoria_delete_propio" ON public.agente_memoria
  FOR DELETE TO authenticated USING (owner_id = auth.uid());
