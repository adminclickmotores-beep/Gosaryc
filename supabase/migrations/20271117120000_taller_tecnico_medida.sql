-- PROMPT #7 — TALLER / LAVADERO / SERVICIO TÉCNICO / CARPINTERÍA / IMPRENTA
-- Órdenes de trabajo con inventario de recepción y fotos, repuestos, comisiones,
-- garantías y proyectos a la medida con abono y saldo. Todo con
-- owner_id = mi_negocio_id() y RLS estricto. No borra ni trunca datos.

-- ============================================================
-- 1. Órdenes de trabajo (taller, lavadero, servicio técnico, carpintería, imprenta)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tal_ordenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  rubro text NOT NULL DEFAULT 'taller' CHECK (rubro IN ('taller', 'lavadero', 'celulares', 'carpinteria', 'imprenta')),
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  telefono text,
  identificador text NOT NULL CHECK (length(trim(identificador)) >= 2),
  marca text,
  modelo text,
  kilometraje text,
  clave_patron text,
  combustible text,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  estado text NOT NULL DEFAULT 'recibido' CHECK (estado IN ('recibido', 'diagnostico', 'aprobado', 'reparacion', 'listo', 'entregado')),
  tecnico text,
  mano_obra numeric NOT NULL DEFAULT 0 CHECK (mano_obra >= 0),
  repuestos_total numeric NOT NULL DEFAULT 0 CHECK (repuestos_total >= 0),
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  abono numeric NOT NULL DEFAULT 0 CHECK (abono >= 0),
  comision_pct numeric NOT NULL DEFAULT 0 CHECK (comision_pct >= 0 AND comision_pct <= 100),
  comision numeric NOT NULL DEFAULT 0 CHECK (comision >= 0),
  liquidada boolean NOT NULL DEFAULT false,
  liquidacion_id uuid,
  dias_garantia integer NOT NULL DEFAULT 30 CHECK (dias_garantia >= 0 AND dias_garantia <= 365),
  fecha_entrega date,
  notas text,
  registrado_por text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tal_ordenes_owner_idx ON public.tal_ordenes (owner_id, estado, created_at DESC);
CREATE INDEX IF NOT EXISTS tal_ordenes_ident_idx ON public.tal_ordenes (owner_id, identificador);

-- Fotos de recepción (obligatorias antes de diagnosticar; no se borran).
CREATE TABLE IF NOT EXISTS public.tal_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  orden_id uuid NOT NULL REFERENCES public.tal_ordenes(id) ON DELETE RESTRICT,
  ruta text NOT NULL,
  nota text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tal_fotos_orden_idx ON public.tal_fotos (orden_id);

-- Inventario de repuestos e insumos del taller.
CREATE TABLE IF NOT EXISTS public.tal_repuestos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  codigo text,
  stock numeric NOT NULL DEFAULT 0 CHECK (stock >= 0),
  costo numeric NOT NULL DEFAULT 0 CHECK (costo >= 0),
  precio numeric NOT NULL DEFAULT 0 CHECK (precio >= 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tal_repuestos_owner_idx ON public.tal_repuestos (owner_id, nombre);

-- Repuestos aplicados a cada orden (descuentan stock; no se borran).
CREATE TABLE IF NOT EXISTS public.tal_orden_repuestos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  orden_id uuid NOT NULL REFERENCES public.tal_ordenes(id) ON DELETE RESTRICT,
  repuesto_id uuid NOT NULL REFERENCES public.tal_repuestos(id) ON DELETE RESTRICT,
  nombre text NOT NULL,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  costo numeric NOT NULL DEFAULT 0 CHECK (costo >= 0),
  precio numeric NOT NULL DEFAULT 0 CHECK (precio >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tal_orden_rep_orden_idx ON public.tal_orden_repuestos (orden_id);

-- Liquidaciones de comisiones por técnico / operario.
CREATE TABLE IF NOT EXISTS public.tal_liquidaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  profesional text NOT NULL,
  ordenes integer NOT NULL DEFAULT 0,
  total_mano numeric NOT NULL DEFAULT 0,
  total_comision numeric NOT NULL DEFAULT 0,
  metodo text NOT NULL DEFAULT 'efectivo',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tal_liq_owner_idx ON public.tal_liquidaciones (owner_id, created_at DESC);

-- Proyectos a la medida (carpintería / mueblería e imprenta / publicidad).
CREATE TABLE IF NOT EXISTS public.tal_proyectos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  rubro text NOT NULL DEFAULT 'carpinteria' CHECK (rubro IN ('carpinteria', 'imprenta')),
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  telefono text,
  titulo text NOT NULL CHECK (length(trim(titulo)) >= 2),
  descripcion text,
  materiales jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  abono numeric NOT NULL DEFAULT 0 CHECK (abono >= 0),
  saldo numeric NOT NULL DEFAULT 0 CHECK (saldo >= 0),
  fecha_entrega date,
  estado text NOT NULL DEFAULT 'cotizado' CHECK (estado IN ('cotizado', 'aprobado', 'produccion', 'listo', 'entregado')),
  registrado_por text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tal_proy_owner_idx ON public.tal_proyectos (owner_id, estado, created_at DESC);

-- ============================================================
-- 2. RLS estricto + sin borrado físico
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['tal_ordenes', 'tal_fotos', 'tal_repuestos', 'tal_orden_repuestos', 'tal_liquidaciones', 'tal_proyectos'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_leer', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_leer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_mi_negocio', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id())', t || '_solo_mi_negocio', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_tipo_actual', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual()) WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())', t || '_solo_tipo_actual', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM authenticated', t);
  END LOOP;

  DROP POLICY IF EXISTS "tal_ordenes_crear" ON public.tal_ordenes;
  CREATE POLICY "tal_ordenes_crear" ON public.tal_ordenes FOR INSERT TO authenticated
    WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
  DROP POLICY IF EXISTS "tal_ordenes_editar" ON public.tal_ordenes;
  CREATE POLICY "tal_ordenes_editar" ON public.tal_ordenes FOR UPDATE TO authenticated
    USING (owner_id = public.mi_negocio_id() AND public.es_personal())
    WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

  DROP POLICY IF EXISTS "tal_fotos_crear" ON public.tal_fotos;
  CREATE POLICY "tal_fotos_crear" ON public.tal_fotos FOR INSERT TO authenticated
    WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

  DROP POLICY IF EXISTS "tal_repuestos_gestion" ON public.tal_repuestos;
  CREATE POLICY "tal_repuestos_gestion" ON public.tal_repuestos FOR INSERT TO authenticated
    WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
  DROP POLICY IF EXISTS "tal_repuestos_editar" ON public.tal_repuestos;
  CREATE POLICY "tal_repuestos_editar" ON public.tal_repuestos FOR UPDATE TO authenticated
    USING (owner_id = public.mi_negocio_id() AND public.es_personal())
    WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

  DROP POLICY IF EXISTS "tal_proyectos_crear" ON public.tal_proyectos;
  CREATE POLICY "tal_proyectos_crear" ON public.tal_proyectos FOR INSERT TO authenticated
    WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
  DROP POLICY IF EXISTS "tal_proyectos_editar" ON public.tal_proyectos;
  CREATE POLICY "tal_proyectos_editar" ON public.tal_proyectos FOR UPDATE TO authenticated
    USING (owner_id = public.mi_negocio_id() AND public.es_personal())
    WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

  FOREACH t IN ARRAY ARRAY['tal_ordenes', 'tal_fotos', 'tal_repuestos', 'tal_orden_repuestos', 'tal_liquidaciones', 'tal_proyectos'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero()', t);
  END LOOP;
END $$;

-- ============================================================
-- 3. Agregar repuesto a la orden (descuenta stock y suma su costo)
-- ============================================================
CREATE OR REPLACE FUNCTION public.tal_agregar_repuesto(p_orden uuid, p_repuesto uuid, p_cantidad numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  o record;
  r record;
  v_total numeric;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor a cero.'; END IF;
  SELECT * INTO o FROM public.tal_ordenes WHERE id = p_orden AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La orden ya no existe.'; END IF;
  IF o.estado = 'entregado' THEN RAISE EXCEPTION 'La orden ya fue entregada.'; END IF;
  SELECT * INTO r FROM public.tal_repuestos WHERE id = p_repuesto AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El repuesto ya no existe.'; END IF;
  IF r.stock < p_cantidad THEN RAISE EXCEPTION 'No hay suficiente % (quedan %).', r.nombre, r.stock; END IF;

  UPDATE public.tal_repuestos SET stock = r.stock - p_cantidad WHERE id = r.id;
  INSERT INTO public.tal_orden_repuestos (owner_id, tipo_negocio, orden_id, repuesto_id, nombre, cantidad, costo, precio)
  VALUES (v_owner, o.tipo_negocio, o.id, r.id, r.nombre, p_cantidad, r.costo * p_cantidad, r.precio * p_cantidad);

  SELECT coalesce(sum(precio), 0) INTO v_total FROM public.tal_orden_repuestos WHERE orden_id = o.id AND owner_id = v_owner;
  UPDATE public.tal_ordenes
     SET repuestos_total = v_total,
         total = mano_obra + v_total,
         comision = round(mano_obra * comision_pct / 100, 2)
   WHERE id = o.id;
  RETURN jsonb_build_object('repuestos_total', v_total);
END;
$$;
REVOKE ALL ON FUNCTION public.tal_agregar_repuesto(uuid, uuid, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.tal_agregar_repuesto(uuid, uuid, numeric) TO authenticated;

-- ============================================================
-- 4. Cobrar y entregar la orden (entra a Caja y Contabilidad, calcula comisión y garantía)
-- ============================================================
CREATE OR REPLACE FUNCTION public.tal_cobrar_orden(p_orden uuid, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  o record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_pendiente numeric;
  v_cuenta text := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  v_turno uuid;
  v_concepto text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO o FROM public.tal_ordenes WHERE id = p_orden AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La orden ya no existe.'; END IF;
  IF o.estado = 'entregado' THEN RAISE EXCEPTION 'La orden ya fue entregada.'; END IF;
  v_pendiente := greatest(o.total - o.abono, 0);
  IF v_pendiente <= 0 THEN RAISE EXCEPTION 'Esta orden no tiene saldo pendiente.'; END IF;
  v_concepto := 'Orden #' || upper(left(o.id::text, 6)) || ' · ' || coalesce(o.identificador, '');

  UPDATE public.tal_ordenes
     SET estado = 'entregado',
         abono = total,
         comision = round(mano_obra * comision_pct / 100, 2),
         registrado_por = coalesce(auth.jwt() ->> 'email', registrado_por)
   WHERE id = o.id;

  BEGIN
    PERFORM public.pan_asegurar_cuenta(v_owner, o.tipo_negocio, '4135', 'Ventas de servicios', 'ingreso');
    PERFORM public.registrar_asiento_movimiento(v_owner, o.tipo_negocio, v_concepto, 'tal_orden', o.id,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_pendiente),
                        jsonb_build_object('codigo', '4135', 'haber', v_pendiente)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento de la orden %: %', o.id, SQLERRM;
  END;

  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, o.tipo_negocio, 'ingreso', left(v_concepto || ' (' || v_metodo || ')', 200), v_pendiente);
  PERFORM set_config('gosaryc.pan', 'off', true);

  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'venta',
            CASE WHEN v_metodo = 'efectivo' THEN 'efectivo' WHEN v_metodo = 'tarjeta' THEN 'tarjeta' ELSE 'transferencia' END,
            v_concepto, v_pendiente, coalesce(auth.jwt() ->> 'email', ''));
  END IF;

  RETURN jsonb_build_object('cobrado', v_pendiente, 'garantia_dias', o.dias_garantia);
END;
$$;
REVOKE ALL ON FUNCTION public.tal_cobrar_orden(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.tal_cobrar_orden(uuid, text) TO authenticated;

-- ============================================================
-- 5. Liquidar comisiones del técnico / operario (solo el dueño; sale de Caja)
-- ============================================================
CREATE OR REPLACE FUNCTION public.tal_liquidar(p_profesional text, p_metodo text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_prof text := nullif(trim(p_profesional), '');
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_total numeric := 0;
  v_n integer := 0;
  v_liq uuid := gen_random_uuid();
  v_turno uuid;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF NOT public.es_admin() THEN RAISE EXCEPTION 'Solo el dueño liquida comisiones.'; END IF;
  IF v_prof IS NULL THEN RAISE EXCEPTION 'Escribe quién recibe la liquidación.'; END IF;

  SELECT coalesce(sum(comision), 0), count(*) INTO v_total, v_n FROM public.tal_ordenes
   WHERE owner_id = v_owner AND tecnico = v_prof AND estado = 'entregado'
     AND NOT liquidada AND comision > 0;
  IF v_total <= 0 THEN RAISE EXCEPTION 'No hay comisiones pendientes para este técnico.'; END IF;

  INSERT INTO public.tal_liquidaciones (id, owner_id, tipo_negocio, profesional, ordenes, total_mano, total_comision, metodo)
  SELECT v_liq, v_owner, public.tipo_negocio_actual(), v_prof, v_n, coalesce(sum(mano_obra), 0), v_total, v_metodo
    FROM public.tal_ordenes WHERE owner_id = v_owner AND tecnico = v_prof AND estado = 'entregado' AND NOT liquidada AND comision > 0;

  UPDATE public.tal_ordenes SET liquidada = true, liquidacion_id = v_liq
   WHERE owner_id = v_owner AND tecnico = v_prof AND estado = 'entregado' AND NOT liquidada AND comision > 0;

  BEGIN
    PERFORM public.registrar_asiento_movimiento(v_owner, public.tipo_negocio_actual(),
      'Comisiones ' || v_prof, 'tal_liquidacion', v_liq,
      jsonb_build_array(jsonb_build_object('codigo', '5205', 'debe', v_total),
                        jsonb_build_object('codigo', '1105', 'haber', v_total)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento de la liquidación: %', SQLERRM;
  END;

  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, public.tipo_negocio_actual(), 'egreso', left('Comisiones ' || v_prof, 200), v_total);
  PERFORM set_config('gosaryc.pan', 'off', true);

  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'gasto', 'efectivo', 'Comisiones ' || v_prof, v_total, coalesce(auth.jwt() ->> 'email', ''));
  END IF;

  RETURN v_total;
END;
$$;
REVOKE ALL ON FUNCTION public.tal_liquidar(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.tal_liquidar(text, text) TO authenticated;

-- ============================================================
-- 6. Cobrar abono o saldo de un proyecto a la medida (entra a Caja y Contabilidad)
-- ============================================================
CREATE OR REPLACE FUNCTION public.tal_cobrar_proyecto(p_proyecto uuid, p_monto numeric, p_metodo text, p_es_abono boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  pr record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_monto numeric := coalesce(p_monto, 0);
  v_cuenta text := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  v_turno uuid;
  v_concepto text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF v_monto <= 0 THEN RAISE EXCEPTION 'El valor debe ser mayor a cero.'; END IF;
  SELECT * INTO pr FROM public.tal_proyectos WHERE id = p_proyecto AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El proyecto ya no existe.'; END IF;

  IF coalesce(p_es_abono, true) THEN
    UPDATE public.tal_proyectos
       SET abono = abono + v_monto, saldo = greatest(total - (abono + v_monto), 0),
           estado = CASE WHEN estado = 'cotizado' THEN 'aprobado' ELSE estado END
     WHERE id = pr.id;
    v_concepto := 'Abono proyecto ' || left(pr.titulo, 60);
  ELSE
    IF v_monto > pr.saldo THEN RAISE EXCEPTION 'El cobro supera el saldo pendiente.'; END IF;
    UPDATE public.tal_proyectos
       SET abono = abono + v_monto, saldo = saldo - v_monto,
           estado = CASE WHEN saldo - v_monto <= 0 THEN 'entregado' ELSE estado END
     WHERE id = pr.id;
    v_concepto := 'Saldo proyecto ' || left(pr.titulo, 60);
  END IF;

  BEGIN
    PERFORM public.pan_asegurar_cuenta(v_owner, pr.tipo_negocio, '4135', 'Ventas de servicios', 'ingreso');
    PERFORM public.registrar_asiento_movimiento(v_owner, pr.tipo_negocio, v_concepto, 'tal_proyecto', pr.id,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_monto),
                        jsonb_build_object('codigo', '4135', 'haber', v_monto)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento del proyecto %: %', pr.id, SQLERRM;
  END;

  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, pr.tipo_negocio, 'ingreso', left(v_concepto || ' (' || v_metodo || ')', 200), v_monto);
  PERFORM set_config('gosaryc.pan', 'off', true);

  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'venta',
            CASE WHEN v_metodo = 'efectivo' THEN 'efectivo' WHEN v_metodo = 'tarjeta' THEN 'tarjeta' ELSE 'transferencia' END,
            v_concepto, v_monto, coalesce(auth.jwt() ->> 'email', ''));
  END IF;

  RETURN jsonb_build_object('cobrado', v_monto);
END;
$$;
REVOKE ALL ON FUNCTION public.tal_cobrar_proyecto(uuid, numeric, text, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.tal_cobrar_proyecto(uuid, numeric, text, boolean) TO authenticated;
