-- Contabilidad y turnos de caja: cada tipo de negocio de una cuenta solo ve lo suyo.
-- Hasta ahora estas tablas solo se separaban por cuenta; si una cuenta usaba dos tipos de negocio,
-- sus asientos y cajas se mezclaban. No borra datos.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cuentas_contables', 'asientos_contables', 'turnos_caja', 'movimientos_turno'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tipo_negocio text', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    -- Lo que ya existía queda en el tipo actual de su dueño.
    EXECUTE format(
      'UPDATE public.%I x SET tipo_negocio = coalesce((SELECT public.clave_tipo_negocio(n.tipo_negocio) FROM public.negocio_config n WHERE n.owner_id = x.owner_id LIMIT 1), ''restaurante'') WHERE x.tipo_negocio IS NULL',
      t
    );
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_tipo_trg', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.asignar_tipo_negocio_menu()', t || '_tipo_trg', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_tipo_actual', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual()) WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())',
      t || '_solo_tipo_actual', t
    );
    -- Sin sesión no se puede leer ni escribir nada de estas tablas.
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
  END LOOP;
END $$;
