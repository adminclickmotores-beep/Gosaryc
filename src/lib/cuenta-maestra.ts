import { supabase } from "@/integrations/supabase/client";

/**
 * Cuenta maestra (administrador de plataforma).
 * El acceso nunca se concede por coincidencia de correo electrónico:
 * siempre se verifica en el servidor contra la tabla `plataforma_roles` mediante `es_superadmin()`.
 */
export function esCuentaMaestra(_email: string | null | undefined): boolean {
  return false;
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
