-- Modo Comandos Operativos por WhatsApp: números autorizados + bitácora de comandos (sin borrado físico)
CREATE TABLE IF NOT EXISTS public.whatsapp_comandos_autorizados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  telefono text NOT NULL CHECK (length(regexp_replace(telefono, '[^0-9]', '', 'g')) BETWEEN 7 AND 15),
  nombre text NOT NULL DEFAULT '' CHECK (length(nombre) <= 80),
  puede_inventario boolean NOT NULL DEFAULT false,
  puede_facturar boolean NOT NULL DEFAULT false,
  puede_pedidos boolean NOT NULL DEFAULT false,
  puede_reportes boolean NOT NULL DEFAULT true,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_comandos_autorizados_unico ON public.whatsapp_comandos_autorizados (owner_id, telefono);

CREATE TABLE IF NOT EXISTS public.whatsapp_comandos_ejecutados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid,
  telefono text NOT NULL DEFAULT '',
  nombre text NOT NULL DEFAULT '',
  accion text NOT NULL DEFAULT 'consulta',
  texto_original text NOT NULL DEFAULT '' CHECK (length(texto_original) <= 4000),
  entidades jsonb NOT NULL DEFAULT '{}'::jsonb,
  vista_previa text NOT NULL DEFAULT '',
  estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','ejecutado','cancelado','error','consulta')),
  resultado text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  ejecutado_en timestamptz
);
CREATE INDEX IF NOT EXISTS whatsapp_comandos_ejecutados_dueno ON public.whatsapp_comandos_ejecutados (owner_id, created_at DESC);

ALTER TABLE public.whatsapp_comandos_autorizados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wca_leer ON public.whatsapp_comandos_autorizados;
CREATE POLICY wca_leer ON public.whatsapp_comandos_autorizados FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS wca_crear ON public.whatsapp_comandos_autorizados;
CREATE POLICY wca_crear ON public.whatsapp_comandos_autorizados FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS wca_editar ON public.whatsapp_comandos_autorizados;
CREATE POLICY wca_editar ON public.whatsapp_comandos_autorizados FOR UPDATE TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal())
  WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal());
DROP POLICY IF EXISTS wca_solo_mi_negocio ON public.whatsapp_comandos_autorizados;
CREATE POLICY wca_solo_mi_negocio ON public.whatsapp_comandos_autorizados AS RESTRICTIVE FOR ALL TO authenticated
  USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id());
REVOKE ALL ON public.whatsapp_comandos_autorizados FROM anon;
REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.whatsapp_comandos_autorizados FROM authenticated;
DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.whatsapp_comandos_autorizados;
CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.whatsapp_comandos_autorizados
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero();

-- La bitácora solo se lee desde la web; la escribe el puente con la llave de servicio.
ALTER TABLE public.whatsapp_comandos_ejecutados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wce_leer ON public.whatsapp_comandos_ejecutados;
CREATE POLICY wce_leer ON public.whatsapp_comandos_ejecutados FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id() AND public.es_personal());
REVOKE ALL ON public.whatsapp_comandos_ejecutados FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, TRIGGER, REFERENCES ON public.whatsapp_comandos_ejecutados FROM authenticated;

-- Historial en tiempo real en el panel web
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'whatsapp_comandos_ejecutados') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_comandos_ejecutados;
  END IF;
END $$;
