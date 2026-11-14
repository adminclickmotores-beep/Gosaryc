-- Devolución a proveedor que además descuenta lo que se le debe (nota crédito en sus registros).
CREATE OR REPLACE FUNCTION public.devolver_compra_proveedor(
  p_insumo uuid,
  p_cantidad numeric,
  p_motivo text,
  p_proveedor text,
  p_valor numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_prov text := nullif(trim(coalesce(p_proveedor, '')), '');
  v_stock numeric;
  v_deuda numeric := 0;
  v_descuento numeric := 0;
  v_nombre text;
BEGIN
  v_stock := public.devolver_compra_insumo(p_insumo, p_cantidad, p_motivo);

  IF v_prov IS NOT NULL AND p_valor IS NOT NULL AND p_valor > 0 THEN
    SELECT coalesce(sum(monto), 0) INTO v_deuda
      FROM public.modulo_registros
     WHERE owner_id = v_owner AND modulo = 'proveedores' AND estado <> 'hecho'
       AND lower(trim(coalesce(contacto, titulo))) = lower(v_prov);

    v_descuento := least(p_valor, greatest(v_deuda, 0));

    IF v_descuento > 0 THEN
      SELECT nombre INTO v_nombre FROM public.restaurante_insumos WHERE id = p_insumo;
      INSERT INTO public.modulo_registros (owner_id, modulo, estado, titulo, detalle, contacto, monto, abonado, historial)
      VALUES (v_owner, 'proveedores', 'pendiente',
              'Devolución de ' || coalesce(v_nombre, 'insumo'),
              p_cantidad || ' devueltos · descuenta la deuda',
              v_prov, -v_descuento, 0,
              jsonb_build_array(jsonb_build_object('f', now(), 't', 'Devolución: descuenta ' || v_descuento::bigint || ' de la deuda')));
    END IF;
  END IF;

  RETURN v_stock;
END;
$$;

REVOKE ALL ON FUNCTION public.devolver_compra_proveedor(uuid, numeric, text, text, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.devolver_compra_proveedor(uuid, numeric, text, text, numeric) TO authenticated;
