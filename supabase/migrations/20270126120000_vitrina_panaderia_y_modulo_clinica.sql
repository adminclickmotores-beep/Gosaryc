-- 1) PANADERÍA: stock de producto terminado en vitrina
-- 2) VETERINARIA / CONSULTORIO / ODONTOLOGÍA: pacientes, historias clínicas, carnet, agenda, cobros y honorarios
-- Todo con owner_id = mi_negocio_id() y RLS estricto. No borra ni trunca datos.

-- ============================================================
-- 1. Vitrina de panadería
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pan_recetas' AND column_name = 'stock_vitrina') THEN
    ALTER TABLE public.pan_recetas ADD COLUMN stock_vitrina numeric NOT NULL DEFAULT 0 CHECK (stock_vitrina >= 0);
    -- Arranque: lo horneado menos las mermas de producto terminado ya registradas.
    UPDATE public.pan_recetas r SET stock_vitrina = greatest(0,
      coalesce((SELECT sum(p.unidades) FROM public.pan_producciones p WHERE p.receta_id = r.id AND NOT p.anulado), 0)
      - coalesce((SELECT sum(m.cantidad) FROM public.pan_mermas m WHERE m.receta_id = r.id AND m.clase = 'producto' AND NOT m.anulado), 0));
  END IF;
END $$;

-- El stock de vitrina solo cambia con horneadas, ventas del POS y mermas.
CREATE OR REPLACE FUNCTION public.pan_proteger_vitrina()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR coalesce(current_setting('gosaryc.pan_fn', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.stock_vitrina IS DISTINCT FROM OLD.stock_vitrina THEN
    RAISE EXCEPTION 'El stock de vitrina cambia con las horneadas, las ventas y las mermas.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_pan_proteger_vitrina ON public.pan_recetas;
CREATE TRIGGER trg_pan_proteger_vitrina BEFORE UPDATE ON public.pan_recetas
  FOR EACH ROW EXECUTE FUNCTION public.pan_proteger_vitrina();

-- Cada producto vendido (mismo nombre que la receta) baja de la vitrina, sin dejarla en negativo.
CREATE OR REPLACE FUNCTION public.pan_descontar_vitrina_item()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
BEGIN
  BEGIN
    SELECT owner_id INTO v_owner FROM public.restaurante_pedidos WHERE id = NEW.pedido_id;
    IF v_owner IS NOT NULL AND coalesce(NEW.cantidad, 0) > 0 THEN
      PERFORM set_config('gosaryc.pan_fn', 'on', true);
      UPDATE public.pan_recetas
         SET stock_vitrina = greatest(stock_vitrina - NEW.cantidad, 0)
       WHERE owner_id = v_owner AND activo AND lower(trim(nombre)) = lower(trim(NEW.nombre));
      PERFORM set_config('gosaryc.pan_fn', 'off', true);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo descontar la vitrina: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_pan_descontar_vitrina ON public.restaurante_pedido_items;
CREATE TRIGGER trg_pan_descontar_vitrina AFTER INSERT ON public.restaurante_pedido_items
  FOR EACH ROW EXECUTE FUNCTION public.pan_descontar_vitrina_item();

CREATE OR REPLACE FUNCTION public.pan_registrar_horneada(
  p_receta uuid, p_lotes numeric, p_horneado_por text, p_notas text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  r record;
  it record;
  v_need numeric;
  v_unit numeric;
  v_costo numeric := 0;
  v_unidades numeric;
  v_id uuid;
  v_items int := 0;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_lotes IS NULL OR p_lotes <= 0 THEN RAISE EXCEPTION 'Los lotes deben ser mayores a cero.'; END IF;

  SELECT * INTO r FROM public.pan_recetas WHERE id = p_receta AND owner_id = v_owner AND activo;
  IF NOT FOUND THEN RAISE EXCEPTION 'Receta no encontrada.'; END IF;

  FOR it IN
    SELECT ri.insumo_id, ri.cantidad, i.nombre, i.stock
      FROM public.pan_receta_items ri
      JOIN public.restaurante_insumos i ON i.id = ri.insumo_id AND i.owner_id = v_owner
     WHERE ri.receta_id = r.id AND ri.owner_id = v_owner
  LOOP
    v_items := v_items + 1;
    IF it.stock < it.cantidad * p_lotes THEN
      RAISE EXCEPTION 'No hay suficiente % (faltan %).', it.nombre, round((it.cantidad * p_lotes) - it.stock, 2);
    END IF;
  END LOOP;
  IF v_items = 0 THEN RAISE EXCEPTION 'La receta no tiene ingredientes.'; END IF;

  v_unidades := r.unidades_por_lote * p_lotes;
  v_id := gen_random_uuid();

  FOR it IN
    SELECT ri.insumo_id, ri.cantidad, i.stock, i.precio_compra, i.cantidad_compra
      FROM public.pan_receta_items ri
      JOIN public.restaurante_insumos i ON i.id = ri.insumo_id AND i.owner_id = v_owner
     WHERE ri.receta_id = r.id AND ri.owner_id = v_owner
  LOOP
    v_need := it.cantidad * p_lotes;
    v_unit := it.precio_compra / greatest(it.cantidad_compra, 0.000001);
    v_costo := v_costo + v_need * v_unit;
    UPDATE public.restaurante_insumos SET stock = it.stock - v_need WHERE id = it.insumo_id;
    INSERT INTO public.restaurante_kardex (owner_id, insumo_id, tipo, cantidad, stock_resultante, motivo)
    VALUES (v_owner, it.insumo_id, 'produccion', -v_need, it.stock - v_need,
            'Horneada: ' || r.nombre || ' x ' || p_lotes || ' lote(s)');
    BEGIN
      PERFORM public.quitar_stock_bodegas(it.insumo_id, v_need);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  INSERT INTO public.pan_producciones (id, owner_id, tipo_negocio, receta_id, nombre, lotes, unidades, costo_total, costo_unitario, horneado_por, notas)
  VALUES (v_id, v_owner, v_tipo, r.id, r.nombre, p_lotes, v_unidades, round(v_costo, 2),
          round(v_costo / greatest(v_unidades, 0.000001), 4),
          nullif(trim(coalesce(p_horneado_por, '')), ''), nullif(trim(coalesce(p_notas, '')), ''));

  -- Lo horneado entra al stock de producto terminado en vitrina.
  PERFORM set_config('gosaryc.pan_fn', 'on', true);
  UPDATE public.pan_recetas SET stock_vitrina = stock_vitrina + v_unidades WHERE id = r.id;
  PERFORM set_config('gosaryc.pan_fn', 'off', true);
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.pan_registrar_horneada(uuid, numeric, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pan_registrar_horneada(uuid, numeric, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.pan_registrar_merma(
  p_clase text, p_receta uuid, p_insumo uuid, p_cantidad numeric, p_causa text, p_motivo text, p_registrado_por text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
  v_causa text := nullif(trim(coalesce(p_causa, '')), '');
  v_nombre text;
  v_costo numeric := 0;
  v_id uuid := gen_random_uuid();
  i record;
  r record;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor a cero.'; END IF;
  IF v_motivo IS NULL OR length(v_motivo) < 3 THEN RAISE EXCEPTION 'El motivo es obligatorio.'; END IF;
  IF v_causa IS NULL THEN RAISE EXCEPTION 'Elige la causa de la merma.'; END IF;

  IF p_clase = 'insumo' THEN
    SELECT * INTO i FROM public.restaurante_insumos WHERE id = p_insumo AND owner_id = v_owner;
    IF NOT FOUND THEN RAISE EXCEPTION 'Materia prima no encontrada.'; END IF;
    IF p_cantidad > greatest(i.stock, 0) THEN RAISE EXCEPTION 'No hay tanto stock de % para dar de baja.', i.nombre; END IF;
    v_nombre := i.nombre;
    v_costo := p_cantidad * (i.precio_compra / greatest(i.cantidad_compra, 0.000001));
    UPDATE public.restaurante_insumos SET stock = i.stock - p_cantidad WHERE id = i.id;
    INSERT INTO public.restaurante_kardex (owner_id, insumo_id, tipo, cantidad, stock_resultante, motivo)
    VALUES (v_owner, i.id, 'merma', -p_cantidad, i.stock - p_cantidad, 'Merma (' || v_causa || '): ' || v_motivo);
    BEGIN
      PERFORM public.quitar_stock_bodegas(i.id, p_cantidad);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  ELSIF p_clase = 'producto' THEN
    SELECT * INTO r FROM public.pan_recetas WHERE id = p_receta AND owner_id = v_owner FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Producto no encontrado.'; END IF;
    IF p_cantidad > r.stock_vitrina THEN
      RAISE EXCEPTION 'En vitrina solo hay % de % para dar de baja.', r.stock_vitrina, r.nombre;
    END IF;
    v_nombre := r.nombre;
    SELECT costo_unitario INTO v_costo FROM public.pan_producciones
     WHERE receta_id = r.id AND owner_id = v_owner AND NOT anulado ORDER BY created_at DESC LIMIT 1;
    IF v_costo IS NULL THEN
      SELECT coalesce(sum(ri.cantidad * (i2.precio_compra / greatest(i2.cantidad_compra, 0.000001))), 0) / greatest(r.unidades_por_lote, 0.000001)
        INTO v_costo
        FROM public.pan_receta_items ri JOIN public.restaurante_insumos i2 ON i2.id = ri.insumo_id
       WHERE ri.receta_id = r.id AND ri.owner_id = v_owner;
    END IF;
    v_costo := coalesce(v_costo, 0) * p_cantidad;
    PERFORM set_config('gosaryc.pan_fn', 'on', true);
    UPDATE public.pan_recetas SET stock_vitrina = r.stock_vitrina - p_cantidad WHERE id = r.id;
    PERFORM set_config('gosaryc.pan_fn', 'off', true);
  ELSE
    RAISE EXCEPTION 'Clase de merma no válida.';
  END IF;

  INSERT INTO public.pan_mermas (id, owner_id, tipo_negocio, clase, receta_id, insumo_id, nombre, cantidad, costo_total, causa, motivo, registrado_por)
  VALUES (v_id, v_owner, v_tipo, p_clase, CASE WHEN p_clase = 'producto' THEN p_receta END, CASE WHEN p_clase = 'insumo' THEN p_insumo END,
          v_nombre, p_cantidad, round(v_costo, 2), v_causa, v_motivo, nullif(trim(coalesce(p_registrado_por, '')), ''));

  IF v_costo > 0 THEN
    PERFORM public.pan_asegurar_cuenta(v_owner, v_tipo, '5199', 'Mermas y desperdicios', 'gasto');
    PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo, 'Merma: ' || v_nombre || ' (' || v_causa || ')', 'pan_merma', v_id,
      jsonb_build_array(jsonb_build_object('codigo', '5199', 'debe', round(v_costo, 2)),
                        jsonb_build_object('codigo', '1435', 'haber', round(v_costo, 2))));
  END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.pan_registrar_merma(text, uuid, uuid, numeric, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pan_registrar_merma(text, uuid, uuid, numeric, text, text, text) TO authenticated;

-- ============================================================
-- 2. Clínica: tablas propias
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cl_pacientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL,
  especie text,
  raza text,
  sexo text,
  fecha_nacimiento date,
  peso_kg numeric CHECK (peso_kg IS NULL OR peso_kg >= 0),
  alergias text,
  foto_path text,
  duenio_nombre text NOT NULL,
  duenio_documento text,
  duenio_telefono text,
  duenio_correo text,
  notas text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cl_historias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  paciente_id uuid NOT NULL REFERENCES public.cl_pacientes(id) ON DELETE RESTRICT,
  profesional text,
  motivo text NOT NULL,
  peso_kg numeric,
  temperatura numeric,
  frecuencia_cardiaca numeric,
  frecuencia_respiratoria numeric,
  presion text,
  otros_signos text,
  diagnostico text NOT NULL,
  tratamiento text,
  formula jsonb NOT NULL DEFAULT '[]'::jsonb,
  adjuntos text[] NOT NULL DEFAULT '{}',
  control_en date,
  control_motivo text,
  creado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cl_notas_aclaratorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  paciente_id uuid NOT NULL REFERENCES public.cl_pacientes(id) ON DELETE RESTRICT,
  historia_id uuid NOT NULL REFERENCES public.cl_historias(id) ON DELETE RESTRICT,
  nota text NOT NULL CHECK (length(trim(nota)) >= 3),
  autor text,
  creado_por uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cl_vacunas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  paciente_id uuid NOT NULL REFERENCES public.cl_pacientes(id) ON DELETE RESTRICT,
  tipo text NOT NULL DEFAULT 'vacuna' CHECK (tipo IN ('vacuna', 'desparasitacion', 'otro')),
  nombre text NOT NULL,
  aplicada_en date NOT NULL DEFAULT current_date,
  proxima_en date,
  lote text,
  aplicado_por text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cl_servicios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL,
  categoria text NOT NULL DEFAULT 'consulta' CHECK (categoria IN ('consulta', 'cirugia', 'procedimiento', 'vacuna', 'otro')),
  precio numeric NOT NULL DEFAULT 0 CHECK (precio >= 0),
  comision_pct numeric NOT NULL DEFAULT 0 CHECK (comision_pct >= 0 AND comision_pct <= 100),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cl_insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL,
  unidad text NOT NULL DEFAULT 'und',
  stock numeric NOT NULL DEFAULT 0 CHECK (stock >= 0),
  minimo numeric NOT NULL DEFAULT 0 CHECK (minimo >= 0),
  precio_venta numeric NOT NULL DEFAULT 0 CHECK (precio_venta >= 0),
  vence_en date,
  lote text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cl_citas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  paciente_id uuid NOT NULL REFERENCES public.cl_pacientes(id) ON DELETE RESTRICT,
  profesional text NOT NULL,
  consultorio text,
  inicio timestamptz NOT NULL,
  duracion_min integer NOT NULL DEFAULT 30 CHECK (duracion_min > 0),
  motivo text,
  estado text NOT NULL DEFAULT 'agendada' CHECK (estado IN ('agendada', 'en_consulta', 'atendida', 'no_asistio', 'cancelada')),
  cobro_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cl_cobros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cita_id uuid REFERENCES public.cl_citas(id) ON DELETE RESTRICT,
  paciente_id uuid NOT NULL REFERENCES public.cl_pacientes(id) ON DELETE RESTRICT,
  profesional text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  comision_total numeric NOT NULL DEFAULT 0 CHECK (comision_total >= 0),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'cobrado')),
  metodo text,
  cobrado_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cl_comisiones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cobro_id uuid NOT NULL REFERENCES public.cl_cobros(id) ON DELETE RESTRICT,
  profesional text NOT NULL,
  concepto text NOT NULL,
  categoria text NOT NULL DEFAULT 'consulta',
  base numeric NOT NULL DEFAULT 0,
  porcentaje numeric NOT NULL DEFAULT 0,
  valor numeric NOT NULL DEFAULT 0 CHECK (valor >= 0),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'liquidada')),
  fecha date NOT NULL DEFAULT current_date,
  liquidada_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cl_pacientes_owner_idx ON public.cl_pacientes (owner_id, nombre);
CREATE INDEX IF NOT EXISTS cl_historias_paciente_idx ON public.cl_historias (paciente_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cl_vacunas_paciente_idx ON public.cl_vacunas (paciente_id, aplicada_en DESC);
CREATE INDEX IF NOT EXISTS cl_citas_owner_idx ON public.cl_citas (owner_id, inicio);
CREATE UNIQUE INDEX IF NOT EXISTS cl_citas_sin_cruce_idx ON public.cl_citas (owner_id, lower(profesional), inicio) WHERE estado IN ('agendada', 'en_consulta');
CREATE INDEX IF NOT EXISTS cl_cobros_owner_idx ON public.cl_cobros (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cl_comisiones_owner_idx ON public.cl_comisiones (owner_id, estado, profesional);

-- ============================================================
-- 3. Integridad: sin borrado físico; historia, notas y carnet no se modifican
-- ============================================================
CREATE OR REPLACE FUNCTION public.cl_sin_borrado()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'Este registro clínico o financiero no se puede borrar.';
END;
$$;

CREATE OR REPLACE FUNCTION public.cl_registro_inmutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Las historias clínicas, sus notas y el carnet no se modifican ni se borran. Agrega una nota aclaratoria.';
END;
$$;

-- Las citas solo pasan a "atendida" con la función que las envía a Caja.
CREATE OR REPLACE FUNCTION public.cl_citas_proteger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR coalesce(current_setting('gosaryc.cl_fn', true), '') = 'on' THEN RETURN NEW; END IF;
  IF OLD.estado IN ('atendida', 'no_asistio', 'cancelada') THEN
    RAISE EXCEPTION 'Esta cita ya está cerrada.';
  END IF;
  IF NEW.estado = 'atendida' OR NEW.cobro_id IS DISTINCT FROM OLD.cobro_id THEN
    RAISE EXCEPTION 'La cita se finaliza con el botón "Finalizar y pasar a Caja".';
  END IF;
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN RAISE EXCEPTION 'No se puede cambiar de negocio.'; END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_cl_citas_proteger ON public.cl_citas;
CREATE TRIGGER trg_cl_citas_proteger BEFORE UPDATE ON public.cl_citas
  FOR EACH ROW EXECUTE FUNCTION public.cl_citas_proteger();

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cl_pacientes', 'cl_historias', 'cl_notas_aclaratorias', 'cl_vacunas', 'cl_servicios', 'cl_insumos', 'cl_citas', 'cl_cobros', 'cl_comisiones'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_leer', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_leer', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_mi_negocio', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id())', t || '_solo_mi_negocio', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_tipo_actual', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual()) WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())', t || '_solo_tipo_actual', t);

    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM authenticated', t);
  END LOOP;

  -- Se pueden crear (el personal del negocio).
  FOREACH t IN ARRAY ARRAY['cl_pacientes', 'cl_historias', 'cl_notas_aclaratorias', 'cl_vacunas', 'cl_servicios', 'cl_insumos', 'cl_citas'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_crear', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_crear', t);
  END LOOP;

  -- Se pueden editar: ficha del paciente, catálogo, medicamentos y estado de citas.
  FOREACH t IN ARRAY ARRAY['cl_pacientes', 'cl_servicios', 'cl_insumos', 'cl_citas'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_editar', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal()) WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_editar', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['cl_pacientes', 'cl_servicios', 'cl_insumos', 'cl_citas', 'cl_cobros', 'cl_comisiones'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.cl_sin_borrado()', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['cl_historias', 'cl_notas_aclaratorias', 'cl_vacunas'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_registro_inmutable ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_registro_inmutable BEFORE UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.cl_registro_inmutable()', t);
  END LOOP;
END $$;

-- ============================================================
-- 4. Finalizar la cita: pasa a Caja con consulta + medicamentos aplicados
--    p_items: [{"tipo":"servicio"|"insumo","id":"...","cantidad":1}]
-- ============================================================
CREATE OR REPLACE FUNCTION public.cl_finalizar_cita(p_cita uuid, p_items jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  c record;
  it jsonb;
  s record;
  n record;
  v_cant numeric;
  v_linea numeric;
  v_com numeric;
  v_total numeric := 0;
  v_comtotal numeric := 0;
  v_detalle jsonb := '[]'::jsonb;
  v_id uuid := gen_random_uuid();
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO c FROM public.cl_citas WHERE id = p_cita AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cita no encontrada.'; END IF;
  IF c.estado NOT IN ('agendada', 'en_consulta') THEN RAISE EXCEPTION 'Esta cita ya está cerrada.'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Agrega al menos la consulta o el servicio realizado.';
  END IF;

  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_cant := coalesce((it ->> 'cantidad')::numeric, 1);
    IF v_cant <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor a cero.'; END IF;
    IF it ->> 'tipo' = 'servicio' THEN
      SELECT * INTO s FROM public.cl_servicios WHERE id = (it ->> 'id')::uuid AND owner_id = v_owner AND activo;
      IF NOT FOUND THEN RAISE EXCEPTION 'Servicio no encontrado.'; END IF;
      v_linea := s.precio * v_cant;
      v_com := round(v_linea * s.comision_pct / 100, 2);
      v_total := v_total + v_linea;
      v_comtotal := v_comtotal + v_com;
      v_detalle := v_detalle || jsonb_build_array(jsonb_build_object('tipo', 'servicio', 'id', s.id, 'nombre', s.nombre,
        'categoria', s.categoria, 'cantidad', v_cant, 'precio', s.precio, 'total', v_linea, 'pct', s.comision_pct, 'comision', v_com));
    ELSIF it ->> 'tipo' = 'insumo' THEN
      SELECT * INTO n FROM public.cl_insumos WHERE id = (it ->> 'id')::uuid AND owner_id = v_owner AND activo FOR UPDATE;
      IF NOT FOUND THEN RAISE EXCEPTION 'Medicamento no encontrado.'; END IF;
      IF n.vence_en IS NOT NULL AND n.vence_en < current_date THEN RAISE EXCEPTION '% está vencido y no se puede aplicar.', n.nombre; END IF;
      IF n.stock < v_cant THEN RAISE EXCEPTION 'No hay suficiente % (hay %).', n.nombre, n.stock; END IF;
      UPDATE public.cl_insumos SET stock = n.stock - v_cant WHERE id = n.id;
      v_linea := n.precio_venta * v_cant;
      v_total := v_total + v_linea;
      v_detalle := v_detalle || jsonb_build_array(jsonb_build_object('tipo', 'insumo', 'id', n.id, 'nombre', n.nombre,
        'categoria', 'medicamento', 'cantidad', v_cant, 'precio', n.precio_venta, 'total', v_linea, 'pct', 0, 'comision', 0));
    ELSE
      RAISE EXCEPTION 'Tipo de línea no válido.';
    END IF;
  END LOOP;

  INSERT INTO public.cl_cobros (id, owner_id, tipo_negocio, cita_id, paciente_id, profesional, items, total, comision_total)
  VALUES (v_id, v_owner, v_tipo, c.id, c.paciente_id, c.profesional, v_detalle, round(v_total, 2), round(v_comtotal, 2));

  PERFORM set_config('gosaryc.cl_fn', 'on', true);
  UPDATE public.cl_citas SET estado = 'atendida', cobro_id = v_id WHERE id = c.id;
  PERFORM set_config('gosaryc.cl_fn', 'off', true);
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.cl_finalizar_cita(uuid, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cl_finalizar_cita(uuid, jsonb) TO authenticated;

-- ============================================================
-- 5. Cobrar: entra a Caja y Contabilidad; las comisiones del profesional quedan pendientes
-- ============================================================
CREATE OR REPLACE FUNCTION public.cl_cobrar(p_cobro uuid, p_metodo text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  c record;
  l jsonb;
  v_cuenta text := CASE WHEN coalesce(p_metodo, 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_metodo text := CASE WHEN coalesce(p_metodo, 'efectivo') = 'efectivo' THEN 'efectivo' ELSE 'transferencia' END;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO c FROM public.cl_cobros WHERE id = p_cobro AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cobro no encontrado.'; END IF;
  IF c.estado <> 'pendiente' THEN RAISE EXCEPTION 'Este cobro ya se hizo.'; END IF;

  IF c.total > 0 THEN
    PERFORM set_config('gosaryc.pan', 'on', true);
    INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
    VALUES (v_owner, v_tipo, 'ingreso', left('Consulta y medicamentos: ' || c.profesional, 200), c.total);
    PERFORM set_config('gosaryc.pan', 'off', true);
    PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo, 'Consulta y medicamentos: ' || c.profesional, 'cl_cobro', c.id,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', c.total),
                        jsonb_build_object('codigo', '4135', 'haber', c.total)));
  END IF;

  FOR l IN SELECT * FROM jsonb_array_elements(c.items) LOOP
    IF coalesce((l ->> 'comision')::numeric, 0) > 0 THEN
      INSERT INTO public.cl_comisiones (owner_id, tipo_negocio, cobro_id, profesional, concepto, categoria, base, porcentaje, valor)
      VALUES (v_owner, v_tipo, c.id, c.profesional, l ->> 'nombre', coalesce(l ->> 'categoria', 'consulta'),
              (l ->> 'total')::numeric, (l ->> 'pct')::numeric, (l ->> 'comision')::numeric);
    END IF;
  END LOOP;

  PERFORM set_config('gosaryc.cl_fn', 'on', true);
  UPDATE public.cl_cobros SET estado = 'cobrado', metodo = v_metodo, cobrado_en = now() WHERE id = c.id;
  PERFORM set_config('gosaryc.cl_fn', 'off', true);
  RETURN c.total;
END;
$$;
REVOKE ALL ON FUNCTION public.cl_cobrar(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cl_cobrar(uuid, text) TO authenticated;

-- ============================================================
-- 6. Liquidación de honorarios: solo el dueño; llega a Contabilidad (nómina por pagar)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cl_liquidar_comisiones(p_profesional text, p_hasta date)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v_total numeric;
  v_id uuid := gen_random_uuid();
BEGIN
  IF v_owner IS NULL OR NOT public.es_admin() THEN RAISE EXCEPTION 'Solo el dueño puede liquidar honorarios.'; END IF;
  SELECT coalesce(sum(valor), 0) INTO v_total FROM public.cl_comisiones
   WHERE owner_id = v_owner AND estado = 'pendiente' AND profesional = p_profesional AND fecha <= coalesce(p_hasta, current_date);
  IF v_total <= 0 THEN RAISE EXCEPTION 'No hay honorarios pendientes para liquidar.'; END IF;

  UPDATE public.cl_comisiones SET estado = 'liquidada', liquidada_en = now()
   WHERE owner_id = v_owner AND estado = 'pendiente' AND profesional = p_profesional AND fecha <= coalesce(p_hasta, current_date);

  PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo, 'Honorarios liquidados: ' || p_profesional, 'cl_liquidacion', v_id,
    jsonb_build_array(jsonb_build_object('codigo', '5105', 'debe', round(v_total, 2)),
                      jsonb_build_object('codigo', '2505', 'haber', round(v_total, 2))));
  RETURN v_total;
END;
$$;
REVOKE ALL ON FUNCTION public.cl_liquidar_comisiones(text, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cl_liquidar_comisiones(text, date) TO authenticated;
