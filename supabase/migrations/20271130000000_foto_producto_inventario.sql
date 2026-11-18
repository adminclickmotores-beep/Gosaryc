-- Foto del producto para la vitrina en mosaico del inventario.
ALTER TABLE public.com_productos ADD COLUMN IF NOT EXISTS imagen_url text;
