-- Clientes y repartidores para domicilios.

CREATE TABLE public.restaurante_clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text not null unique,
  direccion text,
  notas text,
  total_pedidos integer not null default 0,
  total_gastado numeric(12,2) not null default 0,
  ultimo_pedido timestamptz,
  created_at timestamptz not null default now()
);

CREATE TABLE public.restaurante_repartidores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  telefono text,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

ALTER TABLE public.restaurante_pedidos
  ADD COLUMN cliente_id uuid references public.restaurante_clientes(id) on delete set null,
  ADD COLUMN repartidor_id uuid references public.restaurante_repartidores(id) on delete set null;

ALTER TABLE public.restaurante_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurante_repartidores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clientes_personal" ON public.restaurante_clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "repartidores_personal" ON public.restaurante_repartidores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Cada pedido nuevo crea o actualiza al cliente por su teléfono.
CREATE OR REPLACE FUNCTION public.restaurante_registrar_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
BEGIN
  INSERT INTO public.restaurante_clientes (nombre, telefono, direccion, total_pedidos, total_gastado, ultimo_pedido)
  VALUES (NEW.cliente_nombre, NEW.cliente_telefono, NEW.direccion, 1, NEW.total, now())
  ON CONFLICT (telefono) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    direccion = COALESCE(EXCLUDED.direccion, public.restaurante_clientes.direccion),
    total_pedidos = public.restaurante_clientes.total_pedidos + 1,
    total_gastado = public.restaurante_clientes.total_gastado + EXCLUDED.total_gastado,
    ultimo_pedido = now()
  RETURNING id INTO cid;
  NEW.cliente_id := cid;
  RETURN NEW;
END;
$$;

CREATE TRIGGER restaurante_pedidos_registrar_cliente
  BEFORE INSERT ON public.restaurante_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.restaurante_registrar_cliente();

-- Clientes de pedidos anteriores.
INSERT INTO public.restaurante_clientes (nombre, telefono, direccion, total_pedidos, total_gastado, ultimo_pedido)
SELECT (array_agg(cliente_nombre ORDER BY created_at DESC))[1], cliente_telefono,
       (array_agg(direccion ORDER BY created_at DESC) FILTER (WHERE direccion IS NOT NULL))[1],
       count(*), sum(total), max(created_at)
FROM public.restaurante_pedidos GROUP BY cliente_telefono
ON CONFLICT (telefono) DO NOTHING;

UPDATE public.restaurante_pedidos p SET cliente_id = c.id
FROM public.restaurante_clientes c
WHERE c.telefono = p.cliente_telefono AND p.cliente_id IS NULL;
