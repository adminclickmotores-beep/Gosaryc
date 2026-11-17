-- 5 MEJORAS ESTRATÉGICAS (sucursales, traslados, arqueo discriminado, enlace universal, respaldo)
-- Todo con owner_id = mi_negocio_id(), RLS estricto y sin borrado físico.

-- 1. Sucursales / puntos de venta del mismo dueño
CREATE TABLE IF NOT EXISTS public.negocio_sucursales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  nombre text NOT NULL CHECK (length(trim(nombre)) >= 1),
  direccion text,
  telefono text,
  activa boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS negocio_sucursales_owner_idx ON public.negocio_sucursales (owner_id, nombre);

-- 2. Traslados de mercancía entre sedes con acta de envío y recepción
CREATE TABLE IF NOT EXISTS public.negocio_traslados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  producto_id uuid REFERENCES public.com_productos(id) ON DELETE RESTRICT,
  producto_nombre text NOT NULL DEFAULT '',
  cantidad numeric NOT NULL CHECK (cantidad > 0),
  desde_sede text NOT NULL DEFAULT 'Bodega principal',
  hasta_sede text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'enviado' CHECK (estado IN ('enviado', 'recibido', 'cancelado')),
  acta_codigo text NOT NULL DEFAULT '',
  notas text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS negocio_traslados_owner_idx ON public.negocio_traslados (owner_id, created_at DESC);

-- 3. Columna opcional de sucursal para filtrar reportes y caja (consolidado por defecto)
ALTER TABLE public.turnos_caja ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.negocio_sucursales(id) ON DELETE SET NULL;
ALTER TABLE public.movimientos_turno ADD COLUMN IF NOT EXISTS referencia_pago text;
ALTER TABLE public.movimientos_turno ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.negocio_sucursales(id) ON DELETE SET NULL;
ALTER TABLE public.com_ventas ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.negocio_sucursales(id) ON DELETE SET NULL;
ALTER TABLE public.restaurante_pedidos ADD COLUMN IF NOT EXISTS sucursal_id uuid REFERENCES public.negocio_sucursales(id) ON DELETE SET NULL;

-- 4. RLS estricto (mismo patrón del proyecto)
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['negocio_sucursales', 'negocio_traslados'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_leer', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_leer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_mi_negocio', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id())', t || '_solo_mi_negocio', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM authenticated', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero()', t);
  END LOOP;

  DROP POLICY IF EXISTS "negocio_sucursales_crear" ON public.negocio_sucursales;
  CREATE POLICY "negocio_sucursales_crear" ON public.negocio_sucursales FOR INSERT TO authenticated
    WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_admin());
  DROP POLICY IF EXISTS "negocio_sucursales_editar" ON public.negocio_sucursales;
  CREATE POLICY "negocio_sucursales_editar" ON public.negocio_sucursales FOR UPDATE TO authenticated
    USING (owner_id = public.mi_negocio_id() AND public.es_admin())
    WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_admin());

  DROP POLICY IF EXISTS "negocio_traslados_crear" ON public.negocio_traslados;
  CREATE POLICY "negocio_traslados_crear" ON public.negocio_traslados FOR INSERT TO authenticated
    WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
  DROP POLICY IF EXISTS "negocio_traslados_editar" ON public.negocio_traslados;
  CREATE POLICY "negocio_traslados_editar" ON public.negocio_traslados FOR UPDATE TO authenticated
    USING (owner_id = public.mi_negocio_id() AND public.es_personal())
    WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
END $$;
