import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { urlLocalPrivada } from "@/lib/archivo-privado";
import { botonSec } from "@/components/comercio/ComercioModulos";

const BUCKET = "creditos_docs";
const MAX_BYTES = 6 * 1024 * 1024;

/** Miniatura de una foto privada del negocio (se descarga con la sesión de quien la mira). */
export function MiniFoto({ ruta }: { ruta: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    let local: string | null = null;
    void urlLocalPrivada(BUCKET, ruta).then((u) => {
      if (!vivo) {
        if (u) URL.revokeObjectURL(u);
        return;
      }
      local = u;
      setUrl(u);
    });
    return () => {
      vivo = false;
      if (local) URL.revokeObjectURL(local);
    };
  }, [ruta]);
  if (!url) return <div className="h-16 w-16 rounded-lg border border-glass-border bg-glass/30" />;
  return <img src={url} alt="Foto del artículo" className="h-16 w-16 rounded-lg border border-glass-border object-cover" />;
}

/** Sube fotos al almacenamiento privado del negocio y devuelve las rutas guardadas. */
export function SubirFotos({ carpeta, rutas, onChange, max = 4 }: { carpeta: string; rutas: string[]; onChange: (r: string[]) => void; max?: number }) {
  const entrada = useRef<HTMLInputElement | null>(null);
  const [subiendo, setSubiendo] = useState(false);

  const subir = async (archivos: FileList | null) => {
    if (!archivos || archivos.length === 0) return;
    setSubiendo(true);
    const nuevas: string[] = [];
    const { data: dueno } = await supabase.rpc("mi_negocio_id");
    if (!dueno) {
      setSubiendo(false);
      return toast.error("No se pudo identificar tu negocio.");
    }
    for (const archivo of Array.from(archivos)) {
      if (rutas.length + nuevas.length >= max) {
        toast.error(`Máximo ${max} fotos.`);
        break;
      }
      if (!archivo.type.startsWith("image/")) {
        toast.error("Solo se aceptan imágenes.");
        continue;
      }
      if (archivo.size > MAX_BYTES) {
        toast.error("Cada foto debe pesar menos de 6 MB.");
        continue;
      }
      const ext = (archivo.name.split(".").pop() ?? "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const destino = `${dueno}/${carpeta}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(destino, archivo, { contentType: archivo.type || undefined });
      if (error) {
        toast.error("No se pudo subir una foto. Inténtalo de nuevo.");
        continue;
      }
      nuevas.push(destino);
    }
    setSubiendo(false);
    if (entrada.current) entrada.current.value = "";
    if (nuevas.length > 0) onChange([...rutas, ...nuevas]);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {rutas.map((r) => (
          <div key={r} className="relative">
            <MiniFoto ruta={r} />
            <button type="button" aria-label="Quitar foto" className="absolute -right-1 -top-1 rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground" onClick={() => onChange(rutas.filter((x) => x !== r))}>×</button>
          </div>
        ))}
        {rutas.length < max && (
          <button type="button" className={botonSec} disabled={subiendo} onClick={() => entrada.current?.click()}>
            {subiendo ? "Subiendo..." : "Agregar foto"}
          </button>
        )}
      </div>
      <input ref={entrada} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => void subir(e.target.files)} />
    </div>
  );
}
