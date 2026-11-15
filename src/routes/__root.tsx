import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  Link,
} from "@tanstack/react-router";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/contexts/AuthContext";
import { SmoothScroll } from "@/components/ui-custom/SmoothScroll";
import { BRAND } from "@/lib/brand";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="relative z-10 max-w-md text-center">
        <h1 className="font-display text-8xl text-gradient">404</h1>
        <h2 className="mt-4 text-xl text-foreground">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Esta página no es parte de {BRAND.name}.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="relative flex min-h-screen items-center justify-center px-4">
      <div className="relative z-10 max-w-md text-center">
        <h1 className="font-display text-3xl text-foreground">Algo salió mal</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="rounded-full border border-glass-border bg-glass px-5 py-2.5 text-sm font-medium text-foreground hover:bg-glass-strong"
          >
            Home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: `${BRAND.tagline} — ${BRAND.name}` },
      { name: "description", content: BRAND.description },
      { name: "theme-color", content: "#5b21b6" },
      { name: "robots", content: "index, follow" },
      {
        name: "keywords",
        content:
          "software para negocios, punto de venta, pos, inventario, facturación, pedidos en línea, menú digital, domicilios, recetario, control de costos, Gosaryc",
      },
      { property: "og:url", content: "https://gosaly.lovable.app/" },
      { property: "og:image", content: "https://gosaly.lovable.app/og-image.svg" },
      { property: "og:locale", content: "es_CO" },
      { name: "twitter:image", content: "https://gosaly.lovable.app/og-image.svg" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { property: "og:title", content: `${BRAND.tagline} — ${BRAND.name}` },
      { property: "og:description", content: BRAND.description },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: BRAND.name },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: `${BRAND.tagline} — ${BRAND.name}` },
      { name: "twitter:description", content: BRAND.description },

    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "canonical", href: "https://gosaly.lovable.app/" },
      { rel: "icon", type: "image/svg+xml", href: "/icono-app.svg" },
      { rel: "apple-touch-icon", href: "/icono-app.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Sora:wght@300;400;500;600;700;800&family=Manrope:wght@300;400;500;600;700;800&family=Urbanist:wght@300;400;500;600;700;800&family=Epilogue:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&family=Geist+Mono:wght@400;500&display=swap",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          name: BRAND.name,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web, Windows, Android, iOS",
          description: BRAND.description,
          url: "https://gosaly.lovable.app/",
          inLanguage: "es",
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  useEffect(() => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
    const sw = navigator.serviceWorker;
    const habiaControl = !!sw.controller;
    let recargado = false;
    // Cuando sale una versión nueva, la app instalada se recarga sola para usarla.
    const alCambiar = () => {
      if (!habiaControl || recargado) return;
      recargado = true;
      window.location.reload();
    };
    sw.addEventListener("controllerchange", alCambiar);
    let registro: ServiceWorkerRegistration | null = null;
    sw.register("/sw.js", { updateViaCache: "none" })
      .then((r) => {
        registro = r;
        void r.update();
      })
      .catch(() => undefined);
    const buscar = () => {
      if (document.visibilityState === "visible" && navigator.onLine) registro?.update().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", buscar);
    window.addEventListener("online", buscar);
    const t = window.setInterval(buscar, 15 * 60 * 1000);
    return () => {
      sw.removeEventListener("controllerchange", alCambiar);
      document.removeEventListener("visibilitychange", buscar);
      window.removeEventListener("online", buscar);
      window.clearInterval(t);
    };
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <SmoothScroll />
        <Outlet />
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: "glass-strong text-foreground border-glass-border",
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
