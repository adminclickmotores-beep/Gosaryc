// Puente híbrido Cloud + Desktop Bridge para WhatsApp IA Local.
// Lo consume la app local de escritorio (whatsapp-local/server.js) autenticada por pairing_code.
import { createFileRoute } from "@tanstack/react-router";

const ESTADOS_VALIDOS = new Set(["conectado", "desconectado", "sin_internet"]);

function limpiarCodigo(raw: unknown): string {
  return String(raw ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

// Límite de intentos fallidos por IP para impedir adivinar códigos de vinculación.
const INTENTOS = new Map<string, { n: number; hasta: number }>();
const MAX_FALLOS = 8;
const VENTANA_MS = 10 * 60 * 1000;

function ipDe(request: Request): string {
  const h = request.headers.get("x-forwarded-for") ?? request.headers.get("cf-connecting-ip") ?? "";
  return h.split(",")[0].trim().slice(0, 64) || "desconocida";
}

function bloqueada(ip: string): boolean {
  const r = INTENTOS.get(ip);
  if (!r) return false;
  if (Date.now() > r.hasta) {
    INTENTOS.delete(ip);
    return false;
  }
  return r.n >= MAX_FALLOS;
}

function registrarFallo(ip: string): void {
  const ahora = Date.now();
  const r = INTENTOS.get(ip);
  if (!r || ahora > r.hasta) {
    if (INTENTOS.size > 5000) INTENTOS.clear();
    INTENTOS.set(ip, { n: 1, hasta: ahora + VENTANA_MS });
  } else {
    r.n += 1;
  }
}

type ReglaLocal = { palabras: string[]; respuesta: string; asesor: boolean };

function armarRespuestasLocales(
  nombreNegocio: string,
  horarios: string,
  ciudad: string,
  avisoEntrega: string,
  faqs: string[],
): { saludo: string; sinRespuesta: string; reglas: ReglaLocal[] } {
  const reglas: ReglaLocal[] = [];
  if (horarios) {
    reglas.push({
      palabras: ["horario", "hora", "abren", "abierto", "cierran"],
      respuesta: `Nuestro horario de atención en ${nombreNegocio} es: ${horarios}.`,
      asesor: false,
    });
  }
  if (ciudad) {
    reglas.push({
      palabras: ["direccion", "ubicacion", "donde estan", "donde queda", "ciudad"],
      respuesta: `Estamos ubicados en ${ciudad}.`,
      asesor: false,
    });
  }
  if (avisoEntrega) {
    reglas.push({
      palabras: ["domicilio", "envio", "envios", "entrega", "cuanto tarda"],
      respuesta: `Sobre entregas: ${avisoEntrega}.`,
      asesor: false,
    });
  }
  for (const linea of faqs.slice(0, 30)) {
    const partes = linea.split(" → ");
    if (partes.length < 2) continue;
    const pregunta = partes[0].trim();
    const respuesta = partes.slice(1).join(" → ").trim();
    if (!pregunta || !respuesta) continue;
    const palabras = pregunta
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4)
      .slice(0, 6);
    if (palabras.length > 0) {
      reglas.push({ palabras, respuesta: respuesta.slice(0, 900), asesor: false });
    }
  }
  return {
    saludo: `¡Hola! Bienvenido a ${nombreNegocio}. ¿En qué te puedo ayudar hoy?`,
    sinRespuesta: `Gracias por escribir a ${nombreNegocio}. Te respondo enseguida con los detalles exactos.`,
    reglas,
  };
}

export const Route = createFileRoute("/api/public/whatsapp-bridge")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ip = ipDe(request);
        if (bloqueada(ip)) {
          return Response.json({ error: "Demasiados intentos. Espera unos minutos." }, { status: 429 });
        }
        let cuerpo: {
          accion?: string;
          pairing_code?: string;
          status?: string;
          mensajes_hoy?: number;
          ids?: string[];
          telefono?: string;
          resumen?: string;
        } = {};
        try {
          cuerpo = (await request.json()) as typeof cuerpo;
        } catch {
          return Response.json({ error: "Cuerpo inválido" }, { status: 400 });
        }

        const codigo = limpiarCodigo(cuerpo.pairing_code);
        if (codigo.length !== 6) {
          registrarFallo(ip);
          return Response.json({ error: "Código de vinculación inválido (debe tener 6 caracteres)" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: puente, error: errPuente } = await supabaseAdmin
          .from("whatsapp_bridge")
          .select("id,business_id,pairing_code,status,auto_pilot_200,config_version,mensajes_hoy,mensajes_hoy_fecha,last_sync_at")
          .eq("pairing_code", codigo)
          .maybeSingle();

        if (errPuente || !puente) {
          registrarFallo(ip);
          return Response.json({ error: "Código de vinculación no encontrado" }, { status: 404 });
        }

        const ahora = new Date().toISOString();
        const hoy = ahora.slice(0, 10);
        const accion = String(cuerpo.accion ?? "heartbeat");

        if (accion === "vincular" || accion === "descargar_config") {
          const [{ data: neg }, { data: ag }, { data: mems }] = await Promise.all([
            supabaseAdmin
              .from("negocio_config")
              .select("id,owner_id,nombre,tipo_negocio,horarios,ciudad,aviso_entrega")
              .eq("id", puente.business_id)
              .maybeSingle(),
            supabaseAdmin
              .from("agente_whatsapp")
              .select("clave,instrucciones,activo,ia_activa")
              .eq("negocio_id", puente.business_id)
              .maybeSingle(),
            supabaseAdmin
              .from("agente_memoria")
              .select("tipo,contenido")
              .eq("negocio_id", puente.business_id)
              .in("tipo", ["faq", "politica", "identidad_pago"])
              .limit(60),
          ]);

          if (!neg) {
            return Response.json({ error: "Negocio no encontrado" }, { status: 404 });
          }

          await supabaseAdmin
            .from("whatsapp_bridge")
            .update({
              status: accion === "vincular" ? "conectado" : puente.status,
              last_heartbeat: ahora,
              last_sync_at: ahora,
              updated_at: ahora,
            })
            .eq("id", puente.id);

          const faqs = (mems ?? []).filter((m) => m.tipo === "faq").map((m) => m.contenido);
          const respuestas = armarRespuestasLocales(
            neg.nombre || "Tu negocio",
            neg.horarios || "",
            neg.ciudad || "",
            neg.aviso_entrega || "",
            faqs,
          );

          return Response.json({
            ok: true,
            business_id: puente.business_id,
            nombre: neg.nombre || "Mi negocio",
            tipo_negocio: neg.tipo_negocio || "",
            clave_agente: ag?.clave || "",
            instrucciones: ag?.instrucciones || "",
            auto_pilot_200: puente.auto_pilot_200,
            config_version: puente.config_version,
            respuestas,
          });
        }

        if (accion === "heartbeat") {
          const estadoSolicitado = String(cuerpo.status ?? "conectado");
          const statusFinal = ESTADOS_VALIDOS.has(estadoSolicitado) ? estadoSolicitado : "conectado";
          const mensajesHoy =
            typeof cuerpo.mensajes_hoy === "number" && Number.isFinite(cuerpo.mensajes_hoy) && cuerpo.mensajes_hoy >= 0
              ? Math.min(100000, Math.round(cuerpo.mensajes_hoy))
              : puente.mensajes_hoy_fecha === hoy
                ? puente.mensajes_hoy
                : 0;

          await supabaseAdmin
            .from("whatsapp_bridge")
            .update({
              status: statusFinal,
              last_heartbeat: ahora,
              mensajes_hoy: mensajesHoy,
              mensajes_hoy_fecha: hoy,
              updated_at: ahora,
            })
            .eq("id", puente.id);

          const { data: outbox } = await supabaseAdmin
            .from("whatsapp_outbox")
            .select("id,telefono,mensaje,created_at")
            .eq("business_id", puente.business_id)
            .eq("estado", "pendiente")
            .order("created_at", { ascending: true })
            .limit(20);

          return Response.json({
            ok: true,
            auto_pilot_200: puente.auto_pilot_200,
            config_version: puente.config_version,
            outbox: outbox ?? [],
          });
        }

        if (accion === "confirmar_outbox") {
          const ids = Array.isArray(cuerpo.ids)
            ? cuerpo.ids.filter((x): x is string => typeof x === "string" && x.length > 0).slice(0, 50)
            : [];
          if (ids.length > 0) {
            await supabaseAdmin
              .from("whatsapp_outbox")
              .update({ estado: "enviado" })
              .eq("business_id", puente.business_id)
              .in("id", ids);
          }
          return Response.json({ ok: true });
        }

        if (accion === "registrar_urgencia") {
          const telefono = String(cuerpo.telefono ?? "").replace(/[^\d+]/g, "").slice(0, 30);
          const resumen = String(cuerpo.resumen ?? "").trim().slice(0, 500);
          if (!telefono || !resumen) {
            return Response.json({ error: "Falta teléfono o resumen" }, { status: 400 });
          }
          const { data: neg } = await supabaseAdmin
            .from("negocio_config")
            .select("owner_id")
            .eq("id", puente.business_id)
            .maybeSingle();
          if (neg?.owner_id) {
            await supabaseAdmin.from("crm_pqrs").insert({
              negocio_id: puente.business_id,
              owner_id: neg.owner_id,
              telefono,
              tipo: "Urgencia",
              resumen,
              urgencia: "Alta",
            });
          }
          return Response.json({ ok: true });
        }

        return Response.json({ error: "Acción no soportada" }, { status: 400 });
      },
    },
  },
});
