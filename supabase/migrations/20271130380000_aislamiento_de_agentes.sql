BEGIN;

-- Protección de las credenciales y memorias privadas del agente.
-- Se conservan las operaciones del servidor mediante sus permisos propios.

DO $$
DECLARE
  tabla TEXT;
  politica RECORD;
BEGIN
  FOREACH tabla IN ARRAY ARRAY[
    'agente_whatsapp',
    'agente_memoria'
  ]
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      tabla
    );

    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public.%I FROM anon, PUBLIC',
      tabla
    );

    EXECUTE format(
      'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated',
      tabla
    );

    -- Sustituir las políticas anteriores de estas dos tablas
    -- por una política de pertenencia explícita.
    FOR politica IN
      SELECT policyname
      FROM pg_catalog.pg_policies
      WHERE schemaname = 'public'
        AND tablename = tabla
    LOOP
      EXECUTE format(
        'DROP POLICY %I ON public.%I',
        politica.policyname,
        tabla
      );
    END LOOP;

    EXECUTE format(
      'CREATE POLICY %I ON public.%I
       FOR ALL TO authenticated
       USING (owner_id = (SELECT auth.uid()))
       WITH CHECK (owner_id = (SELECT auth.uid()))',
      'propietario_' || tabla,
      tabla
    );
  END LOOP;
END;
$$;

-- Verificar que cada agente y cada memoria correspondan
-- a un negocio cuyo propietario coincida con el registrado.

CREATE OR REPLACE FUNCTION public.validar_pertenencia_agente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.negocio_id IS NULL
     OR NEW.owner_id IS NULL
     OR NOT EXISTS (
       SELECT 1
       FROM public.negocio_config AS negocio
       WHERE negocio.id = NEW.negocio_id
         AND negocio.owner_id = NEW.owner_id
     )
  THEN
    RAISE EXCEPTION
      'El registro enlazado no pertenece a tu negocio'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validar_pertenencia_agente_whatsapp
ON public.agente_whatsapp;

CREATE TRIGGER validar_pertenencia_agente_whatsapp
BEFORE INSERT OR UPDATE
ON public.agente_whatsapp
FOR EACH ROW
EXECUTE FUNCTION public.validar_pertenencia_agente();

DROP TRIGGER IF EXISTS validar_pertenencia_agente_memoria
ON public.agente_memoria;

CREATE TRIGGER validar_pertenencia_agente_memoria
BEFORE INSERT OR UPDATE
ON public.agente_memoria
FOR EACH ROW
EXECUTE FUNCTION public.validar_pertenencia_agente();

COMMIT;
