-- Suscripción de cada empresa (plan, estado y vencimiento). Solo el dueño de Gosaryc (superadmin) la modifica.
CREATE TABLE IF NOT EXISTS public.suscripciones_negocio (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'prueba' CHECK (plan IN ('prueba', 'emprendedor', 'pro')),
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'suspendido')),
  vence_el date NOT NULL DEFAULT (current_date + 14),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.suscripciones_negocio ENABLE ROW LEVEL SECURITY;

-- Cada empresa solo puede ver su propia suscripción.
DROP POLICY IF EXISTS "suscripcion_lectura_propia" ON public.suscripciones_negocio;
CREATE POLICY "suscripcion_lectura_propia" ON public.suscripciones_negocio
  FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id());

-- El superadmin ve y modifica todas.
DROP POLICY IF EXISTS "suscripcion_superadmin" ON public.suscripciones_negocio;
CREATE POLICY "suscripcion_superadmin" ON public.suscripciones_negocio
  FOR ALL TO authenticated
  USING (public.es_superadmin())
  WITH CHECK (public.es_superadmin());

-- Toda empresa nueva arranca con 14 días de prueba.
CREATE OR REPLACE FUNCTION public.crear_suscripcion_negocio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.suscripciones_negocio (owner_id) VALUES (NEW.owner_id)
    ON CONFLICT (owner_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crear_suscripcion_negocio ON public.negocio_config;
CREATE TRIGGER trg_crear_suscripcion_negocio
  AFTER INSERT ON public.negocio_config
  FOR EACH ROW EXECUTE FUNCTION public.crear_suscripcion_negocio();

-- Las empresas que ya existen también reciben su suscripción.
INSERT INTO public.suscripciones_negocio (owner_id)
SELECT DISTINCT owner_id FROM public.negocio_config WHERE owner_id IS NOT NULL
ON CONFLICT (owner_id) DO NOTHING;
