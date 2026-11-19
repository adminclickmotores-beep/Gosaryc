-- Enlaces a clientes, pacientes, socios y contactos: siempre del mismo negocio.
-- 1) Función que comprueba que un registro pertenezca al negocio indicado.
CREATE OR REPLACE FUNCTION public.registro_es_del_negocio(p_tabla text, p_id text, p_owner uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean;
BEGIN
  IF p_id IS NULL OR btrim(p_id) = '' THEN
    RETURN true;
  END IF;
  IF p_owner IS NULL THEN
    RETURN false;
  END IF;
  IF to_regclass('public.' || quote_ident(p_tabla)) IS NULL THEN
    RETURN true;
  END IF;
  EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE id::text = $1 AND owner_id = $2)', p_tabla)
    INTO ok USING p_id, p_owner;
  RETURN coalesce(ok, false);
EXCEPTION WHEN others THEN
  RETURN false;
END;
$$;
REVOKE ALL ON FUNCTION public.registro_es_del_negocio(text, text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.registro_es_del_negocio(text, text, uuid) TO authenticated;

-- 2) Valida las referencias guardadas dentro de modulo_registros.datos (sin llave foránea).
CREATE OR REPLACE FUNCTION public.validar_datos_modulo_mismo_negocio()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  par text[];
  valor text;
  pares text[][] := ARRAY[
    ['cliente_id','clientes'], ['cliente_id','restaurante_clientes'],
    ['paciente_id','pacientes'], ['socio_id','socios'],
    ['contacto_id','contactos'], ['huesped_id','huespedes'],
    ['estudiante_id','estudiantes']
  ];
  llave text;
  tabla text;
  i int;
  encontrada boolean;
BEGIN
  IF NEW.datos IS NULL OR jsonb_typeof(NEW.datos) <> 'object' THEN
    RETURN NEW;
  END IF;
  FOR llave IN SELECT DISTINCT pares[k][1] FROM generate_subscripts(pares, 1) k LOOP
    valor := NEW.datos ->> llave;
    CONTINUE WHEN valor IS NULL OR btrim(valor) = '';
    encontrada := false;
    FOR i IN 1 .. array_length(pares, 1) LOOP
      IF pares[i][1] = llave AND to_regclass('public.' || pares[i][2]) IS NOT NULL THEN
        IF public.registro_es_del_negocio(pares[i][2], valor, NEW.owner_id) THEN
          encontrada := true;
        END IF;
      END IF;
    END LOOP;
    IF NOT encontrada THEN
      RAISE EXCEPTION 'El registro enlazado no pertenece a tu negocio.' USING ERRCODE = '42501';
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.validar_datos_modulo_mismo_negocio() FROM public, anon, authenticated;

DROP TRIGGER IF EXISTS zz_mismo_negocio_datos ON public.modulo_registros;
CREATE TRIGGER zz_mismo_negocio_datos
  BEFORE INSERT OR UPDATE ON public.modulo_registros
  FOR EACH ROW EXECUTE FUNCTION public.validar_datos_modulo_mismo_negocio();

-- 3) Política WITH CHECK restrictiva (además del trigger) en modulo_registros.
DROP POLICY IF EXISTS enlaces_mismo_negocio_crear ON public.modulo_registros;
CREATE POLICY enlaces_mismo_negocio_crear ON public.modulo_registros
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    public.registro_es_del_negocio('clientes', datos ->> 'cliente_id', owner_id)
    OR public.registro_es_del_negocio('restaurante_clientes', datos ->> 'cliente_id', owner_id)
  );
DROP POLICY IF EXISTS enlaces_mismo_negocio_editar ON public.modulo_registros;
CREATE POLICY enlaces_mismo_negocio_editar ON public.modulo_registros
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (true)
  WITH CHECK (
    public.registro_es_del_negocio('clientes', datos ->> 'cliente_id', owner_id)
    OR public.registro_es_del_negocio('restaurante_clientes', datos ->> 'cliente_id', owner_id)
  );

-- 4) Triggers en toda llave foránea hacia tablas con negocio (cliente, paciente, socio, contacto...),
--    ahora también cuando la tabla hija usa otro nombre de columna de negocio.
DO $$
DECLARE
  r record;
  nombre_trg text;
BEGIN
  FOR r IN
    SELECT ch.relname AS tabla_hija, pa.relname AS tabla_padre,
           a_hija.attname AS col_hija, a_padre.attname AS col_padre,
           format_type(a_padre.atttypid, a_padre.atttypmod) AS tipo_padre
      FROM pg_constraint c
      JOIN pg_class ch ON ch.oid = c.conrelid
      JOIN pg_namespace nh ON nh.oid = ch.relnamespace AND nh.nspname = 'public'
      JOIN pg_class pa ON pa.oid = c.confrelid
      JOIN pg_namespace np ON np.oid = pa.relnamespace AND np.nspname = 'public'
      JOIN pg_attribute a_hija ON a_hija.attrelid = c.conrelid AND a_hija.attnum = c.conkey[1]
      JOIN pg_attribute a_padre ON a_padre.attrelid = c.confrelid AND a_padre.attnum = c.confkey[1]
     WHERE c.contype = 'f'
       AND array_length(c.conkey, 1) = 1
       AND a_hija.attname <> 'owner_id'
       AND ch.relkind = 'r' AND pa.relkind = 'r'
       AND EXISTS (SELECT 1 FROM pg_attribute x WHERE x.attrelid = c.conrelid AND x.attname = 'owner_id' AND NOT x.attisdropped)
       AND EXISTS (SELECT 1 FROM pg_attribute x WHERE x.attrelid = c.confrelid AND x.attname = 'owner_id' AND NOT x.attisdropped)
  LOOP
    nombre_trg := left('zz_mismo_negocio_' || r.col_hija, 63);
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', nombre_trg, r.tabla_hija);
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validar_referencia_mismo_negocio(%L, %L, %L, %L)',
      nombre_trg, r.tabla_hija, r.tabla_padre, r.col_hija, r.col_padre, r.tipo_padre);
  END LOOP;
END $$;
