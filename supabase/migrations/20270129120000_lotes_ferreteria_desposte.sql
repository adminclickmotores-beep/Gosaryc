-- LOTES / FIFO, FERRETERÍA (ubicación y cotizador) Y DESPOSTE DE CARNICERÍA / FRUVER
-- Todo con owner_id = mi_negocio_id() y RLS estricto. Sin borrado físico. No borra ni trunca datos.

-- ============================================================
-- 1. Productos: ubicación física y control de lotes
-- ============================================================
ALTER TABLE public.com_productos
  ADD COLUMN IF NOT EXISTS ubicacion_pasillo text,
  ADD COLUMN IF NOT EXISTS ubicacion_estante text,
  ADD COLUMN IF NOT EXISTS ubicacion_nivel text,
  ADD COLUMN IF NOT EXISTS controla_lotes boolean NOT NULL DEFAULT false;

-- ============================================================
-- 2. Tablas nuevas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.com_lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  producto_id uuid NOT NULL REFERENCES public.com_productos(id) ON DELETE RESTRICT,
  numero_lote text NOT NULL CHECK (length(trim(numero_lote)) >= 1),
  vence date,
  cantidad_inicial numeric NOT NULL CHECK (cantidad_inicial > 0),
  cantidad_actual numeric NOT NULL CHECK (cantidad_actual >= 0),
  costo_unitario numeric NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
  registrado_por text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS com_lotes_fifo_idx ON public.com_lotes (owner_id, producto_id, vence);

CREATE TABLE IF NOT EXISTS public.com_cotizaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  numero text NOT NULL,
  cliente text NOT NULL,
  telefono text,
  tipo_precio text NOT NULL DEFAULT 'mayorista' CHECK (tipo_precio IN ('detal', 'mayorista', 'especial')),
  descuento_pct numeric NOT NULL DEFAULT 0 CHECK (descuento_pct >= 0 AND descuento_pct <= 100),
  descuento numeric NOT NULL DEFAULT 0,
  base numeric NOT NULL DEFAULT 0,
  iva numeric NOT NULL DEFAULT 0,
  impoconsumo numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  vigencia date,
  notas text,
  estado text NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador', 'enviada', 'aprobada', 'rechazada', 'convertida')),
  venta_id uuid,
  registrado_por text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS com_cotizaciones_owner_idx ON public.com_cotizaciones (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.com_cotizacion_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cotizacion_id uuid NOT NULL REFERENCES public.com_cotizaciones(id) ON DELETE RESTRICT,
  producto_id uuid NOT NULL REFERENCES public.com_productos(id) ON DELETE RESTRICT,
  nombre text NOT NULL,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  unidad text NOT NULL,
  precio_unitario numeric NOT NULL DEFAULT 0,
  base numeric NOT NULL DEFAULT 0,
  impuesto numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS com_cotizacion_items_idx ON public.com_cotizacion_items (cotizacion_id);

CREATE TABLE IF NOT EXISTS public.com_despostes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  origen_id uuid REFERENCES public.com_productos(id) ON DELETE RESTRICT,
  descripcion text NOT NULL,
  peso_entrada numeric NOT NULL CHECK (peso_entrada > 0),
  costo_total numeric NOT NULL CHECK (costo_total > 0),
  peso_util numeric NOT NULL DEFAULT 0,
  merma_kg numeric NOT NULL DEFAULT 0,
  merma_valor numeric NOT NULL DEFAULT 0,
  costo_kilo_limpio numeric NOT NULL DEFAULT 0,
  rendimiento_pct numeric NOT NULL DEFAULT 0,
  notas text,
  registrado_por text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS com_despostes_owner_idx ON public.com_despostes (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.com_desposte_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  desposte_id uuid NOT NULL REFERENCES public.com_despostes(id) ON DELETE RESTRICT,
  producto_id uuid REFERENCES public.com_productos(id) ON DELETE RESTRICT,
  tipo text NOT NULL CHECK (tipo IN ('corte', 'hueso', 'grasa', 'desperdicio', 'merma')),
  nombre text NOT NULL,
  peso_kg numeric NOT NULL CHECK (peso_kg > 0),
  valor numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS com_desposte_items_idx ON public.com_desposte_items (desposte_id);

-- ============================================================
-- 3. RLS estricto: el personal solo lee lo de su negocio; todo se escribe con las funciones de abajo
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['com_lotes', 'com_cotizaciones', 'com_cotizacion_items', 'com_despostes', 'com_desposte_items'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_leer', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_leer', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_mi_negocio', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id())', t || '_solo_mi_negocio', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_tipo_actual', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual()) WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())', t || '_solo_tipo_actual', t);

    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM authenticated', t);

    EXECUTE format('DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero()', t);
  END LOOP;
END $$;

-- ============================================================
-- 4. Ingreso de mercancía con lote y vencimiento
-- ============================================================
CREATE OR REPLACE FUNCTION public.com_ingresar_lote(
  p_producto uuid, p_lote text, p_vence date, p_cantidad numeric, p_unidad text, p_costo numeric
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  p record;
  v_base numeric;
  v_id uuid := gen_random_uuid();
  v_costo numeric := greatest(coalesce(p_costo, 0), 0);
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_lote IS NULL OR length(trim(p_lote)) < 1 THEN RAISE EXCEPTION 'Escribe el número de lote.'; END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'La cantidad debe ser mayor a cero.'; END IF;
  SELECT * INTO p FROM public.com_productos WHERE id = p_producto AND owner_id = v_owner AND activo FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El producto no existe.'; END IF;
  v_base := public.com_convertir(p_cantidad, coalesce(nullif(p_unidad, ''), p.unidad_base), p.unidad_base, p.unidades_por_caja);

  INSERT INTO public.com_lotes (id, owner_id, tipo_negocio, producto_id, numero_lote, vence, cantidad_inicial, cantidad_actual, costo_unitario, registrado_por)
  VALUES (v_id, v_owner, v_tipo, p.id, trim(p_lote), p_vence, v_base, v_base, v_costo, coalesce(auth.jwt() ->> 'email', ''));

  PERFORM set_config('gosaryc.com_motivo', 'Ingreso lote ' || trim(p_lote), true);
  UPDATE public.com_productos
     SET stock = p.stock + v_base,
         controla_lotes = true,
         costo = CASE WHEN v_costo > 0 AND p.stock + v_base > 0
                      THEN round((p.stock * p.costo + v_base * v_costo) / (p.stock + v_base), 4) ELSE p.costo END
   WHERE id = p.id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.com_ingresar_lote(uuid, text, date, numeric, text, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.com_ingresar_lote(uuid, text, date, numeric, text, numeric) TO authenticated;

-- FIFO: cada renglón vendido descuenta primero del lote que vence antes.
CREATE OR REPLACE FUNCTION public.com_descontar_lotes_fifo()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ctrl boolean;
  v_falta numeric := NEW.cantidad_base;
  v_toma numeric;
  l record;
BEGIN
  SELECT controla_lotes INTO v_ctrl FROM public.com_productos WHERE id = NEW.producto_id;
  IF NOT coalesce(v_ctrl, false) THEN RETURN NEW; END IF;
  FOR l IN
    SELECT id, cantidad_actual FROM public.com_lotes
     WHERE producto_id = NEW.producto_id AND owner_id = NEW.owner_id AND cantidad_actual > 0
     ORDER BY vence ASC NULLS LAST, created_at ASC
     FOR UPDATE
  LOOP
    EXIT WHEN v_falta <= 0;
    v_toma := least(l.cantidad_actual, v_falta);
    UPDATE public.com_lotes SET cantidad_actual = cantidad_actual - v_toma WHERE id = l.id;
    v_falta := v_falta - v_toma;
  END LOOP;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_com_fifo ON public.com_venta_items;
CREATE TRIGGER trg_com_fifo AFTER INSERT ON public.com_venta_items
  FOR EACH ROW EXECUTE FUNCTION public.com_descontar_lotes_fifo();

-- ============================================================
-- 5. Venta: igual que antes, pero admite el descuento de una cotización aprobada
--    (se pasa por la configuración de sesión gosaryc.com_descuento, solo desde com_convertir_cotizacion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.com_registrar_venta(
  p_items jsonb, p_cliente text, p_telefono text, p_tipo_precio text, p_metodo text,
  p_autorizar boolean, p_motivo text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v_item jsonb;
  p record;
  v_venta uuid := gen_random_uuid();
  v_unidad text;
  v_cant numeric;
  v_cant_base numeric;
  v_precio numeric;
  v_total_l numeric;
  v_base_l numeric;
  v_imp_l numeric;
  v_pct numeric;
  v_base numeric := 0;
  v_iva numeric := 0;
  v_impo numeric := 0;
  v_total numeric := 0;
  v_n int := 0;
  v_fiar boolean := coalesce(p_metodo, '') = 'fiado';
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cliente text := nullif(trim(coalesce(p_cliente, '')), '');
  v_estado jsonb;
  v_plazo integer;
  v_bloqueo text := NULL;
  v_fiado uuid;
  v_autorizado uuid := NULL;
  v_motivo text := nullif(trim(coalesce(p_motivo, '')), '');
  v_cuenta text := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  v_lineas jsonb;
  v_turno uuid;
  v_concepto text := 'Venta mostrador #' || upper(left(v_venta::text, 6));
  v_desc numeric := least(greatest(coalesce(nullif(current_setting('gosaryc.com_descuento', true), ''), '0')::numeric, 0), 100);
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_tipo_precio NOT IN ('detal', 'mayorista', 'especial') THEN RAISE EXCEPTION 'Tipo de precio no válido.'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Agrega al menos un producto.';
  END IF;
  IF v_fiar AND v_cliente IS NULL THEN RAISE EXCEPTION 'Para fiar escribe el nombre del cliente.'; END IF;

  INSERT INTO public.com_ventas (id, owner_id, tipo_negocio, cliente, telefono, tipo_precio, metodo, registrado_por)
  VALUES (v_venta, v_owner, v_tipo, v_cliente, nullif(trim(coalesce(p_telefono, '')), ''), p_tipo_precio, v_metodo,
          coalesce(auth.jwt() ->> 'email', ''));

  PERFORM set_config('gosaryc.com_motivo', 'Venta ' || upper(left(v_venta::text, 6)), true);

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO p FROM public.com_productos
     WHERE id = (v_item ->> 'producto_id')::uuid AND owner_id = v_owner AND activo FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Un producto de la cuenta ya no existe.'; END IF;
    v_cant := (v_item ->> 'cantidad')::numeric;
    v_unidad := coalesce(nullif(v_item ->> 'unidad', ''), p.unidad_base);
    IF v_cant IS NULL OR v_cant <= 0 THEN RAISE EXCEPTION 'La cantidad de % debe ser mayor a cero.', p.nombre; END IF;

    v_cant_base := public.com_convertir(v_cant, v_unidad, p.unidad_base, p.unidades_por_caja);
    IF p.stock < v_cant_base THEN
      RAISE EXCEPTION 'No hay suficiente % (quedan % %).', p.nombre, round(p.stock, 3), p.unidad_base;
    END IF;

    v_precio := CASE p_tipo_precio
      WHEN 'mayorista' THEN coalesce(p.precio_mayorista, p.precio_detal)
      WHEN 'especial' THEN coalesce(p.precio_especial, p.precio_detal)
      ELSE p.precio_detal END;
    IF v_desc > 0 THEN v_precio := round(v_precio * (1 - v_desc / 100), 4); END IF;
    v_pct := CASE WHEN p.tipo_impuesto = 'exento' THEN 0 ELSE p.impuesto_pct END;

    IF p.precio_incluye_impuesto THEN
      v_total_l := round(v_cant_base * v_precio, 2);
      v_base_l := round(v_total_l / (1 + v_pct / 100), 2);
      v_imp_l := v_total_l - v_base_l;
    ELSE
      v_base_l := round(v_cant_base * v_precio, 2);
      v_imp_l := round(v_base_l * v_pct / 100, 2);
      v_total_l := v_base_l + v_imp_l;
    END IF;

    UPDATE public.com_productos SET stock = p.stock - v_cant_base WHERE id = p.id;

    INSERT INTO public.com_venta_items (owner_id, tipo_negocio, venta_id, producto_id, nombre, cantidad, unidad, cantidad_base,
                                        precio_base, base, tipo_impuesto, impuesto_pct, impuesto, total)
    VALUES (v_owner, v_tipo, v_venta, p.id, p.nombre, v_cant, v_unidad, v_cant_base, v_precio, v_base_l,
            p.tipo_impuesto, v_pct, v_imp_l, v_total_l);

    v_base := v_base + v_base_l;
    v_total := v_total + v_total_l;
    IF p.tipo_impuesto = 'iva' THEN v_iva := v_iva + v_imp_l;
    ELSIF p.tipo_impuesto = 'impoconsumo' THEN v_impo := v_impo + v_imp_l; END IF;
    v_n := v_n + 1;
  END LOOP;

  IF v_total <= 0 THEN RAISE EXCEPTION 'El total de la venta debe ser mayor a cero.'; END IF;

  -- Fiado: cupo máximo y facturas vencidas.
  IF v_fiar THEN
    v_estado := public.com_estado_credito(v_cliente, p_telefono);
    v_plazo := (v_estado ->> 'plazo_dias')::integer;
    IF (v_estado ->> 'vencido')::numeric > 0 THEN
      v_bloqueo := 'El cliente tiene facturas vencidas por ' || (v_estado ->> 'vencido') || '.';
    ELSIF NOT (v_estado ->> 'tiene_cupo')::boolean THEN
      v_bloqueo := 'El cliente no tiene cupo de crédito asignado.';
    ELSIF v_total > (v_estado ->> 'disponible')::numeric THEN
      v_bloqueo := 'La venta supera el cupo disponible (' || (v_estado ->> 'disponible') || ').';
    END IF;

    IF v_bloqueo IS NOT NULL THEN
      IF NOT coalesce(p_autorizar, false) THEN
        RAISE EXCEPTION 'CREDITO_BLOQUEADO: %', v_bloqueo;
      END IF;
      IF NOT public.es_admin() THEN RAISE EXCEPTION 'Solo el dueño puede autorizar esta venta a crédito.'; END IF;
      IF v_motivo IS NULL OR length(v_motivo) < 3 THEN RAISE EXCEPTION 'Escribe el motivo de la autorización.'; END IF;
      v_autorizado := auth.uid();
    END IF;

    v_fiado := gen_random_uuid();
    INSERT INTO public.fiados (id, owner_id, tipo_negocio, titulo, contacto, telefono, monto, abonado, estado, fecha)
    VALUES (v_fiado, v_owner, v_tipo, 'Venta a crédito #' || upper(left(v_venta::text, 6)), v_cliente,
            nullif(trim(coalesce(p_telefono, '')), ''), v_total, 0, 'pendiente', current_date + v_plazo);
  END IF;

  UPDATE public.com_ventas
     SET base = v_base, iva = v_iva, impoconsumo = v_impo, total = v_total, fiado_id = v_fiado,
         autorizado_por = v_autorizado, motivo_autorizacion = CASE WHEN v_autorizado IS NOT NULL THEN v_motivo END
   WHERE id = v_venta;

  -- Contabilidad: ingreso por ventas e impuestos discriminados.
  BEGIN
    IF v_iva > 0 THEN PERFORM public.pan_asegurar_cuenta(v_owner, v_tipo, '2408', 'IVA por pagar', 'pasivo'); END IF;
    IF v_impo > 0 THEN PERFORM public.pan_asegurar_cuenta(v_owner, v_tipo, '2495', 'Impoconsumo por pagar', 'pasivo'); END IF;
    v_lineas := jsonb_build_array(
      jsonb_build_object('codigo', CASE WHEN v_fiar THEN '1305' ELSE v_cuenta END, 'debe', v_total),
      jsonb_build_object('codigo', '4135', 'haber', v_base));
    IF v_iva > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '2408', 'haber', v_iva)); END IF;
    IF v_impo > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '2495', 'haber', v_impo)); END IF;
    PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo,
      CASE WHEN v_fiar THEN 'Venta a crédito: ' || coalesce(v_cliente, '') ELSE v_concepto END,
      CASE WHEN v_fiar THEN 'com_venta_credito' ELSE 'com_venta' END, v_venta, v_lineas);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento de la venta %: %', v_venta, SQLERRM;
  END;

  -- Caja: lo cobrado entra a caja y al turno abierto (el fiado entra cuando se abone).
  IF NOT v_fiar THEN
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
  END IF;

  RETURN jsonb_build_object('venta_id', v_venta, 'fiado_id', v_fiado, 'base', v_base, 'iva', v_iva,
                            'impoconsumo', v_impo, 'total', v_total, 'renglones', v_n, 'autorizada', v_autorizado IS NOT NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.com_registrar_venta(jsonb, text, text, text, text, boolean, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.com_registrar_venta(jsonb, text, text, text, text, boolean, text) TO authenticated;

-- ============================================================
-- 6. Cotizador de materiales (ferretería)
-- ============================================================
CREATE OR REPLACE FUNCTION public.com_crear_cotizacion(
  p_items jsonb, p_cliente text, p_telefono text, p_tipo_precio text, p_descuento_pct numeric,
  p_vigencia_dias integer, p_notas text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v_id uuid := gen_random_uuid();
  v_item jsonb;
  p record;
  v_unidad text;
  v_cant numeric;
  v_cant_base numeric;
  v_precio numeric;
  v_pct numeric;
  v_desc numeric := least(greatest(coalesce(p_descuento_pct, 0), 0), 100);
  v_total_l numeric;
  v_base_l numeric;
  v_imp_l numeric;
  v_bruto_l numeric;
  v_base numeric := 0;
  v_iva numeric := 0;
  v_impo numeric := 0;
  v_total numeric := 0;
  v_bruto numeric := 0;
  v_cliente text := nullif(trim(coalesce(p_cliente, '')), '');
  v_numero text := 'COT-' || upper(left(v_id::text, 6));
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF v_cliente IS NULL THEN RAISE EXCEPTION 'Escribe el nombre del cliente o de la obra.'; END IF;
  IF p_tipo_precio NOT IN ('detal', 'mayorista', 'especial') THEN RAISE EXCEPTION 'Tipo de precio no válido.'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Agrega al menos un material.';
  END IF;

  INSERT INTO public.com_cotizaciones (id, owner_id, tipo_negocio, numero, cliente, telefono, tipo_precio, descuento_pct, vigencia, notas, registrado_por)
  VALUES (v_id, v_owner, v_tipo, v_numero, v_cliente, nullif(trim(coalesce(p_telefono, '')), ''), p_tipo_precio, v_desc,
          current_date + greatest(coalesce(p_vigencia_dias, 15), 1), nullif(trim(coalesce(p_notas, '')), ''),
          coalesce(auth.jwt() ->> 'email', ''));

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    SELECT * INTO p FROM public.com_productos
     WHERE id = (v_item ->> 'producto_id')::uuid AND owner_id = v_owner AND activo;
    IF NOT FOUND THEN RAISE EXCEPTION 'Un material de la lista ya no existe.'; END IF;
    v_cant := (v_item ->> 'cantidad')::numeric;
    v_unidad := coalesce(nullif(v_item ->> 'unidad', ''), p.unidad_base);
    IF v_cant IS NULL OR v_cant <= 0 THEN RAISE EXCEPTION 'La cantidad de % debe ser mayor a cero.', p.nombre; END IF;
    v_cant_base := public.com_convertir(v_cant, v_unidad, p.unidad_base, p.unidades_por_caja);

    v_precio := CASE p_tipo_precio
      WHEN 'mayorista' THEN coalesce(p.precio_mayorista, p.precio_detal)
      WHEN 'especial' THEN coalesce(p.precio_especial, p.precio_detal)
      ELSE p.precio_detal END;
    v_pct := CASE WHEN p.tipo_impuesto = 'exento' THEN 0 ELSE p.impuesto_pct END;
    v_bruto_l := round(v_cant_base * v_precio * CASE WHEN p.precio_incluye_impuesto THEN 1 ELSE 1 + v_pct / 100 END, 2);
    IF v_desc > 0 THEN v_precio := round(v_precio * (1 - v_desc / 100), 4); END IF;

    IF p.precio_incluye_impuesto THEN
      v_total_l := round(v_cant_base * v_precio, 2);
      v_base_l := round(v_total_l / (1 + v_pct / 100), 2);
      v_imp_l := v_total_l - v_base_l;
    ELSE
      v_base_l := round(v_cant_base * v_precio, 2);
      v_imp_l := round(v_base_l * v_pct / 100, 2);
      v_total_l := v_base_l + v_imp_l;
    END IF;

    INSERT INTO public.com_cotizacion_items (owner_id, tipo_negocio, cotizacion_id, producto_id, nombre, cantidad, unidad,
                                             precio_unitario, base, impuesto, total)
    VALUES (v_owner, v_tipo, v_id, p.id, p.nombre, v_cant, v_unidad, v_precio, v_base_l, v_imp_l, v_total_l);

    v_base := v_base + v_base_l;
    v_total := v_total + v_total_l;
    v_bruto := v_bruto + v_bruto_l;
    IF p.tipo_impuesto = 'iva' THEN v_iva := v_iva + v_imp_l;
    ELSIF p.tipo_impuesto = 'impoconsumo' THEN v_impo := v_impo + v_imp_l; END IF;
  END LOOP;

  UPDATE public.com_cotizaciones
     SET base = v_base, iva = v_iva, impoconsumo = v_impo, total = v_total, descuento = greatest(v_bruto - v_total, 0)
   WHERE id = v_id;

  RETURN jsonb_build_object('cotizacion_id', v_id, 'numero', v_numero, 'total', v_total);
END;
$$;
REVOKE ALL ON FUNCTION public.com_crear_cotizacion(jsonb, text, text, text, numeric, integer, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.com_crear_cotizacion(jsonb, text, text, text, numeric, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.com_estado_cotizacion(p_id uuid, p_estado text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  c record;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_estado NOT IN ('enviada', 'aprobada', 'rechazada') THEN RAISE EXCEPTION 'Estado no válido.'; END IF;
  SELECT * INTO c FROM public.com_cotizaciones WHERE id = p_id AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La cotización no existe.'; END IF;
  IF c.estado = 'convertida' THEN RAISE EXCEPTION 'Esta cotización ya se convirtió en venta.'; END IF;
  UPDATE public.com_cotizaciones SET estado = p_estado WHERE id = p_id;
END;
$$;
REVOKE ALL ON FUNCTION public.com_estado_cotizacion(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.com_estado_cotizacion(uuid, text) TO authenticated;

-- Convierte la cotización en una venta real (descuenta inventario, cobra o fía, caja y contabilidad).
CREATE OR REPLACE FUNCTION public.com_convertir_cotizacion(p_id uuid, p_metodo text, p_autorizar boolean, p_motivo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  c record;
  v_items jsonb;
  v_res jsonb;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO c FROM public.com_cotizaciones WHERE id = p_id AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La cotización no existe.'; END IF;
  IF c.estado = 'convertida' THEN RAISE EXCEPTION 'Esta cotización ya se convirtió en venta.'; END IF;
  IF c.estado = 'rechazada' THEN RAISE EXCEPTION 'Esta cotización fue rechazada.'; END IF;
  SELECT jsonb_agg(jsonb_build_object('producto_id', i.producto_id, 'cantidad', i.cantidad, 'unidad', i.unidad))
    INTO v_items FROM public.com_cotizacion_items i WHERE i.cotizacion_id = c.id;

  PERFORM set_config('gosaryc.com_descuento', c.descuento_pct::text, true);
  v_res := public.com_registrar_venta(v_items, c.cliente, coalesce(c.telefono, ''), c.tipo_precio, p_metodo, p_autorizar, p_motivo);
  PERFORM set_config('gosaryc.com_descuento', '', true);

  UPDATE public.com_cotizaciones SET estado = 'convertida', venta_id = (v_res ->> 'venta_id')::uuid WHERE id = c.id;
  RETURN v_res;
END;
$$;
REVOKE ALL ON FUNCTION public.com_convertir_cotizacion(uuid, text, boolean, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.com_convertir_cotizacion(uuid, text, boolean, text) TO authenticated;

-- ============================================================
-- 7. Desposte / transformación (carnicería y fruver): rendimiento, costo real por kilo limpio y merma
--    Los pesos se reciben en kilos. Lo que entra baja del inventario de origen, los cortes suben
--    con su costo real y la merma queda registrada en inventario (renglones) y en Contabilidad.
-- ============================================================
CREATE OR REPLACE FUNCTION public.com_registrar_desposte(
  p_origen uuid, p_descripcion text, p_peso_entrada numeric, p_costo_total numeric,
  p_salidas jsonb, p_mermas jsonb, p_notas text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v_id uuid := gen_random_uuid();
  o record;
  p record;
  s jsonb;
  v_desc text;
  v_costo numeric;
  v_base_in numeric := 0;
  v_util numeric := 0;
  v_decl numeric := 0;
  v_merma numeric;
  v_ckl numeric;
  v_kg numeric;
  v_base numeric;
  v_cu numeric;
  v_valor_merma numeric;
  v_tipo_m text;
  v_corto text := upper(left(v_id::text, 6));
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_peso_entrada IS NULL OR p_peso_entrada <= 0 THEN RAISE EXCEPTION 'Escribe el peso que entra (en kilos).'; END IF;
  IF p_salidas IS NULL OR jsonb_typeof(p_salidas) <> 'array' OR jsonb_array_length(p_salidas) = 0 THEN
    RAISE EXCEPTION 'Agrega al menos un corte o categoría de salida.';
  END IF;

  SELECT coalesce(sum((x ->> 'peso')::numeric), 0) INTO v_util FROM jsonb_array_elements(p_salidas) x;
  IF v_util <= 0 THEN RAISE EXCEPTION 'Los pesos de los cortes deben ser mayores a cero.'; END IF;
  IF v_util > p_peso_entrada * 1.0001 THEN RAISE EXCEPTION 'Los cortes pesan más de lo que entró.'; END IF;
  v_merma := greatest(p_peso_entrada - v_util, 0);
  IF p_mermas IS NOT NULL AND jsonb_typeof(p_mermas) = 'array' THEN
    SELECT coalesce(sum((x ->> 'peso')::numeric), 0) INTO v_decl FROM jsonb_array_elements(p_mermas) x;
    IF v_decl > v_merma + 0.0005 THEN RAISE EXCEPTION 'Hueso y desperdicio pesan más que la diferencia entre lo que entró y los cortes.'; END IF;
  END IF;

  IF p_origen IS NOT NULL THEN
    SELECT * INTO o FROM public.com_productos WHERE id = p_origen AND owner_id = v_owner AND activo FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'El producto de origen no existe.'; END IF;
    v_base_in := public.com_convertir(p_peso_entrada, 'kg', o.unidad_base, o.unidades_por_caja);
    IF o.stock < v_base_in THEN
      RAISE EXCEPTION 'No hay suficiente % (quedan % %).', o.nombre, round(o.stock, 3), o.unidad_base;
    END IF;
    v_desc := o.nombre;
    v_costo := coalesce(nullif(p_costo_total, 0), round(v_base_in * o.costo, 2));
  ELSE
    v_desc := nullif(trim(coalesce(p_descripcion, '')), '');
    IF v_desc IS NULL THEN RAISE EXCEPTION 'Describe lo que entra (por ejemplo: canal de res).'; END IF;
    v_costo := p_costo_total;
  END IF;
  IF v_costo IS NULL OR v_costo <= 0 THEN RAISE EXCEPTION 'Indica el costo total de lo que entra al desposte.'; END IF;

  v_ckl := round(v_costo / v_util, 4);
  v_valor_merma := round(v_merma * (v_costo / p_peso_entrada), 2);

  INSERT INTO public.com_despostes (id, owner_id, tipo_negocio, origen_id, descripcion, peso_entrada, costo_total, peso_util,
                                    merma_kg, merma_valor, costo_kilo_limpio, rendimiento_pct, notas, registrado_por)
  VALUES (v_id, v_owner, v_tipo, p_origen, v_desc, p_peso_entrada, v_costo, v_util, v_merma, v_valor_merma, v_ckl,
          round(v_util / p_peso_entrada * 100, 2), nullif(trim(coalesce(p_notas, '')), ''), coalesce(auth.jwt() ->> 'email', ''));

  -- Entrada: baja del inventario de origen (queda en el historial de inventario).
  IF p_origen IS NOT NULL THEN
    PERFORM set_config('gosaryc.com_motivo', 'Desposte ' || v_corto || ': entrada (merma ' || round(v_merma, 3) || ' kg)', true);
    UPDATE public.com_productos SET stock = o.stock - v_base_in WHERE id = o.id;
  END IF;

  -- Salidas: suben los cortes con su costo real por kilo limpio (costo promedio ponderado).
  FOR s IN SELECT * FROM jsonb_array_elements(p_salidas) LOOP
    v_kg := (s ->> 'peso')::numeric;
    IF v_kg IS NULL OR v_kg <= 0 THEN RAISE EXCEPTION 'Cada corte debe tener un peso mayor a cero.'; END IF;
    SELECT * INTO p FROM public.com_productos WHERE id = (s ->> 'producto_id')::uuid AND owner_id = v_owner AND activo FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Un corte de la lista ya no existe como producto.'; END IF;
    IF p_origen IS NOT NULL AND p.id = p_origen THEN RAISE EXCEPTION 'Un corte no puede ser el mismo producto que entra.'; END IF;
    v_base := public.com_convertir(v_kg, 'kg', p.unidad_base, p.unidades_por_caja);
    v_cu := round(v_ckl * public.com_convertir(1, p.unidad_base, 'kg', p.unidades_por_caja), 4);
    PERFORM set_config('gosaryc.com_motivo', 'Desposte ' || v_corto || ': corte', true);
    UPDATE public.com_productos
       SET stock = p.stock + v_base,
           costo = CASE WHEN p.stock + v_base > 0 THEN round((p.stock * p.costo + v_base * v_cu) / (p.stock + v_base), 4) ELSE v_cu END
     WHERE id = p.id;
    INSERT INTO public.com_desposte_items (owner_id, tipo_negocio, desposte_id, producto_id, tipo, nombre, peso_kg, valor)
    VALUES (v_owner, v_tipo, v_id, p.id, 'corte', p.nombre, v_kg, round(v_kg * v_ckl, 2));
  END LOOP;

  -- Merma: hueso, grasa y desperdicio declarados, más lo que no se clasificó.
  IF p_mermas IS NOT NULL AND jsonb_typeof(p_mermas) = 'array' THEN
    FOR s IN SELECT * FROM jsonb_array_elements(p_mermas) LOOP
      v_kg := (s ->> 'peso')::numeric;
      CONTINUE WHEN v_kg IS NULL OR v_kg <= 0;
      v_tipo_m := CASE WHEN (s ->> 'tipo') IN ('hueso', 'grasa', 'desperdicio', 'merma') THEN s ->> 'tipo' ELSE 'merma' END;
      INSERT INTO public.com_desposte_items (owner_id, tipo_negocio, desposte_id, tipo, nombre, peso_kg, valor)
      VALUES (v_owner, v_tipo, v_id, v_tipo_m, initcap(v_tipo_m), v_kg, round(v_kg * (v_costo / p_peso_entrada), 2));
    END LOOP;
  END IF;
  IF v_merma - v_decl > 0.0005 THEN
    INSERT INTO public.com_desposte_items (owner_id, tipo_negocio, desposte_id, tipo, nombre, peso_kg, valor)
    VALUES (v_owner, v_tipo, v_id, 'merma', 'Merma sin clasificar', round(v_merma - v_decl, 3), round((v_merma - v_decl) * (v_costo / p_peso_entrada), 2));
  END IF;

  -- Contabilidad: la merma se registra como pérdida al costo de lo que entró.
  IF v_valor_merma > 0 THEN
    BEGIN
      PERFORM public.pan_asegurar_cuenta(v_owner, v_tipo, '5199', 'Mermas y desperdicios', 'gasto');
      PERFORM public.registrar_asiento_movimiento(v_owner, v_tipo, 'Merma de desposte: ' || v_desc, 'com_desposte', v_id,
        jsonb_build_array(jsonb_build_object('codigo', '5199', 'debe', v_valor_merma),
                          jsonb_build_object('codigo', '1435', 'haber', v_valor_merma)));
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'No se pudo registrar el asiento del desposte %: %', v_id, SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object('desposte_id', v_id, 'costo_kilo_limpio', v_ckl, 'rendimiento_pct', round(v_util / p_peso_entrada * 100, 2),
                            'merma_kg', v_merma, 'merma_valor', v_valor_merma);
END;
$$;
REVOKE ALL ON FUNCTION public.com_registrar_desposte(uuid, text, numeric, numeric, jsonb, jsonb, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.com_registrar_desposte(uuid, text, numeric, numeric, jsonb, jsonb, text) TO authenticated;
