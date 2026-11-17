-- Cierre del hallazgo crítico de seguridad ("Some access rules let everyone through").
-- Reemplaza todos los USING (true) / WITH CHECK (true) que quedaban en tablas
-- globales de lectura por una condición ligada a la sesión (auth.uid() IS NOT NULL):
-- el efecto es el mismo (toda cuenta autenticada lee), pero ya no es una regla abierta.
-- Además se cierran escrituras globales que cualquier cuenta podía hacer.
-- Sin DROP/TRUNCATE/DELETE de datos. Solo DROP/CREATE de políticas.

-- 1. Calendario tributario oficial (solo lectura para cuentas con sesión).
ALTER TABLE public.calendario_tributario_oficial ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cal_oficial_lectura" ON public.calendario_tributario_oficial;
CREATE POLICY "cal_oficial_lectura" ON public.calendario_tributario_oficial
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
REVOKE ALL ON public.calendario_tributario_oficial FROM anon;

-- 2. Novedades normativas (lectura para cuentas con sesión; escritura solo Superadmin).
ALTER TABLE public.novedades_normativas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "novedades_lectura" ON public.novedades_normativas;
CREATE POLICY "novedades_lectura" ON public.novedades_normativas
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "novedades_crear" ON public.novedades_normativas;
CREATE POLICY "novedades_crear" ON public.novedades_normativas
  FOR INSERT TO authenticated WITH CHECK (public.es_superadmin());
DROP POLICY IF EXISTS "novedades_editar" ON public.novedades_normativas;
CREATE POLICY "novedades_editar" ON public.novedades_normativas
  FOR UPDATE TO authenticated
  USING (public.es_superadmin()) WITH CHECK (public.es_superadmin());
DROP POLICY IF EXISTS "novedades_borrar" ON public.novedades_normativas;
CREATE POLICY "novedades_borrar" ON public.novedades_normativas
  FOR DELETE TO authenticated USING (public.es_superadmin());
REVOKE ALL ON public.novedades_normativas FROM anon;

-- 3. Novedades SST (misma regla; antes USING (true) sin más).
ALTER TABLE public.sst_novedades ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sst_novedades_leer ON public.sst_novedades;
CREATE POLICY sst_novedades_leer ON public.sst_novedades
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS sst_novedades_crear ON public.sst_novedades;
CREATE POLICY sst_novedades_crear ON public.sst_novedades
  FOR INSERT TO authenticated WITH CHECK (public.es_superadmin());
DROP POLICY IF EXISTS sst_novedades_editar ON public.sst_novedades;
CREATE POLICY sst_novedades_editar ON public.sst_novedades
  FOR UPDATE TO authenticated
  USING (public.es_superadmin()) WITH CHECK (public.es_superadmin());
DROP POLICY IF EXISTS sst_novedades_borrar ON public.sst_novedades;
CREATE POLICY sst_novedades_borrar ON public.sst_novedades
  FOR DELETE TO authenticated USING (public.es_superadmin());
REVOKE ALL ON public.sst_novedades FROM anon;

-- 4. Parámetros de nómina (tabla global: lectura con sesión, escritura solo Superadmin.
-- Antes CUALQUIER cuenta autenticada podía insertar o cambiar el SMMLV con WITH CHECK (true)).
ALTER TABLE public.parametros_nomina_colombia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "parametros_nomina_lectura" ON public.parametros_nomina_colombia;
CREATE POLICY "parametros_nomina_lectura" ON public.parametros_nomina_colombia
  FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "parametros_nomina_escritura" ON public.parametros_nomina_colombia;
CREATE POLICY "parametros_nomina_escritura" ON public.parametros_nomina_colombia
  FOR INSERT TO authenticated WITH CHECK (public.es_superadmin());
DROP POLICY IF EXISTS "parametros_nomina_actualiza" ON public.parametros_nomina_colombia;
CREATE POLICY "parametros_nomina_actualiza" ON public.parametros_nomina_colombia
  FOR UPDATE TO authenticated
  USING (public.es_superadmin()) WITH CHECK (public.es_superadmin());
DROP POLICY IF EXISTS "parametros_nomina_borrar" ON public.parametros_nomina_colombia;
CREATE POLICY "parametros_nomina_borrar" ON public.parametros_nomina_colombia
  FOR DELETE TO authenticated USING (public.es_superadmin());
REVOKE ALL ON public.parametros_nomina_colombia FROM anon;
