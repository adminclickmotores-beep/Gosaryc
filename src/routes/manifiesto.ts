import { createFileRoute } from "@tanstack/react-router";

// Manifiesto de instalación por negocio y módulo: cada app instalada lleva su nombre y abre su módulo.
export const Route = createFileRoute("/manifiesto")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const u = new URL(request.url);
        const origen = u.origin;
        let destino = u.searchParams.get("destino") ?? "/dashboard";
        if (!destino.startsWith("/") || destino.startsWith("//")) destino = "/dashboard";
        const nombre = (u.searchParams.get("nombre") ?? "").trim().slice(0, 60) || "Gosaryc";
        const corto = (u.searchParams.get("corto") ?? "").trim().slice(0, 12) || nombre.slice(0, 12);
        const colorRaw = u.searchParams.get("color") ?? "";
        const color = /^#[0-9a-f]{6}$/i.test(colorRaw) ? colorRaw : "#2dd4a0";
        const logo = u.searchParams.get("logo") ?? "";
        const logoOk = /^https:\/\//i.test(logo);
        const icons = logoOk
          ? [{ src: logo, sizes: "512x512", type: "image/png", purpose: "any" }]
          : [
              { src: `${origen}/icono-app.svg`, sizes: "any", type: "image/svg+xml", purpose: "any" },
              { src: `${origen}/icono-app.svg`, sizes: "any", type: "image/svg+xml", purpose: "maskable" },
            ];
        const cuerpo = {
          id: destino,
          name: nombre,
          short_name: corto,
          description: `App de ${nombre}`,
          start_url: destino,
          scope: "/",
          display: "standalone",
          background_color: "#0b0b14",
          theme_color: color,
          lang: "es",
          icons,
        };
        return new Response(JSON.stringify(cuerpo), {
          headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
