-- Cierra las reglas de acceso demasiado abiertas en pedidos públicos.

-- Función que confirma que un pedido es reciente y sigue en estado "nuevo".
CREATE OR REPLACE FUNCTION public.pedido_nuevo_reciente(p_pedido_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.restaurante_pedidos
    WHERE id = p_pedido_id
      AND estado = 'nuevo'
      AND created_at > now() - interval '15 minutes'
  );
$$;

REVOKE ALL ON FUNCTION public.pedido_nuevo_reciente(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.pedido_nuevo_reciente(uuid) TO anon, authenticated;

-- es_personal() devuelve false para visitantes; se permite ejecutarla para que las políticas de lectura pública no fallen.
GRANT EXECUTE ON FUNCTION public.es_personal() TO anon;

-- Pedidos: el cliente solo puede crear pedidos nuevos con datos válidos.
DROP POLICY IF EXISTS "pedidos_crear_cliente" ON public.restaurante_pedidos;
CREATE POLICY "pedidos_crear_cliente" ON public.restaurante_pedidos
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    estado = 'nuevo'
    AND total >= 0
    AND char_length(cliente_nombre) BETWEEN 1 AND 120
    AND char_length(cliente_telefono) BETWEEN 5 AND 30
    AND (direccion IS NULL OR char_length(direccion) <= 300)
    AND (notas IS NULL OR char_length(notas) <= 500)
  );

-- Artículos: solo se pueden agregar a un pedido nuevo y reciente.
DROP POLICY IF EXISTS "pedido_items_crear_cliente" ON public.restaurante_pedido_items;
CREATE POLICY "pedido_items_crear_cliente" ON public.restaurante_pedido_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    cantidad > 0
    AND cantidad <= 100
    AND public.pedido_nuevo_reciente(pedido_id)
  );

-- Lectura pública solo de lo que el cliente debe ver: categorías y productos activos.
DROP POLICY IF EXISTS "menu_categorias_lectura" ON public.restaurante_categorias;
CREATE POLICY "menu_categorias_lectura" ON public.restaurante_categorias
  FOR SELECT TO anon, authenticated USING (activa = true OR public.es_personal());

DROP POLICY IF EXISTS "menu_productos_lectura" ON public.restaurante_productos;
CREATE POLICY "menu_productos_lectura" ON public.restaurante_productos
  FOR SELECT TO anon, authenticated USING (activo = true OR public.es_personal());
