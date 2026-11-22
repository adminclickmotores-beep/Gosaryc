// Cerebro de WhatsApp Cloud API (Meta): lo llama la Edge Function whatsapp-meta-webhook.
// Reutiliza el mismo Gemini y el Modo Comandos Autorizados que usa el puente local.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { procesarComando, transcribirAudio, type ArchivoComando } from "@/lib/comandos-whatsapp.server";
import { responderComoAgente, type MensajeCliente } from "@/lib/agente-cliente.server";

export type EntradaMeta = {
  businessId: string;
  telefono: string;
  nombre: string;
  texto: string;
  waMessageId: string;
  imagenes: ArchivoComando[];
  audios: ArchivoComando[];
  permitirComandos: boolean;
};

/** Verifica que quien llama sea nuestra Edge Function (misma llave de servicio). */
export function llamadaDeServicio(request: Request): boolean {
  const esperado = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
  const header = request.headers.get("authorization") ?? "";
  const recibido = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!esperado || recibido.length !== esperado.length) return false;
  let diff = 0;
  for (let i = 0; i < esperado.length; i++) diff |= esperado.charCodeAt(i) ^ recibido.charCodeAt(i);
  return diff === 0;
}

export async function procesarMensajeMeta(e: EntradaMeta): Promise<{ respuesta: string; duplicado?: boolean }> {
  const tel = e.telefono.replace(/[^\d]/g, "").slice(0, 30);
  if (!e.businessId || tel.length < 7) return { respuesta: "" };

  // Meta reintenta entregas: el mismo mensaje no se procesa dos veces.
  const resumen = e.texto.trim() || (e.audios.length > 0 ? "[nota de voz]" : e.imagenes.length > 0 ? "[imagen]" : "");
  const { error: errDup } = await supabaseAdmin.from("whatsapp_meta_historial").insert({
    business_id: e.businessId,
    telefono: tel,
    rol: "user",
    contenido: resumen.slice(0, 5000),
    wa_message_id: e.waMessageId || null,
  });
  if (errDup?.code === "23505") return { respuesta: "", duplicado: true };

  // 1) Modo Comandos Autorizados (solo si el webhook está firmado con el secreto de la app de Meta).
  if (e.permitirComandos) {
    try {
      const salida = await procesarComando({
        negocioId: e.businessId,
        telefono: tel,
        nombreContacto: e.nombre,
        texto: e.texto,
        imagenes: e.imagenes,
        audios: e.audios,
      });
      if (salida.modo === "comando" && salida.respuesta) return { respuesta: salida.respuesta };
    } catch {
      return { respuesta: "No pude procesar el comando ahora. Intenta de nuevo en un momento." };
    }
  }

  // 2) Cliente normal: cerebro Gemini del agente del negocio.
  const { data: ag } = await supabaseAdmin
    .from("agente_whatsapp")
    .select("clave,activo,ia_activa")
    .eq("negocio_id", e.businessId)
    .maybeSingle();
  if (!ag || !ag.clave || ag.activo === false || ag.ia_activa === false) return { respuesta: "" };

  let texto = e.texto.trim();
  for (const audio of e.audios.slice(0, 1)) {
    const t = await transcribirAudio(audio);
    if (t) texto = `${texto}\n${t}`.trim();
  }
  if (!texto) {
    const aviso = e.audios.length > 0
      ? "Recibí tu nota de voz pero no logré escucharla. ¿Me la escribes, por favor?"
      : "Recibí tu mensaje. ¿Me cuentas en qué te puedo ayudar?";
    return { respuesta: aviso };
  }

  const desde = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: previos } = await supabaseAdmin
    .from("whatsapp_meta_historial")
    .select("rol,contenido,wa_message_id")
    .eq("business_id", e.businessId)
    .eq("telefono", tel)
    .gte("created_at", desde)
    .order("created_at", { ascending: false })
    .limit(12);
  const historial: MensajeCliente[] = (previos ?? [])
    .reverse()
    .filter((m) => !(m.rol === "user" && m.wa_message_id === e.waMessageId))
    .map((m) => ({ role: m.rol === "assistant" ? ("assistant" as const) : ("user" as const), content: m.contenido }));
  historial.push({ role: "user", content: texto.slice(0, 4000) });

  const r = await responderComoAgente(ag.clave, historial, tel, "WhatsApp Directo");
  const respuesta = (r.texto ?? "").trim();
  if (respuesta) {
    await supabaseAdmin.from("whatsapp_meta_historial").insert({
      business_id: e.businessId,
      telefono: tel,
      rol: "assistant",
      contenido: respuesta.slice(0, 5000),
    });
  }
  return { respuesta };
}
