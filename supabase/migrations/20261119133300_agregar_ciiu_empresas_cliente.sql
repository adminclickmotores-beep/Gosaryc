-- Agregar el código CIIU opcional a los registros de empresas cliente.
-- No modifica las políticas RLS ni los permisos existentes.

ALTER TABLE public.sst_empresas
ADD COLUMN IF NOT EXISTS ciiu text;

ALTER TABLE public.restaurante_clientes
ADD COLUMN IF NOT EXISTS ciiu text;
