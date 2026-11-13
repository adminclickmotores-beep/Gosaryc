-- Mesas del restaurante: número, capacidad y estado de cada mesa.

CREATE TABLE public.restaurante_mesas (
  id uuid primary key default gen_random_uuid(),
  numero text not null,
  capacidad integer not null default 4 check (capacidad > 0),
  estado text not null default 'libre' check (estado in ('libre','ocupada','reservada','por_cobrar')),
  created_at timestamptz not null default now()
);

ALTER TABLE public.restaurante_mesas ENABLE ROW LEVEL SECURITY;

-- Solo el personal con sesión ve y administra las mesas.
CREATE POLICY "mesas_gestion_personal" ON public.restaurante_mesas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
