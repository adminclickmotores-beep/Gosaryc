# Auditoría de GOSARYC — estado inicial (checkpoint)

Este documento solo afirma lo que se pudo comprobar leyendo el código. Nada se ha ejecutado ni probado con cuentas reales.

## 1. Negocios disponibles (21)
restaurante, concesionario, tienda, servicios/citas, salud, educación, hospedaje, gimnasio, construcción, agro, inmobiliaria, mascotas, tecnología, transporte, otro, belleza, taller, farmacia, eventos, profesional, lavandería.

## 2. Estado por motor (escala del documento de auditoría)
| Motor | Estado | Detalle |
|---|---|---|
| Restaurante | 4. Implementado, sin pruebas | POS, mesas, caja, recetario/inventario, menú QR, contabilidad, reportes, domicilios. |
| Concesionario | 3. Parcial | Inventario con ficha y costos, retomas con permisos por rol, separaciones, créditos, cotizaciones, documentos, vencimientos, dashboard. Módulos de compras, consignaciones, inspecciones y prospectos: 2. solo interfaz genérica. |
| Servicios y citas | 3. Parcial | Agenda y catálogo existen. Tarifas, profesionales, disponibilidad, órdenes de servicio y anticipos: 2. solo interfaz genérica. No hay control real de reservas duplicadas. |
| Salud | 3. Parcial | Módulos clínicos como registros genéricos; auditoría de cambios y permisos clínicos añadidos, sin probar. La auditoría no registra lecturas. |
| Demás sectores | 2–3 | Listas de módulos operativos genéricos. |

## 3. Procesos completos
Ninguno de los flujos de extremo a extremo (compra → inventario → venta → factura → pago → caja → contabilidad; reserva → servicio → factura → comisión) está verificado como conectado. Los módulos genéricos guardan registros aislados.

## 4. Seguridad
- Autenticación con la base de Lovable Cloud; roles y permisos por equipo en Ajustes.
- Retomas: permisos por rol implementados, sin probar (no hay cuentas de cada rol).
- Pendiente de revisar: políticas de acceso de cada tabla, separación entre empresas en todas las tablas, copias de seguridad.

## 5. Pendiente
- Sección 7 del encargo (recomendaciones priorizadas): el archivo recibido se corta en "Prioriza"; falta ese final.
- Pruebas con cuentas reales de administrador, asesor y jefe de patio.
- Auditoría completa de tablas, políticas y pantallas una por una.
