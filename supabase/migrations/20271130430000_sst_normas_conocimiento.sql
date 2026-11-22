-- Base de conocimiento normativo SST por negocio (catálogo vigente 2026 + normas sectoriales).
-- Aislada por owner_id = mi_negocio_id(), sin borrado físico.
CREATE TABLE IF NOT EXISTS public.sst_normas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  codigo text NOT NULL,
  titulo text NOT NULL,
  tema text NOT NULL DEFAULT '',
  resumen text NOT NULL DEFAULT '',
  fuente text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'Vigente',
  origen text NOT NULL DEFAULT 'base',
  nota text,
  ultima_actualizacion timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sst_normas_largos CHECK (char_length(codigo) <= 80 AND char_length(titulo) <= 200 AND char_length(resumen) <= 1200)
);
CREATE UNIQUE INDEX IF NOT EXISTS sst_normas_owner_codigo_idx ON public.sst_normas (owner_id, codigo);

ALTER TABLE public.sst_normas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sst_normas_leer ON public.sst_normas;
CREATE POLICY sst_normas_leer ON public.sst_normas FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS sst_normas_solo_mi_negocio ON public.sst_normas;
CREATE POLICY sst_normas_solo_mi_negocio ON public.sst_normas AS RESTRICTIVE FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id());
DROP POLICY IF EXISTS sst_normas_crear ON public.sst_normas;
CREATE POLICY sst_normas_crear ON public.sst_normas FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS sst_normas_editar ON public.sst_normas;
CREATE POLICY sst_normas_editar ON public.sst_normas FOR UPDATE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
REVOKE ALL ON public.sst_normas FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.sst_normas FROM authenticated;
DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.sst_normas;
CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.sst_normas
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero();
