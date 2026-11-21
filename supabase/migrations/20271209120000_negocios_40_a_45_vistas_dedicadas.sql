-- TANDA 2: negocios 40 a 45 con vistas propias + mora automática en préstamos
--   alq_*  Alquiler de vehículos (flota, contratos con depósito, entrega con recargos, multas)
--   seg_*  Seguridad y aseo (puestos, turnos, novedades, dotación desde inventario, facturación mensual)
--   gan_*  Ganadería (animales por chapeta, pesajes, sanidad, producción, insumos, guías, venta por kilo o cabeza)
--   fun_*  Fundación (donantes, donaciones con certificado, proyectos, beneficiarios, ejecución presupuestal)
--   igl_*  Iglesia (miembros, grupos, ingresos por concepto y fondo, egresos, cierre por culto o periodo)
--   parq_* Parqueadero (abonados mensuales con cobro a Caja)
-- Todo con owner_id = mi_negocio_id(), RLS estricto, sin borrado físico y asiento contable cuadrado. Nada se borra ni trunca.

-- ============================================================
-- 0. Ayudas compartidas
-- ============================================================
CREATE OR REPLACE FUNCTION public.neg_asegurar_t2(p_owner uuid, p_tipo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.neg_asegurar(p_owner, p_tipo);
  PERFORM public.pan_asegurar_cuenta(p_owner, p_tipo, '1305', 'Cuentas por cobrar', 'activo');
  PERFORM public.pan_asegurar_cuenta(p_owner, p_tipo, '1435', 'Inventario de dotación, insumos y donaciones', 'activo');
  PERFORM public.pan_asegurar_cuenta(p_owner, p_tipo, '2805', 'Anticipos y depósitos recibidos', 'pasivo');
  PERFORM public.pan_asegurar_cuenta(p_owner, p_tipo, '4705', 'Donaciones, diezmos y aportes', 'ingreso');
  PERFORM public.pan_asegurar_cuenta(p_owner, p_tipo, '5195', 'Gastos operativos y obra social', 'gasto');
END;
$$;
REVOKE ALL ON FUNCTION public.neg_asegurar_t2(uuid, text) FROM public, anon, authenticated;

-- Asiento cuadrado: si falla el asiento no se pierde la operación (queda aviso en el registro).
CREATE OR REPLACE FUNCTION public.neg_asiento(p_owner uuid, p_tipo text, p_desc text, p_origen text, p_ref uuid, p_lineas jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.neg_asegurar_t2(p_owner, p_tipo);
  PERFORM public.registrar_asiento_movimiento(p_owner, p_tipo, left(p_desc, 200), p_origen, p_ref, p_lineas);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'No se pudo registrar el asiento (%): %', p_origen, SQLERRM;
END;
$$;
REVOKE ALL ON FUNCTION public.neg_asiento(uuid, text, text, text, uuid, jsonb) FROM public, anon, authenticated;

-- Impide pasar a (o salir de) los estados reservados a una acción (alquilado, vendido).
CREATE OR REPLACE FUNCTION public.neg_proteger_estado()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF coalesce(current_setting('gosaryc.neg', true), '') = 'on' THEN RETURN NEW; END IF;
  IF NEW.estado IS DISTINCT FROM OLD.estado AND (NEW.estado = ANY (TG_ARGV) OR OLD.estado = ANY (TG_ARGV)) THEN
    RAISE EXCEPTION 'Ese estado solo cambia con la acción correspondiente.';
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================================
-- 1. Tablas
-- ============================================================
-- #40 Alquiler de vehículos
CREATE TABLE IF NOT EXISTS public.alq_vehiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  placa text NOT NULL CHECK (length(trim(placa)) >= 4),
  descripcion text NOT NULL CHECK (length(trim(descripcion)) >= 2),
  foto_ruta text,
  tarifa_dia numeric NOT NULL DEFAULT 0 CHECK (tarifa_dia >= 0),
  tarifa_hora numeric NOT NULL DEFAULT 0 CHECK (tarifa_hora >= 0),
  km_incluidos_dia numeric NOT NULL DEFAULT 200 CHECK (km_incluidos_dia >= 0),
  valor_km_extra numeric NOT NULL DEFAULT 0 CHECK (valor_km_extra >= 0),
  valor_tanque numeric NOT NULL DEFAULT 0 CHECK (valor_tanque >= 0),
  km_actual numeric NOT NULL DEFAULT 0 CHECK (km_actual >= 0),
  estado text NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'alquilado', 'mantenimiento')),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS alq_vehiculos_placa_idx ON public.alq_vehiculos (owner_id, upper(placa));

CREATE TABLE IF NOT EXISTS public.alq_contratos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  vehiculo_id uuid NOT NULL REFERENCES public.alq_vehiculos(id) ON DELETE RESTRICT,
  placa text NOT NULL,
  descripcion text NOT NULL,
  cliente text NOT NULL,
  documento text,
  telefono text,
  modalidad text NOT NULL CHECK (modalidad IN ('dias', 'horas')),
  cantidad integer NOT NULL CHECK (cantidad > 0),
  tarifa numeric NOT NULL DEFAULT 0,
  deposito numeric NOT NULL DEFAULT 0,
  salida timestamptz NOT NULL DEFAULT now(),
  prevista timestamptz,
  km_salida numeric NOT NULL DEFAULT 0,
  combustible_salida integer NOT NULL DEFAULT 100,
  estado text NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
  km_entrega numeric,
  combustible_entrega integer,
  recargo_km numeric NOT NULL DEFAULT 0,
  recargo_combustible numeric NOT NULL DEFAULT 0,
  recargo_dano numeric NOT NULL DEFAULT 0,
  recargo_demora numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  saldo_cobrado numeric NOT NULL DEFAULT 0,
  metodo text,
  cerrado_en timestamptz,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS alq_contratos_owner_idx ON public.alq_contratos (owner_id, estado, salida DESC);

CREATE TABLE IF NOT EXISTS public.alq_multas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  contrato_id uuid REFERENCES public.alq_contratos(id) ON DELETE RESTRICT,
  placa text NOT NULL,
  cliente text NOT NULL,
  concepto text NOT NULL DEFAULT 'multa' CHECK (concepto IN ('multa', 'peaje', 'otro')),
  detalle text,
  valor numeric NOT NULL CHECK (valor > 0),
  fecha date NOT NULL DEFAULT current_date,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'cobrada')),
  metodo text,
  cobrada_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- #41 Seguridad y aseo
CREATE TABLE IF NOT EXISTS public.seg_puestos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  sede text NOT NULL CHECK (length(trim(sede)) >= 1),
  servicio text NOT NULL DEFAULT 'Vigilancia',
  personal_requerido integer NOT NULL DEFAULT 1 CHECK (personal_requerido >= 1 AND personal_requerido <= 500),
  turno text NOT NULL DEFAULT '12 horas',
  supervisor text,
  telefono text,
  valor_mensual numeric NOT NULL DEFAULT 0 CHECK (valor_mensual >= 0),
  inicio date NOT NULL DEFAULT current_date,
  fin date,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seg_turnos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  puesto_id uuid NOT NULL REFERENCES public.seg_puestos(id) ON DELETE RESTRICT,
  empleado text NOT NULL CHECK (length(trim(empleado)) >= 2),
  fecha date NOT NULL,
  turno text NOT NULL DEFAULT 'diurno' CHECK (turno IN ('diurno', 'nocturno', '24h')),
  estado text NOT NULL DEFAULT 'programado' CHECK (estado IN ('programado', 'cubierto', 'reemplazo', 'falta')),
  reemplazo text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS seg_turnos_unico_idx ON public.seg_turnos (owner_id, lower(empleado), fecha, turno);
CREATE INDEX IF NOT EXISTS seg_turnos_fecha_idx ON public.seg_turnos (owner_id, fecha);

CREATE TABLE IF NOT EXISTS public.seg_novedades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  puesto_id uuid NOT NULL REFERENCES public.seg_puestos(id) ON DELETE RESTRICT,
  tipo text NOT NULL DEFAULT 'ronda' CHECK (tipo IN ('ronda', 'incidente', 'queja', 'falta', 'otro')),
  detalle text NOT NULL CHECK (length(trim(detalle)) >= 2),
  accion text,
  empleado text,
  fecha timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seg_insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  elemento text NOT NULL CHECK (length(trim(elemento)) >= 2),
  unidad text NOT NULL DEFAULT 'und',
  stock numeric NOT NULL DEFAULT 0 CHECK (stock >= 0),
  costo numeric NOT NULL DEFAULT 0 CHECK (costo >= 0),
  meses_reposicion integer NOT NULL DEFAULT 4 CHECK (meses_reposicion >= 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seg_entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  insumo_id uuid NOT NULL REFERENCES public.seg_insumos(id) ON DELETE RESTRICT,
  elemento text NOT NULL,
  empleado text NOT NULL,
  puesto text,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  costo_total numeric NOT NULL DEFAULT 0,
  fecha date NOT NULL DEFAULT current_date,
  proxima_entrega date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seg_facturas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  puesto_id uuid NOT NULL REFERENCES public.seg_puestos(id) ON DELETE RESTRICT,
  cliente text NOT NULL,
  sede text NOT NULL,
  periodo text NOT NULL CHECK (periodo ~ '^[0-9]{4}-[0-9]{2}$'),
  valor numeric NOT NULL CHECK (valor >= 0),
  vence date NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'pagada')),
  metodo text,
  pagada_en timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS seg_facturas_unica_idx ON public.seg_facturas (puesto_id, periodo);

-- #42 Ganadería
CREATE TABLE IF NOT EXISTS public.gan_animales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  chapeta text NOT NULL CHECK (length(trim(chapeta)) >= 1),
  especie text NOT NULL DEFAULT 'bovino' CHECK (especie IN ('bovino', 'porcino', 'ave', 'equino', 'ovino', 'caprino')),
  sexo text NOT NULL DEFAULT 'hembra' CHECK (sexo IN ('macho', 'hembra')),
  raza text,
  lote text,
  potrero text,
  fecha_nacimiento date,
  fecha_ingreso date NOT NULL DEFAULT current_date,
  peso_inicial numeric NOT NULL DEFAULT 0 CHECK (peso_inicial >= 0),
  peso_actual numeric NOT NULL DEFAULT 0 CHECK (peso_actual >= 0),
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'vendido', 'muerto')),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS gan_animales_chapeta_idx ON public.gan_animales (owner_id, lower(chapeta));

CREATE TABLE IF NOT EXISTS public.gan_pesajes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  animal_id uuid NOT NULL REFERENCES public.gan_animales(id) ON DELETE RESTRICT,
  chapeta text NOT NULL,
  fecha date NOT NULL,
  peso numeric NOT NULL CHECK (peso > 0),
  dias integer,
  ganancia_dia numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gan_pesajes_animal_idx ON public.gan_pesajes (animal_id, fecha);

CREATE TABLE IF NOT EXISTS public.gan_sanidad (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  animal_id uuid REFERENCES public.gan_animales(id) ON DELETE RESTRICT,
  chapeta text,
  lote text,
  tipo text NOT NULL DEFAULT 'vacuna' CHECK (tipo IN ('vacuna', 'desparasitacion', 'parto', 'tratamiento')),
  producto text NOT NULL CHECK (length(trim(producto)) >= 2),
  fecha date NOT NULL DEFAULT current_date,
  proxima date,
  registro_ica text,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gan_produccion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  fecha date NOT NULL DEFAULT current_date,
  tipo text NOT NULL DEFAULT 'leche' CHECK (tipo IN ('leche', 'crias', 'huevos', 'carne')),
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  unidad text NOT NULL DEFAULT 'litros',
  lote text,
  chapeta text,
  valor numeric NOT NULL DEFAULT 0 CHECK (valor >= 0),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gan_insumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  unidad text NOT NULL DEFAULT 'kg',
  stock numeric NOT NULL DEFAULT 0 CHECK (stock >= 0),
  stock_minimo numeric NOT NULL DEFAULT 0 CHECK (stock_minimo >= 0),
  costo numeric NOT NULL DEFAULT 0 CHECK (costo >= 0),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gan_consumos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  insumo_id uuid NOT NULL REFERENCES public.gan_insumos(id) ON DELETE RESTRICT,
  nombre text NOT NULL,
  lote text,
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  costo_total numeric NOT NULL DEFAULT 0,
  fecha date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gan_guias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  numero text NOT NULL CHECK (length(trim(numero)) >= 1),
  origen text NOT NULL,
  destino text NOT NULL,
  cantidad integer NOT NULL CHECK (cantidad > 0),
  chapetas text,
  emitida date NOT NULL DEFAULT current_date,
  vence date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gan_ventas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  comprador text NOT NULL,
  modalidad text NOT NULL CHECK (modalidad IN ('kilo', 'cabeza')),
  precio numeric NOT NULL CHECK (precio > 0),
  animales integer NOT NULL DEFAULT 0,
  kilos numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  metodo text NOT NULL DEFAULT 'efectivo',
  fecha date NOT NULL DEFAULT current_date,
  detalle jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- #43 Fundación
CREATE TABLE IF NOT EXISTS public.fun_donantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  documento text,
  tipo text NOT NULL DEFAULT 'persona' CHECK (tipo IN ('persona', 'empresa', 'patrocinador')),
  telefono text,
  correo text,
  ciudad text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fun_proyectos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  descripcion text,
  presupuesto numeric NOT NULL DEFAULT 0 CHECK (presupuesto >= 0),
  ejecutado numeric NOT NULL DEFAULT 0 CHECK (ejecutado >= 0),
  meta_beneficiarios integer NOT NULL DEFAULT 0 CHECK (meta_beneficiarios >= 0),
  estado text NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cerrado')),
  inicio date NOT NULL DEFAULT current_date,
  fin date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fun_beneficiarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  proyecto_id uuid NOT NULL REFERENCES public.fun_proyectos(id) ON DELETE RESTRICT,
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  documento text,
  telefono text,
  necesidad text,
  consentimiento boolean NOT NULL DEFAULT false,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fun_donaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  donante_id uuid NOT NULL REFERENCES public.fun_donantes(id) ON DELETE RESTRICT,
  donante text NOT NULL,
  documento text,
  tipo text NOT NULL CHECK (tipo IN ('dinero', 'especie')),
  descripcion text,
  valor numeric NOT NULL CHECK (valor > 0),
  proyecto_id uuid REFERENCES public.fun_proyectos(id) ON DELETE RESTRICT,
  proyecto text,
  metodo text,
  certificado text NOT NULL,
  fecha date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fun_gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  proyecto_id uuid NOT NULL REFERENCES public.fun_proyectos(id) ON DELETE RESTRICT,
  proyecto text NOT NULL,
  concepto text NOT NULL,
  valor numeric NOT NULL CHECK (valor > 0),
  metodo text NOT NULL DEFAULT 'efectivo',
  fecha date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fun_voluntarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  documento text,
  telefono text,
  area text NOT NULL DEFAULT 'General',
  horas_mes numeric NOT NULL DEFAULT 0 CHECK (horas_mes >= 0),
  desde date NOT NULL DEFAULT current_date,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- #44 Iglesia
CREATE TABLE IF NOT EXISTS public.igl_miembros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  documento text,
  telefono text,
  familia text,
  ministerio text,
  grupo text,
  fecha_bautizo date,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.igl_grupos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  tipo text NOT NULL DEFAULT 'ministerio' CHECK (tipo IN ('ministerio', 'celula', 'grupo')),
  lider text,
  dia_reunion text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.igl_ingresos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  miembro_id uuid,
  miembro text,
  concepto text NOT NULL CHECK (concepto IN ('diezmo', 'ofrenda', 'primicia', 'evento')),
  fondo text NOT NULL DEFAULT 'General',
  valor numeric NOT NULL CHECK (valor > 0),
  metodo text NOT NULL DEFAULT 'efectivo',
  culto text NOT NULL DEFAULT '',
  evento text,
  fecha date NOT NULL DEFAULT current_date,
  recibo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS igl_ingresos_owner_idx ON public.igl_ingresos (owner_id, fecha DESC);

CREATE TABLE IF NOT EXISTS public.igl_egresos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  fondo text NOT NULL DEFAULT 'General',
  concepto text NOT NULL,
  obra_social boolean NOT NULL DEFAULT false,
  valor numeric NOT NULL CHECK (valor > 0),
  metodo text NOT NULL DEFAULT 'efectivo',
  culto text NOT NULL DEFAULT '',
  evento text,
  fecha date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS igl_egresos_owner_idx ON public.igl_egresos (owner_id, fecha DESC);

CREATE TABLE IF NOT EXISTS public.igl_cierres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  culto text NOT NULL DEFAULT '',
  desde date NOT NULL,
  hasta date NOT NULL,
  diezmos numeric NOT NULL DEFAULT 0,
  ofrendas numeric NOT NULL DEFAULT 0,
  primicias numeric NOT NULL DEFAULT 0,
  eventos numeric NOT NULL DEFAULT 0,
  egresos numeric NOT NULL DEFAULT 0,
  neto numeric NOT NULL DEFAULT 0,
  por_fondo jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS igl_cierres_unico_idx ON public.igl_cierres (owner_id, culto, desde, hasta);

CREATE TABLE IF NOT EXISTS public.igl_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  fecha date NOT NULL,
  lugar text,
  presupuesto numeric NOT NULL DEFAULT 0 CHECK (presupuesto >= 0),
  estado text NOT NULL DEFAULT 'programado' CHECK (estado IN ('programado', 'realizado', 'cancelado')),
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.igl_visitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  persona text NOT NULL CHECK (length(trim(persona)) >= 2),
  tipo text NOT NULL DEFAULT 'nuevo' CHECK (tipo IN ('hospital', 'consejeria', 'nuevo', 'hogar')),
  fecha date NOT NULL DEFAULT current_date,
  responsable text,
  notas text,
  seguimiento text NOT NULL DEFAULT 'pendiente' CHECK (seguimiento IN ('pendiente', 'hecho')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- #45 Parqueadero
CREATE TABLE IF NOT EXISTS public.parq_abonados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  placa text NOT NULL CHECK (length(trim(placa)) >= 3),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 2),
  telefono text,
  tarifa_mensual numeric NOT NULL DEFAULT 0 CHECK (tarifa_mensual >= 0),
  vence date NOT NULL DEFAULT current_date,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS parq_abonados_placa_idx ON public.parq_abonados (owner_id, upper(placa));

CREATE TABLE IF NOT EXISTS public.parq_pagos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  abonado_id uuid NOT NULL REFERENCES public.parq_abonados(id) ON DELETE RESTRICT,
  placa text NOT NULL,
  nombre text NOT NULL,
  valor numeric NOT NULL CHECK (valor > 0),
  desde date NOT NULL,
  hasta date NOT NULL,
  metodo text NOT NULL DEFAULT 'efectivo',
  recibo text NOT NULL,
  fecha date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Mora de préstamos (tasa moratoria mensual por crédito y mora ya cobrada por cuota)
ALTER TABLE public.pre_creditos ADD COLUMN IF NOT EXISTS tasa_mora_pct numeric NOT NULL DEFAULT 0 CHECK (tasa_mora_pct >= 0 AND tasa_mora_pct <= 10);
ALTER TABLE public.pre_cuotas ADD COLUMN IF NOT EXISTS mora_cobrada numeric NOT NULL DEFAULT 0;
ALTER TABLE public.pre_abonos ADD COLUMN IF NOT EXISTS mora numeric NOT NULL DEFAULT 0;

-- ============================================================
-- 2. RLS estricto, escritura directa solo donde corresponde, sin borrado físico
-- ============================================================
DO $$
DECLARE
  t text;
  todas text[] := ARRAY[
    'alq_vehiculos', 'alq_contratos', 'alq_multas',
    'seg_puestos', 'seg_turnos', 'seg_novedades', 'seg_insumos', 'seg_entregas', 'seg_facturas',
    'gan_animales', 'gan_pesajes', 'gan_sanidad', 'gan_produccion', 'gan_insumos', 'gan_consumos', 'gan_guias', 'gan_ventas',
    'fun_donantes', 'fun_proyectos', 'fun_beneficiarios', 'fun_donaciones', 'fun_gastos', 'fun_voluntarios',
    'igl_miembros', 'igl_grupos', 'igl_ingresos', 'igl_egresos', 'igl_cierres', 'igl_eventos', 'igl_visitas',
    'parq_abonados', 'parq_pagos'];
  editables text[] := ARRAY[
    'alq_vehiculos', 'seg_puestos', 'seg_turnos', 'seg_insumos', 'gan_animales', 'gan_insumos',
    'fun_donantes', 'fun_proyectos', 'fun_beneficiarios', 'fun_voluntarios',
    'igl_miembros', 'igl_grupos', 'igl_eventos', 'igl_visitas', 'parq_abonados'];
  insertables text[] := ARRAY[
    'alq_vehiculos', 'alq_multas', 'seg_puestos', 'seg_turnos', 'seg_novedades', 'seg_insumos',
    'gan_animales', 'gan_sanidad', 'gan_produccion', 'gan_insumos', 'gan_guias',
    'fun_donantes', 'fun_proyectos', 'fun_beneficiarios', 'fun_voluntarios',
    'igl_miembros', 'igl_grupos', 'igl_eventos', 'igl_visitas', 'parq_abonados'];
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

-- Condiciones extra en las altas directas (restrictivas: se suman a la política de alta).
DROP POLICY IF EXISTS alq_vehiculos_alta_segura ON public.alq_vehiculos;
CREATE POLICY alq_vehiculos_alta_segura ON public.alq_vehiculos AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (estado IN ('disponible', 'mantenimiento'));
DROP POLICY IF EXISTS alq_multas_alta_segura ON public.alq_multas;
CREATE POLICY alq_multas_alta_segura ON public.alq_multas AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (estado = 'pendiente' AND metodo IS NULL AND cobrada_en IS NULL);
DROP POLICY IF EXISTS fun_proyectos_alta_segura ON public.fun_proyectos;
CREATE POLICY fun_proyectos_alta_segura ON public.fun_proyectos AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (ejecutado = 0);
DROP POLICY IF EXISTS gan_animales_alta_segura ON public.gan_animales;
CREATE POLICY gan_animales_alta_segura ON public.gan_animales AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (estado = 'activo' AND peso_actual = peso_inicial);
DROP POLICY IF EXISTS seg_turnos_alta_ref ON public.seg_turnos;
CREATE POLICY seg_turnos_alta_ref ON public.seg_turnos AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.seg_puestos p WHERE p.id = puesto_id AND p.owner_id = public.mi_negocio_id()));
DROP POLICY IF EXISTS seg_novedades_alta_ref ON public.seg_novedades;
CREATE POLICY seg_novedades_alta_ref ON public.seg_novedades AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.seg_puestos p WHERE p.id = puesto_id AND p.owner_id = public.mi_negocio_id()));
DROP POLICY IF EXISTS fun_beneficiarios_alta_ref ON public.fun_beneficiarios;
CREATE POLICY fun_beneficiarios_alta_ref ON public.fun_beneficiarios AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.fun_proyectos p WHERE p.id = proyecto_id AND p.owner_id = public.mi_negocio_id()));
DROP POLICY IF EXISTS gan_sanidad_alta_ref ON public.gan_sanidad;
CREATE POLICY gan_sanidad_alta_ref ON public.gan_sanidad AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (animal_id IS NULL OR EXISTS (SELECT 1 FROM public.gan_animales a WHERE a.id = animal_id AND a.owner_id = public.mi_negocio_id()));
DROP POLICY IF EXISTS alq_multas_alta_ref ON public.alq_multas;
CREATE POLICY alq_multas_alta_ref ON public.alq_multas AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (contrato_id IS NULL OR EXISTS (SELECT 1 FROM public.alq_contratos c WHERE c.id = contrato_id AND c.owner_id = public.mi_negocio_id()));

-- Campos y estados que solo cambian desde su acción.
DROP TRIGGER IF EXISTS trg_alq_vehiculos_proteger ON public.alq_vehiculos;
CREATE TRIGGER trg_alq_vehiculos_proteger BEFORE UPDATE ON public.alq_vehiculos FOR EACH ROW
  EXECUTE FUNCTION public.neg_proteger_campos('km_actual');
DROP TRIGGER IF EXISTS trg_alq_vehiculos_estado ON public.alq_vehiculos;
CREATE TRIGGER trg_alq_vehiculos_estado BEFORE UPDATE ON public.alq_vehiculos FOR EACH ROW
  EXECUTE FUNCTION public.neg_proteger_estado('alquilado');
DROP TRIGGER IF EXISTS trg_gan_animales_proteger ON public.gan_animales;
CREATE TRIGGER trg_gan_animales_proteger BEFORE UPDATE ON public.gan_animales FOR EACH ROW
  EXECUTE FUNCTION public.neg_proteger_campos('peso_actual');
DROP TRIGGER IF EXISTS trg_gan_animales_estado ON public.gan_animales;
CREATE TRIGGER trg_gan_animales_estado BEFORE UPDATE ON public.gan_animales FOR EACH ROW
  EXECUTE FUNCTION public.neg_proteger_estado('vendido');
DROP TRIGGER IF EXISTS trg_fun_proyectos_proteger ON public.fun_proyectos;
CREATE TRIGGER trg_fun_proyectos_proteger BEFORE UPDATE ON public.fun_proyectos FOR EACH ROW
  EXECUTE FUNCTION public.neg_proteger_campos('ejecutado');
DROP TRIGGER IF EXISTS trg_parq_abonados_proteger ON public.parq_abonados;
CREATE TRIGGER trg_parq_abonados_proteger BEFORE UPDATE ON public.parq_abonados FOR EACH ROW
  EXECUTE FUNCTION public.neg_proteger_campos('vence');

-- ============================================================
-- 3. #37 Préstamos: mora automática sobre cuotas vencidas
-- ============================================================
CREATE OR REPLACE FUNCTION public.pre_fijar_mora(p_credito uuid, p_tasa numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid := public.mi_negocio_id();
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_tasa IS NULL OR p_tasa < 0 OR p_tasa > 10 THEN RAISE EXCEPTION 'La tasa de mora mensual debe estar entre 0 y 10 %%.'; END IF;
  UPDATE public.pre_creditos SET tasa_mora_pct = p_tasa WHERE id = p_credito AND owner_id = v_owner;
  IF NOT FOUND THEN RAISE EXCEPTION 'El préstamo ya no existe.'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.pre_fijar_mora(uuid, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pre_fijar_mora(uuid, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.pre_abonar(p_cuota uuid, p_monto numeric, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  c record;
  cr record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_monto numeric := round(coalesce(p_monto, 0));
  v_pend numeric;
  v_dias integer;
  v_mora_pend numeric := 0;
  v_am numeric;
  v_ai numeric;
  v_ac numeric;
  v_lineas jsonb;
  v_cobrador text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF v_monto <= 0 THEN RAISE EXCEPTION 'Escribe el valor del abono.'; END IF;
  SELECT * INTO c FROM public.pre_cuotas WHERE id = p_cuota AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La cuota ya no existe.'; END IF;
  IF c.estado = 'pagada' THEN RAISE EXCEPTION 'Esta cuota ya está pagada.'; END IF;
  SELECT * INTO cr FROM public.pre_creditos WHERE id = c.credito_id AND owner_id = v_owner FOR UPDATE;
  v_pend := c.valor - c.capital_pagado - c.interes_pagado;
  v_dias := greatest(current_date - c.vence, 0);
  IF cr.tasa_mora_pct > 0 AND v_dias > 0 THEN
    v_mora_pend := greatest(round(v_pend * cr.tasa_mora_pct / 100 * v_dias / 30.0) - c.mora_cobrada, 0);
  END IF;
  IF v_monto > v_pend + v_mora_pend THEN
    RAISE EXCEPTION 'El abono no puede superar el saldo de la cuota más la mora (%).', v_pend + v_mora_pend;
  END IF;
  -- Orden de imputación: mora, interés y capital.
  v_am := least(v_monto, v_mora_pend);
  v_ai := least(v_monto - v_am, c.interes - c.interes_pagado);
  v_ac := v_monto - v_am - v_ai;
  v_cobrador := coalesce(cr.cobrador, 'Sin cobrador');

  UPDATE public.pre_cuotas
     SET interes_pagado = interes_pagado + v_ai, capital_pagado = capital_pagado + v_ac, mora_cobrada = mora_cobrada + v_am,
         estado = CASE WHEN (capital_pagado + v_ac + interes_pagado + v_ai) >= valor THEN 'pagada' ELSE 'parcial' END,
         pagada_en = CASE WHEN (capital_pagado + v_ac + interes_pagado + v_ai) >= valor THEN now() ELSE pagada_en END
   WHERE id = c.id;
  UPDATE public.pre_creditos SET saldo_capital = greatest(saldo_capital - v_ac, 0) WHERE id = cr.id;
  IF NOT EXISTS (SELECT 1 FROM public.pre_cuotas WHERE credito_id = cr.id AND estado <> 'pagada') THEN
    UPDATE public.pre_creditos SET estado = 'pagado' WHERE id = cr.id;
  END IF;
  INSERT INTO public.pre_abonos (owner_id, tipo_negocio, credito_id, cuota_id, cobrador, monto, capital, interes, mora, metodo)
  VALUES (v_owner, cr.tipo_negocio, cr.id, c.id, v_cobrador, v_monto, v_ac, v_ai, v_am, v_metodo);

  BEGIN
    PERFORM public.neg_asegurar(v_owner, cr.tipo_negocio);
    v_lineas := jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_monto));
    IF v_ac > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '1385', 'haber', v_ac)); END IF;
    IF v_ai + v_am > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '4210', 'haber', v_ai + v_am)); END IF;
    PERFORM public.registrar_asiento_movimiento(v_owner, cr.tipo_negocio, 'Abono ' || cr.cliente || ' cuota ' || c.numero, 'pre_abono', c.id, v_lineas);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'No se pudo registrar el asiento del abono: %', SQLERRM;
  END;
  PERFORM public.neg_caja(v_owner, cr.tipo_negocio, 'Abono ' || cr.cliente || ' cuota ' || c.numero, true, v_monto, v_metodo);
  RETURN jsonb_build_object('capital', v_ac, 'interes', v_ai, 'mora', v_am);
END;
$$;
REVOKE ALL ON FUNCTION public.pre_abonar(uuid, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.pre_abonar(uuid, numeric, text) TO authenticated;

-- ============================================================
-- 4. #40 Alquiler de vehículos
-- ============================================================
CREATE OR REPLACE FUNCTION public.alq_abrir(
  p_vehiculo uuid, p_cliente text, p_documento text, p_telefono text, p_modalidad text, p_cantidad integer,
  p_tarifa numeric, p_deposito numeric, p_km_salida numeric, p_combustible integer, p_metodo text, p_notas text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v record;
  v_id uuid := gen_random_uuid();
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_dep numeric := greatest(round(coalesce(p_deposito, 0)), 0);
  v_tarifa numeric;
  v_km numeric;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF nullif(trim(coalesce(p_cliente, '')), '') IS NULL THEN RAISE EXCEPTION 'Escribe el nombre del cliente.'; END IF;
  IF p_modalidad NOT IN ('dias', 'horas') THEN RAISE EXCEPTION 'Elige alquiler por días o por horas.'; END IF;
  IF p_cantidad IS NULL OR p_cantidad < 1 OR p_cantidad > 3650 THEN RAISE EXCEPTION 'Escribe la cantidad de días u horas.'; END IF;
  IF p_combustible IS NULL OR p_combustible < 0 OR p_combustible > 100 THEN RAISE EXCEPTION 'El combustible va de 0 a 100 %%.'; END IF;
  SELECT * INTO v FROM public.alq_vehiculos WHERE id = p_vehiculo AND owner_id = v_owner AND activo FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El vehículo ya no está disponible.'; END IF;
  IF v.estado <> 'disponible' THEN RAISE EXCEPTION 'El vehículo % está en estado %.', v.placa, v.estado; END IF;
  v_tarifa := CASE WHEN coalesce(p_tarifa, 0) > 0 THEN p_tarifa WHEN p_modalidad = 'dias' THEN v.tarifa_dia ELSE v.tarifa_hora END;
  IF v_tarifa <= 0 THEN RAISE EXCEPTION 'Define la tarifa del vehículo o escríbela en el contrato.'; END IF;
  v_km := coalesce(p_km_salida, v.km_actual);
  IF v_km < 0 THEN RAISE EXCEPTION 'El kilometraje no puede ser negativo.'; END IF;

  INSERT INTO public.alq_contratos (id, owner_id, tipo_negocio, vehiculo_id, placa, descripcion, cliente, documento, telefono, modalidad, cantidad,
                                    tarifa, deposito, prevista, km_salida, combustible_salida, notas)
  VALUES (v_id, v_owner, v.tipo_negocio, v.id, v.placa, v.descripcion, trim(p_cliente), nullif(trim(coalesce(p_documento, '')), ''),
          nullif(trim(coalesce(p_telefono, '')), ''), p_modalidad, p_cantidad, v_tarifa, v_dep,
          now() + CASE WHEN p_modalidad = 'dias' THEN make_interval(days => p_cantidad) ELSE make_interval(hours => p_cantidad) END,
          v_km, p_combustible, nullif(trim(coalesce(p_notas, '')), ''));
  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.alq_vehiculos SET estado = 'alquilado', km_actual = v_km WHERE id = v.id;

  IF v_dep > 0 THEN
    PERFORM public.neg_asiento(v_owner, v.tipo_negocio, 'Depósito en garantía ' || v.placa || ' · ' || trim(p_cliente), 'alq_deposito', v_id,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_dep), jsonb_build_object('codigo', '2805', 'haber', v_dep)));
    PERFORM public.neg_caja(v_owner, v.tipo_negocio, 'Depósito en garantía ' || v.placa, true, v_dep, v_metodo);
  END IF;
  RETURN jsonb_build_object('id', v_id, 'tarifa', v_tarifa, 'estimado', round(v_tarifa * p_cantidad));
END;
$$;
REVOKE ALL ON FUNCTION public.alq_abrir(uuid, text, text, text, text, integer, numeric, numeric, numeric, integer, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.alq_abrir(uuid, text, text, text, text, integer, numeric, numeric, numeric, integer, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.alq_cerrar(p_contrato uuid, p_km_entrega numeric, p_combustible integer, p_dano numeric, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  c record;
  v record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_dano numeric := greatest(round(coalesce(p_dano, 0)), 0);
  v_rec numeric;
  v_dias_c numeric;
  v_extra_km numeric;
  v_r_km numeric := 0;
  v_r_comb numeric := 0;
  v_real numeric;
  v_r_dem numeric := 0;
  v_base numeric;
  v_total numeric;
  v_net numeric;
  v_lineas jsonb := '[]'::jsonb;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO c FROM public.alq_contratos WHERE id = p_contrato AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El contrato ya no existe.'; END IF;
  IF c.estado <> 'abierto' THEN RAISE EXCEPTION 'Este contrato ya fue liquidado.'; END IF;
  SELECT * INTO v FROM public.alq_vehiculos WHERE id = c.vehiculo_id AND owner_id = v_owner FOR UPDATE;
  IF p_km_entrega IS NULL OR p_km_entrega < c.km_salida THEN RAISE EXCEPTION 'El kilometraje de entrega no puede ser menor al de salida (%).', c.km_salida; END IF;
  IF p_combustible IS NULL OR p_combustible < 0 OR p_combustible > 100 THEN RAISE EXCEPTION 'El combustible va de 0 a 100 %%.'; END IF;

  v_rec := p_km_entrega - c.km_salida;
  v_dias_c := CASE WHEN c.modalidad = 'dias' THEN c.cantidad ELSE greatest(ceil(c.cantidad / 24.0), 1) END;
  v_extra_km := greatest(v_rec - v.km_incluidos_dia * v_dias_c, 0);
  v_r_km := round(v_extra_km * v.valor_km_extra);
  IF p_combustible < c.combustible_salida THEN
    v_r_comb := round((c.combustible_salida - p_combustible) / 100.0 * v.valor_tanque);
  END IF;
  v_real := greatest(ceil(extract(epoch FROM (now() - c.salida)) / CASE WHEN c.modalidad = 'dias' THEN 86400.0 ELSE 3600.0 END), 1);
  IF v_real > c.cantidad THEN v_r_dem := round((v_real - c.cantidad) * c.tarifa); END IF;
  v_base := round(c.tarifa * c.cantidad);
  v_total := v_base + v_r_km + v_r_comb + v_r_dem + v_dano;
  v_net := v_total - c.deposito;

  IF c.deposito > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '2805', 'debe', c.deposito)); END IF;
  IF v_net > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_net)); END IF;
  IF v_total > 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', '4135', 'haber', v_total)); END IF;
  IF v_net < 0 THEN v_lineas := v_lineas || jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'haber', -v_net)); END IF;

  UPDATE public.alq_contratos
     SET estado = 'cerrado', km_entrega = p_km_entrega, combustible_entrega = p_combustible, recargo_km = v_r_km,
         recargo_combustible = v_r_comb, recargo_dano = v_dano, recargo_demora = v_r_dem, total = v_total,
         saldo_cobrado = v_net, metodo = v_metodo, cerrado_en = now()
   WHERE id = c.id;
  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.alq_vehiculos SET estado = 'disponible', km_actual = p_km_entrega WHERE id = v.id;

  IF jsonb_array_length(v_lineas) > 0 THEN
    PERFORM public.neg_asiento(v_owner, c.tipo_negocio, 'Liquidación alquiler ' || c.placa || ' · ' || c.cliente, 'alq_contrato', c.id, v_lineas);
  END IF;
  IF v_net > 0 THEN PERFORM public.neg_caja(v_owner, c.tipo_negocio, 'Liquidación alquiler ' || c.placa, true, v_net, v_metodo);
  ELSIF v_net < 0 THEN PERFORM public.neg_caja(v_owner, c.tipo_negocio, 'Devolución de depósito ' || c.placa, false, -v_net, v_metodo);
  END IF;
  RETURN jsonb_build_object('base', v_base, 'recargo_km', v_r_km, 'recargo_combustible', v_r_comb, 'recargo_demora', v_r_dem,
                            'recargo_dano', v_dano, 'total', v_total, 'deposito', c.deposito, 'saldo', v_net, 'recorrido', v_rec);
END;
$$;
REVOKE ALL ON FUNCTION public.alq_cerrar(uuid, numeric, integer, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.alq_cerrar(uuid, numeric, integer, numeric, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.alq_cobrar_multa(p_multa uuid, p_metodo text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  m record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO m FROM public.alq_multas WHERE id = p_multa AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El registro ya no existe.'; END IF;
  IF m.estado = 'cobrada' THEN RAISE EXCEPTION 'Esto ya fue cobrado al cliente.'; END IF;
  UPDATE public.alq_multas SET estado = 'cobrada', metodo = v_metodo, cobrada_en = now() WHERE id = m.id;
  PERFORM public.neg_asiento(v_owner, m.tipo_negocio, 'Cobro de ' || m.concepto || ' ' || m.placa || ' · ' || m.cliente, 'alq_multa', m.id,
    jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', m.valor), jsonb_build_object('codigo', '4135', 'haber', m.valor)));
  PERFORM public.neg_caja(v_owner, m.tipo_negocio, 'Cobro de ' || m.concepto || ' ' || m.placa, true, m.valor, v_metodo);
  RETURN m.valor;
END;
$$;
REVOKE ALL ON FUNCTION public.alq_cobrar_multa(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.alq_cobrar_multa(uuid, text) TO authenticated;

-- ============================================================
-- 5. #41 Seguridad y aseo
-- ============================================================
CREATE OR REPLACE FUNCTION public.seg_facturar_mes(p_periodo text, p_vence date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v_n integer := 0;
  v_total numeric := 0;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF NOT public.es_admin() THEN RAISE EXCEPTION 'Solo el administrador factura el mes.'; END IF;
  IF p_periodo IS NULL OR p_periodo !~ '^[0-9]{4}-[0-9]{2}$' THEN RAISE EXCEPTION 'Periodo inválido (usa AAAA-MM).'; END IF;
  IF p_vence IS NULL THEN RAISE EXCEPTION 'Indica la fecha de vencimiento.'; END IF;
  WITH nuevas AS (
    INSERT INTO public.seg_facturas (owner_id, tipo_negocio, puesto_id, cliente, sede, periodo, valor, vence)
    SELECT v_owner, v_tipo, p.id, p.cliente, p.sede, p_periodo, p.valor_mensual, p_vence
      FROM public.seg_puestos p
     WHERE p.owner_id = v_owner AND p.activo AND p.valor_mensual > 0
       AND p.inicio <= (to_date(p_periodo || '-01', 'YYYY-MM-DD') + interval '1 month - 1 day')::date
       AND (p.fin IS NULL OR p.fin >= to_date(p_periodo || '-01', 'YYYY-MM-DD'))
       AND NOT EXISTS (SELECT 1 FROM public.seg_facturas f WHERE f.puesto_id = p.id AND f.periodo = p_periodo)
    RETURNING valor
  )
  SELECT count(*), coalesce(sum(valor), 0) INTO v_n, v_total FROM nuevas;
  IF v_n = 0 THEN RAISE EXCEPTION 'No hay facturas nuevas: todos los puestos activos ya tienen la de %.', p_periodo; END IF;
  PERFORM public.neg_asiento(v_owner, v_tipo, 'Facturación servicios ' || p_periodo, 'seg_facturas', gen_random_uuid(),
    jsonb_build_array(jsonb_build_object('codigo', '1305', 'debe', v_total), jsonb_build_object('codigo', '4135', 'haber', v_total)));
  RETURN jsonb_build_object('facturas', v_n, 'total', v_total);
END;
$$;
REVOKE ALL ON FUNCTION public.seg_facturar_mes(text, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.seg_facturar_mes(text, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.seg_cobrar_factura(p_factura uuid, p_metodo text)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  f record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO f FROM public.seg_facturas WHERE id = p_factura AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'La factura ya no existe.'; END IF;
  IF f.estado = 'pagada' THEN RAISE EXCEPTION 'Esta factura ya fue pagada.'; END IF;
  UPDATE public.seg_facturas SET estado = 'pagada', metodo = v_metodo, pagada_en = now() WHERE id = f.id;
  IF f.valor > 0 THEN
    PERFORM public.neg_asiento(v_owner, f.tipo_negocio, 'Recaudo ' || f.cliente || ' ' || f.sede || ' ' || f.periodo, 'seg_factura', f.id,
      jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', f.valor), jsonb_build_object('codigo', '1305', 'haber', f.valor)));
    PERFORM public.neg_caja(v_owner, f.tipo_negocio, 'Recaudo ' || f.cliente || ' ' || f.periodo, true, f.valor, v_metodo);
  END IF;
  RETURN f.valor;
END;
$$;
REVOKE ALL ON FUNCTION public.seg_cobrar_factura(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.seg_cobrar_factura(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.seg_entregar(p_insumo uuid, p_empleado text, p_puesto text, p_cantidad numeric, p_proxima date)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  i record;
  v_costo numeric;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF nullif(trim(coalesce(p_empleado, '')), '') IS NULL THEN RAISE EXCEPTION 'Escribe quién recibe.'; END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Escribe la cantidad entregada.'; END IF;
  SELECT * INTO i FROM public.seg_insumos WHERE id = p_insumo AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El elemento ya no existe.'; END IF;
  IF i.stock < p_cantidad THEN RAISE EXCEPTION 'No alcanza %: hay % y se piden %.', i.elemento, i.stock, p_cantidad; END IF;
  v_costo := round(i.costo * p_cantidad);
  UPDATE public.seg_insumos SET stock = stock - p_cantidad WHERE id = i.id;
  INSERT INTO public.seg_entregas (owner_id, tipo_negocio, insumo_id, elemento, empleado, puesto, cantidad, costo_total, proxima_entrega)
  VALUES (v_owner, i.tipo_negocio, i.id, i.elemento, trim(p_empleado), nullif(trim(coalesce(p_puesto, '')), ''), p_cantidad, v_costo,
          coalesce(p_proxima, (current_date + make_interval(months => i.meses_reposicion))::date));
  IF v_costo > 0 THEN
    PERFORM public.neg_asiento(v_owner, i.tipo_negocio, 'Dotación ' || i.elemento || ' · ' || trim(p_empleado), 'seg_entrega', i.id,
      jsonb_build_array(jsonb_build_object('codigo', '5195', 'debe', v_costo), jsonb_build_object('codigo', '1435', 'haber', v_costo)));
  END IF;
  RETURN v_costo;
END;
$$;
REVOKE ALL ON FUNCTION public.seg_entregar(uuid, text, text, numeric, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.seg_entregar(uuid, text, text, numeric, date) TO authenticated;

-- ============================================================
-- 6. #42 Ganadería
-- ============================================================
CREATE OR REPLACE FUNCTION public.gan_pesar(p_animal uuid, p_peso numeric, p_fecha date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  a record;
  v_fecha date := coalesce(p_fecha, current_date);
  v_pf date;
  v_pp numeric;
  v_dias integer;
  v_gdp numeric;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_peso IS NULL OR p_peso <= 0 OR p_peso > 2000 THEN RAISE EXCEPTION 'Escribe un peso válido en kilos.'; END IF;
  SELECT * INTO a FROM public.gan_animales WHERE id = p_animal AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El animal ya no existe.'; END IF;
  IF a.estado <> 'activo' THEN RAISE EXCEPTION 'El animal % ya no está activo.', a.chapeta; END IF;
  SELECT fecha, peso INTO v_pf, v_pp FROM public.gan_pesajes
   WHERE animal_id = a.id AND fecha <= v_fecha ORDER BY fecha DESC, created_at DESC LIMIT 1;
  IF NOT FOUND THEN v_pf := a.fecha_ingreso; v_pp := a.peso_inicial; END IF;
  v_dias := v_fecha - v_pf;
  v_gdp := CASE WHEN v_dias > 0 AND v_pp > 0 THEN round((p_peso - v_pp) / v_dias, 3) ELSE NULL END;
  INSERT INTO public.gan_pesajes (owner_id, tipo_negocio, animal_id, chapeta, fecha, peso, dias, ganancia_dia)
  VALUES (v_owner, a.tipo_negocio, a.id, a.chapeta, v_fecha, p_peso, v_dias, v_gdp);
  IF NOT EXISTS (SELECT 1 FROM public.gan_pesajes WHERE animal_id = a.id AND fecha > v_fecha) THEN
    PERFORM set_config('gosaryc.neg', 'on', true);
    UPDATE public.gan_animales SET peso_actual = p_peso WHERE id = a.id;
  END IF;
  RETURN jsonb_build_object('ganancia_dia', v_gdp, 'dias', v_dias);
END;
$$;
REVOKE ALL ON FUNCTION public.gan_pesar(uuid, numeric, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.gan_pesar(uuid, numeric, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.gan_consumir(p_insumo uuid, p_lote text, p_cantidad numeric)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  i record;
  v_costo numeric;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_cantidad IS NULL OR p_cantidad <= 0 THEN RAISE EXCEPTION 'Escribe la cantidad consumida.'; END IF;
  SELECT * INTO i FROM public.gan_insumos WHERE id = p_insumo AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El insumo ya no existe.'; END IF;
  IF i.stock < p_cantidad THEN RAISE EXCEPTION 'No alcanza %: hay % y se piden %.', i.nombre, i.stock, p_cantidad; END IF;
  v_costo := round(i.costo * p_cantidad);
  UPDATE public.gan_insumos SET stock = stock - p_cantidad WHERE id = i.id;
  INSERT INTO public.gan_consumos (owner_id, tipo_negocio, insumo_id, nombre, lote, cantidad, costo_total)
  VALUES (v_owner, i.tipo_negocio, i.id, i.nombre, nullif(trim(coalesce(p_lote, '')), ''), p_cantidad, v_costo);
  IF v_costo > 0 THEN
    PERFORM public.neg_asiento(v_owner, i.tipo_negocio, 'Consumo ' || i.nombre || ' lote ' || coalesce(nullif(trim(p_lote), ''), 'general'), 'gan_consumo', i.id,
      jsonb_build_array(jsonb_build_object('codigo', '5195', 'debe', v_costo), jsonb_build_object('codigo', '1435', 'haber', v_costo)));
  END IF;
  RETURN v_costo;
END;
$$;
REVOKE ALL ON FUNCTION public.gan_consumir(uuid, text, numeric) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.gan_consumir(uuid, text, numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.gan_vender(p_animales uuid[], p_modalidad text, p_precio numeric, p_comprador text, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  a record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_n integer := 0;
  v_kg numeric := 0;
  v_total numeric := 0;
  v_val numeric;
  v_det jsonb := '[]'::jsonb;
  v_id uuid := gen_random_uuid();
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_animales IS NULL OR array_length(p_animales, 1) IS NULL THEN RAISE EXCEPTION 'Elige los animales a vender.'; END IF;
  IF p_modalidad NOT IN ('kilo', 'cabeza') THEN RAISE EXCEPTION 'Elige venta por kilo o por cabeza.'; END IF;
  IF p_precio IS NULL OR p_precio <= 0 THEN RAISE EXCEPTION 'Escribe el precio.'; END IF;
  IF nullif(trim(coalesce(p_comprador, '')), '') IS NULL THEN RAISE EXCEPTION 'Escribe el comprador.'; END IF;
  FOR a IN SELECT * FROM public.gan_animales WHERE id = ANY (p_animales) AND owner_id = v_owner AND estado = 'activo' FOR UPDATE LOOP
    v_val := CASE WHEN p_modalidad = 'kilo' THEN round(a.peso_actual * p_precio) ELSE round(p_precio) END;
    v_n := v_n + 1;
    v_kg := v_kg + a.peso_actual;
    v_total := v_total + v_val;
    v_det := v_det || jsonb_build_array(jsonb_build_object('chapeta', a.chapeta, 'peso', a.peso_actual, 'valor', v_val));
  END LOOP;
  IF v_n <> array_length(p_animales, 1) THEN RAISE EXCEPTION 'Algún animal ya no está disponible para la venta.'; END IF;
  IF v_total <= 0 THEN RAISE EXCEPTION 'El valor de la venta es cero: revisa el peso o el precio.'; END IF;
  INSERT INTO public.gan_ventas (id, owner_id, tipo_negocio, comprador, modalidad, precio, animales, kilos, total, metodo, detalle)
  VALUES (v_id, v_owner, v_tipo, trim(p_comprador), p_modalidad, p_precio, v_n, v_kg, v_total, v_metodo, v_det);
  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.gan_animales SET estado = 'vendido' WHERE id = ANY (p_animales) AND owner_id = v_owner;
  PERFORM public.neg_asiento(v_owner, v_tipo, 'Venta de ganado a ' || trim(p_comprador) || ' (' || v_n || ')', 'gan_venta', v_id,
    jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_total), jsonb_build_object('codigo', '4135', 'haber', v_total)));
  PERFORM public.neg_caja(v_owner, v_tipo, 'Venta de ganado a ' || trim(p_comprador), true, v_total, v_metodo);
  RETURN jsonb_build_object('id', v_id, 'animales', v_n, 'kilos', v_kg, 'total', v_total);
END;
$$;
REVOKE ALL ON FUNCTION public.gan_vender(uuid[], text, numeric, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.gan_vender(uuid[], text, numeric, text, text) TO authenticated;

-- ============================================================
-- 7. #43 Fundación
-- ============================================================
CREATE OR REPLACE FUNCTION public.fun_donar(p_donante uuid, p_tipo text, p_descripcion text, p_valor numeric, p_proyecto uuid, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  d record;
  pr record;
  v_pn text;
  v_id uuid := gen_random_uuid();
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN p_tipo = 'especie' THEN '1435' WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_valor numeric := round(coalesce(p_valor, 0));
  v_cert text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_tipo NOT IN ('dinero', 'especie') THEN RAISE EXCEPTION 'Elige donación en dinero o en especie.'; END IF;
  IF v_valor <= 0 THEN RAISE EXCEPTION 'Escribe el valor de la donación.'; END IF;
  IF p_tipo = 'especie' AND nullif(trim(coalesce(p_descripcion, '')), '') IS NULL THEN RAISE EXCEPTION 'Describe lo que se donó en especie.'; END IF;
  SELECT * INTO d FROM public.fun_donantes WHERE id = p_donante AND owner_id = v_owner;
  IF NOT FOUND THEN RAISE EXCEPTION 'El donante ya no existe.'; END IF;
  IF p_proyecto IS NOT NULL THEN
    SELECT * INTO pr FROM public.fun_proyectos WHERE id = p_proyecto AND owner_id = v_owner;
    IF NOT FOUND THEN RAISE EXCEPTION 'El proyecto ya no existe.'; END IF;
    v_pn := pr.nombre;
  END IF;
  v_cert := 'CD-' || to_char(now(), 'YYYY') || '-' || upper(left(v_id::text, 6));
  INSERT INTO public.fun_donaciones (id, owner_id, tipo_negocio, donante_id, donante, documento, tipo, descripcion, valor, proyecto_id, proyecto, metodo, certificado)
  VALUES (v_id, v_owner, d.tipo_negocio, d.id, d.nombre, d.documento, p_tipo, nullif(trim(coalesce(p_descripcion, '')), ''), v_valor,
          p_proyecto, v_pn, CASE WHEN p_tipo = 'dinero' THEN v_metodo ELSE NULL END, v_cert);
  PERFORM public.neg_asiento(v_owner, d.tipo_negocio, 'Donación ' || d.nombre || ' (' || p_tipo || ')', 'fun_donacion', v_id,
    jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_valor), jsonb_build_object('codigo', '4705', 'haber', v_valor)));
  IF p_tipo = 'dinero' THEN PERFORM public.neg_caja(v_owner, d.tipo_negocio, 'Donación ' || d.nombre, true, v_valor, v_metodo); END IF;
  RETURN jsonb_build_object('id', v_id, 'certificado', v_cert, 'valor', v_valor);
END;
$$;
REVOKE ALL ON FUNCTION public.fun_donar(uuid, text, text, numeric, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fun_donar(uuid, text, text, numeric, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.fun_gastar(p_proyecto uuid, p_concepto text, p_valor numeric, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  pr record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_valor numeric := round(coalesce(p_valor, 0));
  v_id uuid := gen_random_uuid();
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF v_valor <= 0 THEN RAISE EXCEPTION 'Escribe el valor del gasto.'; END IF;
  IF nullif(trim(coalesce(p_concepto, '')), '') IS NULL THEN RAISE EXCEPTION 'Escribe el concepto del gasto.'; END IF;
  SELECT * INTO pr FROM public.fun_proyectos WHERE id = p_proyecto AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El proyecto ya no existe.'; END IF;
  IF pr.estado = 'cerrado' THEN RAISE EXCEPTION 'El proyecto está cerrado.'; END IF;
  IF pr.presupuesto > 0 AND pr.ejecutado + v_valor > pr.presupuesto THEN
    RAISE EXCEPTION 'El gasto supera el presupuesto: quedan % disponibles.', pr.presupuesto - pr.ejecutado;
  END IF;
  INSERT INTO public.fun_gastos (id, owner_id, tipo_negocio, proyecto_id, proyecto, concepto, valor, metodo)
  VALUES (v_id, v_owner, pr.tipo_negocio, pr.id, pr.nombre, trim(p_concepto), v_valor, v_metodo);
  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.fun_proyectos SET ejecutado = ejecutado + v_valor WHERE id = pr.id;
  PERFORM public.neg_asiento(v_owner, pr.tipo_negocio, 'Gasto proyecto ' || pr.nombre || ': ' || trim(p_concepto), 'fun_gasto', v_id,
    jsonb_build_array(jsonb_build_object('codigo', '5195', 'debe', v_valor), jsonb_build_object('codigo', v_cuenta, 'haber', v_valor)));
  PERFORM public.neg_caja(v_owner, pr.tipo_negocio, 'Gasto proyecto ' || pr.nombre, false, v_valor, v_metodo);
  RETURN jsonb_build_object('id', v_id, 'ejecutado', pr.ejecutado + v_valor);
END;
$$;
REVOKE ALL ON FUNCTION public.fun_gastar(uuid, text, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fun_gastar(uuid, text, numeric, text) TO authenticated;

-- ============================================================
-- 8. #44 Iglesia
-- ============================================================
CREATE OR REPLACE FUNCTION public.igl_periodo_cerrado(p_owner uuid, p_culto text, p_fecha date)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.igl_cierres c
                  WHERE c.owner_id = p_owner AND p_fecha BETWEEN c.desde AND c.hasta AND (c.culto = '' OR c.culto = coalesce(p_culto, '')));
$$;
REVOKE ALL ON FUNCTION public.igl_periodo_cerrado(uuid, text, date) FROM public, anon, authenticated;

CREATE OR REPLACE FUNCTION public.igl_ingresar(
  p_miembro uuid, p_nombre text, p_concepto text, p_fondo text, p_valor numeric, p_metodo text, p_culto text, p_fecha date, p_evento text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_valor numeric := round(coalesce(p_valor, 0));
  v_fecha date := coalesce(p_fecha, current_date);
  v_culto text := coalesce(trim(p_culto), '');
  v_id uuid := gen_random_uuid();
  v_recibo text;
  v_nombre text := nullif(trim(coalesce(p_nombre, '')), '');
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF p_concepto NOT IN ('diezmo', 'ofrenda', 'primicia', 'evento') THEN RAISE EXCEPTION 'Elige el concepto del ingreso.'; END IF;
  IF v_valor <= 0 THEN RAISE EXCEPTION 'Escribe el valor.'; END IF;
  IF nullif(trim(coalesce(p_fondo, '')), '') IS NULL THEN RAISE EXCEPTION 'Elige el fondo o destinación.'; END IF;
  IF public.igl_periodo_cerrado(v_owner, v_culto, v_fecha) THEN RAISE EXCEPTION 'Ese culto o periodo ya está cerrado contablemente.'; END IF;
  IF p_miembro IS NOT NULL THEN
    SELECT nombre INTO v_nombre FROM public.igl_miembros WHERE id = p_miembro AND owner_id = v_owner;
    IF NOT FOUND THEN RAISE EXCEPTION 'El miembro ya no existe.'; END IF;
  END IF;
  v_recibo := 'RC-' || to_char(now(), 'YYMM') || '-' || upper(left(v_id::text, 5));
  INSERT INTO public.igl_ingresos (id, owner_id, tipo_negocio, miembro_id, miembro, concepto, fondo, valor, metodo, culto, evento, fecha, recibo)
  VALUES (v_id, v_owner, v_tipo, p_miembro, v_nombre, p_concepto, trim(p_fondo), v_valor, v_metodo, v_culto, nullif(trim(coalesce(p_evento, '')), ''), v_fecha, v_recibo);
  PERFORM public.neg_asiento(v_owner, v_tipo, initcap(p_concepto) || ' · fondo ' || trim(p_fondo), 'igl_ingreso', v_id,
    jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', v_valor), jsonb_build_object('codigo', '4705', 'haber', v_valor)));
  PERFORM public.neg_caja(v_owner, v_tipo, initcap(p_concepto) || ' · ' || trim(p_fondo), true, v_valor, v_metodo);
  RETURN jsonb_build_object('id', v_id, 'recibo', v_recibo);
END;
$$;
REVOKE ALL ON FUNCTION public.igl_ingresar(uuid, text, text, text, numeric, text, text, date, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.igl_ingresar(uuid, text, text, text, numeric, text, text, date, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.igl_egresar(
  p_fondo text, p_concepto text, p_obra_social boolean, p_valor numeric, p_metodo text, p_culto text, p_fecha date, p_evento text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_valor numeric := round(coalesce(p_valor, 0));
  v_fecha date := coalesce(p_fecha, current_date);
  v_culto text := coalesce(trim(p_culto), '');
  v_id uuid := gen_random_uuid();
  v_disp numeric;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF v_valor <= 0 THEN RAISE EXCEPTION 'Escribe el valor.'; END IF;
  IF nullif(trim(coalesce(p_fondo, '')), '') IS NULL THEN RAISE EXCEPTION 'Elige el fondo del que sale el dinero.'; END IF;
  IF nullif(trim(coalesce(p_concepto, '')), '') IS NULL THEN RAISE EXCEPTION 'Escribe el concepto del egreso.'; END IF;
  IF public.igl_periodo_cerrado(v_owner, v_culto, v_fecha) THEN RAISE EXCEPTION 'Ese culto o periodo ya está cerrado contablemente.'; END IF;
  SELECT coalesce((SELECT sum(valor) FROM public.igl_ingresos WHERE owner_id = v_owner AND lower(fondo) = lower(trim(p_fondo))), 0)
       - coalesce((SELECT sum(valor) FROM public.igl_egresos WHERE owner_id = v_owner AND lower(fondo) = lower(trim(p_fondo))), 0) INTO v_disp;
  IF v_valor > v_disp THEN RAISE EXCEPTION 'El fondo % solo tiene % disponibles.', trim(p_fondo), v_disp; END IF;
  INSERT INTO public.igl_egresos (id, owner_id, tipo_negocio, fondo, concepto, obra_social, valor, metodo, culto, evento, fecha)
  VALUES (v_id, v_owner, v_tipo, trim(p_fondo), trim(p_concepto), coalesce(p_obra_social, false), v_valor, v_metodo, v_culto, nullif(trim(coalesce(p_evento, '')), ''), v_fecha);
  PERFORM public.neg_asiento(v_owner, v_tipo, 'Egreso ' || trim(p_fondo) || ': ' || trim(p_concepto), 'igl_egreso', v_id,
    jsonb_build_array(jsonb_build_object('codigo', '5195', 'debe', v_valor), jsonb_build_object('codigo', v_cuenta, 'haber', v_valor)));
  PERFORM public.neg_caja(v_owner, v_tipo, 'Egreso ' || trim(p_fondo) || ': ' || trim(p_concepto), false, v_valor, v_metodo);
  RETURN jsonb_build_object('id', v_id);
END;
$$;
REVOKE ALL ON FUNCTION public.igl_egresar(text, text, boolean, numeric, text, text, date, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.igl_egresar(text, text, boolean, numeric, text, text, date, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.igl_cerrar(p_culto text, p_desde date, p_hasta date)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_tipo text := public.tipo_negocio_actual();
  v_culto text := coalesce(trim(p_culto), '');
  v_dz numeric; v_of numeric; v_pr numeric; v_ev numeric; v_eg numeric;
  v_fondos jsonb;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF NOT public.es_admin() THEN RAISE EXCEPTION 'Solo el administrador cierra culto o periodo.'; END IF;
  IF p_desde IS NULL OR p_hasta IS NULL OR p_hasta < p_desde THEN RAISE EXCEPTION 'Revisa las fechas del cierre.'; END IF;
  IF EXISTS (SELECT 1 FROM public.igl_cierres WHERE owner_id = v_owner AND culto = v_culto AND desde = p_desde AND hasta = p_hasta) THEN
    RAISE EXCEPTION 'Ese cierre ya existe.';
  END IF;
  SELECT coalesce(sum(valor) FILTER (WHERE concepto = 'diezmo'), 0), coalesce(sum(valor) FILTER (WHERE concepto = 'ofrenda'), 0),
         coalesce(sum(valor) FILTER (WHERE concepto = 'primicia'), 0), coalesce(sum(valor) FILTER (WHERE concepto = 'evento'), 0)
    INTO v_dz, v_of, v_pr, v_ev
    FROM public.igl_ingresos WHERE owner_id = v_owner AND fecha BETWEEN p_desde AND p_hasta AND (v_culto = '' OR culto = v_culto);
  SELECT coalesce(sum(valor), 0) INTO v_eg FROM public.igl_egresos
   WHERE owner_id = v_owner AND fecha BETWEEN p_desde AND p_hasta AND (v_culto = '' OR culto = v_culto);
  SELECT coalesce(jsonb_agg(jsonb_build_object('fondo', f.fondo, 'ingresos', f.ing, 'egresos', f.egr)), '[]'::jsonb) INTO v_fondos FROM (
    SELECT fondo, sum(ing) AS ing, sum(egr) AS egr FROM (
      SELECT fondo, valor AS ing, 0::numeric AS egr FROM public.igl_ingresos
       WHERE owner_id = v_owner AND fecha BETWEEN p_desde AND p_hasta AND (v_culto = '' OR culto = v_culto)
      UNION ALL
      SELECT fondo, 0::numeric, valor FROM public.igl_egresos
       WHERE owner_id = v_owner AND fecha BETWEEN p_desde AND p_hasta AND (v_culto = '' OR culto = v_culto)
    ) x GROUP BY fondo) f;
  INSERT INTO public.igl_cierres (owner_id, tipo_negocio, culto, desde, hasta, diezmos, ofrendas, primicias, eventos, egresos, neto, por_fondo)
  VALUES (v_owner, v_tipo, v_culto, p_desde, p_hasta, v_dz, v_of, v_pr, v_ev, v_eg, v_dz + v_of + v_pr + v_ev - v_eg, v_fondos);
  RETURN jsonb_build_object('diezmos', v_dz, 'ofrendas', v_of, 'primicias', v_pr, 'eventos', v_ev, 'egresos', v_eg,
                            'neto', v_dz + v_of + v_pr + v_ev - v_eg, 'por_fondo', v_fondos);
END;
$$;
REVOKE ALL ON FUNCTION public.igl_cerrar(text, date, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.igl_cerrar(text, date, date) TO authenticated;

-- ============================================================
-- 9. #45 Parqueadero: abonados mensuales
-- ============================================================
CREATE OR REPLACE FUNCTION public.parq_cobrar_abono(p_abonado uuid, p_metodo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  a record;
  v_metodo text := coalesce(nullif(trim(p_metodo), ''), 'efectivo');
  v_cuenta text := CASE WHEN coalesce(nullif(trim(p_metodo), ''), 'efectivo') = 'efectivo' THEN '1105' ELSE '1110' END;
  v_desde date;
  v_hasta date;
  v_id uuid := gen_random_uuid();
  v_recibo text;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  SELECT * INTO a FROM public.parq_abonados WHERE id = p_abonado AND owner_id = v_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'El abonado ya no existe.'; END IF;
  IF NOT a.activo THEN RAISE EXCEPTION 'El abonado está inactivo.'; END IF;
  IF a.tarifa_mensual <= 0 THEN RAISE EXCEPTION 'Define la tarifa mensual del abonado.'; END IF;
  v_desde := greatest(a.vence, current_date);
  v_hasta := (v_desde + interval '1 month')::date;
  v_recibo := 'AB-' || to_char(now(), 'YYMM') || '-' || upper(left(v_id::text, 5));
  INSERT INTO public.parq_pagos (id, owner_id, tipo_negocio, abonado_id, placa, nombre, valor, desde, hasta, metodo, recibo)
  VALUES (v_id, v_owner, a.tipo_negocio, a.id, a.placa, a.nombre, a.tarifa_mensual, v_desde, v_hasta, v_metodo, v_recibo);
  PERFORM set_config('gosaryc.neg', 'on', true);
  UPDATE public.parq_abonados SET vence = v_hasta WHERE id = a.id;
  PERFORM public.neg_asiento(v_owner, a.tipo_negocio, 'Mensualidad parqueadero ' || a.placa, 'parq_abono', v_id,
    jsonb_build_array(jsonb_build_object('codigo', v_cuenta, 'debe', a.tarifa_mensual), jsonb_build_object('codigo', '4135', 'haber', a.tarifa_mensual)));
  PERFORM public.neg_caja(v_owner, a.tipo_negocio, 'Mensualidad parqueadero ' || a.placa || ' · ' || v_recibo, true, a.tarifa_mensual, v_metodo);
  RETURN jsonb_build_object('recibo', v_recibo, 'valor', a.tarifa_mensual, 'desde', v_desde, 'hasta', v_hasta);
END;
$$;
REVOKE ALL ON FUNCTION public.parq_cobrar_abono(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.parq_cobrar_abono(uuid, text) TO authenticated;
