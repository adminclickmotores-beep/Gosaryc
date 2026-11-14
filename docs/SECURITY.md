# SECURITY

## Implementado
- Aislamiento por empresa con RLS (`owner_id = mi_negocio_id()`) en las tablas de negocio.
- Permisos por módulo verificados en la base de datos (`tiene_permiso`), no solo en pantalla.
- Suscripciones: la empresa solo lee la suya; solo el superadmin la modifica.
- Sin claves privadas en el navegador; un solo cliente de base de datos.

## Riesgos conocidos
1. `es_superadmin()` compara el correo del JWT con un correo fijo en la migración `20261120120000_roles_y_superadmin.sql`. Conviene moverlo a una tabla de roles.
2. Sin pruebas automatizadas de aislamiento multiempresa ni de permisos.
3. Auditoría limitada a cambios del equipo; faltan anulaciones, cobros y accesos a datos de salud.
4. Cola sin conexión en `localStorage` sin cifrar (contiene cuerpos de peticiones).
5. Sin límite de intentos de acceso propio ni copias de seguridad gestionadas por el proyecto.
6. Los límites de los planes no se aplican aún desde la base de datos.
