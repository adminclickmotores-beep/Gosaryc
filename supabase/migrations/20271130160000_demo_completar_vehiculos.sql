-- Recorrido ampliado de la demo de vehículos (18-nov-2026).
-- Ventas y entregas, alistamiento, cartera y comisiones leen cada uno su propia tabla,
-- pero la carga de la demo los dejó en el registro general de módulos, así que esas
-- pantallas podían verse vacías en el piloto automático.
-- Esta función, SOLO para la cuenta demo de vehículos, copia a cada tabla propia lo
-- que falte (sin duplicar por título y sin borrar nada).

CREATE OR REPLACE FUNCTION public.demo_completar_vehiculos()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_tipo constant text := 'concesionario';
  v_n integer := 0;
  v_total integer := 0;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Sin sesión.'; END IF;
  IF v_email <> 'demo.vehiculos@gosaryc.com' THEN
    RAISE EXCEPTION 'Solo disponible para la demo de vehículos.';
  END IF;

  BEGIN
    INSERT INTO public.ventas_veh_registros (owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, fecha)
    SELECT v_uid, v_tipo, m.titulo, m.detalle, m.contacto, m.estado, m.monto, m.fecha
      FROM public.modulo_registros m
     WHERE m.owner_id = v_uid AND m.modulo = 'ventas_veh' AND coalesce(m.anulado, false) = false
       AND NOT EXISTS (SELECT 1 FROM public.ventas_veh_registros x WHERE x.owner_id = v_uid AND x.titulo = m.titulo);
    GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: ventas no copiadas: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.alistamiento_registros (owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, fecha)
    SELECT v_uid, v_tipo, m.titulo, m.detalle, m.contacto, m.estado, m.monto, m.fecha
      FROM public.modulo_registros m
     WHERE m.owner_id = v_uid AND m.modulo = 'alistamiento' AND coalesce(m.anulado, false) = false
       AND NOT EXISTS (SELECT 1 FROM public.alistamiento_registros x WHERE x.owner_id = v_uid AND x.titulo = m.titulo);
    GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: alistamiento no copiado: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.cartera_veh_registros (owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, abonado, fecha)
    SELECT v_uid, v_tipo, m.titulo, m.detalle, m.contacto, m.estado, m.monto, m.abonado, m.fecha
      FROM public.modulo_registros m
     WHERE m.owner_id = v_uid AND m.modulo = 'cartera_veh' AND coalesce(m.anulado, false) = false
       AND NOT EXISTS (SELECT 1 FROM public.cartera_veh_registros x WHERE x.owner_id = v_uid AND x.titulo = m.titulo);
    GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: cartera no copiada: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.comisiones_registros (owner_id, tipo_negocio, titulo, detalle, contacto, estado, monto, fecha)
    SELECT v_uid, v_tipo, m.titulo, m.detalle, m.contacto, m.estado, m.monto, m.fecha
      FROM public.modulo_registros m
     WHERE m.owner_id = v_uid AND m.modulo = 'comisiones' AND coalesce(m.anulado, false) = false
       AND NOT EXISTS (SELECT 1 FROM public.comisiones_registros x WHERE x.owner_id = v_uid AND x.titulo = m.titulo);
    GET DIAGNOSTICS v_n = ROW_COUNT; v_total := v_total + v_n;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Demo: comisiones no copiadas: %', SQLERRM;
  END;

  RETURN v_total;
END;
$$;

REVOKE ALL ON FUNCTION public.demo_completar_vehiculos() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.demo_completar_vehiculos() TO authenticated;
