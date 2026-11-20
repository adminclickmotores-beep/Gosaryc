// Abre la demo sin contraseñas: el servidor emite un enlace de un solo uso solo para las dos cuentas demo.
import { createFileRoute } from "@tanstack/react-router";

const CORREOS_DEMO: Record<string, string> = {
  vehiculos: "demo.vehiculos@gosaryc.com",
  restaurante: "demo.restaurante@gosaryc.com",
};

export const Route = createFileRoute("/api/public/demo-sesion")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let tipo = "";
        try {
          const cuerpo = (await request.json()) as { tipo?: unknown };
          tipo = typeof cuerpo.tipo === "string" ? cuerpo.tipo : "";
        } catch {
          return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
        }
        const email = CORREOS_DEMO[tipo];
        if (!email) return Response.json({ error: "Demo no válida" }, { status: 400 });
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email });
          const token = data?.properties?.hashed_token;
          if (error || !token) return Response.json({ error: "No se pudo abrir la demo" }, { status: 500 });
          return Response.json({ token_hash: token });
        } catch {
          return Response.json({ error: "No se pudo abrir la demo" }, { status: 500 });
        }
      },
    },
  },
});
