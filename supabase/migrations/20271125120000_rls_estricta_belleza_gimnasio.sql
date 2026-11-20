-- RLS estricta para módulos de Belleza y Gimnasio:
-- 1) Solo el dueño o administrador del negocio puede crear, editar o eliminar
--    configuración de servicios, porcentajes de comisión, insumos, recetas y planes.
-- 2) El personal/staff solo puede consultar (SELECT) el catálogo de servicios/planes
--    y únicamente sus propias atenciones y comisiones ganadas, nunca modificar reglas ni costos.

ALTER TABLE public.bel_citas ADD COLUMN IF NOT EXISTS staff_id uuid;
ALTER TABLE public.bel_atenciones ADD COLUMN IF NOT EXISTS staff_id uuid;
ALTER TABLE public.bel_liquidaciones ADD COLUMN IF NOT EXISTS staff_id uuid;

CREATE INDEX IF NOT EXISTS idx_bel_atenciones_owner_staff ON public.bel_atenciones (owner_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_bel_liquidaciones_owner_staff ON public.bel_liquidaciones (owner_id, staff_id);

CREATE OR REPLACE FUNCTION public.es_dueno_o_admin_negocio(p_owner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND p_owner_id IS NOT NULL
    AND p_owner_id = public.mi_negocio_id()
    AND (
      p_owner_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.org_members om_me
        JOIN public.org_members om_owner ON om_owner.org_id = om_me.org_id
        WHERE om_me.user_id = auth.uid()
          AND om_owner.user_id = p_owner_id
          AND om_me.role IN ('owner', 'admin')
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.es_mi_registro_staff(
  p_owner_id uuid,
  p_staff_id uuid,
  p_profesional text,
  p_registrado_por text DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND p_owner_id IS NOT NULL
    AND p_owner_id = public.mi_negocio_id()
    AND (
      public.es_dueno_o_admin_negocio(p_owner_id)
      OR p_staff_id = auth.uid()
      OR (p_registrado_por IS NOT NULL AND p_registrado_por = auth.uid()::text)
      OR (
        p_profesional IS NOT NULL
        AND btrim(p_profesional) <> ''
        AND (
          EXISTS (
            SELECT 1
            FROM public.equipo_negocio en
            WHERE en.user_id = auth.uid()
              AND en.activo = true
              AND (
                lower(btrim(COALESCE(en.nombre, ''))) = lower(btrim(p_profesional))
                OR lower(btrim(COALESCE(en.email, ''))) = lower(btrim(p_profesional))
              )
          )
          OR EXISTS (
            SELECT 1
            FROM public.profiles pr
            WHERE pr.id = auth.uid()
              AND lower(btrim(COALESCE(pr.full_name, ''))) = lower(btrim(p_profesional))
          )
          OR lower(btrim(COALESCE(auth.jwt() ->> 'email', ''))) = lower(btrim(p_profesional))
        )
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.es_dueno_o_admin_negocio(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.es_mi_registro_staff(uuid, uuid, text, text) TO authenticated;

-- Reemplazar políticas permisivas previas en tablas de configuración, insumos y comisiones
DO $$
DECLARE
  tbl text;
  pol record;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'bel_servicios',
    'bel_insumos',
    'bel_servicio_insumos',
    'bel_atenciones',
    'bel_consumos',
    'bel_liquidaciones',
    'gim_planes'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
    FOR pol IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = tbl
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
    END LOOP;
  END LOOP;
END $$;

-- ------------------------------------------------------------
-- bel_servicios: catálogo legible por el equipo; escritura solo dueño/admin
-- ------------------------------------------------------------
CREATE POLICY "bel_servicios_select_negocio"
  ON public.bel_servicios FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id());

CREATE POLICY "bel_servicios_insert_admin"
  ON public.bel_servicios FOR INSERT TO authenticated
  WITH CHECK (public.es_dueno_o_admin_negocio(owner_id));

CREATE POLICY "bel_servicios_update_admin"
  ON public.bel_servicios FOR UPDATE TO authenticated
  USING (public.es_dueno_o_admin_negocio(owner_id))
  WITH CHECK (public.es_dueno_o_admin_negocio(owner_id));

CREATE POLICY "bel_servicios_delete_admin"
  ON public.bel_servicios FOR DELETE TO authenticated
  USING (public.es_dueno_o_admin_negocio(owner_id));

-- ------------------------------------------------------------
-- bel_insumos: costos e inventario estrictamente solo dueño/admin
-- ------------------------------------------------------------
CREATE POLICY "bel_insumos_select_admin"
  ON public.bel_insumos FOR SELECT TO authenticated
  USING (public.es_dueno_o_admin_negocio(owner_id));

CREATE POLICY "bel_insumos_insert_admin"
  ON public.bel_insumos FOR INSERT TO authenticated
  WITH CHECK (public.es_dueno_o_admin_negocio(owner_id));

CREATE POLICY "bel_insumos_update_admin"
  ON public.bel_insumos FOR UPDATE TO authenticated
  USING (public.es_dueno_o_admin_negocio(owner_id))
  WITH CHECK (public.es_dueno_o_admin_negocio(owner_id));

CREATE POLICY "bel_insumos_delete_admin"
  ON public.bel_insumos FOR DELETE TO authenticated
  USING (public.es_dueno_o_admin_negocio(owner_id));

-- ------------------------------------------------------------
-- bel_servicio_insumos: recetas asignadas a servicios solo dueño/admin
-- ------------------------------------------------------------
CREATE POLICY "bel_servicio_insumos_select_admin"
  ON public.bel_servicio_insumos FOR SELECT TO authenticated
  USING (public.es_dueno_o_admin_negocio(owner_id));

CREATE POLICY "bel_servicio_insumos_insert_admin"
  ON public.bel_servicio_insumos FOR INSERT TO authenticated
  WITH CHECK (public.es_dueno_o_admin_negocio(owner_id));

CREATE POLICY "bel_servicio_insumos_update_admin"
  ON public.bel_servicio_insumos FOR UPDATE TO authenticated
  USING (public.es_dueno_o_admin_negocio(owner_id))
  WITH CHECK (public.es_dueno_o_admin_negocio(owner_id));

CREATE POLICY "bel_servicio_insumos_delete_admin"
  ON public.bel_servicio_insumos FOR DELETE TO authenticated
  USING (public.es_dueno_o_admin_negocio(owner_id));

-- ------------------------------------------------------------
-- bel_atenciones: staff solo SELECT de lo propio; escritura solo dueño/admin
-- ------------------------------------------------------------
CREATE POLICY "bel_atenciones_select_propio_o_admin"
  ON public.bel_atenciones FOR SELECT TO authenticated
  USING (public.es_mi_registro_staff(owner_id, staff_id, profesional, registrado_por::text));

CREATE POLICY "bel_atenciones_insert_admin"
  ON public.bel_atenciones FOR INSERT TO authenticated
  WITH CHECK (public.es_dueno_o_admin_negocio(owner_id));

CREATE POLICY "bel_atenciones_update_admin"
  ON public.bel_atenciones FOR UPDATE TO authenticated
  USING (public.es_dueno_o_admin_negocio(owner_id))
  WITH CHECK (public.es_dueno_o_admin_negocio(owner_id));

CREATE POLICY "bel_atenciones_delete_admin"
  ON public.bel_atenciones FOR DELETE TO authenticated
  USING (public.es_dueno_o_admin_negocio(owner_id));

-- ------------------------------------------------------------
-- bel_consumos: costos de insumos consumidos solo dueño/admin
-- ------------------------------------------------------------
CREATE POLICY "bel_consumos_select_admin"
  ON public.bel_consumos FOR SELECT TO authenticated
  USING (public.es_dueno_o_admin_negocio(owner_id));

CREATE POLICY "bel_consumos_insert_admin"
  ON public.bel_consumos FOR INSERT TO authenticated
  WITH CHECK (public.es_dueno_o_admin_negocio(owner_id));

CREATE POLICY "bel_consumos_update_admin"
  ON public.bel_consumos FOR UPDATE TO authenticated
  USING (public.es_dueno_o_admin_negocio(owner_id))
  WITH CHECK (public.es_dueno_o_admin_negocio(owner_id));

CREATE POLICY "bel_consumos_delete_admin"
  ON public.bel_consumos FOR DELETE TO authenticated
  USING (public.es_dueno_o_admin_negocio(owner_id));

-- ------------------------------------------------------------
-- bel_liquidaciones: staff solo SELECT de sus propias liquidaciones; escritura solo dueño/admin
-- ------------------------------------------------------------
CREATE POLICY "bel_liquidaciones_select_propio_o_admin"
  ON public.bel_liquidaciones FOR SELECT TO authenticated
  USING (public.es_mi_registro_staff(owner_id, staff_id, profesional, NULL));

CREATE POLICY "bel_liquidaciones_insert_admin"
  ON public.bel_liquidaciones FOR INSERT TO authenticated
  WITH CHECK (public.es_dueno_o_admin_negocio(owner_id));

CREATE POLICY "bel_liquidaciones_update_admin"
  ON public.bel_liquidaciones FOR UPDATE TO authenticated
  USING (public.es_dueno_o_admin_negocio(owner_id))
  WITH CHECK (public.es_dueno_o_admin_negocio(owner_id));

CREATE POLICY "bel_liquidaciones_delete_admin"
  ON public.bel_liquidaciones FOR DELETE TO authenticated
  USING (public.es_dueno_o_admin_negocio(owner_id));

-- ------------------------------------------------------------
-- gim_planes: catálogo de planes legible por el equipo; escritura solo dueño/admin
-- ------------------------------------------------------------
CREATE POLICY "gim_planes_select_negocio"
  ON public.gim_planes FOR SELECT TO authenticated
  USING (owner_id = public.mi_negocio_id());

CREATE POLICY "gim_planes_insert_admin"
  ON public.gim_planes FOR INSERT TO authenticated
  WITH CHECK (public.es_dueno_o_admin_negocio(owner_id));

CREATE POLICY "gim_planes_update_admin"
  ON public.gim_planes FOR UPDATE TO authenticated
  USING (public.es_dueno_o_admin_negocio(owner_id))
  WITH CHECK (public.es_dueno_o_admin_negocio(owner_id));

CREATE POLICY "gim_planes_delete_admin"
  ON public.gim_planes FOR DELETE TO authenticated
  USING (public.es_dueno_o_admin_negocio(owner_id));
