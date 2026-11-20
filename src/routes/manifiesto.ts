import { createFileRoute } from "@tanstack/react-router";
import { appUrlBase } from "@/lib/app-url";

// Primer segmento de ruta permitido (páginas internas de la app instalable).
const SEGMENTOS_PERMITIDOS = new Set([
  "login", "panel", "pos", "crm-embudo", "dashboard", "restaurante", "negocio", "modulos", "finanzas",
  "calendar", "cartera-fiados", "combos", "cotizaciones", "domicilios", "equipo-nomina", "leads", "metas",
  "pagos-digitales", "pedidos-recurrentes", "propinas", "proveedores-compras", "puntos-recompensas",
  "repartidores", "resenas-pqrs", "settings", "soporte", "welcome", "asistente-virtual", "academia", "licencias",
]);

function destinoPermitido(d: string): boolean {
  if (d === "/") return true;
  if (d.length > 120 || d.includes("\\") || d.includes("//") || d.includes("..")) return false;
  if (!/^\/[a-z0-9_\-./]+$/i.test(d)) return false;
  return SEGMENTOS_PERMITIDOS.has(d.split("/")[1] ?? "");
}

// Logo: solo ruta local ("/...") o una dirección https del dominio oficial de la app.
function logoPermitido(l: string, origen: string): boolean {
  if (!l || l.length > 300 || l.includes("\\")) return false;
  if (l.startsWith("/") && !l.startsWith("//")) return /^\/[a-z0-9_\-./]+$/i.test(l);
  try {
    const x = new URL(l);
    if (x.protocol !== "https:") return false;
    const h = x.hostname.toLowerCase();
    return h === new URL(origen).hostname.toLowerCase() || h === new URL(appUrlBase()).hostname.toLowerCase();
  } catch {
    return false;
  }
}

// Manifiesto de instalación por negocio y módulo: cada app instalada lleva su nombre y abre su módulo.
export const Route = createFileRoute("/manifiesto")({
  server: {
    handlers: {
      GET: async ({ request }: { request: Request }) => {
        const u = new URL(request.url);
        const origen = u.origin;
        // Lista blanca estricta: solo rutas internas conocidas, sin barras invertidas ni caracteres raros.
        let destino = u.searchParams.get("destino") ?? "/";
        if (!destinoPermitido(destino)) destino = "/";
        const nombre = (u.searchParams.get("nombre") ?? "").trim().slice(0, 60) || "Gosaryc";
        const corto = (u.searchParams.get("corto") ?? "").trim().slice(0, 12) || nombre.slice(0, 12);
        const colorRaw = u.searchParams.get("color") ?? "";
        const color = /^#[0-9a-f]{6}$/i.test(colorRaw) ? colorRaw : "#10B981";
        const logo = u.searchParams.get("logo") ?? "";
        const logoOk = logoPermitido(logo, origen);
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
          orientation: "any",
          categories: ["business", "productivity"],
          prefer_related_applications: false,
          shortcuts: [
            { name: "Inicio", url: "/dashboard" },
            { name: "Asistente virtual", url: "/asistente-virtual" },
          ],
          icons,
        };
        return new Response(JSON.stringify(cuerpo), {
          headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
