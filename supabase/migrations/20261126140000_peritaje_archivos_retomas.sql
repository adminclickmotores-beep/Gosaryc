-- Archivos del peritaje (rutas en el bucket privado "creditos_docs").
ALTER TABLE public.retomas_vehiculos
  ADD COLUMN IF NOT EXISTS peritaje_archivos text[] NOT NULL DEFAULT '{}';
