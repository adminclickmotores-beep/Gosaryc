-- Diagnósticos del Asesor IA de Negocios: una fila por negocio (1:1 con negocio_config).
CREATE TABLE IF NOT EXISTS public.asesor_ia_diagnosticos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL UNIQUE REFERENCES public.negocio_config(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  diagnostico jsonb NOT NULL DEFAULT '{}'::jsonb,
  creado_en timestamptz NOT NULL DEFAULT now(),
  actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS asesor_ia_diagnosticos_owner_idx ON public.asesor_ia_diagnosticos (owner_id);

ALTER TABLE public.asesor_ia_diagnosticos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS asesor_ia_diagnosticos_leer ON public.asesor_ia_diagnosticos;
CREATE POLICY asesor_ia_diagnosticos_leer ON public.asesor_ia_diagnosticos
  FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() OR public.es_superadmin());

DROP POLICY IF EXISTS asesor_ia_diagnosticos_crear ON public.asesor_ia_diagnosticos;
CREATE POLICY asesor_ia_diagnosticos_crear ON public.asesor_ia_diagnosticos
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() OR public.es_superadmin());

DROP POLICY IF EXISTS asesor_ia_diagnosticos_editar ON public.asesor_ia_diagnosticos;
CREATE POLICY asesor_ia_diagnosticos_editar ON public.asesor_ia_diagnosticos
  FOR UPDATE TO authenticated
  USING (owner_id = public.mi_negocio_id() OR public.es_superadmin())
  WITH CHECK (owner_id = public.mi_negocio_id() OR public.es_superadmin());
