-- Validación pública de certificados de aptitud laboral (portal de empresas cliente).
-- Solo expone los datos del certificado (trabajador, empresa, tipo, concepto, fechas y código).
-- Nunca expone historia clínica: esa información no vive en estas tablas.
-- Sin DROP/TRUNCATE/DELETE.

CREATE OR REPLACE FUNCTION public.sst_validar_certificado(p_codigo text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_cod text := upper(trim(coalesce(p_codigo, '')));
  v_row public.sst_evaluaciones%ROWTYPE;
BEGIN
  IF length(v_cod) < 4 THEN RETURN NULL; END IF;
  SELECT * INTO v_row FROM public.sst_evaluaciones WHERE upper(codigo_seguro) = v_cod LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object(
    'trabajador', v_row.trabajador,
    'empresa', v_row.empresa,
    'tipo', v_row.tipo,
    'concepto', v_row.concepto,
    'fecha', v_row.fecha,
    'vence', v_row.vence,
    'codigo', v_row.codigo_seguro
  );
END;
$$;
REVOKE ALL ON FUNCTION public.sst_validar_certificado(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.sst_validar_certificado(text) TO anon, authenticated;
