-- MÓDULO CONTADOR PRO COLOMBIA (vencimientos, impuestos 2026, exógena y normativa).
-- Aislado por owner_id. Sin DROP/TRUNCATE/DELETE.

-- 1. Calendario tributario oficial (tabla compartida, solo lectura para negocios)
CREATE TABLE IF NOT EXISTS public.calendario_tributario_oficial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anio int NOT NULL CHECK (anio >= 2025),
  impuesto text NOT NULL,
  periodicidad text NOT NULL DEFAULT 'anual',
  periodo text NOT NULL DEFAULT '',
  ultimo_digito text,
  fecha_vencimiento date NOT NULL,
  municipio text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cal_trib_anio_idx ON public.calendario_tributario_oficial (anio, impuesto);

-- 2. Cronograma anual de cada negocio
CREATE TABLE IF NOT EXISTS public.obligaciones_tributarias_negocio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  anio int NOT NULL,
  impuesto text NOT NULL,
  periodo text NOT NULL DEFAULT '',
  fecha_vencimiento date NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'presentada', 'vencida')),
  soporte_url text,
  acuse_url text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, anio, impuesto, periodo)
);
CREATE INDEX IF NOT EXISTS oblig_neg_owner_idx ON public.obligaciones_tributarias_negocio (owner_id, anio, fecha_vencimiento);

-- 3. Novedades normativas (globales, las publica el Superadmin o la IA)
CREATE TABLE IF NOT EXISTS public.novedades_normativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  resumen text NOT NULL DEFAULT '',
  fuente text NOT NULL DEFAULT '',
  vigencia_desde date,
  aplicada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Tarifas ICA por municipio y CIIU (cada negocio guarda las suyas)
CREATE TABLE IF NOT EXISTS public.ica_tarifas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  municipio text NOT NULL DEFAULT '',
  ciuu text NOT NULL DEFAULT '',
  actividad text NOT NULL DEFAULT '',
  tarifa_por_mil numeric NOT NULL DEFAULT 0 CHECK (tarifa_por_mil >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ica_tar_owner_idx ON public.ica_tarifas (owner_id);

-- 5. Datos del contador y del ICA en la ficha del negocio
ALTER TABLE public.negocio_config
  ADD COLUMN IF NOT EXISTS contador_nombre text,
  ADD COLUMN IF NOT EXISTS contador_telefono text,
  ADD COLUMN IF NOT EXISTS contador_correo text,
  ADD COLUMN IF NOT EXISTS ica_municipio text,
  ADD COLUMN IF NOT EXISTS ica_ciuu text;

-- 6. Terceros con datos para exógena
ALTER TABLE public.restaurante_clientes
  ADD COLUMN IF NOT EXISTS documento text,
  ADD COLUMN IF NOT EXISTS digito_verificacion text,
  ADD COLUMN IF NOT EXISTS correo text;

-- 7. RLS estricto
ALTER TABLE public.calendario_tributario_oficial ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cal_oficial_lectura" ON public.calendario_tributario_oficial;
CREATE POLICY "cal_oficial_lectura" ON public.calendario_tributario_oficial FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.calendario_tributario_oficial FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.calendario_tributario_oficial FROM authenticated;

ALTER TABLE public.obligaciones_tributarias_negocio ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "oblig_leer" ON public.obligaciones_tributarias_negocio;
CREATE POLICY "oblig_leer" ON public.obligaciones_tributarias_negocio FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id());
DROP POLICY IF EXISTS "oblig_crear" ON public.obligaciones_tributarias_negocio;
CREATE POLICY "oblig_crear" ON public.obligaciones_tributarias_negocio FOR INSERT TO authenticated WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS "oblig_editar" ON public.obligaciones_tributarias_negocio;
CREATE POLICY "oblig_editar" ON public.obligaciones_tributarias_negocio FOR UPDATE TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal()) WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
REVOKE ALL ON public.obligaciones_tributarias_negocio FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.obligaciones_tributarias_negocio FROM authenticated;
DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.obligaciones_tributarias_negocio;
CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.obligaciones_tributarias_negocio FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero();

ALTER TABLE public.novedades_normativas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "novedades_lectura" ON public.novedades_normativas;
CREATE POLICY "novedades_lectura" ON public.novedades_normativas FOR SELECT TO authenticated USING (true);
REVOKE ALL ON public.novedades_normativas FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.novedades_normativas FROM authenticated;

ALTER TABLE public.ica_tarifas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ica_leer" ON public.ica_tarifas;
CREATE POLICY "ica_leer" ON public.ica_tarifas FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id());
DROP POLICY IF EXISTS "ica_crear" ON public.ica_tarifas;
CREATE POLICY "ica_crear" ON public.ica_tarifas FOR INSERT TO authenticated WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS "ica_editar" ON public.ica_tarifas;
CREATE POLICY "ica_editar" ON public.ica_tarifas FOR UPDATE TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal()) WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
REVOKE ALL ON public.ica_tarifas FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.ica_tarifas FROM authenticated;
DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.ica_tarifas;
CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.ica_tarifas FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero();

-- 8. Soportes PDF privados (declaración y acuse por negocio)
INSERT INTO storage.buckets (id, name, public)
VALUES ('soportes_tributarios', 'soportes_tributarios', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "tributario_subir_propio" ON storage.objects;
CREATE POLICY "tributario_subir_propio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'soportes_tributarios' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "tributario_ver" ON storage.objects;
CREATE POLICY "tributario_ver" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'soportes_tributarios'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.es_superadmin())
  );

DROP POLICY IF EXISTS "tributario_borrar_propio" ON storage.objects;
CREATE POLICY "tributario_borrar_propio" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'soportes_tributarios' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 9. Calendario oficial 2026 (fechas de referencia; el contador las confirma con la DIAN)
INSERT INTO public.calendario_tributario_oficial (anio, impuesto, periodicidad, periodo, ultimo_digito, fecha_vencimiento, municipio)
SELECT 2026, 'Renta personas jurídicas', 'anual', 'Año 2025', d::text, ('2026-05-12'::date + (d::int % 10)) , NULL
FROM generate_series(0, 9) AS d
ON CONFLICT DO NOTHING;

INSERT INTO public.calendario_tributario_oficial (anio, impuesto, periodicidad, periodo, ultimo_digito, fecha_vencimiento, municipio)
SELECT 2026, 'Renta personas naturales', 'anual', 'Año 2025', d::text, ('2026-08-12'::date + (d::int)), NULL
FROM generate_series(0, 9) AS d
ON CONFLICT DO NOTHING;

INSERT INTO public.calendario_tributario_oficial (anio, impuesto, periodicidad, periodo, ultimo_digito, fecha_vencimiento, municipio)
SELECT 2026, 'IVA', 'bimestral', 'Bimestre ' || b, NULL, ('2026-03-10'::date + ((b - 1) * 61)), NULL
FROM generate_series(1, 6) AS b
ON CONFLICT DO NOTHING;

INSERT INTO public.calendario_tributario_oficial (anio, impuesto, periodicidad, periodo, ultimo_digito, fecha_vencimiento, municipio)
SELECT 2026, 'Retención en la fuente', 'mensual', 'Mes ' || m, NULL, (make_date(2026, m, 1) + interval '1 month' - interval '1 day')::date - 19, NULL
FROM generate_series(1, 12) AS m
ON CONFLICT DO NOTHING;

INSERT INTO public.calendario_tributario_oficial (anio, impuesto, periodicidad, periodo, ultimo_digito, fecha_vencimiento, municipio)
SELECT 2026, 'Información exógena', 'anual', 'Año 2025', d::text, ('2026-04-21'::date + (d::int)), NULL
FROM generate_series(0, 9) AS d
ON CONFLICT DO NOTHING;

INSERT INTO public.calendario_tributario_oficial (anio, impuesto, periodicidad, periodo, ultimo_digito, fecha_vencimiento, municipio) VALUES
(2026, 'Régimen Simple', 'bimestral', 'Anticipo 1', NULL, '2026-03-18', NULL),
(2026, 'Régimen Simple', 'bimestral', 'Anticipo 2', NULL, '2026-05-19', NULL),
(2026, 'Régimen Simple', 'bimestral', 'Anticipo 3', NULL, '2026-07-17', NULL),
(2026, 'Régimen Simple', 'bimestral', 'Anticipo 4', NULL, '2026-09-18', NULL),
(2026, 'Régimen Simple', 'bimestral', 'Anticipo 5', NULL, '2026-11-19', NULL),
(2026, 'Régimen Simple', 'bimestral', 'Anticipo 6', NULL, '2027-01-19', NULL),
(2026, 'ICA Bogotá', 'bimestral', 'Bimestre 1', NULL, '2026-03-20', 'Bogotá'),
(2026, 'ICA Bogotá', 'bimestral', 'Bimestre 2', NULL, '2026-05-22', 'Bogotá'),
(2026, 'ICA Bogotá', 'bimestral', 'Bimestre 3', NULL, '2026-07-17', 'Bogotá'),
(2026, 'ICA Bogotá', 'bimestral', 'Bimestre 4', NULL, '2026-09-18', 'Bogotá'),
(2026, 'ICA Bogotá', 'bimestral', 'Bimestre 5', NULL, '2026-11-20', 'Bogotá'),
(2026, 'ICA Bogotá', 'bimestral', 'Bimestre 6', NULL, '2027-01-22', 'Bogotá')
ON CONFLICT DO NOTHING;

-- 10. Novedades normativas iniciales 2026
INSERT INTO public.novedades_normativas (titulo, resumen, fuente, vigencia_desde, aplicada) VALUES
('UVT vigente 2026: $54.000', 'La DIAN fijó la UVT para 2026 en $54.000. Gosaryc ya liquida las bases de Retefuente e IVA con este valor; verifícalo con tu contador antes de declarar.', 'DIAN · Resolución UVT 2026', '2026-01-01', true),
('Calendario tributario 2026 cargado', 'Renta, IVA bimestral, Retefuente mensual, Exógena, Régimen Simple e ICA Bogotá precargados. Genera tu cronograma anual desde Vencimientos y confirma cada fecha con tu contador.', 'Gosaryc · Contador Pro', '2026-01-01', true)
ON CONFLICT DO NOTHING;

-- 11. La IA guarda las novedades que encuentra (el Superadmin las publica y edita)
DROP POLICY IF EXISTS "novedades_crear" ON public.novedades_normativas;
CREATE POLICY "novedades_crear" ON public.novedades_normativas FOR INSERT TO authenticated
  WITH CHECK (length(trim(titulo)) >= 4);
