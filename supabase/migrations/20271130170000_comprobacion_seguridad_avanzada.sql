-- Comprobación de seguridad avanzada (18-nov-2026).
-- 1. Datos privados: los visitantes sin sesión podían leer TODAS las columnas de
--    negocio_config de cualquier negocio (NIT, dirección fiscal, resolución DIAN,
--    teléfono y correo del contador, WhatsApp interno de cocina, ICA...). El menú QR
--    solo necesita los datos públicos (nombre, horarios, contacto de pedidos, logo).
--    Ahora el visitante solo puede leer esas columnas y solo de negocios con dueño.
-- 2. Validación de datos introducidos en pedidos públicos (menú QR / enlace / agente):
--    un visitante podía crear un pedido marcado como "pagado" (genera ingreso contable
--    falso), con canal o método de pago arbitrarios, fecha alterada, repartidor
--    asignado, correo/barrio sin límite, y líneas con precio inventado (0 o menor que
--    el de la carta). Se validan en la base con triggers que solo actúan cuando quien
--    crea el pedido NO es el personal del propio negocio (POS, demos y siembras
--    internas quedan igual).
-- Sin DROP de tablas ni borrado de datos.

-- ============================================================
-- 1. negocio_config: lectura pública solo de columnas públicas
-- ============================================================
DROP POLICY IF EXISTS "negocio_lectura_publica" ON public.negocio_config;
CREATE POLICY "negocio_lectura_publica" ON public.negocio_config
  FOR SELECT TO anon
  USING (owner_id IS NOT NULL AND nombre IS NOT NULL AND char_length(nombre) > 0);

REVOKE SELECT ON public.negocio_config FROM anon;
GRANT SELECT (
  id, owner_id, nombre, tipo_negocio, eslogan, descripcion, horarios, ciudad, cobertura,
  aviso_entrega, telefono_pedidos, instagram, sitio_web, moneda, logo_url, portada_url,
  color_principal, iva_porcentaje, created_at, updated_at
) ON public.negocio_config TO anon;

-- ============================================================
-- 2. Pedidos públicos: valores forzados y validados
-- ============================================================
CREATE OR REPLACE FUNCTION public.es_pedido_interno(p_owner uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Procesos del servidor (service role) o funciones internas sin JWT.
    coalesce(auth.role(), '') NOT IN ('anon', 'authenticated')
    -- Personal del propio negocio (POS, mesas, demos).
    OR (auth.uid() IS NOT NULL AND p_owner IS NOT NULL
        AND p_owner = public.mi_negocio_id() AND public.es_personal());
$$;
REVOKE ALL ON FUNCTION public.es_pedido_interno(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.es_pedido_interno(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.validar_pedido_publico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.es_pedido_interno(NEW.owner_id) THEN
    RETURN NEW;
  END IF;

  -- Lo que un visitante nunca decide.
  NEW.estado := 'nuevo';
  NEW.pago_estado := 'pendiente';
  NEW.repartidor_id := NULL;
  NEW.created_at := now();

  IF NEW.canal IS NULL OR NEW.canal NOT IN ('web', 'qr', 'menu', 'agente', 'whatsapp') THEN
    NEW.canal := 'web';
  END IF;
  NEW.metodo_pago := lower(trim(coalesce(NEW.metodo_pago, 'efectivo')));
  IF NEW.metodo_pago !~ '^[a-z_]{1,30}$' THEN
    NEW.metodo_pago := 'efectivo';
  END IF;

  IF NEW.total IS NULL OR NEW.total < 0 OR NEW.total > 100000000 THEN
    RAISE EXCEPTION 'Total del pedido no válido.';
  END IF;
  IF NEW.barrio IS NOT NULL AND char_length(NEW.barrio) > 120 THEN
    RAISE EXCEPTION 'El barrio es demasiado largo.';
  END IF;
  IF NEW.cliente_email IS NOT NULL AND (
       char_length(NEW.cliente_email) > 254
       OR NEW.cliente_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$') THEN
    RAISE EXCEPTION 'Correo no válido.';
  END IF;
  IF char_length(regexp_replace(coalesce(NEW.cliente_telefono, ''), '[^0-9]', '', 'g')) NOT BETWEEN 7 AND 15 THEN
    RAISE EXCEPTION 'Teléfono no válido.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_a_validar_pedido_publico ON public.restaurante_pedidos;
CREATE TRIGGER trg_a_validar_pedido_publico
  BEFORE INSERT ON public.restaurante_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.validar_pedido_publico();

CREATE OR REPLACE FUNCTION public.validar_item_pedido_publico()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_precio numeric;
  v_extra numeric;
BEGIN
  SELECT owner_id INTO v_owner FROM public.restaurante_pedidos WHERE id = NEW.pedido_id;
  IF public.es_pedido_interno(v_owner) THEN
    RETURN NEW;
  END IF;

  IF NEW.producto_id IS NULL THEN
    RAISE EXCEPTION 'Producto no válido.';
  END IF;
  SELECT pr.precio INTO v_precio
    FROM public.restaurante_productos pr
   WHERE pr.id = NEW.producto_id AND pr.owner_id = v_owner AND pr.activo = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Producto no disponible.';
  END IF;

  -- El precio de la línea no puede ser menor que el de la carta ni mayor que la carta + todos sus complementos.
  SELECT coalesce(sum(o.precio_extra), 0) INTO v_extra
    FROM public.restaurante_producto_opciones o
   WHERE o.producto_id = NEW.producto_id AND o.activa = true;
  IF NEW.precio_unitario < v_precio OR NEW.precio_unitario > v_precio + v_extra THEN
    RAISE EXCEPTION 'Precio de la línea no válido.';
  END IF;

  IF NEW.nombre IS NULL OR char_length(trim(NEW.nombre)) = 0 OR char_length(NEW.nombre) > 200 THEN
    RAISE EXCEPTION 'Nombre de la línea no válido.';
  END IF;
  IF NEW.opciones IS NOT NULL AND (jsonb_typeof(NEW.opciones) <> 'array' OR pg_column_size(NEW.opciones) > 8000) THEN
    RAISE EXCEPTION 'Opciones no válidas.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_a_validar_item_pedido_publico ON public.restaurante_pedido_items;
CREATE TRIGGER trg_a_validar_item_pedido_publico
  BEFORE INSERT ON public.restaurante_pedido_items
  FOR EACH ROW EXECUTE FUNCTION public.validar_item_pedido_publico();

REVOKE ALL ON FUNCTION public.validar_pedido_publico() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.validar_item_pedido_publico() FROM public, anon, authenticated;
