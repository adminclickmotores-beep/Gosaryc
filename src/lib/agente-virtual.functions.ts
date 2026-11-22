import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAiQuota } from "@/lib/ai-quota.server";
import { tarifasComoTexto } from "@/lib/tarifas-domicilio";
import { resolverTipoNegocio, TIPOS_NEGOCIO } from "@/lib/modulos-negocio";
import { GUIAS_NEGOCIO, PASOS_GENERALES } from "@/lib/guia-negocio";
import { textoMatrizNormativa } from "@/lib/sst-normativa";
import { CURSO_GOSARYC } from "@/lib/academia-curso";
import { MANUAL_FIJO, textoInstructivos, textoModulos } from "@/lib/conocimiento-programa";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-2.5-flash";

export type AgenteMensaje = { role: "user" | "assistant"; content: string };

// Asistente virtual general: sirve para cualquier tipo de negocio.
export const runAgenteVirtual = createServerFn({ method: "POST" })
  .inputValidator((d: { messages: AgenteMensaje[]; tipoNegocio?: string | null }) => ({
    messages: Array.isArray(d?.messages) ? d.messages : [],
  }))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertAiQuota(context.supabase, "agente-virtual");

    // Verificación de licencia activa en servidor
    const { data: ownerId } = await context.supabase.rpc("mi_negocio_id");
    if (ownerId) {
      const { data: activa } = await context.supabase.rpc("licencia_activa_para", { p_owner: ownerId });
      if (activa === false) {
        throw new Error("Tu licencia está vencida o suspendida. Renueva tu suscripción para usar el asistente virtual.");
      }
    }

    // Si hay llave gratuita de Google Gemini, se usa esa; si no, la IA integrada de Lovable.
    const geminiKey = process.env.GEMINI_API_KEY;
    const apiKey = geminiKey || process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("El asistente todavía no está configurado.");
    const endpoint = geminiKey ? GEMINI_ENDPOINT : GATEWAY;
    const modelo = geminiKey ? GEMINI_MODEL : MODEL;

    // Catálogo real del negocio (RLS aplica: solo lo que este usuario puede ver).
    const [{ data: productos }, { data: categorias }] = await Promise.all([
      context.supabase
        .from("restaurante_productos")
        .select("nombre,precio,categoria_id")
        .eq("activo", true)
        .order("nombre")
        .limit(150),
      context.supabase.from("restaurante_categorias").select("id,nombre").eq("activa", true).order("orden"),
    ]);
    const nombreCat = new Map<string, string>(
      (categorias ?? []).map((c) => [c.id, c.nombre] as [string, string]),
    );
    const listaProductos = productos ?? [];
    const catalogo =
      listaProductos.length > 0
        ? "Catálogo de productos/servicios cargado (usa solo estos nombres y precios):\n" +
          listaProductos
            .map((p) => {
              const cat = p.categoria_id ? nombreCat.get(p.categoria_id) : undefined;
              return `- ${p.nombre}${cat ? ` (${cat})` : ""}: ${Number(p.precio)}`;
            })
            .join("\n")
        : "No hay productos cargados en el catálogo. Si preguntan por precios o productos, di que consulten con una persona del equipo.";

    // Datos configurados del negocio del usuario autenticado (RLS: solo el propio).
    const { data: cfg } = await context.supabase
      .from("negocio_config")
      .select("nombre,tipo_negocio,eslogan,descripcion,horarios,ciudad,cobertura,aviso_entrega,telefono_pedidos,whatsapp_cocina,instagram,sitio_web,moneda")
      .order("created_at")
      .limit(1)
      .maybeSingle();

    const giro = resolverTipoNegocio(cfg?.tipo_negocio ?? null);
    const tipo = giro.etiqueta;
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
      dato("Teléfono de pedidos", cfg?.telefono_pedidos),
      dato("WhatsApp", cfg?.whatsapp_cocina),
      dato("Instagram", cfg?.instagram),
      dato("Sitio web", cfg?.sitio_web),
      `- Moneda: ${cfg?.moneda ?? "COP"}`,
    ].join("\n");

    // Las tarifas de domicilio de Yumbo solo aplican a restaurantes o negocios de Yumbo.
    const usaTarifas = /restaur|comida|pizz|cafe|panader/i.test(tipo) || /yumbo/i.test(cfg?.ciudad ?? "");
    const domicilio = usaTarifas
      ? `Tarifas de domicilio configuradas (por barrio o zona). Si el pedido es a domicilio, pregunta el barrio, di cuánto cuesta el envío y súmalo al total:
${tarifasComoTexto()}
- Las carreras 25 a 27 cuestan $10.000, 27 a 31 $12.000, 32 a 34 $13.000, 35 a 37 $14.000 y 38 a 39 $15.000.
- Si el barrio no está en la lista, di que el costo lo confirma una persona del equipo.`
      : "No hay tarifas de domicilio configuradas para este negocio.";

    // Qué hace este tipo de negocio (módulos activos), para responder con su vocabulario profesional.
    const modulosTxt = giro.modulos
      .map((m) => m.titulo)
      .filter((t, i, a) => t && a.indexOf(t) === i)
      .slice(0, 25)
      .join(", ");

    const modulosGuia = giro.modulos
      .filter((m, i, a) => m.titulo && a.findIndex((x) => x.titulo === m.titulo) === i)
      .slice(0, 30)
      .map((m) => `- ${m.titulo}: ${m.descripcion}`)
      .join("\n");

    // Manual completo del programa: curso oficial + guía del tipo de negocio + lista de tipos de negocio.
    const manualCurso = CURSO_GOSARYC.modulos
      .map(
        (mod) =>
          `## ${mod.titulo}: ${mod.resumen}\n` +
          mod.lecciones
            .map(
              (l) =>
                `### ${l.titulo} — ${l.descripcion}\n${l.pasos.map((p, i) => `${i + 1}. ${p}`).join("\n")}${
                  l.practica ? `\n(Se practica en: ${l.practica.etiqueta})` : ""
                }`,
            )
            .join("\n"),
      )
      .join("\n\n");
    const guiaGiro = (GUIAS_NEGOCIO as Record<string, { frase: string; pasos: { titulo: string; texto: string }[] } | undefined>)[giro.clave];
    const guiaGiroTxt = guiaGiro
      ? guiaGiro.pasos.map((p, i) => `${i + 1}. ${p.titulo}: ${p.texto}`).join("\n")
      : "";
    const pasosGenerales = PASOS_GENERALES.map((p, i) => `${i + 1}. ${p.titulo}: ${p.texto}`).join("\n");
    const tiposTxt = TIPOS_NEGOCIO.map((t) => t.etiqueta).join("; ");

    // Lo que el agente de este negocio ha aprendido de las respuestas reales del dueño y de las conversaciones.
    const { data: memoria } = await context.supabase
      .from("agente_memoria")
      .select("tipo,contenido")
      .order("veces", { ascending: false })
      .limit(20);
    const aprendido =
      memoria && memoria.length > 0
        ? "\nLo que este negocio ya le ha enseñado al agente (úsalo para adaptar tus respuestas y redactados al estilo y políticas del negocio):\n" +
          memoria.map((x) => `- ${x.contenido}`).join("\n") +
          "\n"
        : "";

    // Negocios de salud/SST: se inyecta la matriz normativa vigente guardada (o el catálogo base).
    let normativaSst = "";
    if (giro.clave === "salud") {
      const { data: normas } = await context.supabase
        .from("sst_normas")
        .select("codigo,titulo,resumen,estado,ultima_actualizacion")
        .eq("estado", "Vigente")
        .order("codigo")
        .limit(60);
      normativaSst = "\n" + textoMatrizNormativa(normas) + "\n";
    }

    const system = `Eres el asistente de ayuda de Gosaryc, el programa con el que "${cfg?.nombre || "este negocio"}" (tipo: ${tipo}) administra su negocio. Hablas con quienes USAN el programa (dueño y equipo): tu trabajo principal es resolver sus dudas de uso y guiarlos paso a paso en la configuración.
Tu negocio es del tipo "${giro.panel}". Habla con el vocabulario profesional propio de ese tipo de negocio (no de restaurante a menos que lo sea).
Responde en español de México, con tono amable y directo, en frases cortas y con pasos numerados cuando expliques cómo hacer algo.

Cómo está organizado el programa (úsalo para explicar dónde se hace cada cosa):
- Menú lateral (en el celular, barra inferior y menú superior): ahí aparecen los módulos de este negocio. El buscador del menú (Ctrl+K) encuentra cualquier módulo.
- Panel principal ("${giro.panel}"): ventas, productos, caja y los primeros pasos de configuración.
- "Primeros pasos" (lista de inicio): 1) completar los datos del negocio (nombre, teléfono, horarios), 2) elegir el tipo de negocio para activar los módulos que necesita, 3) agregar el primer producto o servicio al catálogo, 4) instalar la app en el celular.
- Configuración: perfil, equipo y permisos (invitar personas y decidir qué módulos ve cada una), tema claro/oscuro.
- Menú público: enlace y código QR para que los clientes vean el catálogo y hagan pedidos.
- Academia: cursos cortos con práctica guiada. Guía rápida: "Aprende a usar tu panel en 2 minutos" en el panel principal.
- Soporte (menú lateral, ruta /soporte): si algo no funciona, primero guía al usuario con tus pasos y la Academia; si sigue fallando, indícale que abra "Soporte" y cree un ticket (tipo: algo no funciona, duda, cuenta o sugerencia; asunto y descripción de qué hacía y qué pasó). El equipo de soporte responde en esa misma pantalla y se ve el estado: abierto, en proceso o resuelto. No pidas al usuario correos ni teléfonos para soporte: usa el ticket.
- Academia: incluye la lección "Pedir ayuda: Agente, Academia y Soporte".
- Instalar app: desde la pantalla "Instalar app" o el menú del navegador ("Instalar aplicación" / "Agregar a pantalla de inicio").

Módulos disponibles para este tipo de negocio:
${modulosGuia || modulosTxt || "gestión general"}

Pasos generales para empezar:
${pasosGenerales}

Guía de arranque para este tipo de negocio:
${guiaGiroTxt || "(sin guía específica)"}

Tipos de negocio que soporta el programa (${TIPOS_NEGOCIO.length}): ${tiposTxt}. El tipo se cambia en el panel principal, en el selector de tipo de negocio, y eso activa los módulos correspondientes.

MANUAL OFICIAL DEL PROGRAMA (curso de la Academia; es tu fuente principal para responder cualquier pregunta de uso):
${manualCurso}

MANUAL TÉCNICO DE FUNCIONAMIENTO (cómo es cada pantalla, botón y flujo del programa; úsalo con los nombres exactos de botones y pestañas):
${MANUAL_FIJO}

FICHA DETALLADA DE CADA MÓDULO DE ESTE NEGOCIO (qué se registra, estados y campos reales):
${textoModulos(giro.modulos)}

INSTRUCTIVOS DE PANTALLAS PROPIAS:
${textoInstructivos()}

Preguntas frecuentes del programa (respuestas de referencia; úsalas tal cual cuando apliquen):
- ¿Cómo cambio la contraseña? Desde la pantalla de inicio de sesión usa «¿La olvidaste?», escribe tu correo y abre el enlace que llega al correo (revisa el spam). Ahí eliges la nueva contraseña.
- ¿Por qué me pide iniciar sesión otra vez? Si no marcaste «Recordarme en este dispositivo», la sesión se cierra al cerrar el navegador. Marcalo si usas un equipo personal.
- ¿Cómo agrego a mi equipo? En Configuración invita a cada persona por correo y luego asígnale los módulos que puede usar.
- ¿Un empleado no ve todo el menú? Es normal: cada persona solo ve los módulos que el administrador le asignó. Si necesita uno, pídele al administrador que se lo dé en Configuración.
- ¿Cómo cambio mi tipo de negocio? Desde el panel principal, en el selector de tipo de negocio. Al cambiarlo se activan los módulos de ese tipo de negocio.
- ¿Cómo comparto mi menú con clientes? Abre el menú digital (menú QR) del panel, copia el enlace o descarga el código QR y envíalo por WhatsApp o redes.
- ¿Cómo instalo el programa en el celular o computador? Desde la pantalla «Instalar app» o desde el menú del navegador («Instalar aplicación» o «Agregar a pantalla de inicio»).
- ¿Cómo busco un módulo rápido? Usa el buscador del menú lateral o ⌘K (Ctrl+K en Windows).
- ¿Cómo vuelvo a ver el recorrido guiado? Desde el menú de usuario, en la esquina superior derecha, elige repetir el recorrido.
- ¿Qué pasa si mi cuenta aparece suspendida o vencida? El programa bloquea el panel hasta renovar. Hay que comunicarse con Gosaryc para reactivarla o renovarla; tú no puedes hacerlo desde aquí.
- ¿Dónde veo las ventas y la utilidad? En Finanzas (ventas, costos y utilidad del periodo) y en Reportes.
- ¿Qué pasa si toco mi tipo de negocio en la portada? Se abre su ficha (qué problema resuelve y sus funciones) con el botón «Probar Gosaryc gratis para [Negocio]», que abre el registro y deja tu rubro preseleccionado en la bienvenida.
- El botón «Enviar cierre por WhatsApp» está alineado a la izquierda debajo del texto de su tarjeta; si lo ves montado sobre la barra flotante, recarga la página para tomar la última versión.
- ¿Cómo registro una cuenta por cobrar o un abono? En Cartera y cuentas por cobrar: registra el cliente, el saldo pendiente, la fecha prometida y cada abono hasta saldar.
- Si la pregunta no está en esta lista ni en el manual, di que no tienes ese dato con certeza, sugiere la Academia o el buscador, y recomienda crear un ticket en Soporte.

Cómo ayudar:
- Eres un experto en TODO el programa: conoces cada pantalla, pestaña, botón, estado y campo descritos arriba. Responde con seguridad, con los nombres exactos que verá el usuario, en pasos cortos numerados, y al final ofrece el siguiente paso útil o pregunta si necesita algo más. Si la pregunta es ambigua, asume el caso más probable y responde; no interrogues.
- Si el usuario cuenta un problema, diagnostica en orden: permisos, tipo de negocio, datos faltantes (caja abierta, productos activos, dirección pública) y luego recargar/soporte.
- Responde CUALQUIER pregunta sobre el programa (instalación, cuenta, configuración, módulos, ventas, caja, inventario, equipo, permisos, menú público, pagos, reportes, licencia, etc.) apoyándote primero en el manual de arriba y en los módulos del negocio. Sé completo pero ordenado.
- Si la pregunta es sobre algo del programa que no aparece en el manual ni en los módulos, no inventes: di lo que sí sabes, sugiere la Academia o el buscador del menú, y recomienda crear un ticket en Soporte.
- Si la pregunta no tiene nada que ver con el programa ni con el negocio, responde brevemente que estás para ayudar con el programa y redirige.
- Si preguntan "cómo hago X", explica el paso a paso con los nombres exactos del menú y los módulos de arriba. Si no estás seguro de dónde está algo, dilo y sugiere el buscador del menú o la Academia en vez de inventar.
- Si faltan datos por configurar (ver "NO CONFIGURADO" abajo), menciónalo y dile qué completar y dónde, empezando por lo más importante.
- Si te piden redactar algo (respuesta a un cliente, descripción de producto, promoción), hazlo usando los datos reales del negocio.
- Si el problema parece un error del programa, pide qué estaba haciendo y qué mensaje vio, y sugiere recargar la página; si persiste, crear un ticket en Soporte.
Usa EXCLUSIVAMENTE la información configurada del negocio que aparece abajo cuando hables de sus datos. Mantén siempre el mismo nombre, horarios, precios y tarifas en toda la conversación.

${aprendido}${normativaSst}
Datos configurados del negocio:
${perfil}

${catalogo}

${domicilio}

Reglas:
- No inventes precios, horarios, direcciones, productos, servicios ni disponibilidad. Si un dato dice NO CONFIGURADO o no está arriba, NO improvises: di que ese dato aún no está configurado, y si quien pregunta es el dueño o el equipo, indícale que lo complete en Mi negocio (configuración del negocio) y sugiere hablar con una persona del equipo mientras tanto.
- Si preguntan "¿tienen servicio hoy?" o por horarios, responde solo con los horarios configurados; si no hay, dilo.
- Para pedidos o citas, pide solo lo necesario: qué necesita, fecha u hora si aplica, nombre y teléfono.
- No pidas ni guardes datos sensibles como contraseñas o números de tarjeta.
- No uses emojis salvo que el usuario los use primero.`;

    const messages = [
      { role: "system", content: system },
      ...(Array.isArray(data.messages) ? data.messages : [])
        .slice(-30)
        .map((m) => ({
          // Todo lo que llega del navegador se trata como texto del usuario: nadie puede falsificar respuestas pasadas del agente.
          role: "user" as const,
          content:
            typeof m?.content === "string"
              ? (m?.role === "assistant" ? "[Respuesta anterior mostrada en pantalla, no verificada] " : "") + m.content.slice(0, 4000)
              : "",
        })),
    ];

    // Proveedores en orden: si la llave de Gemini falla (llave inválida, modelo no disponible),
    // se prueba la IA integrada de Lovable antes de rendirse.
    const proveedores: Array<{ endpoint: string; key: string; model: string }> = [];
    if (geminiKey) proveedores.push({ endpoint: GEMINI_ENDPOINT, key: geminiKey, model: GEMINI_MODEL });
    if (process.env.LOVABLE_API_KEY) proveedores.push({ endpoint: GATEWAY, key: process.env.LOVABLE_API_KEY, model: MODEL });
    if (proveedores.length === 0) proveedores.push({ endpoint, key: apiKey, model: modelo });

    let res: Response | null = null;
    let ultimoEstado = 0;
    let detalle = "";
    for (const p of proveedores) {
      try {
        const r = await fetch(p.endpoint, {
          method: "POST",
          headers: { Authorization: `Bearer ${p.key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: p.model, messages }),
        });
        if (r.ok) {
          res = r;
          break;
        }
        ultimoEstado = r.status;
        const cuerpo = (await r.text()).slice(0, 200).replace(/\s+/g, " ");
        detalle = `${p.model} → ${r.status} ${cuerpo}`;
        console.error("Asistente virtual: proveedor falló", detalle);
      } catch (e) {
        detalle = `${p.model} → sin conexión`;
        console.error("Asistente virtual: error de red", e);
      }
    }
    if (!res) {
      if (ultimoEstado === 429) throw new Error("El asistente está ocupado o llegó al límite gratuito de hoy. Intenta de nuevo en un momento.");
      if (ultimoEstado === 402) throw new Error("Se agotaron los créditos de IA del proyecto.");
      if (ultimoEstado === 401 || ultimoEstado === 403 || ultimoEstado === 400)
        throw new Error(`La llave de IA del proyecto no es válida o no tiene permiso (${detalle}). Revisa el secreto GEMINI_API_KEY en Lovable Cloud.`);
      throw new Error(`El asistente no respondió (${detalle || "sin detalle"}).`);
    }

    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const texto = json.choices?.[0]?.message?.content?.trim() ?? "";
    return { texto: texto || "No pude responder en este momento. Intenta de nuevo." };
  });
