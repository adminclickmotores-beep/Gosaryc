-- Grupo 3: Salud/SST (historia ocupacional, órdenes de examen, facturación consolidada),
-- Veterinaria (más categorías de servicio), Gimnasio (foto del socio), Educación y Guardería
-- (programa, asistencia con horas, reporte diario). Sin borrados de datos.

-- ============================================================
-- 1. Columnas nuevas
-- ============================================================
ALTER TABLE public.gim_socios ADD COLUMN IF NOT EXISTS foto_url text;

ALTER TABLE public.edu_estudiantes ADD COLUMN IF NOT EXISTS programa text;
ALTER TABLE public.edu_estudiantes ADD COLUMN IF NOT EXISTS alergias text;
ALTER TABLE public.edu_estudiantes ADD COLUMN IF NOT EXISTS eps text;

ALTER TABLE public.edu_asistencia ADD COLUMN IF NOT EXISTS hora_entrada text;
ALTER TABLE public.edu_asistencia ADD COLUMN IF NOT EXISTS hora_salida text;
ALTER TABLE public.edu_asistencia ADD COLUMN IF NOT EXISTS recogido_por text;

-- Veterinaria: hospitalización, peluquería y desparasitación como servicios cobrables.
ALTER TABLE public.cl_servicios DROP CONSTRAINT IF EXISTS cl_servicios_categoria_check;
ALTER TABLE public.cl_servicios ADD CONSTRAINT cl_servicios_categoria_check
  CHECK (categoria IN ('consulta', 'cirugia', 'procedimiento', 'vacuna', 'otro', 'hospitalizacion', 'peluqueria', 'desparasitacion'));

-- ============================================================
-- 2. Tablas nuevas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sst_historias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  trabajador_id uuid REFERENCES public.sst_trabajadores(id) ON DELETE SET NULL,
  trabajador text NOT NULL DEFAULT '',
  documento text NOT NULL DEFAULT '',
  empresa text NOT NULL DEFAULT '',
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  tipo_examen text NOT NULL DEFAULT 'Periodico',
  antecedentes_laborales text NOT NULL DEFAULT '',
  antecedentes_personales text NOT NULL DEFAULT '',
  exposicion text NOT NULL DEFAULT '',
  examen_fisico text NOT NULL DEFAULT '',
  paraclinicos text NOT NULL DEFAULT '',
  diagnostico text NOT NULL DEFAULT '',
  recomendaciones text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sst_hist_owner_idx ON public.sst_historias (owner_id, trabajador_id, fecha DESC);

CREATE TABLE IF NOT EXISTS public.sst_ordenes_examen (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  trabajador_id uuid REFERENCES public.sst_trabajadores(id) ON DELETE SET NULL,
  trabajador text NOT NULL DEFAULT '',
  documento text NOT NULL DEFAULT '',
  empresa text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'Periodico',
  examenes text NOT NULL DEFAULT '',
  laboratorio text NOT NULL DEFAULT '',
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  estado text NOT NULL DEFAULT 'emitida' CHECK (estado IN ('emitida', 'realizada')),
  codigo text NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sst_ord_owner_idx ON public.sst_ordenes_examen (owner_id, fecha DESC);

CREATE TABLE IF NOT EXISTS public.edu_reportes_diarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  estudiante_id uuid NOT NULL REFERENCES public.edu_estudiantes(id) ON DELETE RESTRICT,
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  comidas text NOT NULL DEFAULT '',
  siestas text NOT NULL DEFAULT '',
  panales text NOT NULL DEFAULT '',
  estado_animo text NOT NULL DEFAULT '',
  actividad text NOT NULL DEFAULT '',
  mensaje text NOT NULL DEFAULT '',
  profesora text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS edu_rep_est_idx ON public.edu_reportes_diarios (estudiante_id, fecha DESC);

-- ============================================================
-- 3. RLS estricto + sin borrado físico
-- ============================================================
ALTER TABLE public.sst_historias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sst_ordenes_examen ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edu_reportes_diarios ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sst_historias','sst_ordenes_examen', 'edu_reportes_diarios'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_leer', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_leer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_mi_negocio', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id())', t || '_solo_mi_negocio', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_crear', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_crear', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_editar', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal()) WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_editar', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero()', t);
  END LOOP;
END $$;

-- La asistencia diaria necesita poder registrar la hora de salida y quién recogió.
DROP POLICY IF EXISTS edu_asistencia_actualizar_g3 ON public.edu_asistencia;
CREATE POLICY edu_asistencia_actualizar_g3 ON public.edu_asistencia FOR UPDATE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

-- ============================================================
-- 4. Facturación consolidada SST: cobra todo el saldo pendiente de una empresa cliente
--    (exámenes + capacitaciones) en un solo movimiento de Caja y un asiento cuadrado.
-- ============================================================
CREATE OR REPLACE FUNCTION public.sst_facturar_empresa(p_empresa text, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_empresa text := nullif(trim(coalesce(p_empresa, '')), '');
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  v_tipo text := public.tipo_negocio_actual();
  v_eva numeric := 0;
  v_cap numeric := 0;
  v_total numeric;
  v_n_eva integer := 0;
  v_n_cap integer := 0;
  v_turno uuid;
  v_concepto text;
  v_ref uuid := gen_random_uuid();
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Elige la empresa cliente.'; END IF;

  SELECT coalesce(sum(valor - abono), 0), count(*) INTO v_eva, v_n_eva
    FROM public.sst_evaluaciones
   WHERE owner_id = v_owner AND empresa = v_empresa AND estado <> 'cobrada' AND valor > abono;
  SELECT coalesce(sum(valor - abono), 0), count(*) INTO v_cap, v_n_cap
    FROM public.sst_capacitaciones
   WHERE owner_id = v_owner AND empresa = v_empresa AND estado <> 'cobrada' AND valor > abono;
  v_total := v_eva + v_cap;
  IF v_total <= 0 THEN RAISE EXCEPTION 'Esta empresa no tiene saldo pendiente.'; END IF;

  UPDATE public.sst_evaluaciones SET abono = valor, estado = 'cobrada'
   WHERE owner_id = v_owner AND empresa = v_empresa AND estado <> 'cobrada' AND valor > abono;
  UPDATE public.sst_capacitaciones SET abono = valor, estado = 'cobrada'
   WHERE owner_id = v_owner AND empresa = v_empresa AND estado <> 'cobrada' AND valor > abono;

  v_concepto := 'Facturación SST consolidada · ' || v_empresa;
  BEGIN
    PERFORM public.pan_asegurar_cuenta(v_owner, v_tipo, '4135', 'Ventas de servicios', 'ingreso');
    PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo, v_concepto, 'sst_cobro', v_ref,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_total),
                        jsonb_build_object('codigo', '4135', 'haber', v_total)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento SST consolidado %: %', v_empresa, SQLERRM;
  END;

  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, v_tipo, 'ingreso', left(v_concepto || ' (' || v_metodo || ')', 200), v_total);
  PERFORM set_config('gosaryc.pan', 'off', true);

  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'venta',
            CASE WHEN v_metodo = 'efectivo' THEN 'efectivo' WHEN v_metodo = 'tarjeta' THEN 'tarjeta' ELSE 'transferencia' END,
            v_concepto, v_total, coalesce(auth.jwt() ->> 'email', ''));
  END IF;

  RETURN jsonb_build_object('total', v_total, 'examenes', v_n_eva, 'capacitaciones', v_n_cap);
END;
$$;
REVOKE ALL ON FUNCTION public.sst_facturar_empresa(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.sst_facturar_empresa(text, text) TO authenticated;
