-- El precio de retoma/compra es un precio de adquisición: solo lo ve y lo escribe quien tiene el permiso de costos.
-- (Medida conservadora mientras el módulo de retomas se integra al inventario.)
DROP POLICY IF EXISTS "retomas_vehiculos_personal" ON public.retomas_vehiculos;
DROP POLICY IF EXISTS "retomas_vehiculos_ver" ON public.retomas_vehiculos;
DROP POLICY IF EXISTS "retomas_vehiculos_crear" ON public.retomas_vehiculos;
DROP POLICY IF EXISTS "retomas_vehiculos_actualizar" ON public.retomas_vehiculos;
DROP POLICY IF EXISTS "retomas_vehiculos_borrar" ON public.retomas_vehiculos;

CREATE POLICY "retomas_vehiculos_ver" ON public.retomas_vehiculos FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal() AND public.veh_permiso('veh_costos'));
CREATE POLICY "retomas_vehiculos_crear" ON public.retomas_vehiculos FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal() AND public.veh_permiso('veh_costos'));
CREATE POLICY "retomas_vehiculos_actualizar" ON public.retomas_vehiculos FOR UPDATE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal() AND public.veh_permiso('veh_costos'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal() AND public.veh_permiso('veh_costos'));
CREATE POLICY "retomas_vehiculos_borrar" ON public.retomas_vehiculos FOR DELETE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal() AND public.veh_permiso('veh_costos'));
