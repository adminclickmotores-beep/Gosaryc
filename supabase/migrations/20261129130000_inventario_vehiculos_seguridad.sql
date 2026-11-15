-- Seguridad del inventario de vehículos:
-- 1) El precio de adquisición vive en una tabla aparte, protegida por el permiso veh_costos.
-- 2) Fotos en un bucket privado con acceso por negocio y permiso.
-- 3) Duplicados históricos resueltos sin borrar datos + índices únicos reales (sin omitirse).

-- ============================================================
-- 1) PRECIO DE ADQUISICIÓN
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vehiculo_costos (
  vehiculo_id uuid PRIMARY KEY REFERENCES public.vehiculos_inventario(id) ON DELETE CASCADE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id(),
  precio_compra numeric,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vehiculo_costos ENABLE ROW LEVEL SECURITY;

-- Copia los precios existentes (sin perder ninguno).
INSERT INTO public.vehiculo_costos (vehiculo_id, owner_id, precio_compra)
SELECT id, owner_id, precio_compra FROM public.vehiculos_inventario WHERE precio_compra IS NOT NULL
ON CONFLICT (vehiculo_id) DO NOTHING;

-- Vacía la columna antigua (ya está copiada). Sin disparadores para no ensuciar el historial.
ALTER TABLE public.vehiculos_inventario DISABLE TRIGGER USER;
UPDATE public.vehiculos_inventario v SET precio_compra = NULL
WHERE v.precio_compra IS NOT NULL
  AND EXISTS (SELECT 1 FROM public.vehiculo_costos c WHERE c.vehiculo_id = v.id AND c.precio_compra IS NOT DISTINCT FROM v.precio_compra);
ALTER TABLE public.vehiculos_inventario ENABLE TRIGGER USER;

-- La columna antigua ya no puede volver a guardar precios (aunque alguien use la API directa).
CREATE OR REPLACE FUNCTION public.vehiculo_costo_fuera() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.precio_compra := NULL;
  ELSE
    NEW.precio_compra := OLD.precio_compra;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vehiculo_00_costo_fuera_t ON public.vehiculos_inventario;
CREATE TRIGGER vehiculo_00_costo_fuera_t
  BEFORE INSERT OR UPDATE ON public.vehiculos_inventario
  FOR EACH ROW EXECUTE FUNCTION public.vehiculo_costo_fuera();

DROP POLICY IF EXISTS "vehiculo_costos_ver" ON public.vehiculo_costos;
DROP POLICY IF EXISTS "vehiculo_costos_crear" ON public.vehiculo_costos;
DROP POLICY IF EXISTS "vehiculo_costos_actualizar" ON public.vehiculo_costos;
CREATE POLICY "vehiculo_costos_ver" ON public.vehiculo_costos FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.veh_permiso('veh_costos'));
CREATE POLICY "vehiculo_costos_crear" ON public.vehiculo_costos FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.veh_permiso('veh_precios') AND public.veh_permiso('veh_costos')
    AND EXISTS (SELECT 1 FROM public.vehiculos_inventario v WHERE v.id = vehiculo_id AND v.owner_id = public.mi_negocio_id()));
CREATE POLICY "vehiculo_costos_actualizar" ON public.vehiculo_costos FOR UPDATE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.veh_permiso('veh_precios') AND public.veh_permiso('veh_costos'))
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.veh_permiso('veh_precios') AND public.veh_permiso('veh_costos'));

-- Registro del cambio de costo en el historial (el historial de costos solo lo ve quien tiene permiso de costos).
CREATE OR REPLACE FUNCTION public.vehiculo_costo_movimiento() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' OR NEW.precio_compra IS DISTINCT FROM OLD.precio_compra THEN
    INSERT INTO public.vehiculo_movimientos (owner_id, vehiculo_id, tipo, detalle)
    VALUES (NEW.owner_id, NEW.vehiculo_id, 'costo',
      'Precio de adquisición: ' || CASE WHEN TG_OP = 'INSERT' THEN 'sin dato' ELSE coalesce(OLD.precio_compra::text, 'sin dato') END
      || ' → ' || coalesce(NEW.precio_compra::text, 'sin dato'));
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
-- Es BEFORE para poder poner updated_at; el registro en historial no depende de la fila final.
DROP TRIGGER IF EXISTS vehiculo_costo_movimiento_t ON public.vehiculo_costos;
CREATE TRIGGER vehiculo_costo_movimiento_t
  BEFORE INSERT OR UPDATE ON public.vehiculo_costos
  FOR EACH ROW EXECUTE FUNCTION public.vehiculo_costo_movimiento();

-- Historial: los movimientos con montos de costo o gastos solo los ve quien puede ver costos.
DROP POLICY IF EXISTS "vehiculo_movimientos_leer" ON public.vehiculo_movimientos;
CREATE POLICY "vehiculo_movimientos_leer" ON public.vehiculo_movimientos FOR SELECT TO authenticated
  USING (
    owner_id = public.mi_negocio_id() AND public.veh_permiso('veh_ver')
    AND (tipo NOT IN ('costo', 'gasto') OR public.veh_permiso('veh_costos'))
  );

-- ============================================================
-- 2) FOTOS Y DOCUMENTOS PRIVADOS
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehiculos_fotos', 'vehiculos_fotos', false)
ON CONFLICT (id) DO UPDATE SET public = false;

DROP POLICY IF EXISTS "vehiculos_fotos_ver" ON storage.objects;
DROP POLICY IF EXISTS "vehiculos_fotos_subir" ON storage.objects;
DROP POLICY IF EXISTS "vehiculos_fotos_actualizar" ON storage.objects;
DROP POLICY IF EXISTS "vehiculos_fotos_borrar" ON storage.objects;
CREATE POLICY "vehiculos_fotos_ver" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vehiculos_fotos' AND (storage.foldername(name))[1] = public.mi_negocio_id()::text AND public.veh_permiso('veh_ver'));
CREATE POLICY "vehiculos_fotos_subir" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vehiculos_fotos' AND (storage.foldername(name))[1] = public.mi_negocio_id()::text AND public.veh_permiso('veh_editar'));
CREATE POLICY "vehiculos_fotos_actualizar" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vehiculos_fotos' AND (storage.foldername(name))[1] = public.mi_negocio_id()::text AND public.veh_permiso('veh_editar'))
  WITH CHECK (bucket_id = 'vehiculos_fotos' AND (storage.foldername(name))[1] = public.mi_negocio_id()::text AND public.veh_permiso('veh_editar'));
CREATE POLICY "vehiculos_fotos_borrar" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vehiculos_fotos' AND (storage.foldername(name))[1] = public.mi_negocio_id()::text AND public.veh_permiso('veh_editar'));

-- Documentos de vehículo (bucket privado creditos_docs): los archivos "vehiculo-*" exigen los permisos del inventario.
DROP POLICY IF EXISTS "creditos_docs_personal" ON storage.objects;
DROP POLICY IF EXISTS "creditos_docs_leer" ON storage.objects;
DROP POLICY IF EXISTS "creditos_docs_escribir" ON storage.objects;
CREATE POLICY "creditos_docs_leer" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'creditos_docs' AND (storage.foldername(name))[1] = public.mi_negocio_id()::text AND public.es_personal()
    AND (storage.filename(name) NOT LIKE 'vehiculo-%' OR public.veh_permiso('veh_ver'))
  );
CREATE POLICY "creditos_docs_escribir" ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'creditos_docs' AND (storage.foldername(name))[1] = public.mi_negocio_id()::text AND public.es_personal()
    AND (storage.filename(name) NOT LIKE 'vehiculo-%' OR public.veh_permiso('veh_editar'))
  )
  WITH CHECK (
    bucket_id = 'creditos_docs' AND (storage.foldername(name))[1] = public.mi_negocio_id()::text AND public.es_personal()
    AND (storage.filename(name) NOT LIKE 'vehiculo-%' OR public.veh_permiso('veh_editar'))
  );

-- ============================================================
-- 3) DUPLICADOS DE PLACA Y VIN
-- ============================================================
-- Auditoría: dentro de cada negocio se conserva el registro más antiguo; en los demás el valor repetido
-- se pasa a "observaciones" y el campo queda vacío para corregirlo. No se borra ningún vehículo.
ALTER TABLE public.vehiculos_inventario DISABLE TRIGGER USER;

WITH rep AS (
  SELECT id, owner_id, placa,
         row_number() OVER (PARTITION BY owner_id, public.veh_norm(placa) ORDER BY created_at, id) AS rn
  FROM public.vehiculos_inventario
  WHERE eliminado_en IS NULL AND public.veh_norm(placa) IS NOT NULL
), dup AS (SELECT * FROM rep WHERE rn > 1),
mov AS (
  INSERT INTO public.vehiculo_movimientos (owner_id, vehiculo_id, tipo, detalle)
  SELECT owner_id, id, 'duplicado', 'Placa duplicada (' || placa || '): se movió a observaciones; asigna la placa correcta'
  FROM dup RETURNING 1
)
UPDATE public.vehiculos_inventario v
SET observaciones = trim(both E'\n' from coalesce(v.observaciones, '') || E'\nPlaca duplicada detectada: ' || dup.placa),
    placa = NULL
FROM dup WHERE v.id = dup.id;

WITH rep AS (
  SELECT id, owner_id, vin,
         row_number() OVER (PARTITION BY owner_id, public.veh_norm(vin) ORDER BY created_at, id) AS rn
  FROM public.vehiculos_inventario
  WHERE eliminado_en IS NULL AND public.veh_norm(vin) IS NOT NULL
), dup AS (SELECT * FROM rep WHERE rn > 1),
mov AS (
  INSERT INTO public.vehiculo_movimientos (owner_id, vehiculo_id, tipo, detalle)
  SELECT owner_id, id, 'duplicado', 'VIN duplicado (' || vin || '): se movió a observaciones; asigna el VIN correcto'
  FROM dup RETURNING 1
)
UPDATE public.vehiculos_inventario v
SET observaciones = trim(both E'\n' from coalesce(v.observaciones, '') || E'\nVIN duplicado detectado: ' || dup.vin),
    vin = NULL
FROM dup WHERE v.id = dup.id;

ALTER TABLE public.vehiculos_inventario ENABLE TRIGGER USER;

-- Índices únicos reales (cubren también los intentos simultáneos). Si fallaran, la migración falla: no se omiten.
CREATE UNIQUE INDEX IF NOT EXISTS vehiculos_placa_unica_idx
  ON public.vehiculos_inventario (owner_id, public.veh_norm(placa))
  WHERE eliminado_en IS NULL AND public.veh_norm(placa) IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS vehiculos_vin_unico_idx
  ON public.vehiculos_inventario (owner_id, public.veh_norm(vin))
  WHERE eliminado_en IS NULL AND public.veh_norm(vin) IS NOT NULL;
