-- Registros genéricos de los módulos del negocio (fiados, apartados, citas, trámites, etc.)
CREATE TABLE public.modulo_registros (
  id uuid primary key default gen_random_uuid(),
  modulo text not null,
  titulo text not null,
  detalle text,
  contacto text,
  telefono text,
  monto numeric not null default 0,
  estado text not null default 'pendiente',
  fecha date,
  created_at timestamptz not null default now()
);

CREATE INDEX modulo_registros_modulo_idx ON public.modulo_registros (modulo, created_at desc);

ALTER TABLE public.modulo_registros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "modulo_registros_gestion_personal" ON public.modulo_registros
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
