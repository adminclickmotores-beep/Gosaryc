-- Devoluciones a proveedor: sacan stock del inventario sin cambiar el costo promedio y dejan el movimiento en el kardex.
CREATE OR REPLACE FUNCTION public.devolver_compra_insumo(
  p_insumo uuid,
  p_cantidad numeric,
  p_motivo text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  i record;
  v_stock_nuevo numeric;
BEGIN
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;

  SELECT * INTO i FROM public.restaurante_insumos WHERE id = p_insumo AND owner_id = v_owner;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insumo no encontrado';
  END IF;

  IF p_cantidad > greatest(i.stock, 0) THEN
    RAISE EXCEPTION 'No hay suficiente stock para devolver';
  END IF;

  v_stock_nuevo := i.stock - p_cantidad;

  UPDATE public.restaurante_insumos
     SET stock = v_stock_nuevo
   WHERE id = p_insumo;

  INSERT INTO public.restaurante_kardex (owner_id, insumo_id, tipo, cantidad, stock_resultante, motivo)
  VALUES (v_owner, p_insumo, 'devolucion', -p_cantidad, v_stock_nuevo,
          'Devolución a proveedor' || coalesce(' · ' || nullif(trim(coalesce(p_motivo, '')), ''), ''));

  RETURN v_stock_nuevo;
END;
$$;

REVOKE ALL ON FUNCTION public.devolver_compra_insumo(uuid, numeric, text) FROM public;
GRANT EXECUTE ON FUNCTION public.devolver_compra_insumo(uuid, numeric, text) TO authenticated;
