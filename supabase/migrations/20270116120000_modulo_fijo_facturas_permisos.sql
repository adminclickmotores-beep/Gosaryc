-- Cada tabla propia solo puede guardar filas de su propio módulo.
-- No cambia datos existentes (todas las filas ya tienen el módulo correcto).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'facturas_registros_modulo_fijo' AND conrelid = 'public.facturas_registros'::regclass
  ) THEN
    ALTER TABLE public.facturas_registros
      ADD CONSTRAINT facturas_registros_modulo_fijo CHECK (modulo = 'facturas');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'permisos_rest_registros_modulo_fijo' AND conrelid = 'public.permisos_rest_registros'::regclass
  ) THEN
    ALTER TABLE public.permisos_rest_registros
      ADD CONSTRAINT permisos_rest_registros_modulo_fijo CHECK (modulo = 'permisos_rest');
  END IF;
END
$$;
