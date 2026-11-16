-- Blindaje multiempresa, contabilidad exclusiva por negocio e integridad financiera.
-- No borra ni modifica datos existentes. La columna que identifica al negocio es owner_id
-- (siempre se compara contra public.mi_negocio_id()).

-- ============================================================
-- 1. RLS: cada tabla interna solo deja pasar filas del negocio de quien consulta.
--    Política RESTRICTIVE: se suma a cualquier política permisiva anterior, así que
--    aunque quedara una política abierta, nadie ve ni escribe datos de otro negocio.
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'restaurante_clientes', 'restaurante_repartidores', 'restaurante_mesas',
    'restaurante_movimientos_caja', 'restaurante_insumos', 'restaurante_recetas',
    'restaurante_bodegas', 'restaurante_stock_bodega', 'restaurante_kardex',
    'cuentas_contables', 'asientos_contables', 'turnos_caja', 'movimientos_turno',
    'modulo_registros'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = t AND column_name = 'owner_id') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_mi_negocio', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id())',
        t || '_solo_mi_negocio', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    END IF;
  END LOOP;
END $$;

-- Pedidos: el cliente (con o sin sesión) puede CREAR un pedido, pero solo el negocio dueño
-- puede verlo, cambiarlo o borrarlo.
DO $$
DECLARE op text;
BEGIN
  IF to_regclass('public.restaurante_pedidos') IS NOT NULL THEN
    FOREACH op IN ARRAY ARRAY['SELECT', 'UPDATE', 'DELETE'] LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.restaurante_pedidos', 'pedidos_solo_mi_negocio_' || lower(op));
      IF op = 'UPDATE' THEN
        EXECUTE 'CREATE POLICY pedidos_solo_mi_negocio_update ON public.restaurante_pedidos AS RESTRICTIVE FOR UPDATE TO authenticated USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id())';
      ELSE
        EXECUTE format('CREATE POLICY %I ON public.restaurante_pedidos AS RESTRICTIVE FOR %s TO authenticated USING (owner_id = public.mi_negocio_id())',
                       'pedidos_solo_mi_negocio_' || lower(op), op);
      END IF;
    END LOOP;
  END IF;
END $$;

-- ============================================================
-- 2. Anulación en lugar de borrado: columnas de anulación y tabla de auditoría
-- ============================================================
ALTER TABLE public.asientos_contables
  ADD COLUMN IF NOT EXISTS anulado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_anulacion text,
  ADD COLUMN IF NOT EXISTS anulado_por uuid,
  ADD COLUMN IF NOT EXISTS anulado_en timestamptz,
  ADD COLUMN IF NOT EXISTS origen_tipo text,
  ADD COLUMN IF NOT EXISTS origen_id uuid;

ALTER TABLE public.restaurante_movimientos_caja
  ADD COLUMN IF NOT EXISTS anulado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS motivo_anulacion text,
  ADD COLUMN IF NOT EXISTS anulado_por uuid,
  ADD COLUMN IF NOT EXISTS anulado_en timestamptz;

ALTER TABLE public.movimientos_turno
  ADD COLUMN IF NOT EXISTS anulado_por uuid,
  ADD COLUMN IF NOT EXISTS anulado_en timestamptz;

CREATE INDEX IF NOT EXISTS asientos_contables_origen_idx ON public.asientos_contables (owner_id, origen_tipo, origen_id);

CREATE TABLE IF NOT EXISTS public.auditoria_financiera (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  tabla text NOT NULL,
  registro_id uuid,
  accion text NOT NULL,
  motivo text,
  usuario_id uuid,
  usuario_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auditoria_financiera_owner_idx ON public.auditoria_financiera (owner_id, created_at DESC);

ALTER TABLE public.auditoria_financiera ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auditoria_financiera_dueno_lectura" ON public.auditoria_financiera;
CREATE POLICY "auditoria_financiera_dueno_lectura" ON public.auditoria_financiera
  FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_admin());
REVOKE ALL ON public.auditoria_financiera FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.auditoria_financiera FROM authenticated;

-- La auditoría es inmutable: nadie con sesión puede cambiarla ni borrarla.
CREATE OR REPLACE FUNCTION public.auditoria_financiera_inmutable()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'La auditoría no se puede modificar ni borrar.';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
DROP TRIGGER IF EXISTS trg_auditoria_financiera_inmutable ON public.auditoria_financiera;
CREATE TRIGGER trg_auditoria_financiera_inmutable
  BEFORE UPDATE OR DELETE ON public.auditoria_financiera
  FOR EACH ROW EXECUTE FUNCTION public.auditoria_financiera_inmutable();

-- Anular: solo el dueño, con motivo, sin reactivar, y deja huella en la auditoría.
CREATE OR REPLACE FUNCTION public.controlar_anulacion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_motivo text := nullif(trim(coalesce(NEW.motivo_anulacion, '')), '');
  v_owner uuid := NEW.owner_id;
  v_auto boolean := coalesce(current_setting('gosaryc.auto', true), '') = 'on';
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF OLD.anulado AND NOT v_auto THEN
    RAISE EXCEPTION 'Un registro anulado no se puede modificar ni reactivar.';
  END IF;
  IF NEW.anulado AND NOT OLD.anulado THEN
    IF NOT v_auto AND NOT public.es_admin() THEN
      RAISE EXCEPTION 'Solo el dueño del negocio puede anular registros financieros.';
    END IF;
    IF v_motivo IS NULL OR length(v_motivo) < 3 THEN
      RAISE EXCEPTION 'Para anular debes escribir el motivo.';
    END IF;
    NEW.anulado_por := auth.uid();
    NEW.anulado_en := now();
    INSERT INTO public.auditoria_financiera (owner_id, tabla, registro_id, accion, motivo, usuario_id, usuario_email)
    VALUES (v_owner, TG_TABLE_NAME, NEW.id, CASE WHEN v_auto THEN 'anulación automática' ELSE 'anulación' END,
            v_motivo, auth.uid(), coalesce(auth.jwt() ->> 'email', ''));
  END IF;
  RETURN NEW;
END;
$$;

-- Prohibido el borrado físico de registros financieros y de inventario.
CREATE OR REPLACE FUNCTION public.bloquear_borrado_financiero()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Sin sesión de usuario (mantenimiento del servidor o borrado en cascada de una cuenta) no se bloquea.
  IF auth.uid() IS NULL THEN
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'No se pueden borrar registros financieros ni de inventario. Anúlalo indicando el motivo.';
END;
$$;

CREATE OR REPLACE FUNCTION public.bloquear_borrado_insumo_con_historial()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.restaurante_kardex k WHERE k.insumo_id = OLD.id) THEN
    RAISE EXCEPTION 'Este insumo tiene historial de inventario y no se puede borrar.';
  END IF;
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.bloquear_borrado_registro_con_monto()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND coalesce(OLD.monto, 0) > 0 THEN
    RAISE EXCEPTION 'Un registro con valor no se puede borrar. Anúlalo indicando el motivo.';
  END IF;
  RETURN OLD;
END;
$$;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'asientos_contables', 'movimientos_turno', 'turnos_caja', 'restaurante_movimientos_caja',
    'restaurante_kardex', 'restaurante_pedidos', 'restaurante_pedido_items'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.%I', t);
      EXECUTE format('CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero()', t);
    END IF;
  END LOOP;

  FOREACH t IN ARRAY ARRAY['asientos_contables', 'movimientos_turno', 'restaurante_movimientos_caja'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_controlar_anulacion ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_controlar_anulacion BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.controlar_anulacion()', t);
  END LOOP;
END $$;

DROP TRIGGER IF EXISTS trg_sin_borrado_insumo ON public.restaurante_insumos;
CREATE TRIGGER trg_sin_borrado_insumo BEFORE DELETE ON public.restaurante_insumos
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_insumo_con_historial();

DROP TRIGGER IF EXISTS trg_sin_borrado_registro_con_monto ON public.modulo_registros;
CREATE TRIGGER trg_sin_borrado_registro_con_monto BEFORE DELETE ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_registro_con_monto();

-- ============================================================
-- 3. Plan de cuentas propio de cada negocio (se crea solo)
-- ============================================================
CREATE OR REPLACE FUNCTION public.inicializar_plan_cuentas(p_owner uuid, p_tipo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_owner IS NULL THEN RETURN; END IF;
  INSERT INTO public.cuentas_contables (owner_id, codigo, nombre, tipo, tipo_negocio)
  SELECT p_owner, v.codigo, v.nombre, v.tipo, p_tipo
    FROM (VALUES
      ('1105', 'Caja', 'activo'),
      ('1110', 'Bancos', 'activo'),
      ('1305', 'Cuentas por cobrar (fiados)', 'activo'),
      ('1435', 'Inventario de insumos', 'activo'),
      ('2205', 'Proveedores por pagar', 'pasivo'),
      ('2505', 'Nómina por pagar', 'pasivo'),
      ('4135', 'Ventas', 'ingreso'),
      ('4210', 'Otros ingresos', 'ingreso'),
      ('5105', 'Nómina', 'gasto'),
      ('5120', 'Arriendo', 'gasto'),
      ('5135', 'Servicios públicos', 'gasto'),
      ('6135', 'Compras de insumos', 'gasto'),
      ('5195', 'Otros gastos', 'gasto')
    ) AS v(codigo, nombre, tipo)
   WHERE NOT EXISTS (
     SELECT 1 FROM public.cuentas_contables c
      WHERE c.owner_id = p_owner AND c.codigo = v.codigo
        AND public.clave_tipo_negocio(c.tipo_negocio) = public.clave_tipo_negocio(p_tipo));
END;
$$;
REVOKE ALL ON FUNCTION public.inicializar_plan_cuentas(uuid, text) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.negocio_config_plan_cuentas()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
    PERFORM public.inicializar_plan_cuentas(NEW.owner_id, public.clave_tipo_negocio(NEW.tipo_negocio));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo crear el plan de cuentas: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_negocio_plan_cuentas ON public.negocio_config;
CREATE TRIGGER trg_negocio_plan_cuentas
  AFTER INSERT OR UPDATE OF tipo_negocio ON public.negocio_config
  FOR EACH ROW EXECUTE FUNCTION public.negocio_config_plan_cuentas();

-- Negocios que ya existen reciben su plan de cuentas (no duplica los que ya lo tienen).
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT owner_id, public.clave_tipo_negocio(tipo_negocio) AS tipo
             FROM public.negocio_config WHERE owner_id IS NOT NULL LOOP
    PERFORM public.inicializar_plan_cuentas(r.owner_id, r.tipo);
  END LOOP;
END $$;

-- ============================================================
-- 4. Asientos automáticos (ventas, compras y gastos) en el negocio de cada registro
-- ============================================================
CREATE OR REPLACE FUNCTION public.registrar_asiento_auto(
  p_owner uuid, p_tipo text, p_concepto text, p_origen_tipo text, p_origen_id uuid, p_lineas jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_asiento uuid := gen_random_uuid();
  v_tipo text := public.clave_tipo_negocio(p_tipo);
  l jsonb;
  v_cuenta uuid;
BEGIN
  IF p_owner IS NULL OR p_origen_id IS NULL THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.asientos_contables a
              WHERE a.owner_id = p_owner AND a.origen_tipo = p_origen_tipo AND a.origen_id = p_origen_id AND NOT a.anulado) THEN
    RETURN;
  END IF;
  PERFORM public.inicializar_plan_cuentas(p_owner, v_tipo);
  FOR l IN SELECT * FROM jsonb_array_elements(p_lineas) LOOP
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
REVOKE ALL ON FUNCTION public.registrar_asiento_auto(uuid, text, text, text, uuid, jsonb) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.tipo_de_negocio(p_owner uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.clave_tipo_negocio((SELECT n.tipo_negocio FROM public.negocio_config n WHERE n.owner_id = p_owner LIMIT 1));
$$;
REVOKE ALL ON FUNCTION public.tipo_de_negocio(uuid) FROM public, anon, authenticated;

-- Ventas: al cerrarse el pedido (entregado o pagado). Si queda a crédito, va a cuentas por cobrar.
CREATE OR REPLACE FUNCTION public.asiento_auto_pedido()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tipo text;
  v_cobro text;
  v_cerrado boolean := NEW.estado = 'entregado' OR NEW.pago_estado = 'pagado';
BEGIN
  BEGIN
    IF NEW.owner_id IS NULL OR coalesce(NEW.total, 0) <= 0 THEN RETURN NEW; END IF;
    v_tipo := coalesce(NEW.tipo_negocio, public.tipo_de_negocio(NEW.owner_id));
    v_cobro := CASE WHEN coalesce(NEW.metodo_pago, 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
    IF v_cerrado THEN
      IF NEW.pago_estado = 'pagado' THEN
        PERFORM public.registrar_asiento_auto(NEW.owner_id, v_tipo, 'Venta pedido', 'pedido_venta', NEW.id,
          jsonb_build_array(jsonb_build_object('codigo', v_cobro, 'debe', NEW.total),
                            jsonb_build_object('codigo', '4135', 'haber', NEW.total)));
      ELSE
        PERFORM public.registrar_asiento_auto(NEW.owner_id, v_tipo, 'Venta a crédito', 'pedido_venta_credito', NEW.id,
          jsonb_build_array(jsonb_build_object('codigo', '1305', 'debe', NEW.total),
                            jsonb_build_object('codigo', '4135', 'haber', NEW.total)));
      END IF;
    END IF;
    -- Cobro posterior de una venta que se había dejado a crédito.
    IF NEW.pago_estado = 'pagado' AND EXISTS (
         SELECT 1 FROM public.asientos_contables a
          WHERE a.owner_id = NEW.owner_id AND a.origen_tipo = 'pedido_venta_credito' AND a.origen_id = NEW.id AND NOT a.anulado) THEN
      PERFORM public.registrar_asiento_auto(NEW.owner_id, v_tipo, 'Cobro de venta a crédito', 'pedido_cobro', NEW.id,
        jsonb_build_array(jsonb_build_object('codigo', v_cobro, 'debe', NEW.total),
                          jsonb_build_object('codigo', '1305', 'haber', NEW.total)));
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento del pedido %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_asiento_auto_pedido ON public.restaurante_pedidos;
CREATE TRIGGER trg_asiento_auto_pedido
  AFTER INSERT OR UPDATE OF estado, pago_estado ON public.restaurante_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.asiento_auto_pedido();

-- Compras a proveedores: contado sale de caja; lo no abonado queda como cuenta por pagar.
CREATE OR REPLACE FUNCTION public.asiento_auto_compra()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lineas jsonb;
  v_pagado numeric;
BEGIN
  BEGIN
    IF NEW.modulo NOT LIKE 'proveedores%' OR NEW.owner_id IS NULL OR coalesce(NEW.monto, 0) <= 0 THEN RETURN NEW; END IF;
    v_pagado := least(greatest(coalesce(NEW.abonado, 0), 0), NEW.monto);
    v_lineas := jsonb_build_array(jsonb_build_object('codigo', '6135', 'debe', NEW.monto));
    IF v_pagado > 0 THEN
      v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '1105', 'haber', v_pagado));
    END IF;
    IF NEW.monto - v_pagado > 0 THEN
      v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '2205', 'haber', NEW.monto - v_pagado));
    END IF;
    PERFORM public.registrar_asiento_auto(NEW.owner_id, coalesce(to_jsonb(NEW) ->> 'tipo_negocio', public.tipo_de_negocio(NEW.owner_id)),
      'Compra: ' || coalesce(NEW.titulo, 'proveedor'), 'compra', NEW.id, v_lineas);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento de la compra %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_asiento_auto_compra ON public.modulo_registros;
CREATE TRIGGER trg_asiento_auto_compra
  AFTER INSERT ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.asiento_auto_compra();

-- Gastos e ingresos de caja.
CREATE OR REPLACE FUNCTION public.asiento_auto_caja()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  BEGIN
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
DROP TRIGGER IF EXISTS trg_asiento_auto_caja ON public.restaurante_movimientos_caja;
CREATE TRIGGER trg_asiento_auto_caja
  AFTER INSERT ON public.restaurante_movimientos_caja
  FOR EACH ROW EXECUTE FUNCTION public.asiento_auto_caja();

-- Si se anula el origen (pedido cancelado, gasto o compra anulados), se anulan sus asientos con auditoría.
CREATE OR REPLACE FUNCTION public.propagar_anulacion_asiento()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_ahora boolean;
  v_antes boolean;
BEGIN
  v_ahora := coalesce((to_jsonb(NEW) ->> 'anulado')::boolean, false) OR (TG_TABLE_NAME = 'restaurante_pedidos' AND NEW.estado = 'cancelado');
  v_antes := coalesce((to_jsonb(OLD) ->> 'anulado')::boolean, false) OR (TG_TABLE_NAME = 'restaurante_pedidos' AND OLD.estado = 'cancelado');
  IF v_ahora AND NOT v_antes THEN
    BEGIN
      PERFORM set_config('gosaryc.auto', 'on', true);
      UPDATE public.asientos_contables
         SET anulado = true,
             motivo_anulacion = coalesce(nullif(to_jsonb(NEW) ->> 'motivo_anulacion', ''), 'Se anuló el registro de origen')
       WHERE owner_id = NEW.owner_id AND origen_id = NEW.id AND NOT anulado;
      PERFORM set_config('gosaryc.auto', 'off', true);
    EXCEPTION WHEN OTHERS THEN
      PERFORM set_config('gosaryc.auto', 'off', true);
      RAISE WARNING 'No se pudo anular el asiento de %: %', NEW.id, SQLERRM;
    END;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_propagar_anulacion ON public.restaurante_pedidos;
CREATE TRIGGER trg_propagar_anulacion AFTER UPDATE OF estado ON public.restaurante_pedidos
  FOR EACH ROW EXECUTE FUNCTION public.propagar_anulacion_asiento();
DROP TRIGGER IF EXISTS trg_propagar_anulacion ON public.restaurante_movimientos_caja;
CREATE TRIGGER trg_propagar_anulacion AFTER UPDATE OF anulado ON public.restaurante_movimientos_caja
  FOR EACH ROW EXECUTE FUNCTION public.propagar_anulacion_asiento();
DROP TRIGGER IF EXISTS trg_propagar_anulacion ON public.modulo_registros;
CREATE TRIGGER trg_propagar_anulacion AFTER UPDATE OF anulado ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.propagar_anulacion_asiento();
