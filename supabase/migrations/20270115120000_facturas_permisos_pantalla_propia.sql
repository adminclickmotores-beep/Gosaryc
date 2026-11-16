-- Facturación DIAN y permisos del restaurante: la pantalla ahora lee y escribe en sus tablas propias.
-- Se agregan las mismas columnas que tiene modulo_registros (abonos, existencias, historial, datos extra...)
-- para que no se pierda nada. Los datos ya existentes se copian desde modulo_registros.

-- ============ Facturación DIAN (facturas_registros) ============
ALTER TABLE public.facturas_registros
  ADD COLUMN IF NOT EXISTS modulo text NOT NULL DEFAULT 'facturas',
  ADD COLUMN IF NOT EXISTS telefono text,
  ADD COLUMN IF NOT EXISTS abonado numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cantidad numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimo numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS historial jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS datos jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS motivo_anulacion text;

ALTER TABLE public.facturas_registros ALTER COLUMN owner_id SET DEFAULT public.mi_negocio_id();
ALTER TABLE public.facturas_registros ALTER COLUMN tipo_negocio SET DEFAULT public.tipo_negocio_actual();

UPDATE public.facturas_registros f
SET telefono = r.telefono,
    abonado = r.abonado,
    cantidad = r.cantidad,
    minimo = r.minimo,
    historial = r.historial,
    datos = r.datos,
    motivo_anulacion = r.motivo_anulacion,
    modulo = r.modulo
FROM public.modulo_registros r
WHERE r.id = f.id;

CREATE OR REPLACE FUNCTION public.sincronizar_facturas_registro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.modulo = 'facturas' THEN
      DELETE FROM public.facturas_registros WHERE id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.modulo = 'facturas' THEN
    INSERT INTO public.facturas_registros (id, owner_id, tipo_negocio, modulo, titulo, detalle, contacto, telefono, estado, monto, fecha, anulado, abonado, cantidad, minimo, historial, datos, motivo_anulacion, created_at)
    VALUES (NEW.id, NEW.owner_id, NEW.tipo_negocio, NEW.modulo, NEW.titulo, NEW.detalle, NEW.contacto, NEW.telefono, NEW.estado, NEW.monto, NEW.fecha, NEW.anulado, NEW.abonado, NEW.cantidad, NEW.minimo, NEW.historial, NEW.datos, NEW.motivo_anulacion, NEW.created_at)
    ON CONFLICT (id) DO UPDATE SET
      owner_id = EXCLUDED.owner_id,
      tipo_negocio = EXCLUDED.tipo_negocio,
      modulo = EXCLUDED.modulo,
      titulo = EXCLUDED.titulo,
      detalle = EXCLUDED.detalle,
      contacto = EXCLUDED.contacto,
      telefono = EXCLUDED.telefono,
      estado = EXCLUDED.estado,
      monto = EXCLUDED.monto,
      fecha = EXCLUDED.fecha,
      anulado = EXCLUDED.anulado,
      abonado = EXCLUDED.abonado,
      cantidad = EXCLUDED.cantidad,
      minimo = EXCLUDED.minimo,
      historial = EXCLUDED.historial,
      datos = EXCLUDED.datos,
      motivo_anulacion = EXCLUDED.motivo_anulacion;
  ELSIF TG_OP = 'UPDATE' AND OLD.modulo = 'facturas' THEN
    DELETE FROM public.facturas_registros WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- ============ Permisos y licencias (permisos_rest_registros) ============
ALTER TABLE public.permisos_rest_registros
  ADD COLUMN IF NOT EXISTS modulo text NOT NULL DEFAULT 'permisos_rest',
  ADD COLUMN IF NOT EXISTS telefono text,
  ADD COLUMN IF NOT EXISTS abonado numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cantidad numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS minimo numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS historial jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS datos jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS motivo_anulacion text;

ALTER TABLE public.permisos_rest_registros ALTER COLUMN owner_id SET DEFAULT public.mi_negocio_id();
ALTER TABLE public.permisos_rest_registros ALTER COLUMN tipo_negocio SET DEFAULT public.tipo_negocio_actual();

UPDATE public.permisos_rest_registros p
SET telefono = r.telefono,
    abonado = r.abonado,
    cantidad = r.cantidad,
    minimo = r.minimo,
    historial = r.historial,
    datos = r.datos,
    motivo_anulacion = r.motivo_anulacion,
    modulo = r.modulo
FROM public.modulo_registros r
WHERE r.id = p.id;

CREATE OR REPLACE FUNCTION public.sincronizar_permisos_rest_registro()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.modulo = 'permisos_rest' THEN
      DELETE FROM public.permisos_rest_registros WHERE id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.modulo = 'permisos_rest' THEN
    INSERT INTO public.permisos_rest_registros (id, owner_id, tipo_negocio, modulo, titulo, detalle, contacto, telefono, estado, monto, fecha, anulado, abonado, cantidad, minimo, historial, datos, motivo_anulacion, created_at)
    VALUES (NEW.id, NEW.owner_id, NEW.tipo_negocio, NEW.modulo, NEW.titulo, NEW.detalle, NEW.contacto, NEW.telefono, NEW.estado, NEW.monto, NEW.fecha, NEW.anulado, NEW.abonado, NEW.cantidad, NEW.minimo, NEW.historial, NEW.datos, NEW.motivo_anulacion, NEW.created_at)
    ON CONFLICT (id) DO UPDATE SET
      owner_id = EXCLUDED.owner_id,
      tipo_negocio = EXCLUDED.tipo_negocio,
      modulo = EXCLUDED.modulo,
      titulo = EXCLUDED.titulo,
      detalle = EXCLUDED.detalle,
      contacto = EXCLUDED.contacto,
      telefono = EXCLUDED.telefono,
      estado = EXCLUDED.estado,
      monto = EXCLUDED.monto,
      fecha = EXCLUDED.fecha,
      anulado = EXCLUDED.anulado,
      abonado = EXCLUDED.abonado,
      cantidad = EXCLUDED.cantidad,
      minimo = EXCLUDED.minimo,
      historial = EXCLUDED.historial,
      datos = EXCLUDED.datos,
      motivo_anulacion = EXCLUDED.motivo_anulacion;
  ELSIF TG_OP = 'UPDATE' AND OLD.modulo = 'permisos_rest' THEN
    DELETE FROM public.permisos_rest_registros WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;
