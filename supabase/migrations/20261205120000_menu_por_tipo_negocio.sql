-- Cada producto y categoría queda ligado al tipo de negocio con el que se creó,
-- para que la carta de un restaurante no aparezca en una panadería (u otro tipo) de la misma cuenta.
ALTER TABLE public.restaurante_categorias ADD COLUMN IF NOT EXISTS tipo_negocio text;
ALTER TABLE public.restaurante_productos ADD COLUMN IF NOT EXISTS tipo_negocio text;

-- Lo que ya existe se creó como restaurante.
UPDATE public.restaurante_categorias SET tipo_negocio = 'restaurante' WHERE tipo_negocio IS NULL;
UPDATE public.restaurante_productos SET tipo_negocio = 'restaurante' WHERE tipo_negocio IS NULL;

-- Lo nuevo toma el tipo de negocio actual de la cuenta.
CREATE OR REPLACE FUNCTION public.asignar_tipo_negocio_menu()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo_negocio IS NULL THEN
    SELECT n.tipo_negocio INTO NEW.tipo_negocio
    FROM public.negocio_config n
    WHERE n.owner_id = NEW.owner_id
    LIMIT 1;
    IF NEW.tipo_negocio IS NULL THEN
      NEW.tipo_negocio := 'restaurante';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS menu_categorias_tipo ON public.restaurante_categorias;
CREATE TRIGGER menu_categorias_tipo BEFORE INSERT ON public.restaurante_categorias
  FOR EACH ROW EXECUTE FUNCTION public.asignar_tipo_negocio_menu();

DROP TRIGGER IF EXISTS menu_productos_tipo ON public.restaurante_productos;
CREATE TRIGGER menu_productos_tipo BEFORE INSERT ON public.restaurante_productos
  FOR EACH ROW EXECUTE FUNCTION public.asignar_tipo_negocio_menu();
