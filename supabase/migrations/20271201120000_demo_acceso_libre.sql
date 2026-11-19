-- Acceso libre a las demos: clave pública conocida para las dos cuentas demo.
-- Siguen siendo de solo lectura (políticas demo_block_shared_*).
UPDATE auth.users
SET encrypted_password = extensions.crypt('DemoGosaryc2026', extensions.gen_salt('bf')),
    email_confirmed_at = COALESCE(email_confirmed_at, now()),
    updated_at = now()
WHERE lower(email) IN ('demo.vehiculos@gosaryc.com', 'demo.restaurante@gosaryc.com');
