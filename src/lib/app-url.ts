import { BRAND } from "@/lib/brand";

/**
 * URL base pública de la app, centralizada para poder migrar de hosting
 * o cambiar de dominio sin tocar código.
 *
 * Orden: variable de entorno VITE_APP_URL (fijada al compilar) y, en el
 * navegador, el origen actual cuando no es vista previa local. En el
 * servidor o sin entorno, el dominio publicado de respaldo.
 */
export function appUrlBase(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    const o = window.location.origin;
    if (!/localhost|lovableproject|id-preview|lovable\.dev/i.test(o)) return o.replace(/\/+$/, "");
    return o.replace(/\/+$/, "");
  }
  return `https://${BRAND.domain}`;
}

/** Construye una URL pública completa a partir de una ruta ("/menu", "/r/abc"...). */
export function appUrl(ruta = "/"): string {
  const base = appUrlBase();
  const r = ruta.startsWith("/") ? ruta : `/${ruta}`;
  return `${base}${r}`;
}
