-- Stock por bodega: cada insumo puede tener existencias repartidas entre varias bodegas.
-- El stock total del insumo (restaurante_insumos.stock) se sigue manteniendo igual.
CREATE TABLE IF NOT EXISTS public.restaurante_stock_bodega (
  insumo_id uuid NOT NULL REFERENCES public.restaurante_insumos(id) ON DELETE CASCADE,
  bodega_id uuid NOT NULL REFERENCES public.restaurante_bodegas(id) ON DELETE CASCADE,
  stock numeric NOT NULL DEFAULT 0 CHECK (stock >= 0),
  PRIMARY KEY (insumo_id, bodega_id)
);

ALTER TABLE public.restaurante_stock_bodega ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_bodega_personal" ON public.restaurante_stock_bodega
  FOR ALL TO authenticated USING (public.es_personal()) WITH CHECK (public.es_personal());

-- Lo que ya tenía stock y una bodega asignada pasa a quedar repartido en esa bodega.
INSERT INTO public.restaurante_stock_bodega (insumo_id, bodega_id, stock)
SELECT id, bodega_id, stock
  FROM public.restaurante_insumos
 WHERE bodega_id IS NOT NULL AND stock > 0
ON CONFLICT (insumo_id, bodega_id) DO NOTHING;

-- Quita una cantidad del insumo empezando por la bodega con más stock.
CREATE OR REPLACE FUNCTION public.quitar_stock_bodegas(p_insumo uuid, p_cantidad numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  v_resta numeric := greatest(p_cantidad, 0);
  v_toma numeric;
BEGIN
  FOR r IN
    SELECT bodega_id, stock FROM public.restaurante_stock_bodega
     WHERE insumo_id = p_insumo AND stock > 0
     ORDER BY stock DESC
  LOOP
    EXIT WHEN v_resta <= 0;
    v_toma := least(r.stock, v_resta);
    UPDATE public.restaurante_stock_bodega
       SET stock = stock - v_toma
     WHERE insumo_id = p_insumo AND bodega_id = r.bodega_id;
    v_resta := v_resta - v_toma;
  END LOOP;
END;
$$;

-- Suma una cantidad al insumo en la bodega elegida.
CREATE OR REPLACE FUNCTION public.agregar_stock_bodega(p_insumo uuid, p_bodega uuid, p_cantidad numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.restaurante_stock_bodega (insumo_id, bodega_id, stock)
  VALUES (p_insumo, p_bodega, greatest(p_cantidad, 0))
  ON CONFLICT (insumo_id, bodega_id)
  DO UPDATE SET stock = public.restaurante_stock_bodega.stock + excluded.stock;
END;
$$;

-- Compra con bodega: usa la compra normal y además deja la mercancía en la bodega elegida.
CREATE OR REPLACE FUNCTION public.registrar_compra_insumo_bodega(
  p_insumo uuid,
  p_cantidad numeric,
  p_costo_total numeric,
  p_proveedor text,
  p_credito boolean,
  p_bodega uuid
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_unit numeric;
BEGIN
  v_unit := public.registrar_compra_insumo(p_insumo, p_cantidad, p_costo_total, p_proveedor, p_credito);
  IF p_bodega IS NOT NULL THEN
    PERFORM public.agregar_stock_bodega(p_insumo, p_bodega, p_cantidad);
  END IF;
  RETURN v_unit;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_compra_insumo_bodega(uuid, numeric, numeric, text, boolean, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.registrar_compra_insumo_bodega(uuid, numeric, numeric, text, boolean, uuid) TO authenticated;

-- Venta: descuenta el insumo total (como antes) y también de las bodegas, la de más stock primero.
CREATE OR REPLACE FUNCTION public.descontar_insumos_pedido(p_pedido uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_pedido_owner uuid;
  c record;
  v_stock numeric;
  v_min numeric;
  v_bajos integer := 0;
BEGIN
  SELECT owner_id INTO v_pedido_owner FROM public.restaurante_pedidos WHERE id = p_pedido;
  IF v_pedido_owner IS NULL OR v_pedido_owner <> v_owner THEN
    RETURN 0;
  END IF;
  IF EXISTS (SELECT 1 FROM public.restaurante_kardex WHERE pedido_id = p_pedido AND tipo = 'venta') THEN
    RETURN 0;
  END IF;

  FOR c IN
    SELECT ri.insumo_id,
           sum(pi.cantidad::numeric * ri.cantidad::numeric * (1 + r.merma_pct::numeric / 100.0) / greatest(r.porciones::numeric, 1)) AS consumo
      FROM public.restaurante_pedido_items pi
      JOIN public.restaurante_recetas r ON r.producto_id = pi.producto_id
      JOIN public.restaurante_receta_ingredientes ri ON ri.receta_id = r.id
     WHERE pi.pedido_id = p_pedido
     GROUP BY ri.insumo_id
  LOOP
    UPDATE public.restaurante_insumos
       SET stock = greatest(0, stock - c.consumo)
     WHERE id = c.insumo_id AND owner_id = v_owner
    RETURNING stock, stock_minimo INTO v_stock, v_min;

    IF FOUND THEN
      PERFORM public.quitar_stock_bodegas(c.insumo_id, c.consumo);
      INSERT INTO public.restaurante_kardex (owner_id, insumo_id, tipo, cantidad, stock_resultante, motivo, pedido_id)
      VALUES (v_owner, c.insumo_id, 'venta', -c.consumo, v_stock, 'Venta #' || upper(left(p_pedido::text, 6)), p_pedido);
      IF v_stock <= v_min THEN
        v_bajos := v_bajos + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN v_bajos;
END;
$$;

REVOKE ALL ON FUNCTION public.descontar_insumos_pedido(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.descontar_insumos_pedido(uuid) TO authenticated;

-- Devolución a proveedor (con descuento de deuda): además saca la mercancía de las bodegas, la de más stock primero.
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
  PERFORM public.quitar_stock_bodegas(p_insumo, p_cantidad);

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
