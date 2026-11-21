-- Grupo 1 (comercio y retail): ficha específica por tipo de negocio y seriales / IMEI con garantía.
-- Todo con owner_id = mi_negocio_id() y RLS estricto. Sin borrado físico. No borra ni trunca datos.

ALTER TABLE public.com_productos
  ADD COLUMN IF NOT EXISTS atributos jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS garantia_dias integer NOT NULL DEFAULT 0 CHECK (garantia_dias >= 0 AND garantia_dias <= 3650),
  ADD COLUMN IF NOT EXISTS requiere_serial boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.com_seriales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  producto_id uuid NOT NULL REFERENCES public.com_productos(id) ON DELETE RESTRICT,
  serial text NOT NULL CHECK (length(trim(serial)) >= 3 AND length(serial) <= 60),
  estado text NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'vendido', 'en_garantia', 'devuelto')),
  cliente text CHECK (cliente IS NULL OR length(cliente) <= 120),
  telefono text CHECK (telefono IS NULL OR length(telefono) <= 30),
  vendido_el date,
  garantia_hasta date,
  notas text CHECK (notas IS NULL OR length(notas) <= 500),
  registrado_por text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS com_seriales_serial_uq ON public.com_seriales (owner_id, serial);
CREATE INDEX IF NOT EXISTS com_seriales_producto_idx ON public.com_seriales (owner_id, producto_id, estado);

ALTER TABLE public.com_seriales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS com_seriales_leer ON public.com_seriales;
CREATE POLICY com_seriales_leer ON public.com_seriales FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal());

DROP POLICY IF EXISTS com_seriales_crear ON public.com_seriales;
CREATE POLICY com_seriales_crear ON public.com_seriales FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

DROP POLICY IF EXISTS com_seriales_editar ON public.com_seriales;
CREATE POLICY com_seriales_editar ON public.com_seriales FOR UPDATE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

DROP POLICY IF EXISTS com_seriales_solo_mi_negocio ON public.com_seriales;
CREATE POLICY com_seriales_solo_mi_negocio ON public.com_seriales AS RESTRICTIVE FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id());

REVOKE ALL ON public.com_seriales FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.com_seriales FROM authenticated;

DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.com_seriales;
CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.com_seriales
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero();
