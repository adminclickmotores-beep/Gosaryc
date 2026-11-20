import { useEffect, useState } from "react";
import { ArrowDownToLine, RefreshCw, X } from "lucide-react";

/**
 * Banner de auto-actualización: aparece cuando hay versión nueva.
 * - Web/PWA: cuando el service worker trae archivos nuevos.
 * - Escritorio: cuando electron-updater descarga el instalador nuevo.
 * Un clic instala y recarga sin perder datos (todo vive en la nube).
 */
export function AvisoActualizacion() {
  const [visible, setVisible] = useState(false);
  const [origen, setOrigen] = useState<"web" | "escritorio">("web");
  const [cerrado, setCerrado] = useState(false);
  const [versionNueva, setVersionNueva] = useState("");
  const [apkUrl, setApkUrl] = useState("");

  useEffect(() => {
    let registro: ServiceWorkerRegistration | null = null;
    // 1) Escritorio (Electron): el programa avisa cuando ya descargó la versión nueva.
    try {
      const api = (window as unknown as {
        gosarycEscritorio?: {
          alAvisarVersion?: (fn: (info: unknown) => void) => () => void;
          instalarActualizacion?: () => Promise<void>;
        };
      }).gosarycEscritorio;
      const quitar = api?.alAvisarVersion?.(() => {
        setOrigen("escritorio");
        setCerrado(false);
        setVisible(true);
      });
      void quitar;
    } catch {
      /* navegador normal */
    }
    // 1b) Detector de versión (Web, escritorio y APK): compara /version.json con la última versión vista.
    const mayor = (a: string, b: string): boolean => {
      const pa = a.split(".").map((n) => parseInt(n, 10) || 0);
      const pb = b.split(".").map((n) => parseInt(n, 10) || 0);
      for (let i = 0; i < 3; i++) {
        if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
      }
      return false;
    };
    const buscarVersion = async () => {
      try {
        const r = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!r.ok) return;
        const d = (await r.json()) as { version?: string; apk_url?: string };
        const nueva = typeof d.version === "string" ? d.version.slice(0, 20) : "";
        if (!nueva) return;
        const clave = "gosaryc:version_vista";
        const vista = localStorage.getItem(clave);
        if (!vista) {
          localStorage.setItem(clave, nueva);
          return;
        }
        if (mayor(nueva, vista)) {
          setVersionNueva(nueva);
          setApkUrl(typeof d.apk_url === "string" && /^https:\/\//.test(d.apk_url) ? d.apk_url : "");
          setCerrado(false);
          setVisible(true);
        }
      } catch {
        /* sin conexión */
      }
    };
    void buscarVersion();
    const tVersion = window.setInterval(() => {
      if (navigator.onLine) void buscarVersion();
    }, 30 * 60 * 1000);
    const alVolver = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void buscarVersion();
    };
    document.addEventListener("visibilitychange", alVolver);
    // 2) Web/PWA: el service worker avisa con "version-nueva" al traer archivos nuevos.
    if (!("serviceWorker" in navigator)) {
      return () => {
        window.clearInterval(tVersion);
        document.removeEventListener("visibilitychange", alVolver);
      };
    }
    const alMensaje = (e: Event) => {
      const d = (e as MessageEvent).data;
      if (d === "version-nueva" || (d && typeof d === "object" && (d as { tipo?: string }).tipo === "version-nueva")) {
        setOrigen("web");
        setCerrado(false);
        setVisible(true);
      }
    };
    navigator.serviceWorker.addEventListener("message", alMensaje as EventListener);
    // Revisa versión nueva cada vez que la página vuelve a verse y cada 30 min.
    const revisar = async () => {
      try {
        registro = (await navigator.serviceWorker.getRegistration()) ?? null;
        await registro?.update();
      } catch {
        /* sin conexión */
      }
    };
    const alVer = () => {
      if (document.visibilityState === "visible" && navigator.onLine) void revisar();
    };
    document.addEventListener("visibilitychange", alVer);
    window.addEventListener("online", alVer);
    const t = window.setInterval(() => void revisar(), 30 * 60 * 1000);
    return () => {
      navigator.serviceWorker.removeEventListener("message", alMensaje as EventListener);
      document.removeEventListener("visibilitychange", alVer);
      window.removeEventListener("online", alVer);
      window.clearInterval(t);
      window.clearInterval(tVersion);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, []);

  if (!visible || cerrado) return null;

  const actualizar = async () => {
    try {
      const api = (window as unknown as {
        gosarycEscritorio?: { instalarActualizacion?: () => Promise<void> };
      }).gosarycEscritorio;
      if (origen === "escritorio" && api?.instalarActualizacion) {
        await api.instalarActualizacion();
        return;
      }
    } catch {
      /* sigue con recarga web */
    }
    // Guarda la versión nueva como vista para no repetir el aviso.
    try {
      const r = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
      const d = (await r.json()) as { version?: string };
      if (typeof d.version === "string") localStorage.setItem("gosaryc:version_vista", d.version.slice(0, 20));
    } catch {
      /* sin conexión */
    }
    // Android (APK): si hay enlace de descarga directa del APK nuevo, se abre.
    const nativo = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();
    if (nativo && apkUrl) {
      window.open(apkUrl, "_blank", "noopener");
    }
    try {
      // Recarga limpia: borra la caché de la app y el service worker.
      if ("caches" in window) {
        const nombres = await caches.keys();
        await Promise.all(nombres.filter((n) => !n.startsWith("gosaryc-lecturas")).map((n) => caches.delete(n)));
      }
      const reg = await navigator.serviceWorker.getRegistration();
      await reg?.update();
      // Pide al service worker que active lo nuevo ya y recarga.
      if (reg?.waiting) reg.waiting.postMessage("saltar-espera");
      else if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage("saltar-espera");
      }
    } catch {
      /* recarga igual */
    }
    window.setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div className="fixed inset-x-0 top-0 z-[90] flex justify-center px-3 pt-3">
      <div className="flex w-full max-w-xl items-center gap-3 rounded-2xl border border-glass-border bg-background/95 px-4 py-3 shadow-xl backdrop-blur-xl">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
          {origen === "escritorio" ? <ArrowDownToLine className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
        </span>
        <button type="button" onClick={() => void actualizar()} className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-semibold text-foreground">
            {versionNueva
              ? `Nueva actualización disponible de Gosaryc (v${versionNueva}) con mejoras. Haz clic aquí para instalar`
              : "¡Nueva versión disponible! Haz clic aquí para actualizar ahora"}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {origen === "escritorio"
              ? "Ya se descargó en tu computador. Tus datos se conservan."
              : "Toca para usar lo nuevo ya. Tus datos se conservan."}
          </span>
        </button>
        <button
          type="button"
          aria-label="Cerrar aviso"
          onClick={() => setCerrado(true)}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-glass/60 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
