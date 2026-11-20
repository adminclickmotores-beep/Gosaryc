-- CRM y Embudo IA: prospectos con etapa de embudo y tickets PQRS, sincronizados con el agente de WhatsApp.
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL REFERENCES public.negocio_config(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  numero_turno integer NOT NULL DEFAULT 0,
  fecha_llegada timestamptz NOT NULL DEFAULT now(),
  ultima_interaccion timestamptz NOT NULL DEFAULT now(),
  nombre text,
  telefono text NOT NULL DEFAULT '',
  canal_origen text NOT NULL DEFAULT 'WhatsApp Directo',
  temperatura text,
  puntaje integer,
  etapa_embudo text NOT NULL DEFAULT 'nuevo',
  interes text,
  capacidad_pago text,
  urgencia text,
  datos_extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  valor_estimado numeric NOT NULL DEFAULT 0,
  atendido_por_humano boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_leads_telefono_uidx ON public.crm_leads (negocio_id, telefono) WHERE telefono <> '';
CREATE INDEX IF NOT EXISTS crm_leads_orden_idx ON public.crm_leads (negocio_id, numero_turno);
CREATE INDEX IF NOT EXISTS crm_leads_owner_etapa_idx ON public.crm_leads (owner_id, etapa_embudo);

CREATE TABLE IF NOT EXISTS public.crm_pqrs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL REFERENCES public.negocio_config(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  lead_id uuid REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  telefono text NOT NULL DEFAULT '',
  tipo text NOT NULL DEFAULT 'Peticion',
  resumen text,
  urgencia text NOT NULL DEFAULT 'Media',
  estado text NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_pqrs_lead_idx ON public.crm_pqrs (negocio_id, lead_id);

-- Turno secuencial por negocio; la llegada y el turno no se reescriben.
CREATE OR REPLACE FUNCTION public.crm_leads_turno()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_advisory_xact_lock(hashtext('crm' || NEW.negocio_id::text));
    SELECT COALESCE(MAX(numero_turno), 0) + 1 INTO NEW.numero_turno
      FROM public.crm_leads WHERE negocio_id = NEW.negocio_id;
  ELSE
    NEW.numero_turno := OLD.numero_turno;
    NEW.fecha_llegada := OLD.fecha_llegada;
    NEW.owner_id := OLD.owner_id;
    NEW.negocio_id := OLD.negocio_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS crm_leads_turno_trg ON public.crm_leads;
CREATE TRIGGER crm_leads_turno_trg
  BEFORE INSERT OR UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.crm_leads_turno();

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_pqrs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_leads_select_propio" ON public.crm_leads;
CREATE POLICY "crm_leads_select_propio" ON public.crm_leads
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "crm_leads_insert_propio" ON public.crm_leads;
CREATE POLICY "crm_leads_insert_propio" ON public.crm_leads
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "crm_leads_update_propio" ON public.crm_leads;
CREATE POLICY "crm_leads_update_propio" ON public.crm_leads
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

DROP POLICY IF EXISTS "crm_pqrs_select_propio" ON public.crm_pqrs;
CREATE POLICY "crm_pqrs_select_propio" ON public.crm_pqrs
  FOR SELECT TO authenticated USING (owner_id = auth.uid());
DROP POLICY IF EXISTS "crm_pqrs_insert_propio" ON public.crm_pqrs;
CREATE POLICY "crm_pqrs_insert_propio" ON public.crm_pqrs
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
DROP POLICY IF EXISTS "crm_pqrs_update_propio" ON public.crm_pqrs;
CREATE POLICY "crm_pqrs_update_propio" ON public.crm_pqrs
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Los prospectos que el agente ya había captado pasan al embudo en su orden de llegada.
INSERT INTO public.crm_leads (negocio_id, owner_id, fecha_llegada, ultima_interaccion, nombre, telefono, canal_origen, temperatura, puntaje, interes, datos_extra, atendido_por_humano, etapa_embudo)
SELECT a.negocio_id, a.owner_id, a.fecha_llegada, a.updated_at, a.nombre, a.telefono, a.canal_origen, a.temperatura, a.puntaje, a.interes,
       CASE WHEN a.datos_confirmados IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('datos_confirmados', a.datos_confirmados) END,
       a.atendido_por_humano,
       CASE WHEN a.temperatura IS NULL THEN 'nuevo' ELSE 'calificacion' END
FROM public.agente_leads a
WHERE a.telefono <> ''
ORDER BY a.fecha_llegada
ON CONFLICT DO NOTHING;
