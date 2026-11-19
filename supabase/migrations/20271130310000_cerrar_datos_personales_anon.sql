-- ============================================================
-- DATOS PERSONALES: NADIE SIN SESIÓN PUEDE CONSULTARLOS
--
-- Recorre todas las tablas del esquema public que tengan columnas
-- de datos personales (teléfono, correo, dirección, cédula/documento,
-- NIT, identificación) y le quita al rol anon cualquier lectura,
-- edición o borrado.
--
-- Excepciones (necesarias para las páginas públicas):
--   * negocio_config y los catálogos (categorías, productos, opciones,
--     com_productos): lo público sigue limitado a datos comerciales
--     (negocio_config ya expone solo columnas públicas).
--   * restaurante_pedidos, restaurante_pedido_items y campaign_requests
--     conservan SOLO el INSERT para anon (pedidos y solicitudes del
--     público), sin poder leerlos después.
-- No borra datos ni políticas.
-- ============================================================

DO $$
DECLARE
  t RECORD;
  c RECORD;
  solo_insertar BOOLEAN;
BEGIN
  FOR t IN
    SELECT cl.oid, cl.relname AS nombre
    FROM pg_class cl
    JOIN pg_namespace n ON n.oid = cl.relnamespace
    WHERE n.nspname = 'public'
      AND cl.relkind IN ('r', 'p')
      AND cl.relname NOT IN (
        'negocio_config',
        'restaurante_categorias',
        'restaurante_productos',
        'restaurante_producto_opciones',
        'com_productos'
      )
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d WHERE d.objid = cl.oid AND d.deptype = 'e'
      )
      AND EXISTS (
        SELECT 1 FROM pg_attribute a
        WHERE a.attrelid = cl.oid AND a.attnum > 0 AND NOT a.attisdropped
          AND a.attname ~* '(telefono|celular|whatsapp|correo|email|direccion|cedula|documento|identificacion|^nit$|_nit$)'
      )
  LOOP
    solo_insertar := t.nombre IN (
      'restaurante_pedidos', 'restaurante_pedido_items', 'campaign_requests'
    );

    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.nombre);

    -- Privilegios de tabla
    EXECUTE format('REVOKE SELECT, UPDATE, DELETE ON public.%I FROM anon', t.nombre);
    IF NOT solo_insertar THEN
      EXECUTE format('REVOKE INSERT ON public.%I FROM anon', t.nombre);
    END IF;

    -- Privilegios por columna (no los cubre el REVOKE de tabla)
    FOR c IN
      SELECT a.attname
      FROM pg_attribute a
      WHERE a.attrelid = t.oid AND a.attnum > 0 AND NOT a.attisdropped
    LOOP
      EXECUTE format('REVOKE SELECT (%I), UPDATE (%I) ON public.%I FROM anon', c.attname, c.attname, t.nombre);
    END LOOP;

    -- Política restrictiva: anon nunca lee, edita ni borra
    EXECUTE format('DROP POLICY IF EXISTS anon_sin_lectura_datos_personales ON public.%I', t.nombre);
    EXECUTE format(
      'CREATE POLICY anon_sin_lectura_datos_personales ON public.%I AS RESTRICTIVE FOR SELECT TO anon USING (false)',
      t.nombre
    );
    EXECUTE format('DROP POLICY IF EXISTS anon_sin_edicion_datos_personales ON public.%I', t.nombre);
    EXECUTE format(
      'CREATE POLICY anon_sin_edicion_datos_personales ON public.%I AS RESTRICTIVE FOR UPDATE TO anon USING (false) WITH CHECK (false)',
      t.nombre
    );
    EXECUTE format('DROP POLICY IF EXISTS anon_sin_borrado_datos_personales ON public.%I', t.nombre);
    EXECUTE format(
      'CREATE POLICY anon_sin_borrado_datos_personales ON public.%I AS RESTRICTIVE FOR DELETE TO anon USING (false)',
      t.nombre
    );
    IF NOT solo_insertar THEN
      EXECUTE format('DROP POLICY IF EXISTS anon_sin_alta_datos_personales ON public.%I', t.nombre);
      EXECUTE format(
        'CREATE POLICY anon_sin_alta_datos_personales ON public.%I AS RESTRICTIVE FOR INSERT TO anon WITH CHECK (false)',
        t.nombre
      );
    END IF;
  END LOOP;
END;
$$;

-- negocio_config: el público solo ve columnas comerciales (sin NIT,
-- contador, WhatsApp de cocina, resolución, etc.). Se reafirma.
REVOKE SELECT ON public.negocio_config FROM anon;
GRANT SELECT (
  id, owner_id, nombre, tipo_negocio, eslogan, descripcion, horarios,
  ciudad, cobertura, aviso_entrega, telefono_pedidos, instagram,
  sitio_web, moneda, logo_url, portada_url, color_principal,
  iva_porcentaje, created_at, updated_at
) ON public.negocio_config TO anon;
