-- Propinas con tabla propia por negocio.
-- Se siguen capturando desde el formulario de módulos (modulo_registros, modulo "propinas")
-- y un trigger las refleja aquí, así la pantalla de propinas lee datos tipados.
-- No borra datos: copia lo existente y deja modulo_registros intacta.

CREATE TABLE IF NOT EXISTS public.propinas_registros (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  tipo_negocio text,
  titulo text not null,
  estado text not null default 'pendiente',
  monto numeric not null default 0,
  anulado boolean not null default false,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS propinas_registros_owner_idx ON public.propinas_registros (owner_id, created_at desc);

ALTER TABLE public.propinas_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "propinas_registros_personal" ON public.propinas_registros;
CREATE POLICY "propinas_registros_personal" ON public.propinas_registros
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('propinas'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('propinas'));

DROP POLICY IF EXISTS "propinas_registros_solo_tipo_actual" ON public.propinas_registros;
CREATE POLICY "propinas_registros_solo_tipo_actual" ON public.propinas_registros
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())
  WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual());

REVOKE ALL ON public.propinas_registros FROM anon;

-- Copia lo que ya existe en modulo_registros (idempotente).
INSERT INTO public.propinas_registros (id, owner_id, tipo_negocio, titulo, estado, monto, anulado, created_at)
SELECT r.id, r.owner_id, r.tipo_negocio, r.titulo, r.estado, r.monto, r.anulado, r.created_at
FROM public.modulo_registros r
WHERE r.modulo = 'propinas'
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sincronizar_propina()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.modulo = 'propinas' THEN
      DELETE FROM public.propinas_registros WHERE id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.modulo = 'propinas' THEN
    INSERT INTO public.propinas_registros (id, owner_id, tipo_negocio, titulo, estado, monto, anulado, created_at)
    VALUES (NEW.id, NEW.owner_id, NEW.tipo_negocio, NEW.titulo, NEW.estado, NEW.monto, NEW.anulado, NEW.created_at)
    ON CONFLICT (id) DO UPDATE SET
      owner_id = EXCLUDED.owner_id,
      tipo_negocio = EXCLUDED.tipo_negocio,
      titulo = EXCLUDED.titulo,
      estado = EXCLUDED.estado,
      monto = EXCLUDED.monto,
      anulado = EXCLUDED.anulado;
  ELSIF TG_OP = 'UPDATE' AND OLD.modulo = 'propinas' THEN
    DELETE FROM public.propinas_registros WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS modulo_registros_sync_propinas_trg ON public.modulo_registros;
CREATE TRIGGER modulo_registros_sync_propinas_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_propina();
