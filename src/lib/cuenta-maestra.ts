import { supabase } from "@/integrations/supabase/client";

/**
 * Cuenta maestra (superadministrador). Dos formas de reconocerla:
 * 1) Rápida y solo visual: el correo de VITE_SUPERADMIN_EMAIL (ya no va escrito en el código).
 * 2) Segura: la función es_superadmin() de la base de datos, que verifica en el servidor el correo
 *    confirmado de la sesión. Funciona aunque cambie el hosting o falte la variable.
 * El acceso real a los datos lo decide siempre la base de datos.
 */
const CORREO_MAESTRO = String(import.meta.env.VITE_SUPERADMIN_EMAIL ?? "").trim().toLowerCase();

/** Versión rápida (sin red): solo sirve para mostrar u ocultar pantallas. */
export function esCuentaMaestra(email: string | null | undefined): boolean {
  if (!CORREO_MAESTRO) return false;
  return (email ?? "").trim().toLowerCase() === CORREO_MAESTRO;
}

/** Versión segura: pregunta al servidor. Ante cualquier error o dato raro responde false. */
export async function esSuperadminServidor(): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc("es_superadmin");
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
}
