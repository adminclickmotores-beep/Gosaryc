-- Datos extra del domicilio: barrio de entrega y correo del cliente (opcional).
ALTER TABLE public.restaurante_pedidos ADD COLUMN IF NOT EXISTS barrio text;
ALTER TABLE public.restaurante_pedidos ADD COLUMN IF NOT EXISTS cliente_email text;
