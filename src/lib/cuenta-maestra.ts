/** Correo de la cuenta maestra: entra directo a su panel, sin pasar por la configuración inicial del negocio. */
const CORREO_MAESTRO = "jhonathan.cortes.24@gmail.com";

export function esCuentaMaestra(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === CORREO_MAESTRO;
}
