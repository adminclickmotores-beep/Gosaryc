-- Pedidos recurrentes, combos y puntos/recompensas con tabla propia por negocio.
-- Se siguen capturando desde el formulario de módulos (modulo_registros) y un trigger
-- las refleja en su tabla, así cada pantalla lee datos tipados.
-- No borra datos: copia lo existente y deja modulo_registros intacta.

-- ============ Pedidos recurrentes (modulo 'suscripciones') ============
CREATE TABLE IF NOT EXISTS public.suscripciones_registros (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  tipo_negocio text,
  titulo text not null,
  detalle text,
  contacto text,
  estado text not null default 'pendiente',
  monto numeric not null default 0,
  anulado boolean not null default false,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS suscripciones_registros_owner_idx ON public.suscripciones_registros (owner_id, created_at desc);

ALTER TABLE public.suscripciones_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "suscripciones_registros_personal" ON public.suscripciones_registros;
CREATE POLICY "suscripciones_registros_personal" ON public.suscripciones_registros
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('suscripciones'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('suscripciones'));

DROP POLICY IF EXISTS "suscripciones_registros_solo_tipo_actual" ON public.suscripciones_registros;
CREATE POLICY "suscripciones_registros_solo_tipo_actual" ON public.suscripciones_registros
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())
  WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual());

REVOKE ALL ON public.suscripciones_registros FROM anon;

INSERT INTO public.suscripciones_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, anulado, created_at)
SELECT r.id, r.owner_id, r.tipo_negocio, r.titulo, r.detalle, r.contacto, r.estado, r.monto, r.anulado, r.created_at
FROM public.modulo_registros r
WHERE r.modulo = 'suscripciones'
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sincronizar_suscripcion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.modulo = 'suscripciones' THEN
      DELETE FROM public.suscripciones_registros WHERE id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.modulo = 'suscripciones' THEN
    INSERT INTO public.suscripciones_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, anulado, created_at)
    VALUES (NEW.id, NEW.owner_id, NEW.tipo_negocio, NEW.titulo, NEW.detalle, NEW.contacto, NEW.estado, NEW.monto, NEW.anulado, NEW.created_at)
    ON CONFLICT (id) DO UPDATE SET
      owner_id = EXCLUDED.owner_id,
      tipo_negocio = EXCLUDED.tipo_negocio,
      titulo = EXCLUDED.titulo,
      detalle = EXCLUDED.detalle,
      contacto = EXCLUDED.contacto,
      estado = EXCLUDED.estado,
      monto = EXCLUDED.monto,
      anulado = EXCLUDED.anulado;
  ELSIF TG_OP = 'UPDATE' AND OLD.modulo = 'suscripciones' THEN
    DELETE FROM public.suscripciones_registros WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS modulo_registros_sync_suscripcion_trg ON public.modulo_registros;
CREATE TRIGGER modulo_registros_sync_suscripcion_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_suscripcion();

-- ============ Combos y promociones (modulo 'combos') ============
CREATE TABLE IF NOT EXISTS public.combos_registros (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  tipo_negocio text,
  titulo text not null,
  detalle text,
  contacto text,
  estado text not null default 'pendiente',
  monto numeric not null default 0,
  anulado boolean not null default false,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS combos_registros_owner_idx ON public.combos_registros (owner_id, created_at desc);

ALTER TABLE public.combos_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "combos_registros_personal" ON public.combos_registros;
CREATE POLICY "combos_registros_personal" ON public.combos_registros
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('combos'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('combos'));

DROP POLICY IF EXISTS "combos_registros_solo_tipo_actual" ON public.combos_registros;
CREATE POLICY "combos_registros_solo_tipo_actual" ON public.combos_registros
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())
  WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual());

REVOKE ALL ON public.combos_registros FROM anon;

INSERT INTO public.combos_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, anulado, created_at)
SELECT r.id, r.owner_id, r.tipo_negocio, r.titulo, r.detalle, r.contacto, r.estado, r.monto, r.anulado, r.created_at
FROM public.modulo_registros r
WHERE r.modulo = 'combos'
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sincronizar_combo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.modulo = 'combos' THEN
      DELETE FROM public.combos_registros WHERE id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.modulo = 'combos' THEN
    INSERT INTO public.combos_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, anulado, created_at)
    VALUES (NEW.id, NEW.owner_id, NEW.tipo_negocio, NEW.titulo, NEW.detalle, NEW.contacto, NEW.estado, NEW.monto, NEW.anulado, NEW.created_at)
    ON CONFLICT (id) DO UPDATE SET
      owner_id = EXCLUDED.owner_id,
      tipo_negocio = EXCLUDED.tipo_negocio,
      titulo = EXCLUDED.titulo,
      detalle = EXCLUDED.detalle,
      contacto = EXCLUDED.contacto,
      estado = EXCLUDED.estado,
      monto = EXCLUDED.monto,
      anulado = EXCLUDED.anulado;
  ELSIF TG_OP = 'UPDATE' AND OLD.modulo = 'combos' THEN
    DELETE FROM public.combos_registros WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS modulo_registros_sync_combo_trg ON public.modulo_registros;
CREATE TRIGGER modulo_registros_sync_combo_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_combo();

-- ============ Puntos y recompensas (modulo 'fidelizacion') ============
CREATE TABLE IF NOT EXISTS public.fidelizacion_registros (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  tipo_negocio text,
  titulo text not null,
  detalle text,
  contacto text,
  estado text not null default 'pendiente',
  monto numeric not null default 0,
  anulado boolean not null default false,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS fidelizacion_registros_owner_idx ON public.fidelizacion_registros (owner_id, created_at desc);

ALTER TABLE public.fidelizacion_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fidelizacion_registros_personal" ON public.fidelizacion_registros;
CREATE POLICY "fidelizacion_registros_personal" ON public.fidelizacion_registros
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('fidelizacion'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('fidelizacion'));

DROP POLICY IF EXISTS "fidelizacion_registros_solo_tipo_actual" ON public.fidelizacion_registros;
CREATE POLICY "fidelizacion_registros_solo_tipo_actual" ON public.fidelizacion_registros
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())
  WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual());

REVOKE ALL ON public.fidelizacion_registros FROM anon;

INSERT INTO public.fidelizacion_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, anulado, created_at)
SELECT r.id, r.owner_id, r.tipo_negocio, r.titulo, r.detalle, r.contacto, r.estado, r.monto, r.anulado, r.created_at
FROM public.modulo_registros r
WHERE r.modulo = 'fidelizacion'
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sincronizar_fidelizacion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.modulo = 'fidelizacion' THEN
      DELETE FROM public.fidelizacion_registros WHERE id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.modulo = 'fidelizacion' THEN
    INSERT INTO public.fidelizacion_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, anulado, created_at)
    VALUES (NEW.id, NEW.owner_id, NEW.tipo_negocio, NEW.titulo, NEW.detalle, NEW.contacto, NEW.estado, NEW.monto, NEW.anulado, NEW.created_at)
    ON CONFLICT (id) DO UPDATE SET
      owner_id = EXCLUDED.owner_id,
      tipo_negocio = EXCLUDED.tipo_negocio,
      titulo = EXCLUDED.titulo,
      detalle = EXCLUDED.detalle,
      contacto = EXCLUDED.contacto,
      estado = EXCLUDED.estado,
      monto = EXCLUDED.monto,
      anulado = EXCLUDED.anulado;
  ELSIF TG_OP = 'UPDATE' AND OLD.modulo = 'fidelizacion' THEN
    DELETE FROM public.fidelizacion_registros WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS modulo_registros_sync_fidelizacion_trg ON public.modulo_registros;
CREATE TRIGGER modulo_registros_sync_fidelizacion_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_fidelizacion();
