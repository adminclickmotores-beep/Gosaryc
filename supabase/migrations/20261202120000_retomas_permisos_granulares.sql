-- Retomas con permisos granulares:
--  * Asesor: crea solicitudes, registra datos del vehículo, adjunta fotos/documentos y ve el estado de las suyas. Nunca ve valores económicos.
--  * Jefe de patio: inspecciones, observaciones y avalúos técnicos (según permisos).
--  * Administrador / usuario autorizado: ve, modifica y aprueba valores económicos. La aprobación queda en el historial.
-- Los valores económicos viven en tablas aparte protegidas por RLS: ninguna consulta, relación o API los devuelve sin permiso.

-- ============================================================
-- 0) PERMISOS
-- ============================================================
-- ret_crear / ret_ver_propias: base para quien ya tiene el módulo de vehículos (o pedidos, cocina, domicilios).
-- ret_ver_todas: lo tiene también quien inspecciona, avalúa, aprueba o ve valores económicos.
-- ret_inspeccionar, ret_avaluo, ret_economico, ret_aprobar: explícitos en Ajustes > Equipo.
CREATE OR REPLACE FUNCTION public.ret_permiso(p text)
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
        OR (p IN ('ret_crear', 'ret_ver_propias') AND (e.modulos && ARRAY['vehiculos', 'pedidos', 'cocina', 'domicilios']::text[]))
        OR (p = 'ret_ver_todas' AND (e.modulos && ARRAY['ret_inspeccionar', 'ret_avaluo', 'ret_aprobar', 'ret_economico']::text[]))
      )
  );
$$;
REVOKE ALL ON FUNCTION public.ret_permiso(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ret_permiso(text) TO authenticated;

-- Quien antes podía ver costos en retomas conserva su alcance (no se pierde nada de lo que ya tenía).
UPDATE public.equipo_negocio
SET modulos = (
  SELECT array_agg(DISTINCT x)
  FROM unnest(modulos || ARRAY['ret_ver_todas', 'ret_inspeccionar', 'ret_avaluo', 'ret_economico', 'ret_aprobar']::text[]) AS x
)
WHERE 'veh_costos' = ANY (modulos);

-- ============================================================
-- 1) COLUMNAS NUEVAS Y TABLAS
-- ============================================================
ALTER TABLE public.retomas_vehiculos
  ADD COLUMN IF NOT EXISTS creado_por uuid DEFAULT auth.uid(),
  ADD COLUMN IF NOT EXISTS estado_aprobacion text NOT NULL DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS aprobado_por uuid,
  ADD COLUMN IF NOT EXISTS aprobado_en timestamptz,
  ADD COLUMN IF NOT EXISTS aprobacion_notas text;

UPDATE public.retomas_vehiculos SET estado_aprobacion = 'aprobada' WHERE resultado = 'retomado' AND estado_aprobacion = 'pendiente';

-- Valores económicos (precio que pide el dueño, retoma, venta prevista, costos estimados).
CREATE TABLE IF NOT EXISTS public.retomas_economico (
  retoma_id uuid PRIMARY KEY REFERENCES public.retomas_vehiculos(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  precio_pedido numeric,
  precio_retoma numeric,
  precio_venta numeric,
  costos_estimados numeric,
  autorizado jsonb,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.retomas_economico ENABLE ROW LEVEL SECURITY;

-- Copia los precios existentes sin perder ninguno y vacía las columnas antiguas.
INSERT INTO public.retomas_economico (retoma_id, owner_id, precio_pedido, precio_retoma, precio_venta)
SELECT id, owner_id, precio_pedido, precio_retoma, precio_venta FROM public.retomas_vehiculos
WHERE precio_pedido IS NOT NULL OR precio_retoma IS NOT NULL OR precio_venta IS NOT NULL
ON CONFLICT (retoma_id) DO NOTHING;

UPDATE public.retomas_vehiculos r
SET precio_pedido = NULL, precio_retoma = NULL, precio_venta = NULL
WHERE (r.precio_pedido IS NOT NULL OR r.precio_retoma IS NOT NULL OR r.precio_venta IS NOT NULL)
  AND EXISTS (SELECT 1 FROM public.retomas_economico e WHERE e.retoma_id = r.id);

-- Avalúos técnicos (jefe de patio). Solo se agregan; no se editan ni se borran.
CREATE TABLE IF NOT EXISTS public.retomas_avaluos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retoma_id uuid NOT NULL REFERENCES public.retomas_vehiculos(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  valor numeric NOT NULL,
  notas text,
  creado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retomas_avaluos_retoma_idx ON public.retomas_avaluos (retoma_id);
ALTER TABLE public.retomas_avaluos ENABLE ROW LEVEL SECURITY;

-- Inspecciones y observaciones (jefe de patio). Solo se agregan.
CREATE TABLE IF NOT EXISTS public.retomas_inspecciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retoma_id uuid NOT NULL REFERENCES public.retomas_vehiculos(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  fecha date NOT NULL DEFAULT current_date,
  estado_general text,
  observaciones text NOT NULL,
  creado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retomas_inspecciones_retoma_idx ON public.retomas_inspecciones (retoma_id);
ALTER TABLE public.retomas_inspecciones ENABLE ROW LEVEL SECURITY;

-- Historial (sin llave foránea: sobrevive aunque se borre la retoma). "economico" marca las filas con montos.
CREATE TABLE IF NOT EXISTS public.retomas_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  retoma_id uuid NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  accion text NOT NULL,
  detalle text,
  economico boolean NOT NULL DEFAULT false,
  usuario_id uuid,
  usuario_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS retomas_historial_retoma_idx ON public.retomas_historial (retoma_id);
ALTER TABLE public.retomas_historial ENABLE ROW LEVEL SECURITY;

-- Escribe en el historial (solo la usan funciones del servidor).
CREATE OR REPLACE FUNCTION public.ret_log(p_retoma uuid, p_owner uuid, p_accion text, p_detalle text, p_eco boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.retomas_historial (retoma_id, owner_id, accion, detalle, economico, usuario_id, usuario_email)
  VALUES (p_retoma, p_owner, p_accion, p_detalle, p_eco, auth.uid(), (SELECT u.email FROM auth.users u WHERE u.id = auth.uid()));
END $$;
REVOKE ALL ON FUNCTION public.ret_log(uuid, uuid, text, text, boolean) FROM public, anon, authenticated;

-- ============================================================
-- 2) POLÍTICAS (RLS)
-- ============================================================
DROP POLICY IF EXISTS "retomas_vehiculos_ver" ON public.retomas_vehiculos;
DROP POLICY IF EXISTS "retomas_vehiculos_crear" ON public.retomas_vehiculos;
DROP POLICY IF EXISTS "retomas_vehiculos_actualizar" ON public.retomas_vehiculos;
DROP POLICY IF EXISTS "retomas_vehiculos_borrar" ON public.retomas_vehiculos;

CREATE POLICY "retomas_vehiculos_ver" ON public.retomas_vehiculos FOR SELECT TO authenticated
  USING (
    owner_id = public.mi_negocio_id() AND public.es_personal()
    AND (public.ret_permiso('ret_ver_todas') OR (creado_por = auth.uid() AND public.ret_permiso('ret_ver_propias')))
  );
CREATE POLICY "retomas_vehiculos_crear" ON public.retomas_vehiculos FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal() AND public.ret_permiso('ret_crear'));
CREATE POLICY "retomas_vehiculos_actualizar" ON public.retomas_vehiculos FOR UPDATE TO authenticated
  USING (
    owner_id = public.mi_negocio_id() AND public.es_personal()
    AND (public.ret_permiso('ret_ver_todas') OR (creado_por = auth.uid() AND resultado = 'en_evaluacion' AND public.ret_permiso('ret_ver_propias')))
  )
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
CREATE POLICY "retomas_vehiculos_borrar" ON public.retomas_vehiculos FOR DELETE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal() AND public.ret_permiso('ret_aprobar'));

DROP POLICY IF EXISTS "retomas_economico_ver" ON public.retomas_economico;
DROP POLICY IF EXISTS "retomas_economico_crear" ON public.retomas_economico;
DROP POLICY IF EXISTS "retomas_economico_actualizar" ON public.retomas_economico;
CREATE POLICY "retomas_economico_ver" ON public.retomas_economico FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal() AND public.ret_permiso('ret_economico'));
CREATE POLICY "retomas_economico_crear" ON public.retomas_economico FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = public.mi_negocio_id() AND public.es_personal() AND public.ret_permiso('ret_economico')
    AND EXISTS (SELECT 1 FROM public.retomas_vehiculos r WHERE r.id = retoma_id AND r.owner_id = public.mi_negocio_id())
  );
CREATE POLICY "retomas_economico_actualizar" ON public.retomas_economico FOR UPDATE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal() AND public.ret_permiso('ret_economico'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal() AND public.ret_permiso('ret_economico'));

DROP POLICY IF EXISTS "retomas_avaluos_ver" ON public.retomas_avaluos;
DROP POLICY IF EXISTS "retomas_avaluos_crear" ON public.retomas_avaluos;
CREATE POLICY "retomas_avaluos_ver" ON public.retomas_avaluos FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal() AND (public.ret_permiso('ret_avaluo') OR public.ret_permiso('ret_economico')));
CREATE POLICY "retomas_avaluos_crear" ON public.retomas_avaluos FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = public.mi_negocio_id() AND public.es_personal() AND public.ret_permiso('ret_avaluo') AND creado_por = auth.uid()
    AND EXISTS (SELECT 1 FROM public.retomas_vehiculos r WHERE r.id = retoma_id AND r.owner_id = public.mi_negocio_id())
  );

DROP POLICY IF EXISTS "retomas_inspecciones_ver" ON public.retomas_inspecciones;
DROP POLICY IF EXISTS "retomas_inspecciones_crear" ON public.retomas_inspecciones;
CREATE POLICY "retomas_inspecciones_ver" ON public.retomas_inspecciones FOR SELECT TO authenticated
  USING (
    owner_id = public.mi_negocio_id() AND public.es_personal()
    AND EXISTS (SELECT 1 FROM public.retomas_vehiculos r WHERE r.id = retoma_id)
  );
CREATE POLICY "retomas_inspecciones_crear" ON public.retomas_inspecciones FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = public.mi_negocio_id() AND public.es_personal() AND public.ret_permiso('ret_inspeccionar') AND creado_por = auth.uid()
    AND EXISTS (SELECT 1 FROM public.retomas_vehiculos r WHERE r.id = retoma_id AND r.owner_id = public.mi_negocio_id())
  );

DROP POLICY IF EXISTS "retomas_historial_ver" ON public.retomas_historial;
CREATE POLICY "retomas_historial_ver" ON public.retomas_historial FOR SELECT TO authenticated
  USING (
    owner_id = public.mi_negocio_id() AND public.es_personal()
    AND (
      (economico = false AND (public.ret_permiso('ret_ver_todas') OR EXISTS (SELECT 1 FROM public.retomas_vehiculos r WHERE r.id = retoma_id)))
      OR (economico = true AND public.ret_permiso('ret_economico'))
    )
  );

-- ============================================================
-- 3) DISPARADORES DE PROTECCIÓN
-- ============================================================
-- Retomas: ni los precios antiguos, ni la aprobación, ni el vehículo ligado se tocan por la API directa.
CREATE OR REPLACE FUNCTION public.retomas_guardia() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(current_setting('app.retoma_rpc', true), '') = '1' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.precio_pedido := NULL; NEW.precio_retoma := NULL; NEW.precio_venta := NULL;
    NEW.creado_por := auth.uid();
    NEW.resultado := 'en_evaluacion';
    NEW.estado_aprobacion := 'pendiente';
    NEW.aprobado_por := NULL; NEW.aprobado_en := NULL; NEW.aprobacion_notas := NULL;
    NEW.vehiculo_id := NULL;
    NEW.owner_id := public.mi_negocio_id();
    RETURN NEW;
  END IF;
  NEW.precio_pedido := OLD.precio_pedido; NEW.precio_retoma := OLD.precio_retoma; NEW.precio_venta := OLD.precio_venta;
  NEW.owner_id := OLD.owner_id; NEW.creado_por := OLD.creado_por; NEW.created_at := OLD.created_at;
  NEW.estado_aprobacion := OLD.estado_aprobacion; NEW.aprobado_por := OLD.aprobado_por;
  NEW.aprobado_en := OLD.aprobado_en; NEW.aprobacion_notas := OLD.aprobacion_notas;
  NEW.vehiculo_id := OLD.vehiculo_id;
  IF NEW.resultado IS DISTINCT FROM OLD.resultado THEN
    IF NEW.resultado = 'retomado' THEN
      RAISE EXCEPTION 'Una retoma solo pasa a "retomado" al aprobarla y enviarla al inventario.' USING ERRCODE = '42501';
    END IF;
    IF NOT (public.ret_permiso('ret_aprobar') OR public.ret_permiso('ret_inspeccionar')) THEN
      RAISE EXCEPTION 'No tienes permiso para cambiar el resultado de la retoma.' USING ERRCODE = '42501';
    END IF;
  END IF;
  IF (NEW.peritaje_notas IS DISTINCT FROM OLD.peritaje_notas OR NEW.peritaje_fecha IS DISTINCT FROM OLD.peritaje_fecha)
     AND NOT (public.ret_permiso('ret_inspeccionar') OR public.ret_permiso('ret_aprobar')) THEN
    RAISE EXCEPTION 'No tienes permiso para registrar el resultado del peritaje.' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS retomas_00_guardia_t ON public.retomas_vehiculos;
CREATE TRIGGER retomas_00_guardia_t
  BEFORE INSERT OR UPDATE ON public.retomas_vehiculos
  FOR EACH ROW EXECUTE FUNCTION public.retomas_guardia();

-- Historial de la solicitud (creación y cambios de resultado).
CREATE OR REPLACE FUNCTION public.retomas_historial_t() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.ret_log(NEW.id, NEW.owner_id, 'creada', 'Solicitud de ' || NEW.operacion || ': ' || NEW.marca || ' ' || NEW.modelo, false);
  ELSIF coalesce(current_setting('app.retoma_rpc', true), '') <> '1' AND NEW.resultado IS DISTINCT FROM OLD.resultado THEN
    PERFORM public.ret_log(NEW.id, NEW.owner_id, 'resultado', 'Resultado: ' || OLD.resultado || ' → ' || NEW.resultado, false);
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS retomas_historial_trg ON public.retomas_vehiculos;
CREATE TRIGGER retomas_historial_trg
  AFTER INSERT OR UPDATE ON public.retomas_vehiculos
  FOR EACH ROW EXECUTE FUNCTION public.retomas_historial_t();

-- Valores económicos: si ya estaban aprobados, cualquier cambio exige aprobar de nuevo; en inventario ya no se tocan.
CREATE OR REPLACE FUNCTION public.retomas_economico_guardia() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r record;
  cambio boolean;
BEGIN
  IF coalesce(current_setting('app.retoma_rpc', true), '') = '1' THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  SELECT estado_aprobacion, vehiculo_id, owner_id INTO r FROM public.retomas_vehiculos WHERE id = NEW.retoma_id;
  IF NOT FOUND OR r.owner_id IS DISTINCT FROM public.mi_negocio_id() THEN
    RAISE EXCEPTION 'La retoma no existe.' USING ERRCODE = '42501';
  END IF;
  NEW.owner_id := r.owner_id;
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  IF TG_OP = 'INSERT' THEN
    NEW.autorizado := NULL;
    cambio := true;
  ELSE
    NEW.autorizado := OLD.autorizado;
    cambio := NEW.precio_pedido IS DISTINCT FROM OLD.precio_pedido OR NEW.precio_retoma IS DISTINCT FROM OLD.precio_retoma
      OR NEW.precio_venta IS DISTINCT FROM OLD.precio_venta OR NEW.costos_estimados IS DISTINCT FROM OLD.costos_estimados;
  END IF;
  IF cambio AND r.vehiculo_id IS NOT NULL THEN
    RAISE EXCEPTION 'La retoma ya pasó al inventario; sus valores no se pueden modificar aquí.' USING ERRCODE = '42501';
  END IF;
  IF cambio AND r.estado_aprobacion <> 'pendiente' THEN
    PERFORM set_config('app.retoma_rpc', '1', true);
    UPDATE public.retomas_vehiculos SET estado_aprobacion = 'pendiente', aprobado_por = NULL, aprobado_en = NULL
    WHERE id = NEW.retoma_id;
    PERFORM set_config('app.retoma_rpc', '', true);
    PERFORM public.ret_log(NEW.retoma_id, NEW.owner_id, 'aprobacion', 'Los valores cambiaron: la aprobación anterior queda sin efecto y debe aprobarse de nuevo', false);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS retomas_economico_00_guardia_t ON public.retomas_economico;
CREATE TRIGGER retomas_economico_00_guardia_t
  BEFORE INSERT OR UPDATE ON public.retomas_economico
  FOR EACH ROW EXECUTE FUNCTION public.retomas_economico_guardia();

CREATE OR REPLACE FUNCTION public.retomas_economico_historial_t() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o_ped numeric; o_ret numeric; o_ven numeric; o_cos numeric;
BEGIN
  IF coalesce(current_setting('app.retoma_rpc', true), '') = '1' THEN
    RETURN NULL;
  END IF;
  IF TG_OP = 'UPDATE' THEN
    o_ped := OLD.precio_pedido; o_ret := OLD.precio_retoma; o_ven := OLD.precio_venta; o_cos := OLD.costos_estimados;
    IF NEW.precio_pedido IS NOT DISTINCT FROM o_ped AND NEW.precio_retoma IS NOT DISTINCT FROM o_ret
       AND NEW.precio_venta IS NOT DISTINCT FROM o_ven AND NEW.costos_estimados IS NOT DISTINCT FROM o_cos THEN
      RETURN NULL;
    END IF;
  END IF;
  PERFORM public.ret_log(NEW.retoma_id, NEW.owner_id, 'valores',
    'Pide: ' || coalesce(o_ped::text, 'sin dato') || ' → ' || coalesce(NEW.precio_pedido::text, 'sin dato')
    || '; Retoma: ' || coalesce(o_ret::text, 'sin dato') || ' → ' || coalesce(NEW.precio_retoma::text, 'sin dato')
    || '; Venta: ' || coalesce(o_ven::text, 'sin dato') || ' → ' || coalesce(NEW.precio_venta::text, 'sin dato')
    || '; Costos: ' || coalesce(o_cos::text, 'sin dato') || ' → ' || coalesce(NEW.costos_estimados::text, 'sin dato'), true);
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS retomas_economico_historial_trg ON public.retomas_economico;
CREATE TRIGGER retomas_economico_historial_trg
  AFTER INSERT OR UPDATE ON public.retomas_economico
  FOR EACH ROW EXECUTE FUNCTION public.retomas_economico_historial_t();

CREATE OR REPLACE FUNCTION public.retomas_avaluo_historial_t() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.ret_log(NEW.retoma_id, NEW.owner_id, 'avaluo', 'Avalúo técnico: ' || NEW.valor::text || coalesce(' · ' || NEW.notas, ''), true);
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS retomas_avaluo_historial_trg ON public.retomas_avaluos;
CREATE TRIGGER retomas_avaluo_historial_trg
  AFTER INSERT ON public.retomas_avaluos
  FOR EACH ROW EXECUTE FUNCTION public.retomas_avaluo_historial_t();

CREATE OR REPLACE FUNCTION public.retomas_inspeccion_historial_t() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.ret_log(NEW.retoma_id, NEW.owner_id, 'inspeccion', 'Inspección: ' || left(NEW.observaciones, 200), false);
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS retomas_inspeccion_historial_trg ON public.retomas_inspecciones;
CREATE TRIGGER retomas_inspeccion_historial_trg
  AFTER INSERT ON public.retomas_inspecciones
  FOR EACH ROW EXECUTE FUNCTION public.retomas_inspeccion_historial_t();

-- ============================================================
-- 4) APROBACIÓN E INTEGRACIÓN CON INVENTARIO (siempre validadas en el servidor)
-- ============================================================
CREATE OR REPLACE FUNCTION public.retoma_decidir(p_id uuid, p_decision text, p_notas text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.retomas_vehiculos;
  e public.retomas_economico;
  v_email text;
  v_hay boolean;
BEGIN
  IF NOT (public.es_personal() AND public.ret_permiso('ret_aprobar')) THEN
    RAISE EXCEPTION 'No tienes permiso para aprobar retomas.' USING ERRCODE = '42501';
  END IF;
  IF p_decision NOT IN ('aprobada', 'rechazada') THEN
    RAISE EXCEPTION 'Decisión no válida.';
  END IF;
  SELECT * INTO r FROM public.retomas_vehiculos WHERE id = p_id AND owner_id = public.mi_negocio_id() FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La retoma no existe.' USING ERRCODE = '42501';
  END IF;
  IF r.vehiculo_id IS NOT NULL THEN
    RAISE EXCEPTION 'La retoma ya pasó al inventario.';
  END IF;
  SELECT * INTO e FROM public.retomas_economico WHERE retoma_id = p_id;
  v_hay := FOUND AND (e.precio_retoma IS NOT NULL OR e.precio_venta IS NOT NULL);
  IF p_decision = 'aprobada' AND NOT v_hay THEN
    RAISE EXCEPTION 'Registra primero el precio de retoma o el de venta antes de aprobar.';
  END IF;
  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = auth.uid();

  PERFORM set_config('app.retoma_rpc', '1', true);
  UPDATE public.retomas_vehiculos
  SET estado_aprobacion = p_decision, aprobado_por = auth.uid(), aprobado_en = now(), aprobacion_notas = nullif(trim(coalesce(p_notas, '')), '')
  WHERE id = p_id;
  IF p_decision = 'aprobada' THEN
    UPDATE public.retomas_economico
    SET autorizado = jsonb_build_object(
      'precio_pedido', e.precio_pedido, 'precio_retoma', e.precio_retoma, 'precio_venta', e.precio_venta,
      'costos_estimados', e.costos_estimados, 'aprobado_por', auth.uid(), 'aprobado_email', v_email, 'aprobado_en', now())
    WHERE retoma_id = p_id;
  END IF;
  PERFORM set_config('app.retoma_rpc', '', true);

  PERFORM public.ret_log(p_id, r.owner_id, CASE WHEN p_decision = 'aprobada' THEN 'aprobada' ELSE 'rechazada' END,
    CASE WHEN p_decision = 'aprobada' THEN 'Retoma aprobada' ELSE 'Retoma rechazada' END || coalesce(': ' || nullif(trim(coalesce(p_notas, '')), ''), ''), false);
  IF p_decision = 'aprobada' THEN
    PERFORM public.ret_log(p_id, r.owner_id, 'valores_autorizados',
      'Valores autorizados — Pide: ' || coalesce(e.precio_pedido::text, 'sin dato') || '; Retoma: ' || coalesce(e.precio_retoma::text, 'sin dato')
      || '; Venta: ' || coalesce(e.precio_venta::text, 'sin dato') || '; Costos: ' || coalesce(e.costos_estimados::text, 'sin dato'), true);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.retoma_decidir(uuid, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.retoma_decidir(uuid, text, text) TO authenticated;

-- Pasa una retoma aprobada al inventario; el precio de adquisición va a la tabla protegida de costos.
CREATE OR REPLACE FUNCTION public.retoma_a_inventario(p_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.retomas_vehiculos;
  e public.retomas_economico;
  v_id uuid;
  v_precio numeric;
  v_nota text;
BEGIN
  IF NOT (public.es_personal() AND public.ret_permiso('ret_aprobar') AND public.veh_permiso('veh_crear')) THEN
    RAISE EXCEPTION 'No tienes permiso para pasar retomas al inventario.' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO r FROM public.retomas_vehiculos WHERE id = p_id AND owner_id = public.mi_negocio_id() FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La retoma no existe.' USING ERRCODE = '42501';
  END IF;
  IF r.vehiculo_id IS NOT NULL THEN
    RETURN r.vehiculo_id;
  END IF;
  IF r.estado_aprobacion <> 'aprobada' THEN
    RAISE EXCEPTION 'Aprueba primero la retoma.';
  END IF;
  SELECT * INTO e FROM public.retomas_economico WHERE retoma_id = p_id;
  v_precio := coalesce(e.precio_venta, e.precio_retoma, e.precio_pedido);
  IF v_precio IS NULL THEN
    RAISE EXCEPTION 'Falta el precio de venta o de retoma.';
  END IF;
  v_nota := concat_ws(' ',
    CASE r.operacion WHEN 'consignacion' THEN 'Recibido en consignación.' WHEN 'compra' THEN 'Comprado.' ELSE 'Recibido en retoma.' END,
    CASE WHEN r.vendedor_nombre IS NOT NULL THEN 'Dueño anterior: ' || r.vendedor_nombre || '.' END,
    r.peritaje_notas);

  INSERT INTO public.vehiculos_inventario (owner_id, tipo, condicion, estado, marca, modelo, version, anio, placa, color, kilometraje, precio, observaciones, fotos)
  VALUES (r.owner_id, r.tipo, 'usado', 'disponible', r.marca, r.modelo, r.version, r.anio, r.placa, r.color, r.kilometraje, v_precio, nullif(v_nota, ''), ARRAY[]::text[])
  RETURNING id INTO v_id;

  IF r.operacion <> 'consignacion' AND e.precio_retoma IS NOT NULL THEN
    INSERT INTO public.vehiculo_costos (vehiculo_id, owner_id, precio_compra) VALUES (v_id, r.owner_id, e.precio_retoma);
  END IF;

  PERFORM set_config('app.retoma_rpc', '1', true);
  UPDATE public.retomas_vehiculos SET resultado = 'retomado', vehiculo_id = v_id WHERE id = p_id;
  PERFORM set_config('app.retoma_rpc', '', true);
  PERFORM public.ret_log(p_id, r.owner_id, 'inventario', 'Vehículo agregado al inventario', false);
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.retoma_a_inventario(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.retoma_a_inventario(uuid) TO authenticated;

-- ============================================================
-- 5) ARCHIVOS DE PERITAJE: solo quien puede ver esa retoma
-- ============================================================
DROP POLICY IF EXISTS "creditos_docs_leer" ON storage.objects;
DROP POLICY IF EXISTS "creditos_docs_escribir" ON storage.objects;
CREATE POLICY "creditos_docs_leer" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'creditos_docs' AND (storage.foldername(name))[1] = public.mi_negocio_id()::text AND public.es_personal()
    AND (storage.filename(name) NOT LIKE 'vehiculo-%' OR public.veh_permiso('veh_ver'))
    AND (storage.filename(name) NOT LIKE 'peritaje-%'
         OR EXISTS (SELECT 1 FROM public.retomas_vehiculos r WHERE r.id::text = substring(storage.filename(name) from 10 for 36)))
  );
CREATE POLICY "creditos_docs_escribir" ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'creditos_docs' AND (storage.foldername(name))[1] = public.mi_negocio_id()::text AND public.es_personal()
    AND (storage.filename(name) NOT LIKE 'vehiculo-%' OR public.veh_permiso('veh_editar'))
    AND (storage.filename(name) NOT LIKE 'peritaje-%'
         OR EXISTS (SELECT 1 FROM public.retomas_vehiculos r WHERE r.id::text = substring(storage.filename(name) from 10 for 36)))
  )
  WITH CHECK (
    bucket_id = 'creditos_docs' AND (storage.foldername(name))[1] = public.mi_negocio_id()::text AND public.es_personal()
    AND (storage.filename(name) NOT LIKE 'vehiculo-%' OR public.veh_permiso('veh_editar'))
    AND (storage.filename(name) NOT LIKE 'peritaje-%'
         OR EXISTS (SELECT 1 FROM public.retomas_vehiculos r WHERE r.id::text = substring(storage.filename(name) from 10 for 36)))
  );
