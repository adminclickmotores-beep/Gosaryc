-- PASO 2: tablas propias como única fuente de verdad + motor especializado por rubro.
-- No borra ni trunca datos. La columna que identifica al negocio es owner_id (siempre contra public.mi_negocio_id()).

-- ============================================================
-- 1. Tabla propia que faltaba: costos_veh (costos y rentabilidad por vehículo)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.costos_veh (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  titulo text NOT NULL,
  detalle text,
  contacto text,
  telefono text,
  estado text NOT NULL DEFAULT 'pendiente',
  monto numeric NOT NULL DEFAULT 0,
  abonado numeric NOT NULL DEFAULT 0,
  cantidad numeric NOT NULL DEFAULT 0,
  minimo numeric NOT NULL DEFAULT 0,
  fecha date,
  historial jsonb NOT NULL DEFAULT '[]'::jsonb,
  datos jsonb NOT NULL DEFAULT '{}'::jsonb,
  adjuntos jsonb NOT NULL DEFAULT '[]'::jsonb,
  anulado boolean NOT NULL DEFAULT false,
  motivo_anulacion text,
  anulado_por uuid,
  anulado_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS costos_veh_owner_idx ON public.costos_veh (owner_id, created_at DESC);

ALTER TABLE public.costos_veh ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "costos_veh_leer" ON public.costos_veh;
CREATE POLICY "costos_veh_leer" ON public.costos_veh
  FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('costos_veh'));

DROP POLICY IF EXISTS "costos_veh_crear" ON public.costos_veh;
CREATE POLICY "costos_veh_crear" ON public.costos_veh
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('costos_veh'));

DROP POLICY IF EXISTS "costos_veh_editar" ON public.costos_veh;
CREATE POLICY "costos_veh_editar" ON public.costos_veh
  FOR UPDATE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.tiene_permiso('costos_veh'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.tiene_permiso('costos_veh'));
-- Sin política de borrado: un costo no se borra, se anula con motivo.

DROP POLICY IF EXISTS "costos_veh_solo_tipo_actual" ON public.costos_veh;
CREATE POLICY "costos_veh_solo_tipo_actual" ON public.costos_veh
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())
  WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual());

DROP POLICY IF EXISTS "costos_veh_solo_mi_negocio" ON public.costos_veh;
CREATE POLICY "costos_veh_solo_mi_negocio" ON public.costos_veh
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id())
  WITH CHECK (owner_id = public.mi_negocio_id());

REVOKE ALL ON public.costos_veh FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.costos_veh FROM authenticated;

-- ============================================================
-- 2. Todas las tablas propias quedan con la MISMA forma que modulo_registros
--    (así la pantalla de módulos escribe directo en ellas) y se copian los datos faltantes.
-- ============================================================
DO $$
DECLARE
  i int;
  t text;
  m text;
  pares text[][] := ARRAY[
    ['ventas_veh_registros', 'ventas_veh'],
    ['comisiones_registros', 'comisiones'],
    ['alistamiento_registros', 'alistamiento'],
    ['cartera_veh_registros', 'cartera_veh'],
    ['vehiculos_usados_registros', 'vehiculos_usados'],
    ['proveedores_registros', 'proveedores'],
    ['propinas_registros', 'propinas'],
    ['metas_registros', 'metas'],
    ['resenas_registros', 'resenas'],
    ['pagos_digitales_registros', 'pagos_digitales'],
    ['suscripciones_registros', 'suscripciones'],
    ['combos_registros', 'combos'],
    ['fidelizacion_registros', 'fidelizacion'],
    ['fiados', 'fiados'],
    ['equipo_pagos', 'equipo_turnos'],
    ['liquidaciones_repartidores', 'repartidores'],
    ['facturas_registros', 'facturas'],
    ['permisos_rest_registros', 'permisos_rest'],
    ['costos_veh', 'costos_veh']
  ];
BEGIN
  FOR i IN 1 .. array_length(pares, 1) LOOP
    t := pares[i][1];
    m := pares[i][2];

    EXECUTE format($f$ALTER TABLE public.%I
      ADD COLUMN IF NOT EXISTS owner_id uuid,
      ADD COLUMN IF NOT EXISTS tipo_negocio text,
      ADD COLUMN IF NOT EXISTS titulo text NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'pendiente',
      ADD COLUMN IF NOT EXISTS monto numeric NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS anulado boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
      ADD COLUMN IF NOT EXISTS detalle text,
      ADD COLUMN IF NOT EXISTS contacto text,
      ADD COLUMN IF NOT EXISTS telefono text,
      ADD COLUMN IF NOT EXISTS fecha date,
      ADD COLUMN IF NOT EXISTS abonado numeric NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS cantidad numeric NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS minimo numeric NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS historial jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS datos jsonb NOT NULL DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS adjuntos jsonb NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS motivo_anulacion text,
      ADD COLUMN IF NOT EXISTS anulado_por uuid,
      ADD COLUMN IF NOT EXISTS anulado_en timestamptz$f$, t);

    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN owner_id SET DEFAULT public.mi_negocio_id()', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tipo_negocio SET DEFAULT public.tipo_negocio_actual()', t);

    -- Filas que aún solo existían en modulo_registros.
    EXECUTE format($f$INSERT INTO public.%I
        (id, owner_id, tipo_negocio, titulo, detalle, contacto, telefono, estado, monto, abonado, cantidad, minimo,
         fecha, historial, datos, anulado, motivo_anulacion, created_at)
      SELECT r.id, r.owner_id, r.tipo_negocio, r.titulo, r.detalle, r.contacto, r.telefono, r.estado, r.monto, r.abonado,
             r.cantidad, r.minimo, r.fecha, r.historial, r.datos, r.anulado, r.motivo_anulacion, r.created_at
        FROM public.modulo_registros r
       WHERE r.modulo = %L
      ON CONFLICT (id) DO NOTHING$f$, t, m);

    -- Datos que la copia anterior no traía (detalle, historial, abonos, campos extra...).
    EXECUTE format($f$UPDATE public.%I x
         SET detalle = r.detalle, contacto = r.contacto, telefono = r.telefono, fecha = r.fecha,
             abonado = r.abonado, cantidad = r.cantidad, minimo = r.minimo,
             historial = r.historial, datos = r.datos, motivo_anulacion = r.motivo_anulacion
        FROM public.modulo_registros r
       WHERE r.id = x.id AND r.modulo = %L$f$, t, m);
  END LOOP;
END $$;

-- ============================================================
-- 3. Se apagan los triggers de doble escritura modulo_registros -> tabla propia
-- ============================================================
DROP TRIGGER IF EXISTS modulo_registros_sync_fiados_trg ON public.modulo_registros;
DROP TRIGGER IF EXISTS modulo_registros_sync_equipo_trg ON public.modulo_registros;
DROP TRIGGER IF EXISTS modulo_registros_sync_propinas_trg ON public.modulo_registros;
DROP TRIGGER IF EXISTS modulo_registros_sync_liquidacion_trg ON public.modulo_registros;
DROP TRIGGER IF EXISTS modulo_registros_sync_meta_trg ON public.modulo_registros;
DROP TRIGGER IF EXISTS modulo_registros_sync_resena_trg ON public.modulo_registros;
DROP TRIGGER IF EXISTS modulo_registros_sync_suscripcion_trg ON public.modulo_registros;
DROP TRIGGER IF EXISTS modulo_registros_sync_combo_trg ON public.modulo_registros;
DROP TRIGGER IF EXISTS modulo_registros_sync_fidelizacion_trg ON public.modulo_registros;
DROP TRIGGER IF EXISTS modulo_registros_sync_pago_digital_trg ON public.modulo_registros;
DROP TRIGGER IF EXISTS modulo_registros_sync_proveedor_trg ON public.modulo_registros;
DROP TRIGGER IF EXISTS modulo_registros_sync_venta_vehiculo_trg ON public.modulo_registros;
DROP TRIGGER IF EXISTS modulo_registros_sync_comision_vehiculo_trg ON public.modulo_registros;
DROP TRIGGER IF EXISTS modulo_registros_sync_alistamiento_vehiculo_trg ON public.modulo_registros;
DROP TRIGGER IF EXISTS modulo_registros_sync_cartera_vehiculo_trg ON public.modulo_registros;
DROP TRIGGER IF EXISTS modulo_registros_sync_vehiculo_usado_trg ON public.modulo_registros;
DROP TRIGGER IF EXISTS modulo_registros_sync_facturas_trg ON public.modulo_registros;
DROP TRIGGER IF EXISTS modulo_registros_sync_permisos_rest_trg ON public.modulo_registros;

-- ============================================================
-- 4. Prohibido borrar / anulación solo del dueño con motivo y auditoría
--    (fiados, nómina, propinas y las demás tablas con dinero)
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'fiados', 'equipo_pagos', 'propinas_registros', 'proveedores_registros', 'costos_veh',
    'liquidaciones_repartidores', 'pagos_digitales_registros', 'facturas_registros'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero()', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_controlar_anulacion ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_controlar_anulacion BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.controlar_anulacion()', t);
  END LOOP;
END $$;

-- ============================================================
-- 5. Asientos contables: compras a proveedores y costos de vehículo (ya en su tabla propia)
--    y abonos posteriores a una compra a crédito.
-- ============================================================
-- Igual que registrar_asiento_auto pero SIN impedir un segundo asiento del mismo origen
-- (un crédito puede abonarse varias veces). El origen_id sigue siendo el del registro,
-- así la anulación del registro también anula sus abonos.
CREATE OR REPLACE FUNCTION public.registrar_asiento_movimiento(
  p_owner uuid, p_tipo text, p_concepto text, p_origen_tipo text, p_origen_id uuid, p_lineas jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_asiento uuid := gen_random_uuid();
  v_tipo text := public.clave_tipo_negocio(p_tipo);
  l jsonb;
  v_cuenta uuid;
BEGIN
  IF p_owner IS NULL OR p_origen_id IS NULL THEN RETURN; END IF;
  PERFORM public.inicializar_plan_cuentas(p_owner, v_tipo);
  FOR l IN SELECT * FROM jsonb_array_elements(p_lineas) LOOP
    v_cuenta := NULL;
    SELECT c.id INTO v_cuenta FROM public.cuentas_contables c
     WHERE c.owner_id = p_owner AND c.codigo = l ->> 'codigo'
       AND public.clave_tipo_negocio(c.tipo_negocio) = v_tipo
     LIMIT 1;
    IF v_cuenta IS NULL THEN
      RAISE EXCEPTION 'Falta la cuenta %', l ->> 'codigo';
    END IF;
    INSERT INTO public.asientos_contables (owner_id, asiento_id, fecha, cuenta_id, concepto, debe, haber, origen_tipo, origen_id, tipo_negocio)
    VALUES (p_owner, v_asiento, current_date, v_cuenta, left(p_concepto, 200),
            coalesce((l ->> 'debe')::numeric, 0), coalesce((l ->> 'haber')::numeric, 0), p_origen_tipo, p_origen_id, v_tipo);
  END LOOP;
END;
$$;
REVOKE ALL ON FUNCTION public.registrar_asiento_movimiento(uuid, text, text, text, uuid, jsonb) FROM public, anon, authenticated;

-- Alta de una compra a proveedor o de un costo de vehículo.
CREATE OR REPLACE FUNCTION public.asiento_auto_gasto_registro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lineas jsonb;
  v_pagado numeric;
  v_cuenta text := CASE WHEN TG_TABLE_NAME = 'costos_veh' THEN '5195' ELSE '6135' END;
  v_origen text := CASE WHEN TG_TABLE_NAME = 'costos_veh' THEN 'costo_veh' ELSE 'compra' END;
BEGIN
  BEGIN
    IF NEW.owner_id IS NULL OR coalesce(NEW.monto, 0) <= 0 OR NEW.anulado THEN RETURN NEW; END IF;
    v_pagado := least(greatest(coalesce(NEW.abonado, 0), 0), NEW.monto);
    v_lineas := jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', NEW.monto));
    IF v_pagado > 0 THEN
      v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '1105', 'haber', v_pagado));
    END IF;
    IF NEW.monto - v_pagado > 0 THEN
      v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '2205', 'haber', NEW.monto - v_pagado));
    END IF;
    PERFORM public.registrar_asiento_auto(NEW.owner_id, coalesce(NEW.tipo_negocio, public.tipo_de_negocio(NEW.owner_id)),
      CASE WHEN v_origen = 'costo_veh' THEN 'Costo de vehículo: ' ELSE 'Compra: ' END || coalesce(NEW.titulo, ''),
      v_origen, NEW.id, v_lineas);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento de % %: %', TG_TABLE_NAME, NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

-- Abono posterior a una compra a crédito: baja la cuenta por pagar y sale de caja.
CREATE OR REPLACE FUNCTION public.asiento_auto_abono_registro()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_delta numeric;
  v_origen text := CASE WHEN TG_TABLE_NAME = 'costos_veh' THEN 'costo_veh_abono' ELSE 'compra_abono' END;
BEGIN
  BEGIN
    IF NEW.owner_id IS NULL OR NEW.anulado OR coalesce(NEW.monto, 0) <= 0 THEN RETURN NEW; END IF;
    v_delta := least(greatest(coalesce(NEW.abonado, 0), 0), NEW.monto)
             - least(greatest(coalesce(OLD.abonado, 0), 0), NEW.monto);
    IF v_delta <= 0 THEN RETURN NEW; END IF;
    PERFORM public.registrar_asiento_movimiento(NEW.owner_id, coalesce(NEW.tipo_negocio, public.tipo_de_negocio(NEW.owner_id)),
      'Abono: ' || coalesce(NEW.titulo, ''), v_origen, NEW.id,
      jsonb_build_array(jsonb_build_object('codigo', '2205', 'debe', v_delta),
                        jsonb_build_object('codigo', '1105', 'haber', v_delta)));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento del abono % %: %', TG_TABLE_NAME, NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['proveedores_registros', 'costos_veh'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_asiento_auto_gasto ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_asiento_auto_gasto AFTER INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.asiento_auto_gasto_registro()', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_asiento_auto_abono ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_asiento_auto_abono AFTER UPDATE OF abonado ON public.%I FOR EACH ROW EXECUTE FUNCTION public.asiento_auto_abono_registro()', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_propagar_anulacion ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_propagar_anulacion AFTER UPDATE OF anulado ON public.%I FOR EACH ROW EXECUTE FUNCTION public.propagar_anulacion_asiento()', t);
  END LOOP;
END $$;

-- ============================================================
-- 6. Las compras de inventario y las devoluciones escriben en proveedores_registros
-- ============================================================
CREATE OR REPLACE FUNCTION public.registrar_compra_insumo(
  p_insumo uuid,
  p_cantidad numeric,
  p_costo_total numeric,
  p_proveedor text,
  p_credito boolean
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  i record;
  v_unit_viejo numeric;
  v_unit_nuevo numeric;
  v_unit_prom numeric;
  v_stock_nuevo numeric;
  v_prov text := nullif(trim(coalesce(p_proveedor, '')), '');
BEGIN
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN
    RAISE EXCEPTION 'La cantidad debe ser mayor a cero';
  END IF;
  IF p_costo_total IS NULL OR p_costo_total < 0 THEN
    RAISE EXCEPTION 'El costo no es válido';
  END IF;

  SELECT * INTO i FROM public.restaurante_insumos WHERE id = p_insumo AND owner_id = v_owner;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Insumo no encontrado';
  END IF;

  v_unit_viejo := i.precio_compra / greatest(i.cantidad_compra, 0.000001);
  v_unit_nuevo := p_costo_total / p_cantidad;
  v_stock_nuevo := greatest(i.stock, 0) + p_cantidad;
  v_unit_prom := (greatest(i.stock, 0) * v_unit_viejo + p_cantidad * v_unit_nuevo) / v_stock_nuevo;

  UPDATE public.restaurante_insumos
     SET stock = i.stock + p_cantidad,
         precio_compra = v_unit_prom * i.cantidad_compra,
         proveedor = coalesce(v_prov, i.proveedor)
   WHERE id = p_insumo;

  INSERT INTO public.restaurante_kardex (owner_id, insumo_id, tipo, cantidad, stock_resultante, motivo)
  VALUES (v_owner, p_insumo, 'compra', p_cantidad, i.stock + p_cantidad,
          'Compra' || coalesce(' a ' || v_prov, '') || ' por ' || p_costo_total::bigint || CASE WHEN p_credito THEN ' (a crédito)' ELSE ' (contado)' END);

  INSERT INTO public.proveedores_registros (owner_id, estado, titulo, detalle, contacto, monto, abonado, historial)
  VALUES (v_owner, CASE WHEN p_credito THEN 'pendiente' ELSE 'hecho' END,
          'Compra de ' || i.nombre,
          p_cantidad || ' ' || i.unidad || ' · costo unitario ' || round(v_unit_nuevo, 2),
          v_prov, p_costo_total, CASE WHEN p_credito THEN 0 ELSE p_costo_total END,
          jsonb_build_array(jsonb_build_object('f', now(), 't', 'Compra registrada' || CASE WHEN p_credito THEN ' a crédito' ELSE ' de contado' END)));

  RETURN v_unit_prom;
END;
$$;

REVOKE ALL ON FUNCTION public.registrar_compra_insumo(uuid, numeric, numeric, text, boolean) FROM public;
GRANT EXECUTE ON FUNCTION public.registrar_compra_insumo(uuid, numeric, numeric, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.devolver_compra_proveedor(
  p_insumo uuid,
  p_cantidad numeric,
  p_motivo text,
  p_proveedor text,
  p_valor numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_prov text := nullif(trim(coalesce(p_proveedor, '')), '');
  v_stock numeric;
  v_deuda numeric := 0;
  v_descuento numeric := 0;
  v_nombre text;
BEGIN
  v_stock := public.devolver_compra_insumo(p_insumo, p_cantidad, p_motivo);
  PERFORM public.quitar_stock_bodegas(p_insumo, p_cantidad);

  IF v_prov IS NOT NULL AND p_valor IS NOT NULL AND p_valor > 0 THEN
    SELECT coalesce(sum(monto), 0) INTO v_deuda
      FROM public.proveedores_registros
     WHERE owner_id = v_owner AND estado <> 'hecho' AND NOT anulado
       AND lower(trim(coalesce(contacto, titulo))) = lower(v_prov);

    v_descuento := least(p_valor, greatest(v_deuda, 0));

    IF v_descuento > 0 THEN
      SELECT nombre INTO v_nombre FROM public.restaurante_insumos WHERE id = p_insumo;
      INSERT INTO public.proveedores_registros (owner_id, estado, titulo, detalle, contacto, monto, abonado, historial)
      VALUES (v_owner, 'pendiente',
              'Devolución de ' || coalesce(v_nombre, 'insumo'),
              p_cantidad || ' devueltos · descuenta la deuda',
              v_prov, -v_descuento, 0,
              jsonb_build_array(jsonb_build_object('f', now(), 't', 'Devolución: descuenta ' || v_descuento::bigint || ' de la deuda')));
    END IF;
  END IF;

  RETURN v_stock;
END;
$$;

REVOKE ALL ON FUNCTION public.devolver_compra_proveedor(uuid, numeric, text, text, numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.devolver_compra_proveedor(uuid, numeric, text, text, numeric) TO authenticated;

-- ============================================================
-- 7. Motor especializado por rubro: catálogo de esquemas (vocabulario, campos, validaciones,
--    adjuntos, alertas y cálculos). Es un catálogo de la plataforma (no tiene datos de clientes):
--    todos los negocios lo leen, solo el superadministrador lo edita.
--    Si un rubro no tiene filas aquí, la app usa los respaldos de src/lib/modulos-negocio.ts.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.esquemas_rubro (
  tipo_negocio text PRIMARY KEY,
  nombre text NOT NULL,
  vocabulario jsonb NOT NULL DEFAULT '{}'::jsonb,
  alertas jsonb NOT NULL DEFAULT '[]'::jsonb,
  calculos jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.esquemas_rubro_campos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_negocio text NOT NULL REFERENCES public.esquemas_rubro (tipo_negocio) ON DELETE CASCADE,
  modulo text NOT NULL,
  clave text NOT NULL,
  etiqueta text NOT NULL,
  tipo text NOT NULL DEFAULT 'text'
    CHECK (tipo IN ('text', 'tel', 'email', 'date', 'select', 'number', 'textarea', 'foto', 'archivo')),
  obligatorio boolean NOT NULL DEFAULT false,
  opciones jsonb NOT NULL DEFAULT '[]'::jsonb,
  validacion jsonb NOT NULL DEFAULT '{}'::jsonb,
  placeholder text,
  ayuda text,
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tipo_negocio, modulo, clave)
);

CREATE INDEX IF NOT EXISTS esquemas_rubro_campos_idx ON public.esquemas_rubro_campos (tipo_negocio, modulo, orden);

ALTER TABLE public.esquemas_rubro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esquemas_rubro_campos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "esquemas_rubro_leer" ON public.esquemas_rubro;
CREATE POLICY "esquemas_rubro_leer" ON public.esquemas_rubro
  FOR SELECT TO authenticated USING (activo OR public.es_superadmin());
DROP POLICY IF EXISTS "esquemas_rubro_admin" ON public.esquemas_rubro;
CREATE POLICY "esquemas_rubro_admin" ON public.esquemas_rubro
  FOR ALL TO authenticated USING (public.es_superadmin()) WITH CHECK (public.es_superadmin());

DROP POLICY IF EXISTS "esquemas_rubro_campos_leer" ON public.esquemas_rubro_campos;
CREATE POLICY "esquemas_rubro_campos_leer" ON public.esquemas_rubro_campos
  FOR SELECT TO authenticated USING (activo OR public.es_superadmin());
DROP POLICY IF EXISTS "esquemas_rubro_campos_admin" ON public.esquemas_rubro_campos;
CREATE POLICY "esquemas_rubro_campos_admin" ON public.esquemas_rubro_campos
  FOR ALL TO authenticated USING (public.es_superadmin()) WITH CHECK (public.es_superadmin());

REVOKE ALL ON public.esquemas_rubro FROM anon;
REVOKE ALL ON public.esquemas_rubro_campos FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.esquemas_rubro FROM authenticated;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.esquemas_rubro_campos FROM authenticated;

-- Un esquema por cada rubro que ya existe en la app (vocabulario inicial de ejemplo; se amplía sin tocar código).
INSERT INTO public.esquemas_rubro (tipo_negocio, nombre, vocabulario) VALUES
  ('restaurante', 'Restaurante / comida', '{"cliente":"Comensal","registro":"Pedido"}'),
  ('concesionario', 'Concesionario de vehículos', '{"cliente":"Comprador","registro":"Vehículo"}'),
  ('tienda', 'Tienda / comercio', '{"cliente":"Cliente","registro":"Venta"}'),
  ('servicios', 'Servicios / citas', '{"cliente":"Cliente","registro":"Servicio"}'),
  ('salud', 'Salud / consultorio / clínica', '{"cliente":"Paciente","registro":"Consulta"}'),
  ('educacion', 'Educación / academia / cursos', '{"cliente":"Estudiante","registro":"Matrícula"}'),
  ('hospedaje', 'Hotel / hospedaje / turismo', '{"cliente":"Huésped","registro":"Reserva"}'),
  ('gimnasio', 'Gimnasio / deporte / bienestar', '{"cliente":"Socio","registro":"Membresía"}'),
  ('construccion', 'Construcción / ferretería / oficios', '{"cliente":"Cliente","registro":"Obra"}'),
  ('agro', 'Agro / campo / producción', '{"cliente":"Comprador","registro":"Lote"}'),
  ('inmobiliaria', 'Inmobiliaria / arriendos', '{"cliente":"Arrendatario","registro":"Inmueble"}'),
  ('mascotas', 'Veterinaria / mascotas', '{"cliente":"Propietario","registro":"Paciente"}'),
  ('tecnologia', 'Tecnología / software / agencia', '{"cliente":"Cliente","registro":"Proyecto"}'),
  ('transporte', 'Transporte / logística', '{"cliente":"Cliente","registro":"Viaje"}'),
  ('belleza', 'Belleza / peluquería / spa / uñas', '{"cliente":"Cliente","registro":"Cita"}'),
  ('taller', 'Taller mecánico / latonería / lubricentro', '{"cliente":"Propietario","registro":"Orden de servicio"}'),
  ('farmacia', 'Farmacia / droguería / minimercado', '{"cliente":"Cliente","registro":"Venta"}'),
  ('eventos', 'Eventos / salón social / fotografía', '{"cliente":"Cliente","registro":"Evento"}'),
  ('profesional', 'Servicios profesionales', '{"cliente":"Cliente","registro":"Caso"}'),
  ('lavanderia', 'Lavandería / tintorería / autolavado', '{"cliente":"Cliente","registro":"Orden"}'),
  ('condominio', 'Condominio / administración de edificios', '{"cliente":"Residente","registro":"Unidad"}'),
  ('prestamos', 'Préstamos y cobranza', '{"cliente":"Deudor","registro":"Crédito"}'),
  ('textil', 'Taller textil / confección', '{"cliente":"Cliente","registro":"Pedido"}'),
  ('joyeria', 'Joyería / relojería', '{"cliente":"Cliente","registro":"Pieza"}'),
  ('celulares', 'Tienda de celulares / reparaciones', '{"cliente":"Cliente","registro":"Equipo"}'),
  ('papeleria', 'Papelería / librería', '{"cliente":"Cliente","registro":"Venta"}'),
  ('moda', 'Tienda de moda / calzado', '{"cliente":"Cliente","registro":"Venta"}'),
  ('ferreteria', 'Ferretería / materiales de construcción', '{"cliente":"Cliente","registro":"Venta"}'),
  ('supermercado', 'Supermercado / minimercado / autoservicio', '{"cliente":"Cliente","registro":"Venta"}'),
  ('carniceria', 'Carnicería / fruver / pescadería', '{"cliente":"Cliente","registro":"Venta"}'),
  ('licorera', 'Licorera / tienda de bebidas / estanco', '{"cliente":"Cliente","registro":"Venta"}'),
  ('floristeria', 'Floristería / regalos', '{"cliente":"Cliente","registro":"Arreglo"}'),
  ('optica', 'Óptica / optometría', '{"cliente":"Paciente","registro":"Fórmula"}'),
  ('guarderia', 'Guardería / jardín infantil', '{"cliente":"Acudiente","registro":"Niño"}'),
  ('alquiler_vehiculos', 'Alquiler de vehículos', '{"cliente":"Arrendatario","registro":"Alquiler"}'),
  ('seguridad_aseo', 'Seguridad / aseo / servicios generales', '{"cliente":"Cliente","registro":"Contrato"}'),
  ('ganaderia', 'Ganadería / avícola / porcícola', '{"cliente":"Comprador","registro":"Lote"}'),
  ('fundacion', 'Fundación / ONG / organización social', '{"cliente":"Beneficiario","registro":"Aporte"}'),
  ('iglesia', 'Iglesia / club / asociación', '{"cliente":"Miembro","registro":"Aporte"}')
ON CONFLICT (tipo_negocio) DO NOTHING;
