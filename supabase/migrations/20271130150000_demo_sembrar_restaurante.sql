-- Demo de restaurante y comidas casi vacía (18-nov-2026).
-- Los datos de prueba se cargaban desde el navegador: solo 4 platos y los pedidos
-- usaban un estado ('pendiente') y una modalidad ('mostrador') que la base no acepta,
-- así que nunca se guardaban y la demo quedaba sin ventas, mesas, inventario ni clientes.
-- Esta función, SOLO para la cuenta demo de restaurante, carga en la base todo lo que
-- falte (no duplica, no borra): categorías, carta con fotos y opciones, insumos con
-- stock, recetas, mesas, repartidores, clientes, pedidos de hoy y de la semana, gastos
-- de caja y registros de propinas, liquidaciones, metas, reseñas, combos, puntos,
-- proveedores y cuentas por cobrar.

CREATE OR REPLACE FUNCTION public.demo_sembrar_restaurante()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_tipo constant text := 'restaurante';
  v_hoy timestamptz := (date_trunc('day', now() AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota');
  v_total integer := 0;
  v_id uuid;
  v_cat uuid;
  v_receta uuid;
  v_mesa uuid;
  v_rep uuid;
  v_cli uuid;
  v_suma numeric;
  v_fecha timestamptz;
  r record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sin sesión.'; END IF;
  IF v_email <> 'demo.restaurante@gosaryc.com' THEN
    RAISE EXCEPTION 'Solo disponible para la demo de restaurante.';
  END IF;

  -- La demo es dueña de su propio negocio y siempre es restaurante.
  UPDATE public.equipo_negocio SET activo = false
   WHERE user_id = v_uid AND owner_id IS NOT NULL AND owner_id <> v_uid AND activo = true;
  IF NOT EXISTS (SELECT 1 FROM public.negocio_config WHERE owner_id = v_uid) THEN
    INSERT INTO public.negocio_config (owner_id, nombre, tipo_negocio) VALUES (v_uid, 'Crokante Gourmet Demo', v_tipo);
  ELSE
    UPDATE public.negocio_config SET tipo_negocio = v_tipo
     WHERE owner_id = v_uid AND tipo_negocio IS DISTINCT FROM v_tipo;
  END IF;

  -- 1) Categorías de la carta.
  BEGIN
    INSERT INTO public.restaurante_categorias (owner_id, tipo_negocio, nombre, orden, activa)
    SELECT v_uid, v_tipo, c.nombre, c.orden, true
      FROM (VALUES ('Platos fuertes', 1), ('Comidas rápidas', 2), ('Para compartir', 3), ('Bebidas', 4), ('Postres', 5)) AS c(nombre, orden)
     WHERE NOT EXISTS (SELECT 1 FROM public.restaurante_categorias x WHERE x.owner_id = v_uid AND x.nombre = c.nombre);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: categorías no cargadas: %', SQLERRM;
  END;

  -- 2) Carta con fotos (sin duplicar por nombre; a los que ya existan se les pone categoría).
  FOR r IN
    SELECT * FROM (VALUES
      ('Chuleta Apanada Especial',     28900::numeric, 'Chuleta de cerdo apanada crocante con papa, ensalada y arroz.',      'photo-1604908176997-125f25cc6f3d', 'Platos fuertes',  true),
      ('Bandeja Paisa',                34900::numeric, 'Frijoles, arroz, chicharrón, carne molida, huevo, maduro y arepa.',   'photo-1512058564366-18510be2db19', 'Platos fuertes',  true),
      ('Pechuga a la Plancha',         27500::numeric, 'Pechuga marinada a la plancha con papa, ensalada y arroz.',           'photo-1532550907401-a500c9a57435', 'Platos fuertes',  false),
      ('Hamburguesa Artesanal Doble',  26900::numeric, 'Doble carne artesanal, queso, tocineta y vegetales frescos.',         'photo-1568901346375-23c9450c58cd', 'Comidas rápidas', true),
      ('Perro Caliente Especial',      16900::numeric, 'Salchicha americana, queso gratinado, tocineta y papa ripio.',        'photo-1612392062631-94dd858cba88', 'Comidas rápidas', false),
      ('Salchipapa Crokante',          19900::numeric, 'Papa francesa, salchicha, queso y salsas de la casa.',                'photo-1585109649139-366815a0d713', 'Comidas rápidas', false),
      ('Alitas Crujientes x12',        32900::numeric, 'Doce alitas crujientes bañadas en la salsa que elijas.',              'photo-1527477396000-e27163b481c2', 'Para compartir',  true),
      ('Picada para 2',                45900::numeric, 'Chorizo, chicharrón, carne, papa criolla, arepa y guacamole.',        'photo-1544025162-d76694265947', 'Para compartir',  false),
      ('Limonada Natural',              8500::numeric, 'Limonada natural hecha al momento, bien fría.',                       'photo-1621263764928-df1444c5e859', 'Bebidas',         false),
      ('Limonada de Coco',             11900::numeric, 'Limonada cremosa con coco, perfecta para acompañar.',                 'photo-1556679343-c7306c1976bc', 'Bebidas',         false),
      ('Gaseosa 400 ml',                5000::numeric, 'Gaseosa personal bien fría.',                                         'photo-1581636625402-29b2a704ef13', 'Bebidas',         false),
      ('Brownie con Helado',           12900::numeric, 'Brownie tibio de chocolate con bola de helado de vainilla.',          'photo-1564355808539-22fda35bed7e', 'Postres',         false)
    ) AS t(nombre, precio, descripcion, foto, categoria, destacado)
  LOOP
    BEGIN
      SELECT id INTO v_cat FROM public.restaurante_categorias
       WHERE owner_id = v_uid AND nombre = r.categoria ORDER BY created_at LIMIT 1;
      IF NOT EXISTS (SELECT 1 FROM public.restaurante_productos p WHERE p.owner_id = v_uid AND p.nombre = r.nombre) THEN
        INSERT INTO public.restaurante_productos (owner_id, tipo_negocio, nombre, precio, descripcion, imagen_url, destacado, activo, categoria_id)
        VALUES (v_uid, v_tipo, r.nombre, r.precio, r.descripcion,
                'https://images.unsplash.com/' || r.foto || '?auto=format&fit=crop&w=600&q=80',
                r.destacado, true, v_cat);
        v_total := v_total + 1;
      ELSE
        UPDATE public.restaurante_productos SET categoria_id = v_cat
         WHERE owner_id = v_uid AND nombre = r.nombre AND categoria_id IS NULL;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Demo: plato % no cargado: %', r.nombre, SQLERRM;
    END;
  END LOOP;

  -- 3) Opciones (tipo de papa y salsas) para los platos que llevan acompañante.
  BEGIN
    INSERT INTO public.restaurante_producto_opciones (owner_id, producto_id, grupo, nombre, obligatorio, multiple, precio_extra)
    SELECT v_uid, p.id, o.grupo, o.nombre, o.obligatorio, o.multiple, o.extra
      FROM public.restaurante_productos p
     CROSS JOIN (VALUES
       ('Tipo de papa', 'Papa amarilla', true,  false, 0::numeric),
       ('Tipo de papa', 'Papa francesa', true,  false, 0::numeric),
       ('Tipo de papa', 'Papa criolla',  true,  false, 1500::numeric),
       ('Salsas',       'BBQ',           false, true,  0::numeric),
       ('Salsas',       'Ajo',           false, true,  0::numeric),
       ('Salsas',       'Piña',          false, true,  500::numeric)
     ) AS o(grupo, nombre, obligatorio, multiple, extra)
     WHERE p.owner_id = v_uid
       AND p.nombre IN ('Chuleta Apanada Especial', 'Pechuga a la Plancha', 'Hamburguesa Artesanal Doble', 'Alitas Crujientes x12', 'Salchipapa Crokante')
       AND NOT EXISTS (SELECT 1 FROM public.restaurante_producto_opciones x WHERE x.producto_id = p.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: opciones no cargadas: %', SQLERRM;
  END;

  -- 4) Insumos del inventario (dos quedan por debajo del mínimo para ver la alerta).
  BEGIN
    INSERT INTO public.restaurante_insumos (owner_id, tipo_negocio, nombre, unidad, cantidad_compra, precio_compra, stock, stock_minimo, proveedor)
    SELECT v_uid, v_tipo, i.nombre, i.unidad, i.cant, i.precio, i.stock, i.minimo, i.proveedor
      FROM (VALUES
        ('Chuleta de cerdo',      'g',  1000::numeric, 22000::numeric, 18000::numeric, 5000::numeric, 'Carnes El Rodeo'),
        ('Pechuga de pollo',      'g',  1000::numeric, 16500::numeric, 12000::numeric, 4000::numeric, 'Avícola San Pedro'),
        ('Carne molida',          'g',  1000::numeric, 24000::numeric, 9000::numeric,  3000::numeric, 'Carnes El Rodeo'),
        ('Alitas de pollo',       'g',  1000::numeric, 14000::numeric, 2500::numeric,  4000::numeric, 'Avícola San Pedro'),
        ('Papa amarilla',         'g',  1000::numeric, 3200::numeric,  25000::numeric, 8000::numeric, 'Plaza Minorista'),
        ('Arroz',                 'g',  1000::numeric, 4200::numeric,  30000::numeric, 6000::numeric, 'Distribuidora La Cosecha'),
        ('Pan de hamburguesa',    'und', 12::numeric,  9600::numeric,  40::numeric,    24::numeric,   'Panadería Trigo Fino'),
        ('Queso mozarella',       'g',  1000::numeric, 26000::numeric, 1200::numeric,  2000::numeric, 'Lácteos del Norte'),
        ('Limón Tahití',          'und', 50::numeric,  12000::numeric, 120::numeric,   40::numeric,   'Plaza Minorista'),
        ('Aceite de cocina',      'ml', 3000::numeric, 21000::numeric, 9000::numeric,  3000::numeric, 'Distribuidora La Cosecha')
      ) AS i(nombre, unidad, cant, precio, stock, minimo, proveedor)
     WHERE NOT EXISTS (SELECT 1 FROM public.restaurante_insumos x WHERE x.owner_id = v_uid AND x.nombre = i.nombre);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: insumos no cargados: %', SQLERRM;
  END;

  -- 5) Recetas con ingredientes (costeo por plato).
  FOR r IN
    SELECT * FROM (VALUES
      ('Chuleta Apanada Especial',    20, 'Apanar la chuleta, freír a 175 °C por 6 min, servir con papa, arroz y ensalada.', 'Chuleta de cerdo:220|Papa amarilla:200|Arroz:150|Aceite de cocina:80'),
      ('Hamburguesa Artesanal Doble', 15, 'Asar dos carnes de 120 g, gratinar queso, armar con tocineta y vegetales.',        'Carne molida:240|Pan de hamburguesa:1|Queso mozarella:40|Papa amarilla:150'),
      ('Alitas Crujientes x12',       25, 'Freír las alitas a 170 °C, escurrir y bañar en la salsa elegida.',               'Alitas de pollo:600|Aceite de cocina:120|Papa amarilla:200'),
      ('Pechuga a la Plancha',        18, 'Marinar 30 min, asar a la plancha 5 min por lado, servir con arroz y papa.',     'Pechuga de pollo:250|Arroz:150|Papa amarilla:150'),
      ('Limonada Natural',             5, 'Licuar limón, agua, azúcar y hielo; colar y servir de inmediato.',               'Limón Tahití:3')
    ) AS t(plato, minutos, preparacion, ingredientes)
  LOOP
    BEGIN
      SELECT id INTO v_id FROM public.restaurante_productos
       WHERE owner_id = v_uid AND nombre = r.plato ORDER BY created_at LIMIT 1;
      IF v_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.restaurante_recetas x WHERE x.producto_id = v_id) THEN
        INSERT INTO public.restaurante_recetas (owner_id, tipo_negocio, producto_id, porciones, merma_pct, tiempo_min, preparacion)
        VALUES (v_uid, v_tipo, v_id, 1, 5, r.minutos, r.preparacion)
        RETURNING id INTO v_receta;
        INSERT INTO public.restaurante_receta_ingredientes (receta_id, insumo_id, cantidad)
        SELECT v_receta, i.id, split_part(x, ':', 2)::numeric
          FROM unnest(string_to_array(r.ingredientes, '|')) AS x
          JOIN LATERAL (
            SELECT id FROM public.restaurante_insumos
             WHERE owner_id = v_uid AND nombre = split_part(x, ':', 1)
             ORDER BY created_at LIMIT 1
          ) i ON true;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Demo: receta % no cargada: %', r.plato, SQLERRM;
    END;
  END LOOP;

  -- 6) Mesas del salón.
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.restaurante_mesas WHERE owner_id = v_uid) THEN
      INSERT INTO public.restaurante_mesas (owner_id, tipo_negocio, numero, capacidad, estado)
      VALUES (v_uid, v_tipo, '1', 2, 'libre'), (v_uid, v_tipo, '2', 4, 'ocupada'), (v_uid, v_tipo, '3', 4, 'libre'),
             (v_uid, v_tipo, '4', 4, 'reservada'), (v_uid, v_tipo, '5', 6, 'por_cobrar'), (v_uid, v_tipo, '6', 2, 'libre'),
             (v_uid, v_tipo, '7', 8, 'libre'), (v_uid, v_tipo, '8', 4, 'libre');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: mesas no cargadas: %', SQLERRM;
  END;

  -- 7) Repartidores.
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.restaurante_repartidores WHERE owner_id = v_uid) THEN
      INSERT INTO public.restaurante_repartidores (owner_id, tipo_negocio, nombre, telefono, documento, vehiculo, placa, activo)
      VALUES (v_uid, v_tipo, 'Sebastián Ortiz', '3016667788', '1035111222', 'Moto', 'ABC12F', true),
             (v_uid, v_tipo, 'Yeison Cardona',  '3028889900', '1036222333', 'Moto', 'XYZ98E', true),
             (v_uid, v_tipo, 'Daniela Pérez',   '3051112244', '1037333444', 'Bicicleta', NULL, true);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: repartidores no cargados: %', SQLERRM;
  END;

  -- 8) Clientes frecuentes.
  BEGIN
    INSERT INTO public.restaurante_clientes (owner_id, tipo_negocio, nombre, telefono, direccion, notas)
    SELECT v_uid, v_tipo, c.nombre, c.telefono, c.direccion, c.notas
      FROM (VALUES
        ('Laura Gómez',     '3001112233', 'Cra 70 # 44-12, Laureles',      'Prefiere papa francesa.'),
        ('Andrés Ruiz',     '3004445566', 'Calle 10 # 38-20, El Poblado',  'Pide los viernes en la noche.'),
        ('Camila Torres',   '3007778899', 'Cra 80 # 32-15, Belén',         'Sin cebolla.'),
        ('Mateo Restrepo',  '3012223344', 'Calle 50 # 65-40, Estadio',     'Cliente empresarial, almuerzos.'),
        ('Valentina Ríos',  '3045556677', 'Cra 43 # 5-60, Castropol',      'Alérgica al maní.'),
        ('Julián Herrera',  '3109990011', 'Calle 33 # 74-18, Laureles',    'Paga con Nequi.')
      ) AS c(nombre, telefono, direccion, notas)
     WHERE NOT EXISTS (SELECT 1 FROM public.restaurante_clientes x WHERE x.owner_id = v_uid AND x.telefono = c.telefono);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: clientes no cargados: %', SQLERRM;
  END;

  -- 9) Pedidos de la semana (solo si aún no hay pedidos anteriores a hoy).
  IF NOT EXISTS (SELECT 1 FROM public.restaurante_pedidos WHERE owner_id = v_uid AND created_at < v_hoy) THEN
    FOR r IN
      SELECT * FROM (VALUES
        ('Laura Gómez',    '3001112233', 'recoger',   'efectivo',      'Chuleta Apanada Especial:2|Limonada Natural:2', 1, 13),
        ('Mateo Restrepo', '3012223344', 'domicilio', 'transferencia', 'Bandeja Paisa:4|Gaseosa 400 ml:4',              1, 12),
        ('Andrés Ruiz',    '3004445566', 'mesa',      'tarjeta',       'Picada para 2:1|Limonada de Coco:2',            2, 20),
        ('Camila Torres',  '3007778899', 'domicilio', 'nequi',         'Hamburguesa Artesanal Doble:2|Gaseosa 400 ml:2', 2, 19),
        ('Valentina Ríos', '3045556677', 'recoger',   'efectivo',      'Pechuga a la Plancha:1|Limonada Natural:1',     3, 13),
        ('Julián Herrera', '3109990011', 'domicilio', 'nequi',         'Alitas Crujientes x12:1|Gaseosa 400 ml:2',      3, 21),
        ('Laura Gómez',    '3001112233', 'mesa',      'efectivo',      'Bandeja Paisa:2|Brownie con Helado:2',          4, 14),
        ('Mateo Restrepo', '3012223344', 'domicilio', 'transferencia', 'Chuleta Apanada Especial:3|Limonada Natural:3', 4, 12),
        ('Andrés Ruiz',    '3004445566', 'recoger',   'tarjeta',       'Salchipapa Crokante:2|Gaseosa 400 ml:2',        5, 20),
        ('Camila Torres',  '3007778899', 'mesa',      'nequi',         'Alitas Crujientes x12:2|Limonada de Coco:3',    5, 19),
        ('Valentina Ríos', '3045556677', 'domicilio', 'efectivo',      'Perro Caliente Especial:3|Gaseosa 400 ml:3',    6, 18),
        ('Julián Herrera', '3109990011', 'mesa',      'tarjeta',       'Picada para 2:1|Brownie con Helado:2',          6, 21)
      ) AS t(cliente, telefono, modalidad, metodo, items, dias, hora)
    LOOP
      BEGIN
        SELECT coalesce(sum(p.precio * split_part(x, ':', 2)::numeric), 0) INTO v_suma
          FROM unnest(string_to_array(r.items, '|')) AS x
          JOIN LATERAL (
            SELECT precio FROM public.restaurante_productos
             WHERE owner_id = v_uid AND nombre = split_part(x, ':', 1) ORDER BY created_at LIMIT 1
          ) p ON true;
        IF v_suma > 0 THEN
          v_fecha := v_hoy - make_interval(days => r.dias) + make_interval(hours => r.hora);
          SELECT id INTO v_cli FROM public.restaurante_clientes WHERE owner_id = v_uid AND telefono = r.telefono LIMIT 1;
          INSERT INTO public.restaurante_pedidos (
            owner_id, tipo_negocio, cliente_id, cliente_nombre, cliente_telefono, estado, modalidad, canal, metodo_pago, pago_estado,
            direccion, total, created_at)
          VALUES (v_uid, v_tipo, v_cli, r.cliente, r.telefono, 'entregado', r.modalidad,
                  CASE WHEN r.modalidad = 'domicilio' THEN 'whatsapp' ELSE 'pos' END,
                  r.metodo, 'pagado',
                  CASE WHEN r.modalidad = 'domicilio' THEN (SELECT direccion FROM public.restaurante_clientes WHERE id = v_cli) END,
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
        RAISE WARNING 'Demo: pedido histórico no cargado: %', SQLERRM;
      END;
    END LOOP;
  END IF;

  -- 10) Pedidos de hoy en todos los estados (solo si hoy aún no hay pedidos).
  IF NOT EXISTS (SELECT 1 FROM public.restaurante_pedidos WHERE owner_id = v_uid AND created_at >= v_hoy) THEN
    FOR r IN
      SELECT * FROM (VALUES
        ('Laura Gómez',    '3001112233', 'entregado',  'recoger',   'pos',      'efectivo',      'pagado',    'Chuleta Apanada Especial:1|Limonada Natural:2',   300, NULL::text, NULL::text),
        ('Andrés Ruiz',    '3004445566', 'entregado',  'mesa',      'pos',      'tarjeta',       'pagado',    'Hamburguesa Artesanal Doble:2|Gaseosa 400 ml:2', 240, '3',        NULL),
        ('Mateo Restrepo', '3012223344', 'entregado',  'domicilio', 'whatsapp', 'transferencia', 'pagado',    'Bandeja Paisa:3|Limonada de Coco:3',            200, NULL,       'Sebastián Ortiz'),
        ('Valentina Ríos', '3045556677', 'en_camino',  'domicilio', 'web',      'nequi',         'pagado',    'Alitas Crujientes x12:1|Gaseosa 400 ml:2',       45, NULL,       'Yeison Cardona'),
        ('Julián Herrera', '3109990011', 'listo',      'recoger',   'web',      'nequi',         'pagado',    'Salchipapa Crokante:2|Limonada Natural:2',       30, NULL,       NULL),
        ('Mesa 2',         '0000000000', 'preparando', 'mesa',      'pos',      'efectivo',      'pendiente', 'Picada para 2:1|Limonada de Coco:2',             20, '2',        NULL),
        ('Mesa 5',         '0000000000', 'entregado',  'mesa',      'pos',      'tarjeta',       'pendiente', 'Bandeja Paisa:2|Pechuga a la Plancha:2|Gaseosa 400 ml:4', 60, '5', NULL),
        ('Camila Torres',  '3007778899', 'nuevo',      'domicilio', 'whatsapp', 'efectivo',      'pendiente', 'Perro Caliente Especial:2|Brownie con Helado:1', 5,  NULL,       NULL)
      ) AS t(cliente, telefono, estado, modalidad, canal, metodo, pago, items, minutos, mesa, repartidor)
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
          v_cli := NULL; v_mesa := NULL; v_rep := NULL;
          SELECT id INTO v_cli FROM public.restaurante_clientes WHERE owner_id = v_uid AND telefono = r.telefono LIMIT 1;
          IF r.mesa IS NOT NULL THEN
            SELECT id INTO v_mesa FROM public.restaurante_mesas WHERE owner_id = v_uid AND numero = r.mesa LIMIT 1;
          END IF;
          IF r.repartidor IS NOT NULL THEN
            SELECT id INTO v_rep FROM public.restaurante_repartidores WHERE owner_id = v_uid AND nombre = r.repartidor LIMIT 1;
          END IF;
          INSERT INTO public.restaurante_pedidos (
            owner_id, tipo_negocio, cliente_id, mesa_id, repartidor_id, cliente_nombre, cliente_telefono, estado, modalidad, canal,
            metodo_pago, pago_estado, direccion, barrio, notas, total, created_at)
          VALUES (v_uid, v_tipo, v_cli, v_mesa, v_rep, r.cliente, r.telefono, r.estado, r.modalidad, r.canal,
                  r.metodo, r.pago,
                  CASE WHEN r.modalidad = 'domicilio' THEN (SELECT direccion FROM public.restaurante_clientes WHERE id = v_cli) END,
                  CASE WHEN r.modalidad = 'domicilio' THEN 'Medellín' END,
                  CASE WHEN r.estado = 'nuevo' THEN 'Pedido de prueba: confírmalo desde Pedidos.' END,
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
        RAISE WARNING 'Demo: pedido de hoy no cargado: %', SQLERRM;
      END;
    END LOOP;
  END IF;

  -- 11) Gastos del día en caja.
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.restaurante_movimientos_caja WHERE owner_id = v_uid AND tipo = 'gasto' AND created_at >= v_hoy) THEN
      INSERT INTO public.restaurante_movimientos_caja (owner_id, tipo_negocio, tipo, concepto, monto)
      VALUES (v_uid, v_tipo, 'gasto', 'Compra de verduras en la plaza', 86000),
             (v_uid, v_tipo, 'gasto', 'Pipeta de gas', 120000);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: gastos de caja no cargados: %', SQLERRM;
  END;

  -- 12) Registros de los demás módulos del restaurante (sin duplicar por título).
  BEGIN
    INSERT INTO public.propinas_registros (owner_id, tipo_negocio, titulo, estado, monto)
    SELECT v_uid, v_tipo, t.titulo, t.estado, t.monto
      FROM (VALUES ('Propinas turno almuerzo · Meseros', 'pendiente', 48000::numeric),
                   ('Propinas turno noche · Meseros',    'pendiente', 72000::numeric),
                   ('Propinas de ayer · Repartidores',   'hecho',     35000::numeric)) AS t(titulo, estado, monto)
     WHERE NOT EXISTS (SELECT 1 FROM public.propinas_registros x WHERE x.owner_id = v_uid AND x.titulo = t.titulo);
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Demo: propinas no cargadas: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.liquidaciones_repartidores (owner_id, tipo_negocio, titulo, estado, monto)
    SELECT v_uid, v_tipo, t.titulo, t.estado, t.monto
      FROM (VALUES ('Sebastián Ortiz · 9 domicilios', 'pendiente', 45000::numeric),
                   ('Yeison Cardona · 7 domicilios',  'pendiente', 35000::numeric),
                   ('Daniela Pérez · 4 domicilios',   'hecho',     20000::numeric)) AS t(titulo, estado, monto)
     WHERE NOT EXISTS (SELECT 1 FROM public.liquidaciones_repartidores x WHERE x.owner_id = v_uid AND x.titulo = t.titulo);
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Demo: liquidaciones no cargadas: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.metas_registros (owner_id, tipo_negocio, titulo, estado, monto, fecha)
    SELECT v_uid, v_tipo, t.titulo, t.estado, t.monto, (current_date + t.dias)
      FROM (VALUES ('Vender 12 millones este mes',        'en_proceso', 12000000::numeric, 12),
                   ('300 domicilios en el mes',           'en_proceso', 300::numeric,      12),
                   ('Ticket promedio de 45.000',          'pendiente',  45000::numeric,    30)) AS t(titulo, estado, monto, dias)
     WHERE NOT EXISTS (SELECT 1 FROM public.metas_registros x WHERE x.owner_id = v_uid AND x.titulo = t.titulo);
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Demo: metas no cargadas: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.resenas_registros (owner_id, tipo_negocio, titulo, detalle, contacto, estado)
    SELECT v_uid, v_tipo, t.titulo, t.detalle, t.contacto, t.estado
      FROM (VALUES ('5 estrellas · La mejor chuleta del barrio', 'Llegó caliente y crocante, el domiciliario muy amable.', 'Laura Gómez',    'hecho'),
                   ('4 estrellas · Muy buenas las alitas',       'Me gustaría más salsa de piña.',                         'Andrés Ruiz',    'hecho'),
                   ('Queja · Domicilio demorado',                'El pedido tardó 55 minutos. Pide revisión del tiempo.', 'Valentina Ríos', 'pendiente')) AS t(titulo, detalle, contacto, estado)
     WHERE NOT EXISTS (SELECT 1 FROM public.resenas_registros x WHERE x.owner_id = v_uid AND x.titulo = t.titulo);
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Demo: reseñas no cargadas: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.combos_registros (owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto)
    SELECT v_uid, v_tipo, t.titulo, t.detalle, t.contacto, t.estado, t.monto
      FROM (VALUES ('Combo Pareja',     'Picada para 2 + 2 limonadas de coco.',               'Todos los días', 'hecho', 64900::numeric),
                   ('Combo Familiar',   '2 bandejas paisas + 2 hamburguesas + 4 gaseosas.',   'Fines de semana', 'hecho', 119900::numeric),
                   ('Combo Ejecutivo',  'Pechuga a la plancha + limonada natural + brownie.', 'Lunes a viernes', 'hecho', 42900::numeric)) AS t(titulo, detalle, contacto, estado, monto)
     WHERE NOT EXISTS (SELECT 1 FROM public.combos_registros x WHERE x.owner_id = v_uid AND x.titulo = t.titulo);
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Demo: combos no cargados: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.fidelizacion_registros (owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto)
    SELECT v_uid, v_tipo, t.titulo, t.detalle, t.contacto, t.estado, t.monto
      FROM (VALUES ('Laura Gómez · 320 puntos',    'Le faltan 80 puntos para una chuleta gratis.', 'Laura Gómez',    'en_proceso', 320::numeric),
                   ('Mateo Restrepo · 540 puntos', 'Puede redimir una picada para 2.',             'Mateo Restrepo', 'pendiente',  540::numeric),
                   ('Camila Torres · 150 puntos',  'Cliente nueva del mes.',                       'Camila Torres',  'en_proceso', 150::numeric)) AS t(titulo, detalle, contacto, estado, monto)
     WHERE NOT EXISTS (SELECT 1 FROM public.fidelizacion_registros x WHERE x.owner_id = v_uid AND x.titulo = t.titulo);
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Demo: puntos no cargados: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.proveedores_registros (owner_id, tipo_negocio, titulo, detalle, contacto, telefono, estado, monto, abonado)
    SELECT v_uid, v_tipo, t.titulo, t.detalle, t.contacto, t.telefono, t.estado, t.monto, t.abonado
      FROM (VALUES ('Carnes El Rodeo · Factura 1045',         'Chuleta y carne molida de la semana.', 'Carnes El Rodeo',          '3043334455', 'pendiente', 640000::numeric, 300000::numeric),
                   ('Avícola San Pedro · Factura 552',        'Pechuga y alitas.',                    'Avícola San Pedro',        '3046667788', 'pendiente', 420000::numeric, 0::numeric),
                   ('Distribuidora La Cosecha · Factura 88',  'Arroz, aceite y granos.',              'Distribuidora La Cosecha', '3049990011', 'hecho',     310000::numeric, 310000::numeric)) AS t(titulo, detalle, contacto, telefono, estado, monto, abonado)
     WHERE NOT EXISTS (SELECT 1 FROM public.proveedores_registros x WHERE x.owner_id = v_uid AND x.titulo = t.titulo);
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Demo: proveedores no cargados: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.fiados (owner_id, tipo_negocio, titulo, contacto, telefono, estado, monto, abonado, fecha)
    SELECT v_uid, v_tipo, t.titulo, t.contacto, t.telefono, t.estado, t.monto, t.abonado, (current_date + t.dias)
      FROM (VALUES ('Almuerzos de la semana · Oficina Restrepo', 'Mateo Restrepo', '3012223344', 'pendiente', 285000::numeric, 100000::numeric, 5),
                   ('Pedido a crédito · Julián Herrera',         'Julián Herrera', '3109990011', 'pendiente', 64800::numeric,  0::numeric,      3)) AS t(titulo, contacto, telefono, estado, monto, abonado, dias)
     WHERE NOT EXISTS (SELECT 1 FROM public.fiados x WHERE x.owner_id = v_uid AND x.titulo = t.titulo);
  EXCEPTION WHEN OTHERS THEN RAISE WARNING 'Demo: cuentas por cobrar no cargadas: %', SQLERRM;
  END;

  -- 13) Caja abierta para vender desde el primer clic.
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.turnos_caja WHERE owner_id = v_uid AND estado = 'abierto') THEN
      INSERT INTO public.turnos_caja (owner_id, cajero, fondo_inicial, estado)
      VALUES (v_uid, 'Demo', 200000, 'abierto');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: turno de caja no abierto: %', SQLERRM;
  END;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.demo_sembrar_restaurante() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.demo_sembrar_restaurante() TO authenticated;
