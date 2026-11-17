-- MÓDULO SALUD OCUPACIONAL Y SG-SST 4.0 (Colombia 2026).
-- Medicina laboral, profesiograma/IPVR GTC 45, estándares Resolución 0312,
-- SVE y ausentismo, capacitaciones y normativa auto-actualizable.
-- Aislado por owner_id = mi_negocio_id(), RLS estricto, sin borrado físico.
-- Sin DROP/TRUNCATE/DELETE.

-- 1. Empresas cliente con convenio
CREATE TABLE IF NOT EXISTS public.sst_empresas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  nit text,
  contacto text,
  telefono text,
  n_trabajadores int NOT NULL DEFAULT 0 CHECK (n_trabajadores >= 0),
  riesgo text NOT NULL DEFAULT 'I' CHECK (riesgo IN ('I','II','III','IV','V')),
  estado text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa','inactiva')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sst_emp_owner_idx ON public.sst_empresas (owner_id, estado);

-- 2. Trabajadores de las empresas cliente
CREATE TABLE IF NOT EXISTS public.sst_trabajadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  empresa_id uuid REFERENCES public.sst_empresas(id) ON DELETE SET NULL,
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  documento text NOT NULL DEFAULT '',
  cargo text NOT NULL DEFAULT '',
  telefono text,
  examen_vence date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sst_trab_owner_idx ON public.sst_trabajadores (owner_id, examen_vence);

-- 3. Evaluaciones médicas y certificado de aptitud (sin historia clínica reservada)
CREATE TABLE IF NOT EXISTS public.sst_evaluaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  trabajador_id uuid REFERENCES public.sst_trabajadores(id) ON DELETE SET NULL,
  empresa text NOT NULL DEFAULT '',
  trabajador text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'Periodico' CHECK (tipo IN ('Ingreso','Periodico','Egreso','Post-Incapacidad','Alturas','Espacios Confinados')),
  concepto text NOT NULL DEFAULT 'Apto' CHECK (concepto IN ('Apto','Apto con restricciones','No apto','Aplazado')),
  restricciones text NOT NULL DEFAULT '',
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  vence date,
  codigo_seguro text NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  valor numeric NOT NULL DEFAULT 0 CHECK (valor >= 0),
  abono numeric NOT NULL DEFAULT 0 CHECK (abono >= 0),
  estado text NOT NULL DEFAULT 'registrada' CHECK (estado IN ('registrada','cobrada')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sst_eva_owner_idx ON public.sst_evaluaciones (owner_id, vence);
CREATE INDEX IF NOT EXISTS sst_eva_cod_idx ON public.sst_evaluaciones (codigo_seguro);

-- 4. Profesiograma y matriz de peligros IPVR (GTC 45)
CREATE TABLE IF NOT EXISTS public.sst_profesiogramas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  empresa text NOT NULL DEFAULT '',
  cargo text NOT NULL DEFAULT '',
  peligros text NOT NULL DEFAULT '',
  controles text NOT NULL DEFAULT '',
  epp text NOT NULL DEFAULT '',
  periodicidad_meses int NOT NULL DEFAULT 12 CHECK (periodicidad_meses >= 1),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sst_prof_owner_idx ON public.sst_profesiogramas (owner_id);

-- 5. Estándares mínimos Resolución 0312 + plan anual + comités + ATEL
CREATE TABLE IF NOT EXISTS public.sst_estandares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  empresa text NOT NULL DEFAULT '',
  tamano text NOT NULL DEFAULT '11-50' CHECK (tamano IN ('1-10','11-50','mas-50')),
  riesgo text NOT NULL DEFAULT 'I-III' CHECK (riesgo IN ('I-III','IV-V')),
  total_aplica int NOT NULL DEFAULT 21,
  cumple int NOT NULL DEFAULT 0 CHECK (cumple >= 0),
  plan_anual text NOT NULL DEFAULT '',
  copasst text NOT NULL DEFAULT '',
  convivencia text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.sst_atel (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  empresa text NOT NULL DEFAULT '',
  trabajador text NOT NULL DEFAULT '',
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  tipo text NOT NULL DEFAULT 'Accidente' CHECK (tipo IN ('Accidente','Incidente','Enfermedad laboral')),
  descripcion text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto','investigacion','cerrado')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. SVE y ausentismo (incapacidades)
CREATE TABLE IF NOT EXISTS public.sst_ausentismo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  trabajador text NOT NULL DEFAULT '',
  empresa text NOT NULL DEFAULT '',
  programa text NOT NULL DEFAULT 'Osteomuscular' CHECK (programa IN ('Psicosocial','Osteomuscular','Auditivo','Respiratorio','Cardiovascular','Otro')),
  dias int NOT NULL DEFAULT 1 CHECK (dias >= 0),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. Capacitaciones y asistencia
CREATE TABLE IF NOT EXISTS public.sst_capacitaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  tema text NOT NULL CHECK (length(trim(tema)) >= 3),
  empresa text NOT NULL DEFAULT '',
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  valor numeric NOT NULL DEFAULT 0 CHECK (valor >= 0),
  abono numeric NOT NULL DEFAULT 0 CHECK (abono >= 0),
  estado text NOT NULL DEFAULT 'programada' CHECK (estado IN ('programada','realizada','cobrada')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.sst_asistencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  capacitacion_id uuid REFERENCES public.sst_capacitaciones(id) ON DELETE CASCADE,
  nombre text NOT NULL DEFAULT '',
  documento text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. Novedades normativas SST (las llena el botón IA / Superadmin)
CREATE TABLE IF NOT EXISTS public.sst_novedades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  resumen text NOT NULL DEFAULT '',
  fuente text NOT NULL DEFAULT '',
  vigencia_desde date,
  aplicada boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS estricto + sin borrado físico
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['sst_empresas','sst_trabajadores','sst_evaluaciones','sst_profesiogramas','sst_estandares','sst_atel','sst_ausentismo','sst_capacitaciones','sst_asistencias'] LOOP
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
  ALTER TABLE public.sst_novedades ENABLE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS sst_novedades_leer ON public.sst_novedades;
  CREATE POLICY sst_novedades_leer ON public.sst_novedades FOR SELECT TO authenticated USING (true);
  REVOKE ALL ON public.sst_novedades FROM anon;
END $$;

-- Cobro único SST (evaluaciones y capacitaciones entran a Caja y Contabilidad)
CREATE OR REPLACE FUNCTION public.sst_cobrar(p_tabla text, p_id uuid, p_valor numeric, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_col text := CASE p_tabla WHEN 'sst_evaluaciones' THEN 'valor' WHEN 'sst_capacitaciones' THEN 'valor' ELSE NULL END;
  v_etiqueta text := CASE p_tabla WHEN 'sst_evaluaciones' THEN 'Examen ocupacional' WHEN 'sst_capacitaciones' THEN 'Capacitación SST' ELSE 'Cobro SST' END;
  v_row_owner uuid;
  v_tipo text;
  v_total numeric;
  v_abono numeric;
  v_cliente text;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  v_turno uuid;
  v_nuevo numeric;
  v_concepto text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF v_col IS NULL THEN RAISE EXCEPTION 'Módulo no válido.'; END IF;
  IF p_valor IS NULL OR p_valor <= 0 THEN RAISE EXCEPTION 'El abono debe ser mayor a cero.'; END IF;
  IF p_tabla = 'sst_evaluaciones' THEN
    EXECUTE 'SELECT owner_id, tipo_negocio, valor, abono, trabajador FROM public.sst_evaluaciones WHERE id = $1 FOR UPDATE'
      USING p_id INTO v_row_owner, v_tipo, v_total, v_abono, v_cliente;
  ELSE
    EXECUTE 'SELECT owner_id, tipo_negocio, valor, abono, tema FROM public.sst_capacitaciones WHERE id = $1 FOR UPDATE'
      USING p_id INTO v_row_owner, v_tipo, v_total, v_abono, v_cliente;
  END IF;
  IF v_row_owner IS NULL THEN RAISE EXCEPTION 'El registro ya no existe.'; END IF;
  IF v_row_owner IS DISTINCT FROM v_owner THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF v_abono + p_valor > v_total THEN RAISE EXCEPTION 'El abono supera el total.'; END IF;
  v_nuevo := v_abono + p_valor;
  IF p_tabla = 'sst_evaluaciones' THEN
    UPDATE public.sst_evaluaciones SET abono = v_nuevo, estado = CASE WHEN v_nuevo >= v_total THEN 'cobrada' ELSE estado END WHERE id = p_id;
  ELSE
    UPDATE public.sst_capacitaciones SET abono = v_nuevo, estado = CASE WHEN v_nuevo >= v_total THEN 'cobrada' ELSE estado END WHERE id = p_id;
  END IF;
  v_concepto := v_etiqueta || ' · ' || coalesce(v_cliente, '');
  BEGIN
    PERFORM public.pan_asegurar_cuenta(v_owner, v_tipo, '4135', 'Ventas de servicios', 'ingreso');
    PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo, v_concepto, 'sst_cobro', p_id,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', p_valor),
                        jsonb_build_object('codigo', '4135', 'haber', p_valor)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento SST %: %', p_id, SQLERRM;
  END;
  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (v_owner, v_tipo, 'ingreso', left(v_concepto || ' (' || v_metodo || ')', 200), p_valor);
  PERFORM set_config('gosaryc.pan', 'off', true);
  SELECT id INTO v_turno FROM public.turnos_caja
   WHERE owner_id = v_owner AND estado = 'abierto' ORDER BY abierto_en DESC LIMIT 1;
  IF v_turno IS NOT NULL THEN
    INSERT INTO public.movimientos_turno (owner_id, turno_id, tipo, metodo, concepto, monto, registrado_por)
    VALUES (v_owner, v_turno, 'venta',
            CASE WHEN v_metodo = 'efectivo' THEN 'efectivo' WHEN v_metodo = 'tarjeta' THEN 'tarjeta' ELSE 'transferencia' END,
            v_concepto, p_valor, coalesce(auth.jwt() ->> 'email', ''));
  END IF;
  RETURN jsonb_build_object('abonado', v_nuevo, 'total', v_total);
END;
$$;
REVOKE ALL ON FUNCTION public.sst_cobrar(text, uuid, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.sst_cobrar(text, uuid, numeric, text) TO authenticated;
