-- Actualiza el periodo de prueba gratuita inicial de 14 días a 30 días
-- para todos los negocios nuevos, sin modificar los permisos exclusivos del Superadministrador.

ALTER TABLE public.suscripciones_negocio
  ALTER COLUMN vence_el SET DEFAULT (current_date + 30);

ALTER TABLE public.suscripciones_negocio
  ALTER COLUMN vence_en SET DEFAULT (now() + interval '30 days');

ALTER TABLE public.licencias
  ALTER COLUMN vence_el SET DEFAULT (current_date + 30);

-- Garantiza 30 días completos de prueba en cualquier inserción inicial de plan 'prueba'
-- (incluso si algún trigger previo de registro calculaba +14 días).
CREATE OR REPLACE FUNCTION public.asegurar_prueba_30_dias()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.plan, 'prueba') = 'prueba' THEN
    IF NEW.vence_el IS NULL OR NEW.vence_el < (current_date + 30) THEN
      NEW.vence_el := current_date + 30;
    END IF;
    IF NEW.vence_en IS NULL OR NEW.vence_en < (now() + interval '29 days') THEN
      NEW.vence_en := now() + interval '30 days';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_suscripciones_prueba_30_dias ON public.suscripciones_negocio;

CREATE TRIGGER trg_suscripciones_prueba_30_dias
  BEFORE INSERT ON public.suscripciones_negocio
  FOR EACH ROW
  EXECUTE FUNCTION public.asegurar_prueba_30_dias();
