import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAiQuota } from "@/lib/ai-quota.server";
import { tarifasComoTexto } from "@/lib/tarifas-domicilio";
import { resolverTipoNegocio } from "@/lib/modulos-negocio";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";
const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const GEMINI_MODEL = "gemini-2.5-flash";

export type AgenteMensaje = { role: "user" | "assistant"; content: string };

// Asistente virtual general: sirve para cualquier tipo de negocio.
export const runAgenteVirtual = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messages: AgenteMensaje[]; tipoNegocio?: string | null }) => d)
  .handler(async ({ data, context }) => {
    await assertAiQuota(context.supabase, "agente-virtual");

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

    const tipo = (cfg?.tipo_negocio || (typeof data.tipoNegocio === "string" ? data.tipoNegocio : "") || "general")
      .trim()
      .slice(0, 80);
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

    // Qué hace este tipo de negocio (módulos activos), para responder acorde a su giro.
    const giro = resolverTipoNegocio(cfg?.tipo_negocio ?? data.tipoNegocio ?? null);
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

    const system = `Eres el asistente de ayuda de Gosaryc, el programa con el que "${cfg?.nombre || "este negocio"}" (tipo: ${tipo}) administra su negocio. Hablas con quienes USAN el programa (dueño y equipo): tu trabajo principal es resolver sus dudas de uso y guiarlos paso a paso en la configuración.
Tu negocio es del giro "${giro.panel}". Habla con el vocabulario propio de ese giro (no de restaurante a menos que lo sea).
Responde en español de México, con tono amable y directo, en frases cortas y con pasos numerados cuando expliques cómo hacer algo.

Cómo está organizado el programa (úsalo para explicar dónde se hace cada cosa):
- Menú lateral (en el celular, barra inferior y menú superior): ahí aparecen los módulos de este negocio. El buscador del menú (Ctrl+K) encuentra cualquier módulo.
- Panel principal ("${giro.panel}"): ventas, productos, caja y los primeros pasos de configuración.
- "Primeros pasos" (lista de inicio): 1) completar los datos del negocio (nombre, teléfono, horarios), 2) elegir el tipo de negocio para activar los módulos que necesita, 3) agregar el primer producto o servicio al catálogo, 4) instalar la app en el celular.
- Configuración: perfil, equipo y permisos (invitar personas y decidir qué módulos ve cada una), tema claro/oscuro.
- Menú público: enlace y código QR para que los clientes vean el catálogo y hagan pedidos.
- Academia: cursos cortos con práctica guiada. Guía rápida: "Aprende a usar tu panel en 2 minutos" en el panel principal.
- Instalar app: desde la pantalla "Instalar app" o el menú del navegador ("Instalar aplicación" / "Agregar a pantalla de inicio").

Módulos disponibles para este tipo de negocio:
${modulosGuia || modulosTxt || "gestión general"}

Cómo ayudar:
- Si preguntan "cómo hago X", explica el paso a paso con los nombres exactos del menú y los módulos de arriba. Si no estás seguro de dónde está algo, dilo y sugiere el buscador del menú o la Academia en vez de inventar.
- Si faltan datos por configurar (ver "NO CONFIGURADO" abajo), menciónalo y dile qué completar y dónde, empezando por lo más importante.
- Si te piden redactar algo (respuesta a un cliente, descripción de producto, promoción), hazlo usando los datos reales del negocio.
- Si el problema parece un error del programa, pide qué estaba haciendo y qué mensaje vio, y sugiere recargar la página; si persiste, contactar a soporte.
Usa EXCLUSIVAMENTE la información configurada del negocio que aparece abajo cuando hables de sus datos. Mantén siempre el mismo nombre, horarios, precios y tarifas en toda la conversación.

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
          role: (m?.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
          content: typeof m?.content === "string" ? m.content.slice(0, 4000) : "",
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
