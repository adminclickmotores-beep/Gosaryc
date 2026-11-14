-- INFORME DE CONCILIACIÓN DE PROPIETARIOS (solo lectura: SELECT; no modifica nada).
-- Úsalo después de aplicar la migración de aislamiento para ver qué registros tienen dueño con evidencia
-- y cuáles quedan PENDIENTES DE CONCILIACIÓN (owner_id NULL: nadie los ve por RLS hasta que se asignen).
-- Regla: nunca se asigna un propietario sin evidencia (insumos, pedidos o fichas de equipo que lo respalden).

-- 1. Bodegas sin dueño → pendientes de conciliación (no había insumos relacionados).
SELECT 'bodega' AS tipo, b.id, b.nombre, NULL::uuid AS propietario_actual, NULL::uuid AS propietario_propuesto,
       'sin insumos relacionados: sin evidencia' AS criterio, 'PENDIENTE_CONCILIACION' AS estado
  FROM public.restaurante_bodegas b
 WHERE b.owner_id IS NULL;

-- 2. Bodegas con dueño: ¿lo respalda la evidencia? (conflicto si hay insumos de otros dueños en esa bodega).
SELECT 'bodega' AS tipo, b.id, b.nombre, b.owner_id AS propietario_actual,
       (SELECT min(i.owner_id::text)::uuid FROM public.restaurante_insumos i WHERE i.bodega_id = b.id) AS propietario_propuesto,
       'dueño de los insumos que usan la bodega' AS criterio,
       CASE WHEN EXISTS (SELECT 1 FROM public.restaurante_insumos i WHERE i.bodega_id = b.id AND i.owner_id IS DISTINCT FROM b.owner_id)
            THEN 'CONFLICTO' WHEN NOT EXISTS (SELECT 1 FROM public.restaurante_insumos i WHERE i.bodega_id = b.id)
            THEN 'SIN_EVIDENCIA' ELSE 'COHERENTE' END AS estado
  FROM public.restaurante_bodegas b
 WHERE b.owner_id IS NOT NULL
   AND NOT EXISTS (SELECT 1 FROM public.restaurante_insumos i WHERE i.bodega_id = b.id AND i.owner_id = b.owner_id
                   AND NOT EXISTS (SELECT 1 FROM public.restaurante_insumos j WHERE j.bodega_id = b.id AND j.owner_id IS DISTINCT FROM b.owner_id));

-- 3. Existencias por bodega cuyo dueño no coincide con el de su insumo o su bodega.
SELECT 'existencia' AS tipo, s.insumo_id, s.bodega_id, s.owner_id AS propietario_actual, i.owner_id AS dueno_insumo, b.owner_id AS dueno_bodega,
       CASE WHEN s.owner_id IS NULL THEN 'PENDIENTE_CONCILIACION' ELSE 'CONFLICTO' END AS estado
  FROM public.restaurante_stock_bodega s
  LEFT JOIN public.restaurante_insumos i ON i.id = s.insumo_id
  LEFT JOIN public.restaurante_bodegas b ON b.id = s.bodega_id
 WHERE s.owner_id IS NULL OR s.owner_id IS DISTINCT FROM i.owner_id OR s.owner_id IS DISTINCT FROM b.owner_id;

-- 4. Clientes sin dueño: ¿tienen pedidos que prueben a quién pertenecen?
SELECT 'cliente' AS tipo, c.id, c.nombre, c.telefono, NULL::uuid AS propietario_actual,
       (SELECT min(p.owner_id::text)::uuid FROM public.restaurante_pedidos p WHERE p.cliente_id = c.id) AS propietario_propuesto,
       (SELECT count(DISTINCT p.owner_id) FROM public.restaurante_pedidos p WHERE p.cliente_id = c.id) AS negocios_en_sus_pedidos,
       CASE WHEN NOT EXISTS (SELECT 1 FROM public.restaurante_pedidos p WHERE p.cliente_id = c.id) THEN 'PENDIENTE_CONCILIACION (sin pedidos)'
            WHEN (SELECT count(DISTINCT p.owner_id) FROM public.restaurante_pedidos p WHERE p.cliente_id = c.id) > 1 THEN 'PENDIENTE_CONCILIACION (mezcla de negocios)'
            ELSE 'PROPUESTA_CON_EVIDENCIA' END AS estado
  FROM public.restaurante_clientes c
 WHERE c.owner_id IS NULL;

-- 5. Clientes con dueño cuyo historial de pedidos mezcla varios negocios (datos mezclados antes de la corrección).
SELECT 'cliente' AS tipo, c.id, c.nombre, c.telefono, c.owner_id AS propietario_actual,
       count(DISTINCT p.owner_id) AS negocios_en_sus_pedidos, 'REVISAR: totales pudieron mezclarse' AS estado
  FROM public.restaurante_clientes c JOIN public.restaurante_pedidos p ON p.cliente_id = c.id
 WHERE c.owner_id IS NOT NULL
 GROUP BY c.id, c.nombre, c.telefono, c.owner_id
HAVING count(DISTINCT p.owner_id) > 1;

-- 6. Historial del equipo sin dueño → pendiente de conciliación.
SELECT 'auditoria' AS tipo, a.id, a.miembro_email, a.actor_email, a.created_at, 'PENDIENTE_CONCILIACION' AS estado
  FROM public.equipo_auditoria a WHERE a.owner_id IS NULL;

-- 7. Integridad entre empresas ya existente: pedidos enlazados a repartidor o mesa de otro negocio.
SELECT 'pedido' AS tipo, p.id, p.owner_id AS dueno_pedido, r.owner_id AS dueno_repartidor, m.owner_id AS dueno_mesa, 'ENLACE_CRUZADO' AS estado
  FROM public.restaurante_pedidos p
  LEFT JOIN public.restaurante_repartidores r ON r.id = p.repartidor_id
  LEFT JOIN public.restaurante_mesas m ON m.id = p.mesa_id
 WHERE (p.repartidor_id IS NOT NULL AND r.owner_id IS DISTINCT FROM p.owner_id)
    OR (p.mesa_id IS NOT NULL AND m.owner_id IS DISTINCT FROM p.owner_id);

-- 8. Artículos de pedido con un producto de otro negocio.
SELECT 'articulo' AS tipo, it.id, pe.owner_id AS dueno_pedido, pr.owner_id AS dueno_producto, 'ENLACE_CRUZADO' AS estado
  FROM public.restaurante_pedido_items it
  JOIN public.restaurante_pedidos pe ON pe.id = it.pedido_id
  JOIN public.restaurante_productos pr ON pr.id = it.producto_id
 WHERE pr.owner_id IS DISTINCT FROM pe.owner_id;

-- 9. Imágenes antiguas del bucket "negocios" sin carpeta de negocio (visibles por enlace, nadie puede modificarlas).
SELECT 'imagen_antigua' AS tipo, o.name, o.created_at, 'SIN_CARPETA: pendiente de mover a la carpeta de su negocio' AS estado
  FROM storage.objects o
 WHERE o.bucket_id = 'negocios' AND (storage.foldername(o.name))[1] IS NULL;
