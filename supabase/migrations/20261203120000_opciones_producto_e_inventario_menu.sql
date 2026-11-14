-- Variantes y complementos por producto, guardados en cada línea del pedido,
-- y descuento de inventario más seguro (sin duplicar, sin pedidos cancelados, con bloqueo por pedido).

CREATE TABLE IF NOT EXISTS public.restaurante_producto_opciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  producto_id uuid NOT NULL REFERENCES public.restaurante_productos(id) ON DELETE CASCADE,
  grupo text NOT NULL,
  nombre text NOT NULL,
  precio_extra numeric NOT NULL DEFAULT 0 CHECK (precio_extra >= 0),
  obligatorio boolean NOT NULL DEFAULT false,
  multiple boolean NOT NULL DEFAULT false,
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS restaurante_producto_opciones_producto_idx
  ON public.restaurante_producto_opciones (producto_id);

ALTER TABLE public.restaurante_producto_opciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "opciones_lectura_publica" ON public.restaurante_producto_opciones;
CREATE POLICY "opciones_lectura_publica" ON public.restaurante_producto_opciones
  FOR SELECT TO anon, authenticated USING (activa = true AND owner_id IS NOT NULL);

DROP POLICY IF EXISTS "opciones_gestion" ON public.restaurante_producto_opciones;
CREATE POLICY "opciones_gestion" ON public.restaurante_producto_opciones
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

GRANT SELECT ON public.restaurante_producto_opciones TO anon;

-- Lo que el cliente eligió en cada línea del pedido.
ALTER TABLE public.restaurante_pedido_items
  ADD COLUMN IF NOT EXISTS opciones jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Descuento de inventario: bloquea el pedido (evita doble descuento con pedidos simultáneos),
-- ignora pedidos cancelados y solo consume lo que tiene receta.
CREATE OR REPLACE FUNCTION public.descontar_insumos_pedido(p_pedido uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_pedido_owner uuid;
  v_estado text;
  c record;
  v_stock numeric;
  v_min numeric;
  v_bajos integer := 0;
BEGIN
  SELECT owner_id, estado INTO v_pedido_owner, v_estado
    FROM public.restaurante_pedidos WHERE id = p_pedido FOR UPDATE;
  IF v_pedido_owner IS NULL OR v_pedido_owner <> v_owner THEN
    RETURN 0;
  END IF;
  IF v_estado = 'cancelado' THEN
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

REVOKE ALL ON FUNCTION public.descontar_insumos_pedido(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.descontar_insumos_pedido(uuid) TO authenticated;
