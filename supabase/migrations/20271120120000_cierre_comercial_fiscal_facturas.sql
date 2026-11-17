-- PROMPT #10 — CIERRE COMERCIAL (parte 1): datos fiscales DIAN y facturas emitidas.
-- Columnas fiscales oficiales en la ficha del negocio y tabla de facturas de
-- venta con consecutivo, listas para conectarse por API a un proveedor DIAN.
-- No borra ni trunca datos.

-- 1. Columnas fiscales en la ficha del negocio (una sola vez, sin romper lo que hay).
ALTER TABLE public.negocio_config
  ADD COLUMN IF NOT EXISTS razon_social text,
  ADD COLUMN IF NOT EXISTS tipo_documento text NOT NULL DEFAULT 'NIT' CHECK (tipo_documento IN ('NIT', 'CC', 'CE', 'PASAPORTE')),
  ADD COLUMN IF NOT EXISTS nit text,
  ADD COLUMN IF NOT EXISTS digito_verificacion text,
  ADD COLUMN IF NOT EXISTS direccion_fiscal text,
  ADD COLUMN IF NOT EXISTS regimen_tributario text NOT NULL DEFAULT 'No responsable de IVA' CHECK (regimen_tributario IN ('No responsable de IVA', 'Responsable de IVA', 'Régimen simple de tributación', 'Gran contribuyente', 'Autorretenedor')),
  ADD COLUMN IF NOT EXISTS responsabilidad_fiscal text NOT NULL DEFAULT 'R-99-PN' CHECK (length(trim(responsabilidad_fiscal)) >= 2),
  ADD COLUMN IF NOT EXISTS resolucion_facturacion text,
  ADD COLUMN IF NOT EXISTS rango_desde bigint NOT NULL DEFAULT 1 CHECK (rango_desde >= 1),
  ADD COLUMN IF NOT EXISTS rango_hasta bigint NOT NULL DEFAULT 1000 CHECK (rango_hasta >= rango_desde),
  ADD COLUMN IF NOT EXISTS resolucion_vence date,
  ADD COLUMN IF NOT EXISTS iva_defecto numeric NOT NULL DEFAULT 0 CHECK (iva_defecto >= 0 AND iva_defecto <= 100);

-- 2. Facturas de venta emitidas (consecutivo interno, listas para el proveedor DIAN).
CREATE TABLE IF NOT EXISTS public.fac_emitidas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid DEFAULT public.mi_negocio_id(),
  tipo_negocio text DEFAULT public.tipo_negocio_actual(),
  numero bigint NOT NULL,
  cliente text NOT NULL CHECK (length(trim(cliente)) >= 2),
  cliente_doc text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  subtotal numeric NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  iva numeric NOT NULL DEFAULT 0 CHECK (iva >= 0),
  total numeric NOT NULL CHECK (total >= 0),
  formato text NOT NULL DEFAULT 'tirilla' CHECK (formato IN ('tirilla', 'carta')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, numero)
);
CREATE INDEX IF NOT EXISTS fac_emi_owner_idx ON public.fac_emitidas (owner_id, numero DESC);

-- 3. RLS estricto + sin borrado físico.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fac_emitidas'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_leer', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_leer', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_mi_negocio', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (owner_id = public.mi_negocio_id()) WITH CHECK (owner_id = public.mi_negocio_id())', t || '_solo_mi_negocio', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_solo_tipo_actual', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual()) WITH CHECK (public.clave_tipo_negocio(tipo_negocio) = public.tipo_negocio_actual())', t || '_solo_tipo_actual', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('REVOKE TRUNCATE, TRIGGER, REFERENCES ON public.%I FROM authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_crear', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_crear', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_editar', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (owner_id = public.mi_negocio_id() AND public.es_personal()) WITH CHECK (owner_id = public.mi_negocio_id() AND public.es_personal())', t || '_editar', t);
    EXECUTE format('DROP TRIGGER IF EXISTS trg_sin_borrado_fisico ON public.%I', t);
    EXECUTE format('CREATE TRIGGER trg_sin_borrado_fisico BEFORE DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.bloquear_borrado_financiero()', t);
  END LOOP;
END $$;

-- 4. Emitir factura con consecutivo automático dentro del rango de la resolución.
CREATE OR REPLACE FUNCTION public.fac_emitir(p_cliente text, p_cliente_doc text, p_items jsonb, p_iva numeric, p_formato text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.mi_negocio_id();
  v_neg record;
  v_num bigint;
  v_sub numeric := 0;
  v_iva numeric := coalesce(p_iva, 0);
  v_id uuid := gen_random_uuid();
  it jsonb;
BEGIN
  IF v_owner IS NULL OR NOT public.es_personal() THEN RAISE EXCEPTION 'Sin acceso.'; END IF;
  IF nullif(trim(coalesce(p_cliente, '')), '') IS NULL THEN RAISE EXCEPTION 'Escribe el cliente.'; END IF;
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN RAISE EXCEPTION 'Agrega al menos un ítem.'; END IF;
  SELECT * INTO v_neg FROM public.negocio_config WHERE id = v_owner;
  IF NOT FOUND THEN RAISE EXCEPTION 'Primero completa los datos de tu negocio (Mi negocio).'; END IF;
  FOR it IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_sub := v_sub + coalesce((it ->> 'cantidad')::numeric, 0) * coalesce((it ->> 'precio')::numeric, 0);
  END LOOP;
  SELECT coalesce(max(numero), coalesce(v_neg.rango_desde, 1) - 1) + 1 INTO v_num
  FROM public.fac_emitidas WHERE owner_id = v_owner;
  IF v_num < coalesce(v_neg.rango_desde, 1) THEN v_num := coalesce(v_neg.rango_desde, 1); END IF;
  IF v_num > coalesce(v_neg.rango_hasta, 1000) THEN RAISE EXCEPTION 'Se agotó el rango autorizado (hasta %). Pide nueva resolución DIAN.', v_neg.rango_hasta; END IF;
  INSERT INTO public.fac_emitidas (id, owner_id, tipo_negocio, numero, cliente, cliente_doc, items, subtotal, iva, total, formato)
  VALUES (v_id, v_owner, public.tipo_negocio_actual(), v_num, trim(p_cliente),
          nullif(trim(coalesce(p_cliente_doc, '')), ''), p_items, round(v_sub, 2), round(v_sub * v_iva / 100, 2),
          round(v_sub * (1 + v_iva / 100), 2), coalesce(nullif(trim(p_formato), ''), 'tirilla'));
  RETURN jsonb_build_object('id', v_id, 'numero', v_num);
END;
$$;
REVOKE ALL ON FUNCTION public.fac_emitir(text, text, jsonb, numeric, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.fac_emitir(text, text, jsonb, numeric, text) TO authenticated;
