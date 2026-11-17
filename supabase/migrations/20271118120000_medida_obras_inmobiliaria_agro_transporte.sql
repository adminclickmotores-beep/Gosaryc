-- PROMPT #8 — CONSTRUCTORA/OBRAS, INMOBILIARIA, AGROPECUARIA Y TRANSPORTE/LOGÍSTICA
-- Presupuestos y vales por obra, portafolio y liquidación de arriendos, control por
-- lote/cultivo/hato y manifiestos con liquidación al conductor.
-- Todo con owner_id = mi_negocio_id() y RLS estricto. No borra ni trunca datos.

-- ============================================================
-- 1. Constructora / obras civiles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.obr_obras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  cliente text,
  telefono text,
  responsable text,
  presupuesto numeric NOT NULL DEFAULT 0 CHECK (presupuesto >= 0),
  avance numeric NOT NULL DEFAULT 0 CHECK (avance >= 0 AND avance <= 100),
  estado text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'pausada', 'terminada')),
  fecha_inicio date,
  fecha_fin date,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS obr_obras_owner_idx ON public.obr_obras (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.obr_capitulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  obra_id uuid NOT NULL REFERENCES public.obr_obras(id) ON DELETE RESTRICT,
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  planeado numeric NOT NULL DEFAULT 0 CHECK (planeado >= 0),
  ejecutado numeric NOT NULL DEFAULT 0 CHECK (ejecutado >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS obr_cap_obra_idx ON public.obr_capitulos (obra_id);

CREATE TABLE IF NOT EXISTS public.obr_materiales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  unidad text NOT NULL DEFAULT 'und',
  stock numeric NOT NULL DEFAULT 0 CHECK (stock >= 0),
  costo numeric NOT NULL DEFAULT 0 CHECK (costo >= 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS obr_mat_owner_idx ON public.obr_materiales (owner_id, nombre);

CREATE TABLE IF NOT EXISTS public.obr_vales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  obra_id uuid NOT NULL REFERENCES public.obr_obras(id) ON DELETE RESTRICT,
  capitulo_id uuid REFERENCES public.obr_capitulos(id) ON DELETE RESTRICT,
  concepto text NOT NULL DEFAULT 'Salida a obra',
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  entregado_a text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS obr_vales_obra_idx ON public.obr_vales (obra_id);

CREATE TABLE IF NOT EXISTS public.obr_vale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  vale_id uuid NOT NULL REFERENCES public.obr_vales(id) ON DELETE RESTRICT,
  material_id uuid NOT NULL REFERENCES public.obr_materiales(id) ON DELETE RESTRICT,
  nombre text NOT NULL,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  costo numeric NOT NULL DEFAULT 0 CHECK (costo >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.obr_cortes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  obra_id uuid NOT NULL REFERENCES public.obr_obras(id) ON DELETE RESTRICT,
  acta text NOT NULL CHECK (length(trim(acta)) >= 1),
  avance_pct numeric NOT NULL DEFAULT 0 CHECK (avance_pct >= 0 AND avance_pct <= 100),
  valor numeric NOT NULL CHECK (valor > 0),
  retencion numeric NOT NULL DEFAULT 0 CHECK (retencion >= 0),
  anticipo_aplicado numeric NOT NULL DEFAULT 0 CHECK (anticipo_aplicado >= 0),
  neto numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'cobrado')),
  fecha date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS obr_cortes_obra_idx ON public.obr_cortes (obra_id);

-- ============================================================
-- 2. Inmobiliaria / bienes raíces
-- ============================================================
CREATE TABLE IF NOT EXISTS public.inm_propiedades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  titulo text NOT NULL CHECK (length(trim(titulo)) >= 2),
  matricula text,
  direccion text,
  modalidad text NOT NULL DEFAULT 'arriendo' CHECK (modalidad IN ('venta', 'arriendo')),
  canon numeric NOT NULL DEFAULT 0 CHECK (canon >= 0),
  administracion numeric NOT NULL DEFAULT 0 CHECK (administracion >= 0),
  precio_venta numeric NOT NULL DEFAULT 0 CHECK (precio_venta >= 0),
  propietario text,
  telefono_prop text,
  estado text NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'arrendado', 'mantenimiento', 'vendido')),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inm_prop_owner_idx ON public.inm_propiedades (owner_id, estado);

CREATE TABLE IF NOT EXISTS public.inm_contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  propiedad_id uuid NOT NULL REFERENCES public.inm_propiedades(id) ON DELETE RESTRICT,
  arrendatario text NOT NULL CHECK (length(trim(arrendatario)) >= 2),
  telefono text,
  canon numeric NOT NULL CHECK (canon > 0),
  comision_pct numeric NOT NULL DEFAULT 10 CHECK (comision_pct >= 0 AND comision_pct <= 100),
  dia_pago integer NOT NULL DEFAULT 5 CHECK (dia_pago >= 1 AND dia_pago <= 31),
  deposito numeric NOT NULL DEFAULT 0 CHECK (deposito >= 0),
  inicio date NOT NULL DEFAULT current_date,
  fin date,
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'terminado')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inm_cont_prop_idx ON public.inm_contratos (propiedad_id);

CREATE TABLE IF NOT EXISTS public.inm_cobros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  contrato_id uuid NOT NULL REFERENCES public.inm_contratos(id) ON DELETE RESTRICT,
  periodo text NOT NULL CHECK (length(trim(periodo)) >= 4),
  valor numeric NOT NULL CHECK (valor > 0),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagado')),
  liquidado boolean NOT NULL DEFAULT false,
  fecha date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contrato_id, periodo)
);

CREATE TABLE IF NOT EXISTS public.inm_gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  contrato_id uuid NOT NULL REFERENCES public.inm_contratos(id) ON DELETE RESTRICT,
  concepto text NOT NULL CHECK (length(trim(concepto)) >= 2),
  valor numeric NOT NULL CHECK (valor > 0),
  liquidado boolean NOT NULL DEFAULT false,
  fecha date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.inm_liquidaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  contrato_id uuid NOT NULL REFERENCES public.inm_contratos(id) ON DELETE RESTRICT,
  cobros integer NOT NULL DEFAULT 0,
  total_cobrado numeric NOT NULL DEFAULT 0,
  comision numeric NOT NULL DEFAULT 0,
  gastos numeric NOT NULL DEFAULT 0,
  neto numeric NOT NULL DEFAULT 0,
  metodo text NOT NULL DEFAULT 'transferencia',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. Agropecuaria / fincas / insumos agrícolas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agr_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  cultivo text,
  superficie numeric NOT NULL DEFAULT 0 CHECK (superficie >= 0),
  unidad text NOT NULL DEFAULT 'ha',
  stock numeric NOT NULL DEFAULT 0 CHECK (stock >= 0),
  costo_acumulado numeric NOT NULL DEFAULT 0 CHECK (costo_acumulado >= 0),
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cosechado', 'descanso')),
  fecha_siembra date,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agr_lotes_owner_idx ON public.agr_lotes (owner_id, nombre);

CREATE TABLE IF NOT EXISTS public.agr_insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  unidad text NOT NULL DEFAULT 'kg',
  stock numeric NOT NULL DEFAULT 0 CHECK (stock >= 0),
  costo numeric NOT NULL DEFAULT 0 CHECK (costo >= 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.agr_aplicaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  lote_id uuid NOT NULL REFERENCES public.agr_lotes(id) ON DELETE RESTRICT,
  insumo_id uuid NOT NULL REFERENCES public.agr_insumos(id) ON DELETE RESTRICT,
  nombre text NOT NULL,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  costo numeric NOT NULL DEFAULT 0 CHECK (costo >= 0),
  dosis text,
  fecha date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agr_apl_lote_idx ON public.agr_aplicaciones (lote_id);

CREATE TABLE IF NOT EXISTS public.agr_cosechas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  lote_id uuid NOT NULL REFERENCES public.agr_lotes(id) ON DELETE RESTRICT,
  cliente text,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  unidad text NOT NULL DEFAULT 'kg',
  precio numeric NOT NULL CHECK (precio >= 0),
  total numeric NOT NULL DEFAULT 0,
  costo numeric NOT NULL DEFAULT 0,
  utilidad numeric NOT NULL DEFAULT 0,
  fecha date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. Transporte, carga y mensajería
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tra_flota (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  placa text NOT NULL CHECK (length(trim(placa)) >= 2),
  conductor text,
  telefono text,
  capacidad text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, placa)
);

CREATE TABLE IF NOT EXISTS public.tra_manifiestos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  guia text NOT NULL CHECK (length(trim(guia)) >= 1),
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  telefono text,
  origen text NOT NULL DEFAULT '',
  destino text NOT NULL DEFAULT '',
  placa text,
  conductor text,
  valor_flete numeric NOT NULL CHECK (valor_flete >= 0),
  anticipos numeric NOT NULL DEFAULT 0 CHECK (anticipos >= 0),
  pago_conductor numeric NOT NULL DEFAULT 0 CHECK (pago_conductor >= 0),
  utilidad numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'asignado' CHECK (estado IN ('asignado', 'en_ruta', 'cobrado', 'liquidado')),
  fecha date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tra_man_owner_idx ON public.tra_manifiestos (owner_id, estado, created_at DESC);

CREATE TABLE IF NOT EXISTS public.tra_anticipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  manifiesto_id uuid NOT NULL REFERENCES public.tra_manifiestos(id) ON DELETE RESTRICT,
  concepto text NOT NULL CHECK (concepto IN ('viaticos', 'acpm', 'peajes', 'gasto')),
  detalle text,
  valor numeric NOT NULL CHECK (valor > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tra_liquidaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  manifiesto_id uuid NOT NULL REFERENCES public.tra_manifiestos(id) ON DELETE RESTRICT,
  flete numeric NOT NULL DEFAULT 0,
  anticipos numeric NOT NULL DEFAULT 0,
  pago_conductor numeric NOT NULL DEFAULT 0,
  utilidad numeric NOT NULL DEFAULT 0,
  metodo text NOT NULL DEFAULT 'efectivo',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. RLS estricto + sin borrado físico
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['obr_obras','obr_capitulos','obr_materiales','obr_vales','obr_vale_items','obr_cortes',
    'inm_propiedades','inm_contratos','inm_cobros','inm_gastos','inm_liquidaciones',
    'agr_lotes','agr_insumos','agr_aplicaciones','agr_cosechas',
    'tra_flota','tra_manifiestos','tra_anticipos','tra_liquidaciones'] LOOP
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
-- 6. Funciones de operación (descuentos, caja y contabilidad)
-- ============================================================

-- Vale de salida a obra: descuenta materiales de bodega y suma al capítulo ejecutado.
CREATE OR REPLACE FUNCTION public.obr_registrar_vale(p_obra uuid, p_capitulo uuid, p_items jsonb, p_entregado text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  o record;
  it jsonb;
  mt record;
  v_vale uuid := gen_random_uuid();
  v_total numeric := 0;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Agrega al menos un material.'; END IF;
  SELECT * INTO o FROM public.obr_obras WHERE id = p_obra AND owner_id = v_owner;
  IF NOT FOUND THEN RAISE EXCEPTION 'La obra ya no existe.'; END IF;

  INSERT INTO public.obr_vales (id, owner_id, tipo_negocio, obra_id, capitulo_id, concepto, entregado_a)
  VALUES (v_vale, v_owner, o.tipo_negocio, o.id, p_capitulo, 'Salida a obra', nullif(trim(coalesce(p_entregado, '')), ''));

  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO mt FROM public.obr_materiales WHERE id = (it ->> 'material_id')::uuid AND owner_id = v_owner FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Un material de la lista ya no existe.'; END IF;
    IF (it ->> 'cantidad')::numeric <= 0 THEN RAISE EXCEPTION 'La cantidad de % debe ser mayor a cero.', mt.nombre; END IF;
    IF mt.stock < (it ->> 'cantidad')::numeric THEN RAISE EXCEPTION 'No hay suficiente % (quedan %).', mt.nombre, mt.stock; END IF;
    UPDATE public.obr_materiales SET stock = mt.stock - (it ->> 'cantidad')::numeric WHERE id = mt.id;
    INSERT INTO public.obr_vale_items (owner_id, tipo_negocio, vale_id, material_id, nombre, cantidad, costo)
    VALUES (v_owner, o.tipo_negocio, v_vale, mt.id, mt.nombre, (it ->> 'cantidad')::numeric, mt.costo * (it ->> 'cantidad')::numeric);
    v_total := v_total + mt.costo * (it ->> 'cantidad')::numeric;
  END LOOP;

  UPDATE public.obr_vales SET total = v_total WHERE id = v_vale;
  IF p_capitulo IS NOT NULL THEN
    UPDATE public.obr_capitulos SET ejecutado = ejecutado + v_total WHERE id = p_capitulo AND owner_id = v_owner;
  END IF;
  RETURN jsonb_build_object('vale_id', v_vale, 'total', v_total);
END;
$$;
REVOKE ALL ON FUNCTION public.obr_registrar_vale(uuid, uuid, jsonb, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.obr_registrar_vale(uuid, uuid, jsonb, text) TO authenticated;

-- Cobrar un corte/acta de obra: el neto entra a Caja y Contabilidad.
CREATE OR REPLACE FUNCTION public.obr_cobrar_corte(p_corte uuid, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  c record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  v_turno uuid;
  v_concepto text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO c FROM public.obr_cortes WHERE id = p_corte AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El corte ya no existe.'; END IF;
  IF c.estado = 'cobrado' THEN RAISE EXCEPTION 'Este corte ya fue cobrado.'; END IF;
  v_concepto := 'Acta ' || c.acta;
  UPDATE public.obr_cortes SET estado = 'cobrado' WHERE id = c.id;
  UPDATE public.obr_obras SET avance = greatest(avance, c.avance_pct) WHERE id = c.obra_id AND owner_id = v_owner;

  BEGIN
    PERFORM public.pan_asegurar_cuenta(v_owner, c.tipo_negocio, '4135', 'Ventas de servicios', 'ingreso');
    PERFORM public.registrar_asiento_movimiento(v_owner, c.tipo_negocio, v_concepto, 'obr_corte', c.id,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', c.neto),
                        jsonb_build_object('codigo', '4135', 'haber', c.neto)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento del corte %: %', c.id, SQLERRM;
  END;

  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, c.tipo_negocio, 'ingreso', left(v_concepto || ' (' || v_metodo || ')', 200), c.neto);
  PERFORM set_config('gosaryc.pan', 'off', true);

  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'venta',
            CASE WHEN v_metodo = 'efectivo' THEN 'efectivo' WHEN v_metodo = 'tarjeta' THEN 'tarjeta' ELSE 'transferencia' END,
            v_concepto, c.neto, coalesce(auth.jwt() ->> 'email', ''));
  END IF;
  RETURN jsonb_build_object('cobrado', c.neto);
END;
$$;
REVOKE ALL ON FUNCTION public.obr_cobrar_corte(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.obr_cobrar_corte(uuid, text) TO authenticated;

-- Cobrar un canon mensual: entra a Caja y Contabilidad.
CREATE OR REPLACE FUNCTION public.inm_cobrar_canon(p_cobro uuid, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  b record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  v_turno uuid;
  v_concepto text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO b FROM public.inm_cobros WHERE id = p_cobro AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El cobro ya no existe.'; END IF;
  IF b.estado = 'pagado' THEN RAISE EXCEPTION 'Este canon ya fue pagado.'; END IF;
  v_concepto := 'Canon ' || b.periodo;
  UPDATE public.inm_cobros SET estado = 'pagado' WHERE id = b.id;

  BEGIN
    PERFORM public.pan_asegurar_cuenta(v_owner, b.tipo_negocio, '4135', 'Ventas de servicios', 'ingreso');
    PERFORM public.registrar_asiento_movimiento(v_owner, b.tipo_negocio, v_concepto, 'inm_cobro', b.id,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', b.valor),
                        jsonb_build_object('codigo', '4135', 'haber', b.valor)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento del canon %: %', b.id, SQLERRM;
  END;

  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, b.tipo_negocio, 'ingreso', left(v_concepto || ' (' || v_metodo || ')', 200), b.valor);
  PERFORM set_config('gosaryc.pan', 'off', true);

  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'venta',
            CASE WHEN v_metodo = 'efectivo' THEN 'efectivo' WHEN v_metodo = 'tarjeta' THEN 'tarjeta' ELSE 'transferencia' END,
            v_concepto, b.valor, coalesce(auth.jwt() ->> 'email', ''));
  END IF;
  RETURN jsonb_build_object('cobrado', b.valor);
END;
$$;
REVOKE ALL ON FUNCTION public.inm_cobrar_canon(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.inm_cobrar_canon(uuid, text) TO authenticated;

-- Liquidar al propietario: descuenta comisión y gastos, el neto sale de Caja.
CREATE OR REPLACE FUNCTION public.inm_liquidar(p_contrato uuid, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  ct record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'transferencia');
  v_cobrado numeric := 0;
  v_n integer := 0;
  v_gastos numeric := 0;
  v_comision numeric := 0;
  v_neto numeric := 0;
  v_liq uuid := gen_random_uuid();
  v_turno uuid;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF NOT public.es_admin() THEN RAISE EXCEPTION 'Solo el dueño liquida a propietarios.'; END IF;
  SELECT * INTO ct FROM public.inm_contratos WHERE id = p_contrato AND owner_id = v_owner;
  IF NOT FOUND THEN RAISE EXCEPTION 'El contrato ya no existe.'; END IF;

  SELECT coalesce(sum(valor), 0), count(*) INTO v_cobrado, v_n FROM public.inm_cobros
   WHERE contrato_id = ct.id AND owner_id = v_owner AND estado = 'pagado' AND NOT liquidado;
  IF v_cobrado <= 0 THEN RAISE EXCEPTION 'No hay cánones pagados por liquidar.'; END IF;
  SELECT coalesce(sum(valor), 0) INTO v_gastos FROM public.inm_gastos
   WHERE contrato_id = ct.id AND owner_id = v_owner AND NOT liquidado;
  v_comision := round(v_cobrado * ct.comision_pct / 100, 2);
  v_neto := greatest(v_cobrado - v_comision - v_gastos, 0);

  INSERT INTO public.inm_liquidaciones (id, owner_id, tipo_negocio, contrato_id, cobros, total_cobrado, comision, gastos, neto, metodo)
  VALUES (v_liq, v_owner, ct.tipo_negocio, ct.id, v_n, v_cobrado, v_comision, v_gastos, v_neto, v_metodo);
  UPDATE public.inm_cobros SET liquidado = true WHERE contrato_id = ct.id AND owner_id = v_owner AND estado = 'pagado' AND NOT liquidado;
  UPDATE public.inm_gastos SET liquidado = true WHERE contrato_id = ct.id AND owner_id = v_owner AND NOT liquidado;

  BEGIN
    PERFORM public.registrar_asiento_movimiento(v_owner, ct.tipo_negocio, 'Liquidación propietario ' || ct.arrendatario, 'inm_liquidacion', v_liq,
      jsonb_build_array(jsonb_build_object('codigo', '2405', 'debe', v_neto),
                        jsonb_build_object('codigo', '1105', 'haber', v_neto)));
    IF v_comision > 0 THEN
      PERFORM public.pan_asegurar_cuenta(v_owner, ct.tipo_negocio, '4135', 'Ventas de servicios', 'ingreso');
      PERFORM public.registrar_asiento_movimiento(v_owner, ct.tipo_negocio, 'Comisión inmobiliaria ' || ct.arrendatario, 'inm_comision', v_liq,
        jsonb_build_array(jsonb_build_object('codigo', '1105', 'debe', v_comision),
                          jsonb_build_object('codigo', '4135', 'haber', v_comision)));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento de la liquidación %: %', v_liq, SQLERRM;
  END;

  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, ct.tipo_negocio, 'egreso', left('Liquidación propietario ' || ct.arrendatario, 200), v_neto);
  PERFORM set_config('gosaryc.pan', 'off', true);

  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'gasto', 'efectivo', 'Liquidación propietario ' || ct.arrendatario, v_neto, coalesce(auth.jwt() ->> 'email', ''));
  END IF;
  RETURN jsonb_build_object('neto', v_neto, 'comision', v_comision, 'gastos', v_gastos);
END;
$$;
REVOKE ALL ON FUNCTION public.inm_liquidar(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.inm_liquidar(uuid, text) TO authenticated;

-- Aplicar insumo al lote (descuenta inventario, suma costo al lote, con dosis por hectárea/animal).
CREATE OR REPLACE FUNCTION public.agr_aplicar(p_lote uuid, p_insumo uuid, p_cantidad numeric, p_dosis text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  l record;
  i record;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor a cero.'; END IF;
  SELECT * INTO l FROM public.agr_lotes WHERE id = p_lote AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El lote ya no existe.'; END IF;
  SELECT * INTO i FROM public.agr_insumos WHERE id = p_insumo AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El insumo ya no existe.'; END IF;
  IF i.stock < p_cantidad THEN RAISE EXCEPTION 'No hay suficiente % (quedan %).', i.nombre, i.stock; END IF;

  UPDATE public.agr_insumos SET stock = i.stock - p_cantidad WHERE id = i.id;
  INSERT INTO public.agr_aplicaciones (owner_id, tipo_negocio, lote_id, insumo_id, nombre, cantidad, costo, dosis)
  VALUES (v_owner, l.tipo_negocio, l.id, i.id, i.nombre, p_cantidad, i.costo * p_cantidad, nullif(trim(coalesce(p_dosis, '')), ''));
  UPDATE public.agr_lotes SET costo_acumulado = l.costo_acumulado + i.costo * p_cantidad WHERE id = l.id;
  RETURN jsonb_build_object('costo', i.costo * p_cantidad);
END;
$$;
REVOKE ALL ON FUNCTION public.agr_aplicar(uuid, uuid, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.agr_aplicar(uuid, uuid, numeric, text) TO authenticated;

-- Vender la producción del lote (costo promedio, utilidad real, entra a Caja y Contabilidad).
CREATE OR REPLACE FUNCTION public.agr_vender(p_lote uuid, p_cantidad numeric, p_precio numeric, p_cliente text, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  l record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  v_total numeric;
  v_unit numeric;
  v_costo numeric;
  v_util numeric;
  v_turno uuid;
  v_concepto text;
  v_cosecha uuid := gen_random_uuid();
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor a cero.'; END IF;
  IF p_precio IS NULL OR p_precio < 0 THEN RAISE EXCEPTION 'El precio no es válido.'; END IF;
  SELECT * INTO l FROM public.agr_lotes WHERE id = p_lote AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El lote ya no existe.'; END IF;
  IF l.stock < p_cantidad THEN RAISE EXCEPTION 'No hay suficiente producción en el lote (quedan %).', l.stock; END IF;
  v_total := round(p_cantidad * p_precio, 2);
  v_unit := CASE WHEN l.stock > 0 THEN l.costo_acumulado / l.stock ELSE 0 END;
  v_costo := round(v_unit * p_cantidad, 2);
  v_util := v_total - v_costo;
  v_concepto := 'Venta ' || l.nombre;

  UPDATE public.agr_lotes SET stock = l.stock - p_cantidad, costo_acumulado = greatest(l.costo_acumulado - v_costo, 0) WHERE id = l.id;
  INSERT INTO public.agr_cosechas (id, owner_id, tipo_negocio, lote_id, cliente, cantidad, unidad, precio, total, costo, utilidad)
  VALUES (v_cosecha, v_owner, l.tipo_negocio, l.id, nullif(trim(coalesce(p_cliente, '')), ''), p_cantidad, l.unidad, p_precio, v_total, v_costo, v_util);

  BEGIN
    PERFORM public.pan_asegurar_cuenta(v_owner, l.tipo_negocio, '4135', 'Ventas de servicios', 'ingreso');
    PERFORM public.registrar_asiento_movimiento(v_owner, l.tipo_negocio, v_concepto, 'agr_venta', v_cosecha,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_total),
                        jsonb_build_object('codigo', '4135', 'haber', v_total)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento de la venta %: %', v_cosecha, SQLERRM;
  END;

  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, l.tipo_negocio, 'ingreso', left(v_concepto || ' (' || v_metodo || ')', 200), v_total);
  PERFORM set_config('gosaryc.pan', 'off', true);

  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'venta',
            CASE WHEN v_metodo = 'efectivo' THEN 'efectivo' WHEN v_metodo = 'tarjeta' THEN 'tarjeta' ELSE 'transferencia' END,
            v_concepto, v_total, coalesce(auth.jwt() ->> 'email', ''));
  END IF;
  RETURN jsonb_build_object('total', v_total, 'costo', v_costo, 'utilidad', v_util);
END;
$$;
REVOKE ALL ON FUNCTION public.agr_vender(uuid, numeric, numeric, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.agr_vender(uuid, numeric, numeric, text, text) TO authenticated;

-- Anticipo de viaje (viáticos/ACPM/peajes): sale de Caja.
CREATE OR REPLACE FUNCTION public.tra_anticipo(p_manifiesto uuid, p_concepto text, p_detalle text, p_valor numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  m record;
  v_turno uuid;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_valor IS NULL OR p_valor <= 0 THEN RAISE EXCEPTION 'El valor debe ser mayor a cero.'; END IF;
  IF p_concepto NOT IN ('viaticos', 'acpm', 'peajes', 'gasto') THEN RAISE EXCEPTION 'Concepto no válido.'; END IF;
  SELECT * INTO m FROM public.tra_manifiestos WHERE id = p_manifiesto AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El manifiesto ya no existe.'; END IF;
  IF m.estado = 'liquidado' THEN RAISE EXCEPTION 'Este manifiesto ya fue liquidado.'; END IF;

  INSERT INTO public.tra_anticipos (owner_id, tipo_negocio, manifiesto_id, concepto, detalle, valor)
  VALUES (v_owner, m.tipo_negocio, m.id, p_concepto, nullif(trim(coalesce(p_detalle, '')), ''), p_valor);
  UPDATE public.tra_manifiestos SET anticipos = m.anticipos + p_valor WHERE id = m.id;

  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, m.tipo_negocio, 'egreso', left('Anticipo ' || p_concepto || ' guía ' || m.guia, 200), p_valor);
  PERFORM set_config('gosaryc.pan', 'off', true);

  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'gasto', 'efectivo', 'Anticipo ' || p_concepto || ' guía ' || m.guia, p_valor, coalesce(auth.jwt() ->> 'email', ''));
  END IF;
  RETURN jsonb_build_object('anticipo', p_valor);
END;
$$;
REVOKE ALL ON FUNCTION public.tra_anticipo(uuid, text, text, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.tra_anticipo(uuid, text, text, numeric) TO authenticated;

-- Cobrar el flete al cliente: entra a Caja y Contabilidad.
CREATE OR REPLACE FUNCTION public.tra_cobrar_flete(p_manifiesto uuid, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  m record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  v_turno uuid;
  v_concepto text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO m FROM public.tra_manifiestos WHERE id = p_manifiesto AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El manifiesto ya no existe.'; END IF;
  IF m.estado <> 'asignado' AND m.estado <> 'en_ruta' THEN RAISE EXCEPTION 'Este flete ya fue cobrado.'; END IF;
  v_concepto := 'Flete guía ' || m.guia;
  UPDATE public.tra_manifiestos SET estado = 'cobrado' WHERE id = m.id;

  BEGIN
    PERFORM public.pan_asegurar_cuenta(v_owner, m.tipo_negocio, '4135', 'Ventas de servicios', 'ingreso');
    PERFORM public.registrar_asiento_movimiento(v_owner, m.tipo_negocio, v_concepto, 'tra_flete', m.id,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', m.valor_flete),
                        jsonb_build_object('codigo', '4135', 'haber', m.valor_flete)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento del flete %: %', m.id, SQLERRM;
  END;

  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, m.tipo_negocio, 'ingreso', left(v_concepto || ' (' || v_metodo || ')', 200), m.valor_flete);
  PERFORM set_config('gosaryc.pan', 'off', true);

  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'venta',
            CASE WHEN v_metodo = 'efectivo' THEN 'efectivo' WHEN v_metodo = 'tarjeta' THEN 'tarjeta' ELSE 'transferencia' END,
            v_concepto, m.valor_flete, coalesce(auth.jwt() ->> 'email', ''));
  END IF;
  RETURN jsonb_build_object('cobrado', m.valor_flete);
END;
$$;
REVOKE ALL ON FUNCTION public.tra_cobrar_flete(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.tra_cobrar_flete(uuid, text) TO authenticated;

-- Liquidar al conductor: paga el saldo (flete menos anticipos), la utilidad neta queda en Contabilidad.
CREATE OR REPLACE FUNCTION public.tra_liquidar(p_manifiesto uuid, p_pago numeric, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  m record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_pago numeric := coalesce(p_pago, 0);
  v_liq uuid := gen_random_uuid();
  v_util numeric;
  v_turno uuid;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF NOT public.es_admin() THEN RAISE EXCEPTION 'Solo el dueño liquida viajes.'; END IF;
  IF v_pago < 0 THEN RAISE EXCEPTION 'El pago no es válido.'; END IF;
  SELECT * INTO m FROM public.tra_manifiestos WHERE id = p_manifiesto AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El manifiesto ya no existe.'; END IF;
  IF m.estado = 'liquidado' THEN RAISE EXCEPTION 'Este viaje ya fue liquidado.'; END IF;
  IF v_pago > m.valor_flete - m.anticipos THEN RAISE EXCEPTION 'El pago supera el saldo del viaje.'; END IF;
  v_util := m.valor_flete - m.anticipos - v_pago;

  INSERT INTO public.tra_liquidaciones (id, owner_id, tipo_negocio, manifiesto_id, flete, anticipos, pago_conductor, utilidad, metodo)
  VALUES (v_liq, v_owner, m.tipo_negocio, m.id, m.valor_flete, m.anticipos, v_pago, v_util, v_metodo);
  UPDATE public.tra_manifiestos SET pago_conductor = v_pago, utilidad = v_util, estado = 'liquidado' WHERE id = m.id;

  BEGIN
    PERFORM public.registrar_asiento_movimiento(v_owner, m.tipo_negocio, 'Liquidación viaje guía ' || m.guia, 'tra_liquidacion', v_liq,
      jsonb_build_array(jsonb_build_object('codigo', '5205', 'debe', v_pago),
                        jsonb_build_object('codigo', '1105', 'haber', v_pago)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento de la liquidación %: %', v_liq, SQLERRM;
  END;

  IF v_pago > 0 THEN
    PERFORM set_config('gosaryc.pan', 'on', true);
    INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
    VALUES (v_owner, m.tipo_negocio, 'egreso', left('Pago conductor guía ' || m.guia, 200), v_pago);
    PERFORM set_config('gosaryc.pan', 'off', true);

    SELECT id INTO v_turno FROM public.turnos_caja
     WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
    IF v_turno IS NOT NULL THEN
      INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
      VALUES (v_owner, v_turno, 'gasto', 'efectivo', 'Pago conductor guía ' || m.guia, v_pago, coalesce(auth.jwt() ->> 'email', ''));
    END IF;
  END IF;
  RETURN jsonb_build_object('pago', v_pago, 'utilidad', v_util);
END;
$$;
REVOKE ALL ON FUNCTION public.tra_liquidar(uuid, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.tra_liquidar(uuid, numeric, text) TO authenticated;
