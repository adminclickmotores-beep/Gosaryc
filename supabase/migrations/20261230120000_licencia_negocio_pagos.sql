-- Licencia por negocio: 30 días de prueba automáticos, licencia anual solo con comprobante de pago aprobado.
-- La licencia pertenece al correo que se registró primero en cada negocio (owner_id); los usuarios que crea
-- el administrador usan la licencia del negocio y no necesitan una propia.

ALTER TABLE public.suscripciones_negocio DROP CONSTRAINT IF EXISTS suscripciones_negocio_plan_check;
ALTER TABLE public.suscripciones_negocio
  ADD CONSTRAINT suscripciones_negocio_plan_check CHECK (plan IN ('prueba', 'emprendedor', 'pro', 'anual'));

ALTER TABLE public.suscripciones_negocio ALTER COLUMN vence_el SET DEFAULT (current_date + 30);

ALTER TABLE public.suscripciones_negocio
  ADD COLUMN IF NOT EXISTS inicio date NOT NULL DEFAULT current_date,
  ADD COLUMN IF NOT EXISTS correo_titular text,
  ADD COLUMN IF NOT EXISTS precio integer NOT NULL DEFAULT 100000,
  ADD COLUMN IF NOT EXISTS dias_extra_usados boolean NOT NULL DEFAULT false;

UPDATE public.suscripciones_negocio s
SET correo_titular = u.email
FROM auth.users u
WHERE u.id = s.owner_id AND s.correo_titular IS NULL;

-- Toda empresa nueva arranca con 30 días de prueba a nombre del correo que la registró.
CREATE OR REPLACE FUNCTION public.crear_suscripcion_negocio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL THEN
    INSERT INTO public.suscripciones_negocio (owner_id, correo_titular)
    VALUES (NEW.owner_id, (SELECT email FROM auth.users WHERE id = NEW.owner_id))
    ON CONFLICT (owner_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Pagos y solicitudes de la licencia (comprobante obligatorio para la licencia anual).
CREATE TABLE IF NOT EXISTS public.pagos_licencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  correo text,
  tipo text NOT NULL CHECK (tipo IN ('anual', 'dias_extra')),
  monto integer NOT NULL DEFAULT 100000,
  comprobante_url text,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobado', 'rechazado')),
  created_at timestamptz NOT NULL DEFAULT now(),
  revisado_en timestamptz,
  CONSTRAINT pagos_licencia_comprobante CHECK (
    tipo = 'dias_extra' OR (comprobante_url IS NOT NULL AND length(trim(comprobante_url)) > 0)
  )
);

ALTER TABLE public.pagos_licencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pagos_licencia_lectura_propia" ON public.pagos_licencia;
CREATE POLICY "pagos_licencia_lectura_propia" ON public.pagos_licencia
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "pagos_licencia_insertar_propio" ON public.pagos_licencia;
CREATE POLICY "pagos_licencia_insertar_propio" ON public.pagos_licencia
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND estado = 'pendiente'
    AND ((tipo = 'anual' AND monto = 100000) OR (tipo = 'dias_extra' AND monto = 0))
  );

DROP POLICY IF EXISTS "pagos_licencia_superadmin" ON public.pagos_licencia;
CREATE POLICY "pagos_licencia_superadmin" ON public.pagos_licencia
  FOR ALL TO authenticated
  USING (public.es_superadmin())
  WITH CHECK (public.es_superadmin());

-- El correo lo pone el servidor (no se puede falsear) y los días extra solo se piden una vez.
CREATE OR REPLACE FUNCTION public.validar_pago_licencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.correo := (SELECT email FROM auth.users WHERE id = NEW.owner_id);
  IF NEW.tipo = 'dias_extra' THEN
    IF EXISTS (SELECT 1 FROM public.suscripciones_negocio WHERE owner_id = NEW.owner_id AND dias_extra_usados)
       OR EXISTS (SELECT 1 FROM public.pagos_licencia WHERE owner_id = NEW.owner_id AND tipo = 'dias_extra' AND estado IN ('pendiente', 'aprobado')) THEN
      RAISE EXCEPTION 'Los días adicionales solo se pueden solicitar una vez.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validar_pago_licencia ON public.pagos_licencia;
CREATE TRIGGER trg_validar_pago_licencia
  BEFORE INSERT ON public.pagos_licencia
  FOR EACH ROW EXECUTE FUNCTION public.validar_pago_licencia();

-- Sin pago aprobado no se puede pasar a licencia anual.
CREATE OR REPLACE FUNCTION public.exigir_pago_licencia_anual()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plan = 'anual' AND OLD.plan IS DISTINCT FROM 'anual' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.pagos_licencia WHERE owner_id = NEW.owner_id AND tipo = 'anual' AND estado = 'aprobado'
    ) THEN
      RAISE EXCEPTION 'Sin comprobante de pago aprobado no hay licencia anual.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_exigir_pago_licencia_anual ON public.suscripciones_negocio;
CREATE TRIGGER trg_exigir_pago_licencia_anual
  BEFORE UPDATE ON public.suscripciones_negocio
  FOR EACH ROW EXECUTE FUNCTION public.exigir_pago_licencia_anual();

-- Aprobar un pago: licencia anual (+365 días) o días adicionales (+15 días, una sola vez).
CREATE OR REPLACE FUNCTION public.aprobar_pago_licencia(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p public.pagos_licencia%ROWTYPE;
  v date;
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'Solo el dueño de la plataforma puede aprobar pagos.';
  END IF;
  SELECT * INTO p FROM public.pagos_licencia WHERE id = p_id AND estado = 'pendiente' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El pago no existe o ya fue revisado.';
  END IF;

  INSERT INTO public.suscripciones_negocio (owner_id, correo_titular)
  VALUES (p.owner_id, p.correo)
  ON CONFLICT (owner_id) DO NOTHING;

  UPDATE public.pagos_licencia SET estado = 'aprobado', revisado_en = now() WHERE id = p_id;

  IF p.tipo = 'anual' THEN
    UPDATE public.suscripciones_negocio
    SET plan = 'anual', estado = 'activo', inicio = current_date,
        vence_el = greatest(vence_el, current_date) + 365,
        precio = p.monto, updated_at = now()
    WHERE owner_id = p.owner_id
    RETURNING vence_el INTO v;
  ELSE
    UPDATE public.suscripciones_negocio
    SET estado = 'activo', vence_el = greatest(vence_el, current_date) + 15,
        dias_extra_usados = true, updated_at = now()
    WHERE owner_id = p.owner_id
    RETURNING vence_el INTO v;
  END IF;

  RETURN jsonb_build_object('correo', p.correo, 'tipo', p.tipo, 'vence_el', v);
END;
$$;

REVOKE ALL ON FUNCTION public.aprobar_pago_licencia(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.aprobar_pago_licencia(uuid) TO authenticated;

-- Comprobantes de pago: archivos privados, cada cliente sube a su carpeta; el dueño los revisa.
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes_pago', 'comprobantes_pago', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "comprobantes_subir_propio" ON storage.objects;
CREATE POLICY "comprobantes_subir_propio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'comprobantes_pago' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "comprobantes_ver" ON storage.objects;
CREATE POLICY "comprobantes_ver" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'comprobantes_pago'
    AND ((storage.foldername(name))[1] = auth.uid()::text OR public.es_superadmin())
  );
