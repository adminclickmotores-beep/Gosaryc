-- Numeración consecutiva de facturas/recibos por negocio (owner_id), sin saltos ni repeticiones.
ALTER TABLE public.restaurante_pedidos ADD COLUMN IF NOT EXISTS numero_factura integer;

-- Rellena los pedidos existentes en orden de creación, por negocio.
UPDATE public.restaurante_pedidos p
   SET numero_factura = s.n
  FROM (
    SELECT id, row_number() OVER (PARTITION BY owner_id ORDER BY created_at, id) AS n
      FROM public.restaurante_pedidos
  ) s
 WHERE p.id = s.id AND p.numero_factura IS NULL;

CREATE OR REPLACE FUNCTION public.asignar_numero_factura()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.numero_factura IS NULL THEN
    SELECT coalesce(max(numero_factura), 0) + 1 INTO NEW.numero_factura
      FROM public.restaurante_pedidos
     WHERE owner_id IS NOT DISTINCT FROM NEW.owner_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_asignar_numero_factura ON public.restaurante_pedidos;
CREATE TRIGGER trg_asignar_numero_factura
  BEFORE INSERT ON public.restaurante_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.asignar_numero_factura();
