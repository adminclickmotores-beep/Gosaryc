// Responde a clientes finales de WhatsApp. Lo llama la API local de WhatsApp con la clave del agente de cada negocio.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/agente-cliente")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const header = request.headers.get("authorization") ?? "";
        const clave = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
        let cuerpo: {
          accion?: string;
          pregunta?: string;
          respuesta?: string;
          mensajes?: Array<{ role: "user" | "assistant"; content: string }>;
        } = {};
        try {
          cuerpo = (await request.json()) as typeof cuerpo;
        } catch {
          return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
        }
        try {
          const { responderComoAgente, aprenderRespuestaDueno } = await import("@/lib/agente-cliente.server");
          if (cuerpo.accion === "aprender") {
            await aprenderRespuestaDueno(clave, cuerpo.pregunta ?? "", cuerpo.respuesta ?? "");
            return Response.json({ ok: true });
          }
          const r = await responderComoAgente(clave, cuerpo.mensajes ?? []);
          return Response.json(r);
        } catch (e) {
          const estado = typeof (e as { estado?: unknown })?.estado === "number" ? (e as { estado: number }).estado : 500;
          const mensaje = e instanceof Error ? e.message : "Error";
          return Response.json({ error: mensaje }, { status: estado });
        }
      },
    },
  },
});
