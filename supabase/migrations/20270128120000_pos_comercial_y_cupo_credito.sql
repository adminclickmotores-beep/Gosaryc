-- POS COMERCIAL (Tienda, Supermercado, Ferretería, Carnicería y Fruver) + CUPO DE CRÉDITO EN FIADOS
-- Productos con código de barras / SKU, venta por peso o fracción, precios múltiples e IVA / Impoconsumo,
-- venta con descuento real de inventario, y fiados con cupo máximo y bloqueo automático.
-- Todo con owner_id = mi_negocio_id() y RLS estricto. No borra ni trunca datos.

-- ============================================================
-- 1. Productos comerciales
-- ============================================================
CREATE TABLE IF NOT EXISTS public.com_productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 1),
  codigo_barras text,
  sku text,
  -- Unidad en la que se guarda el inventario y a la que se refieren los precios.
  unidad_base text NOT NULL DEFAULT 'und' CHECK (unidad_base IN ('und', 'caja', 'g', 'kg', 'lb', 'cm', 'm', 'ml', 'l')),
  -- Unidades sueltas que trae una caja (para vender caja o unidad suelta con conversión).
  unidades_por_caja numeric CHECK (unidades_por_caja IS NULL OR unidades_por_caja > 0),
  precio_detal numeric NOT NULL DEFAULT 0 CHECK (precio_detal >= 0),
  precio_mayorista numeric CHECK (precio_mayorista IS NULL OR precio_mayorista >= 0),
  precio_especial numeric CHECK (precio_especial IS NULL OR precio_especial >= 0),
  tipo_impuesto text NOT NULL DEFAULT 'exento' CHECK (tipo_impuesto IN ('iva', 'impoconsumo', 'exento')),
  impuesto_pct numeric NOT NULL DEFAULT 0 CHECK (impuesto_pct >= 0 AND impuesto_pct <= 100),
  precio_incluye_impuesto boolean NOT NULL DEFAULT true,
  stock numeric NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo numeric NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  costo numeric NOT NULL DEFAULT 0 CHECK (costo >= 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS com_productos_barras_uq ON public.com_productos (owner_id, codigo_barras) WHERE codigo_barras IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS com_productos_sku_uq ON public.com_productos (owner_id, sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS com_productos_owner_idx ON public.com_productos (owner_id, nombre);

-- Historial de inventario: cada cambio de stock queda registrado y no se borra.
CREATE TABLE IF NOT EXISTS public.com_movimientos_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  producto_id uuid NOT NULL REFERENCES public.com_productos(id) ON DELETE RESTRICT,
  delta numeric NOT NULL,
  stock_resultante numeric NOT NULL,
  motivo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS com_movimientos_stock_idx ON public.com_movimientos_stock (owner_id, created_at DESC);

-- ============================================================
-- 2. Ventas (solo se crean con la función com_registrar_venta)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.com_ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cliente text,
  telefono text,
  tipo_precio text NOT NULL DEFAULT 'detal' CHECK (tipo_precio IN ('detal', 'mayorista', 'especial')),
  metodo text NOT NULL DEFAULT 'efectivo',
  base numeric NOT NULL DEFAULT 0,
  iva numeric NOT NULL DEFAULT 0,
  impoconsumo numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  fiado_id uuid,
  autorizado_por uuid,
  motivo_autorizacion text,
  registrado_por text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS com_ventas_owner_idx ON public.com_ventas (owner_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.com_venta_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  venta_id uuid NOT NULL REFERENCES public.com_ventas(id) ON DELETE RESTRICT,
  producto_id uuid NOT NULL REFERENCES public.com_productos(id) ON DELETE RESTRICT,
  nombre text NOT NULL,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  unidad text NOT NULL,
  cantidad_base numeric NOT NULL CHECK (cantidad_base > 0),
  precio_base numeric NOT NULL DEFAULT 0,
  base numeric NOT NULL DEFAULT 0,
  tipo_impuesto text NOT NULL DEFAULT 'exento',
  impuesto_pct numeric NOT NULL DEFAULT 0,
  impuesto numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS com_venta_items_venta_idx ON public.com_venta_items (venta_id);

-- ============================================================
-- 3. Cupo de crédito y plazo por cliente
-- ============================================================
CREATE TABLE IF NOT EXISTS public.com_cupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cliente_clave text NOT NULL,
  cliente text NOT NULL,
  telefono text,
  cupo_maximo numeric NOT NULL DEFAULT 0 CHECK (cupo_maximo >= 0),
  plazo_dias integer NOT NULL DEFAULT 30 CHECK (plazo_dias >= 0 AND plazo_dias <= 365),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, cliente_clave)
);

-- ============================================================
-- 4. RLS estricto
-- ============================================================
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['com_productos', 'com_movimientos_stock', 'com_ventas', 'com_venta_items', 'com_cupos'] LOOP
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

  -- Productos: el personal los crea y edita (no se borran: se desactivan).
  DROP POLICY IF EXISTS "com_productos_crear" ON public.com_productos;
  CREATE POLICY "com_productos_crear" ON public.com_productos FOR INSERT TO authenticated
    WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
  DROP POLICY IF EXISTS "com_productos_editar" ON public.com_productos;
  CREATE POLICY "com_productos_editar" ON public.com_productos FOR UPDATE TO authenticated
    USING (owner_id = public.mi_negocio_id() AND public.es_personal())
    WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());

  -- Cupos de crédito: solo el dueño los fija o cambia.
  DROP POLICY IF EXISTS "com_cupos_crear" ON public.com_cupos;
  CREATE POLICY "com_cupos_crear" ON public.com_cupos FOR INSERT TO authenticated
    WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_admin());
  DROP POLICY IF EXISTS "com_cupos_editar" ON public.com_cupos;
  CREATE POLICY "com_cupos_editar" ON public.com_cupos FOR UPDATE TO authenticated
    USING (owner_id = public.mi_negocio_id() AND public.es_admin())
    WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_admin());

  -- Ventas, renglones e historial de inventario: sin INSERT/UPDATE directos y sin borrado físico.
  FOREACH t IN ARRAY ARRAY['com_productos', 'com_movimientos_stock', 'com_ventas', 'com_venta_items', 'com_cupos'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero()', t);
  END LOOP;
END $$;

-- Fiados: refuerzo del borrado prohibido (por si faltaba el disparador).
DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.fiados;
CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.fiados
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero();

-- ============================================================
-- 5. Historial de inventario automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.com_registrar_mov_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_delta numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_delta := NEW.stock;
  ELSE
    v_delta := NEW.stock - OLD.stock;
  END IF;
  IF v_delta <> 0 THEN
    INSERT INTO public.com_movimientos_stock (owner_id, tipo_negocio, producto_id, delta, stock_resultante, motivo)
    VALUES (NEW.owner_id, NEW.tipo_negocio, NEW.id, v_delta, NEW.stock,
            coalesce(nullif(current_setting('gosaryc.com_motivo', true), ''), CASE WHEN TG_OP = 'INSERT' THEN 'Stock inicial' ELSE 'Ajuste manual' END));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_com_mov_stock ON public.com_productos;
CREATE TRIGGER trg_com_mov_stock AFTER INSERT OR UPDATE OF stock ON public.com_productos
  FOR EACH ROW EXECUTE FUNCTION public.com_registrar_mov_stock();

-- ============================================================
-- 6. Conversión de unidades (peso, longitud, volumen y caja a unidades sueltas)
-- ============================================================
CREATE OR REPLACE FUNCTION public.com_familia_unidad(p_u text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE p_u WHEN 'g' THEN 'masa' WHEN 'kg' THEN 'masa' WHEN 'lb' THEN 'masa'
    WHEN 'cm' THEN 'longitud' WHEN 'm' THEN 'longitud'
    WHEN 'ml' THEN 'volumen' WHEN 'l' THEN 'volumen'
    WHEN 'und' THEN 'conteo' WHEN 'caja' THEN 'conteo' ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION public.com_convertir(p_cant numeric, p_de text, p_a text, p_caja numeric)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_de numeric;
  v_a numeric;
BEGIN
  IF p_de = p_a THEN RETURN p_cant; END IF;
  IF public.com_familia_unidad(p_de) IS NULL OR public.com_familia_unidad(p_a) IS NULL
     OR public.com_familia_unidad(p_de) <> public.com_familia_unidad(p_a) THEN
    RAISE EXCEPTION 'No se puede convertir % a %.', p_de, p_a;
  END IF;
  v_de := CASE p_de WHEN 'kg' THEN 1000 WHEN 'lb' THEN 453.592 WHEN 'm' THEN 100 WHEN 'l' THEN 1000
    WHEN 'caja' THEN p_caja ELSE 1 END;
  v_a := CASE p_a WHEN 'kg' THEN 1000 WHEN 'lb' THEN 453.592 WHEN 'm' THEN 100 WHEN 'l' THEN 1000
    WHEN 'caja' THEN p_caja ELSE 1 END;
  IF v_de IS NULL OR v_a IS NULL THEN
    RAISE EXCEPTION 'Este producto no tiene definidas las unidades por caja.';
  END IF;
  RETURN p_cant * v_de / v_a;
END;
$$;

CREATE OR REPLACE FUNCTION public.com_clave_cliente(p_nombre text, p_tel text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(nullif(regexp_replace(coalesce(p_tel, ''), '\D', '', 'g'), ''), lower(trim(coalesce(p_nombre, ''))));
$$;

-- ============================================================
-- 7. Estado de crédito de un cliente: cupo, deuda, vencido y disponible
-- ============================================================
CREATE OR REPLACE FUNCTION public.com_estado_credito(p_cliente text, p_telefono text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_clave text := public.com_clave_cliente(p_cliente, p_telefono);
  v_nombre text := lower(trim(coalesce(p_cliente, '')));
  c record;
  v_deuda numeric;
  v_vencido numeric;
  v_cupo numeric := 0;
  v_plazo integer := 30;
  v_tiene boolean;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO c FROM public.com_cupos
   WHERE owner_id = v_owner AND (cliente_clave = v_clave OR cliente_clave = v_nombre) LIMIT 1;
  v_tiene := FOUND;
  IF v_tiene THEN v_cupo := c.cupo_maximo; v_plazo := c.plazo_dias; END IF;

  SELECT coalesce(sum(f.monto - f.abonado), 0),
         coalesce(sum(f.monto - f.abonado) FILTER (WHERE f.fecha IS NOT NULL AND f.fecha < current_date), 0)
    INTO v_deuda, v_vencido
    FROM public.fiados f
   WHERE f.owner_id = v_owner AND NOT f.anulado AND f.estado <> 'pagado' AND f.monto - f.abonado > 0
     AND (public.com_clave_cliente(coalesce(f.contacto, f.titulo), f.telefono) = v_clave
          OR lower(trim(coalesce(f.contacto, f.titulo, ''))) = v_nombre);

  RETURN jsonb_build_object(
    'tiene_cupo', v_tiene,
    'cupo', v_cupo, 'plazo_dias', v_plazo, 'deuda', v_deuda, 'vencido', v_vencido,
    'disponible', greatest(v_cupo - v_deuda, 0));
END;
$$;
REVOKE ALL ON FUNCTION public.com_estado_credito(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.com_estado_credito(text, text) TO authenticated;

-- ============================================================
-- 8. Registrar una venta: descuenta la fracción real, discrimina impuestos,
--    cobra o fía (con cupo) y lo manda a Caja y Contabilidad
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
