-- Liga cada pedido a una mesa (opcional).

ALTER TABLE public.restaurante_pedidos
  ADD COLUMN mesa_id uuid references public.restaurante_mesas(id) on delete set null;
