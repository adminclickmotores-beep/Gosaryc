-- Vistas dedicadas con cobro a Caja y asiento contable para los 3 sectores nuevos:
--   cv_*  Compraventa / casa de empeño (contratos de retroventa, prórrogas, rescate, paso a venta, compras a particulares)
--   dis_* Distribuidora mayorista (precios escalonados por canal, pedidos por caja/paca/bulto, rutas, cupo y cartera)
--   mot_* Taller de motos (orden por placa, checklist, fotos, mecánico con comisión, repuestos del inventario, entrega con cobro)
-- Además: guarda en base de datos contra cruce de horarios en la agenda de belleza.
-- Todo con owner_id = mi_negocio_id(), RLS estricto, sin borrado físico y asiento cuadrado. Nada se borra ni trunca.

-- ============================================================
-- 0. Ayudas
-- ============================================================
CREATE OR REPLACE FUNCTION public.neg_asegurar_t3(p_owner uuid, p_tipo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.neg_asegurar_t2(p_owner, p_tipo);
  PERFORM public.pan_asegurar_cuenta(p_owner, p_tipo, '2205', 'Proveedores', 'pasivo');
  PERFORM public.pan_asegurar_cuenta(p_owner, p_tipo, '2505', 'Comisiones por pagar', 'pasivo');
  PERFORM public.pan_asegurar_cuenta(p_owner, p_tipo, '6135', 'Costo de ventas', 'gasto');
END;
$$;
REVOKE ALL ON FUNCTION public.neg_asegurar_t3(uuid, text) FROM public, anon, authenticated;

-- ============================================================
-- 1. Tablas
-- ============================================================
-- Compraventa / empeño
CREATE TABLE IF NOT EXISTS public.cv_articulos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  descripcion text,
  fotos text[] NOT NULL DEFAULT '{}',
  origen text NOT NULL DEFAULT 'compra' CHECK (origen IN ('compra', 'empeno_vencido')),
  contrato_id uuid,
  vendedor text,
  vendedor_doc text,
  vendedor_tel text,
  costo numeric NOT NULL DEFAULT 0 CHECK (costo >= 0),
  precio_venta numeric NOT NULL DEFAULT 0 CHECK (precio_venta >= 0),
  ubicacion text,
  estado text NOT NULL DEFAULT 'en_venta' CHECK (estado IN ('en_venta', 'vendido')),
  precio_vendido numeric,
  metodo text,
  recibo text,
  vendido_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cv_contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  numero text NOT NULL,
  articulo text NOT NULL CHECK (length(trim(articulo)) >= 2),
  descripcion text,
  fotos text[] NOT NULL DEFAULT '{}',
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  documento text,
  telefono text,
  avaluo numeric NOT NULL DEFAULT 0 CHECK (avaluo >= 0),
  prestado numeric NOT NULL CHECK (prestado > 0),
  plazo_dias integer NOT NULL CHECK (plazo_dias BETWEEN 1 AND 365),
  retroventa_pct numeric NOT NULL DEFAULT 0 CHECK (retroventa_pct BETWEEN 0 AND 100),
  inicio date NOT NULL DEFAULT current_date,
  vence date NOT NULL,
  prorrogas integer NOT NULL DEFAULT 0,
  estado text NOT NULL DEFAULT 'vigente' CHECK (estado IN ('vigente', 'rescatado', 'en_venta', 'vendido')),
  articulo_id uuid REFERENCES public.cv_articulos(id) ON DELETE RESTRICT,
  metodo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cv_contratos_owner_idx ON public.cv_contratos (owner_id, estado, vence);

CREATE TABLE IF NOT EXISTS public.cv_movimientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  contrato_id uuid NOT NULL REFERENCES public.cv_contratos(id) ON DELETE RESTRICT,
  numero text NOT NULL,
  articulo text NOT NULL,
  cliente text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('prorroga', 'rescate')),
  capital numeric NOT NULL DEFAULT 0,
  interes numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  vence_anterior date,
  vence_nuevo date,
  metodo text NOT NULL DEFAULT 'efectivo',
  recibo text NOT NULL,
  fecha date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Distribuidora
CREATE TABLE IF NOT EXISTS public.dis_rutas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  vendedor text,
  vehiculo text,
  zona text,
  dias text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dis_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  documento text,
  telefono text,
  direccion text,
  canal text NOT NULL DEFAULT 'tienda' CHECK (canal IN ('mayorista', 'distribuidor', 'tienda')),
  cupo_credito numeric NOT NULL DEFAULT 0 CHECK (cupo_credito >= 0),
  saldo numeric NOT NULL DEFAULT 0,
  ruta_id uuid REFERENCES public.dis_rutas(id) ON DELETE RESTRICT,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dis_productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  sku text,
  presentacion text NOT NULL DEFAULT 'caja' CHECK (presentacion IN ('unidad', 'caja', 'paca', 'bulto')),
  unidades_por_presentacion integer NOT NULL DEFAULT 1 CHECK (unidades_por_presentacion >= 1),
  stock_unidades numeric NOT NULL DEFAULT 0 CHECK (stock_unidades >= 0),
  costo_unidad numeric NOT NULL DEFAULT 0 CHECK (costo_unidad >= 0),
  precio_unidad numeric NOT NULL DEFAULT 0 CHECK (precio_unidad >= 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dis_precios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  producto_id uuid NOT NULL REFERENCES public.dis_productos(id) ON DELETE RESTRICT,
  canal text NOT NULL CHECK (canal IN ('mayorista', 'distribuidor', 'tienda')),
  desde_unidades integer NOT NULL CHECK (desde_unidades >= 1),
  precio_unidad numeric NOT NULL CHECK (precio_unidad >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS dis_precios_escalon_idx ON public.dis_precios (owner_id, producto_id, canal, desde_unidades);

CREATE TABLE IF NOT EXISTS public.dis_pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  numero text NOT NULL,
  cliente_id uuid NOT NULL REFERENCES public.dis_clientes(id) ON DELETE RESTRICT,
  cliente text NOT NULL,
  canal text NOT NULL,
  ruta_id uuid REFERENCES public.dis_rutas(id) ON DELETE RESTRICT,
  ruta text,
  fecha date NOT NULL DEFAULT current_date,
  fecha_entrega date,
  condicion text NOT NULL DEFAULT 'contado' CHECK (condicion IN ('contado', 'credito')),
  estado text NOT NULL DEFAULT 'preventa' CHECK (estado IN ('preventa', 'despachado', 'cancelado')),
  total numeric NOT NULL DEFAULT 0,
  metodo text,
  despachado_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS dis_pedidos_owner_idx ON public.dis_pedidos (owner_id, estado, fecha DESC);

CREATE TABLE IF NOT EXISTS public.dis_pedido_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  pedido_id uuid NOT NULL REFERENCES public.dis_pedidos(id) ON DELETE RESTRICT,
  producto_id uuid NOT NULL REFERENCES public.dis_productos(id) ON DELETE RESTRICT,
  nombre text NOT NULL,
  presentacion text NOT NULL,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  unidades numeric NOT NULL CHECK (unidades > 0),
  precio_unidad numeric NOT NULL,
  costo_unidad numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dis_abonos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cliente_id uuid NOT NULL REFERENCES public.dis_clientes(id) ON DELETE RESTRICT,
  cliente text NOT NULL,
  monto numeric NOT NULL CHECK (monto > 0),
  metodo text NOT NULL DEFAULT 'efectivo',
  recibo text NOT NULL,
  fecha date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Taller de motos
CREATE TABLE IF NOT EXISTS public.mot_mecanicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  comision_pct numeric NOT NULL DEFAULT 0 CHECK (comision_pct BETWEEN 0 AND 100),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mot_repuestos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  referencia text,
  proveedor text,
  stock numeric NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo numeric NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  costo numeric NOT NULL DEFAULT 0 CHECK (costo >= 0),
  precio numeric NOT NULL DEFAULT 0 CHECK (precio >= 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mot_ordenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  numero text NOT NULL DEFAULT ('OT-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(md5(random()::text), 1, 4))),
  placa text NOT NULL CHECK (length(trim(placa)) >= 4),
  marca text,
  cilindraje integer CHECK (cilindraje IS NULL OR cilindraje > 0),
  kilometraje integer NOT NULL DEFAULT 0 CHECK (kilometraje >= 0),
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  documento text,
  telefono text,
  falla text NOT NULL CHECK (length(trim(falla)) >= 3),
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  fotos text[] NOT NULL DEFAULT '{}',
  mecanico_id uuid REFERENCES public.mot_mecanicos(id) ON DELETE RESTRICT,
  mecanico text,
  estado text NOT NULL DEFAULT 'recibida' CHECK (estado IN ('recibida', 'en_reparacion', 'lista', 'entregada', 'cancelada')),
  mano_obra numeric NOT NULL DEFAULT 0 CHECK (mano_obra >= 0),
  repuestos_total numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  comision_pct numeric NOT NULL DEFAULT 0,
  comision numeric NOT NULL DEFAULT 0,
  comision_pagada boolean NOT NULL DEFAULT false,
  pagado boolean NOT NULL DEFAULT false,
  metodo text,
  prox_mantenimiento date,
  entregada_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS mot_ordenes_owner_idx ON public.mot_ordenes (owner_id, estado, created_at DESC);

CREATE TABLE IF NOT EXISTS public.mot_orden_repuestos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  orden_id uuid NOT NULL REFERENCES public.mot_ordenes(id) ON DELETE RESTRICT,
  repuesto_id uuid NOT NULL REFERENCES public.mot_repuestos(id) ON DELETE RESTRICT,
  nombre text NOT NULL,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  precio numeric NOT NULL,
  costo numeric NOT NULL DEFAULT 0,
  subtotal numeric NOT NULL,
  anulado boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. RLS estricto, sin borrado físico
-- ============================================================
DO $$
DECLARE
  t text;
  todas text[] := ARRAY[
    'cv_articulos', 'cv_contratos', 'cv_movimientos',
    'dis_rutas', 'dis_clientes', 'dis_productos', 'dis_precios', 'dis_pedidos', 'dis_pedido_items', 'dis_abonos',
    'mot_mecanicos', 'mot_repuestos', 'mot_ordenes', 'mot_orden_repuestos'];
  editables text[] := ARRAY['cv_articulos', 'dis_rutas', 'dis_clientes', 'dis_productos', 'dis_precios', 'mot_mecanicos', 'mot_repuestos', 'mot_ordenes'];
  insertables text[] := ARRAY['dis_rutas', 'dis_clientes', 'dis_productos', 'dis_precios', 'mot_mecanicos', 'mot_repuestos', 'mot_ordenes'];
BEGIN
  FOREACH t IN ARRAY todas LOOP
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
  FOREACH t IN ARRAY editables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_editar', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal()) WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_editar', t);
  END LOOP;
  FOREACH t IN ARRAY insertables LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_crear', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_crear', t);
  END LOOP;
END $$;

-- Altas directas seguras
DROP POLICY IF EXISTS dis_clientes_alta_segura ON public.dis_clientes;
CREATE POLICY dis_clientes_alta_segura ON public.dis_clientes AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (saldo = 0 AND (ruta_id IS NULL OR EXISTS (SELECT 1 FROM public.dis_rutas r WHERE r.id = ruta_id AND r.owner_id = public.mi_negocio_id())));
DROP POLICY IF EXISTS dis_precios_alta_ref ON public.dis_precios;
CREATE POLICY dis_precios_alta_ref ON public.dis_precios AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.dis_productos p WHERE p.id = producto_id AND p.owner_id = public.mi_negocio_id()));
DROP POLICY IF EXISTS mot_ordenes_alta_segura ON public.mot_ordenes;
CREATE POLICY mot_ordenes_alta_segura ON public.mot_ordenes AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (estado = 'recibida' AND repuestos_total = 0 AND total = 0 AND comision = 0 AND comision_pct = 0 AND pagado = false AND comision_pagada = false AND metodo IS NULL
    AND (mecanico_id IS NULL OR EXISTS (SELECT 1 FROM public.mot_mecanicos m WHERE m.id = mecanico_id AND m.owner_id = public.mi_negocio_id()))
    AND NOT EXISTS (SELECT 1 FROM unnest(fotos) f WHERE f NOT LIKE owner_id::text || '/%'));
DROP POLICY IF EXISTS mot_ordenes_editar_fotos ON public.mot_ordenes;
CREATE POLICY mot_ordenes_editar_fotos ON public.mot_ordenes AS RESTRICTIVE FOR UPDATE TO authenticated
  WITH CHECK (NOT EXISTS (SELECT 1 FROM unnest(fotos) f WHERE f NOT LIKE owner_id::text || '/%')
    AND (mecanico_id IS NULL OR EXISTS (SELECT 1 FROM public.mot_mecanicos m WHERE m.id = mecanico_id AND m.owner_id = public.mi_negocio_id())));

-- Campos y estados que solo cambian desde su acción
DROP TRIGGER IF EXISTS trg_cv_articulos_proteger ON public.cv_articulos;
CREATE TRIGGER trg_cv_articulos_proteger BEFORE UPDATE ON public.cv_articulos FOR EACH ROW
  EXECUTE FUNCTION public.neg_proteger_campos('costo', 'origen', 'contrato_id', 'precio_vendido', 'metodo', 'recibo', 'vendido_en');
DROP TRIGGER IF EXISTS trg_cv_articulos_estado ON public.cv_articulos;
CREATE TRIGGER trg_cv_articulos_estado BEFORE UPDATE ON public.cv_articulos FOR EACH ROW
  EXECUTE FUNCTION public.neg_proteger_estado('vendido');
DROP TRIGGER IF EXISTS trg_dis_clientes_proteger ON public.dis_clientes;
CREATE TRIGGER trg_dis_clientes_proteger BEFORE UPDATE ON public.dis_clientes FOR EACH ROW
  EXECUTE FUNCTION public.neg_proteger_campos('saldo');
DROP TRIGGER IF EXISTS trg_dis_productos_proteger ON public.dis_productos;
CREATE TRIGGER trg_dis_productos_proteger BEFORE UPDATE ON public.dis_productos FOR EACH ROW
  EXECUTE FUNCTION public.neg_proteger_campos('stock_unidades', 'costo_unidad');
DROP TRIGGER IF EXISTS trg_mot_repuestos_proteger ON public.mot_repuestos;
CREATE TRIGGER trg_mot_repuestos_proteger BEFORE UPDATE ON public.mot_repuestos FOR EACH ROW
  EXECUTE FUNCTION public.neg_proteger_campos('stock');
DROP TRIGGER IF EXISTS trg_mot_ordenes_proteger ON public.mot_ordenes;
CREATE TRIGGER trg_mot_ordenes_proteger BEFORE UPDATE ON public.mot_ordenes FOR EACH ROW
  EXECUTE FUNCTION public.neg_proteger_campos('repuestos_total', 'total', 'comision_pct', 'comision', 'comision_pagada', 'pagado', 'metodo', 'entregada_en');
DROP TRIGGER IF EXISTS trg_mot_ordenes_estado ON public.mot_ordenes;
CREATE TRIGGER trg_mot_ordenes_estado BEFORE UPDATE ON public.mot_ordenes FOR EACH ROW
  EXECUTE FUNCTION public.neg_proteger_estado('entregada', 'cancelada');

CREATE OR REPLACE FUNCTION public.mot_bloquear_entregada()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(current_setting('gosaryc.neg', true), '') = 'on' THEN RETURN NEW; END IF;
  IF OLD.estado = 'entregada' THEN
    RAISE EXCEPTION 'Una orden entregada y cobrada ya no se puede modificar.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_mot_ordenes_entregada ON public.mot_ordenes;
CREATE TRIGGER trg_mot_ordenes_entregada BEFORE UPDATE ON public.mot_ordenes FOR EACH ROW
  EXECUTE FUNCTION public.mot_bloquear_entregada();

-- ============================================================
-- 3. Compraventa / empeño
-- ============================================================
CREATE OR REPLACE FUNCTION public.cv_crear_contrato(
  p_articulo text, p_descripcion text, p_cliente text, p_documento text, p_telefono text,
  p_avaluo numeric, p_prestado numeric, p_plazo_dias integer, p_retroventa_pct numeric, p_fotos text[], p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_prestado numeric := round(coalesce(p_prestado, 0));
  v_id uuid := gen_random_uuid();
  v_num text;
  v_vence date;
  v_fotos text[] := coalesce(p_fotos, '{}');
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF length(trim(coalesce(p_articulo, ''))) < 2 THEN RAISE EXCEPTION 'Describe el artículo.'; END IF;
  IF length(trim(coalesce(p_cliente, ''))) < 2 THEN RAISE EXCEPTION 'Escribe el nombre del cliente.'; END IF;
  IF v_prestado <= 0 THEN RAISE EXCEPTION 'Escribe el valor prestado.'; END IF;
  IF coalesce(p_avaluo, 0) > 0 AND v_prestado > p_avaluo THEN RAISE EXCEPTION 'Lo prestado no puede superar el avalúo del artículo.'; END IF;
  IF coalesce(p_plazo_dias, 0) < 1 OR p_plazo_dias > 365 THEN RAISE EXCEPTION 'El plazo debe estar entre 1 y 365 días.'; END IF;
  IF coalesce(p_retroventa_pct, 0) < 0 OR p_retroventa_pct > 100 THEN RAISE EXCEPTION 'El porcentaje de retroventa debe estar entre 0 y 100.'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_fotos) f WHERE f NOT LIKE v_owner::text || '/%') THEN RAISE EXCEPTION 'Foto no válida.'; END IF;
  PERFORM public.neg_asegurar_t3(v_owner, v_tipo);
  v_num := 'CV-' || to_char(now(), 'YYMM') || '-' || upper(left(v_id::text, 5));
  v_vence := current_date + p_plazo_dias;
  INSERT INTO public.cv_contratos (id, owner_id, tipo_negocio, numero, articulo, descripcion, fotos, cliente, documento, telefono, avaluo, prestado, plazo_dias, retroventa_pct, vence, metodo)
  VALUES (v_id, v_owner, v_tipo, v_num, trim(p_articulo), nullif(trim(coalesce(p_descripcion, '')), ''), v_fotos, trim(p_cliente), nullif(trim(coalesce(p_documento, '')), ''), nullif(trim(coalesce(p_telefono, '')), ''),
          greatest(coalesce(p_avaluo, 0), 0), v_prestado, p_plazo_dias, coalesce(p_retroventa_pct, 0), v_vence, v_metodo);
  PERFORM public.neg_asiento(v_owner, v_tipo, 'Préstamo con prenda ' || v_num, 'cv_prestamo', v_id,
    jsonb_build_array(jsonb_build_object('codigo', '1385', 'debe', v_prestado), jsonb_build_object('codigo', v_cuenta, 'haber', v_prestado)));
  PERFORM public.neg_caja(v_owner, v_tipo, 'Préstamo con prenda ' || v_num || ' · ' || left(trim(p_articulo), 60), false, v_prestado, v_metodo);
  RETURN jsonb_build_object('id', v_id, 'numero', v_num, 'vence', v_vence, 'recompra', v_prestado + round(v_prestado * coalesce(p_retroventa_pct, 0) / 100));
END;
$$;
REVOKE ALL ON FUNCTION public.cv_crear_contrato(text, text, text, text, text, numeric, numeric, integer, numeric, text[], text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cv_crear_contrato(text, text, text, text, text, numeric, numeric, integer, numeric, text[], text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cv_prorrogar(p_contrato uuid, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  c record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_interes numeric;
  v_nuevo date;
  v_id uuid := gen_random_uuid();
  v_recibo text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO c FROM public.cv_contratos WHERE id = p_contrato AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El contrato ya no existe.'; END IF;
  IF c.estado <> 'vigente' THEN RAISE EXCEPTION 'Solo se prorrogan contratos vigentes.'; END IF;
  PERFORM public.neg_asegurar_t3(v_owner, c.tipo_negocio);
  v_interes := round(c.prestado * c.retroventa_pct / 100);
  v_nuevo := greatest(c.vence, current_date) + c.plazo_dias;
  v_recibo := 'PR-' || to_char(now(), 'YYMM') || '-' || upper(left(v_id::text, 5));
  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.cv_contratos SET vence = v_nuevo, prorrogas = prorrogas + 1 WHERE id = c.id;
  INSERT INTO public.cv_movimientos (id, owner_id, tipo_negocio, contrato_id, numero, articulo, cliente, tipo, capital, interes, total, vence_anterior, vence_nuevo, metodo, recibo)
  VALUES (v_id, v_owner, c.tipo_negocio, c.id, c.numero, c.articulo, c.cliente, 'prorroga', 0, v_interes, v_interes, c.vence, v_nuevo, v_metodo, v_recibo);
  IF v_interes > 0 THEN
    PERFORM public.neg_asiento(v_owner, c.tipo_negocio, 'Prórroga ' || c.numero, 'cv_prorroga', v_id,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_interes), jsonb_build_object('codigo', '4210', 'haber', v_interes)));
    PERFORM public.neg_caja(v_owner, c.tipo_negocio, 'Prórroga ' || c.numero || ' · ' || v_recibo, true, v_interes, v_metodo);
  END IF;
  RETURN jsonb_build_object('recibo', v_recibo, 'interes', v_interes, 'vence', v_nuevo);
END;
$$;
REVOKE ALL ON FUNCTION public.cv_prorrogar(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cv_prorrogar(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cv_rescatar(p_contrato uuid, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  c record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_interes numeric;
  v_total numeric;
  v_id uuid := gen_random_uuid();
  v_recibo text;
  v_lineas jsonb;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO c FROM public.cv_contratos WHERE id = p_contrato AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El contrato ya no existe.'; END IF;
  IF c.estado <> 'vigente' THEN RAISE EXCEPTION 'Este contrato ya no está vigente.'; END IF;
  PERFORM public.neg_asegurar_t3(v_owner, c.tipo_negocio);
  v_interes := round(c.prestado * c.retroventa_pct / 100);
  v_total := c.prestado + v_interes;
  v_recibo := 'RS-' || to_char(now(), 'YYMM') || '-' || upper(left(v_id::text, 5));
  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.cv_contratos SET estado = 'rescatado' WHERE id = c.id;
  INSERT INTO public.cv_movimientos (id, owner_id, tipo_negocio, contrato_id, numero, articulo, cliente, tipo, capital, interes, total, vence_anterior, vence_nuevo, metodo, recibo)
  VALUES (v_id, v_owner, c.tipo_negocio, c.id, c.numero, c.articulo, c.cliente, 'rescate', c.prestado, v_interes, v_total, c.vence, c.vence, v_metodo, v_recibo);
  v_lineas := jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_total), jsonb_build_object('codigo', '1385', 'haber', c.prestado));
  IF v_interes > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '4210', 'haber', v_interes)); END IF;
  PERFORM public.neg_asiento(v_owner, c.tipo_negocio, 'Rescate de prenda ' || c.numero, 'cv_rescate', v_id, v_lineas);
  PERFORM public.neg_caja(v_owner, c.tipo_negocio, 'Rescate ' || c.numero || ' · ' || v_recibo, true, v_total, v_metodo);
  RETURN jsonb_build_object('recibo', v_recibo, 'capital', c.prestado, 'interes', v_interes, 'total', v_total);
END;
$$;
REVOKE ALL ON FUNCTION public.cv_rescatar(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cv_rescatar(uuid, text) TO authenticated;

-- Pasa a inventario de venta los contratos vencidos (con días de gracia). Idempotente.
CREATE OR REPLACE FUNCTION public.cv_procesar_vencidos(p_gracia integer, p_margen numeric)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  c record;
  v_art uuid;
  v_n integer := 0;
  v_gracia integer := least(greatest(coalesce(p_gracia, 0), 0), 90);
  v_margen numeric := least(greatest(coalesce(p_margen, 30), 0), 300);
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  PERFORM set_config('gosaryc.neg', 'on', true);
  FOR c IN SELECT * FROM public.cv_contratos WHERE owner_id = v_owner AND estado = 'vigente' AND vence + v_gracia < current_date FOR UPDATE LOOP
    PERFORM public.neg_asegurar_t3(v_owner, c.tipo_negocio);
    v_art := gen_random_uuid();
    INSERT INTO public.cv_articulos (id, owner_id, tipo_negocio, nombre, descripcion, fotos, origen, contrato_id, costo, precio_venta)
    VALUES (v_art, v_owner, c.tipo_negocio, c.articulo, c.descripcion, c.fotos, 'empeno_vencido', c.id, c.prestado, round(c.prestado * (1 + v_margen / 100)));
    UPDATE public.cv_contratos SET estado = 'en_venta', articulo_id = v_art WHERE id = c.id;
    PERFORM public.neg_asiento(v_owner, c.tipo_negocio, 'Prenda vencida a inventario ' || c.numero, 'cv_vencido', v_art,
      jsonb_build_array(jsonb_build_object('codigo', '1435', 'debe', c.prestado), jsonb_build_object('codigo', '1385', 'haber', c.prestado)));
    v_n := v_n + 1;
  END LOOP;
  RETURN v_n;
END;
$$;
REVOKE ALL ON FUNCTION public.cv_procesar_vencidos(integer, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cv_procesar_vencidos(integer, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.cv_comprar(
  p_nombre text, p_descripcion text, p_vendedor text, p_documento text, p_telefono text,
  p_costo numeric, p_precio_venta numeric, p_fotos text[], p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_costo numeric := round(coalesce(p_costo, 0));
  v_id uuid := gen_random_uuid();
  v_fotos text[] := coalesce(p_fotos, '{}');
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF length(trim(coalesce(p_nombre, ''))) < 2 THEN RAISE EXCEPTION 'Describe el artículo.'; END IF;
  IF length(trim(coalesce(p_vendedor, ''))) < 2 OR length(trim(coalesce(p_documento, ''))) < 4 THEN RAISE EXCEPTION 'Escribe el nombre y el documento de quien vende.'; END IF;
  IF v_costo <= 0 THEN RAISE EXCEPTION 'Escribe cuánto pagas por el artículo.'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_fotos) f WHERE f NOT LIKE v_owner::text || '/%') THEN RAISE EXCEPTION 'Foto no válida.'; END IF;
  PERFORM public.neg_asegurar_t3(v_owner, v_tipo);
  INSERT INTO public.cv_articulos (id, owner_id, tipo_negocio, nombre, descripcion, fotos, origen, vendedor, vendedor_doc, vendedor_tel, costo, precio_venta)
  VALUES (v_id, v_owner, v_tipo, trim(p_nombre), nullif(trim(coalesce(p_descripcion, '')), ''), v_fotos, 'compra', trim(p_vendedor), trim(p_documento), nullif(trim(coalesce(p_telefono, '')), ''),
          v_costo, greatest(round(coalesce(p_precio_venta, 0)), 0));
  PERFORM public.neg_asiento(v_owner, v_tipo, 'Compra a particular ' || left(trim(p_nombre), 60), 'cv_compra', v_id,
    jsonb_build_array(jsonb_build_object('codigo', '1435', 'debe', v_costo), jsonb_build_object('codigo', v_cuenta, 'haber', v_costo)));
  PERFORM public.neg_caja(v_owner, v_tipo, 'Compra a particular ' || left(trim(p_nombre), 60), false, v_costo, v_metodo);
  RETURN jsonb_build_object('id', v_id);
END;
$$;
REVOKE ALL ON FUNCTION public.cv_comprar(text, text, text, text, text, numeric, numeric, text[], text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cv_comprar(text, text, text, text, text, numeric, numeric, text[], text) TO authenticated;

CREATE OR REPLACE FUNCTION public.cv_vender(p_articulo uuid, p_precio numeric, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  a record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_precio numeric := round(coalesce(p_precio, 0));
  v_recibo text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF v_precio <= 0 THEN RAISE EXCEPTION 'Escribe el precio de venta.'; END IF;
  SELECT * INTO a FROM public.cv_articulos WHERE id = p_articulo AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El artículo ya no existe.'; END IF;
  IF a.estado <> 'en_venta' THEN RAISE EXCEPTION 'Este artículo ya fue vendido.'; END IF;
  PERFORM public.neg_asegurar_t3(v_owner, a.tipo_negocio);
  v_recibo := 'VT-' || to_char(now(), 'YYMM') || '-' || upper(left(a.id::text, 5));
  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.cv_articulos SET estado = 'vendido', precio_vendido = v_precio, metodo = v_metodo, recibo = v_recibo, vendido_en = now() WHERE id = a.id;
  IF a.contrato_id IS NOT NULL THEN UPDATE public.cv_contratos SET estado = 'vendido' WHERE id = a.contrato_id AND owner_id = v_owner; END IF;
  PERFORM public.neg_asiento(v_owner, a.tipo_negocio, 'Venta de artículo ' || left(a.nombre, 60), 'cv_venta', a.id,
    jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_precio), jsonb_build_object('codigo', '4135', 'haber', v_precio))
    || CASE WHEN a.costo > 0 THEN jsonb_build_array(jsonb_build_object('codigo', '6135', 'debe', a.costo), jsonb_build_object('codigo', '1435', 'haber', a.costo)) ELSE '[]'::jsonb END);
  PERFORM public.neg_caja(v_owner, a.tipo_negocio, 'Venta de artículo ' || left(a.nombre, 60) || ' · ' || v_recibo, true, v_precio, v_metodo);
  RETURN jsonb_build_object('recibo', v_recibo, 'valor', v_precio);
END;
$$;
REVOKE ALL ON FUNCTION public.cv_vender(uuid, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cv_vender(uuid, numeric, text) TO authenticated;

-- ============================================================
-- 4. Distribuidora mayorista
-- ============================================================
CREATE OR REPLACE FUNCTION public.dis_ingresar_stock(p_producto uuid, p_cantidad integer, p_costo_unidad numeric, p_metodo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  p record;
  v_unid numeric;
  v_costo numeric := coalesce(p_costo_unidad, 0);
  v_total numeric;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text;
  v_nuevo_costo numeric;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF coalesce(p_cantidad, 0) <= 0 THEN RAISE EXCEPTION 'Escribe la cantidad que ingresa.'; END IF;
  IF v_costo < 0 THEN RAISE EXCEPTION 'El costo no puede ser negativo.'; END IF;
  SELECT * INTO p FROM public.dis_productos WHERE id = p_producto AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El producto ya no existe.'; END IF;
  PERFORM public.neg_asegurar_t3(v_owner, p.tipo_negocio);
  v_unid := p_cantidad * p.unidades_por_presentacion;
  v_total := round(v_unid * v_costo);
  v_nuevo_costo := CASE WHEN p.stock_unidades + v_unid > 0 THEN round((p.stock_unidades * p.costo_unidad + v_unid * v_costo) / (p.stock_unidades + v_unid), 2) ELSE v_costo END;
  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.dis_productos SET stock_unidades = stock_unidades + v_unid, costo_unidad = v_nuevo_costo WHERE id = p.id;
  IF v_total > 0 THEN
    v_cuenta := CASE WHEN v_metodo = 'credito' THEN '2205' WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
    PERFORM public.neg_asiento(v_owner, p.tipo_negocio, 'Compra de mercancía ' || left(p.nombre, 60), 'dis_compra', p.id,
      jsonb_build_array(jsonb_build_object('codigo', '1435', 'debe', v_total), jsonb_build_object('codigo', v_cuenta, 'haber', v_total)));
    IF v_metodo <> 'credito' THEN
      PERFORM public.neg_caja(v_owner, p.tipo_negocio, 'Compra de mercancía ' || left(p.nombre, 60), false, v_total, v_metodo);
    END IF;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.dis_ingresar_stock(uuid, integer, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dis_ingresar_stock(uuid, integer, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.dis_crear_pedido(p_cliente uuid, p_ruta uuid, p_entrega date, p_condicion text, p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  cl record;
  r record;
  pr record;
  it jsonb;
  v_cond text := CASE WHEN p_condicion = 'credito' THEN 'credito' ELSE 'contado' END;
  v_id uuid := gen_random_uuid();
  v_num text;
  v_cant numeric;
  v_unid numeric;
  v_precio numeric;
  v_sub numeric;
  v_total numeric := 0;
  v_pend numeric;
  v_ruta uuid := p_ruta;
  v_ruta_nombre text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Agrega al menos un producto al pedido.'; END IF;
  SELECT * INTO cl FROM public.dis_clientes WHERE id = p_cliente AND owner_id = v_owner AND activo FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El cliente no existe o está inactivo.'; END IF;
  IF v_ruta IS NULL THEN v_ruta := cl.ruta_id; END IF;
  IF v_ruta IS NOT NULL THEN
    SELECT * INTO r FROM public.dis_rutas WHERE id = v_ruta AND owner_id = v_owner;
    IF NOT FOUND THEN RAISE EXCEPTION 'La ruta ya no existe.'; END IF;
    v_ruta_nombre := r.nombre;
  END IF;
  v_num := 'PD-' || to_char(now(), 'YYMM') || '-' || upper(left(v_id::text, 5));
  INSERT INTO public.dis_pedidos (id, owner_id, tipo_negocio, numero, cliente_id, cliente, canal, ruta_id, ruta, fecha_entrega, condicion)
  VALUES (v_id, v_owner, cl.tipo_negocio, v_num, cl.id, cl.nombre, cl.canal, v_ruta, v_ruta_nombre, p_entrega, v_cond);
  FOR it IN SELECT value FROM jsonb_array_elements(p_items) LOOP
    v_cant := coalesce((it ->> 'cantidad')::numeric, 0);
    IF v_cant <= 0 OR v_cant <> trunc(v_cant) THEN RAISE EXCEPTION 'Las cantidades deben ser números enteros mayores a cero.'; END IF;
    SELECT * INTO pr FROM public.dis_productos WHERE id = (it ->> 'producto_id')::uuid AND owner_id = v_owner AND activo;
    IF NOT FOUND THEN RAISE EXCEPTION 'Un producto del pedido ya no existe.'; END IF;
    v_unid := v_cant * pr.unidades_por_presentacion;
    IF pr.stock_unidades < v_unid THEN RAISE EXCEPTION 'No hay stock suficiente de % (disponible: % unidades).', pr.nombre, pr.stock_unidades; END IF;
    SELECT d.precio_unidad INTO v_precio FROM public.dis_precios d
     WHERE d.owner_id = v_owner AND d.producto_id = pr.id AND d.canal = cl.canal AND d.desde_unidades <= v_unid
     ORDER BY d.desde_unidades DESC LIMIT 1;
    IF v_precio IS NULL THEN v_precio := pr.precio_unidad; END IF;
    v_sub := round(v_unid * v_precio);
    INSERT INTO public.dis_pedido_items (owner_id, tipo_negocio, pedido_id, producto_id, nombre, presentacion, cantidad, unidades, precio_unidad, costo_unidad, subtotal)
    VALUES (v_owner, cl.tipo_negocio, v_id, pr.id, pr.nombre, pr.presentacion, v_cant::integer, v_unid, v_precio, pr.costo_unidad, v_sub);
    v_total := v_total + v_sub;
  END LOOP;
  IF v_total <= 0 THEN RAISE EXCEPTION 'El pedido no tiene valor. Revisa los precios.'; END IF;
  IF v_cond = 'credito' THEN
    SELECT coalesce(sum(total), 0) INTO v_pend FROM public.dis_pedidos
     WHERE owner_id = v_owner AND cliente_id = cl.id AND condicion = 'credito' AND estado = 'preventa' AND id <> v_id;
    IF cl.cupo_credito <= 0 THEN RAISE EXCEPTION 'Este cliente no tiene cupo de crédito.'; END IF;
    IF cl.saldo + v_pend + v_total > cl.cupo_credito THEN
      RAISE EXCEPTION 'Supera el cupo de crédito (cupo %, deuda % y pedidos pendientes %).', cl.cupo_credito, cl.saldo, v_pend;
    END IF;
  END IF;
  UPDATE public.dis_pedidos SET total = v_total WHERE id = v_id;
  RETURN jsonb_build_object('id', v_id, 'numero', v_num, 'total', v_total);
END;
$$;
REVOKE ALL ON FUNCTION public.dis_crear_pedido(uuid, uuid, date, text, jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dis_crear_pedido(uuid, uuid, date, text, jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.dis_despachar(p_pedido uuid, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  pd record;
  cl record;
  i record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text;
  v_costo numeric := 0;
  v_lineas jsonb;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO pd FROM public.dis_pedidos WHERE id = p_pedido AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El pedido ya no existe.'; END IF;
  IF pd.estado <> 'preventa' THEN RAISE EXCEPTION 'Este pedido ya fue despachado o cancelado.'; END IF;
  SELECT * INTO cl FROM public.dis_clientes WHERE id = pd.cliente_id AND owner_id = v_owner FOR UPDATE;
  PERFORM public.neg_asegurar_t3(v_owner, pd.tipo_negocio);
  PERFORM set_config('gosaryc.neg', 'on', true);
  FOR i IN SELECT * FROM public.dis_pedido_items WHERE pedido_id = pd.id AND owner_id = v_owner LOOP
    UPDATE public.dis_productos SET stock_unidades = stock_unidades - i.unidades
     WHERE id = i.producto_id AND owner_id = v_owner AND stock_unidades >= i.unidades;
    IF NOT FOUND THEN RAISE EXCEPTION 'No hay stock suficiente de % para despachar.', i.nombre; END IF;
    v_costo := v_costo + round(i.unidades * i.costo_unidad);
  END LOOP;
  IF pd.condicion = 'credito' THEN
    IF cl.saldo + pd.total > cl.cupo_credito THEN RAISE EXCEPTION 'Supera el cupo de crédito del cliente.'; END IF;
    UPDATE public.dis_clientes SET saldo = saldo + pd.total WHERE id = cl.id;
    v_cuenta := '1305';
    v_metodo := 'credito';
  ELSE
    v_cuenta := CASE WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
  END IF;
  v_lineas := jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', pd.total), jsonb_build_object('codigo', '4135', 'haber', pd.total));
  IF v_costo > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '6135', 'debe', v_costo), jsonb_build_object('codigo', '1435', 'haber', v_costo)); END IF;
  PERFORM public.neg_asiento(v_owner, pd.tipo_negocio, 'Venta mayorista ' || pd.numero, 'dis_despacho', pd.id, v_lineas);
  IF pd.condicion = 'contado' THEN
    PERFORM public.neg_caja(v_owner, pd.tipo_negocio, 'Venta mayorista ' || pd.numero || ' · ' || pd.cliente, true, pd.total, v_metodo);
  END IF;
  UPDATE public.dis_pedidos SET estado = 'despachado', metodo = v_metodo, despachado_en = now() WHERE id = pd.id;
  RETURN jsonb_build_object('numero', pd.numero, 'total', pd.total, 'condicion', pd.condicion);
END;
$$;
REVOKE ALL ON FUNCTION public.dis_despachar(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dis_despachar(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.dis_cancelar(p_pedido uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid := public.mi_negocio_id();
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  UPDATE public.dis_pedidos SET estado = 'cancelado' WHERE id = p_pedido AND owner_id = v_owner AND estado = 'preventa';
  IF NOT FOUND THEN RAISE EXCEPTION 'Solo se cancelan pedidos en preventa.'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.dis_cancelar(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dis_cancelar(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.dis_abonar(p_cliente uuid, p_monto numeric, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  cl record;
  v_monto numeric := round(coalesce(p_monto, 0));
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_id uuid := gen_random_uuid();
  v_recibo text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF v_monto <= 0 THEN RAISE EXCEPTION 'Escribe el valor del abono.'; END IF;
  SELECT * INTO cl FROM public.dis_clientes WHERE id = p_cliente AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El cliente ya no existe.'; END IF;
  IF v_monto > cl.saldo THEN RAISE EXCEPTION 'El abono no puede superar la deuda (%).', cl.saldo; END IF;
  PERFORM public.neg_asegurar_t3(v_owner, cl.tipo_negocio);
  v_recibo := 'AC-' || to_char(now(), 'YYMM') || '-' || upper(left(v_id::text, 5));
  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.dis_clientes SET saldo = saldo - v_monto WHERE id = cl.id;
  INSERT INTO public.dis_abonos (id, owner_id, tipo_negocio, cliente_id, cliente, monto, metodo, recibo)
  VALUES (v_id, v_owner, cl.tipo_negocio, cl.id, cl.nombre, v_monto, v_metodo, v_recibo);
  PERFORM public.neg_asiento(v_owner, cl.tipo_negocio, 'Abono de cartera ' || cl.nombre, 'dis_abono', v_id,
    jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_monto), jsonb_build_object('codigo', '1305', 'haber', v_monto)));
  PERFORM public.neg_caja(v_owner, cl.tipo_negocio, 'Abono de cartera ' || cl.nombre || ' · ' || v_recibo, true, v_monto, v_metodo);
  RETURN jsonb_build_object('recibo', v_recibo, 'saldo', cl.saldo - v_monto);
END;
$$;
REVOKE ALL ON FUNCTION public.dis_abonar(uuid, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dis_abonar(uuid, numeric, text) TO authenticated;

-- ============================================================
-- 5. Taller de motos
-- ============================================================
CREATE OR REPLACE FUNCTION public.mot_agregar_repuesto(p_orden uuid, p_repuesto uuid, p_cantidad numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  o record;
  r record;
  v_sub numeric;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF coalesce(p_cantidad, 0) <= 0 THEN RAISE EXCEPTION 'Escribe la cantidad.'; END IF;
  SELECT * INTO o FROM public.mot_ordenes WHERE id = p_orden AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La orden ya no existe.'; END IF;
  IF o.estado IN ('entregada', 'cancelada') THEN RAISE EXCEPTION 'La orden ya está cerrada.'; END IF;
  SELECT * INTO r FROM public.mot_repuestos WHERE id = p_repuesto AND owner_id = v_owner AND activo FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El repuesto ya no existe.'; END IF;
  IF r.stock < p_cantidad THEN RAISE EXCEPTION 'No hay stock suficiente de % (hay %).', r.nombre, r.stock; END IF;
  v_sub := round(p_cantidad * r.precio);
  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.mot_repuestos SET stock = stock - p_cantidad WHERE id = r.id;
  INSERT INTO public.mot_orden_repuestos (owner_id, tipo_negocio, orden_id, repuesto_id, nombre, cantidad, precio, costo, subtotal)
  VALUES (v_owner, o.tipo_negocio, o.id, r.id, r.nombre, p_cantidad, r.precio, r.costo, v_sub);
  UPDATE public.mot_ordenes SET repuestos_total = repuestos_total + v_sub, estado = CASE WHEN estado = 'recibida' THEN 'en_reparacion' ELSE estado END WHERE id = o.id;
END;
$$;
REVOKE ALL ON FUNCTION public.mot_agregar_repuesto(uuid, uuid, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mot_agregar_repuesto(uuid, uuid, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.mot_quitar_repuesto(p_item uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  i record;
  o record;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO i FROM public.mot_orden_repuestos WHERE id = p_item AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND OR i.anulado THEN RAISE EXCEPTION 'El repuesto ya fue quitado.'; END IF;
  SELECT * INTO o FROM public.mot_ordenes WHERE id = i.orden_id AND owner_id = v_owner FOR UPDATE;
  IF o.estado IN ('entregada', 'cancelada') THEN RAISE EXCEPTION 'La orden ya está cerrada.'; END IF;
  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.mot_orden_repuestos SET anulado = true WHERE id = i.id;
  UPDATE public.mot_repuestos SET stock = stock + i.cantidad WHERE id = i.repuesto_id AND owner_id = v_owner;
  UPDATE public.mot_ordenes SET repuestos_total = greatest(repuestos_total - i.subtotal, 0) WHERE id = o.id;
END;
$$;
REVOKE ALL ON FUNCTION public.mot_quitar_repuesto(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mot_quitar_repuesto(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mot_ingresar_stock(p_repuesto uuid, p_cantidad numeric, p_costo numeric, p_metodo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  r record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text;
  v_total numeric;
  v_costo numeric := coalesce(p_costo, 0);
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF coalesce(p_cantidad, 0) <= 0 THEN RAISE EXCEPTION 'Escribe la cantidad que ingresa.'; END IF;
  IF v_costo < 0 THEN RAISE EXCEPTION 'El costo no puede ser negativo.'; END IF;
  SELECT * INTO r FROM public.mot_repuestos WHERE id = p_repuesto AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El repuesto ya no existe.'; END IF;
  PERFORM public.neg_asegurar_t3(v_owner, r.tipo_negocio);
  v_total := round(p_cantidad * v_costo);
  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.mot_repuestos SET stock = stock + p_cantidad, costo = CASE WHEN v_costo > 0 THEN v_costo ELSE costo END WHERE id = r.id;
  IF v_total > 0 THEN
    v_cuenta := CASE WHEN v_metodo = 'credito' THEN '2205' WHEN v_metodo = 'efectivo' THEN '1105' ELSE '1110' END;
    PERFORM public.neg_asiento(v_owner, r.tipo_negocio, 'Compra de repuesto ' || left(r.nombre, 60), 'mot_compra', r.id,
      jsonb_build_array(jsonb_build_object('codigo', '1435', 'debe', v_total), jsonb_build_object('codigo', v_cuenta, 'haber', v_total)));
    IF v_metodo <> 'credito' THEN
      PERFORM public.neg_caja(v_owner, r.tipo_negocio, 'Compra de repuesto ' || left(r.nombre, 60), false, v_total, v_metodo);
    END IF;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.mot_ingresar_stock(uuid, numeric, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mot_ingresar_stock(uuid, numeric, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mot_entregar(p_orden uuid, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  o record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_pct numeric := 0;
  v_total numeric;
  v_com numeric;
  v_costo numeric;
  v_lineas jsonb;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO o FROM public.mot_ordenes WHERE id = p_orden AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La orden ya no existe.'; END IF;
  IF o.estado IN ('entregada', 'cancelada') THEN RAISE EXCEPTION 'Esta orden ya fue cerrada.'; END IF;
  v_total := o.mano_obra + o.repuestos_total;
  IF v_total <= 0 THEN RAISE EXCEPTION 'La orden no tiene mano de obra ni repuestos para cobrar.'; END IF;
  IF o.mecanico_id IS NOT NULL THEN SELECT coalesce(comision_pct, 0) INTO v_pct FROM public.mot_mecanicos WHERE id = o.mecanico_id AND owner_id = v_owner; END IF;
  v_com := round(o.mano_obra * coalesce(v_pct, 0) / 100);
  SELECT coalesce(sum(round(cantidad * costo)), 0) INTO v_costo FROM public.mot_orden_repuestos WHERE orden_id = o.id AND owner_id = v_owner AND NOT anulado;
  PERFORM public.neg_asegurar_t3(v_owner, o.tipo_negocio);
  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.mot_ordenes SET estado = 'entregada', total = v_total, comision_pct = coalesce(v_pct, 0), comision = v_com, pagado = true, metodo = v_metodo, entregada_en = now() WHERE id = o.id;
  v_lineas := jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_total), jsonb_build_object('codigo', '4135', 'haber', v_total));
  IF v_costo > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '6135', 'debe', v_costo), jsonb_build_object('codigo', '1435', 'haber', v_costo)); END IF;
  IF v_com > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '5205', 'debe', v_com), jsonb_build_object('codigo', '2505', 'haber', v_com)); END IF;
  PERFORM public.neg_asiento(v_owner, o.tipo_negocio, 'Orden de taller ' || o.numero || ' · ' || o.placa, 'mot_orden', o.id, v_lineas);
  PERFORM public.neg_caja(v_owner, o.tipo_negocio, 'Orden de taller ' || o.numero || ' · ' || o.placa, true, v_total, v_metodo);
  RETURN jsonb_build_object('numero', o.numero, 'total', v_total, 'comision', v_com);
END;
$$;
REVOKE ALL ON FUNCTION public.mot_entregar(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mot_entregar(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mot_cancelar(p_orden uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  i record;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.mot_ordenes WHERE id = p_orden AND owner_id = v_owner AND estado NOT IN ('entregada', 'cancelada')) THEN
    RAISE EXCEPTION 'Esta orden ya está cerrada.';
  END IF;
  PERFORM set_config('gosaryc.neg', 'on', true);
  FOR i IN SELECT * FROM public.mot_orden_repuestos WHERE orden_id = p_orden AND owner_id = v_owner AND NOT anulado LOOP
    UPDATE public.mot_repuestos SET stock = stock + i.cantidad WHERE id = i.repuesto_id AND owner_id = v_owner;
    UPDATE public.mot_orden_repuestos SET anulado = true WHERE id = i.id;
  END LOOP;
  UPDATE public.mot_ordenes SET estado = 'cancelada', repuestos_total = 0 WHERE id = p_orden AND owner_id = v_owner;
END;
$$;
REVOKE ALL ON FUNCTION public.mot_cancelar(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mot_cancelar(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mot_pagar_comisiones(p_mecanico uuid, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  m record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_total numeric;
  v_n integer;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO m FROM public.mot_mecanicos WHERE id = p_mecanico AND owner_id = v_owner;
  IF NOT FOUND THEN RAISE EXCEPTION 'El mecánico ya no existe.'; END IF;
  SELECT coalesce(sum(comision), 0), count(*) INTO v_total, v_n FROM public.mot_ordenes
   WHERE owner_id = v_owner AND mecanico_id = m.id AND estado = 'entregada' AND NOT comision_pagada AND comision > 0;
  IF v_total <= 0 THEN RAISE EXCEPTION 'Este mecánico no tiene comisiones pendientes.'; END IF;
  PERFORM public.neg_asegurar_t3(v_owner, m.tipo_negocio);
  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.mot_ordenes SET comision_pagada = true
   WHERE owner_id = v_owner AND mecanico_id = m.id AND estado = 'entregada' AND NOT comision_pagada AND comision > 0;
  PERFORM public.neg_asiento(v_owner, m.tipo_negocio, 'Pago de comisiones ' || m.nombre, 'mot_comision', m.id,
    jsonb_build_array(jsonb_build_object('codigo', '2505', 'debe', v_total), jsonb_build_object('codigo', v_cuenta, 'haber', v_total)));
  PERFORM public.neg_caja(v_owner, m.tipo_negocio, 'Pago de comisiones ' || m.nombre, false, v_total, v_metodo);
  RETURN jsonb_build_object('total', v_total, 'ordenes', v_n);
END;
$$;
REVOKE ALL ON FUNCTION public.mot_pagar_comisiones(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mot_pagar_comisiones(uuid, text) TO authenticated;

-- ============================================================
-- 6. Belleza: la base impide cruces de horario (por profesional y por silla/cabina)
-- ============================================================
CREATE OR REPLACE FUNCTION public.bel_citas_sin_cruce()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.estado NOT IN ('agendada', 'en_atencion') THEN RETURN NEW; END IF;
  IF EXISTS (
    SELECT 1 FROM public.bel_citas c
     WHERE c.owner_id = NEW.owner_id AND c.id <> NEW.id AND c.estado IN ('agendada', 'en_atencion')
       AND lower(trim(c.profesional)) = lower(trim(NEW.profesional))
       AND c.inicio < NEW.inicio + make_interval(mins => NEW.duracion_min)
       AND NEW.inicio < c.inicio + make_interval(mins => c.duracion_min)) THEN
    RAISE EXCEPTION 'Ese profesional ya tiene una cita en ese horario.';
  END IF;
  IF NEW.recurso IS NOT NULL AND length(trim(NEW.recurso)) > 0 AND EXISTS (
    SELECT 1 FROM public.bel_citas c
     WHERE c.owner_id = NEW.owner_id AND c.id <> NEW.id AND c.estado IN ('agendada', 'en_atencion')
       AND lower(trim(coalesce(c.recurso, ''))) = lower(trim(NEW.recurso))
       AND c.inicio < NEW.inicio + make_interval(mins => NEW.duracion_min)
       AND NEW.inicio < c.inicio + make_interval(mins => c.duracion_min)) THEN
    RAISE EXCEPTION 'Esa silla o cabina ya está ocupada en ese horario.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_bel_citas_sin_cruce ON public.bel_citas;
CREATE TRIGGER trg_bel_citas_sin_cruce BEFORE INSERT OR UPDATE OF inicio, duracion_min, profesional, recurso, estado ON public.bel_citas
  FOR EACH ROW EXECUTE FUNCTION public.bel_citas_sin_cruce();
