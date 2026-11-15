-- Licencias de las instalaciones locales: prueba de 30 días (ampliable) y licencia anual renovable.
-- Solo el dueño de la plataforma (superadmin) las crea y modifica desde su celular.
CREATE TABLE IF NOT EXISTS public.licencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE DEFAULT (
    'GOS-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 4))
    || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 5, 4))
    || '-' || upper(substr(md5(random()::text || clock_timestamp()::text), 9, 4))
  ),
  cliente text NOT NULL,
  telefono text,
  ciudad text,
  tipo text NOT NULL DEFAULT 'prueba' CHECK (tipo IN ('prueba', 'anual')),
  estado text NOT NULL DEFAULT 'activa' CHECK (estado IN ('activa', 'suspendida')),
  inicio date NOT NULL DEFAULT current_date,
  vence_el date NOT NULL DEFAULT (current_date + 30),
  notas text,
  ultima_verificacion timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.licencias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "licencias_superadmin" ON public.licencias;
CREATE POLICY "licencias_superadmin" ON public.licencias
  FOR ALL TO authenticated
  USING (public.es_superadmin())
  WITH CHECK (public.es_superadmin());

-- Consulta que hace cada instalación local con su código (sin sesión). Solo devuelve el estado, nunca datos de otros clientes.
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

REVOKE ALL ON FUNCTION public.verificar_licencia(text) FROM public;
GRANT EXECUTE ON FUNCTION public.verificar_licencia(text) TO anon, authenticated;
