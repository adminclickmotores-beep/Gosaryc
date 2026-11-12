-- Base del sistema de restaurante: menú digital y pedidos.

CREATE TABLE public.restaurante_categorias (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  orden integer not null default 0,
  activa boolean not null default true,
  created_at timestamptz not null default now()
);

CREATE TABLE public.restaurante_productos (
  id uuid primary key default gen_random_uuid(),
  categoria_id uuid references public.restaurante_categorias(id) on delete set null,
  nombre text not null,
  descripcion text,
  precio numeric(12,2) not null default 0 check (precio >= 0),
  activo boolean not null default true,
  destacado boolean not null default false,
  created_at timestamptz not null default now()
);

CREATE TABLE public.restaurante_pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_nombre text not null,
  cliente_telefono text not null,
  modalidad text not null default 'domicilio' check (modalidad in ('domicilio','recoger','mesa')),
  direccion text,
  notas text,
  total numeric(12,2) not null default 0 check (total >= 0),
  estado text not null default 'nuevo' check (estado in ('nuevo','preparando','listo','en_camino','entregado','cancelado')),
  canal text not null default 'web',
  created_at timestamptz not null default now()
);

CREATE TABLE public.restaurante_pedido_items (
  id uuid primary key default gen_random_uuid(),
  pedido_id uuid not null references public.restaurante_pedidos(id) on delete cascade,
  producto_id uuid references public.restaurante_productos(id) on delete set null,
  nombre text not null,
  cantidad integer not null check (cantidad > 0),
  precio_unitario numeric(12,2) not null check (precio_unitario >= 0),
  created_at timestamptz not null default now()
);

ALTER TABLE public.restaurante_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurante_productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurante_pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurante_pedido_items ENABLE ROW LEVEL SECURITY;

-- Menú: lo ve cualquiera, lo administra el personal con sesión.
CREATE POLICY "menu_categorias_lectura" ON public.restaurante_categorias
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "menu_categorias_gestion" ON public.restaurante_categorias
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "menu_productos_lectura" ON public.restaurante_productos
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "menu_productos_gestion" ON public.restaurante_productos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Pedidos: cualquier cliente puede crear uno nuevo; solo el personal los ve y los mueve.
CREATE POLICY "pedidos_crear_cliente" ON public.restaurante_pedidos
  FOR INSERT TO anon, authenticated WITH CHECK (estado = 'nuevo' AND total >= 0);
CREATE POLICY "pedidos_lectura_personal" ON public.restaurante_pedidos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "pedidos_actualizar_personal" ON public.restaurante_pedidos
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "pedido_items_crear_cliente" ON public.restaurante_pedido_items
  FOR INSERT TO anon, authenticated WITH CHECK (cantidad > 0);
CREATE POLICY "pedido_items_lectura_personal" ON public.restaurante_pedido_items
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.restaurante_categorias, public.restaurante_productos TO anon;
GRANT INSERT ON public.restaurante_pedidos, public.restaurante_pedido_items TO anon;

-- Menú de ejemplo para arrancar.
INSERT INTO public.restaurante_categorias (nombre, orden) VALUES
  ('Platos fuertes', 1), ('Acompañamientos', 2), ('Bebidas', 3);

INSERT INTO public.restaurante_productos (categoria_id, nombre, descripcion, precio, destacado)
SELECT c.id, p.nombre, p.descripcion, p.precio, p.destacado
FROM (VALUES
  ('Platos fuertes', 'Hamburguesa de la casa', 'Carne artesanal, queso, lechuga y salsa especial', 28000, true),
  ('Platos fuertes', 'Pollo a la parrilla', 'Pechuga jugosa con hierbas', 32000, false),
  ('Acompañamientos', 'Papas fritas', 'Porción grande crocante', 9000, false),
  ('Acompañamientos', 'Ensalada fresca', 'Mezcla de verdes de temporada', 8000, false),
  ('Bebidas', 'Limonada natural', 'Recién exprimida', 7000, false),
  ('Bebidas', 'Gaseosa', 'Botella personal', 5000, false)
) AS p(categoria, nombre, descripcion, precio, destacado)
JOIN public.restaurante_categorias c ON c.nombre = p.categoria;
