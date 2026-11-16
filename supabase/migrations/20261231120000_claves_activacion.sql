-- Licencia única por negocio con vigencia exacta (fecha y hora) y renovación con clave de activación.
-- La clave la genera solo el dueño de la plataforma y solo sirve para el negocio al que se le generó.

ALTER TABLE public.suscripciones_negocio
  ADD COLUMN IF NOT EXISTS vence_en timestamptz;

UPDATE public.suscripciones_negocio
SET vence_en = ((vence_el::timestamp + time '23:59:59') AT TIME ZONE 'America/Bogota')
WHERE vence_en IS NULL;

ALTER TABLE public.suscripciones_negocio ALTER COLUMN vence_en SET DEFAULT (now() + interval '30 days');
ALTER TABLE public.suscripciones_negocio ALTER COLUMN vence_en SET NOT NULL;

-- Si alguien cambia solo la fecha (panel del dueño), la hora exacta se ajusta sola.
CREATE OR REPLACE FUNCTION public.sincronizar_vence_en()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.vence_el IS DISTINCT FROM OLD.vence_el AND NEW.vence_en IS NOT DISTINCT FROM OLD.vence_en THEN
    NEW.vence_en := ((NEW.vence_el::timestamp + time '23:59:59') AT TIME ZONE 'America/Bogota');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sincronizar_vence_en ON public.suscripciones_negocio;
CREATE TRIGGER trg_sincronizar_vence_en
  BEFORE UPDATE ON public.suscripciones_negocio
  FOR EACH ROW EXECUTE FUNCTION public.sincronizar_vence_en();

CREATE TABLE IF NOT EXISTS public.claves_activacion (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clave text NOT NULL UNIQUE,
  estado text NOT NULL DEFAULT 'disponible' CHECK (estado IN ('disponible', 'usada', 'anulada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  usada_en timestamptz
);

-- Un negocio solo puede tener una clave disponible a la vez.
CREATE UNIQUE INDEX IF NOT EXISTS claves_activacion_una_disponible
  ON public.claves_activacion (owner_id) WHERE estado = 'disponible';

ALTER TABLE public.claves_activacion ENABLE ROW LEVEL SECURITY;

-- Solo el dueño de la plataforma ve y administra las claves. Los clientes no leen la tabla.
DROP POLICY IF EXISTS "claves_superadmin" ON public.claves_activacion;
CREATE POLICY "claves_superadmin" ON public.claves_activacion
  FOR ALL TO authenticated
  USING (public.es_superadmin())
  WITH CHECK (public.es_superadmin());

CREATE OR REPLACE FUNCTION public.generar_clave_activacion(p_owner uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h text;
  v text;
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'Solo el dueño de la plataforma puede generar claves.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.suscripciones_negocio WHERE owner_id = p_owner) THEN
    RAISE EXCEPTION 'El negocio no existe.';
  END IF;
  UPDATE public.claves_activacion SET estado = 'anulada' WHERE owner_id = p_owner AND estado = 'disponible';
  h := upper(replace(gen_random_uuid()::text, '-', ''));
  v := 'GSR-' || substr(h, 1, 5) || '-' || substr(h, 6, 5) || '-' || substr(h, 11, 5) || '-' || substr(h, 16, 5);
  INSERT INTO public.claves_activacion (owner_id, clave) VALUES (p_owner, v);
  RETURN v;
END;
$$;

REVOKE ALL ON FUNCTION public.generar_clave_activacion(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.generar_clave_activacion(uuid) TO authenticated;

-- El administrador (primer correo del negocio) activa su licencia: 1 año exacto desde ese momento.
CREATE OR REPLACE FUNCTION public.activar_licencia(p_clave text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.claves_activacion%ROWTYPE;
  v timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Inicia sesión para activar la licencia.';
  END IF;
  SELECT * INTO c FROM public.claves_activacion
  WHERE owner_id = auth.uid() AND estado = 'disponible' AND clave = upper(trim(p_clave))
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La clave no es válida para tu negocio o ya fue usada.';
  END IF;
  UPDATE public.claves_activacion SET estado = 'usada', usada_en = now() WHERE id = c.id;
  UPDATE public.suscripciones_negocio
  SET plan = 'anual', estado = 'activo', inicio = current_date,
      vence_en = greatest(vence_en, now()) + interval '1 year',
      vence_el = (greatest(vence_en, now()) + interval '1 year')::date,
      updated_at = now()
  WHERE owner_id = auth.uid()
  RETURNING vence_en INTO v;
  RETURN jsonb_build_object('vence_en', v);
END;
$$;

REVOKE ALL ON FUNCTION public.activar_licencia(text) FROM public;
GRANT EXECUTE ON FUNCTION public.activar_licencia(text) TO authenticated;

-- Pasar a licencia anual exige un pago aprobado o una clave de activación usada.
CREATE OR REPLACE FUNCTION public.exigir_pago_licencia_anual()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.plan = 'anual' AND OLD.plan IS DISTINCT FROM 'anual' THEN
    IF NOT EXISTS (SELECT 1 FROM public.pagos_licencia WHERE owner_id = NEW.owner_id AND tipo = 'anual' AND estado = 'aprobado')
       AND NOT EXISTS (SELECT 1 FROM public.claves_activacion WHERE owner_id = NEW.owner_id AND estado = 'usada') THEN
      RAISE EXCEPTION 'Sin pago confirmado no hay licencia anual.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Vigencia consultada al iniciar sesión (miembros del equipo usan la licencia del negocio).
CREATE OR REPLACE FUNCTION public.mi_licencia_vigente()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT jsonb_build_object(
        'vigente', s.estado = 'activo' AND s.vence_en > now(),
        'estado', s.estado, 'plan', s.plan, 'vence_en', s.vence_en)
     FROM public.suscripciones_negocio s WHERE s.owner_id = public.mi_negocio_id()),
    jsonb_build_object('vigente', true));
$$;

REVOKE ALL ON FUNCTION public.mi_licencia_vigente() FROM public;
GRANT EXECUTE ON FUNCTION public.mi_licencia_vigente() TO authenticated;
