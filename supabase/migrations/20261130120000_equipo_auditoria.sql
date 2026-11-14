-- Historial de cambios del equipo: quién autorizó, quitó, activó/desactivó o cambió los módulos de cada persona.
-- Se llena solo desde un trigger; ningún cliente puede escribir ni borrar registros.

CREATE TABLE IF NOT EXISTS public.equipo_auditoria (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  accion text not null,
  miembro_email text not null,
  detalle text,
  created_at timestamptz not null default now()
);

ALTER TABLE public.equipo_auditoria ENABLE ROW LEVEL SECURITY;

-- Solo el administrador puede leer el historial.
DROP POLICY IF EXISTS "equipo_auditoria_admin_lectura" ON public.equipo_auditoria;
CREATE POLICY "equipo_auditoria_admin_lectura" ON public.equipo_auditoria
  FOR SELECT TO authenticated USING (public.es_admin());

CREATE OR REPLACE FUNCTION public.registrar_auditoria_equipo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_email text := coalesce(auth.jwt() ->> 'email', '');
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.equipo_auditoria (actor_id, actor_email, accion, miembro_email, detalle)
    VALUES (auth.uid(), v_actor_email, 'autorizó a', NEW.email,
            'Módulos: ' || coalesce(nullif(array_to_string(NEW.modulos, ', '), ''), 'ninguno'));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.activo IS DISTINCT FROM OLD.activo THEN
      INSERT INTO public.equipo_auditoria (actor_id, actor_email, accion, miembro_email, detalle)
      VALUES (auth.uid(), v_actor_email, CASE WHEN NEW.activo THEN 'activó a' ELSE 'desactivó a' END, NEW.email, NULL);
    END IF;
    IF NEW.modulos IS DISTINCT FROM OLD.modulos THEN
      INSERT INTO public.equipo_auditoria (actor_id, actor_email, accion, miembro_email, detalle)
      VALUES (auth.uid(), v_actor_email, 'cambió los módulos de', NEW.email,
              'Antes: ' || coalesce(nullif(array_to_string(OLD.modulos, ', '), ''), 'ninguno')
              || ' · Ahora: ' || coalesce(nullif(array_to_string(NEW.modulos, ', '), ''), 'ninguno'));
    END IF;
    RETURN NEW;
  ELSE
    INSERT INTO public.equipo_auditoria (actor_id, actor_email, accion, miembro_email, detalle)
    VALUES (auth.uid(), v_actor_email, 'quitó a', OLD.email, NULL);
    RETURN OLD;
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_auditoria_equipo ON public.equipo_negocio;
CREATE TRIGGER trg_auditoria_equipo
  AFTER INSERT OR UPDATE OR DELETE ON public.equipo_negocio
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_equipo();
