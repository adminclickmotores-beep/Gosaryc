-- Aislamiento por negocio en TODA tabla con owner_id: aunque una consulta del navegador llegue por id,
-- la base solo deja leer, editar o borrar filas del propio negocio (o al Superadmin).
-- Políticas RESTRICTIVAS: se suman a las existentes, no las reemplazan. No borra datos.
-- Se omiten, por operación, las tablas que tienen una política pública/anon legítima (menú QR, pedidos públicos).
DO $$
DECLARE
  t text;
  hay_publica_sel boolean;
  hay_publica_ins boolean;
  hay_publica_upd boolean;
  hay_publica_del boolean;
BEGIN
  FOR t IN
    SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables tb
        ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name AND tb.table_type = 'BASE TABLE'
     WHERE c.table_schema = 'public' AND c.column_name = 'owner_id'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

    SELECT
      bool_or(cmd IN ('SELECT', 'ALL') AND (roles && ARRAY['public'::name, 'anon'::name])),
      bool_or(cmd IN ('INSERT', 'ALL') AND (roles && ARRAY['public'::name, 'anon'::name])),
      bool_or(cmd IN ('UPDATE', 'ALL') AND (roles && ARRAY['public'::name, 'anon'::name])),
      bool_or(cmd IN ('DELETE', 'ALL') AND (roles && ARRAY['public'::name, 'anon'::name]))
      INTO hay_publica_sel, hay_publica_ins, hay_publica_upd, hay_publica_del
      FROM pg_policies
     WHERE schemaname = 'public' AND tablename = t AND permissive = 'PERMISSIVE';

    EXECUTE format('DROP POLICY IF EXISTS aislamiento_leer ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS aislamiento_crear ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS aislamiento_editar ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS aislamiento_borrar ON public.%I', t);

    IF NOT coalesce(hay_publica_sel, false) THEN
      EXECUTE format(
        'CREATE POLICY aislamiento_leer ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated USING (owner_id = (SELECT public.mi_negocio_id()) OR (SELECT public.es_superadmin()))', t);
    END IF;
    IF NOT coalesce(hay_publica_ins, false) THEN
      EXECUTE format(
        'CREATE POLICY aislamiento_crear ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (owner_id = (SELECT public.mi_negocio_id()) OR (SELECT public.es_superadmin()))', t);
    END IF;
    IF NOT coalesce(hay_publica_upd, false) THEN
      EXECUTE format(
        'CREATE POLICY aislamiento_editar ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (owner_id = (SELECT public.mi_negocio_id()) OR (SELECT public.es_superadmin())) WITH CHECK (owner_id = (SELECT public.mi_negocio_id()) OR (SELECT public.es_superadmin()))', t);
    END IF;
    IF NOT coalesce(hay_publica_del, false) THEN
      EXECUTE format(
        'CREATE POLICY aislamiento_borrar ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (owner_id = (SELECT public.mi_negocio_id()) OR (SELECT public.es_superadmin()))', t);
    END IF;
  END LOOP;
END $$;
