-- Las cuentas demo ya no usan una clave pública: se entra con enlace de un solo uso emitido por el servidor.
-- Se fija una clave aleatoria que nadie conoce (la anterior deja de funcionar).
UPDATE auth.users
SET encrypted_password = extensions.crypt(gen_random_uuid()::text || gen_random_uuid()::text, extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE lower(email) IN ('demo.vehiculos@gosaryc.com', 'demo.restaurante@gosaryc.com');
