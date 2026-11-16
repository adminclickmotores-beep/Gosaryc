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
    // Sin sesión y sin negocio indicado, nunca se muestra el negocio de otra persona
    // (antes se tomaba el primero de la lista, que era Crokante).
    if (!duenoId) {
      const { data: sesion } = await supabase.auth.getSession();
      if (!sesion.session) {
        setNegocio(null);
        setCargando(false);
        return;
      }
    }
    try {
      let consulta = supabase.from("negocio_config").select("*");
      if (duenoId) consulta = consulta.eq("owner_id", duenoId);
      const { data } = await consulta.order("created_at").limit(1).maybeSingle();
      setNegocio(data);
    } catch {
      /* si la consulta falla se deja el negocio como estaba */
    } finally {
      setCargando(false);
    }
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
    // Luminancia aproximada (0-1): si el color elegido es muy oscuro se pierde sobre el fondo oscuro,
    // así que en ese caso se usa el color claro por defecto del tema.
    const luminancia = (hex: string): number => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    };
    if (color && /^#[0-9a-f]{6}$/i.test(color) && luminancia(color) >= 0.45) {
      raiz.style.setProperty("--primary", color);
      raiz.style.setProperty("--ring", color);
      raiz.style.setProperty("--primary-foreground", "#0b0d1f");
    } else {
      raiz.style.removeProperty("--primary");
      raiz.style.removeProperty("--ring");
      raiz.style.removeProperty("--primary-foreground");
    }
  }, [negocio?.color_principal]);

  return { negocio, cargando, recargar };
}
