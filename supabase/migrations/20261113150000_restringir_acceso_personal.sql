-- Restringe el acceso de gestión al personal autorizado (antes cualquier cuenta registrada podía todo).

CREATE TABLE IF NOT EXISTS public.personal_autorizado (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.personal_autorizado ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.es_personal()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.personal_autorizado WHERE user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.es_personal() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.es_personal() TO authenticated;

CREATE POLICY "personal_ver_propio" ON public.personal_autorizado
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- La primera cuenta que se registre queda como personal autorizado.
CREATE OR REPLACE FUNCTION public.autorizar_primer_usuario()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.personal_autorizado) THEN
    INSERT INTO public.personal_autorizado (user_id) VALUES (NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autorizar_primer_usuario ON auth.users;
CREATE TRIGGER trg_autorizar_primer_usuario
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.autorizar_primer_usuario();

-- Cuentas que ya existen: se autoriza la más antigua (la del dueño).
INSERT INTO public.personal_autorizado (user_id)
SELECT id FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.personal_autorizado)
ORDER BY created_at ASC
LIMIT 1;

-- Políticas: solo personal autorizado.
DROP POLICY IF EXISTS "clientes_personal" ON public.restaurante_clientes;
CREATE POLICY "clientes_personal" ON public.restaurante_clientes
  FOR ALL TO authenticated USING (public.es_personal()) WITH CHECK (public.es_personal());

DROP POLICY IF EXISTS "repartidores_personal" ON public.restaurante_repartidores;
CREATE POLICY "repartidores_personal" ON public.restaurante_repartidores
  FOR ALL TO authenticated USING (public.es_personal()) WITH CHECK (public.es_personal());

DROP POLICY IF EXISTS "menu_categorias_gestion" ON public.restaurante_categorias;
CREATE POLICY "menu_categorias_gestion" ON public.restaurante_categorias
  FOR ALL TO authenticated USING (public.es_personal()) WITH CHECK (public.es_personal());

DROP POLICY IF EXISTS "menu_productos_gestion" ON public.restaurante_productos;
CREATE POLICY "menu_productos_gestion" ON public.restaurante_productos
  FOR ALL TO authenticated USING (public.es_personal()) WITH CHECK (public.es_personal());

DROP POLICY IF EXISTS "pedidos_lectura_personal" ON public.restaurante_pedidos;
CREATE POLICY "pedidos_lectura_personal" ON public.restaurante_pedidos
  FOR SELECT TO authenticated USING (public.es_personal());

DROP POLICY IF EXISTS "pedidos_actualizar_personal" ON public.restaurante_pedidos;
CREATE POLICY "pedidos_actualizar_personal" ON public.restaurante_pedidos
  FOR UPDATE TO authenticated USING (public.es_personal()) WITH CHECK (public.es_personal());

DROP POLICY IF EXISTS "pedido_items_lectura_personal" ON public.restaurante_pedido_items;
CREATE POLICY "pedido_items_lectura_personal" ON public.restaurante_pedido_items
  FOR SELECT TO authenticated USING (public.es_personal());

DROP POLICY IF EXISTS "negocio_gestion_personal" ON public.negocio_config;
CREATE POLICY "negocio_gestion_personal" ON public.negocio_config
  FOR ALL TO authenticated USING (public.es_personal()) WITH CHECK (public.es_personal());

DROP POLICY IF EXISTS "modulo_registros_gestion_personal" ON public.modulo_registros;
CREATE POLICY "modulo_registros_gestion_personal" ON public.modulo_registros
  FOR ALL TO authenticated USING (public.es_personal()) WITH CHECK (public.es_personal());
