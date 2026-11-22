-- Activa el programador diario (pg_cron) que envía los recordatorios de cuotas por WhatsApp.
-- Idempotente: si el trabajo ya existe, se reemplaza por la misma programación (13:00 UTC = 8:00 Colombia).
-- No borra datos. Si el servidor no permite pg_cron, deja un aviso en el registro y no falla.

DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- Quita la programación anterior con el mismo nombre (si existe) para no duplicarla.
  PERFORM cron.unschedule(jobid)
  FROM cron.job
  WHERE jobname = 'avisos-cuotas-diario';

  PERFORM cron.schedule(
    'avisos-cuotas-diario',
    '0 13 * * *',
    'SELECT public.avisar_cuotas_por_vencer()'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'No se pudo activar pg_cron: %', SQLERRM;
END;
$$;
