-- Traslado de existencias de un insumo entre dos bodegas. El stock total del insumo no cambia.
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
  v_disp numeric;
BEGIN
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;
  IF p_origen = p_destino THEN
    RAISE EXCEPTION 'La bodega de origen y destino son la misma';
  END IF;

  SELECT stock INTO v_disp FROM public.restaurante_stock_bodega
   WHERE insumo_id = p_insumo AND bodega_id = p_origen;
  IF v_disp IS NULL OR v_disp < p_cantidad THEN
    RAISE EXCEPTION 'No hay suficiente stock en la bodega de origen';
  END IF;

  UPDATE public.restaurante_stock_bodega
     SET stock = stock - p_cantidad
   WHERE insumo_id = p_insumo AND bodega_id = p_origen;

  PERFORM public.agregar_stock_bodega(p_insumo, p_destino, p_cantidad);
END;
$$;

REVOKE ALL ON FUNCTION public.mover_stock_bodega(uuid, uuid, uuid, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.mover_stock_bodega(uuid, uuid, uuid, numeric) TO authenticated;
