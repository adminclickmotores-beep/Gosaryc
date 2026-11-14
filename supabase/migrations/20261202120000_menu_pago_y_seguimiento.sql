-- Menú digital: método de pago elegido por el cliente y seguimiento público del pedido.
ALTER TABLE public.restaurante_pedidos
  ADD COLUMN IF NOT EXISTS metodo_pago text NOT NULL DEFAULT 'efectivo';

-- El cliente consulta su pedido solo con el código completo (uuid): no expone otros pedidos.
CREATE OR REPLACE FUNCTION public.seguimiento_pedido(_id uuid)
RETURNS TABLE (
  estado text,
  modalidad text,
  total numeric,
  metodo_pago text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.estado, p.modalidad, p.total, p.metodo_pago, p.created_at
    FROM public.restaurante_pedidos p
   WHERE p.id = _id;
$$;

REVOKE ALL ON FUNCTION public.seguimiento_pedido(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.seguimiento_pedido(uuid) TO anon, authenticated;
