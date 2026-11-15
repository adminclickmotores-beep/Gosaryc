-- Campos extra propios de cada módulo (documento, correo, plan, etc.), guardados por registro.
ALTER TABLE public.modulo_registros
  ADD COLUMN IF NOT EXISTS datos jsonb NOT NULL DEFAULT '{}'::jsonb;
