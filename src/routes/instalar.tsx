import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import { esCuentaMaestra } from "@/lib/cuenta-maestra";
import { useEffect, useMemo, useState } from "react";
import { Download, Share, MoreVertical, Smartphone, Monitor, CheckCircle2 } from "lucide-react";
import { GlassPanel } from "@/components/ui-custom/GlassPanel";
import { InstallButton } from "@/components/app/InstallButton";
import { useNegocio } from "@/hooks/use-negocio";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";

export const Route = createFileRoute("/instalar")({
  head: () => ({
    meta: [
      { title: "Instalar la app de tu negocio" },
      { name: "description", content: "Instala la app de tu negocio en tu computador o celular, con el módulo que vayas a usar, sin tiendas de aplicaciones." },
    ],
  }),
  component: InstalarPage,
});

type EventoInstalacion = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function InstalarPage() {
  const { negocio } = useNegocio();
  const { user } = useAuth();
  const esAdmin = esCuentaMaestra(user?.email);
  const tipo = resolverTipoNegocio(negocio?.tipo_negocio);
  const nombre = negocio?.nombre?.trim() || tipo.panel;
  const opciones = useMemo(() => {
    const vistas = new Set<string>();
    const lista: { ruta: string; titulo: string }[] = esAdmin ? [{ ruta: `/negocio/${tipo.clave}`, titulo: "Panel completo del negocio" }] : [];
    for (const m of tipo.modulos) {
      if (!m.ruta || vistas.has(m.ruta)) continue;
      vistas.add(m.ruta);
      lista.push({ ruta: m.ruta, titulo: m.titulo });
    }
    return lista;
  }, [tipo, esAdmin]);

  const [destinoElegido, setDestino] = useState<string | null>(null);
  const destino = destinoElegido && opciones.some((o) => o.ruta === destinoElegido) ? destinoElegido : (opciones[0]?.ruta ?? `/negocio/${tipo.clave}`);
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

  // La app instalada lleva el nombre del negocio y abre directo el módulo elegido.
  useEffect(() => {
    const tituloModulo = opciones.find((o) => o.ruta === destino)?.titulo ?? "";
    const corto = destino.startsWith("/negocio/") ? nombre : `${nombre} · ${tituloModulo}`;
    // Manifiesto real (URL propia): el navegador instala con el nombre y módulo del negocio elegido.
    const params = new URLSearchParams({
      destino,
      nombre: corto,
      corto: (destino.startsWith("/negocio/") ? nombre : tituloModulo).slice(0, 12),
      color: negocio?.color_principal ?? "",
      logo: negocio?.logo_url ?? "",
    });
    const url = `/manifiesto?${params.toString()}`;
    let enlace = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!enlace) {
      enlace = document.createElement("link");
      enlace.rel = "manifest";
      document.head.appendChild(enlace);
    }
    const anterior = enlace.href;
    enlace.href = url;
    document.title = `Instalar ${corto}`;
    return () => {
      if (enlace && anterior) enlace.href = anterior;
    };
  }, [destino, nombre, negocio?.color_principal, negocio?.logo_url, opciones]);

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
        <img src={negocio?.logo_url || "/icono-app.svg"} alt={`Icono de ${nombre}`} className="mx-auto h-20 w-20 rounded-2xl object-cover" />
        <h1 className="mt-5 font-display text-3xl text-foreground">Instala {nombre} en un toque</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Funciona como una app en computador (Windows, Mac), Android y iPhone. Sin Play Store ni App Store.
        </p>
      </div>

      <GlassPanel className="space-y-3 p-5">
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">¿Qué módulo vas a usar en esta app?</span>
          <select
            className="w-full rounded-lg border border-glass-border bg-glass/40 px-3 py-2.5 text-base text-foreground outline-none focus:border-primary/50"
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
          >
            {opciones.map((o) => (
              <option key={o.ruta} value={o.ruta}>
                {o.titulo}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">
          La app se instala con el nombre de tu negocio y abre directo en ese módulo. Puedes instalar una app distinta por cada módulo.
        </p>
      </GlassPanel>

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
          <div className="space-y-3">
            <InstallButton />
            <p className="text-sm text-muted-foreground">
              Si no se instala, sigue los pasos de tu dispositivo aquí abajo.
            </p>
          </div>
        )}
      </GlassPanel>

      <div className="grid gap-4 sm:grid-cols-2">
        <GlassPanel className="p-5">
          <Monitor className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-medium text-foreground">Computador (Chrome / Edge)</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pulsa el icono de instalar al final de la barra de direcciones, o el botón de arriba. Queda como un programa de Windows con su propio acceso directo.
          </p>
        </GlassPanel>
        <GlassPanel className="p-5">
          <Smartphone className="h-5 w-5 text-primary" />
          <h2 className="mt-3 font-medium text-foreground">Android (Chrome)</h2>
          <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            Abre el menú <MoreVertical className="h-4 w-4" /> y elige “Instalar aplicación”. Android la instala como una app más.
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

    </div>
  );
}
