-- Hallazgo: "Anyone with an expired account can still see customer records".
-- 1. Corrige el disparador de 20271130240000: la columna real es vence_en (timestamptz), no vence_el.
-- 2. Aplica la capa RESTRICTIVA de licencia vigente (solo SELECT, solo rol authenticated) a TODA
--    tabla del esquema public con owner_id cuyo nombre indique clientes, pacientes, socios,
--    huéspedes, estudiantes, contactos, leads, historias, etc. (detección por nombre, para no
--    depender de listas fijas), más los registros genéricos de módulos.
--    Exentos por la función: Superadmin, las 2 cuentas demo y negocios sin suscripción.
--    El rol anon (menú QR, certificados SST) no se toca. No se borra nada.

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
    -- Alta automática de la prueba: siempre con valores por defecto.
    NEW.plan := 'prueba';
    NEW.estado := 'activo';
    NEW.vence_en := now() + interval '14 days';
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'licencias' THEN
    IF to_jsonb(NEW) - 'ultima_verificacion' = to_jsonb(OLD) - 'ultima_verificacion' THEN
      RETURN NEW;
    END IF;
  END IF;

  RAISE EXCEPTION 'Solo el Superadmin puede modificar licencias y planes';
END;
$$;

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.table_name AS t
      FROM information_schema.columns c
      JOIN information_schema.tables tb
        ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
     WHERE c.table_schema = 'public'
       AND c.column_name = 'owner_id'
       AND (
         c.table_name ~* '(cliente|paciente|socio|huesped|estudiante|propietari|inquilin|tercero|prospecto|lead|contacto|historia|vacuna|trabajador|matricula|alumno|referid|proveedor|solicitud|cita|agenda|reserva)'
         OR c.table_name IN ('modulo_registros', 'sst_evaluaciones', 'sst_atel', 'sst_ausentismo', 'cl_historias', 'bel_fichas')
       )
       AND c.table_name NOT IN ('suscripciones_negocio', 'licencias', 'negocio_config')
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.t);
      EXECUTE format('DROP POLICY IF EXISTS licencia_vigente_leer ON public.%I', r.t);
      EXECUTE format(
        'CREATE POLICY licencia_vigente_leer ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING ((SELECT public.licencia_negocio_vigente()))',
        r.t);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Licencia en %: %', r.t, SQLERRM;
    END;
  END LOOP;
END $$;
