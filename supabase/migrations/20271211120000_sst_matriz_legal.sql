-- Matriz legal SST: estado de cumplimiento de cada norma por negocio (sin borrado físico)
CREATE TABLE IF NOT EXISTS public.sst_matriz_legal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  codigo text NOT NULL CHECK (length(trim(codigo)) >= 3 AND length(codigo) <= 80),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','cumple','parcial','no_cumple','no_aplica')),
  responsable text NOT NULL DEFAULT '' CHECK (length(responsable) <= 120),
  evidencia text NOT NULL DEFAULT '' CHECK (length(evidencia) <= 500),
  proxima_revision date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS sst_matriz_legal_unica ON public.sst_matriz_legal (owner_id, codigo);

ALTER TABLE public.sst_matriz_legal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sst_matriz_legal_leer ON public.sst_matriz_legal;
CREATE POLICY sst_matriz_legal_leer ON public.sst_matriz_legal FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS sst_matriz_legal_solo_mi_negocio ON public.sst_matriz_legal;
CREATE POLICY sst_matriz_legal_solo_mi_negocio ON public.sst_matriz_legal AS RESTRICTIVE FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id());
DROP POLICY IF EXISTS sst_matriz_legal_crear ON public.sst_matriz_legal;
CREATE POLICY sst_matriz_legal_crear ON public.sst_matriz_legal FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS sst_matriz_legal_editar ON public.sst_matriz_legal;
CREATE POLICY sst_matriz_legal_editar ON public.sst_matriz_legal FOR UPDATE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
REVOKE ALL ON public.sst_matriz_legal FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.sst_matriz_legal FROM authenticated;
DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.sst_matriz_legal;
CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.sst_matriz_legal
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero();
