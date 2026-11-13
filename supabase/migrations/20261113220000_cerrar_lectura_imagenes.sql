-- Las imágenes del bucket "negocios" siguen siendo públicas por enlace, pero ya nadie puede listar los archivos.
DROP POLICY IF EXISTS "negocios_imagenes_lectura" ON storage.objects;
CREATE POLICY "negocios_imagenes_lectura" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'negocios' AND public.es_personal());

-- Configuración del negocio: lectura pública solo para visitantes (datos de contacto y horarios que el negocio publica),
-- y personal autorizado con acceso completo.
DROP POLICY IF EXISTS "negocio_lectura_publica" ON public.negocio_config;
CREATE POLICY "negocio_lectura_publica" ON public.negocio_config
  FOR SELECT TO anon USING (nombre IS NOT NULL AND char_length(nombre) > 0);
