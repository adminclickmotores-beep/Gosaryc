-- Inventario de vehículos: retiro lógico (sin borrar historial), permisos granulares en el servidor y duplicados normalizados.

ALTER TABLE public.vehiculos_inventario
  ADD COLUMN IF NOT EXISTS eliminado_en timestamptz,
  ADD COLUMN IF NOT EXISTS motivo_retiro text;

-- Permisos del inventario. Administrador: todo. Equipo: permisos veh_* asignados en Ajustes > Equipo.
-- Quien ya tenía el módulo "vehiculos" (o acceso de personal) conserva ver, crear, editar, gastos y estados;
-- precios, retiro y costos/utilidades requieren permiso explícito.
CREATE OR REPLACE FUNCTION public.veh_permiso(p text)
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
        OR (
          p IN ('veh_ver', 'veh_crear', 'veh_editar', 'veh_gastos', 'veh_estados')
          AND (e.modulos && ARRAY['vehiculos', 'pedidos', 'cocina', 'domicilios']::text[])
        )
      )
  );
$$;
REVOKE ALL ON FUNCTION public.veh_permiso(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.veh_permiso(text) TO authenticated;

-- Normalización para comparar placas y VIN (sin espacios ni guiones, en mayúsculas).
CREATE OR REPLACE FUNCTION public.veh_norm(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$ SELECT nullif(upper(regexp_replace(coalesce(t, ''), '[\s-]', '', 'g')), '') $$;

-- Duplicados: dentro del mismo negocio, ignorando vacíos y vehículos ya retirados del inventario.
CREATE OR REPLACE FUNCTION public.vehiculo_validar_duplicados() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.eliminado_en IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF public.veh_norm(NEW.placa) IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.vehiculos_inventario v
    WHERE v.owner_id IS NOT DISTINCT FROM NEW.owner_id AND v.id <> NEW.id AND v.eliminado_en IS NULL
      AND public.veh_norm(v.placa) = public.veh_norm(NEW.placa)) THEN
    RAISE EXCEPTION 'PLACA_DUPLICADA';
  END IF;
  IF public.veh_norm(NEW.vin) IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.vehiculos_inventario v
    WHERE v.owner_id IS NOT DISTINCT FROM NEW.owner_id AND v.id <> NEW.id AND v.eliminado_en IS NULL
      AND public.veh_norm(v.vin) = public.veh_norm(NEW.vin)) THEN
    RAISE EXCEPTION 'VIN_DUPLICADO';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vehiculo_validar_duplicados_t ON public.vehiculos_inventario;
CREATE TRIGGER vehiculo_validar_duplicados_t
  BEFORE INSERT OR UPDATE OF placa, vin, eliminado_en ON public.vehiculos_inventario
  FOR EACH ROW EXECUTE FUNCTION public.vehiculo_validar_duplicados();

-- Índices únicos como segunda barrera. Si hay datos antiguos repetidos, se omiten (el trigger sigue protegiendo lo nuevo).
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS vehiculos_placa_unica_idx
    ON public.vehiculos_inventario (owner_id, public.veh_norm(placa))
    WHERE eliminado_en IS NULL AND public.veh_norm(placa) IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Índice de placa omitido: hay placas repetidas antiguas.';
END $$;
DO $$ BEGIN
  CREATE UNIQUE INDEX IF NOT EXISTS vehiculos_vin_unico_idx
    ON public.vehiculos_inventario (owner_id, public.veh_norm(vin))
    WHERE eliminado_en IS NULL AND public.veh_norm(vin) IS NOT NULL;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Índice de VIN omitido: hay VIN repetidos antiguos.';
END $$;

-- Permisos finos en el servidor para actualizar: estado, precios, retiro y el resto de datos.
CREATE OR REPLACE FUNCTION public.vehiculo_verificar_permisos() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  especiales text[] := ARRAY['estado', 'precio', 'precio_compra', 'precio_venta_final', 'fecha_venta', 'eliminado_en', 'motivo_retiro'];
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.estado IS DISTINCT FROM OLD.estado AND NOT public.veh_permiso('veh_estados') THEN
    RAISE EXCEPTION 'SIN_PERMISO_ESTADOS';
  END IF;
  IF (NEW.precio IS DISTINCT FROM OLD.precio OR NEW.precio_compra IS DISTINCT FROM OLD.precio_compra
      OR NEW.precio_venta_final IS DISTINCT FROM OLD.precio_venta_final) AND NOT public.veh_permiso('veh_precios') THEN
    RAISE EXCEPTION 'SIN_PERMISO_PRECIOS';
  END IF;
  IF NEW.eliminado_en IS DISTINCT FROM OLD.eliminado_en AND NOT public.veh_permiso('veh_retirar') THEN
    RAISE EXCEPTION 'SIN_PERMISO_RETIRAR';
  END IF;
  IF (to_jsonb(NEW) - especiales) IS DISTINCT FROM (to_jsonb(OLD) - especiales) AND NOT public.veh_permiso('veh_editar') THEN
    RAISE EXCEPTION 'SIN_PERMISO_EDITAR';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vehiculo_verificar_permisos_t ON public.vehiculos_inventario;
CREATE TRIGGER vehiculo_verificar_permisos_t
  BEFORE UPDATE ON public.vehiculos_inventario
  FOR EACH ROW EXECUTE FUNCTION public.vehiculo_verificar_permisos();

-- Registro del retiro / reingreso en el historial.
CREATE OR REPLACE FUNCTION public.vehiculo_registrar_movimiento() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.vehiculo_movimientos (owner_id, vehiculo_id, tipo, detalle)
    VALUES (NEW.owner_id, NEW.id, 'ingreso', 'Ingresó al inventario (' || NEW.procedencia || ') en estado ' || NEW.estado);
  ELSE
    IF NEW.estado IS DISTINCT FROM OLD.estado THEN
      INSERT INTO public.vehiculo_movimientos (owner_id, vehiculo_id, tipo, detalle)
      VALUES (NEW.owner_id, NEW.id, 'estado', 'Estado: ' || OLD.estado || ' → ' || NEW.estado);
    END IF;
    IF NEW.precio IS DISTINCT FROM OLD.precio THEN
      INSERT INTO public.vehiculo_movimientos (owner_id, vehiculo_id, tipo, detalle)
      VALUES (NEW.owner_id, NEW.id, 'precio', 'Precio de venta: ' || OLD.precio || ' → ' || NEW.precio);
    END IF;
    IF NEW.precio_compra IS DISTINCT FROM OLD.precio_compra THEN
      INSERT INTO public.vehiculo_movimientos (owner_id, vehiculo_id, tipo, detalle)
      VALUES (NEW.owner_id, NEW.id, 'costo', 'Precio de adquisición: ' || coalesce(OLD.precio_compra::text, 'sin dato') || ' → ' || coalesce(NEW.precio_compra::text, 'sin dato'));
    END IF;
    IF NEW.propietario_nombre IS DISTINCT FROM OLD.propietario_nombre THEN
      INSERT INTO public.vehiculo_movimientos (owner_id, vehiculo_id, tipo, detalle)
      VALUES (NEW.owner_id, NEW.id, 'propietario', 'Propietario actualizado: ' || coalesce(NEW.propietario_nombre, 'sin dato'));
    END IF;
    IF OLD.eliminado_en IS NULL AND NEW.eliminado_en IS NOT NULL THEN
      INSERT INTO public.vehiculo_movimientos (owner_id, vehiculo_id, tipo, detalle)
      VALUES (NEW.owner_id, NEW.id, 'retiro', 'Retirado del inventario' || coalesce(': ' || NEW.motivo_retiro, ''));
    ELSIF OLD.eliminado_en IS NOT NULL AND NEW.eliminado_en IS NULL THEN
      INSERT INTO public.vehiculo_movimientos (owner_id, vehiculo_id, tipo, detalle)
      VALUES (NEW.owner_id, NEW.id, 'reingreso', 'Reingresado al inventario');
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- Políticas por operación. No hay política de DELETE: un vehículo nunca se borra, solo se retira.
DROP POLICY IF EXISTS "vehiculos_inventario_personal" ON public.vehiculos_inventario;
DROP POLICY IF EXISTS "vehiculos_ver" ON public.vehiculos_inventario;
DROP POLICY IF EXISTS "vehiculos_crear" ON public.vehiculos_inventario;
DROP POLICY IF EXISTS "vehiculos_actualizar" ON public.vehiculos_inventario;
CREATE POLICY "vehiculos_ver" ON public.vehiculos_inventario FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.veh_permiso('veh_ver'));
CREATE POLICY "vehiculos_crear" ON public.vehiculos_inventario FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.veh_permiso('veh_crear'));
CREATE POLICY "vehiculos_actualizar" ON public.vehiculos_inventario FOR UPDATE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.veh_permiso('veh_ver'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.veh_permiso('veh_ver'));

-- Gastos: verlos exige permiso de costos; registrarlos o quitarlos, permiso de gastos.
DROP POLICY IF EXISTS "vehiculo_gastos_personal" ON public.vehiculo_gastos;
DROP POLICY IF EXISTS "vehiculo_gastos_ver" ON public.vehiculo_gastos;
DROP POLICY IF EXISTS "vehiculo_gastos_crear" ON public.vehiculo_gastos;
DROP POLICY IF EXISTS "vehiculo_gastos_borrar" ON public.vehiculo_gastos;
CREATE POLICY "vehiculo_gastos_ver" ON public.vehiculo_gastos FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.veh_permiso('veh_costos'));
CREATE POLICY "vehiculo_gastos_crear" ON public.vehiculo_gastos FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.veh_permiso('veh_gastos'));
CREATE POLICY "vehiculo_gastos_borrar" ON public.vehiculo_gastos FOR DELETE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.veh_permiso('veh_gastos'));

-- El historial solo se lee; lo escriben los disparadores.
DROP POLICY IF EXISTS "vehiculo_movimientos_leer" ON public.vehiculo_movimientos;
CREATE POLICY "vehiculo_movimientos_leer" ON public.vehiculo_movimientos FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.veh_permiso('veh_ver'));

-- Documentos: ver con permiso de consulta, adjuntar o quitar con permiso de edición.
DROP POLICY IF EXISTS "documentos_vehiculo_personal" ON public.documentos_vehiculo;
DROP POLICY IF EXISTS "documentos_vehiculo_ver" ON public.documentos_vehiculo;
DROP POLICY IF EXISTS "documentos_vehiculo_editar" ON public.documentos_vehiculo;
CREATE POLICY "documentos_vehiculo_ver" ON public.documentos_vehiculo FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.veh_permiso('veh_ver'));
CREATE POLICY "documentos_vehiculo_editar" ON public.documentos_vehiculo FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.veh_permiso('veh_editar'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.veh_permiso('veh_editar'));

-- Un documento puede ser una foto del vehículo o un papel; se clasifica por tipo.
-- Las fotos de la ficha se guardan en la lista de fotos del vehículo (bucket de imágenes del negocio).
