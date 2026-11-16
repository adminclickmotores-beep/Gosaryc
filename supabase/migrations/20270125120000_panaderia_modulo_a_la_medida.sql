-- MÓDULO A LA MEDIDA: PANADERÍA Y PASTELERÍA
-- Recetas y gramajes, producción por lotes (horneadas), mermas, tortas por encargo y turnos con metas.
-- Todo con owner_id = mi_negocio_id() y RLS estricto. No borra ni trunca datos.

-- ============================================================
-- 1. Recetas y gramajes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pan_recetas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL,
  unidades_por_lote numeric NOT NULL DEFAULT 1 CHECK (unidades_por_lote > 0),
  gramaje_unidad numeric NOT NULL DEFAULT 0 CHECK (gramaje_unidad >= 0),
  precio_venta numeric NOT NULL DEFAULT 0 CHECK (precio_venta >= 0),
  notas text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pan_receta_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  receta_id uuid NOT NULL REFERENCES public.pan_recetas(id) ON DELETE CASCADE,
  insumo_id uuid NOT NULL REFERENCES public.restaurante_insumos(id) ON DELETE RESTRICT,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pan_recetas_owner_idx ON public.pan_recetas (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pan_receta_items_receta_idx ON public.pan_receta_items (receta_id);

-- ============================================================
-- 2. Producción por lotes (horneadas) y mermas: solo se crean con las funciones de abajo
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pan_producciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  receta_id uuid REFERENCES public.pan_recetas(id) ON DELETE RESTRICT,
  nombre text NOT NULL,
  lotes numeric NOT NULL CHECK (lotes > 0),
  unidades numeric NOT NULL DEFAULT 0,
  costo_total numeric NOT NULL DEFAULT 0,
  costo_unitario numeric NOT NULL DEFAULT 0,
  horneado_por text,
  notas text,
  fecha date NOT NULL DEFAULT current_date,
  anulado boolean NOT NULL DEFAULT false,
  motivo_anulacion text,
  anulado_por uuid,
  anulado_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pan_mermas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  clase text NOT NULL CHECK (clase IN ('producto', 'insumo')),
  receta_id uuid REFERENCES public.pan_recetas(id) ON DELETE RESTRICT,
  insumo_id uuid REFERENCES public.restaurante_insumos(id) ON DELETE RESTRICT,
  nombre text NOT NULL,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  costo_total numeric NOT NULL DEFAULT 0,
  causa text NOT NULL,
  motivo text NOT NULL CHECK (length(trim(motivo)) >= 3),
  registrado_por text,
  fecha date NOT NULL DEFAULT current_date,
  anulado boolean NOT NULL DEFAULT false,
  motivo_anulacion text,
  anulado_por uuid,
  anulado_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pan_producciones_owner_idx ON public.pan_producciones (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS pan_mermas_owner_idx ON public.pan_mermas (owner_id, created_at DESC);

-- ============================================================
-- 3. Pedidos especiales / tortas por encargo
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pan_encargos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cliente text NOT NULL,
  telefono text,
  descripcion text NOT NULL,
  sabor text,
  tamano text,
  dedicatoria text,
  entrega_en timestamptz NOT NULL,
  total numeric NOT NULL DEFAULT 0 CHECK (total >= 0),
  abonado numeric NOT NULL DEFAULT 0 CHECK (abonado >= 0),
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_horno', 'listo', 'entregado', 'cancelado')),
  foto_path text,
  notas text,
  anulado boolean NOT NULL DEFAULT false,
  motivo_anulacion text,
  anulado_por uuid,
  anulado_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pan_encargos_owner_idx ON public.pan_encargos (owner_id, entrega_en);

-- ============================================================
-- 4. Turnos del personal con metas diarias de venta
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pan_turnos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  persona text NOT NULL,
  rol text NOT NULL DEFAULT 'panadero' CHECK (rol IN ('panadero', 'hornero', 'mostrador', 'pastelero', 'otro')),
  fecha date NOT NULL DEFAULT current_date,
  hora_inicio time,
  hora_fin time,
  meta_venta numeric NOT NULL DEFAULT 0 CHECK (meta_venta >= 0),
  venta_real numeric NOT NULL DEFAULT 0 CHECK (venta_real >= 0),
  estado text NOT NULL DEFAULT 'programado' CHECK (estado IN ('programado', 'en_curso', 'cerrado', 'cancelado')),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS pan_turnos_owner_idx ON public.pan_turnos (owner_id, fecha DESC);

-- ============================================================
-- 5. RLS estricto: solo el propio negocio, solo su tipo de negocio actual
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['pan_recetas', 'pan_receta_items', 'pan_producciones', 'pan_mermas', 'pan_encargos', 'pan_turnos'] LOOP
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

  -- Recetas e ingredientes: el personal los crea y edita (borrar un ingrediente de una receta no es un dato financiero).
  FOREACH t IN ARRAY ARRAY['pan_recetas', 'pan_receta_items'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_crear', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_crear', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_editar', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal()) WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_editar', t);
  END LOOP;
  DROP POLICY IF EXISTS "pan_receta_items_borrar" ON public.pan_receta_items;
  CREATE POLICY "pan_receta_items_borrar" ON public.pan_receta_items
    FOR DELETE TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal());

  -- Turnos: crear y editar (cerrar con la venta real). Sin borrado: se cancelan.
  FOREACH t IN ARRAY ARRAY['pan_turnos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_crear', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_crear', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_editar', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal()) WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_editar', t);
  END LOOP;

  -- Encargos: solo se editan estado, notas y datos de la torta; los abonos y la entrega pasan por funciones.
  DROP POLICY IF EXISTS "pan_encargos_editar" ON public.pan_encargos;
  CREATE POLICY "pan_encargos_editar" ON public.pan_encargos
    FOR UPDATE TO authenticated
    USING (owner_id = public.mi_negocio_id() AND public.es_personal())
    WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

  -- Producción y mermas: sin INSERT/UPDATE/DELETE directos (solo las funciones de abajo).
  -- Sin borrado físico en nada financiero o de inventario.
  FOREACH t IN ARRAY ARRAY['pan_producciones', 'pan_mermas', 'pan_encargos', 'pan_turnos'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero()', t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['pan_producciones', 'pan_mermas', 'pan_encargos'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_controlar_anulacion ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_controlar_anulacion BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.controlar_anulacion()', t);
  END LOOP;
END $$;

-- Foto de referencia: va al bucket privado "creditos_docs" (carpeta del negocio), que ya tiene sus políticas.
INSERT INTO storage.buckets (id, name, public)
VALUES ('creditos_docs', 'creditos_docs', false)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 6. Contabilidad: cuentas propias de panadería y caja que no duplica asientos
-- ============================================================
CREATE OR REPLACE FUNCTION public.pan_asegurar_cuenta(p_owner uuid, p_tipo text, p_codigo text, p_nombre text, p_clase text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.inicializar_plan_cuentas(p_owner, public.clave_tipo_negocio(p_tipo));
  INSERT INTO public.cuentas_contables (owner_id, codigo, nombre, tipo, tipo_negocio)
  SELECT p_owner, p_codigo, p_nombre, p_clase, public.clave_tipo_negocio(p_tipo)
   WHERE NOT EXISTS (
     SELECT 1 FROM public.cuentas_contables c
      WHERE c.owner_id = p_owner AND c.codigo = p_codigo
        AND public.clave_tipo_negocio(c.tipo_negocio) = public.clave_tipo_negocio(p_tipo));
END;
$$;
REVOKE ALL ON FUNCTION public.pan_asegurar_cuenta(uuid, text, text, text, text) FROM public, anon, authenticated;

-- Igual que antes, pero los movimientos de caja de encargos (abonos y saldos) ya llevan su propio asiento.
CREATE OR REPLACE FUNCTION public.asiento_auto_caja()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    IF coalesce(current_setting('gosaryc.pan', true), '') = 'on' THEN RETURN NEW; END IF;
    IF NEW.owner_id IS NULL OR coalesce(NEW.monto, 0) <= 0 OR NEW.tipo NOT IN ('gasto', 'ingreso') THEN RETURN NEW; END IF;
    PERFORM public.registrar_asiento_auto(NEW.owner_id, coalesce(NEW.tipo_negocio, public.tipo_de_negocio(NEW.owner_id)),
      CASE WHEN NEW.tipo = 'gasto' THEN 'Gasto: ' ELSE 'Ingreso: ' END || coalesce(NEW.concepto, ''),
      CASE WHEN NEW.tipo = 'gasto' THEN 'caja_gasto' ELSE 'caja_ingreso' END, NEW.id,
      CASE WHEN NEW.tipo = 'gasto'
        THEN jsonb_build_array(jsonb_build_object('codigo', '5195', 'debe', NEW.monto), jsonb_build_object('codigo', '1105', 'haber', NEW.monto))
        ELSE jsonb_build_array(jsonb_build_object('codigo', '1105', 'debe', NEW.monto), jsonb_build_object('codigo', '4210', 'haber', NEW.monto))
      END);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento de caja %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 7. Horneada: descuenta los insumos según la receta y calcula el costo real por unidad
-- ============================================================
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

  -- Primero se valida todo el stock; después se descuenta.
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
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.pan_registrar_horneada(uuid, numeric, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pan_registrar_horneada(uuid, numeric, text, text) TO authenticated;

-- ============================================================
-- 8. Mermas: motivo obligatorio, descuenta stock y manda la pérdida a Contabilidad
-- ============================================================
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
    SELECT * INTO r FROM public.pan_recetas WHERE id = p_receta AND owner_id = v_owner;
    IF NOT FOUND THEN RAISE EXCEPTION 'Producto no encontrado.'; END IF;
    v_nombre := r.nombre;
    -- Costo real de la última horneada; si aún no hay, se calcula con la receta actual.
    SELECT costo_unitario INTO v_costo FROM public.pan_producciones
     WHERE receta_id = r.id AND owner_id = v_owner AND NOT anulado ORDER BY created_at DESC LIMIT 1;
    IF v_costo IS NULL THEN
      SELECT coalesce(sum(ri.cantidad * (i2.precio_compra / greatest(i2.cantidad_compra, 0.000001))), 0) / greatest(r.unidades_por_lote, 0.000001)
        INTO v_costo
        FROM public.pan_receta_items ri JOIN public.restaurante_insumos i2 ON i2.id = ri.insumo_id
       WHERE ri.receta_id = r.id AND ri.owner_id = v_owner;
    END IF;
    v_costo := coalesce(v_costo, 0) * p_cantidad;
  ELSE
    RAISE EXCEPTION 'Clase de merma no válida.';
  END IF;

  INSERT INTO public.pan_mermas (id, owner_id, tipo_negocio, clase, receta_id, insumo_id, nombre, cantidad, costo_total, causa, motivo, registrado_por)
  VALUES (v_id, v_owner, v_tipo, p_clase, CASE WHEN p_clase = 'producto' THEN p_receta END, CASE WHEN p_clase = 'insumo' THEN p_insumo END,
          v_nombre, p_cantidad, round(v_costo, 2), v_causa, v_motivo, nullif(trim(coalesce(p_registrado_por, '')), ''));

  -- La pérdida llega sola a Contabilidad: gasto por merma contra inventario.
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
-- 9. Tortas por encargo: abono inicial a Caja y Contabilidad, saldo y entrega
-- ============================================================
CREATE OR REPLACE FUNCTION public.pan_aplicar_abono(p_owner uuid, p_tipo text, p_id uuid, p_monto numeric, p_metodo text, p_concepto text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cuenta text := CASE WHEN coalesce(p_metodo, 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
BEGIN
  PERFORM set_config('gosaryc.pan', 'on', true);
  INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
  VALUES (p_owner, p_tipo, 'ingreso', left(p_concepto, 200), p_monto);
  PERFORM set_config('gosaryc.pan', 'off', true);
  PERFORM public.pan_asegurar_cuenta(p_owner, p_tipo, '2805', 'Anticipos de clientes (encargos)', 'pasivo');
  PERFORM public.registrar_asiento_movimiento(p_owner, p_tipo, p_concepto, 'encargo_abono', p_id,
    jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', p_monto),
                      jsonb_build_object('codigo', '2805', 'haber', p_monto)));
END;
$$;
REVOKE ALL ON FUNCTION public.pan_aplicar_abono(uuid, text, uuid, numeric, text, text) FROM public, anon, authenticated;

-- Los abonos y la entrega no se pueden alterar a mano, solo con las funciones.
CREATE OR REPLACE FUNCTION public.pan_encargos_proteger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR coalesce(current_setting('gosaryc.pan_fn', true), '') = 'on' THEN
    RETURN NEW;
  END IF;
  IF NEW.abonado IS DISTINCT FROM OLD.abonado THEN
    RAISE EXCEPTION 'Los abonos se registran con el botón Abonar.';
  END IF;
  IF NEW.estado = 'entregado' AND OLD.estado <> 'entregado' THEN
    RAISE EXCEPTION 'La entrega se registra con el botón Entregar y cobrar saldo.';
  END IF;
  IF OLD.estado = 'entregado' AND (NEW.total IS DISTINCT FROM OLD.total OR NEW.estado <> 'entregado') THEN
    RAISE EXCEPTION 'Un encargo entregado no se puede modificar.';
  END IF;
  IF NEW.anulado AND NOT OLD.anulado AND OLD.abonado > 0 THEN
    RAISE EXCEPTION 'Este encargo ya recibió abonos y no se puede anular. Márcalo como cancelado.';
  END IF;
  IF NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'No se puede cambiar de negocio.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_pan_encargos_proteger ON public.pan_encargos;
CREATE TRIGGER trg_pan_encargos_proteger BEFORE UPDATE ON public.pan_encargos
  FOR EACH ROW EXECUTE FUNCTION public.pan_encargos_proteger();

CREATE OR REPLACE FUNCTION public.pan_crear_encargo(
  p_cliente text, p_telefono text, p_descripcion text, p_sabor text, p_tamano text, p_dedicatoria text,
  p_entrega timestamptz, p_total numeric, p_abono numeric, p_metodo text, p_foto text, p_notas text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v_id uuid := gen_random_uuid();
  v_abono numeric := greatest(coalesce(p_abono, 0), 0);
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF nullif(trim(coalesce(p_cliente, '')), '') IS NULL THEN RAISE EXCEPTION 'Escribe el nombre del cliente.'; END IF;
  IF nullif(trim(coalesce(p_descripcion, '')), '') IS NULL THEN RAISE EXCEPTION 'Describe el pedido.'; END IF;
  IF p_entrega IS NULL THEN RAISE EXCEPTION 'Elige la fecha y hora de entrega.'; END IF;
  IF coalesce(p_total, 0) <= 0 THEN RAISE EXCEPTION 'El valor total debe ser mayor a cero.'; END IF;
  IF v_abono > p_total THEN RAISE EXCEPTION 'El abono no puede superar el total.'; END IF;
  IF p_foto IS NOT NULL AND split_part(p_foto, '/', 1) <> v_owner::text THEN RAISE EXCEPTION 'Foto no válida.'; END IF;

  INSERT INTO public.pan_encargos (id, owner_id, tipo_negocio, cliente, telefono, descripcion, sabor, tamano, dedicatoria, entrega_en, total, abonado, foto_path, notas)
  VALUES (v_id, v_owner, v_tipo, trim(p_cliente), nullif(trim(coalesce(p_telefono, '')), ''), trim(p_descripcion),
          nullif(trim(coalesce(p_sabor, '')), ''), nullif(trim(coalesce(p_tamano, '')), ''), nullif(trim(coalesce(p_dedicatoria, '')), ''),
          p_entrega, p_total, 0, nullif(p_foto, ''), nullif(trim(coalesce(p_notas, '')), ''));

  IF v_abono > 0 THEN
    PERFORM set_config('gosaryc.pan_fn', 'on', true);
    UPDATE public.pan_encargos SET abonado = v_abono WHERE id = v_id;
    PERFORM set_config('gosaryc.pan_fn', 'off', true);
    PERFORM public.pan_aplicar_abono(v_owner, v_tipo, v_id, v_abono, p_metodo, 'Abono inicial torta: ' || trim(p_cliente));
  END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.pan_crear_encargo(text, text, text, text, text, text, timestamptz, numeric, numeric, text, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pan_crear_encargo(text, text, text, text, text, text, timestamptz, numeric, numeric, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.pan_abonar_encargo(p_id uuid, p_monto numeric, p_metodo text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  e record;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_monto IS NULL OR p_monto <= 0 THEN RAISE EXCEPTION 'El abono debe ser mayor a cero.'; END IF;
  SELECT * INTO e FROM public.pan_encargos WHERE id = p_id AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Encargo no encontrado.'; END IF;
  IF e.anulado OR e.estado IN ('entregado', 'cancelado') THEN RAISE EXCEPTION 'Este encargo ya está cerrado.'; END IF;
  IF p_monto > e.total - e.abonado THEN RAISE EXCEPTION 'El abono supera el saldo pendiente.'; END IF;

  PERFORM set_config('gosaryc.pan_fn', 'on', true);
  UPDATE public.pan_encargos SET abonado = e.abonado + p_monto WHERE id = e.id;
  PERFORM set_config('gosaryc.pan_fn', 'off', true);
  PERFORM public.pan_aplicar_abono(v_owner, public.tipo_negocio_actual(), e.id, p_monto, p_metodo, 'Abono torta: ' || e.cliente);
  RETURN e.total - e.abonado - p_monto;
END;
$$;
REVOKE ALL ON FUNCTION public.pan_abonar_encargo(uuid, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pan_abonar_encargo(uuid, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.pan_entregar_encargo(p_id uuid, p_metodo text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  e record;
  v_saldo numeric;
  v_cuenta text := CASE WHEN coalesce(p_metodo, 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_lineas jsonb;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO e FROM public.pan_encargos WHERE id = p_id AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Encargo no encontrado.'; END IF;
  IF e.anulado OR e.estado IN ('entregado', 'cancelado') THEN RAISE EXCEPTION 'Este encargo ya está cerrado.'; END IF;
  v_saldo := e.total - e.abonado;

  IF v_saldo > 0 THEN
    PERFORM set_config('gosaryc.pan', 'on', true);
    INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
    VALUES (v_owner, v_tipo, 'ingreso', left('Saldo torta entregada: ' || e.cliente, 200), v_saldo);
    PERFORM set_config('gosaryc.pan', 'off', true);
  END IF;

  PERFORM public.pan_asegurar_cuenta(v_owner, v_tipo, '2805', 'Anticipos de clientes (encargos)', 'pasivo');
  v_lineas := '[]'::jsonb;
  IF e.abonado > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '2805', 'debe', e.abonado)); END IF;
  IF v_saldo > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_saldo)); END IF;
  v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '4135', 'haber', e.total));
  PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo, 'Venta torta por encargo: ' || e.cliente, 'encargo_venta', e.id, v_lineas);

  PERFORM set_config('gosaryc.pan_fn', 'on', true);
  UPDATE public.pan_encargos SET abonado = e.total, estado = 'entregado' WHERE id = e.id;
  PERFORM set_config('gosaryc.pan_fn', 'off', true);
  RETURN v_saldo;
END;
$$;
REVOKE ALL ON FUNCTION public.pan_entregar_encargo(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pan_entregar_encargo(uuid, text) TO authenticated;
