-- Corrección de 20271130230000: el disparador de protección devolvía NEW también al borrar
-- (cancelaba el DELETE del Superadmin) y bloqueaba la creación automática de la suscripción
-- de un negocio nuevo y la verificación de licencias hecha por una sesión iniciada.
-- Ahora: cualquiera puede crear su propia fila de suscripción de prueba (la función de alta
-- ya la crea con valores por defecto) y verificar licencias; cambiar plan, estado, vencimiento,
-- tipo o borrar solo lo hace el Superadmin.
CREATE OR REPLACE FUNCTION public.proteger_campos_licencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.es_superadmin() THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' AND TG_TABLE_NAME = 'suscripciones_negocio' THEN
    -- Alta automática de la prueba: siempre con los valores por defecto (nadie se da otro plan).
    NEW.plan := 'prueba';
    NEW.estado := 'activo';
    NEW.vence_el := current_date + 14;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'licencias' THEN
    -- verificar_licencia solo marca la última verificación.
    IF to_jsonb(NEW) - 'ultima_verificacion' = to_jsonb(OLD) - 'ultima_verificacion' THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'Solo el Superadmin puede modificar licencias y planes';
END;
$$;
