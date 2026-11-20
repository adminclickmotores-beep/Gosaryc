/**
 * Correo de la cuenta maestra: entra directo a su panel, sin pasar por la configuración inicial del negocio.
 * Se lee de VITE_SUPERADMIN_EMAIL (ya no va escrito en el código). Solo sirve para mostrar u ocultar pantallas:
 * el acceso real a los datos lo decide siempre la base de datos.
 */
const CORREO_MAESTRO = String(import.meta.env.VITE_SUPERADMIN_EMAIL ?? "").trim().toLowerCase();

export function esCuentaMaestra(email: string | null | undefined): boolean {
  if (!CORREO_MAESTRO) return false;
  return (email ?? "").trim().toLowerCase() === CORREO_MAESTRO;
}
