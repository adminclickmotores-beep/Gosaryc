-- UTILIDAD BRUTA EXACTA POR RENGLÓN DE VENTA (POS comercial)
-- Cada renglón guarda el costo unitario (por unidad base del inventario) vigente al vender y
-- utilidad_bruta = base (venta sin impuestos) - costo_unitario * cantidad_base. No borra datos.

ALTER TABLE public.com_venta_items ADD COLUMN IF NOT EXISTS costo_unitario numeric NOT NULL DEFAULT 0;
ALTER TABLE public.com_venta_items ADD COLUMN IF NOT EXISTS utilidad_bruta numeric NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.com_venta_items_utilidad()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_costo numeric;
BEGIN
  SELECT coalesce(costo, 0) INTO v_costo FROM public.com_productos WHERE id = NEW.producto_id;
  NEW.costo_unitario := coalesce(v_costo, 0);
  NEW.utilidad_bruta := round(coalesce(NEW.base, 0) - coalesce(v_costo, 0) * coalesce(NEW.cantidad_base, 0), 2);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_a_com_venta_items_utilidad ON public.com_venta_items;
CREATE TRIGGER trg_a_com_venta_items_utilidad BEFORE INSERT ON public.com_venta_items
  FOR EACH ROW EXECUTE FUNCTION public.com_venta_items_utilidad();
