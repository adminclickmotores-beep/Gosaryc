-- Restricciones de datos en la base (se aplican solo a registros nuevos o editados;
-- no tocan ni borran lo ya guardado):
--  * precios nunca negativos ni absurdamente grandes
--  * textos de nombre/título/detalle/contacto/teléfono con largo máximo y sin "<" ni ">"
--  * correos con formato válido
DO $$
DECLARE
  r RECORD;
  nombre_check TEXT;
BEGIN
  -- 1. Precios >= 0
  FOR r IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public'
      AND c.data_type IN ('numeric', 'integer', 'bigint', 'double precision', 'real')
      AND c.column_name IN ('precio', 'precio_unitario', 'precio_extra', 'precio_compra', 'precio_detal', 'precio_venta')
  LOOP
    nombre_check := left('chk_valida_' || r.table_name || '_' || r.column_name, 63);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = nombre_check) THEN
      BEGIN
        EXECUTE format(
          'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I IS NULL OR (%I >= 0 AND %I <= 999999999999)) NOT VALID',
          r.table_name, nombre_check, r.column_name, r.column_name, r.column_name);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Se omite % (%): %', r.table_name, r.column_name, SQLERRM;
      END;
    END IF;
  END LOOP;

  -- 2. Textos sin marcado y con largo máximo
  FOR r IN
    SELECT c.table_name, c.column_name,
           CASE c.column_name
             WHEN 'detalle' THEN 4000
             WHEN 'telefono' THEN 20
             ELSE 300
           END AS maximo
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public'
      AND c.data_type IN ('text', 'character varying')
      AND c.column_name IN ('titulo', 'detalle', 'contacto', 'telefono')
      AND c.table_name ~ '(registros|^fiados$|^modulo_registros$)'
  LOOP
    nombre_check := left('chk_texto_' || r.table_name || '_' || r.column_name, 63);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = nombre_check) THEN
      BEGIN
        EXECUTE format(
          'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I IS NULL OR (char_length(%I) <= %s AND %I !~ ''[<>]'')) NOT VALID',
          r.table_name, nombre_check, r.column_name, r.column_name, r.maximo, r.column_name);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Se omite % (%): %', r.table_name, r.column_name, SQLERRM;
      END;
    END IF;
  END LOOP;

  -- 3. Correos con formato válido
  FOR r IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
    WHERE c.table_schema = 'public'
      AND c.data_type IN ('text', 'character varying')
      AND c.column_name IN ('correo', 'email')
      AND c.table_name IN ('restaurante_clientes', 'restaurante_pedidos', 'nomina_empleados', 'campaign_requests')
  LOOP
    nombre_check := left('chk_correo_' || r.table_name || '_' || r.column_name, 63);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = nombre_check) THEN
      BEGIN
        EXECUTE format(
          'ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%I IS NULL OR %I = '''' OR (char_length(%I) <= 254 AND %I ~ ''^[^@\s]+@[^@\s]+\.[^@\s]+$'')) NOT VALID',
          r.table_name, nombre_check, r.column_name, r.column_name, r.column_name, r.column_name);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Se omite % (%): %', r.table_name, r.column_name, SQLERRM;
      END;
    END IF;
  END LOOP;
END;
$$;
