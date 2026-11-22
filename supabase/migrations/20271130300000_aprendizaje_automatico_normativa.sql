-- Aprendizaje automático del agente + normativa Colombia verificada en internet.
-- Tablas NUEVAS: no se altera ninguna tabla, política ni fórmula existente.

-- 1) Conocimiento aprendido por negocio (internet, respuestas del dueño, ventas cerradas).
CREATE TABLE IF NOT EXISTS public.agente_conocimiento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL REFERENCES public.negocio_config(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  tipo text NOT NULL DEFAULT 'regla',
  pregunta text NOT NULL DEFAULT '',
  respuesta text NOT NULL,
  origen text NOT NULL DEFAULT 'auto_internet',
  estado text NOT NULL DEFAULT 'aprendida',
  fuente text,
  verificado_en timestamptz NOT NULL DEFAULT now(),
  veces integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agente_conocimiento_origen_chk CHECK (origen IN ('auto_internet', 'dueno', 'venta_cerrada', 'sistema')),
  CONSTRAINT agente_conocimiento_largo_chk CHECK (char_length(respuesta) <= 2000 AND char_length(pregunta) <= 500)
);

CREATE INDEX IF NOT EXISTS agente_conocimiento_owner_idx ON public.agente_conocimiento (owner_id, origen, created_at DESC);
CREATE INDEX IF NOT EXISTS agente_conocimiento_negocio_idx ON public.agente_conocimiento (negocio_id);

ALTER TABLE public.agente_conocimiento ENABLE ROW LEVEL SECURITY;

-- El servidor escribe con la llave de servicio; el dueño solo lee y borra lo suyo.
DROP POLICY IF EXISTS agente_conocimiento_leer ON public.agente_conocimiento;
CREATE POLICY agente_conocimiento_leer ON public.agente_conocimiento
  FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() OR public.es_superadmin());

DROP POLICY IF EXISTS agente_conocimiento_borrar ON public.agente_conocimiento;
CREATE POLICY agente_conocimiento_borrar ON public.agente_conocimiento
  FOR DELETE TO authenticated
  USING (owner_id = public.mi_negocio_id() OR public.es_superadmin());

-- 2) Normativa global de Colombia verificada en internet (lectura autenticada, escritura servidor/Superadmin).
CREATE TABLE IF NOT EXISTS public.normativa_colombia_vigente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area text NOT NULL,
  clave text NOT NULL UNIQUE,
  titulo text NOT NULL,
  valor text,
  resumen text NOT NULL DEFAULT '',
  fuente text,
  vigencia_desde date,
  origen text NOT NULL DEFAULT 'auto_internet',
  verificado_en timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT normativa_colombia_area_chk CHECK (area IN ('tributario', 'laboral', 'sectores'))
);

CREATE INDEX IF NOT EXISTS normativa_colombia_area_idx ON public.normativa_colombia_vigente (area, verificado_en DESC);

ALTER TABLE public.normativa_colombia_vigente ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS normativa_colombia_leer ON public.normativa_colombia_vigente;
CREATE POLICY normativa_colombia_leer ON public.normativa_colombia_vigente
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS normativa_colombia_escribir_superadmin ON public.normativa_colombia_vigente;
CREATE POLICY normativa_colombia_escribir_superadmin ON public.normativa_colombia_vigente
  FOR ALL TO authenticated
  USING (public.es_superadmin())
  WITH CHECK (public.es_superadmin());
