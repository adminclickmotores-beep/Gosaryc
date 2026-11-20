-- Archivos privados (soportes tributarios, inspecciones, vehículos, créditos, pagos): tras darse de baja del equipo
-- nadie conserva acceso. Solo el dueño del negocio (carpeta = su id), un miembro ACTIVO (mi_negocio_id) o el Superadmin.
-- Se retira la excepción por auth.uid() para miembros: solo aplica si la carpeta es el propio negocio del dueño.
-- Solo CREATE/ALTER: no borra archivos.

CREATE OR REPLACE FUNCTION public.puede_ver_archivo_privado(p_carpeta text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.es_superadmin()
    OR (p_carpeta = auth.uid()::text AND EXISTS (SELECT 1 FROM public.negocio_config n WHERE n.owner_id = auth.uid()))
    OR (p_carpeta = public.mi_negocio_id()::text AND public.mi_negocio_id() IS NOT NULL)
  );
$$;
REVOKE ALL ON FUNCTION public.puede_ver_archivo_privado(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.puede_ver_archivo_privado(text) TO authenticated;

DO $$
DECLARE
  buckets text := $b$('vehiculos_fotos', 'creditos_docs', 'comprobantes_pago', 'soportes_tributarios', 'pedidos_fotos', 'tratamientos_fotos', 'compras_docs', 'inspecciones_docs')$b$;
BEGIN
  EXECUTE 'DROP POLICY IF EXISTS archivos_privados_membresia_leer ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS archivos_privados_membresia_editar ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS archivos_privados_membresia_borrar ON storage.objects';
  EXECUTE 'DROP POLICY IF EXISTS archivos_privados_membresia_crear ON storage.objects';
  EXECUTE format('CREATE POLICY archivos_privados_membresia_leer ON storage.objects AS RESTRICTIVE FOR SELECT TO authenticated USING (bucket_id NOT IN %s OR public.puede_ver_archivo_privado((storage.foldername(name))[1]))', buckets);
  EXECUTE format('CREATE POLICY archivos_privados_membresia_editar ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated USING (bucket_id NOT IN %s OR public.puede_ver_archivo_privado((storage.foldername(name))[1]))', buckets);
  EXECUTE format('CREATE POLICY archivos_privados_membresia_borrar ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated USING (bucket_id NOT IN %s OR public.puede_ver_archivo_privado((storage.foldername(name))[1]))', buckets);
  EXECUTE format('CREATE POLICY archivos_privados_membresia_crear ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (bucket_id NOT IN %s OR public.puede_ver_archivo_privado((storage.foldername(name))[1]))', buckets);
END $$;

UPDATE storage.buckets SET public = false
 WHERE id IN ('vehiculos_fotos', 'creditos_docs', 'comprobantes_pago', 'soportes_tributarios',
              'pedidos_fotos', 'tratamientos_fotos', 'compras_docs', 'inspecciones_docs');
