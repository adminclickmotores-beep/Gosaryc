-- Pagos digitales (Nequi, Daviplata, Bre-B) con tabla propia por negocio.
-- Se siguen capturando desde el formulario de módulos (modulo_registros, modulo "pagos_digitales")
-- y un trigger las refleja aquí, así la conciliación lee datos tipados.
-- No borra datos: copia lo existente y deja modulo_registros intacta.

CREATE TABLE IF NOT EXISTS public.pagos_digitales_registros (
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

CREATE INDEX IF NOT EXISTS pagos_digitales_registros_owner_idx ON public.pagos_digitales_registros (owner_id, created_at desc);

ALTER TABLE public.pagos_digitales_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pagos_digitales_registros_personal" ON public.pagos_digitales_registros;
CREATE POLICY "pagos_digitales_registros_personal" ON public.pagos_digitales_registros
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('pagos_digitales'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('pagos_digitales'));

DROP POLICY IF EXISTS "pagos_digitales_registros_solo_tipo_actual" ON public.pagos_digitales_registros;
CREATE POLICY "pagos_digitales_registros_solo_tipo_actual" ON public.pagos_digitales_registros
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())
  WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual());

REVOKE ALL ON public.pagos_digitales_registros FROM anon;

INSERT INTO public.pagos_digitales_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, anulado, created_at)
SELECT r.id, r.owner_id, r.tipo_negocio, r.titulo, r.detalle, r.contacto, r.estado, r.monto, r.anulado, r.created_at
FROM public.modulo_registros r
WHERE r.modulo = 'pagos_digitales'
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sincronizar_pago_digital()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.modulo = 'pagos_digitales' THEN
      DELETE FROM public.pagos_digitales_registros WHERE id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.modulo = 'pagos_digitales' THEN
    INSERT INTO public.pagos_digitales_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, anulado, created_at)
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
  ELSIF TG_OP = 'UPDATE' AND OLD.modulo = 'pagos_digitales' THEN
    DELETE FROM public.pagos_digitales_registros WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS modulo_registros_sync_pago_digital_trg ON public.modulo_registros;
CREATE TRIGGER modulo_registros_sync_pago_digital_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_pago_digital();
