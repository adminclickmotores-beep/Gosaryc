-- Devuelve al inventario lo que se descontó de un pedido cancelado (una sola vez, solo de su negocio).
CREATE OR REPLACE FUNCTION public.devolver_insumos_pedido(p_pedido uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_pedido_owner uuid;
  v_estado text;
  k record;
  v_stock numeric;
  v_bodega uuid;
  v_devueltos integer := 0;
BEGIN
  SELECT owner_id, estado INTO v_pedido_owner, v_estado
    FROM public.restaurante_pedidos WHERE id = p_pedido FOR UPDATE;
  IF v_pedido_owner IS NULL OR v_pedido_owner <> v_owner OR v_estado <> 'cancelado' THEN
    RETURN 0;
  END IF;
  IF EXISTS (SELECT 1 FROM public.restaurante_kardex WHERE pedido_id = p_pedido AND tipo = 'devolucion_venta') THEN
    RETURN 0;
  END IF;

  FOR k IN
    SELECT insumo_id, sum(-cantidad) AS cantidad
      FROM public.restaurante_kardex
     WHERE pedido_id = p_pedido AND tipo = 'venta' AND owner_id = v_owner
     GROUP BY insumo_id
  LOOP
    IF k.cantidad IS NULL OR k.cantidad <= 0 THEN
      CONTINUE;
    END IF;

    UPDATE public.restaurante_insumos
       SET stock = stock + k.cantidad
     WHERE id = k.insumo_id AND owner_id = v_owner
    RETURNING stock, bodega_id INTO v_stock, v_bodega;

    IF FOUND THEN
      IF v_bodega IS NULL THEN
        SELECT bodega_id INTO v_bodega FROM public.restaurante_stock_bodega
         WHERE insumo_id = k.insumo_id ORDER BY stock DESC LIMIT 1;
      END IF;
      IF v_bodega IS NOT NULL THEN
        PERFORM public.agregar_stock_bodega(k.insumo_id, v_bodega, k.cantidad);
      END IF;
      INSERT INTO public.restaurante_kardex (owner_id, insumo_id, tipo, cantidad, stock_resultante, motivo, pedido_id)
      VALUES (v_owner, k.insumo_id, 'devolucion_venta', k.cantidad, v_stock,
              'Pedido cancelado #' || upper(left(p_pedido::text, 6)), p_pedido);
      v_devueltos := v_devueltos + 1;
    END IF;
  END LOOP;

  RETURN v_devueltos;
END;
$$;

REVOKE ALL ON FUNCTION public.devolver_insumos_pedido(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.devolver_insumos_pedido(uuid) TO authenticated;
