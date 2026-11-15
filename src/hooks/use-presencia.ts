import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CANAL = "presencia-app";

export type UsuarioEnLinea = { clave: string; negocio: string; tipo: string; desde: string };

/** Avisa que esta persona está usando el programa (se quita sola al cerrar la pestaña). */
export function useAnunciarPresencia(userId: string | undefined, negocio: string, tipo: string) {
  useEffect(() => {
    if (!userId) return;
    const canal = supabase.channel(CANAL, { config: { presence: { key: userId } } });
    canal.subscribe(async (estado: string) => {
      if (estado === "SUBSCRIBED") {
        await canal.track({ negocio, tipo, desde: new Date().toISOString() });
      }
    });
    return () => {
      supabase.removeChannel(canal);
    };
  }, [userId, negocio, tipo]);
}

/** Lista de personas conectadas ahora mismo (solo para el panel del dueño). */
export function useUsuariosEnLinea(activo: boolean): UsuarioEnLinea[] {
  const [lista, setLista] = useState<UsuarioEnLinea[]>([]);

  useEffect(() => {
    if (!activo) return;
    const canal = supabase.channel(CANAL);
    const leer = () => {
      const estado = canal.presenceState() as Record<string, Array<{ negocio?: string; tipo?: string; desde?: string }>>;
      const filas: UsuarioEnLinea[] = Object.entries(estado)
        .filter(([, metas]) => metas.length > 0)
        .map(([clave, metas]) => ({
          clave,
          negocio: metas[0].negocio || "Sin nombre",
          tipo: metas[0].tipo || "",
          desde: metas[0].desde || "",
        }));
      setLista(filas);
    };
    canal
      .on("presence", { event: "sync" }, leer)
      .on("presence", { event: "join" }, leer)
      .on("presence", { event: "leave" }, leer)
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
  }, [activo]);

  return lista;
}
