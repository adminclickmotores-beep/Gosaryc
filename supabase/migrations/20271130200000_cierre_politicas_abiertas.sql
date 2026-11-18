-- Cierre de los avisos de la Comprobación de seguridad (18-nov-2026).
-- 1. Barrido de políticas abiertas: busca TODA política permisiva del esquema public
--    que aún diga USING (true) o WITH CHECK (true) y la convierte en una regla con
--    filtro real (ALTER POLICY: no se borra ninguna política ni ningún dato).
--      * Tablas privadas con owner_id: solo el propio negocio
--        (owner_id = mi_negocio_id(): el dueño es auth.uid() y su equipo usa el del dueño)
--        o el Superadmin. Las 2 cuentas demo inician sesión con su propio owner_id,
--        así que siguen viendo y moviendo solo sus datos.
--      * Lecturas públicas (menú QR / catálogo, roles anon o public): quedan filtradas
--        por negocio (owner_id IS NOT NULL; la app siempre consulta por owner_id).
--      * Escrituras abiertas al público que no sean INSERT: pasan a solo personal
--        del negocio.
--      * Ítems de pedido (sin owner_id): se filtran por el negocio del pedido.
--    La validación pública de certificados SST es la función sst_validar_certificado
--    (SECURITY DEFINER) y no se toca.
-- 2. Datos introducidos por el usuario: límites de longitud en pedidos públicos
--    (mismos límites que la app, NOT VALID: solo filas nuevas).

DO $$
DECLARE
  r record;
  propio constant text :=
    '(owner_id = (SELECT public.mi_negocio_id()) OR (SELECT public.es_superadmin()))';
  publico constant text := '(owner_id IS NOT NULL)';
  por_pedido constant text :=
    '(EXISTS (SELECT 1 FROM public.restaurante_pedidos p WHERE p.id = pedido_id '
    || 'AND (p.owner_id = (SELECT public.mi_negocio_id()) OR (SELECT public.es_superadmin()))))';
  filtro text;
  es_publica boolean;
BEGIN
  FOR r IN
    SELECT p.tablename, p.policyname, p.cmd, p.roles
      FROM pg_policies p
     WHERE p.schemaname = 'public'
       AND p.permissive = 'PERMISSIVE'
       AND (
         btrim(coalesce(p.qual, '')) IN ('true', '(true)')
         OR btrim(coalesce(p.with_check, '')) IN ('true', '(true)')
       )
  LOOP
    BEGIN
      es_publica := r.roles && ARRAY['anon', 'public']::name[];

      IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = r.tablename AND column_name = 'owner_id'
      ) THEN
        filtro := propio;
      ELSIF r.tablename = 'restaurante_pedido_items' THEN
        filtro := por_pedido;
      ELSE
        -- Tablas globales sin dueño (calendarios, parámetros): ya tienen su regla propia.
        RAISE NOTICE 'Política abierta sin owner_id, revisar a mano: %.%', r.tablename, r.policyname;
        CONTINUE;
      END IF;

      IF es_publica AND r.cmd = 'SELECT' AND filtro = propio THEN
        -- Menú QR / catálogo: lectura pública, pero siempre de un negocio concreto.
        EXECUTE format('ALTER POLICY %I ON public.%I USING %s', r.policyname, r.tablename, publico);
      ELSIF es_publica AND r.cmd = 'INSERT' THEN
        IF filtro <> propio THEN
          -- Creación pública sin owner_id (ítems del pedido del menú): se deja intacta.
          RAISE NOTICE 'Creación pública sin owner_id, se conserva: %.%', r.tablename, r.policyname;
          CONTINUE;
        END IF;
        -- Pedidos y formularios públicos: deben indicar a qué negocio van.
        EXECUTE format('ALTER POLICY %I ON public.%I WITH CHECK %s', r.policyname, r.tablename, publico);
      ELSIF r.cmd IN ('SELECT', 'DELETE') THEN
        EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated USING %s',
          r.policyname, r.tablename, filtro);
      ELSIF r.cmd = 'INSERT' THEN
        EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated WITH CHECK %s',
          r.policyname, r.tablename, filtro);
      ELSE
        -- UPDATE o ALL
        EXECUTE format('ALTER POLICY %I ON public.%I TO authenticated USING %s WITH CHECK %s',
          r.policyname, r.tablename, filtro, filtro);
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'No se pudo cerrar la política %.%: %', r.tablename, r.policyname, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================
-- 2. Pedidos públicos (menú QR, enlace público, agente): longitud máxima.
-- ============================================================
DO $$
BEGIN
  IF to_regclass('public.restaurante_pedidos') IS NULL THEN RETURN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'restaurante_pedidos_longitudes') THEN
    ALTER TABLE public.restaurante_pedidos
      ADD CONSTRAINT restaurante_pedidos_longitudes CHECK (
        char_length(coalesce(cliente_nombre, '')) <= 120
        AND char_length(coalesce(cliente_telefono, '')) <= 20
        AND char_length(coalesce(direccion, '')) <= 300
        AND char_length(coalesce(barrio, '')) <= 120
        AND char_length(coalesce(notas, '')) <= 500
      ) NOT VALID;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Límites de pedidos no aplicados: %', SQLERRM;
END $$;
