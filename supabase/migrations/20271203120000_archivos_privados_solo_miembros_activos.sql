-- Archivos privados (fotos de taller, archivos de vehículos, fotos de tratamientos y demás):
-- quien fue dado de baja del equipo no puede volver a abrirlos, cambiarlos ni subir nuevos.
-- Acceso solo para: Superadmin, el dueño en su propia carpeta, o un miembro con alta ACTIVA en esa carpeta.
-- Se aplica a TODOS los buckets privados (todo menos las imágenes públicas del negocio). Solo CREATE/ALTER: no borra archivos.

CREATE OR REPLACE FUNCTION public.puede_ver_archivo_privado(p_carpeta text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND p_carpeta IS NOT NULL AND (
    public.es_superadmin()
    OR (p_carpeta = auth.uid()::text AND EXISTS (SELECT 1 FROM public.negocio_config n WHERE n.owner_id = auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.equipo_negocio e
       WHERE e.user_id = auth.uid()
         AND e.activo = true
         AND e.owner_id IS NOT NULL
         AND e.owner_id::text = p_carpeta
    )
  );
$$;
REVOKE ALL ON FUNCTION public.puede_ver_archivo_privado(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.puede_ver_archivo_privado(text) TO authenticated;

DO $$
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS archivos_privados_membresia_leer ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS archivos_privados_membresia_editar ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS archivos_privados_membresia_borrar ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS archivos_privados_membresia_crear ON storage.objects';
  EXECUTE 'CREATE POLICY archivos_privados_membresia_leer ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING (bucket_id = ''negocios'' OR public.puede_ver_archivo_privado((storage.foldername(name))[1]))';
  EXECUTE 'CREATE POLICY archivos_privados_membresia_editar ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING (bucket_id = ''negocios'' OR public.puede_ver_archivo_privado((storage.foldername(name))[1]))';
  EXECUTE 'CREATE POLICY archivos_privados_membresia_borrar ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING (bucket_id = ''negocios'' OR public.puede_ver_archivo_privado((storage.foldername(name))[1]))';
  EXECUTE 'CREATE POLICY archivos_privados_membresia_crear ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (bucket_id = ''negocios'' OR public.puede_ver_archivo_privado((storage.foldername(name))[1]))';
END $$;

UPDATE storage.buckets SET public = false
 WHERE id IN ('vehiculos_fotos', 'creditos_docs', 'comprobantes_pago', 'soportes_tributarios',
              'pedidos_fotos', 'tratamientos_fotos', 'compras_docs', 'inspecciones_docs');
