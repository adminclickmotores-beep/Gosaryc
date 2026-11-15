-- Inventario de vehículos completo: procedencia, propietario, costos, historial y duplicados.
ALTER TABLE public.vehiculos_inventario
  ADD COLUMN IF NOT EXISTS linea text,
  ADD COLUMN IF NOT EXISTS chasis text,
  ADD COLUMN IF NOT EXISTS procedencia text NOT NULL DEFAULT 'propio',
  ADD COLUMN IF NOT EXISTS propietario_nombre text,
  ADD COLUMN IF NOT EXISTS propietario_documento text,
  ADD COLUMN IF NOT EXISTS propietario_telefono text,
  ADD COLUMN IF NOT EXISTS propietario_email text,
  ADD COLUMN IF NOT EXISTS fecha_ingreso date,
  ADD COLUMN IF NOT EXISTS fecha_venta date,
  ADD COLUMN IF NOT EXISTS precio_venta_final numeric;

-- Gastos, reparaciones y alistamiento de cada vehículo.
CREATE TABLE IF NOT EXISTS public.vehiculo_gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  vehiculo_id uuid NOT NULL REFERENCES public.vehiculos_inventario(id) ON DELETE CASCADE,
  categoria text NOT NULL DEFAULT 'otro',
  descripcion text NOT NULL,
  monto numeric NOT NULL DEFAULT 0,
  fecha date NOT NULL DEFAULT current_date,
  proveedor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehiculo_gastos_vehiculo_idx ON public.vehiculo_gastos (vehiculo_id);
ALTER TABLE public.vehiculo_gastos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vehiculo_gastos_personal" ON public.vehiculo_gastos;
CREATE POLICY "vehiculo_gastos_personal" ON public.vehiculo_gastos
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

-- Historial de movimientos (se llena solo con triggers).
CREATE TABLE IF NOT EXISTS public.vehiculo_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  vehiculo_id uuid NOT NULL REFERENCES public.vehiculos_inventario(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  detalle text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vehiculo_movimientos_vehiculo_idx ON public.vehiculo_movimientos (vehiculo_id);
ALTER TABLE public.vehiculo_movimientos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vehiculo_movimientos_leer" ON public.vehiculo_movimientos;
CREATE POLICY "vehiculo_movimientos_leer" ON public.vehiculo_movimientos
  FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal());

-- Placa y VIN no se pueden repetir dentro del mismo negocio.
CREATE OR REPLACE FUNCTION public.vehiculo_validar_duplicados() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.placa IS NOT NULL AND btrim(NEW.placa) <> '' AND EXISTS (
    SELECT 1 FROM public.vehiculos_inventario v
    WHERE v.owner_id IS NOT DISTINCT FROM NEW.owner_id AND v.id <> NEW.id
      AND upper(btrim(v.placa)) = upper(btrim(NEW.placa))) THEN
    RAISE EXCEPTION 'PLACA_DUPLICADA';
  END IF;
  IF NEW.vin IS NOT NULL AND btrim(NEW.vin) <> '' AND EXISTS (
    SELECT 1 FROM public.vehiculos_inventario v
    WHERE v.owner_id IS NOT DISTINCT FROM NEW.owner_id AND v.id <> NEW.id
      AND upper(btrim(v.vin)) = upper(btrim(NEW.vin))) THEN
    RAISE EXCEPTION 'VIN_DUPLICADO';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vehiculo_validar_duplicados_t ON public.vehiculos_inventario;
CREATE TRIGGER vehiculo_validar_duplicados_t
  BEFORE INSERT OR UPDATE OF placa, vin ON public.vehiculos_inventario
  FOR EACH ROW EXECUTE FUNCTION public.vehiculo_validar_duplicados();

-- Registro automático de movimientos.
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
    IF NEW.propietario_nombre IS DISTINCT FROM OLD.propietario_nombre THEN
      INSERT INTO public.vehiculo_movimientos (owner_id, vehiculo_id, tipo, detalle)
      VALUES (NEW.owner_id, NEW.id, 'propietario', 'Propietario actualizado: ' || coalesce(NEW.propietario_nombre, 'sin dato'));
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vehiculo_registrar_movimiento_t ON public.vehiculos_inventario;
CREATE TRIGGER vehiculo_registrar_movimiento_t
  AFTER INSERT OR UPDATE ON public.vehiculos_inventario
  FOR EACH ROW EXECUTE FUNCTION public.vehiculo_registrar_movimiento();

CREATE OR REPLACE FUNCTION public.vehiculo_gasto_movimiento() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.vehiculo_movimientos (owner_id, vehiculo_id, tipo, detalle)
    VALUES (NEW.owner_id, NEW.vehiculo_id, 'gasto', 'Gasto (' || NEW.categoria || '): ' || NEW.descripcion || ' · ' || NEW.monto);
    RETURN NEW;
  ELSE
    INSERT INTO public.vehiculo_movimientos (owner_id, vehiculo_id, tipo, detalle)
    SELECT OLD.owner_id, OLD.vehiculo_id, 'gasto', 'Gasto eliminado: ' || OLD.descripcion || ' · ' || OLD.monto
    WHERE EXISTS (SELECT 1 FROM public.vehiculos_inventario WHERE id = OLD.vehiculo_id);
    RETURN OLD;
  END IF;
END $$;
DROP TRIGGER IF EXISTS vehiculo_gasto_movimiento_t ON public.vehiculo_gastos;
CREATE TRIGGER vehiculo_gasto_movimiento_t
  AFTER INSERT OR DELETE ON public.vehiculo_gastos
  FOR EACH ROW EXECUTE FUNCTION public.vehiculo_gasto_movimiento();
