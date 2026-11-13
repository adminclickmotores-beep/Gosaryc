-- Foto de cada producto (se muestra en la pantalla de venta y en el menú).
ALTER TABLE public.restaurante_productos ADD COLUMN IF NOT EXISTS imagen_url text;
