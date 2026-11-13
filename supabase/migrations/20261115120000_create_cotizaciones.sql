-- Cotizaciones: propuestas con productos o servicios, cantidades y total, por negocio.
CREATE TABLE IF NOT EXISTS public.cotizaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  numero integer NOT NULL DEFAULT 0,
  cliente text NOT NULL,
  contacto text,
  telefono text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  descuento numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'borrador',
  vigente_hasta date,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cotizaciones_owner_idx ON public.cotizaciones (owner_id);

ALTER TABLE public.cotizaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cotizaciones_personal" ON public.cotizaciones;
CREATE POLICY "cotizaciones_personal" ON public.cotizaciones
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
