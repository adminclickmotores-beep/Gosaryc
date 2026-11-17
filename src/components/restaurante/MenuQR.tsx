import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { useNegocio } from "@/hooks/use-negocio";
import { appUrlBase } from "@/lib/app-url";

export function MenuQR() {
  const [origen, setOrigen] = useState(appUrlBase);
  const [qr, setQr] = useState("");

  useEffect(() => {
    setOrigen(appUrlBase());
  }, []);

  const { negocio } = useNegocio();
  // Cada negocio tiene su propio menú: el enlace lleva el identificador del negocio.
  const enlace = negocio?.owner_id ? `${origen}/menu?n=${negocio.owner_id}` : `${origen}/menu`;

  useEffect(() => {
    QRCode.toDataURL(enlace, { width: 720, margin: 2, errorCorrectionLevel: "M" })
      .then(setQr)
      .catch(() => setQr(""));
  }, [enlace]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace);
      toast.success("Enlace copiado.");
    } catch {
      toast.error("No se pudo copiar el enlace.");
    }
  };

  return (
    <GlassPanel className="mx-auto max-w-md space-y-4 p-6 text-center">
      <h2 className="font-display text-xl text-foreground">Enlace público de tu negocio</h2>
      <p className="text-sm text-muted-foreground">
        Restaurantes muestran su menú; tiendas y ferreterías muestran su catálogo para pedir por WhatsApp; salones, clínicas y veterinarias reciben solicitudes de cita online. Imprímelo y ponlo en tus mesas o en el mostrador.
      </p>
      {qr ? (
        <img src={qr} alt="Código QR del menú" className="mx-auto h-auto w-full max-w-[280px] rounded-xl bg-white p-2" />
      ) : (
        <div className="mx-auto h-[280px] w-full max-w-[280px] animate-pulse rounded-xl bg-glass/40" />
      )}
      <p className="break-all text-xs text-muted-foreground">{enlace}</p>
      <div className="flex flex-wrap justify-center gap-2 text-sm">
        <a
          href={qr || undefined}
          download="qr-menu.png"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-primary-foreground"
        >
          <Download className="h-4 w-4" /> Descargar QR
        </a>
        <button onClick={copiar} className="inline-flex items-center gap-1.5 rounded-full border border-glass-border px-4 py-2 text-foreground">
          <Copy className="h-4 w-4" /> Copiar enlace
        </button>
        <a href={enlace} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-glass-border px-4 py-2 text-foreground">
          <ExternalLink className="h-4 w-4" /> Abrir
        </a>
      </div>
    </GlassPanel>
  );
}
