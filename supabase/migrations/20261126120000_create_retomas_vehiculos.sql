-- Retomas, compras y consignaciones de vehículos usados (con peritaje y resultado).
CREATE TABLE IF NOT EXISTS public.retomas_vehiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  operacion text NOT NULL DEFAULT 'retoma',
  tipo text NOT NULL DEFAULT 'carro',
  marca text NOT NULL,
  modelo text NOT NULL,
  version text,
  anio integer,
  placa text,
  color text,
  kilometraje integer,
  vendedor_nombre text,
  vendedor_telefono text,
  vendedor_documento text,
  precio_pedido numeric,
  precio_retoma numeric,
  precio_venta numeric,
  peritaje_fecha date,
  peritaje_notas text,
  resultado text NOT NULL DEFAULT 'en_evaluacion',
  motivo_resultado text,
  vehiculo_id uuid REFERENCES public.vehiculos_inventario(id) ON DELETE SET NULL,
  observaciones text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS retomas_vehiculos_owner_idx ON public.retomas_vehiculos (owner_id);

ALTER TABLE public.retomas_vehiculos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "retomas_vehiculos_personal" ON public.retomas_vehiculos;
CREATE POLICY "retomas_vehiculos_personal" ON public.retomas_vehiculos
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
