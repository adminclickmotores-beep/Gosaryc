-- Separa Crokante (restaurante) de JG Motors (concesionario).
-- La cuenta que tiene la carta, los pedidos y el menú de Crokante es la del restaurante:
-- si su configuración quedó con el nombre "jg motors", se devuelve a Crokante como restaurante.
-- JG Motors se configura desde su propia cuenta con el tipo "Concesionario".
UPDATE public.negocio_config
SET nombre = 'Crokante',
    tipo_negocio = 'restaurante',
    updated_at = now()
WHERE nombre ILIKE '%jg motors%'
  AND (
    eslogan ILIKE '%Cruje por fuera%'
    OR EXISTS (
      SELECT 1 FROM public.restaurante_productos p
      WHERE p.owner_id = negocio_config.owner_id
    )
  );

-- Cualquier configuración con datos de Crokante queda marcada como restaurante.
UPDATE public.negocio_config
SET tipo_negocio = 'restaurante', updated_at = now()
WHERE nombre ILIKE 'crokante%'
  AND coalesce(tipo_negocio, '') <> 'restaurante';
