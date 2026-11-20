-- Cierre: suscripciones, comisiones, acceso de soporte y cruce de clientes. Solo CREATE/ALTER/REVOKE.

-- 1. Soporte de plataforma: solo el Superadmin con correo verificado (ninguna cuenta se auto-asigna soporte).
CREATE OR REPLACE FUNCTION public.es_soporte()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT public.es_superadmin();
$$;
REVOKE ALL ON FUNCTION public.es_soporte() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.es_soporte() TO authenticated;

-- 2. Suscripciones: el navegador no escribe; nadie activa planes salvo Superadmin o clave válida (funciones del servidor).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['suscripciones_negocio', 'licencias', 'claves_activacion', 'solicitudes_licencia'] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON public.%I FROM authenticated, anon', t);
      EXECUTE format('DROP POLICY IF EXISTS sin_escritura_cliente_ins ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS sin_escritura_cliente_upd ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS sin_escritura_cliente_del ON public.%I', t);
      EXECUTE format('CREATE POLICY sin_escritura_cliente_ins ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (public.es_superadmin())', t);
      EXECUTE format('CREATE POLICY sin_escritura_cliente_upd ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (public.es_superadmin()) WITH CHECK (public.es_superadmin())', t);
      EXECUTE format('CREATE POLICY sin_escritura_cliente_del ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (public.es_superadmin())', t);
    END IF;
  END LOOP;
END $$;

-- 3. Comisiones: el personal no puede definir ni subir NINGUNA columna de comisión (en cualquier tabla del negocio),
--    ni al crear ni al editar. Solo dueño o Superadmin; las funciones de cobro del sistema no cambian.
CREATE OR REPLACE FUNCTION public.bloquear_comision_personal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  k text;
  nuevo jsonb := to_jsonb(NEW);
  viejo jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  v_dueno text := to_jsonb(NEW) ->> 'owner_id';
BEGIN
  IF auth.uid() IS NULL OR public.es_superadmin() THEN
    RETURN NEW;
  END IF;
  IF v_dueno IS NOT NULL AND v_dueno = auth.uid()::text THEN
    RETURN NEW;
  END IF;
  IF coalesce(current_setting('gosaryc.licencia_rpc', true), '') = 'si' THEN
    RETURN NEW;
  END IF;
  FOR k IN SELECT jsonb_object_keys(nuevo) LOOP
    IF k ~* 'comision' THEN
      IF TG_OP = 'UPDATE' THEN
        IF (nuevo -> k) IS DISTINCT FROM (viejo -> k) THEN
          RAISE EXCEPTION 'Solo el dueño del negocio puede cambiar comisiones.' USING ERRCODE = '42501';
        END IF;
      ELSIF coalesce(nullif(btrim(nuevo ->> k), ''), '0') ~ '^-?[0-9]+(\.[0-9]+)?$'
            AND (nuevo ->> k)::numeric <> 0
            AND coalesce(current_setting('gosaryc.comision_sistema', true), '') <> 'si' THEN
        RAISE EXCEPTION 'Solo el dueño del negocio puede definir comisiones.' USING ERRCODE = '42501';
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.bloquear_comision_personal() FROM public, anon, authenticated;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT DISTINCT c.relname AS tabla
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
      JOIN pg_attribute a ON a.attrelid = c.oid AND NOT a.attisdropped AND a.attname ~* 'comision'
     WHERE c.relkind = 'r'
       AND EXISTS (SELECT 1 FROM pg_attribute x WHERE x.attrelid = c.oid AND x.attname = 'owner_id' AND NOT x.attisdropped)
  LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS zz_bloquear_comision ON public.%I', r.tabla);
      EXECUTE format('CREATE TRIGGER zz_bloquear_comision BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bloquear_comision_personal()', r.tabla);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Comisión en %: %', r.tabla, SQLERRM;
    END;
  END LOOP;
END $$;

-- 4. Cruce de clientes: refuerza con el disparador de enlaces (si ya existe) en toda tabla con columnas de persona.
DO $$
DECLARE r record;
BEGIN
  IF to_regprocedure('public.validar_enlace_persona_mismo_negocio()') IS NULL THEN
    RETURN;
  END IF;
  FOR r IN
    SELECT c.relname AS tabla, a.attname AS col
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
      JOIN pg_attribute a ON a.attrelid = c.oid AND NOT a.attisdropped
     WHERE c.relkind = 'r'
       AND a.attname IN ('cliente_id', 'paciente_id', 'contacto_id', 'socio_id', 'lead_id')
       AND c.relname NOT IN ('clientes', 'restaurante_clientes', 'pacientes', 'contactos', 'socios', 'crm_leads', 'leads')
       AND EXISTS (SELECT 1 FROM pg_attribute x WHERE x.attrelid = c.oid AND x.attname = 'owner_id' AND NOT x.attisdropped)
  LOOP
    BEGIN
      EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', left('zz_enlace_persona_' || r.col, 63), r.tabla);
      EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validar_enlace_persona_mismo_negocio(%L)',
        left('zz_enlace_persona_' || r.col, 63), r.tabla, r.col);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Enlace % %: %', r.tabla, r.col, SQLERRM;
    END;
  END LOOP;
END $$;
