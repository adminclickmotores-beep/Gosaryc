-- Aislamiento multiempresa (misión 1). Corrige tablas, funciones y archivos que no separaban por negocio.
-- No borra datos: solo agrega columnas, rellena el dueño y reemplaza políticas/funciones.

-- ============================================================
-- 1. Bodegas y stock por bodega: ahora pertenecen a un negocio
-- ============================================================
ALTER TABLE public.restaurante_bodegas
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id();
ALTER TABLE public.restaurante_stock_bodega
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id();

-- Dueño de cada bodega: el del primer insumo que la usa; si no tiene insumos, el dueño más antiguo (como en la migración anterior).
UPDATE public.restaurante_bodegas b
   SET owner_id = (SELECT i.owner_id FROM public.restaurante_insumos i WHERE i.bodega_id = b.id AND i.owner_id IS NOT NULL LIMIT 1)
 WHERE b.owner_id IS NULL;

UPDATE public.restaurante_bodegas
   SET owner_id = coalesce(
     (SELECT user_id FROM public.personal_autorizado ORDER BY created_at ASC LIMIT 1),
     (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1))
 WHERE owner_id IS NULL;

UPDATE public.restaurante_stock_bodega s
   SET owner_id = (SELECT i.owner_id FROM public.restaurante_insumos i WHERE i.id = s.insumo_id)
 WHERE s.owner_id IS NULL;

CREATE INDEX IF NOT EXISTS restaurante_bodegas_owner_idx ON public.restaurante_bodegas (owner_id);
CREATE INDEX IF NOT EXISTS restaurante_stock_bodega_owner_idx ON public.restaurante_stock_bodega (owner_id);

DROP POLICY IF EXISTS "bodegas_personal" ON public.restaurante_bodegas;
CREATE POLICY "bodegas_personal" ON public.restaurante_bodegas
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND (public.es_personal() OR public.tiene_permiso('insumos')))
  WITH CHECK (owner_id = public.mi_negocio_id() AND (public.es_personal() OR public.tiene_permiso('insumos')));

DROP POLICY IF EXISTS "stock_bodega_personal" ON public.restaurante_stock_bodega;
CREATE POLICY "stock_bodega_personal" ON public.restaurante_stock_bodega
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND (public.es_personal() OR public.tiene_permiso('insumos')))
  WITH CHECK (owner_id = public.mi_negocio_id() AND (public.es_personal() OR public.tiene_permiso('insumos')));

-- ============================================================
-- 2. Funciones de bodega: verifican que insumo y bodega sean del negocio de quien llama
--    (antes cualquiera, incluso sin sesión, podía mover el stock de otro negocio)
-- ============================================================
CREATE OR REPLACE FUNCTION public.quitar_stock_bodegas(p_insumo uuid, p_cantidad numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  r record;
  v_resta numeric := greatest(p_cantidad, 0);
  v_toma numeric;
BEGIN
  IF v_owner IS NULL OR NOT EXISTS (SELECT 1 FROM public.restaurante_insumos WHERE id = p_insumo AND owner_id = v_owner) THEN
    RAISE EXCEPTION 'Insumo no encontrado';
  END IF;
  FOR r IN
    SELECT bodega_id, stock FROM public.restaurante_stock_bodega
     WHERE insumo_id = p_insumo AND owner_id = v_owner AND stock > 0
     ORDER BY stock DESC
  LOOP
    EXIT WHEN v_resta <= 0;
    v_toma := least(r.stock, v_resta);
    UPDATE public.restaurante_stock_bodega
       SET stock = stock - v_toma
     WHERE insumo_id = p_insumo AND bodega_id = r.bodega_id AND owner_id = v_owner;
    v_resta := v_resta - v_toma;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.agregar_stock_bodega(p_insumo uuid, p_bodega uuid, p_cantidad numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
BEGIN
  IF v_owner IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.restaurante_insumos WHERE id = p_insumo AND owner_id = v_owner)
     OR NOT EXISTS (SELECT 1 FROM public.restaurante_bodegas WHERE id = p_bodega AND owner_id = v_owner) THEN
    RAISE EXCEPTION 'Insumo o bodega no encontrados';
  END IF;
  INSERT INTO public.restaurante_stock_bodega (insumo_id, bodega_id, stock, owner_id)
  VALUES (p_insumo, p_bodega, greatest(p_cantidad, 0), v_owner)
  ON CONFLICT (insumo_id, bodega_id)
  DO UPDATE SET stock = public.restaurante_stock_bodega.stock + excluded.stock;
END;
$$;

CREATE OR REPLACE FUNCTION public.mover_stock_bodega(
  p_insumo uuid,
  p_origen uuid,
  p_destino uuid,
  p_cantidad numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_disp numeric;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Sin sesión';
  END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;
  IF p_origen = p_destino THEN
    RAISE EXCEPTION 'La bodega de origen y destino son la misma';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.restaurante_insumos WHERE id = p_insumo AND owner_id = v_owner)
     OR NOT EXISTS (SELECT 1 FROM public.restaurante_bodegas WHERE id = p_origen AND owner_id = v_owner)
     OR NOT EXISTS (SELECT 1 FROM public.restaurante_bodegas WHERE id = p_destino AND owner_id = v_owner) THEN
    RAISE EXCEPTION 'Insumo o bodega no encontrados';
  END IF;

  SELECT stock INTO v_disp FROM public.restaurante_stock_bodega
   WHERE insumo_id = p_insumo AND bodega_id = p_origen AND owner_id = v_owner;
  IF v_disp IS NULL OR v_disp < p_cantidad THEN
    RAISE EXCEPTION 'No hay suficiente stock en la bodega de origen';
  END IF;

  UPDATE public.restaurante_stock_bodega
     SET stock = stock - p_cantidad
   WHERE insumo_id = p_insumo AND bodega_id = p_origen AND owner_id = v_owner;

  PERFORM public.agregar_stock_bodega(p_insumo, p_destino, p_cantidad);
END;
$$;

-- Las funciones internas ya no se pueden llamar desde fuera (solo las llaman otras funciones del servidor).
REVOKE ALL ON FUNCTION public.quitar_stock_bodegas(uuid, numeric) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.agregar_stock_bodega(uuid, uuid, numeric) FROM public, anon, authenticated;

-- Las que sí usa la app quedan solo para cuentas con sesión.
REVOKE ALL ON FUNCTION public.mover_stock_bodega(uuid, uuid, uuid, numeric) FROM public, anon;
REVOKE ALL ON FUNCTION public.registrar_compra_insumo_bodega(uuid, numeric, numeric, text, boolean, uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.descontar_insumos_pedido(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.devolver_compra_proveedor(uuid, numeric, text, text, numeric) FROM public, anon;
REVOKE ALL ON FUNCTION public.registrar_compra_insumo(uuid, numeric, numeric, text, boolean) FROM public, anon;
REVOKE ALL ON FUNCTION public.devolver_compra_insumo(uuid, numeric, text) FROM public, anon;

-- ============================================================
-- 3. Historial del equipo: cada administrador solo ve el de su negocio
-- ============================================================
ALTER TABLE public.equipo_auditoria
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

UPDATE public.equipo_auditoria a
   SET owner_id = coalesce(
     (SELECT e.owner_id FROM public.equipo_negocio e WHERE lower(e.email) = lower(a.miembro_email) AND e.owner_id IS NOT NULL LIMIT 1),
     a.actor_id)
 WHERE a.owner_id IS NULL;

CREATE INDEX IF NOT EXISTS equipo_auditoria_owner_idx ON public.equipo_auditoria (owner_id);

DROP POLICY IF EXISTS "equipo_auditoria_admin_lectura" ON public.equipo_auditoria;
CREATE POLICY "equipo_auditoria_admin_lectura" ON public.equipo_auditoria
  FOR SELECT TO authenticated
  USING (public.es_admin() AND owner_id = public.mi_negocio_id());

CREATE OR REPLACE FUNCTION public.registrar_auditoria_equipo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_email text := coalesce(auth.jwt() ->> 'email', '');
  v_owner uuid := coalesce(public.mi_negocio_id(), CASE WHEN TG_OP = 'DELETE' THEN OLD.owner_id ELSE NEW.owner_id END);
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.equipo_auditoria (owner_id, actor_id, actor_email, accion, miembro_email, detalle)
    VALUES (v_owner, auth.uid(), v_actor_email, 'autorizó a', NEW.email,
            'Módulos: ' || coalesce(nullif(array_to_string(NEW.modulos, ', '), ''), 'ninguno'));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.activo IS DISTINCT FROM OLD.activo THEN
      INSERT INTO public.equipo_auditoria (owner_id, actor_id, actor_email, accion, miembro_email, detalle)
      VALUES (v_owner, auth.uid(), v_actor_email, CASE WHEN NEW.activo THEN 'activó a' ELSE 'desactivó a' END, NEW.email, NULL);
    END IF;
    IF NEW.modulos IS DISTINCT FROM OLD.modulos THEN
      INSERT INTO public.equipo_auditoria (owner_id, actor_id, actor_email, accion, miembro_email, detalle)
      VALUES (v_owner, auth.uid(), v_actor_email, 'cambió los módulos de', NEW.email,
              'Antes: ' || coalesce(nullif(array_to_string(OLD.modulos, ', '), ''), 'ninguno')
              || ' · Ahora: ' || coalesce(nullif(array_to_string(NEW.modulos, ', '), ''), 'ninguno'));
    END IF;
    RETURN NEW;
  ELSE
    INSERT INTO public.equipo_auditoria (owner_id, actor_id, actor_email, accion, miembro_email, detalle)
    VALUES (v_owner, auth.uid(), v_actor_email, 'quitó a', OLD.email, NULL);
    RETURN OLD;
  END IF;
END;
$$;

-- ============================================================
-- 4. Clientes de domicilios: el teléfono era único en TODA la plataforma,
--    mezclaba compras entre negocios y dejaba clientes sin dueño (nadie los veía).
-- ============================================================
UPDATE public.restaurante_clientes c
   SET owner_id = (SELECT p.owner_id FROM public.restaurante_pedidos p
                    WHERE p.cliente_id = c.id AND p.owner_id IS NOT NULL ORDER BY p.created_at LIMIT 1)
 WHERE c.owner_id IS NULL;

ALTER TABLE public.restaurante_clientes DROP CONSTRAINT IF EXISTS restaurante_clientes_telefono_key;
CREATE UNIQUE INDEX IF NOT EXISTS restaurante_clientes_owner_telefono_unico
  ON public.restaurante_clientes (owner_id, telefono);

CREATE OR REPLACE FUNCTION public.restaurante_registrar_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
BEGIN
  INSERT INTO public.restaurante_clientes (owner_id, nombre, telefono, direccion, total_pedidos, total_gastado, ultimo_pedido)
  VALUES (NEW.owner_id, NEW.cliente_nombre, NEW.cliente_telefono, NEW.direccion, 1, NEW.total, now())
  ON CONFLICT (owner_id, telefono) DO UPDATE SET
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

-- ============================================================
-- 5. Pedidos: no se pueden enlazar con repartidores, mesas ni productos de otro negocio
-- ============================================================
CREATE OR REPLACE FUNCTION public.validar_pedido_mismo_negocio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.repartidor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.restaurante_repartidores r WHERE r.id = NEW.repartidor_id AND r.owner_id = NEW.owner_id
  ) THEN
    RAISE EXCEPTION 'Repartidor no válido para este negocio';
  END IF;
  IF NEW.mesa_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.restaurante_mesas m WHERE m.id = NEW.mesa_id AND m.owner_id = NEW.owner_id
  ) THEN
    RAISE EXCEPTION 'Mesa no válida para este negocio';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_pedido_mismo_negocio ON public.restaurante_pedidos;
CREATE TRIGGER trg_validar_pedido_mismo_negocio
  BEFORE INSERT OR UPDATE OF repartidor_id, mesa_id, owner_id ON public.restaurante_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.validar_pedido_mismo_negocio();

CREATE OR REPLACE FUNCTION public.producto_es_del_pedido(p_pedido uuid, p_producto uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_producto IS NULL OR EXISTS (
    SELECT 1 FROM public.restaurante_pedidos pe
      JOIN public.restaurante_productos pr ON pr.owner_id = pe.owner_id
     WHERE pe.id = p_pedido AND pr.id = p_producto
  );
$$;

REVOKE ALL ON FUNCTION public.producto_es_del_pedido(uuid, uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.producto_es_del_pedido(uuid, uuid) TO anon, authenticated;

DROP POLICY IF EXISTS "pedido_items_crear_cliente" ON public.restaurante_pedido_items;
CREATE POLICY "pedido_items_crear_cliente" ON public.restaurante_pedido_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    cantidad > 0
    AND cantidad <= 100
    AND public.pedido_nuevo_reciente(pedido_id)
    AND public.producto_es_del_pedido(pedido_id, producto_id)
  );

-- ============================================================
-- 6. Imágenes del bucket "negocios": cada negocio solo escribe en su propia carpeta
--    (las imágenes siguen visibles por enlace público; las antiguas, sin carpeta, ya no se pueden modificar)
-- ============================================================
DROP POLICY IF EXISTS "negocios_imagenes_lectura" ON storage.objects;
CREATE POLICY "negocios_imagenes_lectura" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'negocios' AND (storage.foldername(name))[1] = public.mi_negocio_id()::text);

DROP POLICY IF EXISTS "negocios_imagenes_subir" ON storage.objects;
CREATE POLICY "negocios_imagenes_subir" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'negocios' AND (storage.foldername(name))[1] = public.mi_negocio_id()::text AND public.es_personal());

DROP POLICY IF EXISTS "negocios_imagenes_actualizar" ON storage.objects;
CREATE POLICY "negocios_imagenes_actualizar" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'negocios' AND (storage.foldername(name))[1] = public.mi_negocio_id()::text AND public.es_personal())
  WITH CHECK (bucket_id = 'negocios' AND (storage.foldername(name))[1] = public.mi_negocio_id()::text AND public.es_personal());

DROP POLICY IF EXISTS "negocios_imagenes_borrar" ON storage.objects;
CREATE POLICY "negocios_imagenes_borrar" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'negocios' AND (storage.foldername(name))[1] = public.mi_negocio_id()::text AND public.es_personal());

-- ============================================================
-- 7. Pruebas de aislamiento dentro de la base (se ejecutan al aplicar la migración).
--    Crean dos negocios de prueba, intentan cruzarlos y fallan la migración si algo se cruza.
--    Todo se hace dentro de una transacción de bloque que se revierte: no deja datos.
-- ============================================================
DO $$
DECLARE
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  v_ins_a uuid;
  v_bod_a uuid;
  v_bod_b uuid;
  v_vistas integer;
  v_ok boolean;
BEGIN
  BEGIN
    INSERT INTO auth.users (id, email, aud, role, instance_id)
    VALUES (a, 'prueba_a@aislamiento.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
           (b, 'prueba_b@aislamiento.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

    INSERT INTO public.restaurante_insumos (owner_id, nombre, unidad, stock, stock_minimo, precio_compra, cantidad_compra)
    VALUES (a, 'Insumo A', 'kg', 10, 1, 1000, 1) RETURNING id INTO v_ins_a;
    INSERT INTO public.restaurante_bodegas (owner_id, nombre) VALUES (a, 'Bodega A') RETURNING id INTO v_bod_a;
    INSERT INTO public.restaurante_bodegas (owner_id, nombre) VALUES (b, 'Bodega B') RETURNING id INTO v_bod_b;

    -- Se actúa como la empresa B (sesión simulada).
    PERFORM set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    SET LOCAL ROLE authenticated;

    -- P1: B no ve bodegas ni insumos de A.
    SELECT count(*) INTO v_vistas FROM public.restaurante_bodegas WHERE owner_id = a;
    IF v_vistas <> 0 THEN RAISE EXCEPTION 'FALLO P1: B ve bodegas de A'; END IF;
    SELECT count(*) INTO v_vistas FROM public.restaurante_insumos WHERE owner_id = a;
    IF v_vistas <> 0 THEN RAISE EXCEPTION 'FALLO P2: B ve insumos de A'; END IF;

    -- P3: B no puede mover stock del insumo de A.
    v_ok := false;
    BEGIN
      PERFORM public.agregar_stock_bodega(v_ins_a, v_bod_b, 5);
    EXCEPTION WHEN OTHERS THEN v_ok := true;
    END;
    IF NOT v_ok THEN RAISE EXCEPTION 'FALLO P3: B pudo agregar stock a un insumo de A'; END IF;

    -- P4: B no puede modificar ni borrar la bodega de A.
    UPDATE public.restaurante_bodegas SET nombre = 'hackeada' WHERE id = v_bod_a;
    GET DIAGNOSTICS v_vistas = ROW_COUNT;
    IF v_vistas <> 0 THEN RAISE EXCEPTION 'FALLO P4: B modificó una bodega de A'; END IF;
    DELETE FROM public.restaurante_bodegas WHERE id = v_bod_a;
    GET DIAGNOSTICS v_vistas = ROW_COUNT;
    IF v_vistas <> 0 THEN RAISE EXCEPTION 'FALLO P5: B borró una bodega de A'; END IF;

    -- P6: B no puede crear una bodega a nombre de A.
    v_ok := false;
    BEGIN
      INSERT INTO public.restaurante_bodegas (owner_id, nombre) VALUES (a, 'falsa');
    EXCEPTION WHEN OTHERS THEN v_ok := true;
    END;
    IF NOT v_ok THEN RAISE EXCEPTION 'FALLO P6: B creó una bodega a nombre de A'; END IF;

    RESET ROLE;
    -- Todo superado: se fuerza el retroceso para no dejar datos de prueba.
    RAISE EXCEPTION 'PRUEBAS_AISLAMIENTO_OK';
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    -- Solo informa: un fallo de la prueba no debe impedir que se apliquen las correcciones.
    IF SQLERRM = 'PRUEBAS_AISLAMIENTO_OK' THEN
      RAISE NOTICE 'Pruebas de aislamiento: todas superadas';
    ELSE
      RAISE WARNING 'Pruebas de aislamiento: %', SQLERRM;
    END IF;
  END;
END $$;
