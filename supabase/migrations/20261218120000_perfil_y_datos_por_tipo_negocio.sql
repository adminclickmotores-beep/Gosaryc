-- Cada tipo de negocio de una cuenta tiene sus propios datos (nombre, logo, portada, horarios...)
-- y sus propios registros. Se elimina el antiguo "negocio general".

-- 1. El antiguo "negocio general" (otro) pasa a un tipo real.
UPDATE public.negocio_config
SET tipo_negocio = CASE WHEN nombre ILIKE '%motors%' OR nombre ILIKE '%vehic%' OR nombre ILIKE '%autos%' THEN 'concesionario' ELSE 'restaurante' END
WHERE public.clave_tipo_negocio(tipo_negocio) = 'otro';

-- 2. Perfil guardado por tipo de negocio.
CREATE TABLE IF NOT EXISTS public.negocio_perfiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo_negocio text NOT NULL,
  nombre text,
  eslogan text,
  descripcion text,
  ciudad text,
  cobertura text,
  telefono_pedidos text,
  instagram text,
  sitio_web text,
  horarios text,
  aviso_entrega text,
  logo_url text,
  portada_url text,
  color_principal text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, tipo_negocio)
);

ALTER TABLE public.negocio_perfiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "perfiles_admin" ON public.negocio_perfiles;
CREATE POLICY "perfiles_admin" ON public.negocio_perfiles
  FOR ALL TO authenticated
  USING (public.es_admin() AND owner_id = public.mi_negocio_id())
  WITH CHECK (public.es_admin() AND owner_id = public.mi_negocio_id());

-- 3. Al cambiar de tipo: se guarda el perfil del tipo anterior y se carga el del nuevo (o queda en blanco).
CREATE OR REPLACE FUNCTION public.cambiar_perfil_por_tipo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vieja text := public.clave_tipo_negocio(OLD.tipo_negocio);
  nueva text := public.clave_tipo_negocio(NEW.tipo_negocio);
  p public.negocio_perfiles%ROWTYPE;
  nombre_pedido text := NEW.nombre;
BEGIN
  IF vieja = nueva OR OLD.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.negocio_perfiles
    (owner_id, tipo_negocio, nombre, eslogan, descripcion, ciudad, cobertura, telefono_pedidos,
     instagram, sitio_web, horarios, aviso_entrega, logo_url, portada_url, color_principal, updated_at)
  VALUES
    (OLD.owner_id, vieja, OLD.nombre, OLD.eslogan, OLD.descripcion, OLD.ciudad, OLD.cobertura, OLD.telefono_pedidos,
     OLD.instagram, OLD.sitio_web, OLD.horarios, OLD.aviso_entrega, OLD.logo_url, OLD.portada_url, OLD.color_principal, now())
  ON CONFLICT (owner_id, tipo_negocio) DO UPDATE SET
    nombre = EXCLUDED.nombre, eslogan = EXCLUDED.eslogan, descripcion = EXCLUDED.descripcion,
    ciudad = EXCLUDED.ciudad, cobertura = EXCLUDED.cobertura, telefono_pedidos = EXCLUDED.telefono_pedidos,
    instagram = EXCLUDED.instagram, sitio_web = EXCLUDED.sitio_web, horarios = EXCLUDED.horarios,
    aviso_entrega = EXCLUDED.aviso_entrega, logo_url = EXCLUDED.logo_url, portada_url = EXCLUDED.portada_url,
    color_principal = EXCLUDED.color_principal, updated_at = now();

  SELECT * INTO p FROM public.negocio_perfiles WHERE owner_id = OLD.owner_id AND tipo_negocio = nueva;

  IF FOUND THEN
    NEW.nombre := coalesce(nullif(p.nombre, ''), 'Mi negocio');
    NEW.eslogan := p.eslogan;
    NEW.descripcion := p.descripcion;
    NEW.ciudad := p.ciudad;
    NEW.cobertura := p.cobertura;
    NEW.telefono_pedidos := p.telefono_pedidos;
    NEW.instagram := p.instagram;
    NEW.sitio_web := p.sitio_web;
    NEW.horarios := p.horarios;
    NEW.aviso_entrega := p.aviso_entrega;
    NEW.logo_url := p.logo_url;
    NEW.portada_url := p.portada_url;
    NEW.color_principal := p.color_principal;
  ELSE
    NEW.nombre := CASE WHEN nombre_pedido IS DISTINCT FROM OLD.nombre AND coalesce(nombre_pedido, '') <> '' THEN nombre_pedido ELSE 'Mi negocio' END;
    NEW.eslogan := NULL;
    NEW.descripcion := NULL;
    NEW.ciudad := NULL;
    NEW.cobertura := NULL;
    NEW.telefono_pedidos := NULL;
    NEW.instagram := NULL;
    NEW.sitio_web := NULL;
    NEW.horarios := NULL;
    NEW.aviso_entrega := NULL;
    NEW.logo_url := NULL;
    NEW.portada_url := NULL;
    NEW.color_principal := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS negocio_config_perfil_por_tipo ON public.negocio_config;
CREATE TRIGGER negocio_config_perfil_por_tipo
  BEFORE UPDATE OF tipo_negocio ON public.negocio_config
  FOR EACH ROW
  WHEN (OLD.tipo_negocio IS DISTINCT FROM NEW.tipo_negocio)
  EXECUTE FUNCTION public.cambiar_perfil_por_tipo();

-- 4. Registros de módulos, cotizaciones y citas: cada uno pertenece al tipo con que se creó
-- y solo se ve en ese tipo de negocio.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['modulo_registros', 'cotizaciones', 'agenda_citas'] LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tipo_negocio text', t);
    -- Lo que ya existía queda en el tipo actual de su dueño.
    EXECUTE format(
      'UPDATE public.%I x SET tipo_negocio = coalesce((SELECT public.clave_tipo_negocio(n.tipo_negocio) FROM public.negocio_config n WHERE n.owner_id = x.owner_id LIMIT 1), ''restaurante'') WHERE x.tipo_negocio IS NULL',
      t
    );
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_tipo_trg', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.asignar_tipo_negocio_menu()', t || '_tipo_trg', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_tipo_actual', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual()) WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())',
      t || '_solo_tipo_actual', t
    );
  END LOOP;
END $$;
