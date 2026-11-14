# KNOWN_ISSUES

## Modo sin internet
- No abre la app si se cierra sin conexión (no hay service worker ni caché de la aplicación).
- Escrituras encoladas devuelven una respuesta simulada: datos calculados por el servidor (ids, stock descontado, folios) aparecen al sincronizar.
- Sin resolución de conflictos: se reenvía en orden; los rechazos se descartan con aviso.
- Cola en `localStorage` (límite de tamaño; sin cifrado).

## Integración
- Módulos genéricos de tipo stock no generan kardex central ni compras.
- Una venta genérica no afecta inventario, cartera ni facturación.
- Un abono y su reflejo en caja son dos escrituras separadas; si la segunda falla, solo se avisa.
- Anular un registro con abonos no revierte los movimientos de caja ya creados.

## Producto
- Límites por plan no aplicados en backend.
- Superadmin definido por correo fijo en SQL.
- Sin pruebas automatizadas.
- Sin facturación electrónica ni pasarelas de pago.
- Sin instaladores de escritorio.
