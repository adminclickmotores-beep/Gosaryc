-- Pagos de licencia: el comprobante debe ser un archivo propio (carpeta del usuario), el monto lo fija
-- el servidor y solo se permite una solicitud pendiente por tipo. Nadie puede aprobarse a sí mismo.

CREATE OR REPLACE FUNCTION public.validar_pago_licencia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.correo := (SELECT email FROM auth.users WHERE id = NEW.owner_id);

  IF NOT public.es_superadmin() THEN
    NEW.estado := 'pendiente';
    NEW.revisado_en := NULL;
    NEW.monto := CASE WHEN NEW.tipo = 'anual' THEN 100000 ELSE 0 END;

    IF NEW.tipo = 'anual' THEN
      IF NEW.comprobante_url IS NULL
         OR left(NEW.comprobante_url, length(NEW.owner_id::text) + 1) <> NEW.owner_id::text || '/'
         OR position('..' in NEW.comprobante_url) > 0
         OR length(NEW.comprobante_url) > 300 THEN
        RAISE EXCEPTION 'El comprobante debe ser un archivo subido por tu cuenta.';
      END IF;
      IF EXISTS (SELECT 1 FROM public.pagos_licencia
                 WHERE owner_id = NEW.owner_id AND tipo = 'anual' AND estado = 'pendiente') THEN
        RAISE EXCEPTION 'Ya tienes un pago pendiente de revisión.';
      END IF;
    END IF;
  END IF;

  IF NEW.tipo = 'dias_extra' THEN
    IF EXISTS (SELECT 1 FROM public.suscripciones_negocio WHERE owner_id = NEW.owner_id AND dias_extra_usados)
       OR EXISTS (SELECT 1 FROM public.pagos_licencia WHERE owner_id = NEW.owner_id AND tipo = 'dias_extra' AND estado IN ('pendiente', 'aprobado')) THEN
      RAISE EXCEPTION 'Los días adicionales solo se pueden solicitar una vez.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Los clientes no pueden editar ni borrar sus pagos (solo el Superadmin los revisa).
REVOKE UPDATE, DELETE ON public.pagos_licencia FROM authenticated;
GRANT UPDATE, DELETE ON public.pagos_licencia TO authenticated;
DROP POLICY IF EXISTS "pagos_licencia_superadmin" ON public.pagos_licencia;
CREATE POLICY "pagos_licencia_superadmin" ON public.pagos_licencia
  FOR ALL TO authenticated
  USING (public.es_superadmin())
  WITH CHECK (public.es_superadmin());
