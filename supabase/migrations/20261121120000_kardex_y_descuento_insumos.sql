-- Kardex de insumos y descuento automático de stock al vender (según las recetas).
CREATE TABLE IF NOT EXISTS public.restaurante_kardex (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  insumo_id uuid not null REFERENCES public.restaurante_insumos(id) ON DELETE CASCADE,
  tipo text not null,
  cantidad numeric not null,
  stock_resultante numeric not null default 0,
  motivo text,
  pedido_id uuid,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS restaurante_kardex_owner_idx ON public.restaurante_kardex (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS restaurante_kardex_pedido_idx ON public.restaurante_kardex (pedido_id);

ALTER TABLE public.restaurante_kardex ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "kardex_personal" ON public.restaurante_kardex;
CREATE POLICY "kardex_personal" ON public.restaurante_kardex
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND (public.es_personal() OR public.tiene_permiso('insumos')))
  WITH CHECK (owner_id = public.mi_negocio_id() AND (public.es_personal() OR public.tiene_permiso('insumos')));

-- Descuenta los insumos de un pedido (una sola vez por pedido). Devuelve cuántos insumos quedaron en o bajo el mínimo.
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
