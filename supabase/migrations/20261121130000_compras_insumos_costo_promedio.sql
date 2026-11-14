-- Compras a proveedores: ingresan stock al inventario, recalculan el costo promedio ponderado,
-- dejan el movimiento en el kardex y registran la cuenta por pagar del proveedor.
CREATE OR REPLACE FUNCTION public.registrar_compra_insumo(
  p_insumo uuid,
  p_cantidad numeric,
  p_costo_total numeric,
  p_proveedor text,
  p_credito boolean
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  i record;
  v_unit_viejo numeric;
  v_unit_nuevo numeric;
  v_unit_prom numeric;
  v_stock_nuevo numeric;
  v_prov text := nullif(trim(coalesce(p_proveedor, '')), '');
BEGIN
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;
  IF p_costo_total IS NULL OR p_costo_total < 0 THEN
    RAISE EXCEPTION 'El costo no es válido';
  END IF;

  SELECT * INTO i FROM public.restaurante_insumos WHERE id = p_insumo AND owner_id = v_owner;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insumo no encontrado';
  END IF;

  v_unit_viejo := i.precio_compra / greatest(i.cantidad_compra, 0.000001);
  v_unit_nuevo := p_costo_total / p_cantidad;
  v_stock_nuevo := greatest(i.stock, 0) + p_cantidad;
  v_unit_prom := (greatest(i.stock, 0) * v_unit_viejo + p_cantidad * v_unit_nuevo) / v_stock_nuevo;

  UPDATE public.restaurante_insumos
     SET stock = i.stock + p_cantidad,
         precio_compra = v_unit_prom * i.cantidad_compra,
         proveedor = coalesce(v_prov, i.proveedor)
   WHERE id = p_insumo;

  INSERT INTO public.restaurante_kardex (owner_id, insumo_id, tipo, cantidad, stock_resultante, motivo)
  VALUES (v_owner, p_insumo, 'compra', p_cantidad, i.stock + p_cantidad,
          'Compra' || coalesce(' a ' || v_prov, '') || ' por ' || p_costo_total::bigint || CASE WHEN p_credito THEN ' (a crédito)' ELSE ' (contado)' END);

  INSERT INTO public.modulo_registros (owner_id, modulo, estado, titulo, detalle, contacto, monto, abonado, historial)
  VALUES (v_owner, 'proveedores', CASE WHEN p_credito THEN 'pendiente' ELSE 'hecho' END,
          'Compra de ' || i.nombre,
          p_cantidad || ' ' || i.unidad || ' · costo unitario ' || round(v_unit_nuevo, 2),
          v_prov, p_costo_total, CASE WHEN p_credito THEN 0 ELSE p_costo_total END,
          jsonb_build_array(jsonb_build_object('f', now(), 't', 'Compra registrada' || CASE WHEN p_credito THEN ' a crédito' ELSE ' de contado' END)));

  RETURN v_unit_prom;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_compra_insumo(uuid, numeric, numeric, text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.registrar_compra_insumo(uuid, numeric, numeric, text, boolean) TO authenticated;
