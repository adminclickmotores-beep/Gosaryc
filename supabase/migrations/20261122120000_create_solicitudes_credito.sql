-- Solicitudes de crédito de vehículos, con documentos adjuntos (bucket privado).
CREATE TABLE IF NOT EXISTS public.solicitudes_credito (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  estado text NOT NULL DEFAULT 'borrador',
  entidad text,
  nombre_completo text NOT NULL,
  tipo_documento text NOT NULL DEFAULT 'CC',
  numero_documento text,
  fecha_nacimiento date,
  lugar_expedicion text,
  estado_civil text,
  personas_a_cargo integer,
  telefono text,
  email text,
  direccion text,
  ciudad text,
  tipo_vivienda text,
  ocupacion text,
  tipo_vinculacion text,
  empresa text,
  cargo text,
  antiguedad text,
  telefono_empresa text,
  ingresos_mensuales numeric,
  otros_ingresos numeric,
  egresos_mensuales numeric,
  patrimonio numeric,
  ref1_nombre text,
  ref1_telefono text,
  ref1_parentesco text,
  ref2_nombre text,
  ref2_telefono text,
  ref2_parentesco text,
  vehiculo text,
  valor_vehiculo numeric,
  cuota_inicial numeric,
  monto_solicitado numeric,
  plazo_meses integer,
  observaciones text,
  documentos text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS solicitudes_credito_owner_idx ON public.solicitudes_credito (owner_id);

ALTER TABLE public.solicitudes_credito ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solicitudes_credito_personal" ON public.solicitudes_credito;
CREATE POLICY "solicitudes_credito_personal" ON public.solicitudes_credito
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

-- Bucket privado para los documentos del solicitante (cédula, desprendibles, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('creditos_docs', 'creditos_docs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "creditos_docs_personal" ON storage.objects;
CREATE POLICY "creditos_docs_personal" ON storage.objects
  FOR ALL TO authenticated
  USING (
    bucket_id = 'creditos_docs'
    AND (storage.foldername(name))[1] = public.mi_negocio_id()::text
    AND public.es_personal()
  )
  WITH CHECK (
    bucket_id = 'creditos_docs'
    AND (storage.foldername(name))[1] = public.mi_negocio_id()::text
    AND public.es_personal()
  );
