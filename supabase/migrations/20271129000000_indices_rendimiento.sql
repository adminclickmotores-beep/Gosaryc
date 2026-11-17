-- Rendimiento: índices compuestos por negocio (owner_id) + fecha/estado/búsqueda.
-- Solo CREATE INDEX IF NOT EXISTS. Cada índice se crea únicamente si la tabla y
-- TODAS sus columnas existen, así la migración nunca falla por una columna ausente.

CREATE OR REPLACE FUNCTION pg_temp.crear_indice_seguro(
  p_nombre text,
  p_tabla text,
  p_columnas text[],
  p_definicion text
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_faltan int;
BEGIN
  SELECT count(*) INTO v_faltan
  FROM unnest(p_columnas) AS c(col)
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns ic
    WHERE ic.table_schema = 'public'
      AND ic.table_name = p_tabla
      AND ic.column_name = c.col
  );
  IF v_faltan = 0 THEN
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I %s', p_nombre, p_tabla, p_definicion);
  END IF;
END;
$$;

-- Ventas / pedidos
SELECT pg_temp.crear_indice_seguro('idx_ventas_dueno_fecha', 'restaurante_pedidos', ARRAY['owner_id','created_at'], '(owner_id, created_at DESC)');
SELECT pg_temp.crear_indice_seguro('idx_ventas_dueno_estado', 'restaurante_pedidos', ARRAY['owner_id','estado'], '(owner_id, estado)');

-- Movimientos de caja
SELECT pg_temp.crear_indice_seguro('idx_movcaja_dueno_fecha', 'restaurante_movimientos_caja', ARRAY['owner_id','created_at'], '(owner_id, created_at DESC)');
SELECT pg_temp.crear_indice_seguro('idx_movcaja_dueno_tipo', 'restaurante_movimientos_caja', ARRAY['owner_id','tipo'], '(owner_id, tipo)');

-- Contabilidad
SELECT pg_temp.crear_indice_seguro('idx_asientos_dueno_fecha', 'asientos_contables', ARRAY['owner_id','fecha'], '(owner_id, fecha DESC)');
SELECT pg_temp.crear_indice_seguro('idx_asientos_origen', 'asientos_contables', ARRAY['owner_id','origen_tipo','origen_id'], '(owner_id, origen_tipo, origen_id)');
SELECT pg_temp.crear_indice_seguro('idx_cuentas_dueno_codigo', 'cuentas_contables', ARRAY['owner_id','codigo'], '(owner_id, codigo)');

-- Clientes
SELECT pg_temp.crear_indice_seguro('idx_clientes_dueno_nombre', 'restaurante_clientes', ARRAY['owner_id','nombre'], '(owner_id, nombre)');
SELECT pg_temp.crear_indice_seguro('idx_clientes_dueno_doc', 'restaurante_clientes', ARRAY['owner_id','documento'], '(owner_id, documento)');

-- Productos
SELECT pg_temp.crear_indice_seguro('idx_productos_dueno_nombre', 'restaurante_productos', ARRAY['owner_id','nombre'], '(owner_id, nombre)');
SELECT pg_temp.crear_indice_seguro('idx_productos_dueno_categoria', 'restaurante_productos', ARRAY['owner_id','categoria_id'], '(owner_id, categoria_id)');

-- Facturas
SELECT pg_temp.crear_indice_seguro('idx_fac_dueno_fecha', 'fac_emitidas', ARRAY['owner_id','created_at'], '(owner_id, created_at DESC)');
SELECT pg_temp.crear_indice_seguro('idx_fac_dueno_estado', 'fac_emitidas', ARRAY['owner_id','dian_estado'], '(owner_id, dian_estado)');

-- Obligaciones tributarias
SELECT pg_temp.crear_indice_seguro('idx_oblig_dueno_vence', 'obligaciones_tributarias_negocio', ARRAY['owner_id','fecha_vencimiento'], '(owner_id, fecha_vencimiento)');
