-- Batería de riesgo psicosocial y restricciones laborales (SST). Sin borrado físico.
CREATE TABLE IF NOT EXISTS public.sst_psicosocial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  empresa text NOT NULL DEFAULT '' CHECK (length(empresa) <= 160),
  trabajador text NOT NULL DEFAULT '' CHECK (length(trabajador) <= 160),
  cargo text NOT NULL DEFAULT '' CHECK (length(cargo) <= 120),
  aplicacion text NOT NULL DEFAULT 'interna' CHECK (aplicacion IN ('interna','externa')),
  evaluador text NOT NULL DEFAULT '' CHECK (length(evaluador) <= 160),
  forma text NOT NULL DEFAULT 'A' CHECK (forma IN ('A','B')),
  fecha date NOT NULL DEFAULT current_date,
  liderazgo numeric NOT NULL DEFAULT 0 CHECK (liderazgo BETWEEN 0 AND 100),
  control numeric NOT NULL DEFAULT 0 CHECK (control BETWEEN 0 AND 100),
  demandas numeric NOT NULL DEFAULT 0 CHECK (demandas BETWEEN 0 AND 100),
  recompensas numeric NOT NULL DEFAULT 0 CHECK (recompensas BETWEEN 0 AND 100),
  extralaboral numeric NOT NULL DEFAULT 0 CHECK (extralaboral BETWEEN 0 AND 100),
  estres numeric NOT NULL DEFAULT 0 CHECK (estres BETWEEN 0 AND 100),
  nivel_intralaboral text NOT NULL DEFAULT 'sin_riesgo' CHECK (length(nivel_intralaboral) <= 20),
  nivel_extralaboral text NOT NULL DEFAULT 'sin_riesgo' CHECK (length(nivel_extralaboral) <= 20),
  nivel_estres text NOT NULL DEFAULT 'sin_riesgo' CHECK (length(nivel_estres) <= 20),
  nivel_global text NOT NULL DEFAULT 'sin_riesgo' CHECK (length(nivel_global) <= 20),
  plan text NOT NULL DEFAULT '' CHECK (length(plan) <= 3000),
  estado text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto','en_intervencion','cerrado')),
  seguimiento date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.sst_restricciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  evaluacion_id uuid,
  empresa text NOT NULL DEFAULT '' CHECK (length(empresa) <= 160),
  trabajador text NOT NULL DEFAULT '' CHECK (length(trabajador) <= 160),
  cargo text NOT NULL DEFAULT '' CHECK (length(cargo) <= 120),
  categoria text NOT NULL DEFAULT 'Otra' CHECK (length(categoria) <= 60),
  descripcion text NOT NULL DEFAULT '' CHECK (length(descripcion) <= 1000),
  duracion text NOT NULL DEFAULT 'temporal' CHECK (duracion IN ('temporal','permanente')),
  concepto text NOT NULL DEFAULT 'Apto con restricciones' CHECK (length(concepto) <= 40),
  vence date,
  seguimiento date,
  estado text NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente','cumplida','cerrada')),
  plan text NOT NULL DEFAULT '' CHECK (length(plan) <= 3000),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sst_psicosocial ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sst_restricciones ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sst_psicosocial','sst_restricciones'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_leer', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_leer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_mi_negocio', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id())', t || '_solo_mi_negocio', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_crear', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_crear', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_editar', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal()) WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_editar', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM authenticated', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero()', t);
  END LOOP;
END $$;
