-- ARQUEO CIEGO DE CAJA POR TURNO
-- El cajero escribe cuánto contó sin ver el saldo esperado. Al cerrar, el servidor calcula el esperado,
-- el sobrante o faltante y lo envía a Contabilidad. Un turno cerrado no se modifica ni se borra.
-- No borra ni trunca datos.

CREATE OR REPLACE FUNCTION public.turnos_caja_arqueo_ciego()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ing numeric;
  v_egr numeric;
  v_esperado numeric;
  v_dif numeric;
  v_tipo text;
BEGIN
  IF auth.uid() IS NOT NULL AND OLD.estado = 'cerrado' THEN
    RAISE EXCEPTION 'Un turno cerrado no se puede modificar.';
  END IF;

  IF NEW.estado = 'cerrado' AND OLD.estado IS DISTINCT FROM 'cerrado' THEN
    IF NEW.efectivo_contado IS NULL OR NEW.efectivo_contado < 0 THEN
      RAISE EXCEPTION 'Escribe el efectivo que contaste.';
    END IF;

    SELECT coalesce(sum(monto) FILTER (WHERE tipo IN ('venta', 'ingreso')), 0),
           coalesce(sum(monto) FILTER (WHERE tipo NOT IN ('venta', 'ingreso')), 0)
      INTO v_ing, v_egr
      FROM public.movimientos_turno
     WHERE turno_id = OLD.id AND NOT anulado AND metodo = 'efectivo';

    v_esperado := coalesce(OLD.fondo_inicial, 0) + v_ing - v_egr;
    v_dif := NEW.efectivo_contado - v_esperado;
    NEW.esperado_efectivo := v_esperado;
    NEW.diferencia := v_dif;
    NEW.cerrado_en := coalesce(NEW.cerrado_en, now());

    IF v_dif <> 0 AND nullif(trim(coalesce(NEW.notas_cierre, '')), '') IS NULL THEN
      RAISE EXCEPTION 'Hay % de %: explica el motivo en las notas del cierre.',
        CASE WHEN v_dif > 0 THEN 'sobrante' ELSE 'faltante' END, abs(v_dif);
    END IF;

    -- Sobrante o faltante a Contabilidad (si falla el asiento, el cierre no se pierde).
    IF v_dif <> 0 AND OLD.owner_id IS NOT NULL THEN
      BEGIN
        v_tipo := public.tipo_de_negocio(OLD.owner_id);
        IF v_dif < 0 THEN
          PERFORM public.pan_asegurar_cuenta(OLD.owner_id, v_tipo, '5395', 'Faltantes de caja', 'gasto');
          PERFORM public.registrar_asiento_movimiento(OLD.owner_id, v_tipo,
            'Faltante de caja en arqueo (cajero: ' || coalesce(OLD.cajero, '-') || ')', 'arqueo_caja', OLD.id,
            jsonb_build_array(jsonb_build_object('codigo', '5395', 'debe', abs(v_dif)),
                              jsonb_build_object('codigo', '1105', 'haber', abs(v_dif))));
        ELSE
          PERFORM public.pan_asegurar_cuenta(OLD.owner_id, v_tipo, '4295', 'Sobrantes de caja', 'ingreso');
          PERFORM public.registrar_asiento_movimiento(OLD.owner_id, v_tipo,
            'Sobrante de caja en arqueo (cajero: ' || coalesce(OLD.cajero, '-') || ')', 'arqueo_caja', OLD.id,
            jsonb_build_array(jsonb_build_object('codigo', '1105', 'debe', v_dif),
                              jsonb_build_object('codigo', '4295', 'haber', v_dif)));
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'No se pudo registrar el asiento del arqueo %: %', OLD.id, SQLERRM;
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_turnos_caja_arqueo_ciego ON public.turnos_caja;
CREATE TRIGGER trg_turnos_caja_arqueo_ciego BEFORE UPDATE ON public.turnos_caja
  FOR EACH ROW EXECUTE FUNCTION public.turnos_caja_arqueo_ciego();

-- Los turnos y sus arqueos no se borran físicamente.
DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.turnos_caja;
CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.turnos_caja
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero();
