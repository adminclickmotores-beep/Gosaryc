-- DEVOLUCIÓN DE VENTA EN EL POS COMERCIAL
-- La venta no se borra: se marca como devuelta, el inventario regresa a la bodega (con historial),
-- se reversa el asiento contable y se registra la salida de dinero en caja.

ALTER TABLE public.com_ventas ADD COLUMN IF NOT EXISTS devuelta_en timestamptz;
ALTER TABLE public.com_ventas ADD COLUMN IF NOT EXISTS motivo_devolucion text;
ALTER TABLE public.com_ventas ADD COLUMN IF NOT EXISTS devuelta_por text;

CREATE OR REPLACE FUNCTION public.com_devolver_venta(p_venta uuid, p_motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v public.com_ventas%ROWTYPE;
  it record;
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

  UPDATE public.com_ventas
     SET devuelta_en = now(), motivo_devolucion = v_motivo, devuelta_por = coalesce(auth.jwt() ->> 'email', '')
   WHERE id = v.id;

  v_cuenta := CASE WHEN v.metodo = 'efectivo' THEN '1105' ELSE '1110' END;

  -- Contabilidad: reverso de la venta.
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

  -- Caja: sale el dinero devuelto al cliente.
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
