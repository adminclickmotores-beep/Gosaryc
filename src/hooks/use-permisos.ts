import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type Acceso = { admin: boolean; modulos: string[] };

/** Permisos de la cuenta actual: el administrador lo ve todo; el resto, solo los módulos que le asignaron. */
export function usePermisos() {
  const { user } = useAuth();
  const [acceso, setAcceso] = useState<Acceso | null>(null);

  const cargar = useCallback(async () => {
    if (!user) return;
    await supabase.rpc("reclamar_acceso");
    const { data } = await supabase.rpc("mi_acceso");
    const d = (data ?? {}) as { admin?: boolean; modulos?: string[] };
    setAcceso({ admin: !!d.admin, modulos: Array.isArray(d.modulos) ? d.modulos : [] });
  }, [user]);

  useEffect(() => {
    cargar();
    const alCambiar = () => {
      cargar();
    };
    window.addEventListener("equipo:cambio", alCambiar);
    return () => window.removeEventListener("equipo:cambio", alCambiar);
  }, [cargar]);

  const puede = useCallback(
    (modulo: string) => !!acceso && (acceso.admin || acceso.modulos.includes(modulo)),
    [acceso],
  );

  return { acceso, cargando: acceso === null, esAdmin: !!acceso?.admin, puede };
}
