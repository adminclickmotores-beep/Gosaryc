-- Licencias ligadas a cada equipo: el instalador detecta el código interno del equipo, pide la licencia
-- con el correo del solicitante y el dueño la aprueba desde su celular (prueba de 30 días o 1 año).
ALTER TABLE public.licencias ADD COLUMN IF NOT EXISTS equipo_id text;
ALTER TABLE public.licencias ADD COLUMN IF NOT EXISTS correo text;
CREATE INDEX IF NOT EXISTS licencias_equipo_idx ON public.licencias (equipo_id);

CREATE TABLE IF NOT EXISTS public.solicitudes_licencia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id text NOT NULL,
  correo text NOT NULL,
  cliente text NOT NULL,
  telefono text,
  sistema text,
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada')),
  licencia_id uuid REFERENCES public.licencias(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS solicitudes_licencia_pendiente_uq
  ON public.solicitudes_licencia (equipo_id) WHERE estado = 'pendiente';

ALTER TABLE public.solicitudes_licencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "solicitudes_licencia_superadmin" ON public.solicitudes_licencia;
CREATE POLICY "solicitudes_licencia_superadmin" ON public.solicitudes_licencia
  FOR ALL TO authenticated
  USING (public.es_superadmin())
  WITH CHECK (public.es_superadmin());

-- El instalador (sin sesión) pide la licencia de su equipo.
CREATE OR REPLACE FUNCTION public.solicitar_licencia(
  p_equipo text,
  p_correo text,
  p_cliente text,
  p_telefono text DEFAULT NULL,
  p_sistema text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_equipo text := left(trim(coalesce(p_equipo, '')), 80);
  v_correo text := lower(left(trim(coalesce(p_correo, '')), 160));
  v_cliente text := left(trim(coalesce(p_cliente, '')), 120);
BEGIN
  IF length(v_equipo) < 8 THEN
    RETURN jsonb_build_object('estado', 'equipo_invalido');
  END IF;
  IF v_correo !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('estado', 'correo_invalido');
  END IF;
  IF v_cliente = '' THEN
    RETURN jsonb_build_object('estado', 'nombre_requerido');
  END IF;

  IF EXISTS (SELECT 1 FROM public.licencias WHERE equipo_id = v_equipo) THEN
    RETURN jsonb_build_object('estado', 'ya_tiene');
  END IF;

  UPDATE public.solicitudes_licencia
     SET correo = v_correo, cliente = v_cliente,
         telefono = left(nullif(trim(coalesce(p_telefono, '')), ''), 40),
         sistema = left(nullif(trim(coalesce(p_sistema, '')), ''), 120),
         updated_at = now()
   WHERE equipo_id = v_equipo AND estado = 'pendiente';
  IF FOUND THEN
    RETURN jsonb_build_object('estado', 'pendiente');
  END IF;

  INSERT INTO public.solicitudes_licencia (equipo_id, correo, cliente, telefono, sistema)
  VALUES (
    v_equipo, v_correo, v_cliente,
    left(nullif(trim(coalesce(p_telefono, '')), ''), 40),
    left(nullif(trim(coalesce(p_sistema, '')), ''), 120)
  );
  RETURN jsonb_build_object('estado', 'pendiente');
END;
$$;

-- El instalador pregunta si ya le aprobaron la licencia a su equipo.
CREATE OR REPLACE FUNCTION public.consultar_licencia_equipo(p_equipo text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_equipo text := left(trim(coalesce(p_equipo, '')), 80);
  v_codigo text;
  v_estado text;
BEGIN
  SELECT codigo INTO v_codigo FROM public.licencias
   WHERE equipo_id = v_equipo ORDER BY created_at DESC LIMIT 1;
  IF v_codigo IS NOT NULL THEN
    RETURN jsonb_build_object('estado', 'aprobada', 'codigo', v_codigo);
  END IF;
  SELECT estado INTO v_estado FROM public.solicitudes_licencia
   WHERE equipo_id = v_equipo ORDER BY created_at DESC LIMIT 1;
  RETURN jsonb_build_object('estado', coalesce(v_estado, 'sin_solicitud'));
END;
$$;

-- Verificación con el equipo: el código solo sirve en el equipo al que pertenece (se liga al primer uso).
CREATE OR REPLACE FUNCTION public.verificar_licencia_equipo(p_codigo text, p_equipo text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l public.licencias%ROWTYPE;
  v_equipo text := left(trim(coalesce(p_equipo, '')), 80);
BEGIN
  SELECT * INTO l FROM public.licencias WHERE codigo = upper(trim(p_codigo));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valida', false, 'motivo', 'no_existe');
  END IF;
  IF l.equipo_id IS NOT NULL AND l.equipo_id <> v_equipo THEN
    RETURN jsonb_build_object('valida', false, 'motivo', 'otro_equipo');
  END IF;
  IF l.equipo_id IS NULL AND length(v_equipo) >= 8 THEN
    UPDATE public.licencias SET equipo_id = v_equipo WHERE id = l.id;
  END IF;
  UPDATE public.licencias SET ultima_verificacion = now() WHERE id = l.id;
  RETURN jsonb_build_object(
    'valida', (l.estado = 'activa' AND l.vence_el >= current_date),
    'motivo', CASE
      WHEN l.estado <> 'activa' THEN 'suspendida'
      WHEN l.vence_el < current_date THEN 'vencida'
      ELSE 'ok'
    END,
    'tipo', l.tipo,
    'cliente', l.cliente,
    'vence_el', l.vence_el,
    'dias_restantes', (l.vence_el - current_date)
  );
END;
$$;

-- La verificación antigua (solo código) ya no sirve para licencias ligadas a un equipo.
CREATE OR REPLACE FUNCTION public.verificar_licencia(p_codigo text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  l public.licencias%ROWTYPE;
BEGIN
  SELECT * INTO l FROM public.licencias WHERE codigo = upper(trim(p_codigo));
  IF NOT FOUND THEN
    RETURN jsonb_build_object('valida', false, 'motivo', 'no_existe');
  END IF;
  IF l.equipo_id IS NOT NULL THEN
    RETURN jsonb_build_object('valida', false, 'motivo', 'otro_equipo');
  END IF;
  UPDATE public.licencias SET ultima_verificacion = now() WHERE id = l.id;
  RETURN jsonb_build_object(
    'valida', (l.estado = 'activa' AND l.vence_el >= current_date),
    'motivo', CASE
      WHEN l.estado <> 'activa' THEN 'suspendida'
      WHEN l.vence_el < current_date THEN 'vencida'
      ELSE 'ok'
    END,
    'tipo', l.tipo,
    'cliente', l.cliente,
    'vence_el', l.vence_el,
    'dias_restantes', (l.vence_el - current_date)
  );
END;
$$;

-- El dueño aprueba la solicitud desde su celular: crea la licencia del equipo (prueba de 30 días o 1 año).
CREATE OR REPLACE FUNCTION public.aprobar_solicitud_licencia(p_id uuid, p_tipo text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.solicitudes_licencia%ROWTYPE;
  v_codigo text;
  v_id uuid;
BEGIN
  IF NOT public.es_superadmin() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;
  IF p_tipo NOT IN ('prueba', 'anual') THEN
    RAISE EXCEPTION 'Tipo de licencia no válido';
  END IF;
  SELECT * INTO s FROM public.solicitudes_licencia WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La solicitud no existe';
  END IF;
  IF s.estado <> 'pendiente' THEN
    RAISE EXCEPTION 'La solicitud ya fue atendida';
  END IF;
  IF p_tipo = 'prueba' AND EXISTS (
    SELECT 1 FROM public.licencias WHERE equipo_id = s.equipo_id AND tipo = 'prueba'
  ) THEN
    RAISE EXCEPTION 'Este equipo ya usó su prueba';
  END IF;

  INSERT INTO public.licencias (cliente, correo, telefono, tipo, inicio, vence_el, equipo_id, notas)
  VALUES (
    s.cliente, s.correo, s.telefono, p_tipo, current_date,
    current_date + CASE WHEN p_tipo = 'prueba' THEN 30 ELSE 365 END,
    s.equipo_id, s.sistema
  )
  RETURNING id, codigo INTO v_id, v_codigo;

  UPDATE public.solicitudes_licencia
     SET estado = 'aprobada', licencia_id = v_id, updated_at = now()
   WHERE id = s.id;
  RETURN v_codigo;
END;
$$;

REVOKE ALL ON FUNCTION public.solicitar_licencia(text, text, text, text, text) FROM public;
REVOKE ALL ON FUNCTION public.consultar_licencia_equipo(text) FROM public;
REVOKE ALL ON FUNCTION public.verificar_licencia_equipo(text, text) FROM public;
REVOKE ALL ON FUNCTION public.aprobar_solicitud_licencia(uuid, text) FROM public;
GRANT EXECUTE ON FUNCTION public.solicitar_licencia(text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consultar_licencia_equipo(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verificar_licencia_equipo(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aprobar_solicitud_licencia(uuid, text) TO authenticated;
