-- Demo de vehículos vacía (18-nov-2026).
-- Los datos de prueba se cargaban desde el navegador: los permisos del inventario,
-- los costos (que viven en otra tabla) y los módulos del concesionario los rechazaban
-- o los perdían, y la demo quedaba sin nada adentro.
-- Esta función, SOLO para la cuenta demo de vehículos, carga en la base todo lo que
-- falte (no duplica, no borra): inventario con fotos y costos, gastos de alistamiento,
-- una moto separada y un carro vendido, tasas del mes, cotizaciones, solicitudes de
-- crédito, clientes y registros de prospectos, pruebas de manejo, ventas, alistamiento,
-- cartera, comisiones, retomas, inspecciones, taller y proveedores.

CREATE OR REPLACE FUNCTION public.demo_sembrar_vehiculos()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_tipo constant text := 'concesionario';
  v_mes text := to_char(current_date, 'YYYY-MM');
  v_total integer := 0;
  v_id uuid;
  r record;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sin sesión.'; END IF;
  IF v_email <> 'demo.vehiculos@gosaryc.com' THEN
    RAISE EXCEPTION 'Solo disponible para la demo de vehículos.';
  END IF;

  -- La demo es dueña de su propio negocio y siempre es concesionario.
  UPDATE public.equipo_negocio SET activo = false
   WHERE user_id = v_uid AND owner_id IS NOT NULL AND owner_id <> v_uid AND activo = true;
  IF NOT EXISTS (SELECT 1 FROM public.negocio_config WHERE owner_id = v_uid) THEN
    INSERT INTO public.negocio_config (owner_id, nombre, tipo_negocio) VALUES (v_uid, 'ClickMotores Demo', v_tipo);
  ELSE
    UPDATE public.negocio_config SET tipo_negocio = v_tipo
     WHERE owner_id = v_uid AND tipo_negocio IS DISTINCT FROM v_tipo;
  END IF;

  -- 1) Inventario con fotos (solo si no hay vehículos activos).
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.vehiculos_inventario WHERE owner_id = v_uid AND eliminado_en IS NULL) THEN
      FOR r IN
        SELECT * FROM (VALUES
          ('moto',  'usado', 'disponible', 'Yamaha',  'FZ 25',         'Naked Sport 250cc',       '250',  2022, 14500, 'KLM45F', 'Azul',   11800000::numeric, 9400000::numeric,  'photo-1558981806-ec527fa84c39', 'Excelente estado, único dueño.',             40, 25, -12),
          ('moto',  'nuevo', 'separado',   'Honda',   'CB 150 Urbana', 'Urbana 150cc',            '150',  2026, 0,     'NUE12G', 'Rojo',   9900000::numeric,  8300000::numeric,  'photo-1568772585407-9361f9bf3a87', 'Moto nueva, lista para matrícula.',          330, 365, -6),
          ('moto',  'usado', 'disponible', 'Suzuki',  'Gixxer 150',    'Deportiva 150cc',         '150',  2021, 22800, 'MJQ27E', 'Negro',  7600000::numeric,  6100000::numeric,  'photo-1449426468159-d96dbf08f19f', 'Llantas nuevas y mantenimiento al día.',    -3, 15, -20),
          ('carro', 'usado', 'disponible', 'Mazda',   '3 Touring',     'Sedán gama media',        '2000', 2019, 62000, 'HJK321', 'Gris',   68500000::numeric, 59000000::numeric, 'photo-1494976388531-d1058494cdd8', 'Mantenimientos al día, 2 propietarios.',     110, 190, -15),
          ('carro', 'usado', 'disponible', 'Renault', 'Duster',        'SUV compacta gama media', '1600', 2020, 48000, 'TUV908', 'Blanco', 62000000::numeric, 53500000::numeric, 'photo-1519641471654-76ce0107ad1b', 'Camioneta SUV compacta, papeles al día.',    20, 260, -9),
          ('carro', 'usado', 'vendido',    'Chevrolet', 'Onix',        'Hatchback LT',            '1400', 2021, 39000, 'GTR554', 'Rojo',   52000000::numeric, 44000000::numeric, 'photo-1502877338535-766e1452684a', 'Vendido con crédito aprobado.',              200, 300, -30)
        ) AS t(tipo, condicion, estado, marca, modelo, version, cilindraje, anio, km, placa, color, precio, compra, foto, obs, soat, tecno, ingreso)
      LOOP
        BEGIN
          INSERT INTO public.vehiculos_inventario (
            owner_id, tipo, condicion, estado, marca, modelo, version, cilindraje, anio, kilometraje,
            placa, color, precio, observaciones, fotos, soat_vence, tecnomecanica_vence, fecha_ingreso)
          VALUES (
            v_uid, r.tipo, r.condicion, r.estado, r.marca, r.modelo, r.version, r.cilindraje, r.anio, r.km,
            r.placa, r.color, r.precio, r.obs,
            ARRAY['https://images.unsplash.com/' || r.foto || '?auto=format&fit=crop&w=600&q=80'],
            current_date + r.soat, current_date + r.tecno, current_date + r.ingreso)
          RETURNING id INTO v_id;
          INSERT INTO public.vehiculo_costos (vehiculo_id, owner_id, precio_compra)
          VALUES (v_id, v_uid, r.compra)
          ON CONFLICT (vehiculo_id) DO UPDATE SET precio_compra = EXCLUDED.precio_compra;
          v_total := v_total + 1;
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING 'Demo: vehículo % no cargado: %', r.placa, SQLERRM;
        END;
      END LOOP;

      UPDATE public.vehiculos_inventario
         SET separado_cliente = 'Carlos Restrepo', separado_telefono = '3015550101',
             separado_abono = 1500000, separado_fecha = current_date - 2,
             separado_notas = 'Separación por 8 días mientras sale el crédito.'
       WHERE owner_id = v_uid AND placa = 'NUE12G';
      UPDATE public.vehiculos_inventario
         SET fecha_venta = current_date - 3, precio_venta_final = 51500000,
             propietario_nombre = 'Laura Gómez', propietario_telefono = '3001112233'
       WHERE owner_id = v_uid AND placa = 'GTR554';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: inventario no cargado: %', SQLERRM;
  END;

  -- 2) Costo de compra para los vehículos que no lo tengan (incluye los cargados antes).
  BEGIN
    INSERT INTO public.vehiculo_costos (vehiculo_id, owner_id, precio_compra)
    SELECT v.id, v_uid, round(v.precio * 0.85)
      FROM public.vehiculos_inventario v
     WHERE v.owner_id = v_uid AND v.eliminado_en IS NULL
       AND NOT EXISTS (SELECT 1 FROM public.vehiculo_costos c WHERE c.vehiculo_id = v.id AND c.precio_compra IS NOT NULL)
    ON CONFLICT (vehiculo_id) DO UPDATE SET precio_compra = EXCLUDED.precio_compra;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: costos no cargados: %', SQLERRM;
  END;

  -- 3) Gastos de alistamiento por vehículo (solo a los que no tengan ninguno).
  BEGIN
    INSERT INTO public.vehiculo_gastos (owner_id, vehiculo_id, categoria, descripcion, monto, fecha, proveedor)
    SELECT v_uid, v.id, 'alistamiento', 'Alistamiento (lavado, mantenimiento y documentos)',
           CASE WHEN v.tipo = 'moto' THEN 450000 ELSE 1800000 END,
           coalesce(v.fecha_ingreso, current_date) + 2, 'Taller aliado'
      FROM public.vehiculos_inventario v
     WHERE v.owner_id = v_uid AND v.eliminado_en IS NULL
       AND NOT EXISTS (SELECT 1 FROM public.vehiculo_gastos g WHERE g.vehiculo_id = v.id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: gastos no cargados: %', SQLERRM;
  END;

  -- 4) Tasas del mes para cotizar a crédito.
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.tasas_vehiculo WHERE owner_id = v_uid AND mes = v_mes) THEN
      INSERT INTO public.tasas_vehiculo (owner_id, mes, condicion, tasa_mensual)
      VALUES (v_uid, v_mes, 'nuevo', 1.45), (v_uid, v_mes, 'usado', 1.75);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: tasas no cargadas: %', SQLERRM;
  END;

  -- 5) Cotizaciones (una a crédito y una de contado).
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.cotizaciones_vehiculo WHERE owner_id = v_uid) THEN
      INSERT INTO public.cotizaciones_vehiculo (
        owner_id, numero, cliente, telefono, vehiculo_id, vehiculo, condicion, forma_pago, precio, descuento,
        cuota_inicial, monto_financiar, plazo_meses, tasa_mensual, cuota_mensual, total_a_pagar, estado, vigente_hasta, notas)
      SELECT v_uid, 1, 'Paula Méndez', '3024445566', v.id, v.marca || ' ' || v.modelo || ' ' || v.anio, v.condicion, 'credito',
             v.precio, 0, 20000000, v.precio - 20000000, 48, 1.75,
             round((v.precio - 20000000) * 0.0175 / (1 - power(1.0175::numeric, -48))),
             round((v.precio - 20000000) * 0.0175 / (1 - power(1.0175::numeric, -48))) * 48 + 20000000,
             'enviada', current_date + 10, 'Cliente interesado en crédito a 48 meses.'
        FROM public.vehiculos_inventario v WHERE v.owner_id = v_uid AND v.placa = 'HJK321' LIMIT 1;
      INSERT INTO public.cotizaciones_vehiculo (
        owner_id, numero, cliente, telefono, vehiculo_id, vehiculo, condicion, forma_pago, precio, descuento,
        cuota_inicial, monto_financiar, total_a_pagar, estado, vigente_hasta, notas)
      SELECT v_uid, 2, 'Andrés Ruiz', '3004445566', v.id, v.marca || ' ' || v.modelo || ' ' || v.anio, v.condicion, 'contado',
             v.precio, 300000, 0, 0, v.precio - 300000, 'borrador', current_date + 7, 'Pago de contado con descuento.'
        FROM public.vehiculos_inventario v WHERE v.owner_id = v_uid AND v.placa = 'KLM45F' LIMIT 1;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: cotizaciones no cargadas: %', SQLERRM;
  END;

  -- 6) Solicitudes de crédito con financieras.
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.solicitudes_credito WHERE owner_id = v_uid) THEN
      INSERT INTO public.solicitudes_credito (
        owner_id, estado, entidad, nombre_completo, tipo_documento, numero_documento, telefono, ciudad,
        ocupacion, empresa, ingresos_mensuales, egresos_mensuales, vehiculo, valor_vehiculo, cuota_inicial,
        monto_solicitado, plazo_meses, observaciones)
      VALUES
        (v_uid, 'aprobado',  'Banco de Occidente', 'Laura Gómez',     'CC', '1036000111', '3001112233', 'Medellín', 'Empleada', 'Grupo Éxito', 5200000, 1900000, 'Chevrolet Onix 2021', 51500000, 15000000, 36500000, 60, 'Crédito aprobado y desembolsado a la entrega.'),
        (v_uid, 'enviado',   'Finanzauto',         'Paula Méndez',    'CC', '1037000222', '3024445566', 'Envigado', 'Independiente', 'Diseño PM', 6800000, 2500000, 'Mazda 3 Touring 2019', 68500000, 20000000, 48500000, 48, 'En estudio, pendiente de extractos.'),
        (v_uid, 'borrador',  'Sufi',               'Carlos Restrepo', 'CC', '1038000333', '3015550101', 'Itagüí',   'Empleado', 'Transportes RC', 3100000, 1200000, 'Honda CB 150 Urbana 2026', 9900000, 1500000, 8400000, 24, 'Moto separada, falta certificado laboral.'),
        (v_uid, 'rechazado', 'Banco de Bogotá',    'Jorge Salazar',   'CC', '1039000444', '3027778899', 'Bello',    'Independiente', NULL, 2400000, 2100000, 'Renault Duster 2020', 62000000, 5000000, 57000000, 72, 'Capacidad de pago insuficiente.');
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: créditos no cargados: %', SQLERRM;
  END;

  -- 7) Clientes del concesionario.
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.restaurante_clientes WHERE owner_id = v_uid) THEN
      INSERT INTO public.restaurante_clientes (owner_id, nombre, telefono, tipo_negocio)
      VALUES (v_uid, 'Laura Gómez', '3001112233', v_tipo),
             (v_uid, 'Paula Méndez', '3024445566', v_tipo),
             (v_uid, 'Carlos Restrepo', '3015550101', v_tipo),
             (v_uid, 'Andrés Ruiz', '3004445566', v_tipo);
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: clientes no cargados: %', SQLERRM;
  END;

  -- 8) Registros de los demás módulos del concesionario (uno por uno, sin duplicar).
  FOR r IN
    SELECT * FROM (VALUES
      ('prospectos_veh',   'Paula Méndez · Mazda 3 Touring',      'Presupuesto 70 M, crédito a 48 meses. Llegó por Instagram.', 'Asesor Juan', '3024445566', 'en_proceso', 70000000::numeric, 0::numeric, 2),
      ('prospectos_veh',   'Andrés Ruiz · Yamaha FZ 25',          'Pago de contado, quiere ver la moto el sábado.',             'Asesora Sara', '3004445566', 'pendiente', 12000000::numeric, 0::numeric, 1),
      ('pruebas_manejo',   'Mazda 3 Touring · HJK321',            'Licencia B1 vigente. Ruta: Las Palmas ida y regreso.',       'Paula Méndez', '3024445566', 'pendiente', 68500000::numeric, 0::numeric, 1),
      ('pruebas_manejo',   'Yamaha FZ 25 · KLM45F',               'Licencia A2 vigente. Ruta corta por El Poblado.',            'Andrés Ruiz', '3004445566', 'pendiente', 11800000::numeric, 0::numeric, 3),
      ('ventas_veh',       'Chevrolet Onix · GTR554 · Laura Gómez', 'Crédito Banco de Occidente. Traspaso en trámite, acta firmada.', 'Laura Gómez', '3001112233', 'hecho', 51500000::numeric, 0::numeric, -3),
      ('ventas_veh',       'Honda CB 150 Urbana · NUE12G',        'Separada con anticipo; entrega al aprobar el crédito.',      'Carlos Restrepo', '3015550101', 'pendiente', 9900000::numeric, 0::numeric, 6),
      ('alistamiento',     'Renault Duster · TUV908',             'Lavado, polichado, cambio de aceite y revisión de frenos.',  'Taller aliado', NULL, 'en_proceso', 2100000::numeric, 0::numeric, 2),
      ('alistamiento',     'Suzuki Gixxer 150 · MJQ27E',          'Kit de arrastre y renovación del SOAT.',                     'Taller aliado', NULL, 'pendiente', 520000::numeric, 0::numeric, 4),
      ('cartera_veh',      'Laura Gómez · GTR554 · Cuota 1',      'Saldo del separe a pagar en dos cuotas.',                    'Laura Gómez', '3001112233', 'pendiente', 2000000::numeric, 800000::numeric, 15),
      ('cartera_veh',      'Carlos Restrepo · NUE12G',            'Saldo del anticipo de la separación.',                       'Carlos Restrepo', '3015550101', 'pendiente', 500000::numeric, 0::numeric, 6),
      ('comisiones',       'Comisión venta Chevrolet Onix',       '1,5 % sobre la venta de GTR554.',                            'Asesor Juan', NULL, 'pendiente', 772500::numeric, 0::numeric, 5),
      ('comisiones',       'Comisión separación Honda CB 150',    'Comisión fija por separación.',                              'Asesora Sara', NULL, 'pendiente', 150000::numeric, 0::numeric, 10),
      ('vehiculos_usados', 'Kia Picanto 2016 · DFR882',           'Recibido como parte de pago. Peritaje bueno, 98.000 km.',    'Laura Gómez', '3001112233', 'en_proceso', 24000000::numeric, 0::numeric, -3),
      ('inspecciones_veh', 'Inspección Renault Duster · TUV908',  'Mecánica bien. Exterior: rayón puerta trasera. Interior bien.', 'Inspector Mario', NULL, 'hecho', 350000::numeric, 0::numeric, -8),
      ('taller',           'Mantenimiento 10.000 km · Mazda 3',   'Cambio de aceite, filtros y alineación.',                    'Técnico Pedro', '3024445566', 'en_proceso', 480000::numeric, 0::numeric, 1),
      ('proveedores_veh',  'Gestor de trámites Medellín',         'Traspasos y levantamiento de prenda. Tarifa por trámite.',   'Gestoría Ágil', '3045556677', 'pendiente', 350000::numeric, 0::numeric, 7)
    ) AS t(modulo, titulo, detalle, contacto, telefono, estado, monto, abonado, dias)
  LOOP
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM public.modulo_registros m
         WHERE m.owner_id = v_uid AND m.modulo = r.modulo AND m.titulo = r.titulo
      ) THEN
        INSERT INTO public.modulo_registros (owner_id, tipo_negocio, modulo, titulo, detalle, contacto, telefono, estado, monto, abonado, fecha)
        VALUES (v_uid, v_tipo, r.modulo, r.titulo, r.detalle, r.contacto, r.telefono, r.estado, r.monto, r.abonado, current_date + r.dias);
        v_total := v_total + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Demo: registro % no cargado: %', r.modulo, SQLERRM;
    END;
  END LOOP;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.demo_sembrar_vehiculos() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.demo_sembrar_vehiculos() TO authenticated;
