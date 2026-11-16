-- Ventas de vehículos y comisiones con tabla propia por negocio.
-- Se siguen capturando desde el formulario de módulos (modulo_registros) y un trigger
-- las refleja en su tabla, así el tablero del concesionario lee datos tipados.
-- No borra datos: copia lo existente y deja modulo_registros intacta.

-- ============ Ventas de vehículos (modulo 'ventas_veh') ============
CREATE TABLE IF NOT EXISTS public.ventas_veh_registros (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  tipo_negocio text,
  titulo text not null,
  detalle text,
  contacto text,
  estado text not null default 'pendiente',
  monto numeric not null default 0,
  fecha date,
  anulado boolean not null default false,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS ventas_veh_registros_owner_idx ON public.ventas_veh_registros (owner_id, created_at desc);

ALTER TABLE public.ventas_veh_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ventas_veh_registros_personal" ON public.ventas_veh_registros;
CREATE POLICY "ventas_veh_registros_personal" ON public.ventas_veh_registros
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('ventas_veh'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('ventas_veh'));

DROP POLICY IF EXISTS "ventas_veh_registros_solo_tipo_actual" ON public.ventas_veh_registros;
CREATE POLICY "ventas_veh_registros_solo_tipo_actual" ON public.ventas_veh_registros
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())
  WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual());

REVOKE ALL ON public.ventas_veh_registros FROM anon;

INSERT INTO public.ventas_veh_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, fecha, anulado, created_at)
SELECT r.id, r.owner_id, r.tipo_negocio, r.titulo, r.detalle, r.contacto, r.estado, r.monto, r.fecha, r.anulado, r.created_at
FROM public.modulo_registros r
WHERE r.modulo = 'ventas_veh'
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sincronizar_venta_vehiculo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.modulo = 'ventas_veh' THEN
      DELETE FROM public.ventas_veh_registros WHERE id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.modulo = 'ventas_veh' THEN
    INSERT INTO public.ventas_veh_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, fecha, anulado, created_at)
    VALUES (NEW.id, NEW.owner_id, NEW.tipo_negocio, NEW.titulo, NEW.detalle, NEW.contacto, NEW.estado, NEW.monto, NEW.fecha, NEW.anulado, NEW.created_at)
    ON CONFLICT (id) DO UPDATE SET
      owner_id = EXCLUDED.owner_id,
      tipo_negocio = EXCLUDED.tipo_negocio,
      titulo = EXCLUDED.titulo,
      detalle = EXCLUDED.detalle,
      contacto = EXCLUDED.contacto,
      estado = EXCLUDED.estado,
      monto = EXCLUDED.monto,
      fecha = EXCLUDED.fecha,
      anulado = EXCLUDED.anulado;
  ELSIF TG_OP = 'UPDATE' AND OLD.modulo = 'ventas_veh' THEN
    DELETE FROM public.ventas_veh_registros WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS modulo_registros_sync_venta_vehiculo_trg ON public.modulo_registros;
CREATE TRIGGER modulo_registros_sync_venta_vehiculo_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_venta_vehiculo();

-- ============ Comisiones de asesores (modulo 'comisiones') ============
CREATE TABLE IF NOT EXISTS public.comisiones_registros (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  tipo_negocio text,
  titulo text not null,
  detalle text,
  contacto text,
  estado text not null default 'pendiente',
  monto numeric not null default 0,
  fecha date,
  anulado boolean not null default false,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS comisiones_registros_owner_idx ON public.comisiones_registros (owner_id, created_at desc);

ALTER TABLE public.comisiones_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comisiones_registros_personal" ON public.comisiones_registros;
CREATE POLICY "comisiones_registros_personal" ON public.comisiones_registros
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('comisiones'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('comisiones'));

DROP POLICY IF EXISTS "comisiones_registros_solo_tipo_actual" ON public.comisiones_registros;
CREATE POLICY "comisiones_registros_solo_tipo_actual" ON public.comisiones_registros
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())
  WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual());

REVOKE ALL ON public.comisiones_registros FROM anon;

INSERT INTO public.comisiones_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, fecha, anulado, created_at)
SELECT r.id, r.owner_id, r.tipo_negocio, r.titulo, r.detalle, r.contacto, r.estado, r.monto, r.fecha, r.anulado, r.created_at
FROM public.modulo_registros r
WHERE r.modulo = 'comisiones'
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sincronizar_comision_vehiculo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.modulo = 'comisiones' THEN
      DELETE FROM public.comisiones_registros WHERE id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.modulo = 'comisiones' THEN
    INSERT INTO public.comisiones_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, fecha, anulado, created_at)
    VALUES (NEW.id, NEW.owner_id, NEW.tipo_negocio, NEW.titulo, NEW.detalle, NEW.contacto, NEW.estado, NEW.monto, NEW.fecha, NEW.anulado, NEW.created_at)
    ON CONFLICT (id) DO UPDATE SET
      owner_id = EXCLUDED.owner_id,
      tipo_negocio = EXCLUDED.tipo_negocio,
      titulo = EXCLUDED.titulo,
      detalle = EXCLUDED.detalle,
      contacto = EXCLUDED.contacto,
      estado = EXCLUDED.estado,
      monto = EXCLUDED.monto,
      fecha = EXCLUDED.fecha,
      anulado = EXCLUDED.anulado;
  ELSIF TG_OP = 'UPDATE' AND OLD.modulo = 'comisiones' THEN
    DELETE FROM public.comisiones_registros WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS modulo_registros_sync_comision_vehiculo_trg ON public.modulo_registros;
CREATE TRIGGER modulo_registros_sync_comision_vehiculo_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_comision_vehiculo();
