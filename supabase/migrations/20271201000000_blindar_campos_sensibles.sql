CREATE OR REPLACE FUNCTION public.proteger_campos_sensibles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog, public, auth
AS $func$
DECLARE
    datos_nuevos jsonb := to_jsonb(NEW);
    datos_anteriores jsonb;
    campo text;
    valor jsonb;
    administrador boolean := false;
    rol_sesion text := COALESCE(auth.role(), '');
BEGIN
    -- Las operaciones privilegiadas del servidor pueden continuar.
    IF rol_sesion = 'service_role'
       OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
        RETURN NEW;
    END IF;

    -- Verificar los permisos reales del usuario en la base de datos.
    BEGIN
        administrador := COALESCE(
            (public.mi_acceso() ->> 'admin')::boolean,
            false
        );
    EXCEPTION
        WHEN OTHERS THEN
            administrador := false;
    END;

    IF administrador THEN
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        datos_anteriores := to_jsonb(OLD);
    ELSE
        datos_anteriores := '{}'::jsonb;
    END IF;

    -- Revisar todos los campos sensibles de la tabla.
    FOR campo IN
        SELECT llave
        FROM jsonb_object_keys(datos_nuevos) AS elemento(llave)
        WHERE llave ~* '^(rol|role|tipo_usuario|user_role|nivel_acceso|access_level|es_admin|is_admin|admin|es_dueno|is_owner|es_superadmin|is_superadmin|permisos|permissions|saldo(_[a-z0-9_]+)?|balance(_[a-z0-9_]+)?|dinero(_[a-z0-9_]+)?|money(_[a-z0-9_]+)?|cash(_[a-z0-9_]+)?|fondos(_[a-z0-9_]+)?|funds(_[a-z0-9_]+)?|monedas(_[a-z0-9_]+)?|coins(_[a-z0-9_]+)?|wallet(_balance)?|monedero(_[a-z0-9_]+)?|credit_balance|cash_balance|puntos(_[a-z0-9_]+)?|win|wins(_[a-z0-9_]+)?|winner|victory|victories|victorias(_[a-z0-9_]+)?|ganadas(_[a-z0-9_]+)?|ganados(_[a-z0-9_]+)?|ganador|partidas_ganadas|premios_ganados|trofeos(_[a-z0-9_]+)?)$'
    LOOP
        valor := datos_nuevos -> campo;

        IF TG_OP = 'UPDATE' THEN

            -- No permitir modificar campos protegidos.
            IF valor IS DISTINCT FROM (datos_anteriores -> campo) THEN
                RAISE EXCEPTION
                    'No tienes permisos para modificar el campo protegido: %',
                    campo
                    USING ERRCODE = '42501';
            END IF;

        ELSE

            -- Los valores vacíos y nulos son seguros al crear registros.
            IF valor IS NULL OR valor = 'null'::jsonb THEN
                CONTINUE;
            END IF;

            -- Solo permitir roles básicos al crear registros.
            IF campo ~* '^(rol|role|tipo_usuario|user_role|nivel_acceso|access_level)$' THEN

                IF lower(btrim(valor #>> '{}')) NOT IN (
                    'user',
                    'usuario',
                    'cliente',
                    'client',
                    'invitado',
                    'guest',
                    'member',
                    'miembro',
                    'viewer',
                    'basic',
                    'basico'
                ) THEN
                    RAISE EXCEPTION
                        'No puedes asignarte este rol: %',
                        campo
                        USING ERRCODE = '42501';
                END IF;

            ELSIF campo ~* '^(es_admin|is_admin|admin|es_dueno|is_owner|es_superadmin|is_superadmin)$' THEN

                IF valor <> 'false'::jsonb THEN
                    RAISE EXCEPTION
                        'No puedes asignarte privilegios administrativos.'
                        USING ERRCODE = '42501';
                END IF;

            ELSIF campo ~* '^(permisos|permissions)$' THEN

                IF valor <> '[]'::jsonb
                   AND valor <> '{}'::jsonb THEN
                    RAISE EXCEPTION
                        'No puedes asignarte permisos adicionales.'
                        USING ERRCODE = '42501';
                END IF;

            ELSE

                -- Saldos, dinero, puntos y victorias deben iniciar en cero.
                IF valor <> '0'::jsonb
                   AND valor <> 'false'::jsonb
                   AND NOT (
                       jsonb_typeof(valor) = 'string'
                       AND btrim(valor #>> '{}') IN ('0', '0.0', 'false', '')
                   ) THEN
                    RAISE EXCEPTION
                        'No puedes asignarte dinero, puntos o victorias.'
                        USING ERRCODE = '42501';
                END IF;

            END IF;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$func$;


-- Instalar la protección automáticamente en las tablas existentes
-- que contienen columnas sensibles.
DO $bloque$
DECLARE
    tabla record;
BEGIN
    FOR tabla IN
        SELECT
            esquema.nspname AS esquema,
            relacion.relname AS nombre
        FROM pg_class relacion
        JOIN pg_namespace esquema
            ON esquema.oid = relacion.relnamespace
        WHERE esquema.nspname = 'public'
          AND relacion.relkind IN ('r', 'p')
          AND NOT EXISTS (
              SELECT 1
              FROM pg_inherits herencia
              WHERE herencia.inhrelid = relacion.oid
          )
          AND EXISTS (
              SELECT 1
              FROM pg_attribute atributo
              WHERE atributo.attrelid = relacion.oid
                AND atributo.attnum > 0
                AND NOT atributo.attisdropped
                AND atributo.attname ~* '^(rol|role|tipo_usuario|user_role|nivel_acceso|access_level|es_admin|is_admin|admin|es_dueno|is_owner|es_superadmin|is_superadmin|permisos|permissions|saldo(_[a-z0-9_]+)?|balance(_[a-z0-9_]+)?|dinero(_[a-z0-9_]+)?|money(_[a-z0-9_]+)?|cash(_[a-z0-9_]+)?|fondos(_[a-z0-9_]+)?|funds(_[a-z0-9_]+)?|monedas(_[a-z0-9_]+)?|coins(_[a-z0-9_]+)?|wallet(_balance)?|monedero(_[a-z0-9_]+)?|credit_balance|cash_balance|puntos(_[a-z0-9_]+)?|win|wins(_[a-z0-9_]+)?|winner|victory|victories|victorias(_[a-z0-9_]+)?|ganadas(_[a-z0-9_]+)?|ganados(_[a-z0-9_]+)?|ganador|partidas_ganadas|premios_ganados|trofeos(_[a-z0-9_]+)?)$'
          )
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_proteger_campos_sensibles ON %I.%I',
            tabla.esquema,
            tabla.nombre
        );

        EXECUTE format(
            'CREATE TRIGGER trg_proteger_campos_sensibles
             BEFORE INSERT OR UPDATE ON %I.%I
             FOR EACH ROW
             EXECUTE FUNCTION public.proteger_campos_sensibles()',
            tabla.esquema,
            tabla.nombre
        );
    END LOOP;
END;
$bloque$;
