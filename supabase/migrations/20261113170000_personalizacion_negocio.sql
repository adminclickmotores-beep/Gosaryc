-- Personalización del negocio: logo, imagen de portada y color principal.
ALTER TABLE public.negocio_config ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.negocio_config ADD COLUMN IF NOT EXISTS portada_url text;
ALTER TABLE public.negocio_config ADD COLUMN IF NOT EXISTS color_principal text;

-- Imágenes del negocio: las ve cualquiera, las sube solo el personal autorizado.
INSERT INTO storage.buckets (id, name, public)
VALUES ('negocios', 'negocios', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "negocios_imagenes_lectura" ON storage.objects
  FOR SELECT TO anon, authenticated USING (bucket_id = 'negocios');
CREATE POLICY "negocios_imagenes_subir" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'negocios' AND public.es_personal());
CREATE POLICY "negocios_imagenes_actualizar" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'negocios' AND public.es_personal())
  WITH CHECK (bucket_id = 'negocios' AND public.es_personal());
CREATE POLICY "negocios_imagenes_borrar" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'negocios' AND public.es_personal());
