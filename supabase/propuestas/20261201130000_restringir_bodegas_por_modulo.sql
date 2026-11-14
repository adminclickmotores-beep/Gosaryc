-- PROPUESTA (NO APLICADA). Vive en supabase/propuestas/ a propósito: GoIDE solo aplica lo que está en supabase/migrations/.
-- Para activarla, DESPUÉS de que las pruebas F1/F2 den PERMITIDA_INDEBIDAMENTE en un entorno de pruebas y el dueño lo autorice,
-- se mueve a supabase/migrations/ conservando el nombre (su número va después de 20261201120000).
--
-- Hallazgo H6: las políticas de bodegas usan es_personal(), que acepta a cualquier empleado activo con alguno de los
-- módulos "pedidos", "cocina" o "domicilios", aunque no tenga "insumos". Con eso ese empleado puede ver, crear, editar y
-- borrar bodegas y existencias de SU propio negocio, y mover stock con mover_stock_bodega().
-- (No cruza entre empresas: owner_id = mi_negocio_id() sigue exigido. Es un exceso de permisos dentro de la misma empresa.)
--
-- Regla propuesta: bodegas y existencias solo para quien tenga el módulo "insumos" o "proveedores" (el rol "Bodega / compras"
-- de la app usa ambos), más el administrador y el superadmin, que tiene_permiso() ya incluye.
-- No toca descontar_insumos_pedido() ni quitar_stock_bodegas(): la venta en el POS (rol pedidos) debe seguir descontando stock.
-- No borra datos.

DROP POLICY IF EXISTS "bodegas_personal" ON public.restaurante_bodegas;
CREATE POLICY "bodegas_personal" ON public.restaurante_bodegas
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND (public.tiene_permiso('insumos') OR public.tiene_permiso('proveedores')))
  WITH CHECK (owner_id = public.mi_negocio_id() AND (public.tiene_permiso('insumos') OR public.tiene_permiso('proveedores')));

DROP POLICY IF EXISTS "stock_bodega_personal" ON public.restaurante_stock_bodega;
CREATE POLICY "stock_bodega_personal" ON public.restaurante_stock_bodega
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND (public.tiene_permiso('insumos') OR public.tiene_permiso('proveedores')))
  WITH CHECK (owner_id = public.mi_negocio_id() AND (public.tiene_permiso('insumos') OR public.tiene_permiso('proveedores')));

-- Mover stock entre bodegas: misma validación de negocio de la migración 20261201120000 + permiso de módulo.
CREATE OR REPLACE FUNCTION public.mover_stock_bodega(
  p_insumo uuid,
  p_origen uuid,
  p_destino uuid,
  p_cantidad numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_disp numeric;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Sin sesión';
  END IF;
  IF NOT (public.tiene_permiso('insumos') OR public.tiene_permiso('proveedores')) THEN
    RAISE EXCEPTION 'Sin permiso para mover existencias' USING ERRCODE = '42501';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;
  IF p_origen = p_destino THEN
    RAISE EXCEPTION 'La bodega de origen y destino son la misma';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.restaurante_insumos WHERE id = p_insumo AND owner_id = v_owner)
     OR NOT EXISTS (SELECT 1 FROM public.restaurante_bodegas WHERE id = p_origen AND owner_id = v_owner)
     OR NOT EXISTS (SELECT 1 FROM public.restaurante_bodegas WHERE id = p_destino AND owner_id = v_owner) THEN
    RAISE EXCEPTION 'Insumo o bodega no encontrados';
  END IF;

  SELECT stock INTO v_disp FROM public.restaurante_stock_bodega
   WHERE insumo_id = p_insumo AND bodega_id = p_origen AND owner_id = v_owner;
  IF v_disp IS NULL OR v_disp < p_cantidad THEN
    RAISE EXCEPTION 'No hay suficiente stock en la bodega de origen';
  END IF;

  UPDATE public.restaurante_stock_bodega
     SET stock = stock - p_cantidad
   WHERE insumo_id = p_insumo AND bodega_id = p_origen AND owner_id = v_owner;

  PERFORM public.agregar_stock_bodega(p_insumo, p_destino, p_cantidad);
END;
$$;

REVOKE ALL ON FUNCTION public.mover_stock_bodega(uuid, uuid, uuid, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mover_stock_bodega(uuid, uuid, uuid, numeric) TO authenticated;
