-- Proveedores (deudas por compras a crédito) con tabla propia por negocio.
-- Las compras a crédito y los registros del módulo "proveedores" se siguen capturando
-- en modulo_registros y un trigger los refleja aquí, así la pantalla lee datos tipados.
-- No borra datos: copia lo existente y deja modulo_registros intacta.

CREATE TABLE IF NOT EXISTS public.proveedores_registros (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  tipo_negocio text,
  titulo text not null,
  detalle text,
  contacto text,
  telefono text,
  estado text not null default 'pendiente',
  monto numeric not null default 0,
  abonado numeric not null default 0,
  datos jsonb not null default '{}'::jsonb,
  historial jsonb not null default '[]'::jsonb,
  anulado boolean not null default false,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS proveedores_registros_owner_idx ON public.proveedores_registros (owner_id, created_at desc);

ALTER TABLE public.proveedores_registros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proveedores_registros_personal" ON public.proveedores_registros;
CREATE POLICY "proveedores_registros_personal" ON public.proveedores_registros
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('proveedores'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('proveedores'));

DROP POLICY IF EXISTS "proveedores_registros_solo_tipo_actual" ON public.proveedores_registros;
CREATE POLICY "proveedores_registros_solo_tipo_actual" ON public.proveedores_registros
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())
  WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual());

REVOKE ALL ON public.proveedores_registros FROM anon;

INSERT INTO public.proveedores_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, telefono, estado, monto, abonado, datos, historial, anulado, created_at)
SELECT r.id, r.owner_id, r.tipo_negocio, r.titulo, r.detalle, r.contacto, r.telefono, r.estado, r.monto, r.abonado, r.datos, r.historial, r.anulado, r.created_at
FROM public.modulo_registros r
WHERE r.modulo = 'proveedores'
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.sincronizar_proveedor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.modulo = 'proveedores' THEN
      DELETE FROM public.proveedores_registros WHERE id = OLD.id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.modulo = 'proveedores' THEN
    INSERT INTO public.proveedores_registros (id, owner_id, tipo_negocio, titulo, detalle, contacto, telefono, estado, monto, abonado, datos, historial, anulado, created_at)
    VALUES (NEW.id, NEW.owner_id, NEW.tipo_negocio, NEW.titulo, NEW.detalle, NEW.contacto, NEW.telefono, NEW.estado, NEW.monto, NEW.abonado, NEW.datos, NEW.historial, NEW.anulado, NEW.created_at)
    ON CONFLICT (id) DO UPDATE SET
      owner_id = EXCLUDED.owner_id,
      tipo_negocio = EXCLUDED.tipo_negocio,
      titulo = EXCLUDED.titulo,
      detalle = EXCLUDED.detalle,
      contacto = EXCLUDED.contacto,
      telefono = EXCLUDED.telefono,
      estado = EXCLUDED.estado,
      monto = EXCLUDED.monto,
      abonado = EXCLUDED.abonado,
      datos = EXCLUDED.datos,
      historial = EXCLUDED.historial,
      anulado = EXCLUDED.anulado;
  ELSIF TG_OP = 'UPDATE' AND OLD.modulo = 'proveedores' THEN
    DELETE FROM public.proveedores_registros WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS modulo_registros_sync_proveedor_trg ON public.modulo_registros;
CREATE TRIGGER modulo_registros_sync_proveedor_trg
  AFTER INSERT OR UPDATE OR DELETE ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_proveedor();
