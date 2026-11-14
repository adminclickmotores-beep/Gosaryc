-- Roles por módulo (cajero, cocina, contador...) y acceso total para el programador.

-- 1. Acceso total del programador: este correo ve y administra todos los negocios.
CREATE OR REPLACE FUNCTION public.es_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND lower(coalesce(auth.jwt() ->> 'email', '')) = 'jhonathan.cortes.24@gmail.com';
$$;

REVOKE ALL ON FUNCTION public.es_superadmin() FROM public;
GRANT EXECUTE ON FUNCTION public.es_superadmin() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.tiene_permiso(p_modulo text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.es_superadmin() OR public.es_admin() OR EXISTS (
    SELECT 1 FROM public.equipo_negocio
    WHERE user_id = auth.uid() AND activo = true AND p_modulo = ANY (modulos)
  );
$$;

CREATE OR REPLACE FUNCTION public.es_personal()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.es_superadmin() OR public.es_admin() OR EXISTS (
    SELECT 1 FROM public.equipo_negocio
    WHERE user_id = auth.uid() AND activo = true
      AND modulos && ARRAY['pedidos', 'cocina', 'domicilios']::text[]
  );
$$;

CREATE OR REPLACE FUNCTION public.mi_acceso()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'admin', (public.es_admin() OR public.es_superadmin()),
    'modulos', coalesce(
      (SELECT modulos FROM public.equipo_negocio WHERE user_id = auth.uid() AND activo = true LIMIT 1),
      '{}'::text[]
    )
  );
$$;

-- Política de acceso total en toda tabla que tenga dueño (owner_id).
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public' AND c.column_name = 'owner_id'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "superadmin_todo" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "superadmin_todo" ON public.%I FOR ALL TO authenticated USING (public.es_superadmin()) WITH CHECK (public.es_superadmin())',
      t
    );
  END LOOP;
  FOREACH t IN ARRAY ARRAY['restaurante_pedido_items', 'restaurante_receta_ingredientes'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "superadmin_todo" ON public.%I', t);
      EXECUTE format(
        'CREATE POLICY "superadmin_todo" ON public.%I FOR ALL TO authenticated USING (public.es_superadmin()) WITH CHECK (public.es_superadmin())',
        t
      );
    END IF;
  END LOOP;
END $$;

-- 2. Cada rol solo toca lo suyo.

-- Mesas: mesero o quien tenga el módulo de mesas.
DROP POLICY IF EXISTS "mesas_gestion_personal" ON public.restaurante_mesas;
CREATE POLICY "mesas_gestion_personal" ON public.restaurante_mesas
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND (public.es_personal() OR public.tiene_permiso('mesas')))
  WITH CHECK (owner_id = public.mi_negocio_id() AND (public.es_personal() OR public.tiene_permiso('mesas')));

-- Caja: quien cobra (pedidos) o tiene caja diaria.
DROP POLICY IF EXISTS "caja_gestion_personal" ON public.restaurante_movimientos_caja;
CREATE POLICY "caja_gestion_personal" ON public.restaurante_movimientos_caja
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND (public.es_personal() OR public.tiene_permiso('caja_diaria')))
  WITH CHECK (owner_id = public.mi_negocio_id() AND (public.es_personal() OR public.tiene_permiso('caja_diaria')));

-- Insumos y recetas: solo quien tenga el módulo de insumos (y el personal de cocina/pedidos).
DROP POLICY IF EXISTS "insumos_personal" ON public.restaurante_insumos;
CREATE POLICY "insumos_personal" ON public.restaurante_insumos
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND (public.es_personal() OR public.tiene_permiso('insumos')))
  WITH CHECK (owner_id = public.mi_negocio_id() AND (public.es_personal() OR public.tiene_permiso('insumos')));

DROP POLICY IF EXISTS "recetas_personal" ON public.restaurante_recetas;
CREATE POLICY "recetas_personal" ON public.restaurante_recetas
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND (public.es_personal() OR public.tiene_permiso('insumos')))
  WITH CHECK (owner_id = public.mi_negocio_id() AND (public.es_personal() OR public.tiene_permiso('insumos')));

DROP POLICY IF EXISTS "receta_ingredientes_personal" ON public.restaurante_receta_ingredientes;
CREATE POLICY "receta_ingredientes_personal" ON public.restaurante_receta_ingredientes
  FOR ALL TO authenticated
  USING (
    (public.es_personal() OR public.tiene_permiso('insumos')) AND EXISTS (
      SELECT 1 FROM public.restaurante_recetas r
      WHERE r.id = receta_id AND r.owner_id = public.mi_negocio_id()
    )
  )
  WITH CHECK (
    (public.es_personal() OR public.tiene_permiso('insumos')) AND EXISTS (
      SELECT 1 FROM public.restaurante_recetas r
      WHERE r.id = receta_id AND r.owner_id = public.mi_negocio_id()
    )
  );

-- Reportes de ventas: la contadora (finanzas) también lee los pedidos.
DROP POLICY IF EXISTS "pedidos_lectura_personal" ON public.restaurante_pedidos;
CREATE POLICY "pedidos_lectura_personal" ON public.restaurante_pedidos
  FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND (public.es_personal() OR public.tiene_permiso('finanzas')));

DROP POLICY IF EXISTS "pedido_items_lectura_personal" ON public.restaurante_pedido_items;
CREATE POLICY "pedido_items_lectura_personal" ON public.restaurante_pedido_items
  FOR SELECT TO authenticated
  USING (
    (public.es_personal() OR public.tiene_permiso('finanzas')) AND EXISTS (
      SELECT 1 FROM public.restaurante_pedidos p
      WHERE p.id = pedido_id AND p.owner_id = public.mi_negocio_id()
    )
  );

-- Contabilidad: solo quien tenga el módulo de finanzas.
DROP POLICY IF EXISTS "cuentas_contables_personal" ON public.cuentas_contables;
CREATE POLICY "cuentas_contables_personal" ON public.cuentas_contables
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('finanzas'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('finanzas'));

DROP POLICY IF EXISTS "asientos_contables_personal" ON public.asientos_contables;
CREATE POLICY "asientos_contables_personal" ON public.asientos_contables
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('finanzas'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('finanzas'));

-- Agenda: quien tenga el módulo de agenda (o el personal de pedidos).
DROP POLICY IF EXISTS "agenda_citas_personal" ON public.agenda_citas;
CREATE POLICY "agenda_citas_personal" ON public.agenda_citas
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND (public.es_personal() OR public.tiene_permiso('agenda')))
  WITH CHECK (owner_id = public.mi_negocio_id() AND (public.es_personal() OR public.tiene_permiso('agenda')));
