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
  try {
    const envUrl = (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_APP_URL;
    if (envUrl && /^https?:\/\//i.test(envUrl.trim())) {
      return envUrl.trim().replace(/\/+$/, "");
    }
  } catch {
    /* sin entorno disponible */
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return `https://${BRAND.domain}`;
}

/** Construye una URL pública completa a partir de una ruta ("/menu", "/r/abc"...). */
export function appUrl(ruta = "/"): string {
  const base = appUrlBase();
  const r = ruta.startsWith("/") ? ruta : `/${ruta}`;
  return `${base}${r}`;
}
