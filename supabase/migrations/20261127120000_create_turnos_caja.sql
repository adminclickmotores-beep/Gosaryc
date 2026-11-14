-- Turnos de caja con movimientos (ventas, ingresos, gastos, retiros), arqueo y cierre.
CREATE TABLE IF NOT EXISTS public.turnos_caja (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  cajero text,
  fondo_inicial numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'abierto',
  abierto_en timestamptz NOT NULL DEFAULT now(),
  cerrado_en timestamptz,
  esperado_efectivo numeric,
  efectivo_contado numeric,
  diferencia numeric,
  notas_cierre text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.movimientos_turno (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  turno_id uuid NOT NULL REFERENCES public.turnos_caja(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  metodo text NOT NULL DEFAULT 'efectivo',
  concepto text NOT NULL,
  categoria text,
  monto numeric NOT NULL,
  anulado boolean NOT NULL DEFAULT false,
  motivo_anulacion text,
  registrado_por text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS turnos_caja_owner_idx ON public.turnos_caja (owner_id, abierto_en DESC);
CREATE INDEX IF NOT EXISTS movimientos_turno_turno_idx ON public.movimientos_turno (turno_id);

ALTER TABLE public.turnos_caja ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_turno ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "turnos_caja_personal" ON public.turnos_caja;
CREATE POLICY "turnos_caja_personal" ON public.turnos_caja
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

DROP POLICY IF EXISTS "movimientos_turno_personal" ON public.movimientos_turno;
CREATE POLICY "movimientos_turno_personal" ON public.movimientos_turno
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
