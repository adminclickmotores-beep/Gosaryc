-- Borra SOLO los datos residuales de las dos cuentas demo antiguas y retira la tarea programada del
-- resumen diario por correo (resto de otra plantilla). No cambia tablas ni funciones del sistema.
-- Seguridad: solo actúa sobre usuarios con esos dos correos y nunca sobre el superadmin.
DO $$
DECLARE
  ids uuid[];
  t record;
  pasada int;
  j record;
BEGIN
  SELECT coalesce(array_agg(u.id), ARRAY[]::uuid[]) INTO ids
  FROM auth.users u
  WHERE lower(u.email) IN ('demo.vehiculos@gosaryc.com', 'demo.restaurante@gosaryc.com')
    AND lower(u.email) <> 'jhonathan.cortes.24@gmail.com';

  IF coalesce(array_length(ids, 1), 0) > 0 THEN
    -- Varias pasadas: las filas hijas se borran primero y las que dependen de otras reintentan.
    FOR pasada IN 1..4 LOOP
      FOR t IN
        SELECT c.table_name, c.column_name
        FROM information_schema.columns c
        JOIN information_schema.tables tb
          ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
        WHERE c.table_schema = 'public'
          AND c.column_name IN ('owner_id', 'user_id')
          AND c.data_type = 'uuid'
      LOOP
        BEGIN
          EXECUTE format('DELETE FROM public.%I WHERE %I = ANY($1)', t.table_name, t.column_name) USING ids;
        EXCEPTION WHEN OTHERS THEN
          NULL; -- se reintenta en la siguiente pasada
        END;
      END LOOP;
    END LOOP;

    -- Las cuentas demo en sí.
    BEGIN
      DELETE FROM auth.users WHERE id = ANY(ids);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'No se pudieron borrar las cuentas demo: %', SQLERRM;
    END;
  END IF;

  -- Tarea programada del resumen diario (si existe pg_cron).
  IF to_regclass('cron.job') IS NOT NULL THEN
    BEGIN
      FOR j IN EXECUTE $q$SELECT jobid FROM cron.job WHERE jobname ILIKE '%daily-digest%' OR jobname ILIKE '%daily_digest%' OR command ILIKE '%daily-digest%'$q$ LOOP
        PERFORM cron.unschedule(j.jobid);
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'No se pudo retirar la tarea del resumen diario: %', SQLERRM;
    END;
  END IF;
END
$$;
