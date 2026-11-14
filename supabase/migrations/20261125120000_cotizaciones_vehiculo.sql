-- Cotizaciones de vehículos (contado o crédito) y tasas promedio por mes.
CREATE TABLE IF NOT EXISTS public.cotizaciones_vehiculo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  numero integer NOT NULL DEFAULT 1,
  cliente text NOT NULL,
  telefono text,
  vehiculo_id uuid REFERENCES public.vehiculos_inventario(id) ON DELETE SET NULL,
  vehiculo text NOT NULL,
  condicion text NOT NULL DEFAULT 'usado',
  forma_pago text NOT NULL DEFAULT 'contado',
  precio numeric NOT NULL DEFAULT 0,
  descuento numeric NOT NULL DEFAULT 0,
  cuota_inicial numeric NOT NULL DEFAULT 0,
  monto_financiar numeric NOT NULL DEFAULT 0,
  plazo_meses integer,
  tasa_mensual numeric,
  cuota_mensual numeric,
  total_a_pagar numeric NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'borrador',
  vigente_hasta date,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cotizaciones_vehiculo_owner_idx ON public.cotizaciones_vehiculo (owner_id);

ALTER TABLE public.cotizaciones_vehiculo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cotizaciones_vehiculo_personal" ON public.cotizaciones_vehiculo;
CREATE POLICY "cotizaciones_vehiculo_personal" ON public.cotizaciones_vehiculo
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

CREATE TABLE IF NOT EXISTS public.tasas_vehiculo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  mes text NOT NULL,
  condicion text NOT NULL,
  tasa_mensual numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tasas_vehiculo_owner_idx ON public.tasas_vehiculo (owner_id, mes);

ALTER TABLE public.tasas_vehiculo ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasas_vehiculo_personal" ON public.tasas_vehiculo;
CREATE POLICY "tasas_vehiculo_personal" ON public.tasas_vehiculo
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
