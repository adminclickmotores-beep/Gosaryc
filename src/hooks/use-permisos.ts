import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { esCuentaMaestra, esSuperadminServidor } from "@/lib/cuenta-maestra";

export type Acceso = { admin: boolean; modulos: string[] };

const REINTENTOS = 2;
const espera = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Permisos de la cuenta actual: el administrador lo ve todo; el resto, solo los módulos que le asignaron. */
export function usePermisos() {
  const { user } = useAuth();
  const [acceso, setAcceso] = useState<Acceso | null>(null);
  const [error, setError] = useState(false);

  const cargar = useCallback(async () => {
    if (!user) return;
    // Nunca se queda cargando para siempre: si la base responde con error se reintenta
    // y, si sigue fallando, se marca el error para que la pantalla ofrezca reintentar
    // (en vez de mostrar "sin acceso" a quien sí lo tiene).
    for (let intento = 0; intento <= REINTENTOS; intento++) {
      try {
        await supabase.rpc("reclamar_acceso");
        const { data, error: errRpc } = await supabase.rpc("mi_acceso");
        if (!errRpc) {
          const d = (data ?? {}) as { admin?: boolean; modulos?: string[] };
          // La cuenta maestra siempre tiene acceso total (el servidor decide el acceso real a los datos).
          const maestra = esCuentaMaestra(user.email) || (!d.admin && (await esSuperadminServidor()));
          setAcceso({ admin: !!d.admin || maestra, modulos: Array.isArray(d.modulos) ? d.modulos : [] });
          setError(false);
          return;
        }
      } catch {
        /* se reintenta */
      }
      if (intento < REINTENTOS) await espera(800 * (intento + 1));
    }
    setAcceso((prev) => prev ?? { admin: false, modulos: [] });
    setError(true);
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

  return { acceso, cargando: acceso === null, esAdmin: !!acceso?.admin, puede, error, recargar: cargar };
}
