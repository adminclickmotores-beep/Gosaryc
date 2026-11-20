-- Migración histórica: ya no contiene ninguna clave. Las demos se abren con enlace de un solo uso emitido por el servidor
-- (ver 20271201130000_demo_sin_clave_publica.sql).
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE lower(email) IN ('demo.vehiculos@gosaryc.com', 'demo.restaurante@gosaryc.com');
