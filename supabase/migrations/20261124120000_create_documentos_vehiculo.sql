-- Documentos (archivos en la nube) de cada vehículo del inventario.
CREATE TABLE IF NOT EXISTS public.documentos_vehiculo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  vehiculo_id uuid NOT NULL REFERENCES public.vehiculos_inventario(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'Otro',
  nombre text NOT NULL,
  ruta text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS documentos_vehiculo_vehiculo_idx ON public.documentos_vehiculo (vehiculo_id);

ALTER TABLE public.documentos_vehiculo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documentos_vehiculo_personal" ON public.documentos_vehiculo;
CREATE POLICY "documentos_vehiculo_personal" ON public.documentos_vehiculo
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

-- Los archivos van al bucket privado "creditos_docs" (carpeta del negocio), que ya tiene sus políticas.
INSERT INTO storage.buckets (id, name, public)
VALUES ('creditos_docs', 'creditos_docs', false)
ON CONFLICT (id) DO NOTHING;
