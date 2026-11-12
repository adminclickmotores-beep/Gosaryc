-- Configuración del negocio (una sola fila). Sirve para cualquier tipo de negocio.
CREATE TABLE public.negocio_config (
  id uuid primary key default gen_random_uuid(),
  nombre text not null default 'Mi negocio',
  eslogan text,
  descripcion text,
  tipo_negocio text,
  ciudad text,
  cobertura text,
  telefono_pedidos text,
  instagram text,
  sitio_web text,
  horarios text,
  aviso_entrega text,
  moneda text not null default 'COP',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

ALTER TABLE public.negocio_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "negocio_lectura_publica" ON public.negocio_config
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "negocio_gestion_personal" ON public.negocio_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT SELECT ON public.negocio_config TO anon;

INSERT INTO public.negocio_config
  (nombre, eslogan, descripcion, tipo_negocio, ciudad, cobertura, telefono_pedidos, instagram, sitio_web, horarios, aviso_entrega)
VALUES (
  'Crokante',
  'Cruje por fuera, enamora por dentro',
  'Chuletas, alitas y papas. Exclusivamente domicilios y pedidos para recoger.',
  'Comida rápida',
  'Yumbo, Valle del Cauca',
  'Todos los barrios de Yumbo',
  '305 209 5232',
  '@crokantefood',
  'https://crokante.lovable.app/',
  E'Lunes: abrimos si es festivo\nMartes: cerrado\nMiércoles: cerrado\nJueves: 5:00 p. m. a 11:00 p. m.\nViernes: 5:00 p. m. a 11:00 p. m.\nSábado: 5:00 p. m. a 11:00 p. m.\nDomingo: 5:00 p. m. a 10:00 p. m.',
  'Domicilio: precio según sector. El valor del domicilio se cobra por separado.'
);

-- Carta de Crokante: se reutilizan las categorías de ejemplo y se ocultan los productos de ejemplo.
UPDATE public.restaurante_productos SET activo = false, destacado = false
WHERE nombre IN ('Hamburguesa de la casa','Pollo a la parrilla','Papas fritas','Ensalada fresca','Limonada natural','Gaseosa');

UPDATE public.restaurante_categorias SET nombre = 'Chuletas apanadas', orden = 1 WHERE nombre = 'Platos fuertes';
UPDATE public.restaurante_categorias SET orden = 3 WHERE nombre = 'Acompañamientos';
UPDATE public.restaurante_categorias SET orden = 4 WHERE nombre = 'Bebidas';
INSERT INTO public.restaurante_categorias (nombre, orden) VALUES ('Alas dobles tipo murciélago', 2);

INSERT INTO public.restaurante_productos (categoria_id, nombre, descripcion, precio, destacado)
SELECT c.id, p.nombre, p.descripcion, p.precio, p.destacado
FROM (VALUES
  ('Chuletas apanadas', 'Chuleta personal de pollo', '210 g con 150 g de papa. Papas a la francesa o amarillas a elección.', 20000, true),
  ('Chuletas apanadas', 'Chuleta personal de cerdo', '210 g con 150 g de papa. Papas a la francesa o amarillas a elección.', 22000, false),
  ('Chuletas apanadas', 'Chuleta mediana de pollo', '420 g con 250 g de papa. Papas a la francesa o amarillas a elección.', 31000, false),
  ('Chuletas apanadas', 'Chuleta mediana de cerdo', '420 g con 250 g de papa. Papas a la francesa o amarillas a elección.', 33000, false),
  ('Chuletas apanadas', 'Chuleta familiar de pollo', '630 g con 350 g de papa. Papas a la francesa o amarillas a elección.', 41000, false),
  ('Chuletas apanadas', 'Chuleta familiar de cerdo', '630 g con 350 g de papa. Papas a la francesa o amarillas a elección.', 45000, false),
  ('Alas dobles tipo murciélago', '1 ala sencilla', 'Con 100 g de papa a la francesa.', 9000, false),
  ('Alas dobles tipo murciélago', '1 ala doble', 'Con 180 g de papa.', 13500, true),
  ('Alas dobles tipo murciélago', '2 alas dobles', 'Con 350 g de papa.', 25000, false),
  ('Alas dobles tipo murciélago', '4 tenders de pollo', 'Con 150 g de papa a la francesa.', 7000, false),
  ('Acompañamientos', 'Papas a la francesa', 'Acompañamiento a elección, incluido en tu plato.', 0, false),
  ('Acompañamientos', 'Papas amarillas', 'Acompañamiento a elección, incluido en tu plato.', 0, false),
  ('Bebidas', 'Gaseosa Postobón 1,5 L', 'Botella de 1,5 litros.', 7000, false)
) AS p(categoria, nombre, descripcion, precio, destacado)
JOIN public.restaurante_categorias c ON c.nombre = p.categoria;
