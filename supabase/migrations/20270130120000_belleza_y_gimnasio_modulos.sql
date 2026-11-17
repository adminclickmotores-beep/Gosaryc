-- PELUQUERÍA / BARBERÍA / SPA (agenda, ficha técnica, insumos, comisiones) Y GIMNASIO (membresías, check-in, valoración)
-- Todo con owner_id = mi_negocio_id() y RLS estricto. Sin borrado físico. No borra ni trunca datos.

-- ============================================================
-- 1. Tablas de belleza
-- ============================================================
CREATE TABLE IF NOT EXISTS public.bel_servicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  duracion_min integer NOT NULL DEFAULT 30 CHECK (duracion_min > 0),
  precio numeric NOT NULL DEFAULT 0 CHECK (precio >= 0),
  comision_pct numeric NOT NULL DEFAULT 40 CHECK (comision_pct >= 0 AND comision_pct <= 100),
  descontar_insumos boolean NOT NULL DEFAULT true,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bel_insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  unidad text NOT NULL DEFAULT 'g',
  stock numeric NOT NULL DEFAULT 0 CHECK (stock >= 0),
  costo_unitario numeric NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bel_servicio_insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  servicio_id uuid NOT NULL REFERENCES public.bel_servicios(id) ON DELETE RESTRICT,
  insumo_id uuid NOT NULL REFERENCES public.bel_insumos(id) ON DELETE RESTRICT,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bel_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  telefono text,
  alergias text,
  notas text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bel_citas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cliente_id uuid NOT NULL REFERENCES public.bel_clientes(id) ON DELETE RESTRICT,
  servicio_id uuid REFERENCES public.bel_servicios(id) ON DELETE RESTRICT,
  profesional text NOT NULL CHECK (length(trim(profesional)) >= 2),
  recurso text,
  inicio timestamptz NOT NULL,
  duracion_min integer NOT NULL DEFAULT 30 CHECK (duracion_min > 0),
  estado text NOT NULL DEFAULT 'agendada' CHECK (estado IN ('agendada', 'en_atencion', 'atendida', 'no_asistio', 'cancelada')),
  notas text,
  recordatorio_enviado boolean NOT NULL DEFAULT false,
  atencion_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bel_fichas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cliente_id uuid NOT NULL REFERENCES public.bel_clientes(id) ON DELETE RESTRICT,
  cita_id uuid REFERENCES public.bel_citas(id) ON DELETE RESTRICT,
  fecha date NOT NULL DEFAULT current_date,
  profesional text,
  formula text,
  notas text,
  foto_antes text,
  foto_despues text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bel_atenciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cliente_id uuid REFERENCES public.bel_clientes(id) ON DELETE RESTRICT,
  cita_id uuid REFERENCES public.bel_citas(id) ON DELETE RESTRICT,
  profesional text NOT NULL,
  servicio_id uuid REFERENCES public.bel_servicios(id) ON DELETE RESTRICT,
  concepto text NOT NULL,
  tipo text NOT NULL DEFAULT 'servicio' CHECK (tipo IN ('servicio', 'producto')),
  precio numeric NOT NULL CHECK (precio > 0),
  costo_insumos numeric NOT NULL DEFAULT 0 CHECK (costo_insumos >= 0),
  base_comision numeric NOT NULL DEFAULT 0,
  comision_pct numeric NOT NULL DEFAULT 0,
  comision numeric NOT NULL DEFAULT 0 CHECK (comision >= 0),
  metodo text NOT NULL DEFAULT 'efectivo',
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'liquidada')),
  liquidacion_id uuid,
  fecha date NOT NULL DEFAULT current_date,
  registrado_por text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bel_consumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  atencion_id uuid NOT NULL REFERENCES public.bel_atenciones(id) ON DELETE RESTRICT,
  insumo_id uuid NOT NULL REFERENCES public.bel_insumos(id) ON DELETE RESTRICT,
  nombre text NOT NULL,
  cantidad numeric NOT NULL,
  costo numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bel_liquidaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  profesional text NOT NULL,
  hasta date NOT NULL,
  atenciones integer NOT NULL DEFAULT 0,
  total_ventas numeric NOT NULL DEFAULT 0,
  total_comision numeric NOT NULL CHECK (total_comision > 0),
  metodo text NOT NULL DEFAULT 'efectivo',
  pagada_por text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS bel_citas_owner_idx ON public.bel_citas (owner_id, inicio);
CREATE INDEX IF NOT EXISTS bel_fichas_cliente_idx ON public.bel_fichas (cliente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS bel_atenciones_owner_idx ON public.bel_atenciones (owner_id, estado, profesional);
CREATE INDEX IF NOT EXISTS bel_consumos_atencion_idx ON public.bel_consumos (atencion_id);

-- ============================================================
-- 2. Tablas de gimnasio
-- ============================================================
CREATE TABLE IF NOT EXISTS public.gim_planes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  tipo text NOT NULL DEFAULT 'mensual' CHECK (tipo IN ('tiquetera', 'mensual', 'trimestral', 'semestral', 'anual')),
  duracion_dias integer NOT NULL CHECK (duracion_dias > 0),
  sesiones integer CHECK (sesiones IS NULL OR sesiones > 0),
  precio numeric NOT NULL DEFAULT 0 CHECK (precio >= 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gim_socios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  documento text NOT NULL CHECK (length(trim(documento)) >= 3),
  codigo_qr text NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
  telefono text,
  correo text,
  contacto_emergencia text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS gim_socios_documento_idx ON public.gim_socios (owner_id, lower(documento));
CREATE UNIQUE INDEX IF NOT EXISTS gim_socios_qr_idx ON public.gim_socios (owner_id, codigo_qr);

CREATE TABLE IF NOT EXISTS public.gim_membresias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  socio_id uuid NOT NULL REFERENCES public.gim_socios(id) ON DELETE RESTRICT,
  plan_id uuid NOT NULL REFERENCES public.gim_planes(id) ON DELETE RESTRICT,
  plan_nombre text NOT NULL,
  inicio date NOT NULL,
  vence date NOT NULL,
  sesiones_restantes integer,
  estado text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'congelada')),
  congelada_desde date,
  motivo_congelamiento text,
  dias_congelados integer NOT NULL DEFAULT 0,
  precio numeric NOT NULL DEFAULT 0,
  metodo text NOT NULL DEFAULT 'efectivo',
  registrado_por text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gim_accesos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  socio_id uuid REFERENCES public.gim_socios(id) ON DELETE RESTRICT,
  membresia_id uuid REFERENCES public.gim_membresias(id) ON DELETE RESTRICT,
  codigo text,
  resultado text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gim_valoraciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  socio_id uuid NOT NULL REFERENCES public.gim_socios(id) ON DELETE RESTRICT,
  fecha date NOT NULL DEFAULT current_date,
  peso_kg numeric CHECK (peso_kg IS NULL OR peso_kg > 0),
  estatura_cm numeric CHECK (estatura_cm IS NULL OR estatura_cm > 0),
  grasa_pct numeric CHECK (grasa_pct IS NULL OR (grasa_pct >= 0 AND grasa_pct <= 100)),
  masa_muscular_kg numeric CHECK (masa_muscular_kg IS NULL OR masa_muscular_kg >= 0),
  pecho_cm numeric,
  cintura_cm numeric,
  cadera_cm numeric,
  brazo_cm numeric,
  muslo_cm numeric,
  rutina text,
  entrenador text,
  notas text,
  registrado_por text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gim_membresias_socio_idx ON public.gim_membresias (socio_id, vence DESC);
CREATE INDEX IF NOT EXISTS gim_accesos_owner_idx ON public.gim_accesos (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS gim_valoraciones_socio_idx ON public.gim_valoraciones (socio_id, fecha DESC);

-- ============================================================
-- 3. Integridad
-- ============================================================
CREATE OR REPLACE FUNCTION public.bel_sin_borrado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Este registro no se puede borrar. Si es un error, desactívalo o registra uno nuevo.';
END;
$$;

CREATE OR REPLACE FUNCTION public.bel_registro_inmutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Las fichas técnicas y las valoraciones no se modifican ni se borran. Registra una nueva.';
END;
$$;

-- Las citas solo pasan a "atendida" con la función que cobra el servicio; y no pueden cruzarse.
CREATE OR REPLACE FUNCTION public.bel_citas_proteger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND auth.uid() IS NOT NULL AND coalesce(current_setting('gosaryc.bel_fn', true), '') <> 'on' THEN
    IF OLD.estado IN ('atendida', 'no_asistio', 'cancelada') THEN RAISE EXCEPTION 'Esta cita ya está cerrada.'; END IF;
    IF NEW.estado = 'atendida' OR NEW.atencion_id IS DISTINCT FROM OLD.atencion_id THEN
      RAISE EXCEPTION 'La cita se finaliza con el botón "Cobrar y finalizar".';
    END IF;
    IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN RAISE EXCEPTION 'No se puede cambiar de negocio.'; END IF;
  END IF;

  IF NEW.estado IN ('agendada', 'en_atencion') THEN
    IF EXISTS (
      SELECT 1 FROM public.bel_citas c
       WHERE c.owner_id = NEW.owner_id AND c.id <> NEW.id AND c.estado IN ('agendada', 'en_atencion')
         AND (lower(c.profesional) = lower(NEW.profesional)
              OR (coalesce(NEW.recurso, '') <> '' AND lower(coalesce(c.recurso, '')) = lower(NEW.recurso)))
         AND c.inicio < NEW.inicio + make_interval(mins => NEW.duracion_min)
         AND c.inicio + make_interval(mins => c.duracion_min) > NEW.inicio
    ) THEN
      RAISE EXCEPTION 'Esa hora se cruza con otra cita del mismo profesional o de la misma silla o cabina.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_bel_citas_proteger ON public.bel_citas;
CREATE TRIGGER trg_bel_citas_proteger BEFORE INSERT OR UPDATE ON public.bel_citas
  FOR EACH ROW EXECUTE FUNCTION public.bel_citas_proteger();

-- ============================================================
-- 4. RLS estricto
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bel_servicios', 'bel_insumos', 'bel_servicio_insumos', 'bel_clientes', 'bel_citas', 'bel_fichas', 'bel_atenciones',
    'bel_consumos', 'bel_liquidaciones', 'gim_planes', 'gim_socios', 'gim_membresias', 'gim_accesos', 'gim_valoraciones'
  ] LOOP
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
    EXECUTE format('CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bel_sin_borrado()', t);
  END LOOP;

  -- Crear directamente (catálogos, clientes, citas, fichas, valoraciones). El dinero, los insumos descontados,
  -- las membresías y los accesos solo se escriben con las funciones de abajo.
  FOREACH t IN ARRAY ARRAY['bel_servicios', 'bel_insumos', 'bel_servicio_insumos', 'bel_clientes', 'bel_citas', 'bel_fichas', 'gim_planes', 'gim_socios', 'gim_valoraciones'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_crear', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_crear', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['bel_servicios', 'bel_insumos', 'bel_servicio_insumos', 'bel_clientes', 'bel_citas', 'gim_planes', 'gim_socios'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_editar', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal()) WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_editar', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['bel_fichas', 'gim_valoraciones'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_registro_inmutable ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_registro_inmutable BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bel_registro_inmutable()', t);
  END LOOP;
END $$;

-- ============================================================
-- 5. Belleza: cobrar el servicio o producto (descuenta insumos, calcula comisión, entra a Caja y Contabilidad)
-- ============================================================
CREATE OR REPLACE FUNCTION public.bel_registrar_atencion(
  p_cita uuid, p_cliente uuid, p_profesional text, p_servicio uuid, p_concepto text, p_tipo text,
  p_precio numeric, p_costo numeric, p_comision_pct numeric, p_metodo text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v_id uuid := gen_random_uuid();
  c record;
  s record;
  r record;
  n record;
  v_cliente uuid := p_cliente;
  v_prof text := nullif(trim(coalesce(p_profesional, '')), '');
  v_serv uuid := p_servicio;
  v_concepto text := nullif(trim(coalesce(p_concepto, '')), '');
  v_kind text := CASE WHEN p_tipo = 'producto' THEN 'producto' ELSE 'servicio' END;
  v_precio numeric := p_precio;
  v_pct numeric := p_comision_pct;
  v_costo numeric := 0;
  v_desc_ins boolean := true;
  v_base numeric;
  v_com numeric;
  v_cuenta text;
  v_metodo text := CASE WHEN coalesce(p_metodo, 'efectivo') = 'efectivo' THEN 'efectivo' ELSE 'transferencia' END;
  v_turno uuid;
  v_conc text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  v_cuenta := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;

  IF p_cita IS NOT NULL THEN
    SELECT * INTO c FROM public.bel_citas WHERE id = p_cita AND owner_id = v_owner FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Cita no encontrada.'; END IF;
    IF c.estado NOT IN ('agendada', 'en_atencion') THEN RAISE EXCEPTION 'Esta cita ya está cerrada.'; END IF;
    v_cliente := c.cliente_id;
    v_prof := c.profesional;
    v_serv := coalesce(v_serv, c.servicio_id);
    v_kind := 'servicio';
  END IF;
  IF v_prof IS NULL THEN RAISE EXCEPTION 'Elige quién atendió.'; END IF;

  IF v_serv IS NOT NULL THEN
    SELECT * INTO s FROM public.bel_servicios WHERE id = v_serv AND owner_id = v_owner AND activo;
    IF NOT FOUND THEN RAISE EXCEPTION 'El servicio no existe.'; END IF;
    v_concepto := s.nombre;
    v_precio := coalesce(v_precio, s.precio);
    v_pct := coalesce(v_pct, s.comision_pct);
    v_desc_ins := s.descontar_insumos;
  ELSE
    IF v_concepto IS NULL THEN RAISE EXCEPTION 'Escribe qué se vendió o se hizo.'; END IF;
    v_costo := greatest(coalesce(p_costo, 0), 0);
  END IF;
  IF v_precio IS NULL OR v_precio <= 0 THEN RAISE EXCEPTION 'El precio debe ser mayor a cero.'; END IF;
  v_pct := coalesce(v_pct, 0);
  IF v_pct < 0 OR v_pct > 100 THEN RAISE EXCEPTION 'La comisión debe estar entre 0 y 100.'; END IF;

  INSERT INTO public.bel_atenciones (id, owner_id, tipo_negocio, cliente_id, cita_id, profesional, servicio_id, concepto, tipo,
                                     precio, costo_insumos, base_comision, comision_pct, comision, metodo, registrado_por)
  VALUES (v_id, v_owner, v_tipo, v_cliente, p_cita, v_prof, v_serv, v_concepto, v_kind, v_precio, 0, 0, v_pct, 0, v_metodo,
          coalesce(auth.jwt() ->> 'email', ''));

  -- Insumos del servicio: se descuentan solos.
  IF v_serv IS NOT NULL THEN
    FOR r IN SELECT * FROM public.bel_servicio_insumos WHERE servicio_id = v_serv AND owner_id = v_owner LOOP
      SELECT * INTO n FROM public.bel_insumos WHERE id = r.insumo_id AND owner_id = v_owner FOR UPDATE;
      IF NOT FOUND THEN CONTINUE; END IF;
      IF n.stock < r.cantidad THEN
        RAISE EXCEPTION 'No hay suficiente % para este servicio (quedan % %).', n.nombre, round(n.stock, 3), n.unidad;
      END IF;
      UPDATE public.bel_insumos SET stock = n.stock - r.cantidad WHERE id = n.id;
      INSERT INTO public.bel_consumos (owner_id, tipo_negocio, atencion_id, insumo_id, nombre, cantidad, costo)
      VALUES (v_owner, v_tipo, v_id, n.id, n.nombre, r.cantidad, round(r.cantidad * n.costo_unitario, 2));
      v_costo := v_costo + round(r.cantidad * n.costo_unitario, 2);
    END LOOP;
  END IF;

  v_base := CASE WHEN v_kind = 'producto' OR v_desc_ins THEN greatest(v_precio - v_costo, 0) ELSE v_precio END;
  v_com := round(v_base * v_pct / 100, 2);
  UPDATE public.bel_atenciones SET costo_insumos = v_costo, base_comision = v_base, comision = v_com WHERE id = v_id;

  -- Caja y contabilidad.
  v_conc := left('Peluquería/Spa: ' || v_concepto || ' (' || v_prof || ')', 200);
  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, v_tipo, 'ingreso', v_conc, v_precio);
  PERFORM set_config('gosaryc.pan', 'off', true);
  BEGIN
    PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo, v_conc, 'bel_atencion', v_id,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', round(v_precio, 2)),
                        jsonb_build_object('codigo', '4135', 'haber', round(v_precio, 2))));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento de la atención %: %', v_id, SQLERRM;
  END;
  SELECT id INTO v_turno FROM public.turnos_caja WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'venta', v_metodo, v_conc, v_precio, coalesce(auth.jwt() ->> 'email', ''));
  END IF;

  IF p_cita IS NOT NULL THEN
    PERFORM set_config('gosaryc.bel_fn', 'on', true);
    UPDATE public.bel_citas SET estado = 'atendida', atencion_id = v_id WHERE id = p_cita;
    PERFORM set_config('gosaryc.bel_fn', 'off', true);
  END IF;

  RETURN jsonb_build_object('atencion_id', v_id, 'precio', v_precio, 'costo_insumos', v_costo, 'comision', v_com);
END;
$$;
REVOKE ALL ON FUNCTION public.bel_registrar_atencion(uuid, uuid, text, uuid, text, text, numeric, numeric, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bel_registrar_atencion(uuid, uuid, text, uuid, text, text, numeric, numeric, numeric, text) TO authenticated;

-- Liquidación: solo el dueño. Paga lo pendiente del profesional: sale de Caja y queda en Contabilidad.
CREATE OR REPLACE FUNCTION public.bel_liquidar_comisiones(p_profesional text, p_hasta date, p_metodo text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v_id uuid := gen_random_uuid();
  v_hasta date := coalesce(p_hasta, current_date);
  v_total numeric;
  v_ventas numeric;
  v_n integer;
  v_metodo text := CASE WHEN coalesce(p_metodo, 'efectivo') = 'efectivo' THEN 'efectivo' ELSE 'transferencia' END;
  v_cuenta text;
  v_turno uuid;
  v_conc text := left('Liquidación de comisiones: ' || p_profesional, 200);
BEGIN
  IF v_owner IS NULL OR NOT public.es_admin() THEN RAISE EXCEPTION 'Solo el dueño puede liquidar comisiones.'; END IF;
  v_cuenta := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  SELECT coalesce(sum(comision), 0), coalesce(sum(precio), 0), count(*) INTO v_total, v_ventas, v_n
    FROM public.bel_atenciones
   WHERE owner_id = v_owner AND estado = 'pendiente' AND profesional = p_profesional AND fecha <= v_hasta AND comision > 0;
  IF v_total <= 0 THEN RAISE EXCEPTION 'No hay comisiones pendientes para liquidar.'; END IF;

  INSERT INTO public.bel_liquidaciones (id, owner_id, tipo_negocio, profesional, hasta, atenciones, total_ventas, total_comision, metodo, pagada_por)
  VALUES (v_id, v_owner, v_tipo, p_profesional, v_hasta, v_n, v_ventas, v_total, v_metodo, coalesce(auth.jwt() ->> 'email', ''));

  UPDATE public.bel_atenciones SET estado = 'liquidada', liquidacion_id = v_id
   WHERE owner_id = v_owner AND estado = 'pendiente' AND profesional = p_profesional AND fecha <= v_hasta AND comision > 0;

  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, v_tipo, 'gasto', v_conc, v_total);
  PERFORM set_config('gosaryc.pan', 'off', true);
  PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo, v_conc, 'bel_liquidacion', v_id,
    jsonb_build_array(jsonb_build_object('codigo', '5105', 'debe', round(v_total, 2)),
                      jsonb_build_object('codigo', v_cuenta, 'haber', round(v_total, 2))));
  SELECT id INTO v_turno FROM public.turnos_caja WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'gasto', v_metodo, v_conc, v_total, coalesce(auth.jwt() ->> 'email', ''));
  END IF;
  RETURN v_total;
END;
$$;
REVOKE ALL ON FUNCTION public.bel_liquidar_comisiones(text, date, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.bel_liquidar_comisiones(text, date, text) TO authenticated;

-- ============================================================
-- 6. Gimnasio: venta de membresía, congelamiento y check-in
-- ============================================================
CREATE OR REPLACE FUNCTION public.gim_vender_membresia(p_socio uuid, p_plan uuid, p_inicio date, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v_id uuid := gen_random_uuid();
  s record;
  p record;
  v_inicio date;
  v_vence date;
  v_ultima date;
  v_metodo text := CASE WHEN coalesce(p_metodo, 'efectivo') = 'efectivo' THEN 'efectivo' ELSE 'transferencia' END;
  v_cuenta text;
  v_turno uuid;
  v_conc text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  v_cuenta := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  SELECT * INTO s FROM public.gim_socios WHERE id = p_socio AND owner_id = v_owner AND activo;
  IF NOT FOUND THEN RAISE EXCEPTION 'El socio no existe.'; END IF;
  SELECT * INTO p FROM public.gim_planes WHERE id = p_plan AND owner_id = v_owner AND activo;
  IF NOT FOUND THEN RAISE EXCEPTION 'El plan no existe.'; END IF;

  -- Si ya tiene una membresía vigente, la nueva empieza cuando termina la anterior.
  SELECT max(vence) INTO v_ultima FROM public.gim_membresias WHERE socio_id = s.id AND vence >= current_date;
  v_inicio := coalesce(p_inicio, CASE WHEN v_ultima IS NOT NULL THEN v_ultima + 1 ELSE current_date END);
  v_vence := v_inicio + p.duracion_dias;

  INSERT INTO public.gim_membresias (id, owner_id, tipo_negocio, socio_id, plan_id, plan_nombre, inicio, vence, sesiones_restantes,
                                     precio, metodo, registrado_por)
  VALUES (v_id, v_owner, v_tipo, s.id, p.id, p.nombre, v_inicio, v_vence, p.sesiones, p.precio, v_metodo, coalesce(auth.jwt() ->> 'email', ''));

  IF p.precio > 0 THEN
    v_conc := left('Membresía ' || p.nombre || ': ' || s.nombre, 200);
    PERFORM set_config('gosaryc.pan', 'on', true);
    INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
    VALUES (v_owner, v_tipo, 'ingreso', v_conc, p.precio);
    PERFORM set_config('gosaryc.pan', 'off', true);
    BEGIN
      PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo, v_conc, 'gim_membresia', v_id,
        jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', round(p.precio, 2)),
                          jsonb_build_object('codigo', '4135', 'haber', round(p.precio, 2))));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'No se pudo registrar el asiento de la membresía %: %', v_id, SQLERRM;
    END;
    SELECT id INTO v_turno FROM public.turnos_caja WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
    IF v_turno IS NOT NULL THEN
      INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
      VALUES (v_owner, v_turno, 'venta', v_metodo, v_conc, p.precio, coalesce(auth.jwt() ->> 'email', ''));
    END IF;
  END IF;
  RETURN jsonb_build_object('membresia_id', v_id, 'inicio', v_inicio, 'vence', v_vence);
END;
$$;
REVOKE ALL ON FUNCTION public.gim_vender_membresia(uuid, uuid, date, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.gim_vender_membresia(uuid, uuid, date, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.gim_congelar_membresia(p_membresia uuid, p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  m record;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_motivo IS NULL OR length(trim(p_motivo)) < 3 THEN RAISE EXCEPTION 'Escribe el motivo (por ejemplo, incapacidad).'; END IF;
  SELECT * INTO m FROM public.gim_membresias WHERE id = p_membresia AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La membresía no existe.'; END IF;
  IF m.estado = 'congelada' THEN RAISE EXCEPTION 'Esta membresía ya está congelada.'; END IF;
  IF m.vence < current_date THEN RAISE EXCEPTION 'Esta membresía ya venció.'; END IF;
  UPDATE public.gim_membresias SET estado = 'congelada', congelada_desde = current_date, motivo_congelamiento = trim(p_motivo) WHERE id = m.id;
END;
$$;
REVOKE ALL ON FUNCTION public.gim_congelar_membresia(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.gim_congelar_membresia(uuid, text) TO authenticated;

-- Al descongelar, los días congelados se suman al vencimiento.
CREATE OR REPLACE FUNCTION public.gim_descongelar_membresia(p_membresia uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  m record;
  v_dias integer;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO m FROM public.gim_membresias WHERE id = p_membresia AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La membresía no existe.'; END IF;
  IF m.estado <> 'congelada' THEN RAISE EXCEPTION 'Esta membresía no está congelada.'; END IF;
  v_dias := greatest(current_date - m.congelada_desde, 0);
  UPDATE public.gim_membresias
     SET estado = 'activa', vence = vence + v_dias, dias_congelados = dias_congelados + v_dias, congelada_desde = NULL
   WHERE id = m.id;
  RETURN v_dias;
END;
$$;
REVOKE ALL ON FUNCTION public.gim_descongelar_membresia(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.gim_descongelar_membresia(uuid) TO authenticated;

-- Check-in por cédula o código QR. Siempre queda registrado, también cuando se deniega.
CREATE OR REPLACE FUNCTION public.gim_checkin(p_codigo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v_cod text := trim(coalesce(p_codigo, ''));
  s record;
  m record;
  v_res text;
  v_dias integer;
  v_sesiones integer;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF v_cod = '' THEN RAISE EXCEPTION 'Escribe la cédula o escanea el código QR.'; END IF;

  SELECT * INTO s FROM public.gim_socios
   WHERE owner_id = v_owner AND activo AND (lower(documento) = lower(v_cod) OR upper(codigo_qr) = upper(v_cod)) LIMIT 1;
  IF NOT FOUND THEN
    INSERT INTO public.gim_accesos (owner_id, tipo_negocio, codigo, resultado) VALUES (v_owner, v_tipo, v_cod, 'no_encontrado');
    RETURN jsonb_build_object('resultado', 'no_encontrado');
  END IF;

  SELECT * INTO m FROM public.gim_membresias WHERE socio_id = s.id ORDER BY vence DESC, created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    v_res := 'sin_membresia';
  ELSIF m.estado = 'congelada' THEN
    v_res := 'congelada';
  ELSIF m.vence < current_date THEN
    v_res := 'vencida';
  ELSIF m.inicio > current_date THEN
    v_res := 'no_iniciada';
  ELSIF m.sesiones_restantes IS NOT NULL AND m.sesiones_restantes <= 0 THEN
    v_res := 'sin_sesiones';
  ELSE
    v_dias := m.vence - current_date;
    v_res := CASE WHEN v_dias <= 5 THEN 'por_vencer' ELSE 'permitido' END;
    v_sesiones := m.sesiones_restantes;
    -- La tiquetera descuenta una sesión por día (entrar dos veces el mismo día no cobra dos).
    IF m.sesiones_restantes IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM public.gim_accesos a WHERE a.socio_id = s.id AND a.created_at::date = current_date
                          AND a.resultado IN ('permitido', 'por_vencer')) THEN
      UPDATE public.gim_membresias SET sesiones_restantes = sesiones_restantes - 1 WHERE id = m.id;
      v_sesiones := m.sesiones_restantes - 1;
    END IF;
  END IF;

  INSERT INTO public.gim_accesos (owner_id, tipo_negocio, socio_id, membresia_id, codigo, resultado)
  VALUES (v_owner, v_tipo, s.id, m.id, v_cod, v_res);

  RETURN jsonb_build_object('resultado', v_res, 'socio_id', s.id, 'nombre', s.nombre, 'telefono', s.telefono,
    'plan', m.plan_nombre, 'vence', m.vence, 'dias', CASE WHEN m.vence IS NULL THEN NULL ELSE m.vence - current_date END,
    'sesiones', coalesce(v_sesiones, m.sesiones_restantes), 'precio', m.precio);
END;
$$;
REVOKE ALL ON FUNCTION public.gim_checkin(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.gim_checkin(text) TO authenticated;
