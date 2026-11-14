-- Porcentaje de IVA del negocio. Los precios ya lo incluyen; sirve para mostrar el IVA incluido en cada venta.
ALTER TABLE public.negocio_config ADD COLUMN IF NOT EXISTS iva_porcentaje numeric NOT NULL DEFAULT 0;
