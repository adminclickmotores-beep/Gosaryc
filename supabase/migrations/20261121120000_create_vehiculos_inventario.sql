-- Inventario de vehículos (carros y motos) con datos completos y fotos, por negocio.
CREATE TABLE IF NOT EXISTS public.vehiculos_inventario (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  tipo text NOT NULL DEFAULT 'carro',
  condicion text NOT NULL DEFAULT 'usado',
  estado text NOT NULL DEFAULT 'disponible',
  marca text NOT NULL,
  modelo text NOT NULL,
  version text,
  anio integer,
  placa text,
  color text,
  kilometraje integer,
  combustible text,
  transmision text,
  cilindraje text,
  carroceria text,
  puertas integer,
  traccion text,
  ciudad_matricula text,
  num_propietarios integer,
  vin text,
  motor_numero text,
  precio numeric NOT NULL DEFAULT 0,
  precio_compra numeric,
  soat_vence date,
  tecnomecanica_vence date,
  equipamiento text,
  observaciones text,
  fotos text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS vehiculos_inventario_owner_idx ON public.vehiculos_inventario (owner_id);

ALTER TABLE public.vehiculos_inventario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vehiculos_inventario_personal" ON public.vehiculos_inventario;
CREATE POLICY "vehiculos_inventario_personal" ON public.vehiculos_inventario
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
