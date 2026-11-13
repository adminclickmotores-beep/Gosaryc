-- Caja diaria del restaurante: apertura de caja, ingresos y gastos.

CREATE TABLE public.restaurante_movimientos_caja (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('apertura','ingreso','gasto')),
  concepto text not null,
  monto numeric(12,2) not null default 0 check (monto >= 0),
  created_at timestamptz not null default now()
);

ALTER TABLE public.restaurante_movimientos_caja ENABLE ROW LEVEL SECURITY;

-- Solo el personal con sesión ve y registra movimientos de caja.
CREATE POLICY "caja_gestion_personal" ON public.restaurante_movimientos_caja
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
