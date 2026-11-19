BEGIN;

-- ============================================================
-- BLINDAJE RLS INTEGRAL
-- Aislamiento por negocio y usuario.
-- Bloqueo por licencia vencida.
-- Protección de licencias, roles y permisos.
--
-- No concede permisos generales de lectura o escritura.
-- Conserva las políticas permisivas existentes.
-- Las tablas sin propietario verificable quedan cerradas.
-- Todo se aplica dentro de una única transacción.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS seguridad_rls;

REVOKE ALL ON SCHEMA seguridad_rls FROM PUBLIC;

GRANT USAGE ON SCHEMA seguridad_rls
TO anon, authenticated;


-- ============================================================
-- 1. VERIFICAR PERTENENCIA AL NEGOCIO
-- ============================================================

CREATE OR REPLACE FUNCTION seguridad_rls.negocio_permitido(
  p_negocio TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_usuario TEXT;
  v_permitido BOOLEAN := FALSE;
  v_tabla TEXT;
BEGIN
  v_usuario := auth.uid()::TEXT;

  IF v_usuario IS NULL
     OR NULLIF(p_negocio, '') IS NULL
  THEN
    RETURN FALSE;
  END IF;

  -- Solo se acepta un negocio identificado en la base.
  IF to_regclass('public.negocios') IS NULL THEN
    RETURN FALSE;
  END IF;

  EXECUTE '
    SELECT EXISTS (
      SELECT 1
      FROM public.negocios n
      WHERE to_jsonb(n)->>''id'' = $1
        AND (
          to_jsonb(n)->>''owner_id'' = $2
          OR to_jsonb(n)->>''user_id'' = $2
        )
    )
  '
  INTO v_permitido
  USING p_negocio, v_usuario;

  IF v_permitido THEN
    RETURN TRUE;
  END IF;

  -- Personal vinculado explícitamente al mismo negocio.
  -- Nunca se concede acceso por coincidencia de correo
  -- ni por pertenencia a otro establecimiento.

  FOREACH v_tabla IN ARRAY ARRAY[
    'miembros_negocio',
    'equipo_negocio',
    'usuarios_negocio'
  ]
  LOOP
    IF to_regclass(format('public.%I', v_tabla))
       IS NOT NULL
    THEN
      EXECUTE format(
        '
        SELECT EXISTS (
          SELECT 1
          FROM public.%I m
          WHERE to_jsonb(m)->>''negocio_id'' = $1
            AND to_jsonb(m)->>''user_id'' = $2
            AND COALESCE(
              to_jsonb(m)->>''activo'',
              ''true''
            ) = ''true''
        )
        ',
        v_tabla
      )
      INTO v_permitido
      USING p_negocio, v_usuario;

      IF v_permitido THEN
        RETURN TRUE;
      END IF;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$$;


-- ============================================================
-- 2. COMPROBAR LICENCIA VIGENTE
-- ============================================================

CREATE OR REPLACE FUNCTION seguridad_rls.licencia_vigente(
  p_negocio TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  v_usuario TEXT;
  v_titular TEXT;
  v_vigente BOOLEAN := FALSE;
BEGIN
  v_usuario := auth.uid()::TEXT;

  IF v_usuario IS NULL THEN
    RETURN FALSE;
  END IF;

  -- No se acepta comprobar la licencia de un negocio ajeno.
  IF p_negocio IS NOT NULL THEN
    IF NOT seguridad_rls.negocio_permitido(p_negocio) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- Sin fuente comprobable de suscripción,
  -- el acceso queda cerrado.
  IF to_regclass('public.suscripciones_negocio')
     IS NULL
  THEN
    RETURN FALSE;
  END IF;

  v_titular := v_usuario;

  -- Cuando la suscripción pertenece al titular del negocio,
  -- se obtiene su identidad desde la base de datos.
  IF p_negocio IS NOT NULL
     AND to_regclass('public.negocios') IS NOT NULL
  THEN
    EXECUTE '
      SELECT COALESCE(
        NULLIF(to_jsonb(n)->>''owner_id'', ''''),
        NULLIF(to_jsonb(n)->>''user_id'', '''')
      )
      FROM public.negocios n
      WHERE to_jsonb(n)->>''id'' = $1
      LIMIT 1
    '
    INTO v_titular
    USING p_negocio;

    IF v_titular IS NULL THEN
      RETURN FALSE;
    END IF;
  END IF;

  EXECUTE '
    SELECT EXISTS (
      SELECT 1
      FROM public.suscripciones_negocio s
      WHERE LOWER(
        COALESCE(to_jsonb(s)->>''estado'', '''')
      ) IN (
        ''activo'',
        ''activa'',
        ''vigente'',
        ''prueba'',
        ''active'',
        ''trial''
      )
      AND NULLIF(
        to_jsonb(s)->>''vence_en'',
        ''''
      )::TIMESTAMPTZ > NOW()
      AND (
        (
          NULLIF(
            to_jsonb(s)->>''negocio_id'',
            ''''
          ) IS NOT NULL
          AND to_jsonb(s)->>''negocio_id'' = $1
        )
        OR
        (
          NULLIF(
            to_jsonb(s)->>''negocio_id'',
            ''''
          ) IS NULL
          AND COALESCE(
            to_jsonb(s)->>''owner_id'',
            to_jsonb(s)->>''user_id''
          ) = $2
        )
      )
    )
  '
  INTO v_vigente
  USING p_negocio, v_titular;

  RETURN COALESCE(v_vigente, FALSE);
END;
$$;


-- ============================================================
-- 3. PROTEGER FUNCIONES DE SEGURIDAD
-- ============================================================

REVOKE ALL ON FUNCTION
  seguridad_rls.negocio_permitido(TEXT)
FROM PUBLIC;

REVOKE ALL ON FUNCTION
  seguridad_rls.licencia_vigente(TEXT)
FROM PUBLIC;

GRANT EXECUTE ON FUNCTION
  seguridad_rls.negocio_permitido(TEXT)
TO anon, authenticated;

GRANT EXECUTE ON FUNCTION
  seguridad_rls.licencia_vigente(TEXT)
TO anon, authenticated;


-- ============================================================
-- 4. ACTIVAR RLS EN TODAS LAS TABLAS DEL ESQUEMA PUBLIC
-- ============================================================

DO $$
DECLARE
  v_tabla RECORD;

  v_negocio BOOLEAN;
  v_owner BOOLEAN;
  v_usuario BOOLEAN;
  v_usuario_es BOOLEAN;
  v_id BOOLEAN;

  v_condicion TEXT;
  v_propietario TEXT;

  v_excepcion_licencia BOOLEAN;
  v_tabla_protegida BOOLEAN;
BEGIN

  FOR v_tabla IN

    SELECT
      c.oid,
      c.relname AS nombre
    FROM pg_class c

    JOIN pg_namespace n
      ON n.oid = c.relnamespace

    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p')

      -- Los objetos internos de extensiones no son
      -- tablas de información comercial del proyecto.
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend d
        WHERE d.objid = c.oid
          AND d.deptype = 'e'
      )

    ORDER BY c.relname

  LOOP

    -- Activación obligatoria.
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      v_tabla.nombre
    );

    -- Identificar las columnas existentes.
    SELECT
      COALESCE(BOOL_OR(a.attname = 'negocio_id'), FALSE),
      COALESCE(BOOL_OR(a.attname = 'owner_id'), FALSE),
      COALESCE(BOOL_OR(a.attname = 'user_id'), FALSE),
      COALESCE(BOOL_OR(a.attname = 'usuario_id'), FALSE),
      COALESCE(BOOL_OR(a.attname = 'id'), FALSE)

    INTO
      v_negocio,
      v_owner,
      v_usuario,
      v_usuario_es,
      v_id

    FROM pg_attribute a

    WHERE a.attrelid = v_tabla.oid
      AND a.attnum > 0
      AND NOT a.attisdropped;


    -- ========================================================
    -- EXCEPCIONES PARA RENOVACIÓN Y PAGOS DE LICENCIA
    --
    -- Pueden conservar la lectura de datos propios
    -- aunque la licencia haya vencido.
    -- Las escrituras siguen sujetas a sus políticas previas.
    -- ========================================================

    v_excepcion_licencia :=
      v_tabla.nombre ~* '(^|_)(licencia|licencias|suscripcion|suscripciones|renovacion|renovaciones)(_|$)'
      OR v_tabla.nombre IN (
        'pagos_licencia',
        'solicitudes_licencia',
        'planes',
        'planes_negocio'
      );


    -- ========================================================
    -- AISLAMIENTO DEL REGISTRO
    -- ========================================================

    v_condicion := 'FALSE';

    IF v_tabla.nombre = 'negocios' AND v_id THEN

      v_propietario := format(
        'seguridad_rls.negocio_permitido(%I::TEXT)',
        'id'
      );

      IF v_excepcion_licencia THEN
        v_condicion := format(
          'auth.uid() IS NOT NULL AND (%s)',
          v_propietario
        );
      ELSE
        v_condicion := format(
          'auth.uid() IS NOT NULL AND (%s)
           AND seguridad_rls.licencia_vigente(%I::TEXT)',
          v_propietario,
          'id'
        );
      END IF;

    ELSIF v_negocio THEN

      v_propietario := format(
        'seguridad_rls.negocio_permitido(%I::TEXT)',
        'negocio_id'
      );

      IF v_excepcion_licencia THEN

        v_condicion := format(
          'auth.uid() IS NOT NULL AND (%s)',
          v_propietario
        );

      ELSE

        v_condicion := format(
          'auth.uid() IS NOT NULL
           AND (%s)
           AND seguridad_rls.licencia_vigente(%I::TEXT)',
          v_propietario,
          'negocio_id'
        );

      END IF;

    ELSIF v_owner OR v_usuario OR v_usuario_es THEN

      v_propietario := CASE
        WHEN v_owner THEN 'owner_id'
        WHEN v_usuario THEN 'user_id'
        ELSE 'usuario_id'
      END;

      IF v_excepcion_licencia THEN

        v_condicion := format(
          'auth.uid() IS NOT NULL
           AND %I::TEXT = auth.uid()::TEXT',
          v_propietario
        );

      ELSE

        v_condicion := format(
          'auth.uid() IS NOT NULL
           AND %I::TEXT = auth.uid()::TEXT
           AND (SELECT seguridad_rls.licencia_vigente(NULL))',
          v_propietario
        );

      END IF;

    ELSE

      -- No se inventa una relación de propiedad.
      -- Sin columna identificable, acceso denegado.
      v_condicion := 'FALSE';

      RAISE NOTICE
        'RLS: tabla % sin propietario identificable; acceso cerrado.',
        v_tabla.nombre;

    END IF;


    -- ========================================================
    -- APLICAR RESTRICCIÓN A TODAS LAS OPERACIONES
    --
    -- AS RESTRICTIVE impide que una política permisiva
    -- anterior eluda el aislamiento.
    --
    -- USING controla lectura, modificación y eliminación.
    -- WITH CHECK controla los registros nuevos y modificados.
    -- ========================================================

    EXECUTE format(
      'DROP POLICY IF EXISTS
       rls_aislamiento_integral
       ON public.%I',
      v_tabla.nombre
    );

    EXECUTE format(
      'CREATE POLICY rls_aislamiento_integral
       ON public.%I
       AS RESTRICTIVE
       FOR ALL
       TO PUBLIC
       USING (%s)
       WITH CHECK (%s)',
      v_tabla.nombre,
      v_condicion,
      v_condicion
    );


    -- ========================================================
    -- 5. TABLAS DE AUTORIZACIÓN Y LICENCIAS
    --
    -- Se impide que un usuario cambie directamente:
    -- roles, permisos, miembros del equipo, planes
    -- o vigencia de suscripciones.
    --
    -- Las operaciones privilegiadas deben ejecutarse
    -- mediante los procedimientos autorizados existentes.
    -- ========================================================

    v_tabla_protegida :=
      v_tabla.nombre ~* '^(licencias?|suscripciones?)(_.+)?$'
      OR v_tabla.nombre ~* '(^|_)(roles?|permisos?)(_|$)'
      OR v_tabla.nombre IN (
        'equipo_negocio',
        'miembros_negocio',
        'usuarios_negocio',
        'perfiles',
        'planes',
        'planes_negocio',
        'codigos_activacion'
      );

    IF v_tabla_protegida THEN

      EXECUTE format(
        'DROP POLICY IF EXISTS
         rls_bloqueo_insertar_privilegios
         ON public.%I',
        v_tabla.nombre
      );

      EXECUTE format(
        'DROP POLICY IF EXISTS
         rls_bloqueo_editar_privilegios
         ON public.%I',
        v_tabla.nombre
      );

      EXECUTE format(
        'DROP POLICY IF EXISTS
         rls_bloqueo_borrar_privilegios
         ON public.%I',
        v_tabla.nombre
      );

      EXECUTE format(
        'CREATE POLICY rls_bloqueo_insertar_privilegios
         ON public.%I
         AS RESTRICTIVE
         FOR INSERT
         TO authenticated
         WITH CHECK (FALSE)',
        v_tabla.nombre
      );

      EXECUTE format(
        'CREATE POLICY rls_bloqueo_editar_privilegios
         ON public.%I
         AS RESTRICTIVE
         FOR UPDATE
         TO authenticated
         USING (FALSE)
         WITH CHECK (FALSE)',
        v_tabla.nombre
      );

      EXECUTE format(
        'CREATE POLICY rls_bloqueo_borrar_privilegios
         ON public.%I
         AS RESTRICTIVE
         FOR DELETE
         TO authenticated
         USING (FALSE)',
        v_tabla.nombre
      );

    END IF;

  END LOOP;

END;
$$;


-- ============================================================
-- 6. IMPEDIR OPERACIONES QUE RLS NO FILTRA POR FILA
-- ============================================================

REVOKE TRUNCATE, REFERENCES
ON ALL TABLES IN SCHEMA public
FROM anon, authenticated;


-- ============================================================
-- 7. AUDITORÍA FINAL OBLIGATORIA
--
-- Si alguna tabla comercial del esquema público queda
-- sin RLS o sin la política restrictiva, se revierte
-- automáticamente la transacción completa.
-- ============================================================

DO $$
DECLARE
  v_faltantes TEXT;
BEGIN

  SELECT STRING_AGG(
    format('%I.%I', n.nspname, c.relname),
    ', '
    ORDER BY c.relname
  )
  INTO v_faltantes

  FROM pg_class c

  JOIN pg_namespace n
    ON n.oid = c.relnamespace

  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')

    AND NOT EXISTS (
      SELECT 1
      FROM pg_depend d
      WHERE d.objid = c.oid
        AND d.deptype = 'e'
    )

    AND (
      NOT c.relrowsecurity

      OR NOT EXISTS (
        SELECT 1
        FROM pg_policy p
        WHERE p.polrelid = c.oid
          AND p.polname = 'rls_aislamiento_integral'
          AND NOT p.polpermissive
      )
    );

  IF v_faltantes IS NOT NULL THEN

    RAISE EXCEPTION
      'Auditoría RLS incompleta. Tablas: %',
      v_faltantes;

  END IF;

  RAISE NOTICE
    'Auditoría estructural RLS completada.';

END;
$$;

COMMIT;
