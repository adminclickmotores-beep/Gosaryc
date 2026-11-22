// Cerebro de WhatsApp Cloud API (Meta). Solo lo llama la Edge Function whatsapp-meta-webhook con la llave de servicio.
import { createFileRoute } from "@tanstack/react-router";

type Archivo = { mime?: string; base64?: string };

export const Route = createFileRoute("/api/public/whatsapp-meta-cerebro")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { llamadaDeServicio, procesarMensajeMeta } = await import("@/lib/meta-cerebro.server");
        if (!llamadaDeServicio(request)) {
          return Response.json({ error: "No autorizado" }, { status: 401 });
        }
        let c: {
          business_id?: string;
          telefono?: string;
          nombre?: string;
          texto?: string;
          wa_message_id?: string;
          permitir_comandos?: boolean;
          imagenes?: Archivo[];
          audios?: Archivo[];
        } = {};
        try {
          c = (await request.json()) as typeof c;
        } catch {
          return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
        }
        const aArchivos = (lista: Archivo[] | undefined, max: number, prefijo: string) =>
          (Array.isArray(lista) ? lista : [])
            .filter((a) => typeof a?.base64 === "string" && a.base64.length > 0 && a.base64.length < 8_000_000)
            .slice(0, max)
            .map((a) => ({ mime: String(a.mime ?? "application/octet-stream").slice(0, 60), base64: String(a.base64) }))
            .filter((a) => a.mime.startsWith(prefijo));
        try {
          const salida = await procesarMensajeMeta({
            businessId: String(c.business_id ?? ""),
            telefono: String(c.telefono ?? ""),
            nombre: String(c.nombre ?? "").slice(0, 80),
            texto: String(c.texto ?? "").slice(0, 4000),
            waMessageId: String(c.wa_message_id ?? "").slice(0, 200),
            imagenes: aArchivos(c.imagenes, 6, "image/"),
            audios: aArchivos(c.audios, 2, "audio/"),
            permitirComandos: c.permitir_comandos === true,
          });
          return Response.json({ ok: true, ...salida });
        } catch (e) {
          return Response.json({ ok: false, error: e instanceof Error ? e.message : "Error" }, { status: 500 });
        }
      },
    },
  },
});
