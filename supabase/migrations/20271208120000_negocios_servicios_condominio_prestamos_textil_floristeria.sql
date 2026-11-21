-- NEGOCIOS 35 a 39 con vistas propias (flujo punta a punta: registro, cálculo, cobro a Caja y asiento contable)
--   srv_*  Servicios / citas (agenda por profesional, ficha, cobro y liquidación de honorarios)
--   cond_* Condominio (unidades, cuotas mensuales, mora y recaudo con recibo)
--   pre_*  Préstamos y cobranza (amortización, abonos capital/interés, cierre de cobradores)
--   tex_*  Taller textil (órdenes por talla/color, consumo de insumos, entregas parciales, costo por prenda)
--   flo_*  Floristería (arreglos con receta, venta que descuenta flores, entrega con dedicatoria)
-- Todo con owner_id = mi_negocio_id(), RLS estricto y sin borrado físico. Nada se borra ni trunca.

-- ============================================================
-- 0. Ayudas compartidas
-- ============================================================
CREATE OR REPLACE FUNCTION public.neg_asegurar(p_owner uuid, p_tipo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.pan_asegurar_cuenta(p_owner, p_tipo, '1105', 'Caja', 'activo');
  PERFORM public.pan_asegurar_cuenta(p_owner, p_tipo, '1110', 'Bancos', 'activo');
  PERFORM public.pan_asegurar_cuenta(p_owner, p_tipo, '1385', 'Cartera de préstamos', 'activo');
  PERFORM public.pan_asegurar_cuenta(p_owner, p_tipo, '4135', 'Ventas y servicios', 'ingreso');
  PERFORM public.pan_asegurar_cuenta(p_owner, p_tipo, '4210', 'Intereses y mora', 'ingreso');
  PERFORM public.pan_asegurar_cuenta(p_owner, p_tipo, '5205', 'Comisiones y honorarios', 'gasto');
END;
$$;
REVOKE ALL ON FUNCTION public.neg_asegurar(uuid, text) FROM public, anon, authenticated;

-- Movimiento de caja (y del turno abierto) sin duplicar asientos.
CREATE OR REPLACE FUNCTION public.neg_caja(p_owner uuid, p_tipo text, p_concepto text, p_ingreso boolean, p_monto numeric, p_metodo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_turno uuid;
  v_met text := CASE WHEN p_metodo = 'efectivo' THEN 'efectivo' WHEN p_metodo = 'tarjeta' THEN 'tarjeta' ELSE 'transferencia' END;
BEGIN
  IF p_monto <= 0 THEN RETURN; END IF;
  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (p_owner, p_tipo, CASE WHEN p_ingreso THEN 'ingreso' ELSE 'egreso' END, left(p_concepto || ' (' || p_metodo || ')', 200), p_monto);
  PERFORM set_config('gosaryc.pan', 'off', true);
  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = p_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (p_owner, v_turno, CASE WHEN p_ingreso THEN 'venta' ELSE 'gasto' END, v_met, left(p_concepto, 200), p_monto, coalesce(auth.jwt() ->> 'email', ''));
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.neg_caja(uuid, text, text, boolean, numeric, text) FROM public, anon, authenticated;

-- Impide cambiar a mano los campos que solo deben moverse desde la acción (cobro, entrega, venta).
CREATE OR REPLACE FUNCTION public.neg_proteger_campos()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE c text;
BEGIN
  IF coalesce(current_setting('gosaryc.neg', true), '') = 'on' THEN RETURN NEW; END IF;
  FOREACH c IN ARRAY TG_ARGV LOOP
    IF (to_jsonb(NEW) -> c) IS DISTINCT FROM (to_jsonb(OLD) -> c) THEN
      RAISE EXCEPTION 'El campo % solo cambia con la acción correspondiente.', c;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 1. Tablas
-- ============================================================
-- #35 Servicios / citas
CREATE TABLE IF NOT EXISTS public.srv_citas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  profesional text NOT NULL CHECK (length(trim(profesional)) >= 2),
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  telefono text,
  servicio text NOT NULL CHECK (length(trim(servicio)) >= 2),
  fecha date NOT NULL DEFAULT current_date,
  hora text NOT NULL DEFAULT '09:00',
  duracion_min integer NOT NULL DEFAULT 60 CHECK (duracion_min > 0 AND duracion_min <= 600),
  precio numeric NOT NULL DEFAULT 0 CHECK (precio >= 0),
  comision_pct numeric NOT NULL DEFAULT 0 CHECK (comision_pct >= 0 AND comision_pct <= 100),
  comision numeric NOT NULL DEFAULT 0 CHECK (comision >= 0),
  estado text NOT NULL DEFAULT 'agendada' CHECK (estado IN ('agendada', 'en_atencion', 'completada', 'cancelada')),
  ficha text,
  cobrada boolean NOT NULL DEFAULT false,
  metodo text,
  liquidada boolean NOT NULL DEFAULT false,
  liquidacion_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS srv_citas_owner_idx ON public.srv_citas (owner_id, fecha, profesional);

CREATE TABLE IF NOT EXISTS public.srv_liquidaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  profesional text NOT NULL,
  citas integer NOT NULL DEFAULT 0,
  total_comision numeric NOT NULL DEFAULT 0,
  metodo text NOT NULL DEFAULT 'efectivo',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- #36 Condominio
CREATE TABLE IF NOT EXISTS public.cond_unidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  unidad text NOT NULL CHECK (length(trim(unidad)) >= 1),
  propietario text NOT NULL CHECK (length(trim(propietario)) >= 2),
  telefono text,
  correo text,
  cuota numeric NOT NULL DEFAULT 0 CHECK (cuota >= 0),
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cond_unidades_unica_idx ON public.cond_unidades (owner_id, lower(unidad));

CREATE TABLE IF NOT EXISTS public.cond_cuotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  unidad_id uuid NOT NULL REFERENCES public.cond_unidades(id) ON DELETE RESTRICT,
  unidad text NOT NULL,
  propietario text NOT NULL,
  periodo text NOT NULL CHECK (periodo ~ '^[0-9]{4}-[0-9]{2}$'),
  valor numeric NOT NULL CHECK (valor >= 0),
  vence date NOT NULL,
  pagado numeric NOT NULL DEFAULT 0,
  mora numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada')),
  recibo text,
  metodo text,
  pagada_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS cond_cuotas_unica_idx ON public.cond_cuotas (unidad_id, periodo);
CREATE INDEX IF NOT EXISTS cond_cuotas_owner_idx ON public.cond_cuotas (owner_id, estado, vence);

-- #37 Préstamos y cobranza
CREATE TABLE IF NOT EXISTS public.pre_creditos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  telefono text,
  documento text,
  cobrador text,
  monto numeric NOT NULL CHECK (monto > 0),
  tasa_pct numeric NOT NULL DEFAULT 0 CHECK (tasa_pct >= 0 AND tasa_pct <= 30),
  frecuencia text NOT NULL CHECK (frecuencia IN ('diario', 'semanal', 'quincenal', 'mensual')),
  plazo integer NOT NULL CHECK (plazo >= 1 AND plazo <= 360),
  cuota numeric NOT NULL DEFAULT 0,
  total_interes numeric NOT NULL DEFAULT 0,
  saldo_capital numeric NOT NULL DEFAULT 0,
  fecha_inicio date NOT NULL DEFAULT current_date,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'pagado')),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pre_creditos_owner_idx ON public.pre_creditos (owner_id, estado);

CREATE TABLE IF NOT EXISTS public.pre_cuotas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  credito_id uuid NOT NULL REFERENCES public.pre_creditos(id) ON DELETE RESTRICT,
  numero integer NOT NULL,
  vence date NOT NULL,
  capital numeric NOT NULL DEFAULT 0,
  interes numeric NOT NULL DEFAULT 0,
  valor numeric NOT NULL DEFAULT 0,
  capital_pagado numeric NOT NULL DEFAULT 0,
  interes_pagado numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'parcial', 'pagada')),
  pagada_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pre_cuotas_credito_idx ON public.pre_cuotas (credito_id, numero);
CREATE INDEX IF NOT EXISTS pre_cuotas_owner_idx ON public.pre_cuotas (owner_id, estado, vence);

CREATE TABLE IF NOT EXISTS public.pre_abonos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  credito_id uuid NOT NULL REFERENCES public.pre_creditos(id) ON DELETE RESTRICT,
  cuota_id uuid NOT NULL REFERENCES public.pre_cuotas(id) ON DELETE RESTRICT,
  cobrador text NOT NULL DEFAULT 'Sin cobrador',
  monto numeric NOT NULL CHECK (monto > 0),
  capital numeric NOT NULL DEFAULT 0,
  interes numeric NOT NULL DEFAULT 0,
  metodo text NOT NULL DEFAULT 'efectivo',
  fecha date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pre_abonos_owner_idx ON public.pre_abonos (owner_id, fecha, cobrador);

CREATE TABLE IF NOT EXISTS public.pre_cierres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cobrador text NOT NULL,
  fecha date NOT NULL,
  esperado numeric NOT NULL DEFAULT 0,
  entregado numeric NOT NULL DEFAULT 0,
  diferencia numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS pre_cierres_unico_idx ON public.pre_cierres (owner_id, cobrador, fecha);

-- #38 Taller textil
CREATE TABLE IF NOT EXISTS public.tex_insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  unidad text NOT NULL DEFAULT 'm',
  stock numeric NOT NULL DEFAULT 0 CHECK (stock >= 0),
  costo numeric NOT NULL DEFAULT 0 CHECK (costo >= 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tex_ordenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  referencia text NOT NULL CHECK (length(trim(referencia)) >= 1),
  cliente text,
  color text,
  tallas jsonb NOT NULL DEFAULT '{}'::jsonb,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  precio_unit numeric NOT NULL DEFAULT 0 CHECK (precio_unit >= 0),
  mano_obra numeric NOT NULL DEFAULT 0 CHECK (mano_obra >= 0),
  costo_insumos numeric NOT NULL DEFAULT 0 CHECK (costo_insumos >= 0),
  entregadas integer NOT NULL DEFAULT 0 CHECK (entregadas >= 0),
  cobrado numeric NOT NULL DEFAULT 0 CHECK (cobrado >= 0),
  estado text NOT NULL DEFAULT 'corte' CHECK (estado IN ('corte', 'confeccion', 'terminada', 'entregada')),
  fecha_entrega date,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tex_ordenes_owner_idx ON public.tex_ordenes (owner_id, estado, created_at DESC);

CREATE TABLE IF NOT EXISTS public.tex_consumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  orden_id uuid NOT NULL REFERENCES public.tex_ordenes(id) ON DELETE RESTRICT,
  insumo_id uuid NOT NULL REFERENCES public.tex_insumos(id) ON DELETE RESTRICT,
  nombre text NOT NULL,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  costo numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tex_entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  orden_id uuid NOT NULL REFERENCES public.tex_ordenes(id) ON DELETE RESTRICT,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  valor numeric NOT NULL DEFAULT 0,
  metodo text NOT NULL DEFAULT 'efectivo',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- #39 Floristería
CREATE TABLE IF NOT EXISTS public.flo_flores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  categoria text NOT NULL DEFAULT 'flor' CHECK (categoria IN ('flor', 'follaje', 'base', 'accesorio')),
  stock numeric NOT NULL DEFAULT 0 CHECK (stock >= 0),
  costo numeric NOT NULL DEFAULT 0 CHECK (costo >= 0),
  vida_dias integer NOT NULL DEFAULT 7 CHECK (vida_dias >= 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flo_arreglos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  descripcion text,
  foto_ruta text,
  precio numeric NOT NULL DEFAULT 0 CHECK (precio >= 0),
  costo_armado numeric NOT NULL DEFAULT 0 CHECK (costo_armado >= 0),
  receta jsonb NOT NULL DEFAULT '[]'::jsonb,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.flo_encargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  arreglo_id uuid NOT NULL REFERENCES public.flo_arreglos(id) ON DELETE RESTRICT,
  arreglo text NOT NULL,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  cliente text NOT NULL,
  telefono text,
  destinatario text NOT NULL,
  direccion text,
  tarjeta text,
  fecha_entrega date NOT NULL,
  franja text NOT NULL DEFAULT 'Mañana (8 a 12)',
  total numeric NOT NULL DEFAULT 0,
  costo numeric NOT NULL DEFAULT 0,
  metodo text NOT NULL DEFAULT 'efectivo',
  estado text NOT NULL DEFAULT 'pedido' CHECK (estado IN ('pedido', 'armado', 'en_ruta', 'entregado')),
  repartidor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flo_encargos_owner_idx ON public.flo_encargos (owner_id, fecha_entrega, estado);

-- ============================================================
-- 2. RLS estricto, escritura directa solo donde corresponde, sin borrado físico
-- ============================================================
DO $$
DECLARE
  t text;
  todas text[] := ARRAY['srv_citas', 'srv_liquidaciones', 'cond_unidades', 'cond_cuotas', 'pre_creditos', 'pre_cuotas', 'pre_abonos',
                        'pre_cierres', 'tex_insumos', 'tex_ordenes', 'tex_consumos', 'tex_entregas', 'flo_flores', 'flo_arreglos', 'flo_encargos'];
  editables text[] := ARRAY['srv_citas', 'cond_unidades', 'tex_insumos', 'tex_ordenes', 'flo_flores', 'flo_arreglos', 'flo_encargos'];
BEGIN
  FOREACH t IN ARRAY todas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_leer', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_leer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_mi_negocio', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id())', t || '_solo_mi_negocio', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_tipo_actual', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual()) WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())', t || '_solo_tipo_actual', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM authenticated', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero()', t);
  END LOOP;

  FOREACH t IN ARRAY editables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_editar', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal()) WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_editar', t);
  END LOOP;
END $$;

-- Altas directas (sin campos de cobro ya marcados).
DROP POLICY IF EXISTS srv_citas_crear ON public.srv_citas;
CREATE POLICY srv_citas_crear ON public.srv_citas FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal()
              AND cobrada = false AND liquidada = false AND comision = 0 AND metodo IS NULL AND liquidacion_id IS NULL);
DROP POLICY IF EXISTS cond_unidades_crear ON public.cond_unidades;
CREATE POLICY cond_unidades_crear ON public.cond_unidades FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS tex_insumos_crear ON public.tex_insumos;
CREATE POLICY tex_insumos_crear ON public.tex_insumos FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS tex_ordenes_crear ON public.tex_ordenes;
CREATE POLICY tex_ordenes_crear ON public.tex_ordenes FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal() AND entregadas = 0 AND cobrado = 0 AND costo_insumos = 0 AND estado IN ('corte', 'confeccion'));
DROP POLICY IF EXISTS flo_flores_crear ON public.flo_flores;
CREATE POLICY flo_flores_crear ON public.flo_flores FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS flo_arreglos_crear ON public.flo_arreglos;
CREATE POLICY flo_arreglos_crear ON public.flo_arreglos FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

-- Campos que solo cambian desde su acción.
DROP TRIGGER IF EXISTS trg_srv_citas_proteger ON public.srv_citas;
CREATE TRIGGER trg_srv_citas_proteger BEFORE UPDATE ON public.srv_citas FOR EACH ROW
  EXECUTE FUNCTION public.neg_proteger_campos('precio', 'comision_pct', 'comision', 'cobrada', 'metodo', 'liquidada', 'liquidacion_id');
DROP TRIGGER IF EXISTS trg_tex_ordenes_proteger ON public.tex_ordenes;
CREATE TRIGGER trg_tex_ordenes_proteger BEFORE UPDATE ON public.tex_ordenes FOR EACH ROW
  EXECUTE FUNCTION public.neg_proteger_campos('cantidad', 'precio_unit', 'costo_insumos', 'entregadas', 'cobrado');
DROP TRIGGER IF EXISTS trg_flo_encargos_proteger ON public.flo_encargos;
CREATE TRIGGER trg_flo_encargos_proteger BEFORE UPDATE ON public.flo_encargos FOR EACH ROW
  EXECUTE FUNCTION public.neg_proteger_campos('arreglo_id', 'cantidad', 'total', 'costo', 'metodo');

-- ============================================================
-- 3. #35 Servicios: cobrar cita y liquidar honorarios
-- ============================================================
CREATE OR REPLACE FUNCTION public.srv_cobrar_cita(p_cita uuid, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  c record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_com numeric;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO c FROM public.srv_citas WHERE id = p_cita AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La cita ya no existe.'; END IF;
  IF c.cobrada THEN RAISE EXCEPTION 'Esta cita ya fue cobrada.'; END IF;
  IF c.estado <> 'completada' THEN RAISE EXCEPTION 'Marca la cita como Completada antes de cobrarla.'; END IF;
  IF c.precio <= 0 THEN RAISE EXCEPTION 'La cita no tiene valor para cobrar.'; END IF;
  v_com := round(c.precio * c.comision_pct / 100);

  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.srv_citas SET cobrada = true, metodo = v_metodo, comision = v_com WHERE id = c.id;

  BEGIN
    PERFORM public.neg_asegurar(v_owner, c.tipo_negocio);
    PERFORM public.registrar_asiento_movimiento(v_owner, c.tipo_negocio, 'Servicio: ' || c.servicio || ' · ' || c.cliente, 'srv_cita', c.id,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', c.precio),
                        jsonb_build_object('codigo', '4135', 'haber', c.precio)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento de la cita %: %', c.id, SQLERRM;
  END;
  PERFORM public.neg_caja(v_owner, c.tipo_negocio, 'Servicio: ' || c.servicio || ' · ' || c.cliente, true, c.precio, v_metodo);
  RETURN jsonb_build_object('cobrado', c.precio, 'comision', v_com);
END;
$$;
REVOKE ALL ON FUNCTION public.srv_cobrar_cita(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.srv_cobrar_cita(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.srv_liquidar(p_profesional text, p_metodo text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_prof text := nullif(trim(p_profesional), '');
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_tipo text := public.tipo_negocio_actual();
  v_total numeric := 0;
  v_n integer := 0;
  v_liq uuid := gen_random_uuid();
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF NOT public.es_admin() THEN RAISE EXCEPTION 'Solo el dueño liquida honorarios.'; END IF;
  IF v_prof IS NULL THEN RAISE EXCEPTION 'Elige el profesional.'; END IF;
  SELECT coalesce(sum(comision), 0), count(*) INTO v_total, v_n FROM public.srv_citas
   WHERE owner_id = v_owner AND profesional = v_prof AND cobrada AND NOT liquidada AND comision > 0;
  IF v_total <= 0 THEN RAISE EXCEPTION 'No hay honorarios pendientes para este profesional.'; END IF;

  INSERT INTO public.srv_liquidaciones (id, owner_id, tipo_negocio, profesional, citas, total_comision, metodo)
  VALUES (v_liq, v_owner, v_tipo, v_prof, v_n, v_total, v_metodo);
  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.srv_citas SET liquidada = true, liquidacion_id = v_liq
   WHERE owner_id = v_owner AND profesional = v_prof AND cobrada AND NOT liquidada AND comision > 0;

  BEGIN
    PERFORM public.neg_asegurar(v_owner, v_tipo);
    PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo, 'Honorarios ' || v_prof, 'srv_liquidacion', v_liq,
      jsonb_build_array(jsonb_build_object('codigo', '5205', 'debe', v_total),
                        jsonb_build_object('codigo', v_cuenta, 'haber', v_total)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento de honorarios: %', SQLERRM;
  END;
  PERFORM public.neg_caja(v_owner, v_tipo, 'Honorarios ' || v_prof, false, v_total, v_metodo);
  RETURN v_total;
END;
$$;
REVOKE ALL ON FUNCTION public.srv_liquidar(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.srv_liquidar(text, text) TO authenticated;

-- ============================================================
-- 4. #36 Condominio: generar cuotas del mes y cobrar con mora
-- ============================================================
CREATE OR REPLACE FUNCTION public.cond_generar_cuotas(p_periodo text, p_vence date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v_n integer := 0;
  v_total numeric := 0;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF NOT public.es_admin() THEN RAISE EXCEPTION 'Solo el administrador genera cuotas.'; END IF;
  IF p_periodo IS NULL OR p_periodo !~ '^[0-9]{4}-[0-9]{2}$' THEN RAISE EXCEPTION 'Periodo inválido (usa AAAA-MM).'; END IF;
  IF p_vence IS NULL THEN RAISE EXCEPTION 'Indica la fecha de vencimiento.'; END IF;

  WITH nuevas AS (
    INSERT INTO public.cond_cuotas (owner_id, tipo_negocio, unidad_id, unidad, propietario, periodo, valor, vence)
    SELECT v_owner, v_tipo, u.id, u.unidad, u.propietario, p_periodo, u.cuota, p_vence
      FROM public.cond_unidades u
     WHERE u.owner_id = v_owner AND u.activa AND u.cuota > 0
       AND NOT EXISTS (SELECT 1 FROM public.cond_cuotas q WHERE q.unidad_id = u.id AND q.periodo = p_periodo)
    RETURNING valor
  )
  SELECT count(*), coalesce(sum(valor), 0) INTO v_n, v_total FROM nuevas;
  IF v_n = 0 THEN RAISE EXCEPTION 'No hay cuotas nuevas: todas las unidades activas ya tienen la de %.', p_periodo; END IF;

  BEGIN
    PERFORM public.neg_asegurar(v_owner, v_tipo);
    PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo, 'Cuotas de administración ' || p_periodo, 'cond_cuotas', gen_random_uuid(),
      jsonb_build_array(jsonb_build_object('codigo', '1305', 'debe', v_total),
                        jsonb_build_object('codigo', '4135', 'haber', v_total)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento de cuotas: %', SQLERRM;
  END;
  RETURN jsonb_build_object('cuotas', v_n, 'total', v_total);
END;
$$;
REVOKE ALL ON FUNCTION public.cond_generar_cuotas(text, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cond_generar_cuotas(text, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.cond_cobrar_cuota(p_cuota uuid, p_metodo text, p_tasa numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  c record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_tasa numeric := least(greatest(coalesce(p_tasa, 0), 0), 3);
  v_dias integer;
  v_mora numeric;
  v_recibo text;
  v_lineas jsonb;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO c FROM public.cond_cuotas WHERE id = p_cuota AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La cuota ya no existe.'; END IF;
  IF c.estado = 'pagada' THEN RAISE EXCEPTION 'Esta cuota ya fue pagada.'; END IF;
  v_dias := greatest(current_date - c.vence, 0);
  v_mora := round(c.valor * v_tasa / 100 * v_dias / 30.0);
  v_recibo := 'R-' || to_char(now(), 'YYMM') || '-' || upper(left(c.id::text, 5));

  UPDATE public.cond_cuotas
     SET estado = 'pagada', pagado = c.valor, mora = v_mora, recibo = v_recibo, metodo = v_metodo, pagada_en = now()
   WHERE id = c.id;

  BEGIN
    PERFORM public.neg_asegurar(v_owner, c.tipo_negocio);
    v_lineas := jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', c.valor + v_mora),
                                  jsonb_build_object('codigo', '1305', 'haber', c.valor));
    IF v_mora > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '4210', 'haber', v_mora)); END IF;
    PERFORM public.registrar_asiento_movimiento(v_owner, c.tipo_negocio, 'Recaudo ' || c.unidad || ' ' || c.periodo, 'cond_cuota', c.id, v_lineas);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento del recaudo %: %', c.id, SQLERRM;
  END;
  PERFORM public.neg_caja(v_owner, c.tipo_negocio, 'Recaudo ' || c.unidad || ' ' || c.periodo || ' · ' || v_recibo, true, c.valor + v_mora, v_metodo);
  RETURN jsonb_build_object('recibo', v_recibo, 'valor', c.valor, 'mora', v_mora, 'dias_mora', v_dias, 'total', c.valor + v_mora);
END;
$$;
REVOKE ALL ON FUNCTION public.cond_cobrar_cuota(uuid, text, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cond_cobrar_cuota(uuid, text, numeric) TO authenticated;

-- ============================================================
-- 5. #37 Préstamos: crear con amortización, abonar (interés primero) y cerrar el día
-- ============================================================
CREATE OR REPLACE FUNCTION public.pre_crear(
  p_cliente text, p_telefono text, p_documento text, p_cobrador text, p_monto numeric, p_tasa numeric,
  p_frecuencia text, p_plazo integer, p_inicio date, p_metodo text, p_notas text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v_id uuid := gen_random_uuid();
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_monto numeric := round(coalesce(p_monto, 0));
  v_i numeric;
  v_cuota numeric;
  v_saldo numeric;
  v_int numeric;
  v_cap numeric;
  v_totint numeric := 0;
  v_ini date := coalesce(p_inicio, current_date);
  v_vence date;
  k integer;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF nullif(trim(coalesce(p_cliente, '')), '') IS NULL THEN RAISE EXCEPTION 'Escribe el cliente.'; END IF;
  IF v_monto <= 0 THEN RAISE EXCEPTION 'El monto debe ser mayor a cero.'; END IF;
  IF p_tasa IS NULL OR p_tasa < 0 OR p_tasa > 30 THEN RAISE EXCEPTION 'La tasa mensual debe estar entre 0 y 30 %%.'; END IF;
  IF p_frecuencia NOT IN ('diario', 'semanal', 'quincenal', 'mensual') THEN RAISE EXCEPTION 'Frecuencia inválida.'; END IF;
  IF p_plazo IS NULL OR p_plazo < 1 OR p_plazo > 360 THEN RAISE EXCEPTION 'El plazo debe estar entre 1 y 360 cuotas.'; END IF;

  v_i := p_tasa / 100 * CASE p_frecuencia WHEN 'diario' THEN 1.0 / 30 WHEN 'semanal' THEN 7.0 / 30 WHEN 'quincenal' THEN 0.5 ELSE 1 END;
  IF v_i = 0 THEN v_cuota := round(v_monto / p_plazo);
  ELSE v_cuota := round(v_monto * v_i / (1 - power(1 + v_i, -p_plazo)));
  END IF;

  INSERT INTO public.pre_creditos (id, owner_id, tipo_negocio, cliente, telefono, documento, cobrador, monto, tasa_pct, frecuencia, plazo, cuota, saldo_capital, fecha_inicio, notas)
  VALUES (v_id, v_owner, v_tipo, trim(p_cliente), nullif(trim(coalesce(p_telefono, '')), ''), nullif(trim(coalesce(p_documento, '')), ''),
          nullif(trim(coalesce(p_cobrador, '')), ''), v_monto, p_tasa, p_frecuencia, p_plazo, v_cuota, v_monto, v_ini, nullif(trim(coalesce(p_notas, '')), ''));

  v_saldo := v_monto;
  FOR k IN 1..p_plazo LOOP
    v_int := round(v_saldo * v_i);
    IF k = p_plazo THEN v_cap := v_saldo; ELSE v_cap := greatest(least(v_cuota - v_int, v_saldo), 0); END IF;
    v_vence := CASE p_frecuencia
      WHEN 'diario' THEN v_ini + k
      WHEN 'semanal' THEN v_ini + 7 * k
      WHEN 'quincenal' THEN v_ini + 15 * k
      ELSE (v_ini + (k || ' months')::interval)::date END;
    INSERT INTO public.pre_cuotas (owner_id, tipo_negocio, credito_id, numero, vence, capital, interes, valor)
    VALUES (v_owner, v_tipo, v_id, k, v_vence, v_cap, v_int, v_cap + v_int);
    v_saldo := v_saldo - v_cap;
    v_totint := v_totint + v_int;
  END LOOP;
  UPDATE public.pre_creditos SET total_interes = v_totint WHERE id = v_id;

  BEGIN
    PERFORM public.neg_asegurar(v_owner, v_tipo);
    PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo, 'Desembolso préstamo ' || trim(p_cliente), 'pre_credito', v_id,
      jsonb_build_array(jsonb_build_object('codigo', '1385', 'debe', v_monto),
                        jsonb_build_object('codigo', v_cuenta, 'haber', v_monto)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento del desembolso: %', SQLERRM;
  END;
  PERFORM public.neg_caja(v_owner, v_tipo, 'Desembolso préstamo ' || trim(p_cliente), false, v_monto, v_metodo);
  RETURN jsonb_build_object('id', v_id, 'cuota', v_cuota, 'total_interes', v_totint);
END;
$$;
REVOKE ALL ON FUNCTION public.pre_crear(text, text, text, text, numeric, numeric, text, integer, date, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pre_crear(text, text, text, text, numeric, numeric, text, integer, date, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.pre_abonar(p_cuota uuid, p_monto numeric, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  c record;
  cr record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_monto numeric := round(coalesce(p_monto, 0));
  v_pend numeric;
  v_ai numeric;
  v_ac numeric;
  v_lineas jsonb;
  v_cobrador text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF v_monto <= 0 THEN RAISE EXCEPTION 'Escribe el valor del abono.'; END IF;
  SELECT * INTO c FROM public.pre_cuotas WHERE id = p_cuota AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La cuota ya no existe.'; END IF;
  IF c.estado = 'pagada' THEN RAISE EXCEPTION 'Esta cuota ya está pagada.'; END IF;
  SELECT * INTO cr FROM public.pre_creditos WHERE id = c.credito_id AND owner_id = v_owner FOR UPDATE;
  v_pend := c.valor - c.capital_pagado - c.interes_pagado;
  IF v_monto > v_pend THEN RAISE EXCEPTION 'El abono no puede superar el saldo de la cuota (%).', v_pend; END IF;
  v_ai := least(v_monto, c.interes - c.interes_pagado);
  v_ac := v_monto - v_ai;
  v_cobrador := coalesce(cr.cobrador, 'Sin cobrador');

  UPDATE public.pre_cuotas
     SET interes_pagado = interes_pagado + v_ai, capital_pagado = capital_pagado + v_ac,
         estado = CASE WHEN (capital_pagado + v_ac + interes_pagado + v_ai) >= valor THEN 'pagada' ELSE 'parcial' END,
         pagada_en = CASE WHEN (capital_pagado + v_ac + interes_pagado + v_ai) >= valor THEN now() ELSE pagada_en END
   WHERE id = c.id;
  UPDATE public.pre_creditos SET saldo_capital = greatest(saldo_capital - v_ac, 0) WHERE id = cr.id;
  IF NOT EXISTS (SELECT 1 FROM public.pre_cuotas WHERE credito_id = cr.id AND estado <> 'pagada') THEN
    UPDATE public.pre_creditos SET estado = 'pagado' WHERE id = cr.id;
  END IF;
  INSERT INTO public.pre_abonos (owner_id, tipo_negocio, credito_id, cuota_id, cobrador, monto, capital, interes, metodo)
  VALUES (v_owner, cr.tipo_negocio, cr.id, c.id, v_cobrador, v_monto, v_ac, v_ai, v_metodo);

  BEGIN
    PERFORM public.neg_asegurar(v_owner, cr.tipo_negocio);
    v_lineas := jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_monto));
    IF v_ac > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '1385', 'haber', v_ac)); END IF;
    IF v_ai > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '4210', 'haber', v_ai)); END IF;
    PERFORM public.registrar_asiento_movimiento(v_owner, cr.tipo_negocio, 'Abono ' || cr.cliente || ' cuota ' || c.numero, 'pre_abono', c.id, v_lineas);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento del abono: %', SQLERRM;
  END;
  PERFORM public.neg_caja(v_owner, cr.tipo_negocio, 'Abono ' || cr.cliente || ' cuota ' || c.numero, true, v_monto, v_metodo);
  RETURN jsonb_build_object('capital', v_ac, 'interes', v_ai);
END;
$$;
REVOKE ALL ON FUNCTION public.pre_abonar(uuid, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pre_abonar(uuid, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.pre_cerrar_dia(p_cobrador text, p_fecha date, p_entregado numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_cob text := coalesce(nullif(trim(p_cobrador), ''), 'Sin cobrador');
  v_fecha date := coalesce(p_fecha, current_date);
  v_esp numeric;
  v_ent numeric := round(coalesce(p_entregado, 0));
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF v_ent < 0 THEN RAISE EXCEPTION 'El valor entregado no puede ser negativo.'; END IF;
  IF EXISTS (SELECT 1 FROM public.pre_cierres WHERE owner_id = v_owner AND cobrador = v_cob AND fecha = v_fecha) THEN
    RAISE EXCEPTION 'Ese cobrador ya cerró el día %.', v_fecha;
  END IF;
  SELECT coalesce(sum(monto), 0) INTO v_esp FROM public.pre_abonos
   WHERE owner_id = v_owner AND cobrador = v_cob AND fecha = v_fecha AND metodo = 'efectivo';
  INSERT INTO public.pre_cierres (owner_id, tipo_negocio, cobrador, fecha, esperado, entregado, diferencia)
  VALUES (v_owner, public.tipo_negocio_actual(), v_cob, v_fecha, v_esp, v_ent, v_ent - v_esp);
  RETURN jsonb_build_object('esperado', v_esp, 'entregado', v_ent, 'diferencia', v_ent - v_esp);
END;
$$;
REVOKE ALL ON FUNCTION public.pre_cerrar_dia(text, date, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pre_cerrar_dia(text, date, numeric) TO authenticated;

-- ============================================================
-- 6. #38 Taller textil: consumir insumos y entregar por partes
-- ============================================================
CREATE OR REPLACE FUNCTION public.tex_consumir(p_orden uuid, p_insumo uuid, p_cantidad numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  o record;
  i record;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Escribe la cantidad a consumir.'; END IF;
  SELECT * INTO o FROM public.tex_ordenes WHERE id = p_orden AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La orden ya no existe.'; END IF;
  IF o.estado = 'entregada' THEN RAISE EXCEPTION 'La orden ya fue entregada.'; END IF;
  SELECT * INTO i FROM public.tex_insumos WHERE id = p_insumo AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El insumo ya no existe.'; END IF;
  IF i.stock < p_cantidad THEN RAISE EXCEPTION 'No alcanza %: hay % y se piden %.', i.nombre, i.stock, p_cantidad; END IF;
  UPDATE public.tex_insumos SET stock = stock - p_cantidad WHERE id = i.id;
  INSERT INTO public.tex_consumos (owner_id, tipo_negocio, orden_id, insumo_id, nombre, cantidad, costo)
  VALUES (v_owner, o.tipo_negocio, o.id, i.id, i.nombre, p_cantidad, i.costo);
  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.tex_ordenes SET costo_insumos = costo_insumos + round(p_cantidad * i.costo) WHERE id = o.id;
  RETURN jsonb_build_object('costo', round(p_cantidad * i.costo));
END;
$$;
REVOKE ALL ON FUNCTION public.tex_consumir(uuid, uuid, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.tex_consumir(uuid, uuid, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.tex_entregar(p_orden uuid, p_cantidad integer, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  o record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_valor numeric;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Escribe cuántas prendas entregas.'; END IF;
  SELECT * INTO o FROM public.tex_ordenes WHERE id = p_orden AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La orden ya no existe.'; END IF;
  IF o.entregadas + p_cantidad > o.cantidad THEN RAISE EXCEPTION 'Solo quedan % prendas por entregar.', o.cantidad - o.entregadas; END IF;
  v_valor := round(p_cantidad * o.precio_unit);
  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.tex_ordenes
     SET entregadas = entregadas + p_cantidad, cobrado = cobrado + v_valor,
         estado = CASE WHEN entregadas + p_cantidad >= cantidad THEN 'entregada' ELSE 'terminada' END
   WHERE id = o.id;
  INSERT INTO public.tex_entregas (owner_id, tipo_negocio, orden_id, cantidad, valor, metodo)
  VALUES (v_owner, o.tipo_negocio, o.id, p_cantidad, v_valor, v_metodo);

  IF v_valor > 0 THEN
    BEGIN
      PERFORM public.neg_asegurar(v_owner, o.tipo_negocio);
      PERFORM public.registrar_asiento_movimiento(v_owner, o.tipo_negocio, 'Entrega ' || o.referencia || ' (' || p_cantidad || ' prendas)', 'tex_entrega', o.id,
        jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_valor),
                          jsonb_build_object('codigo', '4135', 'haber', v_valor)));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'No se pudo registrar el asiento de la entrega: %', SQLERRM;
    END;
    PERFORM public.neg_caja(v_owner, o.tipo_negocio, 'Entrega ' || o.referencia || ' (' || p_cantidad || ' prendas)', true, v_valor, v_metodo);
  END IF;
  RETURN jsonb_build_object('cobrado', v_valor, 'pendientes', o.cantidad - o.entregadas - p_cantidad);
END;
$$;
REVOKE ALL ON FUNCTION public.tex_entregar(uuid, integer, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.tex_entregar(uuid, integer, text) TO authenticated;

-- ============================================================
-- 7. #39 Floristería: vender un arreglo descuenta flores y bases de su receta
-- ============================================================
CREATE OR REPLACE FUNCTION public.flo_vender(
  p_arreglo uuid, p_cantidad integer, p_cliente text, p_telefono text, p_destinatario text, p_direccion text,
  p_tarjeta text, p_fecha date, p_franja text, p_metodo text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  a record;
  f record;
  it jsonb;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_need numeric;
  v_costo numeric := 0;
  v_total numeric;
  v_id uuid := gen_random_uuid();
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Escribe la cantidad.'; END IF;
  IF nullif(trim(coalesce(p_cliente, '')), '') IS NULL THEN RAISE EXCEPTION 'Escribe quién compra.'; END IF;
  IF nullif(trim(coalesce(p_destinatario, '')), '') IS NULL THEN RAISE EXCEPTION 'Escribe quién recibe.'; END IF;
  IF p_fecha IS NULL THEN RAISE EXCEPTION 'Elige la fecha de entrega.'; END IF;
  SELECT * INTO a FROM public.flo_arreglos WHERE id = p_arreglo AND owner_id = v_owner AND activo;
  IF NOT FOUND THEN RAISE EXCEPTION 'El arreglo ya no está disponible.'; END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(a.receta) LOOP
    v_need := coalesce((it ->> 'cantidad')::numeric, 0) * p_cantidad;
    IF v_need <= 0 THEN CONTINUE; END IF;
    UPDATE public.flo_flores SET stock = stock - v_need
     WHERE id = (it ->> 'flor_id')::uuid AND owner_id = v_owner AND stock >= v_need
    RETURNING costo, nombre INTO f;
    IF NOT FOUND THEN
      SELECT nombre, stock INTO f FROM public.flo_flores WHERE id = (it ->> 'flor_id')::uuid AND owner_id = v_owner;
      RAISE EXCEPTION 'No alcanzan las existencias de % (se necesitan %).', coalesce(f.nombre, 'un ingrediente'), v_need;
    END IF;
    v_costo := v_costo + f.costo * v_need;
  END LOOP;
  v_costo := round(v_costo + a.costo_armado * p_cantidad);
  v_total := round(a.precio * p_cantidad);

  INSERT INTO public.flo_encargos (id, owner_id, tipo_negocio, arreglo_id, arreglo, cantidad, cliente, telefono, destinatario, direccion, tarjeta,
                                   fecha_entrega, franja, total, costo, metodo)
  VALUES (v_id, v_owner, a.tipo_negocio, a.id, a.nombre, p_cantidad, trim(p_cliente), nullif(trim(coalesce(p_telefono, '')), ''), trim(p_destinatario),
          nullif(trim(coalesce(p_direccion, '')), ''), nullif(trim(coalesce(p_tarjeta, '')), ''), p_fecha,
          coalesce(nullif(trim(p_franja), ''), 'Mañana (8 a 12)'), v_total, v_costo, v_metodo);

  IF v_total > 0 THEN
    BEGIN
      PERFORM public.neg_asegurar(v_owner, a.tipo_negocio);
      PERFORM public.registrar_asiento_movimiento(v_owner, a.tipo_negocio, 'Venta ' || a.nombre || ' x' || p_cantidad, 'flo_encargo', v_id,
        jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_total),
                          jsonb_build_object('codigo', '4135', 'haber', v_total)));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'No se pudo registrar el asiento de la venta %: %', v_id, SQLERRM;
    END;
    PERFORM public.neg_caja(v_owner, a.tipo_negocio, 'Venta ' || a.nombre || ' x' || p_cantidad, true, v_total, v_metodo);
  END IF;
  RETURN jsonb_build_object('id', v_id, 'total', v_total, 'costo', v_costo);
END;
$$;
REVOKE ALL ON FUNCTION public.flo_vender(uuid, integer, text, text, text, text, text, date, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.flo_vender(uuid, integer, text, text, text, text, text, date, text, text) TO authenticated;
