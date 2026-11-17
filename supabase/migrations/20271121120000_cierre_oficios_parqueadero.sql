-- PROMPT #10 — CIERRE COMERCIAL (parte 2): oficios y parqueadero con cobro a Caja.
-- Lavandería, servicios profesionales, agencia digital, papelería, joyería,
-- licorera (con verificación de edad) y parqueadero por horas. Todo con
-- owner_id = mi_negocio_id(), RLS estricto y cobro central a Caja y Contabilidad.
-- No borra ni trunca datos.

-- ============================================================
-- 1. Tablas propias de oficios y parqueadero
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lav_ordenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  telefono text,
  prendas text NOT NULL CHECK (length(trim(prendas)) >= 2),
  total numeric NOT NULL CHECK (total >= 0),
  abono numeric NOT NULL DEFAULT 0 CHECK (abono >= 0),
  estado text NOT NULL DEFAULT 'recibida' CHECK (estado IN ('recibida', 'en_proceso', 'lista', 'cobrado')),
  entrega date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lav_ord_owner_idx ON public.lav_ordenes (owner_id, estado);

CREATE TABLE IF NOT EXISTS public.prof_casos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  telefono text,
  asunto text NOT NULL CHECK (length(trim(asunto)) >= 3),
  honorarios numeric NOT NULL CHECK (honorarios >= 0),
  abono numeric NOT NULL DEFAULT 0 CHECK (abono >= 0),
  estado text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'en_proceso', 'cobrado')),
  vence date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS prof_cas_owner_idx ON public.prof_casos (owner_id, estado);

CREATE TABLE IF NOT EXISTS public.tec_proyectos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  telefono text,
  alcance text NOT NULL CHECK (length(trim(alcance)) >= 3),
  valor numeric NOT NULL CHECK (valor >= 0),
  horas numeric NOT NULL DEFAULT 0 CHECK (horas >= 0),
  abono numeric NOT NULL DEFAULT 0 CHECK (abono >= 0),
  estado text NOT NULL DEFAULT 'cotizado' CHECK (estado IN ('cotizado', 'en_proceso', 'entregado', 'cobrado')),
  entrega date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pap_encargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  telefono text,
  detalle text NOT NULL CHECK (length(trim(detalle)) >= 3),
  valor numeric NOT NULL CHECK (valor >= 0),
  abono numeric NOT NULL DEFAULT 0 CHECK (abono >= 0),
  estado text NOT NULL DEFAULT 'recibido' CHECK (estado IN ('recibido', 'produccion', 'lista', 'cobrado')),
  entrega date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.joy_piezas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  descripcion text NOT NULL CHECK (length(trim(descripcion)) >= 3),
  material text,
  peso text,
  precio numeric NOT NULL CHECK (precio >= 0),
  cliente text,
  telefono text,
  abono numeric NOT NULL DEFAULT 0 CHECK (abono >= 0),
  estado text NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'apartada', 'cobrado')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS joy_pie_owner_idx ON public.joy_piezas (owner_id, estado);

CREATE TABLE IF NOT EXISTS public.lic_domicilios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  telefono text,
  documento text,
  edad_ok boolean NOT NULL DEFAULT false,
  pedido text NOT NULL CHECK (length(trim(pedido)) >= 2),
  total numeric NOT NULL CHECK (total >= 0),
  abono numeric NOT NULL DEFAULT 0 CHECK (abono >= 0),
  estado text NOT NULL DEFAULT 'recibido' CHECK (estado IN ('recibido', 'en_ruta', 'cobrado')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.parq_turnos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  placa text NOT NULL CHECK (length(trim(placa)) >= 3),
  entrada timestamptz NOT NULL DEFAULT now(),
  salida timestamptz,
  horas numeric NOT NULL DEFAULT 0 CHECK (horas >= 0),
  tarifa numeric NOT NULL CHECK (tarifa >= 0),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  abono numeric NOT NULL DEFAULT 0 CHECK (abono >= 0),
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cobrado')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS parq_tur_owner_idx ON public.parq_turnos (owner_id, estado);

-- ============================================================
-- 2. RLS estricto + sin borrado físico
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['lav_ordenes','prof_casos','tec_proyectos','pap_encargos','joy_piezas','lic_domicilios','parq_turnos'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_leer', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_leer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_mi_negocio', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id())', t || '_solo_mi_negocio', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_tipo_actual', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual()) WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())', t || '_solo_tipo_actual', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_crear', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_crear', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_editar', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal()) WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_editar', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero()', t);
  END LOOP;
END $$;

-- ============================================================
-- 3. Cobro único de oficios y parqueadero (entra a Caja y Contabilidad)
-- ============================================================
CREATE OR REPLACE FUNCTION public.ofi_cobrar(p_tabla text, p_id uuid, p_valor numeric, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_col text := CASE p_tabla
    WHEN 'lav_ordenes' THEN 'total'
    WHEN 'prof_casos' THEN 'honorarios'
    WHEN 'tec_proyectos' THEN 'valor'
    WHEN 'pap_encargos' THEN 'valor'
    WHEN 'joy_piezas' THEN 'precio'
    WHEN 'lic_domicilios' THEN 'total'
    WHEN 'parq_turnos' THEN 'total'
    ELSE NULL END;
  v_etiqueta text := CASE p_tabla
    WHEN 'lav_ordenes' THEN 'Lavandería'
    WHEN 'prof_casos' THEN 'Honorarios'
    WHEN 'tec_proyectos' THEN 'Proyecto'
    WHEN 'pap_encargos' THEN 'Encargo'
    WHEN 'joy_piezas' THEN 'Joyería'
    WHEN 'lic_domicilios' THEN 'Domicilio licorera'
    WHEN 'parq_turnos' THEN 'Parqueadero'
    ELSE 'Cobro' END;
  v_row_owner uuid;
  v_tipo text;
  v_total numeric;
  v_abono numeric;
  v_cliente text;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  v_turno uuid;
  v_nuevo numeric;
  v_concepto text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Módulo no válido.'; END IF;
  IF p_valor IS NULL OR p_valor <= 0 THEN RAISE EXCEPTION 'El abono debe ser mayor a cero.'; END IF;

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
    EXECUTE format('SELECT owner_id, tipo_negocio, %I, abono, cliente FROM public.%I WHERE id = $1 FOR UPDATE', v_col, p_tabla)
      USING p_id INTO v_row_owner, v_tipo, v_total, v_abono, v_cliente;
    IF v_row_owner IS NULL THEN RAISE EXCEPTION 'El registro ya no existe.'; END IF;
    IF v_row_owner IS DISTINCT FROM v_owner THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
    IF p_tabla = 'lic_domicilios' THEN
      PERFORM 1 FROM public.lic_domicilios WHERE id = p_id AND edad_ok = true;
      IF NOT FOUND THEN RAISE EXCEPTION 'Verifica la mayoría de edad con el documento antes de cobrar.'; END IF;
    END IF;
    IF v_abono + p_valor > v_total THEN RAISE EXCEPTION 'El abono supera el total.'; END IF;
    v_nuevo := v_abono + p_valor;
    EXECUTE format('UPDATE public.%I SET abono = $1, estado = CASE WHEN $1 >= %I THEN ''cobrado'' ELSE estado END WHERE id = $2', p_tabla, v_col)
      USING v_nuevo, p_id;
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
