-- Agenda: citas, entregas, recordatorios y eventos reales del negocio.
CREATE TABLE IF NOT EXISTS public.agenda_citas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  titulo text NOT NULL,
  tipo text NOT NULL DEFAULT 'cita',
  cliente text,
  telefono text,
  fecha date NOT NULL,
  hora time,
  duracion_min integer NOT NULL DEFAULT 60,
  estado text NOT NULL DEFAULT 'pendiente',
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agenda_citas_owner_fecha_idx ON public.agenda_citas (owner_id, fecha);

ALTER TABLE public.agenda_citas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agenda_citas_personal" ON public.agenda_citas;
CREATE POLICY "agenda_citas_personal" ON public.agenda_citas
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
