-- Compras de vehículos: tablas propias, valores económicos protegidos, aprobaciones con historial
-- e ingreso al inventario (sin duplicar placa/VIN y usando la tabla protegida de costos).

-- ============================================================
-- Permisos de compras (el servidor los valida; el administrador lo puede todo)
-- ============================================================
CREATE OR REPLACE FUNCTION public.com_permiso(p text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.es_admin() OR EXISTS (
    SELECT 1 FROM public.equipo_negocio e
    WHERE e.user_id = auth.uid() AND e.activo = true
      AND (
        p = ANY (e.modulos)
        OR (p IN ('com_crear', 'com_ver_propias') AND (e.modulos && ARRAY['vehiculos', 'pedidos', 'cocina', 'domicilios']::text[]))
        OR (p = 'com_ver_todas' AND (e.modulos && ARRAY['com_economico', 'com_aprobar', 'com_recibir']::text[]))
      )
  );
$$;
REVOKE ALL ON FUNCTION public.com_permiso(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.com_permiso(text) TO authenticated;

-- ============================================================
-- Tablas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compras_vehiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  estado text NOT NULL DEFAULT 'negociacion' CHECK (estado IN ('negociacion', 'aprobada', 'recibida', 'cancelada')),
  vendedor_tipo text NOT NULL DEFAULT 'particular' CHECK (vendedor_tipo IN ('particular', 'proveedor')),
  vendedor_nombre text NOT NULL,
  vendedor_documento text,
  vendedor_telefono text,
  vendedor_email text,
  propietario_nombre text,
  propietario_documento text,
  tipo text NOT NULL DEFAULT 'carro',
  marca text NOT NULL,
  linea text,
  modelo text NOT NULL,
  anio integer,
  placa text,
  vin text,
  chasis text,
  motor_numero text,
  color text,
  kilometraje integer,
  observaciones text,
  vehiculo_id uuid REFERENCES public.vehiculos_inventario(id) ON DELETE SET NULL,
  creado_por uuid DEFAULT auth.uid(),
  aprobada_por uuid,
  aprobada_en timestamptz,
  recibida_por uuid,
  recibida_en timestamptz,
  recepcion_notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS compras_vehiculos_owner_idx ON public.compras_vehiculos (owner_id, created_at DESC);
ALTER TABLE public.compras_vehiculos ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.compras_vehiculos_economico (
  compra_id uuid PRIMARY KEY REFERENCES public.compras_vehiculos(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  oferta_inicial numeric CHECK (oferta_inicial IS NULL OR oferta_inicial >= 0),
  precio_acordado numeric CHECK (precio_acordado IS NULL OR precio_acordado >= 0),
  forma_pago text,
  condiciones_pago text,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.compras_vehiculos_economico ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.compras_vehiculos_gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL REFERENCES public.compras_vehiculos(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  concepto text NOT NULL,
  monto numeric NOT NULL CHECK (monto >= 0),
  fecha date NOT NULL DEFAULT current_date,
  creado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS compras_vehiculos_gastos_compra_idx ON public.compras_vehiculos_gastos (compra_id);
ALTER TABLE public.compras_vehiculos_gastos ENABLE ROW LEVEL SECURITY;

-- Pagos: solo se agregan (no se editan ni se borran). Un error se corrige con una nota en un pago nuevo o con el administrador.
CREATE TABLE IF NOT EXISTS public.compras_vehiculos_pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL REFERENCES public.compras_vehiculos(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  tipo text NOT NULL DEFAULT 'abono' CHECK (tipo IN ('anticipo', 'abono', 'saldo')),
  monto numeric NOT NULL CHECK (monto > 0),
  fecha date NOT NULL DEFAULT current_date,
  metodo text,
  nota text,
  registrado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS compras_vehiculos_pagos_compra_idx ON public.compras_vehiculos_pagos (compra_id);
ALTER TABLE public.compras_vehiculos_pagos ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.compras_vehiculos_aprobaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL REFERENCES public.compras_vehiculos(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  usuario_id uuid,
  usuario_email text,
  precio_aprobado numeric NOT NULL,
  gastos_aprobados numeric NOT NULL DEFAULT 0,
  forma_pago text,
  vigente boolean NOT NULL DEFAULT true,
  invalidada_en timestamptz,
  motivo_invalidacion text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS compras_vehiculos_aprob_compra_idx ON public.compras_vehiculos_aprobaciones (compra_id);
ALTER TABLE public.compras_vehiculos_aprobaciones ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.compras_vehiculos_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL REFERENCES public.compras_vehiculos(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  detalle text NOT NULL,
  economico boolean NOT NULL DEFAULT false,
  usuario_id uuid,
  usuario_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS compras_vehiculos_hist_compra_idx ON public.compras_vehiculos_historial (compra_id, created_at DESC);
ALTER TABLE public.compras_vehiculos_historial ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.compras_vehiculos_documentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id uuid NOT NULL REFERENCES public.compras_vehiculos(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  tipo text NOT NULL DEFAULT 'documento',
  nombre text NOT NULL,
  ruta text NOT NULL,
  creado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS compras_vehiculos_docs_compra_idx ON public.compras_vehiculos_documentos (compra_id);
ALTER TABLE public.compras_vehiculos_documentos ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Políticas (no hay política de DELETE en la compra: nunca se borra, se cancela)
-- ============================================================
DROP POLICY IF EXISTS "compras_ver" ON public.compras_vehiculos;
CREATE POLICY "compras_ver" ON public.compras_vehiculos FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id()
    AND (public.com_permiso('com_ver_todas') OR (public.com_permiso('com_ver_propias') AND creado_por = auth.uid())));
DROP POLICY IF EXISTS "compras_crear" ON public.compras_vehiculos;
CREATE POLICY "compras_crear" ON public.compras_vehiculos FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.com_permiso('com_crear')
    AND creado_por = auth.uid() AND estado = 'negociacion');
DROP POLICY IF EXISTS "compras_actualizar" ON public.compras_vehiculos;
CREATE POLICY "compras_actualizar" ON public.compras_vehiculos FOR UPDATE TO authenticated
  USING (owner_id = public.mi_negocio_id()
    AND ((creado_por = auth.uid() AND public.com_permiso('com_crear')) OR public.com_permiso('com_ver_todas')))
  WITH CHECK (owner_id = public.mi_negocio_id());

DROP POLICY IF EXISTS "compras_eco_todo" ON public.compras_vehiculos_economico;
CREATE POLICY "compras_eco_todo" ON public.compras_vehiculos_economico FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.com_permiso('com_economico'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.com_permiso('com_economico')
    AND EXISTS (SELECT 1 FROM public.compras_vehiculos c WHERE c.id = compra_id AND c.owner_id = public.mi_negocio_id()));

DROP POLICY IF EXISTS "compras_gastos_ver" ON public.compras_vehiculos_gastos;
CREATE POLICY "compras_gastos_ver" ON public.compras_vehiculos_gastos FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.com_permiso('com_economico'));
DROP POLICY IF EXISTS "compras_gastos_crear" ON public.compras_vehiculos_gastos;
CREATE POLICY "compras_gastos_crear" ON public.compras_vehiculos_gastos FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.com_permiso('com_economico')
    AND EXISTS (SELECT 1 FROM public.compras_vehiculos c WHERE c.id = compra_id AND c.owner_id = public.mi_negocio_id()));
DROP POLICY IF EXISTS "compras_gastos_borrar" ON public.compras_vehiculos_gastos;
CREATE POLICY "compras_gastos_borrar" ON public.compras_vehiculos_gastos FOR DELETE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.com_permiso('com_economico'));

DROP POLICY IF EXISTS "compras_pagos_ver" ON public.compras_vehiculos_pagos;
CREATE POLICY "compras_pagos_ver" ON public.compras_vehiculos_pagos FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.com_permiso('com_economico'));
DROP POLICY IF EXISTS "compras_pagos_crear" ON public.compras_vehiculos_pagos;
CREATE POLICY "compras_pagos_crear" ON public.compras_vehiculos_pagos FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.com_permiso('com_economico') AND registrado_por = auth.uid()
    AND EXISTS (SELECT 1 FROM public.compras_vehiculos c WHERE c.id = compra_id AND c.owner_id = public.mi_negocio_id()));

-- Aprobaciones: solo se leen con permiso económico; se escriben únicamente con las funciones del servidor.
DROP POLICY IF EXISTS "compras_aprob_ver" ON public.compras_vehiculos_aprobaciones;
CREATE POLICY "compras_aprob_ver" ON public.compras_vehiculos_aprobaciones FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.com_permiso('com_economico'));

-- Historial: lo no económico lo ve quien puede ver la compra; lo económico exige permiso económico.
DROP POLICY IF EXISTS "compras_hist_ver" ON public.compras_vehiculos_historial;
CREATE POLICY "compras_hist_ver" ON public.compras_vehiculos_historial FOR SELECT TO authenticated
  USING (
    owner_id = public.mi_negocio_id()
    AND (
      (economico = false AND EXISTS (SELECT 1 FROM public.compras_vehiculos c WHERE c.id = compra_id))
      OR (economico = true AND public.com_permiso('com_economico'))
    )
  );

DROP POLICY IF EXISTS "compras_docs_ver" ON public.compras_vehiculos_documentos;
CREATE POLICY "compras_docs_ver" ON public.compras_vehiculos_documentos FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND EXISTS (SELECT 1 FROM public.compras_vehiculos c WHERE c.id = compra_id));
DROP POLICY IF EXISTS "compras_docs_crear" ON public.compras_vehiculos_documentos;
CREATE POLICY "compras_docs_crear" ON public.compras_vehiculos_documentos FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND creado_por = auth.uid()
    AND EXISTS (SELECT 1 FROM public.compras_vehiculos c WHERE c.id = compra_id));
DROP POLICY IF EXISTS "compras_docs_borrar" ON public.compras_vehiculos_documentos;
CREATE POLICY "compras_docs_borrar" ON public.compras_vehiculos_documentos FOR DELETE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.com_permiso('com_ver_todas'));

-- ============================================================
-- Reglas en el servidor
-- ============================================================
-- Estado, vínculo con inventario y datos de aprobación/recepción solo cambian con las funciones de abajo.
CREATE OR REPLACE FUNCTION public.compra_proteger_campos() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND coalesce(current_setting('gosaryc.compra_fn', true), '') <> '1' THEN
    IF OLD.estado IN ('recibida', 'cancelada') THEN
      RAISE EXCEPTION 'COMPRA_CERRADA';
    END IF;
    IF NEW.estado IS DISTINCT FROM OLD.estado OR NEW.vehiculo_id IS DISTINCT FROM OLD.vehiculo_id
       OR NEW.aprobada_por IS DISTINCT FROM OLD.aprobada_por OR NEW.aprobada_en IS DISTINCT FROM OLD.aprobada_en
       OR NEW.recibida_por IS DISTINCT FROM OLD.recibida_por OR NEW.recibida_en IS DISTINCT FROM OLD.recibida_en
       OR NEW.recepcion_notas IS DISTINCT FROM OLD.recepcion_notas
       OR NEW.owner_id IS DISTINCT FROM OLD.owner_id OR NEW.creado_por IS DISTINCT FROM OLD.creado_por THEN
      RAISE EXCEPTION 'CAMPO_PROTEGIDO';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS compra_proteger_campos_t ON public.compras_vehiculos;
CREATE TRIGGER compra_proteger_campos_t BEFORE UPDATE ON public.compras_vehiculos
  FOR EACH ROW EXECUTE FUNCTION public.compra_proteger_campos();

-- Anota en el historial (solo la usan los disparadores y las funciones del servidor).
CREATE OR REPLACE FUNCTION public.compra_historial(p_compra uuid, p_owner uuid, p_tipo text, p_detalle text, p_eco boolean)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.compras_vehiculos_historial (compra_id, owner_id, tipo, detalle, economico, usuario_id, usuario_email)
  VALUES (p_compra, p_owner, p_tipo, p_detalle, p_eco, auth.uid(), coalesce(auth.jwt() ->> 'email', ''));
$$;
REVOKE ALL ON FUNCTION public.compra_historial(uuid, uuid, text, text, boolean) FROM public, anon, authenticated;

-- Cualquier cambio económico posterior invalida la aprobación vigente y devuelve la compra a negociación.
CREATE OR REPLACE FUNCTION public.compra_invalidar_aprobacion(p_compra uuid, p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_n integer;
BEGIN
  UPDATE public.compras_vehiculos_aprobaciones
     SET vigente = false, invalidada_en = now(), motivo_invalidacion = p_motivo
   WHERE compra_id = p_compra AND vigente = true;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  IF v_n > 0 THEN
    PERFORM set_config('gosaryc.compra_fn', '1', true);
    UPDATE public.compras_vehiculos
       SET estado = 'negociacion', aprobada_por = NULL, aprobada_en = NULL
     WHERE id = p_compra AND estado = 'aprobada'
    RETURNING owner_id INTO v_owner;
    PERFORM set_config('gosaryc.compra_fn', '', true);
    IF v_owner IS NOT NULL THEN
      PERFORM public.compra_historial(p_compra, v_owner, 'aprobacion_invalidada',
        'La aprobación anterior quedó sin efecto: ' || p_motivo || '. Hay que aprobar de nuevo.', false);
    END IF;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.compra_invalidar_aprobacion(uuid, text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.compra_bloquear_si_cerrada() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_compra uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.compra_id ELSE NEW.compra_id END;
  v_estado text;
BEGIN
  SELECT estado INTO v_estado FROM public.compras_vehiculos WHERE id = v_compra;
  IF v_estado IN ('recibida', 'cancelada') THEN
    RAISE EXCEPTION 'COMPRA_CERRADA';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;

DROP TRIGGER IF EXISTS compra_eco_cerrada_t ON public.compras_vehiculos_economico;
CREATE TRIGGER compra_eco_cerrada_t BEFORE INSERT OR UPDATE ON public.compras_vehiculos_economico
  FOR EACH ROW EXECUTE FUNCTION public.compra_bloquear_si_cerrada();
DROP TRIGGER IF EXISTS compra_gastos_cerrada_t ON public.compras_vehiculos_gastos;
CREATE TRIGGER compra_gastos_cerrada_t BEFORE INSERT OR DELETE ON public.compras_vehiculos_gastos
  FOR EACH ROW EXECUTE FUNCTION public.compra_bloquear_si_cerrada();

-- Valores económicos: quién y cuándo; invalida aprobación si cambia el precio o la forma de pago.
CREATE OR REPLACE FUNCTION public.compra_eco_cambio() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_by := auth.uid();
    NEW.updated_at := now();
    IF NEW.precio_acordado IS DISTINCT FROM OLD.precio_acordado
       OR NEW.forma_pago IS DISTINCT FROM OLD.forma_pago
       OR NEW.condiciones_pago IS DISTINCT FROM OLD.condiciones_pago THEN
      PERFORM public.compra_historial(NEW.compra_id, NEW.owner_id, 'economico',
        'Negociación: precio acordado ' || coalesce(OLD.precio_acordado::text, 'sin dato') || ' → ' || coalesce(NEW.precio_acordado::text, 'sin dato')
        || ' · pago: ' || coalesce(NEW.forma_pago, 'sin dato'), true);
      PERFORM public.compra_invalidar_aprobacion(NEW.compra_id, 'cambió el precio o las condiciones de pago');
    END IF;
  ELSE
    NEW.updated_by := auth.uid();
    PERFORM public.compra_historial(NEW.compra_id, NEW.owner_id, 'economico',
      'Negociación registrada: precio acordado ' || coalesce(NEW.precio_acordado::text, 'sin dato')
      || ' · pago: ' || coalesce(NEW.forma_pago, 'sin dato'), true);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS compra_eco_cambio_t ON public.compras_vehiculos_economico;
CREATE TRIGGER compra_eco_cambio_t BEFORE INSERT OR UPDATE ON public.compras_vehiculos_economico
  FOR EACH ROW EXECUTE FUNCTION public.compra_eco_cambio();

CREATE OR REPLACE FUNCTION public.compra_gasto_cambio() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.compra_historial(NEW.compra_id, NEW.owner_id, 'gasto',
      'Gasto de adquisición: ' || NEW.concepto || ' · ' || NEW.monto, true);
    PERFORM public.compra_invalidar_aprobacion(NEW.compra_id, 'se agregó un gasto de adquisición');
    RETURN NEW;
  ELSE
    PERFORM public.compra_historial(OLD.compra_id, OLD.owner_id, 'gasto',
      'Gasto de adquisición eliminado: ' || OLD.concepto || ' · ' || OLD.monto, true);
    PERFORM public.compra_invalidar_aprobacion(OLD.compra_id, 'se quitó un gasto de adquisición');
    RETURN OLD;
  END IF;
END $$;
DROP TRIGGER IF EXISTS compra_gasto_cambio_t ON public.compras_vehiculos_gastos;
CREATE TRIGGER compra_gasto_cambio_t AFTER INSERT OR DELETE ON public.compras_vehiculos_gastos
  FOR EACH ROW EXECUTE FUNCTION public.compra_gasto_cambio();

-- Pagos: no se aceptan sobre compras canceladas ni por encima del precio acordado.
CREATE OR REPLACE FUNCTION public.compra_pago_validar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_estado text;
  v_precio numeric;
  v_pagado numeric;
BEGIN
  SELECT estado INTO v_estado FROM public.compras_vehiculos WHERE id = NEW.compra_id;
  IF v_estado = 'cancelada' THEN
    RAISE EXCEPTION 'COMPRA_CERRADA';
  END IF;
  SELECT precio_acordado INTO v_precio FROM public.compras_vehiculos_economico WHERE compra_id = NEW.compra_id;
  IF v_precio IS NULL THEN
    RAISE EXCEPTION 'PAGO_SIN_PRECIO';
  END IF;
  SELECT coalesce(sum(monto), 0) INTO v_pagado FROM public.compras_vehiculos_pagos WHERE compra_id = NEW.compra_id;
  IF v_pagado + NEW.monto > v_precio THEN
    RAISE EXCEPTION 'PAGO_EXCEDE_SALDO';
  END IF;
  PERFORM public.compra_historial(NEW.compra_id, NEW.owner_id, 'pago',
    'Pago registrado (' || NEW.tipo || '): ' || NEW.monto || coalesce(' · ' || NEW.metodo, ''), true);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS compra_pago_validar_t ON public.compras_vehiculos_pagos;
CREATE TRIGGER compra_pago_validar_t BEFORE INSERT ON public.compras_vehiculos_pagos
  FOR EACH ROW EXECUTE FUNCTION public.compra_pago_validar();

-- Historial de la compra (creación, cambio de estado, de placa/VIN y de datos del vehículo).
CREATE OR REPLACE FUNCTION public.compra_registrar_historial() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.compra_historial(NEW.id, NEW.owner_id, 'creacion',
      'Compra registrada: ' || NEW.marca || ' ' || NEW.modelo || ' · vendedor ' || NEW.vendedor_nombre, false);
  ELSE
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
      PERFORM public.compra_historial(NEW.id, NEW.owner_id, 'estado', 'Estado: ' || OLD.estado || ' → ' || NEW.estado, false);
    END IF;
    IF NEW.placa IS DISTINCT FROM OLD.placa OR NEW.vin IS DISTINCT FROM OLD.vin THEN
      PERFORM public.compra_historial(NEW.id, NEW.owner_id, 'datos',
        'Identificación actualizada (placa ' || coalesce(NEW.placa, 'sin dato') || ', VIN ' || coalesce(NEW.vin, 'sin dato') || ')', false);
    ELSIF NEW.estado = OLD.estado AND (to_jsonb(NEW) - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'updated_at') THEN
      PERFORM public.compra_historial(NEW.id, NEW.owner_id, 'datos', 'Se actualizaron los datos de la compra', false);
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS compra_registrar_historial_t ON public.compras_vehiculos;
CREATE TRIGGER compra_registrar_historial_t AFTER INSERT OR UPDATE ON public.compras_vehiculos
  FOR EACH ROW EXECUTE FUNCTION public.compra_registrar_historial();

-- ============================================================
-- Funciones: aprobar, recibir (ingresa al inventario) y cancelar
-- ============================================================
CREATE OR REPLACE FUNCTION public.compra_aprobar(p_compra uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  c public.compras_vehiculos%ROWTYPE;
  e public.compras_vehiculos_economico%ROWTYPE;
  v_gastos numeric;
BEGIN
  IF auth.uid() IS NULL OR v_owner IS NULL THEN RAISE EXCEPTION 'Sin sesión'; END IF;
  IF NOT public.com_permiso('com_aprobar') THEN RAISE EXCEPTION 'SIN_PERMISO_APROBAR'; END IF;
  SELECT * INTO c FROM public.compras_vehiculos WHERE id = p_compra AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compra no encontrada'; END IF;
  IF c.estado <> 'negociacion' THEN RAISE EXCEPTION 'La compra no está en negociación'; END IF;
  SELECT * INTO e FROM public.compras_vehiculos_economico WHERE compra_id = p_compra;
  IF NOT FOUND OR e.precio_acordado IS NULL OR e.precio_acordado <= 0 THEN
    RAISE EXCEPTION 'Falta registrar el precio acordado';
  END IF;
  SELECT coalesce(sum(monto), 0) INTO v_gastos FROM public.compras_vehiculos_gastos WHERE compra_id = p_compra;

  INSERT INTO public.compras_vehiculos_aprobaciones
    (compra_id, owner_id, usuario_id, usuario_email, precio_aprobado, gastos_aprobados, forma_pago)
  VALUES (p_compra, v_owner, auth.uid(), coalesce(auth.jwt() ->> 'email', ''), e.precio_acordado, v_gastos, e.forma_pago);

  PERFORM set_config('gosaryc.compra_fn', '1', true);
  UPDATE public.compras_vehiculos SET estado = 'aprobada', aprobada_por = auth.uid(), aprobada_en = now() WHERE id = p_compra;
  PERFORM set_config('gosaryc.compra_fn', '', true);

  PERFORM public.compra_historial(p_compra, v_owner, 'aprobacion',
    'Compra aprobada por valor de ' || e.precio_acordado || ' y gastos de ' || v_gastos, true);
END $$;
REVOKE ALL ON FUNCTION public.compra_aprobar(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.compra_aprobar(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.compra_recibir(p_compra uuid, p_notas text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  c public.compras_vehiculos%ROWTYPE;
  e public.compras_vehiculos_economico%ROWTYPE;
  v_veh uuid;
  v_nuevo boolean := false;
BEGIN
  IF auth.uid() IS NULL OR v_owner IS NULL THEN RAISE EXCEPTION 'Sin sesión'; END IF;
  IF NOT public.com_permiso('com_recibir') THEN RAISE EXCEPTION 'SIN_PERMISO_RECIBIR'; END IF;
  SELECT * INTO c FROM public.compras_vehiculos WHERE id = p_compra AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compra no encontrada'; END IF;
  IF c.estado <> 'aprobada' THEN RAISE EXCEPTION 'La compra debe estar aprobada para recibir el vehículo'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.compras_vehiculos_aprobaciones WHERE compra_id = p_compra AND vigente = true) THEN
    RAISE EXCEPTION 'No hay una aprobación vigente';
  END IF;
  SELECT * INTO e FROM public.compras_vehiculos_economico WHERE compra_id = p_compra;

  -- Vincula el vehículo si ya existe (misma placa o VIN en este negocio); si no, lo crea.
  SELECT v.id INTO v_veh FROM public.vehiculos_inventario v
   WHERE v.owner_id = v_owner AND v.eliminado_en IS NULL
     AND ((public.veh_norm(c.placa) IS NOT NULL AND public.veh_norm(v.placa) = public.veh_norm(c.placa))
       OR (public.veh_norm(c.vin) IS NOT NULL AND public.veh_norm(v.vin) = public.veh_norm(c.vin)))
   LIMIT 1;

  IF v_veh IS NULL THEN
    INSERT INTO public.vehiculos_inventario
      (owner_id, tipo, condicion, estado, marca, modelo, linea, anio, placa, vin, chasis, motor_numero, color, kilometraje,
       observaciones, procedencia, propietario_nombre, propietario_documento, fecha_ingreso, precio)
    VALUES
      (v_owner, c.tipo, 'usado', 'ingreso', c.marca, c.modelo, c.linea, c.anio, c.placa, c.vin, c.chasis, c.motor_numero, c.color,
       c.kilometraje, c.observaciones, 'compra', coalesce(c.propietario_nombre, c.vendedor_nombre),
       coalesce(c.propietario_documento, c.vendedor_documento), current_date, 0)
    RETURNING id INTO v_veh;
    v_nuevo := true;
  END IF;

  -- Precio de adquisición: solo en la tabla protegida (nunca en el inventario general).
  IF e.precio_acordado IS NOT NULL THEN
    INSERT INTO public.vehiculo_costos (vehiculo_id, owner_id, precio_compra)
    VALUES (v_veh, v_owner, e.precio_acordado)
    ON CONFLICT (vehiculo_id) DO NOTHING;
  END IF;

  -- Gastos de adquisición asociados al vehículo.
  INSERT INTO public.vehiculo_gastos (owner_id, vehiculo_id, categoria, descripcion, monto, fecha)
  SELECT v_owner, v_veh, 'adquisicion', g.concepto, g.monto, g.fecha
    FROM public.compras_vehiculos_gastos g WHERE g.compra_id = p_compra;

  PERFORM set_config('gosaryc.compra_fn', '1', true);
  UPDATE public.compras_vehiculos
     SET estado = 'recibida', vehiculo_id = v_veh, recibida_por = auth.uid(), recibida_en = now(), recepcion_notas = p_notas
   WHERE id = p_compra;
  PERFORM set_config('gosaryc.compra_fn', '', true);

  INSERT INTO public.vehiculo_movimientos (owner_id, vehiculo_id, tipo, detalle)
  VALUES (v_owner, v_veh, 'compra', 'Origen: compra ' || left(p_compra::text, 8) || CASE WHEN v_nuevo THEN '' ELSE ' (vinculada a un vehículo existente)' END);

  PERFORM public.compra_historial(p_compra, v_owner, 'recepcion',
    CASE WHEN v_nuevo THEN 'Vehículo recibido y creado en el inventario' ELSE 'Vehículo recibido y vinculado a uno ya existente en el inventario' END, false);
  RETURN v_veh;
END $$;
REVOKE ALL ON FUNCTION public.compra_recibir(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.compra_recibir(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.compra_cancelar(p_compra uuid, p_motivo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  c public.compras_vehiculos%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR v_owner IS NULL THEN RAISE EXCEPTION 'Sin sesión'; END IF;
  IF NOT public.com_permiso('com_aprobar') THEN RAISE EXCEPTION 'SIN_PERMISO_APROBAR'; END IF;
  IF p_motivo IS NULL OR btrim(p_motivo) = '' THEN RAISE EXCEPTION 'Escribe el motivo'; END IF;
  SELECT * INTO c FROM public.compras_vehiculos WHERE id = p_compra AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Compra no encontrada'; END IF;
  IF c.estado NOT IN ('negociacion', 'aprobada') THEN RAISE EXCEPTION 'La compra ya está cerrada'; END IF;
  UPDATE public.compras_vehiculos_aprobaciones
     SET vigente = false, invalidada_en = now(), motivo_invalidacion = 'compra cancelada'
   WHERE compra_id = p_compra AND vigente = true;
  PERFORM set_config('gosaryc.compra_fn', '1', true);
  UPDATE public.compras_vehiculos SET estado = 'cancelada', aprobada_por = NULL, aprobada_en = NULL WHERE id = p_compra;
  PERFORM set_config('gosaryc.compra_fn', '', true);
  PERFORM public.compra_historial(p_compra, v_owner, 'cancelacion', 'Compra cancelada: ' || p_motivo, false);
END $$;
REVOKE ALL ON FUNCTION public.compra_cancelar(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.compra_cancelar(uuid, text) TO authenticated;
