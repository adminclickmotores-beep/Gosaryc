-- Recetario, insumos (inventario) y costos para el módulo de comida.
CREATE TABLE public.restaurante_insumos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  unidad text not null default 'g',
  cantidad_compra numeric not null default 1 CHECK (cantidad_compra > 0),
  precio_compra numeric not null default 0 CHECK (precio_compra >= 0),
  stock numeric not null default 0,
  stock_minimo numeric not null default 0,
  proveedor text,
  created_at timestamptz not null default now()
);

CREATE TABLE public.restaurante_recetas (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null unique REFERENCES public.restaurante_productos(id) ON DELETE CASCADE,
  porciones numeric not null default 1 CHECK (porciones > 0),
  merma_pct numeric not null default 0 CHECK (merma_pct >= 0),
  tiempo_min integer,
  preparacion text,
  created_at timestamptz not null default now()
);

CREATE TABLE public.restaurante_receta_ingredientes (
  id uuid primary key default gen_random_uuid(),
  receta_id uuid not null REFERENCES public.restaurante_recetas(id) ON DELETE CASCADE,
  insumo_id uuid not null REFERENCES public.restaurante_insumos(id) ON DELETE CASCADE,
  cantidad numeric not null default 0 CHECK (cantidad >= 0),
  created_at timestamptz not null default now()
);

CREATE INDEX receta_ingredientes_receta_idx ON public.restaurante_receta_ingredientes (receta_id);

ALTER TABLE public.restaurante_insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurante_recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurante_receta_ingredientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insumos_personal" ON public.restaurante_insumos
  FOR ALL TO authenticated USING (public.es_personal()) WITH CHECK (public.es_personal());
CREATE POLICY "recetas_personal" ON public.restaurante_recetas
  FOR ALL TO authenticated USING (public.es_personal()) WITH CHECK (public.es_personal());
CREATE POLICY "receta_ingredientes_personal" ON public.restaurante_receta_ingredientes
  FOR ALL TO authenticated USING (public.es_personal()) WITH CHECK (public.es_personal());
