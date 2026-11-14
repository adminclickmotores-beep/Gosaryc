-- Estado del pago (distinto del método de pago) e historial de cada pedido.
ALTER TABLE public.restaurante_pedidos
  ADD COLUMN IF NOT EXISTS pago_estado text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS historial jsonb NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurante_pedidos_pago_estado_chk'
  ) THEN
    ALTER TABLE public.restaurante_pedidos
      ADD CONSTRAINT restaurante_pedidos_pago_estado_chk
      CHECK (pago_estado IN ('pendiente', 'pagado'));
  END IF;
END $$;

-- Los pedidos ya entregados antes de esta migración se consideran pagados.
UPDATE public.restaurante_pedidos SET pago_estado = 'pagado' WHERE estado = 'entregado' AND pago_estado = 'pendiente';
