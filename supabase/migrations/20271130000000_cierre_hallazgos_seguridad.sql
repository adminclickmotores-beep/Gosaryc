-- Cierre de los 2 hallazgos del escáner de seguridad (18-nov-2026):
-- 1. "Some access rules only check that someone is signed in" (4 tablas):
--    calendario_tributario_oficial, novedades_normativas, sst_novedades y
--    parametros_nomina_colombia solo pedían auth.uid() IS NOT NULL. Ahora la
--    lectura exige pertenecer a un negocio (dueño con su negocio creado o
--    miembro activo del equipo) o ser Superadmin.
-- 2. "Caller input shapes the commands ofi_cobrar runs": ofi_cobrar armaba SQL
--    dinámico con el nombre de tabla que enviaba el navegador. Se reescribe con
--    consultas fijas por módulo (sin EXECUTE) y método de pago normalizado.
-- Sin DROP/TRUNCATE/DELETE de datos. Misma firma de la función (types.ts igual).

-- ============================================================
-- 1. Pertenencia real a un negocio
-- ============================================================
CREATE OR REPLACE FUNCTION public.pertenece_a_negocio()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.es_superadmin()
    OR EXISTS (SELECT 1 FROM public.negocio_config nc WHERE nc.owner_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.equipo_negocio e
      WHERE e.user_id = auth.uid() AND e.activo = true AND e.owner_id IS NOT NULL
    )
  );
$$;
REVOKE ALL ON FUNCTION public.pertenece_a_negocio() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pertenece_a_negocio() TO authenticated;

DROP POLICY IF EXISTS "cal_oficial_lectura" ON public.calendario_tributario_oficial;
CREATE POLICY "cal_oficial_lectura" ON public.calendario_tributario_oficial
  FOR SELECT TO authenticated USING (public.pertenece_a_negocio());

DROP POLICY IF EXISTS "novedades_lectura" ON public.novedades_normativas;
CREATE POLICY "novedades_lectura" ON public.novedades_normativas
  FOR SELECT TO authenticated USING (public.pertenece_a_negocio());

DROP POLICY IF EXISTS sst_novedades_leer ON public.sst_novedades;
CREATE POLICY sst_novedades_leer ON public.sst_novedades
  FOR SELECT TO authenticated USING (public.pertenece_a_negocio());

DROP POLICY IF EXISTS "parametros_nomina_lectura" ON public.parametros_nomina_colombia;
CREATE POLICY "parametros_nomina_lectura" ON public.parametros_nomina_colombia
  FOR SELECT TO authenticated USING (public.pertenece_a_negocio());

-- ============================================================
-- 2. ofi_cobrar sin SQL dinámico
-- ============================================================
CREATE OR REPLACE FUNCTION public.ofi_cobrar(p_tabla text, p_id uuid, p_valor numeric, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_etiqueta text := CASE p_tabla
    WHEN 'lav_ordenes' THEN 'Lavandería'
    WHEN 'prof_casos' THEN 'Honorarios'
    WHEN 'tec_proyectos' THEN 'Proyecto'
    WHEN 'pap_encargos' THEN 'Encargo'
    WHEN 'joy_piezas' THEN 'Joyería'
    WHEN 'lic_domicilios' THEN 'Domicilio licorera'
    WHEN 'parq_turnos' THEN 'Parqueadero'
    ELSE NULL END;
  v_row_owner uuid;
  v_tipo text;
  v_total numeric;
  v_abono numeric;
  v_cliente text;
  v_edad_ok boolean;
  v_metodo text := lower(coalesce(nullif(trim(p_metodo), ''), 'efectivo'));
  v_cuenta text;
  v_turno uuid;
  v_nuevo numeric;
  v_concepto text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF v_etiqueta IS NULL THEN RAISE EXCEPTION 'Módulo no válido.'; END IF;
  IF p_id IS NULL THEN RAISE EXCEPTION 'Registro no válido.'; END IF;
  IF p_valor IS NULL OR p_valor <= 0 THEN RAISE EXCEPTION 'El abono debe ser mayor a cero.'; END IF;
  IF v_metodo !~ '^[a-z_ ]{1,30}$' THEN v_metodo := 'transferencia'; END IF;
  v_cuenta := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;

  IF p_tabla = 'parq_turnos' THEN
    SELECT owner_id, tipo_negocio,
           greatest(round(extract(epoch from (now() - entrada)) / 3600 * tarifa), tarifa),
           abono, placa
      INTO v_row_owner, v_tipo, v_total, v_abono, v_cliente
      FROM public.parq_turnos WHERE id = p_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'El turno ya no existe.'; END IF;
    IF v_row_owner IS DISTINCT FROM v_owner THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
    UPDATE public.parq_turnos
    SET salida = now(),
        horas = round(extract(epoch from (now() - entrada)) / 3600, 1),
        total = v_total, abono = v_total, estado = 'cobrado'
    WHERE id = p_id;
    v_nuevo := v_total;
  ELSE
    IF p_tabla = 'lav_ordenes' THEN
      SELECT owner_id, tipo_negocio, total, abono, cliente
        INTO v_row_owner, v_tipo, v_total, v_abono, v_cliente
        FROM public.lav_ordenes WHERE id = p_id FOR UPDATE;
    ELSIF p_tabla = 'prof_casos' THEN
      SELECT owner_id, tipo_negocio, honorarios, abono, cliente
        INTO v_row_owner, v_tipo, v_total, v_abono, v_cliente
        FROM public.prof_casos WHERE id = p_id FOR UPDATE;
    ELSIF p_tabla = 'tec_proyectos' THEN
      SELECT owner_id, tipo_negocio, valor, abono, cliente
        INTO v_row_owner, v_tipo, v_total, v_abono, v_cliente
        FROM public.tec_proyectos WHERE id = p_id FOR UPDATE;
    ELSIF p_tabla = 'pap_encargos' THEN
      SELECT owner_id, tipo_negocio, valor, abono, cliente
        INTO v_row_owner, v_tipo, v_total, v_abono, v_cliente
        FROM public.pap_encargos WHERE id = p_id FOR UPDATE;
    ELSIF p_tabla = 'joy_piezas' THEN
      SELECT owner_id, tipo_negocio, precio, abono, cliente
        INTO v_row_owner, v_tipo, v_total, v_abono, v_cliente
        FROM public.joy_piezas WHERE id = p_id FOR UPDATE;
    ELSIF p_tabla = 'lic_domicilios' THEN
      SELECT owner_id, tipo_negocio, total, abono, cliente, edad_ok
        INTO v_row_owner, v_tipo, v_total, v_abono, v_cliente, v_edad_ok
        FROM public.lic_domicilios WHERE id = p_id FOR UPDATE;
    END IF;

    IF v_row_owner IS NULL THEN RAISE EXCEPTION 'El registro ya no existe.'; END IF;
    IF v_row_owner IS DISTINCT FROM v_owner THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
    IF p_tabla = 'lic_domicilios' AND coalesce(v_edad_ok, false) = false THEN
      RAISE EXCEPTION 'Verifica la mayoría de edad con el documento antes de cobrar.';
    END IF;
    IF coalesce(v_abono, 0) + p_valor > v_total THEN RAISE EXCEPTION 'El abono supera el total.'; END IF;
    v_nuevo := coalesce(v_abono, 0) + p_valor;

    IF p_tabla = 'lav_ordenes' THEN
      UPDATE public.lav_ordenes SET abono = v_nuevo,
        estado = CASE WHEN v_nuevo >= total THEN 'cobrado' ELSE estado END WHERE id = p_id;
    ELSIF p_tabla = 'prof_casos' THEN
      UPDATE public.prof_casos SET abono = v_nuevo,
        estado = CASE WHEN v_nuevo >= honorarios THEN 'cobrado' ELSE estado END WHERE id = p_id;
    ELSIF p_tabla = 'tec_proyectos' THEN
      UPDATE public.tec_proyectos SET abono = v_nuevo,
        estado = CASE WHEN v_nuevo >= valor THEN 'cobrado' ELSE estado END WHERE id = p_id;
    ELSIF p_tabla = 'pap_encargos' THEN
      UPDATE public.pap_encargos SET abono = v_nuevo,
        estado = CASE WHEN v_nuevo >= valor THEN 'cobrado' ELSE estado END WHERE id = p_id;
    ELSIF p_tabla = 'joy_piezas' THEN
      UPDATE public.joy_piezas SET abono = v_nuevo,
        estado = CASE WHEN v_nuevo >= precio THEN 'cobrado' ELSE estado END WHERE id = p_id;
    ELSIF p_tabla = 'lic_domicilios' THEN
      UPDATE public.lic_domicilios SET abono = v_nuevo,
        estado = CASE WHEN v_nuevo >= total THEN 'cobrado' ELSE estado END WHERE id = p_id;
    END IF;
  END IF;

  v_concepto := v_etiqueta || ' · ' || coalesce(v_cliente, '');

  BEGIN
    PERFORM public.pan_asegurar_cuenta(v_owner, v_tipo, '4135', 'Ventas de servicios', 'ingreso');
    PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo, v_concepto, 'ofi_cobro', p_id,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', p_valor),
                        jsonb_build_object('codigo', '4135', 'haber', p_valor)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento del cobro %: %', p_id, SQLERRM;
  END;

  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, v_tipo, 'ingreso', left(v_concepto || ' (' || v_metodo || ')', 200), p_valor);
  PERFORM set_config('gosaryc.pan', 'off', true);

  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'venta',
            CASE WHEN v_metodo = 'efectivo' THEN 'efectivo' WHEN v_metodo = 'tarjeta' THEN 'tarjeta' ELSE 'transferencia' END,
            v_concepto, p_valor, coalesce(auth.jwt() ->> 'email', ''));
  END IF;
  RETURN jsonb_build_object('abonado', v_nuevo, 'total', v_total);
END;
$$;
REVOKE ALL ON FUNCTION public.ofi_cobrar(text, uuid, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ofi_cobrar(text, uuid, numeric, text) TO authenticated;
