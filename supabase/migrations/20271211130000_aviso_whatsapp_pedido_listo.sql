-- Aviso automático por WhatsApp cuando un pedido pasa a "listo".
-- Encola el mensaje en whatsapp_outbox; el agente local lo envía.
-- Solo se dispara en la transición a 'listo' (no repite si ya estaba listo).

CREATE OR REPLACE FUNCTION public.pedido_listo_avisar_whatsapp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_negocio uuid;
  v_tel text;
  v_nombre text;
BEGIN
  IF NEW.estado IS DISTINCT FROM 'listo' OR OLD.estado = 'listo' THEN
    RETURN NEW;
  END IF;

  v_tel := regexp_replace(coalesce(NEW.cliente_telefono, ''), '[^0-9+]', '', 'g');
  IF length(v_tel) < 7 THEN
    RETURN NEW;
  END IF;

  SELECT nc.id INTO v_negocio
  FROM public.negocio_config nc
  WHERE nc.owner_id = NEW.owner_id
  LIMIT 1;

  IF v_negocio IS NULL THEN
    RETURN NEW;
  END IF;

  v_nombre := split_part(coalesce(NEW.cliente_nombre, ''), ' ', 1);

  BEGIN
    INSERT INTO public.whatsapp_outbox (business_id, telefono, mensaje, estado)
    VALUES (
      v_negocio,
      v_tel,
      'Hola' || CASE WHEN v_nombre <> '' THEN ' ' || v_nombre ELSE '' END
        || ', tu pedido ya está listo. Puedes pasar a recogerlo o esperar la entrega. ¡Gracias por tu compra!',
      'pendiente'
    );
  EXCEPTION WHEN OTHERS THEN
    -- El aviso nunca debe impedir que el pedido cambie de estado.
    NULL;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.pedido_listo_avisar_whatsapp() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_pedido_listo_whatsapp ON public.restaurante_pedidos;
CREATE TRIGGER trg_pedido_listo_whatsapp
  AFTER UPDATE OF estado ON public.restaurante_pedidos
  FOR EACH ROW
  EXECUTE FUNCTION public.pedido_listo_avisar_whatsapp();
