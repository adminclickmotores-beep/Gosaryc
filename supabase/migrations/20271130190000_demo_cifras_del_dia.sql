-- Cifras reales del día para las 2 cuentas demo (18-nov-2026).
-- Finanzas mostraba $ 0 porque los pedidos de hoy solo se cargaban si el día aún no
-- tenía ninguno, y el concesionario no tenía ingresos de caja con fecha de hoy.
-- Esta función, SOLO para las cuentas demo, garantiza ventas, ingresos y gastos con
-- fecha de HOY (no duplica, no borra). Los asientos contables se crean solos y
-- cuadrados con los disparadores existentes de pedidos y caja.

CREATE OR REPLACE FUNCTION public.demo_cifras_del_dia()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_hoy timestamptz := (date_trunc('day', now() AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota');
  v_tipo text;
  v_total integer := 0;
  v_vendido numeric;
  v_suma numeric;
  v_id uuid;
  v_cli uuid;
  v_fecha timestamptz;
  r record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sin sesión.'; END IF;
  IF v_email NOT IN ('demo.restaurante@gosaryc.com', 'demo.vehiculos@gosaryc.com') THEN
    RAISE EXCEPTION 'Solo disponible para las cuentas demo.';
  END IF;

  IF v_email = 'demo.restaurante@gosaryc.com' THEN
    v_tipo := 'restaurante';

    -- 1) Ventas entregadas y pagadas de hoy (si hoy aún no pasan de $ 1.000.000).
    SELECT coalesce(sum(total), 0) INTO v_vendido
      FROM public.restaurante_pedidos
     WHERE owner_id = v_uid AND estado = 'entregado' AND created_at >= v_hoy;

    IF v_vendido < 1000000 THEN
      FOR r IN
        SELECT * FROM (VALUES
          ('Mateo Restrepo', '3012223344', 'domicilio', 'whatsapp', 'transferencia', 'Bandeja Paisa:8|Limonada de Coco:8',            240),
          ('Andrés Ruiz',    '3004445566', 'mesa',      'pos',      'tarjeta',       'Picada para 2:4|Gaseosa 400 ml:8',              200),
          ('Julián Herrera', '3109990011', 'domicilio', 'whatsapp', 'nequi',         'Alitas Crujientes x12:5|Limonada Natural:5',    150),
          ('Laura Gómez',    '3001112233', 'recoger',   'pos',      'efectivo',      'Chuleta Apanada Especial:6|Limonada Natural:6', 110),
          ('Camila Torres',  '3007778899', 'domicilio', 'web',      'nequi',         'Hamburguesa Artesanal Doble:5|Gaseosa 400 ml:5', 70),
          ('Valentina Ríos', '3045556677', 'mesa',      'pos',      'efectivo',      'Pechuga a la Plancha:4|Brownie con Helado:4',    40)
        ) AS t(cliente, telefono, modalidad, canal, metodo, items, minutos)
      LOOP
        BEGIN
          SELECT coalesce(sum(p.precio * split_part(x, ':', 2)::numeric), 0) INTO v_suma
            FROM unnest(string_to_array(r.items, '|')) AS x
            JOIN LATERAL (
              SELECT precio FROM public.restaurante_productos
               WHERE owner_id = v_uid AND nombre = split_part(x, ':', 1) ORDER BY created_at LIMIT 1
            ) p ON true;
          IF v_suma > 0 THEN
            v_fecha := greatest(v_hoy + interval '5 minutes', now() - make_interval(mins => r.minutos));
            v_cli := NULL;
            SELECT id INTO v_cli FROM public.restaurante_clientes WHERE owner_id = v_uid AND telefono = r.telefono LIMIT 1;
            INSERT INTO public.restaurante_pedidos (
              owner_id, tipo_negocio, cliente_id, cliente_nombre, cliente_telefono, estado, modalidad, canal,
              metodo_pago, pago_estado, direccion, barrio, total, created_at)
            VALUES (v_uid, v_tipo, v_cli, r.cliente, r.telefono, 'entregado', r.modalidad, r.canal,
                    r.metodo, 'pagado',
                    CASE WHEN r.modalidad = 'domicilio' THEN (SELECT direccion FROM public.restaurante_clientes WHERE id = v_cli) END,
                    CASE WHEN r.modalidad = 'domicilio' THEN 'Medellín' END,
                    v_suma, v_fecha)
            RETURNING id INTO v_id;
            INSERT INTO public.restaurante_pedido_items (pedido_id, producto_id, nombre, cantidad, precio_unitario, created_at)
            SELECT v_id, p.id, p.nombre, split_part(x, ':', 2)::numeric, p.precio, v_fecha
              FROM unnest(string_to_array(r.items, '|')) AS x
              JOIN LATERAL (
                SELECT id, nombre, precio FROM public.restaurante_productos
                 WHERE owner_id = v_uid AND nombre = split_part(x, ':', 1) ORDER BY created_at LIMIT 1
              ) p ON true;
            v_total := v_total + 1;
          END IF;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Demo: venta del día no cargada: %', SQLERRM;
        END;
      END LOOP;
    END IF;

    -- 2) Gastos del día en caja (sin duplicar por concepto).
    FOR r IN
      SELECT * FROM (VALUES
        ('Compra de verduras en la plaza', 86000::numeric),
        ('Pipeta de gas',                  120000::numeric)
      ) AS t(concepto, monto)
    LOOP
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM public.restaurante_movimientos_caja
                        WHERE owner_id = v_uid AND concepto = r.concepto AND created_at >= v_hoy) THEN
          INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
          VALUES (v_uid, v_tipo, 'gasto', r.concepto, r.monto);
          v_total := v_total + 1;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Demo: gasto del día no cargado: %', SQLERRM;
      END;
    END LOOP;

  ELSE
    v_tipo := 'concesionario';

    -- Ingresos ($ 28.500.000) y gastos del día del concesionario (sin duplicar por concepto).
    FOR r IN
      SELECT * FROM (VALUES
        ('ingreso', 'Venta Yamaha FZ 25 de contado',          11800000::numeric),
        ('ingreso', 'Cuota inicial Renault Duster a crédito', 15500000::numeric),
        ('ingreso', 'Taller: mantenimiento y repuestos',       1200000::numeric),
        ('gasto',   'Costo de compra Yamaha FZ 25 vendida',    9400000::numeric),
        ('gasto',   'Alistamiento y lavado de vehículos',       650000::numeric),
        ('gasto',   'Repuestos del taller',                     480000::numeric),
        ('gasto',   'Gestor de trámites y traspaso',            370000::numeric)
      ) AS t(tipo, concepto, monto)
    LOOP
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM public.restaurante_movimientos_caja
                        WHERE owner_id = v_uid AND concepto = r.concepto AND created_at >= v_hoy) THEN
          INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
          VALUES (v_uid, v_tipo, r.tipo, r.concepto, r.monto);
          v_total := v_total + 1;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Demo: movimiento del día no cargado: %', SQLERRM;
      END;
    END LOOP;
  END IF;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.demo_cifras_del_dia() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.demo_cifras_del_dia() TO authenticated;
