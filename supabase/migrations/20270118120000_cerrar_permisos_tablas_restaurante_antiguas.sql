-- Cierre final de las tablas antiguas de restaurante.
-- Las políticas abiertas originales (USING true) ya fueron reemplazadas por reglas por negocio;
-- aquí se quitan los permisos sobrantes de nivel tabla (visitantes sin sesión y operaciones peligrosas)
-- para que nada dependa solo de una política. No borra ni modifica datos.

DO $$
DECLARE
  t text;
  internas text[] := ARRAY[
    'restaurante_clientes', 'restaurante_repartidores', 'restaurante_mesas',
    'restaurante_movimientos_caja', 'restaurante_insumos', 'restaurante_recetas',
    'restaurante_receta_ingredientes', 'restaurante_bodegas', 'restaurante_stock_bodega',
    'modulo_registros', 'personal_autorizado', 'equipo_negocio', 'equipo_auditoria'
  ];
  publicas text[] := ARRAY[
    'restaurante_categorias', 'restaurante_productos',
    'restaurante_pedidos', 'restaurante_pedido_items', 'negocio_config'
  ];
BEGIN
  -- Tablas internas: los visitantes sin sesión no tienen ningún permiso.
  FOREACH t IN ARRAY internas LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
      EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM authenticated', t);
    END IF;
  END LOOP;

  -- Tablas con parte pública (menú, pedidos del cliente): el visitante solo conserva lo mínimo.
  FOREACH t IN ARRAY publicas LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
      EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM authenticated', t);
    END IF;
  END LOOP;

  -- Lo que el visitante sí necesita: ver el menú y datos públicos del negocio, y enviar un pedido nuevo.
  GRANT SELECT ON public.restaurante_categorias, public.restaurante_productos, public.negocio_config TO anon;
  GRANT INSERT ON public.restaurante_pedidos, public.restaurante_pedido_items TO anon;
END $$;
