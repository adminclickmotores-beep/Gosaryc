-- Cierre maestro: pie de factura configurable + licencias anuales solo Superadmin.
-- Sin DROP/TRUNCATE/DELETE: solo agrega columna, función y trigger.

ALTER TABLE public.negocio_config ADD COLUMN IF NOT EXISTS pie_factura text;

-- Solo el Superadmin puede crear o activar licencias de 1 año (tipo 'anual').
-- La pantalla de licencias ya es solo Superadmin; este trigger lo blinda en la base.
CREATE OR REPLACE FUNCTION public.solo_superadmin_anual()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tipo = 'anual' AND NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'Solo el Superadmin puede crear o activar licencias de 1 año.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS licencias_anual_superadmin_trg ON public.licencias;
CREATE TRIGGER licencias_anual_superadmin_trg
  BEFORE INSERT OR UPDATE OF tipo ON public.licencias
  FOR EACH ROW EXECUTE FUNCTION public.solo_superadmin_anual();
