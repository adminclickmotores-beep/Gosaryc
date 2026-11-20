-- Paso 2 y Paso 3: Campos fiscales DIAN (Software ID, PIN, Certificado, Prefijo, Ambiente) y periodo de gracia en licencias.

ALTER TABLE public.negocio_config
  ADD COLUMN IF NOT EXISTS prefijo_facturacion text,
  ADD COLUMN IF NOT EXISTS dian_software_id text,
  ADD COLUMN IF NOT EXISTS dian_pin text,
  ADD COLUMN IF NOT EXISTS dian_certificado_nombre text,
  ADD COLUMN IF NOT EXISTS dian_certificado_vence date,
  ADD COLUMN IF NOT EXISTS dian_ambiente text NOT NULL DEFAULT 'Pruebas';

ALTER TABLE public.negocio_dian_config
  ADD COLUMN IF NOT EXISTS software_id text,
  ADD COLUMN IF NOT EXISTS pin text,
  ADD COLUMN IF NOT EXISTS certificado_nombre text,
  ADD COLUMN IF NOT EXISTS certificado_vence date;

ALTER TABLE public.suscripciones_negocio
  ADD COLUMN IF NOT EXISTS dias_gracia integer NOT NULL DEFAULT 3;
