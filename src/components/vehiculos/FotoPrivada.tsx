import { useEffect, useState } from "react";
import { esRutaPrivada, urlFirmada } from "@/lib/fotos-vehiculos";

/** Muestra una foto de vehículo: resuelve un enlace temporal si está en almacenamiento privado. */
export function FotoPrivada({ valor, className, alt = "" }: { valor: string; className?: string; alt?: string }) {
  const [url, setUrl] = useState<string | null>(esRutaPrivada(valor) ? null : valor);
  useEffect(() => {
    let vivo = true;
    setUrl(esRutaPrivada(valor) ? null : valor);
    urlFirmada(valor).then((u) => {
      if (vivo) setUrl(u);
    });
    return () => {
      vivo = false;
    };
  }, [valor]);
  if (!url) return <div className={`${className ?? ""} bg-glass/40`} />;
  return <img src={url} alt={alt} className={className} />;
}
