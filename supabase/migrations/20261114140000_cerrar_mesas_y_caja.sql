-- Cierra las reglas abiertas que quedaban: mesas y caja las podía manejar cualquier cuenta registrada.
-- Ahora solo el administrador y el equipo autorizado.

DROP POLICY IF EXISTS "mesas_gestion_personal" ON public.restaurante_mesas;
CREATE POLICY "mesas_gestion_personal" ON public.restaurante_mesas
  FOR ALL TO authenticated USING (public.es_personal()) WITH CHECK (public.es_personal());

DROP POLICY IF EXISTS "caja_gestion_personal" ON public.restaurante_movimientos_caja;
CREATE POLICY "caja_gestion_personal" ON public.restaurante_movimientos_caja
  FOR ALL TO authenticated USING (public.es_personal()) WITH CHECK (public.es_personal());
