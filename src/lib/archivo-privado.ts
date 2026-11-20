import { supabase } from "@/integrations/supabase/client";

/**
 * Archivos privados: se descargan con la sesión de la persona (las reglas de la base verifican en ese instante
 * que sigue siendo miembro activo). No se crean enlaces firmados reutilizables.
 */
export async function descargarArchivoPrivado(bucket: string, ruta: string): Promise<Blob | null> {
  const { data, error } = await supabase.storage.from(bucket).download(ruta);
  if (error || !data) return null;
  return data;
}

/** Descarga el archivo y devuelve una URL local temporal (blob:) para mostrarlo; null si ya no hay acceso. */
export async function urlLocalPrivada(bucket: string, ruta: string): Promise<string | null> {
  const blob = await descargarArchivoPrivado(bucket, ruta);
  return blob ? URL.createObjectURL(blob) : null;
}

/** Abre un archivo privado en una pestaña nueva. Llamar directamente desde el clic. */
export async function abrirArchivoPrivado(bucket: string, ruta: string): Promise<boolean> {
  const ventana = window.open("about:blank", "_blank");
  const url = await urlLocalPrivada(bucket, ruta);
  if (!url) {
    ventana?.close();
    return false;
  }
  if (ventana) {
    ventana.opener = null;
    ventana.location.href = url;
  } else {
    window.location.href = url;
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
