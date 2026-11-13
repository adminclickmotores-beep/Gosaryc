-- Contabilidad: plan de cuentas y libro diario (partida doble), por negocio.
CREATE TABLE IF NOT EXISTS public.cuentas_contables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  codigo text NOT NULL,
  nombre text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('activo', 'pasivo', 'ingreso', 'gasto')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cuentas_contables_owner_idx ON public.cuentas_contables (owner_id);

CREATE TABLE IF NOT EXISTS public.asientos_contables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  asiento_id uuid NOT NULL,
  fecha date NOT NULL DEFAULT current_date,
  cuenta_id uuid NOT NULL REFERENCES public.cuentas_contables(id) ON DELETE RESTRICT,
  concepto text NOT NULL,
  debe numeric NOT NULL DEFAULT 0 CHECK (debe >= 0),
  haber numeric NOT NULL DEFAULT 0 CHECK (haber >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS asientos_contables_owner_fecha_idx ON public.asientos_contables (owner_id, fecha);
CREATE INDEX IF NOT EXISTS asientos_contables_asiento_idx ON public.asientos_contables (asiento_id);

ALTER TABLE public.cuentas_contables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asientos_contables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cuentas_contables_personal" ON public.cuentas_contables;
CREATE POLICY "cuentas_contables_personal" ON public.cuentas_contables
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

DROP POLICY IF EXISTS "asientos_contables_personal" ON public.asientos_contables;
CREATE POLICY "asientos_contables_personal" ON public.asientos_contables
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
