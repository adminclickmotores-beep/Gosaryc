-- Consignaciones de vehículos: contrato, vigencia, valores protegidos y liquidación al propietario.
-- Reutiliza los permisos de compras (com_permiso) y el aislamiento por negocio (mi_negocio_id).

CREATE TABLE IF NOT EXISTS public.consignaciones_vehiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  estado text NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente', 'vendida', 'liquidada', 'devuelta')),
  propietario_nombre text NOT NULL,
  propietario_documento text,
  propietario_telefono text,
  propietario_email text,
  tipo text NOT NULL DEFAULT 'carro',
  marca text NOT NULL,
  modelo text NOT NULL,
  anio integer,
  placa text,
  vin text,
  color text,
  kilometraje integer,
  fecha_inicio date NOT NULL DEFAULT current_date,
  fecha_vencimiento date,
  observaciones text,
  creado_por uuid DEFAULT auth.uid(),
  liquidada_por uuid,
  liquidada_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS consignaciones_vehiculos_owner_idx ON public.consignaciones_vehiculos (owner_id, created_at DESC);
ALTER TABLE public.consignaciones_vehiculos ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.consignaciones_economico (
  consignacion_id uuid PRIMARY KEY REFERENCES public.consignaciones_vehiculos(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  precio_acordado numeric CHECK (precio_acordado IS NULL OR precio_acordado >= 0),
  comision_pct numeric CHECK (comision_pct IS NULL OR (comision_pct >= 0 AND comision_pct <= 100)),
  gastos_autorizados numeric CHECK (gastos_autorizados IS NULL OR gastos_autorizados >= 0),
  precio_venta_final numeric CHECK (precio_venta_final IS NULL OR precio_venta_final >= 0),
  monto_liquidado numeric,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consignaciones_economico ENABLE ROW LEVEL SECURITY;

-- No hay política de DELETE: una consignación nunca se borra, se devuelve o se liquida.
DROP POLICY IF EXISTS "consig_ver" ON public.consignaciones_vehiculos;
CREATE POLICY "consig_ver" ON public.consignaciones_vehiculos FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id()
    AND (public.com_permiso('com_ver_todas') OR (public.com_permiso('com_ver_propias') AND creado_por = auth.uid())));
DROP POLICY IF EXISTS "consig_crear" ON public.consignaciones_vehiculos;
CREATE POLICY "consig_crear" ON public.consignaciones_vehiculos FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.com_permiso('com_crear')
    AND creado_por = auth.uid() AND estado = 'vigente');
DROP POLICY IF EXISTS "consig_actualizar" ON public.consignaciones_vehiculos;
CREATE POLICY "consig_actualizar" ON public.consignaciones_vehiculos FOR UPDATE TO authenticated
  USING (owner_id = public.mi_negocio_id()
    AND ((creado_por = auth.uid() AND public.com_permiso('com_crear')) OR public.com_permiso('com_ver_todas')))
  WITH CHECK (owner_id = public.mi_negocio_id());

DROP POLICY IF EXISTS "consig_eco_todo" ON public.consignaciones_economico;
CREATE POLICY "consig_eco_todo" ON public.consignaciones_economico FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.com_permiso('com_economico'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.com_permiso('com_economico'));

-- Reglas de estado en el servidor: marcar vendida o devuelta exige permiso de aprobación;
-- liquidar solo se puede con la función consignacion_liquidar.
CREATE OR REPLACE FUNCTION public.consignacion_validar_estado()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.estado IS DISTINCT FROM OLD.estado THEN
    IF OLD.estado IN ('liquidada', 'devuelta') THEN
      RAISE EXCEPTION 'Una consignación %s ya no se puede modificar.', OLD.estado;
    END IF;
    IF NEW.estado = 'liquidada' THEN
      IF coalesce(current_setting('gosaryc.liquidando', true), '') <> 'on' THEN
        RAISE EXCEPTION 'La liquidación solo se hace con el botón de liquidar.';
      END IF;
    ELSIF NOT public.com_permiso('com_aprobar') THEN
      RAISE EXCEPTION 'No tienes permiso para cambiar el estado de la consignación.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS consignacion_validar_estado_trg ON public.consignaciones_vehiculos;
CREATE TRIGGER consignacion_validar_estado_trg BEFORE UPDATE ON public.consignaciones_vehiculos
  FOR EACH ROW EXECUTE FUNCTION public.consignacion_validar_estado();

-- Liquidación al propietario: precio de venta final - comisión - gastos autorizados.
CREATE OR REPLACE FUNCTION public.consignacion_liquidar(p_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.consignaciones_vehiculos%ROWTYPE;
  e public.consignaciones_economico%ROWTYPE;
  monto numeric;
BEGIN
  IF NOT public.com_permiso('com_economico') OR NOT public.com_permiso('com_aprobar') THEN
    RAISE EXCEPTION 'No tienes permiso para liquidar consignaciones.';
  END IF;
  SELECT * INTO c FROM public.consignaciones_vehiculos WHERE id = p_id AND owner_id = public.mi_negocio_id() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Consignación no encontrada.'; END IF;
  IF c.estado <> 'vendida' THEN RAISE EXCEPTION 'Solo se liquidan consignaciones vendidas.'; END IF;
  SELECT * INTO e FROM public.consignaciones_economico WHERE consignacion_id = p_id;
  IF NOT FOUND OR e.precio_venta_final IS NULL THEN
    RAISE EXCEPTION 'Registra el precio de venta final antes de liquidar.';
  END IF;
  monto := e.precio_venta_final
    - (e.precio_venta_final * coalesce(e.comision_pct, 0) / 100)
    - coalesce(e.gastos_autorizados, 0);
  PERFORM set_config('gosaryc.liquidando', 'on', true);
  UPDATE public.consignaciones_economico SET monto_liquidado = monto, updated_by = auth.uid(), updated_at = now()
    WHERE consignacion_id = p_id;
  UPDATE public.consignaciones_vehiculos SET estado = 'liquidada', liquidada_por = auth.uid(), liquidada_en = now()
    WHERE id = p_id;
  RETURN monto;
END;
$$;
REVOKE ALL ON FUNCTION public.consignacion_liquidar(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.consignacion_liquidar(uuid) TO authenticated;
