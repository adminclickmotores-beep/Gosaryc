-- Datos adicionales de la cotización: documento o NIT, correo, dirección, forma de pago y plazo de entrega.
ALTER TABLE public.cotizaciones
  ADD COLUMN IF NOT EXISTS documento text,
  ADD COLUMN IF NOT EXISTS correo text,
  ADD COLUMN IF NOT EXISTS direccion text,
  ADD COLUMN IF NOT EXISTS forma_pago text,
  ADD COLUMN IF NOT EXISTS plazo_entrega text;
