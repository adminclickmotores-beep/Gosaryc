-- Centro de Integraciones: credenciales propias (BYOK) por negocio para SIMIT/RUNT y centrales de riesgo.
-- Aisladas por negocio (owner_id = mi_negocio_id()). Sin borrado de datos.

CREATE TABLE IF NOT EXISTS public.integraciones_negocio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT public.mi_negocio_id(),
  proveedor text NOT NULL CHECK (proveedor IN ('simit_runt', 'riesgo')),
  activo boolean NOT NULL DEFAULT false,
  url_api text CHECK (url_api IS NULL OR (length(url_api) <= 500 AND url_api ~ '^https://')),
  token text CHECK (token IS NULL OR length(token) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS integraciones_negocio_uq ON public.integraciones_negocio (owner_id, proveedor);

ALTER TABLE public.integraciones_negocio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS integraciones_negocio_leer ON public.integraciones_negocio;
CREATE POLICY integraciones_negocio_leer ON public.integraciones_negocio FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS integraciones_negocio_crear ON public.integraciones_negocio;
CREATE POLICY integraciones_negocio_crear ON public.integraciones_negocio FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS integraciones_negocio_editar ON public.integraciones_negocio;
CREATE POLICY integraciones_negocio_editar ON public.integraciones_negocio FOR UPDATE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS integraciones_negocio_solo_mi_negocio ON public.integraciones_negocio;
CREATE POLICY integraciones_negocio_solo_mi_negocio ON public.integraciones_negocio AS RESTRICTIVE FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id());

REVOKE ALL ON public.integraciones_negocio FROM anon;
