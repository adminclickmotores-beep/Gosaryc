-- Lavandería: servicio y peso por orden, y estados Planchado y Entregado.
ALTER TABLE public.lav_ordenes ADD COLUMN IF NOT EXISTS peso_kg numeric NOT NULL DEFAULT 0 CHECK (peso_kg >= 0);
ALTER TABLE public.lav_ordenes ADD COLUMN IF NOT EXISTS servicio text;

ALTER TABLE public.lav_ordenes DROP CONSTRAINT IF EXISTS lav_ordenes_estado_check;
ALTER TABLE public.lav_ordenes ADD CONSTRAINT lav_ordenes_estado_check
  CHECK (estado IN ('recibida', 'en_proceso', 'planchado', 'lista', 'cobrado', 'entregado'));
