import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, Share, MoreVertical, Smartphone, Monitor, CheckCircle2 } from "lucide-react";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";

export const Route = createFileRoute("/instalar")({
  head: () => ({
    meta: [
      { title: "Instalar la app del restaurante" },
      { name: "description", content: "Instala la app en tu computador o celular directamente desde esta página, sin tiendas de aplicaciones." },
    ],
  }),
  component: InstalarPage,
});

type EventoInstalacion = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function InstalarPage() {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null);
  const [instalada, setInstalada] = useState(false);
  const [esIos, setEsIos] = useState(false);

  useEffect(() => {
    setEsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalada(true);
    const alPrompt = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalacion);
    };
    const alInstalar = () => setInstalada(true);
    window.addEventListener("beforeinstallprompt", alPrompt);
    window.addEventListener("appinstalled", alInstalar);
    return () => {
      window.removeEventListener("beforeinstallprompt", alPrompt);
      window.removeEventListener("appinstalled", alInstalar);
    };
  }, []);

  const instalar = async () => {
    if (!evento) return;
    await evento.prompt();
    const r = await evento.userChoice;
    if (r.outcome === "accepted") setInstalada(true);
    setEvento(null);
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <img src="/icono-app.svg" alt="Icono de la app" className="mx-auto h-20 w-20 rounded-2xl" />
        <h1 className="mt-5 font-display text-3xl text-foreground">Instala tu restaurante en un toque</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Funciona como una app nativa en computador, Android y iPhone. Sin Play Store ni App Store.
        </p>
      </div>

      <GlassPanel className="p-6 text-center">
        {instalada ? (
          <p className="flex items-center justify-center gap-2 text-foreground">
            <CheckCircle2 className="h-5 w-5 text-primary" /> La app ya está instalada en este dispositivo.
          </p>
        ) : evento ? (
          <button
            onClick={instalar}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Download className="h-4 w-4" /> Instalar ahora
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Si no ves el botón de instalar, sigue los pasos de tu dispositivo aquí abajo.
          </p>
        )}
      </GlassPanel>

      <div className="grid gap-4 sm:grid-cols-2">
        <GlassPanel className="p-5">
          <Monitor className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-medium text-foreground">Computador (Chrome / Edge)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pulsa el icono de instalar que aparece al final de la barra de direcciones, o el botón de arriba.
          </p>
        </GlassPanel>
        <GlassPanel className="p-5">
          <Smartphone className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-medium text-foreground">Android (Chrome)</h2>
          <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            Abre el menú <MoreVertical className="h-4 w-4" /> y elige “Instalar aplicación”.
          </p>
        </GlassPanel>
        <GlassPanel className={`p-5 sm:col-span-2 ${esIos ? "ring-1 ring-primary/50" : ""}`}>
          <Share className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-medium text-foreground">iPhone y iPad (Safari)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Toca el botón Compartir y elige “Agregar a pantalla de inicio”. Debe abrirse desde Safari.
          </p>
        </GlassPanel>
      </div>

      <div className="flex justify-center gap-4 text-sm">
        <Link to="/menu" className="text-primary hover:underline">Ver menú digital</Link>
        <Link to="/restaurante" className="text-primary hover:underline">Panel del restaurante</Link>
      </div>
    </div>
  );
}
