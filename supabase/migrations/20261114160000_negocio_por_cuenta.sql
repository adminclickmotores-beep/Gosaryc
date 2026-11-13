-- Un negocio por cuenta: cada persona que se registra es dueña de su propio negocio
-- (su tipo, sus módulos y sus datos). Los datos ya existentes quedan con la cuenta más antigua.

-- 1. Columna "owner_id" en todas las tablas de datos del negocio.
DO $$
DECLARE
  t text;
  dueno uuid;
BEGIN
  SELECT user_id INTO dueno FROM public.personal_autorizado ORDER BY created_at ASC LIMIT 1;
  IF dueno IS NULL THEN
    SELECT id INTO dueno FROM auth.users ORDER BY created_at ASC LIMIT 1;
  END IF;

  FOREACH t IN ARRAY ARRAY[
    'negocio_config', 'equipo_negocio', 'modulo_registros', 'restaurante_categorias',
    'restaurante_productos', 'restaurante_pedidos', 'restaurante_clientes',
    'restaurante_repartidores', 'restaurante_mesas', 'restaurante_movimientos_caja',
    'restaurante_insumos', 'restaurante_recetas'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE', t);
    IF dueno IS NOT NULL THEN
      EXECUTE format('UPDATE public.%I SET owner_id = $1 WHERE owner_id IS NULL', t) USING dueno;
    END IF;
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (owner_id)', t || '_owner_idx', t);
  END LOOP;
END $$;

-- Un solo registro de configuración por dueño.
CREATE UNIQUE INDEX IF NOT EXISTS negocio_config_owner_unico ON public.negocio_config (owner_id) WHERE owner_id IS NOT NULL;

-- 2. ¿De qué negocio es la cuenta actual? Dueño = su propio id; equipo = el id de quien lo invitó.
CREATE OR REPLACE FUNCTION public.mi_negocio_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT e.owner_id FROM public.equipo_negocio e
      WHERE e.user_id = auth.uid() AND e.activo = true
        AND e.owner_id IS NOT NULL AND e.owner_id <> auth.uid()
      LIMIT 1),
    auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.mi_negocio_id() FROM public;
GRANT EXECUTE ON FUNCTION public.mi_negocio_id() TO anon, authenticated;

-- Valor por defecto: lo que se guarde queda a nombre del negocio de la cuenta.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'negocio_config', 'equipo_negocio', 'modulo_registros', 'restaurante_categorias',
    'restaurante_productos', 'restaurante_pedidos', 'restaurante_clientes',
    'restaurante_repartidores', 'restaurante_mesas', 'restaurante_movimientos_caja',
    'restaurante_insumos', 'restaurante_recetas'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN owner_id SET DEFAULT public.mi_negocio_id()', t);
  END LOOP;
END $$;

-- 3. Administrador = quien es dueño de su propio negocio (toda cuenta que se registra).
CREATE OR REPLACE FUNCTION public.es_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND public.mi_negocio_id() = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.es_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.es_admin() TO anon, authenticated;

-- ¿Existe un negocio con ese dueño? (para validar pedidos públicos)
CREATE OR REPLACE FUNCTION public.negocio_existe(p_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_owner IS NOT NULL AND EXISTS (SELECT 1 FROM public.negocio_config WHERE owner_id = p_owner);
$$;

REVOKE ALL ON FUNCTION public.negocio_existe(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.negocio_existe(uuid) TO anon, authenticated;

-- 4. Políticas: cada cuenta solo ve y modifica lo de su negocio.

-- Equipo
DROP POLICY IF EXISTS "equipo_admin_gestion" ON public.equipo_negocio;
CREATE POLICY "equipo_admin_gestion" ON public.equipo_negocio
  FOR ALL TO authenticated
  USING (public.es_admin() AND owner_id = public.mi_negocio_id())
  WITH CHECK (public.es_admin() AND owner_id = public.mi_negocio_id());

-- Configuración del negocio
DROP POLICY IF EXISTS "negocio_gestion_personal" ON public.negocio_config;
CREATE POLICY "negocio_gestion_personal" ON public.negocio_config
  FOR ALL TO authenticated
  USING (public.es_admin() AND owner_id = public.mi_negocio_id())
  WITH CHECK (public.es_admin() AND owner_id = public.mi_negocio_id());

DROP POLICY IF EXISTS "negocio_lectura_equipo" ON public.negocio_config;
CREATE POLICY "negocio_lectura_equipo" ON public.negocio_config
  FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id());

-- (negocio_lectura_publica para visitantes sin sesión se mantiene: el menú público muestra el nombre del negocio.)

-- Registros de módulos
DROP POLICY IF EXISTS "modulo_registros_gestion_personal" ON public.modulo_registros;
CREATE POLICY "modulo_registros_gestion_personal" ON public.modulo_registros
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso(modulo))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso(modulo));

-- Tablas de gestión interna (solo personal del negocio)
DROP POLICY IF EXISTS "clientes_personal" ON public.restaurante_clientes;
CREATE POLICY "clientes_personal" ON public.restaurante_clientes
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

DROP POLICY IF EXISTS "repartidores_personal" ON public.restaurante_repartidores;
CREATE POLICY "repartidores_personal" ON public.restaurante_repartidores
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

DROP POLICY IF EXISTS "mesas_gestion_personal" ON public.restaurante_mesas;
CREATE POLICY "mesas_gestion_personal" ON public.restaurante_mesas
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

DROP POLICY IF EXISTS "caja_gestion_personal" ON public.restaurante_movimientos_caja;
CREATE POLICY "caja_gestion_personal" ON public.restaurante_movimientos_caja
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

DROP POLICY IF EXISTS "insumos_personal" ON public.restaurante_insumos;
CREATE POLICY "insumos_personal" ON public.restaurante_insumos
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

DROP POLICY IF EXISTS "recetas_personal" ON public.restaurante_recetas;
CREATE POLICY "recetas_personal" ON public.restaurante_recetas
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

DROP POLICY IF EXISTS "receta_ingredientes_personal" ON public.restaurante_receta_ingredientes;
CREATE POLICY "receta_ingredientes_personal" ON public.restaurante_receta_ingredientes
  FOR ALL TO authenticated
  USING (
    public.es_personal() AND EXISTS (
      SELECT 1 FROM public.restaurante_recetas r
      WHERE r.id = receta_id AND r.owner_id = public.mi_negocio_id()
    )
  )
  WITH CHECK (
    public.es_personal() AND EXISTS (
      SELECT 1 FROM public.restaurante_recetas r
      WHERE r.id = receta_id AND r.owner_id = public.mi_negocio_id()
    )
  );

-- Menú: el personal gestiona lo suyo; los visitantes ven los productos activos de cada negocio.
DROP POLICY IF EXISTS "menu_categorias_gestion" ON public.restaurante_categorias;
CREATE POLICY "menu_categorias_gestion" ON public.restaurante_categorias
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

DROP POLICY IF EXISTS "menu_categorias_lectura" ON public.restaurante_categorias;
CREATE POLICY "menu_categorias_lectura" ON public.restaurante_categorias
  FOR SELECT TO anon USING (activa = true AND owner_id IS NOT NULL);
DROP POLICY IF EXISTS "menu_categorias_lectura_propia" ON public.restaurante_categorias;
CREATE POLICY "menu_categorias_lectura_propia" ON public.restaurante_categorias
  FOR SELECT TO authenticated USING (activa = true AND owner_id = public.mi_negocio_id());

DROP POLICY IF EXISTS "menu_productos_gestion" ON public.restaurante_productos;
CREATE POLICY "menu_productos_gestion" ON public.restaurante_productos
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

DROP POLICY IF EXISTS "menu_productos_lectura" ON public.restaurante_productos;
CREATE POLICY "menu_productos_lectura" ON public.restaurante_productos
  FOR SELECT TO anon USING (activo = true AND owner_id IS NOT NULL);
DROP POLICY IF EXISTS "menu_productos_lectura_propia" ON public.restaurante_productos;
CREATE POLICY "menu_productos_lectura_propia" ON public.restaurante_productos
  FOR SELECT TO authenticated USING (activo = true AND owner_id = public.mi_negocio_id());

-- Pedidos: cualquiera puede crear un pedido nuevo para un negocio que exista; solo su personal los ve y los cambia.
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
    AND owner_id IS NOT NULL
    AND (owner_id = public.mi_negocio_id() OR public.negocio_existe(owner_id))
  );

DROP POLICY IF EXISTS "pedidos_lectura_personal" ON public.restaurante_pedidos;
CREATE POLICY "pedidos_lectura_personal" ON public.restaurante_pedidos
  FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal());

DROP POLICY IF EXISTS "pedidos_actualizar_personal" ON public.restaurante_pedidos;
CREATE POLICY "pedidos_actualizar_personal" ON public.restaurante_pedidos
  FOR UPDATE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

DROP POLICY IF EXISTS "pedido_items_lectura_personal" ON public.restaurante_pedido_items;
CREATE POLICY "pedido_items_lectura_personal" ON public.restaurante_pedido_items
  FOR SELECT TO authenticated
  USING (
    public.es_personal() AND EXISTS (
      SELECT 1 FROM public.restaurante_pedidos p
      WHERE p.id = pedido_id AND p.owner_id = public.mi_negocio_id()
    )
  );
