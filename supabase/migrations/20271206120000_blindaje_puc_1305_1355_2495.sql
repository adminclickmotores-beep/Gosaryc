-- Blindaje del plan de cuentas: 1305, 1355, 2495 (y 2408 del IVA) siempre existen en cada negocio,
-- para que ningún asiento de factura, venta o devolución se pierda por "Falta la cuenta".
CREATE OR REPLACE FUNCTION public.inicializar_plan_cuentas(p_owner uuid, p_tipo text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_owner IS NULL THEN RETURN; END IF;
  INSERT INTO public.cuentas_contables (owner_id, codigo, nombre, tipo, tipo_negocio)
  SELECT p_owner, v.codigo, v.nombre, v.tipo, p_tipo
    FROM (VALUES
      ('1105', 'Caja', 'activo'),
      ('1110', 'Bancos', 'activo'),
      ('1305', 'Clientes (cuentas por cobrar)', 'activo'),
      ('1355', 'Anticipo de impuestos y contribuciones (Retefuente, ReteIVA, ReteICA)', 'activo'),
      ('1435', 'Inventario de insumos', 'activo'),
      ('2205', 'Proveedores por pagar', 'pasivo'),
      ('2408', 'IVA por pagar', 'pasivo'),
      ('2495', 'Impuesto Nacional al Consumo (INC) por pagar', 'pasivo'),
      ('2505', 'Nómina por pagar', 'pasivo'),
      ('4135', 'Ventas', 'ingreso'),
      ('4210', 'Otros ingresos', 'ingreso'),
      ('5105', 'Nómina', 'gasto'),
      ('5120', 'Arriendo', 'gasto'),
      ('5135', 'Servicios públicos', 'gasto'),
      ('6135', 'Compras de insumos', 'gasto'),
      ('5195', 'Otros gastos', 'gasto')
    ) AS v(codigo, nombre, tipo)
   WHERE NOT EXISTS (
     SELECT 1 FROM public.cuentas_contables c
      WHERE c.owner_id = p_owner AND c.codigo = v.codigo
        AND public.clave_tipo_negocio(c.tipo_negocio) = public.clave_tipo_negocio(p_tipo));
END;
$$;
REVOKE ALL ON FUNCTION public.inicializar_plan_cuentas(uuid, text) FROM public, anon, authenticated;

-- Control de calidad: asientos donde Débito y Crédito no son iguales (solo lectura, respeta RLS del usuario).
CREATE OR REPLACE VIEW public.asientos_descuadrados WITH (security_invoker = true) AS
SELECT owner_id, asiento_id, min(fecha) AS fecha, min(concepto) AS concepto,
       sum(debe) AS total_debe, sum(haber) AS total_haber, sum(debe) - sum(haber) AS diferencia
  FROM public.asientos_contables
 GROUP BY owner_id, asiento_id
HAVING round(sum(debe)) <> round(sum(haber));
REVOKE ALL ON public.asientos_descuadrados FROM public, anon;
GRANT SELECT ON public.asientos_descuadrados TO authenticated;

-- Negocios que ya existen: completar las cuentas que les falten (sin borrar ni cambiar nada).
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT owner_id, tipo_negocio FROM public.cuentas_contables WHERE owner_id IS NOT NULL LOOP
    PERFORM public.inicializar_plan_cuentas(r.owner_id, r.tipo_negocio);
  END LOOP;
END $$;
