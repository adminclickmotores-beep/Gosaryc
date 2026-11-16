-- Reseñas y PQRS con tabla propia por negocio.
-- Se siguen capturando desde el formulario de módulos (modulo_registros, modulo "resenas")
-- y un trigger las refleja aquí, así la pantalla de reseñas lee datos tipados.
-- No borra datos: copia lo existente y deja modulo_registros intacta.

CREATE TABLE IF NOT EXISTS public.resenas_registros (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  tipo_negocio text,
  titulo text not null,
  detalle text,
  contacto text,
  estado text not null default 'pendiente',
  anulado boolean not null default false,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS resenas_registros_owner_idx ON public.resenas_registros (owner_id, created_at desc);

ALTER TABLE public.resenas_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "resenas_registros_personal" ON public.resenas_registros;
CREATE POLICY "resenas_registros_personal" ON public.resenas_registros
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('resenas'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('resenas'));

DROP POLICY IF EXISTS "resenas_registros_solo_tipo_actual" ON public.resenas_registros;
CREATE POLICY "resenas_registros_solo_tipo_actual" ON public.resenas_registros
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())
  WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual());

REVOKE ALL ON public.resenas_registros FROM anon;

-- Copia lo que ya existe en modulo_registros (idempotente).
INSERT INTO public.resenas_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, estado, anulado, created_at)
SELECT r.id, r.owner_id, r.tipo_negocio, r.titulo, r.detalle, r.contacto, r.estado, r.anulado, r.created_at
FROM public.modulo_registros r
WHERE r.modulo = 'resenas'
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sincronizar_resena()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.modulo = 'resenas' THEN
      DELETE FROM public.resenas_registros WHERE id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.modulo = 'resenas' THEN
    INSERT INTO public.resenas_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, estado, anulado, created_at)
    VALUES (NEW.id, NEW.owner_id, NEW.tipo_negocio, NEW.titulo, NEW.detalle, NEW.contacto, NEW.estado, NEW.anulado, NEW.created_at)
    ON CONFLICT (id) DO UPDATE SET
      owner_id = EXCLUDED.owner_id,
      tipo_negocio = EXCLUDED.tipo_negocio,
      titulo = EXCLUDED.titulo,
      detalle = EXCLUDED.detalle,
      contacto = EXCLUDED.contacto,
      estado = EXCLUDED.estado,
      anulado = EXCLUDED.anulado;
  ELSIF TG_OP = 'UPDATE' AND OLD.modulo = 'resenas' THEN
    DELETE FROM public.resenas_registros WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS modulo_registros_sync_resena_trg ON public.modulo_registros;
CREATE TRIGGER modulo_registros_sync_resena_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_resena();
