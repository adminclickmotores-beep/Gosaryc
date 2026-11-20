-- Cierre: ventas con licencia vencida, códigos de licencia de escritorio de alta entropía y verificación sin adivinar.
-- Solo CREATE/ALTER; no borra datos. La lectura y exportación no se tocan.

-- 1. Códigos nuevos de licencia: 128 bits aleatorios (los códigos ya entregados siguen funcionando).
ALTER TABLE public.licencias
  ALTER COLUMN codigo SET DEFAULT (
    'GOS-' || upper(replace(gen_random_uuid()::text, '-', ''))
  );

-- 2. Verificación sin sesión: solo acepta códigos con forma válida (evita sondeos de códigos cortos inventados).
CREATE OR REPLACE FUNCTION public.codigo_licencia_con_forma(p_codigo text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT upper(trim(coalesce(p_codigo, ''))) ~ '^GOS-([0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}|[0-9A-F]{32})$';
$$;

CREATE OR REPLACE FUNCTION public.proteger_codigo_licencia_nuevo()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.codigo IS NULL OR NOT public.codigo_licencia_con_forma(NEW.codigo) THEN
    NEW.codigo := 'GOS-' || upper(replace(gen_random_uuid()::text, '-', ''));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS zz_codigo_licencia_nuevo ON public.licencias;
CREATE TRIGGER zz_codigo_licencia_nuevo BEFORE INSERT ON public.licencias
  FOR EACH ROW EXECUTE FUNCTION public.proteger_codigo_licencia_nuevo();

-- 3. Con licencia vencida o suspendida tampoco se registran ventas ni facturas (el cliente autenticado; el menú público anónimo no cambia).
DO $$
DECLARE
  t text;
  tablas constant text[] := ARRAY[
    'restaurante_pedidos', 'restaurante_pedido_items', 'ventas', 'facturas', 'ventas_vehiculos',
    'ventas_veh', 'vitrina_ventas', 'fac_emitidas', 'fac_items', 'com_ventas', 'com_venta_items',
    'modulo_registros', 'cl_cobros', 'ofi_cobros', 'tal_ordenes'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS licencia_vigente_insertar ON public.%I', t);
      EXECUTE format('CREATE POLICY licencia_vigente_insertar ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT public.licencia_negocio_vigente()))', t);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Licencia ventas en %: %', t, SQLERRM;
    END;
  END LOOP;
END $$;
