import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Negocio = Tables<"negocio_config">;

/** Datos del negocio (nombre, horarios, contacto). Sirve para cualquier tipo de negocio. */
export function useNegocio() {
  const [negocio, setNegocio] = useState<Negocio | null>(null);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    const { data } = await supabase
      .from("negocio_config")
      .select("*")
      .order("created_at")
      .limit(1)
      .maybeSingle();
    setNegocio(data);
    setCargando(false);
  }, []);

  useEffect(() => {
    recargar();
  }, [recargar]);

  return { negocio, cargando, recargar };
}
