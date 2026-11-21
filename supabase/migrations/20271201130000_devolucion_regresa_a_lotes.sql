-- Devolución con control de lotes: las unidades regresan también al lote del que salieron.
-- Se guarda de qué lote salió cada línea de venta (FIFO) para poder reintegrarlas exactas.

CREATE TABLE IF NOT EXISTS public.com_venta_item_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  venta_id uuid NOT NULL,
  producto_id uuid NOT NULL,
  lote_id uuid NOT NULL REFERENCES public.com_lotes(id) ON DELETE RESTRICT,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS com_venta_item_lotes_venta_idx ON public.com_venta_item_lotes (owner_id, venta_id);
ALTER TABLE public.com_venta_item_lotes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS com_venta_item_lotes_leer ON public.com_venta_item_lotes;
CREATE POLICY com_venta_item_lotes_leer ON public.com_venta_item_lotes
  FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id());

-- FIFO que además deja anotado de qué lote salió cada cantidad.
CREATE OR REPLACE FUNCTION public.com_descontar_lotes_fifo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ctrl boolean;
  v_falta numeric := NEW.cantidad_base;
  v_toma numeric;
  l record;
BEGIN
  SELECT controla_lotes INTO v_ctrl FROM public.com_productos WHERE id = NEW.producto_id;
  IF NOT coalesce(v_ctrl, false) THEN RETURN NEW; END IF;
  FOR l IN
    SELECT id, cantidad_actual FROM public.com_lotes
     WHERE producto_id = NEW.producto_id AND owner_id = NEW.owner_id AND cantidad_actual > 0
     ORDER BY vence ASC NULLS LAST, created_at ASC
     FOR UPDATE
  LOOP
    EXIT WHEN v_falta <= 0;
    v_toma := least(l.cantidad_actual, v_falta);
    UPDATE public.com_lotes SET cantidad_actual = cantidad_actual - v_toma WHERE id = l.id;
    INSERT INTO public.com_venta_item_lotes (owner_id, venta_id, producto_id, lote_id, cantidad)
    VALUES (NEW.owner_id, NEW.venta_id, NEW.producto_id, l.id, v_toma);
    v_falta := v_falta - v_toma;
  END LOOP;
  RETURN NEW;
END;
$$;

-- Devolución: además del stock total, cada lote recupera lo que se le descontó.
CREATE OR REPLACE FUNCTION public.com_devolver_venta(p_venta uuid, p_motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v public.com_ventas%ROWTYPE;
  it record;
  al record;
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
  v_cuenta text;
  v_lineas jsonb;
  v_turno uuid;
  v_concepto text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF v_motivo IS NULL OR length(v_motivo) < 3 THEN RAISE EXCEPTION 'Escribe el motivo de la devolución.'; END IF;
  IF length(v_motivo) > 200 THEN RAISE EXCEPTION 'El motivo es demasiado largo.'; END IF;

  SELECT * INTO v FROM public.com_ventas WHERE id = p_venta AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La venta no existe.'; END IF;
  IF v.devuelta_en IS NOT NULL THEN RAISE EXCEPTION 'Esta venta ya fue devuelta.'; END IF;
  IF v.fiado_id IS NOT NULL THEN
    RAISE EXCEPTION 'Es una venta a crédito: ajusta o anula la cuenta desde Cartera y cuentas por cobrar.';
  END IF;

  v_concepto := 'Devolución venta #' || upper(left(v.id::text, 6));
  PERFORM set_config('gosaryc.com_motivo', v_concepto, true);

  FOR it IN SELECT producto_id, cantidad_base FROM public.com_venta_items WHERE venta_id = v.id AND owner_id = v_owner LOOP
    UPDATE public.com_productos SET stock = stock + it.cantidad_base WHERE id = it.producto_id AND owner_id = v_owner;
  END LOOP;

  -- Lotes: cada unidad vuelve al lote del que salió.
  FOR al IN SELECT lote_id, sum(cantidad) AS cantidad FROM public.com_venta_item_lotes
             WHERE venta_id = v.id AND owner_id = v_owner GROUP BY lote_id LOOP
    UPDATE public.com_lotes SET cantidad_actual = cantidad_actual + al.cantidad
     WHERE id = al.lote_id AND owner_id = v_owner;
  END LOOP;

  UPDATE public.com_ventas
     SET devuelta_en = now(), motivo_devolucion = v_motivo, devuelta_por = coalesce(auth.jwt() ->> 'email', '')
   WHERE id = v.id;

  v_cuenta := CASE WHEN v.metodo = 'efectivo' THEN '1105' ELSE '1110' END;

  BEGIN
    v_lineas := jsonb_build_array(
      jsonb_build_object('codigo', '4135', 'debe', v.base),
      jsonb_build_object('codigo', v_cuenta, 'haber', v.total));
    IF v.iva > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '2408', 'debe', v.iva)); END IF;
    IF v.impoconsumo > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '2495', 'debe', v.impoconsumo)); END IF;
    PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo, v_concepto, 'com_devolucion', v.id, v_lineas);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo reversar el asiento de la venta %: %', v.id, SQLERRM;
  END;

  BEGIN
    PERFORM set_config('gosaryc.pan', 'on', true);
    INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
    VALUES (v_owner, v_tipo, 'egreso', left(v_concepto || ' (' || v.metodo || ')', 200), v.total);
    PERFORM set_config('gosaryc.pan', 'off', true);
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('gosaryc.pan', 'off', true);
    RAISE WARNING 'No se pudo registrar la salida de caja de %: %', v.id, SQLERRM;
  END;

  BEGIN
    SELECT id INTO v_turno FROM public.turnos_caja
     WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
    IF v_turno IS NOT NULL THEN
      INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
      VALUES (v_owner, v_turno, 'gasto',
              CASE WHEN v.metodo = 'efectivo' THEN 'efectivo' WHEN v.metodo = 'tarjeta' THEN 'tarjeta' ELSE 'transferencia' END,
              v_concepto, v.total, coalesce(auth.jwt() ->> 'email', ''));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar la devolución en el turno: %', SQLERRM;
  END;

  RETURN jsonb_build_object('venta_id', v.id, 'total', v.total);
END;
$$;
REVOKE ALL ON FUNCTION public.com_devolver_venta(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.com_devolver_venta(uuid, text) TO authenticated;
