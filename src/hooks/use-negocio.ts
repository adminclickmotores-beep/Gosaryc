import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Negocio = Tables<"negocio_config">;

/** Datos del negocio (nombre, horarios, contacto). Sirve para cualquier tipo de negocio. */
export function useNegocio(duenoId?: string | null) {
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    // Con sesión, las reglas de la base solo devuelven el negocio propio.
    // Sin sesión (menú público) se puede indicar de qué negocio se trata.
    let consulta = supabase.from("negocio_config").select("*");
    if (duenoId) consulta = consulta.eq("owner_id", duenoId);
    const { data } = await consulta.order("created_at").limit(1).maybeSingle();
    setNegocio(data);
    setCargando(false);
  }, [duenoId]);

  useEffect(() => {
    recargar();
    // Mantiene sincronizados todos los componentes (menú lateral, panel) cuando cambia el negocio.
    const alCambiar = () => {
      recargar();
    };
    window.addEventListener("negocio:cambio", alCambiar);
    return () => window.removeEventListener("negocio:cambio", alCambiar);
  }, [recargar]);

  // Aplica el color principal elegido por el negocio a toda la app.
  useEffect(() => {
    const color = negocio?.color_principal;
    const raiz = document.documentElement;
    if (color && /^#[0-9a-f]{6}$/i.test(color)) {
      raiz.style.setProperty("--primary", color);
      raiz.style.setProperty("--ring", color);
    } else {
      raiz.style.removeProperty("--primary");
      raiz.style.removeProperty("--ring");
    }
  }, [negocio?.color_principal]);

  return { negocio, cargando, recargar };
}
