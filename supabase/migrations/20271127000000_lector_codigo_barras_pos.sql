-- Soporte completo para lector de códigos de barras, stock_actual y descarga automática en POS (online y offline).

-- 1. Configuración por negocio: permitir inventario negativo (por defecto false).
ALTER TABLE public.negocio_config
  ADD COLUMN IF NOT EXISTS permitir_inventario_negativo boolean NOT NULL DEFAULT false;

-- 2. Asegurar columna stock_actual en com_productos sincronizada con stock.
ALTER TABLE public.com_productos
  ADD COLUMN IF NOT EXISTS stock_actual numeric NOT NULL DEFAULT 0;

UPDATE public.com_productos
SET stock_actual = COALESCE(stock, 0)
WHERE stock_actual IS DISTINCT FROM COALESCE(stock, 0);

CREATE OR REPLACE FUNCTION public.com_productos_sync_stock_actual()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.stock IS DISTINCT FROM 0 AND NEW.stock_actual = 0 THEN
      NEW.stock_actual := NEW.stock;
    ELSIF NEW.stock_actual IS DISTINCT FROM 0 AND NEW.stock = 0 THEN
      NEW.stock := NEW.stock_actual;
    ELSE
      NEW.stock_actual := COALESCE(NEW.stock, NEW.stock_actual, 0);
      NEW.stock := NEW.stock_actual;
    END IF;
  ELSE
    IF NEW.stock IS DISTINCT FROM OLD.stock THEN
      NEW.stock_actual := NEW.stock;
    ELSIF NEW.stock_actual IS DISTINCT FROM OLD.stock_actual THEN
      NEW.stock := NEW.stock_actual;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_com_productos_sync_stock_actual'
  ) THEN
    CREATE TRIGGER trg_com_productos_sync_stock_actual
    BEFORE INSERT OR UPDATE ON public.com_productos
    FOR EACH ROW
    EXECUTE FUNCTION public.com_productos_sync_stock_actual();
  END IF;
END $$;

-- 3. Asegurar codigo_barras y stock_actual en restaurante_productos.
ALTER TABLE public.restaurante_productos
  ADD COLUMN IF NOT EXISTS codigo_barras text,
  ADD COLUMN IF NOT EXISTS stock_actual numeric;

CREATE INDEX IF NOT EXISTS idx_restaurante_productos_codigo_barras
  ON public.restaurante_productos (owner_id, codigo_barras)
  WHERE codigo_barras IS NOT NULL;

-- 4. Kardex / historial de inventario para productos de venta directa (restaurante_productos).
CREATE TABLE IF NOT EXISTS public.restaurante_productos_kardex (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  producto_id uuid NOT NULL REFERENCES public.restaurante_productos(id) ON DELETE CASCADE,
  pedido_id uuid REFERENCES public.restaurante_pedidos(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'salida',
  delta numeric NOT NULL,
  stock_resultante numeric NOT NULL DEFAULT 0,
  motivo text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurante_productos_kardex_owner_producto
  ON public.restaurante_productos_kardex (owner_id, producto_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_restaurante_productos_kardex_pedido
  ON public.restaurante_productos_kardex (pedido_id)
  WHERE pedido_id IS NOT NULL;

ALTER TABLE public.restaurante_productos_kardex ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'restaurante_productos_kardex' AND policyname = 'kardex_prod_select_owner'
  ) THEN
    CREATE POLICY kardex_prod_select_owner
      ON public.restaurante_productos_kardex
      FOR SELECT TO authenticated
      USING (owner_id = public.mi_negocio_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'restaurante_productos_kardex' AND policyname = 'kardex_prod_insert_owner'
  ) THEN
    CREATE POLICY kardex_prod_insert_owner
      ON public.restaurante_productos_kardex
      FOR INSERT TO authenticated
      WITH CHECK (owner_id = public.mi_negocio_id());
  END IF;
END $$;

GRANT SELECT, INSERT ON public.restaurante_productos_kardex TO authenticated;

-- 5. RPC idempotente para descontar stock_actual de productos vendidos y registrar salida en kardex.
CREATE OR REPLACE FUNCTION public.descontar_stock_productos_pedido(p_pedido uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_permitir_negativo boolean := false;
  v_item record;
  v_nuevo_stock numeric;
  v_descontados integer := 0;
BEGIN
  v_owner := public.mi_negocio_id();
  IF v_owner IS NULL THEN
    RETURN 0;
  END IF;

  -- Evitar descontar dos veces el mismo pedido.
  IF EXISTS (
    SELECT 1 FROM public.restaurante_productos_kardex
    WHERE pedido_id = p_pedido AND owner_id = v_owner
  ) THEN
    RETURN 0;
  END IF;

  SELECT COALESCE(permitir_inventario_negativo, false)
  INTO v_permitir_negativo
  FROM public.negocio_config
  WHERE owner_id = v_owner
  LIMIT 1;

  FOR v_item IN
    SELECT i.producto_id, SUM(i.cantidad) AS cant, p.stock_actual
    FROM public.restaurante_pedido_items i
    JOIN public.restaurante_productos p ON p.id = i.producto_id
    WHERE i.pedido_id = p_pedido
      AND i.producto_id IS NOT NULL
      AND p.owner_id = v_owner
      AND p.stock_actual IS NOT NULL
    GROUP BY i.producto_id, p.stock_actual
  LOOP
    IF v_permitir_negativo THEN
      v_nuevo_stock := v_item.stock_actual - v_item.cant;
    ELSE
      v_nuevo_stock := GREATEST(0, v_item.stock_actual - v_item.cant);
    END IF;

    UPDATE public.restaurante_productos
    SET stock_actual = v_nuevo_stock
    WHERE id = v_item.producto_id AND owner_id = v_owner;

    INSERT INTO public.restaurante_productos_kardex (
      owner_id,
      producto_id,
      pedido_id,
      tipo,
      delta,
      stock_resultante,
      motivo
    ) VALUES (
      v_owner,
      v_item.producto_id,
      p_pedido,
      'salida',
      -v_item.cant,
      v_nuevo_stock,
      'Venta POS #' || upper(left(p_pedido::text, 6))
    );

    v_descontados := v_descontados + 1;
  END LOOP;

  RETURN v_descontados;
END;
$$;

GRANT EXECUTE ON FUNCTION public.descontar_stock_productos_pedido(uuid) TO authenticated;
