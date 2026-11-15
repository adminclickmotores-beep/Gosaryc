-- Servicios y citas: el servidor impide registrar dos citas activas para el mismo cliente
-- (mismo teléfono, o mismo nombre si no hay teléfono) el mismo día en el mismo módulo.
-- Aplica solo a los módulos de tipo cita; no toca los registros existentes.

CREATE OR REPLACE FUNCTION public.cita_evitar_duplicada()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  clave_tel text;
  clave_nombre text;
  hay integer;
BEGIN
  IF NEW.modulo NOT IN ('citas_taller', 'pruebas_manejo', 'visitas', 'clases', 'lista_espera', 'agenda') THEN
    RETURN NEW;
  END IF;
  IF NEW.fecha IS NULL OR NEW.anulado OR NEW.estado IN ('cancelada', 'atendida') THEN
    RETURN NEW;
  END IF;

  clave_tel := regexp_replace(coalesce(NEW.telefono, ''), '\D', '', 'g');
  clave_nombre := lower(btrim(coalesce(NEW.contacto, '')));
  IF clave_tel = '' AND clave_nombre = '' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO hay
  FROM public.modulo_registros r
  WHERE r.owner_id IS NOT DISTINCT FROM NEW.owner_id
    AND r.modulo = NEW.modulo
    AND r.fecha = NEW.fecha
    AND r.id <> NEW.id
    AND NOT r.anulado
    AND r.estado NOT IN ('cancelada', 'atendida')
    AND (
      (clave_tel <> '' AND regexp_replace(coalesce(r.telefono, ''), '\D', '', 'g') = clave_tel)
      OR (clave_tel = '' AND clave_nombre <> '' AND lower(btrim(coalesce(r.contacto, ''))) = clave_nombre)
    );

  IF hay > 0 THEN
    RAISE EXCEPTION 'Este cliente ya tiene una cita activa ese mismo día. Edita la existente o cámbiale la fecha.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cita_evitar_duplicada_trg ON public.modulo_registros;
CREATE TRIGGER cita_evitar_duplicada_trg
  BEFORE INSERT OR UPDATE OF fecha, telefono, contacto, estado, anulado, modulo ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.cita_evitar_duplicada();
