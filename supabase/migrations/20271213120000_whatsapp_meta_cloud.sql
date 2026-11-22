-- WhatsApp Cloud API oficial de Meta (nube 24/7): credenciales por negocio + historial de conversación.
CREATE TABLE IF NOT EXISTS public.whatsapp_meta_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  owner_id uuid NOT NULL,
  meta_phone_number_id text NOT NULL CHECK (meta_phone_number_id ~ '^[0-9]{5,30}$'),
  meta_access_token text NOT NULL DEFAULT '' CHECK (length(meta_access_token) <= 1000),
  meta_verify_token text NOT NULL CHECK (length(meta_verify_token) BETWEEN 8 AND 100),
  meta_app_secret text NOT NULL DEFAULT '' CHECK (length(meta_app_secret) <= 200),
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_meta_config_negocio ON public.whatsapp_meta_config (business_id);
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_meta_config_numero ON public.whatsapp_meta_config (meta_phone_number_id);
CREATE INDEX IF NOT EXISTS whatsapp_meta_config_verify ON public.whatsapp_meta_config (meta_verify_token);

ALTER TABLE public.whatsapp_meta_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wmc_leer ON public.whatsapp_meta_config;
CREATE POLICY wmc_leer ON public.whatsapp_meta_config FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.mi_negocio_id() = auth.uid());

-- El navegador solo ve columnas no secretas; el token de acceso y el secreto nunca salen de la base.
REVOKE ALL ON public.whatsapp_meta_config FROM anon, authenticated;
GRANT SELECT (id, business_id, owner_id, meta_phone_number_id, meta_verify_token, activo, created_at, updated_at)
  ON public.whatsapp_meta_config TO authenticated;

-- Guardado solo por el dueño del negocio. Vacío en token/secreto = conservar el anterior.
CREATE OR REPLACE FUNCTION public.meta_guardar_config(
  p_phone_number_id text,
  p_access_token text,
  p_verify_token text,
  p_app_secret text,
  p_activo boolean
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_negocio uuid;
  v_previo public.whatsapp_meta_config%ROWTYPE;
  v_phone text := regexp_replace(coalesce(p_phone_number_id, ''), '[^0-9]', '', 'g');
  v_verify text := btrim(coalesce(p_verify_token, ''));
  v_token text := btrim(coalesce(p_access_token, ''));
  v_secret text := btrim(coalesce(p_app_secret, ''));
BEGIN
  IF v_uid IS NULL OR public.mi_negocio_id() IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Solo el dueño del negocio puede configurar WhatsApp Cloud API';
  END IF;
  SELECT id INTO v_negocio FROM public.negocio_config WHERE owner_id = v_uid LIMIT 1;
  IF v_negocio IS NULL THEN
    RAISE EXCEPTION 'Primero crea los datos de tu negocio';
  END IF;
  IF v_phone !~ '^[0-9]{5,30}$' THEN
    RAISE EXCEPTION 'El Phone Number ID debe tener solo números';
  END IF;

  SELECT * INTO v_previo FROM public.whatsapp_meta_config WHERE business_id = v_negocio;
  IF v_verify = '' THEN
    v_verify := coalesce(v_previo.meta_verify_token, replace(gen_random_uuid()::text, '-', ''));
  END IF;
  IF length(v_verify) < 8 THEN
    RAISE EXCEPTION 'El token de verificación debe tener al menos 8 caracteres';
  END IF;
  IF v_token = '' THEN v_token := coalesce(v_previo.meta_access_token, ''); END IF;
  IF v_secret = '' THEN v_secret := coalesce(v_previo.meta_app_secret, ''); END IF;
  IF p_activo AND v_token = '' THEN
    RAISE EXCEPTION 'Falta el token de acceso permanente de Meta';
  END IF;

  INSERT INTO public.whatsapp_meta_config (business_id, owner_id, meta_phone_number_id, meta_access_token, meta_verify_token, meta_app_secret, activo)
  VALUES (v_negocio, v_uid, v_phone, v_token, v_verify, v_secret, coalesce(p_activo, true))
  ON CONFLICT (business_id) DO UPDATE SET
    meta_phone_number_id = EXCLUDED.meta_phone_number_id,
    meta_access_token = EXCLUDED.meta_access_token,
    meta_verify_token = EXCLUDED.meta_verify_token,
    meta_app_secret = EXCLUDED.meta_app_secret,
    activo = EXCLUDED.activo,
    updated_at = now();

  RETURN jsonb_build_object('ok', true, 'verify_token', v_verify);
EXCEPTION WHEN unique_violation THEN
  RAISE EXCEPTION 'Ese Phone Number ID o token de verificación ya está en uso por otro negocio';
END;
$$;
REVOKE ALL ON FUNCTION public.meta_guardar_config(text, text, text, text, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.meta_guardar_config(text, text, text, text, boolean) TO authenticated;

-- Dice si ya hay token y secreto guardados sin revelarlos.
CREATE OR REPLACE FUNCTION public.meta_estado_config()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(
    (SELECT jsonb_build_object(
        'token_guardado', meta_access_token <> '',
        'secreto_guardado', meta_app_secret <> '')
     FROM public.whatsapp_meta_config
     WHERE owner_id = auth.uid() AND owner_id = public.mi_negocio_id()
     LIMIT 1),
    jsonb_build_object('token_guardado', false, 'secreto_guardado', false));
$$;
REVOKE ALL ON FUNCTION public.meta_estado_config() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.meta_estado_config() TO authenticated;

-- Historial corto de conversación y antirrepetición de mensajes de Meta (solo llave de servicio).
CREATE TABLE IF NOT EXISTS public.whatsapp_meta_historial (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  telefono text NOT NULL CHECK (length(telefono) <= 30),
  rol text NOT NULL CHECK (rol IN ('user', 'assistant')),
  contenido text NOT NULL DEFAULT '' CHECK (length(contenido) <= 6000),
  wa_message_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_meta_historial_msg ON public.whatsapp_meta_historial (business_id, wa_message_id) WHERE wa_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS whatsapp_meta_historial_chat ON public.whatsapp_meta_historial (business_id, telefono, created_at DESC);
ALTER TABLE public.whatsapp_meta_historial ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.whatsapp_meta_historial FROM anon, authenticated;
