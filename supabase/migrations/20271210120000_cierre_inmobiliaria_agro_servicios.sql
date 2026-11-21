-- Cierre Grupo 4: Inmobiliaria (proyecto/torre/piso + venta con comisión), Agro (labores y cosecha)
-- y Servicios Profesionales/Tecnología (tickets, contratos recurrentes, cobro con retenciones).
-- Todo con owner_id = mi_negocio_id(), RLS activo y SET search_path = public. No borra datos.

-- 0. Tablas base (idénticas a la migración 20271118120000; IF NOT EXISTS, no cambia nada si ya existen)
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
ALTER TABLE public.inm_propiedades ENABLE ROW LEVEL SECURITY;

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
ALTER TABLE public.agr_lotes ENABLE ROW LEVEL SECURITY;

-- 1. Inmobiliaria
ALTER TABLE public.inm_propiedades ADD COLUMN IF NOT EXISTS proyecto text;
ALTER TABLE public.inm_propiedades ADD COLUMN IF NOT EXISTS torre text;
ALTER TABLE public.inm_propiedades ADD COLUMN IF NOT EXISTS piso text;

CREATE TABLE IF NOT EXISTS public.inm_ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  propiedad_id uuid NOT NULL REFERENCES public.inm_propiedades(id) ON DELETE RESTRICT,
  comprador text NOT NULL CHECK (length(trim(comprador)) >= 2),
  telefono text,
  precio numeric NOT NULL CHECK (precio > 0),
  comision_pct numeric NOT NULL DEFAULT 3 CHECK (comision_pct >= 0 AND comision_pct <= 100),
  comision numeric NOT NULL DEFAULT 0,
  metodo text NOT NULL DEFAULT 'transferencia',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inm_ventas_owner_idx ON public.inm_ventas (owner_id, created_at DESC);

-- 2. Agro: labores
CREATE TABLE IF NOT EXISTS public.agr_labores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  lote_id uuid NOT NULL REFERENCES public.agr_lotes(id) ON DELETE RESTRICT,
  tipo text NOT NULL DEFAULT 'otra' CHECK (tipo IN ('siembra', 'riego', 'fumigacion', 'poda', 'deshierbe', 'cosecha', 'otra')),
  descripcion text,
  cantidad numeric NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  costo numeric NOT NULL DEFAULT 0 CHECK (costo >= 0),
  fecha date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS agr_labores_lote_idx ON public.agr_labores (lote_id, fecha DESC);

-- 3. Servicios profesionales / tecnología
CREATE TABLE IF NOT EXISTS public.tec_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  telefono text,
  asunto text NOT NULL CHECK (length(trim(asunto)) >= 3),
  tipo text NOT NULL DEFAULT 'soporte' CHECK (tipo IN ('soporte', 'licencia')),
  prioridad text NOT NULL DEFAULT 'media' CHECK (prioridad IN ('baja', 'media', 'alta')),
  estado text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'en_proceso', 'resuelto')),
  horas numeric NOT NULL DEFAULT 0 CHECK (horas >= 0),
  vence date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tec_tickets_owner_idx ON public.tec_tickets (owner_id, estado, created_at DESC);

CREATE TABLE IF NOT EXISTS public.tec_contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  telefono text,
  concepto text NOT NULL CHECK (length(trim(concepto)) >= 3),
  valor_mensual numeric NOT NULL CHECK (valor_mensual > 0),
  ultimo_periodo text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tec_contratos_owner_idx ON public.tec_contratos (owner_id, activo);

-- 4. RLS estricto + sin borrado físico
ALTER TABLE public.inm_ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agr_labores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tec_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tec_contratos ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['inm_ventas', 'agr_labores', 'tec_tickets', 'tec_contratos'] LOOP
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
  -- Tickets y contratos se crean/editan desde la pantalla; ventas y labores solo por función.
  FOREACH t IN ARRAY ARRAY['tec_tickets', 'tec_contratos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_crear', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_crear', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_editar', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal()) WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_editar', t);
  END LOOP;
END $$;

-- 4b. RLS por negocio (owner_id) para las tablas base, idempotente
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['inm_propiedades', 'agr_lotes'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_cierre_leer', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_cierre_leer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_cierre_crear', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_cierre_crear', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_cierre_editar', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal()) WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_cierre_editar', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_cierre_solo_mi_negocio', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id())', t || '_cierre_solo_mi_negocio', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;

-- 5. Inmobiliaria: venta de inmueble, la comisión entra a Caja y Contabilidad
CREATE OR REPLACE FUNCTION public.inm_vender(p_propiedad uuid, p_comprador text, p_telefono text, p_precio numeric, p_comision_pct numeric, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  p record;
  v_metodo text := lower(coalesce(nullif(trim(p_metodo), ''), 'transferencia'));
  v_cuenta text;
  v_com numeric;
  v_venta uuid := gen_random_uuid();
  v_turno uuid;
  v_concepto text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_comprador IS NULL OR length(trim(p_comprador)) < 2 THEN RAISE EXCEPTION 'Escribe el nombre del comprador.'; END IF;
  IF p_precio IS NULL OR p_precio <= 0 THEN RAISE EXCEPTION 'El precio debe ser mayor a cero.'; END IF;
  IF p_comision_pct IS NULL OR p_comision_pct < 0 OR p_comision_pct > 100 THEN RAISE EXCEPTION 'La comisión no es válida.'; END IF;
  IF v_metodo !~ '^[a-z_ ]{1,30}$' THEN v_metodo := 'transferencia'; END IF;
  v_cuenta := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  SELECT * INTO p FROM public.inm_propiedades WHERE id = p_propiedad AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La propiedad ya no existe.'; END IF;
  IF p.modalidad <> 'venta' THEN RAISE EXCEPTION 'Esta propiedad no está en venta.'; END IF;
  IF p.estado = 'vendido' THEN RAISE EXCEPTION 'Esta propiedad ya fue vendida.'; END IF;
  v_com := round(p_precio * p_comision_pct / 100, 2);
  v_concepto := 'Comisión venta ' || p.titulo;

  INSERT INTO public.inm_ventas (id, owner_id, tipo_negocio, propiedad_id, comprador, telefono, precio, comision_pct, comision, metodo)
  VALUES (v_venta, v_owner, p.tipo_negocio, p.id, trim(p_comprador), nullif(trim(coalesce(p_telefono, '')), ''), p_precio, p_comision_pct, v_com, v_metodo);
  UPDATE public.inm_propiedades SET estado = 'vendido' WHERE id = p.id;

  IF v_com > 0 THEN
    BEGIN
      PERFORM public.pan_asegurar_cuenta(v_owner, p.tipo_negocio, '4135', 'Ventas de servicios', 'ingreso');
      PERFORM public.registrar_asiento_movimiento(v_owner, p.tipo_negocio, v_concepto, 'inm_venta', v_venta,
        jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_com),
                          jsonb_build_object('codigo', '4135', 'haber', v_com)));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'No se pudo registrar el asiento de la venta %: %', v_venta, SQLERRM;
    END;

    PERFORM set_config('gosaryc.pan', 'on', true);
    INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
    VALUES (v_owner, p.tipo_negocio, 'ingreso', left(v_concepto || ' (' || v_metodo || ')', 200), v_com);
    PERFORM set_config('gosaryc.pan', 'off', true);

    SELECT id INTO v_turno FROM public.turnos_caja
     WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
    IF v_turno IS NOT NULL THEN
      INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
      VALUES (v_owner, v_turno, 'venta',
              CASE WHEN v_metodo = 'efectivo' THEN 'efectivo' WHEN v_metodo = 'tarjeta' THEN 'tarjeta' ELSE 'transferencia' END,
              v_concepto, v_com, coalesce(auth.jwt() ->> 'email', ''));
    END IF;
  END IF;
  RETURN jsonb_build_object('comision', v_com, 'precio', p_precio);
END;
$$;
REVOKE ALL ON FUNCTION public.inm_vender(uuid, text, text, numeric, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.inm_vender(uuid, text, text, numeric, numeric, text) TO authenticated;

-- 6. Agro: labores (suman costo al lote) y cosecha (suma producción al lote)
CREATE OR REPLACE FUNCTION public.agr_registrar_labor(p_lote uuid, p_tipo text, p_descripcion text, p_cantidad numeric, p_costo numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  l record;
  v_cant numeric := coalesce(p_cantidad, 0);
  v_costo numeric := coalesce(p_costo, 0);
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_tipo NOT IN ('siembra', 'riego', 'fumigacion', 'poda', 'deshierbe', 'cosecha', 'otra') THEN RAISE EXCEPTION 'Tipo de labor no válido.'; END IF;
  IF v_cant < 0 OR v_costo < 0 THEN RAISE EXCEPTION 'Los valores no pueden ser negativos.'; END IF;
  IF p_tipo = 'cosecha' AND v_cant <= 0 THEN RAISE EXCEPTION 'Escribe la cantidad cosechada.'; END IF;
  SELECT * INTO l FROM public.agr_lotes WHERE id = p_lote AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El lote ya no existe.'; END IF;

  INSERT INTO public.agr_labores (owner_id, tipo_negocio, lote_id, tipo, descripcion, cantidad, costo)
  VALUES (v_owner, l.tipo_negocio, l.id, p_tipo, nullif(left(trim(coalesce(p_descripcion, '')), 300), ''), v_cant, v_costo);
  UPDATE public.agr_lotes
     SET costo_acumulado = costo_acumulado + v_costo,
         stock = CASE WHEN p_tipo = 'cosecha' THEN stock + v_cant ELSE stock END,
         fecha_siembra = CASE WHEN p_tipo = 'siembra' AND fecha_siembra IS NULL THEN current_date ELSE fecha_siembra END
   WHERE id = l.id;
  RETURN jsonb_build_object('costo', v_costo, 'cosecha', CASE WHEN p_tipo = 'cosecha' THEN v_cant ELSE 0 END);
END;
$$;
REVOKE ALL ON FUNCTION public.agr_registrar_labor(uuid, text, text, numeric, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.agr_registrar_labor(uuid, text, text, numeric, numeric) TO authenticated;

-- 7. Contratos recurrentes: genera el cobro del mes como un proyecto por cobrar
CREATE OR REPLACE FUNCTION public.tec_facturar_contrato(p_contrato uuid, p_periodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  c record;
  v_id uuid := gen_random_uuid();
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_periodo IS NULL OR p_periodo !~ '^[0-9]{4}-[0-9]{2}$' THEN RAISE EXCEPTION 'El periodo debe ser AAAA-MM.'; END IF;
  SELECT * INTO c FROM public.tec_contratos WHERE id = p_contrato AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El contrato ya no existe.'; END IF;
  IF NOT c.activo THEN RAISE EXCEPTION 'El contrato está inactivo.'; END IF;
  IF c.ultimo_periodo = p_periodo THEN RAISE EXCEPTION 'Ese periodo ya fue facturado.'; END IF;
  INSERT INTO public.tec_proyectos (id, owner_id, tipo_negocio, cliente, telefono, alcance, valor, estado)
  VALUES (v_id, v_owner, c.tipo_negocio, c.cliente, c.telefono, left(c.concepto || ' · ' || p_periodo, 300), c.valor_mensual, 'entregado');
  UPDATE public.tec_contratos SET ultimo_periodo = p_periodo WHERE id = c.id;
  RETURN jsonb_build_object('proyecto_id', v_id, 'valor', c.valor_mensual);
END;
$$;
REVOKE ALL ON FUNCTION public.tec_facturar_contrato(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.tec_facturar_contrato(uuid, text) TO authenticated;

-- 8. Cobro con retenciones a favor (1355): la caja recibe el valor menos las retenciones
CREATE OR REPLACE FUNCTION public.ofi_cobrar_retencion(p_tabla text, p_id uuid, p_valor numeric, p_metodo text, p_retefuente numeric, p_reteica numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_row_owner uuid;
  v_tipo text;
  v_total numeric;
  v_abono numeric;
  v_cliente text;
  v_nuevo numeric;
  v_rf numeric := coalesce(p_retefuente, 0);
  v_ri numeric := coalesce(p_reteica, 0);
  v_ret numeric;
  v_neto numeric;
  v_metodo text := lower(coalesce(nullif(trim(p_metodo), ''), 'transferencia'));
  v_cuenta text;
  v_turno uuid;
  v_concepto text;
  v_lineas jsonb;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_tabla NOT IN ('prof_casos', 'tec_proyectos') THEN RAISE EXCEPTION 'Módulo no válido.'; END IF;
  IF p_valor IS NULL OR p_valor <= 0 THEN RAISE EXCEPTION 'El valor debe ser mayor a cero.'; END IF;
  IF v_rf < 0 OR v_ri < 0 THEN RAISE EXCEPTION 'Las retenciones no pueden ser negativas.'; END IF;
  v_ret := v_rf + v_ri;
  IF v_ret >= p_valor THEN RAISE EXCEPTION 'Las retenciones no pueden ser iguales o mayores al valor cobrado.'; END IF;
  v_neto := p_valor - v_ret;
  IF v_metodo !~ '^[a-z_ ]{1,30}$' THEN v_metodo := 'transferencia'; END IF;
  v_cuenta := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;

  IF p_tabla = 'prof_casos' THEN
    SELECT owner_id, tipo_negocio, honorarios, abono, cliente INTO v_row_owner, v_tipo, v_total, v_abono, v_cliente
      FROM public.prof_casos WHERE id = p_id FOR UPDATE;
  ELSE
    SELECT owner_id, tipo_negocio, valor, abono, cliente INTO v_row_owner, v_tipo, v_total, v_abono, v_cliente
      FROM public.tec_proyectos WHERE id = p_id FOR UPDATE;
  END IF;
  IF v_row_owner IS NULL THEN RAISE EXCEPTION 'El registro ya no existe.'; END IF;
  IF v_row_owner IS DISTINCT FROM v_owner THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF coalesce(v_abono, 0) + p_valor > v_total THEN RAISE EXCEPTION 'El cobro supera el saldo.'; END IF;
  v_nuevo := coalesce(v_abono, 0) + p_valor;

  IF p_tabla = 'prof_casos' THEN
    UPDATE public.prof_casos SET abono = v_nuevo, estado = CASE WHEN v_nuevo >= honorarios THEN 'cobrado' ELSE estado END WHERE id = p_id;
  ELSE
    UPDATE public.tec_proyectos SET abono = v_nuevo, estado = CASE WHEN v_nuevo >= valor THEN 'cobrado' ELSE estado END WHERE id = p_id;
  END IF;

  v_concepto := CASE WHEN p_tabla = 'prof_casos' THEN 'Honorarios' ELSE 'Proyecto' END || ' · ' || coalesce(v_cliente, '');

  BEGIN
    PERFORM public.pan_asegurar_cuenta(v_owner, v_tipo, '4135', 'Ventas de servicios', 'ingreso');
    v_lineas := jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_neto));
    IF v_ret > 0 THEN
      PERFORM public.pan_asegurar_cuenta(v_owner, v_tipo, '1355', 'Anticipo de impuestos y retenciones', 'activo');
      v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '1355', 'debe', v_ret));
    END IF;
    v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '4135', 'haber', p_valor));
    PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo, v_concepto, 'ofi_cobro', p_id, v_lineas);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento del cobro %: %', p_id, SQLERRM;
  END;

  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, v_tipo, 'ingreso', left(v_concepto || ' (' || v_metodo || ', neto de retenciones)', 200), v_neto);
  PERFORM set_config('gosaryc.pan', 'off', true);

  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'venta',
            CASE WHEN v_metodo = 'efectivo' THEN 'efectivo' WHEN v_metodo = 'tarjeta' THEN 'tarjeta' ELSE 'transferencia' END,
            v_concepto, v_neto, coalesce(auth.jwt() ->> 'email', ''));
  END IF;
  RETURN jsonb_build_object('abonado', v_nuevo, 'total', v_total, 'retenciones', v_ret, 'neto_caja', v_neto);
END;
$$;
REVOKE ALL ON FUNCTION public.ofi_cobrar_retencion(text, uuid, numeric, text, numeric, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ofi_cobrar_retencion(text, uuid, numeric, text, numeric, numeric) TO authenticated;
