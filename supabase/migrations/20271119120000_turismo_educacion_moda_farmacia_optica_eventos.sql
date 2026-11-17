-- PROMPT #9 — HOTEL/HOSPEDAJE, EDUCACIÓN, MODA/TALLA-COLOR, FARMACIA, ÓPTICA Y EVENTOS
-- Rack de habitaciones con check-in/out, matrículas y pensiones, matriz talla/color,
-- control de fórmula/INVIMA/frío, fórmulas ópticas con laboratorio y eventos con
-- reserva de salón sin cruces. Todo con owner_id = mi_negocio_id() y RLS estricto.
-- No borra ni trunca datos.

-- ============================================================
-- 1. Hotel y hospedaje
-- ============================================================
CREATE TABLE IF NOT EXISTS public.hot_habitaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  numero text NOT NULL CHECK (length(trim(numero)) >= 1),
  tipo_hab text NOT NULL DEFAULT 'estandar' CHECK (tipo_hab IN ('estandar', 'doble', 'suite', 'familiar', 'cabaña')),
  tarifa numeric NOT NULL DEFAULT 0 CHECK (tarifa >= 0),
  estado text NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'ocupada', 'reservada', 'limpieza', 'mantenimiento')),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hot_hab_owner_idx ON public.hot_habitaciones (owner_id, estado);

CREATE TABLE IF NOT EXISTS public.hot_huespedes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  documento text,
  telefono text,
  acompanantes integer NOT NULL DEFAULT 0 CHECK (acompanantes >= 0),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hot_hue_owner_idx ON public.hot_huespedes (owner_id, nombre);

CREATE TABLE IF NOT EXISTS public.hot_reservas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  habitacion_id uuid NOT NULL REFERENCES public.hot_habitaciones(id) ON DELETE RESTRICT,
  huesped text NOT NULL CHECK (length(trim(huesped)) >= 2),
  documento text,
  telefono text,
  acompanantes integer NOT NULL DEFAULT 0 CHECK (acompanantes >= 0),
  fecha_in date NOT NULL DEFAULT current_date,
  fecha_out date NOT NULL DEFAULT current_date,
  anticipo numeric NOT NULL DEFAULT 0 CHECK (anticipo >= 0),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  estado text NOT NULL DEFAULT 'reservada' CHECK (estado IN ('reservada', 'ocupada', 'finalizada', 'cancelada')),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (fecha_out >= fecha_in)
);
CREATE INDEX IF NOT EXISTS hot_res_hab_idx ON public.hot_reservas (habitacion_id, estado);

CREATE TABLE IF NOT EXISTS public.hot_cargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  reserva_id uuid NOT NULL REFERENCES public.hot_reservas(id) ON DELETE RESTRICT,
  concepto text NOT NULL CHECK (length(trim(concepto)) >= 2),
  rubro text NOT NULL DEFAULT 'minibar' CHECK (rubro IN ('minibar', 'lavanderia', 'restaurante', 'tour', 'otro')),
  valor numeric NOT NULL CHECK (valor > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hot_cargos_res_idx ON public.hot_cargos (reserva_id);

-- ============================================================
-- 2. Educación: estudiantes, pensiones, asistencia y notas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.edu_estudiantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  documento text,
  grado text NOT NULL DEFAULT 'primero' CHECK (length(trim(grado)) >= 1),
  grupo text,
  acudiente text,
  telefono_acu text,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'retirado', 'egresado')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS edu_est_owner_idx ON public.edu_estudiantes (owner_id, estado);

CREATE TABLE IF NOT EXISTS public.edu_pensiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  estudiante_id uuid NOT NULL REFERENCES public.edu_estudiantes(id) ON DELETE RESTRICT,
  concepto text NOT NULL DEFAULT 'Pensión mensual',
  periodo text NOT NULL CHECK (length(trim(periodo)) >= 3),
  valor numeric NOT NULL CHECK (valor >= 0),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada')),
  fecha_vence date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS edu_pen_est_idx ON public.edu_pensiones (estudiante_id, estado);

CREATE TABLE IF NOT EXISTS public.edu_asistencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  estudiante_id uuid NOT NULL REFERENCES public.edu_estudiantes(id) ON DELETE RESTRICT,
  fecha date NOT NULL DEFAULT current_date,
  presente boolean NOT NULL DEFAULT true,
  nota text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS edu_asi_est_idx ON public.edu_asistencia (estudiante_id, fecha DESC);

CREATE TABLE IF NOT EXISTS public.edu_notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  estudiante_id uuid NOT NULL REFERENCES public.edu_estudiantes(id) ON DELETE RESTRICT,
  periodo text NOT NULL CHECK (length(trim(periodo)) >= 1),
  area text NOT NULL CHECK (length(trim(area)) >= 2),
  logro text,
  valoracion text NOT NULL DEFAULT 'Básico' CHECK (valoracion IN ('Bajo', 'Básico', 'Alto', 'Superior')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. Moda: referencia padre + matriz talla/color y bonos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mod_referencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  marca text,
  temporada text,
  precio numeric NOT NULL DEFAULT 0 CHECK (precio >= 0),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mod_ref_owner_idx ON public.mod_referencias (owner_id, nombre);

CREATE TABLE IF NOT EXISTS public.mod_variantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  referencia_id uuid NOT NULL REFERENCES public.mod_referencias(id) ON DELETE RESTRICT,
  talla text NOT NULL CHECK (length(trim(talla)) >= 1),
  color text NOT NULL DEFAULT 'único' CHECK (length(trim(color)) >= 1),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  costo numeric NOT NULL DEFAULT 0 CHECK (costo >= 0),
  codigo_barras text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mod_var_ref_idx ON public.mod_variantes (referencia_id);

CREATE TABLE IF NOT EXISTS public.mod_bonos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  concepto text NOT NULL DEFAULT 'bono' CHECK (concepto IN ('cambio', 'bono')),
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  telefono text,
  valor numeric NOT NULL CHECK (valor > 0),
  referencia text,
  estado text NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente', 'redimido', 'vencido')),
  vence date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. Farmacia y 5. Óptica
-- ============================================================
CREATE TABLE IF NOT EXISTS public.far_productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  principio_activo text,
  registro_invima text,
  requiere_formula boolean NOT NULL DEFAULT false,
  controlado boolean NOT NULL DEFAULT false,
  refrigerado boolean NOT NULL DEFAULT false,
  lote text,
  vence date,
  stock numeric NOT NULL DEFAULT 0 CHECK (stock >= 0),
  costo numeric NOT NULL DEFAULT 0 CHECK (costo >= 0),
  precio numeric NOT NULL DEFAULT 0 CHECK (precio >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS far_prod_owner_idx ON public.far_productos (owner_id, nombre);

CREATE TABLE IF NOT EXISTS public.far_ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  producto_id uuid NOT NULL REFERENCES public.far_productos(id) ON DELETE RESTRICT,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  cliente text,
  con_formula boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.opt_formulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  telefono text,
  od_esfera text, od_cilindro text, od_eje text, od_adicion text, od_dp text,
  oi_esfera text, oi_cilindro text, oi_eje text, oi_adicion text, oi_dp text,
  vigencia date,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS opt_for_owner_idx ON public.opt_formulas (owner_id, cliente);

CREATE TABLE IF NOT EXISTS public.opt_ordenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  formula_id uuid REFERENCES public.opt_formulas(id) ON DELETE RESTRICT,
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  montura text,
  lentes text,
  laboratorio text,
  valor numeric NOT NULL CHECK (valor >= 0),
  abono numeric NOT NULL DEFAULT 0 CHECK (abono >= 0),
  saldo numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'ordenada' CHECK (estado IN ('ordenada', 'en_laboratorio', 'lista', 'entregada')),
  promesa date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. Eventos y salones
-- ============================================================
CREATE TABLE IF NOT EXISTS public.eve_salones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  capacidad integer NOT NULL DEFAULT 50 CHECK (capacidad > 0),
  tarifa numeric NOT NULL DEFAULT 0 CHECK (tarifa >= 0),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eve_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  salon_id uuid REFERENCES public.eve_salones(id) ON DELETE RESTRICT,
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  telefono text,
  fecha date NOT NULL,
  invitados integer NOT NULL DEFAULT 50 CHECK (invitados > 0),
  menu text,
  decoracion text,
  alquiler text,
  valor numeric NOT NULL CHECK (valor >= 0),
  anticipo numeric NOT NULL DEFAULT 0 CHECK (anticipo >= 0),
  saldo numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'cotizado' CHECK (estado IN ('cotizado', 'reservado', 'confirmado', 'realizado', 'cancelado')),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS eve_ev_fecha_idx ON public.eve_eventos (salon_id, fecha);

CREATE TABLE IF NOT EXISTS public.eve_abonos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  evento_id uuid NOT NULL REFERENCES public.eve_eventos(id) ON DELETE RESTRICT,
  valor numeric NOT NULL CHECK (valor > 0),
  metodo text NOT NULL DEFAULT 'transferencia',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.eve_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  evento_id uuid NOT NULL REFERENCES public.eve_eventos(id) ON DELETE RESTRICT,
  tarea text NOT NULL CHECK (length(trim(tarea)) >= 2),
  listo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. RLS estricto + sin borrado físico
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['hot_habitaciones','hot_huespedes','hot_reservas','hot_cargos',
    'edu_estudiantes','edu_pensiones','edu_asistencia','edu_notas',
    'mod_referencias','mod_variantes','mod_bonos',
    'far_productos','far_ventas',
    'opt_formulas','opt_ordenes',
    'eve_salones','eve_eventos','eve_abonos','eve_checklist'] LOOP
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
-- 8. Funciones de operación (caja y contabilidad)
-- ============================================================

-- Check-out del hotel: cobra noches + cargos menos anticipo, entra a Caja y Contabilidad.
CREATE OR REPLACE FUNCTION public.hot_checkout(p_reserva uuid, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  r record;
  h record;
  v_noches integer;
  v_hospedaje numeric;
  v_cargos numeric := 0;
  v_total numeric;
  v_cobrar numeric;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  v_turno uuid;
  v_concepto text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO r FROM public.hot_reservas WHERE id = p_reserva AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La reserva ya no existe.'; END IF;
  IF r.estado = 'finalizada' THEN RAISE EXCEPTION 'Esta cuenta ya fue liquidada.'; END IF;
  SELECT * INTO h FROM public.hot_habitaciones WHERE id = r.habitacion_id AND owner_id = v_owner;
  IF NOT FOUND THEN RAISE EXCEPTION 'La habitación ya no existe.'; END IF;
  v_noches := greatest(r.fecha_out - r.fecha_in, 1);
  v_hospedaje := v_noches * h.tarifa;
  SELECT coalesce(sum(valor), 0) INTO v_cargos FROM public.hot_cargos WHERE reserva_id = r.id AND owner_id = v_owner;
  v_total := v_hospedaje + v_cargos;
  v_cobrar := greatest(v_total - r.anticipo, 0);
  v_concepto := 'Hospedaje hab. ' || h.numero || ' (' || v_noches || ' noches)';

  UPDATE public.hot_reservas SET total = v_total, estado = 'finalizada' WHERE id = r.id;
  UPDATE public.hot_habitaciones SET estado = 'limpieza' WHERE id = h.id;

  BEGIN
    PERFORM public.pan_asegurar_cuenta(v_owner, r.tipo_negocio, '4135', 'Ventas de servicios', 'ingreso');
    PERFORM public.registrar_asiento_movimiento(v_owner, r.tipo_negocio, v_concepto, 'hot_checkout', r.id,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_cobrar),
                        jsonb_build_object('codigo', '4135', 'haber', v_cobrar)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento del check-out %: %', r.id, SQLERRM;
  END;

  IF v_cobrar > 0 THEN
    PERFORM set_config('gosaryc.pan', 'on', true);
    INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
    VALUES (v_owner, r.tipo_negocio, 'ingreso', left(v_concepto || ' (' || v_metodo || ')', 200), v_cobrar);
    PERFORM set_config('gosaryc.pan', 'off', true);

    SELECT id INTO v_turno FROM public.turnos_caja
     WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
    IF v_turno IS NOT NULL THEN
      INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
      VALUES (v_owner, v_turno, 'venta',
              CASE WHEN v_metodo = 'efectivo' THEN 'efectivo' WHEN v_metodo = 'tarjeta' THEN 'tarjeta' ELSE 'transferencia' END,
              v_concepto, v_cobrar, coalesce(auth.jwt() ->> 'email', ''));
    END IF;
  END IF;
  RETURN jsonb_build_object('total', v_total, 'cobrado', v_cobrar, 'noches', v_noches);
END;
$$;
REVOKE ALL ON FUNCTION public.hot_checkout(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.hot_checkout(uuid, text) TO authenticated;

-- Generar pensiones del periodo para todos los estudiantes activos (sin duplicar).
CREATE OR REPLACE FUNCTION public.edu_generar_pensiones(p_periodo text, p_valor numeric, p_vence date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_periodo text := nullif(trim(coalesce(p_periodo, '')), '');
  v_n integer := 0;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF v_periodo IS NULL THEN RAISE EXCEPTION 'Escribe el periodo (ej. 2026-03).'; END IF;
  IF p_valor IS NULL OR p_valor < 0 THEN RAISE EXCEPTION 'El valor no es válido.'; END IF;
  INSERT INTO public.edu_pensiones (owner_id, tipo_negocio, estudiante_id, concepto, periodo, valor, fecha_vence)
  SELECT v_owner, public.tipo_negocio_actual(), e.id, 'Pensión ' || v_periodo, v_periodo, p_valor, p_vence
  FROM public.edu_estudiantes e
  WHERE e.owner_id = v_owner AND e.estado = 'activo'
    AND NOT EXISTS (SELECT 1 FROM public.edu_pensiones p WHERE p.estudiante_id = e.id AND p.periodo = v_periodo AND p.owner_id = v_owner);
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN jsonb_build_object('generadas', v_n, 'periodo', v_periodo);
END;
$$;
REVOKE ALL ON FUNCTION public.edu_generar_pensiones(text, numeric, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.edu_generar_pensiones(text, numeric, date) TO authenticated;

-- Cobrar una pensión: entra a Caja y Contabilidad.
CREATE OR REPLACE FUNCTION public.edu_cobrar_pension(p_pension uuid, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  p record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  v_turno uuid;
  v_concepto text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO p FROM public.edu_pensiones WHERE id = p_pension AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La pensión ya no existe.'; END IF;
  IF p.estado = 'pagada' THEN RAISE EXCEPTION 'Esta pensión ya fue pagada.'; END IF;
  v_concepto := p.concepto;
  UPDATE public.edu_pensiones SET estado = 'pagada' WHERE id = p.id;

  BEGIN
    PERFORM public.pan_asegurar_cuenta(v_owner, p.tipo_negocio, '4135', 'Ventas de servicios', 'ingreso');
    PERFORM public.registrar_asiento_movimiento(v_owner, p.tipo_negocio, v_concepto, 'edu_pension', p.id,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', p.valor),
                        jsonb_build_object('codigo', '4135', 'haber', p.valor)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento de la pensión %: %', p.id, SQLERRM;
  END;

  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, p.tipo_negocio, 'ingreso', left(v_concepto || ' (' || v_metodo || ')', 200), p.valor);
  PERFORM set_config('gosaryc.pan', 'off', true);

  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'venta',
            CASE WHEN v_metodo = 'efectivo' THEN 'efectivo' WHEN v_metodo = 'tarjeta' THEN 'tarjeta' ELSE 'transferencia' END,
            v_concepto, p.valor, coalesce(auth.jwt() ->> 'email', ''));
  END IF;
  RETURN jsonb_build_object('cobrado', p.valor);
END;
$$;
REVOKE ALL ON FUNCTION public.edu_cobrar_pension(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.edu_cobrar_pension(uuid, text) TO authenticated;

-- Venta de farmacia: bloquea antibióticos/controlados sin fórmula y descuenta stock.
CREATE OR REPLACE FUNCTION public.far_vender(p_producto uuid, p_cantidad numeric, p_cliente text, p_con_formula boolean, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  f record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  v_total numeric;
  v_turno uuid;
  v_concepto text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor a cero.'; END IF;
  SELECT * INTO f FROM public.far_productos WHERE id = p_producto AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El producto ya no existe.'; END IF;
  IF (f.requiere_formula OR f.controlado) AND coalesce(p_con_formula, false) = false THEN
    RAISE EXCEPTION 'Este producto (%) exige fórmula médica. Márcala para vender.', f.nombre;
  END IF;
  IF f.stock < p_cantidad THEN RAISE EXCEPTION 'No hay suficiente % (quedan %).', f.nombre, f.stock; END IF;
  v_total := round(p_cantidad * f.precio, 2);
  v_concepto := 'Droguería: ' || f.nombre;

  UPDATE public.far_productos SET stock = f.stock - p_cantidad WHERE id = f.id;
  INSERT INTO public.far_ventas (owner_id, tipo_negocio, producto_id, cantidad, total, cliente, con_formula)
  VALUES (v_owner, f.tipo_negocio, f.id, p_cantidad, v_total, nullif(trim(coalesce(p_cliente, '')), ''), coalesce(p_con_formula, false));

  BEGIN
    PERFORM public.pan_asegurar_cuenta(v_owner, f.tipo_negocio, '4135', 'Ventas de servicios', 'ingreso');
    PERFORM public.registrar_asiento_movimiento(v_owner, f.tipo_negocio, v_concepto, 'far_venta', f.id,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_total),
                        jsonb_build_object('codigo', '4135', 'haber', v_total)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento de farmacia %: %', f.id, SQLERRM;
  END;

  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, f.tipo_negocio, 'ingreso', left(v_concepto || ' (' || v_metodo || ')', 200), v_total);
  PERFORM set_config('gosaryc.pan', 'off', true);

  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'venta',
            CASE WHEN v_metodo = 'efectivo' THEN 'efectivo' WHEN v_metodo = 'tarjeta' THEN 'tarjeta' ELSE 'transferencia' END,
            v_concepto, v_total, coalesce(auth.jwt() ->> 'email', ''));
  END IF;
  RETURN jsonb_build_object('total', v_total);
END;
$$;
REVOKE ALL ON FUNCTION public.far_vender(uuid, numeric, text, boolean, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.far_vender(uuid, numeric, text, boolean, text) TO authenticated;

-- Abono a orden de óptica: entra a Caja y Contabilidad, actualiza saldo y estado.
CREATE OR REPLACE FUNCTION public.opt_abonar(p_orden uuid, p_valor numeric, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  o record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  v_turno uuid;
  v_nuevo numeric;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_valor IS NULL OR p_valor <= 0 THEN RAISE EXCEPTION 'El abono debe ser mayor a cero.'; END IF;
  SELECT * INTO o FROM public.opt_ordenes WHERE id = p_orden AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La orden ya no existe.'; END IF;
  IF o.abono + p_valor > o.valor THEN RAISE EXCEPTION 'El abono supera el valor de la orden.'; END IF;
  v_nuevo := o.abono + p_valor;
  UPDATE public.opt_ordenes
  SET abono = v_nuevo, saldo = greatest(o.valor - v_nuevo, 0),
      estado = CASE WHEN v_nuevo >= o.valor THEN 'lista' WHEN estado = 'ordenada' THEN 'en_laboratorio' ELSE estado END
  WHERE id = o.id;

  BEGIN
    PERFORM public.pan_asegurar_cuenta(v_owner, o.tipo_negocio, '4135', 'Ventas de servicios', 'ingreso');
    PERFORM public.registrar_asiento_movimiento(v_owner, o.tipo_negocio, 'Abono óptica ' || o.cliente, 'opt_abono', o.id,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', p_valor),
                        jsonb_build_object('codigo', '4135', 'haber', p_valor)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento de óptica %: %', o.id, SQLERRM;
  END;

  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, o.tipo_negocio, 'ingreso', left('Abono óptica ' || o.cliente || ' (' || v_metodo || ')', 200), p_valor);
  PERFORM set_config('gosaryc.pan', 'off', true);

  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'venta',
            CASE WHEN v_metodo = 'efectivo' THEN 'efectivo' WHEN v_metodo = 'tarjeta' THEN 'tarjeta' ELSE 'transferencia' END,
            'Abono óptica ' || o.cliente, p_valor, coalesce(auth.jwt() ->> 'email', ''));
  END IF;
  RETURN jsonb_build_object('abono', v_nuevo, 'saldo', greatest(o.valor - v_nuevo, 0));
END;
$$;
REVOKE ALL ON FUNCTION public.opt_abonar(uuid, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.opt_abonar(uuid, numeric, text) TO authenticated;

-- Crear evento evitando cruces de salón y fecha.
CREATE OR REPLACE FUNCTION public.eve_reservar(p_salon uuid, p_cliente text, p_telefono text, p_fecha date, p_valor numeric, p_anticipo numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_id uuid := gen_random_uuid();
  v_existe integer;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF nullif(trim(coalesce(p_cliente, '')), '') IS NULL THEN RAISE EXCEPTION 'Escribe el nombre del cliente.'; END IF;
  IF p_fecha IS NULL THEN RAISE EXCEPTION 'Elige la fecha del evento.'; END IF;
  IF p_valor IS NULL OR p_valor < 0 THEN RAISE EXCEPTION 'El valor no es válido.'; END IF;
  IF p_salon IS NOT NULL THEN
    SELECT count(*) INTO v_existe FROM public.eve_eventos
    WHERE owner_id = v_owner AND salon_id = p_salon AND fecha = p_fecha AND estado IN ('reservado', 'confirmado');
    IF v_existe > 0 THEN RAISE EXCEPTION 'Ese salón ya está reservado en esa fecha.'; END IF;
  END IF;
  INSERT INTO public.eve_eventos (id, owner_id, tipo_negocio, salon_id, cliente, telefono, fecha, valor, anticipo, saldo, estado)
  VALUES (v_id, v_owner, public.tipo_negocio_actual(), p_salon,
          trim(p_cliente), nullif(trim(coalesce(p_telefono, '')), ''),
          p_fecha, p_valor, coalesce(p_anticipo, 0), greatest(p_valor - coalesce(p_anticipo, 0), 0),
          CASE WHEN coalesce(p_anticipo, 0) > 0 THEN 'reservado' ELSE 'cotizado' END);
  RETURN jsonb_build_object('id', v_id);
END;
$$;
REVOKE ALL ON FUNCTION public.eve_reservar(uuid, text, text, date, numeric, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.eve_reservar(uuid, text, text, date, numeric, numeric) TO authenticated;

-- Abono a evento: entra a Caja y Contabilidad y baja el saldo.
CREATE OR REPLACE FUNCTION public.eve_abonar(p_evento uuid, p_valor numeric, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  e record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'transferencia');
  v_cuenta text := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  v_turno uuid;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_valor IS NULL OR p_valor <= 0 THEN RAISE EXCEPTION 'El abono debe ser mayor a cero.'; END IF;
  SELECT * INTO e FROM public.eve_eventos WHERE id = p_evento AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El evento ya no existe.'; END IF;
  IF e.anticipo + p_valor > e.valor THEN RAISE EXCEPTION 'El abono supera el valor del evento.'; END IF;

  INSERT INTO public.eve_abonos (owner_id, tipo_negocio, evento_id, valor, metodo)
  VALUES (v_owner, e.tipo_negocio, e.id, p_valor, v_metodo);
  UPDATE public.eve_eventos
  SET anticipo = e.anticipo + p_valor, saldo = greatest(e.valor - e.anticipo - p_valor, 0),
      estado = CASE WHEN estado = 'cotizado' THEN 'reservado' ELSE estado END
  WHERE id = e.id;

  BEGIN
    PERFORM public.pan_asegurar_cuenta(v_owner, e.tipo_negocio, '4135', 'Ventas de servicios', 'ingreso');
    PERFORM public.registrar_asiento_movimiento(v_owner, e.tipo_negocio, 'Abono evento ' || e.cliente, 'eve_abono', e.id,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', p_valor),
                        jsonb_build_object('codigo', '4135', 'haber', p_valor)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento del evento %: %', e.id, SQLERRM;
  END;

  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, e.tipo_negocio, 'ingreso', left('Abono evento ' || e.cliente || ' (' || v_metodo || ')', 200), p_valor);
  PERFORM set_config('gosaryc.pan', 'off', true);

  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'venta',
            CASE WHEN v_metodo = 'efectivo' THEN 'efectivo' WHEN v_metodo = 'tarjeta' THEN 'tarjeta' ELSE 'transferencia' END,
            'Abono evento ' || e.cliente, p_valor, coalesce(auth.jwt() ->> 'email', ''));
  END IF;
  RETURN jsonb_build_object('anticipo', e.anticipo + p_valor, 'saldo', greatest(e.valor - e.anticipo - p_valor, 0));
END;
$$;
REVOKE ALL ON FUNCTION public.eve_abonar(uuid, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.eve_abonar(uuid, numeric, text) TO authenticated;
