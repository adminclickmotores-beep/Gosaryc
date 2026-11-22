import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, X } from "lucide-react";
import { reproducirBeep } from "@/lib/escaner-barras";

type DetectorLike = {
  detect: (src: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};
type DetectorCtor = new (opts?: { formats?: string[] }) => DetectorLike;

const FORMATOS = ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "code_93", "itf", "codabar", "qr_code"];

async function crearDetector(): Promise<DetectorLike | null> {
  const nativo = (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
  if (nativo) {
    try {
      return new nativo({ formats: FORMATOS });
    } catch {
      /* sigue con el respaldo */
    }
  }
  try {
    const url = "https://esm.sh/barcode-detector@2/ponyfill";
    const mod = (await import(/* @vite-ignore */ url)) as { BarcodeDetector: DetectorCtor };
    return new mod.BarcodeDetector({ formats: FORMATOS });
  } catch {
    return null;
  }
}

type Props = {
  /** Se llama con cada código leído por la cámara. */
  onScan: (codigo: string) => void;
  className?: string;
};

/** Botón que abre la cámara del celular o computador para leer códigos de barras y QR. */
export function CamaraEscaner({ onScan, className }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const [continuo, setContinuo] = useState(true);
  const video = useRef<HTMLVideoElement | null>(null);
  const ultimo = useRef<{ codigo: string; t: number }>({ codigo: "", t: 0 });
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const continuoRef = useRef(continuo);
  continuoRef.current = continuo;

  const cerrar = useCallback(() => setAbierto(false), []);

  useEffect(() => {
    if (!abierto) return;
    let vivo = true;
    let stream: MediaStream | null = null;
    let timer = 0;
    setError("");

    const iniciar = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Este navegador no permite usar la cámara. Usa la pistola lectora o escribe el código.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
      } catch {
        setError("No se pudo abrir la cámara. Permite el acceso a la cámara en el navegador e inténtalo de nuevo.");
        return;
      }
      if (!vivo) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      const el = video.current;
      if (!el) return;
      el.srcObject = stream;
      await el.play().catch(() => undefined);
      const detector = await crearDetector();
      if (!detector) {
        setError("Este dispositivo no puede leer códigos con la cámara. Usa la pistola lectora o escribe el código.");
        return;
      }
      const ciclo = async () => {
        if (!vivo) return;
        try {
          if (el.readyState >= 2) {
            const res = await detector.detect(el);
            const codigo = res[0]?.rawValue?.trim();
            if (codigo) {
              const ahora = Date.now();
              if (codigo !== ultimo.current.codigo || ahora - ultimo.current.t > 2000) {
                ultimo.current = { codigo, t: ahora };
                reproducirBeep("ok");
                onScanRef.current(codigo);
                if (!continuoRef.current) {
                  setAbierto(false);
                  return;
                }
              }
            }
          }
        } catch {
          /* lectura fallida: reintenta */
        }
        timer = window.setTimeout(ciclo, 250);
      };
      void ciclo();
    };
    void iniciar();

    return () => {
      vivo = false;
      window.clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [abierto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title="Escanear con la cámara"
        aria-label="Escanear con la cámara"
        className={
          className ??
          "inline-flex h-12 shrink-0 items-center gap-2 rounded-2xl border border-glass-border bg-glass-strong px-4 text-sm font-medium text-foreground hover:bg-primary/10"
        }
      >
        <Camera className="h-5 w-5" />
        <span className="hidden sm:inline">Cámara</span>
      </button>
      {abierto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3">
          <div className="w-full max-w-md space-y-3 rounded-2xl bg-background p-4 shadow-2xl">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">Escanear con la cámara</p>
              <button type="button" onClick={cerrar} aria-label="Cerrar" className="rounded-full p-1.5 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            {error ? (
              <p className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>
            ) : (
              <div className="relative overflow-hidden rounded-xl bg-black">
                <video ref={video} playsInline muted className="aspect-[4/3] w-full max-w-full object-cover" />
                <div className="pointer-events-none absolute inset-x-8 top-1/2 h-0.5 -translate-y-1/2 bg-red-500/80" />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={continuo} onChange={(e) => setContinuo(e.target.checked)} />
              Seguir escaneando varios productos
            </label>
            <p className="text-xs text-muted-foreground">Apunta al código de barras o QR. Se agrega solo al sonar el pitido.</p>
          </div>
        </div>
      )}
    </>
  );
}
