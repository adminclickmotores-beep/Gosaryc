-- Retirar privilegios generales de acceso a la tabla.
REVOKE ALL PRIVILEGES
ON TABLE public.agente_whatsapp
FROM PUBLIC, anon, authenticated;

-- Retirar expresamente cualquier permiso previo sobre la clave.
REVOKE SELECT (clave)
ON TABLE public.agente_whatsapp
FROM PUBLIC, anon, authenticated;

REVOKE INSERT (clave)
ON TABLE public.agente_whatsapp
FROM PUBLIC, anon, authenticated;

REVOKE UPDATE (clave)
ON TABLE public.agente_whatsapp
FROM PUBLIC, anon, authenticated;


-- Lectura únicamente de información no secreta.
GRANT SELECT (
  id,
  negocio_id,
  owner_id,
  activo,
  nombre_agente,
  instrucciones,
  ia_activa
)
ON TABLE public.agente_whatsapp
TO authenticated;


-- Inserción limitada a los campos necesarios.
GRANT INSERT (
  negocio_id,
  owner_id,
  activo,
  nombre_agente,
  instrucciones,
  ia_activa
)
ON TABLE public.agente_whatsapp
TO authenticated;


-- Actualización limitada a la configuración del agente.
GRANT UPDATE (
  activo,
  nombre_agente,
  instrucciones,
  ia_activa
)
ON TABLE public.agente_whatsapp
TO authenticated;
