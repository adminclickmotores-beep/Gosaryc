-- Facturación DIAN y permisos del restaurante con tabla propia por negocio.
-- Se siguen capturando desde el formulario de módulos (modulo_registros) y un trigger
-- las refleja en su tabla. No cambia ninguna pantalla y no borra datos.

-- ============ Facturación DIAN (modulo 'facturas') ============
CREATE TABLE IF NOT EXISTS public.facturas_registros (
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

CREATE INDEX IF NOT EXISTS facturas_registros_owner_idx ON public.facturas_registros (owner_id, created_at desc);

ALTER TABLE public.facturas_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "facturas_registros_personal" ON public.facturas_registros;
CREATE POLICY "facturas_registros_personal" ON public.facturas_registros
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('facturas'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('facturas'));

DROP POLICY IF EXISTS "facturas_registros_solo_tipo_actual" ON public.facturas_registros;
CREATE POLICY "facturas_registros_solo_tipo_actual" ON public.facturas_registros
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())
  WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual());

REVOKE ALL ON public.facturas_registros FROM anon;

INSERT INTO public.facturas_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, fecha, anulado, created_at)
SELECT r.id, r.owner_id, r.tipo_negocio, r.titulo, r.detalle, r.contacto, r.estado, r.monto, r.fecha, r.anulado, r.created_at
FROM public.modulo_registros r
WHERE r.modulo = 'facturas'
ON CONFLICT (id) DO NOTHING;

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
    INSERT INTO public.facturas_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, fecha, anulado, created_at)
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
  ELSIF TG_OP = 'UPDATE' AND OLD.modulo = 'facturas' THEN
    DELETE FROM public.facturas_registros WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS modulo_registros_sync_facturas_trg ON public.modulo_registros;
CREATE TRIGGER modulo_registros_sync_facturas_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_facturas_registro();

-- ============ Permisos y licencias del restaurante (modulo 'permisos_rest') ============
CREATE TABLE IF NOT EXISTS public.permisos_rest_registros (
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

CREATE INDEX IF NOT EXISTS permisos_rest_registros_owner_idx ON public.permisos_rest_registros (owner_id, created_at desc);

ALTER TABLE public.permisos_rest_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "permisos_rest_registros_personal" ON public.permisos_rest_registros;
CREATE POLICY "permisos_rest_registros_personal" ON public.permisos_rest_registros
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('permisos_rest'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('permisos_rest'));

DROP POLICY IF EXISTS "permisos_rest_registros_solo_tipo_actual" ON public.permisos_rest_registros;
CREATE POLICY "permisos_rest_registros_solo_tipo_actual" ON public.permisos_rest_registros
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())
  WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual());

REVOKE ALL ON public.permisos_rest_registros FROM anon;

INSERT INTO public.permisos_rest_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, fecha, anulado, created_at)
SELECT r.id, r.owner_id, r.tipo_negocio, r.titulo, r.detalle, r.contacto, r.estado, r.monto, r.fecha, r.anulado, r.created_at
FROM public.modulo_registros r
WHERE r.modulo = 'permisos_rest'
ON CONFLICT (id) DO NOTHING;

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
    INSERT INTO public.permisos_rest_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, fecha, anulado, created_at)
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
  ELSIF TG_OP = 'UPDATE' AND OLD.modulo = 'permisos_rest' THEN
    DELETE FROM public.permisos_rest_registros WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS modulo_registros_sync_permisos_rest_trg ON public.modulo_registros;
CREATE TRIGGER modulo_registros_sync_permisos_rest_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_permisos_rest_registro();
