# Guía de Migración de Hosting y Dominio Propio (Gosaryc v2.0)

Gosaryc está preparado para funcionar en **cualquier proveedor de hosting** (Vercel, Netlify, Cloudflare Pages o VPS propio con Nginx) y con **tu dominio personalizado**, sin enlaces ni redirecciones amarradas a `.lovable.app`.

---

## 1. Variables de entorno obligatorias

En el panel del nuevo hosting configura estas 3 variables de entorno antes de compilar (`npm run build`):

| Variable | Valor | Uso |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase / Lovable Cloud | Conexión a base de datos y autenticación |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Clave pública (`anon` / `sb_publishable_...`) | Cliente web y PWA |
| `VITE_APP_URL` | `https://tudominio.com` (sin barra al final) | Enlaces públicos, QR del menú, correos y respaldo SSR |

> Todas las redirecciones de autenticación (`signUp`, `resetPasswordForEmail`, `resend`, OAuth) usan `window.location.origin` dinámicamente, y los enlaces públicos/QR usan `VITE_APP_URL` o `window.location.origin` desde `src/lib/app-url.ts`.

---

## 2. Redirecciones de autenticación en Supabase

En tu proyecto de Supabase / Lovable Cloud ve a **Authentication → URL Configuration**:

1. **Site URL:** `https://tudominio.com`
2. **Redirect URLs (agrega estas rutas):**
   - `https://tudominio.com/**`
   - `https://tudominio.com/welcome`
   - `https://tudominio.com/reset-password`
   - `https://tudominio.com/restaurante`
   - `https://www.tudominio.com/**` (si usas `www`)

---

## 3. Despliegue por proveedor

### Opción A: Vercel (recomendada)
1. Conecta el repositorio de GitHub en [vercel.com](https://vercel.com) → **Add New Project**.
2. Framework preset: **Vite** · Build Command: `npm run build` · Output Directory: `dist`.
3. Agrega las 3 variables de entorno (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_APP_URL`).
4. Para garantizar el fallback de rutas SPA (TanStack Router), crea o conserva un `vercel.json` en la raíz:
```json
{
  "rewrites": [
    { "source": "/((?!api/|lovable/|assets/).*)", "destination": "/index.html" }
  ]
}
```
5. En **Settings → Domains** agrega `tudominio.com` y `www.tudominio.com`.

### Opción B: Netlify
1. Conecta tu repositorio en [app.netlify.com](https://app.netlify.com).
2. Build Command: `npm run build` · Publish Directory: `dist`.
3. Agrega las 3 variables de entorno en **Site configuration → Environment variables**.
4. Crea `public/_redirects` con el fallback SPA:
```txt
/*    /index.html   200
```
5. En **Domain management** conecta tu dominio propio (HTTPS automático con Let's Encrypt).

### Opción C: Cloudflare Pages
1. Ve a **Workers & Pages → Create application → Pages → Connect to Git**.
2. Build Command: `npm run build` · Build output directory: `dist`.
3. Configura las 3 variables de entorno.
4. Cloudflare Pages sirve automáticamente `index.html` como fallback SPA cuando no existe `404.html`, o puedes incluir `public/_redirects`.
5. En **Custom domains** conecta tu dominio (si el DNS ya está en Cloudflare, se activa en menos de 2 minutos).

### Opción D: VPS propio (Ubuntu + Nginx + SSL)
1. Compila en el servidor o sube la carpeta `dist/`:
```bash
npm ci
VITE_APP_URL=https://tudominio.com npm run build
```
2. Configura Nginx (`/etc/nginx/sites-available/gosaryc`):
```nginx
server {
    listen 80;
    server_name tudominio.com www.tudominio.com;
    root /var/www/gosaryc/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```
3. Activa HTTPS gratuito con Certbot:
```bash
sudo certbot --nginx -d tudominio.com -d www.tudominio.com
```

---

## 4. Configuración DNS del dominio propio

En tu registrador (Namecheap, GoDaddy, Hostinger, Cloudflare):
- **Registro A** para `@` → IP del proveedor (ej. `76.76.21.21` en Vercel o IP de tu VPS).
- **Registro CNAME** para `www` → destino del proveedor (ej. `cname.vercel-dns.com`).
- Espera la propagación (normalmente 5 a 30 minutos) y verifica que el candado HTTPS esté activo.

---

## 5. Actualizar Apps de Escritorio y Android al nuevo dominio

Si ya generaste los instaladores de Windows/Linux o el APK de Android:
1. Define la variable `GOSARYC_URL=https://tudominio.com` antes de ejecutar los scripts de empaquetado (`crear-instalador-windows.bat`, `crear-apk-clientes.bat`, `crear-apk-licencias-admin.bat`).
2. Vuelve a generar el instalador o APK para que abran directamente tu dominio propio.
