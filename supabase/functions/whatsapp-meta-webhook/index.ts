// Webhook de WhatsApp Cloud API oficial de Meta (24/7, sin computador encendido).
// GET  -> verificación de Meta (hub.challenge).
// POST -> mensajes entrantes (texto, audio, imagen) -> cerebro Gemini + Modo Comandos Autorizados -> respuesta por Graph API.
import { createClient } from "npm:@supabase/supabase-js@2";

const GRAPH = "https://graph.facebook.com/v21.0";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const APP_URL = (Deno.env.get("APP_URL") ?? "https://gosaryc.lovable.app").replace(/\/+$/, "");
const MAX_MEDIA_BYTES = 6 * 1024 * 1024;

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

type Config = {
  business_id: string;
  meta_phone_number_id: string;
  meta_access_token: string;
  meta_app_secret: string;
  activo: boolean;
};

type MensajeMeta = {
  id?: string;
  from?: string;
  type?: string;
  text?: { body?: string };
  image?: { id?: string; caption?: string };
  audio?: { id?: string };
  button?: { text?: string };
  interactive?: { button_reply?: { title?: string }; list_reply?: { title?: string } };
};

type Archivo = { mime: string; base64: string };

function aHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function firmaValida(cuerpo: string, firma: string, secreto: string): Promise<boolean> {
  const esperada = firma.startsWith("sha256=") ? firma.slice(7) : "";
  if (!esperada) return false;
  const llave = await crypto.subtle.importKey("raw", new TextEncoder().encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const calculada = aHex(await crypto.subtle.sign("HMAC", llave, new TextEncoder().encode(cuerpo)));
  if (calculada.length !== esperada.length) return false;
  let diff = 0;
  for (let i = 0; i < calculada.length; i++) diff |= calculada.charCodeAt(i) ^ esperada.charCodeAt(i);
  return diff === 0;
}

function aBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function descargarMedia(mediaId: string, token: string): Promise<Archivo | null> {
  try {
    const meta = await fetch(`${GRAPH}/${encodeURIComponent(mediaId)}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!meta.ok) return null;
    const info = (await meta.json()) as { url?: string; mime_type?: string; file_size?: number };
    if (!info.url || (info.file_size ?? 0) > MAX_MEDIA_BYTES) return null;
    const archivo = await fetch(info.url, { headers: { Authorization: `Bearer ${token}` } });
    if (!archivo.ok) return null;
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_MEDIA_BYTES) return null;
    return { mime: info.mime_type ?? "application/octet-stream", base64: aBase64(bytes) };
  } catch {
    return null;
  }
}

async function enviarTexto(cfg: Config, para: string, texto: string): Promise<void> {
  const r = await fetch(`${GRAPH}/${cfg.meta_phone_number_id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.meta_access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to: para, type: "text", text: { preview_url: false, body: texto.slice(0, 4000) } }),
  });
  if (!r.ok) console.error("[meta] envío falló", r.status, (await r.text()).slice(0, 300));
}

async function marcarLeido(cfg: Config, id: string): Promise<void> {
  try {
    await fetch(`${GRAPH}/${cfg.meta_phone_number_id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.meta_access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", status: "read", message_id: id }),
    });
  } catch {
    /* no es crítico */
  }
}

async function procesarMensaje(cfg: Config, m: MensajeMeta, nombre: string): Promise<void> {
  const from = String(m.from ?? "").replace(/\D/g, "");
  if (!from || !m.id) return;
  let texto = "";
  const imagenes: Archivo[] = [];
  const audios: Archivo[] = [];

  if (m.type === "text") texto = m.text?.body ?? "";
  else if (m.type === "button") texto = m.button?.text ?? "";
  else if (m.type === "interactive") texto = m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "";
  else if (m.type === "image" && m.image?.id) {
    texto = m.image.caption ?? "";
    const a = await descargarMedia(m.image.id, cfg.meta_access_token);
    if (a) imagenes.push(a);
  } else if (m.type === "audio" && m.audio?.id) {
    const a = await descargarMedia(m.audio.id, cfg.meta_access_token);
    if (a) audios.push(a);
  } else return;

  void marcarLeido(cfg, m.id);

  const r = await fetch(`${APP_URL}/api/public/whatsapp-meta-cerebro`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      business_id: cfg.business_id,
      telefono: from,
      nombre,
      texto,
      wa_message_id: m.id,
      permitir_comandos: cfg.meta_app_secret !== "",
      imagenes,
      audios,
    }),
  });
  if (!r.ok) {
    console.error("[meta] cerebro respondió", r.status, (await r.text()).slice(0, 300));
    return;
  }
  const salida = (await r.json()) as { respuesta?: string; duplicado?: boolean };
  if (salida.respuesta && salida.respuesta.trim()) await enviarTexto(cfg, from, salida.respuesta.trim());
}

async function manejarEvento(cuerpo: string, firma: string): Promise<number> {
  let payload: { entry?: Array<{ changes?: Array<{ value?: { metadata?: { phone_number_id?: string }; contacts?: Array<{ wa_id?: string; profile?: { name?: string } }>; messages?: MensajeMeta[] } }> }> };
  try {
    payload = JSON.parse(cuerpo);
  } catch {
    return 400;
  }
  for (const entrada of payload.entry ?? []) {
    for (const cambio of entrada.changes ?? []) {
      const valor = cambio.value;
      const phoneId = String(valor?.metadata?.phone_number_id ?? "");
      if (!valor || !phoneId || !valor.messages?.length) continue;

      const { data } = await db
        .from("whatsapp_meta_config")
        .select("business_id,meta_phone_number_id,meta_access_token,meta_app_secret,activo")
        .eq("meta_phone_number_id", phoneId)
        .maybeSingle();
      const cfg = data as Config | null;
      if (!cfg || !cfg.activo || !cfg.meta_access_token) continue;
      if (cfg.meta_app_secret && !(await firmaValida(cuerpo, firma, cfg.meta_app_secret))) {
        console.error("[meta] firma inválida para", phoneId);
        return 403;
      }
      for (const m of valor.messages) {
        const nombre = valor.contacts?.find((c) => c.wa_id === m.from)?.profile?.name ?? "";
        try {
          await procesarMensaje(cfg, m, nombre.slice(0, 80));
        } catch (e) {
          console.error("[meta] error procesando mensaje", e instanceof Error ? e.message : e);
        }
      }
    }
  }
  return 200;
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "GET") {
    const url = new URL(req.url);
    const modo = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token") ?? "";
    const reto = url.searchParams.get("hub.challenge") ?? "";
    if (modo === "subscribe" && token.length >= 8 && reto) {
      const { data } = await db.from("whatsapp_meta_config").select("id").eq("meta_verify_token", token).limit(1);
      if (data && data.length > 0) return new Response(reto, { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return new Response("Forbidden", { status: 403 });
  }

  if (req.method === "POST") {
    const cuerpo = await req.text();
    if (cuerpo.length > 2_000_000) return new Response("Too large", { status: 413 });
    const firma = req.headers.get("x-hub-signature-256") ?? "";
    // Meta exige 200 rápido: se procesa en segundo plano y los reintentos se descartan por id de mensaje.
    const trabajo = manejarEvento(cuerpo, firma);
    // deno-lint-ignore no-explicit-any
    const rt = (globalThis as any).EdgeRuntime;
    if (rt?.waitUntil) {
      rt.waitUntil(trabajo.catch((e: unknown) => console.error("[meta]", e)));
      return new Response("OK", { status: 200 });
    }
    const estado = await trabajo;
    return new Response(estado === 200 ? "OK" : "Error", { status: estado });
  }

  return new Response("Method not allowed", { status: 405 });
});
