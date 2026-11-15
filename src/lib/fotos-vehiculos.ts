import { supabase } from "@/integrations/supabase/client";

/** Las fotos de vehículos viven en un bucket privado; en la base solo se guarda la ruta. */
export const BUCKET_FOTOS = "vehiculos_fotos";

const cache = new Map<string, { url: string; vence: number }>();

/** Las fotos antiguas eran enlaces públicos (http). Las nuevas son rutas privadas. */
export const esRutaPrivada = (valor: string): boolean => !/^https?:\/\//i.test(valor);

export async function urlFirmada(valor: string): Promise<string | null> {
  if (!esRutaPrivada(valor)) return valor;
  const c = cache.get(valor);
  if (c && c.vence > Date.now()) return c.url;
  const { data, error } = await supabase.storage.from(BUCKET_FOTOS).createSignedUrl(valor, 3600);
  if (error || !data) return null;
  cache.set(valor, { url: data.signedUrl, vence: Date.now() + 50 * 60 * 1000 });
  return data.signedUrl;
}

export async function urlsFirmadas(valores: string[]): Promise<(string | null)[]> {
  return Promise.all(valores.map((v) => urlFirmada(v)));
}

export async function subirFotoPrivada(archivo: File, negocioId: string, carpeta: string): Promise<string | null> {
  const ext = (archivo.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const ruta = `${negocioId}/${carpeta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET_FOTOS).upload(ruta, archivo, { contentType: archivo.type });
  return error ? null : ruta;
}

export async function quitarFotoPrivada(valor: string): Promise<void> {
  if (esRutaPrivada(valor)) await supabase.storage.from(BUCKET_FOTOS).remove([valor]);
}

const MARCA_PUBLICA = "/object/public/negocios/";

/**
 * Pasa las fotos públicas antiguas de un vehículo al bucket privado y borra la copia pública.
 * Devuelve la lista nueva, o null si no había nada que migrar.
 */
export async function migrarFotosAntiguas(vehiculoId: string, fotos: string[], negocioId: string): Promise<string[] | null> {
  if (!fotos.some((f) => !esRutaPrivada(f) && f.includes(MARCA_PUBLICA))) return null;
  const nuevas: string[] = [];
  const viejas: string[] = [];
  let cambio = false;
  for (const f of fotos) {
    if (esRutaPrivada(f) || !f.includes(MARCA_PUBLICA)) { nuevas.push(f); continue; }
    try {
      const resp = await fetch(f);
      if (!resp.ok) { nuevas.push(f); continue; }
      const blob = await resp.blob();
      const nombre = decodeURIComponent(f.split("/").pop()?.split("?")[0] ?? "foto.jpg");
      const archivo = new File([blob], nombre, { type: blob.type || "image/jpeg" });
      const ruta = await subirFotoPrivada(archivo, negocioId, vehiculoId);
      if (!ruta) { nuevas.push(f); continue; }
      nuevas.push(ruta);
      viejas.push(decodeURIComponent(f.split(MARCA_PUBLICA)[1].split("?")[0]));
      cambio = true;
    } catch {
      nuevas.push(f);
    }
  }
  if (!cambio) return null;
  const { error } = await supabase.from("vehiculos_inventario").update({ fotos: nuevas }).eq("id", vehiculoId);
  if (error) return null;
  if (viejas.length > 0) await supabase.storage.from("negocios").remove(viejas);
  return nuevas;
}
