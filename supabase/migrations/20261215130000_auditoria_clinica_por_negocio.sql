-- Permisos clínicos estrictos: la auditoría clínica solo la ve el administrador de SU negocio,
-- y cada registro clínico se audita con el negocio al que pertenece.
-- No borra datos: agrega columna, reemplaza política y función.

ALTER TABLE public.auditoria_clinica
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT public.mi_negocio_id();

CREATE INDEX IF NOT EXISTS auditoria_clinica_owner_idx ON public.auditoria_clinica (owner_id);

DROP POLICY IF EXISTS "auditoria_clinica_admin_lectura" ON public.auditoria_clinica;
CREATE POLICY "auditoria_clinica_admin_lectura" ON public.auditoria_clinica
  FOR SELECT TO authenticated
  USING (public.es_admin() AND owner_id = public.mi_negocio_id());

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
      INSERT INTO public.auditoria_clinica (owner_id, actor_id, actor_email, accion, modulo, registro_id, titulo)
      VALUES (NEW.owner_id, auth.uid(), v_actor_email, 'creó', NEW.modulo, NEW.id, NEW.titulo);
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.modulo = 'historia_clinica' THEN
      INSERT INTO public.auditoria_clinica (owner_id, actor_id, actor_email, accion, modulo, registro_id, titulo)
      VALUES (NEW.owner_id, auth.uid(), v_actor_email, 'modificó', NEW.modulo, NEW.id, NEW.titulo);
    END IF;
    RETURN NEW;
  ELSE
    IF OLD.modulo = 'historia_clinica' THEN
      INSERT INTO public.auditoria_clinica (owner_id, actor_id, actor_email, accion, modulo, registro_id, titulo)
      VALUES (OLD.owner_id, auth.uid(), v_actor_email, 'eliminó', OLD.modulo, OLD.id, OLD.titulo);
    END IF;
    RETURN OLD;
  END IF;
END;
$$;
