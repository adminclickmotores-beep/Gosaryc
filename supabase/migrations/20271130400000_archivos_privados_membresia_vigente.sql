-- Archivos privados (fotos de vehículos, pedidos, pagos, tratamientos, compras, inspecciones):
-- solo quien sigue activo en el negocio puede leer, cambiar o borrar. Solo CREATE: no borra datos.

DROP POLICY IF EXISTS archivos_privados_membresia_leer ON storage.objects;
CREATE POLICY archivos_privados_membresia_leer ON storage.objects
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    bucket_id NOT IN ('vehiculos_fotos', 'creditos_docs', 'comprobantes_pago', 'soportes_tributarios')
    OR (storage.foldername(name))[1] = public.mi_negocio_id()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR public.es_superadmin()
  );

DROP POLICY IF EXISTS archivos_privados_membresia_editar ON storage.objects;
CREATE POLICY archivos_privados_membresia_editar ON storage.objects
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (
    bucket_id NOT IN ('vehiculos_fotos', 'creditos_docs', 'comprobantes_pago', 'soportes_tributarios')
    OR (storage.foldername(name))[1] = public.mi_negocio_id()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR public.es_superadmin()
  );

DROP POLICY IF EXISTS archivos_privados_membresia_borrar ON storage.objects;
CREATE POLICY archivos_privados_membresia_borrar ON storage.objects
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (
    bucket_id NOT IN ('vehiculos_fotos', 'creditos_docs', 'comprobantes_pago', 'soportes_tributarios')
    OR (storage.foldername(name))[1] = public.mi_negocio_id()::text
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR public.es_superadmin()
  );

-- Nadie del bucket privado queda accesible sin sesión.
UPDATE storage.buckets SET public = false
 WHERE id IN ('vehiculos_fotos', 'creditos_docs', 'comprobantes_pago', 'soportes_tributarios');
