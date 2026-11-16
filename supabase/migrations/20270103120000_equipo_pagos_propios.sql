-- Pagos y novedades del equipo (nómina) con tabla propia por negocio.
-- Se siguen capturando desde el formulario de módulos (modulo_registros, modulo "equipo_turnos")
-- y un trigger los refleja aquí, así la pantalla de nómina lee datos tipados.
-- No borra datos: copia lo existente y deja modulo_registros intacta.

CREATE TABLE IF NOT EXISTS public.equipo_pagos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  tipo_negocio text,
  titulo text not null,
  estado text not null default 'pendiente',
  monto numeric not null default 0,
  anulado boolean not null default false,
  fecha date,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS equipo_pagos_owner_idx ON public.equipo_pagos (owner_id, created_at desc);

ALTER TABLE public.equipo_pagos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equipo_pagos_personal" ON public.equipo_pagos;
CREATE POLICY "equipo_pagos_personal" ON public.equipo_pagos
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('equipo_turnos'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('equipo_turnos'));

DROP POLICY IF EXISTS "equipo_pagos_solo_tipo_actual" ON public.equipo_pagos;
CREATE POLICY "equipo_pagos_solo_tipo_actual" ON public.equipo_pagos
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())
  WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual());

REVOKE ALL ON public.equipo_pagos FROM anon;

-- Copia lo que ya existe en modulo_registros (idempotente).
INSERT INTO public.equipo_pagos (id, owner_id, tipo_negocio, titulo, estado, monto, anulado, fecha, created_at)
SELECT r.id, r.owner_id, r.tipo_negocio, r.titulo, r.estado, r.monto, r.anulado, r.fecha, r.created_at
FROM public.modulo_registros r
WHERE r.modulo = 'equipo_turnos'
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sincronizar_equipo_pago()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.modulo = 'equipo_turnos' THEN
      DELETE FROM public.equipo_pagos WHERE id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.modulo = 'equipo_turnos' THEN
    INSERT INTO public.equipo_pagos (id, owner_id, tipo_negocio, titulo, estado, monto, anulado, fecha, created_at)
    VALUES (NEW.id, NEW.owner_id, NEW.tipo_negocio, NEW.titulo, NEW.estado, NEW.monto, NEW.anulado, NEW.fecha, NEW.created_at)
    ON CONFLICT (id) DO UPDATE SET
      owner_id = EXCLUDED.owner_id,
      tipo_negocio = EXCLUDED.tipo_negocio,
      titulo = EXCLUDED.titulo,
      estado = EXCLUDED.estado,
      monto = EXCLUDED.monto,
      anulado = EXCLUDED.anulado,
      fecha = EXCLUDED.fecha;
  ELSIF TG_OP = 'UPDATE' AND OLD.modulo = 'equipo_turnos' THEN
    DELETE FROM public.equipo_pagos WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS modulo_registros_sync_equipo_trg ON public.modulo_registros;
CREATE TRIGGER modulo_registros_sync_equipo_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_equipo_pago();
