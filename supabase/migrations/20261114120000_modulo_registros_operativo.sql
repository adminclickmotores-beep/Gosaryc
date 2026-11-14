-- Capa operativa compartida para todos los módulos: abonos, stock, anulación con motivo y bitácora.
ALTER TABLE public.modulo_registros
  ADD COLUMN IF NOT EXISTS abonado numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cantidad numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimo numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS anulado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_anulacion text,
  ADD COLUMN IF NOT EXISTS historial jsonb NOT NULL DEFAULT '[]'::jsonb;
