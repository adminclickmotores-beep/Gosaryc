-- Leads del agente de WhatsApp con canal de origen y cola FIFO por orden de llegada.
CREATE TABLE IF NOT EXISTS public.agente_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  negocio_id uuid NOT NULL REFERENCES public.negocio_config(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  telefono text NOT NULL,
  nombre text,
  canal_origen text NOT NULL DEFAULT 'WhatsApp Directo',
  numero_turno integer NOT NULL DEFAULT 0,
  fecha_llegada timestamptz NOT NULL DEFAULT now(),
  atendido_por_humano boolean NOT NULL DEFAULT false,
  temperatura text,
  puntaje integer,
  interes text,
  datos_confirmados text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (negocio_id, telefono)
);

CREATE INDEX IF NOT EXISTS agente_leads_orden_idx ON public.agente_leads (negocio_id, numero_turno);

-- Número de turno secuencial por negocio; la fecha de llegada nunca se sobrescribe.
CREATE OR REPLACE FUNCTION public.agente_leads_turno()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM pg_advisory_xact_lock(hashtext(NEW.negocio_id::text));
    SELECT COALESCE(MAX(numero_turno), 0) + 1 INTO NEW.numero_turno
      FROM public.agente_leads WHERE negocio_id = NEW.negocio_id;
  ELSE
    NEW.numero_turno := OLD.numero_turno;
    NEW.fecha_llegada := OLD.fecha_llegada;
    NEW.canal_origen := OLD.canal_origen;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS agente_leads_turno_trg ON public.agente_leads;
CREATE TRIGGER agente_leads_turno_trg
  BEFORE INSERT OR UPDATE ON public.agente_leads
  FOR EACH ROW EXECUTE FUNCTION public.agente_leads_turno();

ALTER TABLE public.agente_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agente_leads_select_propio" ON public.agente_leads;
CREATE POLICY "agente_leads_select_propio" ON public.agente_leads
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

DROP POLICY IF EXISTS "agente_leads_update_propio" ON public.agente_leads;
CREATE POLICY "agente_leads_update_propio" ON public.agente_leads
  FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
