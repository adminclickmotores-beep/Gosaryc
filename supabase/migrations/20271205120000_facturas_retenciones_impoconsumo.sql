-- Facturas: impoconsumo y retenciones (retefuente, reteiva, reteica) guardadas, con total neto y asiento contable.
ALTER TABLE public.fac_emitidas
  ADD COLUMN IF NOT EXISTS impoconsumo numeric NOT NULL DEFAULT 0 CHECK (impoconsumo >= 0),
  ADD COLUMN IF NOT EXISTS retefuente numeric NOT NULL DEFAULT 0 CHECK (retefuente >= 0),
  ADD COLUMN IF NOT EXISTS reteiva numeric NOT NULL DEFAULT 0 CHECK (reteiva >= 0),
  ADD COLUMN IF NOT EXISTS reteica numeric NOT NULL DEFAULT 0 CHECK (reteica >= 0),
  ADD COLUMN IF NOT EXISTS total_retenciones numeric NOT NULL DEFAULT 0 CHECK (total_retenciones >= 0),
  ADD COLUMN IF NOT EXISTS neto_a_recibir numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metodo_pago text;

-- Nueva versión de fac_emitir (mismos redondeos que la pantalla: pesos enteros).
CREATE OR REPLACE FUNCTION public.fac_emitir(
  p_cliente text, p_cliente_doc text, p_items jsonb, p_iva numeric, p_formato text,
  p_inc numeric, p_retefuente numeric, p_reteiva numeric, p_reteica numeric, p_metodo text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_neg record;
  v_num bigint;
  v_sub numeric := 0;
  v_iva numeric;
  v_inc numeric;
  v_rf numeric;
  v_ri numeric;
  v_rc numeric;
  v_ret numeric;
  v_total numeric;
  v_id uuid := gen_random_uuid();
  v_tipo text := public.tipo_negocio_actual();
  v_lineas jsonb;
  it jsonb;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF nullif(trim(coalesce(p_cliente, '')), '') IS NULL THEN RAISE EXCEPTION 'Escribe el cliente.'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Agrega al menos un ítem.'; END IF;
  SELECT * INTO v_neg FROM public.negocio_config WHERE id = v_owner;
  IF NOT FOUND THEN RAISE EXCEPTION 'Primero completa los datos de tu negocio (Mi negocio).'; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_sub := v_sub + coalesce((it ->> 'cantidad')::numeric, 0) * coalesce((it ->> 'precio')::numeric, 0);
  END LOOP;
  v_iva := round(v_sub * least(greatest(coalesce(p_iva, 0), 0), 100) / 100);
  v_inc := round(v_sub * least(greatest(coalesce(p_inc, 0), 0), 100) / 100);
  v_rf := round(v_sub * least(greatest(coalesce(p_retefuente, 0), 0), 100) / 100);
  v_ri := round(v_iva * least(greatest(coalesce(p_reteiva, 0), 0), 100) / 100);
  v_rc := round(v_sub * least(greatest(coalesce(p_reteica, 0), 0), 30) / 1000);
  v_ret := v_rf + v_ri + v_rc;
  v_total := round(v_sub) + v_iva + v_inc;

  SELECT coalesce(max(numero), coalesce(v_neg.rango_desde, 1) - 1) + 1 INTO v_num
  FROM public.fac_emitidas WHERE owner_id = v_owner;
  IF v_num < coalesce(v_neg.rango_desde, 1) THEN v_num := coalesce(v_neg.rango_desde, 1); END IF;
  IF v_num > coalesce(v_neg.rango_hasta, 1000) THEN RAISE EXCEPTION 'Se agotó el rango autorizado (hasta %). Pide nueva resolución DIAN.', v_neg.rango_hasta; END IF;

  INSERT INTO public.fac_emitidas (id, owner_id, tipo_negocio, numero, cliente, cliente_doc, items, subtotal, iva, total, formato,
                                   impoconsumo, retefuente, reteiva, reteica, total_retenciones, neto_a_recibir, metodo_pago)
  VALUES (v_id, v_owner, v_tipo, v_num, trim(p_cliente), nullif(trim(coalesce(p_cliente_doc, '')), ''), p_items,
          round(v_sub), v_iva, v_total, coalesce(nullif(trim(p_formato), ''), 'tirilla'),
          v_inc, v_rf, v_ri, v_rc, v_ret, v_total - v_ret, nullif(trim(coalesce(p_metodo, '')), ''));

  -- Asiento: cartera (neto) + retenciones a favor = ingreso + IVA + impoconsumo.
  BEGIN
    v_lineas := jsonb_build_array(
      jsonb_build_object('codigo', '1305', 'debe', v_total - v_ret),
      jsonb_build_object('codigo', '4135', 'haber', round(v_sub)));
    IF v_ret > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '1355', 'debe', v_ret)); END IF;
    IF v_iva > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '2408', 'haber', v_iva)); END IF;
    IF v_inc > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '2495', 'haber', v_inc)); END IF;
    PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo, 'Factura de venta #' || v_num, 'factura', v_id, v_lineas);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento de la factura %: %', v_num, SQLERRM;
  END;

  RETURN jsonb_build_object('id', v_id, 'numero', v_num);
END;
$$;
REVOKE ALL ON FUNCTION public.fac_emitir(text, text, jsonb, numeric, text, numeric, numeric, numeric, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fac_emitir(text, text, jsonb, numeric, text, numeric, numeric, numeric, numeric, text) TO authenticated;
