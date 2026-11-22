import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Json } from "@/integrations/supabase/types";
import { generarConfiguracionAutomaticaSector } from "@/lib/agente-autoconfig";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";
import { conversacionesModelo } from "@/lib/agente-conversaciones";
import { tarifasComoTexto } from "@/lib/tarifas-domicilio";

import { chatConRespaldo, normalizarPerfil, type PerfilIA, type UsoIA } from "@/lib/ia-motores";

export type MensajeCliente = { role: "user" | "assistant"; content: string };
export type LeadAgente = {
  temperatura: string;
  puntaje: number;
  interes: string;
  capacidad_pago: string;
  urgencia: string;
  datos_confirmados: string;
  canal_origen?: string;
  valor_estimado?: number;
  datos_extra?: Record<string, unknown>;
};

/** Playbook de calificación profunda según el tipo de negocio: una pregunta filtro por turno, sin repetir datos ya dados. */
export function obtenerPlaybookSector(tipoNegocio: string): string {
  const t = tipoNegocio.toLowerCase();
  let guion: string;
  if (/concesion|vehic|auto|carro|moto|compraventa|usado/.test(t)) {
    guion = "CONCESIONARIO / COMPRAVENTA: valida (1) vehículo o moto de interés, (2) plazo de compra, (3) forma de pago: contado, crédito o retoma, (4) monto de cuota inicial (en pesos, incluyendo retoma si la hay), (5) si es crédito, sus ingresos mensuales aproximados y (6) las deudas o cuotas mensuales que ya paga (explica que es para calcular su preaprobado en segundos), y (7) de forma sutil y respetuosa si está al día en centrales de riesgo o si necesita un crédito flexible, (8) su actividad económica (empleado, independiente, dueño de negocio, pensionado) y su experiencia crediticia (si ha tenido créditos y los pagó al día) y (9) si tiene un vehículo usado para dar como parte de pago (marca, modelo, año). ENTREVISTA, NO COTIZACIÓN: NUNCA des una cuota con inicial o plazo inventados (ni 30 % ni 60 meses por defecto). Primero entrevista al cliente, una pregunta por turno; solo cuando tengas inicial, retoma, actividad, ingresos y experiencia crediticia, ofrece 2 o 3 opciones de plazo con cuotas distintas, di cuál se ajusta a su capacidad y ofrece variantes (más inicial, retoma, codeudor). Si pide la cuota antes de la entrevista, explica que necesitas unos datos para darle opciones reales y pregunta el siguiente dato que falte.";
  } else if (/constru|inmobil|propiedad|vivienda|arriendo/.test(t)) {
    guion = "CONSTRUCTORA / INMOBILIARIA: ENTREVISTA al cliente, sin dar cifras al aire. Valida (1) uso: vivienda propia o inversión, y si es compra o arriendo, (2) zona, proyecto o número de habitaciones, (3) plazo para mudarse o comprar, (4) cuota inicial disponible, cesantías, ahorros o subsidio (VIS / No VIS, caja de compensación), (5) actividad económica e ingresos del hogar, (6) experiencia crediticia y deudas actuales, y (7) si ya tiene preaprobado bancario. Con eso ofrece 2 o 3 opciones de inmueble o de plan de pago y explica cuál le conviene.";
  } else if (/restaur|comida|cafe|bar|pizz|hamburg|asader|panader|pasteler|domicilio/.test(t)) {
    guion = "RESTAURANTE / PANADERÍA / COMIDA: valida (1) si es para recoger o domicilio y a qué barrio, (2) para cuántas personas, (3) gustos o restricciones (alergias, sin picante, vegetariano), (4) si es ocasión especial o evento grande para ofrecer encargos y combos, y (5) forma de pago. Sugiere combos o adicionales según lo que pida y confirma el pedido con total.";
  } else if (/salud|clinic|medic|odont|estetic|belleza|salon|spa|veterin|psicolog|optic|farmac/.test(t)) {
    guion = "SALUD / ESTÉTICA / VETERINARIA: valida (1) motivo de consulta o servicio, (2) si es primera vez o paciente actual (y mascota o paciente: nombre y edad), (3) síntomas o necesidad y urgencia, (4) si tiene seguro, convenio o paga particular, y (5) disponibilidad de día y hora. No des diagnósticos ni dosis: orienta y agenda; si hay urgencia o síntomas graves recomienda atención inmediata y usa [[ASESOR]].";
  } else if (/taller|mecan|lavadero|latoner|pintura|celular|tecnolog|carpinter|imprenta/.test(t)) {
    guion = "TALLER / REPARACIONES: valida (1) qué equipo o vehículo es (marca, modelo, año o placa), (2) qué falla o trabajo necesita y desde cuándo, (3) urgencia y si lo puede traer o necesita recogida, y (4) si ya lo vio otro taller. Da un rango solo si está en el catálogo; si no, agenda diagnóstico con día y hora.";
  } else if (/hotel|hosped|turismo|evento|salon de|fiesta/.test(t)) {
    guion = "HOTEL / EVENTOS: valida (1) fechas de entrada y salida o fecha del evento, (2) número de personas, (3) tipo de habitación o de evento, (4) presupuesto aproximado y (5) servicios extra (alimentación, decoración, transporte). Ofrece 2 opciones y explica la diferencia.";
  } else if (/educ|colegio|academia|curso|instituto|jardin|gimnas|gym|fitness|deporte/.test(t)) {
    guion = "EDUCACIÓN / GIMNASIO: valida (1) para quién es (edad o nivel), (2) objetivo (aprender, bajar de peso, ganar músculo, preparación), (3) experiencia previa, (4) horario disponible y (5) presupuesto. Recomienda el plan o programa que encaje y ofrece una clase o visita de prueba.";
  } else if (/transporte|carga|logistic|agro|finca|ganad|cultivo|campo/.test(t)) {
    guion = "AGRO / TRANSPORTE: valida (1) qué producto, carga o servicio necesita, (2) cantidad o volumen, (3) origen y destino o ubicación de la finca, (4) fecha requerida y (5) forma de pago (contado o a crédito). Confirma datos antes de cotizar.";
  } else if (/servicio|oficio|profesional|abogad|contab|consult|lavander|parqueadero/.test(t)) {
    guion = "SERVICIOS PROFESIONALES / OFICIOS: valida (1) qué necesita resolver, (2) urgencia o fecha límite, (3) si es persona natural o empresa, (4) presupuesto aproximado y (5) ofrece agendar cita o enviar cotización.";
  } else {
    guion = "COMERCIO / B2B / OTROS: valida (1) la necesidad concreta o producto buscado y para qué uso, (2) cantidad o volumen y si es compra única o recurrente, (3) presupuesto, (4) fecha de compra o entrega y si es recogida o envío, y (5) forma de pago. Ofrece 2 opciones del catálogo (una económica y una superior).";
  }
  return `PLAYBOOK DE CALIFICACIÓN (${tipoNegocio || "general"}): ${guion} PRINCIPIO GENERAL: actúas como un entrevistador experto de este tipo de negocio, no como un formulario. Antes de proponer precio, plan, cuota o fecha, entiende la situación del cliente; ofrece SIEMPRE opciones y nunca una sola cifra fija. Adáptate al cliente: si responde corto, pregunta simple; si se extiende, profundiza; si ya dio varios datos en un solo mensaje, no los repitas. Haz MÁXIMO UNA pregunta filtro por turno, en el orden que falte. Revisa los últimos 20 mensajes y NUNCA repitas un dato que el cliente ya respondió. Todo esto funciona solo, sin que el dueño tenga que configurar o entrenar nada.`;
}
export type PqrsAgente = { tipo: string; resumen: string; urgencia: string };
export type RolAgente = { rol: string; acciones: string[] };
export type RespuestaAgente = { texto: string; escalar: boolean; lead?: LeadAgente | null; pqrs?: PqrsAgente | null; rol?: RolAgente | null };

/** Roles que el agente único asume solo según el sector y la intención de cada mensaje. */
const ROLES_AGENTE = [
  "Recepcionista y Servicio al Cliente: atención cordial 24/7, horarios, ubicación, seguimiento de pedidos y dudas generales.",
  "Asesor Comercial + Preaprobado: cotizaciones inmediatas, cálculo de financiación, retoma de usados, preaprobado rápido, manejo de objeciones y cierre de ventas registrado en el CRM.",
  "Asesor de Servicio y Taller: diagnóstico inicial, agendamiento de citas de mantenimiento o revisión y recordatorios preventivos.",
  "Asesor de Constructora e Inmobiliaria: información por torre y piso, cuota inicial, subsidios y agendamiento de visitas a la sala de ventas.",
  "Experto en Materiales y Repuestos: cálculo técnico de cantidades (metros, bultos, galones), compatibilidad de repuestos por marca, modelo y año, y consulta de stock real del inventario.",
  "Experto en Tecnología: asesoría en equipos, software, especificaciones técnicas y soporte comercial.",
  "Recepcionista y Despacho (Administrador): ejecución silenciosa en el sistema: descuenta stock, crea órdenes de despacho o cocina, registra abonos y programa seguimientos automáticos.",
];
const ROLES_BLOQUE = `ROLES ESPECIALIZADOS (eres UN solo agente que cambia de sombrero solo, sin perder el hilo ni avisar al cliente). Elige el rol según el tipo de negocio y la intención del ÚLTIMO mensaje:
${ROLES_AGENTE.map((r) => `- ${r}`).join("\n")}
MODO PILOTO AUTOMÁTICO 200 %: resuelve, cotiza, agenda y registra todo tú solo; usa [[ASESOR]] únicamente en urgencia crítica (reclamos graves, emergencias, amenaza legal o excepciones fuera de política). Al final de CADA turno añade la etiqueta oculta [[ROL:{"rol":"nombre del rol que usaste, p. ej. Experto en Materiales y Repuestos o Asesor Comercial + Preaprobado","acciones":["acción ejecutada en el sistema, p. ej. Stock consultado","Lead creado en el CRM"]}]] con 1 a 4 acciones cortas realmente hechas en esta respuesta (lista vacía si ninguna).`;

/** Extrae una etiqueta oculta [[NOMBRE:{json}]] del texto del modelo. */
function sacarEtiqueta<T>(texto: string, nombre: string): { limpio: string; valor: T | null } {
  const re = new RegExp(`\\[\\[${nombre}:([\\s\\S]*?)\\]\\]`, "i");
  const m = texto.match(re);
  let valor: T | null = null;
  if (m) {
    try {
      valor = JSON.parse(m[1].trim()) as T;
    } catch {
      valor = null;
    }
  }
  return { limpio: texto.replace(new RegExp(`\\[\\[${nombre}:[\\s\\S]*?\\]\\]`, "gi"), "").trim(), valor };
}

/** Guarda (sin duplicar por teléfono) el lead o la PQRS radicada por el agente. */
async function guardarEtiquetaAgente(ag: DuenoMemoria, tipo: "lead" | "pqrs", telefono: string, datos: object): Promise<void> {
  const contenido = JSON.stringify({ telefono: telefono.slice(0, 30), fecha: new Date().toISOString(), ...datos }).slice(0, 1500);
  if (tipo === "lead" && telefono) {
    const { data: previos } = await supabaseAdmin
      .from("agente_memoria")
      .select("id,contenido")
      .eq("negocio_id", ag.negocio_id)
      .eq("owner_id", ag.owner_id)
      .eq("tipo", "lead")
      .like("contenido", `%"telefono":"${telefono.slice(0, 30).replace(/[^0-9a-z@.]/gi, "")}"%`);
    const ids = (previos ?? []).map((p) => p.id);
    if (ids.length > 0) await supabaseAdmin.from("agente_memoria").delete().in("id", ids).eq("negocio_id", ag.negocio_id).eq("owner_id", ag.owner_id);
  }
  await supabaseAdmin.from("agente_memoria").insert({ negocio_id: ag.negocio_id, owner_id: ag.owner_id, tipo, contenido });
}

export class ErrorAgente extends Error {
  estado: number;
  constructor(estado: number, mensaje: string) {
    super(mensaje);
    this.estado = estado;
  }
}

// Límite sencillo por clave: 40 respuestas por minuto.
const ventanas = new Map<string, number[]>();
function dentroDelLimite(clave: string): boolean {
  const ahora = Date.now();
  // Evita que claves inventadas llenen la memoria: se purgan las ventanas vencidas.
  if (ventanas.size > 5000) {
    for (const [k, v] of ventanas) if (v.every((t) => ahora - t >= 60_000)) ventanas.delete(k);
    if (ventanas.size > 5000) ventanas.clear();
  }
  const lista = (ventanas.get(clave) ?? []).filter((t) => ahora - t < 60_000);
  if (lista.length >= 40) {
    ventanas.set(clave, lista);
    return false;
  }
  lista.push(ahora);
  ventanas.set(clave, lista);
  return true;
}

async function buscarAgente(clave: string) {
  if (!clave || clave.length < 20) throw new ErrorAgente(401, "Clave del agente inválida");
  if (!dentroDelLimite(clave)) throw new ErrorAgente(429, "Demasiados mensajes, intenta en un minuto");
  const { data: ag } = await supabaseAdmin
    .from("agente_whatsapp")
    .select("negocio_id,owner_id,activo,instrucciones,nombre_agente,personalidad,objetivo_cierre,cierre_autonomo")
    .eq("clave", clave)
    .maybeSingle();
  if (!ag) throw new ErrorAgente(401, "Clave del agente inválida");
  if (!ag.activo) throw new ErrorAgente(403, "El agente está desactivado para este negocio");

  const { data: negocio, error: errorNegocio } = await supabaseAdmin
    .from("negocio_config")
    .select("id")
    .eq("id", ag.negocio_id)
    .eq("owner_id", ag.owner_id)
    .maybeSingle();

  if (errorNegocio || !negocio) {
    throw new ErrorAgente(403, "El agente no pertenece a un negocio autorizado");
  }

  return ag;
}

export type MotorNegocio = { perfil: PerfilIA; llave: string };

/** Perfil de potencia y llave propia de Gemini que el dueño dejó guardados para su negocio. */
export async function cargarMotorNegocio(negocioId: string, ownerId: string): Promise<MotorNegocio> {
  const { data } = await supabaseAdmin
    .from("agente_memoria")
    .select("tipo,contenido")
    .eq("negocio_id", negocioId)
    .eq("owner_id", ownerId)
    .in("tipo", ["motor_ia", "llave_gemini"])
    .limit(4);
  const perfil = normalizarPerfil((data ?? []).find((x) => x.tipo === "motor_ia")?.contenido?.trim());
  const llave = (data ?? []).find((x) => x.tipo === "llave_gemini")?.contenido?.trim() ?? "";
  return { perfil, llave };
}

/**
 * Llama a la IA y devuelve el texto. Motor principal Gemini 2.5 Flash (Turbo) o Pro (Experto),
 * con respaldo automático entre modelos y luego la IA integrada si se alcanza el límite por minuto.
 */
export async function llamarIA(
  messages: Array<{ role: string; content: string }>,
  opciones: { uso?: UsoIA; perfil?: PerfilIA; llave?: string } = {},
): Promise<string> {
  const geminiKey = opciones.llave || process.env.GEMINI_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!geminiKey && !lovableKey) throw new ErrorAgente(503, "El agente todavía no está configurado");
  try {
    const r = await chatConRespaldo({ geminiKey, lovableKey, perfil: opciones.perfil, uso: opciones.uso ?? "whatsapp", body: { messages } });
    if (!r.res || !r.res.ok) return "";
    const json = (await r.res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return json.choices?.[0]?.message?.content?.trim() ?? "";
  } catch {
    return "";
  }
}

type DuenoMemoria = { negocio_id: string; owner_id: string };

async function guardarMemoria(ag: DuenoMemoria, tipo: "respuesta_dueno" | "patron", contenido: string): Promise<void> {
  const texto = contenido.trim().slice(0, 600);
  if (texto.length < 8) return;
  const { data: previo } = await supabaseAdmin
    .from("agente_memoria")
    .select("id,veces")
    .eq("negocio_id", ag.negocio_id)
    .eq("owner_id", ag.owner_id)
    .eq("tipo", tipo)
    .eq("contenido", texto)
    .maybeSingle();
  if (previo) {
    await supabaseAdmin
      .from("agente_memoria")
    .update({ veces: previo.veces + 1 })
    .eq("id", previo.id)
    .eq("negocio_id", ag.negocio_id)
    .eq("owner_id", ag.owner_id);
    return;
  }
  await supabaseAdmin.from("agente_memoria").insert({ negocio_id: ag.negocio_id, owner_id: ag.owner_id, tipo, contenido: texto });
  // Máximo 60 recuerdos por tipo: se olvidan los más viejos.
  const { data: sobrantes } = await supabaseAdmin
    .from("agente_memoria")
    .select("id")
    .eq("negocio_id", ag.negocio_id)
    .eq("owner_id", ag.owner_id)
    .eq("tipo", tipo)
    .order("veces", { ascending: false })
    .order("created_at", { ascending: false })
    .range(60, 200);
  const ids = (sobrantes ?? []).map((s) => s.id);
  if (ids.length > 0) {
    await supabaseAdmin
      .from("agente_memoria")
      .delete()
      .in("id", ids)
      .eq("negocio_id", ag.negocio_id)
      .eq("owner_id", ag.owner_id);
  }
}

/** El dueño respondió desde su celular: esa respuesta real se guarda como ejemplo de cómo atiende el negocio. */
export async function aprenderRespuestaDueno(clave: string, pregunta: string, respuesta: string): Promise<void> {
  const ag = await buscarAgente(clave);
  const p = String(pregunta || "").trim().slice(0, 250);
  const r = String(respuesta || "").trim().slice(0, 350);
  if (p.length < 3 || r.length < 3) return;
  await guardarMemoria(ag, "respuesta_dueno", `Cliente: ${p} → Dueño: ${r}`);
}

/** Saca de una conversación terminada pistas generales (dudas frecuentes, objeciones, lo que ayudó a cerrar). */
async function aprenderPatrones(ag: DuenoMemoria, historial: MensajeCliente[], motor: MotorNegocio): Promise<void> {
  const conversacion = historial
    .slice(-16)
    .map((m) => `${m.role === "user" ? "Cliente" : "Agente"}: ${m.content.slice(0, 300)}`)
    .join("\n");
  const salida = await llamarIA([
    {
      role: "system",
      content:
        "Analizas conversaciones de ventas por WhatsApp. Devuelve SOLO un arreglo JSON con 0 a 2 textos cortos en español (máx. 160 caracteres cada uno) con lecciones GENERALES y útiles para atender mejor la próxima vez: tipo de duda frecuente, objeción y cómo se resolvió, o qué ayudó a cerrar. Prohibido incluir nombres, teléfonos, direcciones, precios o datos personales. Si no hay nada útil devuelve [].",
    },
    { role: "user", content: conversacion },
  ], { uso: "whatsapp", perfil: motor.perfil, llave: motor.llave });
  const m = salida.match(/\[[\s\S]*\]/);
  if (!m) return;
  let lista: unknown;
  try {
    lista = JSON.parse(m[0]);
  } catch {
    return;
  }
  if (!Array.isArray(lista)) return;
  for (const item of lista.slice(0, 2)) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (t.length < 10 || t.length > 200 || /\d{6,}/.test(t)) continue;
    await guardarMemoria(ag, "patron", t);
  }
}

/** Responde a un cliente final de WhatsApp como agente de ventas, atención y asesoría del negocio. */
const CANALES = ["Instagram", "Facebook", "Página Web", "Google / Otro", "WhatsApp Directo"];

/** Crea el lead la primera vez (turno y fecha de llegada los fija la base) y luego solo actualiza su calificación. */
async function registrarLead(ag: DuenoMemoria, telefono: string, canal: string, lead: LeadAgente | null): Promise<void> {
  if (!telefono) return;
  const { data: previo } = await supabaseAdmin
    .from("agente_leads")
    .select("id")
    .eq("negocio_id", ag.negocio_id)
    .eq("telefono", telefono)
    .maybeSingle();
  const calif = lead
    ? {
        temperatura: String(lead.temperatura ?? "").toUpperCase().slice(0, 12) || null,
        puntaje: Number.isFinite(Number(lead.puntaje)) ? Math.max(0, Math.min(100, Math.round(Number(lead.puntaje)))) : null,
        interes: String(lead.interes ?? "").slice(0, 300) || null,
        datos_confirmados: String(lead.datos_confirmados ?? "").slice(0, 500) || null,
      }
    : {};
  if (previo) {
    if (lead) await supabaseAdmin.from("agente_leads").update(calif).eq("id", previo.id).eq("owner_id", ag.owner_id);
    return;
  }
  await supabaseAdmin.from("agente_leads").insert({ negocio_id: ag.negocio_id, owner_id: ag.owner_id, telefono, canal_origen: canal, ...calif });
}

/** Refleja el lead y la PQRS del agente en el CRM y Embudo IA (sin tocar la etapa que movió una persona). */
async function sincronizarCrm(ag: DuenoMemoria, telefono: string, canalEntrada: string, lead: LeadAgente | null, pqrs: PqrsAgente | null, escalar: boolean): Promise<string> {
  if (!telefono) return "";
  // Si el cliente entró como WhatsApp Directo y luego cuenta cómo nos conoció, se actualiza el canal.
  const canalDicho = lead?.canal_origen && CANALES.includes(lead.canal_origen) ? lead.canal_origen : "";
  const { data: previo } = await supabaseAdmin
    .from("crm_leads")
    .select("id,etapa_embudo,canal_origen,datos_extra,valor_estimado")
    .eq("negocio_id", ag.negocio_id)
    .eq("telefono", telefono)
    .maybeSingle();
  const extraPrevio: Record<string, unknown> =
    previo?.datos_extra && typeof previo.datos_extra === "object" && !Array.isArray(previo.datos_extra) ? (previo.datos_extra as Record<string, unknown>) : {};
  const soloCifras = (v: unknown): number => Number(String(v ?? "").replace(/[^\d]/g, "").slice(0, 12)) || 0;
  const CLAVES_PROTEGIDAS = ["actividades", "pre_estado", "pre_cuota", "pre_pct", "motivo_perdida"];
  const calif = lead
    ? {
        temperatura: String(lead.temperatura ?? "").toUpperCase().slice(0, 12) || null,
        puntaje: Number.isFinite(Number(lead.puntaje)) ? Math.max(0, Math.min(100, Math.round(Number(lead.puntaje)))) : null,
        interes: String(lead.interes ?? "").slice(0, 300) || null,
        capacidad_pago: String(lead.capacidad_pago ?? "").slice(0, 300) || null,
        urgencia: String(lead.urgencia ?? "").slice(0, 300) || null,
        valor_estimado: Number.isFinite(Number(lead.valor_estimado)) ? Math.max(0, Math.min(1e12, Number(lead.valor_estimado))) : 0,
        datos_extra: (() => {
          const nuevos: Record<string, unknown> =
            lead.datos_extra && typeof lead.datos_extra === "object" && !Array.isArray(lead.datos_extra)
              ? Object.fromEntries(
                  Object.entries(lead.datos_extra)
                    .filter(([k]) => !CLAVES_PROTEGIDAS.includes(k))
                    .slice(0, 15)
                    .map(([k, v]) => [k.slice(0, 40), String(v).slice(0, 200)]),
                )
              : {};
          const mezcla: Record<string, unknown> = { ...extraPrevio, ...nuevos, datos_confirmados: String(lead.datos_confirmados ?? "").slice(0, 500) };
          // Preaprobado automático: el cliente dio ingresos (y opcionalmente deudas e inicial) en el chat.
          const ing = soloCifras(mezcla.pre_ingresos);
          const valor = Number.isFinite(Number(lead.valor_estimado)) && Number(lead.valor_estimado) > 0 ? Number(lead.valor_estimado) : Number(previo?.valor_estimado) || 0;
          if (ing > 0 && valor > 0) {
            const deu = soloCifras(mezcla.pre_deudas);
            const ini = Math.min(soloCifras(mezcla.pre_inicial), valor);
            const pct = Math.min(Math.max(Number(mezcla.pre_pct) || 35, 1), 70);
            const capacidad = ing * (pct / 100) - deu;
            const cuota = Math.max(0, valor - ini) * (0.015 / (1 - Math.pow(1.015, -60)));
            mezcla.pre_ingresos = ing;
            mezcla.pre_deudas = deu;
            mezcla.pre_inicial = ini;
            mezcla.pre_pct = pct;
            mezcla.pre_cuota = Math.round(cuota);
            mezcla.pre_estado = capacidad >= cuota ? "viable" : capacidad >= cuota * 0.7 ? "codeudor" : "no";
          }
          return mezcla as unknown as Json;
        })(),
      }
    : {};
  const canal = previo ? (previo.canal_origen === "WhatsApp Directo" && canalDicho && canalDicho !== "WhatsApp Directo" ? canalDicho : previo.canal_origen) : canalDicho || canalEntrada;
  const ahora = new Date().toISOString();
  let leadId = previo?.id ?? "";
  if (previo) {
    await supabaseAdmin
      .from("crm_leads")
      .update({ ...calif, canal_origen: canal, ultima_interaccion: ahora, ...(lead && previo.etapa_embudo === "nuevo" ? { etapa_embudo: "calificacion" } : {}) })
      .eq("id", previo.id)
      .eq("owner_id", ag.owner_id);
  } else {
    const { data: creado } = await supabaseAdmin
      .from("crm_leads")
      .insert({ negocio_id: ag.negocio_id, owner_id: ag.owner_id, telefono, canal_origen: canal, etapa_embudo: lead ? "calificacion" : "nuevo", ...calif })
      .select("id")
      .maybeSingle();
    leadId = creado?.id ?? "";
  }
  if (escalar && leadId) await supabaseAdmin.from("crm_leads").update({ atendido_por_humano: false }).eq("id", leadId).eq("owner_id", ag.owner_id);
  if (pqrs) {
    await supabaseAdmin.from("crm_pqrs").insert({
      negocio_id: ag.negocio_id,
      owner_id: ag.owner_id,
      lead_id: leadId || null,
      telefono: telefono.slice(0, 30),
      tipo: String(pqrs.tipo ?? "Peticion").slice(0, 30),
      resumen: String(pqrs.resumen ?? "").slice(0, 500) || null,
      urgencia: String(pqrs.urgencia ?? "Media").slice(0, 20),
    });
  }
  return leadId;
}

/** Guarda el turno del chat (mensaje del cliente y respuesta del agente) para verlo en la ficha 360° del CRM. */
async function guardarMensajesCrm(ag: DuenoMemoria, leadId: string, telefono: string, cliente: string, agente: string): Promise<void> {
  const filas = [
    { rol: "cliente", contenido: cliente },
    { rol: "agente", contenido: agente },
  ]
    .filter((f) => f.contenido.trim().length > 0)
    .map((f) => ({ negocio_id: ag.negocio_id, owner_id: ag.owner_id, lead_id: leadId || null, telefono: telefono.slice(0, 30), rol: f.rol, contenido: f.contenido.slice(0, 2000) }));
  if (filas.length > 0) await supabaseAdmin.from("crm_mensajes").insert(filas);
}

/** Resumen automático de la conversación para la ficha 360° (se guarda en datos_extra.resumen_ia). */
async function resumirConversacion(ag: DuenoMemoria, leadId: string, historial: MensajeCliente[], motor: MotorNegocio): Promise<void> {
  const texto = historial
    .slice(-30)
    .map((m) => `${m.role === "assistant" ? "Agente" : "Cliente"}: ${m.content}`)
    .join("\n")
    .slice(0, 6000);
  const resumen = await llamarIA([
    {
      role: "system",
      content:
        "Resume en español, máximo 6 líneas, la conversación de ventas por WhatsApp: qué busca el cliente, presupuesto o forma de pago, objeciones, qué respondió el agente y el próximo paso sugerido. No inventes datos que no aparezcan en el chat.",
    },
    { role: "user", content: texto },
  ], { uso: "whatsapp", perfil: motor.perfil, llave: motor.llave });
  if (!resumen) return;
  const { data: previo } = await supabaseAdmin
    .from("crm_leads")
    .select("datos_extra")
    .eq("id", leadId)
    .eq("owner_id", ag.owner_id)
    .maybeSingle();
  const extra: Record<string, unknown> =
    previo?.datos_extra && typeof previo.datos_extra === "object" && !Array.isArray(previo.datos_extra) ? (previo.datos_extra as Record<string, unknown>) : {};
  await supabaseAdmin
    .from("crm_leads")
    .update({ datos_extra: { ...extra, resumen_ia: resumen.slice(0, 1200), resumen_ia_fecha: new Date().toISOString() } as Json })
    .eq("id", leadId)
    .eq("owner_id", ag.owner_id);
}

export async function responderComoAgente(clave: string, mensajes: MensajeCliente[], telefono = "", canalOrigen = "", sectorPrueba = ""): Promise<RespuestaAgente> {
  // Modo prueba: la ventana "Probar en vivo" simula otro sector y no guarda leads, PQRS ni aprendizaje.
  const esPrueba = sectorPrueba.trim().length > 0;
  const canal = CANALES.includes(canalOrigen) ? canalOrigen : "WhatsApp Directo";
  const ag = await buscarAgente(clave);
  const motor = await cargarMotorNegocio(ag.negocio_id, ag.owner_id);

  const { data: cfg } = await supabaseAdmin
    .from("negocio_config")
    .select("nombre,tipo_negocio,eslogan,descripcion,horarios,ciudad,cobertura,aviso_entrega,telefono_pedidos,whatsapp_cocina,instagram,sitio_web,moneda")
    .eq("id", ag.negocio_id)
    .eq("owner_id", ag.owner_id)
    .maybeSingle();

  const giro = resolverTipoNegocio(esPrueba ? sectorPrueba.slice(0, 80) : (cfg?.tipo_negocio ?? null));
  const tipo = (esPrueba ? sectorPrueba : cfg?.tipo_negocio || "general").trim().slice(0, 80);

  const [{ data: prods }, { data: prodsComercio }, { data: vehs }] = await Promise.all([
    supabaseAdmin
      .from("restaurante_productos")
      .select("nombre,precio,categoria_id,descripcion,tipo_negocio")
      .eq("owner_id", ag.owner_id)
      .eq("activo", true)
      .order("nombre")
      .limit(200),
    supabaseAdmin
      .from("com_productos")
      .select("nombre,precio_detal,stock")
      .eq("owner_id", ag.owner_id)
      .order("nombre")
      .limit(200),
    supabaseAdmin
      .from("vehiculos_inventario")
      .select("tipo,marca,modelo,version,anio,precio,estado,kilometraje")
      .eq("owner_id", ag.owner_id)
      .order("created_at", { ascending: false })
      .limit(80),
  ]);
  const productos = (prods ?? []).filter(
    (p) => !p.tipo_negocio || resolverTipoNegocio(p.tipo_negocio).clave === giro.clave,
  );
  const idsCat = Array.from(new Set(productos.map((p) => p.categoria_id).filter((x): x is string => !!x)));
  const nombreCat = new Map<string, string>();
  if (idsCat.length > 0) {
    const { data: cats } = await supabaseAdmin
      .from("restaurante_categorias")
      .select("id,nombre")
      .in("id", idsCat)
      .eq("owner_id", ag.owner_id);
    for (const c of cats ?? []) nombreCat.set(c.id, c.nombre);
  }
  const lineasCatalogo: string[] = [
    ...productos.map((p) => {
      const cat = p.categoria_id ? nombreCat.get(p.categoria_id) : undefined;
      const desc = p.descripcion ? ` — ${p.descripcion.slice(0, 120)}` : "";
      return `- ${p.nombre}${cat ? ` (${cat})` : ""}: ${Number(p.precio)}${desc}`;
    }),
    ...(prodsComercio ?? []).map((c) => {
      const stockTxt = Number.isFinite(Number(c.stock)) ? ` | stock: ${Number(c.stock)}` : "";
      return `- ${c.nombre}: ${Number(c.precio_detal ?? 0)}${stockTxt}`;
    }),
    ...(vehs ?? [])
      .filter((v) => !v.estado || !/vendid/i.test(String(v.estado)))
      .map((v) => {
        const nombreV = `${v.marca} ${v.modelo}${v.version ? ` ${v.version}` : ""}${v.anio ? ` ${v.anio}` : ""}`;
        const km = v.kilometraje ? ` | ${Number(v.kilometraje).toLocaleString("es-CO")} km` : "";
        return `- [${v.tipo}] ${nombreV}: ${v.precio ? Number(v.precio) : "Precio a consultar"}${km}`;
      }),
  ];
  const catalogo =
    lineasCatalogo.length > 0
      ? lineasCatalogo.slice(0, 250).join("\n")
      : "No hay productos o servicios cargados. Si preguntan precios, di que una persona del equipo les confirma.";

  const dato = (etiqueta: string, v: string | null | undefined) =>
    `- ${etiqueta}: ${v && v.trim() ? v.trim().slice(0, 500) : "NO CONFIGURADO"}`;
  const perfil = [
    dato("Nombre del negocio", cfg?.nombre),
    dato("Tipo de negocio", tipo),
    dato("Eslogan", cfg?.eslogan),
    dato("Descripción", cfg?.descripcion),
    dato("Horarios de atención", cfg?.horarios),
    dato("Ciudad", cfg?.ciudad),
    dato("Cobertura / zonas de servicio", cfg?.cobertura),
    dato("Aviso de entrega", cfg?.aviso_entrega),
    dato("Teléfono", cfg?.telefono_pedidos),
    dato("WhatsApp", cfg?.whatsapp_cocina),
    dato("Instagram", cfg?.instagram),
    dato("Sitio web", cfg?.sitio_web),
    `- Moneda: ${cfg?.moneda ?? "COP"}`,
  ].join("\n");

  const usaTarifas = /restaur|comida|pizz|cafe|panader/i.test(tipo) || /yumbo/i.test(cfg?.ciudad ?? "");
  const domicilio = usaTarifas ? `Tarifas de domicilio por barrio o zona:\n${tarifasComoTexto()}` : "";

  const modulos = giro.modulos
    .map((m) => m.titulo)
    .filter((t, i, a) => t && a.indexOf(t) === i)
    .slice(0, 20)
    .join(", ");

  const nombreAgente = (ag.nombre_agente || "Asistente").slice(0, 40);
  const extra = ag.instrucciones?.trim() ? ag.instrucciones.trim().slice(0, 3000) : "";

  // Lo que el agente ha aprendido de este negocio (respuestas reales del dueño y patrones de conversaciones).
  const { data: memoria } = await supabaseAdmin
    .from("agente_memoria")
    .select("tipo,contenido,veces")
    .eq("negocio_id", ag.negocio_id)
    .eq("owner_id", ag.owner_id)
    .in("tipo", ["respuesta_dueno", "patron"])
    .order("veces", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(40);
  const { data: conoc } = await supabaseAdmin
    .from("agente_memoria")
    .select("tipo,contenido")
    .eq("negocio_id", ag.negocio_id)
    .eq("owner_id", ag.owner_id)
    .in("tipo", ["sector", "regla_dueno"])
    .order("created_at", { ascending: true })
    .limit(30);
  const sector = (conoc ?? []).filter((x) => x.tipo === "sector").map((x) => x.contenido.slice(0, 2500)).join("\n\n").slice(0, 9000);
  const reglasDueno = (conoc ?? []).filter((x) => x.tipo === "regla_dueno").map((x) => `- ${x.contenido.slice(0, 400)}`).join("\n");
  const conocimientoSector =
    (sector ? `\nConocimiento del sector (preguntas frecuentes, objeciones, preguntas filtro y protocolo de garantías/PQRS; úsalo como guía, los datos reales del negocio mandan):\n${sector}\n` : "") +
    (reglasDueno ? `\nReglas propias del dueño (obligatorias):\n${reglasDueno}\n` : "");
  const { data: cerebro } = await supabaseAdmin
    .from("agente_memoria")
    .select("tipo,contenido")
    .eq("negocio_id", ag.negocio_id)
    .eq("owner_id", ag.owner_id)
    .in("tipo", ["faq", "objetivo", "politica", "identidad_pago"])
    .order("created_at", { ascending: true })
    .limit(150);
  const faqs = (cerebro ?? []).filter((x) => x.tipo === "faq").map((x) => x.contenido.slice(0, 700));
  const objetivosCaptura = (cerebro ?? []).filter((x) => x.tipo === "objetivo").map((x) => `- ${x.contenido.slice(0, 200)}`);
  const politicaTxt = (cerebro ?? []).find((x) => x.tipo === "politica")?.contenido.slice(0, 1500) ?? "";
  const pagoTxt = (cerebro ?? []).find((x) => x.tipo === "identidad_pago")?.contenido.slice(0, 400) ?? "";
  const cerebroTxt =
    (pagoTxt ? `\nMedios de pago aceptados (dato del dueño): ${pagoTxt}\n` : "") +
    (politicaTxt ? `\nPolíticas del negocio (dato del dueño, obligatorias):\n${politicaTxt}\n` : "") +
    (faqs.length
      ? `\nPREGUNTAS FRECUENTES Y OBJECIONES con la respuesta ideal (cuando el cliente pregunte algo parecido, responde con ese criterio y ese tono, adaptando al caso; la parte de "Cliente → Agente" es un ejemplo, no lo copies literal):\n${faqs.map((f) => `- ${f}`).join("\n")}\n`
      : conversacionesModelo(tipo)) +
    (objetivosCaptura.length
      ? `\nMETAS DE CAPTURA antes de cerrar o escalar (pídelas de a una por turno, solo las que falten):\n${objetivosCaptura.join("\n")}\n`
      : "") +
    "\nREGLA DE CERO INVENCIÓN: si el cliente pregunta por un producto, repuesto o dato que no está en el catálogo, inventario ni en estas bases, NO lo inventes: responde con naturalidad que lo vas a verificar con un asesor y añade [[ASESOR]]. Todo el análisis comercial (puntaje, preaprobado, etapa del CRM) es interno: el cliente solo recibe una conversación fluida. Si escribe «quiero hablar con un asesor», «ya hice la transferencia» o «tengo un reclamo», atiende con empatía y escala con [[ASESOR]].\n";
  const delDueno = (memoria ?? []).filter((x) => x.tipo === "respuesta_dueno").slice(0, 20).map((x) => `- ${x.contenido}`);
  const patrones = (memoria ?? []).filter((x) => x.tipo === "patron").slice(0, 15).map((x) => `- ${x.contenido}`);
  const aprendido =
    (delDueno.length
      ? `\nRespuestas REALES del dueño a clientes (son verdaderas; imita su tono, sus políticas y sus formas de responder cuando se parezca la pregunta):\n${delDueno.join("\n")}\n`
      : "") +
    (patrones.length
      ? `\nPatrones observados en conversaciones anteriores (son solo pistas para atender mejor; NO son datos del negocio ni sustituyen precios, horarios o políticas):\n${patrones.join("\n")}\n`
      : "");

  const autoSector = generarConfiguracionAutomaticaSector(tipo, cfg?.nombre);
  const personalidad = (esPrueba ? autoSector.personalidad : ag.personalidad || autoSector.personalidad).slice(0, 160);
  const objetivo = (esPrueba ? autoSector.objetivo_cierre : ag.objetivo_cierre || autoSector.objetivo_cierre).slice(0, 180);
  const cierraSolo = ag.cierre_autonomo !== false;

  const system = `Eres ${nombreAgente}, la persona que atiende por WhatsApp a los CLIENTES de "${cfg?.nombre || "este negocio"}" (tipo de negocio: ${giro.panel}). Eres a la vez agente de servicio al cliente, asesor comercial y vendedor.
Personalidad: ${personalidad}. Escribes en español, con ese tono, mensajes cortos propios de WhatsApp (máximo 3 líneas por mensaje, sin tablas ni títulos, 1 sola pregunta por turno). Habla con el vocabulario profesional del tipo de negocio "${giro.panel}". Áreas del negocio: ${modulos || "atención general"}.
Objetivo de cierre del negocio: ${objetivo}. ${cierraSolo ? "Tienes AUTONOMÍA para cerrar: lleva la conversación hasta ese cierre (confirma pedido con total calculado, agenda cita con fecha y hora exactas o entrega los datos de pago configurados) sin esperar a una persona." : "NO cierres tú la operación: reúne los datos y avisa que una persona del equipo la confirma (usa [[ASESOR]])."}

Canal por el que llegó este cliente: ${canal}. En tu PRIMER mensaje adapta la bienvenida: si viene de Instagram o Facebook agradece que los siga o haya visto su publicación; si viene de la página web, agradece su visita; si es WhatsApp directo, saluda normal. No lo repitas después.

${obtenerPlaybookSector(tipo)}

${ROLES_BLOQUE}
${canal === "WhatsApp Directo" ? "Este cliente entró como WhatsApp Directo sin origen detectado: después de resolver su primera duda, pregúntale de forma casual si nos vio por Instagram, Facebook o la página web, y cuando responda incluye \"canal_origen\" (Instagram, Facebook, Página Web, Google / Otro) en la etiqueta LEAD." : ""}

MEMORIA DEL HILO (regla estricta): antes de responder, revisa TODO el historial de esta conversación. NUNCA vuelvas a preguntar un dato que el cliente ya entregó (nombre, presupuesto, cuota inicial, modelo, dirección, fecha, cantidad, etc.). Reutilízalo y pregunta solo lo que falta, una cosa a la vez.

Tres modos automáticos (elige según lo que escriba el cliente):
A) COMERCIAL Y CIERRE: califica según el playbook del sector (concesionario: modelo, plazo, cuota inicial, reportes en centrales de riesgo; constructora/inmobiliaria: vivienda o inversión, cuota inicial, subsidio; restaurante: pedido completo y domicilio; otros: la necesidad, presupuesto y fecha) y cierra la operación.
B) SERVICIO AL CLIENTE Y PQRS: si hay duda postventa, garantía, reclamo o solicitud, mantén la calma, pide los datos del caso (número de pedido/factura/placa y descripción), da solución inmediata según las políticas del negocio y añade al final la etiqueta oculta [[PQRS:{"tipo":"Peticion|Queja|Reclamo|Sugerencia","resumen":"...","urgencia":"Alta|Media|Baja"}]]. Solo escala con [[ASESOR]] si exigen hablar con un gerente, hay amenaza legal o estafa, o se requiere aprobación financiera especial.
C) CLASIFICACIÓN DE LEAD: al final de CADA turno añade la etiqueta oculta [[LEAD:{"temperatura":"FRIO|TIBIO|CALIENTE","puntaje":0,"canal_origen":"...","interes":"...","capacidad_pago":"...","urgencia":"...","valor_estimado":0,"datos_extra":{},"datos_confirmados":"..."}]] (puntaje de 0 a 100). PREAPROBADO: cuando el cliente te diga sus ingresos mensuales, sus deudas mensuales o su cuota inicial/retoma, guárdalos como números enteros en pesos dentro de datos_extra (pre_ingresos, pre_deudas, pre_inicial) y pon en valor_estimado el precio del vehículo o bien de interés; el sistema calcula solo el preaprobado. Nunca le prometas aprobación: dile que es un estimado sujeto a estudio de la entidad financiera. El cliente nunca ve las etiquetas.

Cómo atender:
1. Saluda por el nombre del negocio la primera vez y pregunta en qué puedes ayudar.
2. Escucha la necesidad y haz UNA pregunta a la vez para entender qué busca, para quién, presupuesto o fecha si aplica.
3. Asesora: recomienda del catálogo lo que mejor encaje, explica en una frase por qué le conviene y sugiere un complemento o una opción superior cuando tenga sentido (venta cruzada), sin presionar.
4. Cierra la venta: cuando muestre interés, resume lo elegido con cantidades y total, confirma los datos que faltan (nombre, dirección o fecha/hora, forma de pago) y pregunta si lo confirmas. Si dudan, resuelve la objeción con datos reales del negocio y ofrece una alternativa.
5. Si el cliente desaparece o no decide, cierra amable dejando la puerta abierta.
6. Si el cliente tiene un reclamo, atiéndelo con empatía, pide los datos del caso y ofrece pasarlo con una persona.
7. Si piden hablar con una persona, tienen un caso que no puedes resolver, o ya confirmaron un pedido/cita/cotización que alguien debe gestionar, despídete avisando que una persona del equipo continúa y AÑADE al final de tu mensaje exactamente la marca [[ASESOR]] (el sistema la quita; el cliente no la ve).

Datos reales del negocio (única fuente de verdad):
${perfil}

Catálogo de productos y servicios con precios:
${catalogo}
${domicilio ? `\n${domicilio}\n` : ""}${conocimientoSector}${cerebroTxt}${aprendido}${extra ? `\nInstrucciones propias del dueño (tienen prioridad en el estilo y las políticas):\n${extra}\n` : ""}
Reglas:
- No inventes precios, horarios, direcciones, productos, promociones, descuentos ni disponibilidad. Si un dato dice NO CONFIGURADO o no está arriba, di que lo confirma una persona del equipo y usa [[ASESOR]] si es necesario para cerrar.
- No prometas lo que no puedas cumplir (tiempos exactos, garantías, descuentos) si no está en los datos.
- No pidas contraseñas ni datos de tarjeta; para pagos indica solo los medios que el negocio haya configurado o que una persona del equipo los comparte.
- Si escriben algo que nada tiene que ver con el negocio, responde con amabilidad en una línea y redirige a cómo puedes ayudarles.
- Nunca digas que eres una inteligencia artificial a menos que te lo pregunten directamente; en ese caso dilo con honestidad y ofrece pasar con una persona.
- Usa pocos emojis, solo si el cliente los usa.`;

  const historial = (Array.isArray(mensajes) ? mensajes : [])
    .slice(-20)
    .map((m) => ({
      // El navegador no puede inventar respuestas del agente: todo lo que llega se trata como texto no verificado del cliente.
      role: "user" as "user" | "assistant",
      content:
        typeof m?.content === "string"
          ? (m?.role === "assistant" ? "[Respuesta anterior mostrada en pantalla, no verificada] " : "") + m.content.slice(0, 3000)
          : "",
    }))
    .filter((m) => m.content.trim().length > 0);
  if (historial.length === 0 || historial[historial.length - 1].role !== "user") {
    throw new ErrorAgente(400, "Falta el mensaje del cliente");
  }

  const texto = await llamarIA([{ role: "system", content: system }, ...historial], { uso: "whatsapp", perfil: motor.perfil, llave: motor.llave });
  if (!texto) throw new ErrorAgente(502, "El agente no pudo responder en este momento");

  const escalar = /\[\[ASESOR\]\]/i.test(texto);
  const sinAsesor = texto.replace(/\[\[ASESOR\]\]/gi, "").trim();
  const conLead = sacarEtiqueta<LeadAgente>(sinAsesor, "LEAD");
  const conPqrs = sacarEtiqueta<PqrsAgente>(conLead.limpio, "PQRS");
  const conRol = sacarEtiqueta<{ rol?: unknown; acciones?: unknown }>(conPqrs.limpio, "ROL");
  const limpio = conRol.limpio;
  const rol: RolAgente | null =
    conRol.valor && typeof conRol.valor === "object" && typeof conRol.valor.rol === "string" && conRol.valor.rol.trim()
      ? {
          rol: conRol.valor.rol.trim().slice(0, 80),
          acciones: Array.isArray(conRol.valor.acciones)
            ? conRol.valor.acciones.filter((a): a is string => typeof a === "string").map((a) => a.trim().slice(0, 100)).filter(Boolean).slice(0, 5)
            : [],
        }
      : null;
  const lead = conLead.valor && typeof conLead.valor === "object" ? conLead.valor : null;
  const pqrs = conPqrs.valor && typeof conPqrs.valor === "object" ? conPqrs.valor : null;
  if (!esPrueba) {
    try {
      await registrarLead(ag, telefono, canal, lead);
      if (pqrs) await guardarEtiquetaAgente(ag, "pqrs", telefono, pqrs);
    } catch (e) {
      console.error("Agente: no se pudo guardar lead/PQRS", String(e instanceof Error ? e.message : "error").replace(/\d{7,15}/g, "***"));
    }
    try {
      const leadId = await sincronizarCrm(ag, telefono, canal, lead, pqrs, escalar);
      if (leadId) await guardarMensajesCrm(ag, leadId, telefono, historial[historial.length - 1].content, limpio);
      if (leadId && !esPrueba && (escalar || (historial.length >= 8 && historial.length % 8 < 2))) {
        await resumirConversacion(ag, leadId, [...historial, { role: "assistant", content: limpio }], motor);
      }
    } catch (e) {
      console.error("Agente: no se pudo sincronizar el CRM", String(e instanceof Error ? e.message : "error").replace(/\d{7,15}/g, "***"));
    }
  }

  // Aprende de la conversación al terminar (pasa a una persona) o cada cierto número de mensajes.
  if (!esPrueba && (escalar || (historial.length >= 8 && historial.length % 8 < 2))) {
    try {
      await aprenderPatrones(ag, [...historial, { role: "assistant", content: limpio }], motor);
    } catch (e) {
      console.error("Agente: no se pudo aprender de la conversación", String(e instanceof Error ? e.message : "error").replace(/\d{7,15}/g, "***"));
    }
  }
  return { texto: limpio || "Un momento, una persona del equipo te atiende enseguida.", escalar, lead, pqrs, rol };
}
