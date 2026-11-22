-- Radar de Licitaciones SECOP II: perfil de búsqueda y oportunidades por negocio (RLS por owner_id = mi_negocio_id()).
-- No borra ni trunca datos. Sin borrado físico: las oportunidades se descartan cambiando su estado.

ALTER TABLE public.negocio_config
  ADD COLUMN IF NOT EXISTS secop_activo boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS public.secop_perfiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT public.mi_negocio_id(),
  activo boolean NOT NULL DEFAULT true,
  palabras_clave text[] NOT NULL DEFAULT '{}',
  codigos_unspsc text[] NOT NULL DEFAULT '{}',
  departamentos text[] NOT NULL DEFAULT ARRAY['Valle del Cauca']::text[],
  cuantia_minima numeric NOT NULL DEFAULT 0 CHECK (cuantia_minima >= 0),
  notificar_whatsapp boolean NOT NULL DEFAULT true,
  ultima_consulta timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS secop_perfiles_owner_uq ON public.secop_perfiles (owner_id);

CREATE TABLE IF NOT EXISTS public.secop_oportunidades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT public.mi_negocio_id(),
  proceso_id text NOT NULL CHECK (length(proceso_id) BETWEEN 1 AND 80),
  referencia text CHECK (referencia IS NULL OR length(referencia) <= 200),
  entidad text CHECK (entidad IS NULL OR length(entidad) <= 300),
  objeto text CHECK (objeto IS NULL OR length(objeto) <= 3000),
  modalidad text CHECK (modalidad IS NULL OR length(modalidad) <= 200),
  cuantia numeric NOT NULL DEFAULT 0,
  departamento text CHECK (departamento IS NULL OR length(departamento) <= 120),
  fecha_publicacion timestamptz,
  fecha_cierre timestamptz,
  url_proceso text CHECK (url_proceso IS NULL OR length(url_proceso) <= 1000),
  estado_interno text NOT NULL DEFAULT 'Nueva'
    CHECK (estado_interno IN ('Nueva', 'En estudio', 'Propuesta enviada', 'Adjudicada', 'Descartada')),
  checklist_ia jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS secop_oportunidades_proceso_uq ON public.secop_oportunidades (owner_id, proceso_id);
CREATE INDEX IF NOT EXISTS secop_oportunidades_estado_idx ON public.secop_oportunidades (owner_id, estado_interno, fecha_cierre);

ALTER TABLE public.secop_perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secop_oportunidades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS secop_perfiles_leer ON public.secop_perfiles;
CREATE POLICY secop_perfiles_leer ON public.secop_perfiles FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS secop_perfiles_crear ON public.secop_perfiles;
CREATE POLICY secop_perfiles_crear ON public.secop_perfiles FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS secop_perfiles_editar ON public.secop_perfiles;
CREATE POLICY secop_perfiles_editar ON public.secop_perfiles FOR UPDATE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS secop_perfiles_solo_mi_negocio ON public.secop_perfiles;
CREATE POLICY secop_perfiles_solo_mi_negocio ON public.secop_perfiles AS RESTRICTIVE FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id());

DROP POLICY IF EXISTS secop_oportunidades_leer ON public.secop_oportunidades;
CREATE POLICY secop_oportunidades_leer ON public.secop_oportunidades FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS secop_oportunidades_crear ON public.secop_oportunidades;
CREATE POLICY secop_oportunidades_crear ON public.secop_oportunidades FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS secop_oportunidades_editar ON public.secop_oportunidades;
CREATE POLICY secop_oportunidades_editar ON public.secop_oportunidades FOR UPDATE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS secop_oportunidades_solo_mi_negocio ON public.secop_oportunidades;
CREATE POLICY secop_oportunidades_solo_mi_negocio ON public.secop_oportunidades AS RESTRICTIVE FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id());

REVOKE ALL ON public.secop_perfiles FROM anon;
REVOKE ALL ON public.secop_oportunidades FROM anon;
REVOKE DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.secop_perfiles FROM authenticated;
REVOKE DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.secop_oportunidades FROM authenticated;
