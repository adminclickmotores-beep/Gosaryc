-- Tarifas vehiculares de Colombia por año (SOAT, Tecnomecánica, trámites y retefuente).
-- Tabla NUEVA y global: no se altera ninguna tabla, política ni fórmula existente.
CREATE TABLE IF NOT EXISTS public.tarifas_vehiculares_colombia (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anio integer NOT NULL UNIQUE,
  datos jsonb NOT NULL,
  fuente text,
  origen text NOT NULL DEFAULT 'sistema',
  verificado_en timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tarifas_vehiculares_anio_chk CHECK (anio BETWEEN 2020 AND 2100)
);

ALTER TABLE public.tarifas_vehiculares_colombia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tarifas_vehiculares_leer ON public.tarifas_vehiculares_colombia;
CREATE POLICY tarifas_vehiculares_leer ON public.tarifas_vehiculares_colombia
  FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

-- El servidor actualiza con la llave de servicio; el Superadmin también puede editar.
DROP POLICY IF EXISTS tarifas_vehiculares_escribir_superadmin ON public.tarifas_vehiculares_colombia;
CREATE POLICY tarifas_vehiculares_escribir_superadmin ON public.tarifas_vehiculares_colombia
  FOR ALL TO authenticated
  USING (public.es_superadmin())
  WITH CHECK (public.es_superadmin());

INSERT INTO public.tarifas_vehiculares_colombia (anio, datos, fuente, origen)
VALUES (
  2026,
  '{
    "soat": {"moto_menor_100": 256200, "moto_100_200": 343300, "moto_mayor_200": 761400,
             "carro_menor_1500": 520100, "carro_1500_2500": 611050, "carro_mayor_2500": 677400},
    "tecno": {"moto": 233500, "carro": 335000},
    "transito": {"derechos_carro": 260400, "derechos_moto": 145500, "certificado": 58400, "prenda": 206900},
    "retefuente": {"porcentaje": 1, "moto_exenta_cc_max": 185}
  }'::jsonb,
  'Tarifas oficiales 2026 (Superintendencia Financiera, MinTransporte, RUNT, Estatuto Tributario art. 398)',
  'sistema'
)
ON CONFLICT (anio) DO NOTHING;
