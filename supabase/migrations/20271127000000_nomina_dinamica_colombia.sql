-- Motor de Nómina Dinámica Colombia: tabla paramétrica por vigencia + empleados + liquidaciones.
-- La paramétrica es GLOBAL (los decretos aplican a todos) y se precarga con valores 2026.
-- Los empleados anclados al SMMLV se actualizan solos vía trigger al entrar una vigencia nueva.

CREATE TABLE IF NOT EXISTS public.parametros_nomina_colombia (
  id uuid primary key default gen_random_uuid(),
  vigencia_desde date not null,
  vigencia_hasta date,
  smmlv numeric not null,
  aux_transporte numeric not null,
  jornada_semanal numeric not null default 42,
  horas_mes numeric not null default 210,
  rec_nocturno numeric not null default 0.35,
  rec_dominical numeric not null default 0.90,
  extra_diurna numeric not null default 0.25,
  extra_nocturna numeric not null default 0.75,
  salud_trab numeric not null default 0.04,
  salud_emp numeric not null default 0.085,
  pension_trab numeric not null default 0.04,
  pension_emp numeric not null default 0.12,
  caja_compensacion numeric not null default 0.04,
  sena numeric not null default 0.02,
  icbf numeric not null default 0.03,
  prov_prima numeric not null default 0.0833,
  prov_cesantias numeric not null default 0.0833,
  prov_intereses numeric not null default 0.12,
  prov_vacaciones numeric not null default 0.0417,
  tope_aux_smmlv numeric not null default 2,
  exoneracion_tope_smmlv numeric not null default 10,
  fuente_legal text,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS parametros_nomina_vigencia_idx
  ON public.parametros_nomina_colombia (vigencia_desde, vigencia_hasta);

ALTER TABLE public.parametros_nomina_colombia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parametros_nomina_lectura" ON public.parametros_nomina_colombia;
CREATE POLICY "parametros_nomina_lectura" ON public.parametros_nomina_colombia
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "parametros_nomina_escritura" ON public.parametros_nomina_colombia;
CREATE POLICY "parametros_nomina_escritura" ON public.parametros_nomina_colombia
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "parametros_nomina_actualiza" ON public.parametros_nomina_colombia;
CREATE POLICY "parametros_nomina_actualiza" ON public.parametros_nomina_colombia
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

REVOKE ALL ON public.parametros_nomina_colombia FROM anon;

-- Precarga oficial 2026 (vigente 1 ene 2026 – 30 jun 2027; recargo dominical 90% Ley 2466).
INSERT INTO public.parametros_nomina_colombia
  (vigencia_desde, vigencia_hasta, smmlv, aux_transporte, jornada_semanal, horas_mes,
   rec_nocturno, rec_dominical, extra_diurna, extra_nocturna, fuente_legal)
VALUES
  ('2026-01-01', '2027-06-30', 1750905, 249095, 42, 210, 0.35, 0.90, 0.25, 0.75,
   'Decreto salario mínimo 2026 y Ley 2466 de 2025 (jornada 42 h, nocturno 7pm-6am 35%, dominical 90%)')
ON CONFLICT DO NOTHING;

-- Vigencia programada jul-2027: mismo salario hasta nuevo decreto, dominical sube a 100%.
INSERT INTO public.parametros_nomina_colombia
  (vigencia_desde, vigencia_hasta, smmlv, aux_transporte, jornada_semanal, horas_mes,
   rec_nocturno, rec_dominical, extra_diurna, extra_nocturna, fuente_legal)
VALUES
  ('2027-07-01', NULL, 1750905, 249095, 42, 210, 0.35, 1.00, 0.25, 0.75,
   'Ley 2466 de 2025 art. programado: dominical/festivo 100% desde julio 2027 (salario sujeto a decreto 2027)')
ON CONFLICT DO NOTHING;

-- Empleados con casilla de anclaje al SMMLV.
CREATE TABLE IF NOT EXISTS public.nomina_empleados (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  tipo_negocio text,
  nombre text not null,
  documento text,
  telefono text,
  cargo text,
  salario_base numeric not null default 0,
  anclado_smmlv boolean not null default false,
  num_smmlv numeric not null default 1,
  tarifa_arl numeric not null default 0.522,
  exonerado boolean not null default true,
  eps text,
  fondo_pension text,
  fecha_ingreso date,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS nomina_empleados_owner_idx ON public.nomina_empleados (owner_id, activo);

ALTER TABLE public.nomina_empleados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nomina_empleados_personal" ON public.nomina_empleados;
CREATE POLICY "nomina_empleados_personal" ON public.nomina_empleados
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('equipo_turnos'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('equipo_turnos'));

DROP POLICY IF EXISTS "nomina_empleados_solo_tipo_actual" ON public.nomina_empleados;
CREATE POLICY "nomina_empleados_solo_tipo_actual" ON public.nomina_empleados
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())
  WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual());

REVOKE ALL ON public.nomina_empleados FROM anon;

-- Liquidaciones guardadas por periodo (histórico por vigencia aplicada).
CREATE TABLE IF NOT EXISTS public.nomina_liquidaciones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  tipo_negocio text,
  empleado_id uuid REFERENCES public.nomina_empleados(id) ON DELETE SET NULL,
  empleado_nombre text not null default '',
  periodo_inicio date not null,
  periodo_fin date not null,
  dias numeric not null default 30,
  salario_base numeric not null default 0,
  auxilio numeric not null default 0,
  extras numeric not null default 0,
  devengado numeric not null default 0,
  descuentos numeric not null default 0,
  neto numeric not null default 0,
  aportes numeric not null default 0,
  provisiones numeric not null default 0,
  costo_total numeric not null default 0,
  detalle jsonb not null default '{}'::jsonb,
  estado text not null default 'liquidada',
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS nomina_liq_owner_idx ON public.nomina_liquidaciones (owner_id, periodo_fin desc);

ALTER TABLE public.nomina_liquidaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nomina_liq_personal" ON public.nomina_liquidaciones;
CREATE POLICY "nomina_liq_personal" ON public.nomina_liquidaciones
  FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('equipo_turnos'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('equipo_turnos'));

DROP POLICY IF EXISTS "nomina_liq_solo_tipo_actual" ON public.nomina_liquidaciones;
CREATE POLICY "nomina_liq_solo_tipo_actual" ON public.nomina_liquidaciones
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())
  WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual());

REVOKE ALL ON public.nomina_liquidaciones FROM anon;

-- Al entrar una vigencia nueva, los anclados se actualizan solos: salario = num_smmlv * SMMLV nuevo.
CREATE OR REPLACE FUNCTION public.nomina_aplicar_vigencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.nomina_empleados
  SET salario_base = ROUND(num_smmlv * NEW.smmlv)
  WHERE anclado_smmlv = true AND activo = true;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS parametros_nomina_aplicar_trg ON public.parametros_nomina_colombia;
CREATE TRIGGER parametros_nomina_aplicar_trg
  AFTER INSERT ON public.parametros_nomina_colombia
  FOR EACH ROW EXECUTE FUNCTION public.nomina_aplicar_vigencia();
