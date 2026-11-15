-- Auditoría automática de información clínica: quién creó, cambió o borró una historia clínica.
-- Se llena solo desde un trigger; ningún cliente puede escribir ni borrar registros.

CREATE TABLE IF NOT EXISTS public.auditoria_clinica (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  accion text not null,
  modulo text not null,
  registro_id uuid,
  titulo text,
  created_at timestamptz not null default now()
);

CREATE INDEX IF NOT EXISTS auditoria_clinica_created_idx ON public.auditoria_clinica (created_at desc);

ALTER TABLE public.auditoria_clinica ENABLE ROW LEVEL SECURITY;

-- Solo el administrador puede leer la auditoría clínica.
DROP POLICY IF EXISTS "auditoria_clinica_admin_lectura" ON public.auditoria_clinica;
CREATE POLICY "auditoria_clinica_admin_lectura" ON public.auditoria_clinica
  FOR SELECT TO authenticated USING (public.es_admin());

CREATE OR REPLACE FUNCTION public.registrar_auditoria_clinica()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_email text := coalesce(auth.jwt() ->> 'email', '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.modulo = 'historia_clinica' THEN
      INSERT INTO public.auditoria_clinica (actor_id, actor_email, accion, modulo, registro_id, titulo)
      VALUES (auth.uid(), v_actor_email, 'creó', NEW.modulo, NEW.id, NEW.titulo);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.modulo = 'historia_clinica' THEN
      INSERT INTO public.auditoria_clinica (actor_id, actor_email, accion, modulo, registro_id, titulo)
      VALUES (auth.uid(), v_actor_email, 'modificó', NEW.modulo, NEW.id, NEW.titulo);
    END IF;
    RETURN NEW;
  ELSE
    IF OLD.modulo = 'historia_clinica' THEN
      INSERT INTO public.auditoria_clinica (actor_id, actor_email, accion, modulo, registro_id, titulo)
      VALUES (auth.uid(), v_actor_email, 'eliminó', OLD.modulo, OLD.id, OLD.titulo);
    END IF;
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_auditoria_clinica ON public.modulo_registros;
CREATE TRIGGER trg_auditoria_clinica
  AFTER INSERT OR UPDATE OR DELETE ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_clinica();
