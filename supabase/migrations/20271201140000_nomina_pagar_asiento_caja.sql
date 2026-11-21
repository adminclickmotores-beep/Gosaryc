-- Pago de nómina: asiento cuadrado (Débito 2505 nómina por pagar / Crédito caja o bancos),
-- egreso en la caja del día y en el turno abierto, y la liquidación queda como "pagada".

CREATE OR REPLACE FUNCTION public.nomina_pagar(p_liquidacion uuid, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  l public.nomina_liquidaciones%ROWTYPE;
  v_metodo text := lower(coalesce(nullif(trim(p_metodo), ''), 'efectivo'));
  v_cuenta text;
  v_neto numeric;
  v_concepto text;
  v_turno uuid;
BEGIN
  IF v_owner IS NULL OR NOT public.tiene_permiso('equipo_turnos') THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF v_metodo NOT IN ('efectivo', 'transferencia', 'tarjeta') THEN RAISE EXCEPTION 'Medio de pago no válido.'; END IF;

  SELECT * INTO l FROM public.nomina_liquidaciones WHERE id = p_liquidacion AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La liquidación no existe.'; END IF;
  IF l.estado = 'pagada' THEN RAISE EXCEPTION 'Esta nómina ya fue pagada.'; END IF;
  IF l.estado <> 'contabilizada' THEN RAISE EXCEPTION 'Primero contabiliza la nómina.'; END IF;

  v_neto := round(l.neto);
  IF v_neto <= 0 THEN RAISE EXCEPTION 'El neto a pagar debe ser mayor a cero.'; END IF;
  v_cuenta := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  v_concepto := left('Pago de nómina ' || l.empleado_nombre || ' ' || l.periodo_inicio || ' al ' || l.periodo_fin, 200);

  -- Asiento cuadrado: se cancela la deuda con el empleado contra caja o bancos.
  PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo, v_concepto, 'nomina_pago', l.id,
    jsonb_build_array(
      jsonb_build_object('codigo', '2505', 'debe', v_neto),
      jsonb_build_object('codigo', v_cuenta, 'haber', v_neto)));

  -- Egreso en la caja del día (sin segundo asiento: ya quedó el de arriba).
  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, v_tipo, 'gasto', v_concepto, v_neto);
  PERFORM set_config('gosaryc.pan', 'off', true);

  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por, referencia_pago)
    VALUES (v_owner, v_turno, 'gasto', v_metodo, v_concepto, v_neto, coalesce(auth.jwt() ->> 'email', ''),
            CASE WHEN v_metodo = 'efectivo' THEN NULL ELSE 'Pago de nómina' END);
  END IF;

  UPDATE public.nomina_liquidaciones SET estado = 'pagada' WHERE id = l.id;
  RETURN jsonb_build_object('liquidacion_id', l.id, 'neto', v_neto, 'metodo', v_metodo);
END;
$$;
REVOKE ALL ON FUNCTION public.nomina_pagar(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.nomina_pagar(uuid, text) TO authenticated;
