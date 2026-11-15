-- Cada negocio (tipo) de una cuenta solo ve lo que creó en ese tipo:
-- lo de restaurante no aparece en panadería, y viceversa. Se aplica en la base de datos,
-- así ninguna pantalla puede mezclar datos de otro tipo de negocio.

-- Normaliza el texto del tipo (clave o texto libre) a una clave estable.
CREATE OR REPLACE FUNCTION public.clave_tipo_negocio(v text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN t IS NULL OR t = '' THEN 'restaurante'
    WHEN t ~ 'panader|pastel|reposter|torta|boller' THEN 'panaderia'
    WHEN t ~ 'catering|banquete' THEN 'catering'
    WHEN t ~ 'comida rapida|comida_rapida|food truck|pizz|hamburg|asadero' THEN 'comida_rapida'
    WHEN t ~ 'cafe|heladeri|bar$' THEN 'cafeteria'
    WHEN t ~ 'restaur|pollo|chuleta|^comida' THEN 'restaurante'
    ELSE t
  END
  FROM (SELECT nullif(trim(translate(lower(v), 'áéíóúñ', 'aeioun')), '') AS t) s;
$$;

-- Tipo de negocio actual de la cuenta que consulta.
CREATE OR REPLACE FUNCTION public.tipo_negocio_actual()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.clave_tipo_negocio(
    (SELECT n.tipo_negocio FROM public.negocio_config n WHERE n.owner_id = public.mi_negocio_id() LIMIT 1)
  );
$$;

REVOKE ALL ON FUNCTION public.tipo_negocio_actual() FROM public;
GRANT EXECUTE ON FUNCTION public.tipo_negocio_actual() TO authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'restaurante_categorias', 'restaurante_productos', 'restaurante_insumos', 'restaurante_recetas',
    'restaurante_mesas', 'restaurante_pedidos', 'restaurante_clientes', 'restaurante_repartidores',
    'restaurante_movimientos_caja', 'restaurante_bodegas'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tipo_negocio text', t);
    -- Lo que ya existía se creó como restaurante.
    EXECUTE format('UPDATE public.%I SET tipo_negocio = ''restaurante'' WHERE tipo_negocio IS NULL', t);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_tipo_trg', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.asignar_tipo_negocio_menu()', t || '_tipo_trg', t);
    -- Política restrictiva: se suma a las existentes y solo deja pasar filas del tipo actual.
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_tipo_actual', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual()) WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())',
      t || '_solo_tipo_actual', t
    );
  END LOOP;
END $$;
