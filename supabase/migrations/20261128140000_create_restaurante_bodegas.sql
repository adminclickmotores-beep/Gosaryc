-- Bodegas (almacenes) del inventario de insumos. Cada insumo puede quedar asignado a una bodega.
CREATE TABLE IF NOT EXISTS public.restaurante_bodegas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  direccion text,
  created_at timestamptz not null default now()
);

ALTER TABLE public.restaurante_bodegas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bodegas_personal" ON public.restaurante_bodegas
  FOR ALL TO authenticated USING (public.es_personal()) WITH CHECK (public.es_personal());

ALTER TABLE public.restaurante_insumos ADD COLUMN IF NOT EXISTS bodega_id uuid REFERENCES public.restaurante_bodegas(id) ON DELETE SET NULL;
