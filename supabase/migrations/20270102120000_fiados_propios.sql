-- Cartera de fiados con tabla propia por negocio.
-- Los fiados siguen capturándose desde el formulario de módulos (modulo_registros) y un trigger
-- los refleja en esta tabla, así la cartera lee datos tipados sin cambiar lo que ya funciona.
-- No borra datos: copia los fiados existentes y deja modulo_registros intacta.

CREATE TABLE IF NOT EXISTS public.fiados (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  tipo_negocio text,
  titulo text not null,
  contacto text,
  telefono text,
  monto numeric not null default 0,
  abonado numeric not null default 0,
  estado text not null default 'pendiente',
  anulado boolean not null default false,
  fecha date,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS fiados_owner_idx ON public.fiados (owner_id, created_at desc);

ALTER TABLE public.fiados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fiados_personal" ON public.fiados;
CREATE POLICY "fiados_personal" ON public.fiados
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('fiados'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('fiados'));

DROP POLICY IF EXISTS "fiados_solo_tipo_actual" ON public.fiados;
CREATE POLICY "fiados_solo_tipo_actual" ON public.fiados
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())
  WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual());

REVOKE ALL ON public.fiados FROM anon;

-- Copia los fiados que ya existen en modulo_registros (idempotente).
INSERT INTO public.fiados (id, owner_id, tipo_negocio, titulo, contacto, telefono, monto, abonado, estado, anulado, fecha, created_at)
SELECT r.id, r.owner_id, r.tipo_negocio, r.titulo, r.contacto, r.telefono, r.monto, r.abonado, r.estado, r.anulado, r.fecha, r.created_at
FROM public.modulo_registros r
WHERE r.modulo = 'fiados'
ON CONFLICT (id) DO NOTHING;

-- Mantiene fiados al día cuando se crea, cambia o elimina un registro de fiados.
CREATE OR REPLACE FUNCTION public.sincronizar_fiado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.modulo = 'fiados' THEN
      DELETE FROM public.fiados WHERE id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.modulo = 'fiados' THEN
    INSERT INTO public.fiados (id, owner_id, tipo_negocio, titulo, contacto, telefono, monto, abonado, estado, anulado, fecha, created_at)
    VALUES (NEW.id, NEW.owner_id, NEW.tipo_negocio, NEW.titulo, NEW.contacto, NEW.telefono, NEW.monto, NEW.abonado, NEW.estado, NEW.anulado, NEW.fecha, NEW.created_at)
    ON CONFLICT (id) DO UPDATE SET
      owner_id = EXCLUDED.owner_id,
      tipo_negocio = EXCLUDED.tipo_negocio,
      titulo = EXCLUDED.titulo,
      contacto = EXCLUDED.contacto,
      telefono = EXCLUDED.telefono,
      monto = EXCLUDED.monto,
      abonado = EXCLUDED.abonado,
      estado = EXCLUDED.estado,
      anulado = EXCLUDED.anulado,
      fecha = EXCLUDED.fecha;
  ELSIF TG_OP = 'UPDATE' AND OLD.modulo = 'fiados' THEN
    DELETE FROM public.fiados WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS modulo_registros_sync_fiados_trg ON public.modulo_registros;
CREATE TRIGGER modulo_registros_sync_fiados_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_fiado();
