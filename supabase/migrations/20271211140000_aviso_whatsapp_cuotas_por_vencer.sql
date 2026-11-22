-- Recordatorio automático por WhatsApp 2 días antes del vencimiento de una cuota
-- (condominio y préstamos/créditos). Encola en whatsapp_outbox; el agente local lo envía.
-- Cada cuota cae exactamente una vez en "vence = hoy + 2", así que no se repite.

CREATE OR REPLACE FUNCTION public.avisar_cuotas_por_vencer()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total integer := 0;
  r record;
  v_negocio uuid;
  v_tel text;
BEGIN
  -- Condominio
  FOR r IN
    SELECT c.owner_id, c.propietario, c.valor, c.pagado, c.vence, u.telefono
    FROM public.cond_cuotas c
    JOIN public.cond_unidades u ON u.id = c.unidad_id
    WHERE c.estado = 'pendiente' AND c.vence = current_date + 2
  LOOP
    v_tel := regexp_replace(coalesce(r.telefono, ''), '[^0-9+]', '', 'g');
    CONTINUE WHEN length(v_tel) < 7;
    SELECT nc.id INTO v_negocio FROM public.negocio_config nc WHERE nc.owner_id = r.owner_id LIMIT 1;
    CONTINUE WHEN v_negocio IS NULL;
    INSERT INTO public.whatsapp_outbox (business_id, telefono, mensaje, estado)
    VALUES (v_negocio, v_tel,
      'Hola ' || split_part(coalesce(r.propietario, ''), ' ', 1)
        || ', te recordamos que tu cuota vence el ' || to_char(r.vence, 'DD/MM/YYYY')
        || ' por $' || trim(to_char(greatest(r.valor - r.pagado, 0), 'FM999G999G999G990'))
        || '. ¡Gracias por tu puntualidad!',
      'pendiente');
    v_total := v_total + 1;
  END LOOP;

  -- Préstamos y créditos
  FOR r IN
    SELECT q.owner_id, cr.cliente, cr.telefono, q.vence,
           greatest(q.valor - q.capital_pagado - q.interes_pagado, 0) AS saldo_cuota
    FROM public.pre_cuotas q
    JOIN public.pre_creditos cr ON cr.id = q.credito_id
    WHERE q.estado IN ('pendiente', 'parcial') AND q.vence = current_date + 2
  LOOP
    v_tel := regexp_replace(coalesce(r.telefono, ''), '[^0-9+]', '', 'g');
    CONTINUE WHEN length(v_tel) < 7;
    SELECT nc.id INTO v_negocio FROM public.negocio_config nc WHERE nc.owner_id = r.owner_id LIMIT 1;
    CONTINUE WHEN v_negocio IS NULL;
    INSERT INTO public.whatsapp_outbox (business_id, telefono, mensaje, estado)
    VALUES (v_negocio, v_tel,
      'Hola ' || split_part(coalesce(r.cliente, ''), ' ', 1)
        || ', te recordamos que tu cuota vence el ' || to_char(r.vence, 'DD/MM/YYYY')
        || ' por $' || trim(to_char(r.saldo_cuota, 'FM999G999G999G990'))
        || '. ¡Gracias por tu puntualidad!',
      'pendiente');
    v_total := v_total + 1;
  END LOOP;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.avisar_cuotas_por_vencer() FROM PUBLIC;

-- Programación diaria (si el servidor tiene pg_cron habilitado). Si no, la función queda lista para llamar.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
  PERFORM cron.schedule('avisos-cuotas-diario', '0 13 * * *', 'SELECT public.avisar_cuotas_por_vencer()');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron no disponible: %', SQLERRM;
END;
$$;
